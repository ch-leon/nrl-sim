import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setStorage, deleteSlot, save, setActiveSlot, type StorageLike } from '../../src/core/save';
import { createNewGame, getState } from '../../src/core/state';
import { saveMetaKey, slotKey } from '../../src/core/storageKeys';
import { browserStorage, setMirroredStorage } from '../../src/core/storage/local';
import {
  fileForKey, isGameKey, keyForFile, mirroredStorage, NativeMirror, startNativeMirror, type NativeFiles,
} from '../../src/core/storage/nativeMirror';
import { bootNativeMirror, deliverFile, exportPath } from '../../src/core/storage/native';
import { isIosNative } from '../../src/core/storage/platform';

// docs/specs/ios.md Phase 2: in the iOS app every storage-layer write is mirrored to a
// native file per key, and the gaps are restored at launch. Web and Android: untouched.

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

type Call = { op: 'write' | 'rename' | 'remove' | 'read' | 'list'; name: string };

/** A Map-backed native directory. `fail` rejects matching calls; `gate` holds a write until released. */
function fakeFiles() {
  const files = new Map<string, string>();
  const calls: Call[] = [];
  let fail: ((c: Call) => boolean) | null = null;
  let gate: { promise: Promise<void>; release: () => void } | null = null;
  const step = async (c: Call): Promise<void> => {
    calls.push(c);
    if (c.op === 'write' && gate) await gate.promise;
    if (fail?.(c)) throw new Error(`native ${c.op} failed`);
  };
  const api: NativeFiles = {
    async list() { await step({ op: 'list', name: '' }); return [...files.keys()]; },
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
    hold() {
      let release!: () => void;
      gate = { promise: new Promise<void>((r) => { release = r; }), release: () => { gate = null; release(); } };
      return gate.release;
    },
  };
}

const quiet = (): ReturnType<typeof vi.fn> => vi.fn();

afterEach(() => {
  setMirroredStorage(null);
  __setStorage(null);
  vi.unstubAllGlobals();
});

describe('file names', () => {
  it('round-trips any key, and ignores temporary and stray files', () => {
    for (const key of ['nrl-sim-save-slot-1', 'nrl-sim-devtest:nrl-sim-save-slot-2', 'a/b%c.txt', 'x.txt.ready']) {
      expect(keyForFile(fileForKey(key))).toEqual({ key, ready: false });
      expect(keyForFile(fileForKey(key) + '.ready')).toEqual({ key, ready: true });
      expect(keyForFile(fileForKey(key) + '.tmp')).toBeNull();
    }
    expect(fileForKey('nrl-sim-devtest:k')).not.toContain(':');
    expect(keyForFile('.DS_Store')).toBeNull();
  });

  it('seeds only the game\'s own keys', () => {
    expect(isGameKey(slotKey(1))).toBe(true);
    expect(isGameKey('nrl-live-match-2')).toBe(true);
    expect(isGameKey('nrlsim.iosInstallHintShown')).toBe(true);
    expect(isGameKey('ph_phc_abc_posthog')).toBe(false);
  });
});

