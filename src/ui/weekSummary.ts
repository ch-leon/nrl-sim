// src/ui/weekSummary.ts — the weekly summary card (#368): what changed since the
// last card (the training gains, who got hurt or banned and who is back, the
// money in and out by line, and the board's mood), shown once the club is back
// on screen after each advance. A ▾ run gets one card for the whole run.
//
// The "before" snapshot lives here in memory, taken at load / new game and again
// as each card shows: nothing is written to GameState or the save, and the card
// listens to the bus rather than wrapping the advance (core/advance.ts,
// core/time.ts and ui/decisions.ts are untouched). It waits for a live match
// (Back to Club), a ▾ run, a dialog (a decision card, the season review), an open
// screen and the tutorial. The Settings popup can switch it off
// (settings.weekSummary; absent = on). No Phaser.

import { bus } from '../core/events';
import { getState, FINANCE_LINES, type FinanceLine, type GameState, type PlayerStats } from '../core/state';
import { advanceInProgress } from '../core/advance';
import { weekHeld } from '../core/time';
import { BOARD, WEEKS_PER_SEASON } from '../config';
import { RISK_WORD, type ObjectiveRisk } from '../systems/board';
import { el, button, openModal, closeModal, activeScreen, dialogOpen } from './dom';
import { boardChip, fmtMoney, fmtMoneyShort } from './hud';
import { MATCH_ACTIVE_CLASS } from './screens/matchOverlay';
import { FINANCE_LINE_LABELS } from './screens/finance';
import { isTutorialActive } from './tutorial';

// ── Snapshot and view-model (pure) ─────────────────────────────────────────────

const STAT_KEYS: readonly (keyof PlayerStats)[] = ['speed', 'strength', 'stamina', 'skill', 'footyIQ'];
const STAT_WORD: Readonly<Record<keyof PlayerStats, string>> = {
  speed: 'speed', strength: 'strength', stamina: 'stamina', skill: 'skill', footyIQ: 'footy IQ',
};

/** What the card compares: the club as it stood at one moment. Plain data, kept in memory only. */
export interface WeekSnapshot {
  season: number;
  week: number;
  squad: { id: string; name: string; stats: PlayerStats; injuredWeeks: number; suspendedWeeks: number }[];
  /** Each season's books on the snapshot, by line (GameState.finance). */
  finance: { season: number; lines: Record<FinanceLine, number> }[];
  boardPatience: number;
  /** The board objective most at risk (the hub chip's lines), or null when all are on track. */
  board: { risk: ObjectiveRisk; text: string } | null;
}

/** The club now, for the card to compare against later. `runwayWeeks` is the money tile's. */
export function weekSnapshot(s: GameState, runwayWeeks: number | null = null): WeekSnapshot {
  const chip = boardChip(s, runwayWeeks);
  return {
    season: s.season,
    week: s.week,
    squad: s.squad.map((p) => ({ id: p.id, name: p.name, stats: { ...p.stats }, injuredWeeks: p.injuredWeeks, suspendedWeeks: p.suspendedWeeks ?? 0 })),
    finance: s.finance.map((f) => ({ season: f.season, lines: Object.fromEntries(FINANCE_LINES.map((l) => [l, f[l]])) as Record<FinanceLine, number> })),
    boardPatience: s.boardPatience,
    board: chip ? { risk: chip.risk, text: `${chip.title.replace(/^Board: /, '')}, ${chip.detail.charAt(0).toLowerCase()}${chip.detail.slice(1)}` } : null,
  };
}

/** The card's top training gains. */
export const TOP_GAINS = 3;
/** Board patience at or under these reads "worried" / "watching" (of BOARD.MAX_PATIENCE). */
export const WORRIED_PATIENCE = 2;
export const WATCHING_PATIENCE = 3;

export type BoardMood = 'happy' | 'watching' | 'worried';

export interface WeekSummary {
  /** Advances the card covers: 1 for a week, more for a ▾ run. */
  weeks: number;
  title: string;
  /** "Smith +0.8 speed", biggest first. */
  gains: string[];
  /** "Smith out 3 wks" for each man hurt since the last card and still out. */
  injuries: string[];
  /** "Smith banned 2 wks". */
  bans: string[];
  /** Names of the men fit again. */
  back: string[];
  /** Each line with money on it, money in first, biggest first. */
  money: { line: FinanceLine; label: string; amount: number }[];
  moneyIn: number;
  moneyOut: number;
  net: number;
  board: { mood: BoardMood; text: string };
}

/** Weeks from one snapshot to the next, across a season's end. */
function weeksBetween(a: Pick<WeekSnapshot, 'season' | 'week'>, b: Pick<WeekSnapshot, 'season' | 'week'>): number {
  return (b.season - a.season) * WEEKS_PER_SEASON + (b.week - a.week);
}

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** One decimal, the player page's "+0.8/wk" (whole numbers lose the ".0"). */
const fmtGain = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');

