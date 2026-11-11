// The first pacing profile is authored data, not a runtime scheduling rule.
import type { CompetitionCalendarSlot } from '../../data/competitionCalendar';

export const INITIAL_TRIAL_SLOTS = [1, 4] as const;
export const INITIAL_REGULAR_SLOTS: readonly number[] = [5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 22, 23];
export const INITIAL_FINALS_SLOTS: readonly number[] = [24, 25];
export const INITIAL_CALENDAR: readonly CompetitionCalendarSlot[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1, kind: index === 0 || index === 3 ? 'preseason' : index === 1 || index === 2 ? 'rest' : 'competition',
}));
