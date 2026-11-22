import { BODY_RADIUS, type Body } from '../../core/body';
import { FIELD_WIDTH, MID_Y } from '../../core/field';
import { clamp, type Vec } from '../../core/vec';
import { LIVE } from './knobs';

export interface ShoulderRead {
  defender: number;
  shoulder: 'inside' | 'outside';
  target: Vec;
}

type Defender = Pick<Body, 'pos' | 'vel'>;

/** Read the nearest man ahead, then look for room to run past his shoulder. */
export function readShoulder(carrier: Body, dir: 1 | -1, defenders: readonly Defender[]): ShoulderRead | null {
  const { pos, maxSpeed } = carrier;
  const touch = Math.min(pos.y, FIELD_WIDTH - pos.y);
  if (touch < LIVE.centreTouchM || touch > LIVE.centreEdgeM) return null;
  const out = pos.y < MID_Y ? -1 : 1;
  const speed = maxSpeed * LIVE.carrySpeed;
  const forward = (d: Defender) => (d.pos.x - pos.x) * dir;
  let defender = -1;
  let nearest = Infinity;
  for (let i = 0; i < defenders.length; i++) {
    const d = defenders[i]!;
    const dx = forward(d);
    const dy = d.pos.y - pos.y;
    const distance = dx * dx + dy * dy;
    if (dx < LIVE.centreReadNearM || dx > LIVE.centreReadM || Math.abs(dy) > LIVE.centreReadWidthM || distance >= nearest) continue;
    defender = i;
    nearest = distance;
  }
  const marker = defenders[defender];
  if (!marker) return null;

  // Estimate where the marker's momentum puts him as the runner closes.
  const meet = (d: Defender) => clamp(forward(d) / Math.max(1, speed - d.vel.x * dir), 0, LIVE.centreReadS);
  const offset = (marker.pos.y - pos.y) * out;
  const slide = marker.vel.y * out;
  const projected = offset + slide * meet(marker);
  const inside = slide >= LIVE.centreSlideMps && projected >= LIVE.centreOffsetM;
  const outside = offset <= -LIVE.centreOffsetM && projected <= -LIVE.centreOffsetM;
  if (!inside && !outside) return null;

  // Square up when already outside his reach. On the cutback, take a small
  // positive line inside him instead of crossing back over the whole field.
  const room = LIVE.centreClearanceM;
  const drift = inside ? -LIVE.centreDriftM : Math.max(0, projected + room + BODY_RADIUS / 2);
  const y = pos.y + out * drift;
  if (y < LIVE.centreTouchM || y > FIELD_WIDTH - LIVE.centreTouchM) return null;
  const lead = Math.max(LIVE.centreReadNearM, forward(marker) + marker.vel.x * dir * meet(marker));
  for (const d of defenders) {
    const dx = forward(d);
    if (dx < 0) continue;
    const t = meet(d);
    const ahead = dx + d.vel.x * dir * t;
    if (ahead > lead + room) continue;
    const at = clamp(ahead / lead, 0, 1);
    if (Math.abs(pos.y + (y - pos.y) * at - (d.pos.y + d.vel.y * t)) < room) return null;
  }
  return { defender, shoulder: inside ? 'inside' : 'outside', target: { x: pos.x + dir * lead, y } };
}
