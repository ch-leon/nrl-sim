// src/match/league/calls.ts — coach calls during the match (#73, spec
// docs/specs/coach-calls.md). A call is a nudge on top of the side's presets,
// not a joystick: it changes the odds of the next play or set and the players
// still decide with their stats. One call a set each way: one while his side
// has the ball, one while it defends; Fresh legs (#367), a bench call, any time
// once a half; Take the two / Tap and go (#396), once a penalty won. Pure:
// live.ts applies them.
import type { Side, SimEvent } from '../core/snapshot';
import type { AttackPlan, DefencePlan, DefencePreset } from './presets';

export type CoachCall =
  | 'hit-up' | 'shift-left' | 'shift-right' // attack, the next play
  | 'offload' // attack, the next two plays (#396)
  | 'kick-early' | 'run-it' | 'bomb' | 'field-goal' // attack, this set's kick
  | 'grubber' | 'forty-twenty' // attack, this set's last-tackle kick (#396)
  | 'rush' | 'hold' // defence, the next set
  | 'gang-tackle' // defence, the next two tackles (#396)
  | 'take-two' | 'tap-go' // a penalty won (#396): the captain's choice overruled
  | 'fresh-legs'; // the bench (#367): either way, once a half

export const COACH_CALLS: readonly CoachCall[] = [
  'hit-up', 'shift-left', 'shift-right', 'kick-early', 'run-it', 'bomb', 'field-goal', 'rush', 'hold', 'fresh-legs',
  'offload', 'gang-tackle', 'grubber', 'take-two', 'tap-go', 'forty-twenty',
];

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
  /** When a call paid off (spec §3, last column), in metres: a hit-up's carry, a shift's play, a kick's gain, the most a rushed or held set may make, the most two gang tackles may give up (#396). */
  paid: { hitUpM: 3, shiftM: 8, kickM: 30, rushM: 8, holdM: 15, gangM: 10 },
  /**
   * The AI coach (N9.6, spec §6): rules, no dice. `on` 0 = no AI calls (the default, so a
   * match with no calls plays as runMatch). A field goal when one is on; a shift toward an
   * overlap of this many men (attackers less defenders on that side of the ball); Rush when
   * defending within this many metres of their own line.
   */
  ai: { on: 0, overlap: 2, rushOwnM: 20 },
  /**
   * Fresh legs (#367): on offer while a man on the field has legs under `offBelow`
   * and an uninjured bench man has at least `onAtLeast`; `perHalf` calls a side a
   * half (0 = never). The AI coach never makes it.
   */
  freshLegs: { offBelow: 0.4, onAtLeast: 0.4, perHalf: 1 },
  /**
   * Offload (#396): for the next `plays` carries the offload odds go up as an attack plan's
   * `offload` of at least 1 plus this (about +6 points on a 12% contest), and an offload is
   * spilled `spill` more often. Made on tackles 1–4 (fewer than `beforeTackle` done).
   */
  offload: { offload: 0.5, spill: 0.04, plays: 2, beforeTackle: 4 },
  /**
   * Gang tackle (#396): for the next `tackles` tackles one more defender commits to the
   * carrier and the ruck is `downTicks` slower to clear; with a man more in the tackle the
   * edges are thin, so a carrier one-on-one out there steps his man this much more often.
   */
  gang: { commit: 1, downTicks: 6, stepAgainst: 0.2, tackles: 2 },
  /** Grubber (#396): from tackle 4 (`lastFrom`), with the ball this close to their line (m). */
  grubberInsideM: 25,
  /** 40/20 (#396): from tackle 4, with the ball at least this far from their line (behind his own 40). */
  fortyTwentyFromM: 60,
  /**
   * …and the kick goes no further than this (× Big Boot distance), a little past a touch-finder's 32 m, so
   * from deep it is a kick for touch that can't reach their 20; it is scattered this much (× the kicker's
   * accuracy; the sim's own 40/20 attempt is 0.6).
   */
  fortyTwenty: { reachM: 35, scatter: 0.6 },
  /** Take the two / Tap and go (#396): offered on a penalty won with the shot at goal at least this likely. */
  penaltyShotMin: 0.35,
  /**
   * Calls the player's chips offer by Coach's Office level (N9.6): with none built, these;
   * each level adds its own. Index = level (0–3). #396 added Offload and Gang tackle at 1,
   * Grubber and the penalty pair at 2, 40/20 at 3.
   */
  unlocks: [
    ['hit-up', 'hold', 'fresh-legs'],
    ['shift-left', 'shift-right', 'rush', 'offload', 'gang-tackle'],
    ['kick-early', 'run-it', 'grubber', 'take-two', 'tap-go'],
    ['bomb', 'field-goal', 'forty-twenty'],
  ] as CoachCall[][],
};

