import { PixelBuffer } from '../pixel';
import { drawPrototypePlayer, HEIGHT, PAINT_H, prototypeUpperAt, WIDTH, type Appearance, type ArmPose, type Facing } from '../prototype/player';
import { OUTLINE, type Kit } from './kit';
import { lookUpFrame } from './lookUp';

export const TOUCH_JUDGE_POSES = ['ready', 'watch', 'raise', 'up', 'waveOut', 'waveMidOut', 'waveAcross', 'waveMidIn', 'waveIn'] as const;
export type TouchJudgePose = typeof TOUCH_JUDGE_POSES[number];
export const TOUCH_JUDGE_JOG_FRAMES = 6;

type Offset = ArmPose['hand'];
interface FlagPose extends ArmPose {
  /** The shaft ends at tip. The cloth runs back along the shaft and hangs below it. */
  tip: Offset;
  hoist: Offset;
  fly: Offset;
}

const LOW: FlagPose = { elbow: [0, 4], hand: [1, 6], tip: [4, 11], hoist: [-2, -4], fly: [7, -1] };
const SIDELINE: FlagPose = { elbow: [0, 4], hand: [3, 6], tip: [10, 4], hoist: [-5, 0], fly: [0, 6] };
const ARMS: Record<TouchJudgePose, FlagPose> = {
  ready: LOW,
  watch: LOW,
  raise: { elbow: [3, 3], hand: [6, -1], tip: [10, -10], hoist: [-3, 6], fly: [7, 2] },
  up: { elbow: [6, -5], hand: [9, -11], tip: [9, -20], hoist: [0, 7], fly: [8, 1] },
  waveOut: { elbow: [4, 4], hand: [8, 3], tip: [18, 2], hoist: [-7, 1], fly: [0, 6] },
  waveMidOut: { elbow: [4, 5], hand: [5, 4], tip: [12, 2], hoist: [-5, 1], fly: [0, 6] },
  waveAcross: { elbow: [4, 5], hand: [0, 5], tip: [2, 2], hoist: [-4, 0], fly: [1, 6] },
  waveMidIn: { elbow: [3, 5], hand: [-4, 4], tip: [-10, 2], hoist: [5, 1], fly: [0, 6] },
  waveIn: { elbow: [2, 5], hand: [-7, 4], tip: [-18, 3], hoist: [7, 1], fly: [0, 6] },
};

/** The referee/player registration, with a flag attached to the near hand. */
export function drawTouchJudge(look: Appearance, kit: Kit, facing: Facing, pose: TouchJudgePose | 'sideline', jog?: number): PixelBuffer {
  const action = jog === undefined ? 'idle' : 'run';
  const frame = jog ?? 0;
  const stride = jog === undefined ? undefined : jog + 6;
  const { left, shoulderY, swing } = prototypeUpperAt(look.build, action, frame, stride);
  const armShift = Math.round(swing);
  const arm: FlagPose = pose === 'sideline' ? {
    ...SIDELINE, hand: [SIDELINE.hand[0] - armShift, SIDELINE.hand[1]], tip: [SIDELINE.tip[0] - armShift, SIDELINE.tip[1]],
  } : ARMS[pose];
  const base = drawPrototypePlayer(look, kit, action, frame, facing, false, stride, 0, undefined, arm);
  const body = pose === 'watch' ? lookUpFrame(base, look, kit, facing, 'idle', 0, undefined, 0, 1) : base;
  const bodyWidth = look.build === 'stocky' ? 11 : look.build === 'athletic' ? 9 : 7;
  const shoulderX = left + bodyWidth - 2;
  const frameY = shoulderY + 2 + HEIGHT - PAINT_H - look.stature;
  const tip = { x: shoulderX + arm.tip[0], y: frameY + arm.tip[1] };
  const hoist = { x: tip.x + arm.hoist[0], y: tip.y + arm.hoist[1] };
  const fly = (p: typeof tip) => ({ x: p.x + arm.fly[0], y: p.y + arm.fly[1] });
  const grip = { x: shoulderX + arm.hand[0], y: frameY + arm.hand[1] };

  const flag = new PixelBuffer(WIDTH, HEIGHT);
  flag.fillPoly([tip, hoist, fly(hoist), fly(tip)], 0xf5cd4c);
  flag.fillPoly([tip, hoist, fly(tip)], 0xe45134);
  flag.line(grip.x, grip.y, tip.x, tip.y, 0xffebbb);
  flag.outline(OUTLINE);
  // Keep the palm visible where it closes around the shaft.
  for (let y = grip.y; y < grip.y + 2; y++) for (let x = grip.x; x < grip.x + 2; x++) {
    const palm = body.get(x, y);
    flag.set(x, y, palm.color, palm.alpha / 255);
  }
  body.blit(flag);
  return body;
}
