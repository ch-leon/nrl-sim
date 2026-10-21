// N14.3: the Academy calls up juniors before a round the club would forfeit.
import { describe, it, expect, afterEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER, withFastForward } from '../../src/core/time';
import { getCurrentFixture, initLeague, PLAYER_ID, registerFixturesSystem } from '../../src/systems/fixtures';
import { callUpJuniors, generateProspects, registerYouthSystem } from '../../src/systems/youth';
import { fitSquadCount } from '../../src/systems/matchday';
import { overallRating } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';
import { SQUAD_CAP, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';

afterEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

/** A new game's squad with all but `fit` of them injured. */
function squadWithFit(fit: number) {
  createNewGame('Call-up FC', 7);
  return getState().squad.map((p, i) => ({ ...p, injuredWeeks: i < fit ? 0 : 3 }));
}

describe('callUpJuniors', () => {
  it('reaches the minimum fit, never over it, at the junior wage to the season\'s end', () => {
    for (const fit of [0, 5, SQUAD_MIN - 1]) {
      const squad = squadWithFit(fit).slice(0, Math.max(fit, SQUAD_MIN));
      const called = callUpJuniors(makeRng(1), squad, 0, 3, 10);
      expect(called).toHaveLength(SQUAD_MIN - fit);
      expect(fitSquadCount([...squad, ...called])).toBe(SQUAD_MIN);
      for (const p of called) {
        expect(p.junior).toBeUndefined();
        expect(p.contractWeeks).toBe(10);
        expect(p.joinedSeason).toBe(3);
        expect(p.injuredWeeks).toBe(0);
        expect(p.wage).toBe(Math.round(overallRating(p) * 8 + 60));
      }
    }
  });

  it('calls nobody up with the minimum fit', () => {
    expect(callUpJuniors(makeRng(1), squadWithFit(SQUAD_MIN), 0, 1, 10)).toEqual([]);
  });

  it('never takes the squad past the cap', () => {
    const base = squadWithFit(0);
    const squad = [...base, ...base, ...base].slice(0, SQUAD_CAP - 2).map((p, i) => ({ ...p, id: `x${i}` }));
    expect(callUpJuniors(makeRng(1), squad, 0, 1, 10)).toHaveLength(2);
  });

  it('an Academy calls up better juniors than none (the same seeds)', () => {
    const mean = (level: number): number => {
      let sum = 0;
      let n = 0;
      for (let seed = 1; seed <= 30; seed++) {
        for (const p of callUpJuniors(makeRng(seed), squadWithFit(0).slice(0, 4), level, 1, 10)) { sum += overallRating(p); n++; }
      }
      return sum / n;
    };
    expect(mean(3)).toBeGreaterThan(mean(0) + 5);
    // No Academy: the lowest band generateProspects has.
    const lowest = Math.max(...generateProspects(makeRng(1), 0).map((p) => Math.max(...Object.values(p.stats))));
    expect(lowest).toBeLessThanOrEqual(42);
  });
});

describe('the call-up in the week', () => {
  function newGame(): void {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Call-up FC', 11);
    initLeague(getState());
    registerFixturesSystem();
    registerYouthSystem();
  }

  it('makes the side before the match, says who came up, and plays the round instead of forfeiting', () => {
    newGame();
    setState({ squad: getState().squad.map((p, i) => ({ ...p, injuredWeeks: i < 9 ? 0 : 5 })) });
    const before = getState().squad.length;
    let fitAtMatch = -1;
    registerTickHook('probe-fit', TICK_ORDER.match - 0.5, () => { fitAtMatch = fitSquadCount(getState().squad); });
    const toasts: string[] = [];
    bus.on('ui:notify', (n) => toasts.push(n.text));
    expect(getCurrentFixture(getState(), PLAYER_ID)).toBeDefined();
    withFastForward(() => advanceWeek());
    expect(fitAtMatch).toBe(SQUAD_MIN);
    expect(getState().squad.length).toBe(before + (SQUAD_MIN - 9));
    const called = getState().squad.slice(before);
    expect(called.every((p) => p.contractWeeks === WEEKS_PER_SEASON)).toBe(true); // week 1: the whole season
    expect(toasts.some((t) => t.startsWith('Academy call-up: ') && called.every((p) => t.includes(p.name)))).toBe(true);
  });

  it('a club with enough fit men draws no dice for it: the week plays as before', () => {
    const seedAtMatch = (withYouth: boolean): number => {
      bus.clear();
      clearTickHooks();
      clearSeasonHooks();
      clearHeldWeek();
      createNewGame('Call-up FC', 11);
      initLeague(getState());
      registerFixturesSystem();
      if (withYouth) registerYouthSystem();
      let seed = -1;
      registerTickHook('probe-seed', TICK_ORDER.match - 0.5, () => { seed = getState().rngSeed; });
      withFastForward(() => advanceWeek());
      return seed;
    };
    const without = seedAtMatch(false);
    expect(without).not.toBe(-1);
    expect(seedAtMatch(true)).toBe(without);
  });
});
