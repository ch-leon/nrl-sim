import { startLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { entrySnapshots } from '../data/leagueCareerFixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { buildNewGameState, createNewGame, getState, setState, loadState } from '../../src/core/state';
import { advanceUntil } from '../../src/core/advance';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, weekHeld, withFastForward } from '../../src/core/time';
import { getCurrentFixture, initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { forfeitResult, playerMatchPending, registerPlayerMatchSystem, resumePlayerMatch } from '../../src/systems/matchday';
import { readLiveMatch } from '../../src/systems/liveMatchRecord';
import * as rivalRound from '../../src/systems/rivalRound';
import * as jobs from '../../src/systems/matchJobs';
import type { MatchResult } from '../../src/sim/events';
import { bus, type Events } from '../../src/core/events';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, saveMetaKey, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { __setStorage, __unlockSaves, saveIfChanged, exportSave, enableAutosave, pendingLeagueSaveProblem, downloadSave, exportFilename, installImportedSave, flushSaveMeta, getSlotMeta, loadSlot, setActiveSlot, writeSlot } from '../../src/core/save';

afterEach(() => {vi.restoreAllMocks();vi.unstubAllGlobals();clearHeldWeek();clearTickHooks();clearSeasonHooks();bus.clear();setCareerNamespace(null);__setStorage(null);});
function installStorage() {
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { bytes.set(key, value); },
    removeItem: (key: string) => { bytes.delete(key); },
  };
  vi.stubGlobal('localStorage', storage);
  __setStorage(storage);
  __unlockSaves();
  setActiveSlot(1);
  return bytes;
}

