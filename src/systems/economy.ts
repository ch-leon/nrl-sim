// src/systems/economy.ts — weekly income/expense loop. See BAK-188 (WU-10).
// Pure TypeScript, no Phaser. Deterministic (no RNG). Runs as the economy tick
// (ARCHITECTURE §5, order 30) after training/injuries, before the match — so a
// home gate can rescue the club before forced sales trigger.
//
// All money movement routes through club.earnMoney (credit; negative amount for a
// deduction) so 'money:changed' fires for every net movement. Wages are allowed
// to push money negative — spendMoney's guard would block that, so we credit a
// negative delta instead.

import { getState, setState, type GameState, type Player } from '../core/state';
import { bus } from '../core/events';
import { earnMoney } from '../data/club';
import { overallRating } from '../data/player';
import { ECON, SQUAD_MIN, difficultyMultipliers } from '../config';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { warnForWeeks } from './contracts';

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

/**
 * Gate receipts, applied on a HOME-game week only. Returns 0 on away/bye weeks
 * and when the league is empty (graceful — WU-7 may not have populated fixtures).
 *   attendance = (ATTEND_BASE + reputation × ATTEND_PER_REP)
 *              × (1 + GRANDSTAND_ATTEND_MULT × grandstandLevel)
 *   gate       = attendance × TICKET_PRICE
 */
export function gateReceipts(state: GameState): number {
  const fixture = currentFixture(state);
  if (!fixture || fixture.homeId !== state.clubId) return 0;

  const grandstandLevel = facilityLevel(state, 'grandstand');
  const attendance = (ECON.ATTEND_BASE + state.reputation * ECON.ATTEND_PER_REP)
    * (1 + ECON.GRANDSTAND_ATTEND_MULT * grandstandLevel);
  return attendance * ECON.TICKET_PRICE;
}

/**
 * Decrement contractWeeks by 1 for all squad. On reaching 0 a player demands
 * renewal at newWage = round(wage × (1 + drift)), drift = (overall−60)/200
 * clamped to [−0.15, +0.25]. If affordable at that moment (money ≥ newWage × 4)
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

    // Contract expired this tick — renew if affordable, else depart.
    const rawDrift = (overallRating(p) - 60) / 200;
    const drift = Math.max(-0.15, Math.min(0.25, rawDrift));
    const newWage = Math.round(p.wage * (1 + drift));

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
 * Tick hook order 30. Fixed order: wages (deduct, may go negative) → income →
 * gate → contracts → bankruptcy. Emits money:changed per net movement (via
 * earnMoney; deductions credit a negative delta).
 */
export function applyEconomy(state: GameState): GameState {
  // Compute wages from the entry snapshot; subsequent reads use getState() as the
  // store is mutated between steps.
  const wages = weeklyWages(state);
  if (wages !== 0) earnMoney(-wages, 'wages');

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
