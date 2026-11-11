import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { createNewGame, getState, setState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER, weekHeld } from '../../src/core/time';
import { __setStorage, __unlockSaves, exportRecoverySaves, importSave, installImportedSave, loadSlot, migrateState, setActiveSlot, writeSlot } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer, currentDivision, currentDivisionClubIds, prepareDivisionFinals } from '../../src/systems/divisionCareer';
import { INITIAL_REGULAR_SLOTS } from '../../src/content/career/calendar';
import { currentCalendarFixtures, finaliseCalendarFixture, fixtureBridge } from '../../src/systems/competitionCalendar';
import { getCurrentFixture, initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { developDivisionRivals, developRivalsWeek, registerRivalsSystem } from '../../src/systems/rivals';
import { registerFreeAgencySystem, freeAgencyTick } from '../../src/systems/freeagency';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { makeRng, type Rng } from '../../src/utils/rng';
import { shownStats } from '../../src/data/player';
import type { RegionalCareerProfile } from '../../src/data/divisions';

let bytes: Map<string, string>;
beforeAll(async () => { await preparePack('uk'); });
beforeEach(() => {
  bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); selectPack('au'); setCareerNamespace(DEV_TEST_PREFIX);
  bytes = new Map(); setActiveSlot(1); __unlockSaves();
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); setCareerNamespace(null); selectPack('au'); __setStorage(null); vi.restoreAllMocks(); });

function setup(pack: 'au' | 'uk' = 'au'): GameState {
  createNewGame('Regional prototype', 573, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  initLeague(getState()); // Replacing only fresh/unplayed legacy setup is allowed.
  return setupStructuralDivisionCareer(pack === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE, 573);
}

function fixtureHooks(playerWins = true): void {
  registerFixturesSystem();
  registerTickHook('test-player-outcome', TICK_ORDER.match, () => {
    const s = getState(); const f = getCurrentFixture(s, s.clubId);
    if (!f) return;
    const homeWins = (f.homeId === s.clubId) === playerWins;
    setState(finaliseCalendarFixture(s, f, homeWins ? { homeScore: 24, awayScore: 0 } : { homeScore: 0, awayScore: 24 }));
  }, { trials: true });
}

describe('isolated fresh regional setup', () => {
  it.each(['au', 'uk'] as const)('installs the %s calendar, legal trials, Local lineup and canonical world', pack => {
    const s = setup(pack);
    expect(s.version).toBe(27); expect(s.preseason).toBe(0);
    expect(s.competitions!.calendar).toMatchObject({ mode: 'structural', status: 'active', season: 1, elapsedIntervals: 0 });
    expect(s.competitions!.calendar!.slots).toHaveLength(25);
    expect(s.competitions!.calendar!.slots.filter(x => x.kind === 'rest').map(x => x.id)).toEqual([2, 3]);
    expect(s.league.clubs).toHaveLength(24); expect(s.league.fixtures).toEqual([]);
    expect(s.league.ladder).toHaveLength(8); expect(currentDivision(s)?.division.rank).toBe(0);
    expect(currentDivisionClubIds(s)).toEqual(currentDivision(s)!.instance.entrantIds);
    expect(currentDivisionClubIds(s, 'missing')).toEqual([]);
    expect(s.objectives).toEqual([]); expect(s.freeAgents).toEqual([]);
    const selected = [...s.lineup.starters, ...s.lineup.bench].filter(Boolean);
    expect(selected).toHaveLength(13); expect(new Set(selected).size).toBe(13);
    expect(selected.every(id => s.squad.some(p => p.id === id))).toBe(true);
    const leagues = s.competitions!.instances.filter(i => i.definition.format.kind === 'league');
    expect(leagues).toHaveLength(3);
    for (const league of leagues) expect([...new Set(league.fixtures.map(f => f.slot))]).toEqual(INITIAL_REGULAR_SLOTS);
    const trials = s.competitions!.instances.filter(i => i.definition.format.kind === 'exhibition').flatMap(i => i.fixtures);
    expect(trials).toHaveLength(24);
    for (const club of s.league.clubs) {
      const own = trials.filter(f => f.homeId === club.id || f.awayId === club.id);
      expect(own.map(f => f.slot)).toEqual([1, 4]);
      expect(own.filter(f => f.homeId === club.id)).toHaveLength(1);
    }
    expect(migrateState(JSON.parse(JSON.stringify(s)))).toMatchObject({ ok: true, state: s, repairs: [] });
  });

  it('rejects normal, played, held and repeated setups before replacing a roster', () => {
    createNewGame('Normal', 3); setCareerNamespace(null);
    const normal = getState(); expect(() => setupStructuralDivisionCareer(AU_CAREER_PROFILE, 3)).toThrow(/isolated developer/);
    expect(getState()).toBe(normal);
    setCareerNamespace(DEV_TEST_PREFIX); setState({ week: 2 });
    const played = getState(); expect(() => setupStructuralDivisionCareer(AU_CAREER_PROFILE, 3)).toThrow(/fresh developer/); expect(getState()).toBe(played);
    createNewGame('Held', 3); registerTickHook('hold', 1, ctx => ctx.hold!(), { trials: true }); advanceWeek();
    expect(weekHeld()).toBe(true); expect(() => setupStructuralDivisionCareer(AU_CAREER_PROFILE, 3)).toThrow(/fresh developer/);
    clearHeldWeek(); clearTickHooks(); setup(); const active = getState();
    expect(() => setupStructuralDivisionCareer(AU_CAREER_PROFILE, 3)).toThrow(/fresh developer/); expect(getState()).toBe(active);
  });

  it('plays the first trial using the existing match and rival fixture hooks', () => {
    const s = setup(); const money = s.money; const contracts = s.squad.map(p => p.contractWeeks);
    registerFixturesSystem(); registerPlayerMatchSystem(); advanceWeeks(1);
    expect(getState().week).toBe(2); expect(weekHeld()).toBe(false);
    expect(getState().competitions!.instances.filter(i => i.definition.format.kind === 'exhibition' && i.status === 'completed')).toHaveLength(12);
    expect(getState().league.ladder.every(r => r.played === 0)).toBe(true);
    expect(getState().money).toBe(money); expect(getState().squad.map(p => p.contractWeeks)).toEqual(contracts);
  });

  it('starts the same fresh world and match stream whether or not unused legacy fixtures were initialised', () => {
    const expected = JSON.parse(JSON.stringify(setup()));
    createNewGame('Regional prototype', 573);
    expect(setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573)).toEqual(expected);
  });
});

