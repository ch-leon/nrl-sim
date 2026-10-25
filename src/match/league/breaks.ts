// src/match/league/breaks.ts — a side's plan changes at the breaks (N13.5, #316).
//
// A pure rule. The sim calls it at half-time and after a try, for the sides
// that were given it, and takes the plan it returns from the next restart.
// No dice: with no side named, a match is the match it was. The thresholds
// are knobs (`breaks.*`). Which rival gets the rule is the club's (N14).
import type { Side } from '../core/snapshot';
import type { AttackPreset, DefencePreset, TeamTactics } from './presets';

/**
 * The rule's thresholds (tuning reference §30). Assumed (needs Leon).
 * A Nines match is 2 × 7:00. Minute 12 is the last two minutes: the same
 * share as minute 15 of the old 2 × 9:00 (15 × 7/9 ≈ 11.7, rounded).
 */
export const BREAKS = {
  /** Points behind at half-time: one step more open. */
  downBy: 8,
  /** Tries conceded in a row, at a break: one step more open. */
  concededRun: 2,
  /** Points ahead after `tightenFromMinute`: one step tighter. */
  upBy: 12,
  /** Match minute from which a lead tightens the plan. Was 15 of an 18-minute match. */
  tightenFromMinute: 12,
};

/** What the sim tells the rule. `concededInARow` counts the try just scored. */
export interface BreakFacts {
  score: Readonly<Record<Side, number>>;
  /** Minutes on the match clock, from the kick-off. */
  minute: number;
  plan: TeamTactics;
  side: Side;
  /** Half-time, or the break after a try (not a penalty goal or a field goal). */
  at: 'half-time' | 'try';
  /** Tries the other side has scored without this side scoring in between. */
  concededInARow: number;
}

/** Null keeps the plan. A returned plan is in force from the next restart. */
export type BreakRule = (facts: BreakFacts) => TeamTactics | null;

/** A plan change the restart actually played, for the match report. */
export interface PlanChange {
  minute: number;
  side: Side;
  attack: AttackPreset;
  defence: DefencePreset;
  at: 'half-time' | 'try' | 'kickoff';
}

/** Tight to open. Kick-chase sits off this line (see stepAttack). */
const ATTACK_OPEN: readonly AttackPreset[] = ['grind', 'balanced', 'expansive', 'all-out'];
/** Tight to open. Assumed: Compressed is the tight end, Rush the open end. */
const DEFENCE_OPEN: readonly DefencePreset[] = ['compressed', 'slide', 'rush'];

/**
 * One step along the plan. `dir` 1 opens, −1 tightens.
 * Kick-chase is not on the attack line. Assumed (needs Leon): opening it
 * goes to Expansive, tightening it goes to Grind.
 */
export function stepPlan(plan: TeamTactics, dir: 1 | -1): TeamTactics {
  return { attack: stepAttack(plan.attack, dir), defence: stepDefence(plan.defence, dir) };
}

function stepAttack(p: AttackPreset, dir: 1 | -1): AttackPreset {
  if (p === 'kick-chase') return dir > 0 ? 'expansive' : 'grind';
  const i = ATTACK_OPEN.indexOf(p);
  return ATTACK_OPEN[clamp(i + dir, ATTACK_OPEN.length - 1)]!;
}

function stepDefence(p: DefencePreset, dir: 1 | -1): DefencePreset {
  const i = DEFENCE_OPEN.indexOf(p);
  return DEFENCE_OPEN[clamp(i + dir, DEFENCE_OPEN.length - 1)]!;
}

function clamp(i: number, max: number): number {
  return Math.min(max, Math.max(0, i));
}

/** The plan a side would play when it goes more open (what an analyst can say before the match). */
export function planWhenBehind(plan: TeamTactics): TeamTactics {
  return stepPlan(plan, 1);
}

/**
 * The default rule. Opens when 8 or more down at half-time, or after two
 * tries conceded in a row. Tightens when 12 or more up at a break after the
 * 12th minute. A side that has just shipped two tries opens even if it is
 * still in front. Otherwise the plan stays. Assumed (needs Leon): the
 * thresholds, Kick-chase's neighbours, and that a try-run beats the late lead.
 */
export function defaultBreakRule(facts: BreakFacts): TeamTactics | null {
  const margin = facts.score[facts.side] - facts.score[facts.side === 'home' ? 'away' : 'home'];
  const behind = facts.at === 'half-time' && margin <= -BREAKS.downBy;
  const run = facts.concededInARow >= BREAKS.concededRun;
  const ahead = facts.minute >= BREAKS.tightenFromMinute && margin >= BREAKS.upBy;
  const dir: 1 | -1 | 0 = behind || run ? 1 : ahead ? -1 : 0;
  if (dir === 0) return null;
  const next = stepPlan(facts.plan, dir);
  if (next.attack === facts.plan.attack && next.defence === facts.plan.defence) return null;
  return next;
}
