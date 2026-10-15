// src/core/state.ts — the single serialisable GameState, its §4 types, and the
// module-singleton store. See ARCHITECTURE §4 and BAK-172. No Phaser, no class
// instances in state (must JSON round-trip).

import { bus } from './events';
import { makeRng } from '../utils/rng';
import { generatePlayer, type Quality } from '../data/player';
import type { FacilityDefId } from '../data/facility';
import { STARTING_MONEY } from '../config';

// ── §4 domain types (canonical definitions live here) ──────────────────────

export type Position =
  | 'fullback' | 'winger' | 'centre' | 'five-eighth' | 'halfback'
  | 'hooker' | 'prop' | 'second-row' | 'lock';

export type Trait =
  | 'workhorse' | 'finisher' | 'hardMan' | 'playmaker'
  | 'injuryProne' | 'clubLegend' | 'youngGun' | 'veteran';

export interface PlayerStats {
  speed: number; strength: number; stamina: number;
  skill: number; footyIQ: number; // 1-100
}

export interface Player {
  id: string; // seeded deterministic id (no crypto)
  name: string;
  age: number; // 17-36
  position: Position;
  stats: PlayerStats;
  morale: number; // 1-100
  injuryRisk: number; // 1-100
  injuredWeeks: number; // 0 = fit
  traits: Trait[];
  wage: number; // per week
  contractWeeks: number; // remaining
  junior?: boolean; // Academy prospect awaiting signing (default false) — #42
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
  strength: number; // 1-100 baseline used to derive rival squads
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
export const SAVE_VERSION = 2;

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
  settings: { muted: boolean; volume: number; tutorialDone: boolean };
  history: { season: number; ladderPosition: number; premiership: boolean }[];
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
 * Deterministically create a brand-new game. Squad = 20 players (~3 star, ~10
 * average, ~7 rookie), 12 free agents, empty facilities/league. Persists via
 * loadState and returns the new state.
 */
export function createNewGame(clubName: string, seed: number = Date.now() >>> 0): GameState {
  const rng = makeRng(seed);

  // Quality mix for the 20 starting players: 3 star, 10 average, 7 rookie.
  // Rolled/shuffled through rng so ordering is deterministic per seed.
  const qualities: Quality[] = [
    ...Array<Quality>(3).fill('star'),
    ...Array<Quality>(10).fill('average'),
    ...Array<Quality>(7).fill('rookie'),
  ];
  const squadQualities = rng.shuffle(qualities);
  const squad: Player[] = squadQualities.map((quality) => generatePlayer(rng, { quality }));

  const freeAgents: Player[] = Array.from({ length: 12 }, () => generatePlayer(rng));

  const league: LeagueState = { clubs: [], fixtures: [], ladder: [] };

  const result: GameState = {
    version: SAVE_VERSION,
    clubId: 'player',
    clubName,
    money: STARTING_MONEY,
    reputation: 30,
    week: 1,
    season: 1,
    squad,
    facilities: [],
    freeAgents,
    league,
    settings: { muted: false, volume: 0.8, tutorialDone: false },
    history: [],
    rngSeed: rng.state(),
  };

  loadState(result);
  return result;
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
