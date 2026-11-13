// Developer settings (was Labs: match controls, Leon, 30 Oct; #519). Pure models, thin sheet.
// Hidden unless ?labs=1 was opened on this browser (or a playtest career is on).
// Finding it is not security: nothing here unlocks anything paid for.
import { EXPERIMENTS } from './experiments';
import { experimentOn, CSS_PIXELS, fieldLengthPreference, OPEN_SCREENS, overrideOn, setExperiment, setOverride, testCareer } from './flags';
import { FIELD_LENGTHS, isFieldLength, type FieldLength } from './fieldLength';
import { applyFieldLength, resetFieldSelection } from './fieldSelection';
import { currentProbe, enterTestCareer, returnToNormalCareer, transitionRefusal } from './devCareer';
import { syncDevMarker } from './marker';
import { FIELD_LENGTH } from '../match/core/field';
import { button, el, openModal, closeModal } from '../ui/dom';

export const DEV_SETTINGS_TITLE = 'Developer settings';

export function labsPanelModel(on: (id: string) => boolean) {
  return EXPERIMENTS.map((e) => ({ ...e, on: on(e.id), smallPrint: 'Changes take effect at the next match.' }));
}

/** Browser-local physical field choice; applying restarts the frozen geometry. */
export function fieldSelectionModel(selected: FieldLength = 100, wait: string | null = null) {
  return {
    selected, label: 'Field length', applyLabel: 'Apply', wait,
    options: FIELD_LENGTHS.map(value => ({ value, label: value === 100 ? '100m (default)' : `${value}m` })),
    note: 'On this browser only; never saved as a career rule.',
    smallPrint: 'Apply saves your progress and reloads between matches.' + (selected === 60 ? ' 40/20 is off on a 60m field.' : ''),
  };
}

/** The override rows (#519): browser-local, never saved, and honest about what they don't undo. */
export function overridesModel(on: (id: string) => boolean) {
  return [{
    id: OPEN_SCREENS, label: 'Open every Office screen',
    note: 'Staff & Board, Contracts and Finance open now instead of at their round. On this browser only; never saved.',
    on: on(OPEN_SCREENS),
    smallPrint: 'Turning it off locks them again. Anything you hire, sign or buy meanwhile stays in your career.',
  }, {
    id: CSS_PIXELS, label: 'Render at the old resolution',
    note: 'Draws the game in CSS pixels as before #627: the match zooms back in and a phone shows fewer players. For comparing frame rate on a real phone. On this browser only; never saved.',
    on: on(CSS_PIXELS),
    smallPrint: 'Reload the page to apply it.',
  }];
}

/** The playtest career's block (#519): its button, what it does, and why it must wait (null when it needn't). */
export function playtestModel(inTest: boolean, wait: string | null) {
  return inTest
    ? { action: 'return' as const, label: 'Return to my career', wait,
        note: 'Throws the playtest career away and opens the title with your careers exactly as you left them.' }
    : { action: 'enter' as const, label: 'Set up playtest career', wait,
        note: 'A separate test career: a Direct attack coach hired, Block play bought and picked, the match at ×1. Your career is saved and put away untouched until you return.' };
}

const PANEL_CSS = `
.nrl-labs-panel { display:flex; flex-direction:column; gap:8px; max-width:560px; }
.nrl-labs-panel h2 { margin:0; }
.nrl-labs-panel h3 { margin:6px 0 0; font-size:0.95em; }
.nrl-labs-panel small { display:block; }
.nrl-labs-panel .nrl-dev-section { display:flex; flex-direction:column; gap:6px; }
.nrl-labs-panel .nrl-btn, .nrl-labs-panel .nrl-settings-toggle, .nrl-labs-panel select { min-height:44px; }
.nrl-labs-panel select { font:inherit; color:inherit; background:var(--nrl-bg, #152030); padding:6px 10px; border:1px solid currentColor; border-radius:4px; }
.nrl-labs-panel #nrl-dev-field-length {
  appearance:none; -webkit-appearance:none; height:44px; min-height:44px; min-width:44px; padding-right:30px;
  background-image:linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:calc(100% - 15px) 19px, calc(100% - 10px) 19px;
  background-size:5px 5px; background-repeat:no-repeat;
}
.nrl-labs-panel .nrl-dev-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.nrl-labs-panel .nrl-dev-row > label { display:inline-flex; align-items:center; min-height:44px; }
.nrl-labs-panel .nrl-dev-wait { color:var(--nrl-accent, #f4d03f); }
`;

function ensurePanelStyles(): void {
  if (document.getElementById('nrl-labs-styles')) return;
  const style = document.createElement('style');
  style.id = 'nrl-labs-styles';
  style.textContent = PANEL_CSS;
  document.head.append(style);
}

function toggleRow(attr: string, id: string, label: string, note: string, smallPrint: string, on: boolean, onChange: (on: boolean) => void): HTMLElement {
  const box = el('input', { attrs: { type: 'checkbox', [attr]: id } });
  box.checked = on;
  box.addEventListener('change', () => onChange(box.checked));
  return el('label', { class: 'nrl-audio-row nrl-settings-toggle' }, box,
    el('span', { class: 'nrl-settings-text' }, el('b', { text: label }), el('small', { text: note }), el('small', { text: smallPrint })));
}

