import { addBonusEventFatigue } from './weeklyFatigue';
import type { GameState, Player } from '../core/state';
import { CHALLENGE_EDITIONS, CHALLENGE_RULE_VERSION, type ChallengeCall, type ChallengeEditionId } from '../data/individualChallengeRules';
import { challengeEngines, challengeFixture, challengeId, type ChallengeContest, type IndividualChallengeRecord } from '../data/individualChallenges';
import { shownStats } from '../data/player';
import { supportedCampCalendar } from '../data/playerAssignments';
import { applyAssignmentAward } from './assignmentTraining';
import { creditPlayerPrize } from './competitionRewards';
import { advanceChallengeProgress, challengeCalls, challengeCheckpoint, challengeClashRoll, challengeEventSeed,
  freezeChallengeActor, initialChallengeProgress, resolveChallengeAction } from './individualChallengeEngine';
import { CHALLENGE_POLICY_VERSION, createChallengePolicy } from './individualChallengePolicy';
import { projectCampDeparture } from './playerAssignments';
import { levelPointSpendMode } from './training';

export type ChallengeAction = { kind: 'book'; participantId: string } | { kind: 'call'; call: ChallengeCall }
  | { kind: 'set-auto'; enabled: boolean } | { kind: 'start' | 'cancel' | 'withdraw' | 'auto-clash' | 'finish' | 'interrupt' };
export type ChallengeRefusal = {ok:false;reason:string;message:string};
export type ChallengeResult = {ok:true;state:GameState} | ChallengeRefusal;
export const refuseChallenge = (reason:string,message:string): ChallengeRefusal => ({ok:false,reason,message});

export function currentIndividualChallenge(state: GameState, edition: ChallengeEditionId): IndividualChallengeRecord | null {
  return state.competitions?.individualChallenges?.find(r=>r.editionId===edition && r.clubId===state.clubId && r.season===state.season) ?? null;
}
export function dueIndividualChallenge(state: GameState): IndividualChallengeRecord | null {
  return state.competitions?.individualChallenges?.find(r=>r.clubId===state.clubId && r.season===state.season
    && CHALLENGE_EDITIONS[r.editionId].eventWeek===state.week && ['booked','coaching','ready-for-interval'].includes(r.status)) ?? null;
}
export function challengeQualified(state: GameState): boolean {
  return !!state.competitions?.individualChallenges?.some(r=>r.clubId===state.clubId && r.editionId==='showground' && r.status==='completed' && r.contest?.progress.result==='won');
}
export function challengeHonours(state: GameState, playerId: string): IndividualChallengeRecord[] {
  return state.competitions?.individualChallenges?.filter(r=>r.participantId===playerId && r.status==='completed' && r.award?.honour) ?? [];
}
export function challengeCover(state: GameState, editionId: ChallengeEditionId, participantId: string) {
  const ed = CHALLENGE_EDITIONS[editionId];
  return projectCampDeparture(state,{participantId},ed.eventWeek,undefined,challengeId(state.season,state.clubId,editionId),ed.name);
}

function participantSnapshot(player: Player) {
  // Older player records can contain inert trait metadata. Persist only the
  // published identity and level in a versioned event snapshot.
  return freezeChallengeActor({...player,traits:player.traits.map(({id,level})=>({id,level}))});
}

