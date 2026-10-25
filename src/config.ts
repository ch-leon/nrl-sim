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

/**
 * The league's rating centre and where a new game starts against it (N5, #140).
 * Rival strength is the mean overall of a club's best nine; the rivals in
 * data/league.ts are spread around MEAN, and systems/rivals.ts pulls their
 * development back toward it. The player's starting squad is generated like a
 * rival's: START_STARS stars for a hero, one first-grader per position around
 * START_FIRST_GRADE (moved by the difficulty's startRating), and depth players
 * START_DEPTH_GAP below, so on Normal the best nine starts level with the rival
 * mean (within a point) instead of thirteen above it; #148 moved it down from
 * two above so an idle club is a mid-table side in its first season.
 * The free-agent pool sits around the league too (N12): a new club's pool is
 * generated around MEAN − POOL_BELOW (a level club's first-grader, so the
 * Recruit screen is not a shop), and scouting lifts it from there
 * (systems/freeagency.ts poolTarget). Assumed (needs Leon).
 */
export const LEAGUE = {
  MEAN: 55,
  START_STARS: 1,
  START_FIRST_GRADE: 52,
  START_DEPTH_GAP: 8,
  POOL_BELOW: 3,
} as const;

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

// A squad training focus (N11): the focused stat's facility gains ×ON, the other four
// ×OFF (1.3 + 4 × 0.85 = 4.7 of Balanced's 5: close to even in total). Balanced is ×1 each.
export const TRAINING_FOCUS = {
  ON: 1.3,
  OFF: 0.85,
} as const;

// Economy tuning (BAK-188, WU-10). Weekly income/expense loop constants read by
// src/systems/economy.ts. See the ticket spec for formula derivations.
export const ECON = {
  // The Sponsor Board (N12): SPONSOR_BASE + SPONSOR_PER_REP × reputation a week,
  // at most SPONSOR_CAP, × the level step (LEVEL_MULT: 1 / 1.6 / 2.2). For its
  // $10,000 build and $100 upkeep, L1 pays back in 29 weeks at reputation 30
  // ($450 a week), 15 at 60 ($750) and 11 at 100 (the $1,000 cap, from 85). A
  // flat $3,000 a level paid back in four weeks. Assumed (needs Leon).
  SPONSOR_BASE: 150,
  SPONSOR_PER_REP: 10,
  SPONSOR_CAP: 1_000,
  REP_GRANT_PER_POINT: 40,        // × reputation, weekly base grant (#176: was 50)
  TICKET_PRICE: 21,               // $ per attendee (#176: 20 → 18; N12.3: back to 20; 25 Oct: 21, so a 7:00 half's gate matches the 9:00 soak)
  // Gates with a roof (N6, #169): attendance = min(capacity, demand), where
  // demand = (ATTEND_BASE + reputation × ATTEND_PER_REP) × form × occasion. Form
  // runs 1 ∓ FORM_SWING across the last FORM_GAMES results (all wins +25%, all
  // losses −25%); the occasion is BIG_MATCH_MULT for a top-eight opponent or
  // FINALS_MULT for a home final. A new club at reputation 30 draws 1,200 ($25,200
  // a game, about $300k a season against a $490k wage bill: a club has to earn
  // its crowd); the hill sells out from reputation 57, a top club at 97 draws
  // 3,200 (4,000 on a winning run) and fills a stand at its second level.
  // A 7:00 half scores fewer points than a 9:00 one, and the gate followed
  // (about 5% light on the 1a3b7f0 soak). The ticket is $21 so that line
  // comes back. The difficulty gate factor is still applied on top.
  ATTEND_BASE: 300,               // demand at reputation 0
  ATTEND_PER_REP: 30,             // × reputation
  FORM_GAMES: 5,
  FORM_SWING: 0.25,
  BIG_MATCH_MULT: 1.2,
  FINALS_MULT: 1.5,
  /** Seats by Grandstand level; [0] is the hill with no stand built. */
  CAPACITY: [2_000, 3_500, 5_000, 6_500],
  BANKRUPTCY_WARN: 0,             // balance < 0 → warning
  FORCED_SALE_FLOOR: -100_000,    // balance < this → forced sales (#176: was −50k, so the red is a warning first)
  FORCED_SALE_MORALE_HIT: 10,     // squad-wide morale −10 per forced sale
  // The club's running costs (N12.3): staff, travel, insurance, the same for every
  // club whatever it has built, × the difficulty's `overhead`, paid every week after
  // upkeep (ledger reason 'overhead', the books' "Running costs"). About $40k a
  // season on Normal: the one cost an idle club cannot shed as its squad ages into
  // cheap juniors (docs/status/2026-10-economy.md). Assumed (needs Leon).
  OVERHEAD_WEEKLY: 1_500,
} as const;

