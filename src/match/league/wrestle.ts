// src/match/league/wrestle.ts — the wrestle (BAK-208 §8.1, F). A held tackle
// is a struggle, not an instant: the carrier has FIGHT left in him (Strength
// and Stamina, less the legs he has lost), every tackler on him drains it, a
// second and third man much faster. The defenders only have so much GRIP; a
// joiner adds to it. Fight gone → he is held, and how long that took sets the
// play-the-ball speed. Grip gone first → he is through, a late bust. Pure:
// live.ts runs the clock and moves the bodies.
import type { ContestStats } from './contest';

/** The wrestle knobs (BAK-208 §8.1; tuning reference §11). Overridable by name in balance experiments (tuning.ts). */
export const WRESTLE = {
  /** Seconds an average fresh carrier lasts against one average fresh tackler (before the roll). */
  fightBase: 1.1,
  /** The opening roll scales his fight by 0.75 … 1.25. */
  fightSpread: 0.5,
  /** A spent carrier has half the fight of a fresh one. */
  fightLegs: 0.5,
  /** Seconds the first tackler can hang on; each joiner adds this much more. */
  gripBase: 1.3,
  joinGrip: 0.35,
  /** A tired tackler drains less: 40% less when spent. */
  holdLegs: 0.4,
  /** Summed drain × this for one, two, three men in the tackle. */
  gang: [1, 1.5, 2],
  /** At most this many in a tackle. */
  maxMen: 3,
  /** Metres per second the carrier drives forward at full fight against one man (÷ men). */
  driveSpeed: 1.5,
  /** No wrestle runs longer than this (seconds): he is held. */
  wrestleMaxS: 3,
  /** Play-the-ball: the "down" beat runs from QUICK ticks (wrestle ≤ QUICK_S) to SLOW ticks (≥ SLOW_S). */
  ruckQuickTicks: 5,
  ruckSlowTicks: 18,
  quickS: 0.35,
  slowS: 1.2,
  /** A Wrecking Ball's fight per level multiplier (the DRIVE! in the tackle). */
  wreckFight: 0.3,
};

/** The carrier's fight in seconds-against-one-man: stats, legs, and the opening roll in [0, 1). */
export function fightOf(s: ContestStats & { stamina: number }, energy: number, roll: number): number {
  const stat = 1 + (s.strength - 50) / 120 + (s.stamina - 50) / 240;
  const legs = 1 - WRESTLE.fightLegs * (1 - Math.max(0, Math.min(1, energy)));
  return Math.max(0.2, WRESTLE.fightBase * stat * legs * (1 - WRESTLE.fightSpread / 2 + WRESTLE.fightSpread * roll));
}

/** How hard one tackler drains the fight per second (1 = average, fresh). */
export function holdOf(s: ContestStats, energy: number): number {
  const stat = 1 + (s.strength - 50) / 120;
  return Math.max(0.3, stat * (1 - WRESTLE.holdLegs * (1 - Math.max(0, Math.min(1, energy)))));
}

/** Seconds of grip a tackler brings: the first man WRESTLE.gripBase, a joiner WRESTLE.joinGrip, by Strength and IQ. */
export function gripOf(s: ContestStats, energy: number, first: boolean): number {
  const stat = 1 + (s.strength - 50) / 150 + (s.footyIQ - 50) / 300;
  const legs = 1 - WRESTLE.holdLegs * (1 - Math.max(0, Math.min(1, energy)));
  return Math.max(0.2, (first ? WRESTLE.gripBase : WRESTLE.joinGrip) * stat * legs);
}

/** Fight drained per second by the men in the tackle (their holds summed, × the gang factor). */
export function drainOf(holds: readonly number[]): number {
  if (holds.length === 0) return 0;
  const sum = holds.reduce((a, b) => a + b, 0);
  return sum * WRESTLE.gang[Math.min(WRESTLE.maxMen, holds.length) - 1]!;
}

/** Metres per second he drives forward with `frac` of his fight left against `men` tacklers. */
export function driveSpeed(frac: number, men: number): number {
  return (WRESTLE.driveSpeed * Math.max(0, Math.min(1, frac))) / Math.max(1, men);
}

/** Ticks on the ground before the play-the-ball: a quick wrestle is a quick ruck, a long one lets the defence set. */
export function ruckTicks(wrestleS: number): number {
  const u = Math.max(0, Math.min(1, (wrestleS - WRESTLE.quickS) / (WRESTLE.slowS - WRESTLE.quickS)));
  return Math.round(WRESTLE.ruckQuickTicks + (WRESTLE.ruckSlowTicks - WRESTLE.ruckQuickTicks) * u);
}

export interface WrestleState {
  /** Player indices in the tackle, the first tackler first. */
  men: number[];
  /** Fight left / at the start (seconds-against-one-man). */
  fight: number;
  fight0: number;
  /** Seconds the defenders can still hang on. */
  grip: number;
  t0: number;
  /** Metres made in the tackle. */
  metres: number;
}

export type WrestleEnd = 'held' | 'free' | null;

/**
 * One tick of the wrestle: drain the fight by the men's holds, run down the
 * grip. Held when the fight is gone (or it has gone on too long), free when the
 * grip goes first.
 */
export function wrestleTick(w: WrestleState, holds: readonly number[], dt: number, elapsedS: number): WrestleEnd {
  w.fight = Math.max(0, w.fight - drainOf(holds) * dt);
  w.grip -= dt;
  if (w.fight <= 0 || elapsedS >= WRESTLE.wrestleMaxS) return 'held';
  if (w.grip <= 0) return 'free';
  return null;
}
