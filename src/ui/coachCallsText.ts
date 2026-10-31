// src/ui/coachCallsText.ts — what the coach calls are, which Coach's Office
// level unlocks each, and when each can be made, in words (the Coach calls page,
// the Build card, the Guide and the match's locked-calls hint). Every list comes
// from CALLS.unlocks and every number from the knobs the sim's callRefusal reads
// (CALLS, GOALS, SET_TACKLES, the 40/20's lines), so the words move with them.
// Pure: no DOM, no state.
import { CALLS, CALL_LABEL, callIsBench, callIsDefence, callIsKickoff, callIsPenalty, type CoachCall } from '../match/league/calls';
import { GOALS } from '../match/league/goals';
import { FIELD_LENGTH } from '../match/core/field';
import { FORTY_TWENTY_INTO_M } from '../match/league/touch';
import { SET_TACKLES } from '../config';

/** The top Coach's Office level (3): every call is unlocked there. */
export const TOP_OFFICE_LEVEL = CALLS.unlocks.length - 1;

/** A level as a whole number in 0–3 (a save's level is always one; a lab may pass anything). */
const clampLevel = (level: number): number => Math.max(0, Math.min(TOP_OFFICE_LEVEL, Math.floor(level)));

/** "No office needed", "Coach's Office 2": a level's name, as the tray's locked tag says it. */
export function officeLevelName(level: number): string {
  return level <= 0 ? 'No office needed' : `Coach's Office ${level}`;
}

