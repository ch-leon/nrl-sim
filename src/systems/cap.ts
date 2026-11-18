import { careerActionClock, type CareerActionClock } from '../core/season';
// Season salary cap (#557). Cash stays on GameState.money. A signed deal is an
// annual commitment for an inclusive run of seasons. Ordinary cash movements
// never read or write this module's numbers.
import { closeClubSpell } from './playerCareer';
import type { GameState, Player } from '../core/state';
import { WEEKS_PER_SEASON } from '../config';
import { overallRating, shownStats } from '../data/player';
import {
  annualCapQuote, annualSalaryQuote, FINANCE_RULES_VERSION, FINANCE_TIERS, openingSalaryOffers,
  releasePayoutQuote, type FinanceLevel, type FinanceTier,
} from '../data/financeRules';

/** The supported single league contains the premier clubs, so it uses that cap.
 * A regional club starts at its division tier. League entry retains the highest base it attains. */
export const SINGLE_LEAGUE_TIER: FinanceTier = 'premier';
export { DIVISION_TIERS, tierForRank } from '../data/financeRules';
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

export interface ProtectedTerm extends SignedTerm {
  playerId: string;
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
  /** Exact agreements; the compatibility IDs never grant protection by themselves. */
  protectedTerms?: ProtectedTerm[];
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
export function termRemaining(term: SignedTerm, season: number, week: number, duration = WEEKS_PER_SEASON): number {
  if (season > term.endSeason) return 0;
  if (season < term.startSeason) return term.endSeason - term.startSeason + 1;
  return weeksLeftInSeason(week, duration) / duration + (term.endSeason - season);
}

export function seasonsForWeeks(weeks: number): number {
  if (!Number.isFinite(weeks) || weeks <= 0) return 1;
  return Math.min(3, Math.max(1, Math.ceil(weeks / WEEKS_PER_SEASON)));
}

/** Weeks still to play in the competitive season, including the current week. */
export function weeksLeftInSeason(week: number, duration = WEEKS_PER_SEASON): number {
  return Math.max(1, duration - Math.max(1, Math.trunc(week)) + 1);
}

/** A one-season signing whose displayed weeks are the rest of this season. */
export function signForRestOfSeason(player: Player, season: number, week: number, duration = WEEKS_PER_SEASON): Player {
  const contractWeeks = weeksLeftInSeason(week, duration);
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

type CommittedPlayer = { id?: string; deal?: SignedDeal };
function signedTerms(player: CommittedPlayer): SignedTerm[] {
  return player.deal ? [player.deal, ...(player.deal.renewal ? [player.deal.renewal] : [])] : [];
}
function sameTerm(a: SignedTerm, b: SignedTerm): boolean {
  return a.salary === b.salary && a.startSeason === b.startSeason && a.endSeason === b.endSeason;
}
function termRecord(playerId: string, term: SignedTerm): ProtectedTerm {
  return { playerId, salary: term.salary, startSeason: term.startSeason, endSeason: term.endSeason };
}

/** One year's actual promises. Allowances cover only their matching signed term,
 * and only excess attributable to protected pay; ordinary pay must fit the cap. */
export function commitmentProtection(players: readonly CommittedPlayer[], account: CapAccount, season: number) {
  const cap = publishedCap(account);
  const committed = commitment(players, season);
  const protectedAmount = players.reduce((sum, player) => {
    const term = signedTerms(player).find(t => t.startSeason <= season && t.endSeason >= season);
    return term && account.protectedTerms?.some(p => p.playerId === player.id && sameTerm(p, term)) ? sum + term.salary : sum;
  }, 0);
  const unprotectedExcess = Math.max(0, committed - protectedAmount - cap);
  const protectedExcess = Math.max(0, committed - cap) - unprotectedExcess;
  return { season, cap, committed, protectedAmount, protectedExcess, unprotectedExcess };
}

export function capTotals(players: readonly Player[], account: CapAccount, season: number): CapTotals {
  const { cap, committed: current, protectedExcess } = commitmentProtection(players, account, season);
  return { cap, current, next: commitment(players, season + 1), protectedExcess, signingRoom: Math.max(0, cap - current) };
}

function withProtection(account: CapAccount, terms: ProtectedTerm[]): CapAccount {
  const protectedIds = [...new Set(terms.map(t => t.playerId))];
  // Preserve fresh/legacy empty account bytes when no allowance was created.
  if (!terms.length && account.protectedTerms === undefined && !account.protectedIds.length) return account;
  return { ...account, protectedIds, protectedTerms: terms };
}

/** Explicit involuntary-allocation primitive. Freeze only promises already signed,
 * including queued terms. Later agreements can never inherit their allowance. */
export function freezeSignedTerms(players: readonly Player[], account: CapAccount, season: number): CapAccount {
  return withProtection(account, players.flatMap(p => signedTerms(p).filter(t => t.endSeason >= season).map(t => termRecord(p.id, t))));
}

/** Relegation never edits cash or salaries. Protect already signed promises only. */
export function relegateCap(players: readonly Player[], account: CapAccount, season: number, tier: FinanceTier): CapAccount {
  const next = { ...account, tier };
  // Each signed term spans at most three seasons. Empty gaps carry no bill;
  // never allocate an array proportional to an absolute future season number.
  const coveredSeasons = new Set(players.flatMap(p => signedTerms(p).flatMap(t =>
    [t.startSeason, t.startSeason + 1, t.startSeason + 2].filter(year => year >= season && year <= t.endSeason))));
  const cap = publishedCap(next);
  if ([...coveredSeasons].some(year => commitment(players, year) > cap)) {
    return freezeSignedTerms(players, next, season);
  }
  return reconcileProtection(players, next, season);
}

/** Drop departed, expired or altered terms, retaining already signed future terms. */
export function reconcileProtection(players: readonly Player[], account: CapAccount, season: number): CapAccount {
  const terms = (account.protectedTerms ?? []).filter(term => term.endSeason >= season && players.some(p => p.id === term.playerId && signedTerms(p).some(t => sameTerm(t, term))));
  const ids = [...new Set(terms.map(t => t.playerId))];
  if (terms.length === (account.protectedTerms?.length ?? 0) && ids.length === account.protectedIds.length && ids.every((id, i) => id === account.protectedIds[i])) return account;
  return withProtection(account, terms);
}

/** Protection housekeeping only. Old structural DEV rollover does not advance
 * rival careers, but expired/departed allowances must still leave both owners. */
export function reconcileClubProtection(state: GameState): GameState {
  const capAccount = reconcileProtection(state.squad, state.capAccount, state.season);
  const clubs = state.league.clubs.map(club => {
    if (!club.squad || !club.capAccount) return club;
    const account = reconcileProtection(club.squad, club.capAccount, state.season);
    return account === club.capAccount ? club : { ...club, capAccount: account };
  });
  const sameClubs = clubs.every((club, i) => club === state.league.clubs[i]);
  if (capAccount === state.capAccount && sameClubs) return state;
  return { ...state, capAccount, league: sameClubs ? state.league : { ...state.league, clubs } };
}

/** Cover the current scholarship agreement, never its later renewal. */
export function protectAddedDeals(players: readonly Player[], account: CapAccount, season: number, addedIds: readonly string[]): CapAccount {
  if (commitment(players, season) <= publishedCap(account)) return account;
  const reconciled = reconcileProtection(players, account, season);
  const terms = [...(reconciled.protectedTerms ?? [])];
  for (const player of players) if (addedIds.includes(player.id)) {
    const term = signedTerms(player).find(t => t.startSeason <= season && t.endSeason >= season);
    if (term && !terms.some(t => t.playerId === player.id && sameTerm(t, term))) terms.push(termRecord(player.id, term));
  }
  return withProtection(reconciled, terms);
}

/** Pre-v32 observed IDs had no provenance. Freeze only the term visible now; an
 * already promoted renewal keeps that observed allowance through its own end. */
export function migrateObservedProtection(players: readonly Player[], account: CapAccount, season: number): CapAccount {
  if (account.protectedTerms !== undefined || !account.protectedIds.length) return account;
  const terms = players.flatMap(player => {
    const term = signedTerms(player).find(t => t.startSeason <= season && t.endSeason >= season);
    return account.protectedIds.includes(player.id) && term ? [termRecord(player.id, term)] : [];
  });
  return withProtection(account, terms);
}

/** Unsigned players whose deals ended before `season`. Salaries are not paid out of cash. */
export function expireEndedDeals(
  squad: readonly Player[],
  freeAgents: readonly Player[],
  account: CapAccount,
  season: number,
  seasonWeeks = WEEKS_PER_SEASON,
): { squad: Player[]; freeAgents: Player[]; capAccount: CapAccount } {
  const keep: Player[] = [];
  const gone: Player[] = [];
  for (const player of squad) {
    const deal = player.deal;
    if (deal && deal.endSeason < season) {
      const next = deal.renewal;
      if (next && next.startSeason <= season && next.endSeason >= season) {
        const seasons = next.endSeason - season + 1;
        const { emergencyDealEndSeason: _end, emergencyForPlayerId: _vacancy, ...ordinary } = player;
        keep.push({
          ...ordinary,
          deal: { salary: next.salary, startSeason: next.startSeason, endSeason: next.endSeason },
          contractWeeks: Math.max(1, seasons * seasonWeeks),
        });
      } else {
        const { deal: _deal, emergencyDealEndSeason: _end, emergencyForPlayerId: _vacancy, ...rest } = player;
        gone.push({ ...(rest.clubHistory ? closeClubSpell(rest, { season, week: 1 }, 'expiry') : rest), contractWeeks: 0, departed: true });
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
export function releaseTerms(player: { deal?: SignedDeal }, season: number, week: number, duration = WEEKS_PER_SEASON): ReleaseTerms {
  const deal = player.deal;
  const salary = deal?.salary ?? 0;
  const renewalSalary = deal?.renewal?.salary ?? 0;
  let quarter = 0;
  if (deal && salary > 0) {
    const current = termRemaining(deal, season, week, duration);
    if (current > 0) quarter += releasePayoutQuote(salary, Math.min(3, current));
  }
  if (deal?.renewal && renewalSalary > 0) {
    const later = termRemaining(deal.renewal, season, week, duration);
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

/** Promote only a consumed base agreement. An unconsumed signed renewal is
 * never replaced by a quote or another promise. Pure state-in/result-out: no
 * ownership, annual expiry or time work runs here. Explicit management actions
 * may persist this promoted term and removal of consumed emergency metadata. */
export function normaliseContractForAction(player: Player, clock: CareerActionClock): Player {
  if (!clock.structural) return player;
  let deal = player.deal;
  if (deal && deal.endSeason < clock.season && deal.renewal && deal.renewal.startSeason <= clock.season) {
    deal = { ...deal.renewal };
  }
  const contractWeeks = deal ? Math.round(termRemaining(deal, clock.season, clock.week, clock.duration) * clock.duration) : 0;
  // A consumed emergency receipt never moves onto a different agreement.
  if (player.emergencyDealEndSeason !== undefined && player.emergencyDealEndSeason < clock.season && deal && deal.endSeason >= clock.season) {
    const { emergencyDealEndSeason: _end, emergencyForPlayerId: _vacancy, ...ordinary } = player;
    return { ...ordinary, deal, contractWeeks };
  }
  return { ...player, ...(deal ? { deal } : {}), contractWeeks };
}
/** Projection for displays or explicit actions that persist their result.
 * Requires the trusted, phase-aligned state documented by careerActionClock;
 * acceptance/interval owners can instead supply an explicit clock above. */
export function contractActionView(state: GameState, player: Player): Player {
  return normaliseContractForAction(player, careerActionClock(state));
}
