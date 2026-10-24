// src/systems/economy.ts — weekly income/expense loop. See BAK-188 (WU-10).
// Pure TypeScript, no Phaser. Deterministic (no RNG). Runs as the economy tick
// (ARCHITECTURE §5, order 30) after training/injuries, before the match — so a
// home gate can rescue the club before forced sales trigger. Facility upkeep
// (N6, #164) is the running cost of the grounds, paid after wages; the gate
// (N6, #169) is min(seats, demand), so success on a bare hill has a roof.
//
// All money movement routes through club.earnMoney (credit; negative amount for a
// deduction) so 'money:changed' fires for every net movement. Wages are allowed
// to push money negative — spendMoney's guard would block that, so we credit a
// negative delta instead.

import { emptyFinance, getState, setState, type FinanceLine, type Fixture, type GameState, type PlacedFacility, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney } from '../data/club';
import { ECON, SEASON_ROUNDS, SQUAD_MIN, WEEKS_PER_SEASON, difficultyMultipliers, scaledMoney } from '../config';
import { sortLadder } from './fixtures';
import { FACILITY_CATALOG, facilityUpkeep, levelMult } from '../data/facility';
import { EVENT_CARDS } from '../data/events';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { staffWages } from './staff';
import { BOARD_LOAN, BOARD_LOAN_REPAID, renewalWage, takeBoardLoan, warnForWeeks } from './contracts';

/**
 * Level of the built facility with `defId`, or 0 if none is built. Placement
 * blocks duplicates of these, but older saves may hold two: the best one counts.
 */
function facilityLevel(state: GameState, defId: 'sponsorBoard' | 'grandstand'): number {
  return state.facilities.reduce((m, pf) => (pf.defId === defId ? Math.max(m, pf.level) : m), 0);
}

/** Σ of every squad player's weekly wage, scaled by the difficulty's wage multiplier. */
export function weeklyWages(state: GameState): number {
  const base = state.squad.reduce((sum, p) => sum + p.wage, 0);
  return Math.round(base * difficultyMultipliers(state.settings.difficulty).wages);
}

/**
 * Σ weekly upkeep of every built facility at its level (N6, #164):
 * the running cost that grows with the grounds. A defId the catalog no longer
 * knows costs nothing rather than crashing an old save.
 */
export function weeklyUpkeep(state: GameState): number {
  return state.facilities.reduce((sum, pf) => {
    const def = FACILITY_CATALOG[pf.defId];
    return sum + (def ? facilityUpkeep(def, pf.level) : 0);
  }, 0);
}

/**
 * The club's running costs a week (N12.3): staff, travel, insurance.
 * ECON.OVERHEAD_WEEKLY × the difficulty's overhead multiplier, the same whatever
 * the club has built or signed, so an idle club cannot shed it; plus the wages of
 * the staff it has hired (N14.5), paid on the same line.
 */
export function weeklyOverhead(state: GameState): number {
  return Math.round(ECON.OVERHEAD_WEEKLY * difficultyMultipliers(state.settings.difficulty).overhead) + staffWages(state);
}

/**
 * What a Sponsor Board at `level` pays a week at `reputation` (N12): SPONSOR_BASE
 * + SPONSOR_PER_REP × reputation, at most SPONSOR_CAP, × the level step every
 * facility uses (LEVEL_MULT). 0 at level 0 (unbuilt). The Build menu, the
 * facility popup and the Guide quote it at the club's reputation.
 */
export function sponsorReturn(level: number, reputation: number): number {
  if (level < 1) return 0;
  const perLevel = Math.min(ECON.SPONSOR_CAP, ECON.SPONSOR_BASE + ECON.SPONSOR_PER_REP * Math.max(0, reputation));
  return Math.round(perLevel * levelMult(Math.min(3, level) as 1 | 2 | 3));
}

/** Sponsor Board income: sponsorReturn at its level and the club's reputation (0 if unbuilt). */
export function sponsorIncome(state: GameState): number {
  return sponsorReturn(facilityLevel(state, 'sponsorBoard'), state.reputation);
}

