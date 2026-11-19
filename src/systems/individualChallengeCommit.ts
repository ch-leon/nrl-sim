// Commands run at ordinary saved club boundaries. Local acceptance installs the
// choice; native acknowledgement controls presentation and the following command.
import { exportOriginalSave, getActiveSlot, pendingLeagueSaveProblem, saveIfChanged, slotKey } from '../core/save';
import { getState, loadState, stateInstallation, type GameState } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { acknowledgeNativeCheckpoint, nativeCheckpointRequired } from '../core/storage/nativeCheckpoint';
import { failedIntervalProblem, leagueIntervalInProgress, weekHeld } from '../core/time';
import type { ChallengeEditionId } from '../data/individualChallengeRules';
import { challengeEngines } from '../data/individualChallenges';
import { challengeActionProblem, challengeCover, changeChallenge, currentIndividualChallenge, dueIndividualChallenge,
  refuseChallenge, type ChallengeAction, type ChallengeRefusal, type ChallengeResult } from './individualChallenges';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import { parkedLeagueFixture } from './parkedLeagueFixture';

interface Owner { state:GameState; installation:number; slot:number; namespace:string|null }
const owner = (): Owner => ({state:getState(),installation:stateInstallation(),slot:getActiveSlot(),namespace:careerNamespace()});
const current = (o:Owner) => o.state===getState() && o.installation===stateInstallation() && o.slot===getActiveSlot() && o.namespace===careerNamespace();
const stale = () => refuseChallenge('stale','The career changed. Review the current contest checkpoint.');
export interface ChallengeSelection { readonly editionId: ChallengeEditionId; readonly revision:number; readonly action:Readonly<ChallengeAction> }
const owners = new WeakMap<ChallengeSelection,Owner>();
let revealed: {installation:number;slot:number;namespace:string|null;id:string;revision:number} | null = null;

export function challengeOutcomeVisible(state:GameState, editionId:ChallengeEditionId):boolean {
  const r = currentIndividualChallenge(state,editionId);
  if (!r?.contest?.clashes.length || !['coaching','ready-for-interval'].includes(r.status)) return true;
  if (!nativeCheckpointRequired()) return true;
  return state===getState() && revealed?.installation===stateInstallation() && revealed.slot===getActiveSlot()
    && revealed.namespace===careerNamespace() && revealed.id===r.id && revealed.revision===r.revision;
}
function blocked(editionId:ChallengeEditionId):ChallengeRefusal|null {
  const state = getState();
  if (weekHeld() || leagueIntervalInProgress() || parkedLeagueFixture(state)) return refuseChallenge('held','Resume and finish the club match before changing the contest.');
  const storage = failedIntervalProblem() ?? pendingLeagueSaveProblem();
  if (storage) return refuseChallenge('storage',storage);
  if (careerNamespace()!==null) return refuseChallenge('unsupported','This contest requires a normal League career.');
  if (!challengeOutcomeVisible(state,editionId)) return refuseChallenge('native','Confirm the saved contest checkpoint before continuing.');
  return null;
}

export function captureChallengeAction(editionId: ChallengeEditionId, action:ChallengeAction):{ok:true;selection:ChallengeSelection}|ChallengeRefusal {
  const context = owner();
  const problem = blocked(editionId) ?? challengeActionProblem(context.state,editionId,action);
  if (problem) return problem;
  if (!current(context)) return stale();
  const revision = currentIndividualChallenge(context.state,editionId)?.revision ?? 0;
  const selection = Object.freeze({editionId,revision,action:Object.freeze({...action})});
  owners.set(selection,context);
  return {ok:true,selection};
}

/** A reload, failure or timeout retries only the latest locally committed bytes. */
export async function acknowledgeChallengeOutcome(editionId: ChallengeEditionId):Promise<ChallengeResult> {
  const o = owner();
  const r = currentIndividualChallenge(o.state,editionId);
  if (!r?.contest) return refuseChallenge('closed','There is no contest checkpoint to confirm.');
  if (challengeOutcomeVisible(o.state,editionId)) return {ok:true,state:o.state};
  if (o.namespace!==null || weekHeld() || leagueIntervalInProgress()) return refuseChallenge('held','The club interval owns this checkpoint.');
  try {
    let payload = exportOriginalSave(o.slot);
    const expected = JSON.stringify(o.state);
    if (payload!==expected) {
      // Management edits are allowed between choices. Bring those bytes to the
      // same verified boundary before repairing the native copy.
      if (!current(o) || !saveIfChanged(o.state,true)) return refuseChallenge('storage','The current contest checkpoint could not be verified.');
      payload = exportOriginalSave(o.slot);
    }
    if (!current(o) || payload!==expected) return stale();
    const ack = await acknowledgeNativeCheckpoint(slotKey(o.slot),payload);
    if (!current(o) || exportOriginalSave(o.slot)!==payload) return stale();
    if (ack!=='confirmed' && ack!=='inactive') return refuseChallenge('native','The contest choice is saved locally. Retry device confirmation or leave and export the career.');
    revealed = {installation:o.installation,slot:o.slot,namespace:o.namespace,id:r.id,revision:r.revision};
    return {ok:true,state:o.state};
  } catch {
    return refuseChallenge('storage','The saved checkpoint could not be read. Retry device confirmation.');
  }
}
export async function confirmChallengeAction(selection:ChallengeSelection):Promise<ChallengeResult> {
  const o = owners.get(selection);
  if (!o || !current(o)) return stale();
  const {editionId,revision,action} = selection;
  if ((currentIndividualChallenge(o.state,editionId)?.revision ?? 0)!==revision) return stale();
  const problem = blocked(editionId);
  if (problem) return problem;
  const candidate = changeChallenge(o.state,editionId,action);
  if (!candidate.ok) return candidate;
  const invalid = leagueCareerStateProblem(candidate.state);
  if (invalid) return refuseChallenge(invalid.reason,invalid.message);
  if (!current(o) || !saveIfChanged(candidate.state,true) || !current(o))
    return refuseChallenge('storage','The contest change could not be saved. Review the checkpoint and retry.');
  owners.delete(selection);
  loadState(candidate.state);
  if (getState()!==candidate.state || o.slot!==getActiveSlot() || o.namespace!==careerNamespace() || stateInstallation()!==o.installation+1) return stale();
  if (currentIndividualChallenge(candidate.state,editionId)?.contest?.clashes.length) return acknowledgeChallengeOutcome(editionId);
  return candidate;
}

/** Only consulted before taking ownership of an interval, never during match release/structural validation. */
export function challengeAdvanceProblem(state:GameState):string|null {
  const r = dueIndividualChallenge(state);
  if (!r) return null;
  if (r.status==='booked') return 'Start the booked contest or withdraw before advancing the club week.';
  if (!challengeOutcomeVisible(state,r.editionId)) return 'Confirm the saved contest checkpoint on this device before advancing.';
  if (r.status==='coaching') return r.contest && challengeEngines[r.contest.engineVersion]?.status==='retired'
    ? 'Resolve the interrupted contest before advancing.' : 'Resume coaching the contest before advancing the club week.';
  const projection = challengeCover(state,r.editionId,r.participantId);
  return projection.coverCount < 13 ? 'Arrange enough legal club cover before advancing the contest week.' : null;
}
