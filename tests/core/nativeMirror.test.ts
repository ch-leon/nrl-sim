import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setStorage, deleteSlot, listSlotMeta, loadSlot, save, setActiveSlot, type StorageLike } from '../../src/core/save';
import { createNewGame, getState } from '../../src/core/state';
import {
  COMMERCIAL_FIRST_RUN_KEY, CORRUPT_SAVE_KEY, DEV_TEST_BACKUP_KEY, DEV_TEST_DISPLACED_KEY, DEV_TEST_PREFIX, DEVICE_ID_KEY,
  ENTITLEMENTS_CACHE_KEY, ENTITLEMENTS_STUB_KEY, IOS_INSTALL_HINT_KEY, LABS_KEY, LEGACY_SAVE_KEY, LOG_MODE_KEY,
  liveMatchKey, recoveryKey, saveMetaKey, slotKey,
} from '../../src/core/storageKeys';
import { browserStorage, setMirroredStorage } from '../../src/core/storage/local';
import {
  fileForKey, isMirroredKey, keyForFile, mirroredStorage, NativeMirror, startNativeMirror, type NativeFiles,
} from '../../src/core/storage/nativeMirror';
import { bootNativeMirror, deliverFile, exportPath } from '../../src/core/storage/native';
import { isIosNative } from '../../src/core/storage/platform';
import { CACHE_KEY, STUB_KEY, commercialStorage } from '../../src/commercial/entitlements';
import { FIRST_RUN_KEY } from '../../src/commercial/demo';
import { LOG_MODE_KEY as OVERLAY_LOG_MODE_KEY } from '../../src/ui/screens/matchOverlay';
import capacitorConfig from '../../capacitor.config';

// docs/specs/ios.md Phase 2: in the iOS app every storage-layer write of a mirrored key
// goes to a native file too, and the two sides are synced at launch. Web and Android:
// untouched.

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

type Call = { op: 'write' | 'rename' | 'remove' | 'read' | 'list' | 'exists'; name: string };

/** A Map-backed native directory. `failWhen` rejects matching calls; `hold` holds writes until released. */
function fakeFiles() {
  const files = new Map<string, string>();
  const calls: Call[] = [];
  let fail: ((c: Call) => boolean) | null = null;
  let gate: Promise<void> | null = null;
  const step = async (c: Call): Promise<void> => {
    calls.push(c);
    if (c.op === 'write' && gate) await gate;
    if (fail?.(c)) throw new Error(`native ${c.op} failed`);
  };
  const api: NativeFiles = {
    async list() { await step({ op: 'list', name: '' }); return [...files.keys()]; },
    async exists(name) { await step({ op: 'exists', name }); return files.has(name); },
    async read(name) {
      await step({ op: 'read', name });
      const v = files.get(name);
      if (v === undefined) throw new Error('missing');
      return v;
    },
    async write(name, text) { await step({ op: 'write', name }); files.set(name, text); },
    async rename(from, to) {
      await step({ op: 'rename', name: from });
      const v = files.get(from);
      if (v === undefined) throw new Error('missing');
      files.delete(from);
      files.set(to, v);
    },
    async remove(name) { await step({ op: 'remove', name }); files.delete(name); },
  };
  return {
    api, files, calls,
    failWhen(f: ((c: Call) => boolean) | null) { fail = f; },
    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((r) => { release = r; });
      return () => { gate = null; release(); };
    },
  };
}

/** Fail every mutating native call from the nth one on: a stand-in for the app being killed there. */
function killAfter(native: ReturnType<typeof fakeFiles>, n: number): void {
  let seen = 0;
  native.failWhen((c) => (c.op === 'write' || c.op === 'rename' || c.op === 'remove') && seen++ >= n);
}

const quiet = (): ReturnType<typeof vi.fn> => vi.fn();
const F = fileForKey;

/** What a launch after the web view was wiped would put back. */
async function afterWipe(native: ReturnType<typeof fakeFiles>): Promise<Map<string, string>> {
  native.failWhen(null);
  const storage = fakeStorage();
  const mirror = new NativeMirror(native.api, quiet());
  await mirror.sync(storage, []);
  await mirror.idle();
  return storage.map;
}

afterEach(() => {
  setMirroredStorage(null);
  __setStorage(null);
  vi.unstubAllGlobals();
});

