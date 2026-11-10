// src/data/player.ts — Player generator + pure helpers. See BAK-166.
// The Player/PlayerStats/Position/Trait TYPES live in ../core/state (ARCHITECTURE
// §4) — imported here, never redefined. Pure TypeScript, no Phaser.

import type { Player, Position, PlayerStats } from '../core/state';
import type { Rng } from '../utils/rng';
import { WEEKS_PER_SEASON, STAT_MAX, STAR_BANDS } from '../config';
import { createCeilings } from '../systems/potential';
import { randomName } from './names';
import { rollTraits, withTrait } from './traits';

/** The 9 positions from ARCHITECTURE §4. */
export const POSITIONS: readonly Position[] = [
  'fullback', 'winger', 'centre', 'five-eighth', 'halfback',
  'hooker', 'prop', 'second-row', 'lock',
];

export type PositionGroup = 'outside-backs' | 'halves' | 'hooker' | 'forwards';

export const POSITION_GROUPS: Readonly<Record<Position, PositionGroup>> = {
  fullback: 'outside-backs', winger: 'outside-backs', centre: 'outside-backs',
  'five-eighth': 'halves', halfback: 'halves', hooker: 'hooker',
  prop: 'forwards', 'second-row': 'forwards', lock: 'forwards',
};

const SHOWN_STATS: Readonly<Record<PositionGroup, readonly (keyof PlayerStats)[]>> = {
  'outside-backs': ['speed', 'handling', 'strength', 'footyIQ'],
  halves: ['handling', 'kicking', 'footyIQ', 'speed'],
  hooker: ['handling', 'footyIQ', 'stamina', 'strength'],
  forwards: ['strength', 'stamina', 'speed', 'footyIQ'],
};

/** Order is also the order of the four bars on the player page. */
export function shownStats(position: Position): readonly (keyof PlayerStats)[] {
  return SHOWN_STATS[POSITION_GROUPS[position]];
}

/** Off-role stats remain usable in matches, but start low regardless of quality. */
export const HIDDEN_STAT_BAND = [10, 25] as const;

/** Preserve the created off-role values when a generator replaces shown stats. */
export function withShownStats(position: Position, created: PlayerStats, rolled: PlayerStats): PlayerStats {
  const stats = { ...created };
  for (const key of shownStats(position)) stats[key] = rolled[key];
  return stats;
}

export type Quality = 'rookie' | 'average' | 'star';

export interface GenPlayerOpts {
  age?: number; // else rng.int(17,36)
  position?: Position; // else rng.pick(POSITIONS)
  quality?: Quality; // default 'average'
}

/** Stat roll bands per quality: [lo, hi] each stat is rolled within. */
const QUALITY_BANDS: Record<Quality, readonly [number, number]> = {
  rookie: [30, 55],
  average: [45, 75],
  star: [68, 92],
};

const clampStat = (n: number): number => Math.max(1, Math.min(STAT_MAX, n));

/** Weekly market wage per point of overall, and the floor (tuned: a squad of 20 ≈ $18k/wk vs BAK-188 income scales). */
export const WAGE_PER_OVERALL = 15;
export const WAGE_BASE = 100;
/**
 * Above this overall the wage gains a premium of WAGE_PREMIUM × (points above)²
 * a week (N6, #167), so a star costs far more than a first-grader: 55 $925,
 * 60 $1,050, 70 $1,600, 80 $2,550, 85 $3,175, 90 $3,900. Below it the wage is
 * the old straight line, so depth players and juniors cost what they did.
 */
export const WAGE_PREMIUM_FROM = 55;
export const WAGE_PREMIUM = 2;

/** The weekly market wage for an overall rating (the curve above). */
export function wageForOverall(overall: number): number {
  const above = Math.max(0, overall - WAGE_PREMIUM_FROM);
  return Math.round(overall * WAGE_PER_OVERALL + WAGE_BASE + above * above * WAGE_PREMIUM);
}

/**
 * A player's weekly market wage for their overall: what they are generated on,
 * what rivals' salary cap counts and what a renewal asks (#146: the one copy;
 * contracts.ts and rivals.ts re-export it).
 */
export function marketWage(p: Pick<Player, 'stats' | 'position'>): number {
  return wageForOverall(overallRating(p));
}

/** Plain average of the four shown stats; round only when displaying a number. */
export function overallRating(p: Pick<Player, 'stats' | 'position'>): number {
  return shownStats(p.position).reduce((sum, key) => sum + p.stats[key], 0) / 4;
}

/** Half-star steps, clamped to the first and last configured bands. */
export function starsForOverall(overall: number): number {
  let stars = STAR_BANDS[0]!.stars;
  for (const band of STAR_BANDS) {
    if (overall < band.minOverall) break;
    stars = band.stars;
  }
  return stars;
}

export function playerStars(p: Pick<Player, 'stats' | 'position'>): number {
  return starsForOverall(overallRating(p));
}

