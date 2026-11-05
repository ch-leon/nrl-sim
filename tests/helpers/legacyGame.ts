// Existing round-based tests exercise the supported legacy season shape.
// New-career trial integration lives in fixtures.test.ts and preseason.test.ts.
import { createNewGame, loadState } from '../../src/core/state';

export function createLegacyGame(...args: Parameters<typeof createNewGame>): ReturnType<typeof createNewGame> {
  const { preseason: _phase, ...state } = createNewGame(...args);
  loadState(state);
  return state;
}
