// src/art/captainPoses.ts — the captain-with-the-ball icon's four stills, for the iOS
// Dynamic Island and lock screen (docs/specs/ios.md §3, "The captain icon").
//
// Those views are native SwiftUI and cannot run our JavaScript, so scripts/gen-captain-poses.mjs
// exports these buffers as PNGs at build time. Pure and Phaser-free, like the rest of src/art:
// the poses are the live match sprites, picked frame by frame for how they read as a still at
// 28 points tall, and cropped to one common canvas so the figure keeps its feet on the same
// row and does not jump when the pose swaps.
import { PixelBuffer, shade } from './pixel';
import { buildKit, type Kit } from './match/kit';
import { drawLivePlayer } from './match/livePlayer';
import { appearanceFor, ballPixels, stand, WIDTH, PAINT_H, type Appearance } from './prototype/player';
import { body, contactPainter, type Point } from './prototype/tackle';
import { tiltedHead } from './prototype/contact';
import { bentContactArm, fitLegs } from './match/limbs';
import { OUTLINE } from './match/kit';
import { COLOR_TOKENS } from '../ui/tokens';

export type CaptainPose = 'carry' | 'try' | 'tackle' | 'fulltime';
export const CAPTAIN_POSES: readonly CaptainPose[] = ['carry', 'try', 'tackle', 'fulltime'];

/** The one generic player: fixed id and position, so every build draws the same man (spec §6 Q11). */
export const CAPTAIN_LOOK: Appearance = appearanceFor('captain', 'centre');

/** Brand colours: the accent jersey, navy trim and shorts (the club-kit builder derives the rest). */
export function brandKit(): Kit {
  return buildKit(hex(COLOR_TOKENS.accent), hex(COLOR_TOKENS.navy), 'v');
}
const hex = (css: string): number => parseInt(css.slice(1), 16);

/** The ball's panel colours (ballPixels in prototype/player.ts): used to find the ball in a pose. */
export const BALL_PANEL_COLORS: readonly number[] = [0xe7dfc7, 0xffffff];

/**
 * Which live-sprite frame reads best as a still:
 * - carry: the two-hand carry, front-on, ball across the body (a standing figure, ball low).
 * - try: the dive's grounding beat (frame 3): flat on the turf, ball pressed down under the chest.
 * - tackle: painted here (drawTackled): the wrap tackle's drive beat, leaning back off his feet. The
 *   live `tackled` frames are a stand-and-crouch that reads as the carry pose at icon size.
 * - fulltime: painted here (below): both arms straight up with the ball overhead. The sim's
 *   celebrations raise only a hand to head height, which is lost at icon size.
 */
function drawFulltime(look: Appearance, kit: Kit): PixelBuffer {
  const out = new PixelBuffer(WIDTH, PAINT_H);
  const brush = contactPainter(out);
  const p = fitLegs(body([19, 27], [19, 20], [12, 3], [23, 31], [24, 35], [16, 31], [15, 35]));
  brush.legs(p, look, kit);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, 'front', false, 0), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  // Both arms up and out in a V, hands under the ball held aloft. The sim's contact-arm helper only
  // reaches head height, so these are two bent strokes in the skin colour (the far arm a shade darker).
  const arm = (path: readonly Point[], color: number) => {
    for (let i = 0; i + 1 < path.length; i++) for (const dx of [0, 1]) out.line(path[i]![0] + dx, path[i]![1], path[i + 1]![0] + dx, path[i + 1]![1], color);
  };
  arm([[13, 22], [5, 14], [9, 7], [14, 3]], shade(look.skin, 0.7));
  out.blit(ballPixels(), 15, 0);
  arm([[24, 22], [32, 14], [28, 7], [23, 3]], look.skin);
  out.outline(OUTLINE);
  return stand(out);
}

/**
 * Wrapped up: the carrier from the wrap tackle's drive beat (tackle.ts, 6.7 s), driven back off
 * his feet with his head thrown back, both arms clamped round the ball. Painted alone: the
 * defender is left out so the icon is one figure.
 */
function drawTackled(look: Appearance, kit: Kit): PixelBuffer {
  const out = new PixelBuffer(WIDTH, PAINT_H);
  const brush = contactPainter(out);
  const p = fitLegs(body([23, 29], [17, 22], [9, 5], [29, 33], [32, 35], [20, 33], [19, 35]));
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target, 1);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  const ball: Point = [11, 25];
  brush.legs(p, look, kit);
  arm([p.shoulder[0] - 3, p.shoulder[1] + 1], [ball[0] + 6, ball[1] + 2], true);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, 'front', false, -25), Math.round(p.head[0] - 6), Math.round(p.head[1] - 6));
  out.blit(ballPixels(), ball[0], ball[1]);
  arm([p.shoulder[0] + 3, p.shoulder[1] + 1], [ball[0] + 5, ball[1] + 4], false);
  out.outline(OUTLINE);
  return stand(out);
}

/** One pose at its natural 44x42 sprite frame (feet on the sprite's baseline). */
export function captainFrame(pose: CaptainPose, look: Appearance = CAPTAIN_LOOK, kit: Kit = brandKit()): PixelBuffer {
  switch (pose) {
    case 'carry': return drawLivePlayer(look, kit, 'carry', 0, 'front', true, -1);
    case 'try': return drawLivePlayer(look, kit, 'dive', 3, 'front', true, -1);
    case 'tackle': return drawTackled(look, kit);
    case 'fulltime': return drawFulltime(look, kit);
  }
}

/** The bounding box of the opaque pixels of every pose, plus a one-pixel margin: the common canvas. */
function commonBox(frames: readonly PixelBuffer[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of frames) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (f.data[(y * f.w + x) * 4 + 3] === 0) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  return { x: x0, y: y0, w: Math.min(frames[0]!.w, x1 + 2) - x0, h: Math.min(frames[0]!.h, y1 + 2) - y0 };
}

/** All four poses, cropped to one common canvas, transparent background. Deterministic. */
export function captainPoses(look: Appearance = CAPTAIN_LOOK, kit: Kit = brandKit()): Record<CaptainPose, PixelBuffer> {
  const frames = CAPTAIN_POSES.map(p => captainFrame(p, look, kit));
  const box = commonBox(frames);
  const result = {} as Record<CaptainPose, PixelBuffer>;
  CAPTAIN_POSES.forEach((pose, i) => {
    const out = new PixelBuffer(box.w, box.h);
    out.blit(frames[i]!, -box.x, -box.y);
    result[pose] = out;
  });
  return result;
}
