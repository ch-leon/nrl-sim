// Contact silhouettes share the approved heads, but have distinct timing and body mechanics.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from '../match/kit';
import { drawHead, type Facing } from './head';
import { ballPixels, CENTRE, FOOT, drawPrototypePlayer, type Appearance } from './player';
import { add, blend, blendBody, body, contactPainter, flip, type Body, type Point } from './tackle';
import { contactPlayerKey, type ContactAnimation } from '../../match/view/contactAnimation';
import { fitLegs, bentContactArm, type ContactArm } from '../match/limbs';
export { contactLeg, bentContactArm } from '../match/limbs';
import { ruckPoseAt, drawRuckPlayer } from '../match/ruck';
import type { ContactPlayer } from '../../match/core/snapshot';

export const CONTACT_W = 176;
export const CONTACT_H = 96;
export const CONTACT_X = 70;
export const CONTACT_FOOT = 78;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const shift = (p: Body, x: number, y = 0): Body => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, add(v, x, y)])) as unknown as Body;
const stand = (x: number, y = 0): Body => body([x, 69 + y], [x, 61 + y], [x - 7, 44 + y], [x + 4, 73 + y], [x + 5, 78 + y], [x - 4, 73 + y], [x - 5, 78 + y]);
const CARRIER = stand(CONTACT_X);
const BRACE = body([70, 70], [68, 62], [61, 45], [77, 73], [79, 78], [65, 73], [63, 78]);
const BACK_DOWN = body([70, 74], [59, 72], [47, 57], [80, 76], [87, 78], [73, 78], [79, 79]);
const FORWARD_DOWN = body([69, 73], [81, 72], [82, 56], [61, 76], [54, 78], [64, 77], [59, 79]);
const HIGH = body([96, 69], [88, 62], [81, 45], [89, 73], [86, 78], [104, 73], [109, 78]);
const LOW = body([108, 72], [93, 71], [86, 54], [112, 76], [119, 79], [105, 77], [110, 80]);
const FAR = body([46, 67], [54, 59], [47, 42], [42, 71], [40, 75], [51, 71], [53, 75]);
const HIGH_DOWN = body([96, 74], [81, 70], [74, 53], [96, 78], [104, 79], [108, 77], [116, 79]);
const LOW_DOWN = body([111, 77], [93, 76], [86, 59], [119, 79], [125, 80], [110, 80], [118, 81]);
const FAR_DOWN = body([46, 70], [53, 66], [46, 49], [40, 75], [36, 78], [51, 74], [54, 78]);

export interface ContactBody {
  player: ContactPlayer; pose: Body; tilt: number; left: boolean;
  arms: readonly ContactArm[]; grip: number; role: 'carrier' | 'upper' | 'low' | 'far';
  running: boolean;
}
export interface ContactPose { carrier: ContactBody; defenders: ContactBody[]; ball: Point; owner: ContactPlayer; ptb: boolean; impact: number }

