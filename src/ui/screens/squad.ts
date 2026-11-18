// src/ui/screens/squad.ts — the Squad sheet's header parts and its list view (BAK-179, WU-9;
// SuperCOOKED 30–31). The header: Squad / Recruit (the main switch), the line, Pitch / List,
// and a ⋯ for the game plan, the set plays and the training focus. The pitch view is the
// Lineup screen (lineup.ts). The list: the squad by position group with each group's four
// stats, stars, fitness and where he is in the side; sorted by position, rating, fitness or
// age. A row opens the player's page, where the deals live (#336). DOM UI kit only; no Phaser.

import { button, el, hintScroll, openScreen, screenHead, segmented } from '../dom';
import { getState, type Player, type PlayerStats, type Position, type TrainingFocus } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { POSITION_GROUPS, overallRating, playerStars, shownStats, type PositionGroup } from '../../data/player';
import { DEFAULT_PLAYER_COLORS, TRAINING_FOCUS } from '../../config';
import { TRAINING_FOCI, focusLabel, setTrainingFocus } from '../../systems/training';
import {
  ensureScreenStyles, fitChips, openRecruitScreen, popMenu, posShort, tableRow, traitChips, whoCell, type PopItem,
} from './recruit';
import { openLineupScreen, openPlanSheet, openPlaysSheet, planLabel, playsLabels } from './lineup';
import { fitnessPct, openPlayerPage, positionLabel, squadNumbers } from './player';
import { contractActionView } from '../../systems/cap';
import { contractsEndingSoon, endsInTag } from '../../systems/contracts';
import { fmtMoney } from '../../utils/money';
import { PLAYER_ID } from '../../systems/fixtures';
import { kitFromColors } from '../../art/match/kit';
import { portraitDataUrl } from '../../art/portrait';
import { ensurePartsStyles, fitnessTone, starsEl, statusDot } from '../parts';

// ── Squad's segments ────────────────────────────────────────────────────────

export type SquadTab = 'squad' | 'lineup' | 'recruit';
/** SuperCOOKED 30: Squad and Recruit, the screen's main switch (orange). The pitch is the lineup. */
const SQUAD_TABS: readonly { id: 'squad' | 'recruit'; label: string; title: string }[] = [
  { id: 'squad', label: 'Squad', title: 'Your players: the side on the pitch, or the list' },
  { id: 'recruit', label: 'Recruit', title: 'Free agents' },
];

/**
 * SQUAD / RECRUIT: the segmented control at the left of the sheets' header row. Squad
 * opens the view last used (the pitch, or the list); the dock lights SQUAD for all of them.
 */
export function squadTabs(selected: SquadTab): HTMLElement {
  const on = selected === 'recruit' ? 'recruit' : 'squad';
  return segmented(SQUAD_TABS, on, (id) => (id === 'recruit' ? openRecruitScreen() : openSquadScreen()),
    { class: 'nrl-sq-tabs', label: 'Squad', main: true }).el;
}

/** The squad's view: the pitch (the side as it lines up, SuperCOOKED 30) or the list (31). */
export type SquadView = 'pitch' | 'list';
let squadView: SquadView = 'pitch';

/** PITCH / LIST: which view of the squad the sheet shows (kept between visits). */
export function squadViewSeg(selected: SquadView): HTMLElement {
  const seg = segmented<SquadView>([
    { id: 'pitch', label: 'Pitch ⊞', title: 'The side as it lines up' },
    { id: 'list', label: 'List ☰', title: 'Every player, by position group' },
  ], selected, (id) => openSquadScreen(id), { class: 'nrl-squad-view', label: 'Squad view' });
  for (const [id, b] of seg.buttons) b.setAttribute('data-squad-view', id);
  return seg.el;
}

/**
 * The header's ⋯ (Leon, 18 Nov): the game plan, the set plays and the training focus,
 * which the drawn header has no room for. Each still opens what it did on the old screens.
 */
