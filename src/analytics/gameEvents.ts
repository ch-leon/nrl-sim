// src/analytics/gameEvents.ts — the career's events for analytics (#450). Reads only.
//
// Listens to the bus and reads the state; never writes either, never touches the
// save, the match sim or its RNG. A match finished is seen in the league's fixtures
// rather than at 'match:finished', so every way the player's match is settled counts
// once: watched live, fast-forwarded in the Worker or headless, or forfeited.

import { bus } from '../core/events';
import type { Fixture, GameState } from '../core/state';
import { PLAYER_ID } from '../systems/fixtures';
import type { MatchOutcome } from './events';
import { track } from './index';

/** Pure: the player's result in a played fixture, or null when it isn't theirs or isn't played. */
export function playerOutcome(f: Fixture): MatchOutcome | null {
  if (!f.result || (f.homeId !== PLAYER_ID && f.awayId !== PLAYER_ID)) return null;
  const [us, them] = f.homeId === PLAYER_ID ? [f.result.homeScore, f.result.awayScore] : [f.result.awayScore, f.result.homeScore];
  return us > them ? 'win' : us < them ? 'loss' : 'draw';
}

const fixtureId = (f: Fixture): string => `${f.round}:${f.homeId}:${f.awayId}`;

/**
 * Pure: the player's results that are new in `next`: fixtures that were in `prev`
 * unplayed and are played now. A fixture list rebuilt for a new season, or copied,
 * adds nothing; only a match going from unplayed to played does.
 */
export function newResults(prev: readonly Fixture[], next: readonly Fixture[]): { round: number; result: MatchOutcome }[] {
  const before = new Map(prev.map((f) => [fixtureId(f), f.result !== undefined]));
  const out: { round: number; result: MatchOutcome }[] = [];
  for (const f of next) {
    const result = playerOutcome(f);
    if (result && before.get(fixtureId(f)) === false) out.push({ round: f.round, result });
  }
  return out;
}

/**
 * Wire the career's events, once the career is loaded: `fresh` sends career_started.
 * Matches already played when the career loads are not sent. Returns unsubscribe.
 */
export function initGameAnalytics(start: GameState, fresh: boolean): () => void {
  if (fresh) track('career_started', { difficulty: start.settings.difficulty });
  let fixtures = start.league.fixtures;
  const offState = bus.on('state:changed', (s) => {
    if (s.league.fixtures === fixtures) return;
    const prev = fixtures;
    fixtures = s.league.fixtures;
    // The player plays one match at a time, each landing on its own; more at once is
    // a whole save swapped in (Settings' import), not matches played.
    const added = newResults(prev, fixtures);
    if (added.length !== 1) return;
    const { round, result } = added[0]!;
    track('match_finished', { result, difficulty: s.settings.difficulty }, `${s.season}:${round}`);
  });
  const offSeason = bus.on('season:ended', ({ season }) => track('season_finished', {}, String(season)));
  return () => {
    offState();
    offSeason();
  };
}
