// Inactive, pure selection primitives. No store, notifications or career RNG.
import type { CompetitionInstance } from '../data/competition';
import type { CompetitionWorldMetadata } from '../data/competitionDivisions';
import { completedLeagueFinal, leagueTitleEvidence, type LeagueAccess, type LeagueCloseFacts, type LeagueProgress, type LeagueMovement } from '../data/leagueCareer';
import type { LeagueFields } from '../data/divisions';
import { commitment, publishedCap, tierCap, tierForRank, type CapAccount, type SignedDeal } from './cap';

/** Union permanent access only when the close points at a real player-won final. */
export function leagueAccessFromClose(progress: LeagueProgress, close: LeagueCloseFacts, world: CompetitionWorldMetadata,
  instances: readonly CompetitionInstance[]): LeagueAccess[] {
  const access = progress.access.map(a => ({ ...a, ...(a.earnedFrom ? { earnedFrom: {...a.earnedFrom, result: {...a.earnedFrom.result}} } : {}) }));
  for (const fact of close.leagues) {
    const source = world.divisions.find(d => d.id === fact.leagueId);
    const harder = world.divisions.find(d => d.rank === (source?.rank ?? -2) + 1);
    const instance = instances.find(i => i.id === fact.instanceId);
    if (!source || !harder || access.some(a => a.leagueId === harder.id) || !access.some(a => a.leagueId === source.id)
      || fact.championId !== progress.clubId || !instance || instance.season !== close.season
      || instance.definition.id !== `${world.profile.id}:${source.id}` || instance.definition.pack !== world.profile.pack
      || instance.winnerId !== progress.clubId || !fact.finalFixtureId || completedLeagueFinal(instance)?.id !== fact.finalFixtureId) continue;
    access.push({leagueId: harder.id, earnedFrom: leagueTitleEvidence(instance, source.id, harder.id)!});
  }
  return access.sort((a,b) => world.divisions.find(d => d.id === a.leagueId)!.rank - world.divisions.find(d => d.id === b.leagueId)!.rank);
}
export type { LeagueMovement } from '../data/leagueCareer';
export interface LeagueAllocation { policy: 'adjacent-vacancy-v1'; fields: LeagueFields; movements: LeagueMovement[] }

/** Every participant is selected from the original completed fields. */
export function allocateLeagueFields(world: CompetitionWorldMetadata, close: LeagueCloseFacts, playerId: string, targetLeagueId: string, instances: readonly CompetitionInstance[]): LeagueAllocation {
  const divisions = [...world.divisions].sort((a,b) => a.rank - b.rank);
  const facts = divisions.map(d => close.leagues.find(l => l.leagueId === d.id));
  if (facts.some(f => !f) || close.leagues.length !== divisions.length || !divisions.some(d => d.id === targetLeagueId)) throw new Error('Invalid league allocation source');
  const allIds = facts.flatMap(f => f!.standings.map(s => s.clubId));
  if (new Set(allIds).size !== allIds.length || allIds.filter(id => id === playerId).length !== 1
    || facts.some(f => !f!.standings.length || f!.standings.some(s => !s.clubId || !Number.isSafeInteger(s.position) || s.position < 1))) throw new Error('Invalid original league fields');
  const from = facts.findIndex(f => f!.standings.some(s => s.clubId === playerId));
  const to = divisions.findIndex(d => d.id === targetLeagueId);
  const fields: Record<string, string[]> = Object.fromEntries(facts.map(f => {
    const instance = instances.find(i => i.id === f!.instanceId && i.season === close.season);
    if (!instance || instance.definition.id !== `${world.profile.id}:${f!.leagueId}` || instance.entrantIds.length !== f!.standings.length
      || instance.entrantIds.some(id => !f!.standings.some(s => s.clubId === id))) throw new Error('Invalid original league instance');
    return [f!.leagueId, [...instance.entrantIds]];
  }));
  const movements: LeagueMovement[] = [];
  if (from === to) return {policy: 'adjacent-vacancy-v1', fields, movements};
  const move = (clubId: string, source: number, destination: number): void => {
    const sourceId = divisions[source]!.id; const destinationId = divisions[destination]!.id;
    fields[sourceId] = fields[sourceId]!.filter(id => id !== clubId); fields[destinationId]!.push(clubId);
    movements.push({clubId, fromLeagueId: sourceId, toLeagueId: destinationId});
  };
  move(playerId, from, to);
  const used = new Set([playerId]); const step = to > from ? 1 : -1;
  for (let rank = from + step; step > 0 ? rank <= to : rank >= to; rank += step) {
    const ai = facts[rank]!.standings.filter(s => !used.has(s.clubId)).sort((a,b) =>
      (step > 0 ? b.position - a.position : a.position - b.position) || a.clubId.localeCompare(b.clubId))[0];
    if (!ai) throw new Error('No original AI available for vacancy');
    used.add(ai.clubId); move(ai.clubId, rank, rank - step);
  }
  if (divisions.some((d,i) => fields[d.id]!.length !== facts[i]!.standings.length)
    || new Set(Object.values(fields).flat()).size !== allIds.length) throw new Error('Invalid allocated league coverage');
  return {policy: 'adjacent-vacancy-v1', fields, movements};
}
export interface CommitmentYear { season: number; committed: number; cap: number; protectedAmount: number; unprotectedExcess: number }

