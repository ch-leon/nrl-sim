// src/systems/league.ts — season-rollover league dynamics: the strength band,
// the rival movers summary and reputation movement from the player's results.
// Pure TypeScript, no Phaser, no store access: fixtures.ts' season hook owns the
// wiring and the notification. Rival strength itself now follows each rival's
// squad (systems/rivals.ts, #74) instead of a random walk.

import type { RivalClub } from '../core/state';

// ── Rival strength band ──────────────────────────────────────────────────────

/** Hard bounds on a rival's strength (rivals derive it from their squads, #74). */
export const STRENGTH_MIN = 30;
export const STRENGTH_MAX = 90;

export interface StrengthChange {
  clubId: string;
  name: string;
  from: number;
  to: number;
}

/** Clubs whose strength changed, biggest movers first (for the summary toast). */
export function strengthChanges(
  before: readonly RivalClub[],
  after: readonly RivalClub[],
): StrengthChange[] {
  const old = new Map(before.map((c) => [c.id, c.strength] as const));
  return after
    .filter((c) => old.has(c.id) && old.get(c.id) !== c.strength)
    .map((c) => ({ clubId: c.id, name: c.name, from: old.get(c.id) as number, to: c.strength }))
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
}

// ── Reputation tuning ────────────────────────────────────────────────────────

export const REP_MIN = 1;
export const REP_MAX = 100;
/** Baseline reputation decays toward. */
export const REP_BASELINE = 30;
/** Fraction of the gap to the baseline lost each season. */
export const REP_DECAY = 0.1;
/** Reputation per finals win before the grand final. */
export const REP_FINALS_WIN = 1;
/** Reputation for losing a grand final (the winner gets the premiership bonus). */
export const REP_GRAND_FINAL_LOSS = 3;

/**
 * Reputation change for a regular-season ladder finish out of `clubCount`:
 * top 4 rise (+4..+1), bottom 4 fall (−1..−4), the middle is flat.
 */
export function ladderFinishDelta(position: number, clubCount: number): number {
  if (position < 1 || clubCount < 8) return 0;
  if (position <= 4) return 5 - position;
  if (position > clubCount - 4) return -(position - (clubCount - 4));
  return 0;
}

export interface SeasonResults {
  /** Player's regular-season ladder position (1-based; 0 = unknown). */
  ladderPosition: number;
  clubCount: number;
  /** Finals won before the grand final (QF/SF). */
  finalsWins: number;
  playedGrandFinal: boolean;
  /** Reputation already granted elsewhere (premiership bonus) — not re-applied. */
  premiership: boolean;
}

export interface ReputationUpdate {
  reputation: number;
  /** Net change vs. the reputation passed in. */
  delta: number;
  /** Net of ladder + finals (before decay), for the summary. */
  resultsDelta: number;
  decay: number;
}

/**
 * Move reputation by the season's results, then decay toward REP_BASELINE, and
 * clamp to [REP_MIN, REP_MAX]. `current` should already include any premiership
 * bonus; a premiership is not credited a second time here.
 */
export function applySeasonReputation(current: number, r: SeasonResults): ReputationUpdate {
  let resultsDelta = ladderFinishDelta(r.ladderPosition, r.clubCount);
  resultsDelta += r.finalsWins * REP_FINALS_WIN;
  if (r.playedGrandFinal && !r.premiership) resultsDelta += REP_GRAND_FINAL_LOSS;

  const moved = Math.min(REP_MAX, Math.max(REP_MIN, current + resultsDelta));
  const decay = Math.round((REP_BASELINE - moved) * REP_DECAY);
  const reputation = Math.min(REP_MAX, Math.max(REP_MIN, moved + decay));
  return { reputation, delta: reputation - current, resultsDelta, decay };
}
