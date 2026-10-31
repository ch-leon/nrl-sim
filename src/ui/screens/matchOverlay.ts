// src/ui/screens/matchOverlay.ts — the live match HUD (BAK-196, WU-12; Broadcast
// Quiet 3m–3r, docs/specs/ui-broadcast-quiet.md). DOM-only (ARCHITECTURE §1.6),
// mounted into #ui-root when the Match scene starts and removed on scene exit.
//
// The running score/stats are derived PURELY from the re-emitted 'match:event'
// stream via `reduceEvent` (a pure reducer extracted so it is unit-testable
// without a DOM). At full-time the accumulated score/tries/errors match
// MatchResult exactly; possession/tackles are self-consistent (possession is the
// tackle-count ratio, mirroring the engine) and land within rounding of
// MatchResult.stats — see tests/ui/matchOverlayAccumulator.test.ts.
//
// Layout (3m): the score bug top-left (tap it for the stats), the commentary as
// one line above the bottom row, or the full log on the right, or nothing (the
// log mode, kept across matches), the key-moment banner under the score bug, and
// the bottom row: COACH (MatchScene), the LOG switch, the Plan chip after a try
// (MatchScene), and the speed pill (MatchScene). While mounted the overlay puts
// `nrl-match-active` on <body>, which hides the dock (no Advance Week or screen
// hopping mid-match); the toast lane (toasts.ts) moves to the row under the
// score bug. It stays on through full time (GitHub #14: the match view stays
// clean until Back to Club), when `nrl-match-final` is added too and the full-time
// card (matchReport.ts) takes over. Both are removed on destroy (the scene's
// teardown when leaving), which hands the dock back.
//
// The commentary's lines come from the live playback (match/view/commentary.ts,
// N15.2) through `comment()`: the overlay keeps the score from the events and
// only says something of its own when a score or a call came with no line.
import { SET_TACKLES } from '../../config';
import { newReplayOffer, stepReplayOffer, type ReplayOffer } from '../../match/view/replay';
import { el, button, mount, ensureStyles, getRoot, segmented, type Segmented } from '../dom';
import { bus } from '../../core/events';
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../../match/league/presets';
import { TACTIC_BLURB } from '../tacticsBlurbs';
import { CALL_LABEL, callIsBench, callIsDefence, callIsKickoff, callIsPenalty, type CoachCall } from '../../match/league/calls';
import { TICKER_FIT_CHARS } from '../../match/view/commentary';
import { lockedCallsLine, officeLevelName, officeLevelOf } from '../coachCallsText';
import { teamTags } from '../teamTag';
import { MOMENTUM_STEP_MIN, momentumLabel, momentumLeader, momentumShapes, momentumWindow, type MomentumEvent } from '../../match/view/momentum';

// ── Pure accumulator (unit-tested independent of the DOM) ─────────────────────

export interface LiveState {
  homeScore: number;
  awayScore: number;
  /** Tackle-loop iterations per side; normalised to possession % at render. */
  possessionTicks: [number, number];
  tackles: [number, number];
  errors: [number, number];
  tries: [number, number];
  minute: number;
  half: 1 | 2;
  /** Internal: was the previous event a big-hit (so a following error is the
   *  same tackle iteration, not a new one)? Kept on the state so the reducer
   *  stays pure/replayable. */
  _prevBigHit: boolean;
}

export function initLiveState(): LiveState {
  return {
    homeScore: 0,
    awayScore: 0,
    possessionTicks: [0, 0],
    tackles: [0, 0],
    errors: [0, 0],
    tries: [0, 0],
    minute: 0,
    half: 1,
    _prevBigHit: false,
  };
}

/**
 * Fold one event into running state (pure — returns a new object). Scoring:
 * try +4, conversion +2 (only when successful — engine emits `conversion` with
 * detail 'good'/'missed'), penalty-goal +2 / field-goal +1 when not `missed`,
 * to the side matching `ev.teamId === homeId`. Tackles count one per
 * tackle-loop iteration: run/break/fend/break-tackle/penalty for the
 * possessing side; big-hit/tackle attributed to the DEFENDING teamId but counted
 * for the possessing (opposing) side; errors that are NOT the coughed-up ball
 * from a big-hit (same iteration). Last-tackle `kick` is not a new iteration
 * (the set already consumed SET_TACKLES contests). Possession ticks mirror tackles.
 * `half` flips on `half-time` and via `ev.t >= halfMinutes` (40 for the old
 * engine's 80-minute log, NINES.halfMinutes for the live sim's).
 */
export function reduceEvent(s: LiveState, ev: MatchEvent, homeId: string, halfMinutes = 40): LiveState {
  const next: LiveState = {
    ...s,
    possessionTicks: [s.possessionTicks[0], s.possessionTicks[1]],
    tackles: [s.tackles[0], s.tackles[1]],
    errors: [s.errors[0], s.errors[1]],
    tries: [s.tries[0], s.tries[1]],
  };
  const i = ev.teamId === homeId ? 0 : 1;

  // Minute / half.
  next.minute = Math.max(next.minute, Math.min(2 * halfMinutes, ev.t));
  if (ev.kind === 'half-time') next.half = 2;
  else if (ev.t >= halfMinutes) next.half = 2;

  // Scoring + counters.
  switch (ev.kind) {
    case 'try':
      // A Nines bonus-zone try (grounded between the posts) is worth five.
      addScore(next, i, ev.detail === 'bonus' ? 5 : 4);
      next.tries[i]++;
      break;
    case 'conversion':
    case 'penalty-goal':
      if (ev.detail !== 'missed') addScore(next, i, 2);
      break;
    case 'field-goal':
      if (ev.detail !== 'missed') addScore(next, i, 1);
      break;
    case 'error':
      next.errors[i]++;
      break;
    default:
      break;
  }

  // Tackle iterations (possessing side). set-start resets the big-hit latch.
  if (ev.kind === 'set-start') {
    next._prevBigHit = false;
  } else if (
    ev.kind === 'run' ||
    ev.kind === 'break' ||
    ev.kind === 'fend' ||
    ev.kind === 'break-tackle' ||
    ev.kind === 'penalty'
  ) {
    bumpTackle(next, i);
    next._prevBigHit = false;
  } else if (ev.kind === 'big-hit' || ev.kind === 'tackle') {
    // teamId is the DEFENDING side; the iteration belongs to the possessing side.
    bumpTackle(next, i === 0 ? 1 : 0);
    next._prevBigHit = ev.kind === 'big-hit';
  } else if (ev.kind === 'error') {
    if (!next._prevBigHit) bumpTackle(next, i);
    next._prevBigHit = false;
  } else {
    next._prevBigHit = false;
  }

  return next;
}

function addScore(s: LiveState, side: number, pts: number): void {
  if (side === 0) s.homeScore += pts;
  else s.awayScore += pts;
}

function bumpTackle(s: LiveState, side: number): void {
  s.tackles[side]++;
  s.possessionTicks[side]++;
}

/** Possession percentages [home, away] from ticks; 0/0 → 50/50. */
export function possessionPct(s: LiveState): [number, number] {
  const sum = s.possessionTicks[0] + s.possessionTicks[1];
  if (sum === 0) return [50, 50];
  const home = Math.round((s.possessionTicks[0] / sum) * 100);
  return [home, 100 - home];
}

/** MM:SS clock from a sim minute (minute 40 → "40:00"), clamped to the full match (80:00 by default). */
export function formatClock(minute: number, maxMinutes = 80): string {
  const m = Math.max(0, Math.min(maxMinutes, Math.floor(minute)));
  return `${String(m).padStart(2, '0')}:00`;
}

/** MM:SS from match seconds (the live sim's running clock), clamped to the full match. */
export function formatClockSeconds(seconds: number, maxMinutes: number): string {
  const s = Math.max(0, Math.min(maxMinutes * 60, Math.floor(seconds)));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── Score banner (pure) ────────────────────────────────────────────────────────

/** What the big centre-screen pop-up says for a scoring event. */
export interface ScoreBanner {
  /** 0 = home, 1 = away (the side that kicked / scored). */
  side: 0 | 1;
  /** TRY!, CONVERTED, PENALTY GOAL, FIELD GOAL! — or the miss. */
  headline: string;
  /** Who did it (falls back to the team when the event has no name). */
  scorer: string;
  team: string;
  /** Points added: 4 / 2 / 1, or 0 for a miss. */
  points: number;
  /** A conversion: folds into the try banner if that is still showing. */
  conversion: boolean;
}

/** Banner for any points-scoring attempt (try, conversion, penalty goal, field goal); null otherwise. */
export function scoreBanner(ev: MatchEvent, homeId: string, teamNames: readonly [string, string]): ScoreBanner | null {
  const side: 0 | 1 = ev.teamId === homeId ? 0 : 1;
  const missed = ev.detail === 'missed';
  let headline: string;
  let points: number;
  switch (ev.kind) {
    case 'try':
      headline = ev.detail === 'bonus' ? 'BONUS TRY!' : 'TRY!';
      points = ev.detail === 'bonus' ? 5 : 4;
      break;
    case 'conversion':
      headline = missed ? 'CONVERSION MISSED' : 'CONVERTED';
      points = missed ? 0 : 2;
      break;
    case 'penalty-goal':
      headline = missed ? 'PENALTY GOAL MISSED' : 'PENALTY GOAL';
      points = missed ? 0 : 2;
      break;
    case 'field-goal':
      headline = missed ? 'FIELD GOAL MISSED' : 'FIELD GOAL!';
      points = missed ? 0 : 1;
      break;
    default:
      return null;
  }
  const team = teamNames[side];
  const scorer = ev.player?.trim() || team;
  return { side, headline, scorer, team, points, conversion: ev.kind === 'conversion' };
}

/** Readable text colour (black or white) on a team colour background. */
export function inkFor(hex: string): '#000' | '#fff' {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  let h = m[1]!;
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lin = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? '#000' : '#fff';
}

/** How long a banner stays up (real ms): tries longest, a conversion extends it. */
export const BANNER_MS = { try: 3200, kick: 2400 } as const;

/**
 * How long this headline stays up. A bonus try gets the try's window, so its
 * conversion has the same time to fold in (N15.6, the show log's note 1).
 */
export function bannerLife(headline: string): number {
  return headline === 'TRY!' || headline === 'BONUS TRY!' ? BANNER_MS.try : BANNER_MS.kick;
}

/**
 * One ticker line, once a match, while the Coach's Office has calls still to
 * unlock (N15.6, the #224 note): the next level and what it unlocks ("Coach's
 * Office unlocks Shift, Rush, Offload and Gang tackle"), in season 1 too. A club
 * that keeps starting over never had a season behind it, so it never saw the
 * old line. Quiet once every call is unlocked. `unlocked` is what the match was given.
 */
export function callsLockedHint(unlocked: readonly CoachCall[]): string | null {
  return lockedCallsLine(officeLevelOf(unlocked), TICKER_FIT_CHARS);
}

// ── Key-moment banner (pure) ───────────────────────────────────────────────────

/** What the key-moment banner under the score bug says (3n): the big word, who, and the team line. */
export interface BannerText {
  /** TRY, GOAL, FIELD GOAL, MISSED, SIN BIN. */
  head: string;
  who: string;
  /** "LIVE TEST FC · +4", "STORM · PENALTY GOAL · +2". */
  sub: string;
  tone: 'score' | 'miss' | 'bin';
}

/** The banner for a scoring attempt: the headline as one big word, the kind and points on the team line. */
export function bannerText(b: ScoreBanner): BannerText {
  const pts = `+${b.points}`;
  switch (b.headline) {
    case 'TRY!':
      return { head: 'TRY', who: b.scorer, sub: `${b.team} · ${pts}`, tone: 'score' };
    case 'BONUS TRY!':
      return { head: 'TRY', who: b.scorer, sub: `${b.team} · bonus ${pts}`, tone: 'score' };
    case 'CONVERTED':
      return { head: 'GOAL', who: b.scorer, sub: `${b.team} · conversion · ${pts}`, tone: 'score' };
    case 'PENALTY GOAL':
      return { head: 'GOAL', who: b.scorer, sub: `${b.team} · penalty goal · ${pts}`, tone: 'score' };
    case 'FIELD GOAL!':
      return { head: 'FIELD GOAL', who: b.scorer, sub: `${b.team} · ${pts}`, tone: 'score' };
    default:
      // A miss: the kind it was, no points.
      return { head: 'MISSED', who: b.scorer, sub: `${b.team} · ${b.headline.replace(/ MISSED$/, '').toLowerCase()}`, tone: 'miss' };
  }
}

// ── Score bug, stats and log (pure) ────────────────────────────────────────────

/** The score bug's codes are the sides' tags (#371: src/ui/teamTag.ts), kept under these names for the report and the tests. */
export { teamTag as teamCode, teamTags as teamCodes } from '../teamTag';

/** The home share (0–100) of a stat row's split bar: the leading numbers of "54%", "312", "4/6"; 50 when both are nothing. */
export function statSplit(home: string, away: string): number {
  const n = (s: string): number => {
    const m = /\d+(\.\d+)?/.exec(s);
    return m ? Number(m[0]) : 0;
  };
  const h = n(home);
  const a = n(away);
  return h + a > 0 ? Math.round((h / (h + a)) * 100) : 50;
}

/** One stat line, home value · label · away value (the report's rows have this shape). */
export interface StatRow {
  label: string;
  home: string;
  away: string;
}

/**
 * The stats column (3t, and the score bug's stats in 3m): a head row with both
 * codes, then a 34px row per stat with a 4px split bar in the sides' colours.
 */
export function statTable(rows: readonly StatRow[], heads: readonly [string, string], colours: { home: string; away: string }): HTMLElement {
  const table = el('div', { class: 'nrl-mo-stattable' }, el('div', { class: 'nrl-mo-stathead' }, el('span', { text: heads[0] }), el('span', { text: 'Match stats' }), el('span', { text: heads[1] })));
  for (const r of rows) {
    const h = el('i');
    h.style.width = `${statSplit(r.home, r.away)}%`;
    h.style.background = colours.home;
    const a = el('i');
    a.style.background = colours.away;
    table.append(
      el('div', { class: 'nrl-mo-statrow' },
        el('span', { class: 'nrl-mo-stat-h', text: r.home }),
        el('span', { class: 'nrl-mo-stat-mid' }, el('span', { class: 'nrl-mo-stat-label', text: r.label }), el('span', { class: 'nrl-mo-stat-bar' }, h, a)),
        el('span', { class: 'nrl-mo-stat-a', text: r.away })),
    );
  }
  return table;
}

/** The commentary's three states (spec "Interactions & state"): one line, nothing, or the full log on the right. */
export type LogMode = 'line' | 'hidden' | 'full';

/** Where the log mode is kept between matches (the prototype's key). */
export const LOG_MODE_KEY = 'nrlsim.logMode';

type ModeStore = Pick<Storage, 'getItem' | 'setItem'>;

function localStore(): ModeStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // blocked site data
  }
}

