// Title screen: three save slots side by side, and a separate step that sets up
// a new club (name, kit with a live jersey, difficulty) before Start.
//
// Built from document.createElement and one <style> element, no dom.ts helpers:
// it runs before the game's UI is up, and its tests drive it through a tiny stub
// DOM (createElement, appendChild, setAttribute, click listeners, querySelector
// on data attributes). Every hook the tests and e2e scripts use is a data-nrl-*
// attribute.

import {
  deleteSlot, downloadOriginalSave, exportRecoverySaves, getSlotSummaries, installImportedSave, listSlotMeta, pickSaveFile, setActiveSlot, type SlotSummary,
} from '../core/save';
import { cleanName, GROUND_MAX, NAME_MAX } from '../data/names';
import type { GameState } from '../core/state';
import { colorsForTown, defaultClubName, foldTown, groundForTown, townColorsAllowed, townHash, type Town } from '../data/townSetup';
import { buildLabel } from './buildInfo';
import {
  DEFAULT_DIFFICULTY, DEFAULT_PLAYER_COLORS, DIFFICULTIES, PLAYER_PRIMARY_COLORS,
  PLAYER_SECONDARY_COLORS, isValidColorPair, type Difficulty,
} from '../config';
import { kitFromColors } from '../art/match/kit';
import { LOOKS, drawPlayerFrame } from '../art/match/players';
import { encodeCanvas } from '../art/portrait';
import { PLAYER_ID } from '../systems/fixtures';
import { BRAND, type Brand } from '../brand';
import { COLOR_TOKENS } from './tokens';
import { commercialEnabled } from '../commercial/flags';
import { openLoginDialog, openPaywall } from './screens/paywall';
import { listenForPress, MOTION_CSS } from './dom';

export interface TitleChoice {
  mode: 'continue' | 'new';
  clubName?: string;
  coachName?: string;
  openAll?: boolean;
  difficulty?: Difficulty;
  colors?: [string, string];
  seed?: number;
  home?: GameState['home'];
  groundName?: string;
}

const DEFAULT_CLUB_NAME = 'Cavehole Crushers';

const COLOR_NAMES: Record<string, string> = {
  '#f4d03f': 'Gold', '#c0392b': 'Crimson', '#2e6fd8': 'Royal blue', '#e67e22': 'Orange',
  '#8e44ad': 'Purple', '#16a0b8': 'Teal', '#ecf0f1': 'White', '#ffffff': 'White', '#1a1a2e': 'Navy-black',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'More money, cheaper wages, rivals a step slower.',
  normal: "The game as it's meant to be played.",
  hard: 'Less money, dearer wages, sharper rivals.',
};