/** The board in a word: worried when an objective is off track or patience is thin, watching when one is at risk. */
export function boardMood(patience: number, risk: ObjectiveRisk | null): BoardMood {
  if (risk === 'off-track' || patience <= WORRIED_PATIENCE) return 'worried';
  if (risk === 'at-risk' || patience <= WATCHING_PATIENCE) return 'watching';
  return 'happy';
}

/** What changed from `before` to `after` (#368). Pure. */
export function weekSummary(before: WeekSnapshot, after: WeekSnapshot): WeekSummary {
  const weeks = weeksBetween(before, after);
  const lastWeek = after.week - 1;
  const title = weeks <= 1 ? `Week ${before.week}` : before.season === after.season && lastWeek >= before.week
    ? `Weeks ${before.week}–${lastWeek}` : `Last ${weeks} weeks`;

  const was = new Map(before.squad.map((p) => [p.id, p] as const));
  const gains: { name: string; stat: keyof PlayerStats; by: number }[] = [];
  const injuries: string[] = [];
  const bans: string[] = [];
  const back: string[] = [];
  for (const p of after.squad) {
    const old = was.get(p.id);
    if (!old) continue; // signed since: nothing to compare
    for (const stat of STAT_KEYS) {
      const by = p.stats[stat] - old.stats[stat];
      if (Math.round(by * 10) > 0) gains.push({ name: p.name, stat, by });
    }
    if (p.injuredWeeks > 0 && old.injuredWeeks <= 0) injuries.push(`${p.name} out ${plural(p.injuredWeeks, 'wk')}`);
    if (p.suspendedWeeks > 0 && old.suspendedWeeks <= 0) bans.push(`${p.name} banned ${plural(p.suspendedWeeks, 'wk')}`);
    if (p.injuredWeeks <= 0 && p.suspendedWeeks <= 0 && (old.injuredWeeks > 0 || old.suspendedWeeks > 0)) back.push(p.name);
  }
  gains.sort((a, b) => b.by - a.by || a.name.localeCompare(b.name));

  // Each season's lines less what they held on the last card; a season opened since counts from 0.
  const totals = Object.fromEntries(FINANCE_LINES.map((l) => [l, 0])) as Record<FinanceLine, number>;
  const had = new Map(before.finance.map((f) => [f.season, f.lines] as const));
  for (const f of after.finance) {
    const old = had.get(f.season);
    for (const l of FINANCE_LINES) totals[l] += f.lines[l] - (old?.[l] ?? 0);
  }
  const money = FINANCE_LINES
    .map((line) => ({ line, label: FINANCE_LINE_LABELS[line], amount: Math.round(totals[line]) }))
    .filter((m) => m.amount !== 0)
    .sort((a, b) => Number(b.amount > 0) - Number(a.amount > 0) || Math.abs(b.amount) - Math.abs(a.amount));
  const moneyIn = money.reduce((n, m) => n + Math.max(0, m.amount), 0);
  const moneyOut = money.reduce((n, m) => n + Math.min(0, m.amount), 0);

  const mood = boardMood(after.boardPatience, after.board?.risk ?? null);
  const patience = after.boardPatience === before.boardPatience
    ? `patience ${after.boardPatience}/${BOARD.MAX_PATIENCE}`
    : `patience ${before.boardPatience} → ${after.boardPatience}/${BOARD.MAX_PATIENCE}`;
  const why = after.board ? `${after.board.text} (${RISK_WORD[after.board.risk].toLowerCase()})` : 'every objective on track';
  return {
    weeks,
    title,
    gains: gains.slice(0, TOP_GAINS).map((g) => `${g.name} +${fmtGain(g.by)} ${STAT_WORD[g.stat]}`),
    injuries,
    bans,
    back,
    money,
    moneyIn,
    moneyOut,
    net: moneyIn + moneyOut,
    board: { mood, text: `${why} · ${patience}` },
  };
}

/** Lines a list shows before folding the rest into "+n more", so a busy week still fits at 667×375. */
export const LIST_MAX = 3;

/** Up to `max` items, then "+n more". */
export function capList(items: readonly string[], max: number = LIST_MAX): string[] {
  return items.length <= max ? [...items] : [...items.slice(0, max - 1), `+${items.length - max + 1} more`];
}

/** "+$1,234" / "-$1,234". */
export const fmtSigned = (n: number): string => `${n > 0 ? '+' : ''}${fmtMoney(n)}`;

// ── DOM ───────────────────────────────────────────────────────────────────────

/** Should the card show now? Pure over what the page reports, for unit tests. */
export function summaryCanShow(p: {
  due: boolean; enabled: boolean; sacked: boolean; advancing: boolean; held: boolean;
  matchOnScreen: boolean; dialog: boolean; screen: boolean; tutorial: boolean;
}): boolean {
  return p.due && p.enabled && !p.sacked && !p.advancing && !p.held && !p.matchOnScreen && !p.dialog && !p.screen && !p.tutorial;
}

const MOOD_WORD: Readonly<Record<BoardMood, string>> = { happy: 'happy', watching: 'watching', worried: 'worried' };

