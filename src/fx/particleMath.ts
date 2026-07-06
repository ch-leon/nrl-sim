// src/fx/particleMath.ts — Phaser-free helpers for the particle FX layer
// (BAK-201, WU-14). Kept separate from particles.ts so the pure math (world
// mapping + emitter cap allocation) is unit-testable under the node test env
// (Phaser cannot import there — it needs a DOM `navigator`). particles.ts
// imports and re-exports these; tests import them directly.
//
// See ARCHITECTURE.md §5 (events), §7 (texture keys, iso projection).
import { TILE_W, TILE_H } from '../config';

/** Global ceiling on simultaneously-live particles for any single scene's FX. */
export const MAX_LIVE_PARTICLES = 300;

/**
 * Per-emitter `maxAliveParticles` budgets. Bursts/showers/rings are reused
 * (never re-created per event), so these caps hard-bound the live count under
 * spam. Each attach function allocates only its own emitters, so its subtotal
 * — not the grand total — is what must stay ≤ MAX_LIVE_PARTICLES. Both subtotals
 * are verified in the unit test against MAX_LIVE_PARTICLES.
 */
export const MATCH_CAPS = {
  tryBurst: 24, // gold radial burst at the try position
  goldShower: 40, // slow gold rain from above the try line (~1.2s)
  bigHitRing: 16, // white radial impact ring
  crowdHome: 30, // drifting specks along one sideline
  crowdAway: 30, // drifting specks along the other sideline
} as const;

export const GROUNDS_CAPS = {
  coinSparkle: 20, // coin-sparkle burst near the HUD money corner
  dustPuff: 12, // grey dust at a placed facility
  confetti: 120, // full-screen premiership confetti (3s)
} as const;

/** Sum a caps table's per-emitter budgets. */
export function totalCaps(caps: Record<string, number>): number {
  return Object.values(caps).reduce((a, b) => a + b, 0);
}

/**
 * Field render bounds → world point for sim field coords. `fx`/`fy` are 0..100
 * (length / width per ARCHITECTURE §6 MatchEvent). We map them across the given
 * pixel `bounds` rectangle, matching how the field tiles were laid out. Pure so
 * tests can reproduce burst positions without a live scene.
 *
 * Corners: (0,0)→top-left, (100,100)→bottom-right, (50,50)→centre of bounds.
 */
export function fieldToWorld(
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const cx = clamp01(x / 100);
  const cy = clamp01(y / 100);
  return {
    x: bounds.x + cx * bounds.width,
    y: bounds.y + cy * bounds.height,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** MatchEvent kinds that trigger a discrete FX burst, with the effect id. */
export type MatchFxEffect = 'try' | 'big-hit';

/**
 * Event → discrete-effect mapping (pure lookup, unit-tested). Ambient crowd is
 * lifecycle-driven (start on attach / stop on finish), not per-event, so it is
 * intentionally absent from this table.
 */
export function matchEffectFor(kind: string): MatchFxEffect | null {
  if (kind === 'try') return 'try';
  if (kind === 'big-hit') return 'big-hit';
  return null;
}

/**
 * Placed-facility grid origin → world (screen) point, using the same iso
 * projection + centring offset the GroundsScene applies to its tiles
 * (screenX = (gx - gy) * TILE_W/2, screenY = (gx + gy) * TILE_H/2). Pure mirror
 * of GroundsScene.cellToWorld so the dust puff lands on the facility.
 */
export function facilityToWorld(
  gx: number,
  gy: number,
  offsetX: number,
): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2) + offsetX,
    y: (gx + gy) * (TILE_H / 2),
  };
}
