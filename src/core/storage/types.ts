// src/core/storage/types.ts — the save storage seam (#360, docs/specs/commercial-saves.md).
//
// save.ts keeps its synchronous API and reaches storage only through a SaveStore.
// Today that is LocalSaveStore (localStorage, the same keys and bytes as before);
// tests use MemorySaveStore; a cloud store (RemoteSaveStore) is an interface only.
// The interface is async-capable so a remote or native store can implement it, but
// the local path stays synchronous: nothing async reaches the game loop.

/** A value now, or later. A sync store returns plain values; a remote one, promises. */
export type MaybePromise<T> = T | Promise<T>;

/**
 * What is known about one slot's save, kept in a sidecar key beside it
 * (`nrl-sim-save-meta-<slot>`), never inside the save JSON: the format stays v21.
 */
export interface SaveMeta {
  /** The save JSON's `version`. */
  saveVersion: number;
  /** When it was written (ms since the epoch). 0 is unknown: a save from before meta, the oldest. */
  updatedAt: number;
  /** The device that wrote it (DEVICE_ID_KEY). */
  deviceId: string;
  /** cyrb53 of the exact payload string (src/utils/hash.ts). */
  checksum: string;
  /** Goes up by one on every write of this slot. 0 for a save from before meta. */
  revision: number;
  /** The checksum both sides held when this slot last synced. Absent: never synced. */
  lastSyncedChecksum?: string;
  /** For a "This device / Cloud" choice: club name, season and week of the save. */
  club?: string;
  season?: number;
  week?: number;
}

/** One slot as a store lists it: meta without loading the game. */
export interface SlotListing {
  slot: number;
  present: boolean;
  /** Null when the slot is empty. Present slots always describe themselves (built lazily when no meta was kept). */
  meta: SaveMeta | null;
}

/** Where saves live. Slots are 1..SLOT_COUNT; the payload is the save's JSON text. */
export interface SaveStore {
  /** The slot's payload, or null when it is empty. */
  read(slot: number): MaybePromise<string | null>;
  /** Store `payload` in the slot, then its meta. Throws (or rejects) when the payload was not stored. */
  write(slot: number, payload: string, meta: SaveMeta): MaybePromise<void>;
  /** Empty the slot and its meta. */
  remove(slot: number): MaybePromise<void>;
  /** Every slot, present or not, with its meta. */
  list(): MaybePromise<SlotListing[]>;
}

/** A store that answers at once: what save.ts needs to stay synchronous. */
export interface SyncSaveStore extends SaveStore {
  read(slot: number): string | null;
  write(slot: number, payload: string, meta: SaveMeta): void;
  remove(slot: number): void;
  list(): SlotListing[];
  /** The slot's meta as kept (no lazy build); null when none was kept or it is unreadable. */
  storedMeta(slot: number): SaveMeta | null;
  /** This device's id, made once and kept. */
  deviceId(): string;
}

/**
 * What a cloud store (Supabase, one account across every platform) must provide.
 * Interface only: no implementation and no network code ships yet.
 *
 * - Rows are per account and slot, holding the payload and its SaveMeta as
 *   separate columns, so `list()` returns every slot's meta without downloading
 *   any payload (a save is about 140 KB).
 * - `write` is conditional: with `ifChecksum` set it must fail, not overwrite, when
 *   the cloud's current checksum differs (someone else wrote first). The caller then
 *   re-lists and runs resolveSaveConflict again. Null means "only if the slot is empty".
 * - Every call may reject (offline, signed out, server error). The local save stays
 *   the source of truth; a sync is attempted from menus, never the game loop.
 * - A payload is stored and returned byte for byte; the store never parses it, so a
 *   save from a newer build passes through untouched.
 * - Keys, URLs and anon keys come from `import.meta.env.VITE_*`, never the repo.
 */
export interface RemoteSaveStore extends SaveStore {
  read(slot: number): Promise<string | null>;
  write(slot: number, payload: string, meta: SaveMeta, ifChecksum?: string | null): Promise<void>;
  remove(slot: number): Promise<void>;
  list(): Promise<SlotListing[]>;
}