describe('restore at launch', () => {
  it('fills only the gaps: a key localStorage has is never overwritten', async () => {
    const native = fakeFiles();
    native.files.set(fileForKey('kept'), 'native-old');
    native.files.set(fileForKey('lost'), 'native-copy');
    const storage = fakeStorage();
    storage.map.set('kept', 'web-current');
    const restored = await new NativeMirror(native.api, quiet()).restore(storage);
    expect(restored).toEqual(['lost']);
    expect(storage.map.get('kept')).toBe('web-current');
    expect(storage.map.get('lost')).toBe('native-copy');
  });

  it('prefers the complete newer .ready copy, falls back to the file, never reads .tmp', async () => {
    const native = fakeFiles();
    native.files.set(fileForKey('a'), 'old');
    native.files.set(fileForKey('a') + '.ready', 'new');
    native.files.set(fileForKey('b') + '.tmp', 'torn{');
    native.files.set(fileForKey('c'), 'only');
    const storage = fakeStorage();
    await new NativeMirror(native.api, quiet()).restore(storage);
    expect(storage.map.get('a')).toBe('new');
    expect(storage.map.has('b')).toBe(false);
    expect(storage.map.get('c')).toBe('only');
    expect(native.calls.some((c) => c.op === 'read' && c.name.endsWith('.tmp'))).toBe(false);
  });

  it('an unreadable .ready falls back to the last complete file', async () => {
    const native = fakeFiles();
    native.files.set(fileForKey('a'), 'old');
    native.files.set(fileForKey('a') + '.ready', 'new');
    native.failWhen((c) => c.op === 'read' && c.name.endsWith('.ready'));
    const storage = fakeStorage();
    await new NativeMirror(native.api, quiet()).restore(storage);
    expect(storage.map.get('a')).toBe('old');
  });

  it('a crash at any step of a write leaves the old value or the new one, never a torn one', async () => {
    // Fail the Nth native call of an overwrite (a stand-in for the app dying there),
    // then restore into an emptied web view.
    for (let n = 0; n < 5; n++) {
      const native = fakeFiles();
      native.files.set(fileForKey('slot'), 'old');
      const mirror = new NativeMirror(native.api, quiet());
      let seen = 0;
      native.failWhen((c) => c.op !== 'list' && c.op !== 'read' && seen++ >= n);
      mirror.set('slot', 'new');
      await mirror.idle();
      native.failWhen(null);
      const storage = fakeStorage();
      await new NativeMirror(native.api, quiet()).restore(storage);
      expect(['old', 'new']).toContain(storage.map.get('slot'));
    }
  });
});

describe('writes and deletes', () => {
  it('mirrors a write after localStorage took it, one file per key', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    const s = mirroredStorage(storage, mirror);
    s.setItem('k', 'v1');
    expect(storage.map.get('k')).toBe('v1'); // the working copy at once
    await mirror.idle();
    expect([...native.files]).toEqual([[fileForKey('k'), 'v1']]);
  });

  it('a delete removes the native copy, so the save cannot come back', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    const s = mirroredStorage(storage, mirror);
    s.setItem('k', 'v1');
    await mirror.idle();
    native.files.set(fileForKey('k') + '.ready', 'half-way'); // a write interrupted earlier
    s.removeItem('k');
    await mirror.idle();
    expect(native.files.size).toBe(0);
    const fresh = fakeStorage();
    expect(await new NativeMirror(native.api, quiet()).restore(fresh)).toEqual([]);
    expect(fresh.map.size).toBe(0);
  });

  it('applies one key\'s writes in order and the last one wins', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    const release = native.hold(); // the first native write is slow
    s.setItem('k', 'v1');
    s.setItem('k', 'v2');
    s.setItem('k', 'v3');
    release();
    await mirror.idle();
    expect(native.files.get(fileForKey('k'))).toBe('v3');
    // v2 was superseded while v1 was in flight: two native writes, not three.
    expect(native.calls.filter((c) => c.op === 'write')).toHaveLength(2);
  });

  it('a delete queued behind a write wins, and a write behind a delete wins', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    let release = native.hold();
    s.setItem('k', 'v1');
    s.removeItem('k');
    release();
    await mirror.idle();
    expect(native.files.size).toBe(0);
    s.setItem('k', 'v1');
    await mirror.idle();
    release = native.hold();
    s.setItem('k', 'v2'); // in flight
    s.removeItem('k');
    s.setItem('k', 'v3');
    release();
    await mirror.idle();
    expect([...native.files]).toEqual([[fileForKey('k'), 'v3']]);
  });

  it('keys do not wait on each other', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const s = mirroredStorage(fakeStorage(), mirror);
    const release = native.hold();
    s.setItem('a', '1');
    s.setItem('b', '2');
    expect(native.calls.filter((c) => c.op === 'write').map((c) => c.name)).toEqual([`${fileForKey('a')}.tmp`, `${fileForKey('b')}.tmp`]);
    release();
    await mirror.idle();
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
    expect(() => s.setItem('k', 'v1')).not.toThrow();
    expect(storage.map.get('k')).toBe('v1');
    await mirror.idle();
    expect(log).toHaveBeenCalledOnce();
    native.failWhen(null);
    s.setItem('k', 'v2');
    await mirror.idle();
    expect(native.files.get(fileForKey('k'))).toBe('v2');
  });

  it('a localStorage write that throws is not mirrored', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const s = mirroredStorage(storage, mirror);
    expect(() => s.setItem('k', 'v')).toThrow('QuotaExceededError');
    await mirror.idle();
    expect(native.calls).toEqual([]);
  });

  it('an unlistable native directory restores nothing and boot goes on, mirrored', async () => {
    const native = fakeFiles();
    native.failWhen((c) => c.op === 'list');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'save');
    const install = vi.fn();
    const start = await startNativeMirror({ ios: true, storage, keys: () => [...storage.map.keys()], loadFiles: async () => native.api, install, log: quiet() });
    expect(start).toBe('active');
    expect(install).toHaveBeenCalledOnce();
    expect(storage.map.get(slotKey(1))).toBe('save');
  });

  it('a native layer that will not load leaves boot with localStorage and nothing mirrored', async () => {
    const storage = fakeStorage();
    const install = vi.fn();
    const log = quiet();
    const start = await startNativeMirror({ ios: true, storage, keys: () => [], loadFiles: () => Promise.reject(new Error('no plugin')), install, log });
    expect(start).toBe('failed');
    expect(install).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });
});

