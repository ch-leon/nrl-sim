// src/ui/screens/history.ts — season-end feedback + past-seasons History screen
// (GitHub #3 / BAK-206 backlog S2; Broadcast Quiet 3l). A sheet with a one-line
// summary, a table of the seasons (finish, record, points, the player of the
// season, the net, and each one's review and books) and the club's Records &
// Leaders beside it on a segmented control. Pure helpers are exported for node
// tests; DOM open/init follow the fixtures.ts / hud.ts conventions (no Phaser).

import { getState, type GameState, type SeasonRecord, type Player } from '../../core/state';
import { el, button, openScreen, closeScreen, screenHead, segmented, backButton } from '../dom';
import { initSeasonReview, openSeasonReview } from './seasonReview';
import { FINANCE_LINE_LABELS, ensureFinanceStyles, fmtMoney, fmtMoneyCompact, fmtNetClosing, seasonBooks } from './finance';
import { FINALS_ROUNDS } from '../../systems/fixtures';
import { roundLabel } from '../../systems/matchday';

/** The top eight make the finals (systems/fixtures finalsSeeds). */
const FINALS_TEAMS = 8;

export type SeasonHistoryEntry = SeasonRecord;

/**
 * One-line season summary, e.g. "Season 1 — finished 4th · out in the
 * Qualifying Final" or "Season 2 — PREMIERS (ladder 2nd)".
 */
export function fmtSeasonSummary(entry: SeasonHistoryEntry): string {
  const pos = entry.ladderPosition > 0 ? ordinal(entry.ladderPosition) : 'unranked';
  if (entry.premiership) {
    return `Season ${entry.season} — PREMIERS (ladder ${pos})`;
  }
  const finals = fmtFinalsOutcome(entry);
  return `Season ${entry.season} — finished ${pos}${finals ? ` · ${finals}` : ''}`;
}

/**
 * How the season ended past the ladder (#351 E2): "out in the Qualifying Final",
 * "lost the Grand Final", "missed the finals". '' for a premiership (the summary
 * says it) and for seasons without a review (before v12), which kept no finals.
 */
export function fmtFinalsOutcome(entry: SeasonHistoryEntry): string {
  if (entry.premiership || !entry.review) return '';
  const f = entry.review.finals;
  if (f && !f.won) return f.round === FINALS_ROUNDS.GF ? 'lost the Grand Final' : `out in the ${roundLabel(f.round)}`;
  if (entry.ladderPosition > FINALS_TEAMS) return 'missed the finals';
  return '';
}

/** Extra detail line for v4+ entries, e.g. "W12 L10 D2 · PF 480 PA 400 · Top try-scorer: X (9)". */
export function fmtSeasonDetail(e: SeasonRecord): string {
  if (e.wins === undefined) return '';
  const parts = [`W${e.wins} L${e.losses ?? 0} D${e.draws ?? 0}`, `PF ${e.pointsFor ?? 0} PA ${e.pointsAgainst ?? 0}`];
  if (e.topScorer) parts.push(`Top try-scorer: ${e.topScorer.name} (${e.topScorer.tries})`);
  return parts.join(' · ');
}

/** The History note on a season played before the Nines rules (#77). */
export const PRE_NINES_NOTE = 'Before Nines: 80-minute matches, no bonus tries';

/**
 * Was this season played before the Nines rules (#77)? Derived, not stored: the
 * old engine's 80-minute matches gave way to the Nines sim (#162) after the season
 * review arrived (save v12, #190), and every season recorded since carries a review,
 * so a season without one was played on the old rules.
 */
export function playedBeforeNines(e: SeasonRecord): boolean {
  return e.review === undefined;
}

/** The season's rules note for History, or '' for a Nines season. */
export function fmtRulesNote(e: SeasonRecord): string {
  return playedBeforeNines(e) ? PRE_NINES_NOTE : '';
}

