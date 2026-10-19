// src/match/core/field.ts — the playing surface in metres (BAK-207 §3.2) and
// the mapping to the engine contract's field coords (fx 0..100 along, fy
// 0..100 across) that the renderer, overlay and MatchEvents already use.
import { clamp, type Vec } from './vec';

/** Try-line to try-line. */
export const FIELD_LENGTH = 100;
/** Touchline to touchline. */
export const FIELD_WIDTH = 68;
/** Depth of each in-goal behind the try-line. */
export const IN_GOAL = 10;
/** Halfway across. */
export const MID_Y = FIELD_WIDTH / 2;

/** Engine-contract field point (ARCHITECTURE §6): fx 0..100 along, fy 0..100 across. */
export interface FieldPt {
  fx: number;
  fy: number;
}

export function toFieldPt(p: Vec): FieldPt {
  return { fx: p.x, fy: (p.y / FIELD_WIDTH) * 100 };
}

export function fromFieldPt(f: FieldPt): Vec {
  return { x: f.fx, y: (f.fy / 100) * FIELD_WIDTH };
}

/** Keep a point on the field including the in-goals (`margin` metres inside the lines). */
export function clampToGround(p: Vec, margin = 0): Vec {
  const x = clamp(p.x, -IN_GOAL + margin, FIELD_LENGTH + IN_GOAL - margin);
  const y = clamp(p.y, margin, FIELD_WIDTH - margin);
  // Already on the ground (nearly always): the same point, no new object.
  return x === p.x && y === p.y ? p : { x, y };
}

/** Inside the field of play (between the try-lines and touchlines). */
export function inPlay(p: Vec): boolean {
  return p.x >= 0 && p.x <= FIELD_LENGTH && p.y >= 0 && p.y <= FIELD_WIDTH;
}

/** In the in-goal that a side attacking in `dir` (+1 toward x=100) scores in. */
export function inGoal(p: Vec, dir: 1 | -1): boolean {
  if (p.y < 0 || p.y > FIELD_WIDTH) return false;
  return dir > 0 ? p.x > FIELD_LENGTH && p.x <= FIELD_LENGTH + IN_GOAL : p.x < 0 && p.x >= -IN_GOAL;
}

/** Over a touchline or dead-ball line. */
export function outOfBounds(p: Vec): boolean {
  return p.y < 0 || p.y > FIELD_WIDTH || p.x < -IN_GOAL || p.x > FIELD_LENGTH + IN_GOAL;
}
