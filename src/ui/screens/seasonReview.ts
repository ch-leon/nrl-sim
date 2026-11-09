// src/ui/screens/seasonReview.ts — the season review at rollover (N7, GitHub #190).
//
// The season used to end in a one-line toast. Now two season hooks bracket the
// rollover: one just before anything else runs takes a snapshot (squad, rival
// strengths, reputation), and one after the fixtures and board hooks stamps a
// SeasonReview on the season's record from what they left behind (the
// reviewed objectives before the new season's replace them, the books the
// closing lines just completed, who retired, the juniors in the pool, the
// rival movers). `season:ended` then opens the modal, after any match on
// screen. History reopens the review of any season that has one. The
// builders are pure and unit-tested; the DOM renders them. No Phaser.

import { EXPANSION_COPY } from '../expansionCopy';
import { bus } from '../../core/events';
import {
  getState, type GameState, type SeasonRecord, type SeasonReview,
} from '../../core/state';
import { registerSeasonReview } from '../../systems/stats';
import { BOARD, FINALS_WEEKS, SEASON_ROUNDS } from '../../config';
import { backButton, button, closeScreen, el, openScreen, screenHead } from '../dom';
import { whenNoMatch } from '../updatePrompt';
import { fmtMoney, seasonBooks } from './finance';
import { ensureHistoryStyles, fmtSeasonEndToast, fmtSeasonSummary, openHistoryScreen, seasonEndToastKind } from './history';

// ── Pure builders ───────────────────────────────────────────────────────────

export type { RolloverSnapshot } from '../../systems/stats';
export { addPotm, buildSeasonReview, finalsRun, MOVERS_SHOWN, potmSummary, snapshotBeforeRollover } from '../../systems/stats';

/** "W12 L10 D2 · 480 for, 400 against" or '' for a record without one. */
export function fmtRecord(e: SeasonRecord): string {
  if (e.wins === undefined) return '';
  return `W${e.wins} L${e.losses ?? 0} D${e.draws ?? 0} · ${e.pointsFor ?? 0} for, ${e.pointsAgainst ?? 0} against`;
}

/** "In $812,000 · Out $790,000 · Net +$22,000". */
export function fmtMoneyInOut(m: NonNullable<SeasonReview['money']>): string {
  const net = m.in - m.out;
  return `In ${fmtMoney(m.in)} · Out ${fmtMoney(m.out)} · Net ${net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(net))}`;
}

/** "Redcliffe Reapers 70→73 rising, Launceston Larrikins 42→40 sliding". */
export function fmtMovers(movers: NonNullable<SeasonReview['movers']>): string {
  return movers.map((m) => `${m.name} ${m.from}→${m.to} ${m.to > m.from ? 'rising' : 'sliding'}`).join(', ');
}

// ── Hooks and the modal ─────────────────────────────────────────────────────

/**
 * Register the rollover hooks and the season:ended listener. Called once from
 * initSeasonEndFeedback (history.ts, which main.ts calls at boot). Headless
 * (no document) the season still ends in the toast it always did. Returns the
 * listener's unsubscribe.
 */
export function initSeasonReview(): () => void {
  registerSeasonReview();
  return bus.on('season:ended', ({ season, ladderPosition, premiership }) => {
    // The event carries enough for the toast on its own (a listener must not throw).
    let state: GameState | null = null;
    try { state = getState(); } catch { /* no game loaded */ }
    const entry = state?.history.find((h) => h.season === season) ?? { season, ladderPosition, premiership };
    if (typeof document === 'undefined') {
      bus.emit('ui:notify', { text: fmtSeasonEndToast(entry), kind: seasonEndToastKind(entry) });
      return;
    }
    // The sacked screen is up and says its piece; the review waits in History.
    if (state?.sacked?.season === season) return;
    whenNoMatch(() => { openSeasonReview(entry); });
  });
}

const tick = (met: boolean): string => (met ? '✓' : '✗');

/** "6 awards in matches you watched · most: Jack Taufa (3)": awards are given at the full-time report. */
export function fmtPotmTotal(p: NonNullable<SeasonReview['potm']>): string {
  return `${p.total} award${p.total === 1 ? '' : 's'} in matches you watched${p.best ? ` · most: ${p.best.name} (${p.best.count})` : ''}`;
}

/** The money line is a warning only when the season closed in debt, not whenever more went out than came in. */
export function moneyLineBad(closing: number | undefined): boolean {
  return closing !== undefined && closing < 0;
}

