import type { IndividualChallengeRecord } from '../data/individualChallenges';
import type { RunningCamp } from '../data/playerAssignments';
import { SAVE_VERSION, type GameState } from '../core/state';
import { careerActionClock } from '../core/season';
import { validateCurrent, validateInput } from '../core/saveValidation';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { competitionFixtureId } from '../data/competition';
import { DIVISION_TIERS } from '../data/financeRules';
import { savedTrialDefinitions } from '../data/leagueSchedule';
import { MARKET_SHORTLIST_SIZE } from './playerCareer';
import { juniorCount } from './youth';
import { divisionTrialDefinitionId } from '../data/divisions';
import { competitionLadder, competitionRulesProblem, structuralPolicyProblem } from './competitionCalendar';
import { isOpenCupInstance } from './openCup';
import { entryQuote } from './leagueEntryQuote';
import { leagueAccessFromClose } from './leagueSelection';

function strictStateProblem(state: GameState, runningCamp?: RunningCamp, runningChallenge?: IndividualChallengeRecord): string | null {
  const data = state as unknown as Record<string, unknown>;
  const problem = validateInput(data, state.version,runningCamp,runningChallenge);
  if (problem) return problem;
  const checked = validateCurrent(data,runningCamp,runningChallenge);
  if (!checked.ok) return checked.message;
  if (checked.repairs.length || (checked.state !== state && canonicalLeagueJson(checked.state) !== canonicalLeagueJson(state)))
    return 'The League career requires a save repair.';
  return null;
}

function runtimeProblem(state: GameState): string | null {
  const c = state.competitions!;
  const initial = c.leagueCareer!.phase === 'initial-choice';
  const structural = structuralPolicyProblem(state);
  if (structural) return structural;
  const trialId = divisionTrialDefinitionId(c.world!.profile.id);
  for (const i of c.instances.filter(i => i.season === state.season)) {
    const d = i.definition;
    if (d.format.kind !== 'league' && d.id !== trialId) {
      if (!isOpenCupInstance(i)) return 'This competition format is unsupported in a League career.';
      if (initial && i.entrantIds.includes(state.clubId)) return 'Opening League entry cannot register the club for another competition.';
      continue;
    }
    const rules = competitionRulesProblem(d);
    if (rules) return rules;
    if (d.rewards.length || d.venues.rounds !== 'home-away')
      return 'This League reward or venue policy is unsupported.';
    const first = d.stages[0]!;
    if (d.format.kind === 'league') {
      const size = i.entrantIds.length;
      if (size < 2 || size % 2 !== 0 || first.rounds < size - 1 || first.rounds > 2 * (size - 1))
        return 'This League field size or round count is unsupported.';
      // Finals append at fixtures.length. Validate the namespace as a set so
      // reordering saved fixtures cannot reserve a future bracket identity.
      const fixtureIds = new Set(i.fixtures.map(f => f.id));
      if (i.fixtures.some((_, ordinal) => !fixtureIds.has(competitionFixtureId(i.id, ordinal))))
        return 'This League fixture identity sequence is unsupported.';
      const finals = d.stages[1];
      if (first.kind !== 'league' || (d.format.finalsSize ? d.stages.length !== 2 || finals?.kind !== 'knockout'
        || finals.rounds !== Math.log2(d.format.finalsSize) || d.venues.final !== 'neutral' || d.drawnKnockout !== 'seeded-draw' : d.stages.length !== 1))
        return 'This League finals layout is unsupported.';
      const regular = i.fixtures.filter(f => f.stageId === first.id);
      if (i.status !== 'withdrawn' && regular.length !== i.entrantIds.length / 2 * first.rounds)
        return 'The League regular draw is incomplete.';
      if (initial && regular.length !== i.fixtures.length) return 'The opening League finals are already drawn.';
    } else if (d.format.kind !== 'exhibition' || d.stages.length !== 1 || first.kind !== 'exhibition' || first.rounds !== 1
      || d.venues.final !== 'same-as-rounds') return 'This League trial layout is unsupported.';
    if (initial && (i.status !== 'scheduled' || i.fixtures.some(f => f.status !== 'scheduled')))
      return 'The opening League fixtures have already changed.';
  }
  return null;
}

/** Player history is complete; AI history only retains the recent draws. */
function capacityProblem(state: GameState): string | null {
  const c = state.competitions!;
  const progress = c.leagueCareer!;
  const divisions = c.world!.divisions;
  const rank = (leagueId: string) => divisions.find(d => d.id === leagueId)!.rank;
  for (const club of state.league.clubs) {
    const player = club.id === state.clubId;
    const account = player ? state.capAccount : club.capAccount;
    if (!account) return 'A club is missing its financial account.';
    const initialRank = divisions.find(d => progress.initialFields[d.id]!.includes(club.id))!.rank;
    const priorInstances = c.instances.filter(i => i.season < state.season && i.definition.format.kind === 'league' && i.entrantIds.includes(club.id));
    const priorRanks = player
      ? state.history.filter(h => h.season < state.season).map(h => rank(h.league!.leagueId))
      : priorInstances.map(i => divisions.find(d => i.definition.id === `${c.world!.profile.id}:${d.id}`)!.rank);
    // Initial membership supplies S1 even after that draw is pruned. Only
    // missing later years make an AI club's higher attained tier unknowable.
    const observedYears = new Set([1, ...priorInstances.map(i => i.season)]);
    const completeHistory = player || Array.from({ length: state.season - 1 }, (_, i) => i + 1).every(year => observedYears.has(year));
    const previousRank = Math.max(initialRank, ...priorRanks);
    const currentRank = divisions.find(d => c.instances.find(i => i.id === d.instanceId)!.entrantIds.includes(club.id))!.rank;
    const attainedRank = Math.max(previousRank, currentRank);
    const actualRank = DIVISION_TIERS.indexOf(account.tier);
    if (completeHistory ? actualRank !== attainedRank : actualRank < attainedRank)
      return 'Club capacity differs from its observed League attainment.';
    const quote = progress.accepted?.quote.commitments.find(q => q.clubId === club.id);
    if (quote) {
      const quotedPrevious = DIVISION_TIERS.indexOf(quote.previousTier);
      if (completeHistory ? quotedPrevious !== previousRank : quotedPrevious < previousRank)
        return 'The entry capacity differs from the club prior League attainment.';
    }
  }
  return null;
}

