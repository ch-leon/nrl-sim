// src/match/league/spread.ts — how much a rating gap counts in the live sim
// (BAK-207 Phase 3, #87). Every contact, sprint and pass leans a little to the
// better player, and over a match's two hundred contacts those leans compound:
// a 10-point gap won 97% and a 20-point gap every match (the §7 target is about
// 70% at 20). Before a match each stat of every player on both sheets is drawn
// toward the two sides' average for that stat by `spread`: the gap between the
// sides shrinks, a side's own level and the order of its players stay as they
// are, and two weak sides still play like weak sides. Pure: live.ts applies it.
import type { RosterEntry, RosterStats, TeamSheet } from '../../sim/events';

/** The rating-gap knob (tuning reference §19). Overridable by name in balance experiments (tuning.ts). */
export const RATING = {
  /** Share of each stat's distance from the match average that is kept: 1 plays the sheets as written, 0 makes every player average. */
  spread: 1,
};

const KEYS: readonly (keyof RosterStats)[] = ['speed', 'strength', 'stamina', 'skill', 'footyIQ'];

/** The two sheets with every stat drawn toward the match average by `k` (starters and bench; entries without stats left alone). */
export function spreadSheets(home: TeamSheet, away: TeamSheet, k = RATING.spread): [TeamSheet, TeamSheet] {
  if (k === 1) return [home, away];
  const all = [...(home.roster ?? []), ...(away.roster ?? [])].filter((e) => e.stats);
  if (all.length === 0) return [home, away];
  const mean = Object.fromEntries(KEYS.map((key) => [key, all.reduce((a, e) => a + e.stats![key], 0) / all.length])) as Record<keyof RosterStats, number>;
  const entry = (e: RosterEntry): RosterEntry => {
    if (!e.stats) return e;
    const stats = { ...e.stats };
    for (const key of KEYS) stats[key] = mean[key] + (e.stats[key] - mean[key]) * k;
    return { ...e, stats };
  };
  const sheet = (s: TeamSheet): TeamSheet => ({
    ...s,
    ...(s.roster ? { roster: s.roster.map(entry) } : {}),
    ...(s.bench ? { bench: s.bench.map(entry) } : {}),
  });
  return [sheet(home), sheet(away)];
}
