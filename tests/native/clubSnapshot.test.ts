// tests/native/clubSnapshot.test.ts — what the iPhone's club widgets show (docs/specs/ios.md
// §3 (b) and (c), Phase 5): the next match as the game words it, the best injured player
// counted down the way the weekly hook recovers him, banked points, and no clock anywhere.
import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState, type GameState, type PlacedFacility, type Player } from '../../src/core/state';
import { clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../src/config';
import { overallRating, starsForOverall } from '../../src/data/player';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { applyInjuries } from '../../src/systems/training';
import { clubSnapshot, CLUB_SNAPSHOT_VERSION } from '../../src/native/clubSnapshot';
import { competitions, progress } from '../data/leagueCareerFixtures';

/** A legacy career in the regular season, the league drawn. */
function career(week = 1): GameState {
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  setState(createNewGame('Test FC', 7));
  initLeague(getState());
  const s = getState();
  return { ...s, preseason: 0, week, squad: s.squad.map((p) => ({ ...p, injuredWeeks: 0, unspentPoints: 0 })) };
}

const hurt = (s: GameState, at: number, weeks: number): GameState => ({
  ...s, squad: s.squad.map((p, i) => (i === at ? { ...p, injuredWeeks: weeks } : p)),
});

const facility = (defId: PlacedFacility['defId'], level: 1 | 2 | 3 = 1): PlacedFacility => ({ id: defId, defId, level, x: 0, y: 0 });

/** Index of the squad's best players, best first. */
const ranked = (squad: readonly Player[]): number[] =>
  squad.map((p, i) => ({ i, o: overallRating(p) })).sort((a, b) => b.o - a.o).map((x) => x.i);

beforeEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); });

