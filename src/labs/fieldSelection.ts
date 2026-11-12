// The physical field is frozen at boot, so Apply saves progress and restarts only
// between matches. Keep this action DOM-free, like the playtest career switches.
import { saveIfChanged } from '../core/save';
import { getState } from '../core/state';
import { FIELD_LENGTH } from '../match/core/field';
import { currentProbe, resetAll, transitionRefusal, type MatchProbe, type SwitchResult } from './devCareer';
import { isFieldLength, type FieldLength } from './fieldLength';
import { setFieldLengthPreference, testCareer } from './flags';

export interface FieldSelectionDeps {
  probe: MatchProbe;
  save: () => boolean;
  persist: (length: FieldLength) => boolean;
  reload: () => void;
}
const pageDeps = (): FieldSelectionDeps => ({
  probe: currentProbe(),
  save: () => saveIfChanged(getState()),
  persist: setFieldLengthPreference,
  reload: () => location.reload(),
});

/** Recheck the live guard when Apply is clicked, not just when the sheet opens. */
export function applyFieldLength(length: unknown, deps: FieldSelectionDeps = pageDeps()): SwitchResult {
  if (!isFieldLength(length)) return { ok: false, why: 'Choose a 100m, 80m or 60m field.' };
  const wait = transitionRefusal(deps.probe);
  if (wait) return { ok: false, why: wait };
  if (!deps.save()) return { ok: false, why: "Your career's latest change didn't save, so the field wasn't changed." };
  if (!deps.persist(length)) return { ok: false, why: "The field choice couldn't be saved on this browser, so the field wasn't changed." };
  deps.reload();
  return { ok: true };
}

export interface FieldResetDeps extends FieldSelectionDeps {
  activeLength: number;
  inTest: boolean;
  reset: () => SwitchResult;
}
const resetPageDeps = (): FieldResetDeps => ({
  ...pageDeps(), activeLength: FIELD_LENGTH, inTest: testCareer() !== null, reset: () => resetAll(),
});

/** A short field must return to the default before Reset all refreshes the page. */
export function resetFieldSelection(deps: FieldResetDeps = resetPageDeps()): SwitchResult {
  if (deps.activeLength === 100) return deps.reset();
  const wait = transitionRefusal(deps.probe);
  if (wait) return { ok: false, why: wait };
  if (!deps.save()) return { ok: false, why: "Your career's latest change didn't save, so nothing was reset." };
  if (!deps.persist(100)) return { ok: false, why: "The default field couldn't be saved on this browser, so nothing was reset." };
  const result = deps.reset();
  if (!result.ok) return result;
  // Leaving the playtest career already reloads through its existing reset flow.
  if (!deps.inTest) deps.reload();
  return { ok: true };
}
