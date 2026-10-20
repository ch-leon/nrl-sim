// src/match/league/calls.ts — coach calls during the match (#73, spec
// docs/specs/coach-calls.md). A call is a nudge on top of the side's presets,
// not a joystick: it changes the odds of the next play or set and the players
// still decide with their stats. One call a set each way: one while his side
// has the ball, one while it defends. Pure: live.ts applies them.
import type { Side, SimEvent } from '../core/snapshot';
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
  /** When a call paid off (spec §3, last column), in metres: a hit-up's carry, a shift's play, a kick's gain, the most a rushed or held set may make. */
  paid: { hitUpM: 3, shiftM: 8, kickM: 30, rushM: 8, holdM: 15 },
  /**
   * The AI coach (N9.6, spec §6): rules, no dice. `on` 0 = no AI calls (the default, so a
   * match with no calls plays as runMatch). A field goal when one is on; a shift toward an
   * overlap of this many men (attackers less defenders on that side of the ball); Rush when
   * defending within this many metres of their own line.
   */
  ai: { on: 0, overlap: 2, rushOwnM: 20 },
  /**
   * Calls the player's chips offer by Coach's Office level (N9.6): with none built, these;
   * each level adds its own. Index = level (0–3).
   */
  unlocks: [['hit-up', 'hold'], ['shift-left', 'shift-right', 'rush'], ['kick-early', 'run-it'], ['bomb', 'field-goal']] as CoachCall[][],
};

/** The sides with an AI coach (N9.6): the rivals' (not the player's) when `calls.ai.on`, else none. */
export function aiCoachSides(sides: readonly ('home' | 'away')[]): ('home' | 'away')[] {
  return CALLS.ai.on > 0 ? [...sides] : [];
}

/** The calls a coach has with a Coach's Office at this level (0 = none built). */
export function unlockedCalls(level: number): CoachCall[] {
  return CALLS.unlocks.slice(0, Math.max(0, Math.min(CALLS.unlocks.length - 1, Math.floor(level))) + 1).flat();
}

/** The Coach's Office level that unlocks a call. */
export function unlockLevel(call: CoachCall): number {
  return Math.max(0, CALLS.unlocks.findIndex((tier) => tier.includes(call)));
}

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

/** A call that paid off or didn't, when its judge decides. */
export interface CallVerdict {
  side: Side;
  call: CoachCall;
  paid: boolean;
}

/** A call being judged: the side the ball was with when it was made, which way they attack, where the ball was, the furthest tackle since, and for a kick call whether it has gone. */
interface Watch {
  side: Side;
  call: CoachCall;
  atk: Side;
  dir: 1 | -1;
  fromX: number;
  bestM: number;
  /** Tackles since the call: a rushed or held set the other side never ran lapses. */
  plays: number;
  kicked: boolean;
  /** Set ends left for a kick that has gone to come good (a dead ball and the drop-out after it). */
  setsLeft: number;
}

const TURNOVER_BY_DEFENCE = new Set(['intercept', 'strip']);
const TURNOVER_BY_ATTACK = new Set(['error', 'drop', 'loose']);

/**
 * Judges each call by spec §3's "paid off when" (CALLS.paid): the live sim
 * tells it when a call is made, hands it each tick's events with the ball's
 * position, a kick's gain when the other side takes it, and when a play (a
 * tackle) or a set ends. Pure bookkeeping, no dice: the match plays the same.
 * A rule needing what the sim doesn't measure is approximated: a hit-up or
 * shift by the ground its play made, a rushed or held set by its furthest tackle.
 */
export class CallJudge {
  readonly made: Record<Side, number> = { home: 0, away: 0 };
  readonly paid: Record<Side, number> = { home: 0, away: 0 };
  private open: Watch[] = [];

  /** A call is made by `side` while `atk` has the ball going `dir`, the ball at x. */
  make(side: Side, call: CoachCall, atk: Side, dir: 1 | -1, x: number): void {
    this.made[side]++;
    this.open.push({ side, call, atk, dir, fromX: x, bestM: 0, plays: 0, kicked: false, setsLeft: 2 });
  }

