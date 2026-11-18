import { describe, expect, it, vi } from 'vitest';
import { advanceUntil } from '../../src/core/advance';
import { bus, type Events } from '../../src/core/events';
import { exportSave, importSave, installImportedSave, loadSlot, pendingLeagueSaveProblem, retryPendingLeagueSave, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { getState, loadState, setState, type Fixture, type GameState } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, advanceWeeks, clearTickHooks, failedIntervalProblem, registerTickHook, TICK_ORDER, weekHeld, withFastForward } from '../../src/core/time';
import type { MatchResult } from '../../src/sim/events';
import { finaliseCalendarFixture, settleStructuralCalendar, structuralPolicyProblem } from '../../src/systems/competitionCalendar';
import * as prizes from '../../src/systems/competitionRewards';
import { getCurrentFixture, registerFixturesSystem } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { commitMatchState, freezeMatchEffects, reconcileMatchEffects } from '../../src/systems/matchIncome';
import * as jobs from '../../src/systems/matchJobs';
import * as rivals from '../../src/systems/rivalRound';
import { bytes, clone, cup, firstTieSeed, fixtureHooks, installCupTestHooks, received, setup } from '../helpers/openCupCareer';

installCupTestHooks();

const saveKey = DEV_TEST_PREFIX + slotKey(1);
const matchKey = DEV_TEST_PREFIX + liveMatchKey(1);
const roundWin = { version: 1, trigger: 'round-win', recipient: 'winner', repeat: 'each-outcome', eligibility: 'played' } as const;
const titleWin = { ...roundWin, trigger: 'title', titleEligibility: 'played-final' } as const;

function paidWeek(round: 1 | 5, liveRivals = false) {
  setup('au', true, firstTieSeed());
  fixtureHooks(true);
  advanceWeeks(round === 1 ? 6 : 18);
  clearTickHooks();
  const start = clone(getState());
  cup(start).definition.rewards = [
    { id: 'winner-cash', kind: 'cash', stageId: 'cup', round, matchBaseMultiplier: 2, basis: 'fixture-match-base', execution: roundWin },
    { id: 'winner-rep', kind: 'reputation', stageId: 'cup', round, amount: 4, execution: roundWin },
  ];
  if (round === 5) cup(start).definition.rewards.push({ id: 'cup-title', kind: 'honour', title: 'Open Cup', stageId: 'cup', round, squad: 'title-time-registered', execution: titleWin });
  start.settings.liveRivals = liveRivals;
  setState(start);
  expect(saveIfChanged(getState())).toBe(true);
  return getState();
}

function playerWin(fixture: Fixture): MatchResult {
  return { homeScore: fixture.homeId === 'player' ? 12 : 0, awayScore: fixture.awayId === 'player' ? 12 : 0,
    events: [], injuries: [], stats: { possession: [50,50], tackles: [0,0], errors: [0,0], tries: [0,0] }, weather: 'clear', momentumTimeline: [] };
}

function watch() {
  const matches: Events['match:started'][] = [];
  bus.on('match:started', match => matches.push(match));
  return matches;
}

function assertCheckpoint(start: GameState, sidecar?: string) {
  expect(failedIntervalProblem() || pendingLeagueSaveProblem()).toBeTruthy();
  expect(weekHeld()).toBe(false);
  expect(bytes.get(saveKey)).toBe(JSON.stringify(start));
  expect(bytes.get(matchKey)).toBe(sidecar);
  const file = JSON.parse(exportSave(getState()));
  expect(file.nrlLiveMatch).toEqual(sidecar ? JSON.parse(sidecar) : undefined);
  delete file.nrlLiveMatch;
  expect(JSON.stringify(file)).toBe(JSON.stringify(start));
  const before = getState();
  advanceWeek();
  expect(getState()).toBe(before);
}

function reloadCheckpoint() {
  const loaded = loadSlot(1);
  if (loaded.status !== 'ok') throw new Error('Checkpoint could not be loaded');
  loadState(loaded.state);
  expect(failedIntervalProblem()).toBeNull();
}

