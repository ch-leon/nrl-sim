// src/core/storage/local.ts — the localStorage save store (#360).
//
// The only place the game names `localStorage`. LocalSaveStore wraps a StorageLike
// (the real one, or a test's Map-backed fake) with the keys and bytes save.ts always
// wrote: a slot is `nrl-sim-save-slot-<n>` holding the save's JSON, exactly.
//
// The meta sidecar is written just after its slot, once the current task finishes
// (a microtask), not inside the slot write: a save is still one synchronous storage
// write, a burst of saves in one task writes the meta once, and a meta write that
// fails (storage full) can never undo or block the slot write before it. Reading a
// slot's meta sees the queued one at once.

import { CORRUPT_SAVE_KEY, DEVICE_ID_KEY, LEGACY_SAVE_KEY, liveMatchKey, saveMetaKey, slotKey } from '../storageKeys';
import { metaFor, newDeviceId, parseMeta } from './meta';
import type { SaveMeta, SlotListing, SyncSaveStore } from './types';

/** Only the subset of the Web Storage API we use; tests pass a Map-backed fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The browser's localStorage, or null where there is none (Node, SSR) or reading
 * it throws (storage blocked).
 */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class LocalSaveStore implements SyncSaveStore {
  private readonly pending = new Map<number, SaveMeta>();
  private flushQueued = false;
  private device: string | null = null;
  private deviceUnsaved = false;

  constructor(readonly storage: StorageLike, private readonly slots: number) {}

  /** Slot 1 falls back to the legacy single-save key, so a pre-slots save is always
   *  visible even if copying it into slot 1 failed. Throws if storage does. */
  read(slot: number): string | null {
    const own = this.storage.getItem(slotKey(slot));
    if (own !== null) return own;
    return slot === 1 ? this.storage.getItem(LEGACY_SAVE_KEY) : null;
  }

  /** Throws when the payload was not stored (storage full or blocked); nothing else is touched then. */
  write(slot: number, payload: string, meta: SaveMeta): void {
    this.storage.setItem(slotKey(slot), payload);
    // Slot 1 now holds current data; the stale legacy copy must not resurface.
    if (slot === 1) {
      try { this.storage.removeItem(LEGACY_SAVE_KEY); } catch { /* best effort */ }
    }
    this.pending.set(slot, meta);
    this.queueFlush();
  }

  /** Empty the slot (and the legacy key for slot 1) and drop its meta. Throws if storage does. */
  remove(slot: number): void {
    this.pending.delete(slot);
    this.storage.removeItem(slotKey(slot));
    if (slot === 1) this.storage.removeItem(LEGACY_SAVE_KEY);
    try { this.storage.removeItem(saveMetaKey(slot)); } catch { /* best effort */ }
  }

  list(): SlotListing[] {
    const out: SlotListing[] = [];
    for (let slot = 1; slot <= this.slots; slot++) {
      const payload = this.read(slot);
      out.push({ slot, present: payload !== null, meta: payload === null ? null : metaFor(payload, this.storedMeta(slot), this.deviceId()) });
    }
    return out;
  }

  storedMeta(slot: number): SaveMeta | null {
    const queued = this.pending.get(slot);
    if (queued) return queued;
    try {
      return parseMeta(this.storage.getItem(saveMetaKey(slot)));
    } catch {
      return null;
    }
  }

  deviceId(): string {
    if (this.device) return this.device;
    let kept: string | null = null;
    try { kept = this.storage.getItem(DEVICE_ID_KEY); } catch { /* unreadable: make one */ }
    if (kept) {
      this.device = kept;
    } else {
      this.device = newDeviceId();
      this.deviceUnsaved = true;
      this.queueFlush();
    }
    return this.device;
  }

  /** Write the queued meta (and a new device id). A failed write warns and is dropped:
   *  the slot is safe, and its meta is rebuilt from the payload when next read. */
  flush(): void {
    this.flushQueued = false;
    if (this.deviceUnsaved && this.device) {
      try {
        this.storage.setItem(DEVICE_ID_KEY, this.device);
        this.deviceUnsaved = false;
      } catch { /* tried again with the next meta */ }
    }
    for (const [slot, meta] of this.pending) {
      try {
        this.storage.setItem(saveMetaKey(slot), JSON.stringify(meta));
      } catch (err) {
        console.warn('nrl-sim: save meta not written, slot kept', err);
      }
    }
    this.pending.clear();
  }

  /**
   * Migrate the legacy single save into slot 1. The legacy key is removed only
   * after the slot write succeeded and reads back identically — a failed or
   * partial write leaves the legacy save untouched. Never overwrites slot 1.
   */
  migrateLegacy(): void {
    try {
      const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
      if (legacy === null) return;
      const slot1 = this.storage.getItem(slotKey(1));
      if (slot1 === null) {
        this.storage.setItem(slotKey(1), legacy);
        if (this.storage.getItem(slotKey(1)) !== legacy) return;
        this.storage.removeItem(LEGACY_SAVE_KEY);
      } else if (slot1 === legacy) {
        this.storage.removeItem(LEGACY_SAVE_KEY);
      }
      // else: slot 1 holds different data — keep the legacy key rather than risk it.
    } catch (err) {
      console.warn('nrl-sim: legacy save migration failed, legacy save kept', err);
    }
  }

  /** Keep a corrupt payload for forensics. Throws if storage does. */
  keepCorrupt(raw: string): void {
    this.storage.setItem(CORRUPT_SAVE_KEY, raw);
  }

  /** Drop the live-match record kept beside a slot. Never throws. */
  removeLiveMatch(slot: number): void {
    try { this.storage.removeItem(liveMatchKey(slot)); } catch { /* best effort */ }
  }

  private queueFlush(): void {
    if (this.flushQueued) return;
    this.flushQueued = true;
    queueMicrotask(() => this.flush());
  }
}
