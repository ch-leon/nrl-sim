// The same short-limbed characters through kicks, high takes and scored tries.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { WIDTH, PAINT_H, FOOT, CENTRE, ballPixels, drawPrototypePlayer, stand as standFrame, type Appearance, type Facing, type Movement } from '../prototype/player';
import { add, body, contactPainter, type Body, type Point } from '../prototype/tackle';
import { tiltedHead } from '../prototype/contact';
import { fitLegs, bentContactArm } from './limbs';

export type MomentAction = 'kick' | 'grubberKick' | 'dropKick' | 'airCatch' | 'bombContest' | 'groundPickup' | 'quickTap' | 'dive' | 'tryRise' | 'celebrate' | 'fistPump' | 'point' | 'kneeSlide' | 'chestBump' | 'blowing' | 'goalRoutine' | 'teeKick';
export const MOMENT_ACTIONS: readonly MomentAction[] = ['kick', 'grubberKick', 'dropKick', 'airCatch', 'bombContest', 'groundPickup', 'quickTap', 'dive', 'tryRise', 'celebrate', 'fistPump', 'point', 'kneeSlide', 'chestBump', 'blowing', 'goalRoutine', 'teeKick'];
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

/** Existing six beats: plant/drop, strike at 3, then lower the boot before handing back to travel.
 * Each foot is [x,y] in painter pixels. The far/support sole stays fixed throughout the kick.
 */
export const KICK_POSES = {
  kick: { crouch: [0, 1, 1, 0, 1, 0], lean: [-1, 0, 0, -1, 0, 0],
    foot: [[16, 35], [18, 33], [23, 32], [28, 26], [25, 31], [24, 35]],
    knee: [[20, 31], [21, 30], [23, 29], [24, 25], [23, 29], [23, 31]],
    ball: [[23, 24], [23, 26], [23, 28], [23, 28], [23, 28], [23, 24]] },
  grubberKick: { crouch: [1, 2, 2, 1, 1, 0], lean: [0, 1, 2, 2, 1, 0],
    foot: [[17, 35], [18, 35], [23, 34], [27, 33], [25, 34], [24, 35]],
    knee: [[20, 32], [21, 32], [23, 32], [24, 31], [23, 32], [23, 31]],
    ball: [[23, 24], [23, 27], [23, 29], [23, 29], [23, 29], [23, 24]] },
  dropKick: { crouch: [0, 1, 1, 1, 1, 0], lean: [0, 0, 1, 0, 0, 0],
    foot: [[16, 35], [18, 35], [22, 34], [27, 30], [25, 32], [24, 35]],
    knee: [[20, 31], [21, 31], [22, 32], [24, 28], [23, 30], [23, 31]],
    ball: [[23, 24], [24, 28], [24, 30], [24, 30], [24, 30], [23, 24]] },
  teeKick: { crouch: [0, 0, 1, 0, 1, 0], lean: [0, 1, 2, -1, 0, 0],
    foot: [[17, 35], [19, 34], [24, 33], [28, 31], [25, 33], [24, 35]],
    knee: [[20, 31], [22, 31], [24, 30], [25, 28], [23, 31], [23, 31]],
    ball: [[23, 24], [23, 24], [23, 24], [23, 24], [23, 24], [23, 24]] },
} as const;
export const TRAVEL_ENDINGS: readonly MomentAction[] = ['kick', 'grubberKick', 'dropKick', 'teeKick', 'airCatch', 'bombContest', 'groundPickup', 'quickTap'];
/** Stopped players return to idle; no run pose or ball is invented at a kick's end. */
export function momentHandoff(action: MomentAction, frame: number, possession: boolean, strideFrame?: number): 'idle' | 'run' | 'carry' | null {
  if (frame !== 5 || !TRAVEL_ENDINGS.includes(action)) return null;
  if ((action === 'airCatch' || action === 'bombContest' || action === 'groundPickup' || action === 'quickTap') && possession) return 'carry';
  if (possession) return null;
  return strideFrame === undefined || strideFrame === -1 ? 'idle' : 'run';
}