/** The log mode a match opens with: the last one picked, 'line' the first time (a full log reopens as the line). */
export function readLogMode(store: ModeStore | null = localStore()): LogMode {
  try {
    return store?.getItem(LOG_MODE_KEY) === 'hidden' ? 'hidden' : 'line';
  } catch {
    return 'line';
  }
}

/** Keep the log mode for the next match; 'full' is kept as 'line'. Never throws. */
export function saveLogMode(mode: LogMode, store: ModeStore | null = localStore()): void {
  try {
    store?.setItem(LOG_MODE_KEY, mode === 'hidden' ? 'hidden' : 'line');
  } catch {
    // A private window or full storage: the mode lasts this match.
  }
}

// ── Coach calls (pure) ─────────────────────────────────────────────────────────

/** The caption for a call the sim refuses (#348 M6): the sim's reason, short. */
const CALL_CAPTION: Readonly<Record<string, string>> = {
  'not now': 'wait for play',
  'one call a set': 'one a set',
  'not while you have the ball': 'when defending',
  'not your ball': 'with the ball',
  'tackles 3–4': 'tackles 3–4',
  'late in the set': 'tackle 4+',
  'not in range': 'not in range',
  'full time': 'full time',
  'used this half': 'used this half',
  'no one’s tired yet': 'nobody tired',
  'bench is spent': 'bench spent',
  // #396
  'tackles 1–4': 'tackles 1–4',
  'not inside their 25': 'in their 25',
  'not behind your 40': 'behind your 40',
  'out of reach of their 20': 'out of reach',
  'the kick’s away': 'kick’s away',
  'no penalty': 'no penalty',
  'one call a penalty': 'one a penalty',
  'too far out': 'too far out',
  'the captain’s call': 'captain’s call',
  'the siren’s gone': 'siren’s gone',
};

/** Why a call is off, in a few words; "called" once made this set, nothing while it can be made. */
export function callCaption(why: string | null, made: boolean): string {
  if (made) return 'called';
  if (why === null) return '';
  return CALL_CAPTION[why] ?? why;
}

/** When each call can be made, and what it does (coach-calls.md §3). */
export const CALL_WHEN: Readonly<Record<CoachCall, string>> = {
  'hit-up': 'with the ball: the forwards take the next carry',
  'shift-left': 'with the ball: the next play goes wide left',
  'shift-right': 'with the ball: the next play goes wide right',
  'kick-early': 'tackles 3–4: kick on the next tackle',
  'run-it': 'tackle 4+: run the last, no kick',
  bomb: 'tackle 4+: the last-tackle kick is a bomb',
  'field-goal': 'late, close and in range: drop for goal',
  rush: 'defending: rush up for the next set',
  hold: 'defending: hold the line for the next set',
  'fresh-legs': 'once a half: tired man off, fresh man on',
  offload: 'tackles 1–4: the next two carries look to offload',
  'gang-tackle': 'defending: an extra man in the next two tackles',
  grubber: 'tackle 4+, inside their 25: grubber the last for the line',
  'forty-twenty': 'tackle 4+, behind your 40 and in reach of their 20: kick the last for touch inside their 20',
  'take-two': 'a penalty won, in range: a shot at goal for two',
  'tap-go': 'a penalty won, in range: tap it and run',
  'kickoff-short': 'your kick-off: short and high, the chase tries to win it back',
  'kickoff-long': 'your kick-off: deep for the in-goal, pins them in (can go dead)',
};

/** What a call does, in plain English, on its row in the coach tray (3o): CALL_WHEN less its "when". */
export function callEffect(call: CoachCall): string {
  const w = CALL_WHEN[call];
  const i = w.indexOf(': ');
  return i < 0 ? w : w.slice(i + 2);
}

/** What a call does on its tile in the coach tray (#396): CALL_WHEN's effect, short enough for a tile two a line. */
export const CALL_TILE: Readonly<Record<CoachCall, string>> = {
  'hit-up': 'forwards take it in',
  'shift-left': 'next play goes left',
  'shift-right': 'next play goes right',
  'kick-early': 'kick on the next tackle',
  'run-it': 'run the last, no kick',
  bomb: 'the last kick is a bomb',
  'field-goal': 'drop for goal',
  rush: 'rush up, next set',
  hold: 'hold the line, next set',
  'fresh-legs': 'tired man off, fresh on',
  offload: 'look to offload, 2 carries',
  'gang-tackle': 'extra man in, 2 tackles',
  grubber: 'grubber it for the line',
  'forty-twenty': 'kick for touch in their 20',
  'take-two': 'a shot at goal for two',
  'tap-go': 'tap it and run',
  'kickoff-short': 'high, chase to win it',
  'kickoff-long': 'deep, pin them in',
};

/** When a call that is not on yet comes on, from the sim's refusal (the coach tray's footer). */
const UNLOCK_WHEN: Readonly<Record<string, string>> = {
  'tackles 3–4': 'from tackle 3',
  'late in the set': 'from tackle 4',
  'not in range': 'when in range',
  'not now': 'once play restarts',
  'used this half': 'next half',
  'no one’s tired yet': 'once someone tires',
  'not inside their 25': 'inside their 25',
  'not behind your 40': 'behind your 40',
  'out of reach of their 20': 'in reach of their 20',
};

/**
 * The coach tray's footer (3o): when the calls that are not on now come on
 * ("Kick early from tackle 3 · Bomb, Run it from tackle 4"), that the set's call
 * is made, and the locked calls that fit the moment but not the tray. `waiting`
 * is this side's calls for the play now (attack or defence) with the sim's refusal.
 * `hidden`: calls on now that the five-row cap left out of the tray (#396),
 * said first ("+2 more: Hit-up, Offload") so a legal call never just vanishes.
 * `locked`: the locked rows trayWithLocked had no room for, said last
 * ("+3 locked: Coach's Office 2").
 */
export function callsUnlockLine(
  waiting: readonly { call: CoachCall; why: string | null }[],
  locked: readonly { call: CoachCall; level: number }[],
  hidden: readonly CoachCall[] = [],
): string {
  const parts: string[] = [];
  if (hidden.length > 0) parts.push(`+${hidden.length} more: ${hidden.map((c) => CALL_LABEL[c]).join(', ')}`);
  const groups = new Map<string, string[]>();
  let called = false;
  for (const { call, why } of waiting) {
    if (why === null) continue;
    if (why === 'one call a set') called = true;
    const when = UNLOCK_WHEN[why];
    if (when) groups.set(when, [...(groups.get(when) ?? []), CALL_LABEL[call]]);
  }
  if (called) parts.push('Called this set: the next call with the next set');
  for (const [when, names] of groups) parts.push(`${names.join(', ')} ${when}`);
  if (locked.length > 0) {
    const levels = [...new Set(locked.map((l) => l.level))].sort((p, q) => p - q);
    parts.push(`+${locked.length} locked: Coach's Office ${levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0]}`);
  }
  return parts.join(' · ');
}

/**
 * A button in the coach tray (#396): a call, and the sim's refusal (null when it can be made now).
 * `locked`: the Coach's Office level it needs, for a call the club hasn't unlocked (greyed, never made).
 */
export interface TrayButton {
  call: CoachCall;
  why: string | null;
  locked?: number;
}

/** A row of the coach tray (#396): one call, or two side by side (`shift`: left and right; `penalty`: Take the two and Tap and go). */
export interface TrayRow {
  id: string;
  buttons: readonly TrayButton[];
}

/** The most rows the tray shows (#396), and the most buttons: two rows of three or three of two, so it never scrolls. */
export const TRAY_MAX_ROWS = 5;
export const TRAY_MAX_BUTTONS = 6;

/**
 * Calls that share a row, side by side. The kick-off calls (#397) join as one more pair,
 * `['kickoff', <short>, <long>]`, which TRAY_PRIORITY and TRAY_ORDER already rank first: a
 * restart is over in seconds, and nothing else is on while it waits.
 */
const TRAY_PAIRS: readonly (readonly [string, CoachCall, CoachCall])[] = [
  ['shift', 'shift-left', 'shift-right'],
  ['penalty', 'take-two', 'tap-go'],
  ['kickoff', 'kickoff-short', 'kickoff-long'],
];

/** A refusal that still shows a pair's other half, greyed: it says why that half is not on (#396). */
const PAIR_SHOWS = new Set(['the captain’s call', 'the siren’s gone']);

/**
 * Which rows win when more are on than fit (#396): a kick-off (#397) or a penalty (gone
 * in seconds), the last-tackle kicks, Kick early (on two tackles only), Fresh legs, then
 * the next play's calls. Defending, four rows at most are ever on. The rest are named in
 * the footer ("+2 more").
 */
const TRAY_PRIORITY: readonly string[] = ['kickoff', 'penalty', 'field-goal', 'grubber', 'forty-twenty', 'bomb', 'run-it', 'kick-early', 'fresh-legs', 'hit-up', 'shift', 'offload', 'rush', 'hold', 'gang-tackle'];

/** The order the rows show in: a restart or a penalty, the next play, the set's kick, defence, the bench. */
const TRAY_ORDER: readonly string[] = ['kickoff', 'penalty', 'hit-up', 'shift', 'offload', 'kick-early', 'run-it', 'bomb', 'grubber', 'forty-twenty', 'field-goal', 'rush', 'hold', 'gang-tackle', 'fresh-legs'];

/** Is the call one for this side now: attack calls with the ball, defence calls without it; the bench, a penalty won and its kick-off (#397) either way. */
export function callForRole(call: CoachCall, attacking: boolean): boolean {
  return callIsBench(call) || callIsPenalty(call) || callIsKickoff(call) || callIsDefence(call) !== attacking;
}

/**
 * The coach tray's rows now (#396): the unlocked calls that can be made (the sim's
 * refusal is null) for the side's role, paired where two share a row, at most
 * TRAY_MAX_ROWS rows and TRAY_MAX_BUTTONS buttons, by TRAY_PRIORITY, shown in
 * TRAY_ORDER. A pair keeps its other half greyed when that half says something about
 * this moment (the captain already chose it, the siren has gone). Pure: no dice.
 */
export function trayRows(calls: readonly TrayButton[], attacking: boolean): TrayRow[] {
  const mine = calls.filter((c) => callForRole(c.call, attacking));
  const paired = new Set<CoachCall>(TRAY_PAIRS.flatMap(([, a, b]) => [a, b]));
  const rows: TrayRow[] = [];
  for (const [id, a, b] of TRAY_PAIRS) {
    const half = [a, b].map((call) => mine.find((c) => c.call === call)).filter((c): c is TrayButton => !!c);
    if (!half.some((c) => c.why === null)) continue;
    rows.push({ id, buttons: half.filter((c) => c.why === null || PAIR_SHOWS.has(c.why)) });
  }
  for (const c of mine) if (c.why === null && !paired.has(c.call)) rows.push({ id: c.call, buttons: [c] });
  const rank = (r: TrayRow, order: readonly string[]): number => {
    const i = order.indexOf(r.id);
    return i < 0 ? order.length : i;
  };
  const shown: TrayRow[] = [];
  let buttons = 0;
  for (const r of [...rows].sort((p, q) => rank(p, TRAY_PRIORITY) - rank(q, TRAY_PRIORITY))) {
    if (shown.length >= TRAY_MAX_ROWS || buttons + r.buttons.length > TRAY_MAX_BUTTONS) continue;
    shown.push(r);
    buttons += r.buttons.length;
  }
  return shown.sort((p, q) => rank(p, TRAY_ORDER) - rank(q, TRAY_ORDER));
}

/** The calls on now that the tray's rows leave out (#396): the footer names them. */
export function trayHidden(calls: readonly TrayButton[], attacking: boolean, rows: readonly TrayRow[]): CoachCall[] {
  const shown = new Set(rows.flatMap((r) => r.buttons.map((b) => b.call)));
  return calls.filter((c) => c.why === null && callForRole(c.call, attacking) && !shown.has(c.call)).map((c) => c.call);
}

