// src/match/league/fatigue.ts — legs (BAK-208 §8, F). Every player carries an
// energy tank, 1 fresh … 0 spent. Metres run and contact drain it, faster for
// a low Stamina, slower for a Workhorse; it comes back slowly while he stands
// and in the stoppages. Below 40% he loses pace and contest odds, below 20%
// more. Pure: live.ts keeps the tank and calls these.
import { traitBoost, type TraitInstance } from '../../data/traits';

/** Energy lost per metre run, at Stamina 50. */
export const RUN_COST = 0.00015;
/** Energy lost per contact, whatever the outcome: carrier and tackler. */
export const CONTACT_COST = { carrier: 0.006, tackler: 0.004 } as const;
/** Energy lost per second of a wrestle: the carrier pays per man on him, each tackler pays his own. */
export const WRESTLE_COST = { carrierPerMan: 0.008, tackler: 0.006 } as const;
/** Energy back per second: standing or walking in play, and in a stoppage (after a try, before the restart). */
export const RECOVER_WALK = 0.0002;
export const RECOVER_STOP = 0.002;
/** Slower than this (m/s) counts as standing / walking for recovery. */
export const WALK_SPEED = 1.5;
/** Workhorse drains this much less per level multiplier (I ×0.9, II ×0.84, III ×0.78). */
export const WORKHORSE_SAVE = 0.1;
/** The thresholds (§8): tired below 40%, spent below 20%. */
export const TIRED_AT = 0.4;
export const SPENT_AT = 0.2;
/** "Out on his feet" is announced once below SPENT_AT, again only after he gets back above this. */
export const GASSED_RESET = 0.3;
/** Top speed: −10% tired, −20% spent. */
export const TIRED_SPEED = 0.9;
export const SPENT_SPEED = 0.8;

/**
 * How much faster this player drains than an average one: Stamina 50 is ×1,
 * 80 ×0.7, 20 ×1.3 (clamped 0.6…1.4), less again for a Workhorse.
 */
export function drainRate(stamina: number, traits: readonly TraitInstance[] = []): number {
  const base = Math.max(0.6, Math.min(1.4, 1.5 - stamina / 100));
  return base * (1 - WORKHORSE_SAVE * traitBoost(traits, 'workhorse'));
}

/**
 * The contest's fatigue input (contest.ts: 0 fresh … 1 spent): 0 above 40%,
 * 0.5 tired, 1 spent — so a tired carrier is −5% bust / fend / offload and a
 * spent one −10% (§4.1, §8).
 */
export function tiredness(energy: number): 0 | 0.5 | 1 {
  if (energy >= TIRED_AT) return 0;
  return energy >= SPENT_AT ? 0.5 : 1;
}

/** Top-speed multiplier for his legs. */
export function legsSpeed(energy: number): number {
  if (energy >= TIRED_AT) return 1;
  return energy >= SPENT_AT ? TIRED_SPEED : SPENT_SPEED;
}

/** Energy after `dt` seconds: drained by metres run (× his rate), back a little when standing or stopped. */
export function afterRun(energy: number, metres: number, rate: number, dt: number, resting: 'no' | 'walk' | 'stop'): number {
  let e = energy - metres * RUN_COST * rate;
  if (resting === 'walk') e += RECOVER_WALK * dt;
  else if (resting === 'stop') e += RECOVER_STOP * dt;
  return Math.max(0, Math.min(1, e));
}

/** Lab: how fresh everyone starts — a kick-off, the last ten minutes, or out on their feet. */
export type Legs = 'fresh' | 'late' | 'spent';
export const LEGS: readonly Legs[] = ['fresh', 'late', 'spent'];
export const LEGS_ENERGY: Readonly<Record<Legs, number>> = { fresh: 1, late: 0.38, spent: 0.18 };
export const isLegs = (s: string | null | undefined): s is Legs => LEGS.includes(s as Legs);
