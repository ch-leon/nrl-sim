// tests/systems/finalsGoldenPoint.test.ts — matchday's side of golden point (N9.4;
// checker note on #221): the player's final is played with golden point, a regular
// round without it, and a final won in golden point says so in the result toast.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus, type LiveMatchData } from '../../src/core/events';
import { createNewGame, getState, setState, type Fixture } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearTickHooks, clearSeasonHooks, resumeWeek } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { SEASON_ROUNDS } from '../../src/config';
import type { MatchResult } from '../../src/sim/events';

function newGame(): void {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Finalists', 5);
  initLeague(getState());
  registerPlayerMatchSystem();
}

/** Kick off the player's match this week; what matchday hands the Match scene. */
function kickOff(): { fixture: Fixture; live: LiveMatchData } {
  let got: { fixture: Fixture; live: LiveMatchData } | null = null;
  const off = bus.on('match:started', (e) => void (got = { fixture: e.fixture, live: e.live! }));
  advanceWeek();
  off();
  expect(got).not.toBeNull();
  return got!;
}

describe('golden point at matchday (N9.4)', () => {
  beforeEach(() => newGame());

  it('a regular round is played without golden point', () => {
    const { live } = kickOff();
    expect(live.goldenPoint).toBeUndefined();
    resumeWeek();
  });

  it('the player’s final is played with golden point, and a win in it says so', () => {
    const s = getState();
    const rival = s.league.clubs.find((c) => c.id !== PLAYER_ID)!.id;
    const final: Fixture = { round: SEASON_ROUNDS + 1, homeId: PLAYER_ID, awayId: rival };
    setState({ week: SEASON_ROUNDS + 1, league: { ...s.league, fixtures: [...s.league.fixtures, final] } });
    const { fixture, live } = kickOff();
    expect(fixture.round).toBe(SEASON_ROUNDS + 1);
    expect(live.goldenPoint).toBe(true);
    // Full time: won in golden point.
    const toasts: string[] = [];
    bus.on('ui:notify', (n) => void toasts.push(n.text));
    const result: MatchResult = {
      homeScore: 17,
      awayScore: 16,
      events: [{ t: 19, kind: 'field-goal', teamId: PLAYER_ID, detail: 'good' }, { t: 19, kind: 'full-time', teamId: PLAYER_ID, detail: 'golden-point' }],
      stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
      weather: 'clear',
      momentumTimeline: [],
      injuries: [],
    };
    bus.emit('match:finished', { fixture, result });
    expect(toasts.some((t) => /WIN 17–16 in golden point/.test(t))).toBe(true);
  });
});
