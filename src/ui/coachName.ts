import type { GameState } from '../core/state';

/** How the board and guide address the player, including saves made before names. */
export function coachAddress(state: Pick<GameState, 'coachName'>): string {
  return state.coachName?.trim() || 'Coach';
}