describe('existing-hook league and finals staging', () => {
  it.each([2, 4, 8])('runs an authored alternate field/calendar with a top%i finals series', finalsSize => {
    const size = Math.max(6, finalsSize);
    const regularRounds = 2 * (size - 1);
    const finalsRounds = Math.log2(finalsSize);
    const slotCount = 2 + regularRounds + finalsRounds;
    const clubs = AU_CAREER_PROFILE.clubs.slice(0, size - 1);
    const regularSlots = Array.from({ length: regularRounds }, (_, i) => i + 3);
    const finalsSlots = Array.from({ length: finalsRounds }, (_, i) => regularRounds + i + 3);
    const profile: RegionalCareerProfile = {
      ...AU_CAREER_PROFILE, id: `alternate-top${finalsSize}`, slotCount, clubs, startingDivisionId: 'alternate-local', trialSlots: [1, 2],
      calendarSlots: Array.from({ length: slotCount }, (_, i) => ({ id: i + 1, kind: i < 2 ? 'preseason' : 'competition' })),
      divisions: [{ id: 'alternate-local', name: 'Alternate Local', rank: 0, regularRounds, regularSlots, finalsSlots,
        finalsSize, ratingMean: 44, entrants: [{ clubId: 'player', strength: 44 }, ...clubs.map((c, i) => ({ clubId: c.id, strength: 40 + i }))] }],
    };
    createNewGame('Alternate', 71); setupStructuralDivisionCareer(profile, 71); fixtureHooks();
    expect(currentDivisionClubIds(getState())).toHaveLength(size);
    expect(getState().competitions!.calendar!.slots).toHaveLength(slotCount);
    advanceWeeks(slotCount);
    expect(getState().season).toBe(2); expect(getState().competitions!.calendar!.status).toBe('awaiting-next-season');
    const instance = currentDivision(getState())!.instance;
    expect(instance.winnerId).toBe('player');
    const finals = instance.fixtures.filter(f => f.stageId === 'finals');
    expect(finals).toHaveLength(finalsSize - 1);
    expect([...new Set(finals.map(f => f.slot))]).toEqual(finalsSlots);
    expect(finals[finals.length - 1]!.neutral).toBe(true);
    expect(migrateState(JSON.parse(JSON.stringify(getState()))).ok).toBe(true);
  });

  it.each([true, false])('completes all three sporting seasons with playerWins=%s and pauses without movement', wins => {
    const s = setup(); const world = JSON.stringify(s.competitions!.world); const people = JSON.stringify(s.league.clubs); const squad = JSON.stringify(s.squad);
    fixtureHooks(wins); let ticks = 0; registerTickHook('count', 2, () => { ticks++; });
    advanceWeeks(23);
    expect(getState().week).toBe(24);
    const leagues = getState().competitions!.instances.filter(i => i.definition.format.kind === 'league');
    for (const league of leagues) {
      const semis = league.fixtures.filter(f => f.stageId === 'finals');
      expect(semis).toHaveLength(2); expect(semis.every(f => f.round === 1 && f.slot === 24 && !f.neutral)).toBe(true);
    }
    expect(getCurrentFixture(getState(), 'player') === undefined).toBe(!wins);
    expect(prepareDivisionFinals(getState())).toBe(getState());
    const before = JSON.parse(JSON.stringify(getState())); expect(migrateState(before).ok).toBe(true);
    advanceWeeks(1); expect(getState().week).toBe(25);
    for (const league of getState().competitions!.instances.filter(i => i.definition.format.kind === 'league')) {
      expect(league.fixtures.filter(f => f.stageId === 'finals')).toHaveLength(3);
      expect(league.fixtures[league.fixtures.length - 1]).toMatchObject({ slot: 25, round: 2, neutral: true, status: 'scheduled' });
    }
    advanceWeeks(1);
    expect(getState().season).toBe(2); expect(getState().week).toBe(1); expect(ticks).toBe(25);
    expect(getState().competitions!.calendar!.status).toBe('awaiting-next-season');
    expect(getState().competitions!.instances.every(i => i.status === 'completed')).toBe(true);
    expect(getState().competitions!.instances.flatMap(i => i.fixtures).filter(f => f.stageId === 'finals')).toHaveLength(9);
    expect(JSON.stringify(getState().competitions!.world)).toBe(world);
    expect(JSON.stringify(getState().league.clubs)).toBe(people); expect(JSON.stringify(getState().squad)).toBe(squad);
    expect(migrateState(JSON.parse(JSON.stringify(getState())))).toMatchObject({ ok: true, state: getState() });
    const stopped = JSON.stringify(getState()); advanceWeeks(3); expect(JSON.stringify(getState())).toBe(stopped);
  });

  it('uses recorded tie winners, waits for both semis and never duplicates a stage', () => {
    setup(); fixtureHooks(); advanceWeeks(23); clearTickHooks();
    const league = currentDivision(getState())!.instance;
    const semis = league.fixtures.filter(f => f.stageId === 'finals');
    const late = currentCalendarFixtures(getState()).find(r => r.fixture.id === semis[1]!.id)!;
    setState(finaliseCalendarFixture(getState(), fixtureBridge(late), { homeScore: 12, awayScore: 12 }));
    expect(prepareDivisionFinals(getState())).toBe(getState());
    const early = currentCalendarFixtures(getState()).find(r => r.fixture.id === semis[0]!.id)!;
    setState(finaliseCalendarFixture(getState(), fixtureBridge(early), { homeScore: 12, awayScore: 12 }));
    const prepared = prepareDivisionFinals(getState()); const nextLeague = currentDivision(prepared)!.instance;
    const final = nextLeague.fixtures.find(f => f.stageId === 'finals' && f.round === 2)!;
    expect(new Set([final.homeId, final.awayId])).toEqual(new Set(nextLeague.fixtures.filter(f => f.stageId === 'finals' && f.round === 1).map(f => f.result!.winnerId)));
    expect(prepareDivisionFinals(prepared)).toBe(prepared);
  });
});