const landing = body([15, 32], [24, 30], [23, 16], [12, 33], [9, 35], [11, 32], [8, 33]);

/** Braced feet, one reaching hand, both hands at the take, then knees and arms absorb the fall. */
const BOMB_POSES = [
  { pose: body([19, 29], [20, 24], [12, 7], [25, 32], [25, 35], [15, 32], [14, 35]), near: [27, 30], far: [14, 29], ball: [21, 24], tilt: -15 },
  { pose: body([19, 27], [22, 20], [8, 4], [24, 30], [25, 33], [16, 32], [13, 35]), near: [32, 10], far: [12, 24], ball: [21, 10], tilt: -25 },
  { pose: body([20, 27], [20, 20], [10, 5], [25, 30], [24, 34], [16, 32], [15, 35]), near: [30, 10], far: [10, 10], ball: [17, 9], tilt: -18 },
  { pose: body([19, 28], [20, 22], [12, 5], [24, 31], [24, 35], [16, 31], [15, 34]), near: [27, 22], far: [12, 21], ball: [19, 20], tilt: -5 },
  { pose: stand(3, 1), near: [26, 28], far: [14, 27], ball: [19, 24], tilt: 0 },
] as const;

/** The low hand gathers the same ball at the same height as the flat turf sprite. */
const TURF_BALL: Point = [19, 30];
export const PICKUP_BALL_X = TURF_BALL[0] + 4.5 - CENTRE;
const LOW_PICKUP = {
  pose: body([17, 31], [21, 27], [21, 13], [24, 32], [24, 35], [13, 33], [11, 35]),
  ball: TURF_BALL, near: [26, 34], far: [22, 32], tilt: 49,
} as const;
const PICKUP_POSES = [
  { pose: body([18, 29], [20, 23], [17, 8], [22, 32], [24, 35], [13, 32], [11, 35]), ball: TURF_BALL, near: [25, 30], far: [16, 28], tilt: 28 },
  LOW_PICKUP, LOW_PICKUP,
  { pose: body([18, 30], [20, 24], [16, 8], [23, 32], [24, 35], [14, 32], [12, 35]), ball: [20, 26], near: [27, 30], far: [21, 29], tilt: 27 },
  { pose: stand(1, 1), ball: [19, 24], near: [26, 28], far: [20, 27], tilt: 10 },
] as const;
// Lower the ball, nudge it with the toe, reach for the rise and tuck it for the first stride.
const QUICK_TAP_POSES = [
  { pose: body([18, 28], [22, 23], [16, 8], [23, 31], [23, 35], [14, 31], [12, 35]), ball: [22, 25], near: [29, 28], far: [24, 28], tilt: 12 },
  { pose: body([18, 29], [22, 23], [18, 9], [22, 32], [23, 35], [14, 32], [12, 35]), ball: [24, 30], near: [28, 30], far: [23, 30], tilt: 24 },
  { pose: body([18, 28], [22, 23], [20, 9], [24, 31], [27, 34], [15, 31], [14, 35]), ball: [28, 29], near: [29, 27], far: [22, 28], tilt: 29 },
  { pose: body([19, 29], [24, 24], [21, 9], [25, 31], [27, 35], [14, 31], [12, 35]), ball: [26, 25], near: [31, 28], far: [26, 28], tilt: 20 },
  { pose: body([19, 27], [23, 21], [16, 6], [26, 30], [28, 35], [14, 30], [9, 33]), ball: [20, 23], near: [26, 26], far: [22, 26], tilt: 9 },
] as const;
const diveKeys: readonly Body[] = [
  stand(1, 2),
  body([17, 28], [23, 23], [17, 7], [14, 31], [11, 34], [13, 30], [10, 32]),
  body([15, 29], [23, 26], [21, 11], [11, 31], [8, 33], [11, 29], [8, 28]),
  landing, landing, landing,
];