function section(id: string, title: string, ...children: HTMLElement[]): HTMLElement {
  const head = el('h3', { text: title, attrs: { id } });
  return el('section', { class: 'nrl-dev-section', attrs: { 'aria-labelledby': id } }, head, ...children);
}

function fieldSelectionRow(): HTMLElement {
  const model = fieldSelectionModel(fieldLengthPreference(), transitionRefusal(currentProbe()));
  const select = el('select', { attrs: { id: 'nrl-dev-field-length', 'data-field-length': '', 'aria-describedby': 'nrl-dev-field-note nrl-dev-field-print nrl-dev-field-status' } },
    ...model.options.map(option => el('option', { text: option.label, attrs: { value: String(option.value) } })));
  select.value = String(model.selected);
  const status = el('small', { class: 'nrl-dev-wait', text: model.wait ?? '', attrs: { id: 'nrl-dev-field-status', role: 'status', 'aria-live': 'polite' } });
  const smallPrint = el('small', { text: model.smallPrint, attrs: { id: 'nrl-dev-field-print' } });
  select.addEventListener('change', () => {
    const selected = Number(select.value);
    if (isFieldLength(selected)) smallPrint.textContent = fieldSelectionModel(selected).smallPrint;
  });
  const apply = button(model.applyLabel, () => {
    const result = applyFieldLength(Number(select.value));
    if (!result.ok) status.textContent = result.why;
  }, { class: 'nrl-dev-field-apply' });
  apply.setAttribute('data-dev-action', 'apply-field');
  apply.setAttribute('aria-describedby', 'nrl-dev-field-print nrl-dev-field-status');
  if (model.wait) { select.disabled = true; apply.disabled = true; }
  return el('div', { class: 'nrl-dev-section' },
    el('div', { class: 'nrl-dev-row' }, el('label', { text: model.label, attrs: { for: select.id } }), select, apply),
    el('small', { text: model.note, attrs: { id: 'nrl-dev-field-note' } }), smallPrint, status);
}

export function openLabsPanel(): void {
  ensurePanelStyles();
  const inTest = testCareer() !== null;
  const content = el('div', { class: 'nrl-labs-panel' },
    el('h2', { text: DEV_SETTINGS_TITLE }),
    el('small', { text: inTest
      ? 'You are in the playtest career. Your own career is put away untouched.'
      : 'For testing on this browser only. Nothing here goes into a save.' }));

  const screens = overridesModel(overrideOn).map((o) => toggleRow('data-override', o.id, o.label, o.note, o.smallPrint, o.on,
    (on) => { setOverride(o.id, on); syncDevMarker(); }));
  content.append(section('nrl-dev-screens', 'Screens', ...screens));

  // The playtest career (#519): one button, with a confirm, refused mid-match.
  const model = playtestModel(inTest, transitionRefusal(currentProbe()));
  const status = el('small', { class: 'nrl-dev-wait', attrs: { role: 'status', 'aria-live': 'polite' } });
  const row = el('div', { class: 'nrl-dev-row' });
  const idle = (): void => {
    const act = button(model.label, ask, { class: `nrl-dev-${model.action}` });
    act.setAttribute('data-dev-action', model.action);
    if (model.wait) { act.disabled = true; act.setAttribute('aria-describedby', 'nrl-dev-why'); status.id = 'nrl-dev-why'; status.textContent = model.wait; }
    row.replaceChildren(act);
  };
  const ask = (): void => {
    const go = button(model.action === 'enter' ? 'Switch to playtest' : 'Return now', () => {
      const res = model.action === 'enter' ? enterTestCareer() : returnToNormalCareer();
      if (!res.ok) { status.textContent = res.why; idle(); }
    }, { class: 'nrl-dev-confirm' });
    go.setAttribute('data-dev-confirm', '');
    row.replaceChildren(go, button('Cancel', idle, { class: 'nrl-dev-cancel' }));
    go.focus();
  };
  idle();
  content.append(section('nrl-dev-playtest', 'Playtest career', el('small', { text: model.note }), row, status));

  const experiments = labsPanelModel(experimentOn).map((e) => toggleRow('data-experiment', e.id, e.label, e.note, e.smallPrint, e.on,
    (on) => { setExperiment(e.id, on); syncDevMarker(); }));
  content.append(section('nrl-dev-experiments', 'Experiments', ...experiments, fieldSelectionRow()));

  const resetWhy = el('small', { class: 'nrl-dev-wait', attrs: { role: 'status', 'aria-live': 'polite' } });
  const off = button('Reset all', () => {
    const res = resetFieldSelection();
    if (!res.ok) { resetWhy.textContent = res.why; return; }
    syncDevMarker();
    closeModal();
  }, { class: 'nrl-labs-off' });
  const resetWait = FIELD_LENGTH !== 100 ? transitionRefusal(currentProbe()) : null;
  if (resetWait) {
    off.disabled = true;
    resetWhy.id = 'nrl-dev-reset-why';
    resetWhy.textContent = resetWait;
    off.setAttribute('aria-describedby', resetWhy.id);
  }
  content.append(section('nrl-dev-reset', 'Reset',
    el('small', { text: (inTest
      ? 'Leaves the playtest career as Return does, turns everything here off and hides this page. Hints you have seen stay.'
      : 'Turns everything here off and hides this page. Your career and the hints you have seen stay.')
      + (FIELD_LENGTH !== 100 ? ' Returns to a 100m field and reloads.' : '') }),
    off, resetWhy));
  openModal(content, { region: true, closeButton: true });
}
