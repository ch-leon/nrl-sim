// src/ui/hud.ts — top HUD strip (money / week / season + Advance Week button).
// See ARCHITECTURE §4 (store), §5 (events), §7 (DOM persists across scenes) and
// BAK-163. No Phaser imports. The HUD is a DOM overlay that lives independently
// of Phaser scenes; call destroy() to unsubscribe and remove it.

import { bus } from '../core/events';
import { getState, type GameState } from '../core/state';
import type { AdvanceTarget } from '../core/advanceRules';
import { weekHeld } from '../core/time';
import { advanceInProgress, stopAdvance } from '../core/advance';
import { playerMatchPending, resumePlayerMatch } from '../systems/matchday';
import { nextFixture } from '../systems/league';
import { ECON, WEEKS_PER_SEASON } from '../config';
import { el, button, mount, ensureStyles, trackChromeInset, HUD_INSET_VAR } from './dom';

/** Options for {@link createHud}. */
export interface HudOpts {
  /** Called when the "Advance Week" button is clicked. Absent => button disabled. */
  onAdvanceWeek?: () => void;
  /** Called from the "Advance Week" menu (#44). Absent => menu disabled. */
  onAdvanceUntil?: (target: AdvanceTarget) => unknown;
  /** Called from the next-match chip (#350 H1). Absent => the chip is a plain readout. */
  onNextMatch?: () => void;
  /** Called from the money tile (#351 H2). Absent => the tile is a plain readout. */
  onMoney?: () => void;
  /** Weeks the balance lasts at this week's burn, null when the club is not losing money (#351 H2). */
  runwayWeeks?: (s: GameState) => number | null;
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

/** The money tile below $0 (N12.5): its red class, and the tag beside the number. */
export const IN_DEBT_CLASS = 'nrl-money-negative';
export const IN_DEBT_TEXT = 'in debt';

/**
 * The money tile: the balance, and whether the club is in debt (below
 * ECON.BANKRUPTCY_WARN, the line the economy warns at and the advance stops on,
 * the tile takes IN_DEBT_CLASS and says "in debt" beside the number, N12.5). Pure —
 * extracted for unit testing without the DOM.
 */
export function moneyTile(balance: number): { text: string; inDebt: boolean } {
  return { text: fmtMoney(balance), inDebt: balance < ECON.BANKRUPTCY_WARN };
}

/** The money tile turns amber below this many weeks of runway, red below the next (#351 H2). */
export const RUNWAY_LOW_WEEKS = 20;
export const RUNWAY_SHORT_WEEKS = 8;
export const RUNWAY_CLASS = { low: 'nrl-money-low', short: 'nrl-money-short' } as const;

/** How worried the money tile looks: the weeks the balance lasts at this week's burn. */
export function runwayLevel(weeks: number | null): 'ok' | 'low' | 'short' {
  if (weeks === null) return 'ok';
  return weeks < RUNWAY_SHORT_WEEKS ? 'short' : weeks < RUNWAY_LOW_WEEKS ? 'low' : 'ok';
}

/** The money tile's spoken label and tooltip: the balance, the runway when it is short, the tap. */
export function moneyTileLabel(balance: number, weeks: number | null, tappable: boolean): string {
  const tile = moneyTile(balance);
  const parts = [`Money ${tile.text}${tile.inDebt ? `, ${IN_DEBT_TEXT}` : ''}`];
  if (!tile.inDebt && weeks !== null && runwayLevel(weeks) !== 'ok') {
    const n = Math.floor(weeks);
    parts.push(`Enough for ${n === 1 ? 'about 1 week' : `about ${n} weeks`} at this week's spending`);
  }
  if (tappable) parts.push('Tap for Finance');
  return parts.join('. ');
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** A club's place name, its name less the nickname: "Broken Hill Brollys" → "Broken Hill". */
export function placeName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, -1).join(' ') : name;
}

/**
 * The hub's next-match chip (#350 H1), two short lines that fit beside Advance
 * Week at 667px: "v Darwin" over "Away · 5th", the ladder place once a round is
 * in. The full name is in the label. Null with no match left this season. Pure —
 * extracted for unit testing without the DOM.
 */
export function nextMatchChip(s: Pick<GameState, 'league' | 'week'>): { opponent: string; detail: string; label: string } | null {
  const f = nextFixture(s.league.fixtures, s.week, 'player');
  if (!f) return null;
  const home = f.homeId === 'player';
  const opp = s.league.clubs.find((c) => c.id === (home ? f.awayId : f.homeId));
  if (!opp) return null;
  const i = s.league.ladder.findIndex((r) => r.clubId === 'player');
  const row = i < 0 ? undefined : s.league.ladder[i];
  const place = row && row.played > 0 ? ordinal(i + 1) : '';
  const detail = `${home ? 'Home' : 'Away'}${place ? ` · ${place}` : ''}`;
  const label = `Next match: ${opp.name}, ${home ? 'home' : 'away'}${place ? `. You are ${place} on the ladder` : ''}`;
  return { opponent: `v ${placeName(opp.name)}`, detail, label };
}

