// src/match/core/ball.ts — the ball always has a state (BAK-207 §3.2): in a
// player's hands, in flight (pass or kick) toward a point, or loose on the
// ground. Flight paths are fixed when launched so they replay identically.
import { TICK_S } from './engine';
import { dist, lerp, type Vec } from './vec';

export type BallState =
  | { kind: 'held'; by: number }
  | {
      kind: 'flight';
      from: Vec;
      to: Vec;
      /** Tick the flight started on. */
      t0: number;
      /** Ticks in the air. */
      ticks: number;
      /** Peak height in metres (a flat pass ~0.8, a bomb ~25). */
      peak: number;
      /** Lift at launch (hand height when thrown, 0 off the ground). */
      fromLift: number;
      /** Who gathers it on landing; null = it lands loose. */
      receiver: number | null;
      /** Ground bounces (grubbers): decaying hops instead of one arc. */
      bounces: number;
      /** How it got airborne (a kick changes possession on landing; a bounce ends loose). */
      via: 'pass' | 'kick' | 'roll' | 'bounce';
    }
  | { kind: 'loose'; pos: Vec; vel: Vec };

/** A kick travels about this fast, m/s. */
export const KICK_SPEED = 20;

/** Height of a carried ball, metres. */
export const CARRY_LIFT = 1.0;
/** A flat pass travels about this fast, m/s. */
export const PASS_SPEED = 16;

/** Lift at progress u ∈ [0,1]: a parabola from `fromLift` to the ground, or decaying hops. */
export function flightLift(fromLift: number, peak: number, u: number, bounces = 0): number {
  if (bounces > 0) {
    const hop = Math.abs(Math.sin(Math.PI * bounces * u));
    return fromLift * Math.max(0, 1 - u * bounces) + peak * hop * (1 - u);
  }
  return fromLift * (1 - u) + 4 * peak * u * (1 - u);
}

/** Where a flight is at `tick` (u clamped to [0,1]). */
export function flightAt(f: Extract<BallState, { kind: 'flight' }>, tick: number): { pos: Vec; lift: number; u: number } {
  const u = Math.max(0, Math.min(1, (tick - f.t0) / f.ticks));
  return { pos: lerp(f.from, f.to, u), lift: flightLift(f.fromLift, f.peak, u, f.bounces), u };
}

/** A pass from `from` to `to` launched at `t0`, timed by distance. */
export function passFlight(from: Vec, to: Vec, t0: number, receiver: number | null, speed = PASS_SPEED, peak = 0.8): BallState {
  const ticks = Math.max(2, Math.round(dist(from, to) / speed / TICK_S));
  return { kind: 'flight', from: { ...from }, to: { ...to }, t0, ticks, peak, fromLift: CARRY_LIFT, receiver, bounces: 0, via: 'pass' };
}

/** Seconds a ball kicked to `peak` metres hangs in the air (up and down under gravity). */
export function hangTime(peak: number): number {
  return 2 * Math.sqrt((2 * Math.max(0, peak)) / 9.81);
}

/** A kick from the boot: high and long. It is in the air for its hang time, or longer if the distance needs it. */
export function kickFlight(from: Vec, to: Vec, t0: number, receiver: number | null, peak = 12): BallState {
  const seconds = Math.max(dist(from, to) / KICK_SPEED, hangTime(peak));
  const ticks = Math.max(4, Math.round(seconds / TICK_S));
  return { kind: 'flight', from: { ...from }, to: { ...to }, t0, ticks, peak, fromLift: 0.4, receiver, bounces: 0, via: 'kick' };
}

/** A grubber travels about this fast, m/s. */
export const GRUBBER_SPEED = 12;

/** A grubber: stabbed along the ground, skidding and hopping to its spot; nobody is nominated to take it. */
export function grubberFlight(from: Vec, to: Vec, t0: number): BallState {
  const ticks = Math.max(4, Math.round(dist(from, to) / GRUBBER_SPEED / TICK_S));
  return { kind: 'flight', from: { ...from }, to: { ...to }, t0, ticks, peak: 0.9, fromLift: 0.3, receiver: null, bounces: 4, via: 'kick' };
}

/**
 * A ball that has come down with nobody under it: two or three decaying hops
 * along the ground in the direction it was travelling, then it lies there.
 */
export function bounceFlight(from: Vec, dir: Vec, t0: number, metres = 5, ticks = 16, hops = 3): BallState {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const to = { x: from.x + (dir.x / l) * metres, y: from.y + (dir.y / l) * metres };
  return { kind: 'flight', from: { ...from }, to, t0, ticks, peak: 1.2, fromLift: 0, receiver: null, bounces: hops, via: 'bounce' };
}

/** The play-the-ball: heeled along the ground to the dummy-half. */
export function rollFlight(from: Vec, to: Vec, t0: number, receiver: number, ticks: number): BallState {
  return { kind: 'flight', from: { ...from }, to: { ...to }, t0, ticks: Math.max(1, ticks), peak: 0.15, fromLift: 0, receiver, bounces: 0, via: 'roll' };
}

/** A flight has reached its landing point. */
export function landed(f: Extract<BallState, { kind: 'flight' }>, tick: number): boolean {
  return tick >= f.t0 + f.ticks;
}
