// src/ui/portrait.ts — the menus on a phone held upright (#350 P1, Leon's Option B).
//
// Upright, every menu works: the title, the sheets the five tabs and Office
// open, the dialogs and the match report. The live match and the grounds need
// landscape (orientation.ts's gate covers them with the rotate card). Home, which
// in landscape is the grounds, is the Club home sheet upright (screens/clubHome.ts):
// whenever nothing is over the grounds on an upright phone, it opens, unless the
// player asked to see the grounds (its "See the grounds", which brings up the card).
//
// What is on screen is read from what the rest of the UI already shows: the open
// sheet (dom.ts), Office's sheet, a dialog, the facility card, placement mode
// (world/placement.ts) and the match overlay's body classes (matchOverlay.ts). The
// rules are pure and unit-tested; the wiring below is thin. No Phaser.
//
// The portrait layout is all in PORTRAIT_CSS, inside the portrait media query, so
// landscape (and desktop windows of any shape) lay out exactly as before.

import { bus } from '../core/events';
import { activeScreen, closeScreen, dialogOpen, ensureStyles, getRoot, onScreenChange, screenKey } from './dom';
import { onPlacementMode, type PlacementMode } from '../world/placement';
import { MATCH_ACTIVE_CLASS, MATCH_FINAL_CLASS } from './screens/matchOverlay';
import { PORTRAIT_QUERY, type LandscapeGuard, type OrientationView } from './orientation';
import { CLUB_HOME_KEY } from './screens/clubHome';

/** What the UI shows right now, as far as orientation goes. */
export interface ViewFacts {
  /** A match was kicked off and its overlay isn't up yet (the scene can wait on the loop). */
  matchStarting: boolean;
  /** The match overlay is up (live, half time, the pause sheet, full time). */
  matchActive: boolean;
  /** Full time: the match report's card is up (a menu). */
  matchFinal: boolean;
  /** Placing or moving a building. */
  placing: boolean;
  /** A building's card over the grounds. */
  facility: boolean;
  /** A sheet is open (Club home counts). */
  screen: boolean;
  /** Office's tiles are up. */
  office: boolean;
  /** A dialog is up (a decision, the weekly summary, a confirm). */
  dialog: boolean;
}

/** Which view `f` is (orientation.ts's gate decides whether it needs the phone sideways). Pure. */
export function currentView(f: ViewFacts): OrientationView {
  if (f.matchFinal) return 'menu';
  if (f.matchStarting || f.matchActive) return 'match';
  if (f.placing) return 'placement';
  if (f.facility) return 'facility';
  if (f.screen || f.office || f.dialog) return 'menu';
  return 'grounds';
}

/**
 * Whether the Club home sheet should open: upright, on the bare grounds, unless the
 * player asked to see them. Pure.
 */
export function wantsClubHome(f: ViewFacts, upright: boolean, groundsAsked: boolean): boolean {
  return upright && !groundsAsked && currentView(f) === 'grounds';
}

/** Handle to the portrait wiring. */
export interface PortraitMenus {
  /** Re-read the view now: open or close Club home and show or hide the card. */
  sync(): void;
  /** "See the grounds": close Club home and bring the rotate card up. */
  seeGrounds(): void;
  /** The card's ◂ Back over the grounds: Club home again. */
  backToMenus(): void;
}

/**
 * Wire the menus' portrait behaviour: Club home as home upright, the rotate card
 * for the landscape-only views. `openClubHome` opens the sheet (main.ts passes
 * its dependencies). Call once the save is loaded.
 */