export function squadMore(): HTMLButtonElement {
  let tray: HTMLElement | null = null;
  const btn = button('⋯', () => (tray ? close() : open()), { class: 'nrl-squad-more nrl-btn-outline' });
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Plan, plays and training');
  btn.setAttribute('data-squad-more', '');
  btn.title = 'Game plan, set plays and training focus';
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
    const plan = button(planLabel(), () => { close(); openPlanSheet(); });
    plan.setAttribute('data-plan', '');
    plan.setAttribute('aria-haspopup', 'dialog');
    plan.setAttribute('role', 'menuitem');
    plan.title = 'Attack, defence and the bench: the coach’s plan for the match';
    const labels = playsLabels();
    const plays = button('', () => { close(); openPlaysSheet(); });
    plays.append(el('span', { class: 'nrl-lineup-plays-full', text: labels.full }), el('span', { class: 'nrl-lineup-plays-short', text: labels.short }));
    plays.setAttribute('data-plays', '');
    plays.setAttribute('aria-haspopup', 'dialog');
    plays.setAttribute('role', 'menuitem');
    plays.title = `${labels.full}: the set plays you take into the match; your half calls them when they’re on`;
    // Training focus (N11): saved at once.
    const focusNow = (): TrainingFocus => getState().training?.focus ?? 'balanced';
    const focus = el('div', { class: 'nrl-squad-focus', attrs: { role: 'group', 'aria-label': 'Training focus' } },
      ...TRAINING_FOCI.map((f) => {
        const b = button(focusLabel(f), () => { setTrainingFocus(f); save(getState()); close(); });
        b.setAttribute('role', 'menuitemradio');
        b.setAttribute('aria-checked', String(f === focusNow()));
        b.setAttribute('data-focus', f);
        b.title = focusLine(f);
        b.classList.toggle('nrl-sort-active', f === focusNow());
        return b;
      }));
    const t = el('div', { class: 'nrl-pop nrl-squad-more-tray', attrs: { role: 'menu' } },
      plan, plays,
      el('div', { class: 'nrl-squad-more-label', text: `Training: ${focusLabel(focusNow())}`, attrs: { 'data-focus-menu': '' } }),
      focus,
      el('div', { class: 'nrl-pop-note', text: focusLine(focusNow()) }));
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
  return btn;
}

// ── Sorting ─────────────────────────────────────────────────────────────────

/** Canonical position order for the "by position" sort. */
const POSITION_ORDER: readonly Position[] = [
  'fullback', 'winger', 'centre', 'five-eighth', 'halfback',
  'hooker', 'prop', 'second-row', 'lock',
];

type SortKey = 'position' | 'rating' | 'fitness' | 'age';
const SORTS: readonly PopItem<SortKey>[] = [
  { id: 'position', label: 'Pos', title: 'By position' },
  { id: 'rating', label: 'Ovr', title: 'By overall rating' },
  { id: 'fitness', label: 'Fitness', title: 'Fittest first' },
  { id: 'age', label: 'Age', title: 'Youngest first' },
];

/** Return a sorted copy of the squad by the given key. Stable within groups. */
function sortSquad(squad: readonly Player[], key: SortKey): Player[] {
  const out = squad.slice();
  if (key === 'rating') out.sort((a, b) => overallRating(b) - overallRating(a));
  else if (key === 'fitness') out.sort((a, b) => fitnessPct(b) - fitnessPct(a) || overallRating(b) - overallRating(a));
  else if (key === 'age') out.sort((a, b) => a.age - b.age || overallRating(b) - overallRating(a));
  else out.sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
  return out;
}

let unsub: (() => void) | null = null;
let sortKey: SortKey = 'position';

/** Teardown run by the shared screen slot whenever this screen closes. */
function onSquadClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/** What a training focus does to the week's gains. */
export function focusLine(f: TrainingFocus): string {
  return f === 'balanced'
    ? 'Every stat trains at its usual rate. Free to change any week.'
    : `${focusLabel(f)} trains ×${TRAINING_FOCUS.ON}, every other stat ×${TRAINING_FOCUS.OFF}. Free to change any week.`;
}

/** "out 2 wk", "banned 1 wk", or null for a man who can play. */
function availabilityNote(p: Player): string | null {
  if (p.injuredWeeks > 0) return `out ${p.injuredWeeks} wk`;
  if ((p.suspendedWeeks ?? 0) > 0) return `banned ${p.suspendedWeeks} wk`;
  return null;
}

/** The list's groups, top to bottom (SuperCOOKED 31), each with its own four stats. */
const LIST_GROUPS: readonly { group: PositionGroup; label: string }[] = [
  { group: 'halves', label: 'Halves' },
  { group: 'hooker', label: 'Hooker' },
  { group: 'forwards', label: 'Forwards' },
  { group: 'outside-backs', label: 'Outside backs' },
];
/** A stat's column head (SuperCOOKED 31). */
const STAT_HEAD: Readonly<Record<keyof PlayerStats, string>> = { speed: 'Spd', strength: 'Str', stamina: 'Sta', handling: 'Hnd', kicking: 'Kck', footyIQ: 'IQ' };

/**
 * Open the squad: the pitch (the Lineup screen, under Squad) or the list, whichever was
 * last used; the pitch the first time (SuperCOOKED 30–31). Shown as a sheet above the dock.
 */
export function openSquadScreen(view?: SquadView): void {
  if (view) squadView = view;
  if (squadView === 'pitch') { openLineupScreen(); return; }
  openSquadList();
}

