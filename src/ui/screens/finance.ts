// src/ui/screens/finance.ts — Finance nav screen (GitHub #39, part of #49;
// Broadcast Quiet 3j). Three key tiles on the left (net weekly with the runway,
// the next home gate, the contracts ending soon and the way to Contracts); on
// the right THIS WEEK's line items, the SEASON P&L, and a short in-memory LEDGER
// built from 'money:changed' (stamped and classified as the season books are,
// N12). The numbers come from a pure view-model (financeSummary /
// FinanceLedger) that is unit-tested without the DOM; the DOM part only
// renders it. No Phaser.

import { bus } from '../../core/events';
import { getState, FINANCE_LINES, type FinanceLine, type GameState, type SeasonFinance } from '../../core/state';
import {
  weeklyWages, weeklyUpkeep, weeklyOverhead, weeklyIncome, sponsorIncome, groundCapacity, homeGate, nextStandGate, financeNet,
  classifyReason, stampMovement, type StandProjection,
} from '../../systems/economy';
import { ECON, SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../config';
import { openHistoryScreen } from './history';
import { openContractsScreen } from './contracts';
import { el, button, openScreen, closeScreen, segmented, ensureStyles } from '../dom';

/** Contracts whose remaining weeks are at most this are listed as expiring. */
export const EXPIRY_WINDOW_WEEKS = 8;
/** How many recent weeks the ledger keeps in memory. */
export const LEDGER_WEEKS = 6;

// ── View-model ─────────────────────────────────────────────────────────────────

export interface ExpiringContract {
  id: string;
  name: string;
  contractWeeks: number;
  wage: number;
}

export interface FinanceSummary {
  money: number;
  /** Σ squad wages per week (weeklyWages). */
  wagesWeekly: number;
  /** Σ facility upkeep per week (weeklyUpkeep, N6). */
  upkeepWeekly: number;
  /** The club's running costs per week (weeklyOverhead, N12.3). */
  overheadWeekly: number;
  /** Sponsor Board part of weeklyIncome. */
  sponsorWeekly: number;
  /** Reputation grant part of weeklyIncome. */
  grantWeekly: number;
  /** Passive weekly income (weeklyIncome = sponsor + grant). */
  incomeWeekly: number;
  /**
   * Home gates averaged over the weeks left in the season: the projected gate ×
   * home games left ÷ weeks left (QA: without it the run-rate showed a burn and
   * a short runway for a club that was actually making money). 0 with no home
   * games left, e.g. in the off-season stretch of the finals.
   */
  gateWeekly: number;
  /** income + average gate − wages − upkeep − running costs. */
  netWeekly: number;
  /** max(0, wages + upkeep + running costs − income − average gate): the weekly cash drain. */
  burnWeekly: number;
  /** Weeks of cash left at the current burn; null when the club is not burning cash. */
  runwayWeeks: number | null;
  /**
   * In debt (N12.5): how many weeks until the balance passes the fire-sale floor
   * at the current burn, from (money − FORCED_SALE_FLOOR) ÷ burn: the first whole
   * week that leaves it below the floor. 0 once it is below; null when the club
   * is not in debt or not burning cash.
   */
  weeksToFloor: number | null;
  /**
   * The next home fixture (round ≥ current week) and its projected gate, with the
   * crowd against the seats (#169: sold out means a bigger stand would earn more).
   */
  nextHome: { round: number; projectedGate: number; attendance: number; capacity: number; soldOut: boolean } | null;
  /**
   * What the next Grandstand level would earn at the next home game's demand
   * (nextStandGate, N12): only when that game sells out, and not at the top level.
   */
  nextStand: StandProjection | null;
  /** Squad players whose contracts end within EXPIRY_WINDOW_WEEKS, soonest first. */
  expiring: ExpiringContract[];
}

/**
 * Project the finance numbers from the economy functions. Pure: reads `state`
 * only. The projected gate is homeGate evaluated at the next home round's
 * week, so it uses the same attendance formula as the weekly tick.
 */
export function financeSummary(state: GameState): FinanceSummary {
  const wagesWeekly = weeklyWages(state);
  const upkeepWeekly = weeklyUpkeep(state);
  const overheadWeekly = weeklyOverhead(state);
  const incomeWeekly = weeklyIncome(state);
  const sponsorWeekly = sponsorIncome(state);
  const grantWeekly = incomeWeekly - sponsorWeekly;

  const nextFixture = state.league.fixtures
    .filter((f) => f.homeId === state.clubId && f.round >= state.week)
    .reduce<typeof state.league.fixtures[number] | undefined>(
      (best, f) => (!best || f.round < best.round ? f : best),
      undefined,
    );
  const projected = nextFixture ? homeGate({ ...state, week: nextFixture.round }, nextFixture) : null;
  const nextHome = nextFixture && projected
    ? {
      round: nextFixture.round,
      projectedGate: projected.receipts,
      attendance: projected.attendance,
      capacity: projected.capacity,
      soldOut: projected.soldOut,
    }
    : null;

  const nextStand = nextFixture ? nextStandGate({ ...state, week: nextFixture.round }, nextFixture) : null;

  const gateWeekly = averageGateWeekly(state, nextHome?.projectedGate ?? 0);
  const burnWeekly = Math.max(0, wagesWeekly + upkeepWeekly + overheadWeekly - incomeWeekly - gateWeekly);
  const runwayWeeks = burnWeekly > 0 ? Math.max(0, state.money) / burnWeekly : null;
  // The economy sells when the balance is below the floor after a week's money.
  const weeksToFloor = state.money < ECON.BANKRUPTCY_WARN && burnWeekly > 0
    ? Math.max(0, Math.floor((state.money - ECON.FORCED_SALE_FLOOR) / burnWeekly) + 1)
    : null;

  const expiring = state.squad
    .filter((p) => p.contractWeeks <= EXPIRY_WINDOW_WEEKS)
    .map((p) => ({ id: p.id, name: p.name, contractWeeks: p.contractWeeks, wage: p.wage }))
    .sort((a, b) => a.contractWeeks - b.contractWeeks);

  return {
    money: state.money,
    wagesWeekly,
    upkeepWeekly,
    overheadWeekly,
    sponsorWeekly,
    grantWeekly,
    incomeWeekly,
    gateWeekly,
    netWeekly: incomeWeekly + gateWeekly - wagesWeekly - upkeepWeekly - overheadWeekly,
    burnWeekly,
    runwayWeeks,
    weeksToFloor,
    nextHome,
    nextStand,
    expiring,
  };
}

/**
 * The season's remaining home gates spread over its remaining weeks. Counts the
 * home fixtures from this week on (finals ties appear as they are drawn) and
 * divides by the weeks left in the regular season, or in the finals once there.
 */
export function averageGateWeekly(state: GameState, projectedGate: number): number {
  if (projectedGate <= 0) return 0;
  const homeLeft = state.league.fixtures.filter((f) => f.homeId === state.clubId && f.round >= state.week).length;
  if (homeLeft === 0) return 0;
  const end = state.week <= SEASON_ROUNDS ? SEASON_ROUNDS : WEEKS_PER_SEASON;
  const weeksLeft = Math.max(1, end - state.week + 1);
  return Math.round((projectedGate * homeLeft) / weeksLeft);
}

// ── Ledger ─────────────────────────────────────────────────────────────────────

export interface LedgerWeek {
  season: number;
  week: number;
  /** Negative: the wage bill for the week. */
  wages: number;
  /** Negative: facility upkeep for the week (N6). */
  upkeep: number;
  /** Negative: the club's running costs for the week (N12.3). */
  overhead: number;
  /** Sponsor + grant income for the week. */
  income: number;
  /** Gate receipts for the week. */
  gate: number;
  /** Every other money movement (prize money, signings, the grounds, …). */
  other: number;
  /** `other` by the books' line (classifyReason), so the screen names it as the season P&L does (N12). */
  otherLines: Partial<Record<FinanceLine, number>>;
  /** Σ of every movement recorded for the week. */
  net: number;
}

/**
 * Keeps the last `maxWeeks` weeks of money movements. Feed it money:changed
 * deltas with the season/week they are stamped with (initFinanceLedger uses the
 * books' stampMovement). Each reason goes to its line of the books
 * (classifyReason): wages, upkeep, running costs, sponsor + grant as income and
 * the gate have their own columns; every other line is summed into `other` and
 * kept by line.
 */
export class FinanceLedger {
  private weeks: LedgerWeek[] = []; // oldest → newest

  constructor(private readonly maxWeeks: number = LEDGER_WEEKS) {}

  record(entry: { delta: number; reason: string; season: number; week: number }): void {
    const { delta, reason, season, week } = entry;
    let row = this.weeks.find((r) => r.season === season && r.week === week);
    if (!row) {
      row = { season, week, wages: 0, upkeep: 0, overhead: 0, income: 0, gate: 0, other: 0, otherLines: {}, net: 0 };
      // In stamp order: the rollover's money is stamped to the week it closes,
      // which may already be behind a newer row.
      const at = this.weeks.findIndex((r) => r.season > season || (r.season === season && r.week > week));
      this.weeks.splice(at < 0 ? this.weeks.length : at, 0, row);
      if (this.weeks.length > this.maxWeeks) {
        this.weeks.splice(0, this.weeks.length - this.maxWeeks);
      }
    }
    const line = classifyReason(reason);
    if (line === 'wages') row.wages += delta;
    else if (line === 'upkeep') row.upkeep += delta;
    else if (line === 'overhead') row.overhead += delta;
    else if (line === 'sponsor' || line === 'grant') row.income += delta;
    else if (line === 'gate') row.gate += delta;
    else {
      row.other += delta;
      row.otherLines[line] = (row.otherLines[line] ?? 0) + delta;
    }
    row.net += delta;
  }

  /** Recorded weeks, newest first. Copies, so callers can't mutate the ledger. */
  rows(): LedgerWeek[] {
    return this.weeks.slice().reverse().map((r) => ({ ...r, otherLines: { ...r.otherLines } }));
  }

  clear(): void {
    this.weeks = [];
  }
}

/** The app-wide ledger, fed by initFinanceLedger(). */
const financeLedger = new FinanceLedger();

/**
 * Subscribe a ledger to money:changed, stamping each movement as the season
 * books do (stampMovement): the current season/week, except the rollover's prize
 * money and board grant, which go to the last week of the season they close
 * rather than week 1 of the next (N12). Call once from main.ts. Returns the
 * unsubscribe.
 */
export function initFinanceLedger(ledger: FinanceLedger = financeLedger): () => void {
  return bus.on('money:changed', ({ delta, reason }) => {
    const { season, week } = stampMovement(getState(), reason);
    ledger.record({ delta, reason, season, week });
  });
}

// ── Season P&L (N6, #172) ───────────────────────────────────────────────────────

/** What each line of the books is called on the screen. */
export const FINANCE_LINE_LABELS: Record<FinanceLine, string> = {
  wages: 'Wages', upkeep: 'Upkeep', overhead: 'Running costs', sponsor: 'Sponsor', grant: 'Grant', gate: 'Gates', prize: 'Prize money',
  boardGrant: 'Board grants', events: 'Events', transfers: 'Transfers', contracts: 'Contracts', facilities: 'Facilities', other: 'Other',
};

export interface PnlRow {
  line: FinanceLine;
  label: string;
  thisSeason: number;
  /** null when there is no last season on the books. */
  lastSeason: number | null;
}

export interface SeasonPnl {
  season: number;
  lastSeason: number | null;
  /** Lines with money on them in either season, biggest this season first. */
  rows: PnlRow[];
  net: number;
  lastNet: number | null;
}

/**
 * This season's books against last season's (state.finance), biggest lines
 * first. "This season" is state.season's entry; before its first movement (the
 * moment after a rollover) the latest entry stands in, so the season just closed
 * shows until the new one is booked. Pure.
 */
export function seasonPnl(state: GameState): SeasonPnl {
  const open: SeasonFinance | undefined = state.finance.find((e) => e.season === state.season) ?? state.finance[state.finance.length - 1];
  const season = open?.season ?? state.season;
  const last = state.finance.find((e) => e.season === season - 1);
  const rows = FINANCE_LINES
    .map((line): PnlRow => ({ line, label: FINANCE_LINE_LABELS[line], thisSeason: open?.[line] ?? 0, lastSeason: last ? last[line] : null }))
    .filter((r) => r.thisSeason !== 0 || (r.lastSeason ?? 0) !== 0)
    .sort((a, b) => Math.abs(b.thisSeason) - Math.abs(a.thisSeason) || Math.abs(b.lastSeason ?? 0) - Math.abs(a.lastSeason ?? 0));
  return {
    season,
    lastSeason: last ? last.season : null,
    rows,
    net: open ? financeNet(stripSeason(open)) : 0,
    lastNet: last ? financeNet(stripSeason(last)) : null,
  };
}

function stripSeason(f: SeasonFinance): Record<FinanceLine, number> {
  const { season: _s, ...lines } = f;
  return lines;
}

// ── A past season's books (N14, #262) ─────────────────────────────────────────

export interface SeasonBooks {
  season: number;
  /** Every line of the books, in the books' order, zeros included. */
  rows: { line: FinanceLine; label: string; amount: number }[];
  net: number;
  /**
   * The balance the season closed on, prize money and the board grant included
   * (the books stamp them into the season they close). Not stored: today's
   * balance less every later season's net, which holds because every money
   * movement is booked (the soak checks the ledger against the books).
   */
  closing: number;
}

/** One season's books and closing balance, or null when none were kept (seasons before save v10). Pure. */
export function seasonBooks(state: Pick<GameState, 'finance' | 'money'>, season: number): SeasonBooks | null {
  const books = state.finance.find((f) => f.season === season);
  if (!books) return null;
  const later = state.finance.filter((f) => f.season > season).reduce((sum, f) => sum + financeNet(stripSeason(f)), 0);
  return {
    season,
    rows: FINANCE_LINES.map((line) => ({ line, label: FINANCE_LINE_LABELS[line], amount: books[line] })),
    net: financeNet(stripSeason(books)),
    closing: Math.round(state.money - later),
  };
}

/** "Net +$22,000 · closed on $480,000". */
export function fmtNetClosing(b: Pick<SeasonBooks, 'net' | 'closing'>): string {
  const net = Math.round(b.net);
  return `Net ${net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(net))} · closed on ${fmtMoney(b.closing)}`;
}

// ── Formatting ─────────────────────────────────────────────────────────────────

/** Whole dollars with thousands separators: 1234 → "$1,234", -50 → "-$50". */
export function fmtMoney(n: number): string {
  const r = Math.round(n);
  const sign = r < 0 ? '-' : '';
  const digits = Math.abs(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${digits}`;
}

/** Compact for narrow tables: 12345 → "$12.3k". Under 1000 it is whole dollars. */
export function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 1000) return fmtMoney(n);
  return `${sign}$${(abs / 1000).toFixed(1)}k`;
}

/** The next home crowd against the seats: "1,450 of 2,000 seats" or "Sold out · 2,000 seats" (#169). */
export function fmtCrowd(c: { attendance: number; capacity: number; soldOut: boolean }): string {
  const seats = c.capacity.toLocaleString('en-US');
  return c.soldOut ? `Sold out · ${seats} seats` : `${c.attendance.toLocaleString('en-US')} of ${seats} seats`;
}

/**
 * The next stand as a Finance row (N12): ["A stand would seat 3,500", "about +$30k
 * a game"], "A bigger stand" once one is built. Rounded to the thousand: it is
 * one game's demand, which form and the opponent move.
 */
export function fmtStand(p: StandProjection): { label: string; value: string } {
  const gain = p.gain >= 1000 ? `$${Math.round(p.gain / 1000)}k` : fmtMoney(p.gain);
  return {
    label: `${p.level > 1 ? 'A bigger stand' : 'A stand'} would seat ${p.capacity.toLocaleString('en-US')}`,
    value: `about +${gain} a game`,
  };
}

/**
 * What a ledger week's `other` is, by the books' lines and labels (N12):
 * "Prize money $25.0k · Board grants $10.0k". Null when it is nothing or only
 * the books' own `other`, which the column already says.
 */
export function ledgerNote(row: Pick<LedgerWeek, 'otherLines'>): string | null {
  const lines = FINANCE_LINES.filter((l) => (row.otherLines[l] ?? 0) !== 0);
  if (lines.length === 0 || (lines.length === 1 && lines[0] === 'other')) return null;
  return lines.map((l) => `${FINANCE_LINE_LABELS[l]} ${fmtMoneyCompact(row.otherLines[l]!)}`).join(' · ');
}

/** Runway label: "12 weeks", "1 week", "0 weeks", or "No burn" when null. */
export function fmtRunway(weeks: number | null): string {
  if (weeks === null) return 'No burn';
  const w = Math.floor(weeks);
  return `${w} ${w === 1 ? 'week' : 'weeks'}`;
}

/** The fire-sale row's value (N12.5): "in about 6 weeks at this burn", or "below the floor now" at 0. */
export function fmtFireSale(weeks: number): string {
  if (weeks <= 0) return 'below the floor now';
  return `in about ${weeks} ${weeks === 1 ? 'week' : 'weeks'} at this burn`;
}

/** Signed for a line item (3j): +$4,200, −$28,400 (a true minus), $0. */
export function fmtSigned(n: number): string {
  const r = Math.round(n);
  if (r === 0) return '$0';
  return `${r > 0 ? '+' : '−'}${fmtMoney(Math.abs(r))}`;
}

/**
 * The line under NET WEEKLY (3j): "No burn · you're making money", or the runway
 * ("Runway 12 weeks"). In debt the fire sale is the line that matters (N12.5).
 */
export function fmtNetNote(s: Pick<FinanceSummary, 'runwayWeeks' | 'weeksToFloor'>): string {
  if (s.weeksToFloor !== null) return `Fire sale ${fmtFireSale(s.weeksToFloor)}`;
  if (s.runwayWeeks === null) return 'No burn · you\'re making money';
  return `Runway ${fmtRunway(s.runwayWeeks)}`;
}

/** The contracts tile's line (3j): "2 contracts end within 8 wks", or that none do. */
export function fmtExpiring(n: number): string {
  if (n === 0) return `No contracts end within ${EXPIRY_WINDOW_WEEKS} wks`;
  return `${n} contract${n === 1 ? '' : 's'} end${n === 1 ? 's' : ''} within ${EXPIRY_WINDOW_WEEKS} wks`;
}

// ── DOM screen ─────────────────────────────────────────────────────────────────

/** The running costs' label: it names the staff once any are hired (N14.5), since their wages are paid there. */
export function overheadLabel(state: Pick<GameState, 'staff'>): string {
  return state.staff.length > 0 ? 'Running costs and staff' : FINANCE_LINE_LABELS.overhead;
}

/** The board's row's note while a loan is owed (N14.3). */
export function boardLoanNote(owed: number): string {
  return `↳ incl. board loan ${fmtMoneyCompact(owed)}, repaid at the season's end`;
}

/** The right column's views (3j). */
type FinanceView = 'week' | 'pnl' | 'ledger';
/** The view Finance last showed; holds while the game is open. */
let financeView: FinanceView = 'week';

/** A key tile on the left (3j): a small caps label, a big Mono number, a line under it. */
function keyTile(label: string, value: string, note: string, cls = ''): HTMLElement {
  return el('div', { class: `nrl-finance-tile ${cls}`.trim() },
    el('span', { class: 'nrl-label', text: label }),
    el('span', { class: 'nrl-finance-big nrl-num', text: value }),
    el('span', { class: 'nrl-finance-note', text: note }));
}

/** One line item (3j THIS WEEK): label left, the signed Mono value right, green in / red out. */
function lineItem(label: string, value: number, opts: { signed?: boolean; cls?: string } = {}): HTMLElement {
  const signed = opts.signed !== false;
  const tone = value < 0 ? ' nrl-neg' : signed && value > 0 ? ' nrl-pos' : '';
  return el('div', { class: `nrl-finance-row${opts.cls ? ` ${opts.cls}` : ''}` },
    el('span', { class: 'nrl-finance-label', text: label }),
    el('span', { class: `nrl-finance-value nrl-num${tone}`, text: signed ? fmtSigned(value) : fmtMoney(value) }));
}

/**
 * THIS WEEK (3j): the bank, then every weekly line in and out, and the net at
 * the foot, which holds still while a short phone scrolls the lines above it.
 */
function buildThisWeek(state: GameState, s: FinanceSummary): HTMLElement {
  return el('div', { class: 'nrl-finance-weekly' },
    el('div', { class: 'nrl-finance-lines' },
      lineItem('Bank balance', s.money, { signed: false }),
      lineItem('Wage bill', -s.wagesWeekly),
      lineItem('Facility upkeep', -s.upkeepWeekly),
      lineItem(overheadLabel(state), -s.overheadWeekly),
      lineItem('Sponsor', s.sponsorWeekly),
      lineItem('Grant', s.grantWeekly),
      lineItem('Home gates (avg/wk)', s.gateWeekly)),
    lineItem('Net', s.netWeekly, { cls: 'nrl-finance-net' }),
  );
}

/** A Mono money cell, red when negative; a dash for no season. */
function moneyCell(v: number | null): HTMLElement {
  const td = el('td', { class: 'nrl-num', text: v === null ? '—' : fmtMoneyCompact(v) });
  if (v !== null && v < 0) td.classList.add('nrl-neg');
  return td;
}

/** SEASON P&L (#172): this season v last, biggest lines first, a net row at the foot. */
function buildSeasonPnl(state: GameState): HTMLElement {
  const pnl = seasonPnl(state);
  const box = el('div', { class: 'nrl-finance-pnl' });
  if (pnl.rows.length === 0) {
    box.append(el('p', { class: 'nrl-finance-empty', text: 'Nothing booked yet this season. Advance a week to see the books.' }));
    return box;
  }
  const table = el('table', { class: 'nrl-table nrl-finance-table nrl-finance-pnl-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', { text: 'Season P&L' }),
    el('th', { class: 'nrl-num', text: `S${pnl.season}` }),
    el('th', { class: 'nrl-num', text: pnl.lastSeason !== null ? `S${pnl.lastSeason}` : 'Last' }))));
  const tbody = el('tbody');
  for (const r of pnl.rows) {
    tbody.append(el('tr', {}, el('td', { text: r.line === 'overhead' ? overheadLabel(state) : r.label }), moneyCell(r.thisSeason), moneyCell(r.lastSeason)));
    // The board loan (N14.3) is board money moved, not a line of its own: a note under the board's row.
    if (r.line === 'boardGrant' && state.boardLoan.owed > 0) {
      tbody.append(el('tr', { class: 'nrl-finance-pnl-sub' },
        el('td', { text: boardLoanNote(state.boardLoan.owed), attrs: { colspan: '3' } })));
    }
  }
  tbody.append(el('tr', { class: 'nrl-finance-pnl-net' }, el('td', { text: 'Net' }), moneyCell(pnl.net), moneyCell(pnl.lastNet)));
  table.append(tbody);
  box.append(table);
  // Every closed season's books are in History (N14, #262).
  if (state.history.length > 0) box.append(button('Past seasons ▸', () => { closeScreen(); openHistoryScreen(); }, { class: 'nrl-finance-past' }));
  return box;
}