// The overlay scrolls when its content is taller than the screen; the auto
// margins on .nrl-title-main centre it only while it fits (justify-content:center
// would push the top of tall content out of reach). Safe-area insets pad every
// side (#347): with the phone turned either way the notch takes one of them. The
// insets come through the frame's --nrl-safe-* (dom.ts) where they are set, env()
// before the frame's stylesheet is in.
export const TITLE_CSS = `
${MOTION_CSS}
.nrl-title { position: absolute; inset: 0; pointer-events: auto; overflow-y: auto; overscroll-behavior: contain;
  display: flex; flex-direction: column; align-items: center; box-sizing: border-box;
  padding: calc(12px + var(--nrl-safe-t, env(safe-area-inset-top, 0px))) calc(12px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)))
    calc(24px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))) calc(12px + var(--nrl-safe-l, env(safe-area-inset-left, 0px)));
  background: radial-gradient(ellipse at 50% 120%, #1b3a2a 0%, #0e1630 60%) #0e1630; color: #fff;
  font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 0.875rem; }
.nrl-title * { box-sizing: border-box; }
/* Controls, as in the game's sheet (#604): no browser tap box, no long-press selection or callout, no double-tap zoom. */
.nrl-title, .nrl-title * { -webkit-tap-highlight-color: transparent; }
.nrl-title :is(button, label) { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }
.nrl-title-main { margin: auto 0; width: 100%; max-width: 880px; display: flex; flex-direction: column; gap: 14px; }
.nrl-title h1 { margin: 0; text-align: center; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-style: italic;
  font-weight: 700; font-size: 3rem; letter-spacing: 0.06em; line-height: 1; }
.nrl-title h1::after { content: 'Club manager'; display: block; margin-top: 6px; font-style: normal; font-size: 0.8125rem;
  font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: #f4d03f; }
.nrl-title-logo { display: block; margin: 0 auto; max-width: min(70vw, 360px); max-height: 72px; object-fit: contain; }
.nrl-title-parent { margin: -8px 0 0; text-align: center; font-size: 0.75rem; letter-spacing: 0.08em; color: ${COLOR_TOKENS.muted}; }
.nrl-title-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: 10px; }
.nrl-title-card { border-radius: 14px; background: rgba(27, 38, 74, 0.95); padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px; min-width: 0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); }
.nrl-title-slotno { font-family: 'Barlow Condensed', sans-serif; font-size: 0.8125rem; font-weight: 600; color: #9aa6c7;
  letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-title-club { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.375rem; line-height: 1.1; overflow-wrap: anywhere; }
.nrl-title-card[data-empty] .nrl-title-club { color: #9aa6c7; font-weight: 600; }
.nrl-title-when { font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #c9d1ea; min-height: 1.2em; }
.nrl-title-warn { font-size: 0.75rem; color: #f0a39b; }
.nrl-title-actions { margin-top: auto; padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-title-btn { min-height: 44px; padding: 0 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase; color: #fff; cursor: pointer;
  background: #1f2b55; border: 0; border-radius: 10px; flex: 1 1 0; white-space: nowrap;
  transition: background-color var(--nrl-dur-press) ease; }
/* Hover for a mouse only; a press takes the same fill and shrinks a little (#604), and snaps back. */
@media (hover: hover) and (pointer: fine) { .nrl-title-btn:hover { background: #283669; } }
.nrl-title-btn:active:not(:disabled) { background: #283669; transform: scale(var(--nrl-press));
  transition: background-color var(--nrl-dur-press) ease, transform var(--nrl-dur-press) var(--nrl-ease-out); }
.nrl-title-btn:focus-visible { outline: 2px solid #f4d03f; outline-offset: 2px; }
.nrl-title-btn-go, .nrl-title-btn-go:hover { background: #f4d03f; color: #0e1630; flex-basis: 100%; }
.nrl-title-btn-go:active:not(:disabled) { background: #f7da5e; }
/* A slot's own Continue or New game when another slot holds the screen's one yellow (#613). */
.nrl-title-btn-row { flex-basis: 100%; }
/* Disabled stays visible and its label says why (#613). Two lines fit the narrow Start column. */
.nrl-title-btn:disabled, .nrl-title-btn:disabled:hover { background: #1b264a; color: #9aa6c7; cursor: default;
  white-space: normal; line-height: 1; }
.nrl-title-btn-small { font-size: 0.875rem; padding: 0 8px; }
.nrl-title-btn[data-nrl-delete-1], .nrl-title-btn[data-nrl-delete-2], .nrl-title-btn[data-nrl-delete-3] { color: #f0a39b; }
.nrl-title-btn[data-armed], .nrl-title-btn[data-armed]:active:not(:disabled) { background: #5a2430; color: #fff; }
.nrl-title-foot { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.nrl-title-foot .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-notice { color: #f0a39b; font-size: 0.8125rem; max-width: 360px; text-align: center; }
.nrl-title-build { position: fixed; right: calc(8px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)));
  bottom: calc(4px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); pointer-events: none; color: #9aa6c7;
  font-family: 'IBM Plex Mono', monospace; font-size: 0.6875rem; }
.nrl-title-head { display: flex; align-items: center; gap: 12px; }
.nrl-title-head .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-head h2 { margin: 0; font-family: 'Barlow Condensed', sans-serif; font-size: 1.375rem; font-weight: 700;
  letter-spacing: 0.02em; text-transform: uppercase; flex: 1; min-width: 0; }
.nrl-title-setup { display: grid; grid-template-columns: 9rem minmax(0, 1fr); grid-template-areas: "kit form" "veteran form" "start form"; grid-template-rows: min-content min-content 1fr;
  gap: 10px 16px; align-items: start; padding: 14px; border-radius: 16px; background: rgba(14, 22, 48, 0.97);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); }
.nrl-title-kit { grid-area: kit; margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 6px; border-radius: 10px; background: #141d3a; text-align: center; font-size: 0.75rem; color: #9aa6c7; }
.nrl-title-kit img { width: 84px; height: 90px; image-rendering: pixelated; }
.nrl-title-form { grid-area: form; display: flex; flex-direction: column; gap: 8px; min-width: 0;
  max-height: calc(100dvh - 110px - var(--nrl-safe-t, env(safe-area-inset-top, 0px)) - var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); }
/* Details scroll on short phones; difficulty guidance and Start stay in view. A drag past the
   list's end stays in the list (#609): chained to the screen, it slid BACK and the heading off the top. */
.nrl-title-details { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 3px; }
.nrl-title-details > *, .nrl-title-form > :not(.nrl-title-details) { flex-shrink: 0; }
.nrl-title-names { display: flex; flex-direction: column; gap: 8px; }
.nrl-title-veteran { grid-area: veteran; display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 0.8125rem; cursor: pointer; }
.nrl-title-veteran input { width: 20px; height: 20px; flex: 0 0 auto; }
.nrl-title-go { grid-area: start; display: flex; flex-direction: column; gap: 6px; }
.nrl-title-go .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-confirm { font-size: 0.8125rem; color: #f4d03f; }
.nrl-title-field { display: flex; align-items: center; gap: 10px; }
.nrl-title-field > span { flex: 0 0 5.5rem; font-family: 'Barlow Condensed', sans-serif; font-size: 0.8125rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: #9aa6c7; text-align: right; }
.nrl-title-swatches { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.nrl-title-swatches .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-swatch { width: 32px; height: 32px; padding: 0; border: 2px solid rgba(255, 255, 255, 0.15); border-radius: 8px; cursor: pointer; }
.nrl-title-swatch[aria-pressed="true"] { border-color: #0e1630; box-shadow: 0 0 0 2px #f4d03f; }
.nrl-title-swatch:disabled { opacity: 0.25; cursor: default; }
.nrl-title-swatch:active:not(:disabled) { transform: scale(var(--nrl-press)); transition: transform var(--nrl-dur-press) var(--nrl-ease-out); }
.nrl-title-pick { background: #1b264a; }
.nrl-title-difficulty-copy { margin: 0; font-size: 0.8125rem; line-height: 1.3; color: #c9d1ea; }
.nrl-title-difficulty-hint { color: #f4d03f; }
.nrl-title-pick[aria-pressed="true"], .nrl-title-pick[aria-pressed="true"]:hover, .nrl-title-pick[aria-pressed="true"]:active:not(:disabled) { background: #f4d03f; color: #0e1630; }
.nrl-title-input { min-height: 44px; padding: 0 12px; font: inherit; font-size: 1rem; flex: 1; min-width: 0; color: #fff;
  background: #1b264a; border: 2px solid #26325c; border-radius: 10px; }
.nrl-title-input:focus { outline: none; border-color: #f4d03f; }
/* A name box and, while the name won't do, why (#616): the rename field's rule and words. */
.nrl-title-entry { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrl-title-entry > .nrl-title-input { flex: 0 0 auto; }
.nrl-title-input[aria-invalid="true"] { border-color: #f0a39b; }
.nrl-title-why { font-size: 0.6875rem; line-height: 1.2; color: #f0a39b; }
.nrl-title-why:empty { display: none; }
@media (pointer: coarse) { .nrl-title-swatch { width: 44px; height: 44px; } }
@media (max-height: 500px) and (min-width: 521px) {
  /* Keep the coarse-pointer swatches on one row at 667px, leaving room for both guidance lines. */
  .nrl-title-setup { padding: 10px; grid-template-columns: 7rem minmax(0, 1fr); }
  .nrl-title-form { gap: 6px; }
  .nrl-title-names { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .nrl-title-names .nrl-title-field { flex-direction: column; align-items: stretch; gap: 2px; min-width: 0; }
  .nrl-title-names .nrl-title-field > span { flex: 0 0 auto; text-align: left; }
  /* While Start over asks, the jersey makes room for the question and both buttons. */
  .nrl-title-setup:has(.nrl-title-confirm) { grid-template-areas: "start form"; }
  .nrl-title-setup:has(.nrl-title-confirm) .nrl-title-kit { display: none; }
}
@media (max-height: 500px) {
  .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }
  .nrl-title h1 { font-size: 2.125rem; }
  .nrl-title h1::after { margin-top: 4px; font-size: 0.6875rem; }
  .nrl-title-logo { max-height: 48px; }
  .nrl-title-parent { margin-top: -6px; font-size: 0.6875rem; }
  .nrl-title-main { gap: 10px; }
  .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }
}
@media (max-height: 500px) {
  .nrl-title-kit { padding: 6px; }
  .nrl-title-kit img { width: 56px; height: 60px; }
  .nrl-title-kit-note { display: none; }
  .nrl-title-setup:has(.nrl-title-confirm) { grid-template-areas: "veteran form" "start form"; }
  .nrl-title-setup:has(.nrl-title-confirm) .nrl-title-kit { display: none; }
  /* Start over? and its two buttons in a row, so Cancel stays on screen under the kit. */
  .nrl-title-go:has(.nrl-title-confirm) { flex-direction: row; flex-wrap: wrap; }
  .nrl-title-go .nrl-title-confirm { flex: 1 1 100%; }
  .nrl-title-go:has(.nrl-title-confirm) .nrl-title-btn { flex: 1 1 0; padding: 0 8px; }
}
@media (max-height: 340px) {
  .nrl-title { padding-bottom: calc(18px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); }
  .nrl-title-main { gap: 6px; }
  /* The compact left column keeps Start and the veteran switch above the fold. */
  .nrl-title-kit { display: none; }
  .nrl-title-form { gap: 6px; }
  .nrl-title-setup { padding: 10px; gap: 6px 16px;
    grid-template-areas: "start form" "veteran form"; grid-template-rows: max-content 1fr; }
  .nrl-title-confirm { font-size: 0.75rem; line-height: 1.25; }
  /* Start over keeps the same two rows, including room for Cancel. */
  .nrl-title-setup:has(.nrl-title-confirm) { grid-template-areas: "start form" "veteran form"; }
  .nrl-title-setup:has(.nrl-title-confirm) .nrl-title-kit { display: none; }
}
/* An iPhone SE on its side (568×320, #350 T1): the setup scrolls, so the build label follows it
   instead of sitting in the corner over the panel. Landscape only: portrait is #350 P1's. */
@media (max-width: 600px) and (orientation: landscape) {
  .nrl-title-build { position: static; align-self: flex-end; margin-top: 8px; }
}
@media (max-width: 520px) {
  /* Give the veteran switch room without pushing Start under the home indicator. */
  .nrl-title-kit { padding: 6px; }
  .nrl-title-kit img { width: 48px; height: 52px; }
  .nrl-title-kit-note { display: none; }
  .nrl-title-setup { grid-template-columns: 5rem minmax(0, 1fr);
    grid-template-areas: "kit veteran" "form form" "start start"; }
  .nrl-title-form { max-height: calc(100dvh - 280px - var(--nrl-safe-t, env(safe-area-inset-top, 0px)) - var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); }
  .nrl-title-field { flex-wrap: wrap; }
  .nrl-title-field > span { flex-basis: 100%; text-align: left; }
}
`;

