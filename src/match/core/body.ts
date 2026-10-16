// src/match/core/body.ts — a player's physical body: position, velocity and
// steering (BAK-207 §3.2). Seek/arrive steering with a top speed and an
// acceleration cap gives smooth starts and stops; separation keeps bodies from
// standing inside each other. Everything is per fixed tick (see engine.ts), so
// results never depend on frame rate.
import { add, clampLen, dist, len, norm, scale, sub, type Vec } from './vec';

export interface Body {
  pos: Vec;
  vel: Vec;
  /** Unit vector of the last direction moved (kept while standing still). */
  heading: Vec;
  /** Top speed in m/s. */
  maxSpeed: number;
  /** Acceleration cap in m/s². */
  accel: number;
}

/** Slowest and fastest players, m/s (a 1–100 speed stat maps between them). */
export const MIN_SPEED = 6.0;
export const MAX_SPEED = 9.0;
/** How hard a player can accelerate / brake, m/s². */
export const ACCEL = 9;
/** Two bodies closer than this are pushed apart. */
export const BODY_RADIUS = 0.9;
/** Inside this distance with (nearly) no speed a body is considered stopped on its target. */
const STOP_DIST = 0.05;
const STOP_SPEED = 0.3;
/** In `through` mode, this close to the target the body stops steering at it. */
const PASS_THROUGH_DIST = 1.0;

/** Top speed for a 1–100 speed stat. */
export function maxSpeedFor(speedStat: number): number {
  const s = Math.max(1, Math.min(100, speedStat)) / 100;
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * s;
}

export function makeBody(pos: Vec, maxSpeed: number, heading: Vec = { x: 1, y: 0 }, accel = ACCEL): Body {
  return { pos: { ...pos }, vel: { x: 0, y: 0 }, heading: norm(heading), maxSpeed, accel };
}

export const speedOf = (b: Body): number => len(b.vel);

export interface SteerOpts {
  /** Run flat out through the target instead of stopping on it. */
  through?: boolean;
  /** Override the body's top speed (a jog, a sprint). */
  maxSpeed?: number;
}

/**
 * Steer toward `target`. By default the body brakes to stop exactly on it
 * (desired speed is the braking-distance speed √(2·a·d), so it never
 * overshoots and oscillates); with `through` it keeps top speed and, once past
 * the point, carries on along its heading. Changes velocity only; call
 * `integrate` to move.
 */
export function arrive(b: Body, target: Vec, dt: number, opts: SteerOpts = {}): void {
  const max = opts.maxSpeed ?? b.maxSpeed;
  const to = sub(target, b.pos);
  const d = len(to);
  let desired: Vec;
  if (opts.through) {
    // About to pass the point → keep the heading rather than jink onto it.
    const dir = d > PASS_THROUGH_DIST ? scale(to, 1 / d) : b.heading;
    desired = scale(dir, max);
  } else {
    if (d < STOP_DIST && len(b.vel) < STOP_SPEED) {
      b.vel = { x: 0, y: 0 };
      return;
    }
    const speed = Math.min(max, Math.sqrt(2 * b.accel * d));
    desired = d > 1e-6 ? scale(to, speed / d) : { x: 0, y: 0 };
  }
  const dv = clampLen(sub(desired, b.vel), b.accel * dt);
  b.vel = add(b.vel, dv);
}

/** Come to a stop as fast as the acceleration cap allows. */
export function brake(b: Body, dt: number): void {
  b.vel = sub(b.vel, clampLen(b.vel, b.accel * dt));
}

/** Move by the current velocity; update heading while moving. */
export function integrate(b: Body, dt: number): void {
  b.pos = add(b.pos, scale(b.vel, dt));
  if (len(b.vel) > 0.15) b.heading = norm(b.vel);
}

/**
 * Push overlapping bodies apart (position-based, half the overlap each) so no
 * two stand inside each other. `skip` bodies are left in place (e.g. a tackle
 * pair that is meant to be in contact).
 */
export function separate(bodies: readonly Body[], radius = BODY_RADIUS, skip?: ReadonlySet<Body>): void {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]!;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]!;
      const d = dist(a.pos, b.pos);
      if (d >= radius) continue;
      // Coincident bodies get a deterministic nudge along x.
      const away = d > 1e-6 ? scale(sub(b.pos, a.pos), 1 / d) : { x: 1, y: 0 };
      const push = (radius - d) / 2;
      const aSkip = skip?.has(a) ?? false;
      const bSkip = skip?.has(b) ?? false;
      if (!aSkip) a.pos = sub(a.pos, scale(away, bSkip ? push * 2 : push));
      if (!bSkip) b.pos = add(b.pos, scale(away, aSkip ? push * 2 : push));
    }
  }
}
