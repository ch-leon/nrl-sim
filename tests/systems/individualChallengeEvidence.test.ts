import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import type { GameState } from '../../src/core/state';
import { validateCompetitions } from '../../src/data/competition';
import { shownStats } from '../../src/data/player';
import { CHALLENGE_EDITIONS, type ChallengeActor } from '../../src/data/individualChallengeRules';
import { challengeEngines, challengeFixture, challengeId, type IndividualChallengeRecord } from '../../src/data/individualChallenges';
import { applyAssignmentAward } from '../../src/systems/assignmentTraining';
import { advanceChallengeProgress, challengeCheckpoint, challengeClashRoll, challengeEventSeed,
  initialChallengeProgress, resolveChallengeAction } from '../../src/systems/individualChallengeEngine';
import { validateIndividualChallenges } from '../../src/systems/individualChallengeEvidence';
import * as policies from '../../src/systems/individualChallengePolicy';

function history(week = 6, firstSeason = 2, count = 24) {
  const state: GameState = JSON.parse(readFileSync(new URL(`../fixtures/saves/v34-challenges/v34-au-week-${week}.json`,import.meta.url),'utf8'));
  const c = state.competitions!;
  const player = state.squad[0]!;
  const edition = CHALLENGE_EDITIONS.showground;
  const records: IndividualChallengeRecord[] = Array.from({length:count},(_,i)=>{
    const season = i+firstSeason;
    const id = challengeId(season,state.clubId,'showground');
    const actor: ChallengeActor = {id:player.id,name:player.name,ratings:{strength:40+i,speed:45,stamina:55,footyIQ:50},traits:[]};
    const eventSeed = challengeEventSeed(c.leagueCareer!.scheduleSeed,id);
    const policy = policies.createChallengePolicy(edition,actor);
    let progress = initialChallengeProgress(actor);
    const titleProbability = policy.evaluate(progress).titleProbability;
    const clashes = [];
    while (!progress.result) {
      const checkpoint = challengeCheckpoint(edition,actor,progress)!;
      const clash = resolveChallengeAction(checkpoint,policy.choose(progress)!.call,challengeClashRoll(eventSeed,progress.clashIndex));
      clashes.push(clash);
      progress = advanceChallengeProgress(progress,clash);
    }
    const won = progress.result==='won';
    const fixture = challengeFixture(c,season,state.clubId,'showground');
    return {id,editionId:'showground',season,clubId:state.clubId,pack:'au',instanceId:fixture?.league.id ?? `history-${season}`,fixtureId:fixture?.fixture.id ?? `history-${season}-2`,
      opponentId:fixture ? (fixture.fixture.homeId===state.clubId ? fixture.fixture.awayId : fixture.fixture.homeId) : state.league.clubs.find(club=>club.id!==state.clubId)!.id,revision:4,bookingRevision:1,status:'completed',
      participantId:player.id,participantName:player.name,bookedWeek:5,reason:null,
      contest:{actor,edition,engineVersion:1,policyVersion:1,eventSeed,titleProbability,autoCoach:false,clashes,commands:[{kind:'finish',at:0}],progress},
      awardBasis:{age:player.age,xpTraits:player.traits.filter(t=>t.id==='youngGun'||t.id==='workhorse').map(({id,level})=>({id,level})),stats:Object.fromEntries(shownStats(player.position).map(k=>[k,player.stats[k]])),clubFocus:'balanced'},
      award:{cash:won ? edition.winnerCash : 0,honour:won ? edition.honour : null,
        xp:applyAssignmentAward(player,edition.completionXp+(won ? edition.winnerXp : 0),{mode:'manual',clubFocus:'balanced'}).receipt}};
  });
  const ctx = {pack:'au',season:26,week:7,clubIds:state.league.clubs.map(club=>club.id)};
  return {records,c,ctx};
}
afterEach(()=>vi.restoreAllMocks());

it('reuses exact validated history across cloned saves beyond the small policy-table cache',()=>{
  const {records,c,ctx} = history();
  const replay = vi.spyOn(challengeEngines[1]!,'replay');
  const policy = vi.spyOn(policies,'createChallengePolicy');
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  expect(replay).toHaveBeenCalledTimes(24);
  replay.mockClear(); policy.mockClear();
  for (let i=0;i<3;i++) expect(validateIndividualChallenges(structuredClone(records),c,ctx)).toBeNull();
  expect(replay.mock.calls.length).toBe(0);
  expect(policy.mock.calls.length).toBe(0);

  // Content changes cannot borrow an old validation, even on the same objects.
  records[0]!.contest!.titleProbability += 0.01;
  expect(validateIndividualChallenges(records,c,ctx)).toBe('challenge replay');
  expect(replay).toHaveBeenCalledTimes(1);
});

