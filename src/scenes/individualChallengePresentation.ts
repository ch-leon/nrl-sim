// A camera and two athletes on a 210 × 112 showground. All coordinates describe
// presentation of a saved contact. The lane never asks the engine for a roll.
import type { ChallengeClash } from '../data/individualChallengeRules';
import type { Movement } from '../art/prototype/player';
import type { ContactPlayer } from '../match/core/snapshot';
import { contactVariant, type ContactAnimation } from '../match/view/contactAnimation';
import type { PlayerPicture } from '../match/view/playerPicture';

export const LANE_MARKER = 141;
export const CLASH_DURATION = 4900;
const CONTACT_MS = 2000;
const RELEASE_MS = 3100;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
interface AthleteFrame { x: number; y: number; picture: PlayerPicture }
export interface LaneFrame { carrier: AthleteFrame; defender: AthleteFrame; contact: ContactAnimation | null }

export function waitingFrame(carrier: string, defender: string): LaneFrame {
  return {
    carrier: { x: 36, y: 84, picture: { who: carrier, action: 'carry', frame: 0, strideFrame: -1, possession: true, facing: 'side', left: false } },
    defender: { x: 157, y: 84, picture: { who: defender, action: 'guard', frame: 0, strideFrame: -1, possession: false, facing: 'front', left: true } },
    contact: null,
  };
}

export function clashFrame(saved: ChallengeClash, elapsedMs: number): LaneFrame {
  const ms = Math.max(0, Math.min(CLASH_DURATION, elapsedMs));
  const approach = clamp(ms / CONTACT_MS);
  const drive = clamp((ms - CONTACT_MS) / (RELEASE_MS - CONTACT_MS));
  const escape = clamp((ms - RELEASE_MS) / 1250);
  // A shot meets the runner early. Tracking reaches him from the side. The
  // planted wrapper holds a fixed line and lets the carrier come to him.
  const impactX = { shoot: 94, track: 106, wrap: 116 }[saved.defence];
  const finishX = [impactX - 5, LANE_MARKER, 181][saved.score]!;
  const attackTravel = saved.attack === 'power' ? approach ** 1.35 : saved.attack === 'controlled' ? approach : Math.sqrt(approach);
  const swing = Math.sin(Math.PI * approach);
  const sidestep = saved.attack === 'angle' ? -19 * swing * Math.sin(approach * Math.PI * 1.3) : 0;
  const carrier = waitingFrame(saved.attackerId, saved.defenderId).carrier;
  carrier.x = ms < CONTACT_MS ? mix(36, impactX, attackTravel)
    : mix(impactX, saved.score === 2 ? impactX + 10 : finishX, drive);
  carrier.y += sidestep;
  const defender = waitingFrame(saved.attackerId, saved.defenderId).defender;
  const guardTravel = saved.defence === 'shoot' ? Math.min(1, approach ** 1.75) : approach;
  const startingX = saved.defence === 'wrap' ? impactX + 11 : 157;
  defender.x = ms < CONTACT_MS ? mix(startingX, impactX + 8, guardTravel) : carrier.x + 8;
  if (saved.defence === 'track') defender.y += swing * 12 + sidestep * .45;
  const carrierMotion: Movement = saved.attack === 'angle' ? (approach < .55 ? 'cutBack' : 'cutForward')
    : saved.attack === 'power' ? 'drive' : 'brake';
  const defenderMotion: Movement = saved.defence === 'track' ? 'shuffleForward' : saved.defence === 'shoot' ? 'drive' : 'brake';
  const running = (speed: number) => Math.floor(ms / speed) % 6;
  carrier.picture = { ...carrier.picture, frame: running(93), strideFrame: running(saved.attack === 'controlled' ? 156 : 93), movement: carrierMotion };
  defender.picture = { ...defender.picture, action: saved.defence === 'wrap' ? 'guard' : 'run',
    frame: running(115), strideFrame: saved.defence === 'wrap' ? -1 : running(115), movement: defenderMotion };
  if (ms < CONTACT_MS) return { carrier, defender, contact: null };
  if (saved.score === 2 && ms >= RELEASE_MS) {
    carrier.x = mix(impactX + 10, finishX, escape);
    carrier.picture.movement = 'drive';
    defender.x = impactX + 13;
    defender.picture = { ...defender.picture, action: 'down', frame: 1, strideFrame: -1 };
    return { carrier, defender, contact: null };
  }
  const attacker: ContactPlayer = { side: saved.role === 'carry' ? 'home' : 'away', slot: 0, who: saved.attackerId };
  const tackler: ContactPlayer = { side: saved.role === 'carry' ? 'away' : 'home', slot: 0, who: saved.defenderId };
  const kind = saved.score === 2 ? 'break' : saved.score === 0 && saved.defence === 'shoot' ? 'dominant' : 'wrap';
  const angle = saved.defence === 'track' ? 'side' : 'front';
  const tick = Math.floor((ms - CONTACT_MS) / 55);
  // The shared bust artwork lasts eight ticks after release. Wind up first,
  // then spend those ticks on the bump and fall as the two athletes separate.
  const resolveAt = saved.score === 2 ? 13 : 20;
  const resolvedTick = tick >= resolveAt ? resolveAt : null;
  const visibleKind = resolvedTick === null ? 'wrap' : kind;
  return { carrier, defender, contact: {
    contact: { startedTick: 0, carrier: attacker, defenders: [tackler] },
    joined: [{ player: tackler, tick: 0 }], kind: visibleKind, approach: angle, variant: contactVariant(visibleKind, angle),
    resolvedTick, phaseTick: resolvedTick ?? 0, tick,
    phase: resolvedTick === null ? 'contact' : kind === 'break' ? 'escape' : 'ground', holder: attacker,
  } };
}