function eventContext(state: GameState, editionId: ChallengeEditionId) {
  const c = state.competitions;
  if (!c || state.sacked || c.leagueCareer?.phase !== 'active' || !supportedCampCalendar(c,state.pack ?? 'au')) return null;
  const match = challengeFixture(c,state.season,state.clubId,editionId);
  return match?.fixture.status === 'scheduled' ? match : null;
}
export function challengeEntryPreview(state: GameState, editionId: ChallengeEditionId, participantId: string) {
  const edition = CHALLENGE_EDITIONS[editionId];
  const match = eventContext(state,editionId);
  if (!match) return refuseChallenge('closed','This contest needs an active League career and a scheduled club fixture.');
  if (edition.requiresFirstTitle && !challengeQualified(state)) return refuseChallenge('locked','Win Break the Line to unlock this invitation.');
  if (state.week < edition.bookingStartWeek || state.week > edition.bookingEndWeek) return refuseChallenge('closed','Registration is closed for this contest.');
  const existing = currentIndividualChallenge(state,editionId);
  if (existing && existing.status!=='cancelled') return refuseChallenge('booked','This edition already has an entry.');
  const projection = challengeCover(state,editionId,participantId);
  if (projection.reason) return refuseChallenge('ineligible',projection.reason);
  const actor = participantSnapshot(state.squad.find(p=>p.id===participantId)!);
  const titleProbability = createChallengePolicy(edition,actor).evaluate(initialChallengeProgress(actor)).titleProbability;
  const {fixture,league} = match;
  return {ok:true as const, actor, titleProbability, cover:projection.cover, role:projection.role, fixtureId:fixture.id, instanceId:league.id,
    opponentId:fixture.homeId===state.clubId ? fixture.awayId : fixture.homeId};
}

function replace(state: GameState, record: IndividualChallengeRecord): GameState {
  const c = state.competitions!;
  const records = c.individualChallenges ?? [];
  return {...state,competitions:{...c,individualChallenges:records.some(r=>r.id===record.id)
    ? records.map(r=>r.id===record.id ? record : r) : [...records,record]}};
}

/** Inspect a deliberate command without sampling the seeded contest. */
export function challengeActionProblem(state: GameState, editionId: ChallengeEditionId, action: ChallengeAction): ChallengeRefusal | null {
  if (action.kind === 'book') {
    const p = challengeEntryPreview(state,editionId,action.participantId);
    return p.ok ? null : p;
  }
  const r = currentIndividualChallenge(state,editionId);
  if (!r || !eventContext(state,editionId)) return refuseChallenge('closed','This contest is closed.');
  const due = CHALLENGE_EDITIONS[editionId].eventWeek === state.week;
  if (r.status==='booked' && (due ? action.kind==='start' || action.kind==='withdraw' : action.kind==='cancel')) return null;
  if (!due || !r.contest || r.status!=='coaching') return refuseChallenge('closed','This action is unavailable at this checkpoint.');
  const engine = challengeEngines[r.contest.engineVersion];
  if (!engine) return refuseChallenge('unsupported','The saved contest uses an unknown engine.');
  if (engine.status==='retired') return action.kind==='interrupt' ? null : refuseChallenge('retired','Resolve the interrupted contest to return the player.');
  const {autoCoach,progress,edition,actor} = r.contest;
  switch(action.kind) {
    case 'set-auto': if (typeof action.enabled==='boolean' && action.enabled!==autoCoach) return null; break;
    case 'call': {
      const checkpoint = challengeCheckpoint(edition,actor,progress);
      if (!autoCoach && checkpoint && challengeCalls(checkpoint).includes(action.call)) return null;
      break;
    }
    case 'auto-clash': if (autoCoach) return null; break;
    case 'finish': return null;
  }
  return refuseChallenge('closed','Review the current coaching choice.');
}

