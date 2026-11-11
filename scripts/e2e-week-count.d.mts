interface CareerClock { season: number; week: number; preseason?: 0 | 1 | 2 }
export function weeksAdvanced(before: CareerClock, after: CareerClock): number;
