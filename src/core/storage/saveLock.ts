// One exclusive cross-tab critical section for the writes that must never interleave
// (#819): archiving and retiring a Classic save, a Start over write, and deleting a
// retired save. Every caller takes the same localStorage lease, so a tab without Web
// Locks still excludes one that has them. Async callers queue on navigator.locks first,
// then take the lease. A section is synchronous: re-read, compare, write and remove,
// with no await inside it. An iPhone native confirmation happens between two sections,
// never inside one.

import { SAVE_LOCK_KEY } from '../storageKeys';
import type { StorageLike } from './local';

/** A lease outlives a crashed tab by this much, then anyone may take it. */
export const SAVE_LEASE_MS = 5000;
const WEB_LOCK_NAME = 'nrl-sim-saves';

export class SaveLockBusy extends Error {
  constructor() { super('Another tab is saving. Try again.'); }
}

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let seq = 0;
let depth = 0;
let clock: () => number = () => Date.now();

/** Tests: a fake clock for lease expiry. */
export function __setSaveLockClock(now: (() => number) | null): void { clock = now ?? (() => Date.now()); }

interface Lease { token: string; expires: number }

function readLease(storage: StorageLike): Lease | null {
  try {
    const parsed = JSON.parse(storage.getItem(SAVE_LOCK_KEY) ?? 'null') as unknown;
    if (parsed && typeof parsed === 'object' && typeof (parsed as Lease).token === 'string'
      && typeof (parsed as Lease).expires === 'number') return parsed as Lease;
  } catch { /* an unreadable lease is no lease */ }
  return null;
}

/** True while some tab holds a live lease. */
export function saveLeaseHeld(storage: StorageLike): boolean {
  const lease = readLease(storage);
  return !!lease && lease.expires > clock();
}

/**
 * Run `fn` inside the lease. Synchronous. Throws SaveLockBusy when another tab holds a
 * live lease, or when its own claim does not read back (a second tab claimed at the
 * same moment). Re-entrant within this tab: a nested call just runs.
 */
export function withSaveLease<T>(storage: StorageLike, fn: () => T): T {
  if (depth > 0) {
    depth++;
    try { return fn(); } finally { depth--; }
  }
  const now = clock();
  const held = readLease(storage);
  if (held && held.expires > now) throw new SaveLockBusy();
  const token = `${tabId}:${++seq}`;
  storage.setItem(SAVE_LOCK_KEY, JSON.stringify({ token, expires: now + SAVE_LEASE_MS }));
  if (readLease(storage)?.token !== token) throw new SaveLockBusy();
  depth = 1;
  try { return fn(); }
  finally {
    depth = 0;
    try { if (readLease(storage)?.token === token) storage.removeItem(SAVE_LOCK_KEY); }
    catch { /* it expires */ }
  }
}

interface WebLocks { request<T>(name: string, options: { mode: 'exclusive' }, callback: () => Promise<T> | T): Promise<T> }

function webLocks(): WebLocks | null {
  const nav = (globalThis as { navigator?: { locks?: WebLocks } }).navigator;
  return nav?.locks && typeof nav.locks.request === 'function' ? nav.locks : null;
}

/**
 * Run `fn` in the critical section, waiting for it: queue on navigator.locks where it
 * exists, then take the lease, retrying a busy lease until `timeoutMs`. Rejects with
 * SaveLockBusy if the lease never comes free.
 */
export async function withSaveLock<T>(storage: StorageLike, fn: () => T, timeoutMs = 3000): Promise<T> {
  const attempt = async (): Promise<T> => {
    const deadline = clock() + timeoutMs;
    for (;;) {
      try { return withSaveLease(storage, fn); }
      catch (error) {
        if (!(error instanceof SaveLockBusy) || clock() >= deadline) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30));
    }
  };
  const locks = depth === 0 ? webLocks() : null;
  return locks ? locks.request(WEB_LOCK_NAME, { mode: 'exclusive' }, attempt) : attempt();
}
