// The accepted instance owns the sporting rules and dates. Financial and strength
// quotes freeze what the coach saw, even as people and contracts later change.
import { annualCapQuote, DIVISION_TIERS, FINANCE_TIERS, type FinanceLevel, type FinanceTier } from './financeRules';
import type { CompetitionInstance } from './competition';
import type { CompetitionWorldMetadata } from './competitionDivisions';
import type { LeagueEntryReceipt } from './leagueCareer';
import type { LeagueCommitmentPreview } from '../systems/leagueSelection';

export interface OpponentQuote { clubId: string; strength: number; }
export interface ClubCommitmentQuote extends LeagueCommitmentPreview { clubId: string; }
export interface EntryQuote {
  definitionInstanceId: string;
  opponents: OpponentQuote[];
  commitments: ClubCommitmentQuote[];
}
export interface AnnualEntryChanges {
  opponents: OpponentQuote[];
  commitments: ClubCommitmentQuote[];
  retirements: number;
  academyBirths: number;
  marketBirths: number;
  rivalRenewals: number;
}

const exact = (v: unknown, names: string[]): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === names.length && names.every(k => Object.prototype.hasOwnProperty.call(v, k));
const amount = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const tier = (v: unknown): v is FinanceTier => typeof v === 'string' && Object.prototype.hasOwnProperty.call(FINANCE_TIERS, v);


function validCommitment(v: unknown, season: number, rank: number): v is ClubCommitmentQuote {
  if (!exact(v, ['clubId', 'capacityBasis', 'previousTier', 'tier', 'purchasedLevel', 'earnedBasisPoints', 'baseCap', 'purchasedAddition', 'earnedAddition', 'cap', 'years'])
    || v.capacityBasis !== 'retained-tier-v1' || !tier(v.previousTier) || !tier(v.tier)
    || v.tier !== DIVISION_TIERS[Math.max(rank, DIVISION_TIERS.indexOf(v.previousTier))]
    || !amount(v.purchasedLevel) || v.purchasedLevel > 3 || ![0, 500, 1000].includes(v.earnedBasisPoints as number)) return false;
  const base = FINANCE_TIERS[v.tier].annualCap;
  const bought = annualCapQuote(v.tier, v.purchasedLevel as FinanceLevel, 0);
  const cap = annualCapQuote(v.tier, v.purchasedLevel as FinanceLevel, v.earnedBasisPoints as number);
  return v.baseCap === base && v.purchasedAddition === bought - base && v.earnedAddition === cap - bought && v.cap === cap
    && Array.isArray(v.years) && v.years.length >= 1 && v.years.length <= 6 && v.years.every((y, i) =>
      exact(y, ['season', 'cap', 'committed', 'protectedAmount', 'protectedExcess', 'unprotectedExcess'])
      && y.season === season + i && y.cap === cap && amount(y.committed) && amount(y.protectedAmount)
      && y.protectedAmount <= y.committed && y.unprotectedExcess === 0 && y.committed - y.protectedAmount <= cap
      && y.protectedExcess === Math.max(0, y.committed - cap));
}

/** Validate receipt arithmetic and canonical IDs against the retained draw.
 * The historical salaries and ratings are independent of today's roster. */
export function validEntrySnapshots(receipt: LeagueEntryReceipt, world: CompetitionWorldMetadata, instances: readonly CompetitionInstance[], playerId: string): boolean {
  const field = instances.find(i => i.id === world.divisions.find(d => d.id === receipt.leagueId)?.instanceId);
  if (!field) return false;
  const opponents = field.entrantIds.filter(id => id !== playerId);
  const accounts = [playerId, ...receipt.movements.map(m => m.clubId).filter(id => id !== playerId)];
  const validSide = (opps: unknown, clubs: unknown): boolean => Array.isArray(opps) && opps.length === opponents.length
    && opps.every((o, i) => exact(o, ['clubId', 'strength']) && o.clubId === opponents[i]
      && typeof o.strength === 'number' && Number.isFinite(o.strength) && o.strength >= 1 && o.strength <= 100)
    && Array.isArray(clubs) && clubs.length === accounts.length && clubs.every((c, i) => {
      const rank = world.divisions.find(d => instances.find(l => l.id === d.instanceId)?.entrantIds.includes(accounts[i]!))?.rank;
      return rank !== undefined && validCommitment(c, receipt.season, rank) && c.clubId === accounts[i];
    });
  const q = receipt.quote;
  if (!exact(q, ['definitionInstanceId', 'opponents', 'commitments']) || q.definitionInstanceId !== field.id || !validSide(q.opponents, q.commitments)) return false;
  for (const c of q.commitments) {
    const moved = receipt.movements.find(m => m.clubId === c.clubId);
    if (moved && DIVISION_TIERS.indexOf(c.previousTier) < world.divisions.find(d => d.id === moved.fromLeagueId)!.rank) return false;
  }
  const a = receipt.annualChanges;
  if (receipt.season === 1) return a === null;
  return exact(a, ['opponents', 'commitments', 'retirements', 'academyBirths', 'marketBirths', 'rivalRenewals'])
    && validSide(a.opponents, a.commitments) && a.commitments.every((c, i) => c.previousTier === q.commitments[i]!.tier
      && c.tier === q.commitments[i]!.tier && c.cap === q.commitments[i]!.cap && c.purchasedLevel === q.commitments[i]!.purchasedLevel
      && c.earnedBasisPoints === q.commitments[i]!.earnedBasisPoints)
    && [a.retirements, a.academyBirths, a.marketBirths, a.rivalRenewals].every(amount);
}