/** Only the supplied participants are painted. Joins and outcomes come from snapshots. */
export function contactPoseAt(state: ContactAnimation): ContactPose {
  const age = Math.max(0, (state.tick - state.contact.startedTick) / 20);
  let after = state.resolvedTick === null ? -1 : Math.max(0, (state.tick - state.resolvedTick) / 20);
  if (state.contact.releaseTick !== undefined && state.resolvedTick !== null && state.kind !== 'break' && state.kind !== 'steal') {
    // Fit the approved fall/release to this ruck's actual duration, including quick rucks.
    after = Math.max(0, (state.tick - state.resolvedTick) / Math.max(1, state.contact.releaseTick - state.resolvedTick)) * 1.05;
  }
  const completed = after >= 0 && !['break', 'steal'].includes(state.kind);
  const fallTime = state.kind === 'dominant' ? .24 : state.kind === 'low' ? .25 : .32;
  const fall = completed ? ease(after / fallTime) : 0;
  const low = state.kind === 'low';
  const escaped = state.kind === 'break'; const stolen = state.kind === 'steal';
  const ptb = state.phase === 'ptb';
  const drive = state.resolvedTick === null ? Math.sin(age * 18) * .75 : 0;
  const recoil = state.kind === 'dominant' ? -10 * ease(after / .14) : 0;
  const hit = Math.max(...state.joined.map(j => Math.max(0, 1 - (state.tick - j.tick) / 3)));
  let c = blendBody(CARRIER, BRACE, ease(age / .12));
  c = shift(blendBody(c, low ? FORWARD_DOWN : BACK_DOWN, fall), recoil);
  // Absorb each actual arrival through the trunk and knees; feet stay planted.
  const squash = (1 - fall) * hit;
  c = { ...c, hip: add(c.hip, 0, squash), shoulder: add(c.shoulder, -2 * squash + drive, squash), head: add(c.head, -2 * squash + drive, squash), knee: add(c.knee, 0, squash) };
  const run = escaped && after >= .15;
  if (escaped) c = shift(blendBody(BRACE, CARRIER, ease(after / .2)), 34 * ease((after - .1) / .8));
  if (stolen) c = shift(BRACE, -4 * ease(after / .18));
  if (state.variant === 1 && completed) c = { ...c, shoulder: add(c.shoulder, -2 * fall, 0), head: add(c.head, -2 * fall, 0), knee: add(c.knee, -2 * fall, -fall) };
  const recovery = completed ? ease((after - .55) / .45) : 0;
  const ready = ruckPoseAt('ptb', 0);
  const recoveryTarget = shift(ready.pose, CONTACT_X - CENTRE, CONTACT_FOOT - FOOT);
  c = blendBody(c, recoveryTarget, recovery);
  if (ptb) c = recoveryTarget;
  c = fitLegs(c);
  const carrier: ContactBody = { player: state.contact.carrier, pose: c, tilt: (low ? 65 : -75) * fall * (state.variant === 1 ? .8 : 1) * (1 - recovery), left: false,
    arms: [], grip: 0, role: 'carrier', running: run };
  const defenders = state.joined.map(({ player, tick }, index): ContactBody => {
    const role = index === 2 ? 'far' : index === 1 || low ? 'low' : 'upper';
    // A short completed hold is only known at resolution. Drop into the low
    // wrap over two frames rather than snapping from the preceding high hold.
    const lowDrop = low && index === 0 ? ease(after / .1) : 1;
    const target = role === 'far' ? FAR : role === 'low' ? blendBody(HIGH, LOW, lowDrop) : HIGH;
    const down = role === 'far' ? FAR_DOWN : role === 'low' ? LOW_DOWN : HIGH_DOWN;
    const join = ease((state.tick - tick) / 3);
    const release = ptb ? 1 : completed ? ease((after - .45 - (role === 'upper' ? .12 : 0)) / .35) : 0;
    let p = blendBody(shift(stand(target.hip[0]), role === 'far' ? -7 : 9, -3), target, join);
    p = shift(blendBody(p, down, fall), recoil);
    p = blendBody(p, stand(role === 'far' ? 30 : role === 'low' ? 132 : 112, role === 'far' ? -5 : role === 'low' ? 5 : -4), release);
    let grip = join * (1 - release);
    let running = false;
    if (escaped) {
      grip *= 1 - ease(after / .12);
      p = blendBody(target, shift(down, index === 2 ? -5 : 5), ease(after / .25));
    }
    if (stolen) {
      grip = 1 - ease(after / .2);
      p = shift(blendBody(HIGH, stand(96), ease(after / .2)), 28 * ease((after - .15) / .7));
      running = after >= .25;
    }
    // Cosmetic variation changes the stance, never the outcome, timing or participants.
    if (state.variant === 1) p = { ...p, knee: add(p.knee, -2, -1), farKnee: add(p.farKnee, 2, 0) };
    const anchor = role === 'low' ? blend(c.shoulder, c.hip, lowDrop) : c.shoulder;
    // Shoulder/jersey contact drives the pose. Arms wrap the body at short range;
    // they no longer bridge the gap between two separated bodies.
    const dock = role === 'far' ? add(anchor, -5, -2) : role === 'low' ? add(anchor, 5, 3) : add(anchor, 6, 1);
    p = shift(p, (dock[0] - p.shoulder[0]) * grip, (dock[1] - p.shoulder[1]) * grip);
    // Heads sit outside the runner's silhouette so close torsos remain readable.
    const tuckedHead = role === 'far' ? add(p.shoulder, -16, -17) : role === 'low' ? add(p.shoulder, 2, -14) : add(p.shoulder, 0, -17);
    p = { ...p, head: blend(p.head, tuckedHead, grip) };
    p = fitLegs(p);
    const side = role === 'far' ? -1 : 1;
    const targets = [blend(add(p.shoulder, -3 * side, 7), add(anchor, -side, 3), grip),
      blend(add(p.shoulder, 3 * side, 8), add(anchor, 2 * side, 5), grip)];
    const arms = [bentContactArm(p.shoulder, targets[0]!, -1), bentContactArm(add(p.shoulder, 2 * side, 2), targets[1]!)];
    return { player, pose: p, tilt: (role === 'far' ? 20 : role === 'low' ? -12 : -32) * (escaped ? ease(after / .25) : fall * (1 - release)),
      left: !stolen || !running, arms, grip, role, running };
  });
  const owner = stolen ? defenders[0]!.player : carrier.player;
  const ball = stolen ? blend(add(c.shoulder, 5, 4), add(defenders[0]!.pose.shoulder, 4, 4), ease(after / .18)) : blend(add(c.shoulder, 3, 4), add(ready.ball, CONTACT_X - CENTRE, CONTACT_FOOT - FOOT), recovery);
  return { carrier, defenders, ball, owner, ptb, impact: state.kind === 'dominant' && after < .15 ? 1 - after / .15 : 0 };
}

