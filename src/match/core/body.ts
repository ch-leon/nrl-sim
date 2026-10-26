// src/match/core/body.ts — a player's physical body: position, velocity and
// steering (BAK-207 §3.2). Seek/arrive steering with a top speed and an
// acceleration cap gives smooth starts and stops; separation keeps bodies from
// standing inside each other. Everything is per fixed tick (see engine.ts), so
// results never depend on frame rate.
import { len, norm, type Vec } from './vec';

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
/** Extra pace per Speed point away from 60, within the existing human speed limits. */
export const PACE = { extraPerStat: 0.03 };
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
  const base = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * s;
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, base + (s * 100 - 60) * PACE.extraPerStat));
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
  // In scalars, one new velocity at the end: this runs for every body every tick.
  const max = opts.maxSpeed ?? b.maxSpeed;
  const tx = target.x - b.pos.x;
  const ty = target.y - b.pos.y;
  const d = Math.sqrt(tx * tx + ty * ty);
  let dx: number;
  let dy: number;
  if (opts.through) {
    // About to pass the point → keep the heading rather than jink onto it.
    if (d > PASS_THROUGH_DIST) {
      dx = (tx / d) * max;
      dy = (ty / d) * max;
    } else {
      dx = b.heading.x * max;
      dy = b.heading.y * max;
    }
  } else {
    if (d < STOP_DIST && b.vel.x * b.vel.x + b.vel.y * b.vel.y < STOP_SPEED * STOP_SPEED) {
      b.vel = { x: 0, y: 0 };
      return;
    }
    const speed = Math.min(max, Math.sqrt(2 * b.accel * d));
    dx = d > 1e-6 ? (tx * speed) / d : 0;
    dy = d > 1e-6 ? (ty * speed) / d : 0;
  }
  // The change of velocity, capped at the acceleration.
  let cx = dx - b.vel.x;
  let cy = dy - b.vel.y;
  const cap = b.accel * dt;
  const c = Math.sqrt(cx * cx + cy * cy);
  if (c > cap && c > 1e-9) {
    cx *= cap / c;
    cy *= cap / c;
  }
  b.vel = { x: b.vel.x + cx, y: b.vel.y + cy };
}

/** Come to a stop as fast as the acceleration cap allows. */
export function brake(b: Body, dt: number): void {
  const v = len(b.vel);
  const cap = b.accel * dt;
  const k = v > cap && v > 1e-9 ? 1 - cap / v : 0;
  b.vel = { x: b.vel.x * k, y: b.vel.y * k };
}

/** Move by the current velocity; update heading while moving. */
export function integrate(b: Body, dt: number): void {
  b.pos = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt };
  // Squared, to skip the square root on every body every tick (0.15² m/s).
  if (b.vel.x * b.vel.x + b.vel.y * b.vel.y > 0.0225) b.heading = norm(b.vel);
}

/**
 * Push overlapping bodies apart (position-based, half the overlap each) so no
 * two stand inside each other. `skip` bodies are left in place (e.g. a tackle
 * pair that is meant to be in contact).
 */
export function separate(bodies: readonly Body[], radius = BODY_RADIUS, skip?: ReadonlySet<Body>): void {
  const r2 = radius * radius;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]!;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]!;
      // Most pairs are far apart: rule them out on the squared distance (no square root) first.
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      if (dx * dx + dy * dy >= r2) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      // Coincident bodies get a deterministic nudge along x.
      const ax = d > 1e-6 ? -dx / d : 1;
      const ay = d > 1e-6 ? -dy / d : 0;
      const push = (radius - d) / 2;
      const aSkip = skip?.has(a) ?? false;
      const bSkip = skip?.has(b) ?? false;
      if (!aSkip) {
        const k = bSkip ? push * 2 : push;
        a.pos = { x: a.pos.x - ax * k, y: a.pos.y - ay * k };
      }
      if (!bSkip) {
        const k = aSkip ? push * 2 : push;
        b.pos = { x: b.pos.x + ax * k, y: b.pos.y + ay * k };
      }
    }
  }
}
