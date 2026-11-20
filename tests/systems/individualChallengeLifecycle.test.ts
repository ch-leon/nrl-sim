import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preparePack } from '../../src/content';
import { advanceUntil } from '../../src/core/advance';
import { bus, type Events } from '../../src/core/events';
import { __setStorage, installImportedSave, loadSlot, migrateState, pendingLeagueSaveProblem,
  retryPendingLeagueSave, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { getState, loadState, setState, type GameState } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { bootNativeMirror } from '../../src/core/storage/native';
import * as native from '../../src/core/storage/nativeCheckpoint';
import { fileForKey, type NativeFiles } from '../../src/core/storage/nativeMirror';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, weekHeld, withFastForward } from '../../src/core/time';
import { addFacility, spendMoney } from '../../src/data/club';
import { CHALLENGE_RATINGS, type ChallengeActor, type ChallengeEditionId } from '../../src/data/individualChallengeRules';
import { advanceChallengeProgress, challengeCheckpoint, challengeClashRoll, initialChallengeProgress, replayChallenge, resolveChallengeAction } from '../../src/systems/individualChallengeEngine';
import { validateIndividualChallenges } from '../../src/systems/individualChallengeEvidence';
import { createChallengePolicy } from '../../src/systems/individualChallengePolicy';
import { challengeEngines } from '../../src/data/individualChallenges';
import { registerAllSystems } from '../../src/qa/soak';
import { confirmPlayerSale, quotePlayerSale } from '../../src/systems/playerTransfers';
import { signPlayer } from '../../src/systems/freeagency';
import { registerFixturesSystem } from '../../src/systems/fixtures';
import { acknowledgeChallengeOutcome, captureChallengeAction, challengeAdvanceProblem,
  challengeOutcomeVisible, confirmChallengeAction } from '../../src/systems/individualChallengeCommit';
import { changeChallenge, challengeHonours, challengeQualified, currentIndividualChallenge,
  dueIndividualChallenge, settleIndividualChallenge, type ChallengeAction } from '../../src/systems/individualChallenges';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { commitLineup } from '../../src/systems/lineup';
import { awayPlayerIds, campDisposalProblem } from '../../src/systems/playerAssignments';
import { hireStaff } from '../../src/systems/staff';
import { registerTrainingSystem, spendSquadPoint } from '../../src/systems/training';
import { MATCH_ENGINE_REVISION, matchEngineIdentity } from '../../src/systems/matchEngineIdentity';

/** The match-engine revision a captured sidecar was saved under ("nrl-live-6-…" → 6). */
const recordedRevision = (engineId: string) => Number(/^nrl-live-(\d+)-/.exec(engineId)![1]);

function fixture(week: number, pack = 'au', suffix = ''): GameState {
  return JSON.parse(readFileSync(new URL(`../fixtures/saves/v34-challenges/v34-${pack}-week-${week}${suffix}.json`, import.meta.url), 'utf8'));
}
describe('individual challenge career format', () => {
  for (const pack of ['au','uk']) for (const week of [5,6,13,14]) it(`upgrades the genuine ${pack} week ${week} without invented contests`, () => {
    const raw = fixture(week, pack);
    const loaded = migrateState(raw);
    expect(loaded.ok && loaded.state).toEqual({ ...raw, version: 35 });
  });
  it('retains the original v34 award on the camp-completed Week 6 save', () => {
    const raw = fixture(6,'au','-camp-completed');
    const loaded = migrateState(raw);
    expect(loaded.ok && loaded.state).toEqual({...raw,version:35});
  });
  it('rejects legacy format claims carrying challenge fields before League migration', () => {
    const raw = fixture(5);
    for (const version of [28,31,32,33,34]) {
      expect(migrateState({...raw, version, individualChallenges: []}).ok).toBe(false);
      expect(migrateState({...raw, version, competitions:{...raw.competitions, individualChallenges:[]}}).ok).toBe(false);
    }
  });
});

