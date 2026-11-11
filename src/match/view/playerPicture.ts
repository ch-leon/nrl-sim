import type { PlayerSnap, Snapshot } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import type { LivePlayerAction } from '../../art/match/livePlayer';

export interface PlayerPicture {
  who: string; action: LivePlayerAction; frame: number; facing: Facing; left: boolean; possession: boolean;
}

/** Sampled from simulation time, so pause, replay and playback speed share a frame. */
export function playerPicture(p: PlayerSnap, previous: PlayerSnap, tick: number, holder: Snapshot['ball']['holder'], screenDir: number): PlayerPicture {
  const possession = holder?.side === p.side && holder.slot === p.slot;
  let action: LivePlayerAction = p.pose in PLAYER_ANIMS ? p.pose as PlayerAnim : 'idle';
  if ((action === 'run' || action === 'idle') && possession) {
    action = p.caughtTick !== undefined && p.caughtTick > 0 && tick - p.caughtTick >= 0 && tick - p.caughtTick < 4 ? 'catch' : 'carry';
  }
  if (action === 'tackle' && possession) action = 'carry'; // the tackler has just stripped it
  const remaining = (p.poseUntil ?? 0) - tick;
  const looping = ['run', 'carry', 'idle', 'celebrate', 'fistPump', 'chestBump'].includes(action);
  let frame = looping ? Math.floor(tick * (p.speed > .1 ? .6 : .15) + p.slot) % 6 : Math.max(0, Math.min(5, Math.floor(6 - remaining * .6)));
  if (action === 'pass') frame = possession ? 1 : 4;
  if (action === 'catch') frame = 4;
  if (action === 'carry' && p.speed < .1) frame = 1;
  const dy = p.y - previous.y;
  return { who: p.who ?? `${p.side}/${p.slot}`, action, frame, facing: (p.headY ?? dy) < -.2 ? 'back' : 'front', left: p.headX * screenDir < 0, possession };
}
