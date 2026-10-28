// src/ui/screens/squad.ts — squad list screen (BAK-179, WU-9; 3d Broadcast Quiet).
// Lists GameState.squad as a table: the number he wears this week, name (a
// knock or a ban in red, his traits as chips), position, overall, fitness, the
// weeks left on his deal, and the wage and morale where the sheet has room.
// Sorted by position, rating, fitness or age; the header carries Squad's
// segments (SQUAD / LINEUP / RECRUIT), the weekly wage bill and the training
// focus. A row opens the player's page, where Renew, Sell and Release live
// (#336). DOM UI kit only; no Phaser.

import { el, openScreen, screenHead, segmented } from '../dom';
import { getState, type Player, type Position, type TrainingFocus } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { overallRating } from '../../data/player';
import { MORALE, TRAINING_FOCUS } from '../../config';
import { TRAINING_FOCI, focusLabel, setTrainingFocus } from '../../systems/training';
import {
  ensureScreenStyles, fitnessCell, gridHead, openRecruitScreen, popMenu, posShort, tableRow, traitChips, whoCell, type PopItem,
} from './recruit';
import { openLineupScreen } from './lineup';
import { fitnessPct, moraleWord, openPlayerPage, positionLabel, squadNumbers } from './player';
import { contractsEndingSoon, endsInTag } from '../../systems/contracts';

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`;

// ── Squad's segments ────────────────────────────────────────────────────────

export type SquadTab = 'squad' | 'lineup' | 'recruit';
const SQUAD_TABS: readonly { id: SquadTab; label: string; title: string }[] = [
  { id: 'squad', label: 'Squad', title: 'Your players' },
  { id: 'lineup', label: 'Lineup', title: 'The nine, the bench and the plan' },
  { id: 'recruit', label: 'Recruit', title: 'Free agents' },
];

/**
 * SQUAD / LINEUP / RECRUIT: the segmented control at the left of the three
 * sheets' header row. Each segment opens its screen (the dock lights SQUAD for
 * all three).
 */
export function squadTabs(selected: SquadTab): HTMLElement {
  const open: Record<SquadTab, () => void> = { squad: openSquadScreen, lineup: openLineupScreen, recruit: openRecruitScreen };
  return segmented(SQUAD_TABS, selected, (id) => open[id](), { class: 'nrl-sq-tabs', label: 'Squad' }).el;
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

/**
 * Open the squad screen (3d). The table re-renders on 'state:changed'; the
 * sort and the training focus are ▾ menus in the header row (the focus, N11,
 * is what the squad trains hardest; the player page shows each man's weekly
 * gain under it). Idempotent; shown as a sheet above the dock (ui/dom.ts
 * openScreen).
 */
export function openSquadScreen(): void {
  ensureScreenStyles();

  const list = el('div', { class: 'nrl-grid-body' });
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

  // Training focus (N11): saved at once, as the Lineup screen does (the game otherwise saves at the week's end or when the page hides).
  const focusNow = (): TrainingFocus => getState().training?.focus ?? 'balanced';
  const training = popMenu<TrainingFocus>({
    label: () => `Training: ${focusLabel(focusNow())}`,
    items: TRAINING_FOCI.map((f) => ({ id: f, label: focusLabel(f), title: focusLine(f) })),
    current: focusNow,
    onPick: (f) => { setTrainingFocus(f); save(getState()); },
    cols: 3,
    // S5 (#351): what the picked focus does, under the choices.
    note: () => focusLine(focusNow()),
    trayClass: 'nrl-squad-focus',
    itemAttr: 'data-focus',
    title: 'What the squad trains hardest this week',
  });
  training.button.setAttribute('data-focus-menu', '');

  const render = (): void => {
    list.replaceChildren();
    const s = getState();
    training.refresh();
    training.button.title = focusLine(focusNow());
    const wageBill = s.squad.reduce((sum, p) => sum + p.wage, 0);
    sub.textContent = `${s.squad.length} players · wages ${money(wageBill)}/wk`;

    if (s.squad.length === 0) {
      list.appendChild(el('div', { class: 'nrl-screen-empty', text: 'Your squad is empty.' }));
      return;
    }
    const numbers = squadNumbers(s);
    // The dock's red dot leads here (#369): the same dot on each of those rows, its weeks in TO.
    const ending = new Set(contractsEndingSoon(s).map((p) => p.id));
    for (const p of sortSquad(s.squad, sortKey)) {
      const no = numbers.get(p.id);
      const fit = fitnessPct(p);
      const expiring = p.contractWeeks <= MORALE.EXPIRING_WEEKS;
      const unhappy = p.morale < 50;
      list.appendChild(tableRow(p, [
        el('span', { class: 'nrl-num nrl-squad-no', text: no ? String(no) : '–', attrs: { title: no ? (no <= 9 ? 'Starting this week' : 'On the bench this week') : 'Not in the side this week' } }),
        whoCell(p.name, availabilityNote(p), traitChips(p), ending.has(p.id) ? `contract ${endsInTag(p)}` : undefined),
        el('span', { class: 'nrl-row-pos', text: posShort(p.position), attrs: { title: positionLabel(p.position) } }),
        el('span', { class: 'nrl-num nrl-row-ovr', text: String(overallRating(p)), attrs: { title: 'Overall rating' } }),
        fitnessCell(fit, p.injuredWeeks > 0, p.injuredWeeks > 0 ? `Injured: out ${p.injuredWeeks} wk` : `Fitness ${fit}%: 100 less his injury risk (${p.injuryRisk})`),
        el('span', { class: `nrl-num nrl-row-dim${expiring ? ' nrl-row-attn' : ''}`, text: `${p.contractWeeks} wk`, attrs: { title: expiring ? 'Contract running down' : 'Weeks left on his contract' } }),
        el('span', { class: 'nrl-num nrl-row-dim nrl-sq-wide', text: money(p.wage), attrs: { title: 'Weekly wage' } }),
        el('span', { class: `nrl-sq-wide ${unhappy ? 'nrl-row-bad' : 'nrl-row-dim'}`, text: moraleWord(p.morale), attrs: { title: `Morale ${p.morale}` } }),
      ], () => openPlayerPage(p, { kind: 'squad' })));
    }
  };

  const head = screenHead('', { lead: [squadTabs('squad')], sub, controls: [training.button, sort.button] });
  const screen = el('div', { class: 'nrl-screen nrl-sq nrl-squad' }, head,
    gridHead(['#', 'Player', 'Pos', 'Ovr', 'Fitness', 'To', ['Wage', 'nrl-sq-wide'], ['Morale', 'nrl-sq-wide']]), list);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onSquadClosed, 'squad');
  render();
  unsub = bus.on('state:changed', render);
}