it('books, starts, freezes the participant and completes the same six or seven clashes without advancing club time', async () => {
  const initial = {...fixture(5),version:35 as const};
  const participantId = initial.squad.find(p=>p.injuredWeeks===0 && !p.suspendedWeeks)!.id;
  const book = changeChallenge(initial, 'showground', {kind:'book',participantId});
  expect(book.ok).toBe(true);
  if (!book.ok) throw Error(book.message);
  const week6 = {...fixture(6), version:35 as const};
  const due = {...week6, competitions:{...week6.competitions!,individualChallenges:book.state.competitions!.individualChallenges!}};
  const start = changeChallenge(due, 'showground',{kind:'start'});
  if (!start.ok) throw Error(start.message);
  expect(dueIndividualChallenge(start.state)?.status).toBe('coaching');
  const finish = changeChallenge(start.state,'showground',{kind:'finish'});
  if (!finish.ok) throw Error(finish.message);
  const record = currentIndividualChallenge(finish.state,'showground')!;
  expect(record.status).toBe('ready-for-interval');
  expect([6,7]).toContain(record.contest!.clashes.length);
  expect(finish.state.squad).toBe(due.squad);
  expect(finish.state.money).toBe(due.money);
  expect(finish.state.week).toBe(6);
  expect(finish.state.rngSeed).toBe(due.rngSeed);
  expect(migrateState(JSON.parse(JSON.stringify(finish.state))).ok).toBe(true);
});


function checked(r:ReturnType<typeof changeChallenge>) {
  if (!r.ok) throw Error(r.message);
  return r.state;
}
function dueBooking() {
  const week5 = {...fixture(5),version:35 as const};
  const week6 = {...fixture(6),version:35 as const};
  const p = week5.squad.find(p=>!p.injuredWeeks && !p.suspendedWeeks && week6.squad.some(q=>q.id===p.id && !q.injuredWeeks && !q.suspendedWeeks))!;
  const booked = checked(changeChallenge(week5,'showground',{kind:'book',participantId:p.id}));
  return {...week6,competitions:{...week6.competitions!,individualChallenges:booked.competitions!.individualChallenges!}};
}

it('returns a decision stop before all raw or fast-forward clocks for a due booking', async () => {
  const source = dueBooking();
  loadState(source);
  expect(await advanceUntil({kind:'weeks',weeks:2})).toMatchObject({weeksPlayed:0,stop:{kind:'challenge-decision'}});
  advanceWeek();
  advanceWeeks(3);
  expect(getState()).toBe(source);
});

it('rejects a forged clash sample, a forged revision, and an unknown engine on import', () => {
  const coaching = checked(changeChallenge(dueBooking(),'showground',{kind:'start'}));
  const finished = checked(changeChallenge(coaching,'showground',{kind:'finish'}));
  for (const fault of ['roll','revision','engine']) {
    const bad = structuredClone(finished);
    const r = currentIndividualChallenge(bad,'showground')!;
    if (fault==='roll') Object.assign(r.contest!.clashes[0]!,{j:77});
    if (fault==='revision') r.revision++;
    if (fault==='engine') r.contest!.engineVersion=999;
    expect(migrateState(bad).ok,fault).toBe(false);
  }
});


