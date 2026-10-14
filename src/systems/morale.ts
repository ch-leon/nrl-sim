// src/systems/morale.ts — weekly squad morale tick (GitHub #38).
// Pure TypeScript, no RNG: the same state always gives the same result.
//
// Each week, per squad player:
//   delta = match result swing (win +, loss −, draw/bye 0)
//         + Canteen / Coach's Office bonus (SPECIAL_MAGNITUDE.morale × levelMult)
//         + unhappiness (low pay, expiring contract)
//         + drift back toward NEUTRAL
// then clamped to 1..100. The engine reads morale as a ±10% team modifier over
// ±50 points, so the small steps here keep strength changes modest.
import { getState, setState, type GameState, type Player } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { MORALE } from '../config';
import { levelMult, SPECIAL_MAGNITUDE, type FacilityDefId } from '../data/facility';
import { overallRating } from '../data/player';
import { getCurrentFixture, PLAYER_ID } from './fixtures';

const MORALE_FACILITIES: readonly FacilityDefId[] = ['canteen', 'coachsOffice'];

export function clampMorale(n: number): number {
  return Math.max(1, Math.min(100, n));
}

/** Result swing for the player's fixture this week: +WIN, −LOSS, or 0 (draw/bye/unplayed). */
export function resultSwing(state: GameState): number {
  const fx = getCurrentFixture(state, PLAYER_ID);
  if (!fx || !fx.result) return 0;
  const us = fx.homeId === PLAYER_ID ? fx.result.homeScore : fx.result.awayScore;
  const them = fx.homeId === PLAYER_ID ? fx.result.awayScore : fx.result.homeScore;
  return us > them ? MORALE.WIN : us < them ? MORALE.LOSS : 0;
}

/**
 * Weekly facility bonus. Uses the best built level of each morale facility so a
 * duplicate in an old save is not double-counted.
 */
export function facilityMoraleBonus(state: GameState): number {
  let bonus = 0;
  for (const id of MORALE_FACILITIES) {
    const level = state.facilities.reduce((m, f) => (f.defId === id ? Math.max(m, f.level) : m), 0);
    if (level > 0) bonus += SPECIAL_MAGNITUDE.morale * levelMult(level as 1 | 2 | 3);
  }
  return bonus;
}

/** Unhappiness from pay and contract status (≤ 0). */
export function unhappiness(p: Player): number {
  let d = 0;
  const marketWage = Math.round(overallRating(p) * 15 + 100); // mirrors data/player.ts generation
  if (p.wage < marketWage * MORALE.LOW_PAY_RATIO) d += MORALE.LOW_PAY_PENALTY;
  if (p.contractWeeks <= MORALE.EXPIRING_WEEKS) d += MORALE.EXPIRING_PENALTY;
  return d;
}

/** New morale for one player given the week's shared swing and facility bonus. */
export function nextMorale(p: Player, swing: number, bonus: number): number {
  const drift = (MORALE.NEUTRAL - p.morale) * MORALE.DRIFT;
  return clampMorale(Math.round(p.morale + swing + bonus + unhappiness(p) + drift));
}

/** Pure tick: returns the squad with updated morale (same array if nothing changed). */
export function moraleTick(state: GameState): Player[] {
  const swing = resultSwing(state);
  const bonus = facilityMoraleBonus(state);
  return state.squad.map((p) => {
    const m = nextMorale(p, swing, bonus);
    return m === p.morale ? p : { ...p, morale: m };
  });
}

/** Install the weekly morale hook (after the match/ladder, before free agency). */
export function registerMoraleSystem(): void {
  registerTickHook('morale', TICK_ORDER.morale, () => {
    const s = getState();
    const squad = moraleTick(s);
    if (squad.some((p, i) => p !== s.squad[i])) setState({ squad });
  });
}
