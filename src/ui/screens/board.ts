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
import { fmtMoney } from '../../utils/money';
import { objectiveLine, objectiveRisk, sackedSummary } from '../../systems/board';
import { financeSummary } from './finance';
import { ladderPosition } from '../../systems/fixtures';
import { ATTACK_COACHES, ATTACK_SPECIALITIES, STAFF, STAFF_ROLES, attackCoach, attackCoachRefusal, attackCoachWage, hireAttackCoach, hireStaff, releaseStaff, staffWage, STAFF_APPOINTMENT_PRICES } from '../../systems/staff';
import { el, button, openModal, openScreen, closeScreen, ensureStyles, guardDoubleTap } from '../dom';

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

/** A week's wage, as the staff rows show it ("$800/wk"). */
const perWeek = (wage: number): string => `${fmtMoney(wage)}/wk`;

/** The board (3k; SuperCOOKED 52): BOARD · SEASON N, patience as pips, and each objective as a card with its chip. */
export function buildObjectivesSection(state: GameState): HTMLElement {
  const box = el('div', { class: 'nrl-board' });
  box.append(el('h2', { class: 'nrl-screen-title nrl-board-title', text: `Board · Season ${state.season}` }));
  // One pip a point of patience: lit while it lasts, red at two or less.
  const pips = Array.from({ length: BOARD.MAX_PATIENCE }, (_, i) => el('i', { class: i < state.boardPatience ? 'nrl-board-pip-on' : '' }));
  box.append(el('div', { class: 'nrl-board-patience', attrs: { 'aria-label': `Board patience ${state.boardPatience} of ${BOARD.MAX_PATIENCE}` } },
    el('span', { class: 'nrl-label', text: 'Patience' }),
    el('span', { class: `nrl-board-pips${state.boardPatience <= 2 ? ' nrl-board-pips-low' : ''}`, attrs: { 'aria-hidden': 'true' } }, ...pips),
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
      ? `${def.title}: ${member.name} · appointed`
      : `${def.title} · ${fmtMoney(STAFF_APPOINTMENT_PRICES[role])} once`;
    // SuperCOOKED 52: the week's wage beside the button; Hire outlined, Release the quiet destructive one.
    const row = el('div', { class: 'nrl-staff-row', attrs: { 'data-staff': role } },
      el('div', { class: 'nrl-staff-info' }, el('strong', { class: 'nrl-name-wrap', text: who }), el('span', { class: 'nrl-staff-blurb', text: def.blurb })),
      el('span', { class: 'nrl-staff-wage', text: perWeek(member ? member.wage : staffWage(state, role)) }),
      member
        ? button('Release', () => { releaseStaff(role); }, { class: 'nrl-btn-danger nrl-staff-release' })
        : button('Hire', () => { hireStaff(role); }, { class: 'nrl-staff-hire-one' }),
    );
    if (!member && state.money < STAFF_APPOINTMENT_PRICES[role]) {
      const hire = row.querySelector('button');
      if (hire) { hire.disabled = true; hire.title = 'Not enough cash'; }
    }
    rows.push(row);
  }
  rows.push(attackCoachRow(state));
  return rows;
}

/** The roles on the panel: the three, and the attack coach. */
export const STAFF_ROW_COUNT = STAFF_ROLES.length + 1;

/**
 * The attack coach's row (#326, plan §2.2): one at a time, so the holder and
 * Release, or the four specialities to hire, each with its wage (the Razzle
 * coach needs reputation 50 and says so). Plays bought stay when he goes.
 */
export function attackCoachRow(state: GameState): HTMLElement {
  const coach = attackCoach(state);
  if (coach?.speciality) {
    const def = ATTACK_COACHES[coach.speciality];
    return el('div', { class: 'nrl-staff-row', attrs: { 'data-staff': 'attackCoach', 'data-speciality': coach.speciality } },
      el('div', { class: 'nrl-staff-info' },
        el('strong', { class: 'nrl-name-wrap', text: `${def.title}: ${coach.name} · appointed` }),
        el('span', { class: 'nrl-staff-blurb', text: `${def.blurb} Plays you buy stay if he goes.` })),
      el('span', { class: 'nrl-staff-wage', text: perWeek(coach.wage) }),
      button('Release', () => { releaseStaff('attackCoach'); }, { class: 'nrl-btn-danger nrl-staff-release' }));
  }
  const hires = el('div', { class: 'nrl-staff-hires' }, ...ATTACK_SPECIALITIES.map((sp) => {
    const def = ATTACK_COACHES[sp];
    const why = attackCoachRefusal(state, sp) ?? (state.money < STAFF_APPOINTMENT_PRICES[sp] ? 'Not enough cash' : null);
    // A choice button (SuperCOOKED 52): the speciality, then its wage and fee, or why it's locked.
    const b = button('', () => { hireAttackCoach(sp); }, { class: 'nrl-staff-hire' });
    b.append(el('span', { class: 'nrl-staff-hire-name', text: `Hire ${def.short}` }),
      ...(why ? [el('small', { text: why })]
        : [el('small', { text: perWeek(attackCoachWage(state, sp)) }), el('small', { text: `${fmtMoney(STAFF_APPOINTMENT_PRICES[sp])} once` })]));
    b.setAttribute('data-hire-attack', sp);
    b.title = why ? `${def.title}: ${why.toLowerCase()} (you have ${state.reputation})` : `${def.title} · ${fmtMoney(STAFF_APPOINTMENT_PRICES[sp])} once. ${def.blurb}`;
    if (why) { b.disabled = true; b.setAttribute('data-locked', ''); }
    return b;
  }));
  return el('div', { class: 'nrl-staff-row nrl-staff-row-attack', attrs: { 'data-staff': 'attackCoach' } },
    el('div', { class: 'nrl-staff-info' },
      el('strong', { text: 'Attack Coach · one at a time' }),
      el('span', { class: 'nrl-staff-blurb', text: 'Opens a family of set plays to buy on the Playbook. Plays you buy stay if he goes.' })),
    hires);
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
  // Hire and Release share a spot: the second tap of a double tap must not undo the first (#598).
  guardDoubleTap(list);
  const render = (): void => {
    const s = getState();
    left.replaceChildren(buildObjectivesSection(s));
    label.textContent = `Staff · ${s.staff.length} of ${STAFF_ROW_COUNT} hired · wages paid with running costs`;
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
  // SuperCOOKED 63: four career tiles, each from sackedSummary (state.history, reputation).
  const tile = (label: string, value: string): HTMLElement =>
    el('div', { class: 'nrl-sacked-chip' }, el('span', { class: 'nrl-label', text: label }), el('b', { class: 'nrl-display', text: value }));
  const content = el('div', { class: 'nrl-sacked', attrs: { role: 'alertdialog', 'aria-label': 'You have been sacked' } });
  const head = el('h2', { text: "You're " });
  head.append(el('span', { class: 'nrl-sacked-hot', text: 'cooked.' }));
  content.append(
    el('div', { class: 'nrl-sacked-tag nrl-num', text: `Sacked · end of season ${sum.season}` }),
    head,
    el('p', { class: 'nrl-sacked-reason', text: `${state.clubName} have let you go. ${sum.reason}` }),
    el('div', { class: 'nrl-sacked-chips' },
      tile('Seasons', String(sum.seasons)),
      tile('Titles', String(sum.premierships)),
      tile('Best', sum.bestFinish ? ord(sum.bestFinish) : '—'),
      tile('Rep', String(sum.reputation))),
    el('p', { class: 'nrl-sacked-note', text: `Your save in slot ${getActiveSlot()} is kept. Start a new club in any slot.` }),
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
.nrl-board-patience .nrl-label { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.16em; }
/* SuperCOOKED 52: patience as pips, one a point. */
.nrl-board-pips { flex: 1 1 auto; display: flex; gap: 3px; }
.nrl-board-pips i { flex: 0 1 22px; height: 8px; border-radius: 4px; background: var(--nrl-line); }
.nrl-board-pips i.nrl-board-pip-on { background: var(--nrl-text); }
.nrl-board-pips.nrl-board-pips-low i.nrl-board-pip-on { background: var(--nrl-neg); }
/* Each objective a ringed card with one status chip. */
.nrl-board-obj { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--nrl-panel); border: 1px solid var(--nrl-line); border-radius: 12px; padding: 8px 10px; font-size: 0.875rem; }
.nrl-board-obj-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.nrl-board-obj-text > span { font-weight: 600; }
.nrl-board-obj-text small { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-board-status { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 11px; border: 1px solid currentColor; font-size: 0.6875rem; font-weight: 700; white-space: nowrap; background: color-mix(in srgb, currentColor 12%, transparent); }
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
.nrl-staff-info strong { font-size: 0.875rem; font-weight: 600; }
.nrl-staff-blurb { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-staff-wage { flex: 0 0 auto; font-family: var(--nrl-f-num); font-size: 0.75rem; color: var(--nrl-text-2); white-space: nowrap; }
.nrl-staff-row .nrl-btn { flex: 0 0 auto; min-height: 40px; border-radius: 10px; padding: 0 14px; font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
/* SuperCOOKED 52: Hire outlined, Release raised with the destructive colour in its words. */
.nrl-staff-row .nrl-btn.nrl-staff-hire-one, .nrl-staff-row .nrl-btn.nrl-staff-hire { background: transparent; border: 1px solid color-mix(in srgb, var(--nrl-text) 35%, transparent); color: var(--nrl-text); }
.nrl-staff-row .nrl-btn.nrl-staff-hire-one { padding: 0 16px; }
.nrl-staff-row .nrl-btn.nrl-staff-hire-one:active:not(:disabled), .nrl-staff-row .nrl-btn.nrl-staff-hire:active:not(:disabled) { background: var(--nrl-raised); }
.nrl-staff-row .nrl-btn.nrl-staff-release { background: var(--nrl-raised); color: var(--nrl-neg); }
@media (pointer: coarse) { .nrl-staff-row .nrl-btn { min-height: 44px; } }
/* The attack coach (#326): his four specialities under the row's words, two or four across. */
.nrl-staff-row-attack { flex-wrap: wrap; }
.nrl-staff-row-attack .nrl-staff-info { flex-basis: 100%; }
.nrl-staff-hires { flex: 1 1 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 116px), 1fr)); gap: 6px; }
.nrl-staff-row .nrl-btn.nrl-staff-hire { min-height: 52px; padding: 3px 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; min-width: 0; background: var(--nrl-panel); border-color: var(--nrl-line); }
.nrl-staff-hire-name { font-size: 0.75rem; white-space: nowrap; }
.nrl-staff-hire small { font-family: var(--nrl-f-num); font-size: 0.625rem; font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.nrl-staff-hire[data-locked] { opacity: 0.55; cursor: default; }
.nrl-staff-hire[data-locked] small { color: var(--nrl-neg); }
@media (max-width: 700px) { .nrl-screen.nrl-staff { grid-template-columns: 230px minmax(0, 1fr); gap: 12px; } }

/* SuperCOOKED 63: the sacked card, navy with a red edge, centred. */
.nrl-modal.nrl-sacked-modal { width: min(540px, calc(100vw - 24px)); max-width: none; border-radius: 18px; padding: 18px 22px; border: 1px solid color-mix(in srgb, var(--nrl-alert) 45%, transparent); }
.nrl-sacked { display: flex; flex-direction: column; gap: 10px; }
.nrl-sacked-tag { align-self: flex-start; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 4px 9px; border-radius: 10px;
  background: color-mix(in srgb, var(--nrl-alert) 15%, transparent); border: 1px solid color-mix(in srgb, var(--nrl-alert) 50%, transparent); color: color-mix(in srgb, var(--nrl-alert) 80%, #fff); }
.nrl-sacked h2 { margin: 0; font-size: 2.875rem; line-height: 0.95; }
.nrl-sacked-hot { color: var(--nrl-accent); }
.nrl-sacked p { margin: 0; }
.nrl-sacked-reason { font-size: 0.9375rem; color: var(--nrl-text-2); line-height: 1.45; }
.nrl-sacked-chips { display: flex; gap: 6px; }
.nrl-sacked-chip { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 12px; background: var(--nrl-panel); border: 1px solid var(--nrl-line); }
.nrl-sacked-chip .nrl-label { font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.14em; }
.nrl-sacked-chip b { font-size: 1.25rem; font-weight: 400; }
.nrl-sacked-note { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-sacked-actions { display: flex; }
.nrl-sacked-actions .nrl-btn { flex: 1; min-height: 50px; border-radius: 10px; font-size: 1.0625rem; }
@media (max-height: 420px) {
  .nrl-modal.nrl-sacked-modal { padding: 10px 18px; }
  .nrl-sacked { gap: 6px; }
  .nrl-sacked h2 { font-size: 1.875rem; }
  .nrl-sacked-actions .nrl-btn { min-height: 44px; }
}
`;
