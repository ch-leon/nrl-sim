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

import { bus } from '../../core/events';
import {
  getState, setState, type GameState, type PotmTally, type RivalClub, type SeasonRecord, type SeasonReview,
} from '../../core/state';
import { registerSeasonHook } from '../../core/time';
import { strengthChanges } from '../../systems/league';
import { BOARD, FINALS_WEEKS, SEASON_ROUNDS } from '../../config';
import { button, closeScreen, el, openModal } from '../dom';
import { whenNoMatch } from '../updatePrompt';
import { fmtMoney, seasonBooks } from './finance';
import { fmtSeasonEndToast, fmtSeasonSummary, openHistoryScreen, seasonEndToastKind } from './history';

// ── Pure builders ───────────────────────────────────────────────────────────

/** What the review needs from before the rollover's hooks run. */
export interface RolloverSnapshot {
  /** The season that is ending. */
  season: number;
  squad: { id: string; name: string; age: number }[];
  rivals: RivalClub[];
  reputation: number;
}

/** `endedSeason`: the rollover has already moved the counter on when its hooks run, so the hook passes `season - 1`. */
export function snapshotBeforeRollover(s: Pick<GameState, 'season' | 'squad' | 'league' | 'reputation'>, endedSeason: number = s.season): RolloverSnapshot {
  return {
    season: endedSeason,
    squad: s.squad.map((p) => ({ id: p.id, name: p.name, age: p.age })),
    rivals: s.league.clubs.map((c) => ({ id: c.id, name: c.name, colors: c.colors, strength: c.strength })),
    reputation: s.reputation,
  };
}

/** How many movers the review names. */
export const MOVERS_SHOWN = 3;

/** The tally with one more award for `name` in `season` (a new season starts it over). */
export function addPotm(tally: PotmTally | undefined, season: number, name: string): PotmTally {
  const counts = tally && tally.season === season ? { ...tally.counts } : {};
  counts[name] = (counts[name] ?? 0) + 1;
  return { season, counts };
}

/** The season's awards: how many, and who took most (ties to the first name). */
export function potmSummary(tally: PotmTally | undefined, season: number): SeasonReview['potm'] | undefined {
  if (!tally || tally.season !== season) return undefined;
  let total = 0;
  let best: { name: string; count: number } | undefined;
  for (const [name, count] of Object.entries(tally.counts)) {
    total += count;
    if (!best || count > best.count || (count === best.count && name < best.name)) best = { name, count };
  }
  return total > 0 ? { total, ...(best ? { best } : {}) } : undefined;
}

/**
 * The review of `before.season`, read off the state as the rollover's hooks
 * (ageing, youth, fixtures, the board review) have left it and before the
 * board sets the new season's objectives.
 */
export function buildSeasonReview(before: RolloverSnapshot, after: GameState): SeasonReview {
  const ended = before.season;
  const review: SeasonReview = {};

  const potm = potmSummary(after.potmTally, ended);
  if (potm) review.potm = potm;

  const reviewed = after.objectives.filter((o) => o.status !== 'pending');
  if (reviewed.length > 0) {
    const met = reviewed.filter((o) => o.status === 'met').length;
    review.board = {
      met,
      missed: reviewed.length - met,
      patience: after.boardPatience,
      sacked: after.sacked?.season === ended,
      objectives: reviewed.map((o) => ({ text: o.text, met: o.status === 'met' })),
    };
  }

  const books = after.finance.find((f) => f.season === ended);
  if (books) {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const [line, v] of Object.entries(books)) {
      if (line === 'season' || typeof v !== 'number') continue;
      if (v > 0) moneyIn += v;
      else moneyOut -= v;
    }
    review.money = { in: Math.round(moneyIn), out: Math.round(moneyOut) };
  }

  const stillHere = new Set(after.squad.map((p) => p.id));
  const retired = before.squad.filter((p) => !stillHere.has(p.id)).map((p) => ({ name: p.name, age: p.age + 1 }));
  if (retired.length > 0) review.retired = retired;

  const juniors = after.freeAgents.filter((p) => p.junior).length;
  if (juniors > 0) review.juniors = juniors;

  const movers = strengthChanges(before.rivals, after.league.clubs)
    .filter((c) => c.clubId !== after.clubId)
    .slice(0, MOVERS_SHOWN)
    .map((c) => ({ name: c.name, from: c.from, to: c.to }));
  if (movers.length > 0) review.movers = movers;

  review.reputation = { from: before.reputation, to: after.reputation };
  return review;
}

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

let snapshot: RolloverSnapshot | null = null;