// The commercial entries' row (#364), added to the sheet with the commercial flag on only.
const TITLE_COMMERCIAL_CSS = `
.nrl-title-buy { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.nrl-title-buy .nrl-title-btn { flex: 0 0 auto; }
`;

function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.setAttribute('class', cls);
  if (text !== undefined) e.textContent = text;
  return e;
}

function mkButton(label: string, dataAttr: string, cls = ''): HTMLButtonElement {
  const b = mk('button', `nrl-title-btn${cls ? ` ${cls}` : ''}`, label);
  b.type = 'button';
  b.setAttribute(dataAttr, '');
  return b;
}

/**
 * The title's heading (#363): the brand's logo (its title text today, or an image
 * from public/), then the parent-brand line when the brand shows it.
 */
export function titleHeading(brand: Brand = BRAND): HTMLElement[] {
  const h1 = mk('h1', 'nrl-title-name');
  if (brand.logo.kind === 'image') {
    const img = mk('img', 'nrl-title-logo');
    img.setAttribute('src', `${import.meta.env.BASE_URL}${brand.logo.src}`);
    img.setAttribute('alt', brand.name);
    h1.appendChild(img);
  } else {
    h1.textContent = brand.titleText;
  }
  const out: HTMLElement[] = [h1];
  if (brand.parentBrand.show) {
    const line = mk('p', 'nrl-title-parent', `a ${brand.parentBrand.name} game`);
    line.setAttribute('data-nrl-parent-brand', '');
    out.push(line);
  }
  return out;
}

