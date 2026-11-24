import { INTERCEPT_TICKS, QUICK_TAP_PICTURE_TICKS, type BombContestSnap, type InterceptionSnap, type PlayerSnap, type Side, type Snapshot } from '../core/snapshot';
import type { Facing, Movement } from '../../art/prototype/player';
import { PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import { LIVE } from '../league/live/knobs';
import type { LivePlayerAction, Reaction } from '../../art/match/livePlayer';
import { hashString } from '../../art/match/kit';
import { MOMENT_ACTIONS, TRAVEL_ENDINGS, momentLift, type MomentAction } from '../../art/match/moments';
import { screenFacing, screenHeading, screenPlayerFacing } from './screenFacing';
import { legsBand } from './legsLayer';
import { FATIGUE } from '../league/fatigue';
import { eyesUp, type EyesUp } from './eyesUp';
import { goalKickPicture } from './goalKick';
import { callingPass, receivingPass, type ReceivePicture } from './handling';
import { playerMotion, movementStride, type MotionContext } from './playerMotion';
import { bombPlayer, bombPose } from './bombContest';

export interface PlayerPicture {
  /** Terminal tee-kick body can turn while the empty tee stays on its original posts side. */
  teeFlip?: true;
  /** Bounded movement key pose; absent for ordinary travel and shared contact artwork. */
  movement?: Movement;
  /** -1 plants the feet; otherwise the continuing run cycle, independent of hand progress. */
  strideFrame?: number;
  /** Cosmetic jump height; shadow, possession ring and simulation position stay on the turf. */
  lift?: number;
  /** Fatigue in the body (#666): 1 on tired legs, 2 spent or blown; absent when fresh. Part of the frame. */
  tired?: 1 | 2;
  /** Head tipped back at a bomb in the air (#671): 1 a glance, 2 right back; absent otherwise. Part of the frame. */
  lookUp?: 1 | 2;
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
export interface PictureContext extends MotionContext {
  incoming?: ReceivePicture;
  call?: ReceivePicture;
  interception?: InterceptionSnap;
  contactPlayers?: ReadonlySet<string>;
  /** A play-the-ball in progress (#665): the side defending it, where the ball is, and whether it is coming out. */
  ruck?: { side: Side; x: number; y: number; rising: boolean };
  /** Who has the ball and where (a reaction gives way to it when the man with it is close, #667). */
  carrier?: { side: Side; x: number; y: number };
  /** A try (#668): the scoring side, ticks since, and the mates the view draws gathering round the scorer. */
  tryScene?: { side: Side; age: number; mob: Map<string, { moving: boolean; left: boolean }> };
  /** A bomb in the air (#671): the few men under it, looking up. */
  eyesUp?: EyesUp;
  bombContest?: BombContestSnap;
  quickTap?: Snapshot['quickTap'];
  /** Interpolated sim tick, where a rendered frame supplies it. */
  drawnTick?: number;
  /** The whistle (#675): each man's walk-off, reaction or huddle picture (walkOff.ts), and which way he walks on screen. */
  walkOff?: Map<string, { action: LivePlayerAction | null; frame: number; gait: number; slump: boolean; left?: boolean }>;
}
/** Ticks after a try before the side that conceded slumps (the scorer is still going over). */
const SLUMP_AFTER = 8;
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
  if (p.blown || p.interchanging) return 2;
  if (p.legs === undefined) return 0;
  const band = legsBand(p.legs, FATIGUE);
  return band === 'spent' ? 2 : band === 'tired' ? 1 : 0;
}

export function pictureContext(s: Snapshot, prev?: Snapshot): PictureContext {
  const r = s.players.find(p => p.pose === 'ptb' || p.pose === 'dummyHalf');
  const ctx: PictureContext = {
    ball: { x: s.ball.x, y: s.ball.y, previousX: prev?.ball.x ?? s.ball.x, previousY: prev?.ball.y ?? s.ball.y, side: s.ball.holder?.side ?? s.attacking ?? prev?.ball.holder?.side ?? r?.side ?? null },
    motionLive: !s.phase || ['play', 'ruck', 'tackle'].includes(s.phase.kind),
  };
  const incoming = receivingPass(s);
  if (incoming) ctx.incoming = incoming;
  const call = callingPass(s);
  if (call) ctx.call = call;
  if (s.interception && s.phase?.kind === 'play') ctx.interception = s.interception;
  if (s.contact) ctx.contactPlayers = new Set([s.contact.carrier, ...s.contact.defenders].map(p => `${p.side}/${p.slot}/${p.who}`));
  const up = prev && eyesUp(prev, s);
  if (up) ctx.eyesUp = up;
  if (s.bombContest) ctx.bombContest = s.bombContest;
  if (s.quickTap) ctx.quickTap = s.quickTap;
  const h = s.ball.holder && s.players.find(p => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot);
  if (h) ctx.carrier = { side: h.side, x: h.x, y: h.y };
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
  const free = ctx.motionLive !== false && !possession && !p.binned && !ctx.contactPlayers?.has(`${p.side}/${p.slot}/${p.who}`) && (p.pose === 'run' || p.pose === 'idle');
  const incoming = ctx.incoming;
  if (free && incoming?.tick === tick && incoming.player.side === p.side && incoming.player.slot === p.slot && incoming.player.who === p.who) {
    action = 'receive'; frame = incoming.frame;
  } else if (free && ctx.call?.tick === tick && ctx.call.player.side === p.side && ctx.call.player.slot === p.slot && ctx.call.player.who === p.who) {
    action = 'call'; frame = ctx.call.frame;
  } else if (free && (action === 'run' || action === 'idle') && ctx.carrier && ctx.carrier.side !== p.side && p.speed > .6) {
    const dx = ctx.carrier.x - p.x, dy = ctx.carrier.y - p.y, distance = Math.hypot(dx, dy);
    if (distance > 1.2 && distance < 4.5 && (dx * p.headX + dy * (p.headY ?? 0)) / distance > .65) {
      action = 'guard'; frame = distance < 3 ? 1 : 0;
    }
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
  const contest = ctx.bombContest;
  const jumper = bombPlayer(contest, p);
  const wonBomb = contest && p.aerialCatchTick === contest.arrivesTick && p.caughtTick === contest.arrivesTick;
  const aerial = contest && jumper && !p.binned && ctx.motionLive !== false && !ctx.contactPlayers?.has(`${p.side}/${p.slot}/${p.who}`)
    && (!possession || wonBomb) && (p.pose === 'idle' || p.pose === 'run' || p.pose === 'catch')
    ? bombPose(contest, tick, jumper === contest.players[0], possession) : undefined;
  if (aerial) { action = 'bombContest'; frame = aerial.frame; }
  // A different player can arrive first. He takes it on his feet while the two who jumped settle.
  else if (action === 'airCatch' && wonBomb && !jumper) {
    action = catchAge < 4 ? 'catch' : 'carry'; frame = catchAge < 4 ? clampFrame(catchAge * 5 / 3) : Math.max(0, stride) % 6;
  }
  const tryAge = p.tryTick === undefined ? -1 : tick - p.tryTick;
  if (['dive', 'celebrate'].includes(p.pose) && tryAge >= 0 && tryAge < 20) {
    action = tryAge < 10 ? 'dive' : 'tryRise';
    frame = clampFrame((tryAge % 10) * 6 / 10);
  } else if (p.celebrationTick !== undefined && tick >= p.celebrationTick && (p.pose === 'celebrate' || (p.pose === 'dive' && tryAge >= 20))) {
    // Stable personal reactions, only after the engine has awarded the try. chestBump stays out:
    // it needs a partner, and big moments invent no paired interaction (match-big-moments.md).
    action = (['fistPump', 'point', 'celebrate', 'kneeSlide'] as const)[hashString(`${p.who ?? p.slot}/${p.celebrationTick}`) % 4]!;
    frame = tryAge >= 20 ? Math.floor((tryAge - 20) / 3) % 6 : Math.floor((tick - p.celebrationTick) / 3 + p.slot) % 6;
    // A slide drops once and stays on its knees; looping would replay the standing entry.
    if (action === 'kneeSlide') frame = Math.min(5, Math.floor((tick - p.celebrationTick - (tryAge >= 20 ? 20 : 0)) / 3));
  }
  // After a try (#668): the mates the view gathers round the scorer run in, cheer on their own, run back;
  // the side that conceded slumps, hands on hips, or trudges back head down.
  const travelEnd = frame === 5 && !possession && !!p.kick && TRAVEL_ENDINGS.includes(action as MomentAction);
  const landing = (action === 'airCatch' || action === 'bombContest') && frame >= 4;
  const bombEnd = action === 'bombContest' && frame === 5;
  let gait = stride;
  // Profiles belong to everyday movement/handling; shared contact, ruck and kicks
  // retain their authored front/back poses until their own art pass.
  let facing: { facing: Facing; left: boolean } = (['idle', 'run', 'carry', 'catch', 'pass', 'call', 'receive', 'guard', 'fend'].includes(action) || landing || travelEnd)
    ? screenPlayerFacing(p, previous, screenDir) : screenFacing(p, previous, screenDir);
  if (aerial && jumper && contest && !landing) {
    const toward = { headX: contest.at.x - jumper.x, headY: contest.at.y - jumper.y };
    facing = screenFacing(toward, toward, screenDir);
  }
  const tap = ctx.quickTap;
  const tapAge = tap ? (ctx.drawnTick ?? tick) - tap.tick : -1;
  // Five authored beats, then the distance-linked carry supplies the next stride.
  const tapFrame = Math.floor(tapAge * 6 / QUICK_TAP_PICTURE_TICKS);
  if (tap && !p.step && possession && (action === 'carry' || action === 'catch') && tapFrame >= 0 && tapFrame < 5
    && tap.player.who === p.who && tap.player.side === p.side && tap.player.slot === p.slot) {
    action = 'quickTap';
    frame = tapFrame;
    if (frame < 4) facing = { facing: 'front', left: tap.dir * screenDir < 0 };
  }
  let slump = false;
  const scene = ctx.tryScene;
  const member = scene?.mob.get(`${p.side}/${p.slot}`);
  if (member && p.celebrationTick !== undefined && tryAge < 0 && !possession) {
    if (member.moving) {
      gait = Math.floor(tick * .6 + p.slot) % 6 + (p.speed < JOG_SPEED ? 6 : 0);
      action = 'run'; frame = gait % 6; facing = { ...facing, left: member.left };
    } else {
      action = (['fistPump', 'celebrate'] as const)[hashString(`${p.who ?? p.slot}/${p.celebrationTick}`) % 2]!;
      frame = Math.floor((tick - p.celebrationTick) / 3 + p.slot) % 6;
    }
  } else if (scene && p.side !== scene.side && scene.age >= SLUMP_AFTER && !possession && !p.binned && (action === 'idle' || action === 'run' || action === 'ready' || action === 'blowing')) {
    if (stride === -1) { action = 'handsOnHips'; frame = Math.floor(scene.age / NOD_TICKS + p.slot) % 2; }
    else slump = action === 'run';
  }
  const off = ctx.walkOff?.get(`${p.side}/${p.slot}`);
  if (off?.action) { action = off.action; frame = off.frame; gait = off.gait; slump = off.slump; if (off.left !== undefined) facing = { ...facing, left: off.left }; }
  // A shot at goal (#669): the kicker's routine up to the strike, then the kick off the tee, facing the posts.
  let teeFlip = false;
  const shot = goalKickPicture(p, action, frame, tick, possession, screenDir);
  if (shot) {
    action = shot.action; frame = shot.frame;
    if (shot.action === 'teeKick' && shot.frame === 5) teeFlip = facing.left !== shot.left;
    else facing = { facing: shot.facing, left: shot.left };
  }
  const lift = aerial?.lift ?? (MOMENT_ACTIONS.includes(action as MomentAction) ? momentLift(action as MomentAction, frame) : 0);
  let strideFrame = travelEnd || bombEnd || ['run', 'carry', 'catch', 'pass', 'call', 'receive', 'guard', 'airCatch', 'fend', 'handsOnHead', 'handsOnHips', 'armsFolded'].includes(action)
    ? gait : undefined;
  // Only free movement uses these poses. Handling keeps its hand timing over the same legs;
  // a shared contact/ruck/kick, whistle or celebration never inherits a movement pose.
  let movement: Movement | undefined;
  if (!scene && !off?.action && !shot && (['idle', 'run', 'carry', 'catch', 'pass', 'call', 'receive', 'guard', 'fend'].includes(action) || (landing && action === 'airCatch') || bombEnd || travelEnd)) {
    const motion = playerMotion(p, previous, screenDir, ctx);
    movement = motion.movement;
    // A ball-holder and his handling follow-through always keep the ball-side silhouette.
    if (!possession && (action === 'run' || (bombEnd && gait >= 0)) && motion.facing) facing = { facing: motion.facing, left: motion.left! };
    else if (movement === 'shuffleBack' || movement === 'shuffleForward' || movement === 'backpedal') movement = undefined;
    if (movement && strideFrame !== undefined) strideFrame = movementStride(strideFrame, movement, p.odometer, p.slot);
    if (movement && (action === 'run' || action === 'carry')) frame = Math.max(0, strideFrame ?? stride) % 6;
  }
  const step = p.step;
  if (step && !p.binned && ctx.motionLive !== false && !scene && !off?.action && !shot && tick >= step.startedTick && tick < step.untilTick) {
    const progress = (tick - step.startedTick) / (step.untilTick - step.startedTick);
    if (step.role === 'carrier' && possession && (action === 'carry' || action === 'catch') && step.lateral !== 0) {
      // The jink is added to the body's position, separately from its steering heading.
      const cutX = screenHeading(0, step.lateral, screenDir).x;
      action = 'carry';
      movement = cutX * (facing.left ? -1 : 1) < 0 ? 'cutBack' : 'cutForward';
      frame = strideFrame = progress < .5 ? 0 : 3;
    } else if (step.role === 'defender' && !possession && action === 'tackled') {
      action = 'wrongFoot';
      frame = clampFrame(progress * 6);
      // Reach where the runner was at the contest, then turn back onto his own heading.
      if (frame < 4) {
        const reach = { headX: step.reachX, headY: step.reachY };
        facing = screenPlayerFacing(reach, p, screenDir);
      }
    }
  }
  // Eyes on the bomb (#671): standing or running, ball elsewhere, one of the few under it.
  const lookUp = ctx.eyesUp?.who.has(`${p.side}/${p.slot}`) && (action === 'idle' || action === 'run') && !possession && !p.binned ? ctx.eyesUp.level : 0;
  const tired = slump ? 2 : weary && (['run', 'carry', 'idle', 'call', 'receive', 'guard', 'catch', 'pass'].includes(action) || landing || travelEnd) ? weary : 0;
  // Keep the return's facing and gait. Only the arms choose the side the pass came from.
  const take = ctx.interception;
  if (take && possession && (action === 'catch' || action === 'carry') && ['idle', 'run', 'catch'].includes(p.pose)
    && !p.binned && !ctx.contactPlayers?.has(`${p.side}/${p.slot}/${p.who}`)
    && take.player.side === p.side && take.player.slot === p.slot && take.player.who === p.who
    && take.tick === p.caughtTick && catchAge >= 0 && catchAge < INTERCEPT_TICKS) {
    const laneLeft = screenHeading(take.fromX, take.fromY, screenDir).x < 0;
    action = 'intercept'; frame = Math.min(2, catchAge) + (laneLeft !== facing.left ? 3 : 0);
  }
  return { who: p.who ?? `${p.side}/${p.slot}`, action, frame, lift, ...(strideFrame === undefined ? {} : { strideFrame }), ...(movement ? { movement } : {}), ...(teeFlip ? { teeFlip: true as const } : {}), ...(tired ? { tired } : {}), ...(lookUp ? { lookUp } : {}), ...facing, possession };
}
