// src/sim/events.ts — canonical import site for the match-sim contract types
// (ARCHITECTURE §6) plus a small event-builder helper. See BAK-191 (WU-6).
// Pure TypeScript, no Phaser. WeatherKind's single source is ../core/state;
// re-exported here so all sim/UI code imports match types from one place.

export type { WeatherKind } from '../core/state';

/** Aggregate team profile fed into simulateMatch (built from squad or rival). */
export interface TeamSheet {
  clubId: string;
  name: string;
  attack: number; // 1-100 aggregate
  defense: number; // 1-100 aggregate
  kicking: number; // 1-100 aggregate
  fitness: number; // 1-100 aggregate
  colors: [string, string];
}

export type MatchEventKind =
  | 'kickoff'
  | 'set-start'
  | 'run'
  | 'break'
  | 'tackle'
  | 'big-hit'
  | 'error'
  | 'penalty'
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