/** Pure transformation. The command owner verifies this candidate before installing it. */
export function changeChallenge(state: GameState, editionId: ChallengeEditionId, action: ChallengeAction): ChallengeResult {
  const edition = CHALLENGE_EDITIONS[editionId];
  const old = currentIndividualChallenge(state,editionId);
  const revision = (old?.revision ?? 0)+1;
  const done = (record:IndividualChallengeRecord): ChallengeResult => ({ok:true,state:replace(state,record)});
  if (action.kind==='book') {
    const p = challengeEntryPreview(state,editionId,action.participantId);
    if (!p.ok) return p;
    return done({id:challengeId(state.season,state.clubId,editionId),editionId,season:state.season,clubId:state.clubId,
      pack:state.pack ?? 'au',instanceId:p.instanceId,fixtureId:p.fixtureId,opponentId:p.opponentId,revision,bookingRevision:revision,
      participantId:p.actor.id,participantName:p.actor.name,bookedWeek:state.week,status:'booked',reason:null,contest:null,award:null,awardBasis:null});
  }
  const problem = challengeActionProblem(state,editionId,action);
  if (problem) return problem;
  const r = old!;
  if (action.kind==='cancel' || action.kind==='withdraw') return done({...r,status:'cancelled',revision,reason:'Withdrawn by the coach before departure.'});
  if (action.kind==='start') {
    const {reason} = challengeCover(state,editionId,r.participantId);
    if (reason) return done({...r,status:'cancelled',revision,reason});
    const actor = participantSnapshot(state.squad.find(p=>p.id===r.participantId)!);
    const progress = initialChallengeProgress(actor);
    const contest: ChallengeContest = {actor,edition:structuredClone(edition),engineVersion:CHALLENGE_RULE_VERSION,policyVersion:CHALLENGE_POLICY_VERSION,
      titleProbability:createChallengePolicy(edition,actor).evaluate(progress).titleProbability,
      eventSeed:challengeEventSeed(state.competitions!.leagueCareer!.scheduleSeed,r.id),autoCoach:false,clashes:[],commands:[],progress};
    return done({...r,status:'coaching',revision,participantName:actor.name,contest});
  }
  if (action.kind==='interrupt') return done({...r,status:'interrupted',revision,reason:'This contest engine has retired. The player returned without a development award or purse.'});
  const contest = r.contest!;
  const at = contest.progress.clashIndex;
  const commands = [...contest.commands, action.kind==='set-auto' ? {kind:action.kind,at,enabled:action.enabled} : {kind:action.kind,at}];
  if (action.kind==='set-auto') return done({...r,revision,contest:{...contest,commands,autoCoach:action.enabled}});
  const clashes = [...contest.clashes];
  let progress = contest.progress;
  const policy = action.kind==='call' ? null : createChallengePolicy(contest.edition,contest.actor);
  do {
    const checkpoint = challengeCheckpoint(contest.edition,contest.actor,progress)!;
    const call = action.kind==='call' ? action.call : policy!.choose(progress)!.call;
    const clash = resolveChallengeAction(checkpoint,call,challengeClashRoll(contest.eventSeed,progress.clashIndex));
    clashes.push(clash);
    progress = advanceChallengeProgress(progress,clash);
  } while (action.kind==='finish' && !progress.result);
  return done({...r,revision,status:progress.result ? 'ready-for-interval' : 'coaching',contest:{...contest,commands,clashes,progress}});
}

/** Called only on the detached completed club interval, after decline and before its final verified save. */
export function settleIndividualChallenge(state: GameState): GameState {
  const r = state.competitions?.individualChallenges?.find(r=>r.clubId===state.clubId && r.season===state.season
    && r.status==='ready-for-interval' && r.contest?.edition.returnWeek===state.week);
  if (!r) return state;
  const participant = state.squad.find(p=>p.id===r.participantId);
  if (!participant) throw Error('The returning challenge participant is missing.');
  const {edition,progress} = r.contest!;
  const won = progress.result==='won';
  const cash = won ? edition.winnerCash : 0;
  const awardBasis = {age:participant.age,clubFocus:state.training.focus,
    xpTraits:participant.traits.filter(t=>t.id==='youngGun'||t.id==='workhorse').map(({id,level})=>({id,level})),
    stats:Object.fromEntries(shownStats(participant.position).map(k=>[k,participant.stats[k]]))};
  const {player,receipt} = applyAssignmentAward(participant,edition.completionXp+(won ? edition.winnerXp : 0),
    {mode:levelPointSpendMode(state.settings.spendPointsMyself),clubFocus:awardBasis.clubFocus});
  const credited = cash ? creditPlayerPrize(state,r.season,cash) : state;
  return replace(addBonusEventFatigue({...credited,squad:state.squad.map(p=>p.id===player.id ? player : p)}, [player.id]),
    {...r,status:'completed',revision:r.revision+1,awardBasis,award:{cash,honour:won ? edition.honour : null,xp:receipt}});
}