/** Palm on turf, supported knee, both boots under him, then the shared celebration entry.
 * The ball remains protected in the other arm throughout the rise.
 */
export const TRY_RISE_POSES = [
  { pose: landing, ball: [29, 30], near: [33, 33], far: [29, 32], tilt: 80 },
  { pose: body([18, 32], [25, 29], [23, 14], [24, 34], [27, 35], [14, 35], [12, 35]), ball: [28, 29], near: [32, 32], far: [20, 35], tilt: 55 },
  { pose: body([20, 32], [23, 26], [19, 10], [25, 34], [27, 35], [15, 35], [13, 35]), ball: [25, 27], near: [29, 30], far: [20, 34], tilt: 35 },
  { pose: body([20, 30], [20, 23], [13, 6], [25, 33], [25, 35], [16, 33], [15, 35]), ball: [21, 26], near: [25, 29], far: [16, 32], tilt: 15 },
  { pose: stand(1), ball: [16, 25], near: [25, 28], far: [18, 28], tilt: 0 },
  { pose: stand(), ball: [13, 24], near: [25, 27], far: [15, 27], tilt: 0 },
] as const;

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
    const key = KICK_POSES[action];
    pose = stand(key.crouch[f]!, key.lean[f]!);
    pose.foot = key.foot[f]!; pose.knee = key.knee[f]!;
    ball = key.ball[f]!;
    near = possession ? add(ball, 4, 2) : ([[27, 25], [28, 22], [27, 20], [29, 18], [27, 23], [25, 27]] as const)[f]!;
    far = possession ? add(ball, 0, 2) : ([[13, 27], [12, 25], [11, 23], [10, 22], [12, 25], [15, 27]] as const)[f]!;
  } else if (action === 'airCatch') {
    pose = stand([0, 0, 1, 3, 1, 0][f]!);
    ball = [23, [11, 11, 16, 22, 26, 25][f]!];
    near = add(ball, 4, 2); far = add(ball, 0, 2);
  } else if (action === 'bombContest') {
    const reach = BOMB_POSES[Math.min(4, f)]!;
    ({ pose, ball, near, far, tilt } = reach);
    if (possession) { near = add(ball, 7, 4); far = add(ball, 1, 4); }
  } else if (action === 'groundPickup') {
    ({ pose, ball, near, far, tilt } = PICKUP_POSES[Math.min(4, f)]!);
  } else if (action === 'quickTap') {
    ({ pose, ball, near, far, tilt } = QUICK_TAP_POSES[Math.min(4, f)]!);
  } else if (action === 'dive' || action === 'tryRise') {
    if (action === 'tryRise') {
      const r = TRY_RISE_POSES[f]!;
      pose = r.pose; ball = r.ball; near = r.near; far = action === 'tryRise' && f === 5 && !possession ? [12, 27] : r.far; tilt = r.tilt;
    } else {
      pose = { ...diveKeys[f]! };
      tilt = [0, 25, 55, 80, 80, 80][f]!;
      ball = ([[23, 25], [27, 27], [29, 29], [29, 30], [29, 30], [29, 30]] as const)[f]!;
      near = add(ball, 4, 3); far = add(ball, 0, 2);
    }
  } else if (action === 'blowing') {
    // Spent at a stoppage (#666): bent at the hips, hands on his knees, head hanging; the back heaves a pixel.
    const heave = f % 2;
    pose = body([17, 27], [22, 23 - heave], [21, 10 - heave], [25, 31], [24, 35], [16, 31], [15, 35]);
    near = [27, 30]; far = [19, 30];
  } else {
    const crouch = action === 'kneeSlide' ? [0, 1, 3, 5, 5, 5][f]! : [0, 0, 1, 1, 0, 0][f]!;
    pose = stand(crouch, [0, 1, 1, 0, -1, -1][f]!);
    ball = add(pose.shoulder, -6, 4);
    if (action === 'fistPump') near = ([[25, 27], [27, 20], [27, 15], [27, 12], [27, 17], [27, 23]] as const)[f]!;
    else if (action === 'point') near = ([[25, 27], [28, 22], [31, 19], [31, 17], [31, 19], [28, 22]] as const)[f]!;
    else near = ([[25, 27], [27, 19], [27, 14], [27, 12], [27, 14], [27, 20]] as const)[f]!;
    if (action === 'kneeSlide' && f > 1) pose = { ...pose, knee: [24, 35], farKnee: [16, 35] };
    far = possession ? add(ball, 2, 3) : action === 'fistPump' || action === 'point' ? [12, 27] : [10, 13];
  }
  if (f === 0 && ['celebrate', 'fistPump', 'point', 'kneeSlide'].includes(action)) {
    const entry = TRY_RISE_POSES[5]; pose = entry.pose; near = entry.near;
    far = possession ? entry.far : [12, 27]; ball = entry.ball;
  }
  return { pose: fitLegs(pose), ball, near, far, tilt, lift: momentLift(action, f) };
}

