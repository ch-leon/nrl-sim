// #819 with the iPhone native mirror: a Classic save is ignored, so no load path
// deletes anything natively. The Codex r4/r5 failure states, simulated with the
// production mirror code.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setStorage, capturePlayerSlot, captureSlot, classicSlots, getSlotSummaries, hasSave, listSlotMeta, loadCareer, loadSlot, type StorageLike } from '../../src/core/save';
import { createNewGame } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { LEGACY_SAVE_KEY, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { setMirroredStorage } from '../../src/core/storage/local';
import { fileForKey, type NativeFiles, type NativeMirror } from '../../src/core/storage/nativeMirror';
import { bootNativeMirror } from '../../src/core/storage/native';
import { beginNativeCheckpointBoot } from '../../src/core/storage/nativeCheckpoint';

afterEach(() => {
  beginNativeCheckpointBoot(false);
  setMirroredStorage(null);
  __setStorage(null);
});

function classicRaw(): string {
  const state = createNewGame('Classic Club', 9);
  state.league = initLeague(state);
  return JSON.stringify(state);
}
const LEAGUE = JSON.stringify({ version: 35, clubName: 'Legacy League', competitions: { leagueCareer: { phase: 'active' } } });
const MATCH = JSON.stringify({ season: 1, week: 1, round: 1, homeId: 'player', awayId: 'r1', seed: 7, calls: [], tick: 47 });

function nativeDir(opts: { failList?: boolean; failRead?: (name: string) => boolean } = {}) {
  const files = new Map<string, string>();
  const removed: string[] = [];
  const api: NativeFiles = {
    async list() { if (opts.failList) throw new Error('list failed'); return [...files.keys()]; },
    async exists(name) { return files.has(name); },
    async read(name) {
      if (opts.failRead?.(name)) throw new Error('read failed');
      const v = files.get(name); if (v === undefined) throw new Error('missing'); return v;
    },
    async write(name, text) { files.set(name, text); },
    async rename(from, to) { const v = files.get(from); if (v === undefined) throw new Error('missing'); files.delete(from); files.set(to, v); },
    async remove(name) { removed.push(name); files.delete(name); },
  };
  return { api, files, removed };
}

function webView(refuse: (key: string) => boolean = () => false): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { if (refuse(k)) throw new DOMException('quota', 'QuotaExceededError'); map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

async function bootAndRead(web: ReturnType<typeof webView>, native: ReturnType<typeof nativeDir>): Promise<void> {
  let mirror: NativeMirror | undefined;
  await bootNativeMirror({
    ios: true, storage: web, keys: () => [...web.map.keys()], loadFiles: async () => native.api,
    install: (storage, m) => { mirror = m; setMirroredStorage(storage); __setStorage(storage); }, log: vi.fn(),
  });
  getSlotSummaries();
  listSlotMeta();
  for (const slot of [1, 2, 3]) { hasSave(slot); loadSlot(slot); loadCareer(slot); captureSlot(slot); capturePlayerSlot(slot); }
  classicSlots();
  await mirror?.idle();
}

const goneMarkers = (native: ReturnType<typeof nativeDir>) => [...native.files.keys()].filter((n) => n.endsWith('.gone'));

describe('a Classic save on iPhone: nothing is deleted on load', () => {
  it('r4: the legacy League save failed to restore (quota); its native file and checkpoint stay', async () => {
    const native = nativeDir();
    native.files.set(fileForKey(slotKey(1)), classicRaw());
    native.files.set(fileForKey(LEGACY_SAVE_KEY), LEAGUE);
    native.files.set(fileForKey(liveMatchKey(1)), MATCH);
    const web = webView((k) => k === LEGACY_SAVE_KEY);
    await bootAndRead(web, native);
    expect(native.removed).toEqual([]);
    expect(goneMarkers(native)).toEqual([]);
    expect(native.files.get(fileForKey(LEGACY_SAVE_KEY))).toBe(LEAGUE);
    expect(native.files.get(fileForKey(liveMatchKey(1)))).toBe(MATCH);
    expect(web.map.get(liveMatchKey(1))).toBe(MATCH);
    expect(loadCareer(1).status).toBe('empty');
  });

  it('r5: the newer League .ready file is unreadable and the older Classic file is restored; nothing is erased', async () => {
    const native = nativeDir({ failRead: (n) => n === fileForKey(slotKey(2)) + '.ready' });
    native.files.set(fileForKey(slotKey(2)), classicRaw());
    native.files.set(fileForKey(slotKey(2)) + '.ready', LEAGUE);
    const web = webView();
    await bootAndRead(web, native);
    expect(native.removed).toEqual([]);
    expect(goneMarkers(native)).toEqual([]);
    expect(native.files.get(fileForKey(slotKey(2)) + '.ready')).toBe(LEAGUE);
    expect(loadCareer(2).status).toBe('empty');
  });

  it('r5: the native listing fails; the hidden legacy League checkpoint is not touched', async () => {
    const native = nativeDir({ failList: true });
    native.files.set(fileForKey(LEGACY_SAVE_KEY), LEAGUE);
    native.files.set(fileForKey(liveMatchKey(1)), MATCH);
    const web = webView();
    const classic = classicRaw();
    web.map.set(slotKey(1), classic);
    web.map.set(liveMatchKey(1), MATCH);
    await bootAndRead(web, native);
    // With no listing, main's sync rewrites what localStorage holds (same bytes); nothing is
    // removed for being Classic, and every League byte is still there.
    expect(goneMarkers(native)).toEqual([]);
    expect(native.files.get(fileForKey(liveMatchKey(1)))).toBe(MATCH);
    expect(web.map.get(liveMatchKey(1))).toBe(MATCH);
    expect(web.map.get(slotKey(1))).toBe(classic);
    expect(native.files.get(fileForKey(LEGACY_SAVE_KEY))).toBe(LEAGUE);
  });

  it('r5: a Classic legacy save is not migrated into slot 1, so no native legacy copy is removed', async () => {
    const native = nativeDir();
    const classic = classicRaw();
    native.files.set(fileForKey(LEGACY_SAVE_KEY), classic);
    const web = webView();
    await bootAndRead(web, native);
    expect(native.removed).toEqual([]);
    expect(web.map.get(slotKey(1))).toBeUndefined();
    expect(web.map.get(LEGACY_SAVE_KEY)).toBe(classic);
    expect(native.files.get(fileForKey(LEGACY_SAVE_KEY))).toBe(classic);
  });
});
