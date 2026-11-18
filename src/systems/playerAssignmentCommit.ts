import { bus } from '../core/events';
import { getActiveSlot, pendingLeagueSaveProblem, saveIfChanged } from '../core/save';
import { getState, loadState, stateInstallation, type GameState } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { failedIntervalProblem, leagueIntervalInProgress, weekHeld } from '../core/time';
import { parkedLeagueFixture } from './parkedLeagueFixture';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import {
  changeCampBooking,
  currentSkillsCamp,
  type CampAction,
  type CampRefusal,
  type CampResult
} from './playerAssignments';

interface CampSelection {
  readonly offerId: string;
  readonly revision: number;
  readonly action: Readonly<CampAction>;
}
interface Owner {
  state: GameState;
  installation: number;
  slot: number;
  namespace: string | null;
}
const selections = new WeakMap<CampSelection, Owner>();
export function rosterIntervalProblem(state: GameState): string | null {
  if (weekHeld() || leagueIntervalInProgress() || parkedLeagueFixture(state)) return 'Finish the current interval before changing the squad.';
  return failedIntervalProblem() ?? pendingLeagueSaveProblem();
}
function blocked(): CampRefusal | null {
  if (weekHeld() || leagueIntervalInProgress() || parkedLeagueFixture(getState()))
    return { ok: false, reason: 'held', message: 'Finish the current week before changing Skills Camp.' };
  const problem = failedIntervalProblem() ?? pendingLeagueSaveProblem();
  if (problem) return { ok: false, reason: 'storage', message: problem };
  if (careerNamespace() !== null)
    return { ok: false, reason: 'unsupported', message: 'Skills Camp requires a normal League career.' };
  return null;
}
export function captureCampAction(action: CampAction): { ok: true; selection: CampSelection } | CampRefusal {
  const problem = blocked();
  if (problem) return problem;
  const state = getState();
  const r = currentSkillsCamp(state);
  if (!r) return { ok: false, reason: 'closed', message: 'There is no Skills Camp open for this club.' };
  const checked = changeCampBooking(state, r.id, r.revision, action);
  if (!checked.ok) return checked;
  const selection = Object.freeze({ offerId: r.id, revision: r.revision, action: Object.freeze({ ...action }) });
  selections.set(selection, {
    state,
    installation: stateInstallation(),
    slot: getActiveSlot(),
    namespace: careerNamespace()
  });
  return { ok: true, selection };
}
export function confirmCampAction(selection: CampSelection): CampResult {
  const owner = selections.get(selection);
  const current = () =>
    !!owner &&
    owner.state === getState() &&
    owner.installation === stateInstallation() &&
    owner.slot === getActiveSlot() &&
    owner.namespace === careerNamespace();
  if (!current())
    return { ok: false, reason: 'stale', message: 'The career changed. Review the Skills Camp booking again.' };
  const problem = blocked();
  if (problem) return problem;
  const candidate = changeCampBooking(getState(), selection.offerId, selection.revision, selection.action);
  if (!candidate.ok) return candidate;
  const invalid = leagueCareerStateProblem(candidate.state);
  if (invalid) return { ok: false, reason: invalid.reason, message: invalid.message };
  if (!current() || !saveIfChanged(candidate.state, true) || !current())
    return { ok: false, reason: 'storage', message: 'The Skills Camp change could not be saved. Review it again.' };
  loadState(candidate.state);
  if (getState() === candidate.state)
    bus.emit('ui:notify', {
      kind: 'info',
      text: selection.action.kind === 'cancel' ? 'Skills Camp booking cancelled.' : 'Skills Camp booking saved.'
    });
  return candidate;
}
