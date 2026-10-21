// src/scenes/matchField.ts — Phaser-free geometry helpers for the isometric
// match field (BAK-189, WU-11). Kept separate from MatchScene.ts so the pure math
// is unit-testable under the node test env (Phaser can't import there).
// MatchScene.ts re-exports these; the live view, particles and the stadium art
// generators import them directly.
//
// Grid layout (continuous iso grid units; one tile = TILE_W × TILE_H diamond):
//   gx ∈ [0, FIELD_LONG] runs dead-ball line → dead-ball line (field length),
//   gy ∈ [0, FIELD_WIDE] runs touchline → touchline (field width).
//   The first/last IN_GOAL_DEPTH tiles are in-goal; try-lines sit at
//   gx = IN_GOAL_DEPTH and gx = FIELD_LONG - IN_GOAL_DEPTH.
// Sim field coords (MatchEvent x/y, ARCHITECTURE §6) are fx 0..100 try-line →
// try-line (home's own line at 0, home attacks toward 100) and fy 0..100 across
// the width. fx outside 0..100 lands in the in-goal (try dives, goal kicks).
import { TILE_W, TILE_H } from '../config';
import { gridToScreen } from '../world/iso';
import { FIELD_LENGTH, IN_GOAL, MID_Y, toFieldPt } from '../match/core/field';
import { GOALS } from '../match/league/goals';

// ── Field dimensions ─────────────────────────────────────────────────────────
export const FIELD_LONG = 30; // iso tiles dead-ball line to dead-ball line
export const FIELD_WIDE = 18; // iso tiles touchline to touchline
export const IN_GOAL_DEPTH = 3; // tiles of in-goal at each end
export const PLAY_LONG = FIELD_LONG - 2 * IN_GOAL_DEPTH; // try-line to try-line (100m)
/** Tiles per 10 metres along the field (mowing stripes + 10m lines). */
export const TEN_METRES = PLAY_LONG / 10;
/** Nines trial (BAK-206) — ON_FIELD. */
export const PLAYERS_PER_TEAM = 9;

/** Parse a `#rrggbb` (or `#rgb`) hex colour to a 24-bit int. */
export function colorToInt(hex: string): number {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  const n = Number.parseInt(h, 16);
  return Number.isNaN(n) ? 0xffffff : n & 0xffffff;
}

/** Sim field coords (fx try-line→try-line, fy across) to fractional grid cell. */
export function fieldToGrid(fx: number, fy: number): { gx: number; gy: number } {
  return {
    gx: IN_GOAL_DEPTH + (fx / 100) * PLAY_LONG,
    gy: (fy / 100) * FIELD_WIDE,
  };
}

/** A rectangle on the field: x along (metres, or grid gx), y across (metres, or grid gy). */
export interface FieldRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * The bonus zone (Nines, #77) at the end a side attacking `dir` scores at, in
 * sim metres: the in-goal between the uprights, try line to dead-ball line,
 * exactly where goals.ts's inBonusZone makes a try worth five.
 */
export function bonusZone(dir: 1 | -1): FieldRect {
  const line = dir > 0 ? FIELD_LENGTH : 0;
  const back = line + dir * IN_GOAL;
  return {
    x0: Math.min(line, back),
    x1: Math.max(line, back),
    y0: MID_Y - GOALS.halfPosts,
    y1: MID_Y + GOALS.halfPosts,
  };
}

/** The bonus zone in grid units (x0..x1 → gx, y0..y1 → gy), for the pitch art. */
export function bonusZoneGrid(dir: 1 | -1): FieldRect {
  const z = bonusZone(dir);
  const a = toFieldPt({ x: z.x0, y: z.y0 });
  const b = toFieldPt({ x: z.x1, y: z.y1 });
  const ga = fieldToGrid(a.fx, a.fy);
  const gb = fieldToGrid(b.fx, b.fy);
  return { x0: ga.gx, x1: gb.gx, y0: ga.gy, y1: gb.gy };
}

/**
 * The bonus zone's four corners on screen (try-line corners first), through a
 * field-coords → world mapping (the scene's fieldToWorld), for a layer drawn over it.
 */
export function bonusZoneCorners(dir: 1 | -1, toWorld: (fx: number, fy: number) => { x: number; y: number }): { x: number; y: number }[] {
  const z = bonusZone(dir);
  const line = dir > 0 ? z.x0 : z.x1;
  const back = dir > 0 ? z.x1 : z.x0;
  return [
    { x: line, y: z.y0 },
    { x: line, y: z.y1 },
    { x: back, y: z.y1 },
    { x: back, y: z.y0 },
  ].map((m) => {
    const f = toFieldPt(m);
    return toWorld(f.fx, f.fy);
  });
}

/**
 * Field coords to world (screen) point including the centring offsetX (added so
 * the projected field keeps a sensible screenX range). Pure so playback + tests
 * can reproduce sprite positions without a live scene.
 */
export function fieldToWorldPoint(fx: number, fy: number, offsetX: number): { x: number; y: number } {
  const { gx, gy } = fieldToGrid(fx, fy);
  const p = gridToScreen(gx, gy);
  return { x: p.x + offsetX, y: p.y };
}

/** The x offset used to centre the projected field (kept stable for FX maths). */
export function fieldOffsetX(): number {
  return (FIELD_WIDE - 1) * (TILE_W / 2);
}

/**
 * World-space bounds of the playing surface (four corner projections + one
 * tile of padding). Used by the particle FX for sideline crowd specks; the
 * camera uses the larger stadium bounds from art/match/stadium.
 */
export function fieldWorldBounds(offsetX: number): { x: number; y: number; width: number; height: number } {
  const corners = [
    gridToScreen(0, 0),
    gridToScreen(FIELD_LONG, 0),
    gridToScreen(0, FIELD_WIDE),
    gridToScreen(FIELD_LONG, FIELD_WIDE),
  ];
  const xs = corners.map((c) => c.x + offsetX);
  const ys = corners.map((c) => c.y);
  const pad = TILE_W;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + TILE_H + pad;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Depth for something standing on the ground at world y: the iso convention
 * (ARCHITECTURE §7, world/iso.ts) is depth = screenY + layer, and the field has
 * no vertical offset, so a sprite's feet y IS its sort key.
 */
export function depthAtWorldY(worldY: number, layer = 1): number {
  return worldY + layer;
}

/**
 * Auto-pan easing rate (per second). 1 - e^(-k/60) ≈ 0.03, so at 60fps this
 * matches the original 3%-per-frame follow — now independent of frame rate.
 */
export const PAN_RATE_PER_S = 1.83;
/** Cap on auto-pan speed (world px per ms at ×1) so long kicks don't whip the view. */
export const PAN_MAX_PX_PER_MS = 0.4;

/**
 * One frame of the auto-pan toward a target scroll: exponential smoothing over
 * `deltaMs` (so 2×16ms steps land where 1×32ms does), with the step clamped to
 * `maxPxPerMs × deltaMs`. Pass a higher max at faster playback speeds.
 */
export function panTowards(
  current: number,
  target: number,
  deltaMs: number,
  ratePerS = PAN_RATE_PER_S,
  maxPxPerMs = PAN_MAX_PX_PER_MS,
): number {
  const alpha = 1 - Math.exp((-ratePerS * deltaMs) / 1000);
  const step = (target - current) * alpha;
  const cap = maxPxPerMs * deltaMs;
  return current + Math.max(-cap, Math.min(cap, step));
}
