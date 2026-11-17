import { beforeEach, describe, expect, it } from 'vitest';
import { WEEKS_PER_SEASON } from '../../src/config';
import { makeRng } from '../../src/utils/rng';
import { rivalSigningTick } from '../../src/systems/rivals';
import { applyAnnualYouth } from '../../src/systems/youth';
import { careerFixture } from '../helpers/playerCareer';
import { careerActionClock } from '../../src/core/season';
import { releaseTerms, normaliseContractForAction } from '../../src/systems/cap';
import { signPlayer, releasePlayer } from '../../src/systems/freeagency';
import { renewEarly, renewalRefusal } from '../../src/systems/contracts';
import { emptyFinance, getState, setState, type GameState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { transferBetweenClubs } from '../../src/systems/playerTransfers';
import { validatePlayerPopulation } from '../../src/systems/playerCareer';
import { signWithUndo, undoNow, commitUndo } from '../../src/systems/undo';
import { applyPlayerSale, quotePlayerSale } from '../../src/systems/playerTransfers';
import { expireEndedDeals, freezeSignedTerms, publishedCap } from '../../src/systems/cap';
import { validateInput } from '../../src/core/saveValidation';
import { leagueCloseFacts, leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { importSave, installImportedSave } from '../../src/core/save';
import { recruitShortlist } from '../../src/ui/recruitShortlist';
import { registerFinanceSystem, stampMovement } from '../../src/systems/economy';
import { spendMoney, earnMoney } from '../../src/data/club';
import { financeSummary, seasonPnl, FinanceLedger, initFinanceLedger } from '../../src/ui/screens/finance';
import { playerPageModel, playerActions } from '../../src/ui/screens/player';
import { competitions, progress, clubIds } from '../data/leagueCareerFixtures';

function marked(planning = true): GameState {
  const s = structuredClone(careerFixture());
  s.week = 25;
  s.competitions = competitions();
  s.competitions.calendar!.slots = Array.from({length:25}, (_,i) => ({id:i+1, kind:'rest' as const}));
  s.competitions.leagueCareer = {...progress(), phase: planning ? 'next-season-choice' : 'active'};
  s.money = 1_000_000;
  s.squad.forEach(p => { p.deal = {salary:1000,startSeason:1,endSeason:1}; });
  return s;
}
beforeEach(() => { bus.clear(); commitUndo(); });
describe('League management action clock', () => {
  it.each(['au','uk'] as const)('uses authored duration for %s final-slot payout and zero expired obligation', pack => {
    const s = marked(false); s.pack = pack;
    const clock = careerActionClock(s);
    expect(clock).toMatchObject({season:1,week:25,duration:25,remaining:1});
    expect(releaseTerms(s.squad[0]!, clock.season, clock.week, clock.duration).payout).toBe(10);
    const pending = careerActionClock(marked());
    expect(pending).toMatchObject({season:2,week:1,duration:25,remaining:25});
    expect(releaseTerms(s.squad[0]!, pending.season, pending.week, pending.duration).payout).toBe(0);
  });
  it('signs in the planning year, books there and retains the signed term through annual expiry', () => {
    const s = marked(); const agent = s.freeAgents[0]!; setState(s);
    expect(signPlayer(s,agent.id).ok).toBe(true);
    const after = getState(); const p = after.squad.find(p=>p.id===agent.id)!;
    expect(p).toMatchObject({contractWeeks:25,joinedSeason:2,deal:{startSeason:2,endSeason:2}});
    expect(p.clubHistory!.spells.slice(-1)[0]!.start).toEqual({season:2,week:1});
    expect(after.finance.find(f=>f.season===2)!.transfers).toBeLessThan(0);
    expect(expireEndedDeals(after.squad,after.freeAgents,after.capAccount,2,25).squad.some(x=>x.id===agent.id)).toBe(true);
    expect(after.season).toBe(1); expect(after.week).toBe(25);
  });
  it('undoes planning signing in its original finance year and expires the offer after acceptance', () => {
    const s=marked(); setState(s); const id=s.freeAgents[0]!.id;
    expect(signWithUndo(id).ok).toBe(true);
    expect(undoNow()).toBe(true);
    expect(getState().finance.find(f=>f.season===2)!.transfers).toBe(0);
    expect(getState().freeAgents.find(p=>p.id===id)).toEqual(s.freeAgents[0]);
    expect(signWithUndo(id).ok).toBe(true);
    const after=getState();
    setState({...after,season:2,week:1,competitions:{...after.competitions!,leagueCareer:{...after.competitions!.leagueCareer!,phase:'active'}}});
    expect(undoNow()).toBe(false);
  });
  it('treats an already signed target term as current without overwriting its promise', () => {
    const s=marked(); const p=s.squad[0]!;
    p.deal!.renewal={salary:2000,startSeason:2,endSeason:2};
    expect(normaliseContractForAction(p,careerActionClock(s))).toMatchObject({contractWeeks:25,deal:{salary:2000,startSeason:2,endSeason:2}});
    expect(renewalRefusal(s,p)).toBeNull(); setState(s);
    expect(renewEarly(s,p.id).ok).toBe(true);
    expect(getState().squad[0]!.deal).toEqual({salary:2000,startSeason:2,endSeason:2,renewal:expect.objectContaining({startSeason:3,endSeason:3})});
    expect(renewalRefusal(getState(),getState().squad[0]!)).toMatchObject({reason:'already-renewed'});
  });
  it('releases an expired source term for zero with a genuine target-year expiry record', () => {
    const s=marked(); const p=s.squad[0]!;setState(s);
    expect(releasePlayer(s,p.id).ok).toBe(true);
    const after=getState(); expect(after.money).toBe(s.money);
    expect(after.freeAgents.find(x=>x.id===p.id)!.clubHistory!.spells.slice(-1)[0]).toMatchObject({end:{season:2,week:1},departure:'expiry'});
  });
  it('normalizes explicit renewal protection and consumed emergency metadata without inheriting either', () => {
    const s=marked();const p=s.squad[0]!;
    p.deal!.renewal={salary:2000,startSeason:2,endSeason:2};
    p.emergencyDealEndSeason=1;p.emergencyForPlayerId='old-vacancy';
    s.capAccount=freezeSignedTerms([p],s.capAccount,1);
    setState(s);expect(renewEarly(s,p.id).ok).toBe(true);
    const after=getState();const renewed=after.squad[0]!;
    expect(renewed.emergencyDealEndSeason).toBeUndefined();
    expect(renewed.emergencyForPlayerId).toBeUndefined();
    expect(after.capAccount.protectedTerms).toEqual([{playerId:p.id,salary:2000,startSeason:2,endSeason:2}]);
    expect(renewed.deal!.renewal!.startSeason).toBe(3);
  });
  it('does not let planning signings spend protected excess and computes shortlist room in the target year', () => {
    const s=marked();const p=s.squad[0]!;
    p.deal!.renewal={salary:publishedCap(s.capAccount)+1,startSeason:2,endSeason:2};
    s.capAccount=freezeSignedTerms([p],s.capAccount,1);setState(s);
    expect(signPlayer(s,s.freeAgents[0]!.id)).toMatchObject({ok:false,reason:'over-cap'});
    expect(playerActions(s.freeAgents[0]!,{kind:'freeAgent'},s)[0]!.enabled).toBe(false);
    const shortlist=recruitShortlist(s);
    expect(shortlist.pickId).toBeNull();
    expect(getState()).toEqual(s);
  });
  it('quotes rival signings and scholarship duration from the authored action clock', () => {
    const s=marked(false);const buyer=s.league.clubs.find(c=>c.squad)!;
    buyer.squad=buyer.squad!.slice(0,13);buyer.cash=1_000_000;
    const rng=makeRng(5);rng.next=()=>0;
    const r=rivalSigningTick([buyer],s.freeAgents,rng,{perClub:1,actionClock:careerActionClock(s)});
    expect(r.signed).toHaveLength(1);
    const signed=r.clubs[0]!.squad!.find(p=>p.id===r.signed[0]!.playerId)!;
    expect(signed.contractWeeks).toBe(1);
    expect(signed.clubHistory!.spells.slice(-1)[0]!.start).toEqual({season:1,week:25});
    const annual=marked();annual.season=2;annual.week=1;
    const vacancy=annual.squad[0]!;
    annual.squad=annual.squad.slice(1,13);
    annual.freeAgents.push({...vacancy,contractWeeks:0,departed:true,clubHistory:{...vacancy.clubHistory!,spells:vacancy.clubHistory!.spells.map(spell=>({...spell,end:{season:2,week:1},departure:'expiry' as const}))}});
    const y=applyAnnualYouth(annual);expect(y.ok).toBe(true);if(!y.ok)return;
    expect(y.state.squad.find(p=>p.emergencyForPlayerId===vacancy.id)).toMatchObject({contractWeeks:25,deal:{startSeason:2,endSeason:2}});
  });
  it('uses the effective contract and cap date in management read models', () => {
    const s=marked(); const p=s.squad[0]!;
    p.deal!.renewal={salary:2000,startSeason:2,endSeason:2};
    expect(financeSummary(s).capCurrent).toBe(2000);
    expect(playerPageModel(s.squad[1]!,{kind:'squad'},s).contract.text).toContain('$0/season on the cap');
    expect(seasonPnl(s).season).toBe(2);
    expect(playerPageModel(p,{kind:'squad'},s).contract.text).toContain('25 weeks');
    expect(playerActions(p,{kind:'squad'},s)[0]).toMatchObject({enabled:true,detail:expect.stringContaining('season 3')});
    expect(playerActions(s.freeAgents[0]!,{kind:'freeAgent'},s)[0]!.enabled).toBe(true);
    expect(playerPageModel(s.freeAgents[0]!,{kind:'freeAgent'},s).contract.text).toContain('season 2');
  });
  it('rejects a pending sale quote after acceptance even at the same effective date', () => {
    const s=marked();const p=s.squad[0]!;
    p.stats={speed:85,strength:85,stamina:85,handling:85,kicking:85,footyIQ:85};
    p.deal!.renewal={salary:2000,startSeason:2,endSeason:2};
    s.league.clubs.forEach(c=>{if(c.squad)c.cash=1_000_000;});
    const q=quotePlayerSale(s,p.id);expect(q.ok).toBe(true);if(!q.ok)return;
    expect(applyPlayerSale(s,q.offer).ok).toBe(true);
    const accepted={...s,season:2,week:1,competitions:{...s.competitions!,leagueCareer:{...s.competitions!.leagueCareer!,phase:'active' as const}}};
    expect(applyPlayerSale(accepted,q.offer)).toMatchObject({ok:false,reason:'stale-offer'});
  });
  it('refuses selling expired source agreements and stamps queued-term transfers in target year', () => {
    const s=marked(); const p=s.squad[0]!; const buyer=s.league.clubs.find(c=>c.squad)!;buyer.cash=1_000_000;
    expect(transferBetweenClubs(s,s.clubId,buyer.id,p.id,100).ok).toBe(false);
    p.deal!.renewal={salary:2000,startSeason:2,endSeason:2};
    const r=transferBetweenClubs(s,s.clubId,buyer.id,p.id,100);expect(r.ok).toBe(true);if(!r.ok)return;
    expect(r.offer).toMatchObject({season:2,week:1});
    expect(r.state.finance.find(f=>f.season===2)!.transfers).toBe(100);
    expect(validatePlayerPopulation(r.state, {season:2,week:1})).toBeNull();
    const moved=r.state.league.clubs.find(c=>c.id===buyer.id)!.squad!.find(x=>x.id===p.id)!;
    moved.clubHistory!.spells.slice(-1)[0]!.start.week=2;
    expect(validatePlayerPopulation(r.state,{season:2,week:1})).not.toBeNull();
  });
});

function verifiedPending(): GameState {
  const s=structuredClone(careerFixture());
  s.week=5;s.preseason=0;s.league.fixtures=[];
  s.league.clubs=s.league.clubs.filter(c=>clubIds.includes(c.id));
  s.league.ladder=s.league.ladder.filter(c=>clubIds.includes(c.clubId));
  s.competitions=competitions();
  const world=s.competitions.world!;
  s.competitions.leagueCareer={...progress(),phase:'next-season-choice',close:leagueCloseFacts(world,s.competitions.instances,1),accepted:{season:1,leagueId:world.profile.startingDivisionId,receiptId:leagueEntryReceiptId(world.profile.id,1,s.clubId,world.profile.startingDivisionId),allocationPolicy:'adjacent-vacancy-v1',movements:[]}};
  return s;
}
const inputProblem = (s:GameState) => validateInput(s as unknown as Record<string,unknown>,s.version);
describe('verified pending history upper bound', () => {
  it('keeps source-year emergency vacancy metadata legal while the annual owners wait', () => {
    const s=verifiedPending();const p=s.squad[0]!;const source=s.freeAgents[0]!;
    p.deal={salary:1000,startSeason:1,endSeason:1};
    p.emergencyDealEndSeason=1;p.emergencyForPlayerId=source.id;
    p.clubHistory!.spells.slice(-1)[0]!.arrival='emergency';
    source.clubHistory={academyDiscountUsed:true,spells:[{clubId:s.clubId,start:{season:1,week:1},end:{season:1,week:1},arrival:'observed',departure:'expiry'}]};
    expect(inputProblem(s)).toBeNull();setState(s);
    const notices:string[]=[];bus.on('ui:notify',n=>notices.push(n.text));
    expect(releasePlayer(s,p.id).ok).toBe(true);
    expect(notices).toContain(`${p.name}'s contract expired. No payout.`);
    expect(getState().freeAgents.find(x=>x.id===p.id)!.emergencyDealEndSeason).toBeUndefined();
    expect(inputProblem(getState())).toBeNull();
  });
  it('permits management history only through verified target week one, preserving annual source-year bounds', () => {
    const s=verifiedPending();expect(inputProblem(s)).toBeNull();setState(s);
    expect(signPlayer(s,s.freeAgents[0]!.id).ok).toBe(true);
    const after=getState();expect(inputProblem(after)).toBeNull();
    expect(importSave(JSON.stringify(after))).toMatchObject({ok:false,outcome:'unsupported'});
    expect(installImportedSave(JSON.stringify(after),1).ok).toBe(false);
    const forged=structuredClone(after);forged.squad.slice(-1)[0]!.clubHistory!.spells.slice(-1)[0]!.start.week=2;
    expect(inputProblem(forged)).toContain('history');
    const invalid=structuredClone(after);invalid.competitions!.leagueCareer!.close!.id+='forged';
    expect(inputProblem(invalid)).toContain('close');
    const intake=structuredClone(after);intake.playerPopulation.lastMarketIntakeSeason=2;
    expect(inputProblem(intake)).toContain('population');
    const retired=structuredClone(after);const person=retired.freeAgents.shift()!;
    retired.playerPopulation.shortlistIds=retired.playerPopulation.shortlistIds.filter(id=>id!==person.id);
    retired.playerPopulation.retired.push({...person,retiredAt:{season:2,week:1},clubHistory:person.clubHistory!});
    expect(inputProblem(retired)).toContain('retired');
    const unmarked=structuredClone(after);delete unmarked.competitions!.leagueCareer;
    expect(inputProblem(unmarked)).not.toBeNull();
  });
});

describe('generic management finance action date', () => {
  it.each([true, false])('keeps completed books fixed and dates planning spending and ledger alike (books first: %s)', booksFirst => {
    const s=verifiedPending();s.money=10_000;
    s.finance=[{...emptyFinance(1),gate:300,facilities:-50}];
    expect(inputProblem(s)).toBeNull();setState(s);
    const ledger=new FinanceLedger();
    const offs=booksFirst ? [registerFinanceSystem(),initFinanceLedger(ledger)] : [initFinanceLedger(ledger),registerFinanceSystem()];
    expect(spendMoney(200,'build:canteen')).toBe(true);
    expect(spendMoney(75,'staff:welfare')).toBe(true);
    offs.forEach(off=>off());
    expect(getState().finance.find(f=>f.season===1)).toEqual(s.finance[0]);
    expect(getState().finance.find(f=>f.season===2)).toEqual({...emptyFinance(2),facilities:-200,other:-75});
    expect(ledger.rows()).toEqual([{season:2,week:1,wages:0,upkeep:0,overhead:0,income:0,gate:0,other:-275,otherLines:{facilities:-200,other:-75},net:-275}]);
    expect(getState()).toMatchObject({season:1,week:5,money:9725,rngSeed:s.rngSeed});
    expect(inputProblem(getState())).toBeNull();
  });
  it('uses actual source slots for marked active movements without applying legacy closing heuristics', () => {
    const s=verifiedPending();s.competitions!.leagueCareer!.phase='active';
    delete s.competitions!.leagueCareer!.close;
    s.competitions!.calendar!.status='active';s.competitions!.calendar!.elapsedIntervals=4;
    expect(inputProblem(s)).toBeNull();setState(s);
    expect(stampMovement(s,'gate')).toEqual({line:'gate',season:1,week:5});
    const ledger=new FinanceLedger();const offBooks=registerFinanceSystem();const offLedger=initFinanceLedger(ledger);
    earnMoney(50,'gate');offBooks();offLedger();
    expect(getState().finance.find(f=>f.season===1)!.gate).toBe(50);
    expect(ledger.rows()[0]).toMatchObject({season:1,week:5,gate:50});
    expect(getState()).toMatchObject({season:1,week:5});
  });
  it('preserves legacy trial stamps and unmarked DEV closing grants', () => {
    const legacy=structuredClone(careerFixture());legacy.week=1;legacy.preseason=1;
    expect(stampMovement(legacy,'build:canteen')).toEqual({line:'facilities',season:1,week:-1});
    const dev=verifiedPending();delete dev.competitions!.leagueCareer;
    dev.season=2;dev.week=1;dev.finance=[emptyFinance(1)];
    expect(inputProblem(dev)).toBeNull();setState(dev);
    const ledger=new FinanceLedger();const offBooks=registerFinanceSystem();const offLedger=initFinanceLedger(ledger);
    earnMoney(15,'board grant');offBooks();offLedger();
    expect(getState().finance).toEqual([{...emptyFinance(1),boardGrant:15}]);
    expect(ledger.rows()[0]).toMatchObject({season:1,week:WEEKS_PER_SEASON,otherLines:{boardGrant:15}});
    expect(getState()).toMatchObject({season:2,week:1});
  });
  it('respects an explicit money-event date in both books and ledger', () => {
    const s=structuredClone(careerFixture());s.season=2;s.week=7;s.preseason=0;
    s.finance=[emptyFinance(1),emptyFinance(2)];setState(s);
    const ledger=new FinanceLedger();const offBooks=registerFinanceSystem();const offLedger=initFinanceLedger(ledger);
    bus.emit('money:changed',{delta:35,reason:'gate',balance:s.money,stamp:{season:1,week:5}});
    offBooks();offLedger();
    expect(getState().finance).toEqual([{...emptyFinance(1),gate:35},emptyFinance(2)]);
    expect(ledger.rows()[0]).toMatchObject({season:1,week:5,gate:35});
  });
});
