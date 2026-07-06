// src/ui/hud.ts — top HUD strip (money / week / season + Advance Week button).
// See ARCHITECTURE §4 (store), §5 (events), §7 (DOM persists across scenes) and
// BAK-163. No Phaser imports. The HUD is a DOM overlay that lives independently
// of Phaser scenes; call destroy() to unsubscribe and remove it.

import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import { WEEKS_PER_SEASON } from '../config';
import { el, button, mount, ensureStyles } from './dom';

/** Options for {@link createHud}. */
export interface HudOpts {
  /** Called when the "Advance Week" button is clicked. Absent => button disabled. */
  onAdvanceWeek?: () => void;
}

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
  const actions = el('div', { class: 'nrl-hud-actions' }, advanceBtn);

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

  return {
    el: root,
    destroy() {
      offState();
      offMoney();
      if (flashTimer) clearTimeout(flashTimer);
      root.remove();
    },
  };
}
