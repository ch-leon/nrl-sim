// src/ui/screens/history.ts — season-end feedback + past-seasons History screen
// (GitHub #3 / BAK-206 backlog S2). Pure helpers are exported for node tests;
// DOM open/init follow the fixtures.ts / hud.ts conventions (no Phaser).

import { getState, type GameState, type SeasonRecord, type Player } from '../../core/state';
import { el, panel, button, openModal, closeScreen } from '../dom';
import { initSeasonReview, openSeasonReview } from './seasonReview';
import { FINANCE_LINE_LABELS, fmtMoney, fmtMoneyCompact, fmtNetClosing, seasonBooks } from './finance';

export type SeasonHistoryEntry = SeasonRecord;

/**
 * One-line season summary, e.g. "Season 1 — finished 4th" or
 * "Season 2 — PREMIERS (ladder 2nd)".
 */
export function fmtSeasonSummary(entry: SeasonHistoryEntry): string {
  const pos = entry.ladderPosition > 0 ? ordinal(entry.ladderPosition) : 'unranked';
  if (entry.premiership) {
    return `Season ${entry.season} — PREMIERS (ladder ${pos})`;
  }
  return `Season ${entry.season} — finished ${pos}`;
}

/** Extra detail line for v4+ entries, e.g. "W12 L10 D2 · PF 480 PA 400 · Top try-scorer: X (9)". */
export function fmtSeasonDetail(e: SeasonRecord): string {
  if (e.wins === undefined) return '';
  const parts = [`W${e.wins} L${e.losses ?? 0} D${e.draws ?? 0}`, `PF ${e.pointsFor ?? 0} PA ${e.pointsAgainst ?? 0}`];
  if (e.topScorer) parts.push(`Top try-scorer: ${e.topScorer.name} (${e.topScorer.tries})`);
  return parts.join(' · ');
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

/** Open the History modal listing past seasons from GameState.history. */
export function openHistoryScreen(): HTMLElement {
  const state = getState();
  const content = el('div', { class: 'nrl-history' });
  content.append(el('h2', { text: 'Season History' }));

  if (state.history.length === 0) {
    content.append(panel({}, el('p', { text: 'No completed seasons yet — finish a season to see results here.' })));
  } else {
    const list = el('div', { class: 'nrl-history-list' });
    for (const entry of historyNewestFirst(state.history)) {
      const line = el('div', {
        class: entry.premiership ? 'nrl-history-row nrl-history-premiers' : 'nrl-history-row',
        text: fmtSeasonSummary(entry),
      });
      const detail = fmtSeasonDetail(entry);
      if (detail) line.append(el('div', { class: 'nrl-history-detail', text: detail }));
      // The season review (#190), for seasons that have one (v12+), and its books (N14, #262).
      const actions = el('div', { class: 'nrl-history-actions' });
      if (entry.review) {
        actions.append(button('Review', () => openSeasonReview(entry, { back: () => { openHistoryScreen(); } }), { class: 'nrl-history-review' }));
      }
      actions.append(button('Books', () => openSeasonBooks(entry, { back: () => { openHistoryScreen(); } }), { class: 'nrl-history-books' }));
      line.append(actions);
      list.append(line);
    }
    content.append(list);
  }

  const r = computeRecords(state);
  const fmt = (x: { name: string; value: number } | null) => (x ? `${x.name} (${x.value})` : '—');
  content.append(
    el('h3', { text: 'Records & Leaders' }),
    panel({},
      el('p', { text: `Premierships: ${r.premierships} · Best finish: ${r.bestFinish ? ordinal(r.bestFinish) : '—'}` }),
      el('p', { text: `Most points in a season: ${r.mostPoints ? `${r.mostPoints.points} (Season ${r.mostPoints.season})` : '—'}` }),
      el('p', { text: `Most tries in a season: ${r.mostTries ? `${r.mostTries.name} (${r.mostTries.tries}, Season ${r.mostTries.season})` : '—'}` }),
      el('p', { text: `This season's try leader: ${fmt(r.seasonTries)}` }),
      el('p', { text: `Career tries: ${fmt(r.careerTries)}` }),
      el('p', { text: `Career tackles: ${fmt(r.careerTackles)}` }),
      el('p', { text: `Career line breaks: ${fmt(r.careerLineBreaks)}` }),
    ),
  );

  content.append(button('Close', () => closeScreen()));
  return openModal(content, { class: 'nrl-history-modal', screen: true });
}

/** The line at the top of a season's books: "Season 2 — finished 4th · W12 L10 D2 · PF 480 PA 400". */
export function fmtBooksHeading(entry: SeasonHistoryEntry): string {
  const detail = fmtSeasonDetail(entry).split(' · Top try-scorer')[0];
  return detail ? `${fmtSeasonSummary(entry)} · ${detail}` : fmtSeasonSummary(entry);
}

/**
 * A past season's books (N14, #262): every line of its P&L, the net and the
 * balance it closed on, under the season's one-line summary. Seasons from before
 * the books were kept (save v12) say so.
 */
export function openSeasonBooks(entry: SeasonHistoryEntry, opts: { back?: () => void } = {}): HTMLElement {
  const books = seasonBooks(getState(), entry.season);
  const content = el('div', { class: 'nrl-season-books', attrs: { 'data-season-books': String(entry.season) } });
  content.append(el('h2', { text: `Season ${entry.season} books` }));
  content.append(el('p', { class: 'nrl-books-heading', text: fmtBooksHeading(entry) }));
  if (!books) {
    content.append(panel({}, el('p', { text: 'No books kept for this season: the club started keeping them in a later version of the game.' })));
  } else {
    const table = el('table', { class: 'nrl-finance-table nrl-books-table' });
    const tbody = el('tbody');
    const cell = (v: number): HTMLElement => {
      const td = el('td', { text: v === 0 ? '—' : fmtMoneyCompact(v) });
      if (v < 0) td.classList.add('nrl-finance-neg');
      return td;
    };
    for (const r of books.rows) tbody.append(el('tr', {}, el('td', { text: FINANCE_LINE_LABELS[r.line] }), cell(r.amount)));
    tbody.append(el('tr', { class: 'nrl-finance-pnl-net' }, el('td', { text: 'Net' }), cell(books.net)));
    tbody.append(el('tr', { class: 'nrl-books-closing' }, el('td', { text: 'Closing balance' }), el('td', { text: fmtMoney(books.closing), class: books.closing < 0 ? 'nrl-finance-neg' : '' })));
    table.append(tbody);
    content.append(el('div', { class: 'nrl-finance-scroll' }, table));
    content.append(el('p', { class: 'nrl-books-summary', text: fmtNetClosing(books) }));
  }
  content.append(button('Close', () => { closeScreen(); opts.back?.(); }, { class: 'nrl-books-close' }));
  return openModal(content, { class: 'nrl-books-modal', screen: true });
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
