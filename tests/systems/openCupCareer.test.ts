import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { preparePack, selectPack, activePack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { createNewGame, getState, setState, type Fixture, type GameState } from '../../src/core/state';
import { bus, type LiveMatchData } from '../../src/core/events';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER, weekHeld } from '../../src/core/time';
import { __setStorage, __unlockSaves, importSave, installImportedSave, loadSlot, save, setActiveSlot } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { openCupProfileSlots, prepareOpenCup, structuralOpenCup } from '../../src/systems/openCupCareer';
import { isOpenCupInstance, openCupByes, openCupSportingOutcomes } from '../../src/systems/openCup';
import { finaliseCalendarFixture, structuralPolicyProblem } from '../../src/systems/competitionCalendar';
import { getCurrentFixture, registerFixturesSystem } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { runMatch } from '../../src/match/league/match';
import type { TeamSheet } from '../../src/sim/events';
import type { RegionalCareerProfile } from '../../src/data/divisions';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const cup = (state = getState()) => state.competitions!.instances.find(isOpenCupInstance)!;
let bytes: Map<string, string>;
beforeAll(async () => { await preparePack('uk'); });
beforeEach(() => {
  bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); selectPack('au'); setCareerNamespace(DEV_TEST_PREFIX);
  bytes = new Map(); const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
  setActiveSlot(1); __unlockSaves(); __setStorage(storage); vi.stubGlobal('localStorage', storage);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); setCareerNamespace(null); __setStorage(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(pack: 'au' | 'uk' = 'au', enterOpenCup?: boolean, seed = 575): GameState {
  createNewGame('Cup career', seed, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  return setupStructuralDivisionCareer(pack === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE, seed, undefined,
    enterOpenCup === undefined ? {} : { enterOpenCup });
}
function fixtureHooks(playerWins = true): void {
  registerFixturesSystem();
  registerTickHook('player-test-score', TICK_ORDER.match, () => {
    const state = getState(); const fixture = getCurrentFixture(state, state.clubId); if (!fixture) return;
    const homeWins = (fixture.homeId === state.clubId) === playerWins;
    setState(finaliseCalendarFixture(state, fixture, homeWins ? { homeScore: 24, awayScore: 0 } : { homeScore: 0, awayScore: 24 }));
  }, { trials: true });
}
function firstTieSeed(): number {
  selectPack('au');
  for (let seed = 1; seed < 128; seed++) {
    const candidate = structuralOpenCup(AU_CAREER_PROFILE, activePack(), seed, ['player', ...AU_CAREER_PROFILE.clubs.map(c => c.id)], 'player')!;
    if (candidate.fixtures.some(f => f.homeId === 'player' || f.awayId === 'player')) return seed;
  }
  throw new Error('No deterministic first-round test field');
}

describe('regional cup entry and existing calendar hooks', () => {
  it.each(['au', 'uk'] as const)('adds the %s cross-division cup at setup with snapshotted free dates', pack => {
    const state = setup(pack); const entered = cup(state);
    expect(entered.entrantIds).toHaveLength(24); expect(entered.entrantIds).toContain('player');
    expect(entered.definition.maxEntrants).toBe(32); expect(entered.definition.rewards).toEqual([]);
    expect(entered.definition.stages[0]!.slotIds).toEqual([7, 10, 13, 16, 19]);
    expect(entered.fixtures).toHaveLength(8); expect(openCupByes(entered)).toHaveLength(8);
    expect(structuralPolicyProblem(state)).toBeNull(); expect(importSave(JSON.stringify(state)).ok).toBe(true);
    expect(state.competitions!.world!.divisions.every(d => state.competitions!.instances.find(i => i.id === d.instanceId)!.entrantIds.some(id => entered.entrantIds.includes(id)))).toBe(true);
  });
  it('lets the player decline while the other 23 clubs retain their cup', () => {
    setup('au', false); const entered = cup();
    expect(entered.entrantIds).toHaveLength(23); expect(entered.entrantIds).not.toContain('player');
    fixtureHooks(); advanceWeeks(19);
    expect(cup().status).toBe('completed'); expect(cup().fixtures).toHaveLength(22);
    expect(openCupSportingOutcomes(cup()).some(o => o.clubId === 'player')).toBe(false);
    expect(getState().league.ladder.find(r => r.clubId === 'player')!.played).toBe(10);
  });
  it.each([true, false])('completes 23 cup ties through shared hooks with playerWins=%s and no extra intervals', wins => {
    const state = setup(); const cash = state.money; const contracts = state.squad.map(p => p.contractWeeks);
    fixtureHooks(wins); let intervals = 0; registerTickHook('count', 2, () => { intervals++; });
    advanceWeeks(19);
    expect(getState().week).toBe(20); expect(intervals).toBe(19);
    const finished = cup(); expect(finished.status).toBe('completed'); expect(finished.fixtures).toHaveLength(23);
    expect(finished.fixtures[finished.fixtures.length - 1]).toMatchObject({ slot: 19, neutral: true, status: 'completed' });
    expect(getState().league.ladder.find(r => r.clubId === 'player')!.played).toBe(10);
    expect(getState().money).toBe(cash); expect(getState().squad.map(p => p.contractWeeks)).toEqual(contracts);
    const outcomes = openCupSportingOutcomes(finished); expect(outcomes).toHaveLength(24);
    expect(outcomes.filter(o => o.kind === 'title')).toMatchObject([{ clubId: finished.winnerId }]);
    expect(openCupSportingOutcomes(clone(finished))).toEqual(outcomes);
    expect(new Set(outcomes.map(o => o.id)).size).toBe(24);
    const before = JSON.stringify(getState()); expect(prepareOpenCup(getState())).toBe(getState()); expect(JSON.stringify(getState())).toBe(before);
    advanceWeeks(6); expect(getState().season).toBe(2); expect(intervals).toBe(25);
    expect(getState().competitions!.instances.every(i => i.status === 'completed')).toBe(true);
  });
  it('uses alternate profile dates and a four-club cup instead of hard-coded prototype slots', () => {
    const regularSlots = [3, 5, 6, 8, 9, 10]; const finalsSlots = [11, 12];
    const identities = AU_CAREER_PROFILE.clubs.slice(0, 3);
    const profile: RegionalCareerProfile = { ...AU_CAREER_PROFILE, id: 'alternate-cup', slotCount: 12, clubs: identities,
      trialSlots: [1, 2], calendarSlots: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, kind: i < 2 ? 'preseason' : 'competition' })),
      divisions: [{ id: 'alternate-local', name: 'Local', rank: 0, regularRounds: 6, regularSlots, finalsSlots, finalsSize: 4, ratingMean: 44,
        entrants: [{ clubId: 'player', strength: 44 }, ...identities.map(c => ({ clubId: c.id, strength: 44 }))] }], startingDivisionId: 'alternate-local' };
    createNewGame('Alternate cup', 31); setupStructuralDivisionCareer(profile, 31, undefined, { enterOpenCup: true });
    expect(openCupProfileSlots(profile)).toEqual([4, 7]); expect(cup().definition.stages[0]!.slotIds).toEqual([4, 7]);
    fixtureHooks(); advanceWeeks(7);
    expect(cup().status).toBe('completed'); expect(cup().fixtures).toHaveLength(3);
    expect(cup().fixtures.map(f => f.slot)).toEqual([4, 4, 7]); expect(structuralPolicyProblem(getState())).toBeNull();
  });
  it('omits an automatic cup without a profile window and rejects an explicit request atomically', () => {
    const profile = { ...AU_CAREER_PROFILE, calendarSlots: AU_CAREER_PROFILE.calendarSlots.map(s => [7, 10, 13, 16, 19].includes(s.id) ? { ...s, kind: 'rest' as const } : s) };
    createNewGame('No cup dates', 31); const before = clone(getState());
    expect(() => setupStructuralDivisionCareer(profile, 31, undefined, { enterOpenCup: true })).toThrow(/no valid Open Cup window/);
    expect(getState()).toEqual(before);
    setupStructuralDivisionCareer(profile, 31); expect(getState().competitions!.instances.some(isOpenCupInstance)).toBe(false);
  });
  it('stages a due round before match40 when a valid reload checkpoint has not yet generated it', () => {
    setup(); fixtureHooks(); advanceWeeks(9); // Saved calendar is now at the R16 date.
    const state = clone(getState()); const savedCup = cup(state); savedCup.fixtures = savedCup.fixtures.filter(f => f.round === 1);
    expect(structuralPolicyProblem(state)).toBeNull(); expect(importSave(JSON.stringify(state)).ok).toBe(true);
    setState(state); advanceWeeks(1);
    expect(getState().week).toBe(11);
    expect(cup().fixtures.filter(f => f.round === 2)).toHaveLength(8);
    expect(cup().fixtures.filter(f => f.round === 2).every(f => f.status === 'completed')).toBe(true);
    expect(cup().fixtures.filter(f => f.round === 3)).toHaveLength(4);
  });
  it('progresses a supported structural cup even when division-world metadata is absent', () => {
    setup(); const state = clone(getState()); delete state.competitions!.world;
    expect(importSave(JSON.stringify(state)).ok).toBe(true); expect(structuralPolicyProblem(state)).toBeNull();
    setState(state); fixtureHooks(); advanceWeeks(7);
    expect(getState().week).toBe(8); expect(cup().fixtures.filter(f => f.round === 2)).toHaveLength(8);
  });
  it('holds and finalises a watched cup fixture once, then stages its next round without duplicating XP', () => {
    setup('au', true, firstTieSeed()); fixtureHooks(); advanceWeeks(6); clearTickHooks();
    registerFixturesSystem(); registerPlayerMatchSystem(); let ticks = 0; registerTickHook('count', 2, () => { ticks++; });
    let started: { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData } | undefined;
    bus.on('match:started', value => { started = value; });
    const ladder = JSON.stringify(getState().league.ladder); const money = getState().money;
    advanceWeek(); expect(weekHeld()).toBe(true); expect(started!.fixture.competitionId).toBe(cup().id);
    advanceWeek(); expect(ticks).toBe(1);
    const played = started!; const result = runMatch(played.home, played.away, played.live);
    bus.emit('match:finished', { fixture: played.fixture, result });
    expect(weekHeld()).toBe(false); expect(getState().week).toBe(8);
    expect(cup().fixtures.filter(f => f.round === 2)).toHaveLength(8);
    expect(JSON.stringify(getState().league.ladder)).toBe(ladder); expect(getState().money).toBe(money);
    const after = JSON.stringify(getState());
    bus.emit('match:finished', { fixture: played.fixture, result });
    expect(JSON.stringify(getState())).toBe(after); expect(ticks).toBe(1);
    expect(openCupSportingOutcomes(cup())).toHaveLength(8);
  });
});