describe('which keys are mirrored', () => {
  it('the career and the player\'s choices, named from storageKeys.ts', () => {
    const mirrored = [
      ...[1, 2, 3].flatMap((s) => [slotKey(s), saveMetaKey(s), liveMatchKey(s), recoveryKey(s)]),
      LEGACY_SAVE_KEY, DEVICE_ID_KEY, LABS_KEY, IOS_INSTALL_HINT_KEY, LOG_MODE_KEY,
      ENTITLEMENTS_CACHE_KEY, ENTITLEMENTS_STUB_KEY, COMMERCIAL_FIRST_RUN_KEY,
    ];
    for (const key of mirrored) expect(isMirroredKey(key), key).toBe(true);
    expect(mirrored).toEqual(expect.arrayContaining([
      'nrl-sim-save-slot-1', 'nrl-sim-save-meta-2', 'nrl-live-match-3', 'nrl-sim-save-recovery-1', 'nrl-sim-save-v1',
      'nrl-sim-device-id', 'nrl-sim-labs', 'nrlsim.iosInstallHintShown', 'nrlsim.logMode',
      'nrl-sim-entitlements-cache', 'nrl-sim-entitlements-stub', 'nrl-sim-commercial-first-run',
    ]));
  });

  it('leaves out the playtest career, the corrupt copy and anything not the game\'s', () => {
    for (const key of [
      DEV_TEST_PREFIX + slotKey(1), DEV_TEST_PREFIX + saveMetaKey(1), DEV_TEST_PREFIX + DEVICE_ID_KEY,
      DEV_TEST_BACKUP_KEY, DEV_TEST_DISPLACED_KEY, CORRUPT_SAVE_KEY,
      'ph_phc_abc_posthog', 'nrl-sim-save-slot-', 'nrl-sim-save-slot-x', 'nrl-sim-save-slot-01', 'nrl-sim-other',
    ]) expect(isMirroredKey(key), key).toBe(false);
  });

  it('the commercial keys and the log mode are the same strings their modules use, through the storage layer', () => {
    expect([CACHE_KEY, STUB_KEY, FIRST_RUN_KEY, OVERLAY_LOG_MODE_KEY]).toEqual([
      'nrl-sim-entitlements-cache', 'nrl-sim-entitlements-stub', 'nrl-sim-commercial-first-run', 'nrlsim.logMode',
    ]);
    const wrapped = fakeStorage();
    setMirroredStorage(wrapped);
    expect(commercialStorage()).toBe(wrapped);
  });

  it('writes of other keys are not mirrored', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    s.setItem(DEV_TEST_PREFIX + slotKey(1), 'test career');
    s.setItem(CORRUPT_SAVE_KEY, 'bad');
    s.removeItem(DEV_TEST_BACKUP_KEY);
    await mirror.idle();
    expect(native.calls).toEqual([]);
  });

  it('file names round-trip any key and tell the parts apart', () => {
    for (const key of ['nrl-sim-save-slot-1', 'a/b%c.txt', 'x.txt.ready']) {
      expect(keyForFile(F(key))).toEqual({ key, part: 'final' });
      for (const part of ['ready', 'tmp', 'gone'] as const) expect(keyForFile(`${F(key)}.${part}`)).toEqual({ key, part });
    }
    expect(keyForFile('.DS_Store')).toBeNull();
  });
});

