// src/ui/hud.ts — top HUD strip (money / week / season + Advance Week button).
// See ARCHITECTURE §4 (store), §5 (events), §7 (DOM persists across scenes) and
// BAK-163. No Phaser imports. The HUD is a DOM overlay that lives independently
// of Phaser scenes; call destroy() to unsubscribe and remove it.

import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import type { AdvanceTarget } from '../core/advanceRules';
import { WEEKS_PER_SEASON } from '../config';
import { el, button, mount, ensureStyles, trackChromeInset, HUD_INSET_VAR } from './dom';

/** Options for {@link createHud}. */
export interface HudOpts {
  /** Called when the "Advance Week" button is clicked. Absent => button disabled. */
  onAdvanceWeek?: () => void;
  /** Called from the "Advance Week" menu (#44). Absent => menu disabled. */
  onAdvanceUntil?: (target: AdvanceTarget) => void;
}

/** Entries in the "Advance Week" menu, in display order. */
export const ADVANCE_MENU: readonly { label: string; target: AdvanceTarget }[] = [
  { label: '×4 weeks', target: { kind: 'weeks', weeks: 4 } },
  { label: 'To finals', target: { kind: 'finals' } },
  { label: 'To season end', target: { kind: 'seasonEnd' } },
];

/** Handle to a mounted HUD. */
export interface Hud {
  el: HTMLElement;
  destroy(): void;
}

/**
 * Format a money balance as `$1,234` (thousands-separated). Negative balances
 * render as `-$1,234`. Pure — extracted for unit testing without the DOM.
 */
export function fmtMoney(n: number): string {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded);
  const grouped = abs.toLocaleString('en-US');
  return rounded < 0 ? `-$${grouped}` : `$${grouped}`;
}

const FLASH_MS = 450;

/**
 * Build the top HUD, subscribe it to the bus, mount it into #ui-root, and render
 * the current getState() immediately. Returns a handle whose destroy() removes
 * both bus listeners and the DOM node (no leaks across scene/context switches).
 */
export function createHud(opts: HudOpts = {}): Hud {
  ensureStyles();

  // Readout tiles.
  const moneyEl = el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'money' } });
  const weekEl = el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'week' } });
  const seasonEl = el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'season' } });

  const readouts = el('div', { class: 'nrl-hud-readouts' }, moneyEl, weekEl, seasonEl);
  const spacer = el('div', { class: 'nrl-hud-spacer' });

  const advanceBtn = button('Advance Week', () => opts.onAdvanceWeek?.());
  if (!opts.onAdvanceWeek) advanceBtn.disabled = true;

  // #44: split-button menu. The toggle is a 44px square beside Advance Week; the
  // menu drops below the HUD and is closed by a pick, Escape or an outside tap.
  const menuToggle = button('▾', () => setMenuOpen(menu.hidden), { class: 'nrl-hud-menu-toggle' });
  menuToggle.setAttribute('aria-label', 'More advance options');
  menuToggle.setAttribute('aria-haspopup', 'menu');
  menuToggle.setAttribute('aria-expanded', 'false');
  if (!opts.onAdvanceUntil) menuToggle.disabled = true;

  const menu = el('div', { class: 'nrl-hud-menu', attrs: { role: 'menu', hidden: '' } },
    ...ADVANCE_MENU.map(({ label, target }) => {
      const item = button(label, () => {
        setMenuOpen(false);
        opts.onAdvanceUntil?.(target);
      }, { class: 'nrl-hud-menu-item' });
      item.setAttribute('role', 'menuitem');
      if (!opts.onAdvanceUntil) item.disabled = true;
      return item;
    }),
  );

  function setMenuOpen(open: boolean): void {
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      document.addEventListener('pointerdown', onOutsidePointer, true);
      document.addEventListener('keydown', onMenuKey, true);
    } else {
      document.removeEventListener('pointerdown', onOutsidePointer, true);
      document.removeEventListener('keydown', onMenuKey, true);
    }
  }
  function onOutsidePointer(e: Event): void {
    if (!actions.contains(e.target as Node)) setMenuOpen(false);
  }
  function onMenuKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') setMenuOpen(false);
  }

  const actions = el('div', { class: 'nrl-hud-actions' }, advanceBtn, menuToggle, menu);

  const root = el('div', { class: 'nrl-hud' }, readouts, spacer, actions);

  let lastMoney: number | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  function renderMoney(balance: number): void {
    moneyEl.textContent = fmtMoney(balance);
    moneyEl.classList.toggle('nrl-money-negative', balance < 0);

    if (lastMoney !== null && balance !== lastMoney) {
      const up = balance > lastMoney;
      moneyEl.classList.remove('nrl-flash-up', 'nrl-flash-down');
      moneyEl.classList.add(up ? 'nrl-flash-up' : 'nrl-flash-down');
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        moneyEl.classList.remove('nrl-flash-up', 'nrl-flash-down');
      }, FLASH_MS);
    }
    lastMoney = balance;
  }

  function render(s: GameState): void {
    renderMoney(s.money);
    // "/total" suffix is a separate span so narrow-screen CSS can hide it.
    weekEl.textContent = '';
    weekEl.append(
      document.createTextNode(`Week ${s.week}`),
      el('span', { class: 'nrl-hud-week-total', text: `/${WEEKS_PER_SEASON}` }),
    );
    seasonEl.textContent = `Season ${s.season}`;
  }

  // Initial paint from the store.
  render(getState());

  // Subscribe: state:changed is the source of truth; money:changed gives a snappy
  // money-only update (and drives the flash) between full state changes.
  const offState = bus.on('state:changed', (s) => render(s));
  const offMoney = bus.on('money:changed', ({ balance }) => renderMoney(balance));

  mount(root);
  // Screens sit below the HUD (GitHub #14): publish our live height.
  const offInset = trackChromeInset(root, HUD_INSET_VAR);

  return {
    el: root,
    destroy() {
      offState();
      offMoney();
      offInset();
      setMenuOpen(false);
      if (flashTimer) clearTimeout(flashTimer);
      root.remove();
    },
  };
}