/** LEDGER: the last weeks' money by line, compact Mono, sideways scroll on a narrow phone. */
function buildLedger(ledgerRows: LedgerWeek[]): HTMLElement {
  const ledger = el('div', { class: 'nrl-finance-ledger' });
  if (ledgerRows.length === 0) {
    ledger.append(el('p', { class: 'nrl-finance-empty', text: 'No weeks recorded yet. Advance a week to see the books.' }));
    return ledger;
  }
  const table = el('table', { class: 'nrl-table nrl-finance-table' });
  const head = el('tr');
  ['Wk', 'Wages', 'Upkeep', 'Running', 'Income', 'Gate', 'Other', 'Net'].forEach((h, i) => head.append(el('th', { class: i > 0 ? 'nrl-num' : '', text: h })));
  table.append(el('thead', {}, head));
  const tbody = el('tbody');
  for (const r of ledgerRows) {
    const tr = el('tr', {}, el('td', { class: 'nrl-num nrl-finance-wk', text: `S${r.season} W${r.week}` }));
    for (const v of [r.wages, r.upkeep, r.overhead, r.income, r.gate, r.other, r.net]) tr.append(moneyCell(v));
    tbody.append(tr);
    // What "Other" was, in the P&L's words (prize money, a signing, the grounds).
    const note = ledgerNote(r);
    if (note) tbody.append(el('tr', { class: 'nrl-finance-pnl-sub' }, el('td', { text: `Other: ${note}`, attrs: { colspan: '8' } })));
  }
  table.append(tbody);
  ledger.append(el('div', { class: 'nrl-finance-scroll' }, table), el('p', { class: 'nrl-finance-foot', text: `The last ${LEDGER_WEEKS} weeks, newest first` }));
  return ledger;
}

