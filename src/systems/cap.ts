// Season salary cap (#557). Cash stays on GameState.money. A signed deal is an
// annual commitment for an inclusive run of seasons. Ordinary cash movements
// never read or write this module's numbers.
import type { Player } from '../core/state';
import { WEEKS_PER_SEASON } from '../config';
import { overallRating, shownStats } from '../data/player';
import {
  annualCapQuote, annualSalaryQuote, FINANCE_RULES_VERSION, FINANCE_TIERS, openingSalaryOffers,
  releasePayoutQuote, type FinanceLevel, type FinanceTier,
} from '../data/financeRules';

/** The supported single league contains the premier clubs, so it uses that cap.
 * Division worlds use the tier of the division a club actually plays in. */
export const SINGLE_LEAGUE_TIER: FinanceTier = 'premier';
export const DIVISION_TIERS = ['local', 'championship', 'premier'] as const;
/** Rival transfer wallets start here. Difficulty does not scale them. */
export const AI_OPENING_CASH = 60_000;

export interface SignedTerm {
  /** Annual salary. Immutable for the term. Not a market quote. */
  salary: number;
  startSeason: number;
  /** Inclusive. A one-season deal ends in its start season. At most three seasons. */
  endSeason: number;
}

export interface SignedDeal extends SignedTerm {
  /** A new agreement that starts the season after this one ends. */
  renewal?: SignedTerm;
}

export interface CapAccount {
  rulesVersion: typeof FINANCE_RULES_VERSION;
  tier: FinanceTier;
  purchasedLevel: FinanceLevel;
  /** Null until a level is bought (#560). */
  lastPurchaseSeason: number | null;
  /** 0, 500 or 1000. Earned prizes are not granted here. */
  earnedBasisPoints: 0 | 500 | 1000;
  /** Settled receipt ids. Empty until match income lands (#559). */
  receipts: string[];
  /** Deals that may sit above the published cap. New promises cannot use this list. */
  protectedIds: string[];
}

export function tierForRank(rank: number): FinanceTier {
  const tier = DIVISION_TIERS[rank];
  if (!tier) throw new Error('Invalid division rank');
  return tier;
}

export function freshCapAccount(tier: FinanceTier): CapAccount {
  return {
    rulesVersion: FINANCE_RULES_VERSION,
    tier,
    purchasedLevel: 0,
    lastPurchaseSeason: null,
    earnedBasisPoints: 0,
    receipts: [],
    protectedIds: [],
  };
}

export function salaryDemand(player: Pick<Player, 'stats' | 'position' | 'age' | 'ceilings'>): number {
  const rating = overallRating(player);
  const keys = shownStats(player.position);
  const ceiling = keys.reduce((sum, key) => sum + (player.ceilings?.[key] ?? player.stats[key]), 0) / keys.length;
  return annualSalaryQuote(rating, player.age, Math.max(0, ceiling - rating));
}

/** A new agreement, priced on ability now. Age and potential only nudge it. Welfare trims 3%. */
export function renewalAsk(
  player: Pick<Player, 'stats' | 'position' | 'age' | 'ceilings'>,
  welfare: boolean,
): { salary: number; why: string } {
  const rating = overallRating(player);
  const keys = shownStats(player.position);
  const ceiling = keys.reduce((sum, key) => sum + (player.ceilings?.[key] ?? player.stats[key]), 0) / keys.length;
  const headroom = Math.max(0, ceiling - rating);
  const salary = annualSalaryQuote(rating, player.age, headroom, welfare);
  const why = [`ability ${Math.round(rating)}`];
  if (player.age <= 21) why.push('young, so a little dearer');
  else if (player.age >= 34) why.push('34 or older, so cheaper');
  else if (player.age >= 30) why.push('30 or older, so a little cheaper');
  if (headroom > 10) why.push('room to improve');
  if (welfare) why.push('Welfare trims 3%');
  return { salary, why: why.join('; ') };
}

/** Season-equivalents still to run, including the unplayed part of the current season. */
function termRemaining(term: SignedTerm, season: number, week: number): number {
  if (season > term.endSeason) return 0;
  if (season < term.startSeason) return term.endSeason - term.startSeason + 1;
  return weeksLeftInSeason(week) / WEEKS_PER_SEASON + (term.endSeason - season);
}

