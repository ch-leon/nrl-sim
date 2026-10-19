// src/core/state.ts — the single serialisable GameState, its §4 types, and the
// module-singleton store. See ARCHITECTURE §4 and BAK-172. No Phaser, no class
// instances in state (must JSON round-trip).

import { bus } from './events';
import { makeRng } from '../utils/rng';
import { generatePlayer, generatePlayerAround, POSITIONS } from '../data/player';
import type { FacilityDefId } from '../data/facility';
import { BOARD, LEAGUE, STARTING_MONEY, DEFAULT_DIFFICULTY, difficultyMultipliers, type Difficulty } from '../config';

// ── §4 domain types (canonical definitions live here) ──────────────────────

export type Position =
  | 'fullback' | 'winger' | 'centre' | 'five-eighth' | 'halfback'
  | 'hooker' | 'prop' | 'second-row' | 'lock';

/** Traits are levelled special skills (BAK-208 §3); the catalogue lives in data/traits.ts. */
export type { TraitId, TraitInstance, TraitLevel } from '../data/traits';
/** @deprecated alias kept for older call sites: a trait's id. */
export type Trait = import('../data/traits').TraitId;

export interface PlayerStats {
  speed: number; strength: number; stamina: number;
  skill: number; footyIQ: number; // 1-100
}

/** Event-derived individual tallies (GitHub #46). */
export interface StatTally { games: number; tries: number; tackles: number; lineBreaks: number }

export interface Player {
  id: string; // seeded deterministic id (no crypto)
  name: string;
  age: number; // 17-36
  position: Position;
  stats: PlayerStats;
  morale: number; // 1-100
  injuryRisk: number; // 1-100
  injuredWeeks: number; // 0 = fit
  traits: import('../data/traits').TraitInstance[];
  wage: number; // per week
  contractWeeks: number; // remaining
  junior?: boolean; // Academy prospect awaiting signing (default false) — #42
  departed?: boolean; // left the club (contract expired / released): survives free-agent re-rolls — #40
  career?: StatTally; // folded from match events — #46
  seasonStats?: StatTally & { season: number }; // current season only; stale when season differs
  joinedSeason?: number; // first season at the club (drives clubLegend)
}

export interface PlacedFacility {
  id: string; // instance id
  defId: FacilityDefId; // catalog key, e.g. 'weightsRoom'
  level: 1 | 2 | 3;
  x: number; y: number; // grid origin (top-left of footprint)
}

export interface LadderRow {
  clubId: string; played: number; wins: number; draws: number; losses: number;
  pointsFor: number; pointsAgainst: number; points: number; // 2 win / 1 draw
}

export interface Fixture {
  round: number; // 1..SEASON_ROUNDS (+ finals rounds)
  homeId: string; awayId: string;
  result?: { homeScore: number; awayScore: number };
}

export interface RivalClub {
  id: string; name: string; colors: [string, string]; // hex kit colours
  /** 1-100. For rivals with a squad it is derived from it (systems/rivals.ts squadStrength). */
  strength: number;
  /** The rival's own players (#74); absent on the player's club entry and in RIVAL_CLUBS. */
  squad?: Player[];
}

export interface LeagueState {
  clubs: RivalClub[]; // 15 rivals + player club entry (populated WU-7)
  fixtures: Fixture[];
  ladder: LadderRow[];
}

// WeatherKind is canonically owned by src/sim/weather.ts (WU-6, not yet built).
// GameState.weather references it; define it here so state.ts compiles
// standalone. WU-6 will import from here or re-export to keep a single source.
// TODO(WU-6): reconcile WeatherKind ownership with src/sim/weather.ts
export type WeatherKind = 'clear' | 'rain' | 'wind';

/** Current save-format version. Bump when GameState changes and add a step to
 *  MIGRATIONS in save.ts (see the pattern comment there). */
export const SAVE_VERSION = 9;

