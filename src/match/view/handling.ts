// Handling facts from the current snapshot, never a guessed future receiver.
import type { BallFlightSnap, ContactPlayer, PlayerSnap, Snapshot } from '../core/snapshot';

export const RECEIVE_TICKS = 8;
export function flightPlayer(s: Snapshot, ref: ContactPlayer | undefined): PlayerSnap | undefined {
  if (!ref || !ref.who || !Number.isInteger(ref.slot) || ref.slot < 0) return undefined;
  return s.players.find(p => p.side === ref.side && p.slot === ref.slot && p.who === ref.who && !p.binned);
}
export function currentPass(s: Snapshot): BallFlightSnap | null {
  const f = s.ball.flight;
  if (s.ball.holder || !f || f.via !== 'pass' || !Number.isInteger(f.startedTick) || !Number.isInteger(f.arrivesTick)
    || f.startedTick < 0 || f.startedTick > s.tick || f.arrivesTick <= s.tick || f.arrivesTick <= f.startedTick
    || !f.from || !f.to || ![f.from.x, f.from.y, f.to.x, f.to.y, f.fromLift].every(Number.isFinite)
    || (s.phase && !['play', 'ruck', 'tackle'].includes(s.phase.kind))) return null;
  return f;
}
export interface ReceivePicture { player: ContactPlayer; frame: 0 | 1; tick: number }
export function receivingPass(s: Snapshot): ReceivePicture | undefined {
  const f = currentPass(s);
  if (!f || f.arrivesTick - s.tick > RECEIVE_TICKS || !flightPlayer(s, f.receiver)) return undefined;
  return { player: f.receiver!, frame: f.arrivesTick - s.tick > 3 ? 0 : 1, tick: s.tick };
}

export interface BallOffset { x: number; y: number }
/** A visual centre offset only. Ground coordinates, lift and the shadow remain the engine's.
 * The callback supplies the painter's actual endpoint anchors (and receiver lead-point error).
 */
export function passSpriteOffset(s: Snapshot, atTick: number, anchors: (player: ContactPlayer, endpoint: 'release' | 'receive', f: BallFlightSnap) => BallOffset | undefined, liftPxPerM: number): BallOffset | null {
  const f = currentPass(s);
  if (!f) return null;
  const source = flightPlayer(s, f.source?.player), receiver = flightPlayer(s, f.receiver);
  const validSource = f.source && [f.source.headX, f.source.headY, f.source.speed, f.source.odometer, f.source.legs].every(Number.isFinite);
  const from = source && validSource && f.source ? anchors(f.source.player, 'release', f) : undefined;
  const to = receiver && f.receiver ? anchors(f.receiver, 'receive', f) : undefined;
  if (!from && !to) return null;
  const u = Math.max(0, Math.min(1, (atTick - f.startedTick) / (f.arrivesTick - f.startedTick)));
  // MatchBall rests its seven-row sprite at y - lift - 1.5; embedded balls use the same centre.
  return { x: (from?.x ?? 0) * (1 - u) + (to?.x ?? 0) * u,
    y: (from ? from.y + f.fromLift * liftPxPerM + 1.5 : 0) * (1 - u) + (to ? to.y + 1.5 : 0) * u };
}
