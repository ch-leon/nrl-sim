// One narrow load repair for #837. Before the fix, the end-of-season trip could be
// answered while a closed League season waited for next season's league. "Let them
// go" with an incident cost a point of board patience after the season review had
// frozen it, and the save then failed its own check ("league career frozen board").
// The trip's money already went to next year's books (League planning dates it
// there), so board patience is the only frozen fact it broke.
import type { GameState } from '../core/state';
import { record, type SaveRepair } from '../core/saveValidation';
import { elapsedInterval } from '../core/season';

/** The trip card and the flag its incident sets (ids in data/events.ts). */
const TRIP = 'baliTrip';
const INCIDENT = 'baliIncident';

export const TRIP_REPAIR_NOTICE = 'Season review updated for the end-of-season trip. The original save has been kept in recovery.';

/**
 * The closed season's review takes the patience the club really has, when every
 * sign of that trip is there: the career waits at the league choice, the trip
 * was offered at this close (its cooldown runs past it) and answered, its
 * incident flag is set, and live patience is exactly one below the review's.
 * Anything else returns null. The caller keeps the repair only if the repaired
 * career then passes every League check, so nothing else is loosened.
 */
export function repairClosedSeasonTrip(state: GameState): { state: GameState; repair: SaveRepair } | null {
  if (state.competitions?.leagueCareer?.phase !== 'next-season-choice') return null;
  const deck = state.eventDeck;
  if (!record(deck) || !Array.isArray(deck.pending) || !Array.isArray(deck.flags) || !record(deck.cooldowns)) return null;
  const offered = deck.cooldowns[TRIP];
  if (typeof offered !== 'number' || offered <= elapsedInterval(state)) return null;
  if (deck.pending.some((p) => p?.cardId === TRIP) || !deck.flags.includes(INCIDENT)) return null;
  if (!Array.isArray(state.history) || state.history.length === 0) return null;
  const last = state.history[state.history.length - 1]!;
  const board = last?.review?.board;
  if (!record(last) || !record(last.review) || !record(board) || last.season !== state.season || typeof board.patience !== 'number') return null;
  if (typeof state.boardPatience !== 'number' || state.boardPatience !== board.patience - 1) return null;
  const review = { ...last.review!, board: { ...board, patience: state.boardPatience } };
  return {
    state: { ...state, history: state.history.map((h) => (h === last ? { ...h, review } : h)) },
    repair: {
      field: `history.${state.history.length - 1}.review.board.patience`,
      problem: 'The end-of-season trip changed board patience after the season review was frozen.',
      repair: 'recordTripPatience',
      rationale: 'The trip happened; the closed review now records the patience the club has.',
      notification: TRIP_REPAIR_NOTICE,
    },
  };
}