/** The jersey a club in these colours runs out in, as an image URL ('' without a canvas). */
function jerseyUrl(colors: [string, string]): string {
  try {
    return encodeCanvas(drawPlayerFrame(kitFromColors(colors, PLAYER_ID), LOOKS[0]!, 'idle', 0));
  } catch {
    return '';
  }
}

/**
 * Renders the title overlay into `root` (#ui-root). Resolves once with the
 * player's choice, after making that slot active so load()/save() target it,
 * then removes itself.
 */
export function showTitleFlow(root: HTMLElement): Promise<TitleChoice> {
  return new Promise<TitleChoice>((resolve) => {
    listenForPress();
    const overlay = mk('div', 'nrl-title');
    overlay.setAttribute('data-nrl-title', '');
    const style = document.createElement('style');
    style.textContent = commercialEnabled() ? TITLE_CSS + TITLE_COMMERCIAL_CSS : TITLE_CSS;
    overlay.appendChild(style);

    const main = mk('div', 'nrl-title-main');
    overlay.appendChild(main);

    // Which build this is (N7, #181), pinned to the screen's corner outside the panel.
    const build = mk('div', 'nrl-title-build', `Build ${buildLabel()}`);
    build.setAttribute('data-nrl-build', '');
    overlay.appendChild(build);

    let settled = false;
    const finish = (slot: number, choice: TitleChoice): void => {
      if (settled) return;
      settled = true;
      setActiveSlot(slot);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(choice);
    };

    const slotCard = (s: SlotSummary, isPrimary: boolean): HTMLElement => {
      const lead = isPrimary ? 'nrl-title-btn-go' : 'nrl-title-btn-row';
      const card = mk('div', 'nrl-title-card');
      card.setAttribute(`data-nrl-slot-${s.slot}`, '');
      if (s.status === 'empty') card.setAttribute('data-empty', '');
      card.appendChild(mk('div', 'nrl-title-slotno', `Slot ${s.slot}`));
      const club = mk('div', 'nrl-title-club',
        s.status === 'ok' ? String(s.clubName)
        : s.status === 'future' ? 'Newer game version'
        : s.status === 'corrupt' ? 'Unreadable save'
        : 'Empty');
      club.setAttribute(`data-nrl-slot-label-${s.slot}`, '');
      card.appendChild(club);
      card.appendChild(mk('div', 'nrl-title-when', s.status === 'ok' ? `Season ${s.season} · Week ${s.week}` : ''));
      if (s.message) card.appendChild(mk('div', 'nrl-title-warn', s.message));

      const actions = mk('div', 'nrl-title-actions');
      try {
        const originals = exportRecoverySaves(s.slot);
        for (let i = 0; i < originals.length; i++) {
          const copies = mkButton(`Export recovery copy ${i + 1}`, `data-nrl-recovery-${s.slot}-${i}`, 'nrl-title-btn-small');
          copies.addEventListener('click', () => downloadOriginalSave(s.slot, i));
          actions.appendChild(copies);
        }
      } catch { /* unreadable storage is already described on the card */ }
      if (s.status === 'ok') {
        const cont = mkButton('Continue', `data-nrl-continue-${s.slot}`, lead);
        cont.addEventListener('click', () => finish(s.slot, { mode: 'continue' }));
        actions.appendChild(cont);
      }
      if (s.status !== 'future') {
        const newBtn = mkButton('New game', `data-nrl-new-${s.slot}`, s.status === 'empty' ? lead : 'nrl-title-btn-small');
        newBtn.addEventListener('click', () => showSetup(s));
        actions.appendChild(newBtn);
      }
      if (s.status !== 'empty') {
        const recover = mkButton('Export original', `data-nrl-recover-${s.slot}`, 'nrl-title-btn-small');
        recover.addEventListener('click', () => downloadOriginalSave(s.slot));
        actions.appendChild(recover);
        // Two taps so a stray one never destroys a season.
        const del = mkButton('Delete', `data-nrl-delete-${s.slot}`, 'nrl-title-btn-small');
        let armed = false;
        del.addEventListener('click', () => {
          if (!armed) {
            armed = true;
            del.textContent = 'Really delete?';
            del.setAttribute('data-armed', '');
            return;
          }
          deleteSlot(s.slot);
          showSlots();
        });
        actions.appendChild(del);
      }
      card.appendChild(actions);
      return card;
    };

    // One yellow button on the slots screen (#613): Continue on the save written last
    // (SaveMeta.updatedAt; a tie, or saves from before meta, go to the lower slot). With
    // nothing to continue, New game on the first empty slot.
    const primarySlot = (summaries: SlotSummary[]): number | undefined => {
      const meta = listSlotMeta();
      const when = (slot: number): number => meta.find((m) => m.slot === slot)?.meta?.updatedAt ?? 0;
      const saved = summaries.filter((s) => s.status === 'ok');
      if (saved.length) return saved.reduce((a, b) => (when(b.slot) > when(a.slot) ? b : a)).slot;
      return summaries.find((s) => s.status === 'empty')?.slot;
    };

    const showSlots = (notice?: string): void => {
      main.replaceChildren();
      for (const e of titleHeading()) main.appendChild(e);
      const slots = mk('div', 'nrl-title-slots');
      const summaries = getSlotSummaries();
      const primary = primarySlot(summaries);
      for (const s of summaries) slots.appendChild(slotCard(s, s.slot === primary));
      main.appendChild(slots);

      const foot = mk('div', 'nrl-title-foot');
      const importBtn = mkButton('Import save', 'data-nrl-import');
      importBtn.addEventListener('click', () => {
        void pickSaveFile().then((text) => {
          if (text === null) return;
          const free = getSlotSummaries().find((x) => x.status === 'empty');
          if (!free) return showSlots('All slots are full — delete one before importing.');
          const res = installImportedSave(text, free.slot);
          if (!res.ok) return showSlots(res.message ? `Import failed: ${res.message}` : 'Import failed: could not write to storage.');
          showSlots(res.repairs.length ? res.repairs[0]!.notification : undefined);
        });
      });
      foot.appendChild(importBtn);
      // #364: the full game and "Already bought? Log in", with the commercial flag on only.
      if (commercialEnabled()) {
        const buy = mk('div', 'nrl-title-buy');
        const full = mkButton('Get the full game', 'data-nrl-full-game');
        full.addEventListener('click', () => void openPaywall({ reason: 'title' }));
        buy.appendChild(full);
        const login = mkButton('Already bought? Log in', 'data-nrl-login');
        login.addEventListener('click', () => void openLoginDialog());
        buy.appendChild(login);
        foot.appendChild(buy);
      }
      if (notice) {
        const n = mk('div', 'nrl-title-notice', notice);
        n.setAttribute('data-nrl-notice', '');
        foot.appendChild(n);
      }
      main.appendChild(foot);
    };

    // The new-club step for slot `s.slot`. A slot that holds a season asks before Start replaces it.
    const showSetup = (s: SlotSummary): void => {
      main.replaceChildren();
      const head = mk('div', 'nrl-title-head');
      const back = mkButton('Back', 'data-nrl-back');
      back.setAttribute('aria-label', 'Back to the save slots');
      back.addEventListener('click', () => showSlots());
      head.appendChild(back);
      head.appendChild(mk('h2', 'nrl-title-step', `New club · Slot ${s.slot}`));
      main.appendChild(head);

      // Reuse the game's existing seed, without drawing from its simulation stream.
      const seed = Date.now() >>> 0;
      let towns: Town[] = [];
      let selected: Town | undefined;
      let primary = DEFAULT_PLAYER_COLORS[0];
      let secondary = DEFAULT_PLAYER_COLORS[1];
      let difficulty: Difficulty = DEFAULT_DIFFICULTY;

      const setup = mk('div', 'nrl-title-setup');
      setup.setAttribute(`data-nrl-form-${s.slot}`, '');

      const kit = mk('figure', 'nrl-title-kit');
      const jersey = mk('img', 'nrl-title-jersey');
      jersey.setAttribute('alt', 'Your jersey');
      kit.appendChild(jersey);
      kit.appendChild(mk('figcaption', 'nrl-title-kit-note', 'Colours are for looks only'));
      setup.appendChild(kit);

      const form = mk('div', 'nrl-title-form');
      const details = mk('div', 'nrl-title-details');
      form.appendChild(details);
      const field = (label: string, control: HTMLElement): HTMLElement => {
        const row = mk('div', 'nrl-title-field');
        row.appendChild(mk('span', 'nrl-title-label', label));
        row.appendChild(control);
        return row;
      };
      // The club, coach and ground names take the rename rule (#616): a name that won't do
      // says why under its box and holds Start, never cut short. Empty is fine (a default, or no coach).
      const checks: (() => boolean)[] = [];
      const reasons: HTMLElement[] = [];
      const named = (box: HTMLInputElement, max: number, hook: string): HTMLElement => {
        box.setAttribute('maxlength', String(max * 2)); // room past the limit, so the reason shows
        const why = mk('div', 'nrl-title-why');
        why.setAttribute('aria-live', 'polite');
        why.setAttribute(hook, '');
        const check = (): boolean => {
          const c = box.value.trim() ? cleanName(box.value, max) : null;
          const bad = c !== null && !c.ok;
          box.setAttribute('aria-invalid', String(bad));
          why.textContent = c && !c.ok ? c.why : '';
          return !bad;
        };
        box.addEventListener('input', () => { check(); });
        checks.push(check);
        reasons.push(why);
        const entry = mk('div', 'nrl-title-entry');
        entry.appendChild(box);
        entry.appendChild(why);
        return entry;
      };

      const townInput = mk('input', 'nrl-title-input');
      townInput.type = 'text';
      townInput.setAttribute('data-nrl-town', '');
      townInput.setAttribute('aria-label', 'Home town');
      townInput.setAttribute('maxlength', '80');
      townInput.setAttribute('list', 'nrl-towns');
      townInput.setAttribute('autocomplete', 'off');
      details.appendChild(field('Home town', townInput));
      const results = mk('datalist', '');
      results.id = 'nrl-towns';
      details.appendChild(results);
      const townNote = mk('div', 'nrl-title-kit-note', 'Loading offline towns…');
      townNote.setAttribute('data-nrl-town-status', '');
      details.appendChild(townNote);
      const townLabel = (t: Town): string => `${t.name}, ${t.region}, ${t.country}`;
      const suggestions = (): void => {
        results.replaceChildren();
        const query = foldTown(townInput.value);
        for (const t of towns.filter(t => foldTown(townLabel(t)).includes(query)).slice(0, 20)) {
          const option = mk('option', '');
          option.value = townLabel(t);
          results.appendChild(option);
        }
      };

      let clubEdited = false;
      let groundEdited = false;
      const input = mk('input', 'nrl-title-input');
      input.addEventListener('input', () => { clubEdited = true; });
      input.type = 'text';
      input.value = DEFAULT_CLUB_NAME;
      input.setAttribute('data-nrl-clubname', '');
      input.setAttribute('aria-label', 'Club name');
      const names = mk('div', 'nrl-title-names');
      names.appendChild(field('Club name', named(input, NAME_MAX, 'data-nrl-clubname-why')));

      const coachInput = mk('input', 'nrl-title-input');
      coachInput.type = 'text';
      coachInput.setAttribute('data-nrl-coachname', '');
      coachInput.setAttribute('aria-label', 'Your name');
      coachInput.setAttribute('placeholder', 'Coach');
      names.appendChild(field('Your name', named(coachInput, NAME_MAX, 'data-nrl-coachname-why')));
      details.appendChild(names);

      const ground = mk('input', 'nrl-title-input');
      ground.addEventListener('input', () => { groundEdited = true; });
      ground.type = 'text';
      ground.setAttribute('data-nrl-groundname', '');
      ground.setAttribute('aria-label', 'Ground name');
      details.appendChild(field('Ground name', named(ground, GROUND_MAX, 'data-nrl-groundname-why')));
      // The phone keyboard (#609): names start with a capital and are not "corrected", and the
      // return key says what it does: on to the next name, then done (the keyboard goes away).
      const nameInputs = [townInput, input, coachInput, ground];
      nameInputs.forEach((box, i) => {
        const next = nameInputs[i + 1];
        box.setAttribute('autocapitalize', 'words');
        box.setAttribute('autocorrect', 'off');
        box.setAttribute('spellcheck', 'false');
        box.setAttribute('enterkeyhint', next ? 'next' : 'done');
        box.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || e.isComposing) return;
          e.preventDefault();
          if (next) next.focus(); else box.blur();
        });
      });
      const applyTown = (): void => {
        const value = townInput.value.trim();
        selected = towns.find(t => townLabel(t) === value)
          ?? towns.find(t => foldTown(t.name) === foldTown(value));
        const name = selected?.name ?? value;
        const nickname = selected?.nickname ?? ['Wombats', 'Kestrels', 'Otters', 'Ironworkers'][townHash(name) % 4];
        input.value = name ? defaultClubName(name, nickname) : DEFAULT_CLUB_NAME;
        ground.value = name ? groundForTown(name, selected?.id ?? name) : '';
        for (const check of checks) check();
        if (!townColorsAllowed(name, selected?.country, primary, secondary)) {
          [primary, secondary] = colorsForTown(name, selected?.country);
        }
        townNote.textContent = selected ? `${selected.region} · ${selected.country}` : 'Your own town · no coordinates';
        refresh();
      };
      townInput.addEventListener('input', () => { suggestions(); applyTown(); });
      townInput.addEventListener('change', applyTown);

      // Curated swatches only; a secondary too close to the primary is disabled.
      const swatches = (label: string, attr: string, palette: readonly string[], pick: (c: string) => void) => {
        const box = mk('div', 'nrl-title-swatches');
        const buttons: HTMLButtonElement[] = [];
        for (const c of palette) {
          const b = mk('button', 'nrl-title-swatch');
          b.type = 'button';
          b.setAttribute(attr, c);
          const name = COLOR_NAMES[c] ?? c;
          b.setAttribute('aria-label', `${label} ${name}`);
          b.setAttribute('title', name);
          b.style.background = c;
          b.addEventListener('click', () => { pick(c); refresh(); });
          buttons.push(b);
          box.appendChild(b);
        }
        details.appendChild(field(label, box));
        return { buttons, palette };
      };
      const prim = swatches('Primary', 'data-nrl-primary', PLAYER_PRIMARY_COLORS, (c) => {
        primary = c;
        if (!isValidColorPair(primary, secondary) || !townColorsAllowed(selected?.name ?? townInput.value, selected?.country, primary, secondary)) {
          secondary = PLAYER_SECONDARY_COLORS.find((x) => isValidColorPair(primary, x) && townColorsAllowed(selected?.name ?? townInput.value, selected?.country, primary, x)) ?? secondary;
        }
      });
      const sec = swatches('Secondary', 'data-nrl-secondary', PLAYER_SECONDARY_COLORS, (c) => { secondary = c; });

      const diffBox = mk('div', 'nrl-title-swatches');
      const diffButtons = new Map<Difficulty, HTMLButtonElement>();
      for (const d of DIFFICULTIES) {
        const b = mkButton(DIFFICULTY_LABEL[d], `data-nrl-difficulty-${d}`, 'nrl-title-pick');
        b.addEventListener('click', () => { difficulty = d; refresh(); });
        diffButtons.set(d, b);
        diffBox.appendChild(b);
      }
      form.appendChild(field('Difficulty', diffBox));
      const blurb = mk('p', 'nrl-title-difficulty-copy');
      blurb.setAttribute('data-nrl-difficulty-blurb', '');
      blurb.setAttribute('aria-live', 'polite');
      form.appendChild(blurb);
      if (getSlotSummaries().every((x) => x.status === 'empty')) {
        const hint = mk('p', 'nrl-title-difficulty-copy nrl-title-difficulty-hint', 'First career? Start on Easy.');
        hint.setAttribute('data-nrl-difficulty-hint', '');
        form.appendChild(hint);
      }
      const veteran = mk('input', '');
      veteran.type = 'checkbox';
      veteran.setAttribute('data-nrl-open-all', '');
      const veteranRow = mk('label', 'nrl-title-veteran');
      veteranRow.appendChild(veteran);
      veteranRow.appendChild(mk('span', '', "I've played before: open everything"));
      setup.appendChild(veteranRow);
      setup.appendChild(form);

      const refresh = (): void => {
        prim.buttons.forEach((b, i) => {
          const c = prim.palette[i]!;
          b.disabled = !PLAYER_SECONDARY_COLORS.some((x) => isValidColorPair(c, x) && townColorsAllowed(selected?.name ?? townInput.value, selected?.country, c, x));
          b.setAttribute('aria-pressed', String(c === primary));
        });
        sec.buttons.forEach((b, i) => {
          const c = sec.palette[i]!;
          b.disabled = !isValidColorPair(primary, c) || !townColorsAllowed(selected?.name ?? townInput.value, selected?.country, primary, c);
          b.setAttribute('aria-pressed', String(c === secondary));
        });
        for (const [d, b] of diffButtons) b.setAttribute('aria-pressed', String(d === difficulty));
        blurb.textContent = DIFFICULTY_BLURB[difficulty];
        const url = jerseyUrl([primary, secondary]);
        if (url) jersey.setAttribute('src', url);
      };
      refresh();

      const go = mk('div', 'nrl-title-go');
      /** Every name passes (each says why when not); focus the first that doesn't. */
      const namesOk = (): boolean => {
        const bad = [0, 1, 2].filter((i) => !checks[i]!());
        if (bad.length) {
          [input, coachInput, ground][bad[0]!]!.focus();
          // On a short phone the details scroll: bring the reason into view, not only the box.
          reasons[bad[0]!]!.scrollIntoView?.({ block: 'nearest' });
        }
        return bad.length === 0;
      };
      const begin = (): void => {
        if (!namesOk()) return;
        if (s.status !== 'empty') deleteSlot(s.slot);
        const club = cleanName(input.value);
        const name = club.ok ? club.name : DEFAULT_CLUB_NAME;
        const coach = cleanName(coachInput.value);
        const town = selected?.name ?? townInput.value.trim();
        const groundName = cleanName(ground.value, GROUND_MAX);
        const home = selected
          ? { town, region: selected.region, country: selected.country, lat: selected.lat, lon: selected.lon }
          : { town };
        finish(s.slot, { mode: 'new', seed, clubName: name, ...(coach.ok ? { coachName: coach.name } : {}), difficulty, ...(veteran.checked ? { openAll: true } : {}), colors: [primary, secondary],
          home, groundName: groundName.ok ? groundName.name : groundForTown(town || name, selected?.id ?? town) });
      };
      // Start waits for the town list, and says so while it does (#613).
      const start = mkButton('Loading towns…', 'data-nrl-start', 'nrl-title-btn-go');
      start.disabled = true;
      const ready = (): void => { start.textContent = 'Start'; start.disabled = false; };
      start.addEventListener('click', () => {
        if (start.disabled || !namesOk()) return;
        if (s.status === 'empty') return begin();
        // A season (or an unreadable save) is in this slot: say what Start replaces first.
        go.replaceChildren();
        const what = s.status === 'ok' ? `${s.clubName} (S${s.season} W${s.week})` : 'the unreadable save';
        const ask = mk('div', 'nrl-title-confirm', `Start over? This replaces ${what}.`);
        ask.setAttribute('data-nrl-confirm', '');
        go.appendChild(ask);
        const yes = mkButton('Start over', 'data-nrl-start-confirm', 'nrl-title-btn-go');
        yes.addEventListener('click', begin);
        go.appendChild(yes);
        const no = mkButton('Cancel', 'data-nrl-start-cancel');
        no.addEventListener('click', () => { go.replaceChildren(); go.appendChild(start); });
        go.appendChild(no);
      });
      go.appendChild(start);
      setup.appendChild(go);
      main.appendChild(setup);
      // This is the sole runtime import of the data: opening setup starts it.
      void import('../data/towns.json').then(({ default: data }) => {
        towns = data;
        if (!towns.length) throw new Error('Offline town catalogue is empty');
        const initial = towns[seed % towns.length];
        // A player can type while the chunk is loading; don't overwrite their town.
        if (!townInput.value && initial) townInput.value = townLabel(initial);
        const editedClub = clubEdited ? input.value : undefined;
        const editedGround = groundEdited ? ground.value : undefined;
        suggestions();
        applyTown();
        if (editedClub !== undefined) input.value = editedClub;
        if (editedGround !== undefined) ground.value = editedGround;
        for (const check of checks) check();
        ready();
      }).catch(() => {
        townNote.textContent = 'Town list unavailable. Type your own town to start.';
        ready();
      });
    };

    // Fresh install (all slots empty): go straight to setting up a club in slot 1.
    const summaries = getSlotSummaries();
    if (summaries.every((x) => x.status === 'empty')) showSetup(summaries[0]!);
    else showSlots();

    root.appendChild(overlay);
  });
}