/** One completed season. The extended fields are optional for pre-v4 entries. */
export interface SeasonRecord {
  season: number; ladderPosition: number; premiership: boolean;
  wins?: number; losses?: number; draws?: number;
  pointsFor?: number; pointsAgainst?: number;
  topScorer?: { name: string; tries: number };
}

/** A season goal set by the board (GitHub #47). `target`'s meaning depends on `kind`. */
export type ObjectiveKind = 'finals' | 'solvent' | 'beatRival' | 'build';
export interface Objective {
  id: string;
  kind: ObjectiveKind;
  text: string;
  /** finals: ladder position to reach; solvent: minimum cash; build: facility count; beatRival: unused (0). */
  target: number;
  rivalId?: string;
  status: 'pending' | 'met' | 'missed';
}

/** A drawn event card awaiting the player's choice (GitHub #75). */
export interface PendingEvent {
  id: string; // unique instance id, e.g. 'fanDay-s1w5'
  cardId: string; // key into EVENT_CARDS (data/events.ts)
  season: number; week: number; // when it was drawn
  /** Absolute week (see systems/events.ts absWeek) at which the default choice is taken. */
  expiresAt: number;
  subjectId?: string; // squad player the card is about
  subjectName?: string; // kept so text still reads if the player leaves
  /** Rival club the subject plays for, for rival-player cards (#74). */
  rivalId?: string;
  /** Signing fee quoted when the card was drawn (rival-player cards). */
  fee?: number;
  /** Extra text placeholders frozen at draw time, e.g. { rival, ovr, position }. */
  vars?: Record<string, string>;
}

/** A temporary effect left behind by a choice (GitHub #75). */
export interface ActiveModifier {
  id: string;
  cardId: string;
  label: string;
  trigger: import('../data/events').ModifierTrigger;
  weeksLeft: number;
  effects: import('../data/events').ImmediateEffect[];
  subjectId?: string;
  subjectName?: string;
}

/** Random events deck state (GitHub #75). */
export interface EventDeckState {
  rng: number; // private seeded stream, so events never reshuffle rngSeed
  pending: PendingEvent[];
  cooldowns: Record<string, number>; // cardId → absolute week it may be drawn again
  lastDrawn: number; // absolute week of the latest card (0 = never)
  modifiers: ActiveModifier[];
}

/** Set once the board sacks the player; the save is kept so it can be reviewed. */
export interface SackedInfo { season: number; reason: string }

export interface GameState {
  version: typeof SAVE_VERSION;
  clubId: 'player';
  clubName: string;
  money: number;
  reputation: number; // 1-100, drives attendance & sponsors
  week: number; // 1..WEEKS_PER_SEASON
  season: number; // starts at 1
  squad: Player[];
  facilities: PlacedFacility[];
  freeAgents: Player[];
  league: LeagueState;
  weather?: WeatherKind; // set for current round by fixtures system
  /** coachCalls: the call chips during your matches (#73); on when absent. (An old save's liveMatch flag is ignored: every match is live since BAK-207 Phase 4.) */
  settings: { muted: boolean; volume: number; tutorialDone: boolean; difficulty: Difficulty; coachCalls?: boolean };
  history: SeasonRecord[];
  boardPatience: number; // 0..BOARD.MAX_PATIENCE; zero = sacked (#47)
  objectives: Objective[]; // this season's board objectives (#47)
  sacked?: SackedInfo;
  eventDeck: EventDeckState; // random events (#75)
  /** The player's kit design (#79). Absent = the look derived from the club colours. */
  kit?: import('../art/match/kit').KitDesign;
  rngSeed: number; // advanced state of the seeded RNG
}

// ── Store (module-singleton around one GameState) ──────────────────────────

let state: GameState | null = null;

/** Throws if the game has not been initialised (prevents silent undefined). */
export function getState(): GameState {
  if (state === null) {
    throw new Error(
      'getState() called before initialisation — call createNewGame()/loadState() first',
    );
  }
  return state;
}