/** "A, B and C". */
export function andList(names: readonly string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The calls' names in CALLS.unlocks order, the tray's labels (CALL_LABEL), with
 * Shift left and Shift right said once as "Shift" (the tray's one row) when both are there.
 */
export function callNames(calls: readonly CoachCall[]): string[] {
  const both = calls.includes('shift-left') && calls.includes('shift-right');
  return calls.flatMap((c) => (both && c === 'shift-right' ? [] : both && c === 'shift-left' ? ['Shift'] : [CALL_LABEL[c]]));
}

/** The level the club needs next and what it unlocks, or null at the top level. */
export function nextUnlock(level: number): { level: number; calls: CoachCall[] } | null {
  const next = clampLevel(level) + 1;
  return next > TOP_OFFICE_LEVEL ? null : { level: next, calls: [...CALLS.unlocks[next]!] };
}

/**
 * The Build card's and the Guide's line for the club's next Coach's Office level:
 * "Level 2 unlocks Kick early, Run it, Grubber, Take the two and Tap and go." At
 * the top level, that every call is unlocked.
 */
export function officeUnlockLine(level: number): string {
  const next = nextUnlock(level);
  return next ? `Level ${next.level} unlocks ${andList(callNames(next.calls))}.` : 'All coach calls are unlocked.';
}

/** The Coach's Office level whose calls are all in `unlocked` (what a match was given, N9.6). */
export function officeLevelOf(unlocked: readonly CoachCall[]): number {
  let level = -1;
  while (level < TOP_OFFICE_LEVEL && CALLS.unlocks[level + 1]!.every((c) => unlocked.includes(c))) level++;
  return Math.max(0, level);
}

/**
 * The match's one ticker line while calls are locked (N15.6): the next level and
 * what it unlocks, within `fit` characters (the ticker's TICKER_FIT_CHARS); names
 * that don't fit become "+2". Null once every call is unlocked.
 */
export function lockedCallsLine(level: number, fit: number): string | null {
  const next = nextUnlock(level);
  if (!next) return null;
  const head = next.level === 1 ? "Coach's Office unlocks " : `Coach's Office ${next.level} unlocks `;
  const names = callNames(next.calls);
  const full = `${head}${andList(names)}`;
  if (full.length <= fit) return full;
  for (let n = names.length; n >= 1; n--) {
    const line = `${head}${names.slice(0, n).join(', ')}${n < names.length ? ` +${names.length - n}` : ''}`;
    if (line.length <= fit) return line;
  }
  return `${head.trimEnd()} more calls`;
}

// ── The Coach calls page ─────────────────────────────────────────────────────

/** Which way a call faces, for its tag on the page. */
export type CallSide = 'With the ball' | 'Defending' | 'Either way';

export interface CallInfo {
  call: CoachCall;
  name: string;
  side: CallSide;
  /** What it does, one plain line. */
  does: string;
  /** When it can be made: "Tackles 1–4", "Inside their 25", "At your kick-offs". */
  when: string;
  /** True for the calls that don't use up the set's call (Fresh legs, the penalty pair, the kick-off pair). */
  free: boolean;
}

export interface CallGroup {
  level: number;
  title: string;
  unlocked: boolean;
  calls: CallInfo[];
}

export interface CoachCallsPage {
  level: number;
  /** "No Coach's Office yet" or "Coach's Office level 2". */
  levelLine: string;
  /** What the next level unlocks, or that every call is unlocked. */
  nextLine: string;
  unlockedCount: number;
  total: number;
  groups: CallGroup[];
  /** One attack and one defence call a set, and which calls don't use it up. */
  limitLine: string;
}

/** Tackle n of the set as the player counts it (the sim counts tackles done, from 0). */
const tackle = (done: number): number => done + 1;

/** "2:20". */
const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** "scores level or up to 1 behind", from GOALS.fieldGoalMargin (behind at worst, ahead at most). */
function marginWords([lo, hi]: readonly [number, number]): string {
  const parts = [lo <= 0 && hi >= 0 ? 'level' : '', lo < 0 ? `up to ${-lo} behind` : '', hi > 0 ? `up to ${hi} ahead` : ''];
  return `scores ${parts.filter(Boolean).join(' or ')}`;
}

/** When each call can be made: the sim's callRefusal, in words, from the same knobs. */
function callWhen(call: CoachCall): string {
  const late = `From tackle ${tackle(CALLS.lastFrom)}`;
  switch (call) {
    case 'hit-up':
    case 'shift-left':
    case 'shift-right':
      return 'Any tackle';
    case 'offload':
      return `Tackles ${tackle(0)}–${CALLS.offload.beforeTackle}`;
    case 'kick-early':
      return `Tackles ${tackle(CALLS.kickEarlyFrom)}–${SET_TACKLES - 1}`;
    case 'run-it':
    case 'bomb':
      return late;
    case 'grubber':
      return `${late}, inside their ${CALLS.grubberInsideM}`;
    case 'forty-twenty':
      return `${late}, behind your ${FIELD_LENGTH - CALLS.fortyTwentyFromM}, in reach of their ${FORTY_TWENTY_INTO_M}`;
    case 'field-goal':
      return `Last ${clock(GOALS.fieldGoalLastS)} of the match or golden point, from tackle ${tackle(GOALS.fieldGoalFromTackle)}, within ${GOALS.fieldGoalRangeM} m, ${marginWords(GOALS.fieldGoalMargin)}`;
    case 'rush':
    case 'hold':
    case 'gang-tackle':
      return 'Any tackle';
    case 'fresh-legs':
      return `${CALLS.freshLegs.perHalf === 1 ? 'Once' : `${CALLS.freshLegs.perHalf} times`} a half, once someone tires`;
    case 'take-two':
    case 'tap-go':
      return `After a penalty in kicking range (a ${Math.round(CALLS.penaltyShotMin * 100)}%+ shot)`;
    case 'kickoff-short':
    case 'kickoff-long':
      return 'At your kick-offs';
  }
}

/** What each call does, one line for the page (the tray's tiles say it shorter). */
function callDoes(call: CoachCall): string {
  switch (call) {
    case 'hit-up': return 'Your forwards take the next carry: fewer passes, fewer offloads.';
    case 'shift-left': return 'The next play goes wide to the left edge.';
    case 'shift-right': return 'The next play goes wide to the right edge.';
    case 'offload': return `The next ${CALLS.offload.plays} carries look to offload (and spill it a little more).`;
    case 'kick-early': return 'Kick on the next tackle instead of the last.';
    case 'run-it': return 'Run the last tackle instead of kicking.';
    case 'bomb': return 'The last-tackle kick goes up high for your chasers.';
    case 'field-goal': return 'Your kicker drops for goal.';
    case 'grubber': return 'Grubber the last-tackle kick along the ground for the line.';
    case 'forty-twenty': return `Kick the last for touch, bouncing out inside their ${FORTY_TWENTY_INTO_M}.`;
    case 'rush': return 'Your line rushes up for the next set.';
    case 'hold': return 'Your line holds back and stays compact for the next set.';
    case 'gang-tackle': return `An extra man in the next ${CALLS.gang.tackles} tackles, but more room out wide.`;
    case 'fresh-legs': return 'Your most tired man off for the freshest on the bench.';
    case 'take-two': return 'Overrule your captain: take the shot at goal for two.';
    case 'tap-go': return 'Overrule your captain: tap it and run.';
    case 'kickoff-short': return 'Short and high: your chasers try to win it back.';
    case 'kickoff-long': return 'Deep for the in-goal to pin them in (it can go dead).';
  }
}

function callSide(call: CoachCall): CallSide {
  if (callIsBench(call) || callIsPenalty(call) || callIsKickoff(call)) return 'Either way';
  return callIsDefence(call) ? 'Defending' : 'With the ball';
}

/** A call that doesn't use up the set's call (#367, #396, #397). */
export function callIsFree(call: CoachCall): boolean {
  return callIsBench(call) || callIsPenalty(call) || callIsKickoff(call);
}

/** The limit rule, with the calls that don't count named from the calls themselves. */
export function callLimitLine(): string {
  const free = CALLS.unlocks.flat().filter(callIsFree);
  return `One call with the ball and one while defending, each set. ${andList(callNames(free))} don't use up the set's call.`;
}

/**
 * Everything the Coach calls page shows for a club whose Coach's Office is at
 * `level` (0 = none built): every call in CALLS.unlocks once, grouped by the
 * level that unlocks it, each group locked or unlocked, with what it does and when.
 */
export function coachCallsPageData(level: number): CoachCallsPage {
  const lv = clampLevel(level);
  const groups = CALLS.unlocks.map((tier, i): CallGroup => ({
    level: i,
    title: officeLevelName(i),
    unlocked: i <= lv,
    calls: tier.map((call) => ({ call, name: CALL_LABEL[call], side: callSide(call), does: callDoes(call), when: callWhen(call), free: callIsFree(call) })),
  }));
  const next = nextUnlock(lv);
  return {
    level: lv,
    levelLine: lv === 0 ? "No Coach's Office yet" : `Coach's Office level ${lv}`,
    nextLine: next
      ? `${next.level === 1 ? "Build a Coach's Office" : `Upgrade it to level ${next.level}`} to unlock ${andList(callNames(next.calls))}.`
      : 'Every call is unlocked.',
    unlockedCount: groups.filter((g) => g.unlocked).reduce((n, g) => n + g.calls.length, 0),
    total: groups.reduce((n, g) => n + g.calls.length, 0),
    groups,
    limitLine: callLimitLine(),
  };
}
