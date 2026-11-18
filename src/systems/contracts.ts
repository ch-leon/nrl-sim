import { careerActionClock } from '../core/season';
// src/systems/contracts.ts — contract warnings, early renewal and selling (GitHub #40).
// Pure TypeScript, no Phaser. Warnings are derived from the weekly decrement in
// economy.tickContracts (a contract passes each threshold exactly once), so no
// extra state is needed.

import { getState, setState, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney } from '../data/club';
import { activeSalary, commitment, publishedCap, renewalAsk, renewedAgreement, contractActionView, normaliseContractForAction, reconcileProtection } from './cap';
import { marketWage, overallRating } from '../data/player';
import { BOARD, CONTRACTS, MORALE, difficultyMultipliers } from '../config';
import { fmtMoney } from '../utils/money';
import { REP_BASELINE, REP_MAX } from './league';
import type { SignResult } from './freeagency';
import { hasStaff, WELFARE_RENEWAL_CUT } from './staff';
import { confirmPlayerSale, type SaleOffer } from './playerTransfers';

/** Warning text when `weeks` is a warning threshold, else null. */
export function warnForWeeks(name: string, weeks: number): string | null {
  if (!CONTRACTS.WARN_WEEKS.includes(weeks)) return null;
  return `${name}'s contract expires in ${weeks} week${weeks === 1 ? '' : 's'}.`;
}

/** The warning remains a route to Contracts, even before its Office tile opens. */
export function notifyContractWarning(text: string): void {
  bus.emit('ui:notify', {
    text, kind: 'info',
    action: { label: 'Contracts', screen: 'contracts', run: () => bus.emit('ui:openScreen', { id: 'contracts' }) },
  });
}

/** Market wage for a player's overall: data/player.ts owns it (#146); kept here for existing imports. */
export { marketWage };

/** The club a renewal is priced for (N6, #167): its reputation and the season, and its staff (N14.5). */
export type RenewalClub = Pick<GameState, 'reputation' | 'season'> & Partial<Pick<GameState, 'staff'>>;

/**
 * What a club's standing adds to a renewal ask: +RENEW_REP_PREMIUM at reputation
 * REP_MAX, nothing at REP_BASELINE and below, and RENEW_SEASON_INFLATION for
 * every season after the first. A famous club's players know what they are
 * worth to it, and wages creep up as the seasons pass.
 */
export function clubWageFactor(club: RenewalClub): number {
  const standing = Math.max(0, Math.min(1, (club.reputation - REP_BASELINE) / (REP_MAX - REP_BASELINE)));
  const seasons = Math.max(0, club.season - 1);
  return (1 + standing * CONTRACTS.RENEW_REP_PREMIUM) * (1 + seasons * CONTRACTS.RENEW_SEASON_INFLATION);
}

/**
 * Base weekly wage a player asks for to renew: market wage for their overall,
 * moved ±RENEW_MORALE_SWING by morale (neutral morale = market, unhappy = dearer),
 * times the club's clubWageFactor. This is the stored (un-scaled) wage; the
 * difficulty multiplier applies on top wherever wages are paid or shown, exactly
 * as in economy.weeklyWages. The economy's automatic renewal at contract end asks
 * the same.
 */
export function renewalWage(p: Player, club: RenewalClub): number {
  const t = Math.max(-1, Math.min(1, (MORALE.NEUTRAL - p.morale) / MORALE.NEUTRAL));
  // A Welfare Manager (N14.5) takes a tenth off the ask.
  const welfare = hasStaff(club, 'welfare') ? 1 - WELFARE_RENEWAL_CUT : 1;
  return Math.round(marketWage(p) * (1 + t * CONTRACTS.RENEW_MORALE_SWING) * clubWageFactor(club) * welfare);
}

/** What the player asks, as paid per week (difficulty-scaled). */
export function renewalWeeklyCost(state: GameState, p: Player): number {
  return Math.round(renewalWage(p, state) * difficultyMultipliers(state.settings.difficulty).wages);
}

/** Upfront fee for renewing early: RENEW_FEE_WEEKS × the (scaled) new weekly wage. */
export function renewalFee(state: GameState, p: Player): number {
  return CONTRACTS.RENEW_FEE_WEEKS * renewalWeeklyCost(state, p);
}

/** Transfer fee: overall² × SELL_PER_OVERALL_SQ, scaled by age. */
export function transferFee(p: Player): number {
  const o = overallRating(p);
  const ageMult = p.age <= 22 ? 1.3 : p.age <= 27 ? 1 : p.age <= 30 ? 0.75 : p.age <= 33 ? 0.5 : 0.3;
  return Math.round(o * o * CONTRACTS.SELL_PER_OVERALL_SQ * ageMult);
}

/** The ledger reasons of the board loan (N14.3): on the board's line, so the books still sum. */
export const BOARD_LOAN = 'board loan';
export const BOARD_LOAN_REPAID = 'board loan repaid';

/** How much more the board will advance this season. */
export function boardLoanRoom(state: Pick<GameState, 'boardLoan'>): number {
  return Math.max(0, BOARD.LOAN_CAP - state.boardLoan.owed);
}

/**
 * New borrowing is retired (#557). Nothing is advanced and nothing is owed.
 * A balance already on the books can still be repaid.
 */
export function takeBoardLoan(_amount: number): boolean {
  return false;
}

/** At the rollover, after the prize and before the board's verdict: the season's loan is repaid in full. */
export function repayBoardLoan(): number {
  const owed = getState().boardLoan.owed;
  if (owed <= 0) return 0;
  earnMoney(-owed, BOARD_LOAN_REPAID);
  setState({ boardLoan: { owed: 0 } });
  return owed;
}

