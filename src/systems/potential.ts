// src/systems/potential.ts — a player's projected career (GitHub #369).
//
// There is no potential stat. What the player page shows is a projection: the
// weekly training rules (training.ts trainPlayer: the facilities' gains scaled
// by age, traits, the squad focus and headroom, then the veteran decline) run
// forward week by week with no dice and no injuries, ageing a year at each
// season's rollover the way time.ts and aging.ts do. So it moves when a
// facility is built, and it is no promise. Pure: reads its arguments, writes
// nothing, rolls nothing.

import type { PlacedFacility, Player, TrainingFocus } from '../core/state';
import { overallRating } from '../data/player';
import { RETIRE_SOFT_AGE, WEEKS_PER_SEASON } from '../config';
import { ageMod, trainPlayer } from './training';
import { agePlayer, retirementChance } from './aging';

/** The curve runs to this age. */
export const PROJECTION_LAST_AGE = 34;

/**
 * Rating points short of the best that still count as the peak. Once the big
 * gains are in, the 28–30 band's ×0.6 and the rounding creep a point on over
 * years of plateau; a peak at 30 would read as "still improving", so the peak
 * is when he gets there, not the last point he adds.
 */
export const PEAK_TOLERANCE = 1;

export interface CareerPoint {
  age: number;
  rating: number;
}

export interface CareerProjection {
  /** The overall rating today, then on each birthday (a season's rollover) to PROJECTION_LAST_AGE. */
  points: CareerPoint[];
  /** Where the curve tops out: the first point within PEAK_TOLERANCE of the best. */
  peak: CareerPoint;
}

/**
 * Run a player's training forward `seasonsAhead` seasons (to PROJECTION_LAST_AGE
 * by default) against `facilities` and `focus`, from `week` of the current season.
 * Each week is trainPlayer's week with the player fit; each rollover ages him a
 * year and re-derives the age traits (agePlayer). Retirement isn't rolled.
 */
export function projectCareer(
  player: Player,
  facilities: PlacedFacility[],
  focus: TrainingFocus = 'balanced',
  seasonsAhead = Math.max(0, PROJECTION_LAST_AGE - player.age),
  week = 1,
): CareerProjection {
  let p: Player = { ...player, injuredWeeks: 0 };
  const points: CareerPoint[] = [{ age: p.age, rating: overallRating(p) }];
  // This season's weeks still to train (week is the one about to be played), then whole seasons.
  let weeks = Math.max(0, WEEKS_PER_SEASON - week + 1);
  for (let s = 0; s < seasonsAhead; s++) {
    for (let w = 0; w < weeks; w++) p = { ...p, stats: trainPlayer(p, facilities, focus) };
    p = agePlayer(p);
    points.push({ age: p.age, rating: overallRating(p) });
    weeks = WEEKS_PER_SEASON;
  }
  const best = Math.max(...points.map((x) => x.rating));
  const peak = points.find((x) => x.rating >= best - PEAK_TOLERANCE)!;
  return { points, peak };
}

export type CareerStage = 'Developing' | 'Prime' | 'Declining';

/**
 * Where an age sits on the curve, from training.ts ageMod's bands: Developing
 * while he trains at ×1.5 (21 and under), Prime while he still gains at ×1 or
 * ×0.6 (22–30), Declining from the veteran decline at ×0.25 (31+).
 */
export function careerStage(age: number): CareerStage {
  const m = ageMod(age);
  return m > 1 ? 'Developing' : m >= ageMod(30) ? 'Prime' : 'Declining';
}

/** The page shows the retirement risk from this age: one birthday short of RETIRE_SOFT_AGE. */
export const RETIREMENT_NOTE_AGE = RETIRE_SOFT_AGE - 1;

/** The chance he retires at the coming rollover (aging.ts rolls it once he is a year older). */
export function retirementRisk(age: number): number {
  return retirementChance(age + 1);
}
