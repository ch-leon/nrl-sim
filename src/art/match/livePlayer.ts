// Match poses using the approved character proportions and persistent appearance.
import type { PixelBuffer } from '../pixel';
import type { Kit } from './kit';
import type { PlayerAnim } from './players';
import { drawPrototypePlayer, type Appearance, type Action, type ReactAction, type Facing } from '../prototype/player';
import { drawRuckPlayer } from './ruck';
import { MOMENT_ACTIONS, drawMomentPlayer, type MomentAction } from './moments';
import { lookUpFrame } from './lookUp';

/** `ready`: a defender set for the play-the-ball (#665). The reactions (#667): standing or on the run. */
export type Reaction = 'handsOnHead' | 'handsOnHips' | 'armsFolded';
export type LivePlayerAction = PlayerAnim | 'carry' | 'ready' | Reaction | MomentAction;
const BASIC: Partial<Record<LivePlayerAction, Action | ReactAction>> = {
  idle: 'idle', run: 'run', carry: 'carry', pass: 'pass', catch: 'catch',
  tackle: 'wrap', tackled: 'brace', down: 'ground', dive: 'ground', ptb: 'ptb', fend: 'fend',
  handsOnHead: 'headHands', handsOnHips: 'hips', armsFolded: 'fold',
};

export function drawLivePlayer(look: Appearance, kit: Kit, action: LivePlayerAction, frame: number, facing: Facing, possession: boolean, strideFrame?: number, tired = 0, lookUp = 0): PixelBuffer {
  if (action === 'ptb' || action === 'dummyHalf' || action === 'ready') return drawRuckPlayer(look, kit, action, frame, facing, possession);
  if (MOMENT_ACTIONS.includes(action as MomentAction)) return drawMomentPlayer(look, kit, action as MomentAction, frame, facing, possession, strideFrame);
  let basic = BASIC[action];
  if (possession && (basic === 'wrap' || basic === 'idle')) basic = 'carry';
  // Every pose maps to a painter; a fend keeps the run cycle's legs under the straight arm.
  const drawn = drawPrototypePlayer(look, kit, basic ?? 'idle', frame, facing, possession, strideFrame, tired);
  // Eyes on a bomb (#671): a man standing or running, ball elsewhere, with his head tipped back.
  if (lookUp > 0 && !possession && (action === 'idle' || action === 'run')) return lookUpFrame(drawn, look, kit, facing, action, frame, strideFrame, tired, lookUp);
  return drawn;
}
