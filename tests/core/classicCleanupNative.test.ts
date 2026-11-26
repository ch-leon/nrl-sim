// Codex r4 blocker 2 (#819): on iPhone a legacy League save whose native copy could
// not be restored into the web view (quota) must not be erased by the Classic cleanup.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setStorage, deleteClassicSlots, type StorageLike } from '../../src/core/save';
import { createNewGame } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { LEGACY_SAVE_KEY, slotKey } from '../../src/core/storageKeys';
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

function nativeDir(): { api: NativeFiles; files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    api: {
      async list() { return [...files.keys()]; },
      async exists(name) { return files.has(name); },
      async read(name) { const v = files.get(name); if (v === undefined) throw new Error('missing'); return v; },
      async write(name, text) { files.set(name, text); },
      async rename(from, to) { const v = files.get(from); if (v === undefined) throw new Error('missing'); files.delete(from); files.set(to, v); },
      async remove(name) { files.delete(name); },
    },
  };
}

/** Web Storage that refuses the legacy key, as a full quota would. */
function webView(refuseLegacy: boolean): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (refuseLegacy && k === LEGACY_SAVE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => { map.delete(k); },
  };
}

async function boot(web: ReturnType<typeof webView>, native: ReturnType<typeof nativeDir>): Promise<NativeMirror> {
  let mirror!: NativeMirror;
  const start = await bootNativeMirror({
    ios: true, storage: web, keys: () => [...web.map.keys()], loadFiles: async () => native.api,
    install: (storage, m) => { mirror = m; setMirroredStorage(storage); __setStorage(storage); }, log: vi.fn(),
  });
  expect(start).toBe('active');
  return mirror;
}

describe('Classic cleanup with the iPhone native mirror', () => {
  it('leaves slot 1 alone when the legacy League save could not be restored, and keeps its native file', async () => {
    const classic = classicRaw();
    const native = nativeDir();
    native.files.set(fileForKey(slotKey(1)), classic);
    native.files.set(fileForKey(LEGACY_SAVE_KEY), LEAGUE);
    const web = webView(true);
    web.map.set(slotKey(1), classic);
    const mirror = await boot(web, native);
    expect(web.map.has(LEGACY_SAVE_KEY)).toBe(false);
    expect(deleteClassicSlots()).toEqual([]);
    await mirror.idle();
    expect(native.files.get(fileForKey(LEGACY_SAVE_KEY))).toBe(LEAGUE);
    expect([...native.files.keys()].some((n) => n.startsWith(fileForKey(LEGACY_SAVE_KEY)) && n.endsWith('.gone'))).toBe(false);
    expect(web.map.get(slotKey(1))).toBe(classic);
  });

  it('after a clean restore deletes only the Classic slot key, natively too, and keeps the legacy League save', async () => {
    const classic = classicRaw();
    const native = nativeDir();
    native.files.set(fileForKey(slotKey(1)), classic);
    native.files.set(fileForKey(LEGACY_SAVE_KEY), LEAGUE);
    const web = webView(false);
    const mirror = await boot(web, native);
    expect(web.map.get(LEGACY_SAVE_KEY)).toBe(LEAGUE);
    expect(deleteClassicSlots()).toEqual([1]);
    await mirror.idle();
    expect(web.map.has(slotKey(1))).toBe(false);
    expect(web.map.get(LEGACY_SAVE_KEY)).toBe(LEAGUE);
    expect(native.files.get(fileForKey(LEGACY_SAVE_KEY))).toBe(LEAGUE);
    expect(native.files.get(fileForKey(slotKey(1)))).toBeUndefined();
  });
});
