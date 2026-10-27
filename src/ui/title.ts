// Title screen: three save slots side by side, and a separate step that sets up
// a new club (name, kit with a live jersey, difficulty) before Start.
//
// Built from document.createElement and one <style> element, no dom.ts helpers:
// it runs before the game's UI is up, and its tests drive it through a tiny stub
// DOM (createElement, appendChild, setAttribute, click listeners, querySelector
// on data attributes). Every hook the tests and e2e scripts use is a data-nrl-*
// attribute.

import {
  deleteSlot, getSlotSummaries, installImportedSave, pickSaveFile, setActiveSlot, type SlotSummary,
} from '../core/save';
import { buildLabel } from './buildInfo';
import {
  DEFAULT_DIFFICULTY, DEFAULT_PLAYER_COLORS, DIFFICULTIES, PLAYER_PRIMARY_COLORS,
  PLAYER_SECONDARY_COLORS, isValidColorPair, type Difficulty,
} from '../config';
import { kitFromColors } from '../art/match/kit';
import { LOOKS, drawPlayerFrame } from '../art/match/players';
import { encodeCanvas } from '../art/portrait';
import { PLAYER_ID } from '../systems/fixtures';

export interface TitleChoice {
  mode: 'continue' | 'new';
  clubName?: string;
  difficulty?: Difficulty;
  colors?: [string, string];
}

const DEFAULT_CLUB_NAME = 'Cavehole Crushers';

