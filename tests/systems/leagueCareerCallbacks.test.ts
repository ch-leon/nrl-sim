import { entrySnapshots } from '../data/leagueCareerFixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { createNewGame, getState, setState, loadState } from '../../src/core/state';
import { advanceUntil } from '../../src/core/advance';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld, withFastForward } from '../../src/core/time';
import { initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { forfeitResult, playerMatchPending, registerPlayerMatchSystem } from '../../src/systems/matchday';
import * as rivalRound from '../../src/systems/rivalRound';
import * as jobs from '../../src/systems/matchJobs';
import type { MatchResult } from '../../src/sim/events';
import { bus, type Events } from '../../src/core/events';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { __setStorage, __unlockSaves, saveIfChanged, exportSave } from '../../src/core/save';

afterEach(() => {vi.restoreAllMocks();vi.unstubAllGlobals();clearHeldWeek();clearTickHooks();clearSeasonHooks();bus.clear();setCareerNamespace(null);__setStorage(null);});
function startLeagueMatch() {
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); },
    removeItem: (key: string) => { bytes.delete(key); },
  };
  vi.stubGlobal('localStorage', storage);
  __setStorage(storage);
  __unlockSaves();
  setCareerNamespace(DEV_TEST_PREFIX);
  createNewGame('Watched quarantine', 573);
  const state = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573);
  const competitions = state.competitions!;
  const {profile, divisions} = competitions.world!;
  const leagueId = profile.startingDivisionId;
  competitions.leagueCareer = {
    version: 1, scheduleSeed: 573, clubId: state.clubId, phase: 'active',
    initialFields: Object.fromEntries(divisions.map(d => [d.id, [...competitions.instances.find(i => i.id === d.instanceId)!.entrantIds]])),
    access: [{leagueId}],
    accepted: {season: 1, startInterval: 0, leagueId, ...entrySnapshots(competitions, 1, leagueId),
      receiptId: leagueEntryReceiptId(profile.id, 1, state.clubId, leagueId), allocationPolicy: 'adjacent-vacancy-v1', movements: []},
  };
  setState(state);
  expect(saveIfChanged(getState())).toBe(true);
  return {bytes, original: bytes.get(DEV_TEST_PREFIX + slotKey(1))!};
}

function matchResult(): MatchResult {
  return {homeScore:12, awayScore:0, events:[], injuries:[], stats:{possession:[50,50],tackles:[0,0],errors:[0,0],tries:[0,0]},weather:'clear',momentumTimeline:[]};
}

