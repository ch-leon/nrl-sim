import type { PlayerSnap, Side, Snapshot } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import { LIVE } from '../league/live/knobs';
import type { LivePlayerAction, Reaction } from '../../art/match/livePlayer';
import { hashString } from '../../art/match/kit';
import { MOMENT_ACTIONS, momentLift, type MomentAction } from '../../art/match/moments';
import { screenFacing } from './screenFacing';
import { legsBand } from './legsLayer';
import { FATIGUE } from '../league/fatigue';

export interface PlayerPicture {
  /** -1 plants the feet; otherwise the continuing run cycle, independent of hand progress. */
  strideFrame?: number;
  /** Cosmetic jump height; shadow, possession ring and simulation position stay on the turf. */
  lift?: number;
  /** Fatigue in the body (#666): 1 on tired legs, 2 spent or blown; absent when fresh. Part of the frame. */
  tired?: 1 | 2;
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

/** What the whole tick says about one player's picture: read once per snapshot by `pictureContext`. */
export interface PictureContext {
  /** A play-the-ball in progress (#665): the side defending it, where the ball is, and whether it is coming out. */
  ruck?: { side: Side; x: number; y: number; rising: boolean };
  /** Who has the ball and where (a reaction gives way to it when the man with it is close, #667). */
  carrier?: { side: Side; x: number; y: number };
}
/** Ticks a reaction is shown for (#667), from the error, miss or bin: about a second at ×1. */
export const REACT_HOLD_TICKS = 24;
/** An opponent with the ball this close (m) needs him: no reaction. */
const NEEDED_M = 8;
/** Ticks per nod of a standing man's hands-on-head. */
const NOD_TICKS = 8;

/**
 * The reaction to show (#667), if any: hands on head after an error or a missed goal, arms folded in
 * the bin. Never with the ball, and never with an opponent carrying it close by: he is needed.
 */
export function reaction(p: PlayerSnap, tick: number, possession: boolean, carrier?: PictureContext['carrier']): Reaction | null {
  if (possession) return null;
  if (p.binned) return 'armsFolded';
  if (p.reactTick === undefined || p.react === undefined || p.react === 'bin') return null;
  const age = tick - p.reactTick;
  if (age < 0 || age >= REACT_HOLD_TICKS) return null;
  if (carrier && carrier.side !== p.side && Math.hypot(carrier.x - p.x, carrier.y - p.y) < NEEDED_M) return null;
  return 'handsOnHead';
}
/** Markers stand 1.8 and 3.6 m in front of the mark (LIVE.markerStandM, markerGapM); the line is further back. */
const MARKER_M = 5;
/** The dummy half's last ticks before the pass: the line comes up out of its crouch. */
const RISE_TICKS = 3;
/** Ticks per bounce frame in the ready stance (on the toes, about two and a half bounces a second). */
const READY_TICKS = 4;
/** Ticks per heave of a spent man's back, hands on knees. */
const BLOWING_TICKS = 6;

/** How tired he looks (#666), on the legs bar's own bands so bar and body agree: 2 spent or blown, 1 tired, 0 fresh. */
export function tiredLevel(p: PlayerSnap): 0 | 1 | 2 {
  if (p.blown) return 2;
  if (p.legs === undefined) return 0;
  const band = legsBand(p.legs, FATIGUE);
  return band === 'spent' ? 2 : band === 'tired' ? 1 : 0;
}

export function pictureContext(s: Snapshot): PictureContext {
  const ctx: PictureContext = {};
  const h = s.ball.holder && s.players.find(p => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot);
  if (h) ctx.carrier = { side: h.side, x: h.x, y: h.y };
  const r = s.players.find(p => p.pose === 'ptb' || p.pose === 'dummyHalf');
  if (r) {
    const picked = r.pose === 'dummyHalf' && s.ball.holder?.side === r.side && s.ball.holder.slot === r.slot;
    ctx.ruck = { side: r.side === 'home' ? 'away' : 'home', x: s.ball.x, y: s.ball.y, rising: picked && (r.poseUntil ?? 0) - s.tick <= RISE_TICKS };
  }
  return ctx;
}

/** Sampled from simulation time, so pause, replay and playback speed share a frame. */
export function playerPicture(p: PlayerSnap, previous: PlayerSnap, tick: number, holder: Snapshot['ball']['holder'], screenDir: number, ctx: PictureContext = {}): PlayerPicture {
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
  // The defensive line sets for the play-the-ball: standing men only, not the markers over the ball.
  const ruck = ctx.ruck;
  if (ruck && action === 'idle' && p.side === ruck.side && stride === -1 && !p.binned && Math.hypot(p.x - ruck.x, p.y - ruck.y) > MARKER_M) {
    action = 'ready';
    frame = ruck.rising ? 2 : Math.floor((tick + p.slot * 2) / READY_TICKS) % 2;
  }
  // A reaction (#667) while he is free to show it: standing or jogging, without the ball, nobody of theirs on the ball near him.
  const reacting = reaction(p, tick, possession, ctx.carrier);
  if (reacting && (action === 'idle' || action === 'run')) {
    action = reacting;
    frame = stride >= 0 ? 0 : reacting === 'armsFolded' ? Math.floor((tick + p.slot * 5) / BREATH_TICKS) % 2 : Math.floor((tick - (p.reactTick ?? 0)) / NOD_TICKS) % 2;
  }
  // Spent (or blown) and stood still with the ball elsewhere: hands on knees, sucking in air.
  const weary = tiredLevel(p);
  if (weary === 2 && action === 'idle' && stride === -1 && !p.binned) {
    action = 'blowing';
    frame = Math.floor((tick + p.slot * 3) / BLOWING_TICKS) % 2;
  }
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
  const strideFrame = ['run', 'carry', 'catch', 'pass', 'airCatch', 'fend', 'handsOnHead', 'handsOnHips', 'armsFolded'].includes(action)
    ? stride : undefined;
  const tired = weary && (action === 'run' || action === 'carry' || action === 'idle') ? weary : 0;
  return { who: p.who ?? `${p.side}/${p.slot}`, action, frame, lift, ...(strideFrame === undefined ? {} : { strideFrame }), ...(tired ? { tired } : {}), ...screenFacing(p, previous, screenDir), possession };
}
