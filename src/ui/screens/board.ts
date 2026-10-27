// src/ui/screens/board.ts — the Staff & Board screen, board objectives section and
// sacked game-over modal (GitHub #47, part of #49). The objectives sit beside the
// staff (#350 F1), out of the Finance screen's scroll; the modal reuses the title/slot flow for "New club" by reloading to the title
// screen. The save is never deleted: the sacked slot stays and can be reviewed.
import { bus } from '../../core/events';
import { getState, type GameState } from '../../core/state';
import { getActiveSlot } from '../../core/save';
import { BOARD } from '../../config';
import { RISK_WORD, objectiveLine, objectiveRisk, sackedSummary } from '../../systems/board';
import { financeSummary } from './finance';
import { STAFF, STAFF_ROLES, hireStaff, releaseStaff, staffWage } from '../../systems/staff';
import { el, panel, button, openModal, openScreen, closeScreen, screenHead } from '../dom';

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
    // #368: each pending objective with the hub chip's risk word, from the same runway as the money tile.
    const runway = financeSummary(state).runwayWeeks;
    for (const o of state.objectives) {
      const risk = o.status === 'pending' ? objectiveRisk(o, state, runway) : null;
      box.append(el('div', { class: `nrl-board-obj nrl-board-${o.status}${risk ? ` nrl-board-${risk}` : ''}`, attrs: risk ? { 'data-risk': risk } : {} },
        objectiveLine(o, state),
        ...(risk ? [' ', el('span', { class: 'nrl-board-risk', text: `· ${RISK_WORD[risk]}` })] : [])));
    }
  }
  return panel({ class: 'nrl-board-panel' }, box);
}

/**
 * The club's staff (N14.5): each role with its holder and wage, or what it would
 * cost, and Hire / Release.
 */
export function staffRows(state: GameState): HTMLElement[] {
  const rows: HTMLElement[] = [];
  for (const role of STAFF_ROLES) {
    const def = STAFF[role];
    const member = state.staff.find((m) => m.role === role);
    const who = member
      ? `${def.title}: ${member.name} · $${member.wage.toLocaleString('en-US')}/wk`
      : `${def.title} · $${staffWage(state, role).toLocaleString('en-US')}/wk`;
    const row = el('div', { class: 'nrl-staff-row', attrs: { 'data-staff': role } },
      el('div', { class: 'nrl-staff-info' }, el('strong', { text: who }), el('span', { class: 'nrl-staff-blurb', text: def.blurb })),
      member
        ? button('Release', () => { releaseStaff(role); })
        : button('Hire', () => { hireStaff(role); }),
    );
    rows.push(row);
  }
  return rows;
}

/** The Staff & Board screen's name, in its head and in the nav's More sheet. */
export const STAFF_SCREEN_TITLE = 'Staff & Board';

/**
 * The Staff & Board screen (#344, #350 F1): the board's objectives and patience,
 * and the staff beside them, in the nav's More sheet. Both used to sit down
 * Finance's scroll. Re-renders on the state change a hire makes.
 */
export function openStaffScreen(): HTMLElement {
  const body = el('div', { class: 'nrl-screen-body nrl-staff' });
  const sub = el('div', { class: 'nrl-screen-sub' });
  const render = (): void => {
    const s = getState();
    sub.textContent = `${s.staff.length} of ${STAFF_ROLES.length} hired · wages paid with the running costs`;
    body.replaceChildren(buildObjectivesSection(s), el('div', { class: 'nrl-staff-list' }, ...staffRows(s)));
  };
  render();
  const off = bus.on('state:changed', render);
  return openScreen(el('div', { class: 'nrl-screen' }, screenHead(STAFF_SCREEN_TITLE, { sub }), body), off, 'staff');
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