describe('saved world boundaries and supported migration', () => {
  it.each(['au', 'uk'] as const)('keeps %s v26 legacy data unchanged and retains original bytes', pack => {
    createNewGame('Existing', 26, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {}); initLeague(getState());
    const old = { ...getState(), version: 26 }; const original = JSON.stringify(old);
    bytes.set(DEV_TEST_PREFIX + slotKey(1), original); bytes.set(slotKey(1), 'normal career');
    const loaded = loadSlot(); expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') throw new Error('v26 load failed');
    expect(loaded.state).toEqual({ ...old, version: SAVE_VERSION }); expect(loaded.state.competitions).toBeUndefined();
    expect(writeSlot(1, loaded.state)).toBe(true); expect(exportRecoverySaves(1)).toContain(original);
    expect(bytes.get(slotKey(1))).toBe('normal career'); expect(JSON.stringify(old)).toBe(original);
  });

  it.each([
    ['missing clock', (s: GameState) => { delete s.competitions!.calendar; }],
    ['extra profile field', (s: GameState) => { Object.assign(s.competitions!.world!.profile, { cash: 9000 }); }],
    ['wrong locale', (s: GameState) => { s.competitions!.world!.profile.pack = 'uk'; }],
    ['duplicate rank', (s: GameState) => { s.competitions!.world!.divisions[1]!.rank = 0; }],
    ['reordered divisions', (s: GameState) => { s.competitions!.world!.divisions.reverse(); }],
    ['unknown league', (s: GameState) => { s.competitions!.world!.divisions[0]!.instanceId = 'missing'; }],
    ['invalid rating target', (s: GameState) => { s.competitions!.world!.divisions[0]!.ratingMean = -1; }],
    ['missing stage dates', (s: GameState) => { delete s.competitions!.instances[0]!.definition.stages[0]!.slotIds; }],
    ['duplicate stage date', (s: GameState) => { s.competitions!.instances[0]!.definition.stages[0]!.slotIds![1] = 5; }],
    ['stage beyond calendar', (s: GameState) => { s.competitions!.instances[0]!.definition.stages[1]!.slotIds![1] = 26; }],
    ['stage chronology', (s: GameState) => { s.competitions!.instances[0]!.definition.stages[1]!.slotIds![0] = 23; }],
    ['future final on rest slot', (s: GameState) => { s.competitions!.calendar!.slots[23]!.kind = 'rest'; }],
    ['future final on trial slot', (s: GameState) => { s.competitions!.calendar!.slots[23]!.kind = 'preseason'; }],
    ['wrong date count', (s: GameState) => { s.competitions!.instances[0]!.definition.stages[0]!.slotIds!.pop(); }],
    ['fixture/date disagreement', (s: GameState) => { s.competitions!.instances[0]!.fixtures[0]!.slot = 7; }],
    ['duplicate membership', (s: GameState) => { s.competitions!.instances[1]!.entrantIds[0] = s.competitions!.instances[0]!.entrantIds[0]!; s.competitions!.instances[1]!.tieOrder = [...s.competitions!.instances[1]!.entrantIds]; }],
  ])('rejects %s without replacing an occupied developer save', (_label, mutate) => {
    const state = setup(); writeSlot(1, state); const before = bytes.get(DEV_TEST_PREFIX + slotKey(1));
    const bad = JSON.parse(JSON.stringify(state)) as GameState; mutate(bad);
    expect(installImportedSave(JSON.stringify(bad), 1).ok).toBe(false);
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(before);
  });

  it('rejects a new world under a v26 stamp and outside the actual DEV namespace', () => {
    const s = setup(); expect(importSave(JSON.stringify({ ...s, version: 26 })).ok).toBe(false);
    setCareerNamespace(null); expect(installImportedSave(JSON.stringify(s), 1).ok).toBe(false);
    expect(bytes.has(slotKey(1))).toBe(false);
  });
});

