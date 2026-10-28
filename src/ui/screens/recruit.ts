// src/ui/screens/recruit.ts — free-agency browser screen (BAK-179, WU-9).
// Renders GameState.freeAgents as a table (3g, Broadcast Quiet) with SIGN
// inline. Built on the DOM UI kit (src/ui/dom.ts). No Phaser imports. Also
// exports the pieces the squad screens share: their stylesheet, the trait
// chips, the fitness bar and the ▾ menu button.

import { el, button, ensureStyles, openScreen, screenHead } from '../dom';
import { getState, type Player, type TraitInstance } from '../../core/state';
import { TRAITS, traitLabel } from '../../data/traits';
import { bus } from '../../core/events';
import { overallRating } from '../../data/player';
import {
  signingFee, signingFeeBasis, weeksToPoolRefresh, FREE_AGENT_POOL_SIZE,
} from '../../systems/freeagency';
import { signWithUndo } from '../../systems/undo';
import { SQUAD_CAP } from '../../config';
import { POSITION_SHORT } from '../../systems/lineup';
import { openPlayerPage, positionLabel } from './player';
import { squadTabs } from './squad';

// ── Shared screen styling ───────────────────────────────────────────────────
// Injected once alongside the base kit CSS (which holds the sheet, the
// buttons, the segmented control). The squad and recruit tables, their chips,
// the fitness bar and the ▾ menus (3d, 3g).

const SCREEN_STYLE_ID = 'nrl-wu9-styles';

