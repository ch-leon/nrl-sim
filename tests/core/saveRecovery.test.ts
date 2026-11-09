import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setStorage, __unlockSaves, downloadOriginalSave, exportOriginalSave, exportRecoverySaves, getSlotSummaries,
  hasSave, installImportedSave, load, loadSlot, lockSaves, save, saveIfChanged, setActiveSlot, writeSlot,
} from '../../src/core/save';
import { createNewGame, SAVE_VERSION } from '../../src/core/state';
import { LocalSaveStore, setCareerNamespace, type StorageLike } from '../../src/core/storage/local';
import { CORRUPT_SAVE_KEY, DEV_TEST_PREFIX, LEGACY_SAVE_KEY, liveMatchKey, recoveryKey, slotKey } from '../../src/core/storageKeys';
import { careerKeys, clearTestCareer } from '../../src/labs/devCareer';

let bytes: Map<string, string>;
let storage: StorageLike;
beforeEach(() => {
  bytes = new Map();
  storage = {
    getItem: (key) => bytes.get(key) ?? null,
    setItem: (key, value) => { bytes.set(key, value); },
    removeItem: (key) => { bytes.delete(key); },
  };
  setCareerNamespace(null);
  __setStorage(storage);
  __unlockSaves();
  setActiveSlot(1);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  setCareerNamespace(null);
  __unlockSaves();
  __setStorage(null);
  vi.restoreAllMocks();
});