/** Compact plain text fits the existing rating cells, including phone portrait. */
export function ratingText(overall: number): string {
  const stars = starsForOverall(overall);
  const label = Number.isInteger(stars) ? String(stars) : `${Math.floor(stars) || ''}½`;
  return `${label}★ ${Math.round(overall)}`;
}

function rollStats(rng: Rng, quality: Quality, position: Position): PlayerStats {
  const [lo, hi] = QUALITY_BANDS[quality];
  const roll = (): number => clampStat(rng.int(lo, hi));
  const stats = {
    speed: roll(),
    strength: roll(),
    stamina: roll(),
    handling: roll(), kicking: 0,
    footyIQ: roll(),
  };
  stats.kicking = stats.handling;
  const shown = shownStats(position);
  for (const key of Object.keys(stats) as (keyof PlayerStats)[]) {
    if (!shown.includes(key)) stats[key] = rng.int(...HIDDEN_STAT_BAND);
  }
  return stats;
}

/**
 * Deterministically generate a Player. Every random draw routes through `rng`,
 * so `generatePlayer` is reproducible for a given RNG state.
 */
export function generatePlayer(rng: Rng, opts: GenPlayerOpts = {}): Player {
  const quality: Quality = opts.quality ?? 'average';
  const age = opts.age ?? rng.int(17, 36);
  const position = opts.position ?? rng.pick(POSITIONS);
  const name = randomName(rng);
  const stats = rollStats(rng, quality, position);
  const overall = overallRating({ stats, position });

  // Deterministic id (no crypto). state() BEFORE int() so it reflects the
  // RNG's position at the moment of id construction.
  const id = `p_${rng.state().toString(36)}_${rng.int(0, 1e6)}`;

  const morale = rng.int(55, 85);
  const injuryRisk = rng.int(5, 40);
  const wage = marketWage({ stats, position });
  const contractWeeks = rng.int(1, 3) * WEEKS_PER_SEASON;

  // Special skills: rare, levelled, weighted to the position (BAK-208 §3).
  let traits = rollTraits(rng, position, quality);
  // Auto-traits by age (mutually exclusive by construction).
  if (age <= 20 && overall >= 60) traits = withTrait(traits, 'youngGun');
  if (age >= 31) traits = withTrait(traits, 'veteran');
  // clubLegend is never assigned at generation (tenure-driven, later ticket).

  return {
    id,
    name,
    age,
    position,
    stats,
    ceilings: createCeilings({ id, age, position, stats }),
    morale,
    injuryRisk,
    injuredWeeks: 0,
    suspendedWeeks: 0,
    traits,
    wage,
    contractWeeks,
  };
}

/** How far each stat may land from the target in generatePlayerAround. */
export const AROUND_SPREAD = 6;

/** The quality band a target overall belongs to (traits and the base roll). */
export function qualityFor(target: number): Quality {
  return target >= 68 ? 'star' : target >= 50 ? 'average' : 'rookie';
}

/**
 * A player whose stats sit around `target` overall (each stat target ±
 * AROUND_SPREAD), with the wage re-derived from the result. Rival squads and
 * the player's starting squad are built from this (#74, #140). Draws from
 * `rng` in a fixed order: generatePlayer for the base, then one roll a stat.
 */
export function generatePlayerAround(rng: Rng, target: number, opts: Omit<GenPlayerOpts, 'quality'> = {}): Player {
  const base = generatePlayer(rng, { ...opts, quality: qualityFor(target) });
  const roll = (): number => clampStat(target + rng.int(-AROUND_SPREAD, AROUND_SPREAD));
  const stats: PlayerStats = { speed: roll(), strength: roll(), stamina: roll(), handling: roll(), kicking: 0, footyIQ: roll() };
  stats.kicking = stats.handling;
  const finalStats = withShownStats(base.position, base.stats, stats);
  return { ...base, stats: finalStats, ceilings: createCeilings({ ...base, stats: finalStats }), wage: marketWage({ stats: finalStats, position: base.position }) };
}

/**
 * How far a free agent's own target may land from the pool's (N12): two rolls of
 * ±FREE_AGENT_SPREAD added, so most land near it and about one in twenty-five is
 * 13 or more above it (a 65+ in a new club's pool). Assumed (needs Leon).
 */
export const FREE_AGENT_SPREAD = 8;

/**
 * A free agent around the pool's `target` overall (freeagency.poolTarget): the
 * target (rounded, so the stats stay whole) moved by two ±FREE_AGENT_SPREAD
 * rolls, then generatePlayerAround. The pool's quality follows the league (N12)
 * instead of the old rookie / average / star rolls, which made a new game's
 * Recruit screen a shop.
 */
export function generateFreeAgent(rng: Rng, target: number): Player {
  const own = Math.round(target) + rng.int(-FREE_AGENT_SPREAD, FREE_AGENT_SPREAD) + rng.int(-FREE_AGENT_SPREAD, FREE_AGENT_SPREAD);
  return generatePlayerAround(rng, own);
}
