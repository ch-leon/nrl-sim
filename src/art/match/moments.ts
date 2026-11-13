// The same short-limbed characters through kicks, high takes and scored tries.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { WIDTH, PAINT_H, FOOT, ballPixels, drawPrototypePlayer, stand as standFrame, type Appearance, type Facing } from '../prototype/player';
import { add, body, blend, blendBody, contactPainter, type Body, type Point } from '../prototype/tackle';
import { tiltedHead } from '../prototype/contact';
import { fitLegs, bentContactArm } from './limbs';

export type MomentAction = 'kick' | 'grubberKick' | 'dropKick' | 'airCatch' | 'dive' | 'tryRise' | 'celebrate' | 'fistPump' | 'point' | 'kneeSlide' | 'chestBump' | 'blowing' | 'goalRoutine' | 'teeKick';
export const MOMENT_ACTIONS: readonly MomentAction[] = ['kick', 'grubberKick', 'dropKick', 'airCatch', 'dive', 'tryRise', 'celebrate', 'fistPump', 'point', 'kneeSlide', 'chestBump', 'blowing', 'goalRoutine', 'teeKick'];
export interface MomentPose { pose: Body; ball: Point; near: Point; far: Point; tilt: number; lift: number }
const stand = (crouch = 0, lean = 0) => body([19, 27 + crouch], [19 + lean, 20 + crouch], [12 + lean, 3 + crouch], [23, 31], [24, 35], [16, 31], [15, 35]);
/** The same body `dx` pixels along (the goal kicker stepping back from his tee). */
const shift = (b: Body, dx: number): Body => ({
  hip: add(b.hip, dx, 0), shoulder: add(b.shoulder, dx, 0), head: add(b.head, dx, 0),
  knee: add(b.knee, dx, 0), foot: add(b.foot, dx, 0), farKnee: add(b.farKnee, dx, 0), farFoot: add(b.farFoot, dx, 0),
});
/**
 * The goal kicker's routine (#669), one pose a beat: the ball set on the tee, stood over it, three
 * paces back, a look up at the posts (head back), a breath (chest up), the run in; the strike is
 * `teeKick`. Hands and head per beat; the tee and ball stay put in front of him.
 */
const ROUTINE: readonly { pose: Body; near: Point; far: Point; tilt: number }[] = [
  { pose: body([18, 27], [23, 22], [22, 9], [25, 31], [25, 35], [16, 31], [15, 35]), near: [29, 30], far: [26, 29], tilt: 20 },
  { pose: stand(), near: [24, 28], far: [14, 28], tilt: 0 },
  { pose: shift(stand(), -4), near: [20, 28], far: [10, 28], tilt: 0 },
  { pose: shift(stand(0, -1), -4), near: [21, 26], far: [9, 26], tilt: -14 },
  { pose: shift(stand(-1), -4), near: [22, 28], far: [8, 28], tilt: 0 },
  { pose: { ...shift(stand(1, 2), -3), knee: [20, 30], foot: [22, 35], farKnee: [13, 31], farFoot: [10, 33] }, near: [13, 27], far: [22, 25], tilt: 0 },
];
/** Columns of the tee (and the ball standing on it) in the 44-px frame: just ahead of his front foot. */
const TEE_X = 28;

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
  if (action === 'goalRoutine') {
    const r = ROUTINE[f]!;
    return { pose: fitLegs(r.pose), ball: [TEE_X, 27], near: r.near, far: r.far, tilt: r.tilt, lift: 0 };
  }
  if (action === 'kick' || action === 'grubberKick' || action === 'dropKick' || action === 'teeKick') {
    const low = action === 'grubberKick';
    pose = stand(low ? [1, 2, 2, 1, 0, 0][f]! : 0, [-1, -1, 0, 1, 0, 0][f]!);
    pose.foot = (low ? [[16, 35], [17, 34], [21, 33], [25, 33], [28, 32], [24, 35]] as const
      : [[15, 34], [17, 32], [21, 31], [24, 30], [28, 23], [24, 35]] as const)[f]!;
    pose.knee = [21, f === 4 && !low ? 24 : 30];
    ball = action === 'dropKick' || action === 'teeKick' ? ([[23, 24], [20, 28], [17, 29], [17, 29], [17, 29], [23, 24]] as const)[f]!
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
  } else if (action === 'blowing') {
    // Spent at a stoppage (#666): bent at the hips, hands on his knees, head hanging; the back heaves a pixel.
    const heave = f % 2;
    pose = body([17, 27], [22, 23 - heave], [21, 10 - heave], [25, 31], [24, 35], [16, 31], [15, 35]);
    near = [27, 30]; far = [19, 30];
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
  const out = new PixelBuffer(WIDTH, PAINT_H); const brush = contactPainter(out);
  const { pose: p, ball, near, far, tilt } = momentPoseAt(action, frame, possession);
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target, target[1] < start[1] ? -1 : 1);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  brush.legs(p, look, kit);
  arm(add(p.shoulder, -3, 1), far, true);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, facing, false, tilt), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  const teed = action === 'goalRoutine' || action === 'teeKick';
  if (possession && !teed) out.blit(ballPixels(), Math.round(ball[0]), Math.round(ball[1]));
  arm(add(p.shoulder, 3, 1), near, false);
  if (action === 'dive' && frame >= 2 && frame <= 4) {
    out.fillRect(4, 35, 2, 1, 0x98b765); out.fillRect(6, 32, 2, 1, 0xc0b77b);
  }
  out.outline(OUTLINE);
  // Height lives in the shins: it goes as he leaves his feet and comes back as he rises.
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  const upright = action === 'dive' ? [1, .5, 0, 0, 0, 0][f]! : action === 'tryRise' ? f / 5 : 1;
  const framed = standFrame(out, Math.round(look.stature * upright));
  // On the ground, after the legs take his height: the tee, and through the routine the ball stood on it.
  if (teed) framed.blit(action === 'goalRoutine' ? TEED_BALL : TEE, TEE_X, FOOT - 8);
  return framed;
}

/** A small kicking tee, and the ball stood up on it (#669): drawn with its foot on the ground row, the ball 5 px wide. */
const TEE_ROWS = ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '..oto..', '.ottto.'];
function teeSprite(withBall: boolean): PixelBuffer {
  const b = new PixelBuffer(7, 9);
  b.sprite(withBall ? ['..ooo..', '.owwwo.', '.owWwo.', '.owlwo.', '.owlwo.', '.owwwo.', '..ooo..', ...TEE_ROWS.slice(7)] : TEE_ROWS,
    { o: OUTLINE, w: 0xe7dfc7, W: 0xffffff, l: 0xa39475, t: 0xf08a24 });
  return b;
}
const TEE = teeSprite(false);
const TEED_BALL = teeSprite(true);