interface LeagueStateProblem { reason: 'invalid' | 'unsupported'; message: string; }

// Admission reads only the state and the evidence passed with it. States are
// replaced, never edited in place, so one state object is walked once for the
// same evidence: the league chooser previews every league from one state, and
// confirming and the first advance after it ask about the same states again.
const admissions = new WeakMap<GameState, {runningCamp: RunningCamp | undefined; runningChallenge: IndividualChallengeRecord | undefined; problem: LeagueStateProblem | null}>();

/** Strict admission of an already marked League save. Does not select a pack,
 * install the state, recover prototypes or grant entry to a storage namespace. */
export function leagueCareerStateProblem(state: GameState, runningCamp?: RunningCamp, runningChallenge?: IndividualChallengeRecord): LeagueStateProblem | null {
  const seen = admissions.get(state);
  if (seen && seen.runningCamp === runningCamp && seen.runningChallenge === runningChallenge) return seen.problem;
  const problem = admissionProblem(state, runningCamp, runningChallenge);
  admissions.set(state, {runningCamp, runningChallenge, problem});
  return problem;
}

function admissionProblem(state: GameState, runningCamp?: RunningCamp, runningChallenge?: IndividualChallengeRecord): LeagueStateProblem | null {
  try {
    const c = state.competitions;
    const progress = c?.leagueCareer;
    if (!progress || !c.world || state.boardLoan?.owed !== 0)
      return { reason: 'invalid', message: 'Missing League career or outstanding board debt.' };
    if (state.version !== SAVE_VERSION) return { reason: 'unsupported', message: 'This League career format is unsupported.' };
    const offer = c.openCupEntry?.current;
    if (offer?.lifecycle === 'drawn' && state.week < offer.deadline)
      return { reason: 'invalid', message: 'The Open Cup draw was published before registration closed.' };
    const invalid = strictStateProblem(state,runningCamp,runningChallenge);
    if (invalid) return { reason: 'invalid', message: invalid };
    const unsupported = runtimeProblem(state);
    if (unsupported) return { reason: 'unsupported', message: unsupported };
    if (state.freeAgents.some(p => p.deal)) return { reason: 'invalid', message: 'An unsigned player has a signed deal.' };
    const actionSeason = careerActionClock(state).season;
    const bookYears = state.finance.map(line => line.season);
    if (new Set(bookYears).size !== bookYears.length || bookYears.some(year => year > actionSeason))
      return { reason: 'invalid', message: 'The League accounts contain a duplicate or future year.' };
    const leagues = c.world.divisions.map(d => c.instances.find(i => i.id === d.instanceId)!);
    const fields = Object.fromEntries(c.world.divisions.map((d,i) => [d.id, leagues[i]!.entrantIds]));
    const own = leagues.find(i => i.entrantIds.includes(state.clubId))!;
    if (state.league.fixtures.length || canonicalLeagueJson(state.league.ladder) !== canonicalLeagueJson(competitionLadder(own)))
      return { reason: 'invalid', message: 'The club ladder differs from the accepted League field.' };
    savedTrialDefinitions(c.world.profile.id, leagues, c.instances.filter(i => i.season === state.season), c.calendar!.slots);
    if (state.playerPopulation.lastAcademyIntakeSeason !== state.season || state.playerPopulation.lastMarketIntakeSeason !== state.season)
      return { reason: 'invalid', message: 'League population intake is out of sequence.' };
    const capacity = capacityProblem(state);
    if (capacity) return { reason: 'invalid', message: capacity };
    const receipt = progress.accepted;
    if (receipt) {
      const capacity = receipt.annualChanges?.commitments ?? receipt.quote.commitments;
      if (capacity.some(q => (q.clubId === state.clubId ? state.capAccount : state.league.clubs.find(c => c.id === q.clubId)?.capAccount)?.tier !== q.tier))
        return { reason: 'invalid', message: 'Club capacity differs from its retained entry tier.' };
      const changes = receipt.annualChanges;
      const lineup = leagues.find(i => i.id === receipt.quote.definitionInstanceId)!.definition.lineup;
      if (changes && (changes.retirements !== state.playerPopulation.retired.filter(p => p.retiredAt.season === state.season).length
        || changes.academyBirths > juniorCount(3) + lineup.minSquad || changes.marketBirths > MARKET_SHORTLIST_SIZE
        || changes.rivalRenewals > (state.league.clubs.length - 1) * lineup.maxSquad))
        return { reason: 'invalid', message: 'Invalid annual League population counts.' };
    }
    const current = progress.accepted?.leagueId ?? c.world.profile.startingDivisionId;
    entryQuote(state, actionSeason, current, fields, []);
    if (progress.phase === 'next-season-choice' && leagueAccessFromClose(progress, progress.close!, c.world, c.instances).length !== progress.access.length)
      return { reason: 'invalid', message: 'A completed title is missing its league unlock.' };
    return null;
  } catch (error) {
    return { reason: 'invalid', message: error instanceof Error ? error.message : 'Invalid League career.' };
  }
}
