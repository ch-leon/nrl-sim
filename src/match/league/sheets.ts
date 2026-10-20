// src/match/league/sheets.ts — the team sheets a match is played from: the
// player's (or a squad rival's) best fit nine and bench, or a rival built from
// its strength with a generated roster (names stable per club). Moved here from
// the classic engine at the switch-over (BAK-207 Phase 4, #88); the numbers and
// the rng streams are unchanged, so every sheet is exactly what it was.
import { makeRng } from '../../utils/rng';
import { randomName } from '../../data/names';
import { overallRating } from '../../data/player';
import { ON_FIELD, STAT_MAX } from '../../config';
import type { Player, Position, RivalClub } from '../../core/state';
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { rollTraits, type TraitQuality } from '../../data/traits';
import { rivalTactics } from './presets';
import { BENCH } from './bench';
import { LINEUP_SLOTS, statsAt, type Selection } from '../../systems/lineup';

const clampStat = (n: number): number => Math.max(1, Math.min(STAT_MAX, n));

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Nines on-field positions (BAK-206). Used when a sheet has no roster. */
export const STANDARD_POSITIONS: readonly Position[] = [
  'fullback',
  'winger',
  'winger',
  'centre',
  'five-eighth',
  'halfback',
  'hooker',
  'prop',
  'second-row',
];

/**
 * A deterministic ON_FIELD roster for a club without real players (rivals).
 * Same clubId → same names every match.
 */
export function generatedRoster(clubId: string): RosterEntry[] {
  const rng = makeRng(hashString(`roster:${clubId}`));
  const used = new Set<string>();
  return STANDARD_POSITIONS.map((position) => {
    let name = randomName(rng);
    for (let guard = 0; used.has(name) && guard < 20; guard++) name = randomName(rng);
    used.add(name);
    return { name, position };
  });
}

/** A generated bench's positions: two forwards, a back and a half (BAK-207 2b). */
export const BENCH_POSITIONS: readonly Position[] = ['prop', 'second-row', 'centre', 'halfback'];

/**
 * A deterministic interchange bench for a club without real players, named
 * apart from its starters. Its own rng stream, so the starters never change.
 */
export function generatedBench(clubId: string, starters: readonly RosterEntry[] = generatedRoster(clubId)): RosterEntry[] {
  const rng = makeRng(hashString(`bench:${clubId}`));
  const used = new Set(starters.map((r) => r.name));
  return BENCH_POSITIONS.map((position) => {
    let name = randomName(rng);
    for (let guard = 0; used.has(name) && guard < 20; guard++) name = randomName(rng);
    used.add(name);
    return { name, position };
  });
}

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

function toRosterEntry(p: Player): RosterEntry {
  return {
    name: p.name,
    position: p.position,
    stats: { ...p.stats },
    id: p.id,
    injuryRisk: p.injuryRisk,
    ...(p.traits.length > 0 ? { traits: [...p.traits] } : {}),
  };
}

/**
 * Build a TeamSheet from a squad. Excludes injured players (injuredWeeks > 0),
 * uses the best ON_FIELD by overall rating, and applies a morale modifier. If
 * fewer than ON_FIELD fit players are available, uses all fit players; throws
 * if zero.
 *
 * With a `selection` (the coach's lineup resolved for the day, #69) the roster
 * is his nine in slot order: each man plays the slot's position, at the stats
 * his positional fit there leaves him (systems/lineup.ts), and the bench and
 * rotation are the lineup's, and so are the attack and defence presets (N11).
 * The aggregates come from those stats.
 */
