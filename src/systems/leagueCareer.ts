import type { GameState } from '../core/state';
import { completedLeagueFinal, leagueCloseFacts, leagueHistoryFacts } from '../data/leagueCareer';
import { competitionLadder } from './competitionCalendar';
import { reconcileMatchIncome } from './matchIncome';
import { leagueAccessFromClose } from './leagueSelection';
import { recordSeasonHonours } from './fixtures';
import { applySeasonReputation } from './league';
import { reviewObjectives, sackingReason } from './board';
import { buildCompletedSeasonReview } from './stats';
import { validateInput } from '../core/saveValidation';

/** Complete the settled final interval without beginning next season. */
export function closeLeagueSeason(state: GameState): GameState {
  const c = state.competitions; const progress = c?.leagueCareer; const calendar = c?.calendar;
  if (!c?.world || !progress || progress.phase !== 'active' || !calendar || calendar.status !== 'active'
    || state.week !== calendar.slots.length || state.boardLoan.owed !== 0
    || state.history.some(h => h.season === state.season)) return state;
  if (validateInput(state as unknown as Record<string, unknown>, state.version)) return state;
  let close;
  try {close = leagueCloseFacts(c.world, c.instances, state.season, progress.accepted!.startInterval);} catch {return state;}
  if (!c.instances.filter(i => i.season === state.season).every(i => ['completed', 'withdrawn', 'declined'].includes(i.status))) return state;
  const own = close.leagues.find(l => c.instances.find(i => i.id === l.instanceId)?.entrantIds.includes(state.clubId))!;
  const instance = c.instances.find(i => i.id === own.instanceId)!;
  const ladder = competitionLadder(instance);
  const position = own.standings.find(r => r.clubId === state.clubId)!.position;
  const finalStage = [...instance.definition.stages].reverse().find(s => s.kind === 'knockout');
  const played = instance.fixtures.filter(f => f.status === 'completed' && f.result
    && instance.definition.stages.find(s => s.id === f.stageId)?.kind === 'knockout' && (f.homeId === state.clubId || f.awayId === state.clubId));
  const final = completedLeagueFinal(instance);
  const playedGrandFinal = !!final && (final.homeId === state.clubId || final.awayId === state.clubId);
  const outcome = {ladderPosition: position, positions: Object.fromEntries(own.standings.map(r => [r.clubId, r.position])),
    finalsPlayed: played.length, playedGrandFinal, premiership: own.championId === state.clubId};
  // Every saved source-year promise settles before books and sporting facts freeze.
  let next = reconcileMatchIncome(state);
  if (next.matchIncome.some(r => r.season === state.season && !r.receipt)) return state;
  next = recordSeasonHonours({...next, league: {...next.league, ladder}}, {season: state.season, clubId: state.clubId, ladderPosition: position, championId: own.championId});
  const reputation = applySeasonReputation(next.reputation, {ladderPosition: position, clubCount: instance.entrantIds.length,
    finalsWins: played.filter(f => !(f.stageId === finalStage?.id && f.round === finalStage.rounds) && f.result!.winnerId === state.clubId).length,
    playedGrandFinal, premiership: outcome.premiership}).reputation;
  const board = reviewObjectives({...next, reputation}, outcome);
  next = {...next, reputation: board.reputation, boardPatience: board.patience, objectives: board.objectives,
    ...(board.sacked && !state.sacked ? {sacked: {season: state.season, reason: sackingReason(board)}} : {})};
  const review = buildCompletedSeasonReview({season: state.season, reputation: state.reputation}, next);
  return {...next, history: next.history.map(h => h.season === state.season ? {...h, league: leagueHistoryFacts(close, instance, own.leagueId, state.clubId), review} : h),
    competitions: {...c, leagueCareer: {...progress, phase: 'next-season-choice', close,
      access: leagueAccessFromClose(progress, close, c.world, c.instances)},
    calendar: {...calendar, status: 'awaiting-next-season', elapsedIntervals: close.endingInterval}}};
}
