// Inactive, pure selection primitives. No store, notifications or career RNG.
import type { CompetitionInstance } from '../data/competition';
import type { CompetitionWorldMetadata } from '../data/competitionDivisions';
import { completedLeagueFinal, leagueTitleEvidence, type LeagueAccess, type LeagueCloseFacts, type LeagueProgress } from '../data/leagueCareer';
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
export { allocateLeagueFields, type LeagueAllocation, type LeagueMovement } from '../data/leagueAllocation';
export interface CommitmentYear {
  season: number; committed: number; cap: number;
  /** Stage 2 computes term-bound protection; these amounts are not entry eligibility. */
  protectionBasis: 'deferred'; protectedAmount: number; unprotectedExcess: number;
}

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
    return {season, committed, cap, protectionBasis: 'deferred', protectedAmount: 0, unprotectedExcess: Math.max(0, committed - cap)};
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
