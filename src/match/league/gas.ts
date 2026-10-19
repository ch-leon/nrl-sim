// src/match/league/gas.ts — sprint and gas (BAK-208 §8.2, F2). Pace is
// something a player spends: he cruises at 94% of his top speed and sprints
// only when it matters, burning GAS, a small tank that empties in seconds and
// refills in seconds. Empty, he is BLOWN (75%) until a quarter is back. Legs
// (fatigue.ts) are the ceiling: at 60% legs the tank only fills to 60% and
// refills slower. Stamina sets the tank and the refill, Speed the top speed,
// Jets a bigger tank. Pure: live.ts keeps each player's gas and calls these.
import { traitBoost, type TraitInstance } from '../../data/traits';

/** The gas knobs (BAK-208 §8.2; tuning reference §10a). Overridable by name in balance experiments (tuning.ts). */
export const GAS = {
  /** Pace when not sprinting, as a share of top speed. */
  cruise: 0.94,
  /** Pace with the tank empty, until it is back to `recoverAt`. */
  blown: 0.75,
  recoverAt: 0.25,
  /** Seconds of sprint in a full tank: tankBase + Stamina × tankPerStamina (2.2 / 3.3 / 4.9 s at 30 / 50 / 80). */
  tankBase: 0.5,
  tankPerStamina: 1 / 18,
  /** Seconds to refill an empty tank while cruising: refillBase − Stamina × refillPerStamina (10.8 / 10 / 8.8 s). */
  refillBase: 12,
  refillPerStamina: 1 / 25,
  /** Refill runs this much faster standing or walking. */
  standRefill: 1.5,
  /** The first strides after beating a man: sprint pace × this while the break lasts (live.burstTicks). */
  breakBurst: 1,
  /** Jets: the tank × (1 + this × level multiplier). */
  jetsTank: 0.4,
  /** Legs cost of running per metre, × the fatigue run cost: sprinting, cruising. */
  sprintRunCost: 1.5,
  cruiseRunCost: 0.9,
};

/** Seconds of full sprint in a full tank for this player. */
export function tankSeconds(stamina: number, traits: readonly TraitInstance[] = []): number {
  return (GAS.tankBase + stamina * GAS.tankPerStamina) * (1 + GAS.jetsTank * traitBoost(traits, 'jets'));
}

/** Seconds to refill an empty tank while cruising (fresh legs). */
export function refillSeconds(stamina: number): number {
  return Math.max(2, GAS.refillBase - stamina * GAS.refillPerStamina);
}

export interface GasState {
  /** Share of a full tank, 0..1 (never above the player's legs). */
  gas: number;
  /** Ran it dry: no sprinting, and below cruise, until `recoverAt` is back. */
  blown: boolean;
}

/**
 * One tick of gas. Sprinting burns a full tank in `tankS` seconds; otherwise it
 * refills (faster standing, slower on tired legs) up to the legs ceiling. Returns
 * true on the tick he runs dry.
 */
export function stepGas(g: GasState, sprinting: boolean, standing: boolean, legs: number, tankS: number, refillS: number, dt: number): boolean {
  const cap = Math.max(0, Math.min(1, legs));
  if (sprinting && !g.blown && g.gas > 0) {
    g.gas = Math.max(0, g.gas - dt / tankS);
    if (g.gas <= 0) {
      g.blown = true;
      return true;
    }
  } else {
    const rate = (standing ? GAS.standRefill : 1) * (0.5 + 0.5 * cap);
    g.gas = Math.min(cap, g.gas + (dt / refillS) * rate);
    if (g.blown && g.gas >= Math.min(GAS.recoverAt, cap)) g.blown = false;
  }
  if (g.gas > cap) g.gas = cap;
  return false;
}

/** Can he sprint right now? */
export const canSprint = (g: GasState): boolean => !g.blown && g.gas > 0;

/** Share of top speed for this tick: full when sprinting, cruise otherwise, less when blown. */
export function paceMult(g: GasState, sprinting: boolean): number {
  if (g.blown) return GAS.blown;
  return sprinting && g.gas > 0 ? 1 : GAS.cruise;
}

/** Legs cost multiplier per metre for the way he is running. */
export const runCostMult = (sprinting: boolean): number => (sprinting ? GAS.sprintRunCost : GAS.cruiseRunCost);
