// tests/systems/league.test.ts — rival strength drift + reputation from results (#37).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  strengthChanges, applySeasonReputation, ladderFinishDelta, REP_MIN, REP_MAX,
} from '../../src/systems/league';
import { RIVAL_CLUBS } from '../../src/data/league';
import { registerFixturesSystem, initLeague } from '../../src/systems/fixtures';
import { createNewGame, getState, setState, type RivalClub } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';

const clubs = (): RivalClub[] => RIVAL_CLUBS.map((c) => ({ ...c }));
const results = (o: Partial<Parameters<typeof applySeasonReputation>[1]> = {}) => ({
  ladderPosition: 8, clubCount: 16, finalsWins: 0, playedGrandFinal: false, premiership: false, ...o,
});

describe('strengthChanges', () => {
  it('reports changed clubs, biggest movers first', () => {
    const before = clubs();
    const after = before.map((c, i) => ({ ...c, strength: c.strength + (i % 3) * (i % 2 ? -2 : 3) }));
    const ch = strengthChanges(before, after);
    const diffs = ch.map((c) => Math.abs(c.to - c.from));
    expect([...diffs].sort((x, y) => y - x)).toEqual(diffs);
    expect(ch.every((c) => c.to !== c.from)).toBe(true);
    expect(ch.length).toBeGreaterThan(0);
  });
});

describe('reputation from results', () => {
  it('rises for a top finish and falls for a bottom finish', () => {
    expect(applySeasonReputation(50, results({ ladderPosition: 1 })).reputation).toBeGreaterThan(
      applySeasonReputation(50, results({ ladderPosition: 8 })).reputation,
    );
    expect(applySeasonReputation(50, results({ ladderPosition: 16 })).reputation).toBeLessThan(
      applySeasonReputation(50, results({ ladderPosition: 8 })).reputation,
    );
    expect(ladderFinishDelta(4, 16)).toBeGreaterThan(0);
    expect(ladderFinishDelta(5, 16)).toBe(0);
    expect(ladderFinishDelta(12, 16)).toBe(0);
    expect(ladderFinishDelta(13, 16)).toBeLessThan(0);
  });

  it('rewards finals wins and a grand-final appearance', () => {
    const base = applySeasonReputation(50, results({ ladderPosition: 3 })).reputation;
    expect(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2 })).reputation).toBeGreaterThan(base);
    expect(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2, playedGrandFinal: true })).reputation)
      .toBeGreaterThan(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2 })).reputation);
  });

  it('decays toward the baseline', () => {
    expect(applySeasonReputation(80, results()).reputation).toBeLessThan(80);
    expect(applySeasonReputation(5, results()).reputation).toBeGreaterThan(5);
  });

  it('stays clamped', () => {
    const top = results({ ladderPosition: 1, finalsWins: 2, playedGrandFinal: true });
    expect(applySeasonReputation(100, top).reputation).toBeLessThanOrEqual(REP_MAX);
    expect(applySeasonReputation(REP_MIN, results({ ladderPosition: 16 })).reputation).toBeGreaterThanOrEqual(REP_MIN);
    let r = 100;
    for (let i = 0; i < 200; i++) r = applySeasonReputation(r, results({ ladderPosition: 16 })).reputation;
    expect(r).toBeGreaterThanOrEqual(REP_MIN);
  });
});

describe('season rollover integration', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
  });

  it('moves rivals through their squads, adjusts reputation and notifies, deterministically', () => {
    const run = () => {
      bus.clear(); clearTickHooks(); clearSeasonHooks();
      setState(createNewGame('Test FC', 42));
      initLeague(getState());
      registerFixturesSystem();
      const toasts: string[] = [];
      bus.on('ui:notify', (n) => toasts.push(n.text));
      advanceWeeks(WEEKS_PER_SEASON);
      const s = getState();
      return { strengths: s.league.clubs.map((c) => c.strength), rep: s.reputation, toasts };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.strengths.slice(1)).not.toEqual(RIVAL_CLUBS.map((c) => c.strength));
    expect(a.toasts.some((t) => t.startsWith('Reputation'))).toBe(true);
  });
});

// ── Form and the next match (N7, #183) ──────────────────────────────────────

import {
  bestNineMean, clubResults, formGuide, matchStage, nextFixture, nextMatchPreview, FORM_LENGTH,
} from '../../src/systems/league';
import { initLeague as initLeagueForPreview, PLAYER_ID } from '../../src/systems/fixtures';
import { overallRating } from '../../src/data/player';
import { SEASON_ROUNDS } from '../../src/config';
import type { Fixture } from '../../src/core/state';

const played = (round: number, homeId: string, awayId: string, homeScore: number, awayScore: number): Fixture =>
  ({ round, homeId, awayId, result: { homeScore, awayScore } });

const fixtures: Fixture[] = [
  played(1, 'player', 'rival-a', 20, 10), // W at home
  played(2, 'rival-b', 'player', 14, 14), // D away
  played(3, 'player', 'rival-c', 6, 30), // L at home
  played(4, 'rival-a', 'player', 8, 12), // W away
  played(5, 'rival-d', 'player', 22, 4), // L away
  played(6, 'player', 'rival-b', 18, 16), // W at home
  played(3, 'rival-a', 'rival-b', 10, 12), // not the player's
  { round: 7, homeId: 'rival-a', awayId: 'player' }, // next
  { round: 8, homeId: 'player', awayId: 'rival-d' },
];

