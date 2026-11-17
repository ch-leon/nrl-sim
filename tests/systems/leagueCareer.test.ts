import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, setState, loadState, emptyFinance as importedEmptyFinance, type GameState } from '../../src/core/state';
import { closeLeagueSeason } from '../../src/systems/leagueCareer';
import { competitionLadder, finaliseCalendarFixture } from '../../src/systems/competitionCalendar';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { competitions, progress, profile, clubIds } from '../data/leagueCareerFixtures';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, resumeWeek, weekHeld } from '../../src/core/time';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { bus } from '../../src/core/events';
import { fixtureBridge } from '../../src/systems/competitionCalendar';
import { freezeMatchIncome, reconcileMatchIncome, validMatchIncome } from '../../src/systems/matchIncome';
import { advanceUntil } from '../../src/core/advance';
import { __setStorage, __unlockSaves, save, saveIfChanged, enableAutosave, slotKey, loadSlot, installImportedSave, exportOriginalSave } from '../../src/core/save';
import { validateInput } from '../../src/core/saveValidation';
import { validateLeagueHistory } from '../../src/data/leagueCareer';
import { buildAnnualReviewAdditions, snapshotBeforeRollover } from '../../src/systems/stats';
import { freshCapAccount } from '../../src/systems/cap';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { competitionFixtureId } from '../../src/data/competition';

