import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus, type LiveMatchData } from '../../src/core/events';
import { createNewGame, getState, setState, SAVE_VERSION, type Fixture, type GameState } from '../../src/core/state';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, advanceWeek, advanceWeeks, registerSeasonHook, registerTickHook, resumeWeek, weekHeld, withFastForward } from '../../src/core/time';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { elapsedInterval } from '../../src/core/season';
import { advanceUntil } from '../../src/core/advance';
import { activateStructuralCalendar, finaliseCalendarFixture, fixtureBridge, currentCalendarFixtures, hasStructuralCalendar } from '../../src/systems/competitionCalendar';
import { createCompetitionInstance, competitionFixtureId, type CompetitionDefinition } from '../../src/data/competition';
import { cupDefinition } from '../fixtures/competition';
import { initLeague, registerFixturesSystem, applyResult } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem, resumePlayerMatch } from '../../src/systems/matchday';
import { registerTrainingSystem } from '../../src/systems/training';
import { registerEconomySystem } from '../../src/systems/economy';
import { registerEventsSystem } from '../../src/systems/events';
import { registerBoardSystem } from '../../src/systems/board';
import { runMatch } from '../../src/match/league/match';
import type { TeamSheet } from '../../src/sim/events';
import { __setStorage, __unlockSaves, save, exportSave, importSave, installImportedSave, load } from '../../src/core/save';
import { readLiveMatch } from '../../src/systems/liveMatchRecord';
import { initMatchReport } from '../../src/ui/screens/matchReport';
import { stubDocument } from '../ui/stubDom';

interface Started { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData }
let starts: Started[];
let bytes: Map<string, string>;
const storage = { getItem: (key: string): string | null => bytes.get(key) ?? null,
  setItem: (key: string, value: string): void => { bytes.set(key, value); }, removeItem: (key: string): void => { bytes.delete(key); } };

function prototype(slots = 3): GameState {
  createNewGame('Calendar test', 42);
  initLeague(getState());
  const state = getState();
  state.weather = 'clear'; // Match reload starts from the same explicit forecast.
  const clubs = [state.clubId, state.league.clubs.find(c => c.id !== state.clubId)!.id];
  const leagueDef: CompetitionDefinition = { ...cupDefinition(), id: 'league', name: 'Local league',
    slotCount: slots, format: { kind: 'league', finalsSize: 0 }, minEntrants: 2, maxEntrants: 2,
    stages: [{ id: 'regular', name: 'League', kind: 'league', rounds: 2 }], rewards: [],
    standings: { win: 2, draw: 1, loss: 0, tieBreakers: ['points-difference', 'points-for', 'head-to-head-points', 'frozen-order'] } };
  const cupDef: CompetitionDefinition = { ...cupDefinition(), slotCount: slots, minEntrants: 2, maxEntrants: 2,
    stages: [{ id: 'cup', name: 'Cup', kind: 'knockout', rounds: 1 }], rewards: [] };
  const league = createCompetitionInstance(leagueDef, 1, 0, clubs);
  league.status = 'scheduled'; league.stageId = 'regular';
  league.fixtures = [1, 3].map((slot, index) => ({ id: competitionFixtureId(league.id, index), competitionId: league.id,
    stageId: 'regular', round: index + 1, slot, homeId: clubs[index]!, awayId: clubs[1 - index]!, neutral: false, status: 'scheduled' }));
  const cup = createCompetitionInstance(cupDef, 1, 0, clubs);
  cup.status = 'scheduled'; cup.stageId = 'cup';
  cup.fixtures = [{ id: competitionFixtureId(cup.id, 0), competitionId: cup.id, stageId: 'cup', round: 1,
    slot: 2, homeId: clubs[0]!, awayId: clubs[1]!, neutral: true, status: 'scheduled' }];
  const dormant = { ...state, competitions: { schemaVersion: 1 as const, instances: [league, cup] } };
  setState(dormant);
  return dormant;
}

function activate(state = prototype()): GameState {
  const count = state.competitions!.instances[0]!.definition.slotCount;
  const next = activateStructuralCalendar(state, Array.from({ length: count }, (_, index) => ({ id: index + 1, kind: index < 3 ? 'competition' : 'rest' })));
  setState(next); return next;
}

function systems(): void {
  registerTrainingSystem(); registerEconomySystem(); registerFixturesSystem(); registerPlayerMatchSystem(); registerEventsSystem(); registerBoardSystem();
}

