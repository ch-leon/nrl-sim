// src/systems/contracts.ts — contract warnings, early renewal and selling (GitHub #40).
// Pure TypeScript, no Phaser. Warnings are derived from the weekly decrement in
// economy.tickContracts (a contract passes each threshold exactly once), so no
// extra state is needed.

import { getState, setState, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney, spendMoney } from '../data/club';
import { overallRating } from '../data/player';
import { CONTRACTS, MORALE, SQUAD_MIN, difficultyMultipliers } from '../config';
import type { SignResult } from './freeagency';

/** Warning text when `weeks` is a warning threshold, else null. */
export function warnForWeeks(name: string, weeks: number): string | null {
  if (!CONTRACTS.WARN_WEEKS.includes(weeks)) return null;
  return `${name}'s contract expires in ${weeks} week${weeks === 1 ? '' : 's'}.`;
}

/** Market wage for a player's overall (mirrors data/player.ts generation). */
export function marketWage(p: Pick<Player, 'stats'>): number {
  return Math.round(overallRating(p) * 15 + 100);
}

/**
 * Base weekly wage a player asks for to renew: market wage for their overall,
 * moved ±RENEW_MORALE_SWING by morale (neutral morale = market, unhappy = dearer).
 * This is the stored (un-scaled) wage; the difficulty multiplier applies on top
 * wherever wages are paid or shown, exactly as in economy.weeklyWages.
 */
export function renewalWage(p: Player): number {
  const t = Math.max(-1, Math.min(1, (MORALE.NEUTRAL - p.morale) / MORALE.NEUTRAL));
  return Math.round(marketWage(p) * (1 + t * CONTRACTS.RENEW_MORALE_SWING));
}

/** What the player asks, as paid per week (difficulty-scaled). */
export function renewalWeeklyCost(state: GameState, p: Player): number {
  return Math.round(renewalWage(p) * difficultyMultipliers(state.settings.difficulty).wages);
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

/** Reasons: 'not-found', 'already-fresh' (contract already full length), 'insufficient-funds'. */
export function renewEarly(state: GameState, playerId: string): SignResult {
  const p = state.squad.find((x) => x.id === playerId);
  if (!p) return { ok: false, reason: 'not-found' };
  if (p.contractWeeks >= CONTRACTS.NEW_CONTRACT_WEEKS) return { ok: false, reason: 'already-fresh' };
  const fee = renewalFee(state, p);
  if (state.money < fee) return { ok: false, reason: 'insufficient-funds' };

  spendMoney(fee, `renew:${playerId}`);
  const after = getState();
  const wage = renewalWage(p);
  setState({
    squad: after.squad.map((x) =>
      x.id === playerId ? { ...x, wage, contractWeeks: CONTRACTS.NEW_CONTRACT_WEEKS } : x),
  });
  bus.emit('ui:notify', { text: `Re-signed ${p.name} for ${CONTRACTS.NEW_CONTRACT_WEEKS} weeks`, kind: 'success' });
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
