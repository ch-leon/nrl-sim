// Match poses using the approved character proportions and persistent appearance.
import { PixelBuffer } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import type { PlayerAnim } from './players';
import { drawPrototypePlayer, ballPixels, WIDTH, HEIGHT, type Appearance, type Action, type Facing } from '../prototype/player';
import { drawHead } from '../prototype/head';
import { body, contactPainter, add, type Point } from '../prototype/tackle';
import { bentContactArm } from './limbs';
import { drawRuckPlayer } from './ruck';
import { MOMENT_ACTIONS, drawMomentPlayer, type MomentAction } from './moments';

export type LivePlayerAction = PlayerAnim | 'carry' | MomentAction;
const BASIC: Partial<Record<LivePlayerAction, Action>> = {
  idle: 'idle', run: 'run', carry: 'carry', pass: 'pass', catch: 'catch',
  tackle: 'wrap', tackled: 'brace', down: 'ground', dive: 'ground', ptb: 'ptb',
};

export function drawLivePlayer(look: Appearance, kit: Kit, action: LivePlayerAction, frame: number, facing: Facing, possession: boolean, strideFrame?: number): PixelBuffer {
  if (action === 'ptb' || action === 'dummyHalf') return drawRuckPlayer(look, kit, action, frame, facing, possession);
  if (MOMENT_ACTIONS.includes(action as MomentAction)) return drawMomentPlayer(look, kit, action as MomentAction, frame, facing, possession, strideFrame);
  let basic = BASIC[action];
  if (possession && (basic === 'wrap' || basic === 'idle')) basic = 'carry';
  if (basic) return drawPrototypePlayer(look, kit, basic, frame, facing, possession, strideFrame);
  const out = new PixelBuffer(WIDTH, HEIGHT); const brush = contactPainter(out);
  const p = body([19, 27], [19, 20], [12, 3], [23, 31], [24, 35], [16, 31], [15, 35]);
  brush.legs(p, look, kit); brush.torso(p, look, kit);
  out.blit(drawHead(look, kit, facing), p.head[0], p.head[1]);
  let near: Point = [25, 28]; let far: Point = [12, 27];
  if (action === 'fend' || action === 'point') near = [32, 19];
  const arm = (start: Point, target: Point, dark: boolean) => {
    const a = bentContactArm(start, target);
    brush.arm(a.shoulder, a.elbow, a.hand, look, dark);
  };
  arm(add(p.shoulder, -3, 1), far, true);
  if (possession) out.blit(ballPixels(), action === 'fend' ? 13 : 23, 23);
  arm(add(p.shoulder, 3, 1), near, false);
  out.outline(OUTLINE); return out;
}
