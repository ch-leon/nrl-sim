// A pre-grounds introduction, only called by the fresh-game path.
import { getState, setState } from '../core/state';
import { generateObjectives } from '../systems/board';
import { coachLine } from './coachVoice';
import { button, el, mount } from './dom';
import { EXPANSION_COPY, expansionIntroLines } from './expansionCopy';

export const EXPANSION_INTRO_HINT = 'expansion-intro';

export function showExpansionIntro(): Promise<void> {
  const state = getState();
  if (state.settings.hintsSeen?.includes(EXPANSION_INTRO_HINT)) return Promise.resolve();
  // Mark on show: either exit (including a save/reload) counts as having seen it.
  setState({ settings: { ...state.settings, hintsSeen: [...(state.settings.hintsSeen ?? []), EXPANSION_INTRO_HINT] } });
  ensureStyles();
  return new Promise((resolve) => {
    const finish = (): void => { card.remove(); resolve(); };
    const work = button(EXPANSION_COPY.work, finish, { class: 'nrl-btn-primary' });
    work.setAttribute('data-expansion-work', '');
    const skip = button(EXPANSION_COPY.skip, finish);
    skip.setAttribute('data-expansion-skip', '');
    const goals = state.objectives.length ? state.objectives : generateObjectives(state);
    const card = el('div', { class: 'nrl-expansion', attrs: { 'data-expansion-intro': '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nrl-expansion-title' } },
      el('section', { class: 'nrl-panel nrl-expansion-card' },
        el('h1', { text: EXPANSION_COPY.title, attrs: { id: 'nrl-expansion-title' } }),
        el('div', { class: 'nrl-expansion-lines' }, ...expansionIntroLines(state, goals).map((text) => coachLine(text))),
        el('div', { class: 'nrl-expansion-actions' }, skip, work)));
    mount(card);
    work.focus();
  });
}

function ensureStyles(): void {
  if (document.getElementById('nrl-expansion-styles')) return;
  const style = el('style', { text: `
.nrl-expansion { position: fixed; inset: 0; z-index: 100; pointer-events: auto; display: flex; align-items: center; justify-content: center; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); background: #0b1220; }
.nrl-expansion-card { width: min(620px, 100%); max-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.nrl-expansion-card h1 { margin: 0; font-size: 1.5rem; }
.nrl-expansion-lines { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.nrl-expansion-actions { display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }
.nrl-expansion-actions .nrl-btn { min-height: 44px; }
` });
  style.id = 'nrl-expansion-styles';
  document.head.appendChild(style);
}