export interface ClubRecords {
  premierships: number;
  bestFinish: number | null;
  mostPoints: { season: number; points: number } | null;
  mostTries: { name: string; tries: number; season: number } | null;
  careerTries: { name: string; value: number } | null;
  careerTackles: { name: string; value: number } | null;
  careerLineBreaks: { name: string; value: number } | null;
  seasonTries: { name: string; value: number } | null;
}

function leader(squad: readonly Player[], pick: (p: Player) => number): { name: string; value: number } | null {
  let best: { name: string; value: number } | null = null;
  for (const p of squad) {
    const v = pick(p);
    if (v > 0 && (!best || v > best.value || (v === best.value && p.name < best.name))) best = { name: p.name, value: v };
  }
  return best;
}

/** Club records + leaders from history and player tallies (pure). */
export function computeRecords(state: Pick<GameState, 'history' | 'squad' | 'season'>): ClubRecords {
  const h = state.history;
  const ranked = h.filter((e) => e.ladderPosition > 0);
  let mostPoints: ClubRecords['mostPoints'] = null;
  let mostTries: ClubRecords['mostTries'] = null;
  for (const e of h) {
    if (e.pointsFor !== undefined && (!mostPoints || e.pointsFor > mostPoints.points)) mostPoints = { season: e.season, points: e.pointsFor };
    if (e.topScorer && (!mostTries || e.topScorer.tries > mostTries.tries)) mostTries = { ...e.topScorer, season: e.season };
  }
  return {
    premierships: h.filter((e) => e.premiership).length,
    bestFinish: ranked.length ? Math.min(...ranked.map((e) => e.ladderPosition)) : null,
    mostPoints, mostTries,
    careerTries: leader(state.squad, (p) => p.career?.tries ?? 0),
    careerTackles: leader(state.squad, (p) => p.career?.tackles ?? 0),
    careerLineBreaks: leader(state.squad, (p) => p.career?.lineBreaks ?? 0),
    seasonTries: leader(state.squad, (p) => (p.seasonStats?.season === state.season ? p.seasonStats.tries : 0)),
  };
}

/** Toast copy for the season:ended event. */
export function fmtSeasonEndToast(entry: SeasonHistoryEntry): string {
  if (entry.premiership) {
    return `Season ${entry.season} complete — PREMIERS! (ladder ${ordinal(entry.ladderPosition)})`;
  }
  if (entry.ladderPosition > 0) {
    return `Season ${entry.season} complete — finished ${ordinal(entry.ladderPosition)} on the ladder.`;
  }
  return `Season ${entry.season} complete.`;
}

/** Kind for the season-end toast. */
export function seasonEndToastKind(
  entry: SeasonHistoryEntry,
): 'info' | 'success' | 'danger' {
  if (entry.premiership) return 'success';
  if (entry.ladderPosition > 0 && entry.ladderPosition <= 8) return 'info';
  return 'info';
}

