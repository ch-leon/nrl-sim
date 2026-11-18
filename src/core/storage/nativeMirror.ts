// src/core/storage/nativeMirror.ts — a native copy of every save key, for the iOS app
// (docs/specs/ios.md Phase 2, docs/specs/commercial-saves.md "Native mirror").
//
// iOS may clear a web view's localStorage (Capacitor's docs call it transient). So in
// the iOS app, localStorage stays the working copy and every write and delete of a
// mirrored key (isMirroredKey) made through the storage layer (browserStorage(),
// local.ts) is also applied to one native file per key. At launch, before the game
// reads a save, the two sides are synced: a key missing from localStorage is put back
// from its native copy, and a key whose native copy differs is rewritten from
// localStorage. Web and Android never get here.
//
// Pure: the native side is the small NativeFiles interface (capacitorFiles.ts is the
// Capacitor one, loaded lazily; tests use a Map). No timers: every native write is
// started by the storage write (or the boot sync) that caused it.
//
// The rules:
//  - localStorage wins. The boot sync only fills gaps from native; it never
//    overwrites a key localStorage has, and rewrites any native copy that differs.
//  - A delete cannot come back. It writes a `.gone` marker before removing anything;
//    the boot sync treats a marked key as deleted and finishes the removal. The next
//    write of that key clears the marker.
//  - One key's native writes run one at a time, in order; while one runs, later
//    ones for that key collapse to the latest, so the last write wins.
//  - A native failure is logged and dropped. It never throws into the game, never
//    blocks a localStorage write, and a failed sync leaves boot with localStorage.
//  - No torn files, and the only good copy is never removed. A value is written to
//    `.tmp`, renamed to `.ready` once complete, then `.ready` replaces the file.
//    `.ready` is always complete and newer than the file, so the sync prefers it; a
//    `.tmp` is never read. A `.ready` left by a write cut short is promoted to the
//    file before the next write goes on, never deleted.

import {
  COMMERCIAL_FIRST_RUN_KEY, DEVICE_ID_KEY, ENTITLEMENTS_CACHE_KEY, ENTITLEMENTS_STUB_KEY, IOS_INSTALL_HINT_KEY, LABS_KEY,
  LEGACY_SAVE_KEY, LIVE_MATCH_PREFIX, LOG_MODE_KEY, SAVE_META_PREFIX, SAVE_SLOT_PREFIX, recoveryKey,
} from '../storageKeys';
import type { StorageLike } from './local';

/** The native side: flat files in one private directory. Every call may reject. */
export interface NativeFiles {
  /** Every file name in the directory ([] when it does not exist yet). */
  list(): Promise<string[]>;
  exists(name: string): Promise<boolean>;
  read(name: string): Promise<string>;
  /** Create or replace the file (and the directory if missing). */
  write(name: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Delete the file. Resolves when it is already absent. */
  remove(name: string): Promise<void>;
}

const FINAL = '.txt';
const SUFFIXES = { ready: '.ready', tmp: '.tmp', gone: '.gone' } as const;
type Part = 'final' | keyof typeof SUFFIXES;

/** The file a key lives in: the key URI-encoded (no `/`, `:` or `%` in a file name), then `.txt`. */
export function fileForKey(key: string): string {
  return encodeURIComponent(key) + FINAL;
}

/** The key a mirror file belongs to, and which of its files it is. Null for strangers. */
export function keyForFile(name: string): { key: string; part: Part } | null {
  let part: Part = 'final';
  let base = name;
  for (const [p, suffix] of Object.entries(SUFFIXES) as Array<[Part, string]>) {
    if (name.endsWith(FINAL + suffix)) { part = p; base = name.slice(0, -suffix.length); break; }
  }
  if (!base.endsWith(FINAL)) return null;
  try {
    return { key: decodeURIComponent(base.slice(0, -FINAL.length)), part };
  } catch {
    return null;
  }
}

// ── Which keys are mirrored ─────────────────────────────────────────────────
//
// The career and what the player chose, by name from storageKeys.ts. Not mirrored:
// the playtest career's keys (DEV_TEST_*: a developer's scratch career), and the
// corrupt-save copy (CORRUPT_SAVE_KEY: keepCorrupt writes it once only; restoring an
// old one would stop a newer one being kept). Nor anything not the game's (analytics).

const MIRRORED_KEYS: ReadonlySet<string> = new Set([
  LEGACY_SAVE_KEY, DEVICE_ID_KEY, LABS_KEY, IOS_INSTALL_HINT_KEY, LOG_MODE_KEY,
  ENTITLEMENTS_CACHE_KEY, ENTITLEMENTS_STUB_KEY, COMMERCIAL_FIRST_RUN_KEY,
]);
const RECOVERY_PREFIX = recoveryKey(0).slice(0, -1);
const MIRRORED_PER_SLOT = [SAVE_SLOT_PREFIX, SAVE_META_PREFIX, LIVE_MATCH_PREFIX, RECOVERY_PREFIX];

/** Does the native mirror keep this key? */
export function isMirroredKey(key: string): boolean {
  if (MIRRORED_KEYS.has(key)) return true;
  const prefix = MIRRORED_PER_SLOT.find((p) => key.startsWith(p));
  return prefix !== undefined && /^[1-9]\d*$/.test(key.slice(prefix.length));
}

type Op = { kind: 'set'; value: string } | { kind: 'remove' };
type Log = (message: string, error?: unknown) => void;
const warn: Log = (message, error) => console.warn(`nrl-sim: ${message}`, error);

export class NativeMirror {
  /** The op to apply next, per key: the latest one asked for. */
  private readonly next = new Map<string, Op>();
  private readonly running = new Set<string>();
  private idleWaiters: Array<() => void> = [];

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
   * The boot sync, over the mirrored keys only. `keys` is every key `storage` holds.
   *  - A key `storage` lacks is restored from its native copy, unless it is marked
   *    deleted (then the removal is finished).
   *  - A key `storage` has is queued for a native rewrite when its copy differs or is
   *    missing (localStorage wins). The rewrites are not awaited.
   * The native reads run in parallel. Never throws. Returns the keys restored.
   */
  async sync(storage: StorageLike, keys: readonly string[]): Promise<string[]> {
    let names: string[];
    try {
      names = await this.files.list();
    } catch (err) {
      this.log('native saves not listed, playing on with this device\'s storage', err);
      names = [];
    }
    const found = new Map<string, Partial<Record<Part, string>>>();
    for (const name of names) {
      const parsed = keyForFile(name);
      if (!parsed || !isMirroredKey(parsed.key)) continue;
      const entry = found.get(parsed.key) ?? {};
      entry[parsed.part] = name;
      found.set(parsed.key, entry);
    }
    const all = new Set([...found.keys(), ...keys.filter(isMirroredKey)]);
    const restored: string[] = [];
    const reads = [...all].map(async (key) => {
      const entry = found.get(key) ?? {};
      let current: string | null;
      try {
        current = storage.getItem(key);
      } catch (err) {
        this.log(`storage unreadable, ${key} not synced`, err);
        return;
      }
      if (current === null) {
        if (entry.gone) { this.remove(key); return; } // deleted: finish the removal
        const text = await this.readFirst([entry.ready, entry.final]);
        if (text === null) return;
        try {
          storage.setItem(key, text);
          restored.push(key);
        } catch (err) {
          this.log(`native copy of ${key} not restored`, err);
        }
        return;
      }
      const native = entry.gone ? null : await this.readFirst([entry.ready, entry.final]);
      if (native !== current) this.set(key, current); // missing, stale or marked: localStorage wins
    });
    await Promise.all(reads);
    return restored;
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
    const ready = final + SUFFIXES.ready;
    const gone = final + SUFFIXES.gone;
    const tmp = final + SUFFIXES.tmp;
    // A delete cut short: finish it, then this write starts the key afresh.
    if (await this.files.exists(gone)) {
      await this.files.remove(ready);
      await this.files.remove(final);
      await this.files.remove(gone);
    }
    await this.files.write(tmp, value);
    // A `.ready` left by a write cut short is the newest complete copy (always newer
    // than the file beside it): finish that write first, so it is never dropped.
    if (await this.files.exists(ready)) {
      if (await this.files.exists(final)) await this.files.remove(final);
      await this.files.rename(ready, final);
    }
    await this.files.rename(tmp, ready); // the new value, complete
    await this.files.remove(final); // `.ready` now holds the newest copy
    await this.files.rename(ready, final);
  }

