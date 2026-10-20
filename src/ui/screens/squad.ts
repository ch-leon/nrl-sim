// src/ui/screens/squad.ts — squad list screen (BAK-179, WU-9).
// Lists GameState.squad using the shared PlayerCard, sortable by position or
// overall rating, showing injured status and the total weekly wage bill, with a
// Release action gated behind a confirm modal. DOM UI kit only; no Phaser.

import { el, button, openModal, closeModal, openScreen, closeScreen } from '../dom';
import { getState, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { overallRating } from '../../data/player';
import { releasePlayer, RELEASE_PAYOUT_WEEKS } from '../../systems/freeagency';
import { PLAYER_ID } from '../../systems/fixtures';
import { DEFAULT_PLAYER_COLORS, FEATURES, TRAINING_FOCUS } from '../../config';
import { TRAINING_FOCI, focusLabel, setTrainingFocus } from '../../systems/training';
import { openKitDesigner } from './kit';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { PlayerCard, ensureScreenStyles } from './recruit';
import { openPlayerPage } from './player';

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-AU')}`;

/** Canonical position order for the "by position" sort. */
const POSITION_ORDER: readonly Position[] = [
  'fullback', 'winger', 'centre', 'five-eighth', 'halfback',
  'hooker', 'prop', 'second-row', 'lock',
];

type SortKey = 'position' | 'rating';

/**
 * The kit the player's squad wears on the pitch: the same club colours the
 * match uses (matchday.ts sheetFor), so portraits match the match kit.
 */
export function squadKit(): Kit {
  const colors = getState().league.clubs.find((c) => c.id === PLAYER_ID)?.colors ?? DEFAULT_PLAYER_COLORS;
  return kitFromColors(colors, PLAYER_ID);
}

/** Return a sorted copy of the squad by the given key. Stable within groups. */
function sortSquad(squad: readonly Player[], key: SortKey): Player[] {
  const out = squad.slice();
  if (key === 'rating') {
    out.sort((a, b) => overallRating(b) - overallRating(a));
  } else {
    out.sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
  }
  return out;
}

const failureText = (reason?: string): string => {
  switch (reason) {
    case 'squad-min': return 'Cannot release — squad at the minimum size.';
    case 'not-found': return 'That player is not in your squad.';
    default: return 'Could not release player.';
  }
};

let unsub: (() => void) | null = null;
let sortKey: SortKey = 'position';

/** Teardown run by the shared screen slot whenever this screen closes. */
function onSquadClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/**
 * Confirm-then-release modal. Shows the payout and warns the move is permanent,
 * then calls releasePlayer on confirm and surfaces any failure via ui:notify.
 */
function confirmRelease(player: Player): void {
  const payout = RELEASE_PAYOUT_WEEKS * player.wage;
  const message = el('div', {}, el('p', {
    text: `Release ${player.name}? This pays a ${money(payout)} settlement `
      + `(${RELEASE_PAYOUT_WEEKS}×wage) and returns them to free agency.`,
  }));
  const actions = el(
    'div',
    { class: 'nrl-card-actions' },
    button('RELEASE', () => {
      const res = releasePlayer(getState(), player.id);
      closeModal();
      if (!res.ok) {
        bus.emit('ui:notify', { text: failureText(res.reason), kind: 'danger' });
      }
    }, { class: 'nrl-btn-danger' }),
    button('CANCEL', closeModal),
  );
  openModal(el('div', {}, message, actions));
}

/**
 * Open the squad screen. Lists the current squad via the shared PlayerCard with
 * injury badges and per-player Release buttons (each opens confirmRelease). A
 * sort toggle switches between position and rating order, and the header shows
 * the total weekly wage bill. Re-renders on 'state:changed'. Idempotent; shown
 * in the shared screen region (between HUD and nav, see ui/dom.ts openScreen).
 */
export function openSquadScreen(): void {
  ensureScreenStyles();

  const body = el('div', { class: 'nrl-screen-body' });
  const sub = el('div', { class: 'nrl-screen-sub' });

  // Training focus (N11): what the squad trains hardest; the player page shows each man's weekly gain under it.
  const focusBtns = TRAINING_FOCI.map((f) => {
    const b = button(focusLabel(f), () => setTrainingFocus(f));
    b.setAttribute('data-focus', f);
    b.title = f === 'balanced' ? 'Every stat trains as it always has' : `${focusLabel(f)} trains ×${TRAINING_FOCUS.ON}, the rest ×${TRAINING_FOCUS.OFF}`;
    return b;
  });
  const focusRow = el(
    'div',
    { class: 'nrl-squad-focus', attrs: { style: 'display:flex;gap:0.3rem;align-items:center;overflow-x:auto;flex-shrink:0;padding-bottom:0.3rem;' } },
    el('span', { text: 'Training:', attrs: { style: 'color:#e8e0c8;font-size:0.75rem;' } }),
    ...focusBtns,
  );

  const render = (): void => {
    body.replaceChildren();
    const s = getState();
    const focus = s.training?.focus ?? 'balanced';
    focusBtns.forEach((b, i) => b.classList.toggle('nrl-sort-active', TRAINING_FOCI[i] === focus));
    const wageBill = s.squad.reduce((sum, p) => sum + p.wage, 0);
    sub.textContent = `${s.squad.length} players · wage bill ${money(wageBill)}/wk`;

    if (s.squad.length === 0) {
      body.appendChild(el('div', { class: 'nrl-screen-empty', text: 'Your squad is empty.' }));
      return;
    }
    const kit = squadKit();
    for (const player of sortSquad(s.squad, sortKey)) {
      body.appendChild(PlayerCard(player, {
        showInjury: true,
        kit,
        onOpen: () => openPlayerPage(player, { kind: 'squad' }),
        action: {
          label: 'RELEASE',
          danger: true,
          onClick: () => confirmRelease(player),
        },
      }));
    }
  };

  const sortPos = button('POSITION', () => { sortKey = 'position'; refreshSortButtons(); render(); });
  const sortRating = button('RATING', () => { sortKey = 'rating'; refreshSortButtons(); render(); });

  function refreshSortButtons(): void {
    sortPos.classList.toggle('nrl-sort-active', sortKey === 'position');
    sortRating.classList.toggle('nrl-sort-active', sortKey === 'rating');
  }
  refreshSortButtons();

  const head = el(
    'div',
    { class: 'nrl-screen-head' },
    el('span', { class: 'nrl-screen-title', text: 'Squad' }),
    el('span', { text: 'Sort:', attrs: { style: 'color:#e8e0c8;font-size:0.75rem;' } }),
    sortPos,
    sortRating,
    // Kit designer (#79), behind the cosmetic-kits flag.
    ...(FEATURES.cosmeticKits ? [button('KIT', () => openKitDesigner(), { class: 'nrl-squad-kit' })] : []),
    button('CLOSE', closeScreen),
  );

  const screen = el('div', { class: 'nrl-screen' }, head, focusRow, sub, body);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onSquadClosed);
  render();
  unsub = bus.on('state:changed', render);
}