describe('clubSnapshot', () => {
  it('is null on a fresh install with no career', () => {
    expect(clubSnapshot(null)).toBeNull();
  });

  it('carries the club, the clock line and the next match in a normal week', () => {
    const s = career(7);
    const snap = clubSnapshot(s)!;
    expect(snap.v).toBe(CLUB_SNAPSHOT_VERSION);
    expect(snap.club.name).toBe('Test FC');
    expect(snap.club.colors).toHaveLength(2);
    for (const c of snap.club.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(snap).toMatchObject({ season: 1, week: 7, when: `Week 7 of ${WEEKS_PER_SEASON} · Season 1` });
    const f = s.league.fixtures.find((x) => x.round === 7 && (x.homeId === PLAYER_ID || x.awayId === PLAYER_ID))!;
    const oppId = f.homeId === PLAYER_ID ? f.awayId : f.homeId;
    const opp = s.league.clubs.find((c) => c.id === oppId)!;
    expect(snap.next).toEqual({
      stage: 'Round 7', stageShort: 'R7', opponent: opp.name,
      opponentShort: opp.name.split(' ').slice(0, -1).join(' ') || opp.name,
      venue: f.homeId === PLAYER_ID ? 'home' : 'away',
    });
    expect(snap.noMatch).toBeNull();
    expect(snap.injured).toBeNull();
    expect(snap.points).toBe(0);
  });

  it('names a pre-season trial and a final as the Next match card does', () => {
    const fresh = { ...career(1), preseason: 1 as const };
    fresh.league = { ...fresh.league, fixtures: [{ round: -1, homeId: PLAYER_ID, awayId: fresh.league.clubs[1]!.id }, ...fresh.league.fixtures] };
    expect(clubSnapshot(fresh)!.next).toMatchObject({ stage: 'Pre-season trial 1', stageShort: 'Trial 1', venue: 'home' });
    expect(clubSnapshot(fresh)!.when).toBe('Trial 1 of 2 · Season 1');

    const s = career(SEASON_ROUNDS + 2);
    const rival = s.league.clubs.find((c) => c.id !== PLAYER_ID)!;
    s.league = { ...s.league, fixtures: [...s.league.fixtures, { round: SEASON_ROUNDS + 2, homeId: rival.id, awayId: PLAYER_ID }] };
    expect(clubSnapshot(s)!.next).toMatchObject({ stage: 'Semi final', stageShort: 'SF', opponent: rival.name, venue: 'away' });
  });

  it('skips a bye to the next round the club plays', () => {
    const s = career(7);
    s.league = { ...s.league, fixtures: s.league.fixtures.filter((f) => !(f.round === 7 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID))) };
    expect(clubSnapshot(s)!.next).toMatchObject({ stage: 'Round 8', stageShort: 'R8' });
  });

  it('has no next match at the end of the season, and says what the game says', () => {
    const s = career(SEASON_ROUNDS + 1);
    const snap = clubSnapshot(s)!;
    expect(snap.next).toBeNull();
    expect(snap.noMatch).toBe('No more matches this season');
    expect(clubSnapshot({ ...career(5), sacked: { season: 1, reason: 'x' } })).toMatchObject({ next: null, noMatch: 'You have been sacked' });
  });

  it('uses a League career\'s stage label and calendar week', () => {
    const s = createNewGame('League FC', 574);
    s.competitions = competitions(1, false);
    s.competitions.leagueCareer = { ...progress(), phase: 'active' };
    s.league.clubs = s.competitions.instances.flatMap((i) => i.entrantIds).map((id) =>
      ({ id, name: `${id} Club`, colors: ['#123456', '#abcdef'] as [string, string], strength: 44 }));
    s.league.fixtures = [];
    s.league.ladder = [];
    s.week = 2;
    const snap = clubSnapshot(s)!;
    expect(snap.next).toMatchObject({ stage: 'Week 3 · League · round 1', stageShort: 'W3' });
    expect(snap.next!.opponent).toMatch(/ Club$/);
    expect(snap.club.colors).toEqual(['#123456', '#abcdef']);
    expect(snap.when).toMatch(/^Week 2 of \d+ · Season 1$/);

    s.competitions.leagueCareer = { ...s.competitions.leagueCareer, phase: 'next-season-choice' };
    expect(clubSnapshot(s)).toMatchObject({ next: null, noMatch: 'Choose a league before playing' });
  });

  it('shows the best injured player, his stars, and the rounds until he is fit', () => {
    const s = career(4);
    const [best, second, third] = ranked(s.squad);
    const hurtTwo = hurt(hurt(s, third!, 5), second!, 3);
    const snap = clubSnapshot(hurtTwo)!;
    const p = hurtTwo.squad[second!]!;
    expect(snap.injured).toEqual({ name: p.name, position: p.position, stars: starsForOverall(overallRating(p)), rounds: 3, others: 1 });

    const three = hurt(hurtTwo, best!, 1);
    expect(clubSnapshot(three)!.injured).toMatchObject({ name: three.squad[best!]!.name, rounds: 1, others: 2 });
  });

  it('counts rounds the way the weekly injury hook recovers them', () => {
    const base = career(4);
    const at = ranked(base.squad)[0]!;
    for (const facilities of [[], [facility('medicalBay', 2)], [facility('medicalBay', 1), facility('physioCentre')]]) {
      let s: GameState = { ...hurt(base, at, 7), facilities };
      const said = clubSnapshot(s)!.injured!.rounds;
      let advances = 0;
      while (s.squad[at]!.injuredWeeks > 0) {
        setState(s);
        s = applyInjuries(getState());
        advances++;
      }
      expect(said).toBe(advances);
    }
  });

  it('totals banked points only while the coach spends them himself', () => {
    const s = career(4);
    const banked = { ...s, squad: s.squad.map((p, i) => (i < 2 ? { ...p, unspentPoints: 2 } : p)) };
    expect(clubSnapshot(banked)!.points).toBe(0);
    const mine = { ...banked, settings: { ...banked.settings, spendPointsMyself: true } };
    expect(clubSnapshot(mine)!.points).toBe(4);
    expect(clubSnapshot({ ...mine, squad: mine.squad.map((p) => ({ ...p, unspentPoints: 0 })) })!.points).toBe(0);
  });

  it('holds no date, time or real-clock field', () => {
    const keys = (o: unknown): string[] => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => [k, ...keys(v)]) : []);
    const snap = clubSnapshot({ ...hurt(career(9), 0, 2), settings: { ...career(9).settings, spendPointsMyself: true } })!;
    expect(keys(snap).sort()).toEqual(['club', 'colors', 'injured', 'name', 'name', 'next', 'noMatch', 'opponent', 'opponentShort', 'others', 'points',
      'position', 'rounds', 'season', 'stage', 'stageShort', 'stars', 'v', 'venue', 'week', 'when'].sort());
    expect(JSON.stringify(snap)).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/);
  });
});
