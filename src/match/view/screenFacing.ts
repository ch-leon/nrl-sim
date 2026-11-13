// src/match/view/screenFacing.ts — which way a player faces on screen (#629).
// The sim's heading is in field metres; the picture needs screen directions.
// On the iso pitch a run toward the x = 0 try line goes up the screen, so the
// back-or-front view and the left-or-right flip both come from the heading
// projected through the same mapping the pitch is drawn with.
import { toFieldPt } from '../core/field';
import type { PlayerSnap } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { fieldToGrid } from '../../scenes/matchField';
import { gridToScreen } from '../../world/iso';

/** Screen px per field metre along (x) and across (y) the pitch: fieldToGrid then gridToScreen, which are linear. */
const AXES = (() => {
  const at = (x: number, y: number) => {
    const f = toFieldPt({ x, y });
    const g = fieldToGrid(f.fx, f.fy);
    return gridToScreen(g.gx, g.gy);
  };
  const o = at(0, 0), ax = at(1, 0), ay = at(0, 1);
  return { xx: ax.x - o.x, xy: ax.y - o.y, yx: ay.x - o.x, yy: ay.y - o.y };
})();

/**
 * Half-width of the dead band around each screen axis, as a component of the
 * unit screen heading (0.2 ≈ 12°). Inside it the previous tick's heading keeps
 * the view, so a run nearly straight along a boundary does not flicker.
 */
export const FACING_BAND = 0.2;

/** A field heading as a unit vector on screen (+x right, +y down). `screenDir` is -1 when the pitch is mirrored. */
export function screenHeading(hx: number, hy: number, screenDir = 1): { x: number; y: number } {
  const x = (hx * AXES.xx + hy * AXES.yx) * screenDir;
  const y = hx * AXES.xy + hy * AXES.yy;
  const m = Math.hypot(x, y);
  return m > 1e-9 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
}

/** The negative side of a screen axis, with hysteresis from the previous snapshot rather than stored view state. */
function negative(cur: number, prev: number): boolean {
  if (Math.abs(cur) > FACING_BAND) return cur < 0;
  if (Math.abs(prev) > FACING_BAND) return prev < 0;
  return cur + prev < 0;
}

/**
 * Back view moving up the screen, front view moving down it; flipped when
 * moving left. A pure function of this snapshot and the one before, so pause,
 * seek and replay show the same picture.
 */
export function screenFacing(p: Pick<PlayerSnap, 'headX' | 'headY'>, previous: Pick<PlayerSnap, 'headX' | 'headY'>, screenDir = 1): { facing: Facing; left: boolean } {
  const cur = screenHeading(p.headX, p.headY ?? 0, screenDir);
  const prev = screenHeading(previous.headX, previous.headY ?? 0, screenDir);
  return { facing: negative(cur.y, prev.y) ? 'back' : 'front', left: negative(cur.x, prev.x) };
}
