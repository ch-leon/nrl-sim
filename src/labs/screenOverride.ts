// Developer settings' screen override (#519): the Office screens' lock as the UI
// reads it. With OPEN_SCREENS on (browser-local), nothing is locked on screen;
// GameState.unlocks is never touched, so turning it off locks them again and the
// round-4/12 and first-home-game openings still land as they always would.
import type { GameState } from '../core/state';
import { screenLockReason } from '../systems/screenUnlocks';
import { OPEN_SCREENS, overrideOn } from './flags';

export function uiScreenLockReason(state: GameState, id: string): string | null {
  return overrideOn(OPEN_SCREENS) ? null : screenLockReason(state, id);
}