/** Amounts only: no decision about permitting excess or protecting a new term. */
export function commitmentYears(players: readonly {deal?: SignedDeal}[], account: CapAccount, firstSeason: number): CommitmentYear[] {
  if (!Number.isSafeInteger(firstSeason) || firstSeason < 1) throw new Error('Invalid commitment season');
  for (const {deal} of players) if (deal) {
    // Live base agreements start no later than the selected season. Queued
    // future agreements belong in renewal, never an unbounded future base.
    if (deal.startSeason > firstSeason) throw new Error('Unsupported future base commitment');
    const terms = [deal, ...(deal.renewal ? [deal.renewal] : [])];
    if (terms.some(t => !Number.isSafeInteger(t.startSeason) || t.startSeason < 1 || !Number.isSafeInteger(t.endSeason)
      || t.endSeason < t.startSeason || t.endSeason - t.startSeason > 2 || !Number.isSafeInteger(t.salary) || t.salary < 0)
      || (deal.renewal && deal.renewal.startSeason !== deal.endSeason + 1)) throw new Error('Invalid signed commitment');
  }
  const last = Math.max(firstSeason, ...players.flatMap(p => p.deal ? [p.deal.endSeason, p.deal.renewal?.endSeason ?? 0] : []));
  const cap = publishedCap(account);
  return Array.from({length: last - firstSeason + 1}, (_, i) => {
    const season = firstSeason + i; const committed = commitment(players, season);
    return {season, committed, cap, protectedAmount: 0, unprotectedExcess: Math.max(0, committed - cap)};
  });
}
export interface LeagueCommitmentPreview {
  /** No future prizes or allowances are assumed. */
  capacityBasis: 'current-account';
  baseCap: number; purchasedAddition: number; earnedAddition: number; cap: number;
  years: CommitmentYear[]; policyPendingReason?: string;
}
export function leagueCommitmentPreview(players: readonly {deal?: SignedDeal}[], account: CapAccount, firstSeason: number, targetRank: number): LeagueCommitmentPreview {
  const tier = tierForRank(targetRank); const target = {...account, tier}; const cap = publishedCap(target);
  const years = commitmentYears(players, target, firstSeason);
  const baseCap = tierCap(tier); const purchased = publishedCap({...target, earnedBasisPoints: 0});
  return {capacityBasis: 'current-account', baseCap, purchasedAddition: purchased - baseCap, earnedAddition: cap - purchased, cap,
    years,
    ...(tierCap(tier) < tierCap(account.tier) && years.some(y => y.unprotectedExcess > 0) ? {policyPendingReason: 'Voluntary lower-cap entry policy is pending a user decision.'} : {})};
}
