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

/**
 * Held up over the line (#652, BAK-208 §8.1; tuning reference §11). A carrier
 * in contact as he reaches the try line (driven over in the wrestle, or met on
 * it in open play) can be held up by any defender on him: no try, a
 * play-the-ball 10 m out (a handover on the last). One roll, only then; a lone
 * tackler's odds fall with the carrier's drive (Leon, 13 Nov 2026).
 * Overridable by name (`heldUp.base`).
 */
export const HELD_UP = {
  /** 1 on; 0 off: no roll, and a carrier carried or driven over with men on him scores as before. */
  on: 1,
  /** Chance two average fresh men hold up an average fresh carrier who reaches the line with no drive left. */
  base: 0.75,
  /** Added for each man more than two in the tackle, taken off for each fewer. */
  perMan: 0.15,
  /**
   * A lone tackler is a contest only when the carrier has at most this share of his drive left.
   * 1 (the default, Leon 13 Nov 2026): always passed, any lone tackler contests. 0.35 is the first rule.
   */
  oneManFight: 1,
  /** Met on the line in open play: free defenders this close (m) as he carries it over are on him. */
  reachM: 2.5,
  /** Taken off × his drive at the line: the share of his fight left in the wrestle, or of his top speed in open play. */
  drive: 0.3,
  /** Taken off per m/s he was quicker than the first tackler at contact (his momentum), capped either way. */
  momentumPerMs: 0.02,
  momentumCap: 0.06,
  /** Per point of the men's average hold over the carrier's own (holdOf: Strength, less the legs each has lost). */
  strength: 0.4,
  /** A Wrecking Ball carrier, off per level multiplier; a Brick Wall among two or three men, on per level multiplier. */
  wreckingBall: 0.1,
  brickWall: 0.1,
  /** Never surer than this. */
  max: 0.8,
  /** The restart: a play-the-ball this far out from the line, level with where he was held (not nearer touch than touch.restartInM). */
  restartM: 10,
};

/** What the held-up roll reads, at the moment he reaches the line. */
export interface HeldUpInputs {
  /** Defenders in the tackle (1–3). */
  men: number;
  /** Their average hold (holdOf) and the carrier's own, with each man's legs. */
  hold: number;
  carrierHold: number;
  /** His drive at the line (0–1): the share of his fight left in the wrestle, or of his top speed met on the line. */
  fightLeft: number;
  /** Carrier speed minus the first tackler's at contact, m/s. */
  speedDiff: number;
  /** Trait level multipliers (0 = none): the carrier's Wrecking Ball, the best Brick Wall among the men. */
  wreckingBall: number;
  brickWall: number;
}

/** Whether the line is a contest at all: two or more on him, or one with at most `oneManFight` of his drive left (always, at 1). No roll otherwise. */
export function heldUpContest(men: number, fightLeft: number): boolean {
  return men >= 2 || (men === 1 && fightLeft <= HELD_UP.oneManFight);
}

/** The chance he is held up (0 when it is no contest). */
export function heldUpChance(x: HeldUpInputs): number {
  if (!heldUpContest(x.men, x.fightLeft)) return 0;
  let p = HELD_UP.base + HELD_UP.perMan * (Math.min(WRESTLE.maxMen, x.men) - 2);
  p -= HELD_UP.drive * Math.max(0, Math.min(1, x.fightLeft));
  p -= Math.max(-HELD_UP.momentumCap, Math.min(HELD_UP.momentumCap, x.speedDiff * HELD_UP.momentumPerMs));
  p += HELD_UP.strength * (x.hold - x.carrierHold);
  p -= HELD_UP.wreckingBall * x.wreckingBall;
  if (x.men >= 2) p += HELD_UP.brickWall * x.brickWall;
  return Math.max(0, Math.min(HELD_UP.max, p));
}

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
  /** Carrier speed minus the first tackler's at contact, m/s (his momentum, for the held-up roll). Set when the wrestle starts. */
  speedDiff?: number;
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