/** The left column (3j): net weekly, the next home gate, and the way to Contracts. */
function buildKeyTiles(state: GameState, s: FinanceSummary): HTMLElement {
  const net = keyTile('Net weekly (avg)', fmtSigned(s.netWeekly), fmtNetNote(s), s.netWeekly < 0 ? 'nrl-finance-losing' : 'nrl-finance-making');
  if (s.weeksToFloor !== null || s.runwayWeeks === 0) net.classList.add('nrl-finance-warn');
  const gate = s.nextHome
    ? keyTile(`Next home gate · ${s.nextHome.round > SEASON_ROUNDS ? 'final' : `R${s.nextHome.round}`}`, fmtMoney(s.nextHome.projectedGate), fmtCrowd(s.nextHome))
    : keyTile('Next home gate', 'None left', `${groundCapacity(state).toLocaleString('en-US')} seats`);
  gate.classList.add('nrl-finance-gate');
  // Sold out: what a bigger stand would earn (N12, #169).
  if (s.nextStand) {
    const stand = fmtStand(s.nextStand);
    gate.append(el('span', { class: 'nrl-finance-note nrl-finance-stand', text: `${stand.label}: ${stand.value}` }));
  }
  // Contracts live under Finance (3j): the tile says how many end soon and opens them.
  const n = s.expiring.length;
  const contracts = el('button', {
    class: `nrl-finance-tile nrl-finance-contracts${n > 0 ? ' nrl-finance-contracts-due' : ''}`,
    attrs: { type: 'button', 'data-finance-contracts': '' },
    onClick: () => openContractsScreen(),
  }, el('span', { class: 'nrl-finance-contracts-text', text: fmtExpiring(n) }), el('span', { class: 'nrl-finance-view', text: 'View ▸' }));
  return el('div', { class: 'nrl-finance-keys' }, el('span', { class: 'nrl-screen-title', text: 'Finance' }), net, gate, contracts);
}

