import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { PAINT_H, WIDTH, stand, type Appearance, type Facing } from '../prototype/player';
import { tiltedHead } from '../prototype/contact';
import { add, body, contactPainter, type Point } from '../prototype/tackle';

export const TOUCH_JUDGE_POSES = ['ready', 'watch', 'raise', 'up'] as const;
export type TouchJudgePose = typeof TOUCH_JUDGE_POSES[number];

const ARMS: Record<TouchJudgePose, { elbow: Point; hand: Point; tip: Point }> = {
  ready: { elbow: [24, 25], hand: [26, 28], tip: [30, 36] },
  watch: { elbow: [24, 25], hand: [26, 28], tip: [30, 36] },
  raise: { elbow: [26, 21], hand: [30, 17], tip: [34, 10] },
  up: { elbow: [26, 15], hand: [28, 10], tip: [29, 1] },
};

/** A touch judge watching the drop kick, then raising a red and yellow hand flag. */
export function drawTouchJudge(look: Appearance, kit: Kit, facing: Facing, pose: TouchJudgePose): PixelBuffer {
  const out = new PixelBuffer(WIDTH, PAINT_H);
  const brush = contactPainter(out);
  const p = body([19, 27], [19, 20], [12, 3], [23, 32], [23, 35], [16, 32], [15, 35]);
  const { elbow, hand, tip } = ARMS[pose];
  brush.legs(p, look, kit);
  brush.arm([15, 21], [14, 25], [13, 28], look, true);
  brush.torso(p, look, kit);
  out.blit(tiltedHead(look, kit, facing, false, pose === 'watch' ? -20 : 0), p.head[0], p.head[1]);

  // Cloth hangs from the last part of the shaft, with the hand painted over its grip.
  const raised = pose === 'raise' || pose === 'up';
  const hem = add(tip, raised ? -1 : -3, raised ? 6 : -5);
  const tipEdge = add(tip, 7, raised ? 1 : -1);
  const hemEdge = add(hem, 7, raised ? 2 : 0);
  const polygon = (points: readonly Point[]) => points.map(([x, y]) => ({ x, y }));
  out.fillPoly(polygon([tip, tipEdge, hemEdge, hem]), 0xf5cd4c);
  out.fillPoly(polygon([tip, hem, hemEdge]), 0xe45134);
  out.line(hand[0] + 1, hand[1], tip[0], tip[1], 0xffebbb);
  brush.arm([22, 21], elbow, hand, look);
  out.fillRect(22, 20, 3, 2, kit.jersey);
  out.outline(OUTLINE);
  return stand(out, look.stature);
}
