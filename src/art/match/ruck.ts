// Shared end of tackle recovery, play-the-ball and dummy-half pickup poses.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { drawHead } from '../prototype/head';
import { WIDTH, HEIGHT, ballPixels, type Appearance, type Facing } from '../prototype/player';
import { add, body, contactPainter, type Body, type Point } from '../prototype/tackle';
import { fitLegs, bentContactArm } from './limbs';

type RuckAction = 'ptb' | 'dummyHalf';
export interface RuckPose { pose: Body; ball: Point; near: Point; far: Point }

/** Six beats, sampled against the real ruck/pickup deadline by playerPicture. */
export function ruckPoseAt(action: RuckAction, frame: number): RuckPose {
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  const ptb = action === 'ptb';
  const crouch = (ptb ? [2, 3, 4, 3, 1, 0] : [4, 4, 3, 2, 1, 0])[f]!;
  const lean = ptb ? [0, 1, 2, 2, 1, 0][f]! : 1;
  const heel = ptb ? [0, 0, 0, -2, -4, -5][f]! : 0;
  const pose = fitLegs(body([19, 27 + crouch], [19 + lean, 20 + crouch], [12 + lean, 3 + crouch],
    [23 + heel, 31], [24 + heel, 35], [16, 31], [15, 35]));
  const ball: Point = ptb ? ([[22, 26], [22, 28], [21, 30], [19, 30], [17, 30], [15, 30]] as const)[f]!
    : [23, [30, 29, 27, 25, 24, 24][f]!];
  // Hands let go once the ball is down; the boot then heels it backwards.
  const near = ptb && f >= 3 ? add(pose.shoulder, 5, 7) : add(ball, 3, 3);
  const far = ptb && f >= 3 ? add(pose.shoulder, -4, 6) : add(ball, 0, 2);
  return { pose, ball, near, far };
}

export function drawRuckPlayer(look: Appearance, kit: Kit, action: RuckAction, frame: number, facing: Facing, possession: boolean): PixelBuffer {
  const out = new PixelBuffer(WIDTH, HEIGHT); const brush = contactPainter(out);
  const { pose: p, ball, near, far } = ruckPoseAt(action, frame);
  brush.legs(p, look, kit);
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  arm(add(p.shoulder, -3, 1), far, true);
  brush.torso(p, look, kit);
  out.blit(drawHead(look, kit, facing), p.head[0], p.head[1]);
  if (possession) out.blit(ballPixels(), ball[0], ball[1]);
  arm(add(p.shoulder, 3, 1), near, false);
  out.outline(OUTLINE); return out;
}