export function seasonsForWeeks(weeks: number): number {
  if (!Number.isFinite(weeks) || weeks <= 0) return 1;
  return Math.min(3, Math.max(1, Math.ceil(weeks / WEEKS_PER_SEASON)));
}

/** Weeks still to play in the competitive season, including the current week. */
export function weeksLeftInSeason(week: number): number {
  return Math.max(1, WEEKS_PER_SEASON - Math.max(1, Math.trunc(week)) + 1);
}

/** A one-season signing whose displayed weeks are the rest of this season. */
export function signForRestOfSeason(player: Player, season: number, week: number): Player {
  const contractWeeks = weeksLeftInSeason(week);
  return commitPlayer({ ...player, contractWeeks }, season, 1);
}

/** A new promise at the market quote. Opening construction uses admitOpeningSquad instead. */
export function commitPlayer(player: Player, season: number, seasons = seasonsForWeeks(player.contractWeeks)): Player {
  const span = Math.min(3, Math.max(1, seasons));
  return { ...player, deal: { salary: salaryDemand(player), startSeason: season, endSeason: season + span - 1 } };
}

/**
 * Early renewal starts a new one-season agreement. It begins the season after
 * the promise already signed, so the stored span never grows past three seasons.
 * With no current deal, the new agreement is this season.
 */
export function renewedAgreement(deal: SignedDeal | undefined, season: number, salary: number): SignedDeal {
  if (!deal || deal.endSeason < season) return { salary, startSeason: season, endSeason: season };
  const startSeason = deal.endSeason + 1;
  return {
    salary: deal.salary,
    startSeason: deal.startSeason,
    endSeason: deal.endSeason,
    renewal: { salary, startSeason, endSeason: startSeason },
  };
}

/**
 * Fresh-world admission only. Discounts by at most five percent so the squad
 * fits, or returns null. Never raises the cap and never reprices a live team.
 */
export function admitOpeningSquad(players: readonly Player[], cap: number, startSeason = 1): Player[] | null {
  const demands = players.map(salaryDemand);
  const offers = openingSalaryOffers(demands, cap);
  if (!offers) return null;
  return players.map((player, index) => ({
    ...player,
    deal: {
      salary: offers[index]!,
      startSeason,
      endSeason: startSeason + seasonsForWeeks(player.contractWeeks) - 1,
    },
  }));
}

export function publishedCap(account: CapAccount): number {
  return annualCapQuote(account.tier, account.purchasedLevel, account.earnedBasisPoints);
}

export function activeSalary(player: { deal?: SignedDeal }, season: number): number {
  const deal = player.deal;
  if (!deal) return 0;
  if (season >= deal.startSeason && season <= deal.endSeason) return deal.salary;
  const next = deal.renewal;
  if (next && season >= next.startSeason && season <= next.endSeason) return next.salary;
  return 0;
}

export function commitment(players: readonly { deal?: SignedDeal }[], season: number): number {
  return players.reduce((sum, player) => sum + activeSalary(player, season), 0);
}

export interface CapTotals {
  cap: number;
  current: number;
  next: number;
  protectedExcess: number;
  /** Room for a new promise. Protected excess is not spendable. */
  signingRoom: number;
}

export function capTotals(players: readonly Player[], account: CapAccount, season: number): CapTotals {
  const cap = publishedCap(account);
  const current = commitment(players, season);
  const next = commitment(players, season + 1);
  const protectedPay = players.reduce((sum, player) => (
    account.protectedIds.includes(player.id) ? sum + activeSalary(player, season) : sum
  ), 0);
  const protectedExcess = Math.max(0, protectedPay - cap);
  return { cap, current, next, protectedExcess, signingRoom: Math.max(0, cap - current) };
}

/**
 * Relegation keeps every signed salary. The excess of those current deals over
 * the new published cap is protected on those player ids. A squad already
 * inside the new cap gets no allowance. Nothing is dropped or repriced.
 */
