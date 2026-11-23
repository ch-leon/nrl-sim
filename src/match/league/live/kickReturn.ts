import type { Body } from '../../core/body';
import { FIELD_LENGTH, FIELD_WIDTH, clampToGround } from '../../core/field';
import { clamp, dist, type Vec } from '../../core/vec';
import { LOOKAHEAD_M } from '../tactics';

export const KICK_RETURN = {
  on: 1,
  burstTicks: 20,
  roomM: 5,
  cutM: 4.5,
  readS: 0.35,
  clearanceM: 1.8,
  supportWideM: 4,
  supportDepthM: 2.5,
};

/** Pick the clearest of three short lines through the chase, favouring straight ahead on a tie. */
export function readKickReturn(pos: Vec, dir: 1 | -1, chase: readonly Pick<Body, 'pos' | 'vel'>[]): Vec | null {
  if (chase.some(d => dist(d.pos, pos) < KICK_RETURN.roomM)) return null;
  const x = clamp(pos.x + dir * LOOKAHEAD_M, 0, FIELD_LENGTH);
  const ahead = (x - pos.x) * dir;
  if (ahead <= 0) return null;

  const projected = chase.map(d => ({
    x: (d.pos.x + d.vel.x * KICK_RETURN.readS - pos.x) * dir,
    y: d.pos.y + d.vel.y * KICK_RETURN.readS - pos.y,
  }));
  let target: Vec | null = null;
  let best = KICK_RETURN.clearanceM;
  for (const cut of [0, -KICK_RETURN.cutM, KICK_RETURN.cutM]) {
    const y = clamp(pos.y + cut, 1.5, FIELD_WIDTH - 1.5);
    const across = y - pos.y;
    const lengthSq = ahead * ahead + across * across;
    let room = LOOKAHEAD_M;
    for (const d of projected) {
      const along = clamp((d.x * ahead + d.y * across) / lengthSq, 0, 1);
      room = Math.min(room, Math.hypot(d.x - ahead * along, d.y - across * along));
    }
    if (room > best) {
      best = room;
      target = { x, y };
    }
  }
  return target;
}

/** Two backward passing options. Stay together when both supports are on one side or near touch. */
export function returnSupportSpots(anchor: Vec, dir: 1 | -1, side: -1 | 0 | 1): [Vec, Vec] {
  const width = KICK_RETURN.supportWideM;
  const x = anchor.x - dir * KICK_RETURN.supportDepthM;
  const low = anchor.y - width;
  const high = anchor.y + width;
  const spot = (y: number) => clampToGround({ x, y }, 1.5);
  if (low < 1.5 || (side === 1 && high + width <= FIELD_WIDTH - 1.5)) return [spot(high), spot(high + width)];
  if (high > FIELD_WIDTH - 1.5 || (side === -1 && low - width >= 1.5)) return [spot(low - width), spot(low)];
  return [spot(low), spot(high)];
}
