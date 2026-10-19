// src/match/league/calls.ts — coach calls during the match (#73, spec
// docs/specs/coach-calls.md). A call is a nudge on top of the side's presets,
// not a joystick: it changes the odds of the next play or set and the players
// still decide with their stats. One call a set each way: one while his side
// has the ball, one while it defends. Pure: live.ts applies them.
import type { AttackPlan, DefencePreset } from './presets';

export type CoachCall =
  | 'hit-up' | 'shift-left' | 'shift-right' // attack, the next play
  | 'kick-early' | 'run-it' | 'bomb' | 'field-goal' // attack, this set's kick
  | 'rush' | 'hold'; // defence, the next set

export const COACH_CALLS: readonly CoachCall[] = ['hit-up', 'shift-left', 'shift-right', 'kick-early', 'run-it', 'bomb', 'field-goal', 'rush', 'hold'];

export function isCoachCall(v: unknown): v is CoachCall {
  return COACH_CALLS.includes(v as CoachCall);
}

/** A call made at a tick: a match is { seed, sheets, calls[] }. */
export interface CallInput {
  tick: number;
  side: 'home' | 'away';
  call: CoachCall;
}

/** The call knobs (tuning reference §20). Overridable by name in balance experiments (tuning.ts). */
export const CALLS = {
  /** Hit-up: the forwards take it (hit-up preference +), fewer passes and steps, half the offloads. */
  hitUp: { hitUps: 2, pass: -0.3, step: 0.3, offload: 0.5 },
  /** Shift: width, cut-outs and the edges, and a receiver on the called side preferred by this much. */
  shift: { width: 0.4, cutOut: 0.25, edges: 1, sidePrefer: 2 },
  /** Kick early: on tackles 3–4 (this many done, before the last). */
  kickEarlyFrom: 2,
  /** Run it / Bomb: from tackle 4 (this many done). */
  lastFrom: 3,
};

/** Which way a call faces: attack calls while his side has the ball, defence calls while it defends. */
export function callIsDefence(c: CoachCall): boolean {
  return c === 'rush' || c === 'hold';
}

/** Scope: a play (until the next tackle) or the set. */
export function callIsPlay(c: CoachCall): boolean {
  return c === 'hit-up' || c === 'shift-left' || c === 'shift-right';
}

/** The defence a defensive call sets for the set. */
export function callDefence(c: CoachCall): DefencePreset | null {
  return c === 'rush' ? 'rush' : c === 'hold' ? 'compressed' : null;
}

/** The attack plan with a play call on top. */
export function withAttackCall(plan: AttackPlan, c: CoachCall | null): AttackPlan {
  if (c === 'hit-up') {
    return { ...plan, hitUps: plan.hitUps + CALLS.hitUp.hitUps, pass: plan.pass + CALLS.hitUp.pass, step: Math.min(plan.step, CALLS.hitUp.step), offload: plan.offload * CALLS.hitUp.offload };
  }
  if (c === 'shift-left' || c === 'shift-right') {
    return { ...plan, width: plan.width + CALLS.shift.width, cutOut: plan.cutOut + CALLS.shift.cutOut, edges: plan.edges + CALLS.shift.edges };
  }
  return plan;
}

/**
 * How a coach's chip shows on the match screen (#73 §4): only the calls that make
 * sense now — attack calls while his side has the ball (a late-set kick once it is
 * allowed), Rush and Hold while it defends; once a call is made this set, only its
 * chip, lit, until the set ends. `why` is the sim's refusal for the call now.
 */
export function chipState(call: CoachCall, why: string | null, attacking: boolean, made: CoachCall | null): { show: boolean; enabled: boolean; lit: boolean } {
  if (made) return { show: call === made, enabled: false, lit: call === made };
  const role = callIsDefence(call) ? !attacking : attacking;
  const notYet = why === 'tackles 3–4' || why === 'late in the set' || why === 'not in range';
  return { show: role && !notYet, enabled: why === null, lit: false };
}

/** What the call is called on screen and in the commentary. */
export const CALL_LABEL: Readonly<Record<CoachCall, string>> = {
  'hit-up': 'Hit-up',
  'shift-left': 'Shift left',
  'shift-right': 'Shift right',
  'kick-early': 'Kick early',
  'run-it': 'Run it',
  bomb: 'Bomb',
  'field-goal': 'Field goal',
  rush: 'Rush',
  hold: 'Hold',
};