/** The sides with an AI coach (N9.6): the rivals' (not the player's) when `calls.ai.on`, else none. */
/**
 * The sides that get an AI coach. The global knob (`calls.ai.on`) is the
 * default, off since N9.6. A caller can force it: Hard's rivals pass true
 * and Normal and Easy pass false (N14.1), so the knob stays off for the
 * harness and for every difficulty that was not asked.
 */
export function aiCoachSides(sides: readonly ('home' | 'away')[], on = CALLS.ai.on > 0): ('home' | 'away')[] {
  return on ? [...sides] : [];
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
  return c === 'rush' || c === 'hold' || c === 'gang-tackle';
}

/** A bench call (#367): neither attack nor defence, made with or without the ball, and it uses up neither of the set's calls. */
export function callIsBench(c: CoachCall): boolean {
  return c === 'fresh-legs';
}

/** A penalty call (#396): made on a penalty won, it uses up neither of the set's calls. */
export function callIsPenalty(c: CoachCall): boolean {
  return c === 'take-two' || c === 'tap-go';
}

/** The penalty choice a penalty call makes (#396): a shot at goal, or a tap. */
export function penaltyChoiceOf(c: CoachCall): 'goal' | 'tap' {
  return c === 'take-two' ? 'goal' : 'tap';
}

/** Scope: a play (until the next tackle; Offload the next two) or the set. */
export function callIsPlay(c: CoachCall): boolean {
  return c === 'hit-up' || c === 'shift-left' || c === 'shift-right' || c === 'offload';
}

/** How many tackles a play call (#396: Offload) or a defence call (Gang tackle) lasts; 0 = the set. */
export function callScope(c: CoachCall): number {
  if (c === 'offload') return CALLS.offload.plays;
  if (c === 'gang-tackle') return CALLS.gang.tackles;
  return callIsPlay(c) ? 1 : 0;
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
  // Offload (#396): look for it, even in a plan that tucks it (offload 0) — support is read again.
  if (c === 'offload') return { ...plan, offload: Math.max(plan.offload, 1) + CALLS.offload.offload };
  return plan;
}

/** The defence plan with Gang tackle on top (#396): one more man in, and easier to step out wide. Any other call leaves the plan as it is. */
export function withDefenceCall(plan: DefencePlan, c: CoachCall | null): DefencePlan {
  if (c !== 'gang-tackle') return plan;
  return { ...plan, commit: plan.commit + CALLS.gang.commit, stepAgainst: plan.stepAgainst + CALLS.gang.stepAgainst };
}

/**
 * How a coach's chip shows on the match screen (#73 §4): only the calls that make
 * sense now — attack calls while his side has the ball (a late-set kick once it is
 * allowed), Rush and Hold while it defends; once a call is made this set, only its
 * chip, lit, until the set ends. `why` is the sim's refusal for the call now.
 * Fresh legs (#367) always shows, either way, lit while its swap is `pending`;
 * a call made this set doesn't hide it.
 */
export function chipState(call: CoachCall, why: string | null, attacking: boolean, made: CoachCall | null, pending = false): { show: boolean; enabled: boolean; lit: boolean } {
  if (callIsBench(call)) return { show: true, enabled: why === null, lit: pending };
  // A penalty call (#396) shows only while it can be made, whatever the set's call.
  if (callIsPenalty(call)) return { show: why === null, enabled: why === null, lit: false };
  if (made) return { show: call === made, enabled: false, lit: call === made };
  const role = callIsDefence(call) ? !attacking : attacking;
  const notYet = why === 'tackles 3–4' || why === 'late in the set' || why === 'not in range' || why === 'not inside their 25' || why === 'not behind your 40' || why === 'out of reach of their 20';
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
  'fresh-legs': 'Fresh legs',
  offload: 'Offload',
  'gang-tackle': 'Gang tackle',
  grubber: 'Grubber',
  'forty-twenty': '40/20',
  'take-two': 'Take the two',
  'tap-go': 'Tap and go',
};

/** How long a call's result shows by the chips (#366), in real ms. A new result replaces the one up. */
export const CALL_RESULT_MS = 2000;

