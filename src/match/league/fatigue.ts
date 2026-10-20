// src/match/league/fatigue.ts — legs (BAK-208 §8, F). Every player carries an
// energy tank, 1 fresh … 0 spent. Metres run and contact drain it, faster for
// a low Stamina, slower for a Workhorse; it comes back slowly while he stands
// and in the stoppages. Below 40% he loses pace and contest odds, below 20%
// more. Pure: live.ts keeps the tank and calls these.
import { traitBoost, type TraitInstance } from '../../data/traits';

/** The legs knobs (BAK-208 §8; tuning reference §10). Overridable by name in balance experiments (tuning.ts). */
export const FATIGUE = {
  /** Energy lost per metre run, at Stamina 50. */
  runCost: 0.00015,
  /** Energy lost per contact, whatever the outcome: carrier and tackler. */
  contactCost: { carrier: 0.006, tackler: 0.004 },
  /** Energy lost per second of a wrestle: the carrier pays per man on him, each tackler pays his own. */
  wrestleCost: { carrierPerMan: 0.008, tackler: 0.006 },
  /** Energy back per second: standing or walking in play, and in a stoppage (after a try, before the restart). */
  recoverWalk: 0.0002,
  recoverStop: 0.002,
  /** Slower than this (m/s) counts as standing / walking for recovery. */
  walkSpeed: 1.5,
  /** Workhorse drains this much less per level multiplier (I ×0.9, II ×0.84, III ×0.78). */
  workhorseSave: 0.1,
  /** The thresholds (§8): tired below 40%, spent below 20%. */
  tiredAt: 0.4,
  spentAt: 0.2,
  /** COOKED! ("… is cooked") is announced once below SPENT_AT, again only after he gets back above this. */
  gassedReset: 0.3,
  /** Top speed: −10% tired, −20% spent. */
  tiredSpeed: 0.9,
  spentSpeed: 0.8,
  /** His drain rate (N9.3, by name in the harness): offset − Stamina × perStamina, clamped to min..max (Stamina 50 is ×1). */
  drain: { offset: 1.5, perStamina: 0.01, min: 0.6, max: 1.4 },
  /** The contest's fatigue weights (§4.1): a spent carrier loses this much bust / fend / offload, a spent tackler this much big hit and concedes `tacklerBust` more busts (half as much when tired). */
  contest: { carrierBust: 0.1, carrierFend: 0.1, carrierOffload: 0.1, tacklerBigHit: 0.1, tacklerBust: 0.06 },
};

/**
 * How much faster this player drains than an average one: Stamina 50 is ×1,
 * 80 ×0.7, 20 ×1.3 (clamped 0.6…1.4), less again for a Workhorse.
 */
export function drainRate(stamina: number, traits: readonly TraitInstance[] = []): number {
  const d = FATIGUE.drain;
  const base = Math.max(d.min, Math.min(d.max, d.offset - stamina * d.perStamina));
  return base * (1 - FATIGUE.workhorseSave * traitBoost(traits, 'workhorse'));
}

/**
 * The contest's fatigue input (contest.ts: 0 fresh … 1 spent): 0 above 40%,
 * 0.5 tired, 1 spent — so a tired carrier is −5% bust / fend / offload and a
 * spent one −10% (§4.1, §8).
 */
export function tiredness(energy: number): 0 | 0.5 | 1 {
  if (energy >= FATIGUE.tiredAt) return 0;
  return energy >= FATIGUE.spentAt ? 0.5 : 1;
}

/** Top-speed multiplier for his legs. */
export function legsSpeed(energy: number): number {
  if (energy >= FATIGUE.tiredAt) return 1;
  return energy >= FATIGUE.spentAt ? FATIGUE.tiredSpeed : FATIGUE.spentSpeed;
}

/** Energy after `dt` seconds: drained by metres run (× his rate), back a little when standing or stopped. */
export function afterRun(energy: number, metres: number, rate: number, dt: number, resting: 'no' | 'walk' | 'stop'): number {
  let e = energy - metres * FATIGUE.runCost * rate;
  if (resting === 'walk') e += FATIGUE.recoverWalk * dt;
  else if (resting === 'stop') e += FATIGUE.recoverStop * dt;
  return Math.max(0, Math.min(1, e));
}

/** Lab: how fresh everyone starts — a kick-off, the last ten minutes, or cooked. */
export type Legs = 'fresh' | 'late' | 'spent';
export const LEGS: readonly Legs[] = ['fresh', 'late', 'spent'];
export const LEGS_ENERGY: Readonly<Record<Legs, number>> = { fresh: 1, late: 0.38, spent: 0.18 };
export const isLegs = (s: string | null | undefined): s is Legs => LEGS.includes(s as Legs);
