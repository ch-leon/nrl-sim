// src/systems/freeagency.ts — free-agent pool refresh + signing/release logic.
// See BAK-179 (WU-9). Pure TypeScript, no Phaser. All randomness routes through
// the seeded Rng (ARCHITECTURE §1.5); the registered tick hook builds an Rng from
// state.rngSeed and writes the advanced state back (same pattern as data/club.ts).

import { getState, setState, type GameState, type Player } from '../core/state';
import type { Rng } from '../utils/rng';
import { makeRng } from '../utils/rng';
import { bus } from '../core/events';
import { spendMoney } from '../data/club';
import { generatePlayer, type Quality } from '../data/player';
import { registerTickHook, TICK_ORDER, type TickContext } from '../core/time';
import { SPECIAL_MAGNITUDE } from '../data/facility';
import { SQUAD_CAP, SQUAD_MIN } from '../config';
import { transferFee } from './contracts';

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
}

// ── Quality bias ────────────────────────────────────────────────────────────

function bestLevel(state: GameState, defId: 'scoutOffice' | 'academy'): number {
  return state.facilities.reduce((m, f) => (f.defId === defId ? Math.max(m, f.level) : m), 0);
}

/**
 * Scouting bias derived from the club's built Scout Office level (0 if none),
 * Academy level (SPECIAL_MAGNITUDE.recruitQuality per level) and reputation.
 * `bias = scoutLevel * 0.12 + academyLevel * 0.1 + rep / 250`. Higher bias
 * shifts the rolled quality upward toward 'average'/'star'.
 */
function scoutBias(state: GameState): number {
  return bestLevel(state, 'scoutOffice') * 0.12
    + bestLevel(state, 'academy') * SPECIAL_MAGNITUDE.recruitQuality
    + state.reputation / 250;
}

/**
 * Roll a Quality using the scouting bias. `r = rng.next() + bias`:
 * r >= 1.1 → 'star', r >= 0.7 → 'average', else 'rookie'.
 */
function rollQuality(rng: Rng, bias: number): Quality {
  const r = rng.next() + bias;
  if (r >= 1.1) return 'star';
  if (r >= 0.7) return 'average';
  return 'rookie';
}

// ── Pool refresh ────────────────────────────────────────────────────────────

/**
 * Regenerate GameState.freeAgents to a fresh pool of FREE_AGENT_POOL_SIZE.
 * Quality per agent is biased upward by Scout Office level + reputation. Consumes
 * RNG in a fixed order (quality roll then generatePlayer, per agent) so a given
 * seed + state yields the same pool. Mutates the store (via setState) and returns
 * the new state; also persists the advanced rngSeed so subsequent draws continue
 * the sequence.
 */
export function refreshFreeAgents(state: GameState, rng: Rng): GameState {
  const bias = scoutBias(state);
  // Academy prospects (#42) and players who just left the club (#40) survive re-rolls; the next season's intake clears them.
  const pool: Player[] = state.freeAgents.filter((p) => p.junior || p.departed);
  for (let i = 0; i < FREE_AGENT_POOL_SIZE; i++) {
    const quality = rollQuality(rng, bias);
    pool.push(generatePlayer(rng, { quality }));
  }
  setState({ freeAgents: pool, rngSeed: rng.state() });
  return getState();
}

// ── Signing ─────────────────────────────────────────────────────────────────

/** The Scout Office's discount on signing fees (0 without one). */
export function scoutFeeDiscount(state: Pick<GameState, 'facilities'>): number {
  return bestLevel(state as GameState, 'scoutOffice') * SCOUT_FEE_DISCOUNT_PER_LEVEL;
}

/**
 * Upfront fee to sign a free agent (#146). An Academy prospect costs
 * SIGNING_FEE_WEEKS × their wage; everyone else a transfer-style fee that grows
 * with overall and falls with age (contracts.transferFee: overall² × 10 × age
 * factor, so an 80-overall in his prime is about $64k and a 55 about $30k), less
 * the Scout Office discount. Four weeks' wages made an 85-overall a $5k buy.
 */
export function signingFee(state: Pick<GameState, 'facilities'>, agent: Player): number {
  if (agent.junior) return SIGNING_FEE_WEEKS * agent.wage;
  return Math.round(transferFee(agent) * (1 - scoutFeeDiscount(state)));
}

