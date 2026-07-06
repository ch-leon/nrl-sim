// src/sim/weather.ts — weather roll + modifiers and momentum helpers for the
// match engine. See BAK-198 (WU-6). Pure deterministic TypeScript, no Phaser.
// All randomness flows through a caller-supplied `() => number` (mulberry32).
//
// WeatherKind has a single canonical source in ../core/state (ARCHITECTURE §6);
// re-exported here so sim code can import it from the sim module.
export type { WeatherKind } from '../core/state';
import type { WeatherKind } from '../core/state';

// ── Weather roll ───────────────────────────────────────────────────────────

/**
 * Roll the weather for a match: 60% clear / 25% rain / 15% wind.
 * Deterministic given the supplied rng (accepts a bare `() => number` so it can
 * be driven directly by mulberry32's `next` or any seeded float source).
 */
export function rollWeather(rng: () => number): WeatherKind {
  const r = rng();
  if (r < 0.6) return 'clear';
  if (r < 0.85) return 'rain'; // 0.6..0.85 = 25%
  return 'wind'; // 0.85..1.0 = 15%
}

// ── Weather modifiers ──────────────────────────────────────────────────────

export interface WeatherMods {
  errorMult: number; // multiplies base error chance
  breakMult: number; // multiplies base break chance
  kickSuccessMult: number; // multiplies conversion & penalty-goal success prob
  kickDistanceMult: number; // scales downfield kick distance
}

// Exact table from BAK-198. Rain never affects kicking; wind never affects
// errors — orthogonal so each effect is independently testable.
const MODS: Record<WeatherKind, WeatherMods> = {
  clear: { errorMult: 1.0, breakMult: 1.0, kickSuccessMult: 1.0, kickDistanceMult: 1.0 },
  rain: { errorMult: 1.5, breakMult: 0.8, kickSuccessMult: 1.0, kickDistanceMult: 1.0 },
  wind: { errorMult: 1.0, breakMult: 1.0, kickSuccessMult: 0.75, kickDistanceMult: 1.15 },
};

/** Multiplicative modifiers for a given weather kind. */
export function weatherMods(w: WeatherKind): WeatherMods {
  return MODS[w];
}

/** Magnitude of the per-kick wind distance jitter (±15%). */
export const WIND_DISTANCE_JITTER = 0.15;

// ── Momentum model ─────────────────────────────────────────────────────────

export const MOMENTUM_MIN = -100;
export const MOMENTUM_MAX = 100;
export const MOMENTUM_TRY = 30;
export const MOMENTUM_BIGHIT = 15;
export const MOMENTUM_ERROR = 10;
export const MOMENTUM_DECAY = 0.1; // 10% toward 0 per set
export const MOMENTUM_MAX_WEIGHT_PCT = 0.08; // ±8% max on outcome weights

const clampMomentum = (m: number): number =>
  Math.max(MOMENTUM_MIN, Math.min(MOMENTUM_MAX, m));

/**
 * Apply a momentum event, returning the new clamped momentum (+ = home).
 * try/big-hit push momentum TOWARD the acting team; error pushes AGAINST it.
 * `actorIsHome` = true when the acting team is the home side.
 */
export function applyMomentumEvent(
  m: number,
  kind: 'try' | 'big-hit' | 'error',
  actorIsHome: boolean,
): number {
  const magnitude =
    kind === 'try' ? MOMENTUM_TRY : kind === 'big-hit' ? MOMENTUM_BIGHIT : MOMENTUM_ERROR;
  // Positive delta favours home. try/big-hit favour the actor; error favours
  // the opponent (pushes against the actor).
  const towardActor = kind === 'error' ? -1 : 1;
  const homeSign = actorIsHome ? 1 : -1;
  return clampMomentum(m + magnitude * towardActor * homeSign);
}

/** Decay momentum 10% toward zero (per set). */
export function decayMomentum(m: number): number {
  return m * (1 - MOMENTUM_DECAY);
}

/**
 * Convert momentum into a multiplicative weight nudge for the team currently in
 * possession. At momentum ±100 the possessing side's favourable-outcome weight
 * shifts by ±MOMENTUM_MAX_WEIGHT_PCT (±8% ≈ 8 rating points), so base stats stay
 * dominant. Returns a factor around 1.0 to multiply favourable-outcome weight by.
 */
export function momentumWeightMod(m: number, possIsHome: boolean): number {
  // momentum in favour of the possessing team, in [-1, 1].
  const favour = (possIsHome ? m : -m) / MOMENTUM_MAX;
  return 1 + favour * MOMENTUM_MAX_WEIGHT_PCT;
}
