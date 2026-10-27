// src/data/names.ts — fictional name pools. See BAK-166. The pools are the
// active content pack's (#361; AU: src/content/au.ts). Pure data + a
// deterministic name picker. No Phaser.

import type { Rng } from '../utils/rng';
import { activePack } from '../content';

export const FIRST_NAMES: readonly string[] = activePack().names.first;

export const SURNAMES: readonly string[] = activePack().names.last;

/** `${pick(FIRST_NAMES)} ${pick(SURNAMES)}` using the seeded RNG. */
export function randomName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`;
}