/**
 * Shallow-merge `patch` into state and emit 'state:changed'. Nested objects
 * (league, settings) are replaced wholesale by callers, NOT deep-merged.
 */
export function setState(patch: Partial<GameState>): void {
  const current = getState();
  state = { ...current, ...patch };
  bus.emit('state:changed', state);
}

/** Replace the whole state (used by save.ts / tests). Emits 'state:changed'. */
export function loadState(next: GameState): void {
  state = next;
  bus.emit('state:changed', state);
}

/**
 * Deterministically create a brand-new game. Squad = 20 players shaped like a
 * rival's at the league mean (#140: one star, one first-grader and one depth
 * player per position, a spare depth player), 12 free agents, empty
 * facilities/league. Persists via loadState and returns the new state.
 */
export function createNewGame(
  clubName: string,
  seed: number = Date.now() >>> 0,
  options: { difficulty?: Difficulty | undefined } = {},
): GameState {
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
  const rng = makeRng(seed);

  // The 20 starting players (#140): LEAGUE.START_STARS stars for a hero, a
  // first-grader per position around LEAGUE.START_FIRST_GRADE (plus the
  // difficulty's startRating), a depth player per position START_DEPTH_GAP
  // below, and depth spares to fill the squad. So the best nine lands a couple of
  // points above the rival mean. Shuffled through rng so the order is
  // deterministic per seed but not sorted by quality.
  const firstGrade = LEAGUE.START_FIRST_GRADE + difficultyMultipliers(difficulty).startRating;
  const depth = firstGrade - LEAGUE.START_DEPTH_GAP;
  const plan: { target?: number; position?: Position }[] = [
    ...Array.from({ length: LEAGUE.START_STARS }, () => ({})),
    ...POSITIONS.map((position) => ({ target: firstGrade, position })),
    ...POSITIONS.map((position) => ({ target: depth, position })),
  ];
  while (plan.length < 20) plan.push({ target: depth });
  const squad: Player[] = rng.shuffle(plan.slice(0, 20)).map((slot) => ({
    ...(slot.target === undefined
      ? generatePlayer(rng, { quality: 'star' })
      : generatePlayerAround(rng, slot.target, slot.position ? { position: slot.position } : {})),
    career: { games: 0, tries: 0, tackles: 0, lineBreaks: 0 },
    joinedSeason: 1,
  }));

  const freeAgents: Player[] = Array.from({ length: 12 }, () => ({
    ...generatePlayer(rng),
    career: { games: 0, tries: 0, tackles: 0, lineBreaks: 0 },
    joinedSeason: 1,
  }));

  const league: LeagueState = { clubs: [], fixtures: [], ladder: [] };

  const result: GameState = {
    version: SAVE_VERSION,
    clubId: 'player',
    clubName,
    money: Math.round(STARTING_MONEY * difficultyMultipliers(difficulty).startingMoney),
    reputation: 30,
    week: 1,
    season: 1,
    squad,
    facilities: [],
    freeAgents,
    league,
    settings: { muted: false, volume: 0.8, tutorialDone: false, difficulty },
    history: [],
    boardPatience: BOARD.START_PATIENCE,
    objectives: [],
    eventDeck: newEventDeck(seed),
    rngSeed: rng.state(),
  };

  loadState(result);
  return result;
}

/** An empty events deck. Its stream is derived from the game seed without
 *  drawing from the main RNG, so adding it changed no existing squad or league. */
export function newEventDeck(seed: number): EventDeckState {
  return { rng: (seed ^ 0x9e3779b9) >>> 0, pending: [], cooldowns: {}, lastDrawn: 0, modifiers: [] };
}

/**
 * Bump season/week counters for a new season. Actual per-system rollover
 * (ageing, contracts, fixtures) is driven by the season:ended hook registry in
 * time.ts (BAK-176), not here. This only advances counters and persists.
 */
export function resetForNewSeason(): void {
  const current = getState();
  setState({ season: current.season + 1, week: 1 });
}
