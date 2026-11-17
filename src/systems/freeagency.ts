import { refreshMarketShortlist } from './playerCareer';
// Free-agent discovery + signing/release logic. Refreshes never generate people
// or advance the match RNG; annual intake is a separate lifecycle operation.

import { getState, setState, type GameState, type Player } from '../core/state';
import type { Rng } from '../utils/rng';
import { makeRng } from '../utils/rng';
import { bus } from '../core/events';
import { spendMoney } from '../data/club';
import { signingFeeQuote, type FinanceLevel } from '../data/financeRules';
import { registerTickHook, TICK_ORDER, type TickContext } from '../core/time';
import { SPECIAL_MAGNITUDE } from '../data/facility';
import { LEAGUE, SQUAD_CAP, SQUAD_MIN, WEEKS_PER_SEASON } from '../config';
import { capRoomFor, commitment, publishedCap, releaseTerms, salaryDemand, signForRestOfSeason } from './cap';
import { fmtMoney } from '../utils/money';
import { REP_BASELINE } from './league';
import { placeSigning, type SigningPlacement } from './lineup';
import { hasStructuralCalendar } from './competitionCalendar';

// ── Tuning constants (spec §Key interfaces) ─────────────────────────────────

export const FREE_AGENT_POOL_SIZE = 12;
export const REFRESH_EVERY_WEEKS = 4;
/** Upfront fee for an Academy prospect = this × weekly wage (everyone else pays a transfer-style fee, #146). */
export const SIGNING_FEE_WEEKS = 4;
/** A Scout Office takes this much off a free agent's fee per level (L3 = 30%). Assumed (needs Leon). */
export const SCOUT_FEE_DISCOUNT_PER_LEVEL = 0.1;
export const RELEASE_PAYOUT_WEEKS = 2; // upfront payout = 2 × weekly wage
export const NEW_CONTRACT_WEEKS = 52;

/** Result of a sign/release attempt. `reason` is set only when `ok` is false. */
export interface SignResult {
  ok: boolean;
  reason?: string;
  /** Player-facing reason. Set on a failure. */
  message?: string;
  /** Where the coach's signing went in the lineup (#416), when `opts.intoLineup` asked. */
  placed?: SigningPlacement;
}

// ── Quality bias ────────────────────────────────────────────────────────────

/** Scouting bias a Scout Office adds per level (the Academy's is SPECIAL_MAGNITUDE.recruitQuality). */
export const SCOUT_BIAS_PER_LEVEL = 0.12;
/** Reputation points above REP_BASELINE per unit of scouting bias. */
export const REP_PER_BIAS = 250;
/**
 * Overall rating points one unit of scouting bias lifts the pool's target (N12):
 * a Scout Office +3 a level, an Academy +2.5 a level, reputation +1 for every 10
 * points above the baseline (+7 at 100). A Scout Office and an Academy at L3 at
 * reputation 100 centre the pool on about 75, near the old star-heavy pool's 79.
 * Assumed (needs Leon).
 */
export const POOL_POINTS_PER_BIAS = 25;

type ScoutingClub = Pick<GameState, 'facilities' | 'reputation'>;

function bestLevel(state: Pick<GameState, 'facilities'>, defId: 'scoutOffice' | 'academy'): number {
  return state.facilities.reduce((m, f) => (f.defId === defId ? Math.max(m, f.level) : m), 0);
}

/**
 * Scouting bias derived from the club's built Scout Office level (0 if none),
 * Academy level (SPECIAL_MAGNITUDE.recruitQuality per level) and reputation:
 * `scoutLevel × 0.12 + academyLevel × 0.1 + (rep − REP_BASELINE) / 250`. A new
 * club (nothing built, the baseline reputation) is at 0; reputation below the
 * baseline takes a little off.
 */
export function scoutBias(state: ScoutingClub): number {
  return bestLevel(state, 'scoutOffice') * SCOUT_BIAS_PER_LEVEL
    + bestLevel(state, 'academy') * SPECIAL_MAGNITUDE.recruitQuality
    + (state.reputation - REP_BASELINE) / REP_PER_BIAS;
}

/**
 * The overall the free-agent pool is generated around (N12): the league mean
 * less LEAGUE.POOL_BELOW, lifted POOL_POINTS_PER_BIAS points per unit of
 * scouting bias. 52 for a new club; each agent lands around it
 * (data/player.ts generateFreeAgent), so a 65+ still turns up now and then.
 */
