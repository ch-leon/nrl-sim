// Orchestrator-owned (wave-3 review finding): season-rollover aging. The BAK-176
// rollover contract assigns ageing to a season hook, but no work unit owned it.
// Runs at order 5, before fixtures regeneration (order 10).
//
// GitHub #5: soft-curve age retirement from RETIRE_SOFT_AGE, hard cut at
// RETIRE_HARD_AGE. Retired players leave squad and free-agent pool entirely.
import { archiveRetirees, reconcileShortlist, installPlayerHistory } from './playerCareer';
import { bus, type Events } from '../core/events';
import { reconcileProtection } from './cap';
import { getState, setState } from '../core/state';
import type { GameState, Player } from '../core/state';
import { registerSeasonHook } from '../core/time';
import { RETIRE_HARD_AGE, RETIRE_SOFT_AGE, SQUAD_MIN } from '../config';
import { hasTrait, withTrait, withoutTrait } from '../data/traits';
import { makeRng, type Rng } from '../utils/rng';

export const VETERAN_AGE = 31;
export const YOUNG_GUN_MAX_AGE = 20;

/** Age a player one year and re-derive the age-linked traits. */
export function agePlayer(p: Player): Player {
  const age = p.age + 1;
  let traits = p.traits;
  if (age > YOUNG_GUN_MAX_AGE && hasTrait(traits, 'youngGun')) traits = withoutTrait(traits, 'youngGun');
  if (age >= VETERAN_AGE && !hasTrait(traits, 'veteran')) traits = withTrait(traits, 'veteran');
  return { ...p, age, traits };
}

/**
 * Retirement probability after ageing one year. 0 below soft age, ramps linearly
 * to 1.0 at hard age (inclusive). Pure — no RNG.
 *
 *   age < 34 → 0
 *   34 → 0.2, 35 → 0.4, 36 → 0.6, 37 → 0.8, ≥38 → 1.0
 */
export function retirementChance(age: number): number {
  if (age < RETIRE_SOFT_AGE) return 0;
  if (age >= RETIRE_HARD_AGE) return 1;
  const span = RETIRE_HARD_AGE - RETIRE_SOFT_AGE + 1;
  return (age - RETIRE_SOFT_AGE + 1) / span;
}

/** Deterministic retirement roll for a given age. */
export function shouldRetire(age: number, rng: Rng): boolean {
  const p = retirementChance(age);
  if (p <= 0) return false;
  if (p >= 1) return true;
  return rng.next() < p;
}

export interface AgingResult {
  squad: Player[];
  freeAgents: Player[];
  retired: Player[];
  rngSeed: number;
}

/**
 * Age every squad + free-agent player one year, then retire those who fail the
 * age check. Retired players are removed from both pools (career over).
 * Deterministic given `rng`.
 */
export function ageAndRetirePlayers(
  squad: readonly Player[],
  freeAgents: readonly Player[],
  rng: Rng,
): AgingResult {
  const agedSquad = squad.map(agePlayer);
  const agedAgents = freeAgents.map(agePlayer);

  const retired: Player[] = [];
  const keepSquad: Player[] = [];
  for (const p of agedSquad) {
    if (shouldRetire(p.age, rng)) retired.push(p);
    else keepSquad.push(p);
  }
  const keepAgents: Player[] = [];
  for (const p of agedAgents) {
    if (shouldRetire(p.age, rng)) retired.push(p);
    else keepAgents.push(p);
  }

  return {
    squad: keepSquad,
    freeAgents: keepAgents,
    retired,
    rngSeed: rng.state(),
  };
}

/** Candidate-only owner: archives both pools, captures only the club's notices. */
export function agePlayerPopulation(state: GameState): { state: GameState; notices: Events['ui:notify'][] } {
  const result = ageAndRetirePlayers(state.squad, state.freeAgents, makeRng(state.rngSeed));
  const next = archiveRetirees(reconcileShortlist({ ...state, squad: result.squad, freeAgents: result.freeAgents, rngSeed: result.rngSeed,
    capAccount: reconcileProtection(result.squad, state.capAccount, state.season) }),
    result.retired.map(p => installPlayerHistory(p, state.squad.some(x => x.id === p.id) ? state.clubId : 'unsigned', state)), state);
  const ownIds = new Set(state.squad.map(p => p.id));
  const ownRetirees = result.retired.filter(p => ownIds.has(p.id));
  const notices: Events['ui:notify'][] = ownRetirees.map(p => ({ text: `${p.name} retired at ${p.age}.`, kind: 'info', quiet: true }));
  if (ownRetirees.length > 0 && result.squad.length < SQUAD_MIN) notices.push({
    text: `Squad down to ${result.squad.length} after retirements — sign players (need ${SQUAD_MIN}) or forfeit.`, kind: 'danger',
  });
  return { state: next, notices };
}

export function registerAgingSystem(): void {
  registerSeasonHook('aging', 5, () => {
    const { state: next, notices } = agePlayerPopulation(getState());
    setState({ squad: next.squad, freeAgents: next.freeAgents, rngSeed: next.rngSeed, playerPopulation: next.playerPopulation, capAccount: next.capAccount });
    for (const notice of notices) bus.emit('ui:notify', notice);
  });
}
