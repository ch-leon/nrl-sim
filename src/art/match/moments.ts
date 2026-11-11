// The same short-limbed characters through kicks, high takes and scored tries.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { WIDTH, HEIGHT, ballPixels, drawPrototypePlayer, type Appearance, type Facing } from '../prototype/player';
import { add, body, blend, blendBody, contactPainter, type Body, type Point } from '../prototype/tackle';
import { tiltedHead } from '../prototype/contact';
import { fitLegs, bentContactArm } from './limbs';

export type MomentAction = 'kick' | 'grubberKick' | 'dropKick' | 'airCatch' | 'dive' | 'tryRise' | 'celebrate' | 'fistPump' | 'point' | 'kneeSlide' | 'chestBump';
export const MOMENT_ACTIONS: readonly MomentAction[] = ['kick', 'grubberKick', 'dropKick', 'airCatch', 'dive', 'tryRise', 'celebrate', 'fistPump', 'point', 'kneeSlide', 'chestBump'];
export interface MomentPose { pose: Body; ball: Point; near: Point; far: Point; tilt: number; lift: number }
const stand = (crouch = 0, lean = 0) => body([19, 27 + crouch], [19 + lean, 20 + crouch], [12 + lean, 3 + crouch], [23, 31], [24, 35], [16, 31], [15, 35]);
const landing = body([15, 32], [24, 30], [23, 16], [12, 33], [9, 35], [11, 32], [8, 33]);
const diveKeys: readonly Body[] = [
  stand(1, 2),
  body([17, 28], [23, 23], [17, 7], [14, 31], [11, 34], [13, 30], [10, 32]),
  body([15, 29], [23, 26], [21, 11], [11, 31], [8, 33], [11, 29], [8, 28]),
  landing, landing, landing,
];

export function momentLift(action: MomentAction, frame: number): number {
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  return action === 'airCatch' ? [3, 6, 5, 2, 0, 0][f]!
    : action === 'celebrate' || action === 'chestBump' ? [0, 1, 3, 4, 2, 0][f]! : 0;
}

export function momentPoseAt(action: MomentAction, frame: number, possession = false): MomentPose {
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  let pose = stand(); let ball: Point = [23, 24];
  let near: Point = [26, 27]; let far: Point = [12, 27]; let tilt = 0;
  if (action === 'kick' || action === 'grubberKick' || action === 'dropKick') {
    const low = action === 'grubberKick';
    pose = stand(low ? [1, 2, 2, 1, 0, 0][f]! : 0, [-1, -1, 0, 1, 0, 0][f]!);
    pose.foot = (low ? [[16, 35], [17, 34], [21, 33], [25, 33], [28, 32], [24, 35]] as const
      : [[15, 34], [17, 32], [21, 31], [24, 30], [28, 23], [24, 35]] as const)[f]!;
    pose.knee = [21, f === 4 && !low ? 24 : 30];
    ball = action === 'dropKick' ? ([[23, 24], [20, 28], [17, 29], [17, 29], [17, 29], [23, 24]] as const)[f]!
      : ([[23, 24], [20, 25], [17, 27], [17, 27], [17, 27], [23, 24]] as const)[f]!;
    near = possession ? add(ball, 4, 2) : [27, f === 4 ? 18 : 23];
    far = possession ? add(ball, 0, 2) : [11, 22];
  } else if (action === 'airCatch') {
    pose = stand([0, 0, 1, 3, 2, 0][f]!);
    ball = [23, [11, 11, 14, 18, 23, 24][f]!];
    near = add(ball, 4, 2); far = add(ball, 0, 2);
  } else if (action === 'dive' || action === 'tryRise') {
    const rise = action === 'tryRise' ? f / 5 : 0;
    pose = action === 'dive' ? { ...diveKeys[f]! } : blendBody(landing, stand(), rise);
    tilt = action === 'dive' ? [0, 25, 55, 80, 80, 80][f]! : 80 * (1 - rise);
    ball = action === 'dive' ? ([[23, 25], [27, 27], [29, 29], [29, 30], [29, 30], [29, 30]] as const)[f]!
      : blend([29, 30], [13, 24], rise);
    near = action === 'tryRise' ? blend([33, 33], [25, 27], rise) : add(ball, 4, 3);
    far = add(ball, 0, 2);
  } else {
    const crouch = action === 'kneeSlide' ? 4 : [0, 0, 1, 1, 0, 0][f]!;
    pose = stand(crouch, [0, 1, 1, 0, -1, -1][f]!);
    ball = add(pose.shoulder, -6, 4);
    if (action === 'fistPump') near = [27, [21, 16, 12, 13, 17, 21][f]!];
    else if (action === 'point') near = [31, [19, 18, 17, 17, 18, 19][f]!];
    else near = [27, [17, 14, 12, 12, 14, 17][f]!];
    far = possession ? add(ball, 2, 3) : action === 'fistPump' || action === 'point' ? [12, 27] : [10, 13];
  }
  return { pose: fitLegs(pose), ball, near, far, tilt, lift: momentLift(action, f) };
}

export function drawMomentPlayer(look: Appearance, kit: Kit, action: MomentAction, frame: number, facing: Facing, possession: boolean, strideFrame?: number): PixelBuffer {
  if (action === 'airCatch' && frame === 5) return drawPrototypePlayer(look, kit, 'carry', 0, facing, possession, strideFrame);
  const out = new PixelBuffer(WIDTH, HEIGHT); const brush = contactPainter(out);
  const { pose: p, ball, near, far, tilt } = momentPoseAt(action, frame, possession);
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target, target[1] < start[1] ? -1 : 1);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  brush.legs(p, look, kit);
  arm(add(p.shoulder, -3, 1), far, true);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, facing, false, tilt), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  if (possession) out.blit(ballPixels(), Math.round(ball[0]), Math.round(ball[1]));
  arm(add(p.shoulder, 3, 1), near, false);
  if (action === 'dive' && frame >= 2 && frame <= 4) {
    out.fillRect(4, 35, 2, 1, 0x98b765); out.fillRect(6, 32, 2, 1, 0xc0b77b);
  }
  out.outline(OUTLINE); return out;
}
