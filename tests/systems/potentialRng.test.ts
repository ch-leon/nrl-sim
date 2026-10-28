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

/**
 * rngSeed after one season of seed 1 on main, the same run without the hook below.
 * 6093831 before #369; 9501488 before Wave 3 task 04, whose rival need signings
 * (on the rivals' own seed, never rngSeed) change who the rivals field, so the
 * matches draw a different number of dice. The match engine is unchanged.
 * 3473711671 before the deeper default kick-off (#397), which changes every
 * match, so the season's matches draw a different number of dice again.
 */
const MAIN_SEED_AFTER_SEASON = 3821082668;

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