describe('tier anchors and dormant legacy market', () => {
  it('uses saved per-division targets without changing ceilings or pulling all tiers toward55', () => {
    const s = setup();
    const clubs = s.league.clubs.map(c => {
      if (!c.squad) return c;
      const target = currentDivision(s, c.id)!.division.ratingMean;
      return { ...c, strength: target, squad: c.squad.map(p => ({ ...p, age: 28,
        stats: { ...p.stats, ...Object.fromEntries(shownStats(p.position).map(k => [k, target])) },
        ceilings: { ...p.ceilings, ...Object.fromEntries(shownStats(p.position).map(k => [k, 90])) } })) };
    });
    const fixed: Rng = { next: () => 0, int: () => 0, pick: a => a[0]!, shuffle: a => [...a], state: () => 0 };
    expect(developDivisionRivals(s, clubs, fixed)).toEqual(clubs);
    expect(developRivalsWeek(clubs, fixed)).not.toEqual(clubs);
    const evolved = developDivisionRivals(s, s.league.clubs, makeRng(2));
    for (const c of evolved) for (const p of c.squad ?? []) {
      const original = s.league.clubs.find(x => x.id === c.id)!.squad!.find(x => x.id === p.id)!;
      expect(p.ceilings).toEqual(original.ceilings);
      expect(shownStats(p.position).every(k => p.stats[k] <= p.ceilings[k]!)).toBe(true);
    }
  });

  it('suppresses old automatic signings and pool refresh in the structural world', () => {
    const s = setup(); const originalIds = s.league.clubs.flatMap(c => c.squad?.map(p => p.id) ?? []);
    registerRivalsSystem(); registerFreeAgencySystem(); advanceWeeks(4);
    expect(getState().freeAgents).toEqual([]);
    expect(getState().league.clubs.flatMap(c => c.squad?.map(p => p.id) ?? [])).toEqual(originalIds);
    const rng = makeRng(7); expect(freeAgencyTick(getState(), rng)).toBe(getState()); expect(rng.state()).toBe(7);
  });
});
