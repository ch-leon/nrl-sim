// src/ui/hud.ts — the dock's status block (money, week) and PLAY WEEK, and the
// club home's decisions chip. See ARCHITECTURE §4 (store), §5 (events), §7 (DOM
// persists across scenes), BAK-163 and docs/specs/ui-broadcast-quiet.md (the
// dock, 3a). No Phaser imports. The HUD lives independently of Phaser scenes;
// call destroy() to unsubscribe and remove it.

import { bus } from '../core/events';
import { getState, type GameState, type Objective } from '../core/state';
import type { AdvanceTarget } from '../core/advanceRules';
import { weekHeld } from '../core/time';
import { advanceInProgress, stopAdvance } from '../core/advance';
import { playerMatchPending, resumePlayerMatch } from '../systems/matchday';
import { nextFixture } from '../systems/league';
import { RISK_WORD, ladderStanding, worstObjective, type ObjectiveRisk } from '../systems/board';
import { ECON, WEEKS_PER_SEASON } from '../config';
import { el, button, mount, ensureStyles, dock, activeScreen, onScreenChange } from './dom';

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
  /** Called from the board chip (#368). Absent => no chip. */
  onBoard?: () => void;
  /** The decisions chip's REVIEW (3a). Absent => no chip. */
  onDecisions?: () => void;
  /** The decisions waiting, soonest due first: the chip names the first. */
  decisions?: (s: GameState) => readonly { title: string; note: string }[];
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

/** "$32k", "-$4k", "$1.2m": money short enough for the board chip's second line. */
export function fmtMoneyShort(n: number): string {
  const abs = Math.abs(Math.round(n));
  const body = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}m` : abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(abs);
  return `${n < 0 && abs > 0 ? '-' : ''}$${body}`;
}

/** The board chip's short form (#368): "top 8", "rival", "cash", "build". */
const BOARD_SHORT: Readonly<Record<Objective['kind'], (target: number) => string>> = {
  finals: (target) => `top ${target}`, beatRival: () => 'rival', solvent: () => 'cash', build: () => 'build',
};

/**
 * The hub's board chip (#368): the single worst objective at risk or worse, in
 * two short lines ("Board: top 8" over "You're 11th"); `short` is the one-word
 * form ("top 8"). The objective in full is in the label. Null when every
 * objective is on track. `runwayWeeks` is the money readout's. Pure.
 */
export function boardChip(s: GameState, runwayWeeks: number | null): { title: string; detail: string; short: string; label: string; risk: ObjectiveRisk } | null {
  const worst = worstObjective(s, runwayWeeks);
  if (!worst) return null;
  const { objective: o, risk } = worst;
  let title: string;
  let detail: string;
  switch (o.kind) {
    case 'finals': {
      title = `Board: top ${o.target}`;
      detail = `You're ${ordinal(ladderStanding(s).rank)}`;
      break;
    }
    case 'beatRival': {
      // The rival by name in the label only.
      title = 'Board: rival';
      detail = `${ordinal(ladderStanding(s).rank)} v ${ordinal(ladderStanding(s, o.rivalId).rank)}`;
      break;
    }
    case 'solvent': {
      title = o.target === 0 ? 'Board: solvent' : `Board: ${fmtMoneyShort(o.target)}`;
      const weeks = runwayWeeks === null ? null : Math.floor(runwayWeeks);
      detail = s.money < o.target || weeks === null ? `You have ${fmtMoneyShort(s.money)}` : `Cash: ${weeks} wk${weeks === 1 ? '' : 's'}`;
      break;
    }
    case 'build': {
      title = `Board: ${o.target} built`;
      detail = `You have ${s.facilities.length}`;
      break;
    }
  }
  return { title, detail, short: BOARD_SHORT[o.kind](o.target), risk, label: `Board objective ${RISK_WORD[risk].toLowerCase()}: ${o.text}. ${detail}` };
}

/** The board chip's class for each risk it shows (#368). */
export const BOARD_RISK_CLASS = { 'at-risk': 'nrl-hud-board-risk', 'off-track': 'nrl-hud-board-off' } as const;

/**
 * Play the week from the club: PLAY WEEK, and the weekly summary's button (#368).
 * A parked match resumes, a held week says so, otherwise `onAdvanceWeek` runs.
 */
