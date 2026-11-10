import { createLegacyGame as createNewGame } from '../helpers/legacyGame';
// tests/systems/potentialRng.test.ts — #369 adds no dice: a season through every
// system leaves the same rngSeed as main did before it, with the player page's
// projection and the Squad dot worked out every week as if they were on screen.
import { describe, it, expect } from 'vitest';
import { getState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { initLeague } from '../../src/systems/fixtures';
import { advanceWeeks, registerTickHook, TICK_ORDER } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';
import { registerAllSystems } from '../../src/qa/soak';
import { playerPageModel } from '../../src/ui/screens/player';
import { applyTuning } from '../../src/match/league/tuning';
import { contractsEndingSoon } from '../../src/systems/contracts';

/**
 * rngSeed after one season of seed 1 on main, the same run without the hook below.
 * 6093831 before #369; 9501488 before Wave 3 task 04, whose rival need signings
 * (on the rivals' own seed, never rngSeed) change who the rivals field, so the
 * matches draw a different number of dice. The match engine is unchanged.
 * 3473711671 before the deeper default kick-off (#397), which changes every
 * match, so the season's matches draw a different number of dice again.
 * 3821082668 before the kick contests (#99: the bomb contest, the grubber race
 * in-goal), which change every match the same way.
 * 3040797444 before strategy counters switched on, #465. Different match
 * outcomes change the season’s existing draws; no new match RNG call is added.
 * 1010310188 before the paired-neutral #465 retune (Leon, 5 Nov); the
 * no-reads and weekly UI-read seasons still finish on the identical stream.
 * 1989516855 for the rejected paired-neutral candidate. The final #465 retune
 * deliberately restores 3040797444, matching pre-switch main for this season.
 * Both UI-read and no-read runs still agree; no RNG call site was added.
 * #469 changes rival plans and therefore season outcomes. Keep this historical
 * pin with habit AI off, and compare UI-read/no-read streams with it on too.
 * The two match fingerprint pins remain unchanged.
 */
// #536 splits the stat in rival growth as well as match inputs. The existing
// per-stat step now rolls for Kicking too; career streams change without tuning.
// Golden individual-match fingerprints remain unchanged.
const MAIN_SEED_AFTER_SEASON = 1642145858;

describe('the rng stream (#369)', () => {
  it.each([0, 1])('weekly projection and dot reads preserve the season stream with habit AI=%i', (ai) => {
    const restore = applyTuning({ 'counters.ai.on': ai });
    try {
      const season = (readPages: boolean) => {
        bus.clear();
        createNewGame('Rng', 1);
        initLeague(getState());
        registerAllSystems();
        let looked = 0;
        if (readPages) registerTickHook('test-look', TICK_ORDER.autosave, () => {
          const s = getState();
          for (const p of s.squad) playerPageModel(p, { kind: 'squad' }, s);
          for (const p of s.freeAgents.slice(0, 3)) playerPageModel(p, { kind: 'freeAgent' }, s);
          contractsEndingSoon(s);
          looked++;
        });
        advanceWeeks(WEEKS_PER_SEASON);
        return { looked, season: getState().season, seed: getState().rngSeed };
      };
      const control = season(false);
      const viewed = season(true);
      expect(control.season).toBe(2);
      expect(viewed.season).toBe(2);
      expect(viewed.looked).toBe(WEEKS_PER_SEASON);
      expect(viewed.seed).toBe(control.seed);
      if (ai === 0) expect(viewed.seed).toBe(MAIN_SEED_AFTER_SEASON);
    } finally { restore(); }
  });
});
