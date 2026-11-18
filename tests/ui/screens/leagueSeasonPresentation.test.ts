import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, setState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { competitions, progress } from '../../data/leagueCareerFixtures';
import { nextMatchPreview, seasonClubResults } from '../../../src/systems/league';
import { ladderStanding, objectiveLine } from '../../../src/systems/board';
import { seasonWeekLabel } from '../../../src/core/season';
import { nextMatchChip, playWeekSub, createHud, advanceFromClub } from '../../../src/ui/hud';
import { forecastFor, myFixtureRows, openFixturesScreen } from '../../../src/ui/screens/fixtures';
import * as time from '../../../src/core/time';
import * as matchday from '../../../src/systems/matchday';
import { closeScreen, closeModal } from '../../../src/ui/dom';
import { stubDocument, type StubNode } from '../stubDom';

function state(complete = false) {
  const s = createNewGame('League FC', 574);
  s.competitions = competitions(1, complete);
  s.competitions.leagueCareer = { ...progress(), phase: 'active' };
  s.league.clubs = s.competitions.instances.flatMap(i => i.entrantIds).map(id =>
    ({ id, name: `${id} Club`, colors: ['#000000', '#ffffff'] as [string, string], strength: 44 }));
  s.weather = 'rain';
  s.league.fixtures = [{ round: 1, homeId: 'player', awayId: 'wrong' }];
  s.league.ladder = [];
  return s;
}

beforeEach(() => { bus.clear(); stubDocument(); vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {}); });
afterEach(() => { closeScreen(); closeModal(); bus.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('League career presentation', () => {
  it('previews the saved scheduled fixture and only forecasts its actual week', () => {
    const s = state(); s.week = 2;
    const p = nextMatchPreview(s)!;
    expect(p.slot).toBe(3); expect(p.label).toBe('Week 3 · League · round 1');
    expect(p.opponent.id).not.toBe('wrong');
    expect(forecastFor(s)).toBeUndefined();
    s.week = 3; expect(forecastFor(s)).toBe(s.weather);
    expect(nextMatchChip(s)?.label).toContain('Week 3');
    s.week = 2; expect(playWeekSub(s)).toContain('Week 3');
  });

  it('reports the actual knockout winner for a tied score and preserves the decider', () => {
    const s = state(true); const final = s.competitions!.instances[0]!.fixtures[2]!;
    final.result = { homeScore: 12, awayScore: 12, winnerId: 'player', decider: 'higher-seed' };
    const results = seasonClubResults(s, 'player');
    expect(results[results.length - 1]).toMatchObject({ round: 1, result: 'W', decider: 'higher-seed', label: 'Week 5 · Finals' });
    const rows = myFixtureRows(s, {});
    expect(rows.map(r => r.rd)).toEqual(['W3', 'W4', 'W5']);
    expect(rows[rows.length - 1]?.res).toContain('higher seed');
  });

  it('reads board status and remaining regular fixtures from the saved field', () => {
    const s = state(true);
    expect(ladderStanding(s).rank).toBeGreaterThan(0);
    expect(ladderStanding(s).roundsLeft).toBe(0);
    expect(objectiveLine({ id: 'finish', kind: 'finals', target: 1, status: 'pending', text: 'Finish first' }, s)).toContain('currently');
  });

  it.each(['initial-choice', 'next-season-choice'] as const)('shows %s without a next match and routes only the live gate to choice', phase => {
    const s = state(); s.competitions!.leagueCareer!.phase = phase; setState(s);
    expect(nextMatchPreview(s)).toBeNull(); expect(nextMatchChip(s)).toBeNull();
    expect(playWeekSub(s)).toMatch(/Choose/i); expect(seasonWeekLabel(s)).toMatch(/Choose/);
    const choose = vi.fn(); const screen = openFixturesScreen({ onChooseLeague: choose }) as unknown as StubNode;
    const button = screen.querySelector('[data-choose-league]'); expect(button).not.toBeNull();
    button!.click(); expect(choose).toHaveBeenCalledTimes(1);
    s.competitions!.leagueCareer!.phase = 'active'; setState(s);
    button!.click(); expect(choose).toHaveBeenCalledTimes(1);
  });

  it('shows only its saved field, format and schedule with no midseason chooser', () => {
    const s = state(); setState(s);
    const screen = openFixturesScreen({ onChooseLeague: vi.fn() }) as unknown as StubNode;
    expect(screen.querySelector('[data-choose-league]')).toBeNull();
    expect(screen.words()).toContain('finals title to unlock Championship permanently');
    expect(screen.words()).toContain('Nines'); expect(screen.words()).toContain('2 clubs');
    expect(screen.words()).toContain('Top 2');
    expect(screen.querySelectorAll('.nrl-ladder-name')).toHaveLength(2);
    expect(screen.words()).not.toContain('wrong');
    expect(screen.words()).toContain('W3');
  });
});


describe('League choice HUD routing', () => {
  it('reopens choice from Play, blocks fast-forward, then returns to Play after acceptance', () => {
    const s = state(); s.competitions!.leagueCareer!.phase = 'initial-choice'; setState(s);
    const choose = vi.fn(), advance = vi.fn();
    const hud = createHud({ onChooseLeague: choose, onAdvanceWeek: advance, onAdvanceUntil: vi.fn() });
    const body = document.body as unknown as StubNode;
    const play = body.querySelector('[data-hud="advance"]')!;
    expect(play.words()).toContain('CHOOSE LEAGUE');
    expect(body.querySelector('.nrl-hud-menu-toggle')!.disabled).toBe(true);
    play.click(); expect(choose).toHaveBeenCalledTimes(1); expect(advance).not.toHaveBeenCalled();
    s.competitions!.leagueCareer!.phase = 'active'; setState(s);
    expect(play.words()).toContain('PLAY WEEK');
    expect(body.querySelector('[data-hud="week"]')!.textContent).toContain('/5');
    play.click(); expect(advance).toHaveBeenCalledTimes(1);
    hud.destroy();
  });

  it('gives parked matches and held weeks priority and never chooses for a sacked club', () => {
    const s = state(); s.competitions!.leagueCareer!.phase = 'next-season-choice'; setState(s);
    const choose = vi.fn(), advance = vi.fn();
    const pending = vi.spyOn(matchday, 'playerMatchPending').mockReturnValue(true);
    const resume = vi.spyOn(matchday, 'resumePlayerMatch').mockReturnValue(true);
    const held = vi.spyOn(time, 'weekHeld').mockReturnValue(true);
    advanceFromClub(advance, choose); expect(resume).toHaveBeenCalledTimes(1); expect(choose).not.toHaveBeenCalled();
    pending.mockReturnValue(false);
    advanceFromClub(advance, choose); expect(choose).not.toHaveBeenCalled();
    held.mockReturnValue(false);
    setState({ sacked: { season: 1, reason: 'Board decision' } });
    advanceFromClub(advance, choose); expect(choose).not.toHaveBeenCalled(); expect(advance).not.toHaveBeenCalled();
  });
});