export function advanceFromClub(onAdvanceWeek?: () => void): void {
  const choice = clubAdvanceChoice(playerMatchPending(), weekHeld());
  if (choice === 'resume') {
    resumePlayerMatch();
    return;
  }
  if (choice === 'wait') {
    weekStillFinishing();
    return;
  }
  onAdvanceWeek?.();
}

/** PLAY WEEK's sub-line: "v Darwin · away", empty with no match left this season. Pure. */
export function playWeekSub(s: Pick<GameState, 'league' | 'week'>): string {
  const f = nextFixture(s.league.fixtures, s.week, 'player');
  if (!f) return '';
  const home = f.homeId === 'player';
  const opp = s.league.clubs.find((c) => c.id === (home ? f.awayId : f.homeId));
  return opp ? `v ${placeName(opp.name)} · ${home ? 'home' : 'away'}` : '';
}

/** The PLAY WEEK button's label: the week, a parked match to resume, or the run's progress. */
export const PLAY_WEEK_LABEL = 'Play week ▸';

/** The decisions chip's count line: "2 DECISIONS". */
export function decisionsChipCount(n: number): string {
  return `${n} ${n === 1 ? 'decision' : 'decisions'}`.toUpperCase();
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
 * Fill the dock's status block and PLAY WEEK, mount the decisions chip,
 * subscribe them to the bus and render the current getState() immediately.
 * Returns a handle whose destroy() removes the bus listeners and the DOM (no
 * leaks across scene/context switches).
 */
export function createHud(opts: HudOpts = {}): Hud {
  ensureStyles();
  const parts = dock();

  // Status: the balance (amber or red as the runway shortens, #351 H2; a tap opens
  // Finance) over the week and season.
  const moneyEl = el('span', { class: 'nrl-dock-money', attrs: { 'data-hud': 'money' } });
  const weekEl = el('span', { class: 'nrl-dock-week', attrs: { 'data-hud': 'week' } });
  const statusBox = opts.onMoney
    ? el('button', { class: 'nrl-dock-statusbox', attrs: { type: 'button' }, onClick: () => opts.onMoney?.() }, moneyEl, weekEl)
    : el('div', { class: 'nrl-dock-statusbox' }, moneyEl, weekEl);
  let runway: number | null = null;
  parts.status.replaceChildren(statusBox, el('span', { class: 'nrl-dock-divider', attrs: { 'aria-hidden': 'true' } }));

  // PLAY WEEK ▸ over who is next (#350 H1: "v Darwin · away").
  const advanceLabel = el('span', { class: 'nrl-dock-advance-label' });
  const advanceSub = el('span', { class: 'nrl-dock-advance-sub', attrs: { 'data-hud': 'next' } });
  const advanceBtn = button('', () => advanceFromClub(opts.onAdvanceWeek), { class: 'nrl-dock-advance' });
  advanceBtn.setAttribute('data-hud', 'advance');
  advanceBtn.append(advanceLabel, advanceSub);
  if (!opts.onAdvanceWeek) advanceBtn.disabled = true;

  // #44: the ▾ split: multi-week advances in a menu over the dock's right end,
  // closed by a pick, Escape or an outside tap.
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
    // The menu sits beside the button group in the dock, not inside it: a tap on an item must reach it.
    const t = e.target as Node;
    if (!actions.contains(t) && !menu.contains(t)) setMenuOpen(false);
  }
  function onMenuKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') setMenuOpen(false);
  }

  // N10.2: while a multi-week advance runs, Stop takes the ▾'s place; the run
  // finishes the week in hand and toasts "Stopped after n weeks".
  const stopBtn = button('Stop', () => {
    stopAdvance();
    stopBtn.disabled = true;
  }, { class: 'nrl-hud-stop' });
  stopBtn.hidden = true;

  const actions = el('div', { class: 'nrl-dock-play-group nrl-hud-actions' }, advanceBtn, menuToggle, stopBtn);
  parts.play.replaceChildren(actions, menu);
  const root = parts.dock;

  // 3a: the decisions chip, top-left of the grounds: the count, the first, REVIEW.
  const chipCount = el('span', { class: 'nrl-decisions-chip-count' });
  const chipTop = el('span', { class: 'nrl-decisions-chip-top' });
  const chip = el('div', { class: 'nrl-decisions-chip', attrs: { role: 'status', 'data-decisions-chip': '' } },
    chipCount, chipTop, button('Review', () => opts.onDecisions?.(), { class: 'nrl-decisions-review' }));
  chip.hidden = true;

  // #368: the board objective most at risk, in the decisions chip's style under it; a tap opens Staff & Board.
  const boardTitle = el('span', { class: 'nrl-decisions-chip-count' });
  const boardDetail = el('span', { class: 'nrl-decisions-chip-top' });
  const boardEl = el('button', { class: 'nrl-decisions-chip nrl-board-chip', attrs: { type: 'button', 'data-hud': 'board' }, onClick: () => opts.onBoard?.() },
    boardTitle, boardDetail);
  boardEl.hidden = true;
  const chips = el('div', { class: 'nrl-hub-chips' }, chip, boardEl);
  if (opts.onDecisions || opts.onBoard) mount(chips);

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
    statusBox.setAttribute('aria-label', label);
    statusBox.title = label;

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
    // "/total" is a separate span so a narrow dock can drop it.
    weekEl.replaceChildren(
      document.createTextNode(`WEEK ${s.week}`),
      el('span', { class: 'nrl-dock-week-total', text: `/${WEEKS_PER_SEASON}` }),
      document.createTextNode(` · S${s.season}`),
    );
    weekEl.setAttribute('aria-label', `Week ${s.week} of ${WEEKS_PER_SEASON}, season ${s.season}`);
    const chipInfo = nextMatchChip(s);
    advanceSub.textContent = playWeekSub(s);
    advanceBtn.title = chipInfo?.label ?? '';
    renderAdvancing(s);
    renderChip(s);
  }

  /** The chips show on the bare grounds only: a sheet over them hides them (3a: one place to look). */
  function renderChip(s: GameState): void {
    const board = opts.onBoard && !advanceInProgress() && !activeScreen() ? boardChip(s, runway) : null;
    boardEl.hidden = !board;
    if (board) {
      boardTitle.textContent = board.title.toUpperCase();
      boardDetail.textContent = board.detail;
      boardEl.classList.toggle(BOARD_RISK_CLASS['at-risk'], board.risk === 'at-risk');
      boardEl.classList.toggle(BOARD_RISK_CLASS['off-track'], board.risk === 'off-track');
      const label = `${board.label}. Tap for Staff & Board`;
      boardEl.setAttribute('aria-label', label);
      boardEl.title = label;
    }
    const list = opts.decisions?.(s) ?? [];
    const on = !advanceInProgress() && list.length > 0 && !activeScreen();
    chip.hidden = !on;
    if (!on) return;
    chipCount.textContent = decisionsChipCount(list.length);
    chipTop.textContent = list[0] ? `${list[0].title}${list[0].note ? ` · ${list[0].note}` : ''}` : '';
  }

  /** Progress and Stop while a multi-week advance runs; the usual controls after it. */
  function renderAdvancing(s: GameState): void {
    const on = advanceInProgress();
    actions.toggleAttribute('data-advancing', on);
    root.toggleAttribute('data-advancing', on);
    if (on) setMenuOpen(false);
    advanceLabel.textContent = (on ? advanceProgressLabel(s.week) : playerMatchPending() ? `${RESUME_MATCH_LABEL} ▸` : PLAY_WEEK_LABEL).toUpperCase();
    advanceSub.hidden = on;
    // #350 H1: a decision waiting shows on the button that would take its default.
    advanceLabel.querySelector('.nrl-hud-alert')?.remove();
    const waiting = on ? 0 : s.eventDeck.pending.length;
    if (waiting > 0) {
      advanceLabel.append(el('span', {
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
  const offScreen = onScreenChange(() => renderChip(getState()));

  return {
    el: root,
    destroy() {
      offState();
      offMoney();
      offParked();
      offFinished();
      offScreen();
      setMenuOpen(false);
      if (flashTimer) clearTimeout(flashTimer);
      parts.status.replaceChildren();
      parts.play.replaceChildren();
      chips.remove();
    },
  };
}
