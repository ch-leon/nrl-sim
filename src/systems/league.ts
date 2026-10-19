// src/systems/league.ts — season-rollover league dynamics: the strength band,
// the rival movers summary and reputation movement from the player's results.
// Pure TypeScript, no Phaser, no store access: fixtures.ts' season hook owns the
// wiring and the notification. Rival strength itself now follows each rival's
// squad (systems/rivals.ts, #74) instead of a random walk.

import type { Fixture, GameState, Player, Position, RivalClub, WeatherKind } from '../core/state';
import { overallRating } from '../data/player';
import { ON_FIELD, SEASON_ROUNDS } from '../config';

// ── Rival strength band ──────────────────────────────────────────────────────

/** Hard bounds on a rival's strength (rivals derive it from their squads, #74). */
export const STRENGTH_MIN = 30;
export const STRENGTH_MAX = 90;

export interface StrengthChange {
  clubId: string;
  name: string;
  from: number;
  to: number;
}

/** Clubs whose strength changed, biggest movers first (for the summary toast). */
export function strengthChanges(
  before: readonly RivalClub[],
  after: readonly RivalClub[],
): StrengthChange[] {
  const old = new Map(before.map((c) => [c.id, c.strength] as const));
  return after
    .filter((c) => old.has(c.id) && old.get(c.id) !== c.strength)
    .map((c) => ({ clubId: c.id, name: c.name, from: old.get(c.id) as number, to: c.strength }))
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
}

// ── Reputation tuning ────────────────────────────────────────────────────────

export const REP_MIN = 1;
export const REP_MAX = 100;
/** Baseline reputation decays toward. */
export const REP_BASELINE = 30;
/** Fraction of the gap to the baseline lost each season. */
export const REP_DECAY = 0.1;
/** Reputation per finals win before the grand final. */
export const REP_FINALS_WIN = 1;
/** Reputation for losing a grand final (the winner gets the premiership bonus). */
export const REP_GRAND_FINAL_LOSS = 3;

/**
 * Reputation change for a regular-season ladder finish out of `clubCount`:
 * top 4 rise (+4..+1), bottom 4 fall (−1..−4), the middle is flat.
 */
export function ladderFinishDelta(position: number, clubCount: number): number {
  if (position < 1 || clubCount < 8) return 0;
  if (position <= 4) return 5 - position;
  if (position > clubCount - 4) return -(position - (clubCount - 4));
  return 0;
}

export interface SeasonResults {
  /** Player's regular-season ladder position (1-based; 0 = unknown). */
  ladderPosition: number;
  clubCount: number;
  /** Finals won before the grand final (QF/SF). */
  finalsWins: number;
  playedGrandFinal: boolean;
  /** Reputation already granted elsewhere (premiership bonus) — not re-applied. */
  premiership: boolean;
}

export interface ReputationUpdate {
  reputation: number;
  /** Net change vs. the reputation passed in. */
  delta: number;
  /** Net of ladder + finals (before decay), for the summary. */
  resultsDelta: number;
  decay: number;
}

/**
 * Move reputation by the season's results, then decay toward REP_BASELINE, and
 * clamp to [REP_MIN, REP_MAX]. `current` should already include any premiership
 * bonus; a premiership is not credited a second time here.
 */
export function applySeasonReputation(current: number, r: SeasonResults): ReputationUpdate {
  let resultsDelta = ladderFinishDelta(r.ladderPosition, r.clubCount);
  resultsDelta += r.finalsWins * REP_FINALS_WIN;
  if (r.playedGrandFinal && !r.premiership) resultsDelta += REP_GRAND_FINAL_LOSS;

  const moved = Math.min(REP_MAX, Math.max(REP_MIN, current + resultsDelta));
  const decay = Math.round((REP_BASELINE - moved) * REP_DECAY);
  const reputation = Math.min(REP_MAX, Math.max(REP_MIN, moved + decay));
  return { reputation, delta: reputation - current, resultsDelta, decay };
}

// ── Form and the next match (N7, GitHub #183) ────────────────────────────────
//
// Pure view-models for the Fixtures tab's next-match card and the Ladder's form
// column (src/ui/screens/fixtures.ts). Everything is read off the fixtures the
// season has stamped so far; nothing here touches the store or the RNG.

export type FormResult = 'W' | 'D' | 'L';

/** One of a club's played fixtures, from that club's side. */
export interface ClubResult {
  round: number;
  opponentId: string;
  home: boolean;
  pointsFor: number;
  pointsAgainst: number;
  result: FormResult;
}

