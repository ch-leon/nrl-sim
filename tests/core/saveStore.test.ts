import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __flushSaveMeta, __setStorage, getSlotMeta, getSlotSummaries, hasSave, listSlotMeta, load, save,
  setActiveSlot, SLOT_COUNT, deleteSlot, writeSlot, type StorageLike,
} from '../../src/core/save';
import { createNewGame, SAVE_VERSION } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { DEVICE_ID_KEY, LEGACY_SAVE_KEY, saveMetaKey, slotKey } from '../../src/core/storageKeys';
import { LocalSaveStore } from '../../src/core/storage/local';
import { MemorySaveStore } from '../../src/core/storage/memory';
import { checksumOf, metaFor, nextMeta, parseMeta } from '../../src/core/storage/meta';
import { resolveSaveConflict } from '../../src/core/storage/conflict';
import type { SaveMeta } from '../../src/core/storage/types';

// #360: saves behind a storage adapter, with a metadata sidecar and conflict rules.
// The slot bytes and keys are what the game always wrote; meta sits beside them.

function makeFakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

/** The meta write happens once the current task is done; let it. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

let storage: ReturnType<typeof makeFakeStorage>;

beforeEach(() => {
  bus.clear();
  storage = makeFakeStorage();
  __setStorage(storage);
  setActiveSlot(1);
});

afterEach(() => {
  __setStorage(null);
  vi.restoreAllMocks();
});

const metaIn = (slot: number): SaveMeta | null => parseMeta(storage.map.get(saveMetaKey(slot)) ?? null);

describe('LocalSaveStore', () => {
  it('writes the same bytes, under the same key, as writeSlot did (JSON.stringify of the state)', () => {
    const s = createNewGame('Bytes', 7);
    expect(writeSlot(2, s)).toBe(true);
    const direct = makeFakeStorage();
    const store = new LocalSaveStore(direct, SLOT_COUNT);
    const payload = JSON.stringify(s);
    store.write(2, payload, nextMeta(null, payload, { saveVersion: s.version }, store.deviceId(), 1));
    expect(storage.map.get(slotKey(2))).toBe(payload);
    expect(direct.map.get(slotKey(2))).toBe(payload);
    expect(store.read(2)).toBe(payload);
  });

  it('round-trips every corpus save byte for byte', () => {
    const files = import.meta.glob('../fixtures/saves/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
    expect(Object.keys(files).length).toBeGreaterThan(0);
    const store = new LocalSaveStore(makeFakeStorage(), SLOT_COUNT);
    for (const raw of Object.values(files)) {
      expect(raw.startsWith('{')).toBe(true);
      store.write(3, raw, metaFor(raw, null, store.deviceId()));
      expect(store.read(3)).toBe(raw);
      expect(store.list()[2].meta?.checksum).toBe(checksumOf(raw));
    }
  });

  it('remove empties the slot, its meta and (slot 1) the legacy key', async () => {
    save(createNewGame('Gone', 1));
    storage.map.set(LEGACY_SAVE_KEY, 'old');
    await settle();
    expect(metaIn(1)).not.toBeNull();
    deleteSlot(1);
    expect(storage.map.has(slotKey(1))).toBe(false);
    expect(storage.map.has(saveMetaKey(1))).toBe(false);
    expect(storage.map.has(LEGACY_SAVE_KEY)).toBe(false);
  });

  it('a delete before the meta lands leaves no meta behind', async () => {
    save(createNewGame('Quick', 1));
    deleteSlot(1);
    await settle();
    expect(storage.map.has(saveMetaKey(1))).toBe(false);
  });
});

describe('MemorySaveStore', () => {
  it('keeps payloads and meta per slot and lists every slot', () => {
    const store = new MemorySaveStore(3);
    const payload = JSON.stringify(createNewGame('Mem', 2));
    const meta = nextMeta(null, payload, { saveVersion: SAVE_VERSION, club: 'Mem' }, store.deviceId(), 10);
    store.write(2, payload, meta);
    expect(store.read(2)).toBe(payload);
    expect(store.list()).toEqual([
      { slot: 1, present: false, meta: null },
      { slot: 2, present: true, meta },
      { slot: 3, present: false, meta: null },
    ]);
    store.remove(2);
    expect(store.read(2)).toBeNull();
    expect(store.storedMeta(2)).toBeNull();
  });
});

describe('save meta (sidecar, not inside the save)', () => {
  it('is written beside the slot after a save; the save JSON is unchanged', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const s = createNewGame('Meta Club', 3);
    save(s);
    expect(JSON.parse(storage.map.get(slotKey(1))!)).toEqual(s);
    expect(storage.map.get(slotKey(1))).toBe(JSON.stringify(s));
    await settle();
    const meta = metaIn(1)!;
    expect(meta).toMatchObject({
      saveVersion: SAVE_VERSION, updatedAt: 1_700_000_000_000, revision: 1,
      club: 'Meta Club', season: s.season, week: s.week,
      checksum: checksumOf(storage.map.get(slotKey(1))!),
    });
    expect(meta.deviceId).toBe(storage.map.get(DEVICE_ID_KEY));
    expect(getSlotMeta(1)).toEqual(meta);
  });

  it('revision goes up by one on every write', async () => {
    const s = createNewGame('Rev', 4);
    save(s);
    save({ ...s, money: s.money + 1 });
    expect(getSlotMeta(1)?.revision).toBe(2); // the queued meta reads at once
    await settle();
    save({ ...s, money: s.money + 2 });
    await settle();
    expect(metaIn(1)?.revision).toBe(3);
  });

  it('a burst of saves in one task writes the meta once', async () => {
    const s = createNewGame('Burst', 4);
    const setItem = vi.spyOn(storage, 'setItem');
    save(s);
    save({ ...s, money: 1 });
    save({ ...s, money: 2 });
    expect(setItem.mock.calls.filter(([k]) => k === saveMetaKey(1))).toHaveLength(0);
    await settle();
    expect(setItem.mock.calls.filter(([k]) => k === saveMetaKey(1))).toHaveLength(1);
    expect(metaIn(1)?.revision).toBe(3);
  });

  it('checksum is stable for the same payload and differs for a changed one', () => {
    const s = createNewGame('Sum', 5);
    const a = JSON.stringify(s);
    expect(checksumOf(a)).toBe(checksumOf(JSON.stringify(JSON.parse(a))));
    expect(checksumOf(JSON.stringify({ ...s, money: s.money + 1 }))).not.toBe(checksumOf(a));
  });

  it('deviceId is made once and kept across reloads', async () => {
    save(createNewGame('Device', 6));
    await settle();
    const id = storage.map.get(DEVICE_ID_KEY)!;
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    __setStorage(null);
    __setStorage(storage); // a reload: same storage, fresh page
    save(createNewGame('Device', 6));
    await settle();
    expect(storage.map.get(DEVICE_ID_KEY)).toBe(id);
    expect(metaIn(1)?.deviceId).toBe(id);
  });

  it('a save from before meta loads, lists as the oldest, and gets meta on its next save', async () => {
    const s = createNewGame('Old Save', 8);
    const raw = JSON.stringify(s);
    storage.map.set(slotKey(2), raw);
    expect(getSlotSummaries()[1]).toMatchObject({ slot: 2, status: 'ok', clubName: 'Old Save' });
    expect(listSlotMeta()[1]).toMatchObject({
      slot: 2, present: true,
      meta: { updatedAt: 0, revision: 0, checksum: checksumOf(raw), saveVersion: SAVE_VERSION, club: 'Old Save', season: s.season, week: s.week },
    });
    setActiveSlot(2);
    expect(load()).toEqual(s);
    save(s);
    await settle();
    expect(metaIn(2)).toMatchObject({ revision: 1, checksum: checksumOf(raw) });
    expect(metaIn(2)!.updatedAt).toBeGreaterThan(0);
  });

  it('a meta that no longer matches its slot (e.g. edited elsewhere) is rebuilt, its revision kept', async () => {
    save(createNewGame('Stale', 9));
    await settle();
    const other = JSON.stringify(createNewGame('Changed', 10));
    storage.map.set(slotKey(1), other);
    expect(getSlotMeta(1)).toMatchObject({ updatedAt: 0, revision: 1, checksum: checksumOf(other), club: 'Changed' });
  });

  it('an unreadable meta is ignored', () => {
    storage.map.set(slotKey(1), JSON.stringify(createNewGame('Junk', 1)));
    storage.map.set(saveMetaKey(1), '{nope');
    expect(getSlotMeta(1)).toMatchObject({ updatedAt: 0, revision: 0 });
    expect(load()).not.toBeNull();
  });

  it('empty slots list with no meta', () => {
    expect(listSlotMeta()).toEqual([1, 2, 3].map((slot) => ({ slot, present: false, meta: null })));
  });
});

describe('a page with today\'s keys (slots and legacy key, no meta)', () => {
  it('boots, lists its slots, loads and keeps saving, writing meta beside each slot', async () => {
    const legacy = createNewGame('Legacy', 11);
    const two = createNewGame('Two', 12);
    storage.map.set(LEGACY_SAVE_KEY, JSON.stringify(legacy));
    storage.map.set(slotKey(2), JSON.stringify(two));
    expect(getSlotSummaries().map((s) => s.status)).toEqual(['ok', 'ok', 'empty']);
    // Legacy → slot 1 still migrates, through the adapter.
    expect(storage.map.get(slotKey(1))).toBe(JSON.stringify(legacy));
    expect(storage.map.has(LEGACY_SAVE_KEY)).toBe(false);
    expect(load()).toEqual(legacy);
    save({ ...legacy, money: 1 });
    setActiveSlot(2);
    expect(load()).toEqual(two);
    save({ ...two, money: 2 });
    await settle();
    expect(metaIn(1)).toMatchObject({ revision: 1, club: 'Legacy' });
    expect(metaIn(2)).toMatchObject({ revision: 1, club: 'Two' });
    expect(metaIn(3)).toBeNull();
    setActiveSlot(1);
    expect(load()?.money).toBe(1);
  });

  it('the legacy save still shows in slot 1 when copying it failed', () => {
    const legacy = JSON.stringify(createNewGame('Stuck', 13));
    storage.map.set(LEGACY_SAVE_KEY, legacy);
    const failing: StorageLike = {
      getItem: (k) => storage.getItem(k),
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: (k) => storage.removeItem(k),
    };
    __setStorage(failing);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(hasSave(1)).toBe(true);
    expect(load()?.clubName).toBe('Stuck');
    expect(getSlotMeta(1)).toMatchObject({ club: 'Stuck', updatedAt: 0, checksum: checksumOf(legacy) });
  });
});

describe('quota on the meta write', () => {
  it('never loses the slot write, and the game stays playable', async () => {
    const quota: StorageLike = {
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => {
        if (k.startsWith('nrl-sim-save-meta-') || k === DEVICE_ID_KEY) throw new DOMException('quota', 'QuotaExceededError');
        storage.setItem(k, v);
      },
      removeItem: (k) => storage.removeItem(k),
    };
    __setStorage(quota);
    const notes: string[] = [];
    bus.on('ui:notify', (p) => { if (p.kind === 'danger') notes.push(p.text); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createNewGame('Full', 14);
    save(s);
    await settle();
    expect(storage.map.get(slotKey(1))).toBe(JSON.stringify(s));
    expect(storage.map.has(saveMetaKey(1))).toBe(false);
    expect(notes).toEqual([]); // nothing the player sees
    expect(load()).toEqual(s);
    const next = { ...s, week: s.week + 1 };
    save(next);
    await settle();
    expect(load()).toEqual(next);
    expect(getSlotMeta(1)).toMatchObject({ checksum: checksumOf(JSON.stringify(next)), updatedAt: 0 });
  });
});

// ── resolveSaveConflict: one test per rule ───────────────────────────────────

function meta(over: Partial<SaveMeta> = {}): SaveMeta {
  return { saveVersion: SAVE_VERSION, updatedAt: 1000, deviceId: 'phone', checksum: 'aaa', revision: 1, ...over };
}

describe('resolveSaveConflict', () => {
  it('same checksum → same', () => {
    expect(resolveSaveConflict(meta(), meta({ deviceId: 'laptop', updatedAt: 5, revision: 9 }))).toBe('same');
    expect(resolveSaveConflict(null, null)).toBe('same');
  });

  it('one side missing → keep the side that exists', () => {
    expect(resolveSaveConflict(meta(), null)).toBe('keep-local');
    expect(resolveSaveConflict(null, meta())).toBe('take-remote');
  });

  it('a save newer than this build supports is never overwritten → ask', () => {
    const future = meta({ saveVersion: SAVE_VERSION + 1, checksum: 'fff', updatedAt: 1 });
    expect(resolveSaveConflict(meta({ updatedAt: 9999, revision: 50 }), future)).toBe('ask');
    expect(resolveSaveConflict(future, meta({ checksum: 'bbb', updatedAt: 9999 }))).toBe('ask');
    expect(resolveSaveConflict(meta(), meta({ saveVersion: SAVE_VERSION + 1, checksum: 'bbb', updatedAt: 2000 }), SAVE_VERSION + 1)).toBe('take-remote'); // a build that knows it
  });

  it('same device, higher revision → take that side, whatever the clocks say', () => {
    expect(resolveSaveConflict(meta({ revision: 5, updatedAt: 1 }), meta({ revision: 4, checksum: 'bbb', updatedAt: 9 }))).toBe('keep-local');
    expect(resolveSaveConflict(meta({ revision: 4, updatedAt: 9 }), meta({ revision: 5, checksum: 'bbb', updatedAt: 1 }))).toBe('take-remote');
  });

  it('different devices, both changed since the last sync → ask', () => {
    const local = meta({ checksum: 'aaa', lastSyncedChecksum: 'base', updatedAt: 2000 });
    const remote = meta({ checksum: 'bbb', deviceId: 'laptop', updatedAt: 3000 });
    expect(resolveSaveConflict(local, remote)).toBe('ask');
    // Never synced counts as both changed.
    expect(resolveSaveConflict(meta({ updatedAt: 2000 }), remote)).toBe('ask');
  });

  it('otherwise the newer updatedAt wins', () => {
    // Different devices, only the cloud changed since the sync.
    const local = meta({ checksum: 'base', lastSyncedChecksum: 'base', updatedAt: 1000 });
    expect(resolveSaveConflict(local, meta({ checksum: 'bbb', deviceId: 'laptop', updatedAt: 3000 }))).toBe('take-remote');
    // Different devices, only this device changed since the sync.
    const changed = meta({ checksum: 'ccc', lastSyncedChecksum: 'bbb', updatedAt: 4000 });
    expect(resolveSaveConflict(changed, meta({ checksum: 'bbb', deviceId: 'laptop', updatedAt: 3000 }))).toBe('keep-local');
    // Same device, same revision: the clock decides; a save from before meta (0) is the oldest.
    expect(resolveSaveConflict(meta({ updatedAt: 0 }), meta({ checksum: 'bbb', updatedAt: 1 }))).toBe('take-remote');
    // Equal times cannot be told apart.
    expect(resolveSaveConflict(meta(), meta({ checksum: 'bbb' }))).toBe('ask');
  });
});

describe('no storage at all', () => {
  it('lists nothing and never throws', () => {
    __setStorage(null);
    expect(listSlotMeta()).toEqual([]);
    expect(getSlotMeta(1)).toBeNull();
    expect(() => __flushSaveMeta()).not.toThrow();
  });
});
