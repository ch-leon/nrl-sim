// Game constants — see ARCHITECTURE.md §3. This file is the single source of
// truth for tuning values shared across sim, systems, data, and rendering.

export const GRID_W = 20;            // club grounds grid (tiles)
export const GRID_H = 20;
export const TILE_W = 64;            // iso tile screen width (2:1 diamond)
export const TILE_H = 32;
export const SEASON_ROUNDS = 24;     // home & away vs 15 rivals + repeats
export const FINALS_WEEKS = 3;       // weeks 25-27 if qualified
export const WEEKS_PER_SEASON = SEASON_ROUNDS + FINALS_WEEKS;
export const SQUAD_CAP = 30;
export const SQUAD_MIN = 13;         // cannot play a match below this
export const STARTING_MONEY = 200_000;
export const STAT_MAX = 100;