describe('early supported cup import policy', () => {
  it.each(['topology', 'future rest', 'future clash', 'undrawn', 'missed round'] as const)('rejects %s before installing or advancing the active career', fault => {
    setup(); fixtureHooks();
    if (fault === 'missed round') advanceWeeks(10);
    const bad = clone(getState()); const saved = cup(bad);
    if (fault === 'topology') { const f = saved.fixtures[0]!; [f.homeId, f.awayId] = [f.awayId, f.homeId]; }
    if (fault === 'future rest') bad.competitions!.calendar!.slots[9]!.kind = 'rest';
    if (fault === 'future clash') saved.definition.stages[0]!.slotIds![1] = 8;
    if (fault === 'undrawn') { saved.status = 'entered'; saved.stageId = null; saved.fixtures = []; }
    if (fault === 'missed round') saved.fixtures = saved.fixtures.filter(f => f.round === 1);
    expect(importSave(JSON.stringify(bad)).ok).toBe(true); // Metadata is otherwise structurally valid.
    expect(structuralPolicyProblem(bad)).not.toBeNull();
    save(getState()); bytes.set(DEV_TEST_PREFIX + liveMatchKey(1), 'existing sidecar'); const before = new Map(bytes);
    expect(installImportedSave(JSON.stringify(bad), 1).ok).toBe(false);
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(before.get(DEV_TEST_PREFIX + slotKey(1)));
    expect(bytes.get(DEV_TEST_PREFIX + liveMatchKey(1))).toBe('existing sidecar');
    bytes.set(DEV_TEST_PREFIX + slotKey(2), JSON.stringify(bad)); expect(loadSlot(2).status).toBe('corrupt');
    setState(bad); const unchanged = JSON.stringify(getState()); advanceWeek(); expect(JSON.stringify(getState())).toBe(unchanged);
  });
});
