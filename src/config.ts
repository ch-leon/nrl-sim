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
export const SQUAD_MIN = 13;         // cannot play a match below this (club management)
/** Points awarded to the non-forfeiting side (fit squad < SQUAD_MIN). */
export const FORFEIT_SCORE = 24;
/** Soft retirement age — chance ramps from here to RETIRE_HARD_AGE (GitHub #5). */
export const RETIRE_SOFT_AGE = 34;
/** Hard retirement age — players at/above this always retire at season rollover. */
export const RETIRE_HARD_AGE = 38;
/** Players on the field per side in a match (Nines trial — BAK-206 / #1). */
export const ON_FIELD = 9;
/** Tackles per set before a last-tackle kick (Nines trial — BAK-206 / #1). */
export const SET_TACKLES = 5;
export const STARTING_MONEY = 200_000;
export const STAT_MAX = 100;

// Training curve (GitHub #35). Each week's stat gain is multiplied by headroom:
//   GAIN_RATE × (1 − stat / STAT_MAX) ^ HEADROOM_EXP
// so gains are quick early and slow towards the ceiling, with no stored
// potential. Tuned so a typical ~60-overall player on one Training Paddock gains
// about 8–9 overall in season 1 and then slows sharply (projection test in
// tests/systems/training.test.ts). Raise HEADROOM_EXP to flatten the top end;
// raise GAIN_RATE to speed up every stat.
export const TRAINING_CURVE = {
  GAIN_RATE: 12,
  HEADROOM_EXP: 2,
} as const;

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

// Board objectives, finals prize money and the sacking state (GitHub #47).
// Patience is the board's tolerance: each missed objective costs one point, a
// clean sweep earns one back, and zero means the player is sacked.
export const BOARD = {
  MAX_PATIENCE: 5,
  START_PATIENCE: 5,
  REP_PER_MET: 2,            // reputation for each objective met
  GRANT_PER_MET: 15_000,     // one-off cash grant for each objective met
  BUILD_TARGET_EXTRA: 2,     // 'build' objective: facilities beyond the current count
  SOLVENT_FLOOR: { easy: -10_000, normal: 0, hard: 20_000 },
} as const;

/** Finals prize money, paid at season rollover (per round played, plus bonuses). */
export const PRIZE = {
  PER_FINALS_WEEK: 15_000,   // each finals match the club played in
  GRAND_FINAL: 25_000,       // extra for reaching the grand final
  PREMIERSHIP: 75_000,       // extra for winning it
} as const;

/** Weekly morale dynamics (systems/morale.ts). Morale is clamped to 1..100, neutral 50. */
export const MORALE = {
  NEUTRAL: 50,
  WIN: 4,                // result swing for the player's match this week
  LOSS: -4,
  DRIFT: 0.2,            // fraction of the gap to NEUTRAL recovered per week
  LOW_PAY_RATIO: 0.8,    // wage below this × the market wage for the player's overall = unhappy
  LOW_PAY_PENALTY: -1,
  EXPIRING_WEEKS: 8,     // contract with this many weeks or fewer left = unsettled
  EXPIRING_PENALTY: -1,
} as const;

/** Random events deck (GitHub #75, systems/events.ts). With a 2-week gap and a
 *  40% weekly chance after it, a card turns up about every 3.5 weeks. */
export const EVENTS = {
  MIN_GAP_WEEKS: 2,   // weeks after a card before another can be drawn
  WEEKLY_CHANCE: 0.4, // chance per eligible week
  MAX_PENDING: 2,     // no new card while this many are unanswered
  ANSWER_WEEKS: 2,    // weeks to answer before the default choice is taken
} as const;

/**
 * Feature flags. `cosmeticKits` (GitHub #79) turns on the kit designer; it is on
 * and everything in it is free. It exists only so a future monetisation decision
 * (BAK-205: cosmetics only, never pay-to-win) could gate extra patterns without
 * code changes. Kits never touch gameplay.
 */
export const FEATURES = {
  cosmeticKits: true,
} as const;

