import { emptyFinance, type GameState } from '../core/state';
import { careerActionClock } from '../core/season';
import type { LeagueEntryReceipt } from '../data/leagueCareer';
import type { LeagueFields } from '../data/divisions';
import { buildSavedLeagueSchedule } from '../data/leagueSchedule';
import { competitionLadder } from './competitionCalendar';
import { leagueEntryAccount } from './leagueSelection';
import { entryQuote } from './leagueEntryQuote';
import { expirePlayerDeals } from './economy';
import { agePlayerPopulation } from './aging';
import { applyAnnualYouth } from './youth';
import { rolloverRivalPopulationChecked } from './rivals';
import { applyTenure, buildAnnualReviewAdditions, snapshotBeforeRollover } from './stats';
import { normaliseContractForAction, reconcileClubProtection } from './cap';
import { resolveLineup } from './lineup';

/** Detached candidate. The caller owns source/candidate validation and installation. */
export function annualLeagueEntry(source: GameState, fields: LeagueFields, receipt: LeagueEntryReceipt) {
  const season = receipt.season;
  const c = source.competitions!;
  const progress = c.leagueCareer!;
  const draw = buildSavedLeagueSchedule(c, season, fields, progress.scheduleSeed, source.league.clubs.map(club => club.id));
  const ranks = new Map(draw.world.divisions.flatMap(d => fields[d.id]!.map(id => [id, d.rank] as const)));
  const clubs = source.league.clubs.map(club => club.id === source.clubId ? club :
    { ...club, capAccount: leagueEntryAccount(club.capAccount!, ranks.get(club.id)!) });
  const instance = draw.instances.find(i => i.id === receipt.quote.definitionInstanceId)!;
  const before = snapshotBeforeRollover(source);
  let next: GameState = {
    ...source, season, week: 1, preseason: 0, capAccount: leagueEntryAccount(source.capAccount, ranks.get(source.clubId)!),
    league: { ...source.league, clubs, fixtures: [], ladder: competitionLadder(instance) },
    finance: source.finance.some(f => f.season === season) ? source.finance : [...source.finance, emptyFinance(season)],
    matchIncome: source.matchIncome.filter(r => r.season >= source.season),
    competitions: {
      ...c, world: draw.world, instances: [...c.instances.filter(i => i.season === source.season), ...draw.instances],
      calendar: { ...c.calendar!, season, status: 'active', slots: draw.slots }, leagueCareer: { ...progress, phase: 'active', accepted: receipt }
    }
  };
  const clock = careerActionClock(next);
  const expiry = expirePlayerDeals(next, clock.duration);
  const aging = agePlayerPopulation(expiry.state);
  const youth = applyAnnualYouth(aging.state, clock.duration);
  if (!youth.ok) throw new Error(youth.error);
  const rivals = rolloverRivalPopulationChecked(youth.state);
  if (!rivals.ok) throw new Error(rivals.error);
  const settled = rivals.state;
  next = reconcileClubProtection({
    ...settled, rngSeed: rivals.rngSeed,
    freeAgents: settled.freeAgents.map(p => normaliseContractForAction(p, clock)),
    squad: applyTenure(settled.squad, source.season, season).map(p => normaliseContractForAction(p, clock)),
    league: {
      ...settled.league, clubs: settled.league.clubs.map(club => club.squad ?
        { ...club, squad: club.squad.map(p => normaliseContractForAction(p, clock)) } : club)
    }
  });
  const additions = buildAnnualReviewAdditions(before, next);
  next = {
    ...next, lineup: resolveLineup(next.lineup, next.squad).lineup,
    history: next.history.map(h => h.season === source.season ? { ...h, review: { ...h.review, ...additions } } : h)
  };
  const after = entryQuote(next, season, receipt.leagueId, fields, receipt.movements);
  const preMarketIds = new Set([...youth.state.squad, ...youth.state.freeAgents, ...youth.state.league.clubs.flatMap(c => c.squad ?? [])].map(p => p.id));
  const rivalRenewals = next.league.clubs.reduce((total, club) => {
    const old = source.league.clubs.find(c => c.id === club.id);
    return total + (club.squad?.filter(p => {
      const deal = old?.squad?.find(person => person.id === p.id)?.deal;
      return deal && deal.endSeason < season && !deal.renewal && p.deal?.startSeason === season;
    }).length ?? 0);
  }, 0);
  const annualChanges = {
    opponents: after.opponents, commitments: after.commitments,
    retirements: next.playerPopulation.retired.filter(p => p.retiredAt.season === season).length,
    academyBirths: youth.state.freeAgents.length - aging.state.freeAgents.length + youth.state.squad.length - aging.state.squad.length,
    marketBirths: next.freeAgents.filter(p => !preMarketIds.has(p.id)).length, rivalRenewals
  };
  next = { ...next, competitions: { ...next.competitions!, leagueCareer: { ...next.competitions!.leagueCareer!, accepted: { ...receipt, annualChanges } } } };
  return { state: next, notices: [...expiry.notices, ...aging.notices, ...youth.notices, ...rivals.notices] };
}