/** The weekly reputation grant: REP_GRANT_PER_POINT × reputation. */
export function reputationGrant(state: GameState): number {
  return ECON.REP_GRANT_PER_POINT * state.reputation;
}

/** Passive weekly income: sponsorIncome + reputationGrant (booked as two lines, #172). */
export function weeklyIncome(state: GameState): number {
  return sponsorIncome(state) + reputationGrant(state);
}

/**
 * Find the current week's fixture for the player club, if any. Reads
 * state.league.fixtures defensively (WU-7 owns population): matches a fixture on
 * `round === state.week` involving the player club. Returns undefined when the
 * league is unpopulated or there is no such fixture (bye/finals-skip week).
 */
function currentFixture(state: GameState): GameState['league']['fixtures'][number] | undefined {
  const fixtures = state.league?.fixtures ?? [];
  return fixtures.find(
    (f) => f.round === state.week
      && (f.homeId === state.clubId || f.awayId === state.clubId),
  );
}

// ── Gates with a roof (N6, #169) ──────────────────────────────────────────────

/** Seats on the grounds: ECON.CAPACITY by Grandstand level (0 = the hill). */
export function groundCapacity(state: GameState): number {
  return ECON.CAPACITY[facilityLevel(state, 'grandstand')] ?? ECON.CAPACITY[0];
}

/**
 * Form as the crowd sees it: (wins − losses) ÷ FORM_GAMES over the club's last
 * FORM_GAMES results before `round` this season, so −1 (five losses) to +1
 * (five wins); a side yet to play is 0.
 */
export function recentForm(state: GameState, round = state.week): number {
  const mine = state.league.fixtures
    .filter((f) => f.result && f.round < round && (f.homeId === state.clubId || f.awayId === state.clubId))
    .sort((a, b) => b.round - a.round)
    .slice(0, ECON.FORM_GAMES);
  let score = 0;
  for (const f of mine) {
    const home = f.homeId === state.clubId;
    const us = home ? f.result!.homeScore : f.result!.awayScore;
    const them = home ? f.result!.awayScore : f.result!.homeScore;
    score += us > them ? 1 : us < them ? -1 : 0;
  }
  return score / ECON.FORM_GAMES;
}

/** Is `clubId` in the top eight of the ladder, once it has played? */
function topEight(state: GameState, clubId: string): boolean {
  const rows = sortLadder(state.league.ladder);
  const idx = rows.findIndex((r) => r.clubId === clubId);
  return idx >= 0 && idx < 8 && rows[idx]!.played > 0;
}

export interface GateEstimate {
  /** Seats: ECON.CAPACITY by Grandstand level. */
  capacity: number;
  /** Fans who would come: reputation, form and the occasion. */
  demand: number;
  /** min(capacity, demand). */
  attendance: number;
  receipts: number;
  /** Demand exceeds the seats: a bigger stand would earn more. */
  soldOut: boolean;
}

/**
 * The crowd a home `fixture` would draw at `state`, and what it pays:
 *   demand     = (ATTEND_BASE + reputation × ATTEND_PER_REP) × form × occasion
 *   attendance = min(groundCapacity, demand)
 *   receipts   = attendance × TICKET_PRICE
 * Form is 1 ± FORM_SWING × recentForm before the fixture's round; the occasion
 * is FINALS_MULT for a home final, BIG_MATCH_MULT for a top-eight opponent.
 * The Finance screen projects the next home gate with this same function.
 */
export function homeGate(state: GameState, fixture: Fixture): GateEstimate {
  const base = ECON.ATTEND_BASE + state.reputation * ECON.ATTEND_PER_REP;
  const form = 1 + ECON.FORM_SWING * recentForm(state, fixture.round);
  const opponent = fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId;
  const occasion = fixture.round > SEASON_ROUNDS ? ECON.FINALS_MULT : topEight(state, opponent) ? ECON.BIG_MATCH_MULT : 1;
  const demand = Math.round(base * form * occasion);
  const capacity = groundCapacity(state);
  const attendance = Math.min(capacity, demand);
  // Easy pays a little less at the gate (DIFFICULTY.easy.gate). Normal and Hard
  // are ×1, so the crowd, the form and the occasion still decide the receipt.
  const receipts = scaledMoney(attendance * ECON.TICKET_PRICE, difficultyMultipliers(state.settings.difficulty).gate);
  return { capacity, demand, attendance, receipts, soldOut: demand > capacity };
}

