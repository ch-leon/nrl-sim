// Initial testing model (#556). These quotes do not mutate a career or enable
// the new economy; #557–#561 own persistence, transactions and presentation.
import { wageForOverall } from './player';

export type FinanceTier = 'local' | 'championship' | 'premier';
export type FinanceLevel = 0 | 1 | 2 | 3;
export const FINANCE_RULES_VERSION = 1;
export const FINANCE_TIERS = {
  local: { annualCap: 350_000, matchBase: 8_000 },
  championship: { annualCap: 450_000, matchBase: 12_000 },
  premier: { annualCap: 600_000, matchBase: 18_000 },
} as const;
export const FINANCE_STARTING_CASH = { easy: 90_000, normal: 60_000, hard: 45_000 } as const;

function finite(n: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid ${label}`);
}
function level(n: number): asserts n is FinanceLevel {
  if (!Number.isInteger(n) || n < 0 || n > 3) throw new Error('Invalid finance level');
}
function money(n: number): number {
  const result = Math.round(n);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Invalid money quote');
  return result;
}
function tierRules(tier: FinanceTier): typeof FINANCE_TIERS[FinanceTier] {
  const rules = Object.prototype.hasOwnProperty.call(FINANCE_TIERS, tier) ? FINANCE_TIERS[tier] : undefined;
  if (!rules) throw new Error('Invalid finance tier');
  return rules;
}

/** Fixed annual units: never multiply by weeks, fixtures or current cash.
 * Ability owns the price shape; age and potential make small bounded changes.
 * The old weekly curve is the one source of its shape until #558 replaces it. */
export function annualSalaryQuote(rating: number, age: number, potentialHeadroom = 0, welfare = false): number {
  finite(rating, 0, 100, 'rating'); finite(age, 1, 100, 'age'); finite(potentialHeadroom, 0, 100, 'potential headroom');
  const ageFactor = age <= 21 ? 1.02 : age <= 29 ? 1 : age <= 33 ? 0.98 : 0.95;
  const potentialFactor = 1 + Math.min(0.05, Math.max(0, potentialHeadroom - 10) * 0.002);
  return money(Math.round(20 * wageForOverall(rating) * ageFactor * potentialFactor * (welfare ? 0.97 : 1) / 100) * 100);
}

export function signingFeeQuote(annualDemand: number, academy: boolean, scoutLevel: FinanceLevel = 0): number {
  finite(annualDemand, 0, Number.MAX_SAFE_INTEGER, 'annual demand'); level(scoutLevel);
  return money(annualDemand * (academy ? 0.25 : 1) * (1 - scoutLevel * 0.1));
}

/** An offer is not a completed sale: #572 must find and debit a real buyer. */
export function saleOfferQuote(annualDemand: number): number {
  finite(annualDemand, 0, Number.MAX_SAFE_INTEGER, 'annual demand');
  return money(annualDemand * 0.6);
}

/** Only a fresh-world constructor may use these offers. A bounded founding
 * discount can admit a roster just above market budget; existing deals must
 * never pass through this function at rollover, promotion or transfer. */
export function openingSalaryOffers(demands: readonly number[], cap: number): number[] | null {
  finite(cap, 1, Number.MAX_SAFE_INTEGER, 'opening cap');
  demands.forEach(n => {
    finite(n, 100, Number.MAX_SAFE_INTEGER, 'opening salary');
    if (!Number.isSafeInteger(n)) throw new Error('Invalid opening salary');
  });
  const total = demands.reduce((sum, n) => sum + n, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Invalid opening bill');
  if (total <= cap) return [...demands];
  if (total * 0.95 > cap) return null;
  const offers = demands.map(n => Math.max(Math.ceil(n * 0.95), Math.floor(n * cap / total)));
  return offers.reduce((sum, n) => sum + n, 0) <= cap ? offers : null;
}

/** Remaining commitment includes the unplayed part of this season and whole
 * future seasons. The caller derives that fraction from the saved calendar. */
export function releasePayoutQuote(annualSalary: number, remainingSeasons: number): number {
  finite(annualSalary, 0, Number.MAX_SAFE_INTEGER, 'annual salary'); finite(remainingSeasons, 0, 3, 'remaining seasons');
  return money(Math.min(annualSalary, annualSalary * remainingSeasons * 0.25));
}

export function annualCapQuote(tier: FinanceTier, purchasedLevel: FinanceLevel, earnedBasisPoints = 0): number {
  const rules = tierRules(tier); level(purchasedLevel);
  if (!Number.isInteger(earnedBasisPoints) || earnedBasisPoints < 0 || earnedBasisPoints > 1_000 || earnedBasisPoints % 500 !== 0)
    throw new Error('Invalid earned allowance');
  return money(rules.annualCap * (10_000 + purchasedLevel * 500 + earnedBasisPoints) / 10_000);
}

export function capUpgradePrice(tier: FinanceTier, purchasedLevel: FinanceLevel): number | null {
  const rules = tierRules(tier); level(purchasedLevel);
  return purchasedLevel === 3 ? null : money(rules.matchBase * [5, 10, 20][purchasedLevel]!);
}

export interface MatchCashQuote {
  base: number;
  home: number;
  performance: number;
  sponsor: number;
  total: number;
}
export interface MatchCashInput {
  /** The host/lower-neutral tier's M, frozen with the event/fixture. */
  matchBase: number;
  kind: 'played' | 'trial' | 'unplayed';
  venue: 'home' | 'away' | 'neutral';
  result: 'win' | 'draw' | 'loss';
  sponsorLevel?: FinanceLevel;
  grandstandLevel?: FinanceLevel;
}

/** Reports read a persisted receipt; they must never turn this quote into cash.
 * Trials have no bonuses. Byes, forfeits and cancellations are unplayed. */
export function matchCashQuote(input: MatchCashInput): MatchCashQuote {
  finite(input.matchBase, 0, Number.MAX_SAFE_INTEGER / 4, 'match base');
  if (!['played', 'trial', 'unplayed'].includes(input.kind) || !['home', 'away', 'neutral'].includes(input.venue)
    || !['win', 'draw', 'loss'].includes(input.result)) throw new Error('Invalid match cash policy');
  const sponsorLevel = input.sponsorLevel ?? 0; const grandstandLevel = input.grandstandLevel ?? 0;
  level(sponsorLevel); level(grandstandLevel);
  let base = 0; let home = 0; let performance = 0; let sponsor = 0;
  if (input.kind === 'trial') base = money(input.matchBase * 0.25);
  else if (input.kind === 'played') {
    base = money(input.matchBase);
    const homeRate = input.venue === 'home' ? 0.5 + [0, 0.15, 0.45, 0.9][grandstandLevel]!
      : input.venue === 'neutral' ? 0.25 : 0;
    home = money(input.matchBase * homeRate);
    performance = money(input.matchBase * (input.result === 'win' ? 0.1 : input.result === 'draw' ? 0.05 : 0));
    sponsor = money(input.matchBase * [0, 0.03, 0.09, 0.18][sponsorLevel]!);
  }
  return { base, home, performance, sponsor, total: money(base + home + performance + sponsor) };
}

/** The new upfront grandstand prices; other facility costs retain their current
 * catalogue values for the first comparison. No upkeep is charged. */
export const GRANDSTAND_PURCHASE_PRICES = [30_000, 60_000, 90_000] as const;
export const STAFF_APPOINTMENT_PRICES = {
  assistantCoach: 16_000, analyst: 12_000, welfare: 14_000,
  direct: 16_000, width: 19_000, kicking: 18_000, razzle: 25_000,
} as const;