function storage() {
  const bytes = new Map<string,string>();
  const store = {getItem:(key:string)=>bytes.get(key) ?? null,setItem:vi.fn((key:string,value:string)=>{bytes.set(key,value);}),
    removeItem:(key:string)=>{bytes.delete(key);}};
  vi.stubGlobal('localStorage',store);
  __setStorage(store);
  setActiveSlot(1);
  return {bytes,store};
}
function sidecar(pack = 'au', week = 6) {
  return JSON.parse(readFileSync(new URL(`../fixtures/saves/v34-challenges/live-matches/v34-${pack}-week-${week}.json`,import.meta.url),'utf8'));
}
afterEach(()=>{
  clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear(); __setStorage(null); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
it('refuses both imported and on-device parked due decisions, preserving the exact bytes', () => {
  const {bytes}=storage();
  const booked = dueBooking();
  const initial = {...fixture(5),version:35};
  expect(installImportedSave(JSON.stringify(initial),1).ok).toBe(true);
  const raw = bytes.get(slotKey(1));
  expect(installImportedSave(JSON.stringify({...booked,nrlLiveMatch:sidecar()}),1).ok).toBe(false);
  expect(bytes.get(slotKey(1))).toBe(raw);
  bytes.set(slotKey(1),JSON.stringify(booked));
  bytes.set(liveMatchKey(1),JSON.stringify(sidecar()));
  expect(loadSlot().status).toBe('corrupt');
  expect(bytes.get(slotKey(1))).toBe(JSON.stringify(booked));
  expect(bytes.get(liveMatchKey(1))).toBe(JSON.stringify(sidecar()));
});
it('parks a ready match and refuses gameplay effects until the clock takes ownership', () => {
  storage();
  const ready = checked(changeChallenge(checked(changeChallenge(dueBooking(),'showground',{kind:'start'})),'showground',{kind:'finish'}));
  const result = installImportedSave(JSON.stringify({...ready,nrlLiveMatch:sidecar()}),1);
  if (!result.ok) throw Error(result.message);
  loadState(result.state);
  const notices = vi.fn(), money = vi.fn();
  bus.on('ui:notify',notices); bus.on('money:changed',money);
  expect(spendMoney(1,'test')).toBe(false);
  expect(addFacility('canteen',1,1)).toBeNull();
  expect(hireStaff('welfare')).toBeNull();
  expect(notices).not.toHaveBeenCalled(); expect(money).not.toHaveBeenCalled();
  expect(getState()).toBe(result.state);
});


function select(action:ChallengeAction) {
  const result=captureChallengeAction('showground',action);
  if (!result.ok) throw Error(result.message);
  return result.selection;
}
function install(state:GameState) {
  const result=installImportedSave(JSON.stringify(state),1);
  if (!result.ok) throw Error(result.message);
  loadState(result.state);
  return result.state;
}
function coaching() {
  return checked(changeChallenge(dueBooking(),'showground',{kind:'start'}));
}
function record() { return currentIndividualChallenge(getState(),'showground')!; }

it.each(['state','install','slot','namespace','write'] as const)('refuses a stale or unverified %s command without revealing a choice',async fault=>{
  const {bytes,store}=storage();
  const original=install(coaching());
  const selection=select({kind:'call',call:'controlled'});
  if(fault==='state') setState({clubName:'Edited'});
  if(fault==='install') loadState({...original});
  if(fault==='slot') setActiveSlot(2);
  if(fault==='namespace') setCareerNamespace('test/');
  if(fault==='write') store.setItem.mockImplementation(()=>{});
  try {
    expect(await confirmChallengeAction(selection)).toMatchObject({ok:false,reason:fault==='write'?'storage':'stale'});
    expect(record().contest!.clashes).toHaveLength(0);
    expect(bytes.get(slotKey(1))).toBe(JSON.stringify(original));
  } finally { setCareerNamespace(null); setActiveSlot(1); }
});
it('preserves legal edits, rejects duplicate commits and defers the away player’s development',async()=>{
  storage();
  const original=install(coaching());
  const id=record().participantId;
  setState({training:{focus:'stamina'},squad:original.squad.map(p=>p.id===id ? {...p,name:'Renamed',unspentPoints:3}:p)});
  const before=getState();
  const selection=select({kind:'call',call:'controlled'});
  expect((await confirmChallengeAction(selection)).ok).toBe(true);
  expect(await confirmChallengeAction(selection)).toMatchObject({ok:false,reason:'stale'});
  expect(record().contest!.clashes).toHaveLength(1);
  expect(record().contest!.actor.name).not.toBe('Renamed');
  expect(getState().squad).toBe(before.squad);
  expect(getState().training.focus).toBe('stamina');
  expect(awayPlayerIds(getState()).has(id)).toBe(true);
  expect(campDisposalProblem(getState(),id)).toBeTruthy();
  expect(spendSquadPoint(id,'strength')).toBe(false);
});
it('hides a locally committed finish through failure and reload, rechecking the slot before revealing the exact retry',async()=>{
  const {bytes}=storage();
  install(coaching());
  vi.spyOn(native,'nativeCheckpointRequired').mockReturnValue(true);
  let signal:(result:native.NativeCheckpointResult)=>void = ()=>{};
  const ack=vi.spyOn(native,'acknowledgeNativeCheckpoint').mockImplementation(()=>new Promise(resolve=>{signal=resolve;}));
  const pending=confirmChallengeAction(select({kind:'finish'}));
  const saved=bytes.get(slotKey(1))!;
  expect(record().status).toBe('ready-for-interval');
  expect(challengeOutcomeVisible(getState(),'showground')).toBe(false);
  expect(challengeAdvanceProblem(getState())).toMatch(/confirm/i);
  expect(captureChallengeAction('showground',{kind:'finish'})).toMatchObject({ok:false,reason:'native'});
  expect(ack).toHaveBeenLastCalledWith(slotKey(1),saved);
  signal('timeout');
  expect(await pending).toMatchObject({ok:false,reason:'native'});
  const reloaded=loadSlot();
  if(reloaded.status!=='ok') throw Error('reload failed');
  loadState(reloaded.state);
  expect(challengeOutcomeVisible(getState(),'showground')).toBe(false);
  const old=acknowledgeChallengeOutcome('showground');
  loadState({...getState()});
  signal('confirmed');
  expect(await old).toMatchObject({ok:false,reason:'stale'});
  expect(challengeOutcomeVisible(getState(),'showground')).toBe(false);
  const retry=acknowledgeChallengeOutcome('showground');
  signal('confirmed');
  expect((await retry).ok).toBe(true);
  expect(challengeAdvanceProblem(getState())).toBeNull();
  expect(bytes.get(slotKey(1))).toBe(saved);
});
it('interrupts only a validated retired coaching engine, returning the player with the saved clashes and no purse',async()=>{
  storage();
  const started=checked(changeChallenge(coaching(),'showground',{kind:'call',call:'angle'}));
  const ready=checked(changeChallenge(started,'showground',{kind:'finish'}));
  const v=challengeEngines[started.competitions!.individualChallenges![0]!.contest!.engineVersion]!;
  const old=v.status;
  Object.assign(v,{status:'retired'});
  try{
    install(started);
    expect(captureChallengeAction('showground',{kind:'finish'})).toMatchObject({ok:false,reason:'retired'});
    const before=getState();
    expect((await confirmChallengeAction(select({kind:'interrupt'}))).ok).toBe(true);
    expect(record().status).toBe('interrupted');
    expect(record().contest!.clashes).toHaveLength(1);
    expect(getState().squad).toBe(before.squad);
    expect(getState().money).toBe(before.money);
    expect(awayPlayerIds(getState()).size).toBe(0);
    expect(record().award).toBeNull();
    expect(migrateState(getState()).ok).toBe(true);
    install(ready);
    expect(challengeAdvanceProblem(getState())).toBeNull();
    registerFixturesSystem();
    advanceWeek();
    expect(record().status).toBe('completed');
  }finally{Object.assign(v,{status:old});}
});
it('keeps the completed atomic candidate and exact original after a final write fails, then saves once',()=>{
  const {bytes,store}=storage();
  const ready = install(checked(changeChallenge(coaching(),'showground',{kind:'finish'})));
  const raw=bytes.get(slotKey(1));
  registerTrainingSystem();
  registerFixturesSystem();
  store.setItem.mockImplementation((key,value)=>{if(key!==slotKey(1)) bytes.set(key,value);});
  advanceWeek();
  expect(pendingLeagueSaveProblem()).toBeTruthy();
  expect(bytes.get(slotKey(1))).toBe(raw);
  expect(record().status).toBe('completed');
  const settled=getState();
  const award=record().award!;
  expect(settled.money).toBe(ready.money+award.cash);
  expect(settled.finance[0]!.prize).toBe(ready.finance[0]!.prize+award.cash);
  expect(challengeHonours(settled,record().participantId).length).toBe(Number(award.cash>0));
  expect(challengeQualified(settled)).toBe(award.cash>0);
  store.setItem.mockImplementation((key,value)=>{bytes.set(key,value);});
  expect(retryPendingLeagueSave()).toBeNull();
  expect(bytes.get(slotKey(1))).toBe(JSON.stringify(settled));
  expect(settleIndividualChallenge(settled)).toBe(settled);
  expect(saveIfChanged(settled,true)).toBe(true);
});


it('keeps the participant’s existing selection preference, blocks a new role and permits a chosen cover',()=>{
  storage();
  const state = install(coaching());
  const id = record().participantId;
  const next = {...state.lineup, kicker:id, captain:id};
  expect(commitLineup(next)).toBe(false);
  const starters = [...state.lineup.starters];
  const at = starters.indexOf(id);
  if(at>=0) starters[at]=null;
  expect(commitLineup({...state.lineup,starters})).toBe(true);
});
it('explicitly cancels failed departure eligibility and lets a coach cancel and rebook within the registration window',()=>{
  const due = dueBooking();
  const r = currentIndividualChallenge(due,'showground')!;
  const injured = {...due,squad:due.squad.map(p=>p.id===r.participantId ? {...p,injuredWeeks:2} : p)};
  const cancelled=checked(changeChallenge(injured,'showground',{kind:'start'}));
  expect(currentIndividualChallenge(cancelled,'showground')).toMatchObject({status:'cancelled',award:null,contest:null,reason:expect.stringMatching(/injured/i)});
  expect(challengeAdvanceProblem(cancelled)).toBeNull();
  const original={...fixture(5),version:35 as const};
  const first=checked(changeChallenge(original,'showground',{kind:'book',participantId:r.participantId}));
  const removed=checked(changeChallenge(first,'showground',{kind:'cancel'}));
  const retry=checked(changeChallenge(removed,'showground',{kind:'book',participantId:r.participantId}));
  expect(currentIndividualChallenge(retry,'showground')).toMatchObject({status:'booked',revision:3,bookingRevision:3});
  expect(migrateState(retry).ok).toBe(true);
});
it('snapshots canonical trait fields from an otherwise valid imported player',async()=>{
  storage();
  const due=dueBooking();
  const r=currentIndividualChallenge(due,'showground')!;
  install({...due,squad:due.squad.map(p=>p.id!==r.participantId ? p : {...p,traits:[{id:'workhorse',level:1,legacyNote:'inert'}]})});
  expect((await confirmChallengeAction(select({kind:'start'}))).ok).toBe(true);
  expect(record().contest!.actor.traits).toEqual([{id:'workhorse',level:1}]);
});
it('preserves reports across retirement and fixture pruning, verifying the historical fixture round',async()=>{
  storage();
  const booked=dueBooking();
  const id=currentIndividualChallenge(booked,'showground')!.participantId;
  const aged={...booked,squad:booked.squad.map(p=>p.id===id ? {...p,age:37}:p)};
  install(checked(changeChallenge(checked(changeChallenge(aged,'showground',{kind:'start'})),'showground',{kind:'finish'})));
  registerFixturesSystem();
  withFastForward(advanceWeek);
  expect(record().status).toBe('completed');
  const report=structuredClone(record());
  for(let season=1;season<=2;season++) {
    withFastForward(()=>{for(let n=getState().week;n<25;n++) advanceWeek();});
    const last = await advanceUntil({kind:'seasonEnd'});
    expect(last).toMatchObject({weeksPlayed:1,stop:{kind:'target'}});
    const closed=getState();
    expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
    const league=previewLeagueEntry(closed,closed.competitions!.world!.profile.startingDivisionId);
    if (!league.ok) throw Error(league.message);
    const entry=confirmLeagueEntry(league.preview);
    if(!entry.ok) throw Error(entry.message);
    expect(getState().competitions!.individualChallenges).toEqual([report]);
    expect(migrateState(getState()).ok).toBe(true);
  }
  expect(getState().playerPopulation.retired.some(p=>p.id===id)).toBe(true);
  expect(getState().competitions!.instances.some(i=>i.season===1)).toBe(false);
  const wrong=structuredClone(getState());
  wrong.competitions!.individualChallenges![0]!.fixtureId=report.instanceId+':f0';
  expect(migrateState(wrong).ok).toBe(false);
},30000);
it('rejects invented or out-of-range departure abilities and altered authored rivals',()=>{
  const state=coaching();
  for(const fault of ['current ability','rating range','trait level','extra rival']) {
    const bad=structuredClone(state), r=currentIndividualChallenge(bad,'showground')!;
    const actor=r.contest!.actor;
    if (fault==='current ability') {
      // Event evidence is internally coherent, but this player never had that rating.
      const p=bad.squad.find(p=>p.id===r.participantId)!;
      p.stats.strength=p.stats.strength>20 ? 10 : 50;
    }
    if (fault==='rating range') Object.assign(actor.ratings,{speed:101});
    if (fault==='trait level') Object.assign(actor,{traits:[{id:'hitman',level:7}]});
    if (fault==='extra rival') Object.assign(r.contest!.edition.opponents[2]!,{secret:2});
    expect(migrateState(bad).ok,fault).toBe(false);
  }
});

it.each([['au',6],['au',14],['uk',6],['uk',14]] as const)(
  'reopens the original v34 %s Week %i held club fixture without introducing a challenge',
  async (pack,week) => {
    await preparePack(pack);
    const {bytes} = storage();
    const raw = fixture(week,pack);
    const live = sidecar(pack,week);
    const imported = installImportedSave(JSON.stringify({...raw,nrlLiveMatch:live}),1);
    if (!imported.ok) throw Error(imported.message);
    expect(imported.repairs).toEqual([]);
    expect(imported.state).toEqual({...raw,version:35});
    loadState(imported.state);
    registerAllSystems();
    const kickoffs: Events['match:started'][] = [];
    bus.on('match:started',event => kickoffs.push(event));
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(kickoffs.map(e => [e.fixture.id,e.live.seed])).toEqual([[live.fixtureId,live.seed]]);
    // The held match is the same fixture and seed, recorded under the engine now running. On
    // the engine it was saved under (nrl-live-6-…) the original file is kept byte for byte; a
    // later MATCH_ENGINE_REVISION restarts it from kickoff, so only those fields are checked.
    const held = bytes.get(liveMatchKey(1));
    expect(JSON.parse(held!)).toMatchObject({fixtureId:live.fixtureId,seed:live.seed,engineId:matchEngineIdentity()});
    if (recordedRevision(live.engineId) === MATCH_ENGINE_REVISION) expect(held).toBe(JSON.stringify(live));
  }
);

it('preserves an installed career and its match when an import claims a future save, rule or policy version', () => {
  const {bytes} = storage();
  const existing = fixture(6);
  const held = installImportedSave(JSON.stringify({...existing,nrlLiveMatch:sidecar()}),1);
  if (!held.ok) throw Error(held.message);
  const slot = bytes.get(slotKey(1));
  const match = bytes.get(liveMatchKey(1));
  const state = coaching();
  for (const kind of ['save','engine','policy']) {
    const unsupported = structuredClone(state);
    const record = currentIndividualChallenge(unsupported,'showground')!;
    if (kind === 'save') Object.assign(unsupported,{version:36});
    if (kind === 'engine') record.contest!.engineVersion++;
    if (kind === 'policy') record.contest!.policyVersion++;
    expect(installImportedSave(JSON.stringify(unsupported),1).ok,kind).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(slot);
    expect(bytes.get(liveMatchKey(1))).toBe(match);
  }
});

it('retries a failed native outcome through the real mirror and restores the identical clash when local storage is wiped',async()=>{
  const {store,bytes} = storage();
  const files = new Map<string,string>();
  let rejectWrites = false;
  const read = async (name:string) => {
    const value = files.get(name);
    if (value === undefined) throw Error('Native file is missing');
    return value;
  };
  const directory: NativeFiles = {
    list: async () => [...files.keys()],
    exists: async name => files.has(name),
    read,
    write: async (name,value) => {
      if (rejectWrites) throw Error('Simulated native write failure');
      files.set(name,value);
    },
    rename: async (from,to) => {files.set(to,await read(from)); files.delete(from);},
    remove: async name => {files.delete(name);}
  };
  const boot = () => bootNativeMirror({ios:true,storage:store,keys:()=>[...bytes.keys()],
    loadFiles:async()=>directory,install:__setStorage,log:()=>{}});
  try {
    expect(await boot()).toBe('active');
    install(coaching());
    rejectWrites = true;
    const result = await confirmChallengeAction(select({kind:'call',call:'angle'}));
    expect(result).toMatchObject({ok:false,reason:'native'});
    const saved = bytes.get(slotKey(1))!;
    expect(challengeOutcomeVisible(getState(),'showground')).toBe(false);
    expect(files.get(fileForKey(slotKey(1)))).not.toBe(saved);
    expect(captureChallengeAction('showground',{kind:'finish'})).toMatchObject({ok:false,reason:'native'});

    rejectWrites = false;
    expect((await acknowledgeChallengeOutcome('showground')).ok).toBe(true);
    expect(files.get(fileForKey(slotKey(1)))).toBe(saved);
    expect(challengeOutcomeVisible(getState(),'showground')).toBe(true);
    bytes.clear();
    expect(await boot()).toBe('active');
    const restored = loadSlot();
    if (restored.status !== 'ok') throw Error('Native boot did not restore the career');
    loadState(restored.state);
    expect(record().contest?.clashes).toHaveLength(1);
    expect(bytes.get(slotKey(1))).toBe(saved);
    expect(challengeOutcomeVisible(getState(),'showground')).toBe(false);
    expect((await acknowledgeChallengeOutcome('showground')).ok).toBe(true);
    expect(challengeOutcomeVisible(getState(),'showground')).toBe(true);
    expect(bytes.get(slotKey(1))).toBe(saved);
  } finally {native.beginNativeCheckpointBoot(false);}
});

it('rejects invalid completed actor snapshots even when every roll, policy choice and title probability matches that actor', () => {
  storage();
  install(checked(changeChallenge(coaching(),'showground',{kind:'finish'})));
  registerFixturesSystem();
  withFastForward(advanceWeek);
  const state = getState();
  const c = state.competitions!;
  const completed = currentIndividualChallenge(state,'showground')!;
  expect(completed.status).toBe('completed');
  const ctx = {pack:'au',season:state.season,week:state.week,clubIds:state.league.clubs.map(club=>club.id)};
  expect(validateIndividualChallenges([completed],c,ctx)).toBeNull();
  const faults: Record<string,(actor:ChallengeActor)=>void> = {
    fractional: actor=>Object.assign(actor.ratings,{strength:45.5}),
    zero: actor=>Object.assign(actor.ratings,{strength:0}),
    excessive: actor=>Object.assign(actor.ratings,{strength:101}),
    trait: actor=>Object.assign(actor,{traits:[{id:'unknown',level:1}]}),
    level: actor=>Object.assign(actor,{traits:[{id:'hitman',level:4}]}),
    duplicate: actor=>Object.assign(actor,{traits:[{id:'hitman',level:1},{id:'hitman',level:1}]}),
    name: actor=>Object.assign(actor,{name:'Someone else'})
  };
  for (const [label,alter] of Object.entries(faults)) {
    const r = structuredClone(completed);
    const contest = r.contest!;
    alter(contest.actor);
    const policy = createChallengePolicy(contest.edition,contest.actor);
    let progress = initialChallengeProgress(contest.actor);
    contest.titleProbability = policy.evaluate(progress).titleProbability;
    contest.clashes = [];
    while (!progress.result) {
      const checkpoint = challengeCheckpoint(contest.edition,contest.actor,progress)!;
      const clash = resolveChallengeAction(checkpoint,policy.choose(progress)!.call,challengeClashRoll(contest.eventSeed,progress.clashIndex));
      contest.clashes.push(clash);
      progress = advanceChallengeProgress(progress,clash);
    }
    contest.progress = progress;
    expect(replayChallenge(contest.edition,contest.actor,contest.eventSeed,contest.clashes),label).toEqual(progress);
    expect(validateIndividualChallenges([r],c,ctx),label).toBe('challenge replay');
  }
});

it('pays repeat annual titles once and accepts a different Invitational entrant after the original champion leaves',async()=>{
  storage();
  install({...fixture(5),version:35});
  registerFixturesSystem();
  // This is a controlled career to exercise repeat rewards and history, not a balance sample.
  async function playTitle(edition:ChallengeEditionId,exclude?:string) {
    const state = getState();
    const athlete = state.squad.find(p=>p.id!==exclude && !p.injuredWeeks && !p.suspendedWeeks)!;
    const ratings = Object.fromEntries(CHALLENGE_RATINGS.map(k=>[k,100]));
    setState({squad:state.squad.map(p=>p.id===athlete.id ? {...p,stats:{...p.stats,...ratings},ceilings:{...p.ceilings,...ratings}} : p)});
    async function commit(action:ChallengeAction) {
      const preview = captureChallengeAction(edition,action);
      if (!preview.ok) throw Error(preview.message);
      const result = await confirmChallengeAction(preview.selection);
      if (!result.ok) throw Error(result.message);
    }
    await commit({kind:'book',participantId:athlete.id});
    withFastForward(()=>advanceWeeks(edition==='showground' ? 6-getState().week : 14-getState().week));
    await commit({kind:'start'});
    await commit({kind:'finish'});
    const before = getState();
    expect(currentIndividualChallenge(before,edition)!.contest!.progress.result).toBe('won');
    withFastForward(advanceWeek);
    const completed = currentIndividualChallenge(getState(),edition)!;
    expect(completed.award?.cash).toBe(edition==='showground' ? 8000 : 16000);
    expect(getState().money-before.money).toBe(completed.award!.cash);
    expect(challengeHonours(getState(),athlete.id)).toContainEqual(completed);
    expect(settleIndividualChallenge(getState())).toBe(getState());
    return completed;
  }
  const first = await playTitle('showground');
  expect(challengeQualified(getState())).toBe(true);
  const sale = quotePlayerSale(getState(),first.participantId);
  if (!sale.ok) throw Error(sale.message);
  const sold = confirmPlayerSale(sale.offer);
  if (!sold.ok) throw Error(sold.message);
  expect(getState().squad.some(p=>p.id===first.participantId)).toBe(false);
  expect(challengeHonours(getState(),first.participantId)).toEqual([first]);
  withFastForward(()=>advanceWeeks(9-getState().week));
  const invite = await playTitle('invitational',first.participantId);
  expect(invite.participantId).not.toBe(first.participantId);
  withFastForward(()=>advanceWeeks(26-getState().week));
  const closed = getState();
  const preview = previewLeagueEntry(closed,closed.competitions!.world!.profile.startingDivisionId);
  if (!preview.ok) throw Error(preview.message);
  const entry = confirmLeagueEntry(preview.preview);
  if (!entry.ok) throw Error(entry.message);
  withFastForward(()=>advanceWeeks(5-getState().week));
  const cover = getState().freeAgents.some(p=> !p.injuredWeeks && !p.suspendedWeeks && signPlayer(getState(),p.id).ok);
  expect(cover).toBe(true);
  const repeat = await playTitle('showground');
  expect(repeat.id).not.toBe(first.id);
  expect(repeat.award!.cash).toBe(first.award!.cash);
  expect(getState().competitions!.individualChallenges).toEqual([first,invite,repeat]);
  expect(migrateState(getState()).ok).toBe(true);
},30000);

it('reproduces a confirmed finish with manual or one-at-a-time auto coaching across a slot reload after every clash',async()=>{
  storage();
  const original = install(coaching());
  const finish = await confirmChallengeAction(select({kind:'finish'}));
  if (!finish.ok) throw Error(finish.message);
  const batch = currentIndividualChallenge(finish.state,'showground')!.contest!;
  for (const auto of [false,true]) {
    install(original);
    if (auto) expect((await confirmChallengeAction(select({kind:'set-auto',enabled:true}))).ok).toBe(true);
    const policy = createChallengePolicy(batch.edition,batch.actor);
    for (const expected of batch.clashes) {
      const contest = record().contest!;
      const action: ChallengeAction = auto ? {kind:'auto-clash'} : {kind:'call',call:policy.choose(contest.progress)!.call};
      expect((await confirmChallengeAction(select(action))).ok).toBe(true);
      const restored = loadSlot();
      if (restored.status !== 'ok') throw Error('The committed clash did not reload.');
      loadState(restored.state);
      const clashes = record().contest!.clashes;
      expect(clashes[clashes.length-1]).toEqual(expected);
    }
    expect(record().contest!.progress).toEqual(batch.progress);
    expect(record().status).toBe('ready-for-interval');
    expect(record().award).toBeNull();
  }
});