  /** `side`'s kick in play was taken by the other side `gainM` metres on from where it was kicked. */
  kicked(side: Side, gainM: number): CallVerdict[] {
    return this.settle((w) => (w.kicked && w.side === side && (w.call === 'kick-early' || w.call === 'bomb') ? gainM >= CALLS.paid.kickM : null));
  }

  /** The end of a tick: its events, the ball's x (the tackle's spot when a play has ended), and whether a play (a tackle in the set) and the set have ended. */
  observe(events: readonly SimEvent[], x: number, playEnded: boolean, setEnded: boolean): CallVerdict[] {
    const out: CallVerdict[] = [];
    for (const e of events) out.push(...this.settle((w) => this.onEvent(w, e)));
    if (playEnded) {
      for (const w of this.open) {
        w.bestM = Math.max(w.bestM, (x - w.fromX) * w.dir);
        w.plays++;
      }
    }
    if (playEnded && !setEnded) {
      out.push(...this.settle((w) => (w.call === 'hit-up' ? w.bestM >= CALLS.paid.hitUpM : w.call === 'shift-left' || w.call === 'shift-right' ? w.bestM >= CALLS.paid.shiftM : null)));
    }
    if (setEnded) out.push(...this.settle((w) => this.onSetEnd(w)));
    return out;
  }

  private onEvent(w: Watch, e: SimEvent): boolean | null {
    const by = e.side;
    if (by === undefined) return null;
    const theirs = by !== w.atk;
    if (e.kind === 'try') return by === w.atk ? !callIsDefence(w.call) : callIsDefence(w.call) ? false : w.kicked ? false : null;
    switch (w.call) {
      case 'rush':
      case 'hold':
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? true : null;
      case 'hit-up':
      case 'shift-left':
      case 'shift-right':
        if (e.kind === 'line-break' && !theirs) return w.call !== 'hit-up' || null;
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? false : null;
      case 'run-it':
        return e.kind === 'penalty' && theirs ? true : null;
      case 'field-goal':
        return e.kind === 'field-goal' && !theirs ? e.detail === 'good' : null;
      case 'kick-early':
      case 'bomb':
        if (!w.kicked) {
          if (e.kind === 'kick' && !theirs) w.kicked = true;
          return null;
        }
        if ((e.kind === 'regather' || e.kind === '40-20') && !theirs) return true;
        if ((e.kind === 'drop' || e.kind === 'drop-out') && theirs) return true;
        return null;
      default:
        return null;
    }
  }

  private onSetEnd(w: Watch): boolean | null {
    switch (w.call) {
      case 'rush':
        return w.plays > 0 && w.bestM < CALLS.paid.rushM;
      case 'hold':
        return w.plays > 0 && w.bestM < CALLS.paid.holdM;
      case 'kick-early':
      case 'bomb':
        if (!w.kicked) return false;
        return --w.setsLeft <= 0 ? false : null;
      default:
        // A play call whose play ended with the set (tackled on the last), run it, a field goal not taken.
        return w.call === 'hit-up' ? w.bestM >= CALLS.paid.hitUpM : w.call === 'shift-left' || w.call === 'shift-right' ? w.bestM >= CALLS.paid.shiftM : false;
    }
  }

  /** Close every open call the rule decides (true paid, false not); leave the rest open. */
  private settle(rule: (w: Watch) => boolean | null): CallVerdict[] {
    const out: CallVerdict[] = [];
    this.open = this.open.filter((w) => {
      const v = rule(w);
      if (v === null) return true;
      if (v) this.paid[w.side]++;
      out.push({ side: w.side, call: w.call, paid: v });
      return false;
    });
    return out;
  }
}

/** The commentary line for a call that paid off. */
export function paidOffText(team: string, c: CoachCall): string {
  return `${CALL_LABEL[c]} pays off for ${team}`;
}
