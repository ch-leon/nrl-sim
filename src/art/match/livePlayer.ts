// Match poses using the approved character proportions and persistent appearance.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import type { PlayerAnim } from './players';
import { drawPrototypePlayer, ballPixels, WIDTH, HEIGHT, type Appearance, type Action, type Facing } from '../prototype/player';
import { drawHead } from '../prototype/head';
import { body, contactPainter, add, type Point } from '../prototype/tackle';
import { bentContactArm } from '../prototype/contact';

export type LivePlayerAction = PlayerAnim | 'carry';
const BASIC: Partial<Record<LivePlayerAction, Action>> = {
  idle: 'idle', run: 'run', carry: 'carry', pass: 'pass', catch: 'catch',
  tackle: 'wrap', tackled: 'brace', down: 'ground', dive: 'ground', ptb: 'ptb',
};

export function drawLivePlayer(look: Appearance, kit: Kit, action: LivePlayerAction, frame: number, facing: Facing, possession: boolean): PixelBuffer {
  let basic = BASIC[action];
  if (possession && (basic === 'wrap' || basic === 'idle')) basic = 'carry';
  if (basic) return drawPrototypePlayer(look, kit, basic, frame, facing, possession);
  const out = new PixelBuffer(WIDTH, HEIGHT); const brush = contactPainter(out);
  const f = Math.max(0, Math.min(5, frame));
  const crouch = action === 'dummyHalf' ? Math.max(0, 5 - f) : action === 'kneeSlide' ? 4 : 0;
  const p = body([19, 27 + crouch], [19, 20 + crouch], [12, 3 + crouch], [23, 31], [24, 35], [16, 31], [15, 35]);
  if (action === 'kick') { p.knee = [24 + f, 29 - f]; p.foot = [25 + f * 1.4, 34 - f * 2]; }
  if (action === 'kneeSlide') { p.knee = [23, 34]; p.foot = [28, 35]; }
  brush.legs(p, look, kit); brush.torso(p, look, kit);
  out.blit(drawHead(look, kit, facing), p.head[0], p.head[1]);
  let near: Point = [25, 28]; let far: Point = [12, 27];
  const cheering = ['celebrate', 'fistPump', 'kneeSlide', 'chestBump'].includes(action);
  if (cheering) { near = [27, 11 + f % 2]; far = action === 'fistPump' ? [13, 27] : [10, 12]; }
  if (action === 'fend' || action === 'point') near = [32, 19];
  if (action === 'dummyHalf') { near = [25, 32 - f]; far = [23, 31 - f]; }
  if (action === 'kick') { near = [27, 21]; far = [11, 21]; }
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target, cheering ? -1 : 1);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  arm(add(p.shoulder, -3, 1), far, true);
  if (possession) out.blit(ballPixels(), action === 'fend' ? 13 : 23, action === 'dummyHalf' ? 30 - f : 23 + crouch);
  arm(add(p.shoulder, 3, 1), near, false);
  out.outline(OUTLINE); return out;
}
