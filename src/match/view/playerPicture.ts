import type { PlayerSnap, Snapshot } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import { LIVE } from '../league/live/knobs';
import type { LivePlayerAction } from '../../art/match/livePlayer';
import { hashString } from '../../art/match/kit';
import { MOMENT_ACTIONS, momentLift, type MomentAction } from '../../art/match/moments';

export interface PlayerPicture {
  /** -1 plants the feet; otherwise the continuing run cycle, independent of hand progress. */
  strideFrame?: number;
  /** Cosmetic jump height; shadow, possession ring and simulation position stay on the turf. */
  lift?: number;
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
  const clampFrame = (n: number) => Math.max(0, Math.min(5, Math.floor(n)));
  const catchAge = tick - (p.caughtTick ?? tick);
  if (action === 'catch') frame = clampFrame(catchAge * 5 / 3);
  // poseUntil is the actual simulation deadline (including tuning overrides).
  // The pass has already left the hands: begin the follow-through immediately.
  if (action === 'pass') {
    const duration = (p.poseUntil ?? tick + LIVE.passPoseTicks) - (p.caughtTick ?? tick);
    frame = clampFrame((duration - remaining) * 5 / Math.max(1, duration - 1));
  }
  if (action === 'ptb') frame = clampFrame((1 - remaining / LIVE.ptbTicks) * 6);
  if (action === 'dummyHalf') frame = possession ? clampFrame(catchAge * 5 / Math.max(1, LIVE.dhHoldTicks - 1)) : 0;
  if (action === 'kick' && p.kick) {
    const k = p.kick;
    action = k.kind === 'grubber' ? 'grubberKick' : k.kind === 'drop' ? 'dropKick' : 'kick';
    frame = possession ? Math.min(2, clampFrame((tick - k.startedTick) * 3 / Math.max(1, k.strikeTick - k.startedTick)))
      : clampFrame(3 + (tick - k.strikeTick) * 2 / Math.max(1, k.untilTick - k.strikeTick - 1));
  }
  if (possession && p.aerialCatchTick === p.caughtTick && p.aerialCatchTick !== undefined
    && catchAge >= 0 && catchAge < 6 && ['catch', 'run', 'idle'].includes(p.pose)) {
    action = 'airCatch'; frame = clampFrame(catchAge);
  }
  const tryAge = p.tryTick === undefined ? -1 : tick - p.tryTick;
  if (['dive', 'celebrate'].includes(p.pose) && tryAge >= 0 && tryAge < 20) {
    action = tryAge < 10 ? 'dive' : 'tryRise';
    frame = clampFrame((tryAge % 10) * 6 / 10);
  } else if (p.celebrationTick !== undefined && tick >= p.celebrationTick && (p.pose === 'celebrate' || (p.pose === 'dive' && tryAge >= 20))) {
    // Stable personal reactions, only after the engine has awarded the try.
    action = (['fistPump', 'point', 'celebrate'] as const)[hashString(`${p.who ?? p.slot}/${p.celebrationTick}`) % 3]!;
    frame = Math.floor((tick - p.celebrationTick) / 3 + p.slot) % 6;
  }
  const lift = MOMENT_ACTIONS.includes(action as MomentAction) ? momentLift(action as MomentAction, frame) : 0;
  const strideFrame = ['run', 'carry', 'catch', 'pass', 'airCatch'].includes(action)
    ? p.speed > .6 ? Math.floor(tick * .6 + p.slot) % 6 : -1 : undefined;
  const dy = p.y - previous.y;
  return { who: p.who ?? `${p.side}/${p.slot}`, action, frame, lift, ...(strideFrame === undefined ? {} : { strideFrame }), facing: (p.headY ?? dy) < -.2 ? 'back' : 'front', left: p.headX * screenDir < 0, possession };
}
