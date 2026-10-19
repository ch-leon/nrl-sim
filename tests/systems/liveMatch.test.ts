// tests/systems/liveMatch.test.ts — live matches behind a setting (BAK-207
// §5.1 2g): with "Live match (beta)" on, matchday plays the match on the live
// sim (runMatch) for the result and hands the Match scene the seed; the scene's
// replay of that seed (a Runner on the same LiveSim, as LivePlayback builds it)
// reports exactly the recorded events, so the overlay lands on the result; and
// a whole season plays end to end with the setting on.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState, type Fixture } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { runMatch } from '../../src/match/league/match';
import { Runner } from '../../src/match/core/engine';
import { LiveSim } from '../../src/match/league/live';
import { toMatchEvent } from '../../src/match/league/events';
import { NINES } from '../../src/match/league/rules';
import { initLiveState, reduceEvent } from '../../src/ui/screens/matchOverlay';
import { SEASON_ROUNDS } from '../../src/config';
import type { MatchEvent, MatchResult, TeamSheet } from '../../src/sim/events';

interface Started {
  fixture: Fixture;
  sim: MatchResult;
  home: TeamSheet;
  away: TeamSheet;
  live?: { seed: number; injuryRate?: number };
}

function newGame(seed: number, live: boolean): void {
  clearTickHooks();
  clearSeasonHooks();
  createNewGame('Tester', seed);
  initLeague(getState());
  registerPlayerMatchSystem();
  setState({ settings: { ...getState().settings, liveMatch: live } });
}

/** What the Match scene's LivePlayback reports: the same sim on the same seed, stepped by a Runner. */
function watched(s: Started): MatchEvent[] {
  const opts = { weather: s.sim.weather, ...(s.live!.injuryRate !== undefined ? { injuryRate: s.live!.injuryRate } : {}) };
  const r = new Runner((seed) => new LiveSim(s.home, s.away, seed, opts), s.live!.seed);
  const ids = { home: s.home.clubId, away: s.away.clubId };
  const out: MatchEvent[] = [];
  r.onEvents = (events) => {
    for (const e of events) {
      const ev = toMatchEvent(e, r.cur, ids);
      if (ev) out.push(ev);
    }
  };
  while (!r.finished) r.step();
  return out;
}

describe('live match (beta)', () => {
  let started: Started[] = [];
  let off: () => void = () => {};
  beforeEach(() => {
    off();
    started = [];
    off = bus.on('match:started', (e) => started.push(e));
  });

  it('off (the default): the classic engine, no seed handed over', () => {
    newGame(42, false);
    expect(getState().settings.liveMatch).toBe(false);
    advanceWeek();
    expect(started).toHaveLength(1);
    expect(started[0]!.live).toBeUndefined();
  });

  it('on: the result is the live sim’s, and the watched match reports exactly the recorded events', () => {
    newGame(42, true);
    advanceWeek();
    expect(started).toHaveLength(1);
    const s = started[0]!;
    expect(s.live?.seed).toBeGreaterThan(0);
    // The result is runMatch's on that seed (Nines points; the live sim's event log ends at 18 minutes).
    const again = runMatch(s.home, s.away, { seed: s.live!.seed, weather: s.sim.weather, ...(s.live!.injuryRate !== undefined ? { injuryRate: s.live!.injuryRate } : {}) });
    expect(again).toEqual(s.sim);
    expect(s.sim.events[s.sim.events.length - 1]!.t).toBe(2 * NINES.halfMinutes);
    // What the scene plays is what was recorded, so the overlay finishes on the result.
    const evs = watched(s);
    expect(evs).toEqual(s.sim.events);
    let st = initLiveState();
    for (const ev of evs) st = reduceEvent(st, ev, s.home.clubId, NINES.halfMinutes);
    expect([st.homeScore, st.awayScore]).toEqual([s.sim.homeScore, s.sim.awayScore]);
    expect(st.half).toBe(2);
    // The ladder took the live result.
    const f = getState().league.fixtures.find((x) => x.round === s.fixture.round && x.homeId === s.fixture.homeId)!;
    expect(f.result).toEqual({ homeScore: s.sim.homeScore, awayScore: s.sim.awayScore });
  }, 30_000);

  it('a whole season plays end to end with the setting on', () => {
    newGame(7, true);
    const season = getState().season;
    // Fast-forward: every round of the regular season and the finals, headless on the live sim.
    for (let i = 0; i < SEASON_ROUNDS + 8 && getState().season === season; i++) advanceWeeks(1);
    const mine = getState().league.fixtures.filter((f) => f.round <= SEASON_ROUNDS && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID));
    expect(mine.length).toBeGreaterThan(0);
    for (const f of mine) expect(f.result).toBeDefined();
    const row = getState().league.ladder.find((r) => r.clubId === PLAYER_ID);
    if (row) expect(row.played).toBeGreaterThan(0);
  }, 180_000);
});