// Board objectives, finals prize money and the sacking state (GitHub #47).
// Patience is the board's tolerance: each missed objective costs one point, a
// clean sweep earns one back, and zero means the player is sacked.
export const BOARD = {
  MAX_PATIENCE: 5,
  START_PATIENCE: 5,
  REP_PER_MET: 2,            // reputation for each objective met
  GRANT_PER_MET: 10_000,     // one-off cash grant for each objective met (#176: was 15k)
  BUILD_TARGET_EXTRA: 2,     // 'build' objective: facilities beyond the current count
  SOLVENT_FLOOR: { easy: -10_000, normal: 0, hard: 20_000 },
  LOAN_CAP: 50_000,          // most the board advances for renewals in a season (N14.3), repaid at the rollover
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
 * Wildcard cards and the end-of-season trip (#324, #325). A risky choice uses
 * INCIDENT_CHANCE; a Welfare Manager multiplies it by WELFARE_CHANCE. A bad
 * outcome's ban is BAN_WEEKS, served from the next match and not shortened by
 * the medical staff. In-match prompts are not in this cut.
 */
export const WILDCARDS = {
  INCIDENT_CHANCE: 0.25,
  WELFARE_CHANCE: 0.5,
  BAN_WEEKS: [2, 3] as const,
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
  // A club's standing prices its renewals (N6, #167): the ask is +RENEW_REP_PREMIUM at
  // reputation 100 (nothing at the baseline, 30, and below) and +RENEW_SEASON_INFLATION
  // for every season after the first, so a premier pays more to keep its stars and
  // wages creep up as the game goes on.
  RENEW_REP_PREMIUM: 0.25,
  RENEW_SEASON_INFLATION: 0.04, // #176: was 0.03
} as const;

// Difficulty (GitHub #48). Multipliers applied at the existing call sites:
// starting money (createNewGame), weekly wages (economy.weeklyWages), the
// big-hit injury chance (engine opts.injuryRate via matchday) and the rival's
// edge in the player's matches (matchday → the live sim's difficultyEdge, N12.2).
// startRating (#140) is added to the starting squad's first-grade and depth
// targets, in rating points. Normal is 1.0 / 0 everywhere so it plays exactly as
// before; old saves load as Normal. Hard (#148): the rival's edge and, since the
// economy's retune (#176, docs/status/2026-10-economy.md), three-quarters of the
// money and wages ×1.15 (half and ×1.3 went bust in the first season once gates
// had a roof); a managed club has to earn its signings and an idle one goes under.
// N12.2 retired `rivalStrength` (×1.1 Hard, ×0.92 Easy on the rival sheet's
// aggregates, which the live sim never reads: it changed nothing in a match).
// Easy pays wages ×0.9 (N12; ×0.85 banked an idle club about $150k a season).
export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export interface DifficultyMultipliers {
  startingMoney: number;
  wages: number;
  injuryRate: number;
  /**
   * Rating points the player's rival plays with on every stat of every player,
   * starters and bench, after the rating spread (N12.2; tuning reference §19,
   * `difficulty.<d>.rivalEdge` in the harness). Positive on Hard, negative on Easy.
   */
  rivalEdge: number;
  /** Rating points added to the starting squad's targets (new games only). */
  startRating: number;
  /** × ECON.OVERHEAD_WEEKLY, the club's running costs (economy.weeklyOverhead, N12.3). Assumed (needs Leon). */
  overhead: number;
  /**
   * × finals prize money and the board's cash grant (board.ts). Hard earns more
   * of both, Easy less; Normal is 1, so a result pays what it always paid.
   * Assumed (needs Leon): 0.85 / 1 / 1.2. Lower than the gate, which one idle
   * Easy season cannot spare. 0.75 put a managing Easy club behind Normal.
   */
  prize: number;
  /**
   * × gate receipts (economy.homeGate). Easy pays a little less at the gate;
   * Normal and Hard are 1, so a crowd still pays what the result, the form
   * and the occasion say. Assumed (needs Leon): 0.96 on Easy.
   */
  gate: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyMultipliers> = {
  easy: { startingMoney: 1.5, wages: 0.9, injuryRate: 0.7, rivalEdge: -2, startRating: 4, overhead: 0.8, prize: 0.85, gate: 0.96 },
  normal: { startingMoney: 1, wages: 1, injuryRate: 1, rivalEdge: 0, startRating: 0, overhead: 1, prize: 1, gate: 1 },
  hard: { startingMoney: 0.75, wages: 1.15, injuryRate: 1.4, rivalEdge: 0.5, startRating: -4, overhead: 1.2, prize: 1.2, gate: 1 },
};

/** Whole dollars after a difficulty factor. ×1 leaves an integer amount unchanged. */
export function scaledMoney(amount: number, factor: number): number {
  return Math.round(amount * factor);
}

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
