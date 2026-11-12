import type { PlayerSnap, Snapshot } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import { LIVE } from '../league/live/knobs';
import type { LivePlayerAction } from '../../art/match/livePlayer';
import { hashString } from '../../art/match/kit';
import { MOMENT_ACTIONS, momentLift, type MomentAction } from '../../art/match/moments';
import { screenFacing } from './screenFacing';

export interface PlayerPicture {
  /** -1 plants the feet; otherwise the continuing run cycle, independent of hand progress. */
  strideFrame?: number;
  /** Cosmetic jump height; shadow, possession ring and simulation position stay on the turf. */
  lift?: number;
  who: string; action: LivePlayerAction; frame: number; facing: Facing; left: boolean; possession: boolean;
}

/** Metres run per full stride cycle (two steps, six frames): about a sprinter's, so 9 m/s shows two-thirds of a frame a tick. */
export const STRIDE_METRES = 4;
/** Below this ground speed (m/s) the stride ramps in: shorter jogging steps (strideFrame 6–11) instead of the sprint. */
export const JOG_SPEED = 3;
/** Ticks per breath (in or out) for a player standing still. */
const BREATH_TICKS = 14;

/**
 * The stride frame for a moving player, from metres run rather than time (#630), so feet
 * advance one cycle per STRIDE_METRES at any pace. Old recordings without an odometer
 * keep the time-based cycle. -1 plants the feet.
 */
export function strideFor(p: PlayerSnap, previous: PlayerSnap, tick: number): number {
  if (p.speed <= .6) return -1;
  // Slots start out of step so a line of players does not run in lockstep.
  const beat = p.odometer === undefined ? Math.floor(tick * .6 + p.slot) % 6
    : Math.floor((p.odometer / STRIDE_METRES + p.slot * .37) * 6) % 6;
  // Averaged with the previous tick so a pace hovering at JOG_SPEED does not flicker between gaits.
  return (p.speed + previous.speed) / 2 < JOG_SPEED ? beat + 6 : beat;
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
  const stride = strideFor(p, previous, tick);
  let frame = looping ? Math.floor(tick * (p.speed > .1 ? .6 : .15) + p.slot) % 6 : Math.max(0, Math.min(5, Math.floor(6 - remaining * .6)));
  // Run and carry pixels follow the stride alone; idle breathes over two frames. Fewer distinct frames to cache.
  if (action === 'run' || action === 'carry') frame = Math.max(0, stride) % 6;
  if (action === 'idle') frame = Math.floor((tick + p.slot * 5) / BREATH_TICKS) % 2;
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
    // Stable personal reactions, only after the engine has awarded the try. chestBump stays out:
    // it needs a partner, and big moments invent no paired interaction (match-big-moments.md).
    action = (['fistPump', 'point', 'celebrate', 'kneeSlide'] as const)[hashString(`${p.who ?? p.slot}/${p.celebrationTick}`) % 4]!;
    frame = Math.floor((tick - p.celebrationTick) / 3 + p.slot) % 6;
  }
  const lift = MOMENT_ACTIONS.includes(action as MomentAction) ? momentLift(action as MomentAction, frame) : 0;
  const strideFrame = ['run', 'carry', 'catch', 'pass', 'airCatch', 'fend'].includes(action)
    ? stride : undefined;
  return { who: p.who ?? `${p.side}/${p.slot}`, action, frame, lift, ...(strideFrame === undefined ? {} : { strideFrame }), ...screenFacing(p, previous, screenDir), possession };
}
