import { createLegacyGame as createNewGame } from '../helpers/legacyGame';
// Stored ceilings and weekly player-page reads preserve the season RNG stream.
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
 * #537 changes creation draws, shown-stat growth and overall-based selection.
 * Re-pin the new-career season stream; UI reads must still match the control.
 * Flat-match fingerprint pins remain unchanged.
 */
// #539: XP replaces passive facility growth, changing selection and later match outcomes.
// No RNG draw was added; UI-read and no-read runs still finish on the same stream.
// Previous pin: 1788836146.
// #618: square marker positions change match outcomes and subsequent season draws.
// UI-read and no-read seasons must still agree. Previous pin: 1597012555.
// #625: completed retreats, including handovers, change match outcomes and later
// season draws. The final standing-marker/deep-cover corrections restore this historical
// season fingerprint; UI-read and no-read seasons still agree.
// #650/#652 retained the prior 1788836146 fingerprint. #649 ordinary attacking
// structures moved the season seed to 3236754777. Career persistence and the
// merged main career work move it again; compare UI-read/no-read in both AI modes.
// Main's career-only pin: 3782523015; the combined pin before #722 was 119391389.
// The timed back-door runs (#722, engine revision 7) moved the measured pin to
// 1950957202. The lead read (engine revision 8) moves this season back to
// 3782523015. Directional punts (revision 19) change windy matches, so the
// season draws a different number of dice and the stream moves again. With
// weather.windPuntOn at 0 the revision-18 pin still holds. The corner dive
// (revision 21) moves the season again; with cornerCover.on at 0 the revision-20
// pin still holds, and the wind-off pin under that is unchanged. The open-play
// dummy (revision 22) repartitions the existing carry roll. This seed-1 career
// finishes on the same stream with it on. The corner-off season does not, so
// that pin and the wind pin under it are taken with live.dummyChance at 0.
// Both AI modes still compare UI-read and no-read runs, and AI=0 pins this stream.
const MAIN_SEED_AFTER_SEASON = 3782523015;
const BEFORE_CORNER_COVER = 1950957202;
const BEFORE_PUNT_WIND = 3782523015;

describe('the rng stream (#369)', () => {
  it.each([0, 1])('weekly potential and dot reads preserve the season stream with habit AI=%i', (ai) => {
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
      if (ai === 0) {
        expect(viewed.seed).toBe(MAIN_SEED_AFTER_SEASON);
        const dummyOff = applyTuning({ 'live.dummyChance': 0 });
        try {
          expect(season(false).seed).toBe(MAIN_SEED_AFTER_SEASON);
          const coverOff = applyTuning({ 'cornerCover.on': 0 });
          try {
            expect(season(false).seed).toBe(BEFORE_CORNER_COVER);
            const windOff = applyTuning({ 'weather.windPuntOn': 0 });
            try {
              expect(season(false).seed).toBe(BEFORE_PUNT_WIND);
            } finally { windOff(); }
          } finally { coverOff(); }
        } finally { dummyOff(); }
      }
    } finally { restore(); }
  });
});