function section(title: string, lines: readonly string[], empty: string): HTMLElement {
  return el('div', { class: 'nrl-summary-sec' },
    el('h3', { text: title }),
    ...(lines.length ? lines.map((t) => el('p', { text: t })) : [el('p', { class: 'nrl-summary-none', text: empty })]));
}

/** The card: two columns (the squad, then the money and the board) over Advance Week and Close. */
export function openWeekSummary(v: WeekSummary, opts: { onAdvance: () => void }): HTMLElement {
  const squad = [
    ...capList(v.injuries),
    ...capList(v.bans),
    ...(v.back.length ? [`Back: ${capList(v.back).join(', ')}`] : []),
  ];
  const moneyIn = v.money.filter((m) => m.amount > 0).map((m) => `${m.label} ${fmtMoneyShort(m.amount)}`);
  const moneyOut = v.money.filter((m) => m.amount < 0).map((m) => `${m.label} ${fmtMoneyShort(-m.amount)}`);
  const money = el('div', { class: 'nrl-summary-sec' },
    el('h3', {}, 'Money ', el('span', { class: `nrl-summary-net ${v.net < 0 ? 'nrl-summary-down' : 'nrl-summary-up'}`, text: `${fmtSigned(v.net)} net` })),
    el('p', { text: `In ${fmtMoneyShort(v.moneyIn)}${moneyIn.length ? `: ${capList(moneyIn).join(' · ')}` : ''}` }),
    el('p', { text: `Out ${fmtMoneyShort(-v.moneyOut)}${moneyOut.length ? `: ${capList(moneyOut).join(' · ')}` : ''}` }),
  );
  const board = el('div', { class: `nrl-summary-sec nrl-summary-board nrl-summary-${v.board.mood}`, attrs: { 'data-mood': v.board.mood } },
    el('h3', {}, 'Board: ', el('span', { class: 'nrl-summary-mood', text: MOOD_WORD[v.board.mood] })),
    el('p', { text: v.board.text }));

  const advance = button('Advance Week', () => { closeModal(); opts.onAdvance(); }, { class: 'nrl-summary-advance' });
  advance.setAttribute('data-summary-advance', '');
  const close = button('Close', () => closeModal());
  close.setAttribute('data-summary-close', '');
  const content = el('div', { class: 'nrl-summary', attrs: { 'data-week-summary': '' } },
    el('h2', { text: `${v.title} summary` }),
    el('div', { class: 'nrl-summary-cols' },
      el('div', { class: 'nrl-summary-col' },
        section('Training', v.gains, 'No gains to speak of.'),
        section('Injuries & bans', squad, 'Nobody new on the sidelines.')),
      el('div', { class: 'nrl-summary-col' }, money, board)),
    el('div', { class: 'nrl-decisions-actions' }, advance, close));
  return openModal(content, { class: 'nrl-summary-modal', region: true, closeButton: true });
}

/**
 * Wire the card (#368): call once the game is loaded or started, so the first
 * snapshot is the club as the player found it. Every week:advanced marks a card
 * as due; it opens as soon as nothing is in its way, and the snapshot moves on
 * then. With the setting off a due card is dropped and the snapshot moves on, so
 * switching it back on never shows weeks it was off for. `onAdvance` is the
 * HUD's Advance Week (pending decisions still ask first). Returns unsubscribe.
 */
export function initWeekSummary(opts: { onAdvance: () => void; runwayWeeks: (s: GameState) => number | null }): () => void {
  const snap = (): WeekSnapshot => weekSnapshot(getState(), opts.runwayWeeks(getState()));
  let before = snap();
  let due = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;

  const tryShow = (): void => {
    if (!due) return;
    const s = getState();
    if (s.settings.weekSummary === false) {
      due = false;
      before = snap();
      return;
    }
    const can = summaryCanShow({
      due,
      enabled: true,
      sacked: !!s.sacked,
      advancing: advanceInProgress(),
      held: weekHeld(),
      matchOnScreen: typeof document !== 'undefined' && !!document.body?.classList.contains(MATCH_ACTIVE_CLASS),
      dialog: dialogOpen(),
      screen: activeScreen() !== null,
      tutorial: isTutorialActive(),
    });
    if (!can) return;
    const after = snap();
    due = false;
    if (poll) clearInterval(poll);
    poll = undefined;
    openWeekSummary(weekSummary(before, after), { onAdvance: opts.onAdvance });
    before = after;
  };
  // A task later, so whatever the advance opens on its way out (a decision card,
  // the season review) is up first and the card waits behind it.
  const soon = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tryShow, 0);
  };
  const offWeek = bus.on('week:advanced', () => {
    due = true;
    soon();
    // Nothing announces a dialog closing, Back to Club or the tutorial's end: look again now and then.
    if (!poll) poll = setInterval(tryShow, 400);
  });
  const offState = bus.on('state:changed', () => { if (due) soon(); });
  return () => {
    offWeek();
    offState();
    if (timer) clearTimeout(timer);
    if (poll) clearInterval(poll);
  };
}