export function relegateCap(players: readonly Player[], account: CapAccount, season: number, tier: FinanceTier): CapAccount {
  const next: CapAccount = { ...account, tier, protectedIds: [] };
  const cap = publishedCap(next);
  const active = players.filter(player => activeSalary(player, season) > 0);
  const bill = active.reduce((sum, player) => sum + activeSalary(player, season), 0);
  if (bill <= cap) return next;
  return { ...next, protectedIds: active.map(player => player.id) };
}

/** Drop protection once that deal no longer counts. Never adds a player or edits a salary. */
export function reconcileProtection(players: readonly Player[], account: CapAccount, season: number): CapAccount {
  const protectedIds = account.protectedIds.filter(id => {
    const player = players.find(candidate => candidate.id === id);
    return !!player && activeSalary(player, season) > 0;
  });
  if (protectedIds.length === account.protectedIds.length && protectedIds.every((id, index) => id === account.protectedIds[index])) return account;
  return { ...account, protectedIds };
}

/** Cover emergency call-ups that were required to reach a playable squad. */
export function protectAddedDeals(players: readonly Player[], account: CapAccount, season: number, addedIds: readonly string[]): CapAccount {
  if (commitment(players, season) <= publishedCap(account)) return account;
  const protectedIds = [...account.protectedIds];
  for (const id of addedIds) if (!protectedIds.includes(id)) protectedIds.push(id);
  return reconcileProtection(players, { ...account, protectedIds }, season);
}

/** Unsigned players whose deals ended before `season`. Salaries are not paid out of cash. */
export function expireEndedDeals(
  squad: readonly Player[],
  freeAgents: readonly Player[],
  account: CapAccount,
  season: number,
): { squad: Player[]; freeAgents: Player[]; capAccount: CapAccount } {
  const keep: Player[] = [];
  const gone: Player[] = [];
  for (const player of squad) {
    const deal = player.deal;
    if (deal && deal.endSeason < season) {
      const next = deal.renewal;
      if (next && next.startSeason <= season && next.endSeason >= season) {
        const seasons = next.endSeason - season + 1;
        keep.push({
          ...player,
          deal: { salary: next.salary, startSeason: next.startSeason, endSeason: next.endSeason },
          contractWeeks: Math.max(1, seasons * WEEKS_PER_SEASON),
        });
      } else {
        const { deal: _deal, ...rest } = player;
        gone.push({ ...rest, contractWeeks: 0, departed: true });
      }
    } else keep.push(player);
  }
  return { squad: keep, freeAgents: [...freeAgents, ...gone], capAccount: reconcileProtection(keep, account, season) };
}

export function capRoomFor(players: readonly Player[], account: CapAccount, season: number, salary: number): boolean {
  return commitment(players, season) + salary <= publishedCap(account);
}

export interface ReleaseTerms {
  payout: number;
  /** This season's salary, which leaves the cap. */
  capFreed: number;
  /** Next season's salary, which leaves next season's commitments. */
  nextCapFreed: number;
}

/**
 * Cash to release him, and the cap it frees. A quarter of the salary still to
 * run, and never more than the larger of this deal and a queued renewal.
 * The signing fee is not refunded.
 */
export function releaseTerms(player: { deal?: SignedDeal }, season: number, week: number): ReleaseTerms {
  const deal = player.deal;
  const salary = deal?.salary ?? 0;
  const renewalSalary = deal?.renewal?.salary ?? 0;
  let quarter = 0;
  if (deal && salary > 0) {
    const current = termRemaining(deal, season, week);
    if (current > 0) quarter += releasePayoutQuote(salary, Math.min(3, current));
  }
  if (deal?.renewal && renewalSalary > 0) {
    const later = termRemaining(deal.renewal, season, week);
    if (later > 0) quarter += releasePayoutQuote(renewalSalary, Math.min(3, later));
  }
  return {
    payout: Math.min(Math.max(salary, renewalSalary), quarter),
    capFreed: activeSalary(player, season),
    nextCapFreed: activeSalary(player, season + 1),
  };
}

export function tierCap(tier: FinanceTier): number {
  return FINANCE_TIERS[tier].annualCap;
}
