// The two officials' fixed-tick travel for watched matches. Positions are only
// handed to the renderer; they never enter play, player selection or the RNG.
import { TICK_S } from '../../core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_X, MID_Y } from '../../core/field';
import type { TouchJudgeSnap } from '../../core/snapshot';
import { clamp, dist, type Vec } from '../../core/vec';
import { GOALS, postsFor } from '../goals';

/** The first part of the existing dead-ball window. */
export const CONVERSION_SIGNAL_TICKS = 32;
export const TOUCH_JUDGE_FADE_TICKS = 8;
export const JUDGE_SPEED_M_S = 5.8;
const STEP_M = JUDGE_SPEED_M_S * TICK_S;
const ACCEL_M = 9 * TICK_S * TICK_S;
const RAIL_GAP_M = 0.9;
const TRACK_GAP_M = 0.8;
const DEAD_BALL_APRON_M = 0.8;

type End = 1 | -1;
type Judges = readonly [TouchJudgeSnap, TouchJudgeSnap];
type Cue = { kind: 'track'; ballX: number } | { kind: 'whistle' }
  | { kind: 'approach'; end: End; ticksLeft: number }
  | { kind: 'posts'; end: End };

const RAIL_Y = [-RAIL_GAP_M, FIELD_WIDTH + RAIL_GAP_M] as const;

/** Each judge has an upright to sight along, behind the defenders' waiting line. */
export function touchJudgeSpots(toward: End): [Vec, Vec] {
  const posts = postsFor(toward, FIELD_LENGTH, MID_Y);
  const x = posts.x + toward * (IN_GOAL - 1.5);
  const gap = GOALS.halfPosts + 0.9;
  return [{ x, y: posts.y - gap }, { x, y: posts.y + gap }];
}

export function startingTouchJudges(): Judges {
  const at = (y: number): TouchJudgeSnap => ({ x: MID_X, y, dx: 0, dy: 0, distance: 0, alpha: 1 });
  return [at(RAIL_Y[0]), at(RAIL_Y[1])];
}

function move(p: TouchJudgeSnap, to: Vec, alpha: number): TouchJudgeSnap {
  const remaining = dist(p, to);
  if (remaining === 0) return { ...p, dx: 0, dy: 0, alpha };
  const step = Math.min(STEP_M, remaining);
  const x = step === remaining ? to.x : p.x + (to.x - p.x) * step / remaining;
  const y = step === remaining ? to.y : p.y + (to.y - p.y) * step / remaining;
  return { x, y, dx: x - p.x, dy: y - p.y, distance: p.distance + step, alpha };
}

function towardRail(p: TouchJudgeSnap, railY: number): Vec {
  // Go behind the dead-ball line before crossing back to the touchline.
  const end = p.x < MID_X ? -1 : 1;
  const rearX = postsFor(end, FIELD_LENGTH, MID_Y).x + end * (IN_GOAL + DEAD_BALL_APRON_M);
  return p.x === rearX ? { x: rearX, y: railY } : { x: rearX, y: p.y };
}

function nextJudge(p: TouchJudgeSnap, i: 0 | 1, cue: Cue): TouchJudgeSnap {
  const railY = RAIL_Y[i];
  const fadeIn = Math.min(1, p.alpha + 1 / TOUCH_JUDGE_FADE_TICKS);
  if (cue.kind === 'whistle') return { ...p, dx: 0, dy: 0, alpha: Math.max(0, p.alpha - 1 / TOUCH_JUDGE_FADE_TICKS) };
  if (cue.kind === 'posts') {
    const spot = touchJudgeSpots(cue.end)[i];
    return { ...p, ...spot, dx: 0, dy: 0, alpha: dist(p, spot) > STEP_M ? 0 : fadeIn };
  }
  if (cue.kind === 'approach') {
    const dock = touchJudgeSpots(cue.end)[i];
    const oppositeEnd = (p.x < MID_X) !== (dock.x < MID_X);
    const to = p.y !== railY && oppositeEnd ? towardRail(p, railY) : p.x === dock.x ? dock : { x: dock.x, y: p.y };
    const leftM = Math.abs(p.x - dock.x) + Math.abs(p.y - dock.y);
    // A fast try can leave too little time for the run. Ease out before handing off to the posts picture.
    const alpha = leftM <= cue.ticksLeft * STEP_M ? fadeIn : Math.min(p.alpha, cue.ticksLeft / TOUCH_JUDGE_FADE_TICKS);
    return move(p, to, alpha);
  }
  if (p.y !== railY) return move(p, towardRail(p, railY), fadeIn);
  const playX = clamp(cue.ballX, -IN_GOAL + 1.5, FIELD_LENGTH + IN_GOAL - 1.5);
  // Brake as play comes level, and turn under the judge's own momentum after a turnover.
  const gap = playX - p.x;
  const desired = Math.sign(gap) * Math.min(STEP_M, Math.max(0, Math.abs(gap) - TRACK_GAP_M) * 4 * TICK_S);
  const dx = p.dx + clamp(desired - p.dx, -ACCEL_M, ACCEL_M);
  return { x: p.x + dx, y: railY, dx, dy: 0, distance: p.distance + Math.abs(dx), alpha: fadeIn };
}

export function stepTouchJudges([far, near]: Judges, cue: Cue): Judges {
  return [nextJudge(far, 0, cue), nextJudge(near, 1, cue)];
}
