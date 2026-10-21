// src/systems/training.ts — weekly training stat gains + injury recovery tick.
// See BAK-180 (WU-10). Pure TypeScript, no Phaser. All maths deterministic and
// unit-tested; stats stay fractional in state (UI rounds for display).
//
// Pipeline (ARCHITECTURE §5): training gains = order 10, injuries tick = order 20.
// applyTraining runs strictly before applyInjuries so an injured player trains at
// ×0.3 THIS week and recovers AFTER.

import { getState, setState, type GameState, type Player, type PlacedFacility, type PlayerStats, type TrainingFocus } from '../core/state';
import { FACILITY_CATALOG, levelMult, type FacilityDef, type FacilityDefId } from '../data/facility';
import { STAT_MAX, TRAINING_CURVE, TRAINING_FOCUS } from '../config';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { hasTrait, traitBoost } from '../data/traits';

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
 * Trait multiplier: workhorse ×1.2 at level I (×1.32 II, ×1.44 III) and
 * youngGun ×1.3 stack multiplicatively; all other traits ×1.0.
 */
export function traitMult(player: Player): number {
  let m = 1;
  const work = traitBoost(player.traits, 'workhorse');
  if (work > 0) m *= 1 + 0.2 * work;
  if (hasTrait(player.traits, 'youngGun')) m *= 1.3;
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
 * Headroom factor for one stat: (1 − stat/STAT_MAX)^HEADROOM_EXP, floored at 0.
 * Multiplies that week's gain so a stat gains less the closer it is to the
 * ceiling (GitHub #35). Evaluated on the pre-tick stat value.
 */
export function headroom(stat: number): number {
  return Math.max(0, 1 - stat / STAT_MAX) ** TRAINING_CURVE.HEADROOM_EXP;
}

// ── The squad's training focus (N11) ─────────────────────────────────────────
// What the coach sets on the Squad screen, its labels, and the managed manager's
// pick (the squad's weakest stat). The multipliers are config.ts TRAINING_FOCUS.

export const TRAINING_FOCI: readonly TrainingFocus[] = ['balanced', 'speed', 'strength', 'stamina', 'skill', 'footyIQ'];

const LABEL: Readonly<Record<TrainingFocus, string>> = {
  balanced: 'Balanced', speed: 'Speed', strength: 'Strength', stamina: 'Stamina', skill: 'Skill', footyIQ: 'Footy IQ',
};

export function focusLabel(f: TrainingFocus): string {
  return LABEL[f];
}

export function isTrainingFocus(v: unknown): v is TrainingFocus {
  return TRAINING_FOCI.includes(v as TrainingFocus);
}

/** The coach sets the squad's focus. */
export function setTrainingFocus(focus: TrainingFocus): void {
  if (getState().training?.focus === focus) return;
  setState({ training: { focus } });
}

/** The squad's weakest stat on average (ties to the first in TRAINING_FOCI order): what a manager short on that would train. */
export function weakestStat(squad: readonly Player[]): keyof PlayerStats {
  const keys = TRAINING_FOCI.filter((f): f is keyof PlayerStats => f !== 'balanced');
  if (squad.length === 0) return keys[0]!;
  const mean = (k: keyof PlayerStats): number => squad.reduce((a, p) => a + p.stats[k], 0) / squad.length;
  return keys.reduce((a, b) => (mean(b) < mean(a) ? b : a));
}

/** A stat's share of the week under a squad focus (N11): ×ON for the focus, ×OFF for the rest, ×1 under Balanced. */
export function focusMult(focus: TrainingFocus, stat: keyof PlayerStats): number {
  if (focus === 'balanced') return 1;
  return stat === focus ? TRAINING_FOCUS.ON : TRAINING_FOCUS.OFF;
}

/**
 * Compute one week of training for a single player against the given facilities.
 * Pure — returns a new PlayerStats; does not mutate. Exported for unit testing
 * of the exact per-player maths.
 */
export function trainPlayer(player: Player, facilities: PlacedFacility[], focus: TrainingFocus = 'balanced'): PlayerStats {
  const gain = weeklyGain(player, facilities, focus);
  const next: PlayerStats = { ...player.stats };
  for (const stat of STAT_KEYS) next[stat] += gain[stat];

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
 * What a player gains in a week of training (before the veteran decline and the
 * clamp): the facilities' gains, scaled by his age, traits and fitness, the squad
 * focus (N11) and each stat's headroom. Pure; the player page's "+0.8 a week".
 */
export function weeklyGain(player: Player, facilities: PlacedFacility[], focus: TrainingFocus = 'balanced'): PlayerStats {
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

  // 2. Scale summed gains by age × trait × injury modifiers, the tuning rate,
  //    and each stat's headroom towards STAT_MAX.
  const scale = ageMod(player.age) * traitMult(player) * injuryMult(player) * TRAINING_CURVE.GAIN_RATE;

  const out: PlayerStats = { speed: 0, strength: 0, stamina: 0, skill: 0, footyIQ: 0 };
  for (const stat of STAT_KEYS) out[stat] = gains[stat] * scale * focusMult(focus, stat) * headroom(player.stats[stat]);
  return out;
}

/**
 * What a week's training does to each stat (N11, the player page's "+0.8/wk"):
 * the gain, less the veteran decline, inside the clamp. Pure.
 */
export function weeklyChange(player: Player, facilities: PlacedFacility[], focus: TrainingFocus = 'balanced'): PlayerStats {
  const after = trainPlayer(player, facilities, focus);
  const out = { ...after };
  for (const stat of STAT_KEYS) out[stat] = after[stat] - player.stats[stat];
  return out;
}

/**
 * Tick hook order 10: apply one week of training to every squad player.
 * Mutates & returns state (via setState so state:changed fires).
 */
export function applyTraining(state: GameState): GameState {
  const facilities = state.facilities;
  const focus = state.training?.focus ?? 'balanced';
  const squad = state.squad.map((p) => ({ ...p, stats: trainPlayer(p, facilities, focus) }));
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