/**
 * The tray with the locked calls under the usable ones: `rows` (trayRows, never
 * touched) first, then each locked call the sim would take now if it were
 * unlocked (`locked`: refusal null, a level each), paired as trayRows pairs them,
 * the nearest level first, while the tray has rows and buttons to spare. What
 * doesn't fit is `overflow`, for the footer. So a locked call never takes a usable
 * one's place, and only ones that fit the moment show.
 */
export function trayWithLocked(rows: readonly TrayRow[], locked: readonly TrayButton[]): { rows: TrayRow[]; overflow: TrayButton[] } {
  const extra: TrayRow[] = [];
  const paired = new Set<CoachCall>(TRAY_PAIRS.flatMap(([, a, b]) => [a, b]));
  for (const [id, a, b] of TRAY_PAIRS) {
    const half = locked.filter((c) => c.call === a || c.call === b);
    if (half.length > 0) extra.push({ id, buttons: half });
  }
  for (const c of locked) if (!paired.has(c.call)) extra.push({ id: c.call, buttons: [c] });
  const level = (r: TrayRow): number => Math.min(...r.buttons.map((b) => b.locked ?? 0));
  const order = (r: TrayRow): number => {
    const i = TRAY_ORDER.indexOf(r.id);
    return i < 0 ? TRAY_ORDER.length : i;
  };
  extra.sort((p, q) => level(p) - level(q) || order(p) - order(q));
  const out = [...rows];
  const overflow: TrayButton[] = [];
  let buttons = rows.reduce((n, r) => n + r.buttons.length, 0);
  for (const r of extra) {
    if (out.length >= TRAY_MAX_ROWS || buttons + r.buttons.length > TRAY_MAX_BUTTONS) {
      overflow.push(...r.buttons);
      continue;
    }
    out.push(r);
    buttons += r.buttons.length;
  }
  return { rows: out, overflow };
}

/** The calls the tray's rows offer now (for the COACH badge's count): a locked call is not one. */
export function trayCallsOn(rows: readonly TrayRow[]): number {
  return rows.reduce((n, r) => n + r.buttons.filter((b) => b.why === null && b.locked === undefined).length, 0);
}

/** A locked tile's tag, and the note a tap on it shows. */
export const lockedTag = (level: number): string => officeLevelName(level);
export const lockedNote = (level: number): string => `Unlocks with ${officeLevelName(level)}`;

/**
 * The tray's rows as elements (3o, #396): a tile a call, a pair side by side.
 * A usable tile makes its call (`onCall`); a pair's greyed half says why it is
 * off; a locked tile (`locked`) is greyed with its "Coach's Office 2" tag,
 * aria-disabled, and a tap only shows its note (`onLocked`), never a call.
 */
export function trayRowEls(rows: readonly TrayRow[], onCall: (call: CoachCall) => void, onLocked: (level: number) => void): HTMLElement[] {
  const tile = ({ call, why: off, locked }: TrayButton): HTMLButtonElement => {
    const b = button('', () => (locked === undefined ? onCall(call) : onLocked(locked)), { class: locked === undefined ? 'nrl-mo-tray-call' : 'nrl-mo-tray-call nrl-mo-tray-locked' });
    const name = document.createElement('b');
    name.textContent = CALL_LABEL[call];
    const what = document.createElement('span');
    // A pair's greyed half (#396) says why it is off: "captain’s call". The tile's text is short; the whole line is its title.
    what.textContent = locked !== undefined ? lockedTag(locked) : off === null ? CALL_TILE[call] : callCaption(off, false);
    b.replaceChildren(name, what);
    b.setAttribute('data-call', call);
    if (locked !== undefined) {
      b.title = `${CALL_LABEL[call]}: ${lockedNote(locked)}`;
      b.setAttribute('aria-disabled', 'true');
      b.setAttribute('data-locked', String(locked));
    } else {
      b.title = `${CALL_LABEL[call]}: ${callEffect(call)}`;
      b.disabled = off !== null;
    }
    return b;
  };
  return rows.map((r) => {
    if (r.buttons.length === 1) return tile(r.buttons[0]!);
    const pair = document.createElement('div');
    pair.className = 'nrl-mo-tray-pair';
    pair.setAttribute('data-row', r.id);
    pair.append(...r.buttons.map(tile));
    return pair;
  });
}

/**
 * The COACH button's badge (3m/3n): how many calls are on now; the call made this
 * set; or why none are ("THEIR BALL"). It is always there, so the row never shifts.
 */
export function coachBadge(legal: number, attacking: boolean, made: CoachCall | null): { text: string; state: 'on' | 'off' | 'made' } {
  if (made) return { text: CALL_LABEL[made], state: 'made' };
  if (legal > 0) return { text: `${legal} call${legal === 1 ? '' : 's'}`, state: 'on' };
  return { text: attacking ? 'No calls' : 'Their ball', state: 'off' };
}

/** "2/5" for a side's calls paid off of made, "–" when it made none. */
export function callsLine(made: Readonly<Record<'home' | 'away', number>>, paid: Readonly<Record<'home' | 'away', number>>): string {
  const one = (s: 'home' | 'away'): string => (made[s] > 0 ? `${paid[s]}/${made[s]}` : '–');
  return `Calls paid off ${one('home')} / ${one('away')}`;
}

/** How long SKIP in the speed pill stays armed for its second tap (it has no undo, #348 M3). */
export const SKIP_ARM_MS = 3000;

/** Smallest the ticker's line is drawn, px, when a long name would otherwise run over (#433). */
export const TICKER_MIN_PX = 11;

/**
 * Font size that fits `needed` px of text into `available` px. Unchanged when it
 * already fits. Never below `minPx`.
 */
export function fittedTickerPx(basePx: number, neededPx: number, availablePx: number, minPx = TICKER_MIN_PX): number {
  if (!(availablePx > 0) || neededPx <= availablePx + 1 || basePx <= minPx) return Math.max(minPx, basePx);
  return Math.max(minPx, (basePx * availablePx) / neededPx);
}

/** The pause sheet's Settings (the Office's Settings dialog, fx/audio.ts), set once at boot. */
let settingsOpener: (() => void) | null = null;

/** Give the match's pause sheet the Settings dialog's opener (main.ts, from initAudioUi()). */
export function setMatchSettingsOpener(open: (() => void) | null): void {
  settingsOpener = open;
}

/** The Settings opener for the pause sheet, or null when none was given. */
export function matchSettingsOpener(): (() => void) | null {
  return settingsOpener;
}

// ── The game plan sheet (3r) ───────────────────────────────────────────────────

/** The plan sheet (N11): at half-time (the score, the half's story) or after a try (Plan chip), the side's presets as segmented rows. */
export interface PlanCardOptions {
  /** "Half-time", "Golden point" or "Change the plan". */
  head: string;
  /** The score beside the head ("4–6"). */
  score?: string;
  /** One line: who leads, possession, legs, calls. */
  summary?: string;
  /** Older callers' lines; joined into the summary. */
  lines?: string[];
  /** The other side's plan, on the right ("Larrikins play Direct · Rush"). */
  tendency?: string;
  /** The primary: "Start 2nd half ▸", "Golden point ▸"; "Continue ▸" by default. */
  go?: string;
  /** The plan the side will play from the restart. */
  tactics: TeamTactics;
  /** A preset was tapped: the new plan (in force from the restart). Returns why not, or null. */
  onPick: (t: TeamTactics) => string | null;
  /** The primary: the match goes on. */
  onDone: () => void;
}

export interface PlanCardHandle {
  readonly el: HTMLElement;
  close(): void;
}

/**
 * Show the plan sheet over the dimmed field until its primary (#341: it waits for
 * the coach at every speed; it used to go on by itself while he was still reading it).
 */
export function showPlanCard(o: PlanCardOptions): PlanCardHandle {
  ensureStyles();
  injectOverlayStyles();
  let current: TeamTactics = { ...o.tactics };
  // The footer explains the preset last tapped; the attack's to begin with.
  let explained: AttackPreset | DefencePreset = current.attack;
  const hint = el('div', { class: 'nrl-mo-plan-hint' });
  const segs: Segmented<AttackPreset | DefencePreset>[] = [];
  const render = (): void => {
    for (const seg of segs) {
      const on = [...seg.buttons.keys()].find((p) => p === current.attack || p === current.defence);
      if (on) seg.set(on);
      for (const [p, b] of seg.buttons) b.toggleAttribute('data-active', p === on);
    }
    hint.textContent = `${PRESET_LABEL[explained]}: ${TACTIC_BLURB[explained]}`;
  };
  const row = (label: string, presets: readonly (AttackPreset | DefencePreset)[], pick: (p: AttackPreset | DefencePreset) => Partial<TeamTactics>): HTMLElement[] => {
    const seg = segmented<AttackPreset | DefencePreset>(
      presets.map((p) => ({ id: p, label: PRESET_LABEL[p], title: TACTIC_BLURB[p] })),
      null,
      (p) => {
        explained = p;
        const next = { ...current, ...pick(p) };
        if (next.attack !== current.attack || next.defence !== current.defence) {
          if (o.onPick(next) === null) current = next;
        }
        render();
      },
      { label, repeat: true },
    );
    for (const [p, b] of seg.buttons) b.setAttribute('data-tactic', p);
    segs.push(seg);
    return [el('span', { class: 'nrl-mo-plan-label', text: label }), seg.el];
  };
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    wrap.remove();
    o.onDone();
  };
  const go = button(o.go ?? 'Continue ▸', close, { class: 'nrl-btn-primary nrl-mo-plan-go' });
  const summary = o.summary ?? (o.lines ?? []).join(' · ');
  const sheet = el(
    'div',
    { class: 'nrl-mo-plan-sheet' },
    el('span', { class: 'nrl-mo-plan-grab', attrs: { 'aria-hidden': 'true' } }),
    el('div', { class: 'nrl-mo-plan-top' },
      el('span', { class: 'nrl-mo-plan-head', text: o.head }),
      ...(o.score ? [el('span', { class: 'nrl-mo-plan-score', text: o.score })] : []),
      ...(summary ? [el('span', { class: 'nrl-mo-plan-line', text: summary })] : []),
      ...(o.tendency ? [el('span', { class: 'nrl-mo-plan-tend', text: o.tendency })] : []),
    ),
    el('div', { class: 'nrl-mo-plan-rows' },
      ...row('Attack', ATTACK_PRESETS, (p) => ({ attack: p as AttackPreset })),
      ...row('Defence', DEFENCE_PRESETS, (p) => ({ defence: p as DefencePreset })),
    ),
    el('div', { class: 'nrl-mo-plan-foot' }, hint, go),
  );
  const wrap = el('div', { class: 'nrl-mo-plan', attrs: { role: 'dialog', 'aria-label': o.head } }, sheet);
  render();
  mount(wrap);
  return { el: wrap, close };
}

/** A sheet over the field (the pause menu): a head, some lines, a column of actions. */
export interface MatchSheetOptions {
  head: string;
  lines?: (string | HTMLElement)[];
  actions: { label: string; onTap: () => void; attrs?: Record<string, string>; primary?: boolean }[];
  /** The sheet went, by any action, its ✕ or a tap on the dimmed field: the match goes on. */
  onDone: () => void;
}

/** Show a sheet until one of its actions (each closes it first), its ✕ or a tap beside it. */
export function showMatchSheet(o: MatchSheetOptions): PlanCardHandle {
  ensureStyles();
  injectOverlayStyles();
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    sheet.remove();
    o.onDone();
  };
  const x = button('✕', close, { class: 'nrl-mo-sheet-x' });
  x.setAttribute('aria-label', 'Close');
  const actions = o.actions.map((a) => {
    const b = button(a.label, () => {
      close();
      a.onTap();
    }, a.primary ? { class: 'nrl-btn-primary' } : {});
    for (const [k, v] of Object.entries(a.attrs ?? {})) b.setAttribute(k, v);
    return b;
  });
  const card = el(
    'div',
    { class: 'nrl-mo-sheet-card' },
    el('div', { class: 'nrl-mo-sheet-head', text: o.head }),
    x,
    ...(o.lines ?? []).map((l) => (typeof l === 'string' ? el('div', { class: 'nrl-mo-sheet-line', text: l }) : l)),
    el('div', { class: 'nrl-mo-sheet-actions' }, ...actions),
  );
  const sheet = el('div', { class: 'nrl-mo-sheet', attrs: { role: 'dialog', 'aria-label': o.head } }, card);
  // The dimmed field closes it, like the ✕.
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) close();
  });
  mount(sheet);
  return { el: sheet, close };
}

/** Anything the coach is reading over the field: the plan sheet, the pause sheet, the full-time card, the report. The replay offer waits under it (#341). */
export const CARD_SELECTOR = '.nrl-mo-plan, .nrl-mo-sheet, .nrl-mo-ft, .nrl-modal';

// ── DOM overlay ────────────────────────────────────────────────────────────────

/** Lines kept in the full log (newest first). */
export const MAX_LOG = 80;

/**
 * The line that goes when the full log passes MAX_LOG (#414): the oldest untagged
 * one, so a call or a score from the first minutes is still under its filter at
 * full time; the oldest of all once every line is tagged. `kinds` is each line's
 * data-kind, newest first.
 */
