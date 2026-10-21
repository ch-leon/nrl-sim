// src/ui/screens/finance.ts — Finance nav screen (GitHub #39, part of #49).
// Weekly P&L, runway and the next home gate, plus contracts expiring soon and a
// short in-memory ledger built from 'money:changed' (stamped and classified as
// the season books are, N12). The numbers come from a pure view-model
// (financeSummary / FinanceLedger) that is unit-tested without the DOM; the DOM
// part only renders it. No Phaser.

import { bus } from '../../core/events';
import { getState, FINANCE_LINES, type FinanceLine, type GameState, type SeasonFinance } from '../../core/state';
import {
  weeklyWages, weeklyUpkeep, weeklyIncome, sponsorIncome, groundCapacity, homeGate, nextStandGate, financeNet,
  classifyReason, stampMovement, type StandProjection,
} from '../../systems/economy';
import { ECON, SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../config';
import { buildObjectivesSection } from './board';
import { openHistoryScreen } from './history';
import { el, panel, button, openModal, closeScreen } from '../dom';

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
  /** income + average gate − wages − upkeep. */
  netWeekly: number;
  /** max(0, wages + upkeep − income − average gate): the weekly cash drain. */
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
  const burnWeekly = Math.max(0, wagesWeekly + upkeepWeekly - incomeWeekly - gateWeekly);
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
    sponsorWeekly,
    grantWeekly,
    incomeWeekly,
    gateWeekly,
    netWeekly: incomeWeekly + gateWeekly - wagesWeekly - upkeepWeekly,
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
 * (classifyReason): wages, upkeep, sponsor + grant as income and the gate have
 * their own columns; every other line is summed into `other` and kept by line.
 */
export class FinanceLedger {
  private weeks: LedgerWeek[] = []; // oldest → newest

  constructor(private readonly maxWeeks: number = LEDGER_WEEKS) {}

  record(entry: { delta: number; reason: string; season: number; week: number }): void {
    const { delta, reason, season, week } = entry;
    let row = this.weeks.find((r) => r.season === season && r.week === week);
    if (!row) {
      row = { season, week, wages: 0, upkeep: 0, income: 0, gate: 0, other: 0, otherLines: {}, net: 0 };
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
  wages: 'Wages', upkeep: 'Upkeep', sponsor: 'Sponsor', grant: 'Grant', gate: 'Gates', prize: 'Prize money',
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

/** One season's books and closing balance, or null when none were kept (seasons before save v12). Pure. */
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
 * The next stand as a Finance row (N12): ["A stand would seat 3,500", "about +$27k
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

// ── DOM screen ─────────────────────────────────────────────────────────────────

/** One label/value line inside a panel. `neg` colours negatives red. */
function statRow(label: string, value: string, neg = false): HTMLElement {
  return el(
    'div',
    { class: neg ? 'nrl-finance-row nrl-finance-neg' : 'nrl-finance-row' },
    el('span', { class: 'nrl-finance-label', text: label }),
    el('span', { class: 'nrl-finance-value', text: value }),
  );
}

/** The season P&L panel: this season v last, biggest lines first, a net row at the foot (#172). */
function buildSeasonPnl(state: GameState): HTMLElement {
  const pnl = seasonPnl(state);
  const box = el('div', { class: 'nrl-finance-pnl' });
  box.append(el('h3', { text: `Season P&L · S${pnl.season}${pnl.lastSeason !== null ? ` v S${pnl.lastSeason}` : ''}` }));
  if (pnl.rows.length === 0) {
    box.append(el('p', { text: 'Nothing booked yet this season. Advance a week to see the books.' }));
    return box;
  }
  const table = el('table', { class: 'nrl-finance-table nrl-finance-pnl-table' });
  const head = el('tr');
  for (const h of ['', `S${pnl.season}`, pnl.lastSeason !== null ? `S${pnl.lastSeason}` : 'Last']) head.append(el('th', { text: h }));
  table.append(el('thead', {}, head));
  const tbody = el('tbody');
  const cell = (v: number | null): HTMLElement => {
    const td = el('td', { text: v === null ? '—' : fmtMoneyCompact(v) });
    if (v !== null && v < 0) td.classList.add('nrl-finance-neg');
    return td;
  };
  for (const r of pnl.rows) {
    tbody.append(el('tr', {}, el('td', { text: r.label }), cell(r.thisSeason), cell(r.lastSeason)));
  }
  const net = el('tr', { class: 'nrl-finance-pnl-net' }, el('td', { text: 'Net' }), cell(pnl.net), cell(pnl.lastNet));
  tbody.append(net);
  table.append(tbody);
  box.append(el('div', { class: 'nrl-finance-scroll' }, table));
  // Every closed season's books are in History (N14, #262).
  if (state.history.length > 0) box.append(button('Past seasons', () => { closeScreen(); openHistoryScreen(); }, { class: 'nrl-finance-past' }));
  return box;
}

/** Build the screen body from the current state and ledger rows. */
function buildFinanceBody(state: GameState, ledgerRows: LedgerWeek[]): HTMLElement[] {
  const s = financeSummary(state);
  const nodes: HTMLElement[] = [el('h2', { text: 'Finance' })];

  const weekly = el('div', { class: 'nrl-finance-weekly' },
    statRow('Bank balance', fmtMoney(s.money), s.money < 0),
    statRow('Wage bill', fmtMoney(-s.wagesWeekly)),
    statRow('Upkeep', fmtMoney(-s.upkeepWeekly)),
    statRow('Sponsor', fmtMoney(s.sponsorWeekly)),
    statRow('Grant', fmtMoney(s.grantWeekly)),
    statRow('Home gates (avg/wk)', fmtMoney(s.gateWeekly)),
    statRow('Net weekly (avg)', fmtMoney(s.netWeekly), s.netWeekly < 0),
    statRow('Runway', fmtRunway(s.runwayWeeks), s.runwayWeeks === 0),
    ...(s.weeksToFloor !== null ? [statRow('Fire sale', fmtFireSale(s.weeksToFloor), true)] : []),
    statRow(
      'Next home gate',
      s.nextHome ? `R${s.nextHome.round} · ${fmtMoney(s.nextHome.projectedGate)}` : 'None left',
    ),
    statRow('Crowd', s.nextHome ? fmtCrowd(s.nextHome) : `${groundCapacity(state).toLocaleString('en-US')} seats`),
  );
  if (s.nextStand) {
    const stand = fmtStand(s.nextStand);
    weekly.append(statRow(stand.label, stand.value));
  }
  nodes.push(panel({ class: 'nrl-finance-panel' }, weekly));
  nodes.push(panel({ class: 'nrl-finance-panel' }, buildSeasonPnl(state)));
  nodes.push(buildObjectivesSection(state));

  const expiring = el('div', { class: 'nrl-finance-expiring' });
  expiring.append(el('h3', { text: `Contracts ending in ${EXPIRY_WINDOW_WEEKS} wks` }));
  if (s.expiring.length === 0) {
    expiring.append(el('p', { text: 'No contracts expiring soon.' }));
  } else {
    for (const p of s.expiring) {
      expiring.append(el('div', {
        class: 'nrl-finance-contract',
        text: `${p.name} · ${p.contractWeeks} wk${p.contractWeeks === 1 ? '' : 's'} · ${fmtMoney(p.wage)}/wk`,
      }));
    }
  }
  nodes.push(panel({ class: 'nrl-finance-panel' }, expiring));

  const ledger = el('div', { class: 'nrl-finance-ledger' });
  ledger.append(el('h3', { text: `Ledger · last ${LEDGER_WEEKS} weeks` }));
  if (ledgerRows.length === 0) {
    ledger.append(el('p', { text: 'No weeks recorded yet. Advance a week to see the books.' }));
  } else {
    const table = el('table', { class: 'nrl-finance-table' });
    const head = el('tr');
    for (const h of ['Wk', 'Wages', 'Upkeep', 'Income', 'Gate', 'Other', 'Net']) head.append(el('th', { text: h }));
    table.append(el('thead', {}, head));
    const tbody = el('tbody');
    for (const r of ledgerRows) {
      const tr = el('tr');
      tr.append(el('td', { text: `S${r.season} W${r.week}` }));
      for (const v of [r.wages, r.upkeep, r.income, r.gate, r.other, r.net]) {
        const td = el('td', { text: fmtMoneyCompact(v) });
        if (v < 0) td.classList.add('nrl-finance-neg');
        tr.append(td);
      }
      tbody.append(tr);
      // What "Other" was, in the P&L's words (prize money, a signing, the grounds).
      const note = ledgerNote(r);
      if (note) {
        tbody.append(el('tr', {}, el('td', { text: `Other: ${note}`, attrs: { colspan: '7', style: 'font-size:0.7rem;opacity:0.85' } })));
      }
    }
    table.append(tbody);
    ledger.append(el('div', { class: 'nrl-finance-scroll' }, table));
  }
  nodes.push(panel({ class: 'nrl-finance-panel' }, ledger));

  nodes.push(button('Close', () => closeScreen()));
  return nodes;
}

/** Open the Finance screen in the nav screen region. Re-renders on state/money changes. */
export function openFinanceScreen(): HTMLElement {
  const content = el('div', { class: 'nrl-finance' });
  const render = (): void => {
    content.replaceChildren(...buildFinanceBody(getState(), financeLedger.rows()));
  };
  render();

  const unsubs: Array<() => void> = [];
  const refresh = (): void => {
    // Screen closed (its node left the DOM): stop listening.
    if (!content.isConnected) {
      for (const off of unsubs) off();
      return;
    }
    render();
  };
  unsubs.push(bus.on('state:changed', refresh), bus.on('money:changed', refresh));

  return openModal(content, { class: 'nrl-finance-modal', screen: true });
}