/**
 * The list (SuperCOOKED 31): the squad by position group, each group with its own four
 * stats (shownStats order), the training focus's stat in the accent, 80+ in green, his
 * lowest grey; stars, fitness, and where he is in the side this week. Sorted within each
 * group by position, rating, fitness or age. A row opens the player's page, where the
 * deals live (#336). Re-renders on 'state:changed'.
 */
function openSquadList(): void {
  ensureScreenStyles();
  ensurePartsStyles();
  ensureSquadStyles();

  const list = el('div', { class: 'nrl-grid-body nrl-squad-list' });
  hintScroll(list); // four whole rows of twenty looked like the squad (#610)
  const sub = el('div', { class: 'nrl-screen-sub' });

  const sort = popMenu<SortKey>({
    label: () => `Sort: ${SORTS.find((s) => s.id === sortKey)!.label}`,
    items: SORTS,
    current: () => sortKey,
    onPick: (k) => { sortKey = k; render(); },
    itemAttr: 'data-sort',
    title: 'Sort the squad',
  });
  sort.button.setAttribute('data-sort-menu', '');
  sort.button.classList.add('nrl-btn-outline');

  const render = (): void => {
    list.replaceChildren();
    const s = getState();
    // Fit and out as the game counts them (injured or banned is out); no new "knock" rule (§3.10).
    const fit = s.squad.filter((p) => p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0).length;
    const out = s.squad.length - fit;
    const wageBill = s.squad.reduce((sum, p) => sum + p.wage, 0);
    sub.replaceChildren(`${s.squad.length} players · `,
      el('span', { class: 'nrl-pos', text: `${fit} fit` }),
      ...(out ? [' · ', el('span', { class: 'nrl-squad-out', text: `${out} out` })] : []),
      ` · wages ${fmtMoney(wageBill)}/wk`);
    sub.title = `${s.squad.length} players: ${fit} fit, ${out} injured or banned · wages ${fmtMoney(wageBill)}/wk`;

    if (s.squad.length === 0) {
      list.appendChild(el('div', { class: 'nrl-screen-empty', text: 'Your squad is empty.' }));
      return;
    }
    const numbers = squadNumbers(s);
    const onBench = new Set(s.lineup.bench.filter((id): id is string => id !== null));
    const focus = s.training?.focus ?? 'balanced';
    const kit = kitFromColors(s.league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS, PLAYER_ID);
    // The dock's red dot leads here (#369): the same dot on each of those names.
    const ending = new Set(contractsEndingSoon(s).map((p) => p.id));
    const sorted = sortSquad(s.squad.map((p) => contractActionView(s, p)), sortKey);
    for (const { group, label } of LIST_GROUPS) {
      const men = sorted.filter((p) => POSITION_GROUPS[p.position] === group);
      if (!men.length) continue;
      const keys = SHOWN_BY_GROUP[group];
      list.appendChild(el('div', { class: 'nrl-squad-group', attrs: { 'aria-hidden': 'true', 'data-group': group } },
        el('span'), el('span', { class: 'nrl-squad-group-name', text: label }), el('span', { text: 'Pos' }), el('span', { text: 'Rating' }),
        ...keys.map((k) => el('span', { class: 'nrl-num-head', text: STAT_HEAD[k] })),
        el('span', { text: 'Fitness' }), el('span', { class: 'nrl-num-head', text: 'In side' })));
      for (const p of men) {
        const no = numbers.get(p.id);
        const pct = fitnessPct(p);
        const values = keys.map((k) => Math.round(p.stats[k]));
        const lowest = Math.min(...values);
        const statCells = keys.map((k, i) => {
          const v = values[i]!;
          const tone = focus === k ? 'nrl-squad-focus-stat' : v >= 80 ? 'nrl-pos' : v === lowest ? 'nrl-muted' : '';
          return el('span', { class: `nrl-num nrl-squad-stat ${tone}`.trim(), text: String(v), attrs: { title: focus === k ? `${STAT_HEAD[k]}: this week's training focus` : STAT_HEAD[k] } });
        });
        const injured = p.injuredWeeks > 0;
        const inSide = no ? (no <= 9 ? `#${no}` : 'Bench') : onBench.has(p.id) ? 'Bench' : '—';
        list.appendChild(tableRow(p, [
          el('img', { class: 'nrl-squad-face', attrs: { src: portraitDataUrl(p.id, kit), alt: '', width: '28', height: '32' } }),
          whoCell(p.name, availabilityNote(p), traitChips(p), ending.has(p.id) ? `contract ${endsInTag(p)}` : undefined),
          el('span', { class: 'nrl-row-pos', text: posShort(p.position), attrs: { title: positionLabel(p.position) } }),
          starsEl(playerStars(p), { size: 12, class: 'nrl-row-ovr' }),
          ...statCells,
          el('span', { class: 'nrl-squad-fit', attrs: { title: injured ? `Injured: out ${p.injuredWeeks} wk` : `Fitness ${pct}%: 100 less his injury risk (${p.injuryRisk})` } },
            statusDot(injured ? 'alert' : fitnessTone(pct), injured ? 'Injured' : `Fitness ${pct}%`),
            el('span', { class: 'nrl-num', text: injured ? 'OUT' : `${pct}%` })),
          el('span', { class: 'nrl-num nrl-squad-inside', text: inSide, attrs: { title: no ? (no <= 9 ? 'Starting this week' : 'On the bench this week') : 'Not in the side this week' } }),
        ], () => openPlayerPage(p, { kind: 'squad' })));
      }
    }
    fitChips(list);
    fitted = list.clientWidth;
  };
  // The phone turned or the window moved: the chips fold again for the room the cells have now (#614).
  let fitted = 0;
  const turned = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (list.clientWidth !== fitted) render(); }) : null;

  const head = screenHead('', { lead: [squadTabs('squad')], sub, controls: [squadViewSeg('list'), sort.button, squadMore()] });
  const screen = el('div', { class: 'nrl-screen nrl-sq nrl-squad' }, head, list);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onSquadClosed, 'squad');
  render();
  const off = bus.on('state:changed', render);
  turned?.observe(list);
  unsub = () => { off(); turned?.disconnect(); };
}