/** What the next Grandstand level would draw and pay at a sold-out fixture's demand. */
export interface StandProjection {
  /** The Grandstand level it would take: 1 builds a stand on the hill, 2–3 upgrade it. */
  level: number;
  /** Its seats (ECON.CAPACITY at that level). */
  capacity: number;
  /** min(that capacity, today's demand). */
  attendance: number;
  receipts: number;
  /** receipts − today's gate: what the bigger stand adds a game. */
  gain: number;
}

/**
 * What the next Grandstand level would earn at `fixture` (N12): homeGate on the
 * same state with that stand built, so it is the gate the weekly tick would pay,
 * against the gate it pays today. Only when the fixture sells out (demand over
 * the seats: more seats would fill); null otherwise, and at the top level.
 */
export function nextStandGate(state: GameState, fixture: Fixture): StandProjection | null {
  const today = homeGate(state, fixture);
  const level = facilityLevel(state, 'grandstand') + 1;
  if (!today.soldOut || ECON.CAPACITY[level] === undefined) return null;
  // facilityLevel takes the best Grandstand, so one more at the next level stands in for the upgrade.
  const stand: PlacedFacility = { id: 'projected-stand', defId: 'grandstand', level: level as PlacedFacility['level'], x: 0, y: 0 };
  const bigger = homeGate({ ...state, facilities: [...state.facilities, stand] }, fixture);
  return { level, capacity: bigger.capacity, attendance: bigger.attendance, receipts: bigger.receipts, gain: bigger.receipts - today.receipts };
}

/**
 * Gate receipts, applied on a HOME-game week only (homeGate for the current
 * fixture). Returns 0 on away/bye weeks and when the league is empty.
 */
export function gateReceipts(state: GameState): number {
  const fixture = currentFixture(state);
  if (!fixture || fixture.homeId !== state.clubId) return 0;
  return homeGate(state, fixture).receipts;
}

/**
 * Decrement contractWeeks by 1 for all squad. On reaching 0 a player demands
 * renewal at contracts.renewalWage: the market wage for their overall today,
 * moved by morale and the club's standing (N6, #167; before that it was the old
 * wage ± a drift by overall). If affordable at that moment (money ≥ newWage × 4)
 * auto-renew (wage = newWage, contractWeeks = 52); else the player departs to
 * freeAgents (removed from squad), ui:notify info. Deterministic; squad-array
 * order (earlier renewals can consume funds, pushing later players to depart).
 */
export function tickContracts(state: GameState): GameState {
  const money = getState().money;
  const keep: Player[] = [];
  const departed: Player[] = [];

  // Sequential, squad-array order (deterministic). Renewal carries no immediate
  // payout, so affordability is checked against the tick's settled balance.
  for (const p of state.squad) {
    const weeks = p.contractWeeks - 1;
    if (weeks > 0) {
      keep.push({ ...p, contractWeeks: weeks });
      const warning = warnForWeeks(p.name, weeks);
      if (warning) bus.emit('ui:notify', { text: warning, kind: 'info' });
      continue;
    }

    // Contract expired this tick — renew at the ask if affordable, on a board loan
    // of the four weeks if not (N14.3), else depart.
    const newWage = renewalWage(p, state);

    if (money >= newWage * 4) {
      keep.push({ ...p, wage: newWage, contractWeeks: 52 });
    } else if (takeBoardLoan(newWage * 4)) {
      keep.push({ ...p, wage: newWage, contractWeeks: 52 });
      bus.emit('ui:notify', {
        text: `${p.name} re-signed on a board loan of $${(newWage * 4).toLocaleString()}, repaid at the season's end.`,
        kind: 'info',
      });
    } else {
      departed.push({ ...p, contractWeeks: 0, departed: true });
      bus.emit('ui:notify', {
        text: `${p.name} left the club as a free agent (contract expired).`,
        kind: 'info',
      });
    }
  }

  const s = getState();
  setState({ squad: keep, freeAgents: [...s.freeAgents, ...departed] });
  return getState();
}