describe('boot on iOS', () => {
  it('restores, installs the mirror, then copies game keys that had no native file yet', async () => {
    const native = fakeFiles();
    native.files.set(fileForKey(slotKey(2)), 'slot-2-from-native');
    const storage = fakeStorage();
    storage.map.set(slotKey(1), 'slot-1');
    storage.map.set('ph_posthog', 'analytics');
    let installed: StorageLike | null = null;
    const start = await startNativeMirror({
      ios: true, storage, keys: () => [...storage.map.keys()], loadFiles: async () => native.api,
      install: (s) => { installed = s; }, log: quiet(),
    });
    expect(start).toBe('active');
    expect(storage.map.get(slotKey(2))).toBe('slot-2-from-native');
    // Let the seed writes land (each is a chain of awaited native calls).
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(native.files.get(fileForKey(slotKey(1)))).toBe('slot-1');
    expect(native.files.has(fileForKey('ph_posthog'))).toBe(false);
    expect(native.calls.filter((c) => c.op === 'write' && c.name.startsWith(fileForKey(slotKey(2))))).toEqual([]);
    installed!.setItem(slotKey(3), 'slot-3');
    expect(storage.map.get(slotKey(3))).toBe('slot-3');
  });

  it('the game\'s own saves and deletes reach the native copy (save.ts through the mirror)', async () => {
    const native = fakeFiles();
    const mirror = new NativeMirror(native.api, quiet());
    const storage = fakeStorage();
    __setStorage(mirroredStorage(storage, mirror));
    createNewGame('Mirror FC', 7);
    setActiveSlot(2);
    save(getState());
    await Promise.resolve(); // the meta sidecar is written a microtask later
    await mirror.idle();
    expect(native.files.get(fileForKey(slotKey(2)))).toBe(storage.map.get(slotKey(2)));
    expect(native.files.get(fileForKey(saveMetaKey(2)))).toBe(storage.map.get(saveMetaKey(2)));
    deleteSlot(2);
    await mirror.idle();
    expect(native.files.has(fileForKey(slotKey(2)))).toBe(false);
    expect(native.files.has(fileForKey(saveMetaKey(2)))).toBe(false);
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
    const storage = fakeStorage();
    expect(await startNativeMirror({ ios: false, storage, keys: () => [], loadFiles, install })).toBe('inactive');
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

  it('the browser path downloads at once and never touches the share sheet', () => {
    const download = vi.fn();
    const share = vi.fn();
    deliverFile('a.json', '{}', vi.fn(), { path: 'browser-download', download, share });
    expect(download).toHaveBeenCalledWith('a.json', '{}');
    expect(share).not.toHaveBeenCalled();
  });

  it('the iOS path shares the file, and says so when the sheet fails', async () => {
    const download = vi.fn();
    const failed = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    deliverFile('a.json', '{}', failed, { path: 'share-sheet', download, share: async () => {} });
    await Promise.resolve();
    expect(failed).not.toHaveBeenCalled();
    deliverFile('a.json', '{}', failed, { path: 'share-sheet', download, share: () => Promise.reject(new Error('no sheet')) });
    await Promise.resolve();
    await Promise.resolve();
    expect(failed).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