function ordinal(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** History entries newest-first for display. */
export function historyNewestFirst(
  history: readonly SeasonHistoryEntry[],
): SeasonHistoryEntry[] {
  return history.slice().reverse();
}

/** The head's summary (3l): "3 seasons · 0 premierships · best finish 3rd". */
export function fmtHistorySummary(history: readonly SeasonHistoryEntry[]): string {
  const r = computeRecords({ history: [...history], squad: [], season: 0 });
  const n = history.length;
  const best = r.bestFinish ? ` · best finish ${ordinal(r.bestFinish)}` : '';
  return `${n} season${n === 1 ? '' : 's'} · ${r.premierships} premiership${r.premierships === 1 ? '' : 's'}${best}`;
}

/** One row of the History table (3l), every column as text. Pure. */
export interface HistoryRowView {
  season: string;
  finish: string;
  /** The club's best finish (yellow), or a premiership. */
  best: boolean;
  premiers: boolean;
  /** "15–8", or "12–1–10" (W–D–L) when any season had a draw. */
  wl: string;
  /** "480–400": points for and against. */
  pfpa: string;
  /** Ladder points: two a win, one a draw. */
  pts: string;
  /** The player of the season: most player-of-the-match awards, else the top try-scorer. */
  player: string;
  /** The rest of the season in a line: how it ended past the ladder, the top try-scorer, the rules it was played under. */
  note: string;
  /** The season's net from its books, or null where none were kept. */
  net: number | null;
}

export function historyRowView(entry: SeasonHistoryEntry, state: Pick<GameState, 'finance' | 'money' | 'history'>): HistoryRowView {
  const best = computeRecords({ history: state.history, squad: [], season: 0 }).bestFinish;
  const potm = entry.review?.potm?.best;
  const top = entry.topScorer;
  const player = potm ? potm.name : top ? top.name : '—';
  const notes: string[] = [];
  const out = fmtFinalsOutcome(entry);
  if (out) notes.push(out[0]!.toUpperCase() + out.slice(1));
  if (potm) notes.push(`${potm.count} player-of-the-match award${potm.count === 1 ? '' : 's'}`);
  if (top && (potm || top.tries > 0)) notes.push(`top try-scorer ${top.name} (${top.tries})`);
  const rules = fmtRulesNote(entry);
  if (rules) notes.push(rules);
  const w = entry.wins;
  const d = entry.draws ?? 0;
  // One shape down the column: W–D–L once any season had a draw.
  const draws = state.history.some((h) => (h.draws ?? 0) > 0);
  const l = entry.losses ?? 0;
  return {
    season: `S${entry.season}`,
    finish: entry.ladderPosition > 0 ? ordinal(entry.ladderPosition) : '—',
    best: entry.premiership || (best !== null && entry.ladderPosition === best),
    premiers: entry.premiership,
    wl: w === undefined ? '—' : draws ? `${w}–${d}–${l}` : `${w}–${l}`,
    pfpa: entry.pointsFor === undefined ? '' : `${entry.pointsFor}–${entry.pointsAgainst ?? 0}`,
    pts: w === undefined ? '—' : String(w * 2 + d),
    player,
    note: notes.join(' · '),
    net: seasonBooks(state, entry.season)?.net ?? null,
  };
}

/** SEASONS or RECORDS (3l); the choice holds while the game is open. */
let historyView: 'seasons' | 'records' = 'seasons';

/** The seasons table (3l): one row a season, newest first, with its review and books. */
function buildSeasonsTable(state: GameState): HTMLElement {
  if (state.history.length === 0) {
    return el('div', { class: 'nrl-screen-empty nrl-history-empty', text: 'No completed seasons yet — finish a season to see results here.' });
  }
  const draws = state.history.some((h) => (h.draws ?? 0) > 0);
  // The column heads hold still above the rows, which scroll.
  const rows = el('div', { class: 'nrl-history-rows', attrs: { role: 'rowgroup' } });
  const grid = el('div', { class: 'nrl-history-table', attrs: { role: 'table' } });
  grid.append(el('div', { class: 'nrl-history-row nrl-history-headrow', attrs: { role: 'row' } },
    ...['Season', 'Finish', draws ? 'W–D–L' : 'W–L', 'Pts', 'Player of the season', 'Net', ''].map((h) => el('span', { class: 'nrl-label', text: h, attrs: { role: 'columnheader' } }))));
  for (const entry of historyNewestFirst(state.history)) {
    const v = historyRowView(entry, state);
    // The season review (#190), for seasons that have one (v12+), and its books (N14, #262).
    const actions = el('span', { class: 'nrl-history-actions' });
    if (entry.review) actions.append(button('Review', () => openSeasonReview(entry, { back: () => { openHistoryScreen(); } }), { class: 'nrl-history-review' }));
    actions.append(button('Books', () => openSeasonBooks(entry, { back: () => { openHistoryScreen(); } }), { class: 'nrl-history-books' }));
    const net = v.net === null ? '—' : `${v.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(v.net))}`;
    rows.append(el('div', { class: `nrl-history-row${v.premiers ? ' nrl-history-premiers' : ''}`, attrs: { role: 'row', 'data-history-season': String(entry.season) } },
      el('span', { class: 'nrl-num nrl-history-season', text: v.season }),
      el('span', { class: `nrl-history-finish${v.best ? ' nrl-history-best' : ''}` }, v.finish, ...(v.premiers ? [el('small', { text: '★ Premiers' })] : [])),
      el('span', { class: 'nrl-num nrl-history-wl', attrs: v.pfpa ? { title: `Points for–against ${v.pfpa}` } : {} }, v.wl, ...(v.pfpa ? [el('small', { text: v.pfpa })] : [])),
      el('span', { class: 'nrl-num', text: v.pts }),
      el('span', { class: 'nrl-history-player', attrs: v.note ? { title: v.note } : {} }, v.player, ...(v.note ? [el('small', { text: v.note })] : [])),
      el('span', { class: `nrl-num nrl-history-net${v.net === null ? '' : v.net < 0 ? ' nrl-neg' : ' nrl-pos'}`, text: net }),
      actions,
    ));
  }
  grid.append(rows);
  return grid;
}

/** Records & Leaders: the club's bests and the squad's leaders, label and value a row. */
function buildRecords(state: GameState): HTMLElement {
  const r = computeRecords(state);
  const fmt = (x: { name: string; value: number } | null): string => (x ? `${x.name} (${x.value})` : '—');
  const rows: [string, string][] = [
    ['Premierships', String(r.premierships)],
    ['Best finish', r.bestFinish ? ordinal(r.bestFinish) : '—'],
    ['Most points in a season', r.mostPoints ? `${r.mostPoints.points} (Season ${r.mostPoints.season})` : '—'],
    ['Most tries in a season', r.mostTries ? `${r.mostTries.name} (${r.mostTries.tries}, Season ${r.mostTries.season})` : '—'],
    ['This season\'s try leader', fmt(r.seasonTries)],
    ['Career tries', fmt(r.careerTries)],
    ['Career tackles', fmt(r.careerTackles)],
    ['Career line breaks', fmt(r.careerLineBreaks)],
  ];
  return el('div', { class: 'nrl-history-records' },
    ...rows.map(([label, value]) => el('div', { class: 'nrl-history-record' }, el('span', { class: 'nrl-label', text: label }), el('span', { text: value }))));
}

/** Open the History sheet (3l): past seasons from GameState.history, and the club's records. */
export function openHistoryScreen(): HTMLElement {
  ensureHistoryStyles();
  const state = getState();
  const body = el('div', { class: 'nrl-history-body' });
  const render = (): void => { body.replaceChildren(historyView === 'seasons' ? buildSeasonsTable(state) : buildRecords(state)); };
  const seg = segmented<'seasons' | 'records'>(
    [{ id: 'seasons', label: 'Seasons' }, { id: 'records', label: 'Records' }],
    historyView,
    (id) => { historyView = id; seg.set(id); render(); },
    { label: 'History view' },
  );
  render();
  const sheet = el('div', { class: 'nrl-screen nrl-history' },
    screenHead('History', { sub: el('span', { class: 'nrl-screen-sub', text: fmtHistorySummary(state.history) }), controls: [seg.el] }),
    body);
  return openScreen(sheet, undefined, 'history');
}

/** The line at the top of a season's books: "Season 2 — finished 4th · W12 L10 D2 · PF 480 PA 400". */
export function fmtBooksHeading(entry: SeasonHistoryEntry): string {
  const detail = fmtSeasonDetail(entry).split(' · Top try-scorer')[0];
  return detail ? `${fmtSeasonSummary(entry)} · ${detail}` : fmtSeasonSummary(entry);
}

/**
 * A past season's books (N14, #262): every line of its P&L, the net and the
 * balance it closed on, under the season's one-line summary. Seasons from before
 * the books were kept (save v10) say so. The header row holds the way back to
 * History; the frame's ✕ closes.
 */
export function openSeasonBooks(entry: SeasonHistoryEntry, opts: { back?: () => void } = {}): HTMLElement {
  ensureHistoryStyles();
  const books = seasonBooks(getState(), entry.season);
  const back = backButton('History', () => { closeScreen(); (opts.back ?? openHistoryScreen)(); });
  back.classList.add('nrl-books-back');
  const sheet = el('div', { class: 'nrl-screen nrl-season-books', attrs: { 'data-season-books': String(entry.season) } },
    screenHead(`Season ${entry.season} books`, { lead: [back], sub: el('span', { class: 'nrl-screen-sub nrl-books-heading', text: fmtBooksHeading(entry) }) }));
  if (!books) {
    sheet.append(el('div', { class: 'nrl-screen-empty', text: 'No books kept for this season: the club started keeping them in a later version of the game.' }));
  } else {
    const table = el('table', { class: 'nrl-table nrl-finance-table nrl-books-table' });
    table.append(el('thead', {}, el('tr', {}, el('th', { text: 'Line' }), el('th', { class: 'nrl-num', text: `S${entry.season}` }))));
    const tbody = el('tbody');
    const cell = (v: number): HTMLElement => {
      const td = el('td', { class: 'nrl-num', text: v === 0 ? '—' : fmtMoneyCompact(v) });
      if (v < 0) td.classList.add('nrl-neg');
      return td;
    };
    for (const r of books.rows) tbody.append(el('tr', {}, el('td', { text: FINANCE_LINE_LABELS[r.line] }), cell(r.amount)));
    tbody.append(el('tr', { class: 'nrl-finance-pnl-net' }, el('td', { text: 'Net' }), cell(books.net)));
    tbody.append(el('tr', { class: 'nrl-books-closing' }, el('td', { text: 'Closing balance' }), el('td', { text: fmtMoney(books.closing), class: `nrl-num${books.closing < 0 ? ' nrl-neg' : ''}` })));
    table.append(tbody);
    // The two numbers that matter beside the table, which scrolls.
    const tile = (label: string, value: string, cls: string): HTMLElement =>
      el('div', { class: 'nrl-finance-tile' }, el('span', { class: 'nrl-label', text: label }), el('span', { class: `nrl-finance-big nrl-num ${cls}`, text: value }));
    const net = Math.round(books.net);
    sheet.append(el('div', { class: 'nrl-books-body' },
      el('div', { class: 'nrl-books-scroll' }, table),
      el('div', { class: 'nrl-books-keys' },
        tile('Net', `${net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(net))}`, net < 0 ? 'nrl-neg' : 'nrl-pos'),
        tile('Closing balance', fmtMoney(books.closing), books.closing < 0 ? 'nrl-neg' : ''),
        el('p', { class: 'nrl-books-summary', text: fmtNetClosing(books) }))));
  }
  return openScreen(sheet, undefined, 'history');
}

/**
 * Season's end: the review modal (#190) in a browser, after any match on
 * screen; the toast with ladder position / premiership where there is no
 * document (headless). Called once from main.ts. Returns unsubscribe.
 */
export function initSeasonEndFeedback(): () => void {
  return initSeasonReview();
}

/** Latest history entry from state, if any. */
export function latestHistoryEntry(state: GameState): SeasonHistoryEntry | undefined {
  return state.history.length > 0
    ? state.history[state.history.length - 1]
    : undefined;
}

// ── Styles (History, a season's books and the season review) ─────────────────

const HISTORY_STYLE_ID = 'nrl-history-styles';

/** Inject History's stylesheet once (with Finance's, whose tiles and tables the books use). */
export function ensureHistoryStyles(): void {
  if (typeof document === 'undefined') return;
  ensureFinanceStyles();
  if (document.getElementById(HISTORY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HISTORY_STYLE_ID;
  style.textContent = HISTORY_CSS;
  document.head.appendChild(style);
}

export const HISTORY_CSS = `
/* 3l: one row a season, newest first; only the rows scroll. */
.nrl-history-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; }
.nrl-history-table { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-history-rows { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-history-row {
  display: grid;
  grid-template-columns: 52px 80px 70px 44px minmax(0, 1fr) 104px 150px;
  align-items: center;
  column-gap: 8px;
  min-height: 44px;
  padding: 4px 0;
  border-top: 1px solid var(--nrl-button);
  font-size: 0.8125rem;
  box-sizing: border-box;
}
.nrl-history-row.nrl-history-headrow { min-height: 22px; padding: 0; border-top: 0; flex: 0 0 auto; }
.nrl-history-row > span { min-width: 0; }
.nrl-history-row .nrl-num { font-weight: 500; }
.nrl-history-row small { display: block; font-family: var(--nrl-f-body); font-size: 0.6875rem; font-weight: 400; color: var(--nrl-muted); line-height: 1.3; letter-spacing: 0; text-transform: none; }
.nrl-history-finish { font-family: var(--nrl-f-label); font-size: 1rem; font-weight: 700; }
.nrl-history-finish.nrl-history-best { color: var(--nrl-accent); }
.nrl-history-finish small { color: var(--nrl-accent); font-family: var(--nrl-f-label); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-history-player { overflow-wrap: anywhere; }
.nrl-history-actions { display: flex; gap: 6px; justify-content: flex-end; }
.nrl-history-actions .nrl-btn { min-height: 34px; padding: 0 12px; font-size: 0.875rem; border-radius: 8px; }
@media (pointer: coarse) { .nrl-history-actions .nrl-btn { min-height: 44px; } }
.nrl-history-empty { padding: 32px 16px; }
/* A narrow phone (667px): slimmer columns, and the season's note to two lines (the whole of it in its tooltip). */
@media (max-width: 700px) {
  .nrl-history-row { grid-template-columns: 48px 58px 62px 30px minmax(0, 1fr) 92px 128px; column-gap: 6px; }
  .nrl-history-player small { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .nrl-history-actions { gap: 4px; }
  .nrl-history-actions .nrl-btn { padding: 0 8px; font-size: 0.8125rem; }
}
.nrl-history-records { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); column-gap: 24px; }
.nrl-history-record { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 32px; border-top: 1px solid var(--nrl-button); font-size: 0.8125rem; }
.nrl-history-record > span:last-child { text-align: right; }

/* A season's books: the table scrolls, the net and the closing balance beside it. */
.nrl-books-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 460px) minmax(180px, 240px); gap: 16px; }
.nrl-books-scroll { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-books-keys { display: flex; flex-direction: column; gap: 6px; }
.nrl-books-summary { font-size: 0.75rem; color: var(--nrl-muted); margin: 0; }
.nrl-books-closing td { border-top: 1px solid var(--nrl-line); font-weight: 600; }

/* The season review (N7, #190): the finish, then the season in labelled lines, two columns. */
.nrl-review-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-review-finish {
  font-family: var(--nrl-f-label); font-size: 1.25rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--nrl-raised); border-radius: 10px; padding: 8px 12px; margin-bottom: 6px;
}
.nrl-review-finish.nrl-review-premiers { background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-review-lines { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); column-gap: 20px; align-items: start; }
.nrl-review-col { display: flex; flex-direction: column; }
.nrl-review-line { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 8px; align-items: baseline; padding: 5px 0; border-top: 1px solid var(--nrl-button); font-size: 0.8125rem; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-review-line > .nrl-label { font-size: 0.75rem; }
.nrl-review-objectives { list-style: none; margin: 0 0 4px 120px; padding: 0; font-size: 0.75rem; }
.nrl-review-objectives li { padding: 1px 0; }
.nrl-review-good, .nrl-review-line.nrl-review-good > span:last-child { color: var(--nrl-pos); }
.nrl-review-bad, .nrl-review-line.nrl-review-bad > span:last-child { color: var(--nrl-neg); }
@media (max-width: 700px) {
  .nrl-review-line { grid-template-columns: 96px minmax(0, 1fr); }
  .nrl-review-objectives { margin-left: 104px; }
}
`;