describe('rejected career preservation (#522)', () => {
  it('distinguishes empty, rejected and unreadable slots without deleting either source or live match', () => {
    expect(loadSlot()).toEqual({ status: 'empty' });
    bytes.set(slotKey(1), 'broken');
    bytes.set(liveMatchKey(1), 'match bytes');
    expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(load()).toBeNull();
    expect(getSlotSummaries().map((s) => s.status)).toEqual(['corrupt', 'empty', 'empty']);
    expect(bytes.get(slotKey(1))).toBe('broken');
    expect(bytes.get(liveMatchKey(1))).toBe('match bytes');
    storage.getItem = () => { throw new Error('blocked'); };
    expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(getSlotSummaries().every((s) => s.status === 'corrupt')).toBe(true);
    expect(hasSave()).toBe(true);
  });

  it.each(['quota', 'readback'] as const)('backup %s failure leaves the source untouched and blocks defaults/autosave', (failure) => {
    const raw = ' \u0000original rejected bytes\n';
    bytes.set(slotKey(1), raw);
    const get = storage.getItem;
    const set = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === recoveryKey(1) && failure === 'quota') throw new Error('quota');
      set(key, value);
    };
    storage.getItem = (key) => key === recoveryKey(1) && failure === 'readback' && bytes.has(key) ? null : get(key);
    expect(load()).toBeNull();
    const defaults = createNewGame('Defaults', 522);
    save(defaults);
    expect(saveIfChanged(defaults)).toBe(false);
    expect(writeSlot(1, defaults)).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(raw);
    expect(exportOriginalSave(1)).toBe(raw);
  });

  it('never overwrites a different rejected career in the shared corrupt key', () => {
    bytes.set(CORRUPT_SAVE_KEY, 'older recovery');
    bytes.set(slotKey(1), 'first rejected career');
    bytes.set(slotKey(2), 'second rejected career');
    load();
    setActiveSlot(2);
    load();
    expect(bytes.get(CORRUPT_SAVE_KEY)).toBe('older recovery');
    expect(exportRecoverySaves(1)).toEqual(['first rejected career', 'older recovery']);
    expect(exportRecoverySaves(2)).toEqual(['second rejected career']);
    expect(exportOriginalSave(1)).toBe('first rejected career');
    expect(exportOriginalSave(2)).toBe('second rejected career');
  });

  it.each(['not JSON', '{"version":23}', '{"version":999}', '{"nrlLiveMatch":42}'])('invalid import %s leaves destination and live-match bytes untouched', (text) => {
    bytes.set(slotKey(1), JSON.stringify(createNewGame('Existing', 1)));
    bytes.set(liveMatchKey(1), 'existing match');
    const before = new Map(bytes);
    expect(installImportedSave(text, 1).ok).toBe(false);
    expect(bytes).toEqual(before);
  });

  it('failed import write leaves destination and live-match untouched', () => {
    bytes.set(slotKey(1), JSON.stringify(createNewGame('Existing', 1)));
    bytes.set(liveMatchKey(1), 'existing match');
    const before = new Map(bytes);
    storage.setItem = () => { throw new Error('quota'); };
    expect(installImportedSave(JSON.stringify(createNewGame('Incoming', 2)), 1).ok).toBe(false);
    expect(bytes).toEqual(before);
  });

  it.each([slotKey(1), LEGACY_SAVE_KEY])('future-version bytes at %s remain untouched and cannot be autosaved over', (key) => {
    const raw = JSON.stringify({ version: SAVE_VERSION + 1, future: 'data' }, null, 2);
    bytes.set(key, raw);
    expect(loadSlot()).toMatchObject({ status: 'future' });
    expect(load()).toBeNull();
    expect(getSlotSummaries()[0].status).toBe('future');
    save(createNewGame('Defaults', 1));
    expect(installImportedSave(JSON.stringify(createNewGame('Import', 2)), 1).ok).toBe(false);
    expect(exportOriginalSave(1)).toBe(raw);
    expect(bytes).toEqual(new Map([[key, raw]]));
  });

  it('ordinary slot-1 saves retain a different shadowed legacy career', () => {
    const future = '{"version":999,"career":"legacy original"}';
    bytes.set(LEGACY_SAVE_KEY, future);
    const current = createNewGame('Slot one', 1);
    bytes.set(slotKey(1), JSON.stringify(current));
    save({ ...current, money: current.money + 1 });
    expect(bytes.get(LEGACY_SAVE_KEY)).toBe(future);
    expect(exportRecoverySaves(1)).toContain(future);
  });

  it('keeps a legacy fallback and exports original bytes without migration', () => {
    const raw = '\n {"version":1,"squad":null} \n';
    bytes.set(LEGACY_SAVE_KEY, raw);
    expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(exportOriginalSave(1)).toBe(raw);
    expect(getSlotSummaries()[0].status).toBe('corrupt');
    expect(bytes).toEqual(new Map([[LEGACY_SAVE_KEY, raw]]));
  });

  it.each(['quota', 'readback'] as const)('preserves an older original before installing migrated state, refusing repair on backup %s failure', (failure) => {
    const raw = JSON.stringify({ ...createNewGame('Old', 1), version: 22 }, null, 2);
    bytes.set(slotKey(1), raw);
    const result = loadSlot();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected migration');
    const set = storage.setItem;
    const get = storage.getItem;
    storage.getItem = (key) => key === recoveryKey(1) && failure === 'readback' && bytes.has(key) ? null : get(key);
    storage.setItem = (key, value) => {
      if (key === recoveryKey(1) && failure === 'quota') throw new Error('quota');
      set(key, value);
    };
    expect(writeSlot(1, result.state)).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(raw);
    storage.setItem = set;
    storage.getItem = get;
    expect(writeSlot(1, result.state)).toBe(true);
    expect(exportRecoverySaves(1)).toEqual([raw]);
    expect(JSON.parse(bytes.get(slotKey(1))!).version).toBe(23);
  });

  it('isolates recovery data in the developer namespace and respects career switching locks', () => {
    bytes.set(slotKey(1), 'normal rejected');
    load();
    const normal = new Map(bytes);
    setCareerNamespace(DEV_TEST_PREFIX);
    bytes.set(DEV_TEST_PREFIX + slotKey(1), 'developer rejected');
    load();
    expect(exportOriginalSave(1)).toBe('developer rejected');
    expect(exportRecoverySaves(1)).toEqual(['developer rejected']);
    for (const [key, value] of normal) expect(bytes.get(key)).toBe(value);
    lockSaves();
    expect(writeSlot(2, createNewGame('Crossing', 2))).toBe(false);
    expect(installImportedSave(JSON.stringify(createNewGame('Import', 2)), 2).ok).toBe(false);
    expect(careerKeys()).toContain(recoveryKey(1));
    clearTestCareer(storage);
    expect(bytes).toEqual(normal);
    setCareerNamespace(null);
    expect(exportRecoverySaves(1)).toEqual(['normal rejected']);
  });

  it('downloads rejected original bytes directly without the successful-migration validator', async () => {
    const raw = ' \u0000 {broken JSON, café} \n';
    bytes.set(slotKey(1), raw);
    let blob: Blob | undefined;
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => { blob = value as Blob; return 'blob:original'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      downloadOriginalSave(1);
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(anchor.download).toBe('career-slot-1-original.json');
      expect(await blob!.text()).toBe(raw);
      expect(bytes).toEqual(new Map([[slotKey(1), raw]]));
      const adapter = new LocalSaveStore(storage, 3);
      adapter.keepCorrupt(raw, 1);
      bytes.set(slotKey(1), 'different current payload');
      downloadOriginalSave(1, 0);
      expect(await blob!.text()).toBe(raw);
      expect(anchor.download).toBe('career-slot-1-recovery-1.json');
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('deduplicates exact recovery bytes while retaining different earlier originals', () => {
    const adapter = new LocalSaveStore(storage, 3);
    adapter.keepCorrupt('first', 1);
    adapter.keepCorrupt('second', 1);
    adapter.keepCorrupt('first', 1);
    expect(exportRecoverySaves(1)).toEqual(['first', 'second']);
    expect(bytes.get(CORRUPT_SAVE_KEY)).toBe('first');
  });
});
