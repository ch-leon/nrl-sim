// Orchestrator-owned (wave-3 review finding): season-rollover aging. The BAK-176
// rollover contract assigns ageing to a season hook, but no work unit owned it.
// Runs at order 5, before fixtures regeneration (order 10).
import { getState, setState } from '../core/state';
import type { Player } from '../core/state';
import { registerSeasonHook } from '../core/time';

export const VETERAN_AGE = 31;
export const YOUNG_GUN_MAX_AGE = 20;

/** Age a player one year and re-derive the age-linked traits. */
export function agePlayer(p: Player): Player {
  const age = p.age + 1;
  let traits = p.traits;
  if (age > YOUNG_GUN_MAX_AGE && traits.includes('youngGun')) {
    traits = traits.filter((t) => t !== 'youngGun');
  }
  if (age >= VETERAN_AGE && !traits.includes('veteran')) {
    traits = [...traits, 'veteran'];
  }
  return { ...p, age, traits };
}

export function registerAgingSystem(): void {
  registerSeasonHook('aging', 5, () => {
    const state = getState();
    setState({
      squad: state.squad.map(agePlayer),
      freeAgents: state.freeAgents.map(agePlayer),
    });
  });
}
