// Contact silhouettes share the approved heads, but have distinct timing and body mechanics.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from '../match/kit';
import { drawHead, type Facing } from './head';
import { ballPixels, CENTRE, FOOT, PAINT_FOOT, drawPrototypePlayer, type Appearance } from './player';
import { add, blend, blendBody, body, contactPainter, flip, standTall, turnBody, type Body, type Point } from './tackle';
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
// #674. The ankle tap: his boots taken from behind, the runner pitches forward over them.
const STUMBLE = body([72, 69], [80, 63], [76, 47], [77, 73], [80, 78], [67, 74], [64, 78]);
const ANKLE = body([50, 74], [61, 75], [52, 63], [43, 77], [36, 78], [45, 76], [38, 77]);
const ANKLE_DOWN = body([48, 76], [59, 77], [48, 66], [41, 78], [35, 79], [43, 78], [37, 79]);
// The drag: a man on his hips from the side, knees trailing, while the runner drives on.
const DRIVE = body([72, 69], [79, 62], [77, 45], [78, 73], [80, 78], [66, 74], [63, 78]);
const DRAG = body([59, 74], [67, 70], [58, 55], [54, 77], [47, 79], [56, 77], [49, 78]);
const DRAG_DOWN = body([50, 76], [62, 74], [51, 62], [44, 78], [38, 79], [46, 78], [40, 79]);
// The front-on stop: folded over a square shoulder, boots off the turf, then flat on his back.
const JACK = body([66, 67], [73, 62], [72, 45], [70, 71], [70, 75], [62, 71], [60, 75]);
const STOP = body([89, 70], [78, 66], [78, 50], [86, 74], [84, 78], [95, 74], [99, 78]);
const STOP_DOWN = body([84, 74], [72, 71], [74, 58], [90, 77], [96, 79], [88, 77], [94, 79]);
// The bump: rocked back off the runner's shoulder, spun round, dumped on his back.
const ROCKED = body([101, 69], [101, 61], [95, 44], [104, 73], [106, 78], [98, 73], [96, 78]);
const BUMPED = body([104, 75], [114, 73], [112, 58], [98, 77], [92, 79], [100, 78], [94, 79]);