describe('boot sync: restore', () => {
  it('fills only the gaps: a key localStorage has is never overwritten', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)), 'native-old');
    native.files.set(F(slotKey(2)), 'native-copy');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'web-current');
    const restored = await new NativeMirror(native.api, quiet()).sync(storage, [slotKey(1)]);
    expect(restored).toEqual([slotKey(2)]);
    expect(storage.map.get(slotKey(1))).toBe('web-current');
    expect(storage.map.get(slotKey(2))).toBe('native-copy');
  });

  it('prefers the complete newer .ready copy, falls back to the file, never reads .tmp', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)), 'old');
    native.files.set(F(slotKey(1)) + '.ready', 'new');
    native.files.set(F(slotKey(2)) + '.tmp', 'torn{');
    native.files.set(F(slotKey(3)), 'only');
    const map = await afterWipe(native);
    expect(map.get(slotKey(1))).toBe('new');
    expect(map.has(slotKey(2))).toBe(false);
    expect(map.get(slotKey(3))).toBe('only');
    expect(native.calls.some((c) => c.op === 'read' && c.name.endsWith('.tmp'))).toBe(false);
  });

  it('an unreadable .ready falls back to the last complete file', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)), 'old');
    native.files.set(F(slotKey(1)) + '.ready', 'new');
    native.failWhen((c) => c.op === 'read' && c.name.endsWith('.ready'));
    const storage = fakeStorage();
    await new NativeMirror(native.api, quiet()).sync(storage, []);
    expect(storage.map.get(slotKey(1))).toBe('old');
  });

  it('never restores a key it does not mirror', async () => {
    const native = fakeFiles();
    native.files.set(F(CORRUPT_SAVE_KEY), 'old corrupt');
    native.files.set(F(DEV_TEST_BACKUP_KEY), 'backup');
    expect((await afterWipe(native)).size).toBe(0);
  });

  it('reads the native copies in parallel', async () => {
    const native = fakeFiles();
    for (const s of [1, 2, 3]) native.files.set(F(slotKey(s)), `slot ${s}`);
    let inFlight = 0;
    let most = 0;
    const read = native.api.read.bind(native.api);
    native.api.read = async (name) => {
      inFlight++; most = Math.max(most, inFlight);
      await Promise.resolve();
      try { return await read(name); } finally { inFlight--; }
    };
    await new NativeMirror(native.api, quiet()).sync(fakeStorage(), []);
    expect(most).toBe(3);
  });
});

describe('boot sync: reconcile (localStorage wins)', () => {
  it('rewrites a native copy older than localStorage, so a later wipe brings back the newer save', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)), 'week 3'); // the app was suspended before week 4 reached native
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'week 4');
    const mirror = new NativeMirror(native.api, quiet());
    await mirror.sync(storage, [...storage.map.keys()]);
    await mirror.idle();
    expect(native.files.get(F(slotKey(1)))).toBe('week 4');
    expect((await afterWipe(native)).get(slotKey(1))).toBe('week 4');
  });

  it('copies a key with no native file yet, and leaves a matching one alone', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(2)), 'same');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'from before the mirror');
    storage.map.set(slotKey(2), 'same');
    storage.map.set('ph_posthog', 'analytics');
    const mirror = new NativeMirror(native.api, quiet());
    await mirror.sync(storage, [...storage.map.keys()]);
    await mirror.idle();
    expect(native.files.get(F(slotKey(1)))).toBe('from before the mirror');
    expect(native.calls.filter((c) => c.op === 'write' && c.name.startsWith(F(slotKey(2))))).toEqual([]);
    expect(native.files.has(F('ph_posthog'))).toBe(false);
  });

  it('a key localStorage has but native marked deleted is written again (localStorage wins)', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)) + '.gone', '');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'kept');
    const mirror = new NativeMirror(native.api, quiet());
    await mirror.sync(storage, [slotKey(1)]);
    await mirror.idle();
    expect([...native.files]).toEqual([[F(slotKey(1)), 'kept']]);
  });
});