it('still checks contextual identity and rewards after warming contest history',()=>{
  const {records,c,ctx} = history();
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  const reward = structuredClone(records);
  reward[0]!.award!.cash++;
  expect(validateIndividualChallenges(reward,c,ctx)).toBe('challenge completion');
  expect(validateIndividualChallenges(records,{...c,leagueCareer:{...c.leagueCareer!,scheduleSeed:c.leagueCareer!.scheduleSeed+1}},ctx)).toBe('challenge replay');
  const renamed = structuredClone(records);
  renamed[0]!.participantName = 'Different participant';
  expect(validateIndividualChallenges(renamed,c,ctx)).toBe('challenge replay');
  const altered = structuredClone(records);
  altered[0]!.contest!.commands = [{kind:'call',at:0}];
  expect(validateIndividualChallenges(altered,c,ctx)).toBe('challenge replay');
});

it('drops proofs absent from the latest validated history instead of retaining other careers',()=>{
  const {records,c,ctx} = history();
  const replay = vi.spyOn(challengeEngines[1]!,'replay');
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  expect(validateIndividualChallenges([records[0]!],c,ctx)).toBeNull();
  replay.mockClear();
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  expect(replay.mock.calls.length).toBe(23);
  replay.mockClear();
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  expect(replay.mock.calls.length).toBe(0);
});

it('does not let non-JSON mutations reuse an otherwise identical JSON proof',()=>{
  const {records,c,ctx} = history();
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  const altered = structuredClone(records);
  Object.assign(altered[0]!.contest!.clashes[0]!,{extra:undefined});
  expect(validateIndividualChallenges(altered,c,ctx)).toBe('challenge replay');
  const changedNull = structuredClone(records);
  Object.assign(changedNull[0]!.contest!.clashes[0]!,{attackTrait:NaN});
  expect(validateIndividualChallenges(changedNull,c,ctx)).toBe('challenge replay');
});

it.each([13,14])('preserves a long history proof across real drawn-Open-Cup validation in Week %s',week=>{
  const {records,c,ctx} = history();
  const state:GameState = JSON.parse(readFileSync(new URL(`../fixtures/saves/v34-challenges/v34-au-week-${week}.json`,import.meta.url),'utf8'));
  expect(state.competitions!.openCupEntry!.current.lifecycle).toBe('drawn');
  const replay = vi.spyOn(challengeEngines[1]!,'replay');
  const policy = vi.spyOn(policies,'createChallengePolicy');
  expect(validateIndividualChallenges(records,c,ctx)).toBeNull();
  replay.mockClear(); policy.mockClear();
  // Cup rendering/save validation checks the isolated cup instance recursively,
  // even when the current career has no challenge field of its own.
  expect(validateCompetitions(state.competitions,{pack:'au',season:state.season,week,clubIds:ctx.clubIds})).toBeNull();
  expect(validateIndividualChallenges(structuredClone(records),c,ctx)).toBeNull();
  expect(replay.mock.calls.length).toBe(0);
  expect(policy.mock.calls.length).toBe(0);
});

it('reuses a current completed challenge through the whole drawn-cup competition validator',()=>{
  const {records,c,ctx} = history(13,1,1);
  c.individualChallenges = records;
  const current = {...ctx,season:1,week:13};
  expect(c.openCupEntry!.current.lifecycle).toBe('drawn');
  const replay = vi.spyOn(challengeEngines[1]!,'replay');
  const policy = vi.spyOn(policies,'createChallengePolicy');
  expect(validateCompetitions(c,current)).toBeNull();
  expect(replay.mock.calls.length).toBe(1);
  replay.mockClear(); policy.mockClear();
  expect(validateCompetitions(structuredClone(c),current)).toBeNull();
  expect(replay.mock.calls.length).toBe(0);
  expect(policy.mock.calls.length).toBe(0);
  c.individualChallenges[0]!.contest!.titleProbability += 0.01;
  expect(validateCompetitions(c,current)).toBe('challenge replay');
});
