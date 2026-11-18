import { entrySnapshots } from '../data/leagueCareerFixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld, withFastForward } from '../../src/core/time';
import { initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { forfeitResult, playerMatchPending, registerPlayerMatchSystem } from '../../src/systems/matchday';
import * as jobs from '../../src/systems/matchJobs';
import type { MatchResult } from '../../src/sim/events';
import { bus, type Events } from '../../src/core/events';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { __setStorage, __unlockSaves, saveIfChanged } from '../../src/core/save';

afterEach(() => {vi.restoreAllMocks();vi.unstubAllGlobals();clearHeldWeek();clearTickHooks();clearSeasonHooks();bus.clear();setCareerNamespace(null);__setStorage(null);});
describe('async result ownership across fresh careers', () => {
  it('quarantines an invalid same-installation watched completion without applying it or clearing its saved interval/sidecar', () => {
    const bytes=new Map<string,string>();const storage={getItem:(key:string)=>bytes.get(key)??null,
      setItem:(key:string,value:string)=>{bytes.set(key,value);},removeItem:(key:string)=>{bytes.delete(key);}};
    vi.stubGlobal('localStorage',storage);__setStorage(storage);__unlockSaves();setCareerNamespace(DEV_TEST_PREFIX);
    createNewGame('Watched quarantine',573);const s=setupStructuralDivisionCareer(AU_CAREER_PROFILE,573);const c=s.competitions!;
    c.leagueCareer={version:1,scheduleSeed:573,clubId:s.clubId,phase:'active',
      initialFields:Object.fromEntries(c.world!.divisions.map(d=>[d.id,[...c.instances.find(i=>i.id===d.instanceId)!.entrantIds]])),
      access:[{leagueId:c.world!.profile.startingDivisionId}],accepted:{season:1,startInterval:0,leagueId:c.world!.profile.startingDivisionId,
        ...entrySnapshots(c, 1, c.world!.profile.startingDivisionId), receiptId:leagueEntryReceiptId(c.world!.profile.id,1,s.clubId,c.world!.profile.startingDivisionId),allocationPolicy:'adjacent-vacancy-v1',movements:[]}};
    setState(s);expect(saveIfChanged(getState())).toBe(true);const original=bytes.get(DEV_TEST_PREFIX+slotKey(1));
    let started: Events['match:started'] | undefined;bus.on('match:started',value=>{started=value;});const blocked=vi.fn();bus.on('week:blocked',blocked);
    registerPlayerMatchSystem();advanceWeek();expect(started).toBeDefined();expect(weekHeld()).toBe(true);expect(playerMatchPending()).toBe(true);
    const sidecar=bytes.get(DEV_TEST_PREFIX+liveMatchKey(1));expect(sidecar).toBeDefined();
    setState({boardLoan:{owed:1}});const invalid=getState();expect(failedIntervalProblem()).toBeNull();
    const result:MatchResult={homeScore:12,awayScore:0,events:[],injuries:[],stats:{possession:[50,50],tackles:[0,0],errors:[0,0],tries:[0,0]},weather:'clear',momentumTimeline:[]};
    bus.emit('match:finished',{fixture:started!.fixture,result});
    expect(weekHeld()).toBe(false);expect(playerMatchPending()).toBe(false);expect(failedIntervalProblem()).not.toBeNull();expect(blocked).toHaveBeenCalledTimes(1);
    expect(getState()).toBe(invalid);expect(bytes.get(DEV_TEST_PREFIX+slotKey(1))).toBe(original);expect(bytes.get(DEV_TEST_PREFIX+liveMatchKey(1))).toBe(sidecar);
    advanceWeek();expect(saveIfChanged(getState())).toBe(false);bus.emit('match:finished',{fixture:started!.fixture,result});
    expect(getState()).toBe(invalid);expect(blocked).toHaveBeenCalledTimes(1);expect(bytes.get(DEV_TEST_PREFIX+liveMatchKey(1))).toBe(sidecar);
  });
  it.each(['player','rivals'] as const)('a stale %s worker answer cannot mutate a fresh same-profile interval or release its hold', async owner => {
    const pending: Array<{resolve: (r: MatchResult[]) => void; count: number}> = [];
    vi.spyOn(jobs,'canUseWorker').mockReturnValue(true);
    vi.spyOn(jobs,'playMatchesInWorker').mockImplementation(input => new Promise(resolve => {pending.push({resolve,count:input.length});}));
    const start = (): void => {
      createLegacyGame('Same profile',573);initLeague(getState());
      if(owner==='player') registerPlayerMatchSystem();
      else {registerFixturesSystem();setState({settings:{...getState().settings,liveRivals:true}});}
      if(owner==='player') withFastForward(advanceWeek,{holds:true});else advanceWeek();
    };
    start();expect(weekHeld()).toBe(true);start();expect(weekHeld()).toBe(true);expect(pending).toHaveLength(2);
    const current=getState();const result: MatchResult={...forfeitResult({homeId:'player',awayId:'other'}),events:[],injuries:[],
      stats:{possession:[50,50],tackles:[0,0],errors:[0,0],tries:[0,0]},weather:'clear',momentumTimeline:[]};
    pending[0]!.resolve(Array.from({length:pending[0]!.count},()=>result));
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(getState()).toBe(current);expect(weekHeld()).toBe(true);
    pending[1]!.resolve(Array.from({length:pending[1]!.count},()=>result));
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(weekHeld()).toBe(false);expect(getState().week).toBe(2);
  });
});