describe('writes', () => {
  it('mirrors a write after localStorage took it', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    const s = mirroredStorage(storage, mirror);
    s.setItem(slotKey(1), 'v1');
    expect(storage.map.get(slotKey(1))).toBe('v1'); // the working copy at once
    await mirror.idle();
    expect([...native.files]).toEqual([[F(slotKey(1)), 'v1']]);
  });

  it('applies one key\'s writes in order and the last one wins', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    const release = native.hold(); // the first native write is slow
    s.setItem(slotKey(1), 'v1');
    s.setItem(slotKey(1), 'v2');
    s.setItem(slotKey(1), 'v3');
    release();
    await mirror.idle();
    expect([...native.files]).toEqual([[F(slotKey(1)), 'v3']]);
    // v2 was superseded while v1 was in flight: two native writes, not three.
    expect(native.calls.filter((c) => c.op === 'write')).toHaveLength(2);
  });

  it('a crash at any step of an overwrite leaves the old value or the new one, never a torn one or nothing', async () => {
    for (let n = 0; n < 8; n++) {
      const native = fakeFiles();
      native.files.set(F(slotKey(1)), 'old');
      const mirror = new NativeMirror(native.api, quiet());
      killAfter(native, n);
      mirror.set(slotKey(1), 'new');
      await mirror.idle();
      expect(['old', 'new'], `killed at step ${n}`).toContain((await afterWipe(native)).get(slotKey(1)));
    }
  });

  it('never removes the only good copy: a write cut short after removing the file, then another write killed at any step', async () => {
    for (let n = 0; n < 8; n++) {
      const native = fakeFiles();
      native.files.set(F(slotKey(1)) + '.ready', 'week 5'); // the file was removed, the rename never ran
      const mirror = new NativeMirror(native.api, quiet());
      killAfter(native, n);
      mirror.set(slotKey(1), 'week 6');
      await mirror.idle();
      expect(['week 5', 'week 6'], `killed at step ${n}`).toContain((await afterWipe(native)).get(slotKey(1)));
    }
  });

  it('a later write clears the deleted marker', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    s.setItem(slotKey(1), 'v1');
    s.removeItem(slotKey(1));
    await mirror.idle();
    expect([...native.files.keys()]).toEqual([F(slotKey(1)) + '.gone']);
    s.setItem(slotKey(1), 'new career');
    await mirror.idle();
    expect([...native.files]).toEqual([[F(slotKey(1)), 'new career']]);
    expect((await afterWipe(native)).get(slotKey(1))).toBe('new career');
  });
});

describe('deletes cannot come back', () => {
  it('a delete leaves only the marker, and a wipe restores nothing', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    s.setItem(slotKey(1), 'v1');
    await mirror.idle();
    native.files.set(F(slotKey(1)) + '.ready', 'half-way'); // a write interrupted earlier
    s.removeItem(slotKey(1));
    await mirror.idle();
    expect([...native.files.keys()]).toEqual([F(slotKey(1)) + '.gone']);
    expect((await afterWipe(native)).size).toBe(0);
  });

  it('killed at any step of a delete, the save does not come back, and the next launch finishes the removal', async () => {
    for (let n = 1; n < 5; n++) { // step 0 is the marker itself: see the next test
      const native = fakeFiles();
      native.files.set(F(slotKey(1)), 'old');
      native.files.set(F(slotKey(1)) + '.ready', 'newer');
      const mirror = new NativeMirror(native.api, quiet());
      killAfter(native, n);
      mirror.remove(slotKey(1));
      await mirror.idle();
      expect((await afterWipe(native)).has(slotKey(1)), `killed at step ${n}`).toBe(false);
      expect([...native.files.keys()], `cleaned after step ${n}`).toEqual([F(slotKey(1)) + '.gone']);
    }
  });

  it('a delete whose marker cannot be written still removes every copy, and is logged', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(1)), 'old');
    native.files.set(F(slotKey(1)) + '.ready', 'newer');
    native.failWhen((c) => c.op === 'write' && c.name.endsWith('.gone'));
    const log = quiet();
    const mirror = new NativeMirror(native.api, log);
    mirror.remove(slotKey(1));
    await mirror.idle();
    expect(native.files.size).toBe(0);
    expect(log).toHaveBeenCalledOnce();
    expect((await afterWipe(native)).size).toBe(0);
  });

  it('a delete queued behind a write wins, and a write behind a delete wins', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    let release = native.hold();
    s.setItem(slotKey(1), 'v1');
    s.removeItem(slotKey(1));
    release();
    await mirror.idle();
    expect((await afterWipe(native)).size).toBe(0);
    release = native.hold();
    s.setItem(slotKey(1), 'v2');
    s.removeItem(slotKey(1));
    s.setItem(slotKey(1), 'v3');
    release();
    await mirror.idle();
    expect([...native.files]).toEqual([[F(slotKey(1)), 'v3']]);
  });
});

