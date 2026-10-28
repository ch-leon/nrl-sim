// src/core/storage/memory.ts — a save store in memory, for tests (#360).
// Same contract as LocalSaveStore, minus the legacy key and the deferred meta.

import { metaFor } from './meta';
import type { SaveMeta, SlotListing, SyncSaveStore } from './types';

export class MemorySaveStore implements SyncSaveStore {
  readonly payloads = new Map<number, string>();
  readonly metas = new Map<number, SaveMeta>();

  constructor(private readonly slots: number, private readonly device = 'memory-device') {}

  read(slot: number): string | null {
    return this.payloads.get(slot) ?? null;
  }

  write(slot: number, payload: string, meta: SaveMeta): void {
    this.payloads.set(slot, payload);
    this.metas.set(slot, meta);
  }

  remove(slot: number): void {
    this.payloads.delete(slot);
    this.metas.delete(slot);
  }

  list(): SlotListing[] {
    const out: SlotListing[] = [];
    for (let slot = 1; slot <= this.slots; slot++) {
      const payload = this.read(slot);
      out.push({ slot, present: payload !== null, meta: payload === null ? null : metaFor(payload, this.storedMeta(slot), this.device) });
    }
    return out;
  }

  storedMeta(slot: number): SaveMeta | null {
    return this.metas.get(slot) ?? null;
  }

  deviceId(): string {
    return this.device;
  }
}