/** Moving and demolishing facilities on the grounds (GitHub #78). */
export const GROUNDS = {
  MOVE_FEE_RATE: 0.1,         // move fee = 10% of the build cost
  DEMOLISH_REFUND_RATE: 0.3,  // demolish refund = 30% of build + upgrades
} as const;

/** Contracts screen (GitHub #40). */
export const CONTRACTS = {
  WARN_WEEKS: [8, 4, 1] as readonly number[], // toast when this many weeks remain
  RENEW_FEE_WEEKS: 2,       // early-renewal fee = this × new weekly wage
  RENEW_MORALE_SWING: 0.15, // wage ask ±15% across the morale range (low morale = dearer)
  NEW_CONTRACT_WEEKS: 52,
  SELL_PER_OVERALL_SQ: 10,  // base transfer fee = overall² × this
} as const;

// Difficulty (GitHub #48). Multipliers applied at the existing call sites:
// starting money (createNewGame), weekly wages (economy.weeklyWages), the
// big-hit injury chance (engine opts.injuryRate via matchday) and rival strength
// when building the opponent's team sheet (matchday.sheetFor). Normal is 1.0
// everywhere so it plays exactly as before; old saves load as Normal.
export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export interface DifficultyMultipliers {
  startingMoney: number;
  wages: number;
  injuryRate: number;
  rivalStrength: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyMultipliers> = {
  easy: { startingMoney: 1.5, wages: 0.85, injuryRate: 0.7, rivalStrength: 0.92 },
  normal: { startingMoney: 1, wages: 1, injuryRate: 1, rivalStrength: 1 },
  hard: { startingMoney: 0.7, wages: 1.15, injuryRate: 1.4, rivalStrength: 1.08 },
};

/** Multipliers for a difficulty; unknown/missing values fall back to Normal. */
export function difficultyMultipliers(d: Difficulty | undefined): DifficultyMultipliers {
  return DIFFICULTY[d ?? DEFAULT_DIFFICULTY] ?? DIFFICULTY[DEFAULT_DIFFICULTY];
}

// Club colours (GitHub #48). A curated palette only, so the picker can never
// produce an unreadable kit: no greens (they vanish on the pitch) and every
// primary/secondary pairing the form allows is far enough apart to read. The
// stored value is still the plain hex pair on league.clubs[player].colors.
export const PLAYER_PRIMARY_COLORS: readonly string[] = [
  '#f4d03f', // gold
  '#c0392b', // crimson
  '#2e6fd8', // royal blue
  '#e67e22', // orange
  '#8e44ad', // purple
  '#16a0b8', // teal
  '#ecf0f1', // white
  '#1a1a2e', // navy-black
];
export const PLAYER_SECONDARY_COLORS: readonly string[] = [
  '#1a1a2e', // navy-black
  '#ffffff', // white
  '#f4d03f', // gold
  '#c0392b', // crimson
  '#2e6fd8', // royal blue
  '#e67e22', // orange
];
export const DEFAULT_PLAYER_COLORS: [string, string] = ['#f4d03f', '#1a1a2e'];
/** Minimum RGB distance between a club's two colours for the picker to accept them. */
export const MIN_COLOR_PAIR_DISTANCE = 120;

function hexDistance(a: string, b: string): number {
  const p = (h: string, i: number): number => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return Math.hypot(p(a, 0) - p(b, 0), p(a, 1) - p(b, 1), p(a, 2) - p(b, 2));
}

/** True when both colours are palette members and contrast enough with each other. */
export function isValidColorPair(primary: string, secondary: string): boolean {
  return (
    PLAYER_PRIMARY_COLORS.includes(primary) &&
    PLAYER_SECONDARY_COLORS.includes(secondary) &&
    hexDistance(primary, secondary) >= MIN_COLOR_PAIR_DISTANCE
  );
}

/** True when two hex colours are far enough apart to read as different (palette not enforced). */
export function colorsContrast(a: string, b: string, min = MIN_COLOR_PAIR_DISTANCE): boolean {
  return hexDistance(a, b) >= min;
}