/** The Advance Week badge's spoken label (#350 H1). */
export function decisionsBadgeLabel(n: number): string {
  return n === 1 ? '1 decision waiting' : `${n} decisions waiting`;
}

const FLASH_MS = 450;

/** What the HUD says when a multi-week advance throws mid-run (N10.2). */
export const ADVANCE_FAILED_TEXT = 'The advance hit a problem and stopped.';

/** What a tap on Advance Week (or its menu) says while the week is still finishing. */
export const HELD_WEEK_TEXT = 'The other matches are still being played; the week ends when they are in.';

/** Advance Week's label while the player's own match is parked (Save & exit). */
export const RESUME_MATCH_LABEL = 'Resume match';

/** What Save & exit tells the player on the way back to the club. */
export const MATCH_SAVED_TEXT = 'Match saved. Tap Resume match to carry on.';

/** Save & exit when the record could not be written: stay in the match. */
export const MATCH_NOT_SAVED_TEXT = "Couldn't save the match. It is still going.";

/** Save & exit while Skip is waiting on the rest of the match. */
export const SKIPPING_EXIT_TEXT = 'Skipping to full time.';

/** What the ▾ menu says while that match is still on: it must not skip the week. */
export const MATCH_STILL_ON_TEXT = 'Your match is still on. Tap Resume match to carry on.';

/**
 * What a tap on Advance Week does. A parked live match resumes; a week held for
 * the rival round waits; otherwise the week advances.
 */
export function clubAdvanceChoice(matchPending: boolean, weekStillHeld: boolean): 'resume' | 'wait' | 'advance' {
  if (matchPending) return 'resume';
  if (weekStillHeld) return 'wait';
  return 'advance';
}

/** What a ▾ pick does. The menu never skips a match that is still on. */
export function clubMenuChoice(matchPending: boolean, weekStillHeld: boolean): 'match' | 'wait' | 'advance' {
  if (matchPending) return 'match';
  if (weekStillHeld) return 'wait';
  return 'advance';
}

/**
 * True when the week is held (coach calls #73; the rival round played off the
 * main thread, N9.2), after saying so: back at the club the HUD is live again
 * while the rivals finish, and a tap would otherwise do nothing, or report
 * weeks advanced that never were (#216).
 */
export function weekStillFinishing(): boolean {
  if (!weekHeld()) return false;
  bus.emit('ui:notify', { text: HELD_WEEK_TEXT, kind: 'info' });
  return true;
}

/**
 * The Advance button's label while a multi-week advance runs (N10.2): the
 * season's current week. Pure — extracted for unit testing without the DOM.
 */
export function advanceProgressLabel(week: number): string {
  return `Week ${week} of ${WEEKS_PER_SEASON}…`;
}

/**
 * Build the top HUD, subscribe it to the bus, mount it into #ui-root, and render
 * the current getState() immediately. Returns a handle whose destroy() removes
 * both bus listeners and the DOM node (no leaks across scene/context switches).
 */
