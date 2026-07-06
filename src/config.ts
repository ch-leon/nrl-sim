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

// Economy tuning (BAK-188, WU-10). Weekly income/expense loop constants read by
// src/systems/economy.ts. See the ticket spec for formula derivations.
export const ECON = {
  SPONSOR_PER_LEVEL: 3_000,       // × Sponsor Board level, if built
  REP_GRANT_PER_POINT: 50,        // × reputation, weekly base grant
  TICKET_PRICE: 20,               // $ per attendee
  ATTEND_BASE: 500,               // base attendance
  ATTEND_PER_REP: 40,             // × reputation
  GRANDSTAND_ATTEND_MULT: 0.5,    // × grandstand level, as (1 + mult×level)
  BANKRUPTCY_WARN: 0,             // balance < 0 → warning
  FORCED_SALE_FLOOR: -50_000,     // balance < this → forced sales
  FORCED_SALE_MORALE_HIT: 10,     // squad-wide morale −10 per forced sale
} as const;
