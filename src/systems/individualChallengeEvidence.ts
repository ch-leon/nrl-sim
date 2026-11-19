// Validate saved decisions and receipts using their original version, including
// historical records after the fixture or the participant has left the club.
import type { GameState } from '../core/state';
import type { CompetitionCareerState } from '../data/competition';
import { competitionFixtureId } from '../data/competition';
import { CHALLENGE_EDITIONS, CHALLENGE_RATINGS, type ChallengeActor } from '../data/individualChallengeRules';
import { challengeEngines, challengeFixture, challengeId, challengeRound, type ChallengeContest, type ChallengeEngineVersion, type IndividualChallengeRecord } from '../data/individualChallenges';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { shownStats } from '../data/player';
import { supportedCampCalendar, validAssignmentAward, validAssignmentBasis } from '../data/playerAssignments';
import { TRAIT_IDS } from '../data/traits';
import { ageMod, traitMult } from './training';
import { applyAssignmentAward } from './assignmentTraining';
import { advanceChallengeProgress, freezeChallengeActor, initialChallengeProgress } from './individualChallengeEngine';
import { challengeEventSeed } from './individualChallengeEngine';
import { CHALLENGE_POLICY_VERSION, createChallengePolicy } from './individualChallengePolicy';

const object = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const fields = (v:unknown,keys:string[]) => object(v) && Object.keys(v).length===keys.length && keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const integer = (n:number,min:number,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n>=min && n<=max;
const text = (s:unknown) => typeof s==='string' && !!s.trim();
const same = (a:unknown,b:unknown) => canonicalLeagueJson(a)===canonicalLeagueJson(b);

function validActor(a:ChallengeActor,r:IndividualChallengeRecord): boolean {
  return fields(a,['id','name','ratings','traits']) && a.id===r.participantId && a.name===r.participantName
    && fields(a.ratings,[...CHALLENGE_RATINGS]) && CHALLENGE_RATINGS.every(k=>integer(a.ratings[k],1,100))
    && Array.isArray(a.traits) && a.traits.every(t=>fields(t,['id','level']) && TRAIT_IDS.includes(t.id) && integer(t.level,1,3))
    && new Set(a.traits.map(t=>t.id)).size===a.traits.length;
}

// Canonical content, not object identity, protects against mutated objects on import.
// Limit retained DP tables to actors recently checked by the match pipeline.
const policies = new Map<string,ReturnType<typeof createChallengePolicy>>();
function policyFor(c:ChallengeContest) {
  const key = canonicalLeagueJson([c.engineVersion,c.policyVersion,c.edition.id,c.actor]);
  const existing = policies.get(key);
  if (existing) return existing;
  const policy = createChallengePolicy(c.edition,c.actor);
  if (policies.size>=16) policies.delete(policies.keys().next().value!);
  policies.set(key,policy);
  return policy;
}

// Keep only the inexpensive proofs from the last successful history sweep. A fixed
// entry cap thrashes when every save walks a longer career in the same order;
// retaining all its DP tables would instead grow much heavier with each season.
// Canonical contents survive cloned saves and cannot bless an in-place mutation.
let contestProofs = new Map<string,ChallengeEngineVersion['replay']>();
// JSON would omit undefined fields or replace non-finite values with null. Those
// in-memory mutations must go through strict replay, not borrow a saved proof.
function jsonProofSafe(value:unknown):boolean {
  if (value===null || typeof value==='string' || typeof value==='boolean') return true;
  if (typeof value==='number') return Number.isFinite(value);
  if (Array.isArray(value)) return Object.keys(value).length===value.length
    && Array.from(value).every(jsonProofSafe);
  return object(value) && Object.values(value).every(jsonProofSafe);
}
function validContest(contest: ChallengeContest, r: IndividualChallengeRecord, careerSeed:number, proofs:typeof contestProofs):boolean {
  if (!fields(contest,['actor','edition','engineVersion','policyVersion','eventSeed','autoCoach','titleProbability','clashes','commands','progress'])
    || !integer(contest.engineVersion,1) || contest.policyVersion!==CHALLENGE_POLICY_VERSION || !validActor(contest.actor,r)
    || !Array.isArray(contest.clashes) || contest.clashes.length>7 || !Array.isArray(contest.commands)
    || contest.eventSeed!==challengeEventSeed(careerSeed,r.id)) return false;
  const engine = challengeEngines[contest.engineVersion];
  if (!engine || !same(contest.edition,engine.editions[r.editionId])) return false;
  const proof = jsonProofSafe(contest) ? canonicalLeagueJson([careerSeed,r.id,r.editionId,r.participantId,r.participantName,contest]) : null;
  if (proof!==null && contestProofs.get(proof)===engine.replay) {
    proofs.set(proof,engine.replay);
    return true;
  }
  const replayed = engine.replay(contest.edition,contest.actor,contest.eventSeed,contest.clashes);
  if (!replayed || !same(replayed,contest.progress)) return false;
  const policy = policyFor(contest);
  let progress = initialChallengeProgress(contest.actor);
  if (policy.evaluate(progress).titleProbability!==contest.titleProbability) return false;
  let auto = false;
  for (const cmd of contest.commands) {
    if (!cmd || cmd.at!==progress.clashIndex || progress.result!==null) return false;
    if (cmd.kind==='set-auto') {
      if (!fields(cmd,['kind','at','enabled']) || typeof cmd.enabled!=='boolean' || cmd.enabled===auto) return false;
      auto = cmd.enabled;
      continue;
    }
    if (!fields(cmd,['kind','at']) || !['call','auto-clash','finish'].includes(cmd.kind)
      || (cmd.kind==='call' && auto) || (cmd.kind==='auto-clash' && !auto)) return false;
    do {
      const clash = contest.clashes[progress.clashIndex];
      if (!clash || (cmd.kind!=='call' && policy.choose(progress)?.call!==clash.playerCall)) return false;
      progress = advanceChallengeProgress(progress,clash);
    } while (cmd.kind==='finish' && !progress.result);
  }
  if (auto!==contest.autoCoach || progress.clashIndex!==contest.clashes.length) return false;
  if (proof!==null) proofs.set(proof,engine.replay);
  return true;
}

interface Context {pack:string; season:number; week?:number; clubIds:readonly string[]; runningChallenge?: IndividualChallengeRecord | undefined}
export function validateIndividualChallenges(value: unknown, c: CompetitionCareerState, ctx: Context): string|null {
  if (value===undefined) {
    if (ctx.runningChallenge) return 'missing running challenge';
    contestProofs.clear();
    return null;
  }
  if (!Array.isArray(value) || !c.leagueCareer || c.leagueCareer.phase==='initial-choice' || !supportedCampCalendar(c,ctx.pack)) return 'challenge calendar';
  const proofs: typeof contestProofs = new Map();
  const seen = new Set<string>();
  const titles:number[] = [];
  const entries = value as IndividualChallengeRecord[];
  for (const r of entries) {
    if (!fields(r,['id','editionId','season','clubId','pack','instanceId','fixtureId','opponentId','revision','bookingRevision','status','participantId','participantName','bookedWeek','reason','contest','award','awardBasis'])
      || !Object.prototype.hasOwnProperty.call(CHALLENGE_EDITIONS,r.editionId) || !integer(r.season,1,ctx.season) || r.clubId!==c.leagueCareer.clubId
      || r.id!==challengeId(r.season,r.clubId,r.editionId) || seen.has(r.id) || r.pack!==ctx.pack || !integer(r.revision,1)
      || !integer(r.bookingRevision,1,r.revision) || !(r.bookingRevision%2) || !text(r.participantId) || !text(r.participantName)
      || !text(r.instanceId) || !text(r.fixtureId) || !ctx.clubIds.includes(r.opponentId) || r.opponentId===r.clubId) return 'challenge identity';
    seen.add(r.id);
    const ed = CHALLENGE_EDITIONS[r.editionId];
    const week = r.season===ctx.season ? ctx.week ?? (c.leagueCareer.phase==='next-season-choice' ? 25 : ed.eventWeek) : 25;
    if (!integer(r.bookedWeek,ed.bookingStartWeek,Math.min(week,ed.bookingEndWeek))) return 'challenge booking date';
    const match = challengeFixture(c,r.season,r.clubId,r.editionId);
    if (c.instances.some(i=>i.season===r.season) && (!match || match.league.id!==r.instanceId || match.fixture.id!==r.fixtureId
        || (match.fixture.homeId===r.clubId ? match.fixture.awayId : match.fixture.homeId)!==r.opponentId)) return 'challenge fixture';
    if (r.status==='cancelled' || r.status==='booked') {
      if (r.contest!==null || r.awardBasis!==null || r.award!==null) return 'unearned challenge effects';
      if (r.status==='cancelled' ? r.revision!==r.bookingRevision+1 || !text(r.reason)
        : r.revision!==r.bookingRevision || r.reason!==null || week>ed.eventWeek || match?.fixture.status!=='scheduled') return 'challenge reservation';
      continue;
    }
    const contest = r.contest;
    if (!contest || !validContest(contest,r,c.leagueCareer.scheduleSeed,proofs)) return 'challenge replay';
    const terminal = r.status==='completed' || r.status==='interrupted';
    if (r.revision!==r.bookingRevision+1+contest.commands.length+Number(terminal)) return 'challenge revision';
    if (r.status==='interrupted') {
      if (!text(r.reason) || week<ed.eventWeek || contest.progress.result || r.award!==null || r.awardBasis!==null
        || challengeEngines[contest.engineVersion]?.status!=='retired') return 'challenge interruption';
      continue;
    }
    if (r.reason!==null) return 'challenge reason';
    if (r.status==='coaching' || r.status==='ready-for-interval') {
      if (week!==ed.eventWeek || r.season!==ctx.season || r.award!==null || r.awardBasis!==null
        || (r.status==='coaching')!==(contest.progress.result===null)) return 'challenge decision boundary';
      if (match?.fixture.status!=='scheduled' && !(r.status==='ready-for-interval' && same(ctx.runningChallenge,r))) return 'challenge club interval';
      continue;
    }
    const won = contest.progress.result==='won';
    if (r.status!=='completed' || week<ed.returnWeek || !contest.progress.result || !validAssignmentBasis(r.awardBasis)
      || !r.award || !fields(r.award,['xp','cash','honour']) || !validAssignmentAward(r.award.xp, (ed.completionXp+(won ? ed.winnerXp : 0))*ageMod(r.awardBasis!.age)*traitMult({traits:r.awardBasis!.xpTraits})+1e-8)
      || r.award.cash!==(won ? ed.winnerCash : 0) || r.award.honour!==(won ? ed.honour : null)
      || (match && !['completed','cancelled'].includes(match.fixture.status))) return 'challenge completion';
    if (won && r.editionId==='showground') titles.push(r.season);
  }
  if (ctx.runningChallenge && !entries.some(r=>same(r,ctx.runningChallenge))) return 'the running contest differs from its saved checkpoint';
  if (entries.some(r=>r.editionId==='invitational' && !titles.some(year=>year<=r.season))) return 'unearned challenge invitation';
  contestProofs = proofs;
  return null;
}

export function individualChallengeOwnerProblem(state:GameState, runningChallenge?:IndividualChallengeRecord): string|null {
  for (const r of state.competitions?.individualChallenges ?? []) {
    const ed = CHALLENGE_EDITIONS[r.editionId];
    if (r.season<state.season) {
      const h = state.history.find(h=>h.season===r.season)?.league;
      const ordinal = Number(r.fixtureId.slice(r.instanceId.length+2));
      const start = (challengeRound(r.editionId)-1)*(h?.fieldSize ?? 0)/2;
      if (!h || h.instanceId!==r.instanceId || !integer(ordinal,start,start+h.fieldSize/2-1)
        || competitionFixtureId(r.instanceId,ordinal)!==r.fixtureId) return 'challenge historical fixture';
    }
    const owned = state.squad.find(p=>p.id===r.participantId);
    if (!owned && ['booked','coaching','ready-for-interval'].includes(r.status)) return 'challenge participant ownership';
    const person = owned ?? state.freeAgents.find(p=>p.id===r.participantId) ?? state.league.clubs.flatMap(c=>c.squad ?? []).find(p=>p.id===r.participantId)
      ?? state.playerPopulation.retired.find(p=>p.id===r.participantId);
    const until = r.status==='completed' ? ed.returnWeek : r.contest ? ed.eventWeek : r.bookedWeek;
    if (!person || !person.clubHistory?.spells.some(s=>s.clubId===r.clubId && (s.start.season<r.season || (s.start.season===r.season && s.start.week<=r.bookedWeek))
      && (!s.end || s.end.season>r.season || (s.end.season===r.season && s.end.week>=until)))) return 'challenge participant history';
    if (owned && r.contest && (r.status==='coaching' || r.status==='ready-for-interval') && runningChallenge?.id!==r.id) {
      const snapshot = freezeChallengeActor({...owned,traits:owned.traits.map(({id,level})=>({id,level}))});
      if (!same(snapshot.ratings,r.contest.actor.ratings) || !same(snapshot.traits,r.contest.actor.traits))
        return 'challenge departure abilities differ from the owned participant';
    }
    if (!r.award || !r.awardBasis) continue;
    const basis = r.awardBasis;
    const lastAged = 'retiredAt' in person ? person.retiredAt.season : state.season;
    if (basis.age!==person.age-(lastAged-r.season) || !shownStats(person.position).every(k=>basis.stats[k]!==undefined && basis.stats[k]!<=person.ceilings[k]!))
      return 'challenge development inputs';
    const xp = r.award.xp;
    const before = {position:person.position,ceilings:person.ceilings,age:basis.age,traits:basis.xpTraits,stats:{...person.stats,...basis.stats},
      xp:xp.xpBefore,level:1,unspentPoints:xp.bankedBefore};
    const expected = applyAssignmentAward(before,ed.completionXp+(r.contest!.progress.result==='won' ? ed.winnerXp : 0),
      {mode:xp.mode,clubFocus:basis.clubFocus});
    if (!same(expected.receipt,xp)) return 'challenge development receipt';
  }
  return null;
}
