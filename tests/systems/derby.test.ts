import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, setState, type RivalClub } from '../../src/core/state';
import { bus, type Events } from '../../src/core/events';
import { advanceWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER } from '../../src/core/time';
import { derbyRival, isDerbyFixture, registerDerbySystem } from '../../src/systems/derby';
import { initLeague } from '../../src/systems/fixtures';
import towns from '../../src/data/towns.json';
import { RIVAL_CLUBS } from '../../src/data/league';

const club = (id: string, lat: number, lon: number): RivalClub => ({
  id, name: id, strength: 50, colors: ['#123456', '#ffffff'], home: { town: id, lat, lon },
});
beforeEach(() => {
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  createNewGame('Test FC', 7, { home: { town: 'Cairns', lat: -16.9203, lon: 145.771 } });
  initLeague(getState());
});

describe('derbyRival', () => {
  it('finds the nearest actual club without changing the state or RNG', () => {
    const s = getState(), before = JSON.stringify(s);
    expect(derbyRival(s)).toBe('rival-cyclones');
    expect(JSON.stringify(s)).toBe(before);
  });
  it('uses great-circle distance across the date line, rather than coordinate distance', () => {
    const s = getState();
    expect(derbyRival({ ...s, home: { town: 'Test', lat: 0, lon: 179 },
      league: { ...s.league, clubs: [club('across', 0, -179), club('near', 0, 170)] } })).toBe('across');
  });
  it('breaks equal-distance ties by lower id regardless of array order, excluding the player', () => {
    const s = getState();
    for (const clubs of [[club('z', 0, 1), club('a', 0, -1)], [club('a', 0, -1), club('z', 0, 1)]]) {
      expect(derbyRival({ ...s, home: { town: 'Test', lat: 0, lon: 0 },
        league: { ...s.league, clubs: [club(s.clubId, 0, 0), ...clubs] } })).toBe('a');
    }
  });
  it('returns null for old saves, free text, partial/invalid coordinates or no located rivals', () => {
    const s = getState();
    const { home: _home, ...oldSave } = s;
    expect(derbyRival(oldSave)).toBeNull();
    for (const home of [{ town: 'Free text' }, { town: 'Partial', lat: 0 },
      { town: 'Invalid', lat: NaN, lon: 0 }, { town: 'Invalid', lat: 91, lon: 0 }]) {
      expect(derbyRival({ ...s, home })).toBeNull();
    }
    expect(derbyRival({ ...s, league: { ...s.league, clubs: s.league.clubs.map(({ home: _home, ...c }) => c) } })).toBeNull();
  });
  it('gives every listed town a rival and all 15 rivals a valid home', () => {
    const s = getState();
    expect(RIVAL_CLUBS).toHaveLength(15);
    for (const c of RIVAL_CLUBS) {
      expect(c.home?.town).toBeTruthy();
      expect(derbyRival({ ...s, home: { town: c.home!.town, lat: c.home!.lat, lon: c.home!.lon } })).toBe(c.id);
    }
    for (const t of towns) expect(derbyRival({ ...s, home: { town: t.name, lat: t.lat, lon: t.lon } })).not.toBeNull();
  });
});

describe('derby News hook', () => {
  it.each([['player', 'rival-cyclones'], ['rival-cyclones', 'player']])('previews and reports home/away, including repeats and finals (%s)', (homeId, awayId) => {
    const s = getState();
    const fixtures = [2, 7, 25].map((round) => ({ round, homeId, awayId }));
    setState({ league: { ...s.league, fixtures } });
    const news: Events['ui:notify'][] = [];
    bus.on('ui:notify', (n) => news.push(n));
    registerDerbySystem();
    // Stand in for both watched and skipped match completion before the derby hook.
    registerTickHook('test-results', TICK_ORDER.match, ({ week }) => {
      const state = getState();
      setState({ league: { ...state.league, fixtures: state.league.fixtures.map(f => f.round === week
        ? { ...f, result: { homeScore: homeId === 'player' ? 20 : 10, awayScore: awayId === 'player' ? 20 : 10 } } : f) } });
    });
    for (let week = 1; week <= 25; week++) advanceWeek();
    expect(news.filter(n => n.from === 'coach')).toHaveLength(3);
    expect(news.filter(n => n.text === 'Derby win over Cairns Cyclones, 20–10.')).toHaveLength(3);
  });
  it.each([[4, 12, 'Derby loss to'], [8, 8, 'Derby draw with']])('reports other outcomes (%s–%s)', (homeScore, awayScore, text) => {
    const s = getState();
    setState({ league: { ...s.league, fixtures: [{ round: 1, homeId: 'player', awayId: 'rival-cyclones', result: { homeScore, awayScore } }] } });
    const news: string[] = [];
    bus.on('ui:notify', n => news.push(n.text));
    registerDerbySystem(); advanceWeek();
    expect(news).toEqual([`${text} Cairns Cyclones, ${homeScore}–${awayScore}.`]);
  });
  it('previews week one on registration and stays silent without coordinates', () => {
    const s = getState();
    const fixture = { round: 1, homeId: 'player', awayId: 'rival-cyclones' };
    setState({ league: { ...s.league, fixtures: [fixture] } });
    expect(isDerbyFixture(getState(), fixture)).toBe(true);
    expect(isDerbyFixture(getState(), { ...fixture, homeId: 'rival-wolves' })).toBe(false);
    const news: string[] = [];
    bus.on('ui:notify', n => news.push(n.text));
    registerDerbySystem(); expect(news).toHaveLength(1);
    setState({ home: { town: 'Free text' } }); news.length = 0;
    registerDerbySystem(); advanceWeek(); expect(news).toEqual([]);
  });
});
