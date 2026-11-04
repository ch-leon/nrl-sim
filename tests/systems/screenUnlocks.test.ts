import { registerScreenUnlockSystem as registerUnlockSystem } from '../../src/systems/screenUnlocks';
import { SCREEN_UNLOCK_LADDER as UNLOCK_LADDER } from '../../src/systems/screenUnlocks';
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createNewGame, getState, loadState, setState } from '../../src/core/state';
import { advanceWeek, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { bus, type Events } from '../../src/core/events';
import { migrateState } from '../../src/core/save';
import { isScreenOpen, screensDue, screenLockReason } from '../../src/systems/unlocks';
import { initNewsInbox, NewsInbox } from '../../src/ui/inbox';

describe('season-one Office schedule (#482)', () => {
  beforeEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); });

  it.each(['easy', 'normal', 'hard'] as const)('walks %s: Finance after a played home game, Staff entering 4, Contracts entering 12; one guide line each', (difficulty) => {
    createNewGame('Office Test', 42, { difficulty });
    setState({ league: { clubs: [], ladder: [], fixtures: [
      { round: 1, homeId: 'away', awayId: 'player', result: { homeScore: 0, awayScore: 0 } },
      { round: 2, homeId: 'player', awayId: 'away' },
    ] } });
    const notes: Events['ui:notify'][] = [];
    const inbox = new NewsInbox();
    initNewsInbox(inbox);
    bus.on('ui:notify', (n) => notes.push(n));
    registerUnlockSystem();
    registerUnlockSystem(); // idempotent registration
    const open = () => UNLOCK_LADDER.filter((r) => isScreenOpen(getState(), r.id)).map((r) => r.id);
    expect(open()).toEqual([]);
    expect(screenLockReason(getState(), 'finance')).toBe('Opens after your first home game');
    advanceWeek();
    expect(open()).toEqual([]); // an away result, and an unplayed home fixture, do not count
    const state = getState();
    setState({ league: { ...state.league, fixtures: state.league.fixtures.map((f) => f.round === 2 ? { ...f, result: { homeScore: 0, awayScore: 8 } } : f) } });
    for (let week = 2; week <= 13; week++) {
      advanceWeek();
      expect(open()).toEqual(getState().week < 4 ? ['finance'] : getState().week < 12 ? ['finance', 'staff'] : ['finance', 'staff', 'contracts']);
    }
    expect(notes.map((n) => n.from)).toEqual(['coach', 'coach', 'coach']);
    expect(inbox.items().length).toBe(3);
    expect(getState().unlocks?.screens).toBeUndefined();
  });

  it('is pure and deterministic, handles later seasons and preserves a concurrent facility ladder', () => {
    const s = createNewGame('Office', 2);
    const snapshot = JSON.stringify(s);
    expect(screensDue(s)).toEqual([]);
    expect(screensDue(s)).toEqual([]);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(screensDue({ ...s, week: 4 })).toEqual(['staff']);
    expect(screensDue({ ...s, week: 12 })).toEqual(['staff', 'contracts']);
    setState({ season: 2, unlocks: { facilities: ['trainingPaddock'], screens: [] } });
    registerUnlockSystem(); advanceWeek();
    expect(getState().unlocks?.facilities).toEqual(['trainingPaddock']);
    expect(getState().unlocks?.screens).toBeUndefined();
    expect(UNLOCK_LADDER.every((r) => isScreenOpen(getState(), r.id))).toBe(true);
  });

  it('old saves, missing screens and skipped careers are open', () => {
    const skipped = createNewGame('Veteran', 3, { openAll: true });
    expect(skipped.unlocks).toBeUndefined();
    for (const row of UNLOCK_LADDER) expect(isScreenOpen(skipped, row.id)).toBe(true);
    loadState({ ...skipped, unlocks: { facilities: [] } });
    expect(isScreenOpen(getState(), 'finance')).toBe(true);
    expect(isScreenOpen(getState(), 'news')).toBe(true);
    for (const file of readdirSync('tests/fixtures/saves').filter((f) => f.endsWith('.json'))) {
      const result = migrateState(JSON.parse(readFileSync(`tests/fixtures/saves/${file}`, 'utf8')));
      expect(result.ok, file).toBe(true);
      if (result.ok) for (const row of UNLOCK_LADDER) expect(isScreenOpen(result.state, row.id), file).toBe(true);
    }
  });
});