/** "+18m", or null for no ground. */
const gain = (m: number): string | null => (m > 0 ? `+${m}m` : null);

/** An attack play (hit-up, shift): its ground, a break, a try, or the ball lost. */
const playResult = (v: CallVerdict): string => {
  if (v.how === 'try') return v.paid ? 'try!' : 'try against';
  if (v.how === 'line-break') return 'line break!';
  if (v.how === 'intercept') return 'intercepted';
  if (v.how === 'strip') return 'ball stripped';
  if (v.how === 'error' || v.how === 'drop' || v.how === 'loose') return 'lost the ball';
  return gain(v.metres) ?? 'no gain';
};

/** A kick call (kick early, bomb): what came of the kick. */
const kickResult = (v: CallVerdict): string => {
  if (v.how === 'regather') return 'regathered';
  if (v.how === '40-20') return '40/20!';
  if (v.how === 'drop') return 'forced an error';
  if (v.how === 'drop-out') return 'won a drop-out';
  if (v.how === 'try') return v.paid ? 'try!' : 'try against';
  // Taken by the other side: the kick's gain. A set that ran out with no kick, or a kick that came to nothing, gained nothing.
  return v.how === 'kick' ? gain(v.metres) ?? 'no gain' : 'no gain';
};

/** A last-tackle kick call (#396: grubber, 40/20): a repeat set, the ball kept, or lost to them. */
const lastKickResult = (v: CallVerdict): string => {
  if (v.how === '40-20') return 'found touch';
  if (v.how === 'regather') return 'regathered';
  if (v.how === 'drop-out') return 'repeat set';
  if (v.how === 'drop') return 'forced an error';
  if (v.how === 'try') return v.paid ? 'try!' : 'try against';
  return v.how === 'no-kick' ? 'no kick' : 'missed, their ball';
};

/** 40/20 (#396): touch for the 40/20, or not; a kick kept or won back some other way is still a miss. */
const fortyTwentyResult = (v: CallVerdict): string => {
  if (v.how === '40-20') return 'found touch';
  if (v.how === 'try') return v.paid ? 'try!' : 'try against';
  if (v.how === 'no-kick') return 'no kick';
  return v.how === 'regather' || v.how === 'drop' || v.how === 'drop-out' ? 'no 40/20' : 'missed, their ball';
};

/** Gang tackle (#396): a defence call's result, in fewer words (its name is long). */
const gangResult = (v: CallVerdict): string => {
  const r = defenceResult(v);
  return r.replace('held them to', 'held to');
};

/** A defence call (rush, hold): the ball won, an error forced, or the ground the set made. */
const defenceResult = (v: CallVerdict): string => {
  if (v.how === 'intercept' || v.how === 'strip') return 'won the ball';
  if (v.how === 'error' || v.how === 'drop' || v.how === 'loose') return 'forced an error';
  if (v.how === 'try') return 'try against';
  if (v.paid) return v.metres > 0 ? `held them to +${v.metres}m` : 'held them';
  return gain(v.metres) ? `they made +${v.metres}m` : 'no reward';
};

/**
 * What a call did, for the tag by the chips (#366): "Shift left +18m", "Hit-up +6m",
 * "Bomb: regathered", "Rush: forced an error", "Kick early: no gain". The judge's
 * verdict says how it was decided; this only words it.
 */
export const CALL_RESULT: Readonly<Record<CoachCall, (v: CallVerdict) => string>> = {
  'hit-up': (v) => joinResult('hit-up', playResult(v)),
  'shift-left': (v) => joinResult('shift-left', playResult(v)),
  'shift-right': (v) => joinResult('shift-right', playResult(v)),
  'kick-early': (v) => joinResult('kick-early', kickResult(v)),
  bomb: (v) => joinResult('bomb', kickResult(v)),
  'run-it': (v) => joinResult('run-it', v.how === 'penalty' ? 'won a penalty' : v.how === 'try' ? (v.paid ? 'try!' : 'try against') : gain(v.metres) ?? 'no gain'),
  'field-goal': (v) => joinResult('field-goal', v.how === 'field-goal' ? (v.paid ? 'over!' : 'missed') : v.how === 'try' && !v.paid ? 'try against' : 'not taken'),
  rush: (v) => joinResult('rush', defenceResult(v)),
  hold: (v) => joinResult('hold', defenceResult(v)),
  'fresh-legs': (v) => joinResult('fresh-legs', v.note ?? (v.paid ? 'swapped' : 'no swap')),
  offload: (v) => joinResult('offload', v.how === 'offload' ? 'got it away' : v.how === 'gain' || v.how === 'set-end' ? 'no offload' : playResult(v)),
  'gang-tackle': (v) => joinResult('gang-tackle', gangResult(v)),
  grubber: (v) => joinResult('grubber', lastKickResult(v)),
  'forty-twenty': (v) => joinResult('forty-twenty', fortyTwentyResult(v)),
  'take-two': (v) => joinResult('take-two', v.how === 'penalty-goal' ? (v.paid ? 'over!' : 'missed') : 'not taken'),
  'tap-go': (v) => joinResult('tap-go', v.how === 'penalty' ? 'won a penalty' : v.how === 'try' ? (v.paid ? 'try!' : 'try against') : v.how === 'intercept' || v.how === 'strip' || v.how === 'error' || v.how === 'drop' || v.how === 'loose' ? 'lost the ball' : gain(v.metres) ? `no try, +${v.metres}m` : 'no try'),
};