/**
 * Bankruptcy cascade. Emits a single warning + danger notify when money < 0.
 * While money < FORCED_SALE_FLOOR, release the highest-`wage` squad player who
 * can go (NO payout) to freeAgents and apply squad-wide morale
 * −FORCED_SALE_MORALE_HIT (clamped ≥1): one a week (N14.3), so a club sinks in
 * steps and the advance stops each week with a name. Never below SQUAD_MIN, and
 * fieldable means fit: a fit player is sold only while more than SQUAD_MIN are
 * fit, an injured one while the squad is over SQUAD_MIN, so a sale never takes the
 * fit count under the minimum (QA finding 19). The warning comes after the sale
 * and names it (`forcedSales`, N12.5); the toasts keep their order.
 */
export function handleBankruptcy(_state: GameState): GameState {
  // Gate on the settled live balance, not the entry snapshot — prior pipeline
  // steps may have moved money after `state` was captured.
  const balance = getState().money;
  const warned = balance < ECON.BANKRUPTCY_WARN;
  if (warned) {
    bus.emit('ui:notify', {
      text: `The club is in the red ($${balance.toLocaleString()}). Balance the books!`,
      kind: 'danger',
    });
  }

  const forcedSales: string[] = [];
  // One sale a week (N14.3); a fieldable team is kept.
  const s = getState();
  let victim: Player | undefined;
  if (s.money < ECON.FORCED_SALE_FLOOR && s.squad.length > SQUAD_MIN) {
    const spareFit = s.squad.filter((p) => p.injuredWeeks <= 0).length > SQUAD_MIN;
    // Highest-paid player who can go (stable: first max in array order).
    for (const p of s.squad) {
      if (!spareFit && p.injuredWeeks <= 0) continue;
      if (!victim || p.wage > victim.wage) victim = p;
    }
  }
  if (victim) {
    const remaining = s.squad.filter((p) => p.id !== victim.id);
    const morale = remaining.map((p) => ({
      ...p,
      morale: Math.max(1, p.morale - ECON.FORCED_SALE_MORALE_HIT),
    }));
    // Sold player (no payout) joins the free-agent pool.
    setState({ squad: morale, freeAgents: [...s.freeAgents, victim] });
    forcedSales.push(victim.name);

    bus.emit('ui:notify', {
      text: `${victim.name} was force-sold to cover debts (no fee).`,
      kind: 'danger',
    });
  }
  if (warned) bus.emit('bankruptcy:warning', { balance, forcedSales });
  return getState();
}

/**
 * Tick hook order 30. Fixed order: wages (deduct, may go negative) → upkeep →
 * overhead → sponsor → grant → gate → contracts → bankruptcy. Emits
 * money:changed per net movement (via earnMoney; deductions credit a negative delta).
 */
export function applyEconomy(state: GameState): GameState {
  // Compute wages from the entry snapshot; subsequent reads use getState() as the
  // store is mutated between steps.
  const wages = weeklyWages(state);
  if (wages !== 0) earnMoney(-wages, 'wages');

  const upkeep = weeklyUpkeep(state);
  if (upkeep !== 0) earnMoney(-upkeep, 'upkeep');

  const overhead = weeklyOverhead(state);
  if (overhead !== 0) earnMoney(-overhead, 'overhead');

  const sponsor = sponsorIncome(getState());
  if (sponsor !== 0) earnMoney(sponsor, 'sponsor');
  const grant = reputationGrant(getState());
  if (grant !== 0) earnMoney(grant, 'grant');

  const gate = gateReceipts(getState());
  if (gate !== 0) earnMoney(gate, 'gate');

  tickContracts(getState());
  handleBankruptcy(getState());
  return getState();
}

/**
 * Install the economy tick hook (order 30). Called explicitly by the orchestrator
 * (main.ts) — importing this module has no side effects. The hook reads/writes
 * the live store via getState/setState.
 */
export function registerEconomySystem(): void {
  registerTickHook('economy', TICK_ORDER.economy, () => {
    applyEconomy(getState());
  });
}

