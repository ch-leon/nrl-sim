import { CONTACT_X, CONTACT_FOOT, contactPoseAt, type ContactBody, type ContactPose } from '../../art/prototype/contact';
import { add, type Body, type Point } from '../../art/prototype/tackle';
import { contactPlayerKey, type ContactAnimation } from './contactAnimation';
import type { ContactPlayer } from '../core/snapshot';

export interface ContactPoint { player: ContactPlayer; x: number; y: number }
export interface ContactLayout { pose: ContactPose; x: number; y: number; left: boolean; feet: ContactPoint[] }
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Ticks a bust stays in the shared contact picture: the bump, the spin and most of the fall. */
export const BUMP_TICKS = 8;
function move(actor: ContactBody, dx: number, dy: number): ContactBody {
  return { ...actor,
    pose: Object.fromEntries(Object.entries(actor.pose).map(([key, p]) => [key, add(p, dx, dy)])) as unknown as Body,
    arms: actor.arms.map(a => ({ shoulder: add(a.shoulder, dx, dy), elbow: add(a.elbow, dx, dy), hand: add(a.hand, dx, dy) })),
  };
}

/** World travel remains the sim's; only local contact posture is choreographed. */
export function contactLayout(state: ContactAnimation, points: readonly ContactPoint[], left: boolean): ContactLayout | null {
  if (state.phase === 'ptb') return null;
  const escape = state.kind === 'break' || state.kind === 'steal';
  // A bumped-off man gets his spin (#674) before both go back to their own pictures.
  if (escape && state.resolvedTick !== null && state.tick - state.resolvedTick >= (state.variant === 'bump' ? BUMP_TICKS : 4)) return null;
  const find = (p: ContactPlayer) => points.find(q => contactPlayerKey(q.player) === contactPlayerKey(p));
  const at = find(state.contact.carrier);
  if (!at || state.contact.defenders.some(p => !find(p))) return null;
  const pose = contactPoseAt(state); const sign = left ? -1 : 1;
  const dx = CONTACT_X - pose.carrier.pose.hip[0];
  const dy = CONTACT_FOOT - Math.max(pose.carrier.pose.foot[1], pose.carrier.pose.farFoot[1]);
  pose.carrier = move(pose.carrier, dx, dy); pose.ball = add(pose.ball, dx, dy);
  pose.defenders = pose.defenders.map((d, i) => {
    d = move(d, dx, dy);
    const actual = find(d.player)!;
    const join = clamp((state.tick - state.joined[i]!.tick) / 3);
    const release = escape ? clamp((state.tick - state.resolvedTick!) / 4)
      : state.contact.releaseTick !== undefined ? clamp((state.tick - state.contact.releaseTick + 3) / 3) : 0;
    const blend = 1 - join * (1 - release);
    const shift: Point = [(CONTACT_X + (actual.x - at.x) * sign - d.pose.hip[0]) * blend,
      (CONTACT_FOOT + actual.y - at.y - Math.max(d.pose.foot[1], d.pose.farFoot[1])) * blend];
    if (contactPlayerKey(pose.owner) === contactPlayerKey(d.player)) pose.ball = add(pose.ball, shift[0], shift[1]);
    return move(d, shift[0], shift[1]);
  });
  const feet = [pose.carrier, ...pose.defenders].map(a => ({ player: a.player,
    x: Math.round(at.x + (a.pose.hip[0] - CONTACT_X) * sign), y: Math.round(at.y + Math.max(a.pose.foot[1], a.pose.farFoot[1]) - CONTACT_FOOT) }));
  return { pose, x: at.x, y: at.y, left, feet };
}