export function createHud(opts: HudOpts = {}): Hud {
  ensureStyles();

  // Readout tiles.
  // #351 H2: the balance, amber or red as the runway shortens; a tap opens Finance.
  const moneyEl = opts.onMoney
    ? el('button', { class: 'nrl-hud-stat nrl-hud-money', attrs: { type: 'button', 'data-hud': 'money' }, onClick: () => opts.onMoney?.() })
    : el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'money' } });
  let runway: number | null = null;
  const weekEl = el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'week' } });
  const seasonEl = el('div', { class: 'nrl-hud-stat', attrs: { 'data-hud': 'season' } });

  const readouts = el('div', { class: 'nrl-hud-readouts' }, moneyEl, weekEl, seasonEl);
  // #350 H1: who is next, a tap from the League screen.
  const nextEl = button('', () => opts.onNextMatch?.(), { class: 'nrl-hud-next' });
  nextEl.setAttribute('data-hud', 'next');
  if (!opts.onNextMatch) nextEl.disabled = true;
  const spacer = el('div', { class: 'nrl-hud-spacer' }, nextEl);

  const advanceBtn = button('Advance Week', () => {
    const choice = clubAdvanceChoice(playerMatchPending(), weekHeld());
    if (choice === 'resume') {
      resumePlayerMatch();
      return;
    }
    if (choice === 'wait') {
      weekStillFinishing();
      return;
    }
    opts.onAdvanceWeek?.();
  });
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
        const choice = clubMenuChoice(playerMatchPending(), weekHeld());
        if (choice === 'match') {
          bus.emit('ui:notify', { text: MATCH_STILL_ON_TEXT, kind: 'info' });
          return;
        }
        if (choice === 'wait') {
          weekStillFinishing();
          return;
        }
        runAdvance(target);
      }, { class: 'nrl-hud-menu-item' });
      item.setAttribute('role', 'menuitem');
      if (!opts.onAdvanceUntil) item.disabled = true;
      return item;
    }),
  );

  /** Start a multi-week advance; one that throws mid-run says so instead of failing silently. */
  function runAdvance(target: AdvanceTarget): void {
    void Promise.resolve()
      .then(() => opts.onAdvanceUntil?.(target))
      .catch((err: unknown) => {
        console.error(err);
        bus.emit('ui:notify', { text: ADVANCE_FAILED_TEXT, kind: 'danger' });
      });
  }

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

  // N10.2: while a multi-week advance runs, Stop takes the toggle's place; the run
  // finishes the week in hand and toasts "Stopped after n weeks".
  const stopBtn = button('Stop', () => {
    stopAdvance();
    stopBtn.disabled = true;
  }, { class: 'nrl-hud-stop' });
  stopBtn.hidden = true;

  const actions = el('div', { class: 'nrl-hud-actions' }, advanceBtn, menuToggle, stopBtn, menu);

  const root = el('div', { class: 'nrl-hud' }, readouts, spacer, actions);

  let lastMoney: number | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  function renderMoney(balance: number): void {
    const tile = moneyTile(balance);
    moneyEl.textContent = tile.text;
    // The space keeps the tile's text "-$6,070 in debt" for screen readers (#239).
    if (tile.inDebt) moneyEl.append(' ', el('span', { class: 'nrl-hud-debt', text: IN_DEBT_TEXT }));
    moneyEl.classList.toggle(IN_DEBT_CLASS, tile.inDebt);
    const level = tile.inDebt ? 'ok' : runwayLevel(runway);
    moneyEl.classList.toggle(RUNWAY_CLASS.low, level === 'low');
    moneyEl.classList.toggle(RUNWAY_CLASS.short, level === 'short');
    const label = moneyTileLabel(balance, runway, !!opts.onMoney);
    moneyEl.setAttribute('aria-label', label);
    moneyEl.title = label;

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
    runway = opts.runwayWeeks?.(s) ?? null;
    renderMoney(s.money);
    // "/total" suffix is a separate span so narrow-screen CSS can hide it.
    weekEl.textContent = '';
    weekEl.append(
      document.createTextNode(`Week ${s.week}`),
      el('span', { class: 'nrl-hud-week-total', text: `/${WEEKS_PER_SEASON}` }),
    );
    seasonEl.textContent = `Season ${s.season}`;
    const chip = nextMatchChip(s);
    nextEl.hidden = !chip;
    nextEl.replaceChildren(
      el('span', { class: 'nrl-hud-next-opp', text: chip?.opponent ?? '' }),
      el('span', { class: 'nrl-hud-next-detail', text: chip?.detail ?? '' }),
    );
    nextEl.setAttribute('aria-label', chip?.label ?? '');
    nextEl.title = chip?.label ?? '';
    renderAdvancing(s);
  }

  /** Progress and Stop while a multi-week advance runs; the usual controls after it. */
  function renderAdvancing(s: GameState): void {
    const on = advanceInProgress();
    root.toggleAttribute('data-advancing', on);
    if (on) setMenuOpen(false);
    advanceBtn.textContent = on ? advanceProgressLabel(s.week) : playerMatchPending() ? RESUME_MATCH_LABEL : 'Advance Week';
    // #350 H1: a decision waiting shows on the button that would take its default.
    const waiting = on ? 0 : s.eventDeck.pending.length;
    if (waiting > 0) {
      advanceBtn.append(el('span', {
        class: 'nrl-hud-alert', text: String(waiting), attrs: { 'aria-label': decisionsBadgeLabel(waiting), 'data-hud': 'decisions' },
      }));
    }
    advanceBtn.disabled = on || !opts.onAdvanceWeek;
    advanceBtn.classList.toggle('nrl-hud-progress', on);
    menuToggle.hidden = on;
    if (on && stopBtn.hidden) stopBtn.disabled = false;
    stopBtn.hidden = !on;
  }

  // Initial paint from the store.
  render(getState());

  // Subscribe: state:changed is the source of truth; money:changed gives a snappy
  // money-only update (and drives the flash) between full state changes.
  const offState = bus.on('state:changed', (s) => render(s));
  const offMoney = bus.on('money:changed', ({ balance }) => renderMoney(balance));
  // Save & exit shows the club again without a state change; full time clears the
  // record in the same turn as match:finished, so the label updates after that.
  const offParked = bus.on('match:parked', () => render(getState()));
  const offFinished = bus.on('match:finished', () => queueMicrotask(() => render(getState())));

  mount(root);
  // Screens sit below the HUD (GitHub #14): publish our live height.
  const offInset = trackChromeInset(root, HUD_INSET_VAR);

  return {
    el: root,
    destroy() {
      offState();
      offMoney();
      offParked();
      offFinished();
      offInset();
      setMenuOpen(false);
      if (flashTimer) clearTimeout(flashTimer);
      root.remove();
    },
  };
}
