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

// ── Renames (#398) ───────────────────────────────────────────────────────────
// A player, your club or a rival can be renamed in-game. The rule is the same
// everywhere: trimmed, spaces closed up, 2–24 characters, no control characters.

/** Shortest and longest name a rename takes, in characters. */
export const NAME_MIN = 2;
export const NAME_MAX = 24;

/** Control characters (C0, DEL, C1) and the line and paragraph separators. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

export type NameCheck = { ok: true; name: string } | { ok: false; why: string };

/** A typed name as it would be kept, or why it can't be. Pure. */
export function cleanName(raw: string): NameCheck {
  if (CONTROL.test(raw.replace(/[\t\n\r]/g, ' '))) return { ok: false, why: 'Letters, numbers and punctuation only' };
  const name = raw.replace(/\s+/g, ' ').trim();
  const length = [...name].length;
  if (length < NAME_MIN) return { ok: false, why: `At least ${NAME_MIN} characters` };
  if (length > NAME_MAX) return { ok: false, why: `At most ${NAME_MAX} characters` };
  return { ok: true, name };
}
