import { bus } from '../core/events';
import { getActiveSlot, saveIfChanged } from '../core/save';
import { getState, loadState, stateInstallation, type GameState } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { failedIntervalProblem, weekHeld } from '../core/time';
import { acceptLeagueEntry, type LeagueEntryRefusal, type LeagueEntrySelection } from './leagueEntry';
import { clearLiveMatch } from './liveMatchRecord';
import { commitUndo } from './undo';

export type LeagueEntryConfirmationResult =
  | { ok: true; state: GameState }
  | LeagueEntryRefusal
  | { ok: false; reason: 'held' | 'quarantine' | 'storage'; message: string };

/** Commit the detached entry candidate to the current career before publishing it. */
export function confirmLeagueEntry(selection: LeagueEntrySelection): LeagueEntryConfirmationResult {
  if (weekHeld()) {
    return { ok: false, reason: 'held', message: 'Finish the current interval before choosing a league.' };
  }
  const problem = failedIntervalProblem();
  if (problem) return { ok: false, reason: 'quarantine', message: problem };

  const source = getState();
  const installation = stateInstallation();
  const slot = getActiveSlot();
  const namespace = careerNamespace();
  const candidate = acceptLeagueEntry(source, selection);
  if (!candidate.ok) return candidate;

  if (getState() !== source || stateInstallation() !== installation || getActiveSlot() !== slot || careerNamespace() !== namespace) {
    return { ok: false, reason: 'stale', message: 'The career changed. Review your league choice again.' };
  }
  if (!saveIfChanged(candidate.state)) {
    return { ok: false, reason: 'storage', message: 'The league choice could not be saved. Your career is still waiting for your choice.' };
  }

  // Publish one installation with the previous interval's Undo and match already retired.
  commitUndo();
  clearLiveMatch(slot);
  loadState(candidate.state);
  for (const notice of candidate.notices) bus.emit('ui:notify', notice);
  return { ok: true, state: candidate.state };
}
