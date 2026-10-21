// src/systems/contracts.ts — contract warnings, early renewal and selling (GitHub #40).
// Pure TypeScript, no Phaser. Warnings are derived from the weekly decrement in
// economy.tickContracts (a contract passes each threshold exactly once), so no
// extra state is needed.

import { getState, setState, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney, spendMoney } from '../data/club';
import { marketWage, overallRating } from '../data/player';
import { BOARD, CONTRACTS, MORALE, SQUAD_MIN, difficultyMultipliers } from '../config';
import { REP_BASELINE, REP_MAX } from './league';
import type { SignResult } from './freeagency';

/** Warning text when `weeks` is a warning threshold, else null. */
export function warnForWeeks(name: string, weeks: number): string | null {
  if (!CONTRACTS.WARN_WEEKS.includes(weeks)) return null;
  return `${name}'s contract expires in ${weeks} week${weeks === 1 ? '' : 's'}.`;
}

/** Market wage for a player's overall: data/player.ts owns it (#146); kept here for existing imports. */
export { marketWage };

/** The club a renewal is priced for (N6, #167): its reputation and the season. */
export type RenewalClub = Pick<GameState, 'reputation' | 'season'>;

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
  return Math.round(marketWage(p) * (1 + t * CONTRACTS.RENEW_MORALE_SWING) * clubWageFactor(club));
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
 * The board advances `amount` (N14.3) when it has the room: the money comes in on
 * the board's line and is owed until the rollover. False, and nothing moves, when
 * it hasn't.
 */
export function takeBoardLoan(amount: number): boolean {
  if (amount <= 0 || amount > boardLoanRoom(getState())) return false;
  earnMoney(amount, BOARD_LOAN);
  setState({ boardLoan: { owed: getState().boardLoan.owed + amount } });
  return true;
}

/** At the rollover, after the grant and the prize: the season's loan is repaid in full. */
export function repayBoardLoan(): number {
  const owed = getState().boardLoan.owed;
  if (owed <= 0) return 0;
  earnMoney(-owed, BOARD_LOAN_REPAID);
  setState({ boardLoan: { owed: 0 } });
  return owed;
}

/** A renewal the club can't pay for today, but the board would advance (N14.3). */
export function renewsOnLoan(state: GameState, p: Player): boolean {
  const fee = renewalFee(state, p);
  return state.money < fee && fee <= boardLoanRoom(state);
}

/**
 * Reasons: 'not-found', 'already-fresh' (contract already full length),
 * 'insufficient-funds' (short, and more than the board would advance). Short but
 * within the board's room, the fee is advanced as a board loan (N14.3).
 */
export function renewEarly(state: GameState, playerId: string): SignResult {
  const p = state.squad.find((x) => x.id === playerId);
  if (!p) return { ok: false, reason: 'not-found' };
  if (p.contractWeeks >= CONTRACTS.NEW_CONTRACT_WEEKS) return { ok: false, reason: 'already-fresh' };
  const fee = renewalFee(state, p);
  const onLoan = state.money < fee;
  if (onLoan && !takeBoardLoan(fee)) return { ok: false, reason: 'insufficient-funds' };

  // On a loan the balance can stay below zero, which spendMoney refuses: the fee is paid all the same.
  if (onLoan) earnMoney(-fee, `renew:${playerId}`);
  else spendMoney(fee, `renew:${playerId}`);
  const after = getState();
  const wage = renewalWage(p, state);
  setState({
    squad: after.squad.map((x) =>
      x.id === playerId ? { ...x, wage, contractWeeks: CONTRACTS.NEW_CONTRACT_WEEKS } : x),
  });
  bus.emit('ui:notify', {
    text: onLoan
      ? `Re-signed ${p.name} for ${CONTRACTS.NEW_CONTRACT_WEEKS} weeks on a board loan of $${fee.toLocaleString()}, repaid at the season's end`
      : `Re-signed ${p.name} for ${CONTRACTS.NEW_CONTRACT_WEEKS} weeks`,
    kind: 'success',
  });
  return { ok: true };
}

/** Sell a squad player for their transfer fee. Reasons: 'not-found', 'squad-min'. */
export function sellPlayer(state: GameState, playerId: string): SignResult {
  const p = state.squad.find((x) => x.id === playerId);
  if (!p) return { ok: false, reason: 'not-found' };
  if (state.squad.length <= SQUAD_MIN) return { ok: false, reason: 'squad-min' };

  const fee = transferFee(p);
  setState({ squad: state.squad.filter((x) => x.id !== playerId) });
  earnMoney(fee, `sell:${playerId}`);
  bus.emit('ui:notify', { text: `Sold ${p.name} for $${fee.toLocaleString()}`, kind: 'success' });
  return { ok: true };
}

/** Squad contracts sorted by weeks remaining (soonest first), then name. */
export function contractRows(state: GameState): Player[] {
  return state.squad.slice().sort((a, b) => a.contractWeeks - b.contractWeeks || a.name.localeCompare(b.name));
}