export function poolTarget(state: ScoutingClub): number {
  return LEAGUE.MEAN - LEAGUE.POOL_BELOW + scoutBias(state) * POOL_POINTS_PER_BIAS;
}

// ── Pool refresh ────────────────────────────────────────────────────────────

/** Refresh discovery only. The optional legacy RNG argument is deliberately untouched. */
export function refreshFreeAgents(state: GameState, _rng?: Rng): GameState {
  setState({ playerPopulation: refreshMarketShortlist(state).playerPopulation });
  return getState();
}

// ── Signing ─────────────────────────────────────────────────────────────────

/** The Scout Office's discount on signing fees (0 without one). */
export function scoutFeeDiscount(state: Pick<GameState, 'facilities'>): number {
  return bestLevel(state as GameState, 'scoutOffice') * SCOUT_FEE_DISCOUNT_PER_LEVEL;
}

function scoutLevel(state: Pick<GameState, 'facilities'>): FinanceLevel {
  return Math.min(3, Math.max(0, bestLevel(state, 'scoutOffice'))) as FinanceLevel;
}

/** Academy rate once, on the first signing. A player who has already left does not get it again. */
function academyProspect(agent: Pick<Player, 'junior' | 'departed'>): boolean {
  return agent.junior === true && agent.departed !== true;
}

/**
 * Upfront fee to sign a free agent: one year's wage, or a quarter of that for
 * an Academy prospect. A Scout Office takes 10% off the fee per level, and
 * nothing off the salary. Difficulty does not scale it.
 */
export function signingFee(state: Pick<GameState, 'facilities'>, agent: Player): number {
  return signingFeeQuote(salaryDemand(agent), academyProspect(agent), scoutLevel(state));
}

/** How the fee was worked out, for the Recruit card. */
export function signingFeeBasis(state: Pick<GameState, 'facilities'>, agent: Player): string {
  if (academyProspect(agent)) return "a quarter of one year's wage, Academy prospect";
  const level = scoutLevel(state);
  return level > 0 ? `one year's wage, Scout Office −${level * 10}%` : "one year's wage";
}

/**
 * Sign the free agent with `playerId` into the squad. Needs the cash for the
 * fee and room under this season's cap, and applies both or neither. The deal
 * covers the rest of this season at the annual salary. Nothing mutates on
 * failure.
 *
 * Reasons: 'not-found', 'squad-full', 'over-cap', 'insufficient-funds'.
 * On success emits 'player:signed' and a 'ui:notify' success, unless
 * `opts.toast` is false (the Recruit screen and the player page show the Undo
 * toast instead, #370). With `opts.intoLineup` (the coach's own tap, #416) a
 * man who out-rates a starter goes into the nine and `placed` says where;
 * without it (the soak, tests) the lineup is left alone.
 */
export function signPlayer(state: GameState, playerId: string, opts: { toast?: boolean; intoLineup?: boolean } = {}): SignResult {
  const s = state;
  const agent = s.freeAgents.find((p) => p.id === playerId);
  if (!agent) return { ok: false, reason: 'not-found', message: 'That player is no longer available.' };
  if (s.squad.length >= SQUAD_CAP) return { ok: false, reason: 'squad-full', message: 'The squad is full.' };

  const fee = signingFee(s, agent);
  const salary = salaryDemand(agent);
  if (!capRoomFor(s.squad, s.capAccount, s.season, salary)) {
    const room = Math.max(0, publishedCap(s.capAccount) - commitment(s.squad, s.season));
    return {
      ok: false,
      reason: 'over-cap',
      message: `Not enough salary-cap room. He costs ${fmtMoney(salary)} a season and ${fmtMoney(room)} is free.`,
    };
  }
  if (s.money < fee) {
    return { ok: false, reason: 'insufficient-funds', message: `Not enough cash. The signing fee is ${fmtMoney(fee)}.` };
  }

  // Both checks passed. The debit and the move are the whole signing.
  if (!spendMoney(fee, `sign:${playerId}`)) {
    return { ok: false, reason: 'insufficient-funds', message: `Not enough cash. The signing fee is ${fmtMoney(fee)}.` };
  }

  const { junior: _junior, departed: _departed, ...rest } = agent;
  const signed: Player = signForRestOfSeason(rest, s.season, s.week);
  const after = getState();
  const squad = [...after.squad, signed];
  const placed = opts.intoLineup ? placeSigning(after.lineup, squad, signed) : undefined;
  setState({
    freeAgents: after.freeAgents.filter((p) => p.id !== playerId),
    squad,
    ...(placed ? { lineup: placed.lineup } : {}),
  });

  bus.emit('player:signed', signed);
  if (opts.toast !== false) bus.emit('ui:notify', { text: `Signed ${signed.name}`, kind: 'success' });
  return placed ? { ok: true, placed } : { ok: true };
}

