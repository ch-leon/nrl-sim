// src/systems/training.ts — weekly training stat gains + injury recovery tick.
// See BAK-180 (WU-10). Pure TypeScript, no Phaser. All maths deterministic and
// unit-tested; stats stay fractional in state (UI rounds for display).
//
// Pipeline (ARCHITECTURE §5): training gains = order 10, injuries tick = order 20.
// applyTraining runs strictly before applyInjuries so an injured player trains at
// ×0.3 THIS week and recovers AFTER.

import { getState, setState, type GameState, type Player, type PlacedFacility, type PlayerStats } from '../core/state';
import { FACILITY_CATALOG, levelMult, type FacilityDef, type FacilityDefId } from '../data/facility';
import { STAT_MAX } from '../config';
import { registerTickHook, TICK_ORDER } from '../core/time';

/** Stats floor. Stats are clamped to [STAT_FLOOR, STAT_MAX] after each tick. */
export const STAT_FLOOR = 1;

/** Veteran (31+) flat weekly decline applied to speed & stamina, post-gain. */
export const VETERAN_DECLINE = 0.3;

/** Resolve a facility catalog definition by placed-instance defId. */
function getDef(defId: FacilityDefId): FacilityDef {
  return FACILITY_CATALOG[defId];
}

// Re-export levelMult (canonical source is facility.ts / BAK-168) so callers of
// the training system have a single import surface. Signature: (1|2|3) → number.
export { levelMult };

/**
 * Age-based development modifier applied to all training gains.
 *  age<=21 → 1.5 ; 22-27 → 1.0 ; 28-30 → 0.6 ; 31+ → 0.25
 */
export function ageMod(age: number): number {
  if (age <= 21) return 1.5;
  if (age <= 27) return 1.0;
  if (age <= 30) return 0.6;
  return 0.25;
}

/**
 * True when facilities `a` and `b` footprints are orthogonally adjacent
 * (touching along a N/E/S/W edge — not merely diagonally). Uses each def's
 * footprint (w,h) with (x,y) as the top-left grid origin.
 */
function footprintsAdjacent(a: PlacedFacility, b: PlacedFacility): boolean {
  const fa = getDef(a.defId).footprint;
  const fb = getDef(b.defId).footprint;
  const aL = a.x, aR = a.x + fa.w, aT = a.y, aB = a.y + fa.h;
  const bL = b.x, bR = b.x + fb.w, bT = b.y, bB = b.y + fb.h;

  // Horizontal edge contact: one's right edge meets the other's left edge, and
  // their vertical spans overlap (strictly, so corner-only touching = diagonal).
  const horizTouch = (aR === bL || bR === aL) && aT < bB && bT < aB;
  // Vertical edge contact: bottom meets top, horizontal spans overlap.
  const vertTouch = (aB === bT || bB === aT) && aL < bR && bL < aR;

  return horizTouch || vertTouch;
}

/**
 * Count of facilities orthogonally adjacent to `f` (footprints touching N/E/S/W).
 * Adjacency multiplier = 1 + 0.1 × adjacentCount, capped at 1.4.
 */
export function adjacencyMult(f: PlacedFacility, all: PlacedFacility[]): number {
  let count = 0;
  for (const other of all) {
    if (other === f || other.id === f.id) continue;
    if (footprintsAdjacent(f, other)) count += 1;
  }
  return Math.min(1.4, 1 + 0.1 * count);
}

/**
 * Trait multiplier: workhorse ×1.2 and youngGun ×1.3 stack multiplicatively;
 * all other traits ×1.0.
 */
export function traitMult(player: Player): number {
  let m = 1;
  if (player.traits.includes('workhorse')) m *= 1.2;
  if (player.traits.includes('youngGun')) m *= 1.3;
  return m;
}

/** Injury multiplier: injuredWeeks>0 → 0.3 else 1.0. */
export function injuryMult(player: Player): number {
  return player.injuredWeeks > 0 ? 0.3 : 1.0;
}

const STAT_KEYS: readonly (keyof PlayerStats)[] = [
  'speed', 'strength', 'stamina', 'skill', 'footyIQ',
];

const clamp = (n: number): number => Math.max(STAT_FLOOR, Math.min(STAT_MAX, n));

/**
 * Compute one week of training for a single player against the given facilities.
 * Pure — returns a new PlayerStats; does not mutate. Exported for unit testing
 * of the exact per-player maths.
 */
export function trainPlayer(player: Player, facilities: PlacedFacility[]): PlayerStats {
  // 1. Sum per-stat base contributions across all built facilities.
  const gains: Record<keyof PlayerStats, number> = {
    speed: 0, strength: 0, stamina: 0, skill: 0, footyIQ: 0,
  };
  for (const pf of facilities) {
    const def = getDef(pf.defId);
    const lm = levelMult(pf.level);
    const adj = adjacencyMult(pf, facilities);
    for (const stat of STAT_KEYS) {
      const base = def.trains[stat];
      if (base === undefined) continue;
      gains[stat] += base * lm * adj;
    }
  }

  // 2. Scale summed gains by age × trait × injury modifiers.
  const scale = ageMod(player.age) * traitMult(player) * injuryMult(player);

  const next: PlayerStats = { ...player.stats };
  for (const stat of STAT_KEYS) {
    next[stat] = next[stat] + gains[stat] * scale;
  }

  // 3. Veteran decline: age>=31 subtract flat 0.3 from speed & stamina, post-gain.
  if (player.age >= 31) {
    next.speed -= VETERAN_DECLINE;
    next.stamina -= VETERAN_DECLINE;
  }

  // 4. Clamp every stat to [STAT_FLOOR, STAT_MAX]; stays fractional.
  for (const stat of STAT_KEYS) {
    next[stat] = clamp(next[stat]);
  }
  return next;
}

/**
 * Tick hook order 10: apply one week of training to every squad player.
 * Mutates & returns state (via setState so state:changed fires).
 */
export function applyTraining(state: GameState): GameState {
  const facilities = state.facilities;
  const squad = state.squad.map((p) => ({ ...p, stats: trainPlayer(p, facilities) }));
  setState({ squad });
  return getState();
}

/**
 * Tick hook order 20: decrement injuredWeeks for injured players.
 * Base recovery = 1 week/tick. A built medicalBay adds its `level` extra weeks;
 * a built physioCentre adds 1 extra. Deterministic (no RNG).
 * injuredWeeks = max(0, injuredWeeks − recovery).
 */
export function applyInjuries(state: GameState): GameState {
  const medicalBay = state.facilities.find((f) => f.defId === 'medicalBay');
  const physio = state.facilities.find((f) => f.defId === 'physioCentre');
  let recovery = 1;
  if (medicalBay) recovery += medicalBay.level;
  if (physio) recovery += 1;

  let changed = false;
  const squad = state.squad.map((p) => {
    if (p.injuredWeeks <= 0) return p;
    changed = true;
    return { ...p, injuredWeeks: Math.max(0, p.injuredWeeks - recovery) };
  });
  if (changed) setState({ squad });
  return getState();
}

/**
 * Install the training-system tick hooks (order 10 + 20). Called explicitly by
 * the orchestrator (main.ts) — importing this module has no side effects.
 * Hooks read/write the live store via getState/setState.
 */
export function registerTrainingSystem(): void {
  registerTickHook('training', TICK_ORDER.training, () => {
    applyTraining(getState());
  });
  registerTickHook('injuries', TICK_ORDER.injuries, () => {
    applyInjuries(getState());
  });
}