/** A club's played fixtures this season (finals included), oldest first. */
export function clubResults(fixtures: readonly Fixture[], clubId: string): ClubResult[] {
  const out: ClubResult[] = [];
  for (const f of fixtures) {
    if (!f.result) continue;
    const home = f.homeId === clubId;
    if (!home && f.awayId !== clubId) continue;
    const pointsFor = home ? f.result.homeScore : f.result.awayScore;
    const pointsAgainst = home ? f.result.awayScore : f.result.homeScore;
    out.push({
      round: f.round,
      opponentId: home ? f.awayId : f.homeId,
      home,
      pointsFor,
      pointsAgainst,
      result: pointsFor > pointsAgainst ? 'W' : pointsFor < pointsAgainst ? 'L' : 'D',
    });
  }
  return out.sort((a, b) => a.round - b.round);
}

/** How many results the form guide shows. */
export const FORM_LENGTH = 5;

/** The club's last `n` results, oldest first (fewer early in the season). */
export function formGuide(fixtures: readonly Fixture[], clubId: string, n: number = FORM_LENGTH): FormResult[] {
  return clubResults(fixtures, clubId).slice(-n).map((r) => r.result);
}

/** The club's first unplayed fixture from `week` on, if it has one. */
export function nextFixture(fixtures: readonly Fixture[], week: number, clubId: string): Fixture | undefined {
  return fixtures
    .filter((f) => !f.result && f.round >= week && (f.homeId === clubId || f.awayId === clubId))
    .sort((a, b) => a.round - b.round)[0];
}

/** What a round is called on the card. */
export type MatchStage = 'Round' | 'Quarter final' | 'Semi final' | 'Grand final';

export function matchStage(round: number): MatchStage {
  if (round <= SEASON_ROUNDS) return 'Round';
  const finals: MatchStage[] = ['Quarter final', 'Semi final', 'Grand final'];
  return finals[Math.min(finals.length, round - SEASON_ROUNDS) - 1] as MatchStage;
}

/** Mean overall of a squad's best ON_FIELD players (0 for no squad); what a rival's strength is. */
export function bestNineMean(squad: readonly Player[]): number {
  if (squad.length === 0) return 0;
  const best = squad.map(overallRating).sort((a, b) => b - a).slice(0, ON_FIELD);
  return Math.round(best.reduce((t, n) => t + n, 0) / best.length);
}

export interface PreviewSide {
  id: string;
  name: string;
  colors: [string, string];
  strength: number;
  /** 1-based ladder position, 0 before the ladder exists. */
  ladderPos: number;
  form: FormResult[];
}

export interface PreviewPlayer {
  id: string;
  name: string;
  position: Position;
  overall: number;
}

export interface NextMatchPreview {
  round: number;
  stage: MatchStage;
  /** The player's club is at home. */
  home: boolean;
  opponent: PreviewSide;
  you: PreviewSide;
  /** The opponent's best three fit players (from its squad; empty without one). */
  bestThree: PreviewPlayer[];
  /** This season's meetings so far, from the player's side, oldest first. */
  headToHead: ClubResult[];
  /** Match-day conditions when known (the fixtures system rolls them on the day). */
  weather?: WeatherKind;
}

/**
 * The card for the player's next match, or null when there is none left this
 * season (out of the finals, or the season is over). Pure: pass `weather` only
 * when it is this match's.
 */
export function nextMatchPreview(
  state: Pick<GameState, 'league' | 'week' | 'squad'>,
  opts: { clubId?: string; weather?: WeatherKind } = {},
): NextMatchPreview | null {
  const clubId = opts.clubId ?? 'player';
  const f = nextFixture(state.league.fixtures, state.week, clubId);
  if (!f) return null;
  const home = f.homeId === clubId;
  const oppId = home ? f.awayId : f.homeId;
  const opp = state.league.clubs.find((c) => c.id === oppId);
  const me = state.league.clubs.find((c) => c.id === clubId);
  if (!opp || !me) return null;
  const pos = (id: string): number => {
    const i = state.league.ladder.findIndex((r) => r.clubId === id);
    return i < 0 ? 0 : i + 1;
  };
  const side = (c: typeof opp, strength: number): PreviewSide => ({
    id: c.id, name: c.name, colors: c.colors, strength, ladderPos: pos(c.id), form: formGuide(state.league.fixtures, c.id),
  });
  const bestThree = (opp.squad ?? [])
    .filter((p) => p.injuredWeeks === 0)
    .map((p) => ({ id: p.id, name: p.name, position: p.position, overall: overallRating(p) }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))
    .slice(0, 3);
  return {
    round: f.round,
    stage: matchStage(f.round),
    home,
    opponent: side(opp, opp.strength),
    you: side(me, bestNineMean(state.squad)),
    bestThree,
    headToHead: clubResults(state.league.fixtures, clubId).filter((r) => r.opponentId === oppId),
    ...(opts.weather ? { weather: opts.weather } : {}),
  };
}
