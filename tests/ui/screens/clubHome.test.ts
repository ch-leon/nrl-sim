import { describe, it, expect, beforeEach } from 'vitest';
import { clubHomeView, nextMatchLine } from '../../../src/ui/screens/clubHome';
import { createNewGame, getState, setState, type GameState, type Objective } from '../../../src/core/state';
import { initLeague } from '../../../src/systems/fixtures';
import { ordinal, placeName } from '../../../src/ui/hud';
import { ECON, WEEKS_PER_SEASON } from '../../../src/config';

// #350 P1: the Club home sheet, CLUB on a phone held upright.
describe('the Club home sheet (#350)', () => {
  beforeEach(() => {
    createNewGame('Test Club', 1);
    setState({ league: initLeague(getState()) });
  });

  const next = (s: GameState) => {
    const f = s.league.fixtures.filter((x) => x.homeId === 'player' || x.awayId === 'player').sort((a, b) => a.round - b.round)[0]!;
    const home = f.homeId === 'player';
    return { home, opp: s.league.clubs.find((c) => c.id === (home ? f.awayId : f.homeId))! };
  };

  it('the next match: "Next: v Darwin (A)", the ladder place once a round is in', () => {
    const s = getState();
    const { home, opp } = next(s);
    expect(nextMatchLine(s)).toEqual({
      text: `Next: v ${placeName(opp.name)} (${home ? 'H' : 'A'})`,
      label: `Next match: ${opp.name}, ${home ? 'home' : 'away'}`,
    });
    const ladder = s.league.ladder.map((r) => (r.clubId === 'player' ? { ...r, played: 1 } : r));
    const place = ordinal(ladder.findIndex((r) => r.clubId === 'player') + 1);
    const line = nextMatchLine({ ...s, league: { ...s.league, ladder } })!;
    expect(line.text).toBe(`Next: v ${placeName(opp.name)} (${home ? 'H' : 'A'}) · ${place}`);
    expect(line.label).toContain(`You are ${place} on the ladder`);
  });

  it('no next match with the season done', () => {
    const s = getState();
    expect(nextMatchLine({ ...s, league: { ...s.league, fixtures: [] } })).toBeNull();
    expect(clubHomeView({ ...s, league: { ...s.league, fixtures: [] } }).next).toBeNull();
  });

  it('the club, the week and season, the money', () => {
    const v = clubHomeView({ ...getState(), week: 3, season: 2, money: 123_456 });
    expect(v.club).toBe('Test Club');
    expect(v.week).toBe(`Week 3 of ${WEEKS_PER_SEASON} · Season 2`);
    expect(v.money).toBe('$123,456');
    expect(v.moneyLevel).toBe('ok');
    expect(v.moneyLabel).toBe('Money $123,456. Tap for Finance');
  });

  it('the money worries as the dock’s does: the runway, then debt', () => {
    const s = getState();
    expect(clubHomeView(s, { runwayWeeks: () => 12 }).moneyLevel).toBe('low');
    expect(clubHomeView(s, { runwayWeeks: () => 3 }).moneyLevel).toBe('short');
    const broke = clubHomeView({ ...s, money: ECON.BANKRUPTCY_WARN - 1 }, { runwayWeeks: () => 3 });
    expect(broke.moneyLevel).toBe('debt');
    expect(broke.moneyLabel).toContain('in debt');
  });

  it('the decisions waiting: the count and the first due; none, no row', () => {
    const s = getState();
    expect(clubHomeView(s, { decisions: () => [] }).decisions).toBeNull();
    const v = clubHomeView(s, { decisions: () => [{ title: 'Bali trip', note: 'due now' }, { title: 'Sponsor', note: '3 wks left' }] });
    expect(v.decisions).toEqual({ count: '2 DECISIONS', top: 'Bali trip · due now' });
    expect(clubHomeView(s, { decisions: () => [{ title: 'Bali trip', note: '' }] }).decisions).toEqual({ count: '1 DECISION', top: 'Bali trip' });
  });

  it('the board objective most at risk, as the landscape hub shows it (#368)', () => {
    const s = getState();
    const solvent: Objective = { id: 's', kind: 'solvent', text: 'Finish the season with at least $20,000', target: 20_000, status: 'pending' };
    const v = clubHomeView({ ...s, money: 12_000, objectives: [solvent] }, { runwayWeeks: () => 3 });
    expect(v.board).toMatchObject({ title: 'Board: $20k', detail: 'You have $12k', risk: 'off-track' });
    expect(clubHomeView({ ...s, objectives: [] }).board).toBeNull();
  });
});