export function tiltedHead(look: Appearance, kit: Kit, facing: Facing, left: boolean, angle: number): PixelBuffer {
  const head = left ? flip(drawHead(look, kit, facing)) : drawHead(look, kit, facing);
  const out = new PixelBuffer(28, 28);
  const radians = angle * Math.PI / 180; const co = Math.cos(radians); const si = Math.sin(radians);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const dx = x - 14; const dy = y - 14;
    const pixel = head.get(Math.round(dx * co + dy * si + 8), Math.round(-dx * si + dy * co + 8));
    if (pixel.alpha) out.set(x, y, pixel.color, pixel.alpha / 255);
  }
  return out;
}

export function drawContact(state: ContactAnimation, lookFor: (p: ContactPlayer) => Appearance, kitFor: (p: ContactPlayer) => Kit, facing: Facing = 'front', suppliedPose?: ContactPose): PixelBuffer {
  const out = new PixelBuffer(CONTACT_W, CONTACT_H);
  const pose = suppliedPose ?? contactPoseAt(state); const brush = contactPainter(out);
  const arm = (p: ContactArm, look: Appearance, dark = false) => brush.arm(p.shoulder, p.elbow, p.hand, look, dark);
  const ownerKey = contactPlayerKey(pose.owner);
  const drawBody = (actor: ContactBody) => {
    const look = lookFor(actor.player); const kit = kitFor(actor.player); const p = actor.pose;
    if (actor.running) {
      const pixels = drawPrototypePlayer(look, kit, 'carry', Math.floor(state.tick * .6) % 6, facing, contactPlayerKey(actor.player) === ownerKey);
      out.blit(actor.left ? flip(pixels) : pixels, Math.round(p.hip[0] - CENTRE), Math.round(p.foot[1] - FOOT));
    } else if (actor.role === 'carrier' && pose.ptb) {
      out.blit(drawRuckPlayer(look, kit, 'ptb', Math.min(5, Math.floor((state.tick - state.phaseTick) / 2)), facing, true), CONTACT_X - CENTRE, CONTACT_FOOT - FOOT);
    } else {
      brush.legs(p, look, kit);
      const neck = add(p.head, 8, 16); const length = Math.max(1, Math.hypot(neck[0] - p.shoulder[0], neck[1] - p.shoulder[1]));
      const end = blend(p.shoulder, neck, Math.min(1, 5 / length));
      for (let i = -1; i <= 1; i++) out.line(p.shoulder[0] + i, p.shoulder[1], end[0] + i, end[1], look.skin);
      brush.torso(p, look, kit);
      out.blit(tiltedHead(look, kit, facing, actor.left, actor.tilt), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
    }
  };
  // The far defender is behind the carrier; the low defender stays below his face.
  const far = pose.defenders.find(d => d.role === 'far');
  if (far) drawBody(far);
  for (const d of pose.defenders.filter(d => d.role !== 'far')) drawBody(d);
  for (const d of pose.defenders) if (!d.running) arm(d.arms[0]!, lookFor(d.player), true);
  drawBody(pose.carrier);
  if (state.kind === 'steal') {
    const shoulder = pose.carrier.pose.shoulder;
    const reach = 1 - ease((state.tick - state.resolvedTick!) / 6);
    arm(bentContactArm(add(shoulder, 3, 2), add(shoulder, 5 + 6 * reach, 8 - 2 * reach)), lookFor(pose.carrier.player));
  }
  if (!pose.ptb && ![pose.carrier, ...pose.defenders].some(a => a.running && contactPlayerKey(a.player) === ownerKey)) {
    out.blit(ballPixels(), Math.round(pose.ball[0]), Math.round(pose.ball[1]));
    const owner = state.kind === 'steal' ? pose.defenders[0]! : pose.carrier;
    arm(bentContactArm(add(owner.pose.shoulder, 4, 2), add(pose.ball, 4, 4)), lookFor(owner.player));
  }
  for (const d of pose.defenders) if (!d.running && state.kind !== 'steal') {
    arm(d.arms[1]!, lookFor(d.player));
  }
  if (pose.impact > 0) {
    const x = pose.carrier.pose.shoulder[0] + 11; const y = pose.carrier.pose.shoulder[1] - 4;
    out.line(x, y, x + 4, y - 3, 0xffe7ad); out.line(x + 2, y + 3, x + 7, y + 3, 0xffe7ad);
  }
  out.outline(OUTLINE);
  return out;
}