/** How the fee was worked out, for the Recruit card: "4×wage, Academy prospect" or "by rating and age[, Scout Office −10%]". */
export function signingFeeBasis(state: Pick<GameState, 'facilities'>, agent: Player): string {
  if (agent.junior) return `${SIGNING_FEE_WEEKS}×wage, Academy prospect`;
  const discount = scoutFeeDiscount(state);
  return discount > 0 ? `by rating and age, Scout Office −${Math.round(discount * 100)}%` : 'by rating and age';
}

/**
 * Sign the free agent with `playerId` into the squad. Deducts the upfront
 * signingFee, sets contractWeeks = NEW_CONTRACT_WEEKS, and moves the player
 * from freeAgents to squad. Enforces SQUAD_CAP and funds. Nothing mutates on
 * failure.
 *
 * Reasons: 'not-found' (id absent), 'squad-full' (squad at SQUAD_CAP),
 * 'insufficient-funds' (money < fee). On success emits 'player:signed' and a
 * 'ui:notify' success.
 */
export function signPlayer(state: GameState, playerId: string): SignResult {
  const s = state;
  const agent = s.freeAgents.find((p) => p.id === playerId);
  if (!agent) return { ok: false, reason: 'not-found' };
  if (s.squad.length >= SQUAD_CAP) return { ok: false, reason: 'squad-full' };

  const fee = signingFee(s, agent);
  if (s.money < fee) return { ok: false, reason: 'insufficient-funds' };

  // Deduct the fee first (guaranteed to succeed given the funds check above),
  // which emits money:changed. Then move the player between lists atomically.
  spendMoney(fee, `sign:${playerId}`);

  const { junior: _junior, departed: _departed, ...rest } = agent;
  const signed: Player = { ...rest, contractWeeks: NEW_CONTRACT_WEEKS };
  const after = getState();
  setState({
    freeAgents: after.freeAgents.filter((p) => p.id !== playerId),
    squad: [...after.squad, signed],
  });

  bus.emit('player:signed', signed);
  bus.emit('ui:notify', { text: `Signed ${signed.name}`, kind: 'success' });
  return { ok: true };
}

// ── Release ─────────────────────────────────────────────────────────────────

/**
 * Release a squad player: pays RELEASE_PAYOUT_WEEKS × wage upfront (allowed to go
 * negative — economy handles bankruptcy), removes them from squad and returns
 * them to freeAgents with contract cleared. Guarded by SQUAD_MIN so the club
 * cannot drop below the minimum matchday squad. UI must confirm before calling.
 *
 * Reasons: 'not-found' (id absent from squad), 'squad-min' (squad at SQUAD_MIN).
 * On success emits money:changed and a 'ui:notify' info.
 */
export function releasePlayer(state: GameState, playerId: string): SignResult {
  const s = state;
  const player = s.squad.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: 'not-found' };
  if (s.squad.length <= SQUAD_MIN) return { ok: false, reason: 'squad-min' };

  const payout = RELEASE_PAYOUT_WEEKS * player.wage;
  // Apply the debit directly: spendMoney refuses when funds are short, but a
  // release payout is allowed to take the balance negative (economy handles
  // bankruptcy), so write money via the store and emit money:changed ourselves.
  const balance = s.money - payout;
  const released: Player = { ...player, contractWeeks: 0, departed: true };
  setState({
    money: balance,
    squad: s.squad.filter((p) => p.id !== playerId),
    freeAgents: [...s.freeAgents, released],
  });
  bus.emit('money:changed', { delta: -payout, reason: `release:${playerId}`, balance });
  bus.emit('ui:notify', { text: `Released ${released.name}`, kind: 'info' });
  return { ok: true };
}

// ── Week-tick hook ──────────────────────────────────────────────────────────

/**
 * Week-tick hook body (order 60). Refreshes the free-agent pool only when
 * state.week % REFRESH_EVERY_WEEKS === 0; otherwise a no-op. Pure with respect to
 * the passed rng — the registered hook supplies an rng seeded from state.rngSeed.
 */
export function freeAgencyTick(state: GameState, rng: Rng): GameState {
  if (state.week % REFRESH_EVERY_WEEKS !== 0) return state;
  return refreshFreeAgents(state, rng);
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
