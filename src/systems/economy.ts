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

import { getState, setState, type Fixture, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney } from '../data/club';
import { ECON, SEASON_ROUNDS, SQUAD_MIN, difficultyMultipliers } from '../config';
import { sortLadder } from './fixtures';
import { FACILITY_CATALOG, facilityUpkeep } from '../data/facility';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { renewalWage, warnForWeeks } from './contracts';

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
 * Passive weekly income:
 *   SPONSOR_PER_LEVEL × sponsorBoardLevel (0 if unbuilt)
 * + REP_GRANT_PER_POINT × reputation.
 */
export function weeklyIncome(state: GameState): number {
  const sponsorLevel = facilityLevel(state, 'sponsorBoard');
  return ECON.SPONSOR_PER_LEVEL * sponsorLevel
    + ECON.REP_GRANT_PER_POINT * state.reputation;
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
  return { capacity, demand, attendance, receipts: attendance * ECON.TICKET_PRICE, soldOut: demand > capacity };
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

    // Contract expired this tick — renew at the ask if affordable, else depart.
    const newWage = renewalWage(p, state);

    if (money >= newWage * 4) {
      keep.push({ ...p, wage: newWage, contractWeeks: 52 });
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
 * While money < FORCED_SALE_FLOOR, repeatedly release the highest-`wage` squad
 * player (NO payout) to freeAgents, apply squad-wide morale −FORCED_SALE_MORALE_HIT
 * (clamped ≥1), and re-check — stopping at SQUAD_MIN even if still under floor
 * (club stays in debt but fieldable). Terminates: each sale reduces squad size
 * and the loop halts at SQUAD_MIN.
 */
export function handleBankruptcy(_state: GameState): GameState {
  // Gate on the settled live balance, not the entry snapshot — prior pipeline
  // steps may have moved money after `state` was captured.
  if (getState().money < ECON.BANKRUPTCY_WARN) {
    const balance = getState().money;
    bus.emit('bankruptcy:warning', { balance });
    bus.emit('ui:notify', {
      text: `The club is in the red ($${balance.toLocaleString()}). Balance the books!`,
      kind: 'danger',
    });
  }

  while (getState().money < ECON.FORCED_SALE_FLOOR) {
    const s = getState();
    if (s.squad.length <= SQUAD_MIN) break; // keep a fieldable team

    // Highest-paid player (stable: first max in array order).
    let victim = s.squad[0];
    for (const p of s.squad) if (p.wage > victim.wage) victim = p;

    const remaining = s.squad.filter((p) => p.id !== victim.id);
    const morale = remaining.map((p) => ({
      ...p,
      morale: Math.max(1, p.morale - ECON.FORCED_SALE_MORALE_HIT),
    }));
    // Sold player (no payout) joins the free-agent pool.
    setState({ squad: morale, freeAgents: [...s.freeAgents, victim] });

    bus.emit('ui:notify', {
      text: `${victim.name} was force-sold to cover debts (no fee).`,
      kind: 'danger',
    });
  }
  return getState();
}

/**
 * Tick hook order 30. Fixed order: wages (deduct, may go negative) → upkeep →
 * income → gate → contracts → bankruptcy. Emits money:changed per net movement
 * (via earnMoney; deductions credit a negative delta).
 */
export function applyEconomy(state: GameState): GameState {
  // Compute wages from the entry snapshot; subsequent reads use getState() as the
  // store is mutated between steps.
  const wages = weeklyWages(state);
  if (wages !== 0) earnMoney(-wages, 'wages');

  const upkeep = weeklyUpkeep(state);
  if (upkeep !== 0) earnMoney(-upkeep, 'upkeep');

  const income = weeklyIncome(getState());
  if (income !== 0) earnMoney(income, 'sponsor+grant');

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
