// src/match/league/spread.ts — how much a rating gap counts in the live sim
// (BAK-207 Phase 3, #87). Every contact, sprint and pass leans a little to the
// better player, and over a match's two hundred contacts those leans compound:
// a 10-point gap won 97% and a 20-point gap every match (the §7 target is about
// 70% at 20). Before a match each side's stats are moved together toward the
// match average by `spread`: the gap between the sides shrinks, while each
// player keeps his edge over his teammates (a side's star still shines) and two
// weak sides still play like weak sides. Pure: live.ts applies it.
//
// Difficulty plays here too (N12.2): after the spread the player's rival gets
// the difficulty's edge, rating points on every stat of every player, so Hard's
// rivals are harder in the match itself and Easy's easier. Applied before the
// spread (as the old ×1.1 on the rival's strength was meant to be) the spread
// would keep only a fifth of it.
import type { RosterEntry, RosterStats, TeamSheet } from '../../sim/events';
import type { Side } from '../core/snapshot';
import { STAT_MAX, difficultyMultipliers, type Difficulty } from '../../config';

/** The rating-gap knob (tuning reference §19). Overridable by name in balance experiments (tuning.ts). */
export const RATING = {
  /** Share of the gap between the sides' average stats that is kept: 1 plays the sheets as written, 0 makes the sides level (each player keeps his edge over his teammates). */
  spread: 0.2,
};

const KEYS: readonly (keyof RosterStats)[] = ['speed', 'strength', 'stamina', 'skill', 'footyIQ'];

/** Each side's stats on the match: the starters' average, per stat (entries without stats left out). */
function sideMean(sheet: TeamSheet): Record<keyof RosterStats, number> | null {
  const rs = (sheet.roster ?? []).filter((e) => e.stats);
  if (rs.length === 0) return null;
  return Object.fromEntries(KEYS.map((key) => [key, rs.reduce((a, e) => a + e.stats![key], 0) / rs.length])) as Record<keyof RosterStats, number>;
}

/** The two sheets with each side moved toward the match average by keeping `k` of the gap (starters and bench alike). */
export function spreadSheets(home: TeamSheet, away: TeamSheet, k = RATING.spread): [TeamSheet, TeamSheet] {
  if (k === 1) return [home, away];
  const mh = sideMean(home);
  const ma = sideMean(away);
  if (!mh || !ma) return [home, away];
  const move = (sheet: TeamSheet, own: Record<keyof RosterStats, number>): TeamSheet => {
    const entry = (e: RosterEntry): RosterEntry => {
      if (!e.stats) return e;
      const stats = { ...e.stats };
      // Half the gap is each side's distance from the match average; keep k of it.
      for (const key of KEYS) stats[key] = e.stats[key] - (1 - k) * (own[key] - (mh[key] + ma[key]) / 2);
      return { ...e, stats };
    };
    return { ...sheet, ...(sheet.roster ? { roster: sheet.roster.map(entry) } : {}), ...(sheet.bench ? { bench: sheet.bench.map(entry) } : {}) };
  };
  return [move(home, mh), move(away, ma)];
}

/** The difficulty's edge on a match (LiveOptions.difficultyEdge): rating points one side, the player's rival, plays with after the spread. */
export interface DifficultyEdge {
  side: Side;
  points: number;
}

/** The edge the player's rival gets on `difficulty` (DIFFICULTY.*.rivalEdge), or nothing when it is 0 (Normal: the match is exactly as it was). */
export function rivalEdge(rival: Side, difficulty: Difficulty | undefined): DifficultyEdge | undefined {
  const points = difficultyMultipliers(difficulty).rivalEdge;
  return points === 0 ? undefined : { side: rival, points };
}

/**
 * The two (spread) sheets with the edge added to every stat of the named side's
 * starters and bench, clamped to 1–STAT_MAX: each player keeps his edge over his
 * teammates (unless the clamp bites). No edge, or 0, returns the sheets as they are.
 */
export function edgeSheets(home: TeamSheet, away: TeamSheet, edge: DifficultyEdge | undefined): [TeamSheet, TeamSheet] {
  if (!edge || edge.points === 0) return [home, away];
  const entry = (e: RosterEntry): RosterEntry => {
    if (!e.stats) return e;
    const stats = { ...e.stats };
    for (const key of KEYS) stats[key] = Math.max(1, Math.min(STAT_MAX, e.stats[key] + edge.points));
    return { ...e, stats };
  };
  const lift = (sheet: TeamSheet): TeamSheet => ({ ...sheet, ...(sheet.roster ? { roster: sheet.roster.map(entry) } : {}), ...(sheet.bench ? { bench: sheet.bench.map(entry) } : {}) });
  return edge.side === 'home' ? [lift(home), away] : [home, lift(away)];
}