export function closingState(): GameState {
  createNewGame('League close', 573);
  const s = getState(); const c = competitions();
  c.calendar!.status = 'active'; c.calendar!.elapsedIntervals = 4;
  c.leagueCareer = {...progress(), phase: 'active', accepted: {season: 1, startInterval: 0,
    leagueId: profile.startingDivisionId, receiptId: leagueEntryReceiptId(profile.id, 1, 'player', profile.startingDivisionId),
    allocationPolicy: 'adjacent-vacancy-v1', movements: []}};
  return {...s, week: 5, preseason: 0 as const, competitions: c, league: {fixtures: [], ladder: competitionLadder(c.instances[0]!),
    clubs: clubIds.map(id => ({id, name: id, colors: ['#000000', '#ffffff'] as [string,string], strength: 44, ...(id === 'player' ? {} : {squad: [], cash: 60000, capAccount: freshCapAccount('local')})}))},
    objectives: [{id: 's1-finals', kind: 'finals' as const, text: 'Finish first', target: 1, status: 'pending' as const}]};
}
afterEach(() => {clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); __setStorage(null); setCareerNamespace(null); bus.clear(); vi.restoreAllMocks();});
describe('pure League season close', () => {
  it('retains a competition-aware semifinal exit separately from the championship final and legacy finals review', () => {
    setCareerNamespace(DEV_TEST_PREFIX);createNewGame('Semifinal',573);
    const s=structuredClone(setupStructuralDivisionCareer(AU_CAREER_PROFILE,573));
    const c=s.competitions!;s.week=c.calendar!.slots.length;c.calendar!.elapsedIntervals=s.week-1;
    for(const i of c.instances) {
      if(i.definition.format.kind!=='league'&&i.definition.format.kind!=='exhibition') {i.status='declined';i.fixtures=[];i.stageId=null;delete i.winnerId;continue;}
      for(const f of i.fixtures) {const winner=f.awayId==='player'?'player':f.homeId;f.status='completed';f.result={homeScore:winner===f.homeId?12:0,awayScore:winner===f.awayId?12:0,winnerId:winner,decider:'score'};}
      if(i.definition.format.kind==='league') {
        const ranked=competitionLadder(i).map(r=>r.clubId);const stage=i.definition.stages.find(st=>st.kind==='knockout')!;
        const winners:string[]=[];
        for(const [a,b] of [[ranked[0]!,ranked[3]!],[ranked[1]!,ranked[2]!]]) {
          const winner=a==='player'?b:a;winners.push(winner);
          i.fixtures.push({id:competitionFixtureId(i.id,i.fixtures.length),competitionId:i.id,stageId:stage.id,round:1,slot:stage.slotIds![0]!,
            homeId:a,awayId:b,neutral:false,status:'completed',result:{homeScore:winner===a?12:0,awayScore:winner===b?12:0,winnerId:winner,decider:'score'}});
        }
        i.fixtures.push({id:competitionFixtureId(i.id,i.fixtures.length),competitionId:i.id,stageId:stage.id,round:2,slot:stage.slotIds![1]!,
          homeId:winners[0]!,awayId:winners[1]!,neutral:true,status:'completed',result:{homeScore:12,awayScore:0,winnerId:winners[0]!,decider:'score'}});
      }
      i.status='completed';i.winnerId=i.fixtures[i.fixtures.length-1]!.result!.winnerId!;
    }
    c.leagueCareer={version:1,scheduleSeed:573,initialFields:Object.fromEntries(AU_CAREER_PROFILE.divisions.map(d=>[d.id,d.entrants.map(e=>e.clubId)])),clubId:'player',phase:'active',
      access:[{leagueId:AU_CAREER_PROFILE.startingDivisionId}],accepted:{season:1,startInterval:0,leagueId:AU_CAREER_PROFILE.startingDivisionId,
        receiptId:leagueEntryReceiptId(c.world!.profile.id,1,'player',AU_CAREER_PROFILE.startingDivisionId),allocationPolicy:'adjacent-vacancy-v1',movements:[]}};
    expect(validateInput(s as unknown as Record<string,unknown>,s.version)).toBeNull();
    const closed=closeLeagueSeason(s);const h=closed.history[0]!;
    expect(h.premiership).toBe(false);expect(h.league!.lastPlayerFinal).toMatchObject({round:1,stageName:'Finals',result:{winnerId:expect.not.stringMatching(/^player$/)}});
    expect(h.league!.final).toBeDefined();expect(h.league!.lastPlayerFinal!.fixtureId).not.toBe(h.league!.final!.fixtureId);
    expect(h.review).not.toHaveProperty('finals');expect(validateLeagueHistory(closed)).toBeNull();
  });
  it('credits a promised played final before freezing books, without adding a prize, grant or cap cash', () => {
    let s=closingState();const i=s.competitions!.instances[0]!;const f=i.fixtures[2]!;const result=f.result!;
    delete f.result;f.status='scheduled';i.status='active';delete i.winnerId;
    s=freezeMatchIncome(s,fixtureBridge({instance:i,fixture:f}));
    f.status='completed';f.result=result;i.status='completed';i.winnerId=result.winnerId!;
    const paid=reconcileMatchIncome(s);const closed=closeLeagueSeason(s);
    expect(closed.money).toBe(paid.money);expect(closed.league.clubs).toEqual(paid.league.clubs);expect(closed.finance).toEqual(paid.finance);
    expect(closed.matchIncome).toEqual(paid.matchIncome);expect(closed.matchIncome[0]!.receipt).toBeDefined();
    expect(closed.history[0]!.review!.money).toBeDefined();expect(closed.capAccount).toBe(s.capAccount);
  });
  it('does not confuse a minor premiership with the official finals title', () => {
    const s=closingState();const i=s.competitions!.instances[0]!;const final=i.fixtures[2]!;
    const other=i.entrantIds.find(id=>id!=='player')!;
    final.result={homeScore: final.homeId===other?12:0,awayScore:final.awayId===other?12:0,winnerId:other,decider:'score'};i.winnerId=other;
    const next=closeLeagueSeason(s);expect(next.history[0]!.premiership).toBe(false);expect(next.competitions!.leagueCareer!.access).toHaveLength(1);
    expect(next.history[0]!.league!.championId).toBe(other);expect(next.history[0]!.league!.minorPremierId).toBeDefined();
  });
  it('keeps completed books/board/reputation frozen when planning and annual-only additions change', () => {
    const source = closingState(); const closed = closeLeagueSeason(source); const frozen = JSON.stringify(closed.history[0]!.review);
    const planning = {...closed, reputation: 99, money: 42, finance: [...closed.finance, {...importedEmptyFinance(2), transfers: -500}],
      squad: closed.squad.slice(1), freeAgents: [...closed.freeAgents, {...closed.squad[0]!, junior: true}]};
    expect(closeLeagueSeason(planning)).toBe(planning);
    expect(JSON.stringify(planning.history[0]!.review)).toBe(frozen);
    const additions = buildAnnualReviewAdditions(snapshotBeforeRollover(closed), {...planning, season: 2});
    expect(additions).not.toHaveProperty('money');expect(additions).not.toHaveProperty('board');expect(additions).not.toHaveProperty('reputation');
    expect(validateLeagueHistory(planning)).toBeNull();
  });
  it('keeps minor honours and continuous clock evidence after a later close replaces progress.close', () => {
    const first = closeLeagueSeason(closingState()); const old = JSON.stringify(first.history[0]);
    const c = competitions(2); c.calendar!.status='active';c.calendar!.elapsedIntervals=9;
    c.instances=[...first.competitions!.instances,...c.instances];
    c.leagueCareer={...first.competitions!.leagueCareer!,phase:'active',accepted:{...first.competitions!.leagueCareer!.accepted!,
      season:2,startInterval:5,receiptId:leagueEntryReceiptId(profile.id,2,'player',profile.startingDivisionId)}};
    const next=closeLeagueSeason({...first,season:2,week:5,competitions:c});
    expect(next.history).toHaveLength(2); expect(JSON.stringify(next.history[0])).toBe(old);
    expect(next.history[0]!.league!.minorPremierId).toBeDefined();expect(next.competitions!.leagueCareer!.close!.season).toBe(2);
    expect(next.history[1]!.league).toMatchObject({startInterval:5,endingInterval:10});expect(validateLeagueHistory(next)).toBeNull();
  });
  it.each(['history final','history standings','history clock','close clock','review unknown','review board','missing board','review books','review reputation'] as const)('rejects forged %s facts', fault => {
    const s=closeLeagueSeason(closingState()); const row=s.history[0]!;
    expect(validateInput(s as unknown as Record<string,unknown>,s.version)).toBeNull();
    if(fault==='history final') row.league!.lastPlayerFinal!.result.winnerId='missing';
    if(fault==='history standings') row.wins!++;
    if(fault==='history clock') row.league!.endingInterval++;
    if(fault==='close clock') s.competitions!.leagueCareer!.close!.endingInterval++;
    if(fault==='review unknown') Object.assign(row.review!,{cash:100});
    if(fault==='review board') row.review!.board!.patience=0;
    if(fault==='missing board') delete row.review!.board;
    if(fault==='review books') row.review!.money={in:1,out:0};
    if(fault==='review reputation') row.review!.reputation!.to=101;
    expect(validateInput(s as unknown as Record<string,unknown>,s.version)).not.toBeNull();
  });
  it('resolves a cancelled canonical saved promise at zero without a result, cash movement or replay', () => {
    let s = closingState(); const instance = s.competitions!.instances[0]!; const final = instance.fixtures[2]!;
    delete final.result; final.status = 'scheduled'; instance.status = 'active'; delete instance.winnerId;
    s = freezeMatchIncome(s, fixtureBridge({instance, fixture: final}));
    final.status = 'cancelled'; instance.status = 'withdrawn';
    const next = reconcileMatchIncome(s);
    expect(next.matchIncome[0]!.receipt).toMatchObject({home: {total: 0}, away: {total: 0}});
    expect(next.money).toBe(s.money); expect(next.league.clubs).toEqual(s.league.clubs); expect(next.finance).toEqual(s.finance);
    expect(final.result).toBeUndefined(); expect(reconcileMatchIncome(next)).toBe(next);
    const closed = closeLeagueSeason(next); expect(closed).not.toBe(next); expect(closed.history[0]!.premiership).toBe(false);
  });
  it('rejects a balanced but forged receipt against its source result and quote', () => {
    let s = closingState(); const instance = s.competitions!.instances[0]!; const final = instance.fixtures[2]!;
    const result = final.result!; delete final.result; final.status = 'scheduled';
    s = freezeMatchIncome(s, fixtureBridge({instance, fixture: final})); final.result = result; final.status = 'completed';
    s = reconcileMatchIncome(s); expect(validMatchIncome(s.matchIncome, s)).toBe(true);
    s.matchIncome[0]!.receipt!.home.base++; s.matchIncome[0]!.receipt!.home.total++;
    expect(validMatchIncome(s.matchIncome, s)).toBe(false);
  });
  it('freezes sporting history/access/review and closes the source interval without annual people or cash work', () => {
    const s = closingState(); const bytes = JSON.stringify(s); const next = closeLeagueSeason(s);
    expect(next).not.toBe(s); expect(JSON.stringify(s)).toBe(bytes);
    expect(next).toMatchObject({season: 1, week: 5, competitions: {leagueCareer: {phase: 'next-season-choice'}, calendar: {status: 'awaiting-next-season', elapsedIntervals: 5}}});
    for (const key of ['squad', 'freeAgents', 'playerPopulation', 'rngSeed', 'money', 'boardLoan', 'capAccount'] as const) expect(next[key]).toEqual(s[key]);
    expect(next.league.clubs).toEqual(s.league.clubs);
    expect(next.history).toHaveLength(1); expect(next.history[0]).toMatchObject({season: 1, premiership: true, league: {closeId: `${profile.id}:close:s1`, startInterval: 0, endingInterval: 5}});
    expect(next.history[0]!.review?.reputation).toEqual({from: s.reputation, to: next.reputation});
    expect(next.competitions!.leagueCareer!.access).toHaveLength(2);
    expect(closeLeagueSeason(next)).toBe(next);
    expect(validateLeagueHistory(next)).toBeNull();
    expect(next.history[0]!.review).not.toHaveProperty('finals');
    expect(next.history[0]!.league!.lastPlayerFinal).toMatchObject({stageId: 'finals', round: 1, slot: 5, result: {winnerId: 'player'}});
  });
  it('refuses early close, initial-choice, legacy conversion and indebted prototype conversion unchanged', () => {
    const s = closingState(); expect(closeLeagueSeason({...s, week: 4})).toEqual({...s, week: 4});
    const initial = {...s, competitions: {...s.competitions!, leagueCareer: progress()}}; expect(closeLeagueSeason(initial)).toBe(initial);
    const debt = {...s, boardLoan: {owed: 1}}; expect(closeLeagueSeason(debt)).toBe(debt);
    createNewGame('Legacy', 8); expect(closeLeagueSeason(getState())).toBe(getState());
  });
  it.each(['forfeit', 'withdrawn'] as const)('records official %s finals correctly', kind => {
    const s = closingState(); const league = s.competitions!.instances[0]!; const final = league.fixtures[2]!;
    if (kind === 'forfeit') final.result!.decider = 'forfeit';
    else {league.status = 'withdrawn'; delete league.winnerId; final.status = 'cancelled'; delete final.result;}
    const next = closeLeagueSeason(s);
    expect(next.history[0]!.premiership).toBe(kind === 'forfeit');
    expect(next.competitions!.leagueCareer!.access).toHaveLength(kind === 'forfeit' ? 2 : 1);
    expect(next.history[0]!.league!.minorPremierId).toBeDefined();
  });
});
describe('League interval gate', () => {
  it.each(['initial-choice','next-season-choice','normal namespace'] as const)('refuses valid %s time entry without a tick', async phase => {
    setCareerNamespace(phase==='normal namespace'?null:DEV_TEST_PREFIX);let s=closingState();
    if(phase==='initial-choice') {s.week=1;s.competitions=competitions(1,false);s.competitions.leagueCareer=progress();s.league.ladder=competitionLadder(s.competitions.instances[0]!);}
    if(phase==='next-season-choice') s=closeLeagueSeason(s);
    expect(validateInput(s as unknown as Record<string,unknown>,s.version)).toBeNull();setState(s);const before=getState();const tick=vi.fn();registerTickHook('no-tick',0,tick);
    advanceWeek();advanceWeeks(3);const run=await advanceUntil({kind:'weeks',weeks:3});
    expect(run.weeksPlayed).toBe(0);expect(run.stop.kind).toBe(phase==='normal namespace'?'stopped':'choice-required');expect(getState()).toBe(before);expect(tick).not.toHaveBeenCalled();
  });
  it('records a sacking without a grant or revival and announces it once at the new close', () => {
    setCareerNamespace(DEV_TEST_PREFIX);const s=closingState();s.boardPatience=1;
    s.objectives=[{id:'impossible',kind:'build',text:'Build 100 facilities',target:100,status:'pending'}];
    setState(s);const sacked=vi.fn();bus.on('board:sacked',sacked);advanceWeek();
    expect(getState().sacked).toMatchObject({season:1});expect(getState().money).toBe(s.money);expect(sacked).toHaveBeenCalledTimes(1);
    const closed=getState();advanceWeek();advanceWeeks(2);expect(getState()).toBe(closed);expect(sacked).toHaveBeenCalledTimes(1);
  });
  it('stops explicitly if a final held interval becomes unsupported during its hooks, without hanging or replaying it', async () => {
    setCareerNamespace(DEV_TEST_PREFIX);__unlockSaves();const bytes=new Map<string,string>();
    __setStorage({getItem:k=>bytes.get(k)??null,setItem:(k,v)=>{bytes.set(k,v);},removeItem:k=>{bytes.delete(k);}});
    setState(closingState());expect(saveIfChanged(getState())).toBe(true);const original=bytes.get(DEV_TEST_PREFIX+slotKey(1));let ticks=0;
    const listeners=new Map<string,()=>void>();const target={addEventListener:(name:string,fn:()=>void)=>{listeners.set(name,fn);},removeEventListener:(name:string)=>{listeners.delete(name);}};
    const off=enableAutosave({doc:{...target,visibilityState:'hidden'},win:target});
    registerTickHook('unexpected-debt',40,ctx=>{ticks++;const release=ctx.hold!();queueMicrotask(()=>{setState({boardLoan:{owed:1}});release();});});
    const run=await Promise.race([advanceUntil({kind:'weeks',weeks:2}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('advance hung')),1000))]);
    expect(run.stop.kind).toBe('stopped');expect(run.weeksPlayed).toBe(0);advanceWeek();expect(ticks).toBe(1);
    listeners.get('visibilitychange')!();listeners.get('pagehide')!();save(getState());expect(saveIfChanged(getState())).toBe(false);off();
    expect(bytes.get(DEV_TEST_PREFIX+slotKey(1))).toBe(original);
  });
  it('requires a bound release for a marked hold; bare legacy resume cannot consume it', () => {
    setCareerNamespace(DEV_TEST_PREFIX);setState(closingState());let release!:()=>void;
    registerTickHook('marked-hold',40,ctx=>{release=ctx.hold!();});advanceWeek();const current=getState();
    resumeWeek();expect(weekHeld()).toBe(true);expect(getState()).toBe(current);
    release();expect(weekHeld()).toBe(false);expect(getState().competitions!.leagueCareer!.phase).toBe('next-season-choice');
  });
  it('finishes a held final through the existing result boundary exactly once', () => {
    setCareerNamespace(DEV_TEST_PREFIX);let s=closingState();const i=s.competitions!.instances[0]!;const f=i.fixtures[2]!;
    delete f.result;f.status='scheduled';i.status='active';delete i.winnerId;const bridge=fixtureBridge({instance:i,fixture:f});
    s=freezeMatchIncome(s,bridge);setState(s);let release!:()=>void;
    registerTickHook('final',40,ctx=>{release=ctx.hold!();});const ended=vi.fn();bus.on('season:ended',ended);
    advanceWeek();expect(weekHeld()).toBe(true);const score=f.homeId==='player'?{homeScore:12,awayScore:0}:{homeScore:0,awayScore:12};
    setState(finaliseCalendarFixture(getState(),bridge,score));release();const closed=getState();const frozen=JSON.stringify(closed);
    expect(closed.history[0]!.premiership).toBe(true);expect(closed.competitions!.calendar!.elapsedIntervals).toBe(5);
    expect(finaliseCalendarFixture(closed,bridge,score)).toBe(closed);release();resumeWeek();
    expect(JSON.stringify(getState())).toBe(frozen);expect(ended).toHaveBeenCalledTimes(1);
  });
  it('installs the final gate before failed saving, then retries identical bytes without another close/event/reputation change', () => {
    setCareerNamespace(DEV_TEST_PREFIX); __unlockSaves(); let fail = true; const bytes = new Map<string,string>();
    __setStorage({getItem: k => bytes.get(k) ?? null, setItem: (k,v) => {if(fail) throw new Error('quota');bytes.set(k,v);}, removeItem: k => {bytes.delete(k);}});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setState(closingState()); const ended = vi.fn(); bus.on('season:ended', ended);
    advanceWeek(); const closed = getState(); const frozen = JSON.stringify(closed);
    expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice'); expect(ended).toHaveBeenCalledTimes(1);
    expect(bytes.has(DEV_TEST_PREFIX + slotKey(1))).toBe(false);
    advanceWeek(); advanceWeeks(10); expect(getState()).toBe(closed); expect(JSON.stringify(getState())).toBe(frozen);
    fail = false; expect(saveIfChanged(closed)).toBe(true); expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(frozen);
    expect(saveIfChanged(closed)).toBe(true); expect(ended).toHaveBeenCalledTimes(1);
    expect(loadSlot(1).status).toBe('corrupt'); expect(exportOriginalSave(1)).toBe(frozen);
    expect(installImportedSave(frozen,1).ok).toBe(false); expect(bytes.get(DEV_TEST_PREFIX + slotKey(1))).toBe(frozen);
    loadState(JSON.parse(frozen)); advanceWeek(); expect(JSON.stringify(getState())).toBe(frozen); expect(ended).toHaveBeenCalledTimes(1);
  });
  it('refuses malformed promises and historical debt before hooks, preserving live bytes', async () => {
    for (const fault of ['missing fixture', 'debt'] as const) {
      setCareerNamespace(DEV_TEST_PREFIX); let s = closingState();
      if (fault === 'debt') s.boardLoan.owed = 100;
      else {const instance = s.competitions!.instances[0]!; const f = instance.fixtures[2]!; const result=f.result!;delete f.result;f.status='scheduled';
        s=freezeMatchIncome(s,fixtureBridge({instance,fixture:f}));f.result=result;f.status='completed';s.matchIncome[0]!.fixture.id += 'missing';}
      setState(s); const before = JSON.stringify(getState()); const tick = vi.fn();registerTickHook('never',0,tick);
      advanceWeek(); advanceWeeks(2); const run = await advanceUntil({kind:'weeks',weeks:1});
      expect(run.weeksPlayed).toBe(0);expect(tick).not.toHaveBeenCalled();expect(JSON.stringify(getState())).toBe(before);
    }
  });
  it('detects active expiry-window transitions from signed terms without rewriting contracts or countdowns', async () => {
    setCareerNamespace(DEV_TEST_PREFIX); const s = closingState();
    s.competitions!.calendar!.slots = Array.from({length: 25}, (_,i) => ({id: i+1, kind: 'competition' as const}));
    s.competitions!.instances.forEach(i => {i.definition.slotCount = 25;});
    s.week = 17; s.competitions!.calendar!.elapsedIntervals = 16;
    s.squad.forEach(p => {p.deal = {salary: 1000, startSeason: 1, endSeason: 3};});
    s.squad[0]!.deal!.endSeason = 1; s.squad[0]!.contractWeeks = 27;
    setState(s); const contracts = JSON.stringify(s.squad.map(p => [p.deal, p.contractWeeks]));
    const run = await advanceUntil({kind: 'weeks', weeks: 5}, () => Promise.resolve());
    expect(run.stop.kind).toBe('contract'); expect(run.weeksPlayed).toBeLessThan(5);
    expect(JSON.stringify(getState().squad.map(p => [p.deal,p.contractWeeks]))).toBe(contracts);
  });
  it.each(['seasonEnd', 'weeks'] as const)('stops async %s at the source-year close, without spinning on an unchanged raw year', async kind => {
    setCareerNamespace(DEV_TEST_PREFIX); setState(closingState());
    const run = await advanceUntil(kind === 'weeks' ? {kind, weeks: 20} : {kind}, () => Promise.resolve());
    expect(run.weeksPlayed).toBe(1);
    expect(run.stop.kind).toBe(kind === 'seasonEnd' ? 'target' : 'choice-required');
    const before = getState(); const second = await advanceUntil({kind: 'weeks', weeks: 1});
    expect(second).toMatchObject({weeksPlayed: 0, stop: {kind: 'choice-required'}}); expect(getState()).toBe(before);
  });
  it('uses every quiet slot after early withdrawals and stops a synchronous run at the close', () => {
    setCareerNamespace(DEV_TEST_PREFIX); const s = closingState();
    for (const i of s.competitions!.instances) {i.status = 'withdrawn'; delete i.winnerId; for (const f of i.fixtures) {f.status = 'cancelled'; delete f.result;}}
    s.week = 1; s.competitions!.calendar!.elapsedIntervals = 0; setState(s);
    let ticks = 0; registerTickHook('quiet', 1, () => {ticks++;}, {trials: true}); const ended = vi.fn(); bus.on('season:ended', ended);
    advanceWeeks(30); expect(ticks).toBe(5); expect(getState().season).toBe(1); expect(getState().week).toBe(5);
    expect(getState().competitions!.calendar!.elapsedIntervals).toBe(5); expect(ended).toHaveBeenCalledTimes(1);
    advanceWeek(); resumeWeek(); expect(ticks).toBe(5); expect(ended).toHaveBeenCalledTimes(1);
  });
  it('a release belongs to one hold and cannot release a later hold or a fresh same-profile career', () => {
    createNewGame('A', 10); let release: (() => void) | undefined;
    registerTickHook('hold', 1, ctx => {release = ctx.hold!();}, {trials: true}); advanceWeek(); const old = release!;
    old(); expect(weekHeld()).toBe(false); advanceWeek(); expect(weekHeld()).toBe(true); old(); expect(weekHeld()).toBe(true);
    clearHeldWeek(); createNewGame('A', 10); advanceWeek(); old(); expect(weekHeld()).toBe(true); release!(); expect(weekHeld()).toBe(false);
  });
});
