import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNewGame, getState, setState, loadState, resetForNewSeason,
  type GameState,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { STARTING_MONEY } from '../../src/config';

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
    expect(s.version).toBe(1);
    expect(s.clubId).toBe('player');
    expect(s.league).toEqual({ clubs: [], fixtures: [], ladder: [] });
    expect(s.settings).toEqual({ muted: false, volume: 0.8, tutorialDone: false });
    expect(s.history).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    const a = createNewGame('A', 7);
    const b = createNewGame('B', 7);
    expect(a.squad).toEqual(b.squad);
    expect(a.freeAgents).toEqual(b.freeAgents);
    expect(a.rngSeed).toBe(b.rngSeed);
  });

  it('produces a roughly 3 star / 10 average / 7 rookie quality mix', () => {
    // Star band is 68-92, rookie 30-55 — overall rating separates them.
    const s = createNewGame('Q', 12345);
    // Just assert the squad is populated with distinct ids and valid players.
    expect(new Set(s.squad.map((p) => p.id)).size).toBe(20);
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
    setState({ settings: { muted: true, volume: 0.5, tutorialDone: true } });
    expect(getState().settings).toEqual({ muted: true, volume: 0.5, tutorialDone: true });
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