describe('clubResults / formGuide', () => {
  it('reads a club’s results from its own side, oldest first', () => {
    const r = clubResults(fixtures, 'player');
    expect(r.map((x) => x.round)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.map((x) => x.result).join('')).toBe('WDLWLW');
    expect(r[1]).toMatchObject({ opponentId: 'rival-b', home: false, pointsFor: 14, pointsAgainst: 14 });
    expect(r[3]).toMatchObject({ opponentId: 'rival-a', home: false, pointsFor: 12, pointsAgainst: 8, result: 'W' });
  });

  it('is the last five, oldest first, and shorter early in the season', () => {
    expect(FORM_LENGTH).toBe(5);
    expect(formGuide(fixtures, 'player')).toEqual(['D', 'L', 'W', 'L', 'W']);
    expect(formGuide(fixtures, 'player', 2)).toEqual(['L', 'W']);
    expect(formGuide(fixtures, 'rival-a')).toEqual(['L', 'L', 'L']);
    expect(formGuide(fixtures, 'nobody')).toEqual([]);
  });
});

describe('nextFixture / matchStage', () => {
  it('is the first unplayed fixture from the current week', () => {
    expect(nextFixture(fixtures, 7, 'player')?.round).toBe(7);
    expect(nextFixture(fixtures, 8, 'player')?.round).toBe(8);
    expect(nextFixture(fixtures, 9, 'player')).toBeUndefined();
    expect(nextFixture(fixtures, 1, 'rival-a')?.round).toBe(7);
  });

  it('names the finals rounds', () => {
    expect(matchStage(1)).toBe('Round');
    expect(matchStage(SEASON_ROUNDS)).toBe('Round');
    expect(matchStage(SEASON_ROUNDS + 1)).toBe('Quarter final');
    expect(matchStage(SEASON_ROUNDS + 2)).toBe('Semi final');
    expect(matchStage(SEASON_ROUNDS + 3)).toBe('Grand final');
  });
});

describe('nextMatchPreview', () => {
  const fresh = () => {
    bus.clear(); clearTickHooks(); clearSeasonHooks();
    setState(createNewGame('Test FC', 7));
    initLeagueForPreview(getState());
    return getState();
  };

  it('describes the opening round of a new game: no form, no meetings, a real squad to pick from', () => {
    const s = fresh();
    const p = nextMatchPreview(s);
    expect(p).not.toBeNull();
    expect(p!.round).toBe(1);
    expect(p!.stage).toBe('Round');
    expect(p!.opponent.id).not.toBe(PLAYER_ID);
    expect(p!.you.id).toBe(PLAYER_ID);
    expect(p!.opponent.form).toEqual([]);
    expect(p!.headToHead).toEqual([]);
    expect(p!.weather).toBeUndefined();
    expect(p!.bestThree).toHaveLength(3);
    const opp = s.league.clubs.find((c) => c.id === p!.opponent.id)!;
    const best = opp.squad!.filter((x) => x.injuredWeeks === 0).map(overallRating).sort((a, b) => b - a);
    expect(p!.bestThree.map((x) => x.overall)).toEqual(best.slice(0, 3));
    expect(p!.opponent.strength).toBe(opp.strength);
    expect(p!.you.strength).toBe(bestNineMean(s.squad));
    expect(p!.you.ladderPos).toBeGreaterThan(0);
  });

  it('carries form, ladder places, head-to-head and the conditions once there are results', () => {
    const s = fresh();
    const me = s.league.fixtures.filter((f) => f.homeId === PLAYER_ID || f.awayId === PLAYER_ID).sort((a, b) => a.round - b.round);
    // Play the first six rounds by hand, then meet round 1's opponent again in "round 7".
    const stamped = s.league.fixtures.map((f) => {
      const mine = me.indexOf(f);
      if (mine < 0 || mine >= 6) return f;
      const win = mine % 2 === 0; // W L W L W L for the player
      const playerHome = f.homeId === PLAYER_ID;
      const [hs, as] = playerHome === win ? [20, 10] : [10, 20];
      return { ...f, result: { homeScore: hs, awayScore: as } };
    });
    const first = me[0]!;
    const rematch: Fixture = { round: 7, homeId: first.awayId, awayId: first.homeId };
    const ladder = s.league.ladder.map((r) => ({ ...r }));
    ladder[0] = { ...ladder[0]!, clubId: first.homeId === PLAYER_ID ? first.awayId : first.homeId };
    ladder[1] = { ...ladder[1]!, clubId: PLAYER_ID };
    const state = { ...s, week: 7, league: { ...s.league, fixtures: [...stamped.filter((f) => f.round !== 7), rematch], ladder } };
    const p = nextMatchPreview(state, { weather: 'rain' })!;
    expect(p.round).toBe(7);
    expect(p.home).toBe(rematch.homeId === PLAYER_ID);
    expect(p.you.form).toEqual(['L', 'W', 'L', 'W', 'L']);
    expect(p.opponent.ladderPos).toBe(1);
    expect(p.you.ladderPos).toBe(2);
    expect(p.headToHead).toHaveLength(1);
    expect(p.headToHead[0]).toMatchObject({ round: first.round, result: 'W', opponentId: p.opponent.id });
    expect(p.weather).toBe('rain');
  });

  it('is null once the season holds no more matches for the player', () => {
    const s = fresh();
    expect(nextMatchPreview({ ...s, week: SEASON_ROUNDS + 1 })).toBeNull();
  });
});
