import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNewGame, SAVE_VERSION, getState, setState, loadState, resetForNewSeason,
  type GameState,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { LEAGUE, ON_FIELD, STARTING_MONEY } from '../../src/config';
import { POSITIONS, overallRating } from '../../src/data/player';
import { initLeague } from '../../src/systems/fixtures';
import { bestNineMean, gapSample } from '../../src/qa/soak';

beforeEach(() => {
  bus.clear();
});

describe('createNewGame', () => {
  it('yields the spec starting state', () => {
    const s = createNewGame('Cavehole Crushers', 42);
    expect(s.clubName).toBe('Cavehole Crushers');
    expect(s.squad).toHaveLength(20);
    expect(s.freeAgents).toHaveLength(12);
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.reputation).toBe(30);
    expect(s.week).toBe(1);
    expect(s.season).toBe(1);
    expect(s.facilities).toEqual([]);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.clubId).toBe('player');
    expect(s.league).toEqual({ clubs: [], fixtures: [], ladder: [] });
    expect(s.settings).toEqual({ muted: false, volume: 0.8, tutorialDone: false, difficulty: 'normal' });
    expect(s.history).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    const a = createNewGame('A', 7);
    const b = createNewGame('B', 7);
    expect(a.squad).toEqual(b.squad);
    expect(a.freeAgents).toEqual(b.freeAgents);
    expect(a.rngSeed).toBe(b.rngSeed);
  });

  it('starts with one star, a first-grader and a depth player per position (#140)', () => {
    const s = createNewGame('Q', 12345);
    expect(new Set(s.squad.map((p) => p.id)).size).toBe(20);
    for (const pos of POSITIONS) expect(s.squad.filter((p) => p.position === pos).length).toBeGreaterThanOrEqual(2);
    const overalls = s.squad.map(overallRating).sort((a, b) => b - a);
    // The hero: a star well clear of everyone else.
    expect(overalls[0]).toBeGreaterThanOrEqual(68);
    expect(overalls.filter((o) => o >= 68)).toHaveLength(LEAGUE.START_STARS);
    // The rest sit around the first-grade and depth targets.
    const firstGrade = overalls.slice(1, POSITIONS.length + 1);
    const depth = overalls.slice(POSITIONS.length + 1);
    expect(Math.abs(firstGrade.reduce((t, o) => t + o, 0) / firstGrade.length - LEAGUE.START_FIRST_GRADE)).toBeLessThan(4);
    expect(Math.abs(depth.reduce((t, o) => t + o, 0) / depth.length - (LEAGUE.START_FIRST_GRADE - LEAGUE.START_DEPTH_GAP))).toBeLessThan(4);
  });

  it('the best nine starts level with the rival mean (within a point or so), averaged over seeds (#140, #148)', () => {
    let gap = 0;
    const n = 30;
    for (let seed = 1; seed <= n; seed++) {
      const s = createNewGame('G', seed);
      initLeague(s);
      const g = gapSample(getState());
      expect(g.bestNine).toBe(bestNineMean(s.squad, ON_FIELD));
      gap += g.bestNine - g.rivalMean;
    }
    expect(gap / n).toBeGreaterThan(-1.5);
    expect(gap / n).toBeLessThan(2);
    setState({});
  });

  it('round-trips via JSON with no data loss', () => {
    const s = createNewGame('RT', 99);
    const rt: GameState = JSON.parse(JSON.stringify(s));
    expect(rt).toEqual(s);
  });

  it('loads the created state so getState returns it', () => {
    const s = createNewGame('Live', 1);
    expect(getState()).toEqual(s);
  });
});

describe('getState guard', () => {
  it('throws when the module store is uninitialised', async () => {
    // vi.resetModules gives a fresh module instance whose store is null.
    const { vi } = await import('vitest');
    vi.resetModules();
    const fresh = await import('../../src/core/state');
    expect(() => fresh.getState()).toThrow(/before initialisation/);
    vi.resetModules();
  });
});

describe('setState', () => {
  it('shallow-merges and emits state:changed', () => {
    createNewGame('SS', 3);
    let emitted: GameState | null = null;
    bus.on('state:changed', (s) => { emitted = s; });
    setState({ money: 12345 });
    expect(getState().money).toBe(12345);
    expect(emitted).not.toBeNull();
    expect(emitted!.money).toBe(12345);
  });

  it('replaces nested objects wholesale (no deep merge)', () => {
    createNewGame('SS2', 3);
    setState({ settings: { muted: true, volume: 0.5, tutorialDone: true, difficulty: 'normal' } });
    expect(getState().settings).toEqual({ muted: true, volume: 0.5, tutorialDone: true, difficulty: 'normal' });
  });
});

describe('loadState', () => {
  it('replaces the whole state and emits', () => {
    const s = createNewGame('L', 3);
    let fired = false;
    bus.on('state:changed', () => { fired = true; });
    const copy: GameState = { ...s, money: 999 };
    loadState(copy);
    expect(getState().money).toBe(999);
    expect(fired).toBe(true);
  });
});

describe('resetForNewSeason', () => {
  it('increments season, resets week to 1', () => {
    createNewGame('R', 3);
    setState({ week: 20, season: 2 });
    resetForNewSeason();
    expect(getState().season).toBe(3);
    expect(getState().week).toBe(1);
  });
});
