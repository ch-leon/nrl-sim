// src/ui/screens/finance.ts — Finance nav screen (GitHub #39, part of #49).
// Weekly P&L, runway and the next home gate, plus contracts expiring soon and a
// short in-memory ledger built from 'money:changed'. The numbers come from a
// pure view-model (financeSummary / FinanceLedger) that is unit-tested without
// the DOM; the DOM part only renders it. No Phaser.

import { bus } from '../../core/events';
import { getState, type GameState } from '../../core/state';
import { weeklyWages, weeklyUpkeep, weeklyIncome, groundCapacity, homeGate } from '../../systems/economy';
import { SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../config';
import { buildObjectivesSection } from './board';
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
   * The next home fixture (round ≥ current week) and its projected gate, with the
   * crowd against the seats (#169: sold out means a bigger stand would earn more).
   */
  nextHome: { round: number; projectedGate: number; attendance: number; capacity: number; soldOut: boolean } | null;
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
  // Sponsor is the only term that doesn't depend on reputation.
  const sponsorWeekly = weeklyIncome({ ...state, reputation: 0 });
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

  const gateWeekly = averageGateWeekly(state, nextHome?.projectedGate ?? 0);
  const burnWeekly = Math.max(0, wagesWeekly + upkeepWeekly - incomeWeekly - gateWeekly);
  const runwayWeeks = burnWeekly > 0 ? Math.max(0, state.money) / burnWeekly : null;

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
    nextHome,
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
  /** Any other money movement (build, recruit, …). */
  other: number;
  /** Σ of every movement recorded for the week. */
  net: number;
}

/**
 * Keeps the last `maxWeeks` weeks of money movements. Feed it money:changed
 * deltas with the season/week they happened in. Reasons match the labels that
 * applyEconomy passes to earnMoney ('wages', 'upkeep', 'sponsor+grant', 'gate').
 */
export class FinanceLedger {
  private weeks: LedgerWeek[] = []; // oldest → newest

  constructor(private readonly maxWeeks: number = LEDGER_WEEKS) {}

  record(entry: { delta: number; reason: string; season: number; week: number }): void {
    const { delta, reason, season, week } = entry;
    let row = this.weeks[this.weeks.length - 1];
    if (!row || row.season !== season || row.week !== week) {
      row = { season, week, wages: 0, upkeep: 0, income: 0, gate: 0, other: 0, net: 0 };
      this.weeks.push(row);
      if (this.weeks.length > this.maxWeeks) {
        this.weeks.splice(0, this.weeks.length - this.maxWeeks);
      }
    }
    if (reason === 'wages') row.wages += delta;
    else if (reason === 'upkeep') row.upkeep += delta;
    else if (reason === 'sponsor+grant') row.income += delta;
    else if (reason === 'gate') row.gate += delta;
    else row.other += delta;
    row.net += delta;
  }

  /** Recorded weeks, newest first. Copies, so callers can't mutate the ledger. */
  rows(): LedgerWeek[] {
    return this.weeks.slice().reverse().map((r) => ({ ...r }));
  }

  clear(): void {
    this.weeks = [];
  }
}

/** The app-wide ledger, fed by initFinanceLedger(). */
const financeLedger = new FinanceLedger();

/**
 * Subscribe a ledger to money:changed, stamping each movement with the current
 * season/week. Call once from main.ts. Returns the unsubscribe.
 */
export function initFinanceLedger(ledger: FinanceLedger = financeLedger): () => void {
  return bus.on('money:changed', ({ delta, reason }) => {
    const { season, week } = getState();
    ledger.record({ delta, reason, season, week });
  });
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

/** Runway label: "12 weeks", "1 week", "0 weeks", or "No burn" when null. */
export function fmtRunway(weeks: number | null): string {
  if (weeks === null) return 'No burn';
  const w = Math.floor(weeks);
  return `${w} ${w === 1 ? 'week' : 'weeks'}`;
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
    statRow(
      'Next home gate',
      s.nextHome ? `R${s.nextHome.round} · ${fmtMoney(s.nextHome.projectedGate)}` : 'None left',
    ),
    statRow('Crowd', s.nextHome ? fmtCrowd(s.nextHome) : `${groundCapacity(state).toLocaleString('en-US')} seats`),
  );
  nodes.push(panel({ class: 'nrl-finance-panel' }, weekly));
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