/** Each position group's four shown stats, in shownStats order (data/player.ts). */
const SHOWN_BY_GROUP: Readonly<Record<PositionGroup, readonly (keyof PlayerStats)[]>> = {
  halves: shownStats('halfback'),
  hooker: shownStats('hooker'),
  forwards: shownStats('prop'),
  'outside-backs': shownStats('fullback'),
};

const SQUAD_STYLE_ID = 'nrl-squad-styles';
function ensureSquadStyles(): void {
  if (document.getElementById(SQUAD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SQUAD_STYLE_ID;
  style.textContent = SQUAD_CSS;
  document.head.appendChild(style);
}

/** The list's stylesheet (SuperCOOKED 31). */
export const SQUAD_CSS = `
/* Sized for a notched phone on its side too (844 less its safe bands): the name gives way first. */
.nrl-squad .nrl-squad-list { --nrl-squad-cols: 36px minmax(7rem, 1fr) 2.75rem 5rem repeat(4, 2.5rem) 4.5rem 3.75rem; }
.nrl-squad-list > .nrl-row, .nrl-squad-group { display: grid; grid-template-columns: var(--nrl-squad-cols); align-items: center; column-gap: 8px; }
/* A row is 44 with its rule, so four of them and a group's head show at 844×390 (the layout check). */
.nrl-squad-list > .nrl-row { box-sizing: border-box; }
.nrl-squad-group { min-height: 20px; padding: 2px 4px; font-family: var(--nrl-f-num); font-size: 0.625rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--nrl-muted); position: sticky; top: 0; background: var(--nrl-sheet); z-index: 1; }
.nrl-squad-group-name { font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.1em; color: var(--nrl-text); }
.nrl-squad-group .nrl-num-head, .nrl-squad-stat, .nrl-squad-inside { text-align: right; }
.nrl-squad-face { width: 28px; height: 32px; border-radius: 6px; background: var(--nrl-raised); image-rendering: pixelated; }
.nrl-squad-stat { font-size: 0.8125rem; }
.nrl-squad-focus-stat { color: var(--nrl-accent); }
.nrl-squad-fit { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; }
.nrl-squad-inside { font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-squad-out { color: #ff6a52; }
/* A narrow phone (667): the who-cell and the stats close up; the four stats stay. */
@media (max-width: 760px) {
  .nrl-squad .nrl-squad-list { --nrl-squad-cols: 30px minmax(7rem, 1fr) 2.4rem 4.6rem repeat(4, 2.2rem) 4rem 3rem; column-gap: 4px; }
  .nrl-squad-list > .nrl-row, .nrl-squad-group { column-gap: 4px; }
}
html[data-text-size] .nrl-squad .nrl-squad-list { --nrl-squad-cols: 30px minmax(6rem, 1fr) 2.6rem 4.2rem repeat(4, 2.3rem) 4rem 3rem; }
@media (max-width: 760px) {
  html[data-text-size] .nrl-squad-list > .nrl-row, html[data-text-size] .nrl-squad-group { column-gap: 3px; }
  html[data-text-size] .nrl-squad-group { letter-spacing: 0.04em; }
}
`;