describe('paid developer Open Cup results', () => {
  it('publishes the final, both income receipts, reputation and the winning squad before the first money notice', () => {
    const start = paidWeek(5);
    const fixture = getCurrentFixture(start, start.clubId)!;
    const notices: Events['money:changed'][] = [];
    bus.on('money:changed', event => {
      notices.push(event);
      expect(cup()).toMatchObject({ status: 'completed', winnerId: start.clubId });
      expect(getState().matchIncome.find(r => r.fixture.id === fixture.id)?.receipt).toBeDefined();
      expect(getState().competitionRewards[0]).toMatchObject({ status: 'settled', receipts: [{ kind:'cash' }, { kind:'reputation' }, { kind:'honour' }] });
      expect(prizes.competitionHonours(getState(), start.clubId)).toHaveLength(1);
      expect(getState().reputation).toBe(start.reputation + 4);
      expect(getState().money).toBe(start.money + received() - received(start) + getState().finance[0]!.prize);
    });
    const {homeScore, awayScore} = playerWin(fixture);
    const result = {homeScore, awayScore};
    commitMatchState(finaliseCalendarFixture(start, fixture, result));
    commitMatchState(finaliseCalendarFixture(getState(), fixture, result));
    expect(notices.filter(e => e.reason === 'prize')).toMatchObject([{ booked:true, delta: getState().finance[0]!.prize, stamp:{ season:1, week:19 } }]);
    expect(getState().league.ladder).toEqual(start.league.ladder);
    expect(getState().capAccount).toEqual(start.capAccount);
    expect(getState().squad).toEqual(start.squad);
  });

  it.each(['ordinary wallet', 'ordinary book', 'prize book'] as const)('rejects %s overflow before publishing the final and allows one clean retry', fault => {
    const start = paidWeek(5);
    const fixture = getCurrentFixture(start, start.clubId)!;
    const {homeScore, awayScore} = playerWin(fixture);
    const broken = clone(start);
    if (fault === 'ordinary wallet') broken.money = Number.MAX_SAFE_INTEGER;
    else broken.finance[0]![fault === 'ordinary book' ? 'grant' : 'prize'] = Number.MAX_SAFE_INTEGER;
    const original = JSON.stringify(broken);
    const changed = vi.fn();
    bus.on('state:changed', changed);
    bus.on('money:changed', changed);
    expect(() => commitMatchState(finaliseCalendarFixture(broken, fixture, {homeScore, awayScore}))).toThrow(prizes.CompetitionRewardError);
    expect(JSON.stringify(broken)).toBe(original);
    expect(changed).not.toHaveBeenCalled();
    const next = finaliseCalendarFixture(start, fixture, {homeScore, awayScore});
    commitMatchState(next);
    expect(next.competitionRewards[0]).toMatchObject({status:'settled'});
    expect(finaliseCalendarFixture(next, fixture, {homeScore, awayScore})).toBe(next);
  });

  it('retains an accepted result and pending promise when duplicate delivery discovers a prize overflow', () => {
    const start = paidWeek(5);
    const fixture = getCurrentFixture(start, start.clubId)!;
    const {homeScore, awayScore} = playerWin(fixture);
    const promised = freezeMatchEffects(start, fixture);
    const accepted = finaliseCalendarFixture(promised, fixture, {homeScore, awayScore});
    const pending: GameState = {...promised, competitions: accepted.competitions!,
      finance: promised.finance.map(f => ({...f, prize: Number.MAX_SAFE_INTEGER}))};
    const before = JSON.stringify(pending);
    expect(() => finaliseCalendarFixture(pending, fixture, {homeScore:0, awayScore:0})).toThrow(prizes.CompetitionRewardError);
    expect(JSON.stringify(pending)).toBe(before);
    expect(cup(pending).winnerId).toBe(start.clubId);
    expect(finaliseCalendarFixture({...pending, finance:start.finance}, fixture, {homeScore:0, awayScore:0})).toEqual(accepted);
    expect(() => reconcileMatchEffects({...pending, competitionRewards:[]})).toThrow(prizes.CompetitionRewardError);
  });

  it.each(['cancelled', 'forfeit'] as const)('settles a %s final without payment, reputation, XP or a trophy', terminal => {
    const start = paidWeek(5);
    const fixture = getCurrentFixture(start, start.clubId)!;
    const pending = freezeMatchEffects(start, fixture);
    let next: GameState;
    if (terminal === 'cancelled') {
      const cancelled = clone(pending);
      const instance = cup(cancelled);
      instance.status = 'withdrawn';
      instance.fixtures.find(f => f.id === fixture.id)!.status = 'cancelled';
      next = settleStructuralCalendar(cancelled, start.week);
    } else {
      // Real matchday walkover with a registered squad that cannot take the field.
      const unfit = pending.squad.map(player => ({...player, injuredWeeks:1}));
      setState({...pending, squad:unfit});
      registerPlayerMatchSystem();
      advanceWeek();
      next = getState();
      expect(next.squad).toEqual(unfit);
      expect(cup(next).fixtures.find(f => f.id === fixture.id)!.result?.decider).toBe('forfeit');
    }
    expect(next.competitionRewards[0]).toMatchObject({status:'settled', receipts:[]});
    expect(next.money).toBe(start.money);
    expect(next.reputation).toBe(start.reputation);
    expect(prizes.competitionHonours(next, start.clubId)).toEqual([]);
    expect(reconcileMatchEffects(next)).toBe(next);
    expect(reconcileMatchEffects({...next, season:2}).competitionRewards).toEqual(next.competitionRewards);
  });

  it('requires a durable copy of unsaved pre-week edits before any paid cup hooks can run', async () => {
    const old = paidWeek(5);
    setState({clubName:'New club name'});
    const source = getState();
    const work = vi.fn();
    registerTickHook('check', 1, work);
    registerPlayerMatchSystem();
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((k, v) => { if (k !== saveKey) bytes.set(k, v); });
    const run = await advanceUntil({kind:'weeks', weeks:1});
    expect(run).toMatchObject({weeksPlayed:0, stop:{kind:'stopped'}});
    expect(work).not.toHaveBeenCalled();
    expect(getState()).toBe(source);
    expect(weekHeld()).toBe(false);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(old));
    expect(bytes.has(matchKey)).toBe(false);
    write.mockRestore();
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(source));
  });

  it.each(['watched', 'player worker', 'cheap rivals', 'live rivals', 'settle forfeits'] as const)(
    'quarantines a failed %s settlement and replays the saved interval once', async path => {
      const rival = path === 'cheap rivals' || path === 'live rivals';
      const start = paidWeek(rival ? 1 : 5, path === 'live rivals');
      const fixtures = cup(start).fixtures.filter(f => f.slot === start.week);
      const target = rival ? fixtures.filter(f => f.homeId !== start.clubId && f.awayId !== start.clubId)[1]! : fixtures.find(f => f.homeId === start.clubId || f.awayId === start.clubId)!;
      const played = watch();
      const notices: Events['money:changed'][] = [];
      bus.on('money:changed', event => notices.push(event));
      const blocked = vi.fn();
      bus.on('week:blocked', blocked);
      const realReconcile = prizes.reconcileCompetitionRewards;
      let failures = 0;
      const fault = vi.spyOn(prizes, 'reconcileCompetitionRewards').mockImplementation(state => {
        if (cup(state).fixtures.find(f => f.id === target.id)?.result) {
          failures++;
          throw new prizes.CompetitionRewardError('Injected cup settlement failure');
        }
        return realReconcile(state);
      });
      const early = vi.fn();
      registerTickHook('early', 1, () => { setState({ rngSeed:getState().rngSeed }); early(saveIfChanged(getState())); }, {trials:true});
      if (path !== 'settle forfeits') registerPlayerMatchSystem();
      if (rival) registerFixturesSystem();
      if (path === 'player worker') {
        vi.spyOn(jobs, 'canUseWorker').mockReturnValue(true);
        vi.spyOn(jobs, 'playMatchesInWorker').mockResolvedValue([playerWin(getCurrentFixture(start, start.clubId)!)]);
      }
      if (path === 'live rivals') {
        vi.spyOn(rivals, 'canUseWorker').mockReturnValue(true);
        vi.spyOn(rivals, 'playRivalJobsInWorker').mockImplementation(async group => group.map(job => playerWin(job.fixture!)));
      }
      const fallback = vi.spyOn(rivals, 'playRivalJob');
      const play = () => path === 'player worker' ? withFastForward(advanceWeek, {holds:true}) : advanceWeek();
      play();
      const sidecar = bytes.get(matchKey);
      if (path === 'watched' || path === 'live rivals') expect(sidecar).toBeDefined();
      const watched = played[0];
      if (watched && path !== 'cheap rivals') bus.emit('match:finished', {fixture:watched.fixture, result:playerWin(watched.fixture)});
      await vi.waitFor(() => expect(blocked).toHaveBeenCalledOnce());
      expect(early).toHaveBeenCalledWith(false);
      expect(failures).toBe(1);
      expect(fallback).not.toHaveBeenCalled();
      assertCheckpoint(start, sidecar);
      expect(cup().fixtures.find(f => f.id === target.id)).toMatchObject({status:'scheduled'});
      expect(cup().status).not.toBe('withdrawn');
      expect(getState().competitionRewards.filter(r => r.status === 'settled' && (r.fixtureId === target.id || rival && r.homeId !== start.clubId && r.awayId !== start.clubId))).toEqual([]);
      expect(notices.filter(e => e.reason === 'prize')).toHaveLength(path === 'live rivals' ? 1 : 0);
      const failed = getState();
      if (watched) bus.emit('match:finished', {fixture:watched.fixture, result:playerWin(watched.fixture)});
      expect(getState()).toBe(failed);
      fault.mockRestore();
      reloadCheckpoint();
      notices.length = 0;
      played.length = 0;
      play();
      if (played[0]) bus.emit('match:finished', {fixture:played[0].fixture, result:playerWin(played[0].fixture)});
      await vi.waitFor(() => expect(getState().week).toBe(start.week + 1));
      const record = getState().competitionRewards.find(r => r.fixtureId === target.id);
      expect(record?.status).toBe('settled');
      if (record?.status !== 'settled') throw new Error('Missing settlement');
      expect(record.receipts.filter(r => r.kind === 'cash')).toHaveLength(path === 'settle forfeits' ? 0 : 1);
      expect(notices.filter(e => e.reason === 'prize')).toHaveLength(path === 'settle forfeits' ? 0 : 1);
      expect(bytes.get(matchKey)).toBeUndefined();
      expect(bytes.get(saveKey)).toBe(JSON.stringify(getState()));
    });

  it('exports a held or failed paid checkpoint when kickoff generated the due final from saved semi-final scores', () => {
    const state = clone(paidWeek(5));
    const instance = cup(state);
    instance.fixtures = instance.fixtures.filter(f => f.round < 5);
    expect(structuralPolicyProblem(state)).toBeNull();
    setState(state);
    const played = watch();
    registerFixturesSystem();
    registerPlayerMatchSystem();
    const early: GameState[] = [];
    registerTickHook('export while settling', TICK_ORDER.match - 1, () => {
      early.push(JSON.parse(exportSave(getState())));
    });
    advanceWeek();
    expect(early[0]).toEqual(state);
    const sidecar = bytes.get(matchKey)!;
    const held = JSON.parse(exportSave(getState()));
    expect(held.nrlLiveMatch).toEqual(JSON.parse(sidecar));
    delete held.nrlLiveMatch;
    expect(held).toEqual(state);
    const fault = vi.spyOn(prizes, 'reconcileCompetitionRewards').mockImplementation(() => {throw new prizes.CompetitionRewardError('Final failed');});
    const fixture = played[0]!.fixture;
    bus.emit('match:finished', {fixture, result:playerWin(fixture)});
    assertCheckpoint(state, sidecar);
    fault.mockRestore();
    reloadCheckpoint();
    advanceWeek();
    const replay = played[1]!.fixture;
    expect(replay.id).toBe(fixture.id);
    bus.emit('match:finished', {fixture:replay, result:playerWin(replay)});
    expect(getState().competitionRewards).toHaveLength(1);
    expect(cup().winnerId).toBe(state.clubId);
  });

  it('preserves earned round receipts when a later final is forfeited and the season rolls over', () => {
    const start = clone(paidWeek(1));
    cup(start).definition.rewards.push({id:'champion', kind:'honour', stageId:'cup', round:5, title:'Open Cup', squad:'title-time-registered', execution:titleWin});
    setState(start);
    fixtureHooks();
    advanceWeeks(12);
    const earlier = structuredClone(getState().competitionRewards);
    expect(earlier).toHaveLength(8);
    expect(earlier.every(r => r.status === 'settled' && r.receipts.length === 2)).toBe(true);
    const prizeTotal = getState().finance[0]!.prize;
    expect(prizeTotal).toBeGreaterThan(0);
    clearTickHooks();
    registerPlayerMatchSystem();
    setState({squad:getState().squad.map(p => ({...p, injuredWeeks:1}))});
    advanceWeek();
    fixtureHooks();
    advanceWeeks(6);
    expect(getState().season).toBe(2);
    expect(getState().competitionRewards.slice(0, earlier.length)).toEqual(earlier);
    expect(getState().competitionRewards[earlier.length]).toMatchObject({status:'settled', receipts:[]});
    expect(getState().finance[0]!.prize).toBe(prizeTotal);
    expect(prizes.competitionHonours(getState(), start.clubId)).toEqual([]);
  });

  it.each(['quota','dropped write','unreadable write'] as const)('retains checkpoint and sidecar on %s until the whole settled interval is durable', failure => {
    const start = paidWeek(5);
    const played = watch();
    registerPlayerMatchSystem();
    advanceWeek();
    const sidecar = bytes.get(matchKey)!;
    let failRead = false;
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(k => {
      if (k === saveKey && failRead) { failRead = false; throw new Error('readback unavailable'); }
      return bytes.get(k) ?? null;
    });
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((k, value) => {
      if (k === saveKey && value !== JSON.stringify(start)) {
        if (failure === 'quota') throw new Error('quota');
        if (failure === 'dropped write') return;
        failRead = true;
      }
      bytes.set(k, value);
    });
    const fixture = played[0]!.fixture;
    bus.emit('match:finished', {fixture, result:playerWin(fixture)});
    const settled = getState();
    expect(settled.week).toBe(20);
    assertCheckpoint(start, sidecar);
    write.mockRestore(); read.mockRestore();
    expect(retryPendingLeagueSave()).toBeNull();
    expect(bytes.get(saveKey)).toBe(JSON.stringify(settled));
    expect(bytes.get(matchKey)).toBeUndefined();
    expect(settled.competitionRewards).toHaveLength(1);
  });

  it('finishes the interval notification when an observer throws on the storage failure', () => {
    paidWeek(5);
    const played = watch();
    registerPlayerMatchSystem();
    advanceWeek();
    const advanced = vi.fn();
    bus.on('week:advanced', advanced);
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === saveKey) throw new Error('Quota');
      bytes.set(key, value);
    });
    bus.on('ui:notify', message => { if (message.text.startsWith('Save failed')) throw new Error('Toast failed'); });
    const fixture = played[0]!.fixture;
    bus.emit('match:finished', {fixture, result:playerWin(fixture)});
    expect(advanced).toHaveBeenCalledOnce();
    expect(pendingLeagueSaveProblem()).toBeTruthy();
    write.mockRestore();
    expect(retryPendingLeagueSave()).toBeNull();
    advanceWeek();
    expect(weekHeld() || getState().week === 21).toBe(true);
  });

  it('unwinds a failed preflight and wakes the waiting advance when save and block observers throw', async () => {
    const saved = paidWeek(5);
    setState({clubName:'Unsaved edit'});
    const before = getState();
    const work = vi.fn();
    registerTickHook('before-kickoff', 1, work);
    registerPlayerMatchSystem();
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === saveKey) throw new Error('quota');
      bytes.set(key, value);
    });
    bus.on('ui:notify', message => { if (message.text.startsWith('Save failed')) throw new Error('Toast failed'); });
    bus.on('week:blocked', () => { throw new Error('Blocked observer failed'); });
    const run = await advanceUntil({kind:'weeks', weeks:1});
    expect(run).toMatchObject({weeksPlayed:0, stop:{kind:'stopped'}});
    expect(work).not.toHaveBeenCalled();
    expect(getState()).toBe(before);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(saved));
    expect(bytes.get(matchKey)).toBeUndefined();
    write.mockRestore();
    advanceWeek();
    expect(work).toHaveBeenCalledOnce();
    expect(weekHeld()).toBe(true);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(before));
  });

  it.each(['slot','namespace'] as const)('never writes unsaved edits to another destination when verification switches the %s', destination => {
    const saved = paidWeek(5);
    setState({clubName:'Unsaved edit'});
    const start = getState();
    const matches = watch();
    registerPlayerMatchSystem();
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(key => {
      if (key === saveKey) {
        if (destination === 'slot') setActiveSlot(2);
        else setCareerNamespace(null);
      }
      return bytes.get(key) ?? null;
    });
    advanceWeek();
    const otherKey = destination === 'slot' ? DEV_TEST_PREFIX + slotKey(2) : slotKey(1);
    expect(bytes.get(otherKey)).toBeUndefined();
    expect(bytes.get(saveKey)).toBe(JSON.stringify(saved));
    expect(getState()).toBe(start);
    expect(matches).toHaveLength(0);
    expect(weekHeld()).toBe(false);
    expect(bytes.get(matchKey)).toBeUndefined();
    read.mockRestore();
    setActiveSlot(1);
    setCareerNamespace(DEV_TEST_PREFIX);
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(matches).toHaveLength(1);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(start));
    expect(bytes.get(otherKey)).toBeUndefined();
  });

  it('stops the old preflight when a storage read installs another career', () => {
    const saved = paidWeek(5);
    setState({clubName:'Unsaved old career edit'});
    const replacement = {...clone(saved), clubName:'Replacement career'};
    const matches = watch();
    registerPlayerMatchSystem();
    const read = vi.spyOn(localStorage, 'getItem').mockImplementation(key => {
      if (key === saveKey) loadState(replacement);
      return bytes.get(key) ?? null;
    });
    advanceWeek();
    expect(getState()).toBe(replacement);
    expect(matches).toHaveLength(0);
    expect(weekHeld()).toBe(false);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(saved));
    expect(bytes.get(matchKey)).toBeUndefined();
    read.mockRestore();
    advanceWeek();
    expect(matches).toHaveLength(1);
    expect(weekHeld()).toBe(true);
    expect(bytes.get(saveKey)).toBe(JSON.stringify(replacement));
  });

  it('ignores a stale player Worker answer after reloading the same paid checkpoint', async () => {
    const start = paidWeek(5);
    const answers: Array<(results: MatchResult[]) => void> = [];
    vi.spyOn(jobs, 'canUseWorker').mockReturnValue(true);
    vi.spyOn(jobs, 'playMatchesInWorker').mockImplementation(() => new Promise(resolve => answers.push(resolve)));
    registerPlayerMatchSystem();
    const play = () => withFastForward(advanceWeek, {holds:true});
    play();
    reloadCheckpoint();
    play();
    const current = getState();
    const result = [playerWin(getCurrentFixture(start, start.clubId)!)];
    answers[0]!(result);
    // Drain the old Promise's result handler and its finally(release).
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(getState()).toBe(current);
    expect(weekHeld()).toBe(true);
    const prize = vi.fn();
    bus.on('money:changed', event => { if (event.reason === 'prize') prize(event); });
    answers[1]!(result);
    await vi.waitFor(() => expect(weekHeld()).toBe(false));
    expect(getState().week).toBe(20);
    expect(prize).toHaveBeenCalledOnce();
  });

  it('leaves the replacement installation and its parked match alone when an old match finishes', () => {
    const first = paidWeek(5);
    const played = watch();
    registerPlayerMatchSystem();
    advanceWeek();
    loadState(clone(first));
    advanceWeek();
    const second = getState();
    const sidecar = bytes.get(matchKey);
    bus.emit('match:finished', {fixture:played[0]!.fixture, result:playerWin(played[0]!.fixture)});
    expect(getState()).toBe(second);
    expect(weekHeld()).toBe(true);
    expect(bytes.get(matchKey)).toBe(sidecar);
    const current = played[1]!.fixture;
    bus.emit('match:finished', {fixture:current, result:playerWin(current)});
    expect(getState().week).toBe(20);
    expect(getState().competitionRewards).toHaveLength(1);
  });
});

