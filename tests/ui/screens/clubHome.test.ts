vi.mock('../../../src/art/coachFace', () => ({ coachFaceDataUrl: () => 'data:image/png;base64,face' }));
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clubHomeView, nextMatchLine, openClubHome } from '../../../src/ui/screens/clubHome';
import { createNewGame, getState, setState, type GameState, type Objective } from '../../../src/core/state';
import { initLeague } from '../../../src/systems/fixtures';
import { ordinal, placeName } from '../../../src/ui/hud';
import { financeSummary } from '../../../src/ui/screens/finance';
import { coachDocument } from '../coachDom';
import { closeScreen } from '../../../src/ui/dom';
import { coachSays } from '../../../src/ui/coachSays';
import type { StubNode } from '../stubDom';
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
    expect(v.money).toBe('$123k · covering costs');
    expect(v.moneyLevel).toBe('ok');
    expect(v.moneyLabel).toBe('Money $123k · covering costs. Tap for Finance');
  });

  it.each([
    [31.7, 'about 31 weeks of runway'],
    [1.2, 'about 1 week of runway'],
    [0, 'about 1 week of runway'],
    [99, 'about 99 weeks of runway'],
    [99.1, '99+ weeks of runway'],
    [150, '99+ weeks of runway'],
    [null, 'covering costs'],
  ])('always shows the runway for %s weeks (#479)', (runway, words) => {
    const v = clubHomeView({ ...getState(), money: 200_000 }, { runwayWeeks: () => runway });
    expect(v.money).toBe(`$200k · ${words}`);
    expect(v.moneyLabel).toBe(`Money $200k · ${words}. Tap for Finance`);
  });

  it('shows a new Normal game’s day-one runway from Finance (#479)', () => {
    createNewGame('Test Club', 1, { difficulty: 'normal' });
    setState({ league: initLeague(getState()) });
    const s = getState();
    const runway = financeSummary(s).runwayWeeks;
    expect(runway).not.toBeNull();
    expect(runway!).toBeGreaterThanOrEqual(2);
    expect(runway!).toBeLessThanOrEqual(99);
    const v = clubHomeView(s, { runwayWeeks: (state) => financeSummary(state).runwayWeeks });
    expect(v.money).toBe(`$200k · about ${Math.floor(runway!)} weeks of runway`);
  });

  it('shows covering costs when Finance projects no cash burn (#479)', () => {
    const s = { ...getState(), squad: [], facilities: [], reputation: 100 };
    expect(financeSummary(s).runwayWeeks).toBeNull();
    expect(clubHomeView(s, { runwayWeeks: (state) => financeSummary(state).runwayWeeks }).money)
      .toBe('$200k · covering costs');
  });

  it.each([
    [20, 'ok'], [19.9, 'low'], [8, 'low'], [7.9, 'short'], [null, 'ok'],
  ])('keeps the colour threshold for %s weeks (#479)', (runway, level) => {
    expect(clubHomeView(getState(), { runwayWeeks: () => runway }).moneyLevel).toBe(level);
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


describe('Coach says row (#477)', () => {
  afterEach(() => { closeScreen(); vi.unstubAllGlobals(); });
  it('includes the pure suggestion, renders it first and opens its destination; refreshes and reopens', () => {
    createNewGame('Test Club', 1);
    coachDocument();
    const onCoach = vi.fn();
    const deps = { onCoach, onMoney: vi.fn(), onNextMatch: vi.fn(), onDecisions: vi.fn(), onBoard: vi.fn(), onGrounds: vi.fn() };
    const v = clubHomeView(getState());
    expect(v.coach).toEqual(coachSays(getState(), { decisions: 0, runwayWeeks: null }));
    const screen = openClubHome(deps) as unknown as StubNode;
    const row = () => screen.all().find((n) => n.className.includes('nrl-club-home-coach'))!;
    expect(row().parentNode!.children[1]).toBe(row()); // first row after club identity
    expect(row().textContent).toContain(`Coach saysMick Dorney${v.coach.text}`);
    row().click();
    expect(onCoach).toHaveBeenCalledWith(v.coach.screen);
    const squad = getState().squad.map((p) => ({ ...p, injuredWeeks: 2 }));
    setState({ squad, week: 2 });
    expect(row().textContent).toContain("can't play. Fix the lineup.");
    row().click();
    expect(onCoach).toHaveBeenLastCalledWith('lineup');
    closeScreen();
    const reopened = openClubHome(deps) as unknown as StubNode;
    expect(reopened.textContent).toContain("can't play. Fix the lineup.");
  });
});
