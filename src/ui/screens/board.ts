// src/ui/screens/board.ts — the Staff & Board screen, board objectives section and
// sacked game-over modal (GitHub #47, part of #49; Broadcast Quiet 3k). The
// board on the left (patience bar, each objective with how it stands), the staff
// beside it (#350 F1), out of the Finance screen's scroll; the modal reuses the
// title/slot flow for "New club" by reloading to the title screen. The save is
// never deleted: the sacked slot stays and can be reviewed.
import { bus } from '../../core/events';
import { getState, type GameState, type Objective } from '../../core/state';
import { getActiveSlot } from '../../core/save';
import { BOARD } from '../../config';
import { objectiveLine, objectiveRisk, sackedSummary } from '../../systems/board';
import { financeSummary } from './finance';
import { ladderPosition } from '../../systems/fixtures';
import { STAFF, STAFF_ROLES, hireStaff, releaseStaff, staffWage } from '../../systems/staff';
import { el, button, openModal, openScreen, closeScreen, ensureStyles } from '../dom';

/** How an objective stands (3k): ON TRACK / AT RISK while the season runs, MET / FAILED once reviewed, PENDING before a ball is kicked. */
export type ObjectiveStatus = 'on-track' | 'at-risk' | 'pending' | 'met' | 'failed' | 'off-track';

/** The status chip's words. */
export const OBJECTIVE_STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'on-track': 'On track', 'at-risk': 'At risk', pending: 'Pending', met: 'Met', failed: 'Failed', 'off-track': 'Off track',
};

/**
 * Where an objective stands today, read the way the board will at the season's
 * end (systems/board evaluateObjective): the ladder place against the target,
 * the bank against the floor, the facilities against the count, the club above
 * the rival. Pure.
 */
export function objectiveStatus(o: Objective, state: Pick<GameState, 'money' | 'facilities' | 'league' | 'clubId'>): ObjectiveStatus {
  if (o.status === 'met') return 'met';
  if (o.status === 'missed') return 'failed';
  const started = state.league.ladder.some((r) => r.played > 0);
  const pos = (id: string): number => ladderPosition(state as GameState, id);
  switch (o.kind) {
    case 'finals': return !started ? 'pending' : pos(state.clubId) > 0 && pos(state.clubId) <= o.target ? 'on-track' : 'at-risk';
    case 'solvent': return state.money >= o.target ? 'on-track' : 'at-risk';
    case 'build': return state.facilities.length >= o.target ? 'on-track' : 'at-risk';
    case 'beatRival': {
      if (!started || !o.rivalId) return 'pending';
      const rival = pos(o.rivalId);
      return rival > 0 && pos(state.clubId) < rival ? 'on-track' : 'at-risk';
    }
    default: return 'pending';
  }
}

/** The detail after the objective's text ("currently 4th", "now $120,000"), from objectiveLine. */
function objectiveDetail(o: Objective, state: GameState): string {
  const line = objectiveLine(o, state);
  const cut = line.indexOf(' — ');
  const detail = cut < 0 ? '' : line.slice(cut + 3);
  // Reviewed: the chip says met / missed, and "pending" says nothing the chip doesn't.
  return o.status !== 'pending' || detail === 'pending' ? '' : detail;
}

/** The board (3k): BOARD · SEASON N, the patience bar, and each objective with how it stands. */
export function buildObjectivesSection(state: GameState): HTMLElement {
  const box = el('div', { class: 'nrl-board' });
  box.append(el('h2', { class: 'nrl-screen-title nrl-board-title', text: `Board · Season ${state.season}` }));
  const pct = Math.max(0, Math.min(100, (state.boardPatience / BOARD.MAX_PATIENCE) * 100));
  box.append(el('div', { class: 'nrl-board-patience', attrs: { 'aria-label': `Board patience ${state.boardPatience} of ${BOARD.MAX_PATIENCE}` } },
    el('span', { class: 'nrl-label', text: 'Patience' }),
    el('span', { class: `nrl-board-bar${state.boardPatience <= 2 ? ' nrl-board-bar-low' : ''}` }, el('i', { attrs: { style: `width:${pct}%` } })),
    el('span', { class: 'nrl-num', text: `${state.boardPatience}/${BOARD.MAX_PATIENCE}` })));
  if (state.objectives.length === 0) {
    box.append(el('p', { class: 'nrl-board-empty', text: 'The board will set goals once the season is under way.' }));
  } else {
    // #368: while the season runs, the board's own risk read (systems/board objectiveRisk, from the
    // same runway as the money readout), so this screen and the hub's chip never disagree.
    const runway = financeSummary(state).runwayWeeks;
    for (const o of state.objectives) {
      const now = objectiveStatus(o, state);
      const st: ObjectiveStatus = now === 'on-track' || now === 'at-risk' ? objectiveRisk(o, state, runway) : now;
      const detail = objectiveDetail(o, state);
      box.append(el('div', { class: `nrl-board-obj nrl-board-${o.status}`, attrs: { 'data-objective': o.kind, 'data-status': st } },
        el('div', { class: 'nrl-board-obj-text' }, el('span', { text: o.text }), ...(detail ? [el('small', { text: detail })] : [])),
        el('span', { class: `nrl-board-status nrl-board-status-${st}`, text: OBJECTIVE_STATUS_LABEL[st] })));
    }
  }
  return el('div', { class: 'nrl-board-panel' }, box);
}