  private async erase(key: string): Promise<void> {
    const final = fileForKey(key);
    let marked: unknown = null;
    try {
      await this.files.write(final + SUFFIXES.gone, '');
    } catch (err) {
      marked = err; // remove the copies anyway; report once they are gone
    }
    // `.ready` first: it is the copy the sync prefers, so it must never outlive the file.
    await this.files.remove(final + SUFFIXES.ready);
    await this.files.remove(final);
    await this.files.remove(final + SUFFIXES.tmp);
    if (marked) throw marked;
  }
}

/** `base` with every write and delete of a mirrored key also sent to `mirror`, after `base` took it. */
export function mirroredStorage(base: StorageLike, mirror: NativeMirror): StorageLike {
  return {
    getItem: (key) => base.getItem(key),
    setItem: (key, value) => {
      base.setItem(key, value); // throws (storage full): nothing mirrored, as nothing changed
      if (isMirroredKey(key)) mirror.set(key, value);
    },
    removeItem: (key) => {
      base.removeItem(key);
      if (isMirroredKey(key)) mirror.remove(key);
    },
  };
}

export type MirrorStart = 'inactive' | 'active' | 'failed';

export interface MirrorBoot {
  /** Is this the iOS app? (platform.ts) */
  ios: boolean;
  /** The web view's storage, or null where there is none. */
  storage: StorageLike | null;
  /** Every key in `storage` now (localStorage.key(i)), for the boot sync. */
  keys: () => string[];
  /** The native side, loaded only when `ios` (a dynamic import, so the web bundle never carries it). */
  loadFiles: () => Promise<NativeFiles>;
  /** Make the mirrored storage the one browserStorage() hands out. */
  install: (storage: StorageLike) => void;
  log?: Log;
}

/**
 * At launch, before any save is read: off the iOS app, do nothing ('inactive').
 * In it, load the native side, run the boot sync, then route the storage layer
 * through the mirror ('active'). If the native side cannot load, boot goes on with
 * what localStorage has and nothing is mirrored ('failed'). Never throws.
 */
export async function startNativeMirror(boot: MirrorBoot): Promise<{ start: MirrorStart; mirror?: NativeMirror }> {
  if (!boot.ios || !boot.storage) return { start: 'inactive' };
  const log = boot.log ?? warn;
  let files: NativeFiles;
  try {
    files = await boot.loadFiles();
  } catch (err) {
    log('native save mirror unavailable, saves kept in the web view only', err);
    return { start: 'failed' };
  }
  const mirror = new NativeMirror(files, log);
  let keys: string[] = [];
  try { keys = boot.keys(); } catch { /* unenumerable: restore only */ }
  await mirror.sync(boot.storage, keys);
  boot.install(mirroredStorage(boot.storage, mirror));
  return { start: 'active', mirror };
}