export function logLineToDrop(kinds: readonly (string | undefined)[]): number {
  for (let i = kinds.length - 1; i >= 0; i--) if (!kinds[i]) return i;
  return kinds.length - 1;
}

/** What a filter of the full log says when it has nothing to list (#414). */
export const LOG_EMPTY_TEXT = { scoring: 'No scores yet.', calls: 'No calls yet.' } as const;

let active: MatchOverlayHandle | null = null;

/** The sides' pitch colours of the match on screen, for the full-time card and report's stripes and bars. */
let lastColours: { homeId: string; awayId: string; home: string; away: string } | null = null;

/** The colours `homeId` and `awayId` wore in the match just shown, or the design's home/away colours. */
export function matchColours(homeId: string, awayId: string): { home: string; away: string } {
  const c = lastColours;
  return c && c.homeId === homeId && c.awayId === awayId ? { home: c.home, away: c.away } : { home: 'var(--nrl-home)', away: 'var(--nrl-away)' };
}

export interface MatchOverlayHandle {
  /** Remove the overlay and unsubscribe all bus handlers. Idempotent. */
  destroy(): void;
  /** Completed tackles before this play, or null while there is no meaningful count. */
  setTackle?(count: number | null): void;
  /** The live sim's running clock (match seconds and half), finer than the events' whole minutes. */
  setClock(matchSeconds: number, half: 1 | 2 | 'gp'): void;
  /** A line in the commentary and the log: every line comes this way, from the live playback's commentary (N15.2). */
  comment(line: string): void;
  /** Coach calls made and paid off, home and away (#73): the stats line, and the coach's own lines in the log. */
  setCalls?(made: Readonly<Record<'home' | 'away', number>>, paid: Readonly<Record<'home' | 'away', number>>): void;
  /** Show Replay for eight seconds after a try (N15.5). Tapping hides it and calls `onTap`. */
  offerReplay(onTap: () => void): void;
  /** How long the re-sim blocked the main thread, in ms. The page's perf read. */
  noteReplayBlock(ms: number): void;
  /** The picture is the replay: a REPLAY tag, cleared when the live view returns. */
  setReplaying(on: boolean): void;
  /** The score bug follows the replay, then the live score again. */
  setScore(home: number, away: number): void;
  /** Put the score bug back on the score the events have accumulated. */
  showLiveScore(): void;
  /** A place in the bottom row for the scene's controls: COACH, the Plan chip, the speed pill. */
  slot?(name: 'coach' | 'plan' | 'speed'): HTMLElement;
  /** The coach's call just went in (its name, for the log if the commentary has no line for it). */
  noteCall?(label: string): void;
  /** The coach tray is open: the commentary line steps aside and the speed pill shows only the speed. */
  setTrayOpen?(on: boolean): void;
  /** Possession so far [home, away] in percent (the half-time sheet's summary). */
  possession?(): [number, number];
}

export interface MatchOverlayOptions {
  home: TeamSheet;
  away: TeamSheet;
  /** The recorded match (the classic replay); a live match has none until full time (#73). */
  result?: MatchResult;
  /** The weather (the stats) when there is no result yet. */
  weather?: WeatherKind;
  /** Minutes in a half: 40 for the old engine's log (default), NINES.halfMinutes for a live match (BAK-207 2g). */
  halfMinutes?: number;
  /** The colours the sides show on the pitch (their rings, #340): the stripes, the possession bar and the stats. Default: each club's first colour. */
  worn?: { home: string; away: string };
  /** The coach's side: his club is starred on the score bug (#348 M8), and his calls are his in the log. */
  mine?: 'home' | 'away';
}

/** A 0xRRGGBB colour as CSS. */
export function cssHex(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** The commentary before the first line. */
export const TICKER_WAIT_TEXT = 'Kick-off soon…';

/** The countdown on the Replay try chip: whole seconds left, never 0 while it shows. */
export function replayCountdown(leftMs: number): number {
  return Math.max(1, Math.ceil(leftMs / 1000));
}

/** The full log's filters (3m): everything, the scores, the coach's own calls. */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'calls', label: 'Your calls' },
] as const;

/**
 * Mount the match overlay. Idempotent — mounting while one is active tears the
 * old one down first (guards against double-mount / leaks). Subscribes to
 * 'match:event' (accumulate + render; the commentary's lines come through comment())
 * and freezes on 'match:finished'. Returns a handle whose destroy() also unsubscribes.
 */