/**
 * The club's staff (N14.5): each role with its holder and wage, or what it would
 * cost, what the role does, and Hire / Release.
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
        ? button('Release', () => { releaseStaff(role); }, { class: 'nrl-btn-danger' })
        : button('Hire', () => { hireStaff(role); }, { class: 'nrl-btn-primary' }),
    );
    rows.push(row);
  }
  return rows;
}

/** The Staff & Board screen's name, in the nav's Office sheet. */
export const STAFF_SCREEN_TITLE = 'Staff & Board';

/**
 * The Staff & Board screen (#344, #350 F1; 3k): the board's objectives and
 * patience on the left, the staff beside them, in the nav's Office sheet. Both
 * used to sit down Finance's scroll. Re-renders on the state change a hire makes.
 */
export function openStaffScreen(): HTMLElement {
  ensureBoardStyles();
  const left = el('div', { class: 'nrl-staff-board' });
  const label = el('div', { class: 'nrl-label nrl-staff-label' });
  const list = el('div', { class: 'nrl-staff-list' });
  const render = (): void => {
    const s = getState();
    left.replaceChildren(buildObjectivesSection(s));
    label.textContent = `Staff · ${s.staff.length} of ${STAFF_ROLES.length} hired · wages paid with running costs`;
    list.replaceChildren(...staffRows(s));
  };
  render();
  const sheet = el('div', { class: 'nrl-screen nrl-staff' }, left, el('div', { class: 'nrl-staff-col' }, label, list));
  const off = bus.on('state:changed', () => { if (sheet.isConnected) render(); });
  return openScreen(sheet, off, 'staff');
}