export function teamSheetFromSquad(
  players: Player[],
  clubId: string,
  name: string,
  colors: [string, string],
  selection?: Selection,
): TeamSheet {
  const fit = players.filter((p) => p.injuredWeeks <= 0);
  if (fit.length === 0) throw new Error('no fit players');

  const ranked = [...fit].sort((a, b) => overallRating(b) - overallRating(a));
  const picked = selection ? selection.starters.flatMap((p, slot) => (p ? [{ ...p, position: LINEUP_SLOTS[slot]!, stats: statsAt(p, LINEUP_SLOTS[slot]!) }] : [])) : [];
  const best = picked.length > 0 ? picked : ranked.slice(0, ON_FIELD);
  // The next best fit players make the interchange bench (the live sim rotates them on).
  const bench = selection && picked.length > 0 ? selection.bench : ranked.slice(ON_FIELD, ON_FIELD + BENCH.size);

  const attackRaw = mean(best.map((p) => (p.stats.speed + p.stats.skill + p.stats.footyIQ) / 3));
  const defenseRaw = mean(best.map((p) => (p.stats.strength + p.stats.stamina) / 2));
  const fitness = clampStat(Math.round(mean(best.map((p) => p.stats.stamina))));

  const kickers = best.filter(
    (p) => p.position === 'halfback' || p.position === 'five-eighth',
  );
  const kickerPool = kickers.length > 0 ? kickers : best;
  const kicking = clampStat(Math.round(Math.max(...kickerPool.map((p) => p.stats.skill))));

  const meanMorale = mean(best.map((p) => p.morale));
  const moraleMod = 1 + ((meanMorale - 50) / 50) * 0.1;

  return {
    clubId,
    name,
    attack: clampStat(Math.round(attackRaw * moraleMod)),
    defense: clampStat(Math.round(defenseRaw * moraleMod)),
    kicking,
    fitness,
    colors,
    roster: best.map(toRosterEntry),
    ...(bench.length > 0 ? { bench: bench.map(toRosterEntry) } : {}),
    ...(selection && picked.length > 0 ? { rotation: selection.rotation } : {}),
    // The coach's presets (N11): what this side plays; Balanced / Slide when he hasn't picked.
    ...(selection?.tactics ? { tactics: selection.tactics } : {}),
  };
}

/** A rival's squad-built sheet with the style its nine gives it (N11, `rivalTactics`). */
export function withRivalStyle(sheet: TeamSheet, club: { id: string; strength: number }): TeamSheet {
  return { ...sheet, tactics: rivalTactics(club, sheet.roster) };
}

/**
 * Build a TeamSheet from a rival club. Aggregates derive from club.strength
 * with ±5 jitter; roster is a generated Nines side with synthetic stats.
 */
export function teamSheetFromRival(club: RivalClub): TeamSheet {
  const rng = makeRng(hashString(club.id));
  const jitter = (): number => clampStat(Math.round(club.strength + rng.int(-5, 5)));
  const attack = jitter();
  const defense = jitter();
  const kicking = jitter();
  const fitness = jitter();
  const quality: TraitQuality = club.strength >= 70 ? 'star' : club.strength >= 50 ? 'average' : 'rookie';
  const starters = generatedRoster(club.id);
  const roster = starters.map((p) => {
    const stats = {
      speed: clampStat(attack + rng.int(-8, 8)),
      strength: clampStat(defense + rng.int(-8, 8)),
      stamina: clampStat(fitness + rng.int(-8, 8)),
      skill: clampStat(kicking + rng.int(-8, 8)),
      footyIQ: clampStat(attack + rng.int(-8, 8)),
    };
    // Rivals carry traits too, so their stars are memorable (BAK-208 §3).
    const traits = rollTraits(rng, p.position, quality);
    return { ...p, stats, ...(traits.length > 0 ? { traits } : {}) };
  });
  // The bench rolls on its own stream so the starters stay exactly as they were.
  const brng = makeRng(hashString(`bench:${club.id}`));
  const bench = generatedBench(club.id, starters).map((p) => {
    const stats = {
      speed: clampStat(attack + brng.int(-8, 8) - 3),
      strength: clampStat(defense + brng.int(-8, 8) - 3),
      stamina: clampStat(fitness + brng.int(-8, 8) - 3),
      skill: clampStat(kicking + brng.int(-8, 8) - 3),
      footyIQ: clampStat(attack + brng.int(-8, 8) - 3),
    };
    const traits = rollTraits(brng, p.position, quality);
    return { ...p, stats, ...(traits.length > 0 ? { traits } : {}) };
  });
  return {
    clubId: club.id,
    name: club.name,
    attack,
    defense,
    kicking,
    fitness,
    colors: club.colors,
    roster,
    bench,
    tactics: rivalTactics(club),
  };
}