function finish(start = starts[starts.length - 1]!): void {
  bus.emit('match:finished', { fixture: start.fixture, result: runMatch(start.home, start.away, start.live) });
}

beforeEach(() => {
  bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek();
  setCareerNamespace(DEV_TEST_PREFIX); bytes = new Map(); __setStorage(storage); __unlockSaves();
  vi.stubGlobal('localStorage', storage); starts = [];
  bus.on('match:started', value => starts.push(value));
});
afterEach(() => { clearHeldWeek(); bus.clear(); clearTickHooks(); clearSeasonHooks(); setCareerNamespace(null); __setStorage(null); vi.unstubAllGlobals(); });

describe('structural calendar activation and boundaries', () => {
  it('requires the actual isolated developer namespace, not imported metadata', () => {
    const state = prototype(); setCareerNamespace(null);
    expect(() => activateStructuralCalendar(state, [{ id: 1, kind: 'competition' }])).toThrow(/isolated developer/);
    setCareerNamespace(DEV_TEST_PREFIX); const active = activate(state);
    setCareerNamespace(null);
    expect(installImportedSave(JSON.stringify(active), 1)).toMatchObject({ ok: false, message: expect.stringMatching(/isolated developer/) });
    setState(active); const before = JSON.stringify(getState()); advanceWeek(); expect(JSON.stringify(getState())).toBe(before);
  });

  it('keeps supported v25 careers dormant and preserves their exact data', () => {
    const state = prototype(); delete state.competitions; const source = { ...state, version: 25 };
    const result = importSave(JSON.stringify(source));
    expect(result).toMatchObject({ ok: true, state: { ...source, version: SAVE_VERSION } });
    if (result.ok) expect(result.state.competitions).toBeUndefined();
    expect(source.version).toBe(25);
  });

  it('does not activate the new clock merely because dormant instances exist', () => {
    const state = prototype(); const instances = JSON.stringify(state.competitions);
    registerTickHook('one', 1, () => {}, { trials: true }); advanceWeek();
    expect(getState().week).toBe(1); expect(getState().preseason).toBe(2);
    expect(JSON.stringify(getState().competitions)).toBe(instances); expect(hasStructuralCalendar(getState())).toBe(false);
  });

  it('rejects invalid slots, double booking, chronology and disguised v25 active metadata', () => {
    expect(() => activateStructuralCalendar(prototype(), [{ id: 2, kind: 'competition' }])).toThrow();
    const empty=prototype(); empty.competitions!.instances=[];
    expect(() => activateStructuralCalendar(empty,[{id:1,kind:'rest'}])).toThrow(/calendar instances/);
    const active = activate();
    expect(importSave(JSON.stringify({ ...active, version: 25 })).ok).toBe(false);
    const bad = structuredClone(active); bad.competitions!.instances[1]!.fixtures[0]!.slot = 1;
    expect(importSave(JSON.stringify(bad)).ok).toBe(false);
    const later = structuredClone(active); later.week = 28;
    expect(importSave(JSON.stringify(later)).ok).toBe(false);
  });

  it.each(['rules','eligibility'] as const)('refuses unsupported %s in imported, loaded or directly set active snapshots', changed => {
    const active=activate();
    if(changed==='rules') active.competitions!.instances[0]!.definition.matchRules.tryPoints=8;
    else active.competitions!.instances[0]!.definition.eligibility={kind:'youth',maxAge:21,minRegistered:7,minStarters:5,minBench:2,minOnField:5};
    const text=JSON.stringify(active); expect(importSave(text).ok).toBe(true); // Pure metadata remains valid.
    expect(installImportedSave(text,1).ok).toBe(false); expect(bytes.has(DEV_TEST_PREFIX+slotKey(1))).toBe(false);
    bytes.set(DEV_TEST_PREFIX+slotKey(1),text); expect(load()).toBeNull();
    setState(active); const before=JSON.stringify(getState()); advanceWeek(); expect(JSON.stringify(getState())).toBe(before);
  });
});