describe('isolated developer accepted-result recovery',()=>{
  function acceptedPending() {
    const state=paidWeek(1);
    const fixture=getCurrentFixture(state,state.clubId)!;
    const pending=freezeMatchEffects(state,fixture);
    const {homeScore,awayScore}=playerWin(fixture);
    const settled=finaliseCalendarFixture(state,fixture,{homeScore,awayScore});
    return {accepted:{...pending,competitions:settled.competitions!},settled};
  }
  it('inspects without paying, recovers both ledgers on load/import, and never awards twice',()=>{
    const {accepted,settled}=acceptedPending(), original=JSON.stringify(accepted);
    bytes.set(saveKey,original);
    const inspected=importSave(original);expect(inspected.ok && inspected.state.competitionRewards[0]?.status).toBe('pending');
    const loaded=loadSlot();if(loaded.status!=='ok') throw Error('DEV load refused');
    expect(loaded.state).toEqual(settled);expect(bytes.get(saveKey)).toBe(original);
    const imported=installImportedSave(original,2);if(!imported.ok) throw Error(imported.message);
    expect(imported.state).toEqual(settled);
    expect(loadSlot(2)).toMatchObject({status:'ok',state:settled});
    const reimport=installImportedSave(JSON.stringify(imported.state),2);
    expect(reimport.ok && reimport.state).toEqual(settled);
    setCareerNamespace(null);
    expect(installImportedSave(original,2).ok).toBe(false);
  });
  it.each(['overflow','missing promise'] as const)('preserves source, installed career and occupied destination on %s',fault=>{
    const {accepted,settled}=acceptedPending(), broken=clone(accepted);
    if(fault==='overflow') broken.money=Number.MAX_SAFE_INTEGER;else broken.competitionRewards=[];
    const file=JSON.stringify(broken), destination=DEV_TEST_PREFIX+slotKey(2), sidecar=DEV_TEST_PREFIX+liveMatchKey(2);
    const original=JSON.stringify(getState()); const installed=getState();
    bytes.set(saveKey,file);bytes.set(destination,original);bytes.set(sidecar,'saved match');
    expect(loadSlot().status).toBe('corrupt');
    expect(installImportedSave(file,2).ok).toBe(false);
    expect(bytes.get(saveKey)).toBe(file);expect(bytes.get(destination)).toBe(original);
    expect(bytes.get(sidecar)).toBe('saved match');expect(getState()).toBe(installed);
    const retry=installImportedSave(JSON.stringify(accepted),2);
    expect(retry.ok && retry.state).toEqual(settled);
  });
});
