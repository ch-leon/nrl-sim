// tests/systems/potentialRng.test.ts — #369 adds no dice: a season through every
// system leaves the same rngSeed as main did before it, with the player page's
// projection and the Squad dot worked out every week as if they were on screen.
import { describe, it, expect } from 'vitest';
import { createNewGame, getState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { initLeague } from '../../src/systems/fixtures';
import { advanceWeeks, registerTickHook, TICK_ORDER } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';
import { registerAllSystems } from '../../src/qa/soak';
import { playerPageModel } from '../../src/ui/screens/player';
import { contractsEndingSoon } from '../../src/systems/contracts';

/** rngSeed after one season of seed 1 on main before #369 (6093831), the same run without the hook below. */
const MAIN_SEED_AFTER_SEASON = 9501488;

describe('the rng stream (#369)', () => {
  it('a season leaves rngSeed where main left it, the projection and the dot looked at every week', () => {
    bus.clear();
    createNewGame('Rng', 1);
    initLeague(getState());
    registerAllSystems();
    let looked = 0;
    registerTickHook('test-look', TICK_ORDER.autosave, () => {
      const s = getState();
      for (const p of s.squad) playerPageModel(p, { kind: 'squad' }, s);
      for (const p of s.freeAgents.slice(0, 3)) playerPageModel(p, { kind: 'freeAgent' }, s);
      contractsEndingSoon(s);
      looked++;
    });
    advanceWeeks(WEEKS_PER_SEASON);
    expect(looked).toBe(WEEKS_PER_SEASON);
    expect(getState().season).toBe(2);
    expect(getState().rngSeed).toBe(MAIN_SEED_AFTER_SEASON);
  });
});
