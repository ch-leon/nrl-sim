// src/match/league/weather.ts — weather, injuries and the ball lost in contact
// in the live sim (BAK-207 §5.1 2f). Rain makes the ball slippery: more
// knock-ons, dropped kicks and balls lost in the tackle. Wind carries punts
// downfield or holds them up, and blows goal kicks off line. A big hit can
// injure the carrier (the old engine's chance, GitHub #7): he plays on hampered
// until the next stoppage, when the coach takes him off first (2b), or for the
// rest of the match if there is nobody left to come on. Pure: live.ts applies it.
import type { WeatherKind } from '../../core/state';
import type { RosterEntry } from '../../sim/events';
import { hasTrait } from '../../data/traits';
import { makeRng } from '../../utils/rng';

/** The weather and injury knobs (tuning reference §18). Overridable by name in balance experiments (tuning.ts). */
export const WEATHER = {
  /** Rain: a pass knock-on, a spilled kick and the ball lost in the tackle are this many times as likely. */
  rainHandling: 1.6,
  /** Wind: penalty kicks for touch carry this far; open-play punts use the direction. */
  windKick: 1.12,
  /** Punt carry changes by this share for a tailwind or headwind. */
  windPuntCarry: 0.14,
  /** Punts hang this much longer into the wind, and fall this much sooner with it. */
  windPuntHang: 0.12,
  windJitter: 0.15,
  windGoalSpread: 1.4,
  /** Ball lost in contact (a knock-on in the tackle): a held tackle, a big hit; less for a high-Handling carrier (per point over 50). */
  lostHeld: 0.006,
  lostBigHit: 0.03,
  lostSkill: 0.0001,
  /**
   * Injury on a big hit (the old engine's roll, GitHub #7): base + risk/100 × perRisk, × Injury
   * Prone. Scaled to about a third of the old engine's (0.015 + risk × 0.1) because the live sim
   * makes about 3½ times the big hits (25 a match to 7): a season's injuries stay as they were.
   */
  injuryBase: 0.005,
  injuryPerRisk: 0.036,
  injuryProne: 1.4,
  /** A hurt player runs at this share of his pace until he comes off. */
  hurtSpeed: 0.85,
};

/** How the weather changes the game, for a weather kind. */
export interface WeatherEffect {
  /** Multiplier on knock-ons, spilled kicks and balls lost in contact. */
  handling: number;
  /** Multipliers on penalties kicked for touch and on goal-kick spread (higher is less accurate). */
  kickDistance: number;
  goalSpread: number;
  /** Wind: territory kicks vary in length by ± this share. */
  jitter: number;
}

export function weatherEffect(w: WeatherKind | undefined): WeatherEffect {
  if (w === 'rain') return { handling: WEATHER.rainHandling, kickDistance: 1, goalSpread: 1, jitter: 0 };
  if (w === 'wind') return { handling: 1, kickDistance: WEATHER.windKick, goalSpread: WEATHER.windGoalSpread, jitter: WEATHER.windJitter };
  return { handling: 1, kickDistance: 1, goalSpread: 1, jitter: 0 };
}

export type WindDirection = -1 | 0 | 1;

/** Fixed field direction, independent of the play RNG and which ends the teams attack. */
export function windDirection(weather: WeatherKind | undefined, seed: number): WindDirection {
  if (weather !== 'wind') return 0;
  return makeRng(seed ^ 0x77696e64).next() < 0.5 ? -1 : 1;
}

export function puntCarry(wind: WindDirection, attack: -1 | 1): number {
  return 1 + wind * attack * WEATHER.windPuntCarry;
}

/** Chance the carrier loses the ball in the tackle: a big hit more than a held tackle, a high-Handling carrier less, rain more. */
export function lostInContactChance(bigHit: boolean, handling: number, weatherHandling: number): number {
  const base = bigHit ? WEATHER.lostBigHit : WEATHER.lostHeld;
  return Math.max(0, (base - (handling - 50) * WEATHER.lostSkill) * weatherHandling);
}

/** Chance a big hit injures the carrier (the old engine's roll, scaled): his injury risk, Injury Prone, the difficulty's rate. */
export function injuryChance(entry: Pick<RosterEntry, 'injuryRisk' | 'traits'> | undefined, rate = 1): number {
  const risk = entry?.injuryRisk ?? 20;
  const prone = hasTrait(entry?.traits, 'injuryProne') ? WEATHER.injuryProne : 1;
  return (WEATHER.injuryBase + (risk / 100) * WEATHER.injuryPerRisk) * rate * prone;
}
