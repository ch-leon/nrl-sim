import { afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { activePack, preparePack, selectPack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, setActiveSlot } from '../../src/core/save';
import { getState, createNewGame, setState, type GameState } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER } from '../../src/core/time';
import { finaliseCalendarFixture } from '../../src/systems/competitionCalendar';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { getCurrentFixture, registerFixturesSystem } from '../../src/systems/fixtures';
import { isOpenCupInstance } from '../../src/systems/openCup';
import { structuralOpenCup } from '../../src/systems/openCupCareer';

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const cup = (state = getState()) => state.competitions!.instances.find(isOpenCupInstance)!;
export let bytes: Map<string, string>;
export function installCupTestHooks() {
  beforeAll(async () => { await preparePack('uk'); });
  beforeEach(() => {
    bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); selectPack('au'); setCareerNamespace(DEV_TEST_PREFIX);
    bytes = new Map(); const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
    setActiveSlot(1); __unlockSaves(); __setStorage(storage); vi.stubGlobal('localStorage', storage);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); setCareerNamespace(null); __setStorage(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
}

export function setup(pack: 'au' | 'uk' = 'au', enterOpenCup?: boolean, seed = 575): GameState {
  createNewGame('Cup career', seed, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  return setupStructuralDivisionCareer(pack === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE, seed, undefined,
    enterOpenCup === undefined ? {} : { enterOpenCup });
}
export function fixtureHooks(playerWins = true): void {
  registerFixturesSystem();
  registerTickHook('player-test-score', TICK_ORDER.match, () => {
    const state = getState(); const fixture = getCurrentFixture(state, state.clubId); if (!fixture) return;
    const homeWins = (fixture.homeId === state.clubId) === playerWins;
    setState(finaliseCalendarFixture(state, fixture, homeWins ? { homeScore: 24, awayScore: 0 } : { homeScore: 0, awayScore: 24 }));
  }, { trials: true });
}
export function firstTieSeed(): number {
  selectPack('au');
  for (let seed = 1; seed < 128; seed++) {
    const candidate = structuralOpenCup(AU_CAREER_PROFILE, activePack(), seed, ['player', ...AU_CAREER_PROFILE.clubs.map(c => c.id)], 'player')!;
    if (candidate.fixtures.some(f => f.homeId === 'player' || f.awayId === 'player')) return seed;
  }
  throw new Error('No deterministic first-round test field');
}

export function received(state = getState(), clubId: string = state.clubId): number {
  return state.matchIncome.reduce((sum, r) => sum + (r.fixture.homeId === clubId ? r.receipt?.home.total ?? 0 : r.fixture.awayId === clubId ? r.receipt?.away.total ?? 0 : 0), 0);
}