export function mountMatchOverlay(opts: MatchOverlayOptions): MatchOverlayHandle {
  if (active) active.destroy();
  ensureStyles();
  injectOverlayStyles();

  const { home, away, result } = opts;
  const homeId = home.clubId;
  const worn = opts.worn ?? { home: home.colors[0], away: away.colors[0] };
  lastColours = { homeId, awayId: away.clubId, ...worn };
  const halfMinutes = opts.halfMinutes ?? 40;
  const weather = opts.weather ?? result?.weather ?? 'clear';
  const codes = teamTags(home.name, away.name);
  /** Set once the live sim drives the clock: events then only move the score and stats. */
  let liveClock = false;
  /** The clock at the final whistle. */
  let finalClock: string | null = null;

  let state = initLiveState();
  /** Line breaks, kicks and big hits per side, counted as the report counts them (by the event's team). */
  const counts = { breaks: [0, 0], kicks: [0, 0], hits: [0, 0] };
  let calls = { made: { home: 0, away: 0 }, paid: { home: 0, away: 0 } };

  const root = el('div', { class: 'nrl-match-overlay' });

  // ── Score bug (3m): stripe, code, score per side; the clock; possession under it. Tap: the stats.
  const teamCell = (side: 'home' | 'away', code: string, colour: string): { cell: HTMLElement; pts: HTMLElement } => {
    const mine = opts.mine === side;
    const stripe = el('span', { class: 'nrl-mo-stripe' });
    stripe.style.background = colour;
    const pts = el('span', { class: 'nrl-mo-pts', text: '0' });
    const cell = el('span', { class: mine ? 'nrl-mo-team nrl-mo-mine' : 'nrl-mo-team', attrs: { 'data-side': side } }, stripe, el('span', { class: 'nrl-mo-code', text: mine ? `${code} ★` : code }), pts);
    if (mine) cell.title = 'Your club';
    return { cell, pts };
  };
  const homeCell = teamCell('home', codes[0], worn.home);
  const awayCell = teamCell('away', codes[1], worn.away);
  const clockEl = el('span', { class: 'nrl-mo-clock', text: opts.halfMinutes ? formatClockSeconds(0, 2 * halfMinutes) : formatClock(0) });
  const tackleEl = el('span', { class: 'nrl-mo-tackle' });
  tackleEl.hidden = true;
  const halfEl = el('span', { class: 'nrl-mo-half', text: '1H' });
  // The score in words, for a screen reader (and the e2e's read of it).
  const scoreEl = el('span', { class: 'nrl-mo-score nrl-mo-sr', text: '0 – 0' });
  // The team-colour split under the score bug is the momentum line (#366): who is on top, the last few minutes.
  const momentum = momentumLine(worn, codes);
  const board = el(
    'button',
    { class: 'nrl-mo-scoreboard', attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'nrl-mo-stats', title: 'Match stats' } },
    el('span', { class: 'nrl-mo-bug' }, homeCell.cell, awayCell.cell, el('span', { class: 'nrl-mo-clockbox' }, clockEl, halfEl), tackleEl),
    momentum.row,
    scoreEl,
  );

  // The momentum line (#366): the events that move it, at the match-minute they were seen.
  const momentumSeen: MomentumEvent[] = [];
  /** The live clock in match-minutes (golden point after the 14), and the furthest it has been (a replay winds the clock back, not the line). */
  let clockMin = 0;
  let nowMin = 0;
  let drawnAt = -Infinity;
  const drawMomentum = (): void => {
    drawnAt = nowMin;
    const samples = momentumWindow(momentumSeen, homeId, nowMin);
    momentum.draw(samples, momentumLabel(samples, { home: home.name, away: away.name }));
  };

  // Stats (no permanent panel): the score bug opens them, in the report's layout.
  const statsBody = el('div', { class: 'nrl-mo-stats-body' });
  // Possession and the counts stay on the live match while a replay rewinds the score bug.
  const statsNote = el('div', { class: 'nrl-mo-stat-note', text: 'Live match: the replay shows an earlier score.' });
  statsNote.hidden = true;
  const statsSheet = el(
    'div',
    { class: 'nrl-mo-statsheet', attrs: { id: 'nrl-mo-stats', role: 'region', 'aria-label': 'Match stats' } },
    statsBody,
    el('div', { class: 'nrl-mo-stat-foot', text: `Weather: ${weatherWord(weather)}` }),
    statsNote,
  );
  statsSheet.hidden = true;
  let statsOpen = false;
  const statRows = (): StatRow[] => {
    const [ph, pa] = possessionPct(state);
    const pair = (label: string, h: number | string, a: number | string): StatRow => ({ label, home: String(h), away: String(a) });
    const anyCalls = calls.made.home + calls.made.away > 0;
    return [
      pair('Possession', `${ph}%`, `${pa}%`),
      pair('Tackles', state.tackles[0], state.tackles[1]),
      pair('Line breaks', counts.breaks[0]!, counts.breaks[1]!),
      pair('Errors', state.errors[0], state.errors[1]),
      pair('Kicks', counts.kicks[0]!, counts.kicks[1]!),
      pair('Big hits', counts.hits[0]!, counts.hits[1]!),
      ...(anyCalls ? [pair('Calls paid off', `${calls.paid.home}/${calls.made.home}`, `${calls.paid.away}/${calls.made.away}`)] : []),
    ];
  };
  const renderStats = (): void => {
    statsBody.replaceChildren(statTable(statRows(), codes, worn));
  };
  board.addEventListener('click', () => {
    statsOpen = !statsOpen;
    statsSheet.hidden = !statsOpen;
    board.setAttribute('aria-expanded', String(statsOpen));
    // The stats take the room the commentary line had; it comes back when they close.
    root.classList.toggle('nrl-mo-stats-on', statsOpen);
    if (statsOpen) renderStats();
  });

  // ── Commentary (3m): one line above the bottom row, the full log on the right, or nothing.
  const stripText = el('span', { class: 'nrl-mo-strip-text nrl-mo-line-wait', text: TICKER_WAIT_TEXT });
  const strip = el(
    'button',
    { class: 'nrl-mo-strip', attrs: { type: 'button', 'aria-controls': 'nrl-mo-log' } },
    el('span', { class: 'nrl-mo-strip-live', text: 'LIVE' }),
    stripText,
    el('span', { class: 'nrl-mo-strip-more', text: 'FULL LOG ▴' }),
  );
  strip.addEventListener('click', () => setMode('full'));
  // A long typed name wraps (the CSS) and, on a narrow window, draws smaller until the
  // whole line is inside the strip (#433). The size resets when the line or the width changes.
  let fitKey = '';
  const fitStrip = (): void => {
    if (stripText.clientHeight < 1) return;
    const key = `${stripText.textContent}\0${strip.clientWidth}\0${document.documentElement.getAttribute('data-text-size') ?? ''}`;
    if (key === fitKey) return;
    fitKey = key;
    stripText.style.fontSize = '';
    for (let i = 0; i < 4; i++) {
      if (stripText.scrollHeight <= stripText.clientHeight + 1) break;
      const base = parseFloat(getComputedStyle(stripText).fontSize);
      const next = fittedTickerPx(base, stripText.scrollHeight, stripText.clientHeight);
      if (next >= base - 0.4) break;
      stripText.style.fontSize = `${next}px`;
    }
  };
  const fitObserver = new MutationObserver(fitStrip);
  fitObserver.observe(stripText, { childList: true, characterData: true, subtree: true });
  fitObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text-size'] });
  const stripObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitStrip) : null;
  stripObserver?.observe(strip);
  const feed = el('div', { class: 'nrl-mo-feed' });
  const closeLog = button('✕', () => setMode('line'), { class: 'nrl-mo-full-x' });
  closeLog.setAttribute('aria-label', 'Close the log');
  const full = el('div', { class: 'nrl-mo-full', attrs: { id: 'nrl-mo-log', role: 'log', 'aria-label': 'Match log', 'data-filter': 'all' } });
  const filterBtns = FILTERS.filter((f) => f.id !== 'calls' || opts.mine).map((f) => {
    const b = button(f.label, () => {
      full.dataset.filter = f.id;
      for (const o of filterBtns) {
        const on = o.dataset.filter === f.id;
        o.toggleAttribute('data-active', on);
        o.setAttribute('aria-pressed', String(on));
      }
    }, { class: 'nrl-mo-filter' });
    b.dataset.filter = f.id;
    b.setAttribute('aria-pressed', String(f.id === 'all'));
    b.toggleAttribute('data-active', f.id === 'all');
    return b;
  });
  full.append(
    el('div', { class: 'nrl-mo-full-head' }, el('span', { class: 'nrl-mo-full-title', text: 'Match log' }), closeLog),
    el('div', { class: 'nrl-mo-filters' }, ...filterBtns),
    ...Object.entries(LOG_EMPTY_TEXT).map(([f, text]) => el('div', { class: 'nrl-mo-log-empty', text, attrs: { 'data-for': f } })),
    feed,
  );

  // ── Bottom row (3m): COACH · LOG · Plan · … · the speed pill. The scene fills its slots.
  const logToggle = el(
    'button',
    { class: 'nrl-mo-log-toggle', attrs: { type: 'button', 'aria-pressed': 'true', 'aria-label': 'Commentary line' } },
    el('span', { class: 'nrl-mo-switch', attrs: { 'aria-hidden': 'true' } }, el('i')),
    el('span', { class: 'nrl-mo-log-label', text: 'LOG' }),
  );
  logToggle.addEventListener('click', () => setMode(mode === 'hidden' ? 'line' : 'hidden'));
  const slots = {
    coach: el('div', { class: 'nrl-mo-slot nrl-mo-slot-coach' }),
    plan: el('div', { class: 'nrl-mo-slot nrl-mo-slot-plan' }),
    speed: el('div', { class: 'nrl-mo-slot nrl-mo-slot-speed' }),
  };
  const bar = el('div', { class: 'nrl-mo-bar' }, slots.coach, logToggle, slots.plan, el('span', { class: 'nrl-mo-bar-gap' }), slots.speed);

  // ── Key-moment banner (3n): under the score bug, whatever the log mode.
  const bannerHead = el('span', { class: 'nrl-mo-banner-head' });
  const bannerWho = el('span', { class: 'nrl-mo-banner-who' });
  const bannerSub = el('span', { class: 'nrl-mo-banner-sub' });
  const banner = el('div', { class: 'nrl-mo-banner', attrs: { role: 'status', 'aria-live': 'polite' } }, bannerHead, el('span', { class: 'nrl-mo-banner-text' }, bannerWho, bannerSub));
  banner.hidden = true;

  root.append(board, statsSheet, strip, full, banner, bar);
  mount(root);

  let mode: LogMode = readLogMode();
  const setMode = (m: LogMode): void => {
    mode = m;
    root.dataset.log = m;
    root.classList.toggle('nrl-mo-full-on', m === 'full');
    logToggle.setAttribute('aria-pressed', String(m !== 'hidden'));
    strip.setAttribute('aria-expanded', String(m === 'full'));
    if (m === 'full') feed.scrollTop = 0;
    saveLogMode(m);
  };
  setMode(mode);

  // The score bug's foot, for what hangs under it: the banner, the replay chip, the stats, the toasts.
  let boardFrame = 0;
  const placeBoard = (): void => {
    boardFrame = 0;
    document.documentElement.style.setProperty(BOARD_VAR, `${Math.ceil(board.getBoundingClientRect().bottom)}px`);
  };
  const scheduleBoard = (): void => {
    if (!boardFrame) boardFrame = requestAnimationFrame(placeBoard);
  };
  const boardObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleBoard) : null;
  boardObserver?.observe(board);
  window.addEventListener('resize', scheduleBoard);
  placeBoard();

  // The replay offer runs down only while nothing is open over the field: under the
  // half-time sheet, the pause sheet or the full-time card it hides and waits (#341).
  // Under the open coach tray it hides and waits too, for a while (#348, stepReplayOffer).
  let replayTimer: ReturnType<typeof setInterval> | null = null;
  let replayBtn: HTMLButtonElement | null = null;
  let replayCount: HTMLElement | null = null;
  let replayOffer: ReplayOffer = newReplayOffer();
  let replayAt = 0;
  let replayTag: HTMLElement | null = null;
  const clearReplayOffer = (): void => {
    if (replayTimer) clearInterval(replayTimer);
    replayTimer = null;
    replayBtn?.remove();
    replayBtn = null;
    replayCount = null;
  };
  const cardOpen = (): boolean => document.querySelector(CARD_SELECTOR) !== null;
  const tickReplay = (): void => {
    if (!replayBtn) return;
    const now = performance.now();
    const step = stepReplayOffer(replayOffer, now - replayAt, cardOpen() ? 'card' : root.classList.contains('nrl-mo-tray-open') ? 'tray' : null);
    replayOffer = step;
    replayAt = now;
    if (step.gone) {
      clearReplayOffer();
      return;
    }
    replayBtn.hidden = !step.show;
    if (replayCount) replayCount.textContent = String(replayCountdown(step.leftMs));
  };
  const cardWatch = new MutationObserver(tickReplay);
  cardWatch.observe(getRoot(), { childList: true });
  document.body?.classList.add(MATCH_ACTIVE_CLASS);

  const showScore = (h: number, a: number): void => {
    homeCell.pts.textContent = String(h);
    awayCell.pts.textContent = String(a);
    scoreEl.textContent = `${h} – ${a}`;
  };
  const render = (): void => {
    showScore(state.homeScore, state.awayScore);
    if (!liveClock) {
      clockEl.textContent = formatClock(state.minute, 2 * halfMinutes);
      halfEl.textContent = state.half === 1 ? '1H' : '2H';
    }
    if (statsOpen) renderStats();
  };

  // ── The log: newest first, each line stamped with the clock. A score or the coach's
  // own call tags the line the commentary just said for it (same tick, same task).
  /** The lines said since the last event: the tick in hand (its events come after its lines). */
  let batch: HTMLElement[] = [];
  let eventSince = false;
  const addLine = (text: string, kind = ''): HTMLElement => {
    const line = el('div', { class: 'nrl-mo-line' }, el('span', { class: 'nrl-mo-line-t', text: clockEl.textContent ?? '' }), el('span', { class: 'nrl-mo-line-text', text }));
    if (kind) line.dataset.kind = kind;
    feed.prepend(line);
    while (feed.childElementCount > MAX_LOG) {
      const lines = [...feed.children] as HTMLElement[];
      lines[logLineToDrop(lines.map((l) => l.dataset.kind))]?.remove();
    }
    stripText.classList.remove('nrl-mo-line-wait');
    stripText.textContent = text;
    if (eventSince) {
      batch = [];
      eventSince = false;
    }
    batch.push(line);
    return line;
  };
  /** The latest line of the tick with no tag yet: the call's line (setCalls follows it at once). */
  const untagged = (): HTMLElement | null => {
    for (let i = batch.length - 1; i >= 0; i--) if (!batch[i]!.dataset.kind) return batch[i]!;
    return null;
  };
  /**
   * The tick's line for a score: the latest that names the scorer, else the tick's
   * first untagged line (a whistle in the same tick comes after the kick).
   */
  const scoreLine = (player: string | undefined): HTMLElement | null => {
    const open = batch.filter((l) => !l.dataset.kind);
    const name = player?.trim().split(/\s+/).pop();
    const named = name ? open.filter((l) => l.textContent?.includes(name)) : [];
    return named[named.length - 1] ?? open[0] ?? null;
  };
  /** The coach's call waiting for its line (noteCall). */
  let pendingCall: string | null = null;

  // ── Key moments ──
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  let bannerWasTry = false;
  /** Built during a burst of events (Skip) and shown once the burst ends. */
  let queued: (() => void) | null = null;
  let flushScheduled = false;

  const hideBanner = (): void => {
    banner.hidden = true;
    banner.classList.remove('nrl-mo-banner-in');
    bannerWasTry = false;
    bannerTimer = null;
  };
  const holdBanner = (ms: number): void => {
    banner.hidden = false;
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, ms);
  };
  const showMoment = (t: BannerText): void => {
    bannerHead.textContent = t.head;
    bannerWho.textContent = t.who;
    bannerSub.textContent = t.sub;
    banner.dataset.tone = t.tone;
    banner.classList.toggle('nrl-mo-banner-long', t.head.length > 6);
    // Restart the slide-in.
    banner.classList.remove('nrl-mo-banner-in');
    void banner.offsetWidth;
    banner.classList.add('nrl-mo-banner-in');
  };
  const pulse = (node: HTMLElement): void => {
    node.classList.remove('nrl-mo-scored');
    void node.offsetWidth;
    node.classList.add('nrl-mo-scored');
  };
  const showBanner = (b: ScoreBanner): void => {
    if (b.conversion && bannerWasTry && !banner.hidden) {
      // The conversion straight after the try: it joins the try's banner.
      bannerSub.querySelector('.nrl-mo-banner-extra')?.remove();
      bannerSub.append(el('span', { class: 'nrl-mo-banner-extra', text: ` · ${b.points > 0 ? `converted +${b.points}` : 'conversion missed'}` }));
    } else {
      showMoment(bannerText(b));
      bannerWasTry = b.headline === 'TRY!' || b.headline === 'BONUS TRY!'; // a bonus try's conversion folds in too (#77)
    }
    holdBanner(bannerLife(b.headline));
    if (b.points > 0) pulse(b.side === 0 ? homeCell.pts : awayCell.pts);
  };
  const queue = (show: () => void): void => {
    queued = show;
    if (flushScheduled) return;
    flushScheduled = true;
    setTimeout(() => {
      flushScheduled = false;
      const q = queued;
      queued = null;
      q?.();
    }, 0);
  };

  /** Events received since the last task tick — more than one means Skip. */
  let burst = 0;
  const onEvent = (ev: MatchEvent): void => {
    if (burst++ === 0) setTimeout(() => (burst = 0), 0);
    eventSince = true;
    state = reduceEvent(state, ev, homeId, halfMinutes);
    const i = ev.teamId === homeId ? 0 : 1;
    if (ev.kind === 'break') counts.breaks[i]!++;
    else if (ev.kind === 'kick') counts.kicks[i]!++;
    else if (ev.kind === 'big-hit') counts.hits[i]!++;
    render();
    if (ev.kind === 'try' || ev.kind === 'big-hit' || ev.kind === 'error' || ev.kind === 'set-start') {
      // Seen this frame: the live clock's minute, kept inside the event's own (a resumed match's catch-up has no clock yet).
      const prev = momentumSeen[momentumSeen.length - 1]?.at ?? 0;
      const at = Math.max(prev, Math.min(ev.t + 0.999, Math.max(ev.t, clockMin)));
      momentumSeen.push({ at, kind: ev.kind, teamId: ev.teamId });
      nowMin = Math.max(nowMin, at);
      drawMomentum();
    } else if (!liveClock && ev.t > nowMin) {
      nowMin = ev.t;
      drawMomentum();
    }
    const b = scoreBanner(ev, homeId, [home.name, away.name]);
    if (b) {
      const kind = ev.kind === 'try' ? 'score try' : 'score';
      const line = scoreLine(ev.player);
      if (line) line.dataset.kind = kind;
      else addLine(`${b.headline} ${b.scorer}${b.scorer === b.team ? '' : `, ${b.team}`}. ${state.homeScore}–${state.awayScore}`, kind);
      queue(() => showBanner(b));
    } else if (ev.kind === 'sin-bin') {
      const team = i === 0 ? home.name : away.name;
      queue(() => {
        showMoment({ head: 'SIN BIN', who: ev.player?.trim() || team, sub: team, tone: 'bin' });
        bannerWasTry = false;
        holdBanner(BANNER_MS.kick);
      });
    }
  };

  const offEvent = bus.on('match:event', onEvent);
  let offFinished: () => void = () => {};

  const handle: MatchOverlayHandle = {
    destroy(): void {
      offEvent();
      offFinished();
      if (bannerTimer) clearTimeout(bannerTimer);
      clearReplayOffer();
      replayTag?.remove();
      document.documentElement.style.removeProperty(BOARD_VAR);
      if (boardFrame) cancelAnimationFrame(boardFrame);
      boardObserver?.disconnect();
      fitObserver.disconnect();
      stripObserver?.disconnect();
      cardWatch.disconnect();
      window.removeEventListener('resize', scheduleBoard);
      queued = null;
      root.remove();
      document.body?.classList.remove(MATCH_ACTIVE_CLASS, MATCH_FINAL_CLASS);
      if (active === handle) active = null;
    },
    comment(line: string): void {
      addLine(line);
    },
    setCalls(made, paid): void {
      const mine = opts.mine;
      if (mine && made[mine] > calls.made[mine]) {
        // The commentary's line for the call (this tick), or one of ours if it had none.
        const line = untagged();
        if (line) line.dataset.kind = 'call';
        else if (pendingCall) addLine(`Your call: ${pendingCall}.`, 'call');
        pendingCall = null;
      }
      if (mine && paid[mine] > calls.paid[mine]) {
        const line = untagged();
        if (line) line.dataset.kind = 'call paid';
      }
      calls = { made: { ...made }, paid: { ...paid } };
      if (statsOpen) renderStats();
    },
    setTackle(count: number | null): void {
      tackleEl.hidden = count === null || finalClock !== null;
      const last = count === SET_TACKLES - 1;
      tackleEl.classList.toggle('nrl-mo-tackle-last', last);
      tackleEl.textContent = count === null ? '' : last ? `LAST TACKLE · ${SET_TACKLES}/${SET_TACKLES}` : `TACKLE ${count + 1}/${SET_TACKLES}`;
    },
    setClock(matchSeconds: number, half: 1 | 2 | 'gp'): void {
      liveClock = true;
      clockMin = (half === 'gp' ? 2 * halfMinutes * 60 + matchSeconds : matchSeconds) / 60;
      if (clockMin > nowMin) {
        nowMin = clockMin;
        if (nowMin - drawnAt >= MOMENTUM_STEP_MIN) drawMomentum();
      }
      // Full time keeps the clock and the label it had at the whistle, except while a replay
      // shows an earlier half. (After a Skip the paused sim still reports where it stopped.)
      if (finalClock !== null && !root.classList.contains('nrl-mo-replaying')) {
        clockEl.textContent = finalClock;
        tackleEl.hidden = true;
        halfEl.textContent = 'FT';
        return;
      }
      // Golden point (N9.4): its own clock from 00:00.
      clockEl.textContent = formatClockSeconds(matchSeconds, half === 'gp' ? 60 : 2 * halfMinutes);
      halfEl.textContent = half === 1 ? '1H' : half === 2 ? '2H' : 'GP';
    },
    offerReplay(onTap: () => void): void {
      clearReplayOffer();
      // Still offered after the siren: at ×8 the last try's eight seconds often include full time.
      // A small chip under the banner (#348 M5), not a big button over play.
      replayBtn = button('Replay try', () => {
        clearReplayOffer();
        onTap();
      }, { class: 'nrl-mo-replay' });
      replayCount = el('span', { class: 'nrl-mo-replay-count', attrs: { 'aria-hidden': 'true' } });
      replayBtn.append(replayCount);
      replayBtn.setAttribute('aria-label', 'Replay try');
      root.append(replayBtn);
      replayOffer = newReplayOffer();
      replayAt = performance.now();
      tickReplay();
      replayTimer = setInterval(tickReplay, 250);
    },
    noteReplayBlock(ms: number): void {
      root.setAttribute('data-replay-block', String(Math.max(0, Math.round(ms))));
    },
    setReplaying(on: boolean): void {
      root.classList.toggle('nrl-mo-replaying', on);
      replayTag?.remove();
      replayTag = null;
      statsNote.hidden = !on;
      if (on) {
        // The banner still shows the try. Hide it while the score bug is rewound, and bring it back if its time has not run out.
        banner.hidden = true;
        replayTag = el('div', { class: 'nrl-mo-replay-tag', text: 'REPLAY', attrs: { role: 'status' } });
        root.append(replayTag);
        return;
      }
      if (bannerTimer) banner.hidden = false;
    },
    setScore(h: number, a: number): void {
      showScore(h, a);
    },
    showLiveScore(): void {
      showScore(state.homeScore, state.awayScore);
    },
    slot(name) {
      return slots[name];
    },
    noteCall(label: string): void {
      pendingCall = label;
    },
    setTrayOpen(on: boolean): void {
      root.classList.toggle('nrl-mo-tray-open', on);
      // The Replay try chip steps out from over the tray at once, and back when it shuts (#348).
      tickReplay();
    },
    possession(): [number, number] {
      return possessionPct(state);
    },
  };
  // Full time: freeze on the final score; the full-time card (matchReport.ts) takes over.
  // The dock stays hidden until MatchScene destroys the overlay on Back to Club.
  offFinished = bus.on('match:finished', () => {
    offEvent();
    // Skip fires the whole log in one go: don't pop (or leave up) a stale
    // banner over the result. A natural finish keeps the last score's banner.
    queued = null;
    if (burst > 1) {
      if (bannerTimer) clearTimeout(bannerTimer);
      hideBanner();
    }
    tackleEl.hidden = true;
    halfEl.textContent = 'FT';
    finalClock = clockEl.textContent ?? '';
    root.classList.add('nrl-mo-final');
    document.body?.classList.add(MATCH_FINAL_CLASS);
  });

  active = handle;
  render();
  drawMomentum();
  return handle;
}