/** Renewals cost nothing, and the board does not lend for them. */
export function renewsOnLoan(_state: GameState, _p: Player): boolean {
  return false;
}

/**
 * Why a renewal cannot be queued, or null when it can. A renewal is a new
 * promise: only in the last season of the current deal, and only when that
 * season's cap can hold the new salary.
 */
export function renewalRefusal(state: GameState, p: Player): { reason: string; message: string } | null {
  p = contractActionView(state, p);
  const clock = careerActionClock(state);
  if (p.deal?.renewal) {
    return {
      reason: 'already-renewed',
      message: `A renewal is already queued from season ${p.deal.renewal.startSeason}. Nothing was charged.`,
    };
  }
  if (p.deal && clock.season < p.deal.endSeason) {
    return {
      reason: 'not-final-season',
      message: `A renewal can be queued in season ${p.deal.endSeason}, the last season of his deal.`,
    };
  }
  const ask = renewalAsk(p, hasStaff(state, 'welfare'));
  const start = p.deal && p.deal.endSeason >= clock.season ? p.deal.endSeason + 1 : clock.season;
  const used = commitment(state.squad, start) - activeSalary(p, start);
  const cap = publishedCap(state.capAccount);
  if (used + ask.salary > cap) {
    const room = Math.max(0, cap - used);
    return {
      reason: 'over-cap',
      message: `Not enough salary-cap room. From season ${start} he costs ${fmtMoney(ask.salary)} and ${fmtMoney(room)} is free.`,
    };
  }
  return null;
}

/**
 * Queue one new season at his ability now. It starts the season after the
 * current promise, costs no cash, and does not change this deal's salary or
 * the weeks left on it. A second call in the same season changes nothing.
 * Reasons: 'not-found', 'already-renewed', 'not-final-season', 'over-cap'.
 */
export function renewEarly(state: GameState, playerId: string): SignResult {
  const p = state.squad.find((x) => x.id === playerId);
  if (!p) return { ok: false, reason: 'not-found', message: 'Player not found.' };
  const blocked = renewalRefusal(state, p);
  if (blocked) return { ok: false, reason: blocked.reason, message: blocked.message };
  const ask = renewalAsk(p, hasStaff(state, 'welfare'));
  const view = contractActionView(state, p);
  const deal = renewedAgreement(view.deal, careerActionClock(state).season, ask.salary);
  const start = deal.renewal?.startSeason ?? deal.startSeason;
  const changed = p.deal !== undefined && ask.salary !== p.deal.salary;
  const clock = careerActionClock(state);
  const squad = state.squad.map((x) => x.id === playerId ? normaliseContractForAction({ ...view, deal }, clock) : x);
  setState({ squad, ...(clock.structural ? { capAccount: reconcileProtection(squad, state.capAccount, clock.season) } : {}) });
  const text = `Renewal queued for ${p.name} from season ${start} at ${fmtMoney(ask.salary)} a season. No fee.${changed ? ` ${ask.why}.` : ''}`;
  bus.emit('ui:notify', { text, kind: 'success' });
  return { ok: true };
}

/** Selling requires the exact reviewed offer; old callers cannot bypass confirmation. */
export function sellPlayer(state: GameState, playerId: string, offer?: SaleOffer): SignResult {
  if (!state.squad.some(p => p.id === playerId)) return { ok: false, reason: 'not-found', message: 'Player not found.' };
  if (!offer || offer.playerId !== playerId) return { ok: false, reason: 'no-buyer', message: 'Review and confirm a funded club offer first. Nothing was changed.' };
  return confirmPlayerSale(offer);
}

/** Squad contracts sorted by weeks remaining (soonest first), then name. */
export function contractRows(state: GameState): Player[] {
  return state.squad.map(p => contractActionView(state, p)).sort((a, b) => a.contractWeeks - b.contractWeeks || a.name.localeCompare(b.name));
}

/**
 * The Squad tab's red dot (#369): a squad contract ending within this many
 * weeks. Finance and the Contracts screen look further ahead (finance.ts
 * EXPIRY_WINDOW_WEEKS); this is the one that needs dealing with now.
 */
export const CONTRACT_DOT_WEEKS = 4;

/** Squad players whose contracts end within `weeks` (juniors and departed players aside), soonest first. Pure. */
export function contractsEndingSoon(state: Pick<GameState, 'squad'> & Partial<Pick<GameState, 'season' | 'week' | 'competitions'>>, weeks = CONTRACT_DOT_WEEKS): Player[] {
  const clock = state.season !== undefined && state.week !== undefined
    ? careerActionClock({ season: state.season, week: state.week, ...(state.competitions ? { competitions: state.competitions } : {}) }) : undefined;
  return state.squad.map(p => clock ? normaliseContractForAction(p, clock) : p)
    .filter((p) => !p.departed && !p.junior && !p.deal?.renewal && p.contractWeeks <= weeks)
    .sort((a, b) => a.contractWeeks - b.contractWeeks || a.name.localeCompare(b.name));
}

/** What the dot reads out: "Squad — 2 contracts end within 4 weeks". */
export function endingSoonLabel(count: number, weeks = CONTRACT_DOT_WEEKS): string {
  return `Squad — ${count} contract${count === 1 ? ' ends' : 's end'} within ${weeks} weeks`;
}

/** A Squad row's tag (#369): "ends in 3 wk". */
export function endsInTag(p: Pick<Player, 'contractWeeks'>): string {
  return `ends in ${p.contractWeeks} wk`;
}