describe('a native failure never breaks the game', () => {
  it('a failed native write is logged; the localStorage write stands and the next write still lands', async () => {
    const native = fakeFiles();
    const log = quiet();
    const mirror = new NativeMirror(native.api, log);
    const storage = fakeStorage();
    const s = mirroredStorage(storage, mirror);
    native.failWhen((c) => c.op === 'write');
    expect(() => s.setItem(slotKey(1), 'v1')).not.toThrow();
    expect(storage.map.get(slotKey(1))).toBe('v1');
    await mirror.idle();
    expect(log).toHaveBeenCalledOnce();
    native.failWhen(null);
    s.setItem(slotKey(1), 'v2');
    await mirror.idle();
    expect(native.files.get(F(slotKey(1)))).toBe('v2');
  });

  it('a localStorage write that throws is not mirrored', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const s = mirroredStorage(storage, mirror);
    expect(() => s.setItem(slotKey(1), 'v')).toThrow('QuotaExceededError');
    await mirror.idle();
    expect(native.calls).toEqual([]);
  });

  it('an unlistable native directory restores nothing and boot goes on, mirrored', async () => {
    const native = fakeFiles();
    native.failWhen((c) => c.op === 'list');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'save');
    const install = vi.fn();
    const { start } = await startNativeMirror({ ios: true, storage, keys: () => [...storage.map.keys()], loadFiles: async () => native.api, install, log: quiet() });
    expect(start).toBe('active');
    expect(install).toHaveBeenCalledOnce();
    expect(storage.map.get(slotKey(1))).toBe('save');
  });

  it('a native layer that will not load leaves boot with localStorage and nothing mirrored', async () => {
    const install = vi.fn();
    const log = quiet();
    const { start } = await startNativeMirror({ ios: true, storage: fakeStorage(), keys: () => [], loadFiles: () => Promise.reject(new Error('no plugin')), install, log });
    expect(start).toBe('failed');
    expect(install).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });
});

describe('boot on iOS, through save.ts', () => {
  it('syncs, installs the mirror, and mirrors from then on', async () => {
    const native = fakeFiles();
    native.files.set(F(slotKey(2)), 'slot-2-from-native');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'slot-1');
    let installed: StorageLike | null = null;
    const { start, mirror } = await startNativeMirror({
      ios: true, storage, keys: () => [...storage.map.keys()], loadFiles: async () => native.api,
      install: (s) => { installed = s; }, log: quiet(),
    });
    expect(start).toBe('active');
    expect(storage.map.get(slotKey(2))).toBe('slot-2-from-native');
    installed!.setItem(slotKey(3), 'slot-3');
    await mirror!.idle();
    expect(native.files.get(F(slotKey(1)))).toBe('slot-1');
    expect(native.files.get(F(slotKey(3)))).toBe('slot-3');
  });

  it('the game\'s own saves and deletes reach the native copy', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    __setStorage(mirroredStorage(storage, mirror));
    createNewGame('Mirror FC', 7);
    setActiveSlot(2);
    save(getState());
    await Promise.resolve(); // the meta sidecar is written a microtask later
    await mirror.idle();
    expect(native.files.get(F(slotKey(2)))).toBe(storage.map.get(slotKey(2)));
    expect(native.files.get(F(saveMetaKey(2)))).toBe(storage.map.get(saveMetaKey(2)));
    deleteSlot(2);
    await mirror.idle();
    expect([...(await afterWipe(native)).keys()]).toEqual([DEVICE_ID_KEY]); // the career is gone; the device keeps its id
  });

  /** A real slot 2 save and its meta, as the game writes them. */
  async function savedSlot(): Promise<{ payload: string; meta: string }> {
    const storage = fakeStorage();
    __setStorage(storage);
    createNewGame('Restored FC', 11);
    setActiveSlot(2);
    save(getState());
    await Promise.resolve();
    __setStorage(null);
    return { payload: storage.map.get(slotKey(2))!, meta: storage.map.get(saveMetaKey(2))! };
  }

  it('a slot restored without its meta loads, and lists with meta rebuilt from the payload', async () => {
    const { payload } = await savedSlot();
    const native = fakeFiles();
    native.files.set(F(slotKey(2)), payload);
    const storage = fakeStorage();
    await new NativeMirror(native.api, quiet()).sync(storage, []);
    __setStorage(storage);
    const loaded = loadSlot(2);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.clubName).toBe('Restored FC');
    const listing = listSlotMeta().find((l) => l.slot === 2)!;
    expect(listing.present).toBe(true);
    expect(listing.meta?.updatedAt).toBe(0); // unknown time: the oldest
    expect(listing.meta?.club).toBe('Restored FC');
  });

  it('meta restored without its slot is an empty slot', async () => {
    const { meta } = await savedSlot();
    const native = fakeFiles();
    native.files.set(F(saveMetaKey(2)), meta);
    const storage = fakeStorage();
    await new NativeMirror(native.api, quiet()).sync(storage, []);
    expect(storage.map.get(saveMetaKey(2))).toBe(meta);
    __setStorage(storage);
    expect(loadSlot(2).status).toBe('empty');
    expect(listSlotMeta().find((l) => l.slot === 2)).toEqual({ slot: 2, present: false, meta: null });
  });

  it('main.ts awaits the mirror before anything reads a save', () => {
    const main = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
    const boot = main.slice(main.indexOf('async function boot()'));
    const mirror = boot.indexOf('if (isIosNative()) await bootNativeMirror();');
    expect(mirror).toBeGreaterThan(0);
    for (const read of ['bootCareerNamespace(', 'getSlotSummaries(', 'hasSave(', 'showTitleFlow(', 'loadSlot(', 'readLiveMatch(', 'initLandscapeGuard(']) {
      expect(boot.indexOf(read), read).toBeGreaterThan(mirror);
    }
  });
});