describe('one interval and one canonical fixture finalisation', () => {
  it('runs league/cup/league through watched matches without repeated hooks, wages or stats', () => {
    activate(); systems(); let intervals = 0; registerTickHook('count', 5, () => { intervals++; });
    const cash = getState().money; const contracts = getState().squad.map(p => p.contractWeeks);
    setState({ squad: getState().squad.map((p, index) => index === getState().squad.length - 1 ? { ...p, suspendedWeeks: 2 } : p) });
    advanceWeek(); const first = starts[0]!;
    expect(weekHeld()).toBe(true); expect(intervals).toBe(1); advanceWeek(); expect(intervals).toBe(1);
    expect(getState().squad[getState().squad.length - 1]!.suspendedWeeks).toBe(2);
    finish(first); expect(getState().squad[getState().squad.length - 1]!.suspendedWeeks).toBe(1); const league = JSON.stringify(getState().league.ladder); const xp = JSON.stringify(getState().squad);
    bus.emit('match:finished', { fixture: first.fixture, result: runMatch(first.home, first.away, first.live) });
    expect(JSON.stringify(getState().squad)).toBe(xp);
    advanceWeek(); const cup = starts[1]!;
    expect(cup.fixture.round).toBe(first.fixture.round); expect(cup.fixture.id).not.toBe(first.fixture.id);
    finish(first); expect(weekHeld()).toBe(true); expect(getState().week).toBe(2);
    finish(cup); expect(JSON.stringify(getState().league.ladder)).toBe(league);
    advanceWeek(); finish();
    expect(intervals).toBe(3); expect(getState().money).toBe(cash);
    expect(getState().squad.map(p => p.contractWeeks)).toEqual(contracts);
    expect(getState().season).toBe(2); expect(getState().week).toBe(1);
    expect(getState().competitions!.calendar).toMatchObject({ status: 'awaiting-next-season', elapsedIntervals: 3 });
    const stopped = JSON.stringify(getState()); advanceWeeks(4); expect(JSON.stringify(getState())).toBe(stopped);
  });

  it('headless advance and watching commit the same fixtures and player progression', () => {
    activate(); systems(); advanceWeek(); finish(); const watched = structuredClone(getState());
    bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); activate(); systems();
    advanceWeeks(1);
    expect(getState()).toEqual(watched);
  });

  it('rejects stale/cancelled/duplicate fixture results and preserves actual drawn scores', () => {
    activate();
    const league = fixtureBridge(currentCalendarFixtures(getState())[0]!);
    setState(finaliseCalendarFixture(getState(), league, { homeScore: 10, awayScore: 4 }));
    setState({ week: 2 });
    const ref = currentCalendarFixtures(getState())[0]!; const bridge = fixtureBridge(ref);
    const next = finaliseCalendarFixture(getState(), bridge, { homeScore: 12, awayScore: 12 });
    expect(next.competitions!.instances[1]!.fixtures[0]!.result).toEqual({ homeScore: 12, awayScore: 12, winnerId: 'player', decider: 'seeded-draw' });
    expect(finaliseCalendarFixture(next, bridge, { homeScore: 100, awayScore: 0 })).toBe(next);
    expect(finaliseCalendarFixture(getState(), { ...bridge, id: 'foreign' }, { homeScore: 1, awayScore: 0 })).toBe(getState());
    const cancelled = structuredClone(getState()); cancelled.competitions!.instances[1]!.fixtures[0]!.status = 'cancelled';
    expect(finaliseCalendarFixture(cancelled, bridge, { homeScore: 1, awayScore: 0 })).toBe(cancelled);
  });

  it('guards the supported legacy ladder against an echoed registered result', () => {
    const state = prototype(); delete state.competitions;
    const fixture = state.league.fixtures.find(f => f.round === 1)!;
    const once = applyResult(state, fixture, { homeScore: 10, awayScore: 4 });
    expect(applyResult(once, fixture, { homeScore: 99, awayScore: 0 })).toBe(once);
  });

  it('uses quiet slots without inventing fixtures and waits for unresolved stages at the boundary', () => {
    const state = prototype(4); state.competitions!.instances.forEach(i => i.fixtures.forEach(f => { if (f.slot === 3) f.slot = 4; }));
    const next = activateStructuralCalendar(state, [1,2,3,4].map(id => ({ id, kind: id === 3 ? 'rest' : 'competition' })));
    setState(next); systems(); advanceWeeks(2); const games = starts.length;
    advanceWeek(); expect(starts).toHaveLength(games); expect(getState().week).toBe(4);
    expect(elapsedInterval(getState())).toBe(4);
  });

  it('settles an ineligible live-rival fixture without generating a team or leaving a hold', () => {
    const state = prototype();
    const rivals = state.league.clubs.filter(c => c.id !== state.clubId).slice(1,3);
    const def = { ...cupDefinition(), id:'rival-event', minEntrants:2, maxEntrants:2, slotCount:3, rewards:[], stages:[{id:'cup',name:'Cup',kind:'knockout' as const,rounds:1}] };
    const event = createCompetitionInstance(def,1,0,rivals.map(c=>c.id)); event.status='scheduled'; event.stageId='cup';
    event.fixtures=[{id:competitionFixtureId(event.id,0),competitionId:event.id,stageId:'cup',round:1,slot:1,homeId:rivals[0]!.id,awayId:rivals[1]!.id,neutral:true,status:'scheduled'}];
    state.competitions!.instances.push(event);
    state.league.clubs=state.league.clubs.map(c=>c.id===rivals[0]!.id?{...c,squad:c.squad!.map(p=>({...p,injuredWeeks:4}))}:c);
    state.settings.liveRivals=true;
    const ownIds=state.squad.map(p=>p.id); activate(state); systems(); advanceWeek();
    const resolved=getState().competitions!.instances.find(i=>i.id===event.id)!;
    expect(resolved.fixtures[0]!.result).toMatchObject({winnerId:rivals[1]!.id,decider:'forfeit'});
    expect(getState().squad.map(p=>p.id)).toEqual(ownIds);
    finish(); expect(weekHeld()).toBe(false); expect(getState().week).toBe(2);
  });

  it('keeps canonical identity through the worker fast-forward lane and releases its interval once', async () => {
    class WorkerMock {
      onmessage: ((event: {data: ReturnType<typeof runMatch>[]})=>void)|null=null;
      onerror: (()=>void)|null=null;
      postMessage(jobs: Array<{home:TeamSheet;away:TeamSheet;opts:Parameters<typeof runMatch>[2]}>): void {
        queueMicrotask(()=>this.onmessage?.({data:jobs.map(job=>runMatch(job.home,job.away,job.opts))}));
      }
      terminate(): void {}
    }
    vi.stubGlobal('window',{}); vi.stubGlobal('Worker',WorkerMock);
    activate(); systems(); let count=0; bus.on('week:advanced',()=>count++);
    const done=new Promise<void>(resolve=>bus.on('week:advanced',()=>resolve()));
    withFastForward(()=>advanceWeek(),{holds:true}); expect(weekHeld()).toBe(true);
    await done; expect(count).toBe(1); expect(getState().week).toBe(2);
    expect(getState().competitions!.instances[0]!.fixtures[0]!.status).toBe('completed');
  });

  it('multi-advance counts actual intervals and stops at pending setup or stage', async () => {
    activate();
    registerTickHook('synthetic-result',40,()=>{
      const ref=currentCalendarFixtures(getState())[0];
      if(ref) setState(finaliseCalendarFixture(getState(),fixtureBridge(ref),{homeScore:10,awayScore:0}));
    });
    const result=await advanceUntil({kind:'weeks',weeks:10},async()=>{});
    expect(result.weeksPlayed).toBe(3); expect(result.stop).toMatchObject({kind:'stopped',text:expect.stringMatching(/next-season setup/)});
    clearTickHooks(); clearSeasonHooks(); const state=prototype(); state.competitions!.instances[0]!.fixtures[0]!.status='pending'; activate(state);
    const paused=await advanceUntil({kind:'weeks',weeks:10},async()=>{});
    expect(paused.weeksPlayed).toBe(0); expect(paused.stop).toMatchObject({kind:'stopped',text:expect.stringMatching(/stage or selection/)});
  });

  it('the real report subscriber cannot persist echoed/foreign POTM awards and matches headless awards', () => {
    const strong=():GameState=>{
      const state=prototype();
      state.squad=state.squad.map(p=>({...p,stats:{speed:95,strength:95,stamina:95,handling:95,kicking:95,footyIQ:95},ceilings:{speed:100,strength:100,stamina:100,handling:100,kicking:100,footyIQ:100},injuryRisk:0}));
      return state;
    };
    stubDocument(); activate(strong()); const off=initMatchReport(); systems(); advanceWeek();
    const first=starts[0]!; const result=runMatch(first.home,first.away,first.live);
    bus.emit('match:finished',{fixture:{...first.fixture,id:'foreign'},result});
    expect(getState().potmTally).toBeUndefined();
    bus.emit('match:finished',{fixture:first.fixture,result}); const watched=structuredClone(getState().potmTally);
    expect(Object.keys(watched!.counts).length).toBeGreaterThan(0);
    bus.emit('match:finished',{fixture:first.fixture,result}); expect(getState().potmTally).toEqual(watched); off();
    bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); activate(strong());
    const offHeadless=initMatchReport(); systems(); advanceWeeks(1);
    expect(getState().potmTally).toEqual(watched); offHeadless();
  });
});

