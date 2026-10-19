// src/match/league/weather.ts — weather, injuries and the ball lost in contact
// in the live sim (BAK-207 §5.1 2f). Rain makes the ball slippery: more
// knock-ons, dropped kicks and balls lost in the tackle. Wind carries kicks
// further and less predictably and blows goal kicks off line. A big hit can
// injure the carrier (the old engine's chance, GitHub #7): he plays on hampered
// until the next stoppage, when the coach takes him off first (2b), or for the
// rest of the match if there is nobody left to come on. Pure: live.ts applies it.
import type { WeatherKind } from '../../core/state';
import type { RosterEntry } from '../../sim/events';
import { hasTrait } from '../../data/traits';

/** The weather and injury knobs (tuning reference §18). Overridable by name in balance experiments (tuning.ts). */
export const WEATHER = {
  /** Rain: a pass knock-on, a spilled kick and the ball lost in the tackle are this many times as likely. */
  rainHandling: 1.6,
  /** Wind: territory kicks carry this much further, give or take `windJitter`; goal kicks spread this much wider. */
  windKick: 1.12,
  windJitter: 0.15,
  windGoalSpread: 1.4,
  /** Ball lost in contact (a knock-on in the tackle): a held tackle, a big hit; less for a high-Skill carrier (per point over 50). */
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
  /** Multiplier on territory-kick distance (before the wind's jitter), and on goal-kick spread (accuracy: higher is worse). */
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

/** Chance the carrier loses the ball in the tackle: a big hit more than a held tackle, a high-Skill carrier less, rain more. */
export function lostInContactChance(bigHit: boolean, skill: number, handling: number): number {
  const base = bigHit ? WEATHER.lostBigHit : WEATHER.lostHeld;
  return Math.max(0, (base - (skill - 50) * WEATHER.lostSkill) * handling);
}

/** Chance a big hit injures the carrier (the old engine's roll, scaled): his injury risk, Injury Prone, the difficulty's rate. */
export function injuryChance(entry: Pick<RosterEntry, 'injuryRisk' | 'traits'> | undefined, rate = 1): number {
  const risk = entry?.injuryRisk ?? 20;
  const prone = hasTrait(entry?.traits, 'injuryProne') ? WEATHER.injuryProne : 1;
  return (WEATHER.injuryBase + (risk / 100) * WEATHER.injuryPerRisk) * rate * prone;
}
