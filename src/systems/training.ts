// src/systems/training.ts — XP, level points, focus spending and injury recovery.
// See BAK-180 (WU-10). Pure TypeScript, no Phaser. All maths deterministic and
// unit-tested; stats stay fractional in state (UI rounds for display).
//
// Pipeline (ARCHITECTURE §5): weekly XP = order 10, injuries tick = order 20.
// applyTraining runs strictly before applyInjuries so an injured player trains at
// ×0.3 THIS week and recovers AFTER.

import { getState, setState, type GameState, type Player, type PlacedFacility, type PlayerStats, type TrainingFocus } from '../core/state';
import { FACILITY_CATALOG, levelMult, type FacilityDef, type FacilityDefId } from '../data/facility';
import { STAT_MAX, PROGRESSION } from '../config';
import { activePack } from '../content';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { shownStats } from '../data/player';
import { hasTrait, traitBoost } from '../data/traits';
import { foldEvents, playerOfTheMatch } from './stats';
import type { MatchResult, TeamSheet } from '../sim/events';

/** Stats floor. Stats are clamped to [STAT_FLOOR, STAT_MAX] after each tick. */
export const STAT_FLOOR = 1;

/** Veteran (31+) flat weekly decline applied to speed & stamina, post-gain. */
export const VETERAN_DECLINE = 0.3;

/** Resolve a facility catalog definition by placed-instance defId. */
function getDef(defId: FacilityDefId): FacilityDef {
  return FACILITY_CATALOG[defId];
}

// Re-export levelMult (canonical source is facility.ts / BAK-168) so callers of
// the training system have a single import surface. Signature: (1|2|3) → number.
export { levelMult };

/**
 * Age-based development modifier applied to all XP awards.
 *  age<=21 → 1.5 ; 22-27 → 1.0 ; 28-30 → 0.6 ; 31+ → 0.25
 */
export function ageMod(age: number): number {
  if (age <= 21) return 1.5;
  if (age <= 27) return 1.0;
  if (age <= 30) return 0.6;
  return 0.25;
}

/** Generic additive facility XP rate; position and adjacency never enter it. */
export function facilityXpMultiplier(facilities: readonly PlacedFacility[]): number {
  const bonus = facilities.reduce((sum, f) => sum +
    (getDef(f.defId).training ? PROGRESSION.FACILITY_XP_BONUS * levelMult(f.level) : 0), 0);
  return 1 + Math.min(PROGRESSION.FACILITY_XP_CAP, bonus);
}

/**
 * Trait multiplier: workhorse ×1.2 at level I (×1.32 II, ×1.44 III) and
 * youngGun ×1.3 stack multiplicatively; all other traits ×1.0.
 */
export function traitMult(player: Player): number {
  let m = 1;
  const work = traitBoost(player.traits, 'workhorse');
  if (work > 0) m *= 1 + 0.2 * work;
  if (hasTrait(player.traits, 'youngGun')) m *= 1.3;
  return m;
}

/** Injury multiplier: injuredWeeks>0 → 0.3 else 1.0. */
export function injuryMult(player: Player): number {
  return player.injuredWeeks > 0 ? 0.3 : 1.0;
}

const clamp = (n: number): number => Math.max(STAT_FLOOR, Math.min(STAT_MAX, n));

/**
 * The career spends level points by focus as soon as they are earned.
 * The persona harness sets `manual` so a playtester can spend those points
 * itself; every real career leaves this unset and keeps the automatic spend.
 */
let spendMode: 'auto' | 'manual' = 'auto';
export function setSpendMode(mode: 'auto' | 'manual'): void {
  spendMode = mode;
}
function spendIfAuto(player: Player, focus: TrainingFocus): Player {
  return spendMode === 'manual' ? player : spendByFocus(player, focus);
}

// ── The squad's training focus (N11) ─────────────────────────────────────────
// What the coach sets on the Squad screen, its labels, and the managed manager's
// pick (the squad's weakest stat). Focus controls point spending, never XP.

export const TRAINING_FOCI: readonly TrainingFocus[] = ['balanced', 'speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'];

const LABEL: Readonly<Record<TrainingFocus, string>> = {
  balanced: 'Balanced', speed: 'Speed', strength: 'Strength', stamina: 'Stamina', handling: 'Handling', kicking: 'Kicking', get footyIQ() { return activePack().vocab.iqStat; },
};

export function focusLabel(f: TrainingFocus): string {
  return LABEL[f];
}

export function isTrainingFocus(v: unknown): v is TrainingFocus {
  return TRAINING_FOCI.includes(v as TrainingFocus);
}

/** The coach sets the squad's focus. */
export function setTrainingFocus(focus: TrainingFocus): void {
  if (getState().training?.focus === focus) return;
  setState({ training: { focus } });
}

/** The squad's weakest stat on average (ties to the first in TRAINING_FOCI order): what a manager short on that would train. */
export function weakestStat(squad: readonly Player[]): keyof PlayerStats {
  const keys = TRAINING_FOCI.filter((f): f is keyof PlayerStats => f !== 'balanced');
  if (squad.length === 0) return keys[0]!;
  const mean = (k: keyof PlayerStats): number => squad.reduce((a, p) => a + p.stats[k], 0) / squad.length;
  return keys.reduce((a, b) => (mean(b) < mean(a) ? b : a));
}

