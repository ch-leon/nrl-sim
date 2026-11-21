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
  getState, stateInstallation, type GameState, type SeasonRecord, type SeasonReview,
} from '../../core/state';
import { registerSeasonReview } from '../../systems/stats';
import { BOARD, FINALS_WEEKS, SEASON_ROUNDS } from '../../config';
import { backButton, button, closeScreen, el, openScreen } from '../dom';
import { ordinal } from '../hud';
import { whenNoMatch } from '../updatePrompt';
import { fmtMoney, seasonBooks } from './finance';
import { ensureHistoryStyles, fmtFinalsOutcome, fmtSeasonEndToast, openHistoryScreen, seasonEndToastKind } from './history';

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
export function initSeasonReview(opts: { onChooseLeague?: () => HTMLElement } = {}): () => void {
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
    const installation = stateInstallation();
    whenNoMatch(() => { if (stateInstallation() === installation && !getState().sacked) openSeasonReview(entry, opts); });
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
export function openSeasonReview(entry: SeasonRecord, opts: { back?: () => void; onChooseLeague?: () => HTMLElement } = {}): HTMLElement {
  ensureHistoryStyles();
  const r = entry.review ?? {};
  const body = el('div', { class: 'nrl-review-body' });
  const line = (label: string, text: string, cls = ''): HTMLElement =>
    el('div', { class: `nrl-review-line ${cls}`.trim() }, el('span', { class: 'nrl-label', text: label }), el('span', { text }));

  const toHistory = (): void => { closeScreen(); (opts.back ?? openHistoryScreen)(); };
  const history = opts.back ? backButton('History', toHistory) : button('History', toHistory, { class: 'nrl-btn-outline' });
  history.classList.add('nrl-review-history');
  const installation = stateInstallation();
  const canChoose = (): boolean => {
    const state = getState();
    const progress = state.competitions?.leagueCareer;
    return stateInstallation() === installation && !!opts.onChooseLeague && !opts.back && !state.sacked && !!entry.league
      && progress?.phase === 'next-season-choice' && state.season === entry.season
      && progress.close?.season === entry.season && progress.close.id === entry.league.closeId;
  };
  const done = canChoose() ? button('Choose next league ▸', () => {
    if (!canChoose()) return;
    closeScreen(); opts.onChooseLeague!();
  }, { class: 'nrl-btn-primary nrl-review-done' }) : button('Carry on ▸', () => closeScreen(), { class: 'nrl-btn-primary nrl-review-done' });
  if (canChoose()) done.setAttribute('data-review-choose-league', '');

  // The finish banner: the big finish, how the season ended, History and the one primary beside it.
  const pos = entry.ladderPosition > 0 ? ordinal(entry.ladderPosition) : 'unranked';
  const ended = entry.premiership ? `Premiers · ladder ${pos}` : fmtFinalsOutcome(entry);
  const what = el('div', { class: 'nrl-review-what' },
    el('span', { class: 'nrl-review-kicker', text: `Season ${entry.season} review` }),
    el('span', { class: 'nrl-review-finish', text: ended ? ended.charAt(0).toUpperCase() + ended.slice(1) : `Finished ${pos}` }));
  if (entry.season === 1) what.append(el('span', { class: 'nrl-review-note', text: EXPANSION_COPY.review, attrs: { 'data-expansion-review': '' } }));
  const head = el('div', { class: `nrl-review-head${entry.premiership ? ' nrl-review-premiers' : ''}` },
    el('span', { class: 'nrl-review-big', text: entry.premiership ? 'Premiers' : entry.ladderPosition > 0 ? pos : '–' }),
    what,
    el('div', { class: 'nrl-review-tools' }, history, ...(opts.back ? [] : [done])));
  // Two columns on a landscape phone: how the club did, then the club around it.
  const season = el('div', { class: 'nrl-review-col' });
  const club = el('div', { class: 'nrl-review-col' });
  const record = fmtRecord(entry);
  if (record) season.append(line('Record', entry.league ? `${record} (${entry.league.regularRounds} regular rounds · ${entry.league.fieldSize} clubs · ${entry.league.finalsSize ? `Top ${entry.league.finalsSize} finals` : 'no finals'} · ${entry.league.slotCount} weeks)` : `${record} (${SEASON_ROUNDS} rounds${entry.ladderPosition > 0 && entry.ladderPosition <= 8 ? `, finals over ${FINALS_WEEKS} weeks` : ''})`));
  if (entry.league) {
    if (entry.league.final) {
      const final = entry.league.final;
      const name = (id: string): string => getState().league.clubs.find(c => c.id === id)?.name ?? id;
      season.append(line('Final', `${name(final.homeId)} ${final.result.homeScore}–${final.result.awayScore} ${name(final.awayId)} · ${name(final.result.winnerId!)} won by ${final.result.decider.replace(/-/g, ' ')}`));
    }
    if (entry.league.minorPremierId === 'player') season.append(line('Honours', 'Minor premiers'));
    const access = getState().competitions?.leagueCareer?.access.filter(a => a.earnedFrom?.season === entry.season && a.earnedFrom.instanceId === entry.league!.instanceId) ?? [];
    for (const a of access) {
      const name = getState().competitions?.world?.divisions.find(d => d.id === a.leagueId)?.name ?? a.leagueId;
      season.append(line('Permanent access', `${name} unlocked by the finals title. Choose whether to stay or enter an earned league.`));
    }
    season.append(line('Rewards', 'No extra title cash, board grant or salary-cap prize. Ordinary played-match income is recorded in the books.'));
  }
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