it('keeps completed facilities through round 12, then clears the shared state only when both halves are open', async () => {
  const { registerUnlockSystem: registerBoth, isFacilityOpen } = await import('../../src/systems/unlocks');
  const { FACILITY_CATALOG } = await import('../../src/data/facility');
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  createNewGame('Both ladders', 42);
  setState({ week: 7, reputation: 40, league: { clubs: [], ladder: [], fixtures: [{ round: 1, homeId: 'player', awayId: 'away', result: { homeScore: 0, awayScore: 8 } }] } });
  registerBoth(); advanceWeek();
  expect(Object.keys(FACILITY_CATALOG).every((id) => isFacilityOpen(getState(), id as keyof typeof FACILITY_CATALOG))).toBe(true);
  expect(isScreenOpen(getState(), 'contracts')).toBe(false);
  expect(getState().unlocks).toBeDefined();
  for (let i = 0; i < 4; i++) advanceWeek();
  expect(isScreenOpen(getState(), 'contracts')).toBe(true);
  expect(getState().unlocks).toBeUndefined();
});

it.each(['easy', 'normal', 'hard'] as const)('walks both ladders together on %s and opens everything for veterans', async (difficulty) => {
  const { registerUnlockSystem: registerBoth, isFacilityOpen } = await import('../../src/systems/unlocks');
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  createNewGame('Combined season', 42, { difficulty });
  setState({ league: { clubs: [], ladder: [], fixtures: [{ round: 2, homeId: 'player', awayId: 'away' }] } });
  registerBoth();
  expect(isFacilityOpen(getState(), 'trainingPaddock')).toBe(true);
  expect(isFacilityOpen(getState(), 'videoRoom')).toBe(false);
  expect(isScreenOpen(getState(), 'finance')).toBe(false);
  for (let round = 1; round < 24; round++) {
    if (round === 2) setState({ league: { ...getState().league, fixtures: [{ round: 2, homeId: 'player', awayId: 'away', result: { homeScore: 0, awayScore: 8 } }] } });
    advanceWeek();
    const state = getState();
    expect(isFacilityOpen(state, 'videoRoom')).toBe(state.week >= 2);
    expect(isFacilityOpen(state, 'coachsOffice')).toBe(state.week >= 3);
    expect(isFacilityOpen(state, 'scoutOffice')).toBe(state.week >= 5);
    expect(isFacilityOpen(state, 'teamGym')).toBe(state.week >= 8);
    expect(isFacilityOpen(state, 'grandstand')).toBe(state.week >= 24);
    expect(isScreenOpen(state, 'finance')).toBe(state.week >= 3);
    expect(isScreenOpen(state, 'staff')).toBe(state.week >= 4);
    expect(isScreenOpen(state, 'contracts')).toBe(state.week >= 12);
    expect(state.unlocks === undefined).toBe(state.week >= 24);
  }
  createNewGame('Veteran', 42, { difficulty, openAll: true });
  expect(getState().unlocks).toBeUndefined();
  expect(isFacilityOpen(getState(), 'grandstand')).toBe(true);
  for (const id of ['finance', 'staff', 'contracts']) expect(isScreenOpen(getState(), id)).toBe(true);
});

it('clears an already complete shared state without repeating announcements', async () => {
  const { registerUnlockSystem: registerBoth } = await import('../../src/systems/unlocks');
  const { FACILITY_CATALOG } = await import('../../src/data/facility');
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  createNewGame('Complete', 42);
  setState({ unlocks: { facilities: Object.keys(FACILITY_CATALOG) as (keyof typeof FACILITY_CATALOG)[], screens: ['finance', 'staff', 'contracts'] } });
  const notes: string[] = [];
  bus.on('ui:notify', ({ text }) => notes.push(text));
  registerBoth(); advanceWeek();
  expect(getState().unlocks).toBeUndefined();
  expect(notes).toEqual([]);
});