/** "Shift left +18m" (a gain follows the name), "Bomb: regathered" (anything else after a colon). */
function joinResult(c: CoachCall, what: string): string {
  return what.startsWith('+') ? `${CALL_LABEL[c]} ${what}` : `${CALL_LABEL[c]}: ${what}`;
}

/** The tag's line for a verdict. */
export function callResultText(v: CallVerdict): string {
  return CALL_RESULT[v.call](v);
}

/**
 * What decided a call: the sim event that settled it ('line-break', 'intercept',
 * 'regather', 'field-goal'…), 'gain' for a play judged by its ground, 'kick' for a
 * kick the other side took, 'set-end' for a set that ran out (#366), or 'no-kick'
 * for a last-tackle kick call whose set ran out with no kick (#396).
 */
export type CallHow = 'gain' | 'kick' | 'set-end' | (string & {});

/** A call that paid off or didn't, when its judge decides. */
export interface CallVerdict {
  side: Side;
  call: CoachCall;
  paid: boolean;
  /** The ground it made, rounded (#366): the furthest tackle from where it was made, toward the side attacking then; a kick call's kick gain. */
  metres: number;
  how: CallHow;
  /** Fresh legs (#367): who came off and who went on, "Smith off, Jones on". */
  note?: string;
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
/** The kick calls the judge follows to the kick; the last two (#396) miss when the other side gets the ball off it. */
const KICK_CALLS = new Set<CoachCall>(['kick-early', 'bomb', 'grubber', 'forty-twenty']);
const LAST_KICK_CALLS = new Set<CoachCall>(['grubber', 'forty-twenty']);
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

  /** `side`'s kick in play was taken by the other side `gainM` metres on from where it was kicked (a grubber or 40/20 that did it has missed, #396). */
  kicked(side: Side, gainM: number): CallVerdict[] {
    return this.settle((w) => (w.kicked && w.side === side && KICK_CALLS.has(w.call) ? (LAST_KICK_CALLS.has(w.call) ? false : gainM >= CALLS.paid.kickM) : null), () => 'kick', gainM);
  }

  /** Fresh legs (#367): `side`'s bench call landed, `off` for `on`. Paid. */
  swapped(side: Side, off: string, on: string): CallVerdict[] {
    return this.settle((w) => (w.side === side && callIsBench(w.call) ? true : null), () => 'interchange', undefined, `${off} off, ${on} on`);
  }

  /** Fresh legs (#367): `side`'s bench call found nobody tired by the time it could land (his man went to the bin, or got his legs back). Not paid. */
  lapsed(side: Side): CallVerdict[] {
    return this.settle((w) => (w.side === side && callIsBench(w.call) ? false : null), () => 'lapsed', undefined, 'nobody tired');
  }

  /** The end of a tick: its events, the ball's x (the tackle's spot when a play has ended), and whether a play (a tackle in the set) and the set have ended. */
  observe(events: readonly SimEvent[], x: number, playEnded: boolean, setEnded: boolean): CallVerdict[] {
    const out: CallVerdict[] = [];
    for (const e of events) out.push(...this.settle((w) => this.onEvent(w, e), () => e.kind));
    if (playEnded) {
      for (const w of this.open) {
        w.bestM = Math.max(w.bestM, (x - w.fromX) * w.dir);
        w.plays++;
      }
    }
    if (playEnded && !setEnded) out.push(...this.settle((w) => this.onPlayEnd(w), () => 'gain'));
    if (setEnded) out.push(...this.settle((w) => this.onSetEnd(w), (w) => (callIsPlay(w.call) ? 'gain' : LAST_KICK_CALLS.has(w.call) && !w.kicked ? 'no-kick' : 'set-end')));
    return out;
  }

