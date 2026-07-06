// src/data/club.ts — squad / facility / money helpers operating on the store.
// See BAK-172. Mutate via setState and emit the relevant bus event. No Phaser.
// The club is embedded in GameState (§1.2) — there is no separate Club class.

import { getState, setState, type Player, type PlacedFacility } from '../core/state';
import { bus } from '../core/events';
import { makeRng } from '../utils/rng';
import { FACILITY_CATALOG, type FacilityDefId } from './facility';
import { SQUAD_CAP, SQUAD_MIN, GRID_W, GRID_H } from '../config';

/** Add a player to the squad. Returns false when at SQUAD_CAP. */
export function addPlayer(p: Player): boolean {
  const s = getState();
  if (s.squad.length >= SQUAD_CAP) return false;
  setState({ squad: [...s.squad, p] });
  bus.emit('player:signed', p);
  return true;
}

/** Remove a player by id. Returns false at SQUAD_MIN or if the id is absent. */
export function removePlayer(playerId: string): boolean {
  const s = getState();
  if (s.squad.length <= SQUAD_MIN) return false;
  if (!s.squad.some((p) => p.id === playerId)) return false;
  setState({ squad: s.squad.filter((p) => p.id !== playerId) });
  return true;
}

/**
 * Place a facility at (x, y). Validates non-negative origin and footprint
 * within the grid; constructs a deterministic instance id from the state RNG
 * (advanced state written back to rngSeed). Returns the instance or null when
 * placement bounds are invalid. Overlap/adjacency checks belong to WU-8.
 */
export function addFacility(
  defId: FacilityDefId,
  x: number,
  y: number,
  level: 1 | 2 | 3 = 1,
): PlacedFacility | null {
  const s = getState();
  const def = FACILITY_CATALOG[defId];
  const { w, h } = def.footprint;

  if (x < 0 || y < 0) return null;
  if (x + w > GRID_W || y + h > GRID_H) return null;

  // Deterministic instance id derived from (and advancing) the state RNG.
  const rng = makeRng(s.rngSeed);
  const id = `f_${rng.state().toString(36)}_${rng.int(0, 1e6)}`;
  const rngSeed = rng.state();

  const facility: PlacedFacility = { id, defId, level, x, y };
  setState({ facilities: [...s.facilities, facility], rngSeed });
  bus.emit('facility:placed', facility);
  return facility;
}

/**
 * Deduct `amount` from money. Returns false (no mutation) when insufficient;
 * else deducts and emits money:changed.
 */
export function spendMoney(amount: number, reason: string): boolean {
  const s = getState();
  if (s.money < amount) return false;
  const balance = s.money - amount;
  setState({ money: balance });
  bus.emit('money:changed', { delta: -amount, reason, balance });
  return true;
}

/** Credit `amount` to money and emit money:changed. */
export function earnMoney(amount: number, reason: string): void {
  const s = getState();
  const balance = s.money + amount;
  setState({ money: balance });
  bus.emit('money:changed', { delta: amount, reason, balance });
}
