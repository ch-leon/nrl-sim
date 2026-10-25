// src/systems/suspension.ts — off-field bans (#324, #325).
//
// A ban is `suspendedWeeks` on the player. The lineup and the sheet leave him
// out the way they leave out an injury, and the weekly events tick counts it
// down by one. The medics do not. This file is the only place a ban's length
// is decided.
//
// #328's Club Lawyer belongs in `reviewSuspension`: wrap that function, roll
// on the rng it is given (the events deck's stream, never rngSeed), and return
// fewer weeks or 0 when the charge is thrown out. It covers sources 'event'
// and 'trip' (these cards) and 'judiciary' (an on-field charge, not built
// here). Do not hire the lawyer from the staff list in this change.
import type { GameState } from '../core/state';
import type { BanSource } from '../data/events';
import type { Rng } from '../utils/rng';

/** What a ban is for. The lawyer (#328) will branch on this. */
export interface SuspensionReview {
  weeks: number;
  source: BanSource;
  /** The ledger-style cause, e.g. "event: Trip to Bali", so a later appeal can name it. */
  cause: string;
}

/**
 * The weeks a ban will actually cost. Today this is `weeks` unchanged (never
 * below 0). #328 shortens it here.
 */
export function reviewSuspension(_state: GameState, review: SuspensionReview, _rng: Rng): number {
  return Math.max(0, Math.round(review.weeks));
}

/**
 * Write a ban onto a squad player. A longer ban already on him stands; a
 * shorter one does not replace it. Weeks of 0 (a charge that didn't stick)
 * write nothing. A player who has left the squad is skipped.
 */
export function withSuspension(
  state: GameState,
  playerId: string | undefined,
  weeks: number,
): { state: GameState; standing: number; applied: boolean; name?: string } {
  const player = playerId ? state.squad.find((p) => p.id === playerId) : undefined;
  if (!player || weeks <= 0) return { state, standing: player?.suspendedWeeks ?? 0, applied: false, ...(player ? { name: player.name } : {}) };
  const standing = Math.max(player.suspendedWeeks ?? 0, weeks);
  if (standing === (player.suspendedWeeks ?? 0) && (player.suspendedWeeks ?? 0) > 0) {
    return { state, standing, applied: true, name: player.name };
  }
  return {
    state: {
      ...state,
      squad: state.squad.map((p) => (p.id === player.id ? { ...p, suspendedWeeks: standing } : p)),
    },
    standing,
    applied: true,
    name: player.name,
  };
}