export function ensureScreenStyles(): void {
  ensureStyles();
  if (document.getElementById(SCREEN_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SCREEN_STYLE_ID;
  style.textContent = SCREEN_CSS;
  document.head.appendChild(style);
}

const SCREEN_CSS = `
/* The header row (3d, 3e, 3g): Squad's segments, a summary line, the tools on the right. */
.nrl-sq .nrl-screen-head { gap: 10px; margin-bottom: 6px; }
/* The summary gives way (ellipsis, or two lines on a narrow phone); the segments and the tools never do. */
.nrl-sq .nrl-screen-titles { align-items: center; flex: 1 1 auto; }
.nrl-sq .nrl-screen-tools { flex: 0 0 auto; max-width: 60%; }
@media (max-width: 760px) {
  .nrl-sq .nrl-screen-sub { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 0.75rem; line-height: 1.3; }
  .nrl-sq-tabs > .nrl-btn { padding: 0 10px; font-size: 0.9375rem; }
  .nrl-sq .nrl-screen-tools > .nrl-btn { padding: 0 10px; font-size: 0.875rem; }
}
.nrl-sq-tabs > .nrl-btn { padding: 0 14px; }
.nrl-sq .nrl-screen-tools > .nrl-btn { min-height: 38px; padding: 0 12px; border-radius: 8px; font-size: 0.9375rem; }
@media (pointer: coarse) { .nrl-sq .nrl-screen-tools > .nrl-btn { min-height: 44px; } }
/* A table in a sheet: a column-head row that holds still, and rows that scroll. */
.nrl-grid-head {
  flex: 0 0 auto;
  display: grid;
  align-items: center;
  height: 22px;
  font-family: var(--nrl-f-label);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nrl-muted);
  white-space: nowrap;
}
.nrl-grid-head > *, .nrl-row > * { min-width: 0; }
.nrl-grid-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 0; padding-bottom: 0; }
.nrl-row {
  pointer-events: auto;
  display: grid;
  align-items: center;
  min-height: 30px;
  border-top: 1px solid var(--nrl-button);
  font-size: 0.8125rem;
  color: var(--nrl-text);
  white-space: nowrap;
}
.nrl-row.nrl-card-open { cursor: pointer; }
.nrl-row.nrl-card-open:hover { background: rgba(255, 255, 255, 0.04); }
.nrl-card-open:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: -2px; }
/* Tappable rows are a finger tall on a touch screen. */
@media (pointer: coarse) { .nrl-row.nrl-card-open { min-height: 44px; } }
/* The name, then a knock or a ban in red, then the traits as chips; the name gives way first. */
.nrl-row-who { display: flex; align-items: center; gap: 6px; overflow: hidden; padding-right: 6px; }
.nrl-row-name { flex: 0 1 auto; min-width: 3em; font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
.nrl-row-note { flex: 0 0 auto; font-size: 0.6875rem; color: var(--nrl-neg); }
.nrl-row-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 4px; background: var(--nrl-alert); }
.nrl-chip {
  flex: 0 0 auto;
  font-family: var(--nrl-f-label);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--nrl-button);
  color: var(--nrl-text-2);
  cursor: help;
}
.nrl-chip-bad { color: var(--nrl-neg); }
.nrl-chip-academy { color: var(--nrl-accent); }
.nrl-row-pos { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 600; }
.nrl-row .nrl-num { font-weight: 500; }
.nrl-row .nrl-row-ovr { font-weight: 600; }
.nrl-row-dim { color: var(--nrl-text-2); font-size: 0.75rem; }
.nrl-row-attn { color: var(--nrl-accent); }
.nrl-row-bad { color: var(--nrl-neg); }
/* Fitness: a 72×5 bar and the %, green 85+, amber 65+, else red. */
.nrl-fit { display: flex; align-items: center; gap: 8px; }
.nrl-fit-bar { flex: 0 0 auto; width: 72px; height: 5px; border-radius: 3px; background: var(--nrl-button); overflow: hidden; }
.nrl-fit-bar > span { display: block; height: 100%; }
.nrl-fit-pct { font-family: var(--nrl-f-num); font-size: 0.75rem; }
/* 3d Squad: # · PLAYER · POS · OVR · FITNESS · TO, then wage and morale where the sheet has room. */
.nrl-squad .nrl-grid-head, .nrl-squad .nrl-row { grid-template-columns: 32px minmax(0, 1fr) 52px 44px 130px 64px 84px 84px; }
@media (max-width: 760px) {
  .nrl-squad .nrl-grid-head, .nrl-squad .nrl-row { grid-template-columns: 32px minmax(0, 1fr) 44px 40px 118px 56px; }
  .nrl-squad .nrl-sq-wide { display: none; }
}
.nrl-squad-no { color: var(--nrl-muted); }
/* 3g Recruit: PLAYER · POS · AGE · OVR · FEE · WAGE · action, rows 44 tall. */
.nrl-recruit .nrl-grid-head, .nrl-recruit .nrl-row { grid-template-columns: minmax(0, 1fr) 52px 40px 44px 84px 84px 96px; }
@media (max-width: 760px) { .nrl-recruit .nrl-grid-head, .nrl-recruit .nrl-row { grid-template-columns: minmax(0, 1fr) 40px 34px 38px 80px 72px 92px; } }
.nrl-recruit .nrl-row { min-height: 44px; }
/* Written in caps already, so a sum keeps its small k ("NEED $18k"). */
.nrl-row .nrl-row-action { min-height: 36px; min-width: 0; width: 100%; padding: 0 6px; border-radius: 8px; font-size: 0.875rem; text-transform: none; }
@media (pointer: coarse) { .nrl-row .nrl-row-action { min-height: 40px; } }
/* Can't sign: the label says why (NEED $18k, SQUAD FULL), raised and muted, not faded. */
.nrl-row .nrl-row-action:disabled { background: var(--nrl-raised); color: var(--nrl-muted); opacity: 1; }
/* The ▾ menus (sort, training): a tray under their button, over the table. */
.nrl-pop {
  position: absolute;
  z-index: 5;
  display: grid;
  gap: 4px;
  padding: 6px;
  background: var(--nrl-raised);
  border-radius: 12px;
  box-shadow: var(--nrl-shadow-tray);
  max-width: calc(100% - 28px);
  box-sizing: border-box;
}
.nrl-pop > .nrl-btn { min-height: 40px; border-radius: 8px; font-size: 0.9375rem; padding: 0 12px; text-align: left; }
@media (pointer: coarse) { .nrl-pop > .nrl-btn { min-height: 44px; } }
.nrl-pop-note { grid-column: 1 / -1; font-size: 0.75rem; line-height: 1.35; color: var(--nrl-text-2); padding: 2px 4px 0; white-space: normal; }
`;

// ── Formatting helpers ──────────────────────────────────────────────────────

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`;

/** "$18k", "$1.2M": a short sum for a button label. */
export function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(Math.ceil(n / 100_000) / 10).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `$${Math.ceil(n / 1_000)}k`;
  return `$${Math.ceil(n)}`;
}

/** Badge label + tooltip for a levelled trait (BAK-208 §3): its full name (#349 S3). Traits with a downside render in a warning tint. */
export function traitBadge(t: TraitInstance): { label: string; tip: string; bad: boolean } {
  const def = TRAITS[t.id];
  return { label: traitLabel(t), tip: `${traitLabel(t)}: ${def.blurb}`, bad: def.bad ?? false };
}

/** A player's traits as chips; a tap on one says what it does (see {@link tableRow}). */
export function traitChips(p: Player): HTMLElement[] {
  return p.traits.filter((t) => t.id in TRAITS).map((t) => {
    const b = traitBadge(t);
    // Not a button: Chrome on Android snaps a tap near a button onto it, so a tap on
    // the name would read out the trait. The row's click handler tells them apart.
    return el('span', { class: `nrl-chip${b.bad ? ' nrl-chip-bad' : ''}`, text: b.label, attrs: { title: b.tip, 'data-trait': t.id } });
  });
}

/** Fitness colour (Broadcast Quiet): 85+ green, 65+ amber, else red. */
export function fitColour(pct: number): string {
  return pct >= 85 ? 'var(--nrl-fit-good)' : pct >= 65 ? 'var(--nrl-fit-ok)' : 'var(--nrl-fit-bad)';
}

/** The 72×5 fitness bar and its %, or OUT for a man who is hurt. */
export function fitnessCell(pct: number, injured: boolean, title: string): HTMLElement {
  const fill = el('span');
  fill.style.width = `${pct}%`;
  fill.style.background = fitColour(pct);
  return el('span', { class: 'nrl-fit', attrs: { title } },
    el('span', { class: 'nrl-fit-bar' }, fill),
    el('span', { class: `nrl-fit-pct${injured ? ' nrl-row-bad' : ''}`, text: injured ? 'OUT' : `${pct}%` }));
}

/** The short position code a table shows: "FB", "SR". */
export function posShort(pos: string): string {
  return POSITION_SHORT[pos as keyof typeof POSITION_SHORT] ?? positionLabel(pos);
}

// ── Table rows ──────────────────────────────────────────────────────────────

/** A table's column heads (the grid columns come from the screen's CSS). */
export function gridHead(cols: readonly (string | [string, string])[]): HTMLElement {
  return el('div', { class: 'nrl-grid-head', attrs: { 'aria-hidden': 'true' } },
    ...cols.map((c) => (typeof c === 'string' ? el('span', { text: c }) : el('span', { class: c[1], text: c[0] }))));
}

/**
 * One player in a table row: the cells the screen passes in. Tapping the row
 * opens his page (N7, #185); a tap on a trait chip says what the trait does,
 * in the toast lane, instead. The name cell carries .nrl-row-name.
 */
export function tableRow(p: Player, cells: Node[], onOpen: () => void): HTMLElement {
  const row = el('div', {
    class: 'nrl-row nrl-card-open',
    attrs: { 'data-row-player': p.id, 'data-player-open': p.id, role: 'button', tabindex: '0', 'aria-label': `${p.name}: player page` },
  }, ...cells);
  row.addEventListener('click', (e) => {
    const trait = e.target instanceof Element ? e.target.closest('[data-trait]') : null;
    if (trait) bus.emit('ui:notify', { text: trait.getAttribute('title') ?? '', kind: 'info' });
    else onOpen();
  });
  row.addEventListener('keydown', (e) => {
    if (e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); }
  });
  return row;
}

/**
 * The name cell: name, an optional alert dot (#369: a contract ending, the
 * dock's dot leads here; `alert` is what it reads out), an optional note in red
 * (a knock, a ban), then chips.
 */
export function whoCell(name: string, note: string | null, chips: HTMLElement[], alert?: string): HTMLElement {
  return el('span', { class: 'nrl-row-who' },
    el('span', { class: 'nrl-row-name', text: name }),
    ...(alert ? [el('span', { class: 'nrl-row-dot', attrs: { title: alert, 'aria-label': alert, role: 'img', 'data-row-alert': '' } })] : []),
    ...(note ? [el('span', { class: 'nrl-row-note', text: note })] : []),
    ...chips);
}

// ── The ▾ menu ──────────────────────────────────────────────────────────────

export interface PopItem<T extends string> { id: T; label: string; title?: string }

/**
 * A header button ("SORT: OVR ▾") that opens a small tray of choices under it,
 * over the sheet; the picked one is yellow. A tap outside or a pick closes it.
 * `cols` lays the choices out in a grid; `note` is a line under them. The
 * tray holds `trayClass` and each choice `itemAttr`=id, for hooks.
 */
export function popMenu<T extends string>(opts: {
  label: () => string;
  items: readonly PopItem<T>[];
  current: () => T;
  onPick: (id: T) => void;
  cols?: number;
  note?: () => string;
  trayClass?: string;
  itemAttr?: string;
  title?: string;
}): { button: HTMLButtonElement; refresh: () => void } {
  let tray: HTMLElement | null = null;
  const btn = button('', () => (tray ? close() : open()));
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  if (opts.title) btn.title = opts.title;
  const refresh = (): void => { btn.textContent = `${opts.label()} ▾`; };
  const outside = (e: Event): void => {
    if (tray && e.target instanceof Node && !tray.contains(e.target) && !btn.contains(e.target)) close();
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
  function close(): void {
    tray?.remove();
    tray = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', onKey);
  }
  function open(): void {
    const host = btn.closest('.nrl-screen') as HTMLElement | null;
    if (!host) return;
    const cur = opts.current();
    const t = el('div', { class: `nrl-pop${opts.trayClass ? ` ${opts.trayClass}` : ''}`, attrs: { role: 'menu' } });
    t.style.gridTemplateColumns = `repeat(${opts.cols ?? 1}, minmax(0, auto))`;
    for (const it of opts.items) {
      const b = button(it.label, () => { close(); opts.onPick(it.id); refresh(); });
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(it.id === cur));
      if (opts.itemAttr) b.setAttribute(opts.itemAttr, it.id);
      if (it.title) b.title = it.title;
      b.classList.toggle('nrl-sort-active', it.id === cur);
      t.append(b);
    }
    if (opts.note) t.append(el('div', { class: 'nrl-pop-note', text: opts.note() }));
    const hr = host.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    t.style.top = `${Math.round(br.bottom - hr.top + 4)}px`;
    t.style.right = `${Math.max(14, Math.round(hr.right - br.right))}px`;
    host.append(t);
    tray = t;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', onKey);
  }
  refresh();
  return { button: btn, refresh };
}

// ── Recruit screen ──────────────────────────────────────────────────────────

type RecruitSort = 'rating' | 'fee' | 'age';
const RECRUIT_SORTS: readonly PopItem<RecruitSort>[] = [
  { id: 'rating', label: 'OVR', title: 'Best first' }, { id: 'fee', label: 'Fee', title: 'Cheapest first' }, { id: 'age', label: 'Age', title: 'Youngest first' },
];

let unsub: (() => void) | null = null;
let recruitSort: RecruitSort = 'rating';

/** Teardown run by the shared screen slot whenever this screen closes. */
function onRecruitClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/**
 * Open the recruit / free-agency screen (3g): Squad's segments, when the pool
 * changes and what the club can spend, then the free agents as a table, each
 * with SIGN inline that calls signPlayer. A man the club cannot have says why
 * on the button: NEED $18k (the fee is more than the bank) or SQUAD FULL (at
 * SQUAD_CAP); on a failed sign the reason is a 'ui:notify' toast. Sorted by
 * rating, fee or age; a row opens the player page. Re-renders on every
 * 'state:changed' so signings drop out of the list live. Idempotent —
 * reopening replaces the existing instance.
 */
export function openRecruitScreen(): void {
  ensureScreenStyles();

  const list = el('div', { class: 'nrl-grid-body nrl-screen-body' });
  const sub = el('div', { class: 'nrl-screen-sub' });
  const sort = popMenu<RecruitSort>({
    label: () => `Sort: ${RECRUIT_SORTS.find((s) => s.id === recruitSort)!.label}`,
    items: RECRUIT_SORTS,
    current: () => recruitSort,
    onPick: (k) => { recruitSort = k; render(); },
    itemAttr: 'data-sort',
    title: 'Sort the free agents',
  });
  sort.button.setAttribute('data-sort-menu', '');

  const render = (): void => {
    list.replaceChildren();
    const s = getState();
    // R2 (#349): when the pool changes, in Advance Weeks.
    const n = weeksToPoolRefresh(s.week);
    const when = n === 1 ? 'after this week' : `in ${n} weeks`;
    sub.textContent = `Free agents · new players ${when} · squad ${s.squad.length}/${SQUAD_CAP} · bank ${money(s.money)}`;
    sub.title = `A pool of ${FREE_AGENT_POOL_SIZE}; new players arrive ${when}. Squad ${s.squad.length} of ${SQUAD_CAP}. Bank ${money(s.money)}.`;
    if (s.freeAgents.length === 0) {
      list.appendChild(el('div', { class: 'nrl-screen-empty', text: 'No free agents available. New players arrive when the pool refreshes.' }));
      return;
    }
    const full = s.squad.length >= SQUAD_CAP;
    const agents = s.freeAgents.map((p) => ({ p, fee: signingFee(s, p), ovr: overallRating(p) }));
    agents.sort((a, b) => (recruitSort === 'fee' ? a.fee - b.fee : recruitSort === 'age' ? a.p.age - b.p.age : b.ovr - a.ovr) || b.ovr - a.ovr);
    for (const { p: agent, fee, ovr } of agents) {
      const short = fee - s.money;
      // The signing fee: a transfer-style fee by rating and age (#146).
      const action = button(full ? 'SQUAD FULL' : short > 0 ? `NEED ${shortMoney(short)}` : 'SIGN', () => {
        const res = signWithUndo(agent.id); // "Signed …" with a 5-second Undo (#370)
        if (!res.ok) bus.emit('ui:notify', { text: signFailureText(res.reason), kind: 'info' });
      }, { class: `nrl-row-action${full || short > 0 ? '' : ' nrl-btn-primary'}` });
      action.addEventListener('click', (e) => e.stopPropagation());
      action.disabled = full || short > 0;
      action.title = full
        ? `Squad full (${SQUAD_CAP}): release or sell a player first`
        : short > 0
          ? `The ${money(fee)} fee is ${money(short)} more than the bank`
          : `Signing fee ${money(fee)} (${signingFeeBasis(s, agent)}), then ${money(agent.wage)}/wk`;
      const chips = traitChips(agent);
      if (agent.junior) chips.unshift(el('span', { class: 'nrl-chip nrl-chip-academy', text: 'Academy', attrs: { title: 'Academy prospect: a 4×wage fee' } }));
      list.appendChild(tableRow(agent, [
        whoCell(agent.name, null, chips),
        el('span', { class: 'nrl-row-pos', text: posShort(agent.position), attrs: { title: positionLabel(agent.position) } }),
        el('span', { class: 'nrl-num', text: String(agent.age) }),
        el('span', { class: 'nrl-num nrl-row-ovr', text: String(ovr), attrs: { title: 'Overall rating' } }),
        el('span', { class: 'nrl-num', text: money(fee), attrs: { title: `Signing fee (${signingFeeBasis(s, agent)})` } }),
        el('span', { class: 'nrl-num nrl-row-dim', text: money(agent.wage), attrs: { title: 'Weekly wage' } }),
        action,
      ], () => openPlayerPage(agent, { kind: 'freeAgent' })));
    }
  };

  const head = screenHead('', { lead: [squadTabs('recruit')], sub, controls: [sort.button] });
  const screen = el('div', { class: 'nrl-screen nrl-sq nrl-recruit' }, head,
    gridHead(['Player', 'Pos', 'Age', 'Ovr', 'Fee', 'Wage', '']), list);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onRecruitClosed, 'recruit');
  render();
  unsub = bus.on('state:changed', render);
}

/** Map a signPlayer failure reason to player-facing copy. */
function signFailureText(reason?: string): string {
  switch (reason) {
    case 'squad-full': return 'Squad is full — release a player first.';
    case 'insufficient-funds': return 'Not enough money for the signing fee.';
    case 'not-found': return 'That free agent is no longer available.';
    default: return 'Could not sign player.';
  }
}
