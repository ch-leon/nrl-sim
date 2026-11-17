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

/** Read-only management date. Pending League choices retain the completed raw
 * cursor while every new promise belongs to the following authored year.
 * Call only on trusted state; save validation verifies progression first. */
export function careerActionClock(s: Pick<GameState, 'season' | 'week'> & Partial<Pick<GameState, 'competitions'>>) {
  const progress = s.competitions?.leagueCareer;
  const calendar = progress && s.competitions?.calendar;
  const planning = !!calendar && progress.phase === 'next-season-choice';
  const duration = calendar ? calendar.slots.length : WEEKS_PER_SEASON;
  const season = s.season + (planning ? 1 : 0);
  const week = planning ? 1 : s.week;
  return { season, week, duration, remaining: Math.max(1, duration - Math.max(1, Math.trunc(week)) + 1),
    phase: progress?.phase ?? 'legacy', structural: !!calendar,
    // Acceptance may keep the effective date but invalidates pending offers/undo.
    key: `${s.season}:${s.week}:${progress?.phase ?? 'legacy'}:${progress?.accepted?.receiptId ?? ''}` };
}
export type CareerActionClock = ReturnType<typeof careerActionClock>;