/**
 * Register the rollover hooks and the season:ended listener. Called once from
 * initSeasonEndFeedback (history.ts, which main.ts calls at boot). Headless
 * (no document) the season still ends in the toast it always did. Returns the
 * listener's unsubscribe.
 */
export function initSeasonReview(): () => void {
  // Before ageing (5), youth (6), fixtures (10) and the board (10 / 20).
  registerSeasonHook('season-review-before', 1, ({ season }) => {
    snapshot = snapshotBeforeRollover(getState(), season - 1);
  });
  // After fixtures (10) and tenure (12), before the board's new objectives (20).
  registerSeasonHook('season-review', 15, () => {
    const s = getState();
    const before = snapshot;
    snapshot = null;
    if (!before) return;
    const i = s.history.findIndex((h) => h.season === before.season);
    if (i < 0) return;
    const review = buildSeasonReview(before, s);
    setState({ history: s.history.map((h, k) => (k === i ? { ...h, review } : h)) });
  });
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

/**
 * The review of a season. A nav screen rather than a dialog: the HUD and the
 * nav stay usable over it (the next week can be advanced, History opened),
 * and Close returns to where it came from (`back`, e.g. History).
 */
export function openSeasonReview(entry: SeasonRecord, opts: { back?: () => void } = {}): HTMLElement {
  const r = entry.review ?? {};
  const content = el('div', { class: 'nrl-season-review', attrs: { 'data-season-review': String(entry.season) } });
  const line = (label: string, text: string, cls = ''): HTMLElement =>
    el('div', { class: `nrl-review-line ${cls}`.trim() }, el('b', { text: `${label}: ` }), text);

  content.append(el('h2', { text: `Season ${entry.season} review` }));
  content.append(el('div', { class: `nrl-review-finish${entry.premiership ? ' nrl-review-premiers' : ''}`, text: fmtSeasonSummary(entry).replace(/^Season \d+ — /, '') }));
  const record = fmtRecord(entry);
  if (record) content.append(line('Record', `${record} (${SEASON_ROUNDS} rounds${entry.ladderPosition > 0 && entry.ladderPosition <= 8 ? `, finals over ${FINALS_WEEKS} weeks` : ''})`));
  if (entry.topScorer) content.append(line('Top try-scorer', `${entry.topScorer.name} (${entry.topScorer.tries})`));
  if (r.potm) {
    content.append(line('Player of the match', `${r.potm.total} award${r.potm.total === 1 ? '' : 's'}${r.potm.best ? ` · most: ${r.potm.best.name} (${r.potm.best.count})` : ''}`));
  }
  if (r.board) {
    const b = r.board;
    const verdict = b.sacked ? 'sacked' : b.missed === 0 ? 'all met' : `${b.met} met, ${b.missed} missed`;
    content.append(line('Board', `${verdict} · patience ${b.patience}/${BOARD.MAX_PATIENCE}`, b.missed === 0 ? 'nrl-review-good' : 'nrl-review-bad'));
    content.append(el('ul', { class: 'nrl-review-objectives' }, ...b.objectives.map((o) => el('li', { class: o.met ? 'nrl-review-good' : 'nrl-review-bad', text: `${tick(o.met)} ${o.text}` }))));
  }
  if (r.money) {
    // The closing balance from the books (N14, #262), where they were kept.
    const books = seasonBooks(getState(), entry.season);
    content.append(line('Money', `${fmtMoneyInOut(r.money)}${books ? ` · closed on ${fmtMoney(books.closing)}` : ''}`, r.money.in >= r.money.out ? '' : 'nrl-review-bad'));
  }
  if (r.retired && r.retired.length > 0) content.append(line('Retired', r.retired.map((p) => `${p.name} (${p.age})`).join(', ')));
  if (r.juniors) content.append(line('Academy', `${r.juniors} prospect${r.juniors === 1 ? '' : 's'} in the free-agent pool`));
  if (r.movers && r.movers.length > 0) content.append(line('Rivals', fmtMovers(r.movers)));
  if (r.reputation) {
    const d = r.reputation.to - r.reputation.from;
    content.append(line('Reputation', `${r.reputation.from} → ${r.reputation.to}${d === 0 ? '' : ` (${d > 0 ? '+' : ''}${d})`}`, d < 0 ? 'nrl-review-bad' : ''));
  }
  content.append(el('div', { class: 'nrl-review-actions' },
    button('History', () => { closeScreen(); openHistoryScreen(); }, { class: 'nrl-review-history' }),
    button('Close', () => { closeScreen(); opts.back?.(); }, { class: 'nrl-review-close' }),
  ));
  return openModal(content, { class: 'nrl-review-modal', screen: true, key: 'history' });
}
