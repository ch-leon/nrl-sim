import { bus } from '../core/events';
import { getActiveSlot, pendingLeagueSaveProblem, saveIfChanged } from '../core/save';
import { getState, loadState, stateInstallation, type GameState } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { failedIntervalProblem, leagueIntervalInProgress, weekHeld } from '../core/time';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import {
  chooseOpenCupEntry,
  previewOpenCupEntry,
  type OpenCupEntryPreview,
  type OpenCupEntryRefusal,
  requestOpenCupWithdrawal,
  type OpenCupChoice,
  type OpenCupEntryResult,
  type OpenCupWithdrawal
} from './openCupEntry';

export type OpenCupEntryConfirmationResult = OpenCupEntryResult | { ok: false; reason: 'held' | 'quarantine' | 'storage'; message: string };

// A public preview belongs to this exact installation, destination and live
// state object. The pure selection key separately verifies the saved terms.
const previewSource = Symbol('Open Cup preview source');
interface PreviewOwner {
  readonly [previewSource]: GameState;
  readonly epoch: number;
  readonly slot: number;
  readonly namespace: string | null;
}
interface OwnedSelection {
  owner: PreviewOwner;
}

export function captureOpenCupEntryPreview(): { ok: true; preview: OpenCupEntryPreview & OwnedSelection } | OpenCupEntryRefusal {
  const source = getState();
  const owner = { [previewSource]: source, epoch: stateInstallation(), slot: getActiveSlot(), namespace: careerNamespace() };
  const result = previewOpenCupEntry(source);
  return result.ok ? { ok: true, preview: { ...result.preview, owner } } : result;
}

function confirm(owner: PreviewOwner, prepare: (source: GameState) => OpenCupEntryResult, notice: string): OpenCupEntryConfirmationResult {
  if (leagueIntervalInProgress() || weekHeld())
    return { ok: false, reason: 'held', message: 'Finish this interval before changing cup entry.' };
  const quarantine = failedIntervalProblem();
  if (quarantine) return { ok: false, reason: 'quarantine', message: quarantine };
  const pending = pendingLeagueSaveProblem();
  if (pending) return { ok: false, reason: 'storage', message: pending };
  const source = getState();
  const current = () =>
    owner?.[previewSource] === getState() &&
    owner.epoch === stateInstallation() &&
    owner.slot === getActiveSlot() &&
    owner.namespace === careerNamespace();
  const stale = { ok: false, reason: 'stale', message: 'The career changed. Review the Open Cup again.' } as const;
  if (!current()) return stale;
  const candidate = prepare(source);
  if (!candidate.ok) return candidate;
  const problem = leagueCareerStateProblem(candidate.state);
  if (problem) return { ok: false, reason: 'invalid', message: problem.message };
  if (!current()) return stale;
  if (!saveIfChanged(candidate.state, true)) return { ok: false, reason: 'storage', message: 'The Open Cup decision could not be saved.' };
  if (!current()) return stale;
  loadState(candidate.state);
  if (getState() === candidate.state) bus.emit('ui:notify', { kind: 'info', text: notice });
  return candidate;
}

export function confirmOpenCupChoice(selection: OpenCupChoice & OwnedSelection): OpenCupEntryConfirmationResult {
  return confirm(
    selection.owner,
    s => chooseOpenCupEntry(s, selection),
    selection.choice === 'enter' ? 'Open Cup entry saved.' : 'Open Cup declined.'
  );
}

export function confirmOpenCupWithdrawal(selection: OpenCupWithdrawal & OwnedSelection): OpenCupEntryConfirmationResult {
  return confirm(
    selection.owner,
    s => requestOpenCupWithdrawal(s, selection),
    'Withdrawal saved. Your next Open Cup tie will be forfeited on its scheduled date.'
  );
}
