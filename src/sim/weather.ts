// src/sim/weather.ts — the weekly weather roll and the momentum helpers the
// match recorder keeps its timeline with (the live sim's weather effects are in
// src/match/league/weather.ts). See BAK-198 (WU-6). Pure deterministic TypeScript, no Phaser.
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

// ── Momentum model ─────────────────────────────────────────────────────────

export const MOMENTUM_MIN = -100;
export const MOMENTUM_MAX = 100;
export const MOMENTUM_TRY = 30;
export const MOMENTUM_BIGHIT = 15;
export const MOMENTUM_ERROR = 10;
export const MOMENTUM_DECAY = 0.1; // 10% toward 0 per set

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
