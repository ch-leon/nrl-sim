// src/data/player.ts — Player generator + pure helpers. See BAK-166.
// The Player/PlayerStats/Position/Trait TYPES live in ../core/state (ARCHITECTURE
// §4) — imported here, never redefined. Pure TypeScript, no Phaser.

import type { Player, Position, PlayerStats } from '../core/state';
import type { Rng } from '../utils/rng';
import { WEEKS_PER_SEASON, STAT_MAX } from '../config';
import { randomName } from './names';
import { rollTraits, withTrait } from './traits';

/** The 9 positions from ARCHITECTURE §4. */
export const POSITIONS: readonly Position[] = [
  'fullback', 'winger', 'centre', 'five-eighth', 'halfback',
  'hooker', 'prop', 'second-row', 'lock',
];

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
export function marketWage(p: Pick<Player, 'stats'>): number {
  return wageForOverall(overallRating(p));
}

/**
 * Weighted mean of the 5 PlayerStats (skill .25, footyIQ .25, speed .2,
 * strength .15, stamina .15). Returns 1..100, rounded.
 */
export function overallRating(p: Pick<Player, 'stats'>): number {
  const s = p.stats;
  const raw =
    s.skill * 0.25 +
    s.footyIQ * 0.25 +
    s.speed * 0.2 +
    s.strength * 0.15 +
    s.stamina * 0.15;
  return clampStat(Math.round(raw));
}

function rollStats(rng: Rng, quality: Quality): PlayerStats {
  const [lo, hi] = QUALITY_BANDS[quality];
  const roll = (): number => clampStat(rng.int(lo, hi));
  return {
    speed: roll(),
    strength: roll(),
    stamina: roll(),
    skill: roll(),
    footyIQ: roll(),
  };
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
  const stats = rollStats(rng, quality);
  const overall = overallRating({ stats });

  // Deterministic id (no crypto). state() BEFORE int() so it reflects the
  // RNG's position at the moment of id construction.
  const id = `p_${rng.state().toString(36)}_${rng.int(0, 1e6)}`;

  const morale = rng.int(55, 85);
  const injuryRisk = rng.int(5, 40);
  const wage = marketWage({ stats });
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
    morale,
    injuryRisk,
    injuredWeeks: 0,
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
  const stats: PlayerStats = { speed: roll(), strength: roll(), stamina: roll(), skill: roll(), footyIQ: roll() };
  return { ...base, stats, wage: marketWage({ stats }) };
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