/**
 * The review of a season. A nav sheet rather than a dialog: the dock stays
 * usable under it (the next week can be advanced, History opened). One header
 * row: "◂ HISTORY" and the title when opened from History (`back`); at the
 * rollover, the title with HISTORY and the one primary, CARRY ON, which closes it.
 */
export function openSeasonReview(entry: SeasonRecord, opts: { back?: () => void } = {}): HTMLElement {
  ensureHistoryStyles();
  const r = entry.review ?? {};
  const body = el('div', { class: 'nrl-review-body' });
  const line = (label: string, text: string, cls = ''): HTMLElement =>
    el('div', { class: `nrl-review-line ${cls}`.trim() }, el('span', { class: 'nrl-label', text: label }), el('span', { text }));

  const toHistory = (): void => { closeScreen(); (opts.back ?? openHistoryScreen)(); };
  const history = opts.back ? backButton('History', toHistory) : button('History', toHistory);
  history.classList.add('nrl-review-history');
  const head = opts.back
    ? screenHead(`Season ${entry.season} review`, { lead: [history] })
    : screenHead(`Season ${entry.season} review`, { controls: [history, button('Carry on ▸', () => closeScreen(), { class: 'nrl-btn-primary nrl-review-done' })] });
  head.classList.add('nrl-review-head');

  body.append(el('div', { class: `nrl-review-finish${entry.premiership ? ' nrl-review-premiers' : ''}`, text: fmtSeasonSummary(entry).replace(/^Season \d+ — /, '') }));
  if (entry.season === 1) body.append(el('p', { text: EXPANSION_COPY.review, attrs: { 'data-expansion-review': '' } }));
  // Two columns on a landscape phone: how the club did, then the club around it.
  const season = el('div', { class: 'nrl-review-col' });
  const club = el('div', { class: 'nrl-review-col' });
  const record = fmtRecord(entry);
  if (record) season.append(line('Record', `${record} (${SEASON_ROUNDS} rounds${entry.ladderPosition > 0 && entry.ladderPosition <= 8 ? `, finals over ${FINALS_WEEKS} weeks` : ''})`));
  if (entry.topScorer) season.append(line('Top try-scorer', `${entry.topScorer.name} (${entry.topScorer.tries})`));
  if (r.potm) season.append(line('Player of the match', fmtPotmTotal(r.potm)));
  if (r.board) {
    const b = r.board;
    const verdict = b.sacked ? 'sacked' : b.missed === 0 ? 'all met' : `${b.met} met, ${b.missed} missed`;
    season.append(line('Board', `${verdict} · patience ${b.patience}/${BOARD.MAX_PATIENCE}`, b.missed === 0 ? 'nrl-review-good' : 'nrl-review-bad'));
    season.append(el('ul', { class: 'nrl-review-objectives' }, ...b.objectives.map((o) => el('li', { class: o.met ? 'nrl-review-good' : 'nrl-review-bad', text: `${tick(o.met)} ${o.text}` }))));
  }
  if (r.reputation) {
    const d = r.reputation.to - r.reputation.from;
    season.append(line('Reputation', `${r.reputation.from} → ${r.reputation.to}${d === 0 ? '' : ` (${d > 0 ? '+' : ''}${d})`}`, d < 0 ? 'nrl-review-bad' : d > 0 ? 'nrl-review-good' : ''));
  }
  if (r.money) {
    // The closing balance from the books (N14, #262), where they were kept.
    const books = seasonBooks(getState(), entry.season);
    club.append(line('Money', `${fmtMoneyInOut(r.money)}${books ? ` · closed on ${fmtMoney(books.closing)}` : ''}`, moneyLineBad(books?.closing) ? 'nrl-review-bad' : ''));
  }
  if (r.retired && r.retired.length > 0) club.append(line('Retired', r.retired.map((p) => `${p.name} (${p.age})`).join(', ')));
  if (r.juniors) club.append(line('Academy', `${r.juniors} prospect${r.juniors === 1 ? '' : 's'} in the free-agent pool`));
  if (r.movers && r.movers.length > 0) club.append(line('Rivals', fmtMovers(r.movers)));
  body.append(el('div', { class: 'nrl-review-lines' }, season, ...(club.childElementCount > 0 ? [club] : [])));

  const sheet = el('div', { class: 'nrl-screen nrl-season-review', attrs: { 'data-season-review': String(entry.season) } }, head, body);
  return openScreen(sheet, undefined, 'history');
}