describe('recovery and rollover boundaries', () => {
  it('exports only the interval-start snapshot plus canonical live identity and resumes without extra interval effects', () => {
    activate(); systems(); save(getState()); const before = JSON.stringify(getState());
    advanceWeek(); const first = starts[0]!;
    expect(readLiveMatch()).toMatchObject({ competitionId: first.fixture.competitionId, fixtureId: first.fixture.id, slot: 1 });
    first.live.onProgress?.([], 50, []);
    const exported = JSON.parse(exportSave(getState()));
    expect(exported.competitions).toEqual(JSON.parse(before).competitions);
    expect(exported.nrlLiveMatch.fixtureId).toBe(first.fixture.id);
    const once = JSON.stringify(getState()); expect(resumePlayerMatch()).toBe(true); expect(JSON.stringify(getState())).toBe(once);
    clearHeldWeek(); bus.clear(); starts=[]; bus.on('match:started', value => starts.push(value));
    setState(load()!); advanceWeek(); expect(starts[0]!.live.resumeAt).toBe(50);
    finish(); expect(getState().week).toBe(2); expect(getState().competitions!.calendar!.elapsedIntervals).toBe(1);
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(before);
    expect(bytes.get(DEV_TEST_PREFIX + liveMatchKey(1))).toBeUndefined();
  });

  it('provides one frozen completed season to the existing hook registry and keeps monotonic time across template changes', () => {
    activate(); systems(); let calls = 0; let frozen: Readonly<GameState> | undefined;
    registerSeasonHook('new-setup', 30, context => { calls++; frozen = context.completedSeason; });
    advanceWeeks(3);
    expect(calls).toBe(1); expect(frozen?.season).toBe(1); expect(frozen?.week).toBe(3);
    expect(Object.isFrozen(frozen)).toBe(true); expect(Object.isFrozen(frozen?.competitions)).toBe(true);
    expect(elapsedInterval(getState())).toBe(4);
    const next = structuredClone(getState()); next.competitions!.calendar = { ...next.competitions!.calendar!, status:'active', season:2, slots:Array.from({length:5},(_,i)=>({id:i+1,kind:'rest'})) };
    expect(elapsedInterval(next)).toBe(4); expect(getState().money).toBe(frozen!.money);
  });

  it('exports the interval start after the player finishes while another grouped hold is outstanding', () => {
    activate(); systems(); save(getState()); const before=JSON.stringify(getState());
    registerTickHook('held-rival',40,ctx=>ctx.hold?.());
    advanceWeek(); finish(); expect(weekHeld()).toBe(true);
    const exported=JSON.parse(exportSave(getState()));
    expect(exported.competitions).toEqual(JSON.parse(before).competitions);
    expect(exported.squad).toEqual(JSON.parse(before).squad);
    expect(exported.rngSeed).toBe(JSON.parse(before).rngSeed);
    resumeWeek(); expect(weekHeld()).toBe(false); expect(getState().week).toBe(2);
  });

  it('cancels an unused third series game and does not consume its XP, income or interval', () => {
    const state=prototype(); const entrantIds=state.competitions!.instances[0]!.entrantIds;
    const definition:CompetitionDefinition={...cupDefinition(),id:'series',format:{kind:'series',winsRequired:2},minEntrants:2,maxEntrants:2,slotCount:3,
      stages:[{id:'series',name:'Series',kind:'series',rounds:3}],rewards:[],venues:{rounds:'alternating',final:'same-as-rounds'}};
    const event=createCompetitionInstance(definition,1,0,entrantIds); event.status='scheduled'; event.stageId='series';
    event.fixtures=[1,2,3].map(slot=>({id:competitionFixtureId(event.id,slot-1),competitionId:event.id,stageId:'series',round:slot,slot,homeId:entrantIds[0]!,awayId:entrantIds[1]!,neutral:false,status:'scheduled'}));
    state.competitions!.instances=[event]; activate(state);
    for(let slot=1;slot<=2;slot++) {
      const fixture=fixtureBridge(currentCalendarFixtures(getState())[0]!);
      setState(finaliseCalendarFixture(getState(),fixture,{homeScore:10,awayScore:0}));
      advanceWeek();
    }
    expect(getState().season).toBe(2); expect(getState().competitions!.calendar!.elapsedIntervals).toBe(2);
    expect(getState().competitions!.instances[0]!.fixtures[2]!.status).toBe('cancelled');
  });
});
