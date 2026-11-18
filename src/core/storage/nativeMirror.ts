// src/core/storage/nativeMirror.ts — a native copy of every save key, for the iOS app
// (docs/specs/ios.md Phase 2, docs/specs/commercial-saves.md "Native mirror").
//
// iOS may clear a web view's localStorage (Capacitor's docs call it transient). So in
// the iOS app, localStorage stays the working copy and every write and delete made
// through the storage layer (browserStorage(), local.ts) is also applied to one native
// file per key. At launch, before the game reads a save, a key that has a native file
// but is missing from localStorage is put back. Web and Android never get here.
//
// Pure: the native side is the small NativeFiles interface (capacitorFiles.ts is the
// Capacitor one, loaded lazily; tests use a Map). No timers: every native write is
// started by the storage write that caused it.
//
// The rules:
//  - Restore only fills gaps. It never overwrites a key localStorage already has.
//  - A delete removes the native files too, so a deleted save cannot come back.
//  - One key's native writes run one at a time, in order; while one runs, later
//    ones for that key collapse to the latest, so the last write wins.
//  - A native failure is logged and dropped. It never throws into the game, never
//    blocks a localStorage write, and a failed restore leaves boot with what
//    localStorage has.
//  - No torn files. A value is written to `<name>.tmp`, renamed to `<name>.ready`
//    once complete, then the old `<name>` is removed and `.ready` renamed over it.
//    A `.ready` file is always complete and always newer than `<name>`, so restore
//    prefers it; a `.tmp` is never read. (This holds whether or not the platform's
//    rename overwrites, since the target is always removed first.)

import { DEV_TEST_PREFIX, IOS_INSTALL_HINT_KEY, LIVE_MATCH_PREFIX } from '../storageKeys';
import type { StorageLike } from './local';

/** The native side: flat files in one private directory. Every call may reject. */
export interface NativeFiles {
  /** Every file name in the directory ([] when it does not exist yet). */
  list(): Promise<string[]>;
  read(name: string): Promise<string>;
  /** Create or replace the file (and the directory if missing). */
  write(name: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Delete the file. Resolves when it is already absent. */
  remove(name: string): Promise<void>;
}

const FINAL = '.txt';
const READY = '.txt.ready';
const TMP = '.txt.tmp';

/** The file a key lives in: the key URI-encoded (no `/`, `:` or `%` in a file name), then `.txt`. */
export function fileForKey(key: string): string {
  return encodeURIComponent(key) + FINAL;
}

/** The key a mirror file holds, and whether it is the newer `.ready` copy. Null for anything else (`.tmp`, strangers). */
export function keyForFile(name: string): { key: string; ready: boolean } | null {
  const ready = name.endsWith(READY);
  if (!ready && (name.endsWith(TMP) || !name.endsWith(FINAL))) return null;
  try {
    return { key: decodeURIComponent(name.slice(0, -(ready ? READY : FINAL).length)), ready };
  } catch {
    return null;
  }
}

/** The game's own keys (storageKeys.ts): the ones a first launch copies to native. Analytics and the like are not. */
export function isGameKey(key: string): boolean {
  return key.startsWith('nrl-sim-') || key.startsWith(DEV_TEST_PREFIX) || key.startsWith(LIVE_MATCH_PREFIX)
    || key === IOS_INSTALL_HINT_KEY;
}

type Op = { kind: 'set'; value: string } | { kind: 'remove' };
type Log = (message: string, error?: unknown) => void;
const warn: Log = (message, error) => console.warn(`nrl-sim: ${message}`, error);

export class NativeMirror {
  /** The op to apply next, per key: the latest one asked for. */
  private readonly next = new Map<string, Op>();
  private readonly running = new Set<string>();
  private idleWaiters: Array<() => void> = [];
  /** Keys known to have a native file (from restore, then every write and delete). */
  private readonly known = new Set<string>();

  constructor(private readonly files: NativeFiles, private readonly log: Log = warn) {}

  /** Mirror a write. Never throws. */
  set(key: string, value: string): void {
    this.enqueue(key, { kind: 'set', value });
  }

  /** Mirror a delete. Never throws. */
  remove(key: string): void {
    this.enqueue(key, { kind: 'remove' });
  }

