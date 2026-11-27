interface CareerClock { season: number; week: number; preseason?: 0 | 1 | 2; competitions?: { calendar?: { elapsedIntervals: number } } }
export function weeksAdvanced(before: CareerClock, after: CareerClock): number;