// ── Release ─────────────────────────────────────────────────────────────────

/**
 * Release a squad player. Pays a quarter of the salary still to run, and never
 * more than one year's salary. Refuses when the cash is short or the squad
 * would drop below the minimum, and then changes nothing. The signing fee is
 * not refunded. He returns to the pool without the deal, and without the
 * Academy rate.
 *
 * Reasons: 'not-found', 'squad-min', 'insufficient-funds'.
 */
export function releasePlayer(state: GameState, playerId: string): SignResult {
  const s = state;
  const player = s.squad.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'not-found', message: 'Player not found.' };
  if (s.squad.length <= SQUAD_MIN) {
    return { ok: false, reason: 'squad-min', message: `The squad cannot drop below ${SQUAD_MIN}.` };
  }

  const terms = releaseTerms(player, s.season, s.week);
  if (s.money < terms.payout) {
    return {
      ok: false,
      reason: 'insufficient-funds',
      message: `Not enough cash. Releasing him costs ${fmtMoney(terms.payout)}.`,
    };
  }
  if (terms.payout > 0 && !spendMoney(terms.payout, `release:${playerId}`)) {
    return {
      ok: false,
      reason: 'insufficient-funds',
      message: `Not enough cash. Releasing him costs ${fmtMoney(terms.payout)}.`,
    };
  }
  const { deal: _deal, junior: _junior, ...withoutDeal } = player;
  const released: Player = { ...withoutDeal, contractWeeks: 0, departed: true };
  const after = getState();
  setState({
    squad: after.squad.filter((p) => p.id !== playerId),
    freeAgents: [...after.freeAgents, released],
  });
  const freed = terms.nextCapFreed > 0
    ? `, freeing ${fmtMoney(terms.capFreed)} of this season's cap and ${fmtMoney(terms.nextCapFreed)} next season`
    : `, freeing ${fmtMoney(terms.capFreed)} of this season's cap`;
  bus.emit('ui:notify', { text: `Released ${released.name} for ${fmtMoney(terms.payout)}${freed}`, kind: 'info' });
  return { ok: true };
}

// ── Week-tick hook ──────────────────────────────────────────────────────────

/**
 * Week-tick hook body (order 60). Refreshes the free-agent pool only when
 * state.week % REFRESH_EVERY_WEEKS === 0; otherwise a no-op. Pure with respect to
 * the passed rng — the registered hook supplies an rng seeded from state.rngSeed.
 */
export function freeAgencyTick(state: GameState, rng: Rng): GameState {
  if (hasStructuralCalendar(state)) return state; // The revised market/finance contract is not active yet.
  if (state.week % REFRESH_EVERY_WEEKS !== 0) return state;
  return refreshFreeAgents(state, rng);
}

/**
 * Weeks to advance until the pool is new: the next week played whose number is a
 * multiple of REFRESH_EVERY_WEEKS, so 1 means the week about to be played. The
 * last weeks of a season wait for week 4 of the next.
 */
export function weeksToPoolRefresh(week: number): number {
  const next = Math.ceil(week / REFRESH_EVERY_WEEKS) * REFRESH_EVERY_WEEKS;
  if (next <= WEEKS_PER_SEASON) return next - week + 1;
  return WEEKS_PER_SEASON - week + 1 + REFRESH_EVERY_WEEKS;
}

/**
 * Install the free-agency week-tick hook (TICK_ORDER.freeagents === 60). The hook
 * reads the store, builds an Rng from state.rngSeed, and runs freeAgencyTick;
 * refreshFreeAgents persists the advanced rngSeed. Registration is side-effect
 * free at import — call this explicitly from the orchestrator (main.ts).
 */
export function registerFreeAgencySystem(): void {
  registerTickHook('freeagency', TICK_ORDER.freeagents, (_ctx: TickContext) => {
    const s = getState();
    const rng = makeRng(s.rngSeed);
    freeAgencyTick(s, rng);
  });
}
