// Small presentation states from the two displayed snapshots. No history or simulation writes.
import type { PlayerSnap, Side } from '../core/snapshot';
import type { Movement, Facing } from '../../art/prototype/player';
import { screenHeading, screenPlayerFacing } from './screenFacing';

export interface MotionContext {
  ball?: { x: number; y: number; previousX: number; previousY: number; side: Side | null };
  ruck?: { side: Side };
  motionLive?: boolean;
}
export interface MotionPicture { movement?: Movement; facing?: Facing; left?: boolean }
const FREE_POSES = ['idle', 'run', 'carry', 'catch', 'pass', 'fend'];

/** Ignore substitutions, set-piece placements and contact releases rather than inventing a plant. */
function continuous(p: PlayerSnap, previous: PlayerSnap): boolean {
  return p.who === previous.who && p.side === previous.side && p.slot === previous.slot
    && FREE_POSES.includes(previous.pose) && !p.binned && !previous.binned
    && Math.hypot(p.x - previous.x, p.y - previous.y) < .9
    && Math.abs(p.speed - previous.speed) < 1.2
    && (p.odometer === undefined || previous.odometer === undefined || p.odometer >= previous.odometer);
}

/**
 * A modest acceleration/braking change is enough to move the shoulders; a real steering
 * change plants the outside foot. Repositioning defenders watch the actual ball within
 * 24 m, at less than 4 m/s. Support runners and chasers keep their travel direction.
 */
export function playerMotion(p: PlayerSnap, previous: PlayerSnap, screenDir = 1, ctx: MotionContext = {}): MotionPicture {
  if (ctx.motionLive === false || !continuous(p, previous)) return {};
  const delta = p.speed - previous.speed;
  const moving = p.speed > .6;
  const ball = ctx.ball;
  const defending = ball && (ball.side !== null ? ball.side !== p.side : ctx.ruck?.side === p.side);
  const distance = ball ? Math.hypot(ball.x - p.x, ball.y - p.y) : 0;
  if (defending && moving && p.speed < 4 && previous.speed < 4.3 && distance > 3 && distance < 24) {
    const travel = screenHeading(p.headX, p.headY ?? 0, screenDir);
    const watch = screenHeading(ball.x - p.x, ball.y - p.y, screenDir);
    const dot = travel.x * watch.x + travel.y * watch.y;
    if (dot < .55) {
      const target = { headX: ball.x - p.x, headY: ball.y - p.y };
      const before = { headX: ball.previousX - previous.x, headY: ball.previousY - previous.y };
      const facing = screenPlayerFacing(target, before, screenDir);
      const localX = travel.x * (facing.left ? -1 : 1);
      return { ...facing, movement: dot < -.45 ? 'backpedal' : localX < 0 ? 'shuffleBack' : 'shuffleForward' };
    }
  }
  const cur = screenHeading(p.headX, p.headY ?? 0, screenDir);
  const prev = screenHeading(previous.headX, previous.headY ?? 0, screenDir);
  const dot = cur.x * prev.x + cur.y * prev.y;
  if (moving && previous.speed > .8 && dot < .985) {
    // The screen-local outside foot leads the cut, including a mirrored pitch.
    const cross = prev.x * cur.y - prev.y * cur.x;
    const left = screenPlayerFacing(p, previous, screenDir).left;
    return { movement: cross * (left ? -1 : 1) < 0 ? 'cutBack' : 'cutForward' };
  }
  if (delta < -.12 && previous.speed > .8) return { movement: 'brake' };
  if (delta > .12 && moving && p.speed < 6.5) return { movement: 'drive' };
  return {};
}

/** Cuts plant; starts, stops and defending feet take a compact two-metre step cycle.
 * Both clocks follow distance. Old recordings without an odometer retain the sampled gait.
 */
export function movementStride(stride: number, movement: Movement, odometer?: number, slot = 0): number {
  if (stride < 0) return -1;
  const f = stride % 6;
  if (movement === 'cutBack' || movement === 'cutForward') return f < 3 ? 0 : 3;
  return odometer === undefined ? [0, 1, 1, 3, 4, 4][f]!
    : [0, 1, 3, 4][Math.floor((odometer / 2 + slot * .37) * 4) % 4]!;
}