  /** Resolves once every queued native write has finished (or failed). */
  idle(): Promise<void> {
    if (this.running.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  /**
   * Put back every key that has a native copy but is missing from `storage`.
   * Never overwrites a key `storage` has; never throws. Returns the keys restored.
   */
  async restore(storage: StorageLike): Promise<string[]> {
    let names: string[];
    try {
      names = await this.files.list();
    } catch (err) {
      this.log('native saves not listed, playing on with this device\'s storage', err);
      return [];
    }
    const found = new Map<string, { ready?: string; final?: string }>();
    for (const name of names) {
      const parsed = keyForFile(name);
      if (!parsed) continue;
      const entry = found.get(parsed.key) ?? {};
      if (parsed.ready) entry.ready = name; else entry.final = name;
      found.set(parsed.key, entry);
    }
    const restored: string[] = [];
    for (const [key, entry] of found) {
      this.known.add(key);
      try {
        if (storage.getItem(key) !== null) continue; // only fill gaps
      } catch (err) {
        this.log('storage unreadable, nothing restored', err);
        return restored;
      }
      const text = await this.readFirst([entry.ready, entry.final]);
      if (text === null) continue;
      try {
        storage.setItem(key, text);
        restored.push(key);
      } catch (err) {
        this.log(`native copy of ${key} not restored`, err);
      }
    }
    return restored;
  }

  /**
   * Copy `keys` that have no native file yet (a game key written before the mirror
   * existed, such as a career last played on an older build). Reads each value from
   * `storage` now; a later write to the same key replaces it. Never throws.
   */
  seed(storage: StorageLike, keys: readonly string[]): void {
    for (const key of keys) {
      if (this.known.has(key) || this.next.has(key) || this.running.has(key)) continue;
      let value: string | null = null;
      try { value = storage.getItem(key); } catch { /* unreadable: skip */ }
      if (value !== null) this.set(key, value);
    }
  }

  private async readFirst(names: Array<string | undefined>): Promise<string | null> {
    for (const name of names) {
      if (name === undefined) continue;
      try {
        return await this.files.read(name);
      } catch (err) {
        this.log(`native save file ${name} unreadable`, err);
      }
    }
    return null;
  }

  private enqueue(key: string, op: Op): void {
    this.next.set(key, op);
    if (!this.running.has(key)) void this.drain(key);
  }

  private async drain(key: string): Promise<void> {
    this.running.add(key);
    try {
      for (let op = this.next.get(key); op; op = this.next.get(key)) {
        this.next.delete(key);
        try {
          if (op.kind === 'set') await this.write(key, op.value);
          else await this.erase(key);
        } catch (err) {
          this.log(`native copy of ${key} not ${op.kind === 'set' ? 'written' : 'deleted'}; this device's storage still has the change`, err);
        }
      }
    } finally {
      this.running.delete(key);
      if (this.running.size === 0) {
        const waiters = this.idleWaiters;
        this.idleWaiters = [];
        for (const resolve of waiters) resolve();
      }
    }
  }

  private async write(key: string, value: string): Promise<void> {
    const final = fileForKey(key);
    const ready = final + '.ready';
    const tmp = final + '.tmp';
    await this.files.write(tmp, value);
    await this.files.remove(ready);
    await this.files.rename(tmp, ready);
    this.known.add(key);
    await this.files.remove(final);
    await this.files.rename(ready, final);
  }

  private async erase(key: string): Promise<void> {
    const final = fileForKey(key);
    // `.ready` first: it is the copy restore prefers, so it must never outlive `final`.
    await this.files.remove(final + '.ready');
    await this.files.remove(final);
    this.known.delete(key);
    await this.files.remove(final + '.tmp');
  }
}

/** `base` with every write and delete also sent to `mirror`, after `base` took it. Reads are `base`'s. */
export function mirroredStorage(base: StorageLike, mirror: NativeMirror): StorageLike {
  return {
    getItem: (key) => base.getItem(key),
    setItem: (key, value) => {
      base.setItem(key, value); // throws (storage full): nothing mirrored, as nothing changed
      mirror.set(key, value);
    },
    removeItem: (key) => {
      base.removeItem(key);
      mirror.remove(key);
    },
  };
}

export type MirrorStart = 'inactive' | 'active' | 'failed';

export interface MirrorBoot {
  /** Is this the iOS app? (platform.ts) */
  ios: boolean;
  /** The web view's storage, or null where there is none. */
  storage: StorageLike | null;
  /** Every key in `storage` now (localStorage.key(i)); used once, to seed keys with no native copy. */
  keys: () => string[];
  /** The native side, loaded only when `ios` (a dynamic import, so the web bundle never carries it). */
  loadFiles: () => Promise<NativeFiles>;
  /** Make the mirrored storage the one browserStorage() hands out. */
  install: (storage: StorageLike) => void;
  log?: Log;
}

/**
 * At launch, before any save is read: off the iOS app, do nothing ('inactive').
 * In it, load the native side, restore the gaps, then route the storage layer
 * through the mirror ('active'). If the native side cannot load, boot goes on with
 * what localStorage has and nothing is mirrored ('failed'). Never throws.
 */
export async function startNativeMirror(boot: MirrorBoot): Promise<MirrorStart> {
  if (!boot.ios || !boot.storage) return 'inactive';
  const log = boot.log ?? warn;
  let files: NativeFiles;
  try {
    files = await boot.loadFiles();
  } catch (err) {
    log('native save mirror unavailable, saves kept in the web view only', err);
    return 'failed';
  }
  const mirror = new NativeMirror(files, log);
  await mirror.restore(boot.storage);
  boot.install(mirroredStorage(boot.storage, mirror));
  let keys: string[] = [];
  try { keys = boot.keys().filter(isGameKey); } catch { /* unenumerable: nothing seeded */ }
  mirror.seed(boot.storage, keys);
  return 'active';
}