describe('async result ownership across fresh careers', () => {
  it('quarantines an invalid same-installation watched completion without applying it or clearing its saved interval/sidecar', () => {
    const { bytes, original } = startLeagueMatch();
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
  it.each(['watched','worker'] as const)('a partially applied %s result preserves the checkpoint and blocks further work', async path => {
    const { bytes, original } = startLeagueMatch();
    let started: Events['match:started'] | undefined;
    bus.on('match:started', value => { started = value; });
    const blocked = vi.fn();
    bus.on('week:blocked', blocked);
    const result = matchResult();
    // The sporting result and accounts land before matchday reads the injury list.
    Object.defineProperty(result, 'injuries', { get() { throw new Error('Injected injury failure'); } });
    registerPlayerMatchSystem();
    if (path === 'worker') {
      vi.spyOn(jobs, 'canUseWorker').mockReturnValue(true);
      vi.spyOn(jobs, 'playMatchesInWorker').mockResolvedValue([result]);
      const run = await advanceUntil({kind: 'weeks', weeks: 1});
      expect(run).toMatchObject({weeksPlayed: 0, stop: {kind:'stopped'}});
    } else {
      advanceWeek();
      const sidecar = bytes.get(DEV_TEST_PREFIX + liveMatchKey(1));
      expect(sidecar).toBeDefined();
      bus.emit('match:finished', {fixture:started!.fixture, result});
      expect(bytes.get(DEV_TEST_PREFIX + liveMatchKey(1))).toBe(sidecar);
    }
    expect(blocked).toHaveBeenCalledOnce();
    expect(failedIntervalProblem()).toBeTruthy();
    expect(weekHeld()).toBe(false);
    expect(saveIfChanged(getState())).toBe(false);
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(original);
    expect(JSON.parse(exportSave(getState())).competitions).toEqual(JSON.parse(original).competitions);
  });

  it.each(['partial', 'compute failure', 'fallback failure'] as const)('handles a rival worker %s with the watched match in the same interval', async fault => {
    const { bytes } = startLeagueMatch();
    setState({ settings: {...getState().settings, liveRivals:true} });
    expect(saveIfChanged(getState())).toBe(true);
    const original = bytes.get(DEV_TEST_PREFIX + slotKey(1));
    const result = matchResult();
    vi.spyOn(rivalRound, 'canUseWorker').mockReturnValue(true);
    const fallback = vi.spyOn(rivalRound, 'playRivalJob').mockImplementation(() => {
      if (fault === 'fallback failure') throw new Error('Fallback failed');
      return result;
    });
    vi.spyOn(rivalRound, 'playRivalJobsInWorker').mockImplementation(async pending => {
      if (fault !== 'partial') throw new Error('Worker unavailable');
      return pending.map(() => result);
    });
    let watched: Events['match:started'] | undefined;
    bus.on('match:started', value => { watched = value; });
    registerPlayerMatchSystem();
    registerFixturesSystem();
    advanceWeek();
    const key = DEV_TEST_PREFIX + liveMatchKey(1);
    const sidecar = bytes.get(key);
    expect(sidecar).toBeDefined();
    bus.emit('match:finished', {fixture: watched!.fixture, result});
    expect(weekHeld()).toBe(true);
    expect(bytes.get(key)).toBe(sidecar);
    const blocked = vi.fn();
    bus.on('week:blocked', blocked);
    const landing = vi.fn();
    if (fault === 'partial') bus.on('state:changed', () => {
      landing();
      throw new Error('Observer failed after rival result publication');
    });
    await vi.waitFor(() => expect(weekHeld()).toBe(false));
    if (fault === 'compute failure') {
      expect(fallback).toHaveBeenCalled();
      expect(failedIntervalProblem()).toBeNull();
      expect(getState().week).toBe(2);
      expect(bytes.has(key)).toBe(false);
      return;
    }
    expect(blocked).toHaveBeenCalledOnce();
    if (fault === 'partial') {
      expect(landing).toHaveBeenCalledOnce();
      expect(fallback).not.toHaveBeenCalled();
    }
    expect(failedIntervalProblem()).toBeTruthy();
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(original);
    expect(bytes.get(key)).toBe(sidecar);
  });

  it('a result observer replacing the career before throwing cannot block or clear the new watched match', () => {
    const { bytes } = startLeagueMatch();
    const original = structuredClone(getState());
    const started: Events['match:started'][] = [];
    bus.on('match:started', value => { started.push(value); });
    registerPlayerMatchSystem();
    advanceWeek();
    const blocked = vi.fn();
    bus.on('week:blocked', blocked);
    let sidecar: string | undefined;
    bus.on('match:committed', () => {
      loadState(original);
      advanceWeek();
      sidecar = bytes.get(DEV_TEST_PREFIX + liveMatchKey(1));
      throw new Error('Retired match presentation');
    });
    bus.emit('match:finished', {fixture:started[0]!.fixture, result:matchResult()});
    expect(started).toHaveLength(2);
    expect(sidecar).toBeDefined();
    expect(bytes.get(DEV_TEST_PREFIX + liveMatchKey(1))).toBe(sidecar);
    expect(playerMatchPending()).toBe(true);
    expect(weekHeld()).toBe(true);
    expect(failedIntervalProblem()).toBeNull();
    expect(blocked).not.toHaveBeenCalled();
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