export function initPortraitMenus(guard: LandscapeGuard, openClubHome: () => void): PortraitMenus {
  let mode: PlacementMode | null = null;
  let matchStarting = false;
  let groundsAsked = false;
  let queued = false;

  const facts = (): ViewFacts => {
    const body = document.body.classList;
    return {
      matchStarting,
      matchActive: body.contains(MATCH_ACTIVE_CLASS),
      matchFinal: body.contains(MATCH_FINAL_CLASS),
      placing: mode !== null,
      facility: document.querySelector('.nrl-facility-backdrop') !== null,
      screen: activeScreen() !== null,
      office: document.querySelector('.nrl-nav-sheet:not([hidden])') !== null,
      dialog: dialogOpen(),
    };
  };

  const sync = (): void => {
    queued = false;
    const upright = guard.upright();
    if (!upright) {
      groundsAsked = false;
      // Sideways, home is the grounds again.
      if (screenKey() === CLUB_HOME_KEY) closeScreen();
    } else if (wantsClubHome(facts(), upright, groundsAsked)) {
      openClubHome();
    }
    guard.refresh();
  };
  // A screen closing on its way to another (dom.ts's slot) reads as "none open" for a
  // moment: wait for the change to settle before opening Club home under it.
  const later = (): void => {
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  };

  guard.setView(() => currentView(facts()));

  onScreenChange((key) => {
    // Any other sheet opening means the player is back in the menus.
    if (key !== null && key !== CLUB_HOME_KEY) groundsAsked = false;
    later();
  });
  onPlacementMode((m) => {
    mode = m;
    later();
  });
  bus.on('match:started', () => {
    matchStarting = true;
    later();
  });
  // Belt and braces: the overlay mounting clears it (below), and so does the match ending or parking.
  for (const ev of ['match:parked', 'match:finished'] as const) {
    bus.on(ev, () => {
      matchStarting = false;
      later();
    });
  }
  // The match overlay's classes on <body>; dialogs and the facility card come and go in #ui-root;
  // Office's sheet shows and hides in place.
  new MutationObserver(() => {
    if (document.body.classList.contains(MATCH_ACTIVE_CLASS)) matchStarting = false;
    later();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(later).observe(getRoot(), { childList: true });
  const office = document.getElementById('nrl-nav-sheet');
  if (office) new MutationObserver(later).observe(office, { attributes: true, attributeFilter: ['hidden'] });

  sync();
  return {
    sync,
    seeGrounds: () => {
      groundsAsked = true;
      closeScreen();
      sync();
    },
    backToMenus: () => {
      groundsAsked = false;
      sync();
    },
  };
}

const STYLE_ID = 'nrl-portrait-styles';

/**
 * The menus upright (#350). Every rule sits inside the portrait media query, so
 * landscape and desktop windows are untouched. Selectors start with `html:root`, and
 * the block goes in after dom.ts's sheet, so they win over the dock's own narrow-width
 * rules (`html[data-text-size] …`) and over the screens' sheets injected later.
 */
export const PORTRAIT_CSS = `
@media ${PORTRAIT_QUERY} {
  /* The grounds sleep behind the menus: show the navy page, not a stale frame (and a canvas still
     at its landscape size must not widen the page). */
  html:root #game-root { overflow: hidden; }
  html:root #game-root canvas { visibility: hidden; }

  /* The dock: a bar along the bottom, inside the safe area. One row of money, week and
     PLAY WEEK ▾ over the five tabs, which share the width; nothing wraps further. */
  html:root .nrl-dock-wrap { padding: 0; }
  html:root .nrl-dock {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    grid-template-areas: "status play" "tabs tabs";
    height: auto;
    gap: 6px 8px;
    padding: 8px calc(8px + var(--nrl-safe-r)) max(4px, var(--nrl-safe-b)) calc(8px + var(--nrl-safe-l));
    border-radius: 16px 16px 0 0;
  }
  html:root .nrl-dock-status { grid-area: status; min-width: 0; }
  html:root .nrl-dock-statusbox { padding: 0 0 0 4px; min-width: 0; }
  html:root .nrl-dock-divider, html:root .nrl-dock-spacer, html:root .nrl-dock-advance-sub, html:root .nrl-dock-week-total, html:root .nrl-nav-caret { display: none; }
  html:root .nrl-dock-money { font-size: 0.875rem; }
  /* PLAY WEEK takes what the money leaves; short of room (320 wide at Larger, a decision's count, a
     run's "WEEK 12 OF 27…" beside Stop) its words go to two lines inside the button, never under the money. */
  html:root .nrl-dock-play { grid-area: play; height: 48px; justify-self: end; min-width: 0; }
  html:root .nrl-dock-play-group { min-width: 0; }
  html:root .nrl-dock-play-group > .nrl-btn { min-height: 48px; }
  html:root .nrl-dock-advance { padding: 0 10px; min-width: 0; }
  html:root .nrl-dock-advance-label { font-size: 1rem; white-space: normal; line-height: 1.05; }
  html:root .nrl-dock-tabs {
    grid-area: tabs;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0;
  }
  html:root .nrl-dock-tabs > .nrl-btn {
    min-width: 0;
    height: 48px;
    padding: 0 2px;
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
  }
  html:root .nrl-dock-tabs > .nrl-btn > .nrl-nav-dot { position: absolute; top: 6px; right: 6px; }
  /* The grounds' chips (decisions, the board at risk) are Club home's rows upright; over Office's
     tiles a one-line chip would cut its words. */
  html:root .nrl-hub-chips { display: none; }
  /* Club home shows the money and week itself: PLAY WEEK takes the row. */
  html:root body:has([data-club-home]) .nrl-dock-status { display: none; }
  html:root body:has([data-club-home]) .nrl-dock-play { grid-column: 1 / -1; justify-self: stretch; }
  html:root body:has([data-club-home]) .nrl-dock-play-group, html:root body:has([data-club-home]) .nrl-dock-advance { flex: 1 1 auto; max-width: none; }
  html:root body:has([data-club-home]) .nrl-dock-advance { align-items: center; }

  /* Sheets, Office and the region dialogs: 8px from the edges, above the bar. */
  html:root .nrl-screen-region {
    left: calc(8px + var(--nrl-safe-l));
    right: calc(8px + var(--nrl-safe-r));
    top: calc(8px + var(--nrl-safe-t));
    bottom: calc(var(--nrl-nav-h, 0px) + 8px + var(--nrl-toast-lift, 0px));
  }
  html:root .nrl-dialog-region { top: 0; bottom: calc(var(--nrl-nav-h, 0px) + var(--nrl-toast-lift, 0px)); padding: calc(8px + var(--nrl-safe-t)) calc(8px + var(--nrl-safe-r)) 8px calc(8px + var(--nrl-safe-l)); }
  html:root .nrl-nav-sheet { left: calc(8px + var(--nrl-safe-l)); right: calc(8px + var(--nrl-safe-r)); grid-template-columns: repeat(2, minmax(0, 1fr)); }
  html:root .nrl-screen { padding: 8px 10px; }
  html:root .nrl-modal { max-width: calc(100vw - 16px); }

  /* A sheet's header (#413): the title on its own row, the controls under it, scrolling sideways. */
  html:root .nrl-screen-head { flex-wrap: wrap; row-gap: 6px; }
  html:root .nrl-screen .nrl-screen-head > .nrl-screen-tools { flex: 1 1 100%; }
  html:root .nrl-screen-tools > :first-child { margin-left: 0; }
  html:root .nrl-screen-titles { flex-wrap: wrap; row-gap: 4px; min-width: 0; }
  html:root .nrl-screen-head .nrl-screen-sub { flex: 1 1 100%; display: block; overflow: visible; min-width: 0; }

  /* The title (#350 T4): the build label follows the page instead of sitting over the setup. */
  html:root .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }

  /* Office's tiles: a status line wraps rather than cut a word. */
  html:root .nrl-office-status { white-space: normal; text-overflow: clip; }
  html:root .nrl-office-name { overflow-wrap: break-word; }

  /* Squad and Recruit (3d, 3g): two lines a row, the name over its numbers; the column heads the same. */
  html:root .nrl-grid-body > .nrl-row { flex: 0 0 auto; }
  html:root .nrl-sq .nrl-screen-tools { max-width: none; flex: 1 1 100%; }
  html:root .nrl-sq .nrl-screen-tools [data-plan] { max-width: none; }
  html:root .nrl-row-who { flex-wrap: wrap; row-gap: 2px; padding: 4px 0; overflow: visible; }
  html:root .nrl-row-name { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: break-word; }
  html:root .nrl-fit-bar { display: none; }
  html:root .nrl-grid-head { height: auto; row-gap: 2px; padding-bottom: 2px; letter-spacing: 0.04em; }
  html:root .nrl-squad .nrl-grid-head, html:root .nrl-squad .nrl-row {
    grid-template-columns: 2em repeat(4, minmax(0, 1fr));
    grid-template-areas: "no who who who who" "no pos ovr fit to";
    column-gap: 6px;
  }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(1) { grid-area: no; }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(2) { grid-area: who; }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(3) { grid-area: pos; }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(4) { grid-area: ovr; }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(5) { grid-area: fit; }
  html:root .nrl-squad :is(.nrl-grid-head, .nrl-row) > :nth-child(6) { grid-area: to; }
  html:root .nrl-recruit .nrl-grid-head, html:root .nrl-recruit .nrl-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-template-areas: "who who who act act" "pos age ovr fee wage";
    column-gap: 6px;
  }
  html:root .nrl-recruit .nrl-row { padding: 4px 0; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(1) { grid-area: who; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(2) { grid-area: pos; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(3) { grid-area: age; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(4) { grid-area: ovr; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(5) { grid-area: fee; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(6) { grid-area: wage; }
  html:root .nrl-recruit :is(.nrl-grid-head, .nrl-row) > :nth-child(7) { grid-area: act; }

  /* The season review: one column of lines, the objectives under their values. */
  html:root .nrl-review-lines { grid-template-columns: minmax(0, 1fr); }
  html:root .nrl-review-line { grid-template-columns: 6.5em minmax(0, 1fr); }
  html:root .nrl-review-objectives { margin-left: calc(6.5em + 8px); }

  /* News: the decisions waiting wrap under their count; Review a finger tall. */
  html:root .nrl-news-decisions-text { white-space: normal; overflow: visible; }
  html:root .nrl-btn.nrl-news-answer { min-height: 44px; }

  /* A rival's squad: its line under the name wraps. */
  html:root .nrl-rival-head { flex-wrap: wrap; row-gap: 2px; }
  html:root .nrl-rival-head p { flex: 1 1 100%; min-width: 0; white-space: normal; overflow: visible; }

  /* Contracts: whole names; the table scrolls sideways in its own box. */
  html:root .nrl-table.nrl-contracts-table { width: max-content; min-width: 100%; }
  html:root .nrl-contracts-table td.nrl-contract-info { max-width: none; width: auto; }
  html:root .nrl-contracts-table .nrl-contract-name { white-space: nowrap; overflow: visible; text-overflow: clip; }

  /* The player page (3f): one column, the whole card scrolling; ◂ back held at its top, the deals at its foot. */
  html:root .nrl-player, html:root .nrl-player.nrl-player-rival { display: flex; flex-direction: column; gap: 12px; min-height: auto; }
  html:root .nrl-player-card, html:root .nrl-player-side, html:root .nrl-player-about { overflow: visible; min-height: auto; }
  html:root .nrl-player-headrow { position: sticky; top: 0; }
  html:root .nrl-player-actions { position: sticky; bottom: 0; }
  html:root .nrl-dialog-region .nrl-modal.nrl-player-modal { padding: 8px 10px; }

  /* Kit & colours: the preview and its buttons over the controls; the sheet scrolls as one. */
  html:root .nrl-kit-body { flex-direction: column; overflow-y: auto; overscroll-behavior: contain; }
  html:root .nrl-kit-controls { flex: 0 0 auto; overflow: visible; }
  html:root .nrl-kit-head { flex-wrap: wrap; row-gap: 2px; }
  html:root .nrl-kit-preview { justify-content: space-around; }
  html:root .nrl-seg > .nrl-btn { min-width: 44px; }
  html:root .nrl-rename-row > .nrl-btn { flex: 0 0 auto; padding: 0 12px; }

  /* Lineup (3e): the bench and the pitch, then the list under them; the sheet scrolls as one. */
  html:root .nrl-lineup-body { grid-template-columns: minmax(0, 1fr); }
  html:root .nrl-lineup-left, html:root .nrl-lineup-right { min-height: auto; }
  html:root .nrl-lineup-bench { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  html:root .nrl-lineup-bench-label { grid-column: 1 / -1; text-align: left; padding-left: 4px; }
  html:root .nrl-lineup-bench .nrl-lineup-tile { height: 44px; }
  html:root .nrl-lineup-field { flex: 0 0 auto; min-height: 0; grid-template-rows: none; grid-auto-rows: auto; }
  html:root .nrl-lineup-line { flex-wrap: wrap; justify-content: center; }
  html:root .nrl-lineup-line[data-line] .nrl-lineup-tile { flex: 0 0 calc((100% - 8px) / 3); max-width: none; }
  html:root .nrl-lineup-tile { padding: 0 4px; }
  html:root .nrl-lineup-tile-name { text-overflow: clip; overflow-wrap: anywhere; white-space: normal; line-height: 1.05; }
  html:root .nrl-lineup-list { overflow: visible; flex: 0 0 auto; }
  html:root .nrl-lineup-row-name, html:root .nrl-lineup-row-meta, html:root .nrl-lineup-pick { white-space: normal; text-overflow: clip; }

  /* League (3h): the ladder, then the fixtures; the sheet scrolls as one, a wide ladder sideways in its box. */
  html:root .nrl-screen.nrl-league { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; overscroll-behavior: contain; }
  html:root .nrl-league-col { flex: 0 0 auto; min-height: auto; }
  html:root .nrl-ladder-scroll { overflow: auto hidden; }
  html:root .nrl-table.nrl-ladder-table { table-layout: auto; }
  html:root .nrl-ladder-club { display: block; width: 100%; min-height: 44px; }
  html:root .nrl-ladder-table td, html:root .nrl-ladder-table th.nrl-ladder-heading, html:root .nrl-ladder-club { overflow: visible; text-overflow: clip; }
  html:root .nrl-fixtures-list { overflow: visible; flex: 0 0 auto; }
  html:root .nrl-fixture-opp, html:root .nrl-fixture { white-space: normal; overflow: visible; text-overflow: clip; }
}
`;

/** Inject the portrait stylesheet once (at boot, so the title screen gets it too). */
export function ensurePortraitStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  ensureStyles();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PORTRAIT_CSS;
  document.head.appendChild(style);
}
