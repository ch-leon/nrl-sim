// src/ui/screens/squad.ts — squad list screen (BAK-179, WU-9).
// Lists GameState.squad as compact rows (the shared PlayerRow), sortable by
// position or overall rating, showing injured status and the total weekly wage
// bill. A row opens the player's page, where Renew, Sell and Release live
// (#336). DOM UI kit only; no Phaser.

import { el, button, openScreen, screenHead } from '../dom';
import { getState, type Player, type Position } from '../../core/state';
import { bus } from '../../core/events';
import { save } from '../../core/save';
import { overallRating } from '../../data/player';
import { PLAYER_ID } from '../../systems/fixtures';
import { DEFAULT_PLAYER_COLORS, FEATURES, TRAINING_FOCUS } from '../../config';
import { TRAINING_FOCI, focusLabel, setTrainingFocus } from '../../systems/training';
import { openKitDesigner } from './kit';
import { kitFromColors, type Kit } from '../../art/match/kit';
import { PlayerRow, ensureScreenStyles, openRecruitScreen } from './recruit';
import { moraleWord, openPlayerPage } from './player';

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

let unsub: (() => void) | null = null;
let sortKey: SortKey = 'position';

/** Teardown run by the shared screen slot whenever this screen closes. */
function onSquadClosed(): void {
  if (unsub) { unsub(); unsub = null; }
}

/**
 * Open the squad screen. Lists the current squad as PlayerRows with injury and
 * ban badges, wage and morale; a row opens the player page. A sort toggle
 * switches between position and rating order, and the header shows the total
 * weekly wage bill. Re-renders on 'state:changed'. Idempotent; shown in the
 * shared screen region (between HUD and nav, see ui/dom.ts openScreen).
 */
export function openSquadScreen(): void {
  ensureScreenStyles();

  const body = el('div', { class: 'nrl-screen-body nrl-rows' });
  const sub = el('div', { class: 'nrl-screen-sub' });

  // Training focus (N11): what the squad trains hardest; the player page shows each man's weekly gain under it.
  const focusBtns = TRAINING_FOCI.map((f) => {
    // Saved at once, as the Lineup screen does (the game otherwise saves at the week's end or when the page hides).
    const b = button(focusLabel(f), () => {
      setTrainingFocus(f);
      save(getState());
    });
    b.setAttribute('data-focus', f);
    b.title = f === 'balanced' ? 'Every stat trains as it always has' : `${focusLabel(f)} trains ×${TRAINING_FOCUS.ON}, the rest ×${TRAINING_FOCUS.OFF}`;
    return b;
  });
  const focusRow = el(
    'div',
    { class: 'nrl-squad-focus', attrs: { style: 'display:flex;gap:0.3rem;align-items:center;overflow-x:auto;flex-shrink:0;padding:0 3px 3px 0;margin-bottom:0.3rem;' } },
    el('span', { class: 'nrl-screen-label', text: 'Training:' }),
    ...focusBtns,
  );

  const render = (): void => {
    body.replaceChildren();
    const s = getState();
    const focus = s.training?.focus ?? 'balanced';
    focusBtns.forEach((b, i) => b.classList.toggle('nrl-sort-active', TRAINING_FOCI[i] === focus));
    const wageBill = s.squad.reduce((sum, p) => sum + p.wage, 0);
    sub.textContent = `${s.squad.length} players · wages ${money(wageBill)}/wk`;

    if (s.squad.length === 0) {
      body.appendChild(el('div', { class: 'nrl-screen-empty', text: 'Your squad is empty.' }));
      return;
    }
    const kit = squadKit();
    for (const player of sortSquad(s.squad, sortKey)) {
      body.appendChild(PlayerRow(player, {
        showInjury: true,
        kit,
        extra: [`${money(player.wage)}/wk`, moraleWord(player.morale)],
        onOpen: () => openPlayerPage(player, { kind: 'squad' }),
      }));
    }
  };

  const sortPos = button('POS', () => { sortKey = 'position'; refreshSortButtons(); render(); });
  sortPos.title = 'By position';
  const sortRating = button('OVR', () => { sortKey = 'rating'; refreshSortButtons(); render(); });
  sortRating.title = 'By overall rating';

  function refreshSortButtons(): void {
    sortPos.classList.toggle('nrl-sort-active', sortKey === 'position');
    sortRating.classList.toggle('nrl-sort-active', sortKey === 'rating');
  }
  refreshSortButtons();

  const head = screenHead('Squad', {
    sub,
    controls: [
      el('span', { class: 'nrl-screen-label', text: 'Sort:' }),
      sortPos,
      sortRating,
      // Kit designer (#79), behind the cosmetic-kits flag.
      ...(FEATURES.cosmeticKits ? [button('KIT', () => openKitDesigner(), { class: 'nrl-squad-kit' })] : []),
      button('RECRUIT', () => openRecruitScreen(), { class: 'nrl-squad-recruit' }),
    ],
  });

  const screen = el('div', { class: 'nrl-screen' }, head, focusRow, body);
  // openScreen closes any other open screen (running its teardown) first.
  openScreen(screen, onSquadClosed, 'squad');
  render();
  unsub = bus.on('state:changed', render);
}