describe('web and Android: the mirror is off', () => {
  it('isIosNative is true only for the iOS Capacitor bridge', () => {
    expect(isIosNative({})).toBe(false); // a browser: no bridge
    expect(isIosNative({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } })).toBe(false);
    expect(isIosNative({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } })).toBe(false);
    expect(isIosNative({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } })).toBe(true);
    expect(isIosNative(null)).toBe(false);
  });

  it('startNativeMirror off iOS loads nothing and installs nothing', async () => {
    const loadFiles = vi.fn();
    const install = vi.fn();
    expect((await startNativeMirror({ ios: false, storage: fakeStorage(), keys: () => [], loadFiles, install })).start).toBe('inactive');
    expect(loadFiles).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  it('bootNativeMirror in a browser (and the Android app) leaves browserStorage as it was', async () => {
    const before = browserStorage();
    expect(await bootNativeMirror()).toBe('inactive');
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' });
    expect(await bootNativeMirror()).toBe('inactive');
    expect(browserStorage()).toBe(before);
  });

  it('the Android app links no plugins and keeps its id and name', () => {
    expect(capacitorConfig.android?.includePlugins).toEqual([]);
    expect(capacitorConfig.appId).toBe('au.supercooked.nrlsim.test');
    expect(capacitorConfig.appName).toBe('NRL Sim (Test)');
  });
});

describe('export', () => {
  it('shares on iOS and downloads everywhere else', () => {
    expect(exportPath(true)).toBe('share-sheet');
    expect(exportPath(false)).toBe('browser-download');
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' });
    expect(exportPath()).toBe('browser-download');
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'ios' });
    expect(exportPath()).toBe('share-sheet');
  });

  it('the browser path downloads and says so at once, never touching the share sheet', () => {
    const download = vi.fn();
    const share = vi.fn();
    const onDelivered = vi.fn();
    deliverFile('a.json', '{}', { onDelivered, onShareFailed: vi.fn() }, { path: 'browser-download', download, share });
    expect(download).toHaveBeenCalledWith('a.json', '{}');
    expect(onDelivered).toHaveBeenCalledOnce();
    expect(share).not.toHaveBeenCalled();
  });

  it('the iOS path says "exported" only once shared, nothing on a cancel, and the failure alone when it fails', async () => {
    const download = vi.fn();
    const settle = async (): Promise<void> => { for (let i = 0; i < 3; i++) await Promise.resolve(); };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const run = async (share: () => Promise<boolean>) => {
      const onDelivered = vi.fn();
      const onShareFailed = vi.fn();
      deliverFile('a.json', '{}', { onDelivered, onShareFailed }, { path: 'share-sheet', download, share });
      expect(onDelivered).not.toHaveBeenCalled(); // not before the sheet resolves
      await settle();
      return { delivered: onDelivered.mock.calls.length, failed: onShareFailed.mock.calls.length };
    };
    expect(await run(async () => true)).toEqual({ delivered: 1, failed: 0 });
    expect(await run(async () => false)).toEqual({ delivered: 0, failed: 0 });
    expect(await run(() => Promise.reject(new Error('no sheet')))).toEqual({ delivered: 0, failed: 1 });
    expect(download).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