/** Tear down the current overlay if one is mounted (safe no-op otherwise). */
export function unmountMatchOverlay(): void {
  if (active) active.destroy();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The sparkline's drawing box; CSS stretches it to the score bug's width and 8px tall. */
const MOMENTUM_BOX = { width: 100, height: 12 };

/**
 * The momentum line under the score bug (#366): home's share filled above the middle in its colour, away's below in its;
 * the leaning side's tag at its newest end (#371), so who has it reads without the colours.
 */
function momentumLine(worn: { home: string; away: string }, tags: readonly [string, string]): { row: HTMLElement; draw: (samples: Parameters<typeof momentumShapes>[0], label: string) => void } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'nrl-mo-momentum');
  svg.setAttribute('viewBox', `0 0 ${MOMENTUM_BOX.width} ${MOMENTUM_BOX.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  const shape = (fill: string): SVGPolygonElement => {
    const p = document.createElementNS(SVG_NS, 'polygon');
    p.setAttribute('fill', fill);
    p.setAttribute('class', 'nrl-mo-momentum-fill');
    return p;
  };
  const homeShape = shape(worn.home);
  const awayShape = shape(worn.away);
  const axis = document.createElementNS(SVG_NS, 'line');
  axis.setAttribute('class', 'nrl-mo-momentum-axis');
  axis.setAttribute('x1', '0');
  axis.setAttribute('x2', String(MOMENTUM_BOX.width));
  axis.setAttribute('y1', String(MOMENTUM_BOX.height / 2));
  axis.setAttribute('y2', String(MOMENTUM_BOX.height / 2));
  svg.append(homeShape, awayShape, axis);
  const tag = el('span', { class: 'nrl-mo-momentum-tag', attrs: { 'aria-hidden': 'true' } });
  return {
    row: el('span', { class: 'nrl-mo-momentum-row' }, svg, tag),
    draw(samples, label): void {
      const sh = momentumShapes(samples, MOMENTUM_BOX.width, MOMENTUM_BOX.height);
      homeShape.setAttribute('points', sh.home);
      awayShape.setAttribute('points', sh.away);
      const leader = momentumLeader(samples);
      const text = leader === 'home' ? tags[0] : leader === 'away' ? tags[1] : '';
      if (tag.textContent !== text) tag.textContent = text;
      if (svg.getAttribute('aria-label') !== label) svg.setAttribute('aria-label', label);
    },
  };
}

function weatherWord(w: WeatherKind): string {
  return w === 'rain' ? 'Rain' : w === 'wind' ? 'Wind' : 'Clear';
}

const OVERLAY_STYLE_ID = 'nrl-match-overlay-styles';
/** The score bug's foot (px from the top), on <html>, for what hangs under it: the banner, the replay chip, the stats, the toasts. */
const BOARD_VAR = '--nrl-mo-board';
/** Body class set while a match overlay is mounted (see header). */
export const MATCH_ACTIVE_CLASS = 'nrl-match-active';
/** Body class added at full-time (alongside MATCH_ACTIVE_CLASS) until exit. */
export const MATCH_FINAL_CLASS = 'nrl-match-final';

/** Inject the match stylesheet once (the report and the full-time card share its stat rows). */
export function injectOverlayStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(OVERLAY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = OVERLAY_STYLE_ID;
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);
}

// Broadcast Quiet 3m–3r (docs/specs/ui-broadcast-quiet.md): navy chips over the
// pitch, inset 16 from the edges; Barlow for labels, Plex Mono for every number.
export const OVERLAY_CSS = `
.nrl-match-overlay { font-family: var(--nrl-f-body); color: var(--nrl-text); }
/* Match mode (live AND full time, until Back to Club): the dock steps aside. */
body.nrl-match-active .nrl-dock-wrap { display: none; }
.nrl-mo-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* Score bug (3m): per side a stripe in the colour it wears on the pitch, its code, its score; then the clock. */
.nrl-mo-scoreboard {
  position: fixed; top: calc(12px + var(--nrl-safe-t)); left: calc(16px + var(--nrl-safe-l)); z-index: 15;
  pointer-events: auto; cursor: pointer; display: flex; flex-direction: column; margin: 0; padding: 0; border: 0;
  border-radius: 8px; overflow: hidden; background: var(--nrl-navy); color: var(--nrl-text); box-shadow: var(--nrl-shadow-chip);
  font: inherit; text-align: left; -webkit-tap-highlight-color: transparent;
}
.nrl-mo-scoreboard:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-mo-scoreboard[aria-expanded="true"]::after { content: ''; position: absolute; inset: 0; border-radius: 8px; box-shadow: inset 0 0 0 2px var(--nrl-accent); pointer-events: none; }
.nrl-mo-tackle { display: flex; align-items: center; padding: 0 8px; font: 700 0.8125rem var(--nrl-f-label); line-height: 1.2; letter-spacing: 0.04em; white-space: nowrap; }
.nrl-mo-tackle[hidden] { display: none; }
@media (orientation: portrait) { .nrl-mo-tackle { display: none; } }
.nrl-mo-tackle-last { background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-mo-bug { display: flex; height: 44px; }
.nrl-mo-team { display: flex; align-items: stretch; }
.nrl-mo-stripe { flex: 0 0 6px; width: 6px; }
.nrl-mo-code { display: flex; align-items: center; padding: 0 10px; font-family: var(--nrl-f-label); font-size: 1.1875rem; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.nrl-mo-pts {
  display: flex; align-items: center; justify-content: center; min-width: 36px; padding: 0 2px; box-sizing: border-box;
  background: var(--nrl-raised); font-family: var(--nrl-f-num); font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums;
}
.nrl-mo-clockbox { display: flex; align-items: center; gap: 6px; padding: 0 10px; background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-mo-clock { font-family: var(--nrl-f-num); font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.nrl-mo-half { font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; min-width: 1.3em; }
/* The momentum line (#366), the team-colour split under the bug: home above the middle, away below. */
.nrl-mo-momentum-row { display: flex; align-items: center; background: var(--nrl-panel); }
.nrl-mo-momentum { display: block; flex: 1 1 auto; min-width: 0; height: 8px; }
/* The leaning side's tag at the line's newest end (#371); the same height when even, so the bug never jumps. */
.nrl-mo-momentum-tag { flex: 0 0 auto; min-width: 2.4em; height: 1.2em; padding: 0 4px; font-family: var(--nrl-f-label); font-size: 0.625rem; font-weight: 700; line-height: 1.2; letter-spacing: 0.04em; text-align: right; color: var(--nrl-text-2); }
.nrl-mo-momentum-fill { stroke: none; }
.nrl-mo-momentum-axis { stroke: rgba(255, 255, 255, 0.25); stroke-width: 1px; vector-effect: non-scaling-stroke; }
/* What a call did (#366): a tag over COACH for two seconds; it never takes a tap or moves the row. */
.nrl-mo-call-result {
  position: fixed; left: calc(16px + var(--nrl-safe-l)); bottom: calc(80px + var(--nrl-safe-b)); z-index: 20; pointer-events: none;
  max-width: calc(100vw - 32px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  padding: 8px 12px; border-radius: 10px; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-chip);
  font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--nrl-text-2);
  animation: nrl-mo-up 180ms ease-out;
}
.nrl-mo-call-result[data-paid] { color: var(--nrl-pos); }
.nrl-mo-tray-open ~ .nrl-mo-call-result, .nrl-mo-call-result[hidden] { display: none; }
/* Key moments (#366): the speed a break, a try or the last minutes hold the match at pulses in the pill; the chosen one stays yellow. */
.nrl-mo-controls .nrl-btn.nrl-mo-speed[data-slow] { box-shadow: inset 0 0 0 2px var(--nrl-accent); animation: nrl-mo-slow 0.9s ease-in-out infinite alternate; }
@keyframes nrl-mo-slow { from { color: var(--nrl-text); } to { color: var(--nrl-accent); } }
@media (prefers-reduced-motion: reduce) { .nrl-mo-call-result, .nrl-mo-controls .nrl-btn.nrl-mo-speed[data-slow] { animation: none; } }
/* The stats, opened from the score bug: the report's stat column (3t). Asked for, so over the banner. */
.nrl-mo-statsheet {
  position: fixed; top: calc(var(--nrl-mo-board, 60px) + 6px); left: calc(16px + var(--nrl-safe-l)); z-index: 19;
  width: min(340px, calc(100vw - 32px)); max-height: calc(100vh - var(--nrl-mo-board, 60px) - 94px); overflow-y: auto; box-sizing: border-box;
  padding: 8px 12px 10px; border-radius: 14px; background: var(--nrl-sheet); box-shadow: var(--nrl-shadow-tray); pointer-events: auto;
}
.nrl-mo-statsheet[hidden] { display: none; }
.nrl-mo-full-on .nrl-mo-statsheet { width: min(340px, calc(100vw - 32px - 342px)); }
.nrl-mo-stat-foot, .nrl-mo-stat-note { margin-top: 6px; font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-mo-stat-note { color: var(--nrl-accent); }
.nrl-mo-stat-note[hidden] { display: none; }
.nrl-mo-stattable { display: flex; flex-direction: column; }
.nrl-mo-stathead, .nrl-mo-statrow { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; gap: 8px; }
.nrl-mo-stathead { height: 22px; font-family: var(--nrl-f-label); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-mo-stathead > :nth-child(2) { text-align: center; }
.nrl-mo-stathead > :last-child, .nrl-mo-stat-a { text-align: right; }
.nrl-mo-statrow { height: 34px; border-top: 1px solid var(--nrl-button); font-family: var(--nrl-f-num); font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
.nrl-mo-stat-h { font-weight: 600; }
.nrl-mo-stat-mid { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.nrl-mo-stat-label { font-family: var(--nrl-f-body); font-size: 0.75rem; color: var(--nrl-text-2); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-mo-stat-bar { display: flex; height: 4px; border-radius: 2px; overflow: hidden; background: var(--nrl-line); }
.nrl-mo-stat-bar > i { display: block; height: 100%; }
.nrl-mo-stat-bar > i:last-child { flex: 1 1 auto; }
/* The commentary line (log = line): above the bottom row, centred; tap it for the full log. */
.nrl-mo-strip {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(78px + var(--nrl-safe-b)); z-index: 14;
  width: min(560px, calc(100vw - 32px)); min-height: 40px; display: flex; align-items: stretch; margin: 0; padding: 0; border: 0;
  border-radius: 8px; overflow: hidden; background: rgba(14, 22, 48, 0.95); color: var(--nrl-text); box-shadow: var(--nrl-shadow-chip);
  font: inherit; text-align: left; cursor: pointer; pointer-events: auto;
}
.nrl-mo-strip:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-mo-strip-live { display: flex; align-items: center; padding: 0 10px; background: var(--nrl-accent); color: var(--nrl-on-accent); font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.06em; }
/* #433: a long typed name wraps onto a second line (the strip grows up, clear of the
   bottom row) instead of running over FULL LOG. A third line still ends in an ellipsis. */
.nrl-mo-strip-text {
  flex: 1 1 auto; min-width: 0; align-self: center; padding: 4px 12px; font-size: 0.875rem; line-height: 1.25;
  white-space: normal; overflow: hidden; text-overflow: ellipsis; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
}
/* A narrow window (portrait width): a third line, then the fitter draws it smaller (#433). */
@media (max-width: 520px) {
  .nrl-mo-strip-text { -webkit-line-clamp: 3; }
}
.nrl-mo-strip-more { display: flex; align-items: center; padding: 0 12px; border-left: 1px solid var(--nrl-line); font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; color: var(--nrl-text-2); white-space: nowrap; }
.nrl-mo-line-wait { font-style: italic; opacity: 0.75; }
/* Log = full: the log on the right, filtered; log = hidden: neither. */
.nrl-mo-full {
  position: fixed; top: calc(12px + var(--nrl-safe-t)); right: calc(12px + var(--nrl-safe-r)); bottom: calc(80px + var(--nrl-safe-b)); z-index: 18;
  width: min(330px, calc(100vw - 24px)); box-sizing: border-box; padding: 10px 12px; border-radius: 14px;
  background: var(--nrl-sheet); box-shadow: var(--nrl-shadow-tray); display: flex; flex-direction: column; gap: 6px; pointer-events: auto;
  animation: nrl-mo-in-right 180ms ease-out;
}
.nrl-match-overlay:not([data-log="full"]) .nrl-mo-full,
.nrl-match-overlay:not([data-log="line"]) .nrl-mo-strip,
.nrl-mo-tray-open .nrl-mo-strip, .nrl-mo-stats-on .nrl-mo-strip { display: none; }
.nrl-mo-full-head { display: flex; align-items: center; justify-content: space-between; }
.nrl-mo-full-title { font-family: var(--nrl-f-label); font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-btn.nrl-mo-full-x { position: relative; width: 36px; min-width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; font-family: var(--nrl-f-body); font-size: 0.875rem; }
.nrl-mo-full-x::after { content: ''; position: absolute; inset: -4px; }
.nrl-mo-filters { display: flex; gap: 4px; }
.nrl-btn.nrl-mo-filter { position: relative; height: 30px; min-height: 30px; padding: 0 10px; border-radius: 6px; background: var(--nrl-raised); font-size: 0.8125rem; font-weight: 600; }
.nrl-btn.nrl-mo-filter[data-active], .nrl-btn.nrl-mo-filter[data-active]:hover:not(:disabled) { background: var(--nrl-accent); color: var(--nrl-on-accent); font-weight: 700; }
.nrl-mo-filter::after { content: ''; position: absolute; inset: -7px 0; } /* a 44px hit area */
.nrl-mo-feed { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; }
.nrl-mo-line { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 8px; padding: 5px 0; border-top: 1px solid var(--nrl-button); font-size: 0.75rem; line-height: 1.35; }
.nrl-mo-line-t { font-family: var(--nrl-f-num); color: var(--nrl-muted); font-variant-numeric: tabular-nums; }
.nrl-mo-line[data-kind~="try"] .nrl-mo-line-text { color: var(--nrl-accent); font-weight: 600; }
.nrl-mo-line[data-kind~="call"] .nrl-mo-line-text { color: var(--nrl-pos); font-weight: 500; }
.nrl-mo-full[data-filter="scoring"] .nrl-mo-line:not([data-kind~="score"]),
.nrl-mo-full[data-filter="calls"] .nrl-mo-line:not([data-kind~="call"]) { display: none; }
/* A filter with nothing under it says so (#414). */
.nrl-mo-log-empty { display: none; padding: 5px 0; border-top: 1px solid var(--nrl-button); font-size: 0.75rem; line-height: 1.35; color: var(--nrl-muted); }
.nrl-mo-full[data-filter="scoring"]:not(:has(.nrl-mo-line[data-kind~="score"])) .nrl-mo-log-empty[data-for="scoring"],
.nrl-mo-full[data-filter="calls"]:not(:has(.nrl-mo-line[data-kind~="call"])) .nrl-mo-log-empty[data-for="calls"] { display: block; }
/* Bottom row (3m): COACH · LOG · Plan · … · the speed pill. It never shifts. */
.nrl-mo-bar {
  position: fixed; left: calc(16px + var(--nrl-safe-l)); right: calc(16px + var(--nrl-safe-r)); bottom: calc(12px + var(--nrl-safe-b)); z-index: 20;
  display: flex; align-items: center; gap: 8px; pointer-events: none;
}
.nrl-mo-slot { display: flex; align-items: center; gap: 8px; }
.nrl-mo-slot:empty { display: none; }
.nrl-mo-bar-gap { flex: 1 1 auto; }
.nrl-mo-log-toggle, .nrl-mo-coach {
  pointer-events: auto; height: 56px; display: flex; align-items: center; margin: 0; border: 0; border-radius: 14px;
  background: var(--nrl-navy); color: var(--nrl-text); box-shadow: var(--nrl-shadow-chip); cursor: pointer; -webkit-tap-highlight-color: transparent;
  font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.04em; white-space: nowrap;
}
.nrl-mo-log-toggle:focus-visible, .nrl-mo-coach:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-mo-log-toggle { gap: 8px; padding: 0 14px; font-size: 1rem; }
.nrl-mo-log-toggle[aria-pressed="false"] { color: var(--nrl-text-2); }
.nrl-mo-switch { width: 28px; height: 16px; border-radius: 8px; background: var(--nrl-line); display: flex; align-items: center; padding: 0 2px; box-sizing: border-box; transition: background 0.15s ease; }
.nrl-mo-switch > i { width: 12px; height: 12px; border-radius: 6px; background: #fff; transition: transform 0.15s ease; }
.nrl-mo-log-toggle[aria-pressed="true"] .nrl-mo-switch { background: var(--nrl-accent); }
.nrl-mo-log-toggle[aria-pressed="true"] .nrl-mo-switch > i { transform: translateX(12px); }
/* COACH (MatchScene): its badge says how many calls are on, or why none ("THEIR BALL"). */
.nrl-mo-coach { gap: 10px; padding: 0 8px 0 16px; font-size: 1.1875rem; }
.nrl-mo-coach-badge {
  height: 36px; display: flex; align-items: center; padding: 0 10px; border-radius: 8px; font-size: 0.9375rem; text-transform: uppercase;
  background: var(--nrl-raised); color: var(--nrl-muted);
}
.nrl-mo-coach-badge[data-state="on"] { background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-mo-coach-badge[data-state="made"] { color: var(--nrl-accent); }
.nrl-mo-coach[aria-expanded="true"] { padding: 0 16px; background: var(--nrl-button); box-shadow: inset 0 0 0 2px var(--nrl-accent); }
.nrl-mo-coach[aria-expanded="true"] .nrl-mo-coach-badge { display: none; }
/* The coach tray (3o): only the calls on now; the match keeps playing. #396: at most five rows
   (six buttons), as tiles two a line (three on a short wide phone), so it never scrolls. */
.nrl-mo-tray {
  position: fixed; left: calc(16px + var(--nrl-safe-l)); bottom: calc(80px + var(--nrl-safe-b)); z-index: 21;
  width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 88px - var(--nrl-mo-board, 60px)); overflow-y: auto; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 14px; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-tray);
  pointer-events: auto; animation: nrl-mo-up 180ms ease-out;
}
.nrl-mo-tray[hidden] { display: none; }
/* The tray and the full log side by side: the log gives way on a narrow phone (667px) rather than sit under the tray. */
.nrl-mo-tray-open .nrl-mo-full { width: min(330px, calc(100vw - 32px - 360px - 8px - var(--nrl-safe-l) - var(--nrl-safe-r))); }
.nrl-mo-tray-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: row dense; gap: 6px; }
/* A pair (#396: Shift ◀ ▶, Take the two / Tap and go) is one row: two tiles that stay together. */
.nrl-mo-tray-pair { grid-column: span 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.nrl-mo-tray-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.nrl-mo-tray-title { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-mo-tray-note { font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-btn.nrl-mo-tray-call {
  min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 1px; height: 44px; padding: 0 10px;
  border-radius: 8px; text-transform: none; letter-spacing: 0; text-align: left; overflow: hidden;
}
.nrl-mo-tray-call b { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-family: var(--nrl-f-label); font-size: 0.9375rem; font-weight: 700; line-height: 1.1; }
.nrl-mo-tray-call span {
  max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  font-family: var(--nrl-f-body); font-size: 0.75rem; font-weight: 400; line-height: 1.2; color: var(--nrl-text-2);
}
/* A locked call (the Coach's Office hasn't unlocked it): greyed, outlined rather than filled, its level as a
   small tag. aria-disabled, not disabled, so a tap can say what unlocks it; it never makes the call. */
.nrl-btn.nrl-mo-tray-call.nrl-mo-tray-locked { background: transparent; box-shadow: inset 0 0 0 1px var(--nrl-line); color: var(--nrl-muted); cursor: default; }
.nrl-btn.nrl-mo-tray-call.nrl-mo-tray-locked:hover { background: transparent; }
.nrl-mo-tray-locked span { color: var(--nrl-muted); font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.6875rem; }
/* #432: at Large and Larger the tray grows wider, so each caption still fits on one
   line inside the 44px tile (Normal is untouched). A short phone is already three
   a line across the screen, so there the caption draws a little smaller — still
   bigger than Normal — and may use a second line rather than end in an ellipsis.
   The footer keeps its one line on a short phone (#396). On a 375-tall phone at
   Large and Larger it keeps every line: three columns free a row so it need not shrink. */
.nrl-mo-tray-none { grid-column: 1 / -1; padding: 6px 0; font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-mo-tray-foot { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 0.75rem; line-height: 1.3; color: var(--nrl-muted); }
.nrl-mo-tray-foot:empty { display: none; }
/* A short wide phone (956×330): three tiles a line in a wider tray, so six fit in two. */
@media (max-height: 360px) and (min-width: 760px) {
  .nrl-mo-tray { width: min(540px, calc(100vw - 32px)); }
  .nrl-mo-tray-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .nrl-mo-tray-open .nrl-mo-full { width: min(330px, calc(100vw - 32px - 540px - 8px - var(--nrl-safe-l) - var(--nrl-safe-r))); }
}
/* A short narrow phone (568×320, 640×360; #403 review): three a line as well, the tray as wide as the
   screen allows, so a full tray (a pair and four, at Larger text) is two lines and never scrolls. No
   room for the full log beside it: the log gives way while the tray is open. */
@media (max-height: 360px) and (max-width: 759px) {
  .nrl-mo-tray { width: min(540px, calc(100vw - 32px - var(--nrl-safe-l) - var(--nrl-safe-r))); }
  .nrl-mo-tray-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .nrl-mo-tray-open .nrl-mo-full { display: none; }
}
/* Any short phone (#403 review): a little less padding, and the footer one line that never shrinks
   away (its "+2 more" comes first), so at Larger text a full tray keeps its footer as well. */
@media (max-height: 360px) {
  .nrl-mo-tray { gap: 4px; padding: 6px 12px; }
  .nrl-mo-tray-foot { flex-shrink: 0; -webkit-line-clamp: 1; }
  html[data-text-size] .nrl-btn.nrl-mo-tray-call { height: auto; min-height: 44px; padding: 2px 8px; }
  html[data-text-size] .nrl-mo-tray-call span { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  html[data-text-size="larger"] .nrl-mo-tray-call span { font-size: 0.64rem; }
}
@media (min-height: 361px) {
  html[data-text-size] .nrl-mo-tray { width: min(480px, calc(100vw - 32px - var(--nrl-safe-l) - var(--nrl-safe-r))); }
  html[data-text-size] .nrl-mo-tray-open .nrl-mo-full { width: min(330px, calc(100vw - 32px - 480px - 8px - var(--nrl-safe-l) - var(--nrl-safe-r))); }
  html[data-text-size] .nrl-mo-tray-foot { -webkit-line-clamp: 4; }
}
/* 667×375 and 844×390 at Large and Larger (#432): two columns of 44px tiles leave the
   footer to shrink under the tray's max height, so a 4-line clamp still ellipsizes
   inside one leftover line. Three columns drop a row. The footer then keeps every
   line (it does not shrink), the captions still fit one line in the wider tray, and
   a full tray does not scroll. The log gives way while the tray is open. Shorter
   phones (568×320, 956×330) stay on the one-line footer. */
@media (min-height: 361px) and (max-height: 400px) {
  html[data-text-size] .nrl-mo-tray {
    width: min(640px, calc(100vw - 32px - var(--nrl-safe-l) - var(--nrl-safe-r)));
    gap: 4px;
    padding: 6px 10px;
  }
  html[data-text-size] .nrl-mo-tray-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  html[data-text-size] .nrl-mo-tray-open .nrl-mo-full { display: none; }
  html[data-text-size] .nrl-mo-tray-foot {
    flex-shrink: 0;
    display: block;
    overflow: visible;
    -webkit-line-clamp: unset;
  }
}
/* A narrow window (a phone upright, where a fine pointer still shows the match): two
   columns are too slim for the longest caption, at Normal as well as Large. The caption
   wraps to a second line and the tile grows; a wide phone is unchanged. */
@media (max-width: 520px) {
  .nrl-btn.nrl-mo-tray-call { height: auto; min-height: 44px; padding: 3px 8px; }
  .nrl-mo-tray-call span { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
}
/* The speed pill (MatchScene): pause, the speeds (the one playing a yellow circle), SKIP. */
.nrl-mo-controls {
  pointer-events: auto; height: 56px; display: flex; align-items: center; gap: 2px; padding: 0 6px; box-sizing: border-box;
  border-radius: 28px; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-chip);
}
/* Every button a 44×44 target (#389: the speeds were 40 wide, 36 on a narrow phone and 34 at Larger text). */
.nrl-mo-controls .nrl-btn {
  width: 44px; min-width: 44px; height: 44px; min-height: 44px; padding: 0; border-radius: 22px; background: transparent;
  color: var(--nrl-text-2); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0; text-transform: none;
}
.nrl-mo-controls .nrl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
.nrl-mo-controls .nrl-btn.nrl-mo-pause { width: 44px; color: var(--nrl-text); font-size: 0.8125rem; }
.nrl-mo-controls .nrl-btn.nrl-mo-speed[aria-pressed="true"], .nrl-mo-controls .nrl-btn.nrl-mo-speed[aria-pressed="true"]:hover:not(:disabled) { background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-mo-pill-div { width: 1px; height: 28px; margin: 0 4px; background: var(--nrl-line); }
.nrl-mo-controls .nrl-btn.nrl-mo-skip { width: auto; padding: 0 12px; color: var(--nrl-text); letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-mo-controls .nrl-btn.nrl-mo-skip[data-armed] { color: var(--nrl-accent); }
.nrl-mo-tray-open .nrl-mo-controls .nrl-mo-speed:not([aria-pressed="true"]), .nrl-mo-tray-open .nrl-mo-pill-div { display: none; }
/* The Plan chip after a try (N11): opens the plan sheet. */
.nrl-btn.nrl-mo-planchip { height: 56px; min-height: 56px; padding: 0 16px; border-radius: 14px; background: var(--nrl-navy); color: var(--nrl-accent); font-size: 1.1875rem; box-shadow: var(--nrl-shadow-chip); }
.nrl-mo-planchip[hidden] { display: none; }
@media (max-width: 720px) {
  .nrl-mo-controls .nrl-btn.nrl-mo-skip { padding: 0 8px; }
  /* The speeds keep 44 (#389): while the Plan chip is up after a try, the pill shows only the speed
     playing, as with the coach tray open, so the row stays one line with the longest badge. */
  .nrl-mo-bar:has(.nrl-mo-planchip:not([hidden])) .nrl-mo-controls .nrl-mo-speed:not([aria-pressed="true"]),
  .nrl-mo-bar:has(.nrl-mo-planchip:not([hidden])) .nrl-mo-pill-div { display: none; }
  .nrl-mo-coach { padding: 0 6px 0 12px; gap: 8px; }
  .nrl-mo-log-toggle { padding: 0 12px; }
}
/* Large and Larger text (#371) on a narrow phone: the row keeps to one line with the Plan chip up,
   on tighter padding; at Larger a smaller LOG switch and coach badge too (the speeds keep 44, #389). */
@media (max-width: 720px) {
  html[data-text-size] .nrl-mo-bar, html[data-text-size] .nrl-mo-slot { gap: 6px; }
  html[data-text-size] .nrl-mo-coach { padding: 0 4px 0 10px; gap: 6px; }
  html[data-text-size] .nrl-mo-coach[aria-expanded="true"] { padding: 0 10px; }
  html[data-text-size] .nrl-mo-coach-badge { padding: 0 6px; }
  html[data-text-size] .nrl-mo-log-toggle { padding: 0 8px; gap: 6px; }
  html[data-text-size] .nrl-btn.nrl-mo-planchip { padding: 0 10px; }
  html[data-text-size] .nrl-mo-controls { padding: 0 4px; }
  html[data-text-size] .nrl-mo-controls .nrl-btn.nrl-mo-skip { padding: 0 6px; }
  html[data-text-size] .nrl-mo-pill-div { margin: 0 2px; }
  html[data-text-size="larger"] .nrl-mo-coach-badge { font-size: 0.875rem; }
  html[data-text-size="larger"] .nrl-mo-switch { width: 22px; height: 14px; }
  html[data-text-size="larger"] .nrl-mo-switch > i { width: 10px; height: 10px; }
  html[data-text-size="larger"] .nrl-mo-log-toggle[aria-pressed="true"] .nrl-mo-switch > i { transform: translateX(8px); }
}
/* Key-moment banner (3n): under the score bug, about three seconds; never blocks taps. */
.nrl-mo-banner {
  position: fixed; top: calc(var(--nrl-mo-board, 60px) + 6px); left: calc(16px + var(--nrl-safe-l)); z-index: 17;
  height: 56px; max-width: calc(100vw - 32px); display: flex; border-radius: 8px; overflow: hidden;
  background: var(--nrl-navy); color: var(--nrl-text); box-shadow: var(--nrl-shadow-tray); pointer-events: none;
}
.nrl-mo-banner[hidden] { display: none; }
.nrl-mo-banner-head {
  display: flex; align-items: center; padding: 0 16px; background: var(--nrl-accent); color: var(--nrl-on-accent);
  font-family: var(--nrl-f-label); font-size: 2.125rem; font-weight: 700; font-style: italic; white-space: nowrap;
}
.nrl-mo-banner-long .nrl-mo-banner-head { font-size: 1.625rem; }
.nrl-mo-banner[data-tone="miss"] .nrl-mo-banner-head { background: var(--nrl-raised); color: var(--nrl-muted); }
.nrl-mo-banner[data-tone="bin"] .nrl-mo-banner-head { background: var(--nrl-neg); }
.nrl-mo-banner-text { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 0; padding: 0 16px; }
.nrl-mo-banner-who { font-family: var(--nrl-f-label); font-size: 1.25rem; font-weight: 700; line-height: 1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-mo-banner-sub { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-mo-banner-extra { color: var(--nrl-accent); }
.nrl-mo-banner-in { animation: nrl-mo-in-left 150ms ease-out both; }
/* Points: the scoring side's box flashes. */
.nrl-mo-scored { animation: nrl-mo-scored 1.2s ease-out; }
@keyframes nrl-mo-scored { 0%, 35% { background: var(--nrl-accent); color: var(--nrl-on-accent); } 100% { background: var(--nrl-raised); } }
@keyframes nrl-mo-in-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
@keyframes nrl-mo-in-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
@keyframes nrl-mo-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
/* Replay (N15.5, #348 M5): a small chip under the banner, its seconds left beside it. Never
   centred with a transform: the pressed nudge (.nrl-btn:active) would replace it. */
.nrl-mo-replay, .nrl-mo-replay-tag {
  position: fixed; left: calc(16px + var(--nrl-safe-l)); top: calc(var(--nrl-mo-board, 60px) + 70px);
  z-index: 26; pointer-events: auto; min-height: 44px;
}
.nrl-btn.nrl-mo-replay { display: inline-flex; align-items: center; gap: 8px; padding: 0 8px 0 14px; border-radius: 12px; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-chip); }
.nrl-mo-replay[hidden] { display: none; }
/* Never over the open coach tray (#348): it waits, hidden, for the tray to shut. */
.nrl-mo-tray-open .nrl-mo-replay { display: none; }
.nrl-mo-replay-count {
  display: inline-grid; place-items: center; min-width: 26px; height: 26px; border-radius: 6px; box-sizing: border-box;
  background: var(--nrl-raised); color: var(--nrl-accent); font-family: var(--nrl-f-num); font-size: 0.8125rem; font-weight: 600;
}
.nrl-mo-replay-tag {
  display: grid; place-items: center; box-sizing: border-box; pointer-events: none; padding: 0 14px; border-radius: 12px;
  background: var(--nrl-accent); color: var(--nrl-on-accent); box-shadow: var(--nrl-shadow-chip);
  font-family: var(--nrl-f-label); font-size: 1.0625rem; font-weight: 700; letter-spacing: 0.08em;
}
/* Full time: the full-time card (matchReport.ts) takes over; the controls and the commentary go. */
.nrl-mo-final .nrl-mo-bar, .nrl-mo-final .nrl-mo-strip, .nrl-mo-final .nrl-mo-full { display: none; }
/* The plan sheet (3r) and the pause sheet: over the dimmed field, above every match control
   and the toasts, under a dialog. The plan sheet waits for its primary (#341). */
.nrl-mo-plan, .nrl-mo-sheet { position: fixed; inset: 0; z-index: 65; display: flex; pointer-events: auto; background: rgba(5, 9, 22, 0.5); }
.nrl-mo-plan { align-items: flex-end; justify-content: center; }
.nrl-mo-plan-sheet {
  width: 100%; max-width: 1180px; min-height: min(296px, 100%); max-height: 100%; overflow: hidden; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 10px;
  padding: 10px calc(24px + var(--nrl-safe-r)) calc(16px + var(--nrl-safe-b)) calc(24px + var(--nrl-safe-l));
  border-radius: 22px 22px 0 0; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-modal); animation: nrl-mo-up 180ms ease-out;
}
.nrl-mo-plan-grab { flex: 0 0 auto; align-self: center; width: 40px; height: 4px; border-radius: 2px; background: var(--nrl-line); }
.nrl-mo-plan-top { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
.nrl-mo-plan-head { font-family: var(--nrl-f-label); font-size: 1.5rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-mo-plan-score { font-family: var(--nrl-f-num); font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.nrl-mo-plan-line { font-size: 0.8125rem; color: var(--nrl-text-2); }
.nrl-mo-plan-tend { margin-left: auto; font-size: 0.75rem; color: var(--nrl-muted); }
.nrl-mo-plan-top, .nrl-mo-plan-grab { flex: 0 0 auto; }
/* On a short screen the rows scroll and the foot with the primary stays put (#341). */
.nrl-mo-plan-rows { flex: 0 1 auto; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: center; gap: 8px 12px; }
.nrl-mo-plan-label { font-family: var(--nrl-f-label); font-size: 0.875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-mo-plan .nrl-seg { display: flex; gap: 4px; padding: 4px; overflow: visible; }
.nrl-mo-plan .nrl-seg > .nrl-btn { flex: 1 1 0; min-width: 0; height: 40px; min-height: 40px; padding: 0 6px; font-size: 1.0625rem; font-weight: 600; letter-spacing: 0.02em; text-transform: none; }
.nrl-mo-plan .nrl-seg > .nrl-btn[aria-pressed="true"] { font-weight: 700; }
@media (pointer: coarse) { .nrl-mo-plan .nrl-seg > .nrl-btn { height: 44px; min-height: 44px; } }
.nrl-mo-plan-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: 4px; }
.nrl-mo-plan-hint { flex: 1 1 auto; min-width: 0; font-size: 0.8125rem; line-height: 1.4; color: var(--nrl-text-2); }
.nrl-btn.nrl-mo-plan-go { flex: 0 0 auto; height: 48px; padding: 0 24px; font-size: 1.1875rem; }
.nrl-mo-sheet { align-items: center; justify-content: center; }
.nrl-mo-sheet-card {
  position: relative; width: min(340px, calc(100vw - 32px)); max-height: calc(100% - 24px); overflow-y: auto; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 6px; padding: 16px 18px 18px; border-radius: 18px; background: var(--nrl-navy); box-shadow: var(--nrl-shadow-modal);
  animation: nrl-mo-up 180ms ease-out;
}
.nrl-mo-sheet-head { padding-right: 44px; font-family: var(--nrl-f-label); font-size: 1.375rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); }
.nrl-btn.nrl-mo-sheet-x { position: absolute; top: 10px; right: 10px; width: 36px; min-width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; font-family: var(--nrl-f-body); font-size: 0.9375rem; }
.nrl-mo-sheet-x::after { content: ''; position: absolute; inset: -4px; }
.nrl-mo-sheet-line { font-size: 0.875rem; color: var(--nrl-text-2); }
.nrl-mo-sheet-score { font-family: var(--nrl-f-num); font-weight: 600; color: var(--nrl-text); }
.nrl-mo-sheet-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.nrl-mo-sheet-actions .nrl-btn { width: 100%; height: 48px; font-size: 1.125rem; }
@media (max-height: 430px) {
  .nrl-mo-sheet-card { width: min(460px, calc(100vw - 32px)); }
  .nrl-mo-sheet-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .nrl-mo-sheet-actions .nrl-btn:first-child { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .nrl-mo-banner-in, .nrl-mo-scored, .nrl-mo-full, .nrl-mo-tray, .nrl-mo-plan-sheet, .nrl-mo-sheet-card { animation: none; }
}
`;
