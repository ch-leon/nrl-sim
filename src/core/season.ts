// Trials are a separate phase: competitive week/round numbers never shift.
import type { GameState } from './state';
import { WEEKS_PER_SEASON } from '../config';

export function inTrials(s: Pick<GameState, 'week' | 'preseason'> & Partial<Pick<GameState, 'competitions'>>): boolean {
  return !s.competitions?.calendar && s.week === 1 && (s.preseason === 1 || s.preseason === 2);
}

/** Negative/zero fixture rounds reserve 1..27 for the existing competition. */
export function currentRound(s: Pick<GameState, 'week' | 'preseason'>): number {
  return inTrials(s) ? s.preseason! - 2 : s.week;
}

export function seasonWeekLabel(s: Pick<GameState, 'week' | 'season' | 'preseason'> & Partial<Pick<GameState, 'competitions'>>): string {
  if (s.competitions?.calendar) return `Prototype slot ${s.week} of ${s.competitions.calendar.slots.length} · Season ${s.season}`;
  return inTrials(s) ? `Trial ${s.preseason} of 2 · Season ${s.season}` : `Week ${s.week} of ${WEEKS_PER_SEASON} · Season ${s.season}`;
}

/** Event time never changes meaning when a later prototype season changes length. */
export function elapsedInterval(s: Pick<GameState, 'season' | 'week'> & Partial<Pick<GameState, 'competitions'>>): number {
  return s.competitions?.calendar ? s.competitions.calendar.elapsedIntervals + 1 : (s.season - 1) * WEEKS_PER_SEASON + s.week;
}
