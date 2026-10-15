// src/ui/screens/board.ts — board objectives section + sacked game-over modal
// (GitHub #47, part of #49). The section is shown on the Finance screen; the
// modal reuses the title/slot flow for "New club" by reloading to the title
// screen. The save is never deleted: the sacked slot stays and can be reviewed.
import { bus } from '../../core/events';
import { getState, type GameState } from '../../core/state';
import { getActiveSlot } from '../../core/save';
import { BOARD } from '../../config';
import { objectiveLine, sackedSummary } from '../../systems/board';
import { el, panel, button, openModal, closeScreen } from '../dom';

/** Objectives + patience as a panel (pure of side effects; rebuilt on refresh). */
export function buildObjectivesSection(state: GameState): HTMLElement {
  const box = el('div', { class: 'nrl-board' });
  box.append(el('h3', { text: `Board objectives — season ${state.season}` }));
  box.append(el('p', {
    class: 'nrl-board-patience',
    text: `Board patience: ${state.boardPatience}/${BOARD.MAX_PATIENCE}`,
  }));
  if (state.objectives.length === 0) {
    box.append(el('p', { text: 'The board will set goals once the season is under way.' }));
  } else {
    for (const o of state.objectives) {
      box.append(el('div', { class: `nrl-board-obj nrl-board-${o.status}`, text: objectiveLine(o, state) }));
    }
  }
  return panel({ class: 'nrl-board-panel' }, box);
}

/** Game-over modal. Stays until "New club"; the save is kept in its slot. */
export function openSackedScreen(state: GameState = getState()): HTMLElement {
  closeScreen();
  const sum = sackedSummary(state);
  const content = el('div', { class: 'nrl-sacked' });
  content.append(
    el('h2', { text: 'You have been sacked' }),
    el('p', { text: sum.reason }),
    panel({},
      el('p', { text: `${state.clubName} — sacked at the end of season ${sum.season}` }),
      el('p', { text: `Seasons completed: ${sum.seasons} · Premierships: ${sum.premierships}` }),
      el('p', { text: `Best finish: ${sum.bestFinish ? `${sum.bestFinish}` : '—'} · Final reputation: ${sum.reputation}` }),
    ),
    el('p', { text: `Your save in slot ${getActiveSlot()} has been kept. Choose a slot on the title screen to start a new club.` }),
    button('New club', () => {
      if (typeof location !== 'undefined') location.reload(); // back to the title/slot flow (#34)
    }),
  );
  // Not a closable dialog: no backdrop dismiss handling beyond the shared default,
  // and the game cannot advance while sacked.
  return openModal(content, { class: 'nrl-sacked-modal' });
}

/** Show the game-over modal on 'board:sacked' and for an already-sacked loaded save. */
export function initBoardUi(): () => void {
  if (getState().sacked) openSackedScreen();
  return bus.on('board:sacked', () => openSackedScreen());
}
