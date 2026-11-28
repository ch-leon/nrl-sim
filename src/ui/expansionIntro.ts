// A pre-grounds introduction, only called by the fresh-game path. SuperCOOKED 61 (the season
// review's layout): a banner (the bank as the big number, the title, the club) with Skip intro
// and the one primary, Carry on, then the coach's three lines as rows.
import { getState, setState } from '../core/state';
import { generateObjectives } from '../systems/board';
import { coachLine } from './coachVoice';
import { button, el, mount } from './dom';
import { fmtMoney } from '../utils/money';
import { EXPANSION_COPY, expansionIntroLines } from './expansionCopy';

export const EXPANSION_INTRO_HINT = 'expansion-intro';

export function showExpansionIntro(): Promise<void> {
  const state = getState();
  if (state.settings.hintsSeen?.includes(EXPANSION_INTRO_HINT)) return Promise.resolve();
  // Mark on show: either exit (including a save/reload) counts as having seen it.
  setState({ settings: { ...state.settings, hintsSeen: [...(state.settings.hintsSeen ?? []), EXPANSION_INTRO_HINT] } });
  ensureStyles();
  return new Promise((resolve) => {
    const finish = (): void => {
      if (location.search.includes('?e2e')) performance.mark('nrl-739:intro-handler');
      card.remove();
      resolve();
    };
    const work = button('Carry on ▸', finish, { class: 'nrl-btn-primary' });
    work.setAttribute('data-expansion-work', '');
    work.title = EXPANSION_COPY.work;
    const skip = button(EXPANSION_COPY.skip, finish);
    skip.setAttribute('data-expansion-skip', '');
    const goals = state.objectives.length ? state.objectives : generateObjectives(state);
    const card = el('div', { class: 'nrl-expansion', attrs: { 'data-expansion-intro': '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nrl-expansion-title' } },
      el('section', { class: 'nrl-expansion-card' },
        el('div', { class: 'nrl-expansion-banner' },
          el('span', { class: 'nrl-expansion-hero nrl-display', text: fmtMoney(state.money), attrs: { 'data-expansion-bank': '' } }),
          el('span', { class: 'nrl-expansion-titles' },
            el('span', { class: 'nrl-expansion-tag', text: 'IN THE BANK' }),
            el('h1', { text: EXPANSION_COPY.title, attrs: { id: 'nrl-expansion-title' } }),
            el('span', { class: 'nrl-expansion-club nrl-name-wrap', text: state.clubName })),
          el('div', { class: 'nrl-expansion-actions' }, skip, work)),
        el('div', { class: 'nrl-expansion-lines' }, ...expansionIntroLines(state, goals).map((text) => coachLine(text)))));
    mount(card);
    if (location.search.includes('?e2e')) performance.mark('nrl-739:intro-mounted');
    work.focus();
    if (location.search.includes('?e2e')) {
      performance.mark('nrl-739:intro-focused');
      requestAnimationFrame(() => performance.mark('nrl-739:intro-raf'));
      work.addEventListener('pointerdown', (e) => {
        if (e.isTrusted) performance.mark('nrl-739:intro-pointerdown');
      }, { once: true });
    }
  });
}

function ensureStyles(): void {
  if (document.getElementById('nrl-expansion-styles')) return;
  const style = el('style', { text: `
.nrl-expansion { position: fixed; inset: 0; z-index: 100; pointer-events: auto; display: flex; align-items: center; justify-content: center; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); background: var(--nrl-ink); }
.nrl-expansion-card { width: min(780px, 100%); max-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 14px 18px; background: var(--nrl-sheet); border: 1px solid var(--nrl-line-2); border-radius: 16px; }
/* The banner (61): the big number, the title and the club, the buttons at the right; it wraps on a narrow sheet. */
.nrl-expansion-banner { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 10px 14px; border-radius: 14px; background: var(--nrl-panel); border: 1px solid var(--nrl-line-2); }
.nrl-expansion-hero { flex: 0 0 auto; font-size: 2.25rem; line-height: 1; color: var(--nrl-pos); }
.nrl-expansion-titles { flex: 1 1 12rem; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-expansion-tag { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.18em; color: var(--nrl-muted); }
.nrl-expansion-card h1 { margin: 0; font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2; }
.nrl-expansion-club { font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-expansion-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; margin-left: auto; }
.nrl-expansion-actions .nrl-btn { min-height: 44px; padding: 0 14px; }
.nrl-expansion-actions .nrl-btn-primary { min-height: 48px; padding: 0 20px; font-size: 1rem; }
/* The coach's three lines, one to a row, ruled like the review's. */
.nrl-expansion-lines { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; }
.nrl-expansion-lines > .nrl-coach-line { padding: 8px 0; border-top: 1px solid var(--nrl-button); }
.nrl-expansion-lines > .nrl-coach-line:first-child { border-top: 0; }
@media (max-height: 400px) {
  .nrl-expansion-card { gap: 6px; padding: 10px 14px; }
  .nrl-expansion-banner { padding: 8px 12px; }
  .nrl-expansion-hero { font-size: 1.75rem; }
  .nrl-expansion-lines > .nrl-coach-line { padding: 5px 0; }
}
` });
  style.id = 'nrl-expansion-styles';
  document.head.appendChild(style);
}
