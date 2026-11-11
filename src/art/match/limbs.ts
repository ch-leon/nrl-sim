// The approved short limbs, shared by contact and ruck recovery.
import { add, blend, type Body, type Point } from '../prototype/tackle';

export interface ContactArm { shoulder: Point; elbow: Point; hand: Point }
/** Contact uses the standing sprite's leg reach, even while the hips turn or fall. */
const LEG_SEGMENT = 5;
const LEG_REACH = 9.5;

export function contactLeg(hip: Point, kneeHint: Point, plantedFoot: Point): { knee: Point; foot: Point } {
  const dy = Math.max(-LEG_REACH, Math.min(LEG_REACH, plantedFoot[1] - hip[1]));
  const stride = Math.sqrt(LEG_REACH * LEG_REACH - dy * dy);
  // Keep the sole on its ground plane. Step/slide inward when the hip moves out
  // of reach; pinning the old boot position would pull the thigh into a long line.
  const dx = Math.max(-stride, Math.min(stride, plantedFoot[0] - hip[0]));
  const foot = add(hip, dx, dy);
  const distance = Math.hypot(dx, dy);
  const normal: Point = distance > .001 ? [-dy / distance, dx / distance] : [1, 0];
  const middle = blend(hip, foot, .5);
  const bendLimit = Math.sqrt(LEG_SEGMENT * LEG_SEGMENT - distance * distance / 4);
  const hint = (kneeHint[0] - middle[0]) * normal[0] + (kneeHint[1] - middle[1]) * normal[1];
  // A projected bend can shorten in a fall. Following the hint continuously
  // avoids flipping the knee between two fixed-length solutions mid-tackle.
  let bend = Math.max(-bendLimit, Math.min(bendLimit, hint));
  if (normal[1] > .001) bend = Math.min(bend, Math.max(0, (foot[1] - middle[1]) / normal[1]));
  if (normal[1] < -.001) bend = Math.max(bend, Math.min(0, (foot[1] - middle[1]) / normal[1]));
  return { knee: add(middle, normal[0] * bend, normal[1] * bend), foot };
}

export function fitLegs(pose: Body): Body {
  const near = contactLeg(add(pose.hip, 2, 0), pose.knee, pose.foot);
  const far = contactLeg(add(pose.hip, -2, 0), pose.farKnee, pose.farFoot);
  return { ...pose, knee: near.knee, foot: near.foot, farKnee: far.knee, farFoot: far.foot };
}

/** Two short, bent segments. An approaching/releasing arm cannot stretch to its target. */
export function bentContactArm(shoulder: Point, target: Point, bend = 1): ContactArm {
  const dx = target[0] - shoulder[0]; const dy = target[1] - shoulder[1];
  const distance = Math.max(.001, Math.hypot(dx, dy));
  const reach = Math.min(9, distance); const ux = dx / distance; const uy = dy / distance;
  const hand = add(shoulder, ux * reach, uy * reach);
  const height = Math.sqrt(25 - reach * reach / 4);
  // Positive bend places the visible elbow below the shoulder-to-hand line.
  const sign = ux > 0 ? -bend : bend;
  const elbow = add(blend(shoulder, hand, .5), uy * height * sign, -ux * height * sign);
  return { shoulder, elbow, hand };
}
