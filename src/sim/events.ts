// src/sim/events.ts — canonical import site for the match-sim contract types
// (ARCHITECTURE §6) plus a small event-builder helper. See BAK-191 (WU-6) and
// BAK-206 (Nines + richer contest/kicks). Pure TypeScript, no Phaser.
// WeatherKind's single source is ../core/state; re-exported here so all sim/UI
// code imports match types from one place.

export type { WeatherKind } from '../core/state';
import type { Position, Trait } from '../core/state';

/** Per-player stats carried on a sheet roster for outcome-tied actor picks. */
export interface RosterStats {
  speed: number;
  strength: number;
  stamina: number;
  skill: number;
  footyIQ: number;
}

/** One named player on a team sheet (commentary + playback + actor rolls). */
export interface RosterEntry {
  name: string;
  position: Position;
  /** When present, weights outcome-tied actor selection (BAK-206 phase 4). */
  stats?: RosterStats;
  /** Squad player id when built from a real Player (injury apply boundary). */
  id?: string;
  /** 1–100; used for big-hit injury rolls when present (GitHub #7). */
  injuryRisk?: number;
  /** Player traits (#43): finisher / hardMan / playmaker / injuryProne nudge the sim. */
  traits?: Trait[];
}

/** Injury rolled in-sim; matchday applies `weeks` onto GameState.squad. */
export interface MatchInjury {
  teamId: string;
  playerName: string;
  /** Present when the roster entry carried a squad id. */
  playerId?: string;
  weeks: number;
}

/** Aggregate team profile fed into simulateMatch (built from squad or rival). */
export interface TeamSheet {
  clubId: string;
  name: string;
  attack: number; // 1-100 aggregate
  defense: number; // 1-100 aggregate
  kicking: number; // 1-100 aggregate
  fitness: number; // 1-100 aggregate
  colors: [string, string];
  /** The ON_FIELD players, if known (rivals get a generated roster). */
  roster?: RosterEntry[];
}

/** Attacking / territorial kick flavour (stored on MatchEvent.detail). */
export type KickKind = 'find-touch' | 'bomb' | 'grubber' | 'chip' | '40-20';

export type MatchEventKind =
  | 'kickoff'
  | 'set-start'
  | 'run'
  | 'break'
  | 'tackle'
  | 'big-hit'
  | 'fend'
  | 'break-tackle'
  | 'error'
  | 'penalty'
  | 'kick'
  | 'try'
  | 'conversion'
  | 'penalty-goal'
  | 'field-goal'
  | 'half-time'
  | 'full-time';

export interface MatchEvent {
  t: number; // match minute 0-80
  kind: MatchEventKind;
  teamId: string; // acting team
  player?: string; // display name
  x?: number; // field position 0-100 (length)
  y?: number; // field position 0-100 (width)
  detail?: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: {
    possession: [number, number];
    tackles: [number, number];
    errors: [number, number];
    tries: [number, number];
  };
  weather: import('../core/state').WeatherKind;
  momentumTimeline: { t: number; value: number }[]; // -100 (away)..+100 (home)
  /** Big-hit injuries; empty when none. Applied by matchday, not the engine. */
  injuries: MatchInjury[];
}

/**
 * Build a MatchEvent. `t` is rounded to a whole minute for a clean, ordered log.
 * Optional display/position fields are spread from `extra` when provided.
 */
export function mkEvent(
  t: number,
  kind: MatchEventKind,
  teamId: string,
  extra?: Partial<Pick<MatchEvent, 'player' | 'x' | 'y' | 'detail'>>,
): MatchEvent {
  const ev: MatchEvent = { t: Math.round(t), kind, teamId };
  if (extra) {
    if (extra.player !== undefined) ev.player = extra.player;
    if (extra.x !== undefined) ev.x = extra.x;
    if (extra.y !== undefined) ev.y = extra.y;
    if (extra.detail !== undefined) ev.detail = extra.detail;
  }
  return ev;
}
