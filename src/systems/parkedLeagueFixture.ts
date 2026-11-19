import { dueIndividualChallenge } from './individualChallenges';
import type { GameState } from '../core/state';
import { leagueIntervalInProgress } from '../core/time';
import { getCurrentFixture } from './fixtures';
import { belongsToFixture, readLiveMatch } from './liveMatchRecord';

/** A recoverable match in this slot still owns its original inputs before the clock rebuilds the hold. */
export function parkedLeagueFixture(state: GameState): boolean {
  if (state.competitions?.leagueCareer?.phase !== 'active') return false;
  const record = readLiveMatch();
  if (!record || record.season !== state.season || record.week !== state.week) return false;
  const fixture = getCurrentFixture(state, state.clubId);
  return !!fixture && !fixture.result && belongsToFixture(record, state, fixture);
}

/** A due decision has not started its club interval, so a parked club match cannot own it. */
export function inconsistentChallengeReplay(state: GameState, record: {season:number;week:number} | null): boolean {
  if (!record || record.season!==state.season || record.week!==state.week) return false;
  const due = dueIndividualChallenge(state);
  return due?.status==='booked' || due?.status==='coaching';
}
export const CHALLENGE_REPLAY_PROBLEM = 'This club match was saved before the required contest decision. The original career and match have been kept.';

/** A verified checkpoint may be replayed. Only its interval owner may change it once a club match is parked. */
export function awaitingCampReplay(state: GameState): boolean {
  if (leagueIntervalInProgress()) return false;
  const tracked = state.competitions?.assignments?.some(r=>r.season===state.season && r.clubId===state.clubId && r.status==='booked')
    || state.competitions?.individualChallenges?.some(r=>r.season===state.season && r.clubId===state.clubId && ['booked','coaching','ready-for-interval'].includes(r.status));
  return !!tracked && parkedLeagueFixture(state);
}
