// src/core/storage/meta.ts — building, reading and checking SaveMeta (#360).
// Pure apart from newDeviceId (which draws randomness from crypto, never the sim's
// rng: it is not a dice roll and changes no match).

import { cyrb53 } from '../../utils/hash';
import type { SaveMeta } from './types';

/** What the save says about itself: enough to tell a player which career it is. */
export interface SaveFacts {
  saveVersion: number;
  club?: string;
  season?: number;
  week?: number;
}

export function checksumOf(payload: string): string {
  return cyrb53(payload);
}

/** Read the facts from a payload. An unparseable one has version 0 and nothing else. */
export function factsOf(payload: string): SaveFacts {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return { saveVersion: 0 };
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { saveVersion: 0 };
  const r = raw as Record<string, unknown>;
  return {
    saveVersion: typeof r.version === 'number' ? r.version : 0,
    ...(typeof r.clubName === 'string' ? { club: r.clubName } : {}),
    ...(typeof r.season === 'number' ? { season: r.season } : {}),
    ...(typeof r.week === 'number' ? { week: r.week } : {}),
  };
}

/**
 * The meta for a write of `payload`: one revision past the last one kept, stamped
 * now by this device. A sync mark carries over; the next sync updates it.
 */
export function nextMeta(prev: SaveMeta | null, payload: string, facts: SaveFacts, deviceId: string, now: number): SaveMeta {
  return {
    ...facts,
    updatedAt: now,
    deviceId,
    checksum: checksumOf(payload),
    revision: (prev?.revision ?? 0) + 1,
    ...(prev?.lastSyncedChecksum !== undefined ? { lastSyncedChecksum: prev.lastSyncedChecksum } : {}),
  };
}

/**
 * The meta that describes `payload`: the kept one when its checksum matches,
 * else one built from the payload with the time unknown (0: the oldest). That
 * covers every save from before meta, and a meta write that failed after its
 * slot write landed. The revision never goes backwards.
 */
export function metaFor(payload: string, kept: SaveMeta | null, deviceId: string): SaveMeta {
  const checksum = checksumOf(payload);
  if (kept && kept.checksum === checksum) return kept;
  return {
    ...factsOf(payload),
    updatedAt: 0,
    deviceId,
    checksum,
    revision: kept?.revision ?? 0,
    ...(kept?.lastSyncedChecksum !== undefined ? { lastSyncedChecksum: kept.lastSyncedChecksum } : {}),
  };
}

/** Parse a kept meta. Anything unreadable or the wrong shape is null (treated as no meta). */
export function parseMeta(text: string | null): SaveMeta | null {
  if (text === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const m = raw as Partial<SaveMeta>;
  const ok = typeof m.saveVersion === 'number' && typeof m.updatedAt === 'number'
    && typeof m.deviceId === 'string' && typeof m.checksum === 'string' && typeof m.revision === 'number'
    && (m.lastSyncedChecksum === undefined || typeof m.lastSyncedChecksum === 'string')
    && (m.club === undefined || typeof m.club === 'string')
    && (m.season === undefined || typeof m.season === 'number')
    && (m.week === undefined || typeof m.week === 'number');
  return ok ? (m as SaveMeta) : null;
}

/** A random id for this device: 32 hex digits. */
export function newDeviceId(): string {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
