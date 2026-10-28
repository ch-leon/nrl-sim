// src/ui/screens/rivalSquad.ts — read-only view of a rival club's squad, opened
// from the Ladder (GitHub #74). A sheet over the League (Broadcast Quiet, like
// the Squad table 3d): the club and how it plays in the header row, the squad
// as a table, a row opening the player page. The rows come from a pure
// view-model that is unit-tested without the DOM. No Phaser.
import type { RivalClub } from '../../core/state';
import { overallRating } from '../../data/player';
import { traitLabel } from '../../data/traits';
import { el, ensureStyles, openModal } from '../dom';
import { rivalStyle } from '../../systems/rivalRound';
import { hasStaff } from '../../systems/staff';
import { getState } from '../../core/state';
import { tacticsLabel } from '../../match/league/presets';
import { whenBehindLine } from '../tacticsBlurbs';
import { openPlayerPage, positionLabel } from './player';
import { ensureScreenStyles, posShort } from './recruit';

export interface RivalSquadRow {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  traits: string; // e.g. "Hitman II · Finisher I"
  injuredWeeks: number;
}

/** A rival's squad, best players first. Empty when the club has no squad. */
export function rivalSquadRows(club: RivalClub): RivalSquadRow[] {
  return (club.squad ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      age: p.age,
      overall: overallRating(p),
      traits: p.traits.map(traitLabel).join(' · '),
      injuredWeeks: p.injuredWeeks,
    }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
}

const RIVAL_STYLE_ID = 'nrl-rival-styles';

function ensureRivalStyles(): void {
  ensureStyles();
  ensureScreenStyles();
  if (document.getElementById(RIVAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RIVAL_STYLE_ID;
  style.textContent = RIVAL_CSS;
  document.head.appendChild(style);
}

const RIVAL_CSS = `
/* A sheet over the League (#343): the region's whole band, the dock whole below it, solid so the League does not show through. */
.nrl-dialog-region .nrl-modal.nrl-rival-modal {
  width: 100%;
  max-width: 1180px;
  height: 100%;
  background: var(--nrl-navy);
  border-radius: 16px;
  box-shadow: var(--nrl-shadow-tray);
  padding: 10px 14px;
}
.nrl-rival-squad { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
/* The header row: the club, how it plays (and, with an Analyst, when behind), beside the ✕. */
.nrl-rival-head { flex: 0 0 auto; min-height: 44px; display: flex; align-items: center; gap: 12px; margin-bottom: 6px; padding-right: 48px; min-width: 0; }
.nrl-rival-head h2 { flex: 0 0 auto; margin: 0; font-family: var(--nrl-f-label); font-size: 1.375rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.1; }
.nrl-rival-lines { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.nrl-rival-head p { margin: 0; font-size: 0.8125rem; line-height: 1.3; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-rival-head p[data-when-behind] { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-rival-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; }
/* The squad: PLAYER · POS · AGE · OVR · SKILLS, rows open the player page (N7, #185). */
.nrl-rival-table th:nth-child(n+2):nth-child(-n+4), .nrl-rival-table td:nth-child(n+2):nth-child(-n+4) { width: 48px; }
.nrl-rival-table td { height: 34px; }
.nrl-rival-table tbody tr.nrl-rival-row { cursor: pointer; }
.nrl-rival-table tbody tr.nrl-rival-row:hover { background: rgba(255, 255, 255, 0.04); }
.nrl-rival-table tbody tr.nrl-rival-row:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
@media (pointer: coarse) { .nrl-rival-table td { height: 44px; } }
.nrl-rival-name { font-weight: 500; }
.nrl-rival-table .nrl-row-note { margin-left: 6px; }
.nrl-rival-table .nrl-row-pos { font-size: 0.9375rem; }
/* Full trait names (#349 S3) wrap inside the row rather than push the table past its box. */
.nrl-rival-table td.nrl-rival-traits { white-space: normal; line-height: 1.25; font-size: 0.75rem; color: var(--nrl-text-2); min-width: 8rem; }
/* 956×330: the club's lines tighter so five rows show. */
@media (max-height: 340px) { .nrl-rival-head h2 { font-size: 1.1875rem; } .nrl-rival-head p { font-size: 0.75rem; } }
`;

/** Open the squad sheet for `club` (over the League screen). */
export function openRivalSquad(club: RivalClub): HTMLElement {
  ensureRivalStyles();
  const rows = rivalSquadRows(club);
  const style = rivalStyle(club);
  const table = el('table', { class: 'nrl-table nrl-rival-table' });
  const head = el('tr');
  for (const [h, cls] of [['Player', ''], ['Pos', ''], ['Age', 'nrl-num'], ['Ovr', 'nrl-num'], ['Skills', '']] as const) {
    head.append(el('th', { text: h, ...(cls ? { class: cls } : {}) }));
  }
  table.append(el('thead', {}, head));
  const body = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    // A row opens the player's page (N7, #185); ◂ back brings this squad back.
    const player = club.squad?.find((p) => p.id === r.id);
    if (player) {
      tr.className = 'nrl-rival-row';
      tr.setAttribute('role', 'button');
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('data-player-open', r.id);
      const open = (): void => { openPlayerPage(player, { kind: 'rival', club }, { onClose: () => openRivalSquad(club) }); };
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
    const name = el('td', {}, el('span', { class: 'nrl-rival-name nrl-row-name', text: r.name }));
    if (r.injuredWeeks > 0) name.append(el('span', { class: 'nrl-row-note', text: `out ${r.injuredWeeks} wk` }));
    tr.append(
      name,
      el('td', { class: 'nrl-row-pos', text: posShort(r.position), attrs: { title: positionLabel(r.position) } }),
      el('td', { class: 'nrl-num', text: String(r.age) }),
      el('td', { class: 'nrl-num', text: String(r.overall) }),
      el('td', { class: 'nrl-rival-traits', text: r.traits }),
    );
    body.append(tr);
  }
  table.append(body);
  const behind = hasStaff(getState(), 'analyst') ? whenBehindLine(style) : null;
  const line = (text: string, attrs: Record<string, string>): HTMLElement => el('p', { text, attrs: { ...attrs, title: text } });
  // Between the top and the dock like a sheet (#343): the club and how it plays
  // in one header row beside the ✕, and only the squad scrolls.
  const content = el(
    'div',
    { class: 'nrl-rival-squad' },
    el('div', { class: 'nrl-rival-head' },
      el('h2', { text: club.name }),
      el('div', { class: 'nrl-rival-lines' },
        line(`Strength ${club.strength} · plays ${tacticsLabel(style)} · ${rows.length} players · tap a player for his page`, { 'data-style': `${style.attack}/${style.defence}` }),
        ...(behind ? [line(`When behind: ${behind}`, { 'data-when-behind': '' })] : []),
      ),
    ),
    rows.length > 0
      ? el('div', { class: 'nrl-rival-scroll' }, table)
      : el('p', { class: 'nrl-screen-empty', text: 'No squad on record.' }),
  );
  return openModal(content, { class: 'nrl-rival-modal', region: true, closeButton: true });
}
