// src/core/storage/conflict.ts — which save wins when this device and the cloud
// disagree (#360, docs/specs/commercial-saves.md). Pure: no UI, no network, no storage.

import { SAVE_VERSION } from '../state';
import type { SaveMeta } from './types';

export type ConflictResolution = 'keep-local' | 'take-remote' | 'same' | 'ask';

/**
 * Decide one slot between the local save and the remote (cloud) one, from their
 * meta alone (null: that side has no save). The rules, first match wins:
 *
 *  1. Same checksum → `same` (nothing to do). Both missing is `same` too.
 *  2. One side missing → keep the side that exists.
 *  3. Either side is a save version newer than this build supports → `ask`.
 *     This build can neither load it nor judge it, and must never overwrite it.
 *  4. Same device, different revisions → the higher revision (that device wrote it later).
 *  5. Different devices, both changed since the last sync (neither checksum is the
 *     local meta's `lastSyncedChecksum`, or the slot never synced) → `ask`. The
 *     player chooses "This device / Cloud", shown each side's club, season, week and time.
 *  6. Otherwise the newer `updatedAt` wins. An unknown time (0, a save from before
 *     meta) is the oldest. Equal times cannot be told apart → `ask`.
 */
export function resolveSaveConflict(
  local: SaveMeta | null,
  remote: SaveMeta | null,
  supportedVersion: number = SAVE_VERSION,
): ConflictResolution {
  if (local && remote && local.checksum === remote.checksum) return 'same';
  if (!local && !remote) return 'same';
  if (!remote) return 'keep-local';
  if (!local) return 'take-remote';
  if (local.saveVersion > supportedVersion || remote.saveVersion > supportedVersion) return 'ask';
  if (local.deviceId === remote.deviceId) {
    if (local.revision > remote.revision) return 'keep-local';
    if (remote.revision > local.revision) return 'take-remote';
  } else {
    const base = local.lastSyncedChecksum;
    if (local.checksum !== base && remote.checksum !== base) return 'ask';
  }
  if (local.updatedAt > remote.updatedAt) return 'keep-local';
  if (remote.updatedAt > local.updatedAt) return 'take-remote';
  return 'ask';
}
