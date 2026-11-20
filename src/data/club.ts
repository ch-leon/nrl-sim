import { awaitingCampReplay } from '../systems/parkedLeagueFixture';
// src/data/club.ts — squad / facility / money helpers operating on the store.
// See BAK-172. Mutate via setState and emit the relevant bus event. No Phaser.
// The club is embedded in GameState (§1.2) — there is no separate Club class.

import { signPlayer, releasePlayer } from '../systems/freeagency';
import { getState, setState, type Player, type PlacedFacility } from '../core/state';
import { weekHeld } from '../core/time';
import { bus } from '../core/events';
import { makeRng } from '../utils/rng';
import { FACILITY_CATALOG, type FacilityDefId } from './facility';
import { GRID_W, GRID_H } from '../config';

/** Canonical recruitment only: callers cannot insert a copied/generated person. */
export function addPlayer(p: Player): boolean {
  return signPlayer(getState(), p.id).ok;
}

/** A removal is a real release with its payout, minimum and history rules. */
export function removePlayer(playerId: string): boolean {
  return releasePlayer(getState(), playerId).ok;
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
  purchaseCost?: number,
): PlacedFacility | null {
  const s = getState();
  if (awaitingCampReplay(s)) return null;
  const def = FACILITY_CATALOG[defId];
  const { w, h } = def.footprint;

  if (purchaseCost !== undefined && (weekHeld() || !Number.isSafeInteger(purchaseCost) || purchaseCost < 0 || s.money < purchaseCost)) return null;
  if (x < 0 || y < 0) return null;
  if (x + w > GRID_W || y + h > GRID_H) return null;

  // Deterministic instance id derived from (and advancing) the state RNG.
  const rng = makeRng(s.rngSeed);
  const id = `f_${rng.state().toString(36)}_${rng.int(0, 1e6)}`;
  const rngSeed = rng.state();

  const facility: PlacedFacility = { id, defId, level, x, y, constructionSpend: purchaseCost ?? 0 };
  setState({ facilities: [...s.facilities, facility], rngSeed, money: s.money - (purchaseCost ?? 0) });
  if (purchaseCost !== undefined) bus.emit('money:changed', { delta: -purchaseCost, reason: `build:${defId}`, balance: s.money - purchaseCost });
  bus.emit('facility:placed', facility);
  return facility;
}

/**
 * Deduct `amount` from money. Returns false (no mutation) when insufficient;
 * else deducts and emits money:changed.
 */
export function spendMoney(amount: number, reason: string): boolean {
  const s = getState();
  if (awaitingCampReplay(s) || s.money < amount) return false;
  const balance = s.money - amount;
  setState({ money: balance });
  bus.emit('money:changed', { delta: -amount, reason, balance });
  return true;
}

/** Credit `amount` to money and emit money:changed. */
export function earnMoney(amount: number, reason: string): void {
  const s = getState();
  if (awaitingCampReplay(s)) return;
  const balance = s.money + amount;
  setState({ money: balance });
  bus.emit('money:changed', { delta: amount, reason, balance });
}
