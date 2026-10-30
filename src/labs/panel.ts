// Labs: match controls (Leon, 30 Oct). Pure model, thin sheet.
import { EXPERIMENTS } from './experiments';
import { experimentOn, setExperiment, turnAllOff } from './flags';
import { button, el, openModal, closeModal } from '../ui/dom';

export function labsPanelModel(on: (id: string) => boolean) {
  return EXPERIMENTS.map((e) => ({ ...e, on: on(e.id), smallPrint: 'Changes take effect at the next match.' }));
}
export function openLabsPanel(): void {
  const content = el('div', { class: 'nrl-labs-panel' }, el('h2', { text: 'Labs' }));
  for (const e of labsPanelModel(experimentOn)) {
    const box = el('input', { attrs: { type: 'checkbox', 'data-experiment': e.id } });
    box.checked = e.on;
    box.addEventListener('change', () => setExperiment(e.id, box.checked));
    const row = el('label', { class: 'nrl-audio-row nrl-settings-toggle' }, box,
      el('span', { class: 'nrl-settings-text' }, el('b', { text: e.label }), el('small', { text: e.note }), el('small', { text: e.smallPrint })));
    row.style.minHeight = '44px';
    for (const note of row.querySelectorAll('small')) note.style.display = 'block';
    content.append(row);
  }
  const off = button('Turn all off', () => { turnAllOff(); closeModal(); }, { class: 'nrl-labs-off' });
  off.style.minHeight = '44px';
  content.append(off);
  openModal(content, { region: true, closeButton: true });
}