function startLeagueMatch() {
  const bytes = installStorage();
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
  it('only the kick-off fixture completes a resumed League match and delivers its committed and full-time events', () => {
    startLeagueMatch();
    const earlier = getCurrentFixture(getState(), getState().clubId)!;
    const started: Events['match:started'][] = [];
    bus.on('match:started', value => { started.push(value); });
    const report = vi.fn();
    bus.on('match:committed', report);
    registerPlayerMatchSystem();
    registerFixturesSystem();
    advanceWeek();
    const kickoff = started[0]!.fixture;
    expect(earlier).toEqual(kickoff);
    expect(earlier).not.toBe(kickoff);
    const held = getState();
    for (const equivalent of [earlier, structuredClone(kickoff)]) {
      bus.emit('match:finished', {fixture:equivalent, result:matchResult()});
      expect(getState()).toBe(held);
      expect(playerMatchPending()).toBe(true);
      expect(report).not.toHaveBeenCalled();
    }
    expect(resumePlayerMatch()).toBe(true);
    expect(started[1]!.fixture).toBe(kickoff);
    const fullTime = vi.fn();
    bus.on('match:finished', event => fullTime(event.fixture, getState().week));
    const result = matchResult();
    bus.emit('match:finished', {fixture:started[1]!.fixture, result});
    expect(report).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith({fixture:kickoff, result});
    expect(fullTime).toHaveBeenCalledOnce();
    expect(fullTime).toHaveBeenCalledWith(kickoff, 2);
    expect(weekHeld()).toBe(false);
  });

  it('an old exact fixture and its clone cannot complete a new same-seed League match', () => {
    startLeagueMatch();
    const source = structuredClone(getState());
    const started: Events['match:started'][] = [];
    bus.on('match:started', value => { started.push(value); });
    const report = vi.fn();
    bus.on('match:committed', report);
    registerPlayerMatchSystem();
    advanceWeek();
    const old = started[0]!.fixture;
    loadState(source);
    advanceWeek();
    expect(started[1]!.fixture).toEqual(old);
    expect(started[1]!.fixture).not.toBe(old);
    const replacement = getState();
    for (const fixture of [old, structuredClone(old)]) {
      bus.emit('match:finished', {fixture, result:matchResult()});
      expect(getState()).toBe(replacement);
      expect(playerMatchPending()).toBe(true);
    }
    expect(report).not.toHaveBeenCalled();
    expect(failedIntervalProblem()).toBeNull();
  });

  it('blocks a held token whose own career cursor changed, while preserving the saved match', () => {
    const {bytes, original} = startLeagueMatch();
    let started: Events['match:started'] | undefined;
    bus.on('match:started', value => { started = value; });
    const blocked = vi.fn();
    bus.on('week:blocked', blocked);
    registerPlayerMatchSystem();
    advanceWeek();
    const sidecarKey = DEV_TEST_PREFIX + liveMatchKey(1), sidecar = bytes.get(sidecarKey);
    setState({week: 2});
    bus.emit('match:finished', {fixture: started!.fixture, result: matchResult()});
    expect(weekHeld()).toBe(false);
    expect(failedIntervalProblem()).toBeTruthy();
    expect(blocked).toHaveBeenCalledOnce();
    expect(bytes.get(sidecarKey)).toBe(sidecar);
    expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(original);
  });

  it('wakes the waiting advance after a worker returns to a corrupted cursor or a replaced career', async () => {
    for (const change of ['cursor', 'replacement'] as const) {
      const {original, bytes} = startLeagueMatch();
      let finish: ((results: MatchResult[]) => void) | undefined;
      vi.spyOn(jobs, 'canUseWorker').mockReturnValue(true);
      vi.spyOn(jobs, 'playMatchesInWorker').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
      registerPlayerMatchSystem();
      const run = advanceUntil({kind:'weeks', weeks:1});
      expect(weekHeld()).toBe(true);
      if (change === 'cursor') setState({week:2});
      else loadState(structuredClone(getState()));
      const notices = vi.fn();
      const off = bus.on('ui:notify', notices);
      finish!([matchResult()]);
      expect(await run).toMatchObject({weeksPlayed:0, stop:{kind:'stopped'}});
      expect(!!failedIntervalProblem()).toBe(change === 'cursor');
      if (change === 'replacement') expect(notices).not.toHaveBeenCalled();
      expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(original);
      off();
      clearHeldWeek();
    }
  });

  it('stops the retired result after an observer starts a replacement match and returns normally', () => {
    const {bytes} = startLeagueMatch();
    const replacement = structuredClone(getState());
    const matches: Events['match:started'][] = [];
    bus.on('match:started', value => { matches.push(value); });
    registerPlayerMatchSystem();
    advanceWeek();
    let expected: string | undefined, sidecar: string | undefined;
    const key = DEV_TEST_PREFIX + liveMatchKey(1);
    const off = bus.on('state:changed', () => {
      off();
      loadState(replacement);
      advanceWeek();
      expected = JSON.stringify(getState());
      sidecar = bytes.get(key);
    });
    const attempted = vi.fn();
    bus.on('money:changed', () => { if (expected) attempted('money'); });
    bus.on('ui:notify', () => { if (expected) attempted('notice'); });
    bus.on('match:committed', () => attempted('presentation'));
    bus.on('match:finished', () => { if (expected) attempted('retired full time'); });
    const result = matchResult();
    result.injuries = [{teamId: replacement.clubId, playerId: replacement.squad[0]!.id, playerName: replacement.squad[0]!.name, weeks: 9}];
    bus.emit('match:finished', {fixture: matches[0]!.fixture, result});
    expect(matches).toHaveLength(2);
    expect(JSON.stringify(getState())).toBe(expected);
    expect(playerMatchPending()).toBe(true);
    expect(failedIntervalProblem()).toBeNull();
    expect(bytes.get(key)).toBe(sidecar);
    expect(attempted).not.toHaveBeenCalled();
  });

  it('holds a settled watched week for storage retry without overwriting its checkpoint or starting another match', async () => {
    const {bytes, original} = startLeagueMatch();
    const matches: Events['match:started'][] = [];
    bus.on('match:started', value => { matches.push(value); });
    const advanced = vi.fn();
    bus.on('week:advanced', advanced);
    registerPlayerMatchSystem();
    registerFixturesSystem();
    advanceWeek();
    const off = enableAutosave({});
    try {
      const saveKey = DEV_TEST_PREFIX + slotKey(1), matchKey = DEV_TEST_PREFIX + liveMatchKey(1);
      const sidecar = bytes.get(matchKey);
      const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === saveKey) throw new Error('Slot quota');
        bytes.set(key, value);
      });
      bus.emit('match:finished', {fixture: matches[0]!.fixture, result: matchResult()});
      expect(getState().week).toBe(2);
      const settled = getState();
      const run = await advanceUntil({kind:'weeks', weeks:3});
      expect(run).toMatchObject({weeksPlayed:0, stop:{kind:'stopped'}});
      expect(run.stop.text).toMatch(/save|saving|storage/i);
      advanceWeek();
      advanceWeeks(4);
      expect(getState()).toBe(settled);
      expect(bytes.get(saveKey)).toBe(original);
      expect(bytes.get(matchKey)).toBe(sidecar);
      const file = JSON.parse(exportSave(getState()));
      expect(file.nrlLiveMatch).toEqual(JSON.parse(sidecar!));
      delete file.nrlLiveMatch;
      expect(JSON.stringify(file)).toBe(original);
      expect(matches).toHaveLength(1);
      expect(advanced).toHaveBeenCalledOnce();
      write.mockRestore();
      expect(saveIfChanged(settled)).toBe(true);
      expect(bytes.get(saveKey)).toBe(JSON.stringify(settled));
      expect(bytes.get(matchKey)).toBeUndefined();
      expect(advanced).toHaveBeenCalledOnce();
      advanceWeek();
      expect(weekHeld() || getState().week === 3).toBe(true);
    } finally { off(); }
  });

  it.each(['pending', 'quarantined', 'isolated prototype'] as const)('exports and resumes the actual kick-off checkpoint and parked calls when %s', async status => {
    let bytes: Map<string,string>;
    const prototype = status === 'isolated prototype';
    if (prototype) {
      bytes = startLeagueMatch().bytes;
      const competitions = {...getState().competitions!};
      delete competitions.leagueCareer;
      setState({competitions});
      expect(saveIfChanged(getState())).toBe(true);
    } else {
      bytes = installStorage();
      setCareerNamespace(null);
      const started = await startLeagueCareer({clubName:'Normal recovery',seed:573});
      expect(started.ok).toBe(true);
      const leagueId = AU_CAREER_PROFILE.startingDivisionId;
      const preview = previewLeagueEntry(getState(),leagueId);
      if (!preview.ok) throw new Error(preview.message);
      expect(confirmLeagueEntry({leagueId,previewKey:preview.preview.previewKey}).ok).toBe(true);
    }
    const prefix = prototype ? DEV_TEST_PREFIX : '';
    const saveKey = prefix + slotKey(1), matchKey = prefix + liveMatchKey(1);
    const source = bytes.get(saveKey)!;
    const matches: Events['match:started'][] = [];
    bus.on('match:started', value => { matches.push(value); });
    registerPlayerMatchSystem();
    registerFixturesSystem();
    advanceWeek();
    const live = matches[0]!.live;
    const calls = [{tick:1, side:'home' as const, call:'hit-up' as const}];
    expect(live.onProgress?.(calls, 47, [])).toBe(true);
    const sidecar = bytes.get(matchKey)!;
    if (status === 'pending') {
      vi.spyOn(localStorage, 'setItem').mockImplementation((k,v) => {
        if (k === saveKey) throw new Error('Slot quota');
        bytes.set(k, v);
      });
    } else {
      const c = getState().competitions!;
      setState({competitions:{...c, calendar:{...c.calendar!, status:'awaiting-next-season'}}});
    }
    bus.emit('match:finished', {fixture:matches[0]!.fixture, result:matchResult()});
    if (status === 'pending') expect(pendingLeagueSaveProblem()).toBeTruthy();
    else expect(failedIntervalProblem()).toBeTruthy();
    const file = exportSave(getState());
    const envelope = JSON.parse(file);
    expect(envelope.nrlLiveMatch).toEqual(JSON.parse(sidecar));
    delete envelope.nrlLiveMatch;
    expect(JSON.stringify(envelope)).toBe(source);
    expect(bytes.get(saveKey)).toBe(source);
    expect(bytes.get(matchKey)).toBe(sidecar);

    if (status === 'pending') {
      const a = {href:'', download:'', click:vi.fn(), remove:vi.fn()};
      vi.stubGlobal('document', {createElement:() => a, body:{appendChild:vi.fn()}});
      const notice = vi.fn();
      bus.on('ui:notify', notice);
      downloadSave(getState());
      expect(a.download).toBe(exportFilename(JSON.parse(source)));
      expect(notice).toHaveBeenCalledWith(expect.objectContaining({text:expect.stringMatching(/saved|start/i)}));
    }
    if (!prototype) {
      const record = JSON.parse(sidecar);
      bytes.set(matchKey, JSON.stringify({...record, fixtureId: record.fixtureId + '-foreign'}));
      expect(() => exportSave(getState())).toThrow();
      expect(bytes.get(saveKey)).toBe(source);
      bytes.set(matchKey, 'unreadable');
      expect(() => exportSave(getState())).toThrow();
      bytes.delete(matchKey);
      expect(exportSave(getState())).toBe(source);
      bytes.set(matchKey, sidecar);
      bytes.set(saveKey, JSON.stringify({...JSON.parse(source), clubName:'Replaced slot'}));
      expect(() => exportSave(getState())).toThrow();
      bytes.set(saveKey, source);
      try {
        setCareerNamespace(DEV_TEST_PREFIX);
        bytes.set(DEV_TEST_PREFIX + slotKey(1), source);
        expect(() => exportSave(getState())).toThrow();
        setCareerNamespace(null);
        setActiveSlot(2);
        bytes.set(slotKey(2), source);
        expect(() => exportSave(getState())).toThrow();
      } finally { setActiveSlot(1); setCareerNamespace(null); }
    }
    if (!prototype) {
      // Both real recovery exports must refuse either storage failure. The pending
      // export replaces an occupied slot; the quarantined export uses an empty one.
      bytes.delete(slotKey(2));
      if (status === 'pending') {
        expect(writeSlot(2, buildNewGameState('Original destination', 80))).toBe(true);
        bytes.set(liveMatchKey(2), JSON.stringify({...JSON.parse(sidecar), tick: 5}, null, 2));
      }
      flushSaveMeta();
      const before = [slotKey(2), saveMetaKey(2), liveMatchKey(2)].map(key => bytes.get(key));
      const meta = getSlotMeta(2);
      for (const failingKey of [liveMatchKey(2), slotKey(2)]) {
        const fault = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
          if (key === failingKey) throw new Error('Destination quota');
          bytes.set(key, value);
        });
        const refused = installImportedSave(file, 2);
        fault.mockRestore();
        expect(refused).toMatchObject({ok: false, message: expect.stringMatching(/match/i)});
        flushSaveMeta();
        expect([slotKey(2), saveMetaKey(2), liveMatchKey(2)].map(key => bytes.get(key))).toEqual(before);
        expect(getSlotMeta(2)).toEqual(meta);
        expect(bytes.get(saveKey)).toBe(source);
        expect(bytes.get(matchKey)).toBe(sidecar);
      }
    }
    const installed = installImportedSave(file, 2);
    expect(installed.ok).toBe(true);
    setActiveSlot(2);
    try {
      const loaded = loadSlot();
      if (loaded.status !== 'ok') throw new Error('The exported checkpoint did not load');
      loadState(loaded.state);
      expect(readLiveMatch()).toEqual(JSON.parse(sidecar));
      advanceWeek();
      expect(matches[1]!.fixture).toEqual(matches[0]!.fixture);
      expect(matches[1]!.live).toMatchObject({calls, resumeAt:47, seed: live.seed});
      expect(bytes.get(saveKey)).toBe(source);
      expect(bytes.get(matchKey)).toBe(sidecar);
    } finally { setActiveSlot(1); }
  });

  it.each(['advance', 'replacement'] as const)('a pending write is bound to the settled career when resuming by %s', async route => {
    const {bytes} = startLeagueMatch();
    const source = structuredClone(getState());
    const matches: Events['match:started'][] = [];
    bus.on('match:started', value => { matches.push(value); });
    const advanced = vi.fn();
    bus.on('week:advanced', advanced);
    registerPlayerMatchSystem();
    registerFixturesSystem();
    advanceWeek();
    const slot = DEV_TEST_PREFIX + slotKey(1), sidecarKey = DEV_TEST_PREFIX + liveMatchKey(1);
    const retained = bytes.get(sidecarKey);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === slot) throw new Error('Slot quota');
      bytes.set(key, value);
    });
    bus.emit('match:finished', {fixture:matches[0]!.fixture, result:matchResult()});
    expect(pendingLeagueSaveProblem()).toBeTruthy();
    expect(advanced).toHaveBeenCalledOnce();
    write.mockRestore();
    if (route === 'advance') {
      const run = await advanceUntil({kind:'weeks', weeks:1});
      expect(run.weeksPlayed).toBe(1);
      expect(getState().week).toBe(3);
      expect(advanced).toHaveBeenCalledTimes(2);
      expect(bytes.has(sidecarKey)).toBe(false);
    } else {
      loadState(source);
      expect(bytes.get(sidecarKey)).toBe(retained);
      advanceWeek();
      expect(matches).toHaveLength(2);
      expect(playerMatchPending()).toBe(true);
      expect(bytes.has(sidecarKey)).toBe(true);
      expect(advanced).toHaveBeenCalledOnce();
    }
    expect(pendingLeagueSaveProblem()).toBeNull();
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