// ── The club's books (N6, #172) ───────────────────────────────────────────────

/** Event modifiers that pay or cost money ('Merch royalties', …) use their label as the ledger reason. */
const MODIFIER_LABELS = new Set(EVENT_CARDS.flatMap((c) => c.choices.flatMap((ch) => ch.effects.flatMap((e) =>
  (e.kind === 'modifier' && e.effects.some((x) => x.kind === 'money') ? [e.label] : [])))));

/**
 * The line of the books a ledger reason belongs to. Reasons are the strings each
 * system passes to earnMoney / spendMoney: this file's fixed words, the board's,
 * `event: <title>` and modifier labels from the deck, and `<verb>:<id>` for
 * signings, sales, renewals, releases and the grounds. Anything else is `other`.
 */
export function classifyReason(reason: string): FinanceLine {
  if (reason === 'wages') return 'wages';
  if (reason === 'upkeep') return 'upkeep';
  if (reason === 'overhead') return 'overhead';
  if (reason === 'sponsor') return 'sponsor';
  if (reason === 'grant' || reason === 'sponsor+grant') return 'grant';
  if (reason === 'gate') return 'gate';
  if (reason === 'finals prize money') return 'prize';
  if (reason === 'board grant' || reason === BOARD_LOAN || reason === BOARD_LOAN_REPAID) return 'boardGrant';
  if (reason.startsWith('event: ') || MODIFIER_LABELS.has(reason)) return 'events';
  if (/^(sign|sell):/.test(reason)) return 'transfers';
  if (/^(renew|release):/.test(reason)) return 'contracts';
  if (/^(build|upgrade|move|demolish):/.test(reason)) return 'facilities';
  return 'other';
}

/** Σ of a season's lines: its net money movement. */
export function financeNet(f: Record<FinanceLine, number>): number {
  let n = 0;
  for (const l of Object.keys(f) as FinanceLine[]) n += f[l];
  return n;
}

/** The lines the rollover pays for the season just played (fixtures-season hook → applyBoardReview). */
const CLOSING_LINES: ReadonlySet<FinanceLine> = new Set(['prize', 'boardGrant']);

/** Where a money movement belongs: its line of the books and the season and week it is stamped with. */
export interface MovementStamp { line: FinanceLine; season: number; week: number }

/**
 * Stamp a money movement made at `state`'s clock. Usually the clock itself, but
 * the rollover pays the finals prize money and the board grant after the season
 * counter has moved to the next season, in week 1, so those two lines at week 1
 * close the season just played: they are stamped to its last week
 * (WEEKS_PER_SEASON, the week whose advance paid them). The books
 * (registerFinanceSystem) and the Finance screen's weekly ledger both stamp with
 * this, so the two always agree on where the rollover's money belongs (N12).
 */
export function stampMovement(state: Pick<GameState, 'season' | 'week' | 'finance'>, reason: string): MovementStamp {
  const line = classifyReason(reason);
  // A loan taken in week 1 is that season's; its repayment, like the grant, closes the one before.
  const closing = state.week === 1 && CLOSING_LINES.has(line) && reason !== BOARD_LOAN && state.finance.some((e) => e.season === state.season - 1);
  return closing
    ? { line, season: state.season - 1, week: WEEKS_PER_SEASON }
    : { line, season: state.season, week: state.week };
}

/**
 * Keep the club's books: every money:changed delta is added to its line in the
 * entry for the season stampMovement gives (opened on the first movement, so a
 * save written at any moment loads right): the current season, except the
 * rollover's prize money and board grant, which close the season just played.
 * Pure bookkeeping: nothing here depends on the order listeners fire in. Called
 * once from main.ts (and the soak); returns the unsubscribe.
 */
export function registerFinanceSystem(): () => void {
  return bus.on('money:changed', ({ delta, reason }) => {
    const s = getState();
    const { line, season } = stampMovement(s, reason);
    const books = s.finance.some((e) => e.season === season)
      ? s.finance
      : [...s.finance, emptyFinance(season)].sort((a, b) => a.season - b.season);
    setState({ finance: books.map((e) => (e.season === season ? { ...e, [line]: e[line] + delta } : e)) });
  });
}