  /** A tackle in the set: a play call's play is over (Offload's two, #396), and Gang tackle's two tackles are made. */
  private onPlayEnd(w: Watch): boolean | null {
    if (w.call === 'hit-up') return w.bestM >= CALLS.paid.hitUpM;
    if (w.call === 'shift-left' || w.call === 'shift-right') return w.bestM >= CALLS.paid.shiftM;
    if (w.call === 'offload') return w.plays >= CALLS.offload.plays ? false : null;
    if (w.call === 'gang-tackle') return w.plays >= CALLS.gang.tackles ? w.bestM < CALLS.paid.gangM : null;
    return null;
  }

  private onEvent(w: Watch, e: SimEvent): boolean | null {
    const by = e.side;
    if (by === undefined) return null;
    // A bench call is settled only by its swap (swapped), never by the play.
    if (callIsBench(w.call)) return null;
    const theirs = by !== w.atk;
    if (e.kind === 'try') return by === w.atk ? !callIsDefence(w.call) : callIsDefence(w.call) ? false : w.kicked ? false : null;
    switch (w.call) {
      case 'rush':
      case 'hold':
      case 'gang-tackle':
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? true : null;
      case 'offload':
        // Got away (or the play broke the line): paid; the ball lost (a spilled offload too): not.
        if ((e.kind === 'offload' || e.kind === 'line-break') && !theirs) return true;
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? false : null;
      case 'take-two':
        return e.kind === 'penalty-goal' && !theirs ? e.detail === 'good' : null;
      case 'tap-go':
        if (e.kind === 'penalty' && theirs) return true;
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? false : null;
      case 'hit-up':
      case 'shift-left':
      case 'shift-right':
        if (e.kind === 'line-break' && !theirs) return w.call !== 'hit-up' || null;
        return (theirs && TURNOVER_BY_DEFENCE.has(e.kind)) || (!theirs && TURNOVER_BY_ATTACK.has(e.kind)) ? false : null;
      case 'run-it':
        return e.kind === 'penalty' && theirs ? true : null;
      case 'field-goal':
        return e.kind === 'field-goal' && !theirs ? e.detail === 'good' : null;
      case 'forty-twenty':
        // Only touch for the 40/20 pays (#396): a regather, a dropped ball or a drop-out off it is not what was called.
        if (!w.kicked) {
          if (e.kind === 'kick' && !theirs) w.kicked = true;
          return null;
        }
        if (e.kind === '40-20' && !theirs) return true;
        return (e.kind === 'regather' && !theirs) || ((e.kind === 'drop' || e.kind === 'drop-out') && theirs) ? false : null;
      case 'kick-early':
      case 'bomb':
      case 'grubber':
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
      case 'gang-tackle':
        return w.plays > 0 && w.bestM < CALLS.paid.gangM;
      case 'kick-early':
      case 'bomb':
      case 'grubber':
      case 'forty-twenty':
        if (!w.kicked) return false;
        return --w.setsLeft <= 0 ? false : null;
      case 'fresh-legs':
        return null;
      default:
        // A play call whose play ended with the set (tackled on the last), run it, a field goal not taken.
        return w.call === 'hit-up' ? w.bestM >= CALLS.paid.hitUpM : w.call === 'shift-left' || w.call === 'shift-right' ? w.bestM >= CALLS.paid.shiftM : false;
    }
  }

  /** Close every open call the rule decides (true paid, false not), with what decided it and its ground (a kick's gain when given); leave the rest open. */
  private settle(rule: (w: Watch) => boolean | null, how: (w: Watch) => CallHow, gainM?: number, note?: string): CallVerdict[] {
    const out: CallVerdict[] = [];
    this.open = this.open.filter((w) => {
      const v = rule(w);
      if (v === null) return true;
      if (v) this.paid[w.side]++;
      out.push({ side: w.side, call: w.call, paid: v, metres: Math.round(gainM ?? w.bestM), how: how(w), ...(note !== undefined ? { note } : {}) });
      return false;
    });
    return out;
  }
}

/** The commentary line for a call that paid off. */
export function paidOffText(team: string, c: CoachCall): string {
  return `${CALL_LABEL[c]} pays off for ${team}`;
}
