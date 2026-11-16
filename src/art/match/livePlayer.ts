// Match poses using the approved character proportions and persistent appearance.
import type { PixelBuffer } from '../pixel';
import type { Kit } from './kit';
import type { PlayerAnim } from './players';
import { drawPrototypePlayer, type Appearance, type Action, type ReactAction, type Facing, type Movement } from '../prototype/player';
import { drawRuckPlayer } from './ruck';
import { MOMENT_ACTIONS, drawMomentPlayer, type MomentAction } from './moments';
import { lookUpFrame } from './lookUp';

/** `ready`: a defender set for the play-the-ball (#665). The reactions (#667): standing or on the run. */
export type Reaction = 'handsOnHead' | 'handsOnHips' | 'armsFolded';
export type LivePlayerAction = PlayerAnim | 'carry' | 'ready' | 'receive' | 'guard' | Reaction | MomentAction;
const BASIC: Partial<Record<LivePlayerAction, Action | ReactAction>> = {
  idle: 'idle', run: 'run', carry: 'carry', pass: 'pass', catch: 'catch', receive: 'receive', guard: 'guard',
  tackle: 'wrap', tackled: 'brace', down: 'ground', dive: 'ground', ptb: 'ptb', fend: 'fend',
  handsOnHead: 'headHands', handsOnHips: 'hips', armsFolded: 'fold',
};

export function drawLivePlayer(look: Appearance, kit: Kit, action: LivePlayerAction, frame: number, facing: Facing, possession: boolean, strideFrame?: number, tired = 0, lookUp = 0, movement?: Movement): PixelBuffer {
  // The landing's last beat is the continuing carry, including its directional view.
  if (action === 'airCatch' && frame === 5) return drawPrototypePlayer(look, kit, 'carry', 0, facing, possession, strideFrame, tired, movement);
  // Pickup ends on the same two-hand carry that precedes a pass or dart.
  if (action === 'dummyHalf' && possession && frame === 5) return drawPrototypePlayer(look, kit, 'carry', 0, facing === 'side' ? 'front' : facing, true, -1);
  const sharedFacing = facing === 'side' ? 'front' : facing;
  if (action === 'ptb' || action === 'dummyHalf' || action === 'ready') return drawRuckPlayer(look, kit, action, frame, sharedFacing, possession);
  if (MOMENT_ACTIONS.includes(action as MomentAction)) return drawMomentPlayer(look, kit, action as MomentAction, frame, sharedFacing, possession, strideFrame);
  let basic = BASIC[action];
  if (possession && (basic === 'wrap' || basic === 'idle')) basic = 'carry';
  // Every pose maps to a painter; a fend keeps the run cycle's legs under the straight arm.
  const bodyFacing = basic === 'ground' || basic === 'wrap' || basic === 'brace' || basic === 'ptb' ? sharedFacing : facing;
  const motion = ['idle', 'run', 'carry', 'catch', 'pass', 'receive', 'guard', 'fend'].includes(basic ?? '') ? movement : undefined;
  const drawn = drawPrototypePlayer(look, kit, basic ?? 'idle', frame, bodyFacing, possession, strideFrame, tired, motion);
  // Eyes on a bomb (#671): a man standing or running, ball elsewhere, with his head tipped back.
  if (lookUp > 0 && !possession && (action === 'idle' || action === 'run')) return lookUpFrame(drawn, look, kit, facing, action, frame, strideFrame, tired, lookUp, motion);
  return drawn;
}
