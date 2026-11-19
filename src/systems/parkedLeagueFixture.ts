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

/** Only the original, as-yet unreplayed camp checkpoint is read-only. Once the clock owns it, live edits keep their usual semantics. */
export function awaitingCampReplay(state: GameState): boolean {
  return (
    !!state.competitions?.assignments?.some(
      (r) => r.season === state.season && r.clubId === state.clubId && r.status === 'booked'
    ) &&
    !leagueIntervalInProgress() &&
    parkedLeagueFixture(state)
  );
}