/** Game-over modal (a full-time-style card). Stays until "New club"; the save is kept in its slot. */
export function openSackedScreen(state: GameState = getState()): HTMLElement {
  ensureBoardStyles();
  closeScreen();
  const sum = sackedSummary(state);
  const ord = (n: number): string => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10]}`;
  const chip = (label: string, value: string): HTMLElement =>
    el('div', { class: 'nrl-sacked-chip' }, el('span', { class: 'nrl-label', text: label }), el('b', { class: 'nrl-num', text: value }));
  const content = el('div', { class: 'nrl-sacked' });
  content.append(
    el('div', { class: 'nrl-sacked-tag', text: `Sacked · end of season ${sum.season}` }),
    el('h2', { text: 'You have been sacked' }),
    el('p', { class: 'nrl-sacked-reason', text: sum.reason }),
    el('p', { class: 'nrl-sacked-club', text: state.clubName }),
    el('div', { class: 'nrl-sacked-chips' },
      chip('Seasons', String(sum.seasons)),
      chip('Premierships', String(sum.premierships)),
      chip('Best finish', sum.bestFinish ? ord(sum.bestFinish) : '—'),
      chip('Reputation', String(sum.reputation))),
    el('p', { class: 'nrl-sacked-note', text: `Your save in slot ${getActiveSlot()} has been kept. Choose a slot on the title screen to start a new club.` }),
    el('div', { class: 'nrl-sacked-actions' }, button('New club ▸', () => {
      if (typeof location !== 'undefined') location.reload(); // back to the title/slot flow (#34)
    }, { class: 'nrl-btn-primary' })),
  );
  // Not a closable dialog: a tap beside the card does nothing, and the game
  // cannot advance while sacked.
  const backdrop = openModal(content, { class: 'nrl-sacked-modal' });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) e.stopImmediatePropagation(); }, true);
  return backdrop;
}

/** Show the game-over modal on 'board:sacked' and for an already-sacked loaded save. */
export function initBoardUi(): () => void {
  if (getState().sacked) openSackedScreen();
  return bus.on('board:sacked', () => openSackedScreen());
}

// ── Styles (injected once, beside the shared kit) ───────────────────────────

const BOARD_STYLE_ID = 'nrl-board-styles';

function ensureBoardStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(BOARD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BOARD_STYLE_ID;
  style.textContent = BOARD_CSS;
  document.head.appendChild(style);
}

export const BOARD_CSS = `
/* 3k: the board on the left (280), the staff beside it; each side scrolls inside itself. */
.nrl-screen.nrl-staff { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; }
.nrl-staff-board { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-board { display: flex; flex-direction: column; gap: 6px; }
.nrl-board .nrl-board-title { margin: 0; letter-spacing: 0.04em; line-height: 30px; white-space: normal; }
.nrl-board-patience { display: flex; align-items: center; gap: 8px; }
.nrl-board-patience .nrl-num { font-size: 0.8125rem; font-weight: 500; }
.nrl-board-bar { flex: 1 1 auto; height: 6px; border-radius: 3px; background: var(--nrl-line); overflow: hidden; display: flex; }
.nrl-board-bar i { background: var(--nrl-accent); }
.nrl-board-bar.nrl-board-bar-low i { background: var(--nrl-neg); }
.nrl-board-obj { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--nrl-raised); border-radius: 8px; padding: 8px 10px; font-size: 0.8125rem; }
.nrl-board-obj-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.nrl-board-obj-text small { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-board-status { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
.nrl-board-status-on-track, .nrl-board-status-met { color: var(--nrl-pos); }
.nrl-board-status-at-risk { color: var(--nrl-accent); }
.nrl-board-status-failed, .nrl-board-status-off-track { color: var(--nrl-neg); }
.nrl-board-status-pending { color: var(--nrl-muted); }
.nrl-board-empty { color: var(--nrl-muted); margin: 4px 0; }
.nrl-staff-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.nrl-staff-label { min-height: 30px; display: flex; align-items: center; flex: 0 0 auto; }
.nrl-staff-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-staff-row { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 4px 0; border-top: 1px solid var(--nrl-button); box-sizing: border-box; }
.nrl-staff-info { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.nrl-staff-info strong { font-size: 0.8125rem; font-weight: 600; }
.nrl-staff-blurb { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-staff-row .nrl-btn { flex: 0 0 auto; min-height: 40px; border-radius: 8px; padding: 0 14px; }
@media (pointer: coarse) { .nrl-staff-row .nrl-btn { min-height: 44px; } }
@media (max-width: 700px) { .nrl-screen.nrl-staff { grid-template-columns: 230px minmax(0, 1fr); gap: 12px; } }

/* The sacked card: centred, navy, like full time (3s). */
.nrl-modal.nrl-sacked-modal { width: min(540px, calc(100vw - 24px)); max-width: none; border-radius: 18px; padding: 20px 24px; }
.nrl-sacked { display: flex; flex-direction: column; gap: 10px; }
.nrl-sacked-tag { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-neg); }
.nrl-sacked h2 { margin: 0; font-size: 1.875rem; line-height: 1.05; }
.nrl-sacked p { margin: 0; }
.nrl-sacked-reason { font-size: 0.875rem; color: var(--nrl-text-2); line-height: 1.4; }
.nrl-sacked-club { font-family: var(--nrl-f-label); font-size: 1.125rem; font-weight: 600; color: var(--nrl-text-2); }
.nrl-sacked-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; border-top: 1px solid var(--nrl-line); border-bottom: 1px solid var(--nrl-line); }
.nrl-sacked-chip { display: flex; flex-direction: column; padding: 6px 10px; border-radius: 8px; background: var(--nrl-raised); }
.nrl-sacked-chip .nrl-label { font-size: 0.6875rem; }
.nrl-sacked-chip b { font-size: 1rem; }
.nrl-sacked-note { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-sacked-actions { display: flex; justify-content: flex-end; }
.nrl-sacked-actions .nrl-btn { min-height: 48px; padding: 0 22px; font-size: 1.1875rem; }
@media (max-height: 420px) {
  .nrl-modal.nrl-sacked-modal { padding: 12px 18px; }
  .nrl-sacked { gap: 6px; }
  .nrl-sacked h2 { font-size: 1.5rem; }
  .nrl-sacked-chips { padding: 6px 0; }
}
`;