/** Open the Finance sheet (3j). Re-renders on state/money changes. */
export function openFinanceScreen(): HTMLElement {
  ensureFinanceStyles();
  const keys = el('div', { class: 'nrl-finance-left' });
  const body = el('div', { class: 'nrl-finance-body' });
  const render = (): void => {
    const state = getState();
    const s = financeSummary(state);
    keys.replaceChildren(buildKeyTiles(state, s));
    body.replaceChildren(financeView === 'week' ? buildThisWeek(state, s) : financeView === 'pnl' ? buildSeasonPnl(state) : buildLedger(financeLedger.rows()));
  };
  const seg = segmented<FinanceView>(
    [{ id: 'week', label: 'This week' }, { id: 'pnl', label: 'Season P&L' }, { id: 'ledger', label: 'Ledger' }],
    financeView,
    (id) => { financeView = id; seg.set(id); render(); body.scrollTop = 0; },
    { label: 'Finance view' },
  );
  render();
  const sheet = el('div', { class: 'nrl-screen nrl-finance' }, keys, el('div', { class: 'nrl-finance-right' }, seg.el, body));

  const refresh = (): void => {
    if (sheet.isConnected) render();
  };
  const unsubs = [bus.on('state:changed', refresh), bus.on('money:changed', refresh)];
  return openScreen(sheet, () => { for (const off of unsubs) off(); }, 'finance');
}