/** Award XP and bank level points, without spending or changing stats. No RNG. */
export function awardXp(player: Player, baseXp: number, facilities: readonly PlacedFacility[] = []): Player {
  let xp = (player.xp ?? 0) + Math.max(0, baseXp) * ageMod(player.age) * traitMult(player) * facilityXpMultiplier(facilities);
  const levels = Math.floor(xp / PROGRESSION.XP_PER_LEVEL);
  xp -= levels * PROGRESSION.XP_PER_LEVEL;
  return { ...player, xp, level: (player.level ?? 1) + levels,
    unspentPoints: (player.unspentPoints ?? 0) + levels * PROGRESSION.POINTS_PER_LEVEL };
}

/** Reusable #540 “spend by focus” rule. Ties follow shown-stat order. */
export function spendByFocus(player: Player, focus: TrainingFocus = 'balanced'): Player {
  const stats = { ...player.stats };
  let points = player.unspentPoints ?? 0;
  const keys = shownStats(player.position);
  const room = (key: keyof PlayerStats): number => Math.max(0, (player.ceilings[key] ?? stats[key]) - stats[key]);
  while (points > 0) {
    const target = focus !== 'balanced' && keys.includes(focus) && room(focus) > 0
      ? focus : keys.reduce((a, b) => room(b) > room(a) ? b : a);
    if (room(target) <= 0) break;
    stats[target] = Math.min(player.ceilings[target]!, stats[target] + 1);
    points--;
  }
  return { ...player, stats, unspentPoints: points };
}

/** Existing veteran decline only; hidden stats remain fixed. No passive growth. */
export function trainPlayer(player: Player, _facilities: PlacedFacility[] = [], _focus: TrainingFocus = 'balanced'): PlayerStats {
  const next = { ...player.stats };
  for (const key of shownStats(player.position)) {
    next[key] = Math.min(player.ceilings[key] ?? STAT_MAX, clamp(next[key]));
    if (player.age >= 31 && (key === 'speed' || key === 'stamina')) next[key] = clamp(next[key] - VETERAN_DECLINE);
  }
  return next;
}

/** A small weekly XP trickle even without buildings; injury still slows training. */
export function trainWeek(player: Player, facilities: PlacedFacility[], focus: TrainingFocus = 'balanced'): Player {
  const declined = { ...player, stats: trainPlayer(player) };
  return spendIfAuto(awardXp(declined, PROGRESSION.WEEKLY_XP * injuryMult(player), facilities), focus);
}

/** Match XP uses the sheets and recorded moments, never the simulation RNG. */
export function applyMatchXp(squad: readonly Player[], own: TeamSheet, result: MatchResult,
  homeId: string, awayId: string, facilities: PlacedFacility[], focus: TrainingFocus = 'balanced'): Player[] {
  const starters = new Set((own.roster ?? []).map(p => p.id));
  const bench = new Set((own.bench ?? []).map(p => p.id));
  const moments = foldEvents(result.events, own.clubId);
  const potm = playerOfTheMatch(result, homeId, awayId);
  return squad.map(p => {
    if (!starters.has(p.id) && !bench.has(p.id)) return p;
    const tally = moments.get(p.name);
    const xp = (starters.has(p.id) ? PROGRESSION.STARTER_XP : PROGRESSION.BENCH_XP)
      + (tally?.tries ?? 0) * PROGRESSION.TRY_XP + (tally?.lineBreaks ?? 0) * PROGRESSION.LINE_BREAK_XP
      + (potm && potm.teamId === own.clubId && potm.name === p.name ? PROGRESSION.POTM_XP : 0);
    return spendIfAuto(awardXp(p, xp, facilities), focus);
  });
}

/** Weekly hook (10), before injury recovery (20). */
export function applyTraining(state: GameState): GameState {
  const squad = state.squad.map(p => trainWeek(p, state.facilities, state.training?.focus ?? 'balanced'));
  setState({ squad });
  return getState();
}

/**
 * Tick hook order 20: decrement injuredWeeks for injured players.
 * Base recovery = 1 week/tick. A built medicalBay adds its `level` extra weeks;
 * a built physioCentre adds 1 extra. Deterministic (no RNG).
 * injuredWeeks = max(0, injuredWeeks − recovery).
 */
export function applyInjuries(state: GameState): GameState {
  const medicalBay = state.facilities.find((f) => f.defId === 'medicalBay');
  const physio = state.facilities.find((f) => f.defId === 'physioCentre');
  let recovery = 1;
  if (medicalBay) recovery += medicalBay.level;
  if (physio) recovery += 1;

  let changed = false;
  const squad = state.squad.map((p) => {
    if (p.injuredWeeks <= 0) return p;
    changed = true;
    return { ...p, injuredWeeks: Math.max(0, p.injuredWeeks - recovery) };
  });
  if (changed) setState({ squad });
  return getState();
}

/**
 * Install the training-system tick hooks (order 10 + 20). Called explicitly by
 * the orchestrator (main.ts) — importing this module has no side effects.
 * Hooks read/write the live store via getState/setState.
 */
export function registerTrainingSystem(): void {
  registerTickHook('training', TICK_ORDER.training, () => {
    applyTraining(getState());
  }, { trials: true });
  registerTickHook('injuries', TICK_ORDER.injuries, () => {
    applyInjuries(getState());
  }, { trials: true });
}
