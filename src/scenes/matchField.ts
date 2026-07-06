// src/scenes/matchField.ts — Phaser-free geometry + formation helpers for the
// isometric match field (BAK-189, WU-11). Kept separate from MatchScene.ts so the
// pure math is unit-testable under the node test env (Phaser can't import there).
// MatchScene.ts re-exports these; playback (BAK-194) may import them directly.
import { TILE_W, TILE_H } from '../config';
import { gridToScreen } from '../world/iso';

// ── Field dimensions (spec) ──────────────────────────────────────────────────
export const FIELD_LONG = 30; // iso tiles along field length (try-line to try-line + in-goal)
export const FIELD_WIDE = 18; // iso tiles across width
export const IN_GOAL_DEPTH = 3; // tiles of in-goal at each end
export const STRIPE_BAND = 3; // tiles per 10m mowing stripe
export const PLAYERS_PER_TEAM = 13;

/** Parse a `#rrggbb` (or `#rgb`) hex colour to a 24-bit int for setTint. */
export function colorToInt(hex: string): number {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  const n = Number.parseInt(h, 16);
  return Number.isNaN(n) ? 0xffffff : n & 0xffffff;
}

/** Normalized field coords (fx,fy in 0..100) to fractional grid cell. */
export function fieldToGrid(fx: number, fy: number): { gx: number; gy: number } {
  return {
    gx: (fx / 100) * (FIELD_LONG - 1),
    gy: (fy / 100) * (FIELD_WIDE - 1),
  };
}

/**
 * Field coords to world (screen) point including the centering offsetX (added so
 * cells with gy > gx keep a non-negative screenX). Pure so playback + tests can
 * reproduce sprite positions without a live scene.
 */
export function fieldToWorldPoint(fx: number, fy: number, offsetX: number): { x: number; y: number } {
  const { gx, gy } = fieldToGrid(fx, fy);
  const p = gridToScreen(gx, gy);
  return { x: p.x + offsetX, y: p.y };
}

/** The x offset that keeps the whole projected field on non-negative screenX. */
export function fieldOffsetX(): number {
  return (FIELD_WIDE - 1) * (TILE_W / 2);
}

/**
 * World-space bounds of the whole field (four corner projections + padding),
 * for CameraController. Mirrors GroundsScene's approach.
 */
export function fieldWorldBounds(offsetX: number): { x: number; y: number; width: number; height: number } {
  const corners = [
    gridToScreen(0, 0),
    gridToScreen(FIELD_LONG - 1, 0),
    gridToScreen(0, FIELD_WIDE - 1),
    gridToScreen(FIELD_LONG - 1, FIELD_WIDE - 1),
  ];
  const xs = corners.map((c) => c.x + offsetX);
  const ys = corners.map((c) => c.y);
  const pad = TILE_W;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + TILE_W + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + TILE_H + pad;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Which generated texture key a field column uses (in-goal vs alternating band). */
export function tileVariantFor(
  gx: number,
): 'ingoal' | 'light' | 'dark' {
  if (gx < IN_GOAL_DEPTH || gx >= FIELD_LONG - IN_GOAL_DEPTH) return 'ingoal';
  const band = Math.floor((gx - IN_GOAL_DEPTH) / STRIPE_BAND);
  return band % 2 === 0 ? 'light' : 'dark';
}

/**
 * Loose formation for one team along the length of the field. `attackingRight`
 * flips the side so home/away face opposite ends. Returns 13 field-coord points
 * (fx,fy in 0..100): a back line (fullback deep, wingers wide, centres/pivots),
 * then a forward pack spread across the width nearer halfway.
 */
export function formationPositions(attackingRight: boolean): { fx: number; fy: number }[] {
  // Reference layout for a team defending the LEFT (low fx) end, spread across
  // the field. Mirrored via `attackingRight` by reflecting fx around 50.
  const base: { fx: number; fy: number }[] = [
    { fx: 8, fy: 50 }, // fullback (deep)
    { fx: 22, fy: 10 }, // winger
    { fx: 22, fy: 90 }, // winger
    { fx: 26, fy: 32 }, // centre
    { fx: 26, fy: 68 }, // centre
    { fx: 30, fy: 42 }, // five-eighth
    { fx: 30, fy: 58 }, // halfback
    { fx: 34, fy: 50 }, // hooker
    { fx: 36, fy: 20 }, // prop
    { fx: 36, fy: 80 }, // prop
    { fx: 38, fy: 36 }, // second-row
    { fx: 38, fy: 64 }, // second-row
    { fx: 40, fy: 50 }, // lock
  ];
  return base.map((p) => ({ fx: attackingRight ? 100 - p.fx : p.fx, fy: p.fy }));
}

/**
 * One easing step of the auto-pan toward a target scrollX (spec: factor 0.02).
 * Linear interpolation, matching Phaser.Math.Linear but Phaser-free.
 */
export function panTowards(current: number, target: number, factor = 0.02): number {
  return current + (target - current) * factor;
}