// ── Styles (Finance, Contracts and the History books' tables share them) ─────

const FINANCE_STYLE_ID = 'nrl-finance-styles';

/** Inject the Office screens' stylesheet once (Finance, Contracts, History's books). */
export function ensureFinanceStyles(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  if (document.getElementById(FINANCE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FINANCE_STYLE_ID;
  style.textContent = FINANCE_CSS;
  document.head.appendChild(style);
}

export const FINANCE_CSS = `
/* 3j: the three numbers that matter on the left; the detail in views on the right. */
.nrl-screen.nrl-finance { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 16px; }
.nrl-finance-left { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-finance-keys { display: flex; flex-direction: column; gap: 6px; }
.nrl-finance-keys > .nrl-screen-title { line-height: 30px; letter-spacing: 0.04em; }
.nrl-finance-tile { display: flex; flex-direction: column; background: var(--nrl-raised); border-radius: 10px; padding: 8px 10px; }
.nrl-finance-tile .nrl-label { font-size: 0.75rem; }
.nrl-finance-big { font-size: 1.25rem; line-height: 1.25; }
.nrl-finance-making .nrl-finance-big { font-size: 1.375rem; color: var(--nrl-pos); }
.nrl-finance-losing .nrl-finance-big { font-size: 1.375rem; color: var(--nrl-neg); }
.nrl-finance-note { font-size: 0.75rem; color: var(--nrl-text-2); }
.nrl-finance-warn .nrl-finance-note { color: var(--nrl-neg); }
.nrl-finance-stand { color: var(--nrl-accent); }
button.nrl-finance-contracts {
  pointer-events: auto; cursor: pointer; border: 0; color: var(--nrl-text); text-align: left;
  flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px;
  font-family: var(--nrl-f-body);
}
button.nrl-finance-contracts:hover { background: #22305c; }
button.nrl-finance-contracts:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-finance-contracts-text { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-finance-contracts-due .nrl-finance-contracts-text { color: var(--nrl-accent); }
.nrl-finance-view { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
.nrl-finance-right { display: flex; flex-direction: column; gap: 6px; min-width: 0; min-height: 0; }
.nrl-finance-right > .nrl-seg { align-self: flex-start; }
.nrl-finance-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; }
.nrl-finance-weekly { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.nrl-finance-lines { flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-finance-pnl, .nrl-finance-ledger { flex: 0 0 auto; }
/* THIS WEEK: 28px line items, Mono values, the net under a 2px rule. */
.nrl-finance-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; border-top: 1px solid var(--nrl-button); font-size: 0.8125rem; }
.nrl-finance-label { color: var(--nrl-text-2); min-width: 0; }
.nrl-finance-value { text-align: right; white-space: nowrap; }
.nrl-finance-row.nrl-finance-net { min-height: 32px; border-top: 2px solid var(--nrl-line); font-size: 0.875rem; font-weight: 600; }
.nrl-finance-weekly .nrl-finance-net { flex: 0 0 auto; }
.nrl-finance-row.nrl-finance-net .nrl-finance-label { color: var(--nrl-text); }
.nrl-finance-empty { color: var(--nrl-muted); margin: 8px 0; }
.nrl-finance-foot { font-size: 0.6875rem; color: var(--nrl-muted); margin: 4px 0 0; }
/* SEASON P&L and LEDGER: compact Mono tables. */
.nrl-finance-scroll { overflow-x: auto; overscroll-behavior-x: contain; }
.nrl-table.nrl-finance-table td { height: 28px; }
.nrl-table.nrl-finance-table th { background: var(--nrl-navy); }
.nrl-finance-table td.nrl-num { font-weight: 500; }
.nrl-finance-table td.nrl-finance-wk { text-align: left; color: var(--nrl-muted); }
.nrl-finance-pnl-net td { border-top: 2px solid var(--nrl-line); font-weight: 600; }
.nrl-finance-table .nrl-finance-pnl-net td.nrl-num { font-weight: 600; }
.nrl-table .nrl-finance-pnl-sub td { height: auto; padding-bottom: 4px; border-top: 0; font-size: 0.6875rem; color: var(--nrl-muted); white-space: normal; }
.nrl-btn.nrl-finance-past { margin-top: 8px; min-height: 36px; font-size: 0.875rem; }
@media (pointer: coarse) { .nrl-btn.nrl-finance-past { min-height: 44px; } }
/* A narrow phone (667px): a slimmer left column. */
@media (max-width: 700px) { .nrl-screen.nrl-finance { grid-template-columns: 210px minmax(0, 1fr); gap: 12px; } }
/* A short landscape phone: tighter tiles, so all three fit without scrolling. */
@media (max-height: 400px) {
  .nrl-finance-keys { gap: 5px; }
  .nrl-finance-keys > .nrl-screen-title { line-height: 26px; }
  .nrl-finance-tile { padding: 6px 10px; }
  .nrl-finance-big, .nrl-finance-making .nrl-finance-big, .nrl-finance-losing .nrl-finance-big { font-size: 1.1875rem; line-height: 1.2; }
  .nrl-finance-note { line-height: 1.3; }
}

/* Contracts (under Finance): one row a player, soonest to end first. */
.nrl-screen.nrl-contracts { display: flex; flex-direction: column; }
.nrl-contracts-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; container-type: inline-size; }
.nrl-table.nrl-contracts-table { min-width: 660px; }
.nrl-contracts-table td { height: 44px; }
.nrl-contracts-table td.nrl-num { font-weight: 500; }
.nrl-contract-who { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.nrl-contract-name { font-weight: 600; }
.nrl-contract-meta, .nrl-contract-pos { font-size: 0.6875rem; color: var(--nrl-muted); }
.nrl-contract-pos { display: none; }
.nrl-contracts-table td.nrl-contract-soon { color: var(--nrl-neg); }
.nrl-contract-actions { display: flex; gap: 6px; justify-content: flex-end; }
.nrl-contract-actions .nrl-btn { min-height: 36px; padding: 0 10px; font-size: 0.875rem; border-radius: 8px; text-transform: none; }
@media (pointer: coarse) { .nrl-contract-actions .nrl-btn { min-height: 44px; } }
.nrl-contract-actions .nrl-btn.nrl-contract-armed, .nrl-contract-actions .nrl-btn.nrl-contract-armed:hover:not(:disabled) { background: var(--nrl-neg); color: var(--nrl-on-accent); }
.nrl-contract-gone td { color: var(--nrl-muted); }
/* A narrow sheet (667px, or 844px between a notch's insets): the table fits without a sideways
   scroll; who he is goes to the name's tooltip, and the name column takes what the others leave,
   a long name ending in "…". On the sheet's own width, not the screen's, and in rem (760px at
   Normal) so a larger Text size (#371) takes the narrow table sooner (#350: SELL ran off the sheet). */
@container (max-width: 47.5rem) {
  .nrl-table.nrl-contracts-table { min-width: 0; }
  .nrl-contracts-table td.nrl-contract-info { max-width: 0; width: 100%; }
  .nrl-contract-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nrl-contract-meta { display: none; }
  .nrl-contracts-table th, .nrl-contracts-table td { padding: 0 4px; }
  .nrl-contract-actions { gap: 4px; }
  .nrl-contract-actions .nrl-btn { padding: 0 7px; font-size: 0.8125rem; }
}
/* Narrower still for the text (667px at Large or Larger): the position moves under the name. */
@container (max-width: 38rem) {
  .nrl-contracts-table col:nth-child(2) { width: 0 !important; }
  .nrl-contracts-table tr:not(.nrl-contract-gone) > :is(th, td):nth-child(2) { display: none; }
  .nrl-contract-pos { display: block; }
}
`;