const COLOR_NAMES: Record<string, string> = {
  '#f4d03f': 'Gold', '#c0392b': 'Crimson', '#2e6fd8': 'Royal blue', '#e67e22': 'Orange',
  '#8e44ad': 'Purple', '#16a0b8': 'Teal', '#ecf0f1': 'White', '#ffffff': 'White', '#1a1a2e': 'Navy-black',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

// The overlay scrolls when its content is taller than the screen; the auto
// margins on .nrl-title-main centre it only while it fits (justify-content:center
// would push the top of tall content out of reach). Safe-area insets pad every
// side (#347): with the phone turned either way the notch takes one of them. The
// insets come through the frame's --nrl-safe-* (dom.ts) where they are set, env()
// before the frame's stylesheet is in.
const TITLE_CSS = `
.nrl-title { position: absolute; inset: 0; pointer-events: auto; overflow-y: auto; overscroll-behavior: contain;
  display: flex; flex-direction: column; align-items: center; box-sizing: border-box;
  padding: calc(12px + var(--nrl-safe-t, env(safe-area-inset-top, 0px))) calc(12px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)))
    calc(24px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))) calc(12px + var(--nrl-safe-l, env(safe-area-inset-left, 0px)));
  background: radial-gradient(ellipse at 50% 120%, #1b3a2a 0%, #0e1630 60%) #0e1630; color: #fff;
  font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 14px; }
.nrl-title * { box-sizing: border-box; }
.nrl-title-main { margin: auto 0; width: 100%; max-width: 880px; display: flex; flex-direction: column; gap: 14px; }
.nrl-title h1 { margin: 0; text-align: center; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-style: italic;
  font-weight: 700; font-size: 48px; letter-spacing: 0.06em; line-height: 1; }
.nrl-title h1::after { content: 'Club manager'; display: block; margin-top: 6px; font-style: normal; font-size: 13px;
  font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: #f4d03f; }
.nrl-title-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: 10px; }
.nrl-title-card { border-radius: 14px; background: rgba(27, 38, 74, 0.95); padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px; min-width: 0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); }
.nrl-title-slotno { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; color: #9aa6c7;
  letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-title-club { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 22px; line-height: 1.1; overflow-wrap: anywhere; }
.nrl-title-card[data-empty] .nrl-title-club { color: #9aa6c7; font-weight: 600; }
.nrl-title-when { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #c9d1ea; min-height: 1.2em; }
.nrl-title-warn { font-size: 12px; color: #f0a39b; }
.nrl-title-actions { margin-top: auto; padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-title-btn { min-height: 44px; padding: 0 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase; color: #fff; cursor: pointer;
  background: #1f2b55; border: 0; border-radius: 10px; flex: 1 1 0; white-space: nowrap; }
.nrl-title-btn:hover { background: #283669; }
.nrl-title-btn:focus-visible { outline: 2px solid #f4d03f; outline-offset: 2px; }
.nrl-title-btn-go, .nrl-title-btn-go:hover { background: #f4d03f; color: #0e1630; flex-basis: 100%; }
.nrl-title-btn-small { font-size: 14px; padding: 0 8px; }
.nrl-title-btn[data-nrl-delete-1], .nrl-title-btn[data-nrl-delete-2], .nrl-title-btn[data-nrl-delete-3] { color: #f0a39b; }
.nrl-title-btn[data-armed] { background: #5a2430; color: #fff; }
.nrl-title-foot { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.nrl-title-foot .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-notice { color: #f0a39b; font-size: 13px; max-width: 360px; text-align: center; }
.nrl-title-build { position: fixed; right: calc(8px + var(--nrl-safe-r, env(safe-area-inset-right, 0px)));
  bottom: calc(4px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); pointer-events: none; color: #9aa6c7;
  font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
.nrl-title-head { display: flex; align-items: center; gap: 12px; }
.nrl-title-head .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-head h2 { margin: 0; font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700;
  letter-spacing: 0.02em; text-transform: uppercase; flex: 1; min-width: 0; }
.nrl-title-setup { display: grid; grid-template-columns: 9rem minmax(0, 1fr); grid-template-areas: "kit form" "start form";
  gap: 10px 16px; align-items: start; padding: 14px; border-radius: 16px; background: rgba(14, 22, 48, 0.97);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); }
.nrl-title-kit { grid-area: kit; margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 6px; border-radius: 10px; background: #141d3a; text-align: center; font-size: 12px; color: #9aa6c7; }
.nrl-title-kit img { width: 84px; height: 90px; image-rendering: pixelated; }
.nrl-title-form { grid-area: form; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.nrl-title-go { grid-area: start; display: flex; flex-direction: column; gap: 6px; }
.nrl-title-go .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-confirm { font-size: 13px; color: #f4d03f; }
.nrl-title-field { display: flex; align-items: center; gap: 10px; }
.nrl-title-field > span { flex: 0 0 5.5rem; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: #9aa6c7; text-align: right; }
.nrl-title-swatches { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.nrl-title-swatches .nrl-title-btn { flex: 0 0 auto; }
.nrl-title-swatch { width: 32px; height: 32px; padding: 0; border: 2px solid rgba(255, 255, 255, 0.15); border-radius: 8px; cursor: pointer; }
.nrl-title-swatch[aria-pressed="true"] { border-color: #0e1630; box-shadow: 0 0 0 2px #f4d03f; }
.nrl-title-swatch:disabled { opacity: 0.25; cursor: default; }
.nrl-title-pick { background: #1b264a; }
.nrl-title-pick[aria-pressed="true"], .nrl-title-pick[aria-pressed="true"]:hover { background: #f4d03f; color: #0e1630; }
.nrl-title-input { min-height: 44px; padding: 0 12px; font: inherit; font-size: 16px; flex: 1; min-width: 0; color: #fff;
  background: #1b264a; border: 2px solid #26325c; border-radius: 10px; }
.nrl-title-input:focus { outline: none; border-color: #f4d03f; }
@media (pointer: coarse) { .nrl-title-swatch { width: 44px; height: 44px; } }
@media (max-height: 500px) {
  .nrl-title h1 { font-size: 34px; }
  .nrl-title h1::after { margin-top: 4px; font-size: 11px; }
  .nrl-title-main { gap: 10px; }
}
@media (max-height: 500px) {
  /* Start over? and its two buttons in a row, so Cancel stays on screen under the kit. */
  .nrl-title-go:has(.nrl-title-confirm) { flex-direction: row; flex-wrap: wrap; }
  .nrl-title-go .nrl-title-confirm { flex: 1 1 100%; }
  .nrl-title-go:has(.nrl-title-confirm) .nrl-title-btn { flex: 1 1 0; padding: 0 8px; }
}
@media (max-height: 340px) {
  .nrl-title { padding-bottom: calc(18px + var(--nrl-safe-b, env(safe-area-inset-bottom, 0px))); }
  .nrl-title-main { gap: 6px; }
  .nrl-title-kit img { width: 56px; height: 60px; }
  .nrl-title-form { gap: 6px; }
  .nrl-title-setup { padding: 10px; }
}
@media (max-width: 520px) {
  .nrl-title-setup { grid-template-columns: minmax(0, 1fr); grid-template-areas: "kit" "form" "start"; }
  .nrl-title-field { flex-wrap: wrap; }
  .nrl-title-field > span { flex-basis: 100%; text-align: left; }
}
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
    const overlay = mk('div', 'nrl-title');
    overlay.setAttribute('data-nrl-title', '');
    const style = document.createElement('style');
    style.textContent = TITLE_CSS;
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

    const slotCard = (s: SlotSummary): HTMLElement => {
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
      if (s.message && s.status === 'future') card.appendChild(mk('div', 'nrl-title-warn', s.message));

      const actions = mk('div', 'nrl-title-actions');
      if (s.status === 'ok') {
        const cont = mkButton('Continue', `data-nrl-continue-${s.slot}`, 'nrl-title-btn-go');
        cont.addEventListener('click', () => finish(s.slot, { mode: 'continue' }));
        actions.appendChild(cont);
      }
      if (s.status !== 'future') {
        const newBtn = mkButton('New game', `data-nrl-new-${s.slot}`, s.status === 'empty' ? 'nrl-title-btn-go' : 'nrl-title-btn-small');
        newBtn.addEventListener('click', () => showSetup(s));
        actions.appendChild(newBtn);
      }
      if (s.status !== 'empty') {
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

    const showSlots = (notice?: string): void => {
      main.replaceChildren();
      main.appendChild(mk('h1', 'nrl-title-name', 'NRL SIM'));
      const slots = mk('div', 'nrl-title-slots');
      for (const s of getSlotSummaries()) slots.appendChild(slotCard(s));
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
          showSlots();
        });
      });
      foot.appendChild(importBtn);
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
      const field = (label: string, control: HTMLElement): HTMLElement => {
        const row = mk('div', 'nrl-title-field');
        row.appendChild(mk('span', 'nrl-title-label', label));
        row.appendChild(control);
        return row;
      };

      const input = mk('input', 'nrl-title-input');
      input.type = 'text';
      input.value = DEFAULT_CLUB_NAME;
      input.setAttribute('data-nrl-clubname', '');
      input.setAttribute('aria-label', 'Club name');
      input.setAttribute('maxlength', '32');
      form.appendChild(field('Club name', input));

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
        form.appendChild(field(label, box));
        return { buttons, palette };
      };
      const prim = swatches('Primary', 'data-nrl-primary', PLAYER_PRIMARY_COLORS, (c) => {
        primary = c;
        if (!isValidColorPair(primary, secondary)) {
          secondary = PLAYER_SECONDARY_COLORS.find((x) => isValidColorPair(primary, x)) ?? secondary;
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
      setup.appendChild(form);

      const refresh = (): void => {
        prim.buttons.forEach((b, i) => {
          const c = prim.palette[i]!;
          b.disabled = !PLAYER_SECONDARY_COLORS.some((x) => isValidColorPair(c, x));
          b.setAttribute('aria-pressed', String(c === primary));
        });
        sec.buttons.forEach((b, i) => {
          const c = sec.palette[i]!;
          b.disabled = !isValidColorPair(primary, c);
          b.setAttribute('aria-pressed', String(c === secondary));
        });
        for (const [d, b] of diffButtons) b.setAttribute('aria-pressed', String(d === difficulty));
        const url = jerseyUrl([primary, secondary]);
        if (url) jersey.setAttribute('src', url);
      };
      refresh();

      const go = mk('div', 'nrl-title-go');
      const begin = (): void => {
        const name = input.value.trim() || DEFAULT_CLUB_NAME;
        finish(s.slot, { mode: 'new', clubName: name, difficulty, colors: [primary, secondary] });
      };
      const start = mkButton('Start', 'data-nrl-start', 'nrl-title-btn-go');
      start.addEventListener('click', () => {
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
      input.focus();
    };

    // Fresh install (all slots empty): go straight to setting up a club in slot 1.
    const summaries = getSlotSummaries();
    if (summaries.every((x) => x.status === 'empty')) showSetup(summaries[0]!);
    else showSlots();

    root.appendChild(overlay);
  });
}