export function drawMomentPlayer(look: Appearance, kit: Kit, action: MomentAction, frame: number, facing: Facing, possession: boolean, strideFrame?: number, tired = 0, movement?: Movement, teeFlip = false): PixelBuffer {
  const end = momentHandoff(action, frame, possession, strideFrame);
  if (end) {
    const pixels = drawPrototypePlayer(look, kit, end, 0, facing, possession, strideFrame, tired, movement);
    // The empty tee stays on the posts side through the last kick pose, even as his body turns.
    if (action === 'teeKick') pixels.blit(TEE, teeFlip ? 2 * CENTRE - TEE_X - TEE.w : TEE_X, FOOT - 8);
    return pixels;
  }
  if (action === 'airCatch' && frame === 4) return drawPrototypePlayer(look, kit, 'land', 0, facing, possession, strideFrame, tired, movement);
  const out = new PixelBuffer(WIDTH, PAINT_H); const brush = contactPainter(out);
  const { pose: p, ball, near, far, tilt } = momentPoseAt(action, frame, possession);
  const reach = action === 'bombContest' && (frame === 1 || frame === 2);
  const arm = (start: Point, target: Point, dark: boolean, open = false) => {
    const a = bentContactArm(start, target, target[1] < start[1] ? -1 : 1);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
    if (open) out.set(a.hand[0] + 1, a.hand[1] - 1, look.skin);
  };
  const sleeve = (side: number, color: number) => {
    for (let x = 0; x < 3; x++) out.line(p.shoulder[0] + side * 3 + x, p.shoulder[1] + 1, p.shoulder[0] + side * 5 + x, p.shoulder[1] - 2, color);
  };
  brush.legs(p, look, kit);
  if (!reach || frame === 1) arm(add(p.shoulder, -3, 1), far, true);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, facing, false, tilt), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  if (reach && frame === 2) {
    arm(add(p.shoulder, -5, -2), far, true, !possession);
    sleeve(-1, kit.jerseyShade);
  }
  const teed = action === 'goalRoutine' || action === 'teeKick';
  if (possession && !teed) out.blit(ballPixels(), Math.round(ball[0]), Math.round(ball[1]));
  arm(add(p.shoulder, reach ? 5 : 3, reach ? -2 : 1), near, false, !possession && (reach || (action === 'groundPickup' && frame === 1)));
  if (reach) sleeve(1, kit.jersey);
  if (action === 'dive' && frame >= 2 && frame <= 4) {
    out.fillRect(4, 35, 2, 1, 0x98b765); out.fillRect(6, 32, 2, 1, 0xc0b77b);
  }
  out.outline(OUTLINE);
  // Height lives in the shins: it goes as he leaves his feet and comes back as he rises.
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  const upright = action === 'dive' ? [1, .5, 0, 0, 0, 0][f]! : action === 'tryRise' ? f / 5
    : action === 'groundPickup' ? [.5, 0, 0, .5, 1, 1][f]! : action === 'quickTap' ? [1, .5, 0, .5, 1, 1][f]! : 1;
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