export type ContactRole = 'carrier' | 'upper' | 'low' | 'far' | 'ankle' | 'drag';
export interface ContactBody {
  player: ContactPlayer; pose: Body; tilt: number; left: boolean;
  arms: readonly ContactArm[]; grip: number; role: ContactRole;
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
  const variant = state.variant;
  const stop = variant === 'stop';
  const fallTime = state.kind === 'dominant' ? .24 : state.kind === 'low' ? .25 : .32;
  // The stop folds him over the shoulder before he goes down.
  const fall = completed ? ease((after - (stop ? .08 : 0)) / fallTime) : 0;
  const low = state.kind === 'low';
  const escaped = state.kind === 'break'; const stolen = state.kind === 'steal';
  // Held from behind (or hung on from the side), his legs go and he pitches forward,
  // unless a man arriving in front drives him back over the top.
  const fromBehind = variant === 'ankle' || variant === 'drag';
  const forward = low || (fromBehind && state.joined.length === 1);
  const ptb = state.phase === 'ptb';
  const drive = state.resolvedTick === null ? Math.sin(age * 18) * .75 : 0;
  const recoil = state.kind === 'dominant' && !stop ? -10 * ease(after / .14) : 0;
  const hit = Math.max(...state.joined.map(j => Math.max(0, 1 - (state.tick - j.tick) / 3)));
  const lead = variant === 'ankle' ? STUMBLE : variant === 'drag' ? DRIVE : stop ? JACK : BRACE;
  let c = blendBody(CARRIER, lead, ease(age / (stop ? .08 : .12)));
  if (variant === 'drag') {
    // Legs still pumping: a stride or two with the tackler hanging off him, dying away as he goes down.
    const step = age * Math.PI * 3; const pump = 1 - fall;
    const s = Math.sin(step) * pump; const lift = Math.cos(step) * pump;
    c = { ...c, foot: add(c.foot, 5 * s, -2 * Math.max(0, lift)), knee: add(c.knee, 3 * s, -2 * Math.max(0, lift)),
      farFoot: add(c.farFoot, -5 * s, -2 * Math.max(0, -lift)), farKnee: add(c.farKnee, -3 * s, -2 * Math.max(0, -lift)) };
  }
  c = shift(blendBody(c, forward ? FORWARD_DOWN : BACK_DOWN, fall), recoil);
  // Absorb each actual arrival through the trunk and knees; feet stay planted.
  const squash = (1 - fall) * hit;
  c = { ...c, hip: add(c.hip, 0, squash), shoulder: add(c.shoulder, -2 * squash + drive, squash), head: add(c.head, -2 * squash + drive, squash), knee: add(c.knee, 0, squash) };
  const run = escaped && after >= .15;
  if (escaped) {
    c = shift(blendBody(BRACE, CARRIER, ease(after / .2)), 34 * ease((after - .1) / .8));
    // The bump: shoulder dropped into the man, then up and away.
    const bump = Math.sin(Math.PI * clamp(after / .16));
    c = { ...c, shoulder: add(c.shoulder, 3 * bump, 2 * bump), head: add(c.head, 3 * bump, 2 * bump) };
  }
  if (stolen) c = shift(BRACE, -4 * ease(after / .18));
  const recovery = completed ? ease((after - .55) / .45) : 0;
  const ready = ruckPoseAt('ptb', 0);
  const recoveryTarget = shift(ready.pose, CONTACT_X - CENTRE, CONTACT_FOOT - PAINT_FOOT);
  c = blendBody(c, recoveryTarget, recovery);
  if (ptb) c = recoveryTarget;
  c = fitLegs(c);
  const carrier: ContactBody = { player: state.contact.carrier, pose: c, tilt: (forward ? 65 : -75) * fall * (1 - recovery), left: false,
    arms: [], grip: 0, role: 'carrier', running: run };
  const defenders = state.joined.map(({ player, tick }, index): ContactBody => {
    // The man from behind takes the legs or the hips; anyone after him comes in front.
    const role: ContactRole = fromBehind ? index === 0 ? variant : index === 1 ? 'upper' : 'low'
      : index === 2 ? 'far' : index === 1 || low ? 'low' : 'upper';
    const behind = role === 'ankle' || role === 'drag';
    const square = stop && index === 0;
    // A short completed hold is only known at resolution. Drop into the low
    // wrap over two frames rather than snapping from the preceding high hold.
    const lowDrop = low && index === 0 && role === 'low' ? ease(after / .1) : 1;
    const target = role === 'far' ? FAR : role === 'low' ? blendBody(HIGH, LOW, lowDrop) : role === 'ankle' ? ANKLE : role === 'drag' ? DRAG : square ? STOP : HIGH;
    const down = role === 'far' ? FAR_DOWN : role === 'low' ? LOW_DOWN : role === 'ankle' ? ANKLE_DOWN : role === 'drag' ? DRAG_DOWN : square ? STOP_DOWN : HIGH_DOWN;
    const join = ease((state.tick - tick) / 3);
    const release = ptb ? 1 : completed ? ease((after - .45 - (role === 'upper' ? .12 : 0)) / .35) : 0;
    let p = blendBody(shift(stand(target.hip[0]), role === 'far' ? -7 : behind ? -8 : 9, -3), target, join);
    p = shift(blendBody(p, down, fall), recoil);
    p = blendBody(p, behind ? stand(36, -4) : stand(role === 'far' ? 30 : role === 'low' ? 132 : 112, role === 'far' ? -5 : role === 'low' ? 5 : -4), release);
    let grip = join * (1 - release);
    let running = false;
    let turned = false;
    if (escaped) {
      grip *= 1 - ease(after / .12);
      if (index === 0) {
        // Bumped off: rocked back, spun right round on his heels, dumped on the turf.
        p = blendBody(blendBody(target, ROCKED, ease(after / .1)), BUMPED, ease((after - .2) / .2));
        const cos = Math.cos(2 * Math.PI * ease((after - .04) / .26));
        p = turnBody(p, cos);
        turned = cos < 0;
      } else p = blendBody(target, shift(down, index === 2 ? -5 : 5), ease(after / .25));
    }
    if (stolen) {
      grip = 1 - ease(after / .2);
      p = shift(blendBody(HIGH, stand(96), ease(after / .2)), 28 * ease((after - .15) / .7));
      running = after >= .25;
    }
    const anchor = role === 'low' ? blend(c.shoulder, c.hip, lowDrop) : role === 'ankle' ? add(c.farFoot, 0, -3)
      : role === 'drag' ? add(c.hip, -4, 1) : square ? blend(c.shoulder, c.hip, .6) : c.shoulder;
    // Shoulder/jersey contact drives the pose. Arms wrap the body at short range;
    // they no longer bridge the gap between two separated bodies.
    const dock = role === 'far' ? add(anchor, -5, -2) : role === 'low' ? add(anchor, 5, 3) : role === 'ankle' ? add(anchor, -4, 1)
      : role === 'drag' ? add(anchor, -1, 0) : square ? add(anchor, 7, 1) : add(anchor, 6, 1);
    p = shift(p, (dock[0] - p.shoulder[0]) * grip, (dock[1] - p.shoulder[1]) * grip);
    // Heads sit outside the runner's silhouette so close torsos remain readable.
    const tuckedHead = role === 'far' ? add(p.shoulder, -16, -17) : role === 'low' ? add(p.shoulder, 2, -14) : role === 'ankle' ? add(p.shoulder, -6, -13)
      : role === 'drag' ? add(p.shoulder, -9, -16) : add(p.shoulder, 0, -17);
    p = { ...p, head: blend(p.head, tuckedHead, grip) };
    p = fitLegs(p);
    const side = role === 'far' || behind ? -1 : 1;
    // Hands at the boots for the tap, round the waist for the drag, at the chest otherwise.
    const holds: readonly Point[] = role === 'ankle' ? [add(anchor, -2, 1), add(anchor, 1, -1)]
      : role === 'drag' ? [add(anchor, 2, -2), add(anchor, 5, 1)] : [add(anchor, -side, 3), add(anchor, 2 * side, 5)];
    // A bumped man's arms fly up and out; free hands otherwise hang with him.
    const free: readonly Point[] = escaped && index === 0 ? [add(p.shoulder, -7, -4), add(p.shoulder, 7, -5)] : [add(p.shoulder, -3 * side, 7), add(p.shoulder, 3 * side, 8)];
    const targets = [blend(free[0]!, holds[0]!, grip), blend(free[1]!, holds[1]!, grip)];
    const arms = [bentContactArm(p.shoulder, targets[0]!, -1), bentContactArm(add(p.shoulder, 2 * side, 2), targets[1]!)];
    const lean = role === 'far' ? 20 : role === 'low' ? -12 : role === 'ankle' ? 40 : role === 'drag' ? 25 : -32;
    return { player, pose: p, tilt: lean * (escaped ? ease(after / .25) : behind ? grip : fall * (1 - release)),
      left: behind ? false : turned ? false : !stolen || !running, arms, grip, role, running };
  });
  const owner = stolen ? defenders[0]!.player : carrier.player;
  const ball = stolen ? blend(add(c.shoulder, 5, 4), add(defenders[0]!.pose.shoulder, 4, 4), ease(after / .18)) : blend(add(c.shoulder, 3, 4), add(ready.ball, CONTACT_X - CENTRE, CONTACT_FOOT - PAINT_FOOT), recovery);
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

/**
 * Each man at his own height (`standTall`), as his single-player frames draw him.
 * Arms keep their grip: a hand on the carrier rides with the carrier's chest.
 */
export function standContact(pose: ContactPose, lookFor: (p: ContactPlayer) => Appearance): ContactPose {
  const rise = (a: ContactBody) => a.running || (a.role === 'carrier' && pose.ptb) ? 0 : lookFor(a.player).stature;
  const carrier = standTall(pose.carrier.pose, rise(pose.carrier));
  const carrierDy = carrier.shoulder[1] - pose.carrier.pose.shoulder[1];
  const tall = (a: ContactBody, p: Body): ContactBody => {
    const dy = p.shoulder[1] - a.pose.shoulder[1];
    const hand = dy * (1 - a.grip) + (a.role === 'carrier' ? dy : carrierDy) * a.grip;
    return { ...a, pose: p, arms: a.arms.map(arm => ({ shoulder: add(arm.shoulder, 0, dy), elbow: add(arm.elbow, 0, (dy + hand) / 2), hand: add(arm.hand, 0, hand) })) };
  };
  const defenders = pose.defenders.map(d => tall(d, standTall(d.pose, rise(d))));
  const owner = [pose.carrier, ...pose.defenders].findIndex(a => contactPlayerKey(a.player) === contactPlayerKey(pose.owner));
  const ownerDy = owner <= 0 ? carrierDy : defenders[owner - 1]!.pose.shoulder[1] - pose.defenders[owner - 1]!.pose.shoulder[1];
  return { ...pose, carrier: tall(pose.carrier, carrier), defenders, ball: add(pose.ball, 0, ownerDy) };
}

export function drawContact(state: ContactAnimation, lookFor: (p: ContactPlayer) => Appearance, kitFor: (p: ContactPlayer) => Kit, facing: Facing = 'front', suppliedPose?: ContactPose): PixelBuffer {
  const out = new PixelBuffer(CONTACT_W, CONTACT_H);
  const pose = standContact(suppliedPose ?? contactPoseAt(state), lookFor); const brush = contactPainter(out);
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
