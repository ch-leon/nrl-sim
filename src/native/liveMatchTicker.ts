// src/native/liveMatchTicker.ts — what the iPhone's Live Activity shows for the match
// you are playing (docs/specs/ios.md §3 (a), the local ticker; Phase 3). Pure: no DOM,
// no Capacitor. src/native/liveMatch.ts feeds it the bus's match events and sends what
// it returns to the Swift plugin (ios/App/App/LiveActivity/LiveMatchPlugin.swift).
//
// The score is totalled by the match overlay's own reducer (reduceEvent), so the lock
// screen and the score bug can never disagree. The minute is the one the last update
// carried, not a running clock: the match clock stops and starts and the playback
// speed varies, and nothing on the lock screen may tick by itself (§6, nothing timed).
//
// The shapes here are the Swift side's MatchActivityAttributes and its ContentState
// (ios/App/Shared/MatchActivityAttributes.swift), field for field. Change one, change both.

import type { MatchEvent, MatchEventKind, MatchResult, TeamSheet } from '../sim/events';
import { initLiveState, reduceEvent, scoreBanner, teamCodes, type LiveState } from '../ui/screens/matchOverlay';
import { COLOR_TOKENS } from '../ui/tokens';

// The unions as values too, so tests/native/liveMatchContract.test.ts can hold them to the
// Swift enums' raw values (a mismatch is a silent decode failure on the phone).

/**
 * Live while the match plays; paused is set natively when the app goes to the background.
 * half-time is also the break before golden point (with half 'golden').
 */
export const TICKER_STATES = ['live', 'paused', 'half-time', 'full-time'] as const;
export type TickerState = (typeof TICKER_STATES)[number];
/** The captain's pose: the Live Activity shows the matching picture (ios/App/BigCoachWidgets/MatchLiveActivity.swift). */
export const TICKER_POSES = ['carry', 'try', 'tackle', 'fulltime'] as const;
export type TickerPose = (typeof TICKER_POSES)[number];
export const TICKER_HALVES = ['first', 'second', 'golden'] as const;
export type TickerHalf = (typeof TICKER_HALVES)[number];
export const TICKER_SIDES = ['home', 'away'] as const;

/** What never changes during the match (ActivityAttributes). */
export interface TickerAttributes {
  homeCode: string;
  awayCode: string;
  /** The player's side: starred, as the score bug stars it. */
  mine: 'home' | 'away';
  /** Each club's first colour, as #rrggbb. */
  homeColor: string;
  awayColor: string;
}

/** What each update carries (ActivityAttributes.ContentState). */
export interface TickerContent {
  homeScore: number;
  awayScore: number;
  half: TickerHalf;
  /** The match minute of the last event before this update (the HUD clock's minute). */
  minute: number;
  /** "2nd half 4'", "Half-time", "Golden point 1'", "Full time". */
  clock: string;
  /** The last big moment, one line ("TRY, Walker (BRI) 3'"). */
  moment: string;
  state: TickerState;
  pose: TickerPose;
}

/** Full time only: lights the screen (§6 Q9). Every other update is silent. */
export interface TickerAlert {
  title: string;
  body: string;
}

export interface Ticker {
  homeId: string;
  halfMinutes: number;
  attributes: TickerAttributes;
  content: TickerContent;
  /** The overlay's running state: the score comes from here. */
  live: LiveState;
  /** The latest event's match minute (the events' own clock, both halves and golden point). */
  rawMinute: number;
  /** Half-time whistles heard: the second one is golden point (N9.4). */
  whistles: number;
  /** The full-time alert has gone; it never goes twice. */
  alerted: boolean;
}

/** One update to send, or none. */
export interface TickerUpdate {
  content: TickerContent;
  alert: TickerAlert | null;
}

/** The longest moment line: the lock screen has one line for it. */
export const MOMENT_MAX = 48;

/** The kinds that are worth an update by themselves (spec §3 (a)). */
const BIG: ReadonlySet<MatchEventKind> = new Set<MatchEventKind>([
  'try', 'conversion', 'penalty-goal', 'field-goal', 'big-hit', 'sin-bin', 'half-time', 'full-time',
]);

const HEX = /^#[0-9a-f]{6}$/i;

/** The start of a ticker for a match the player is in; null for one he is not in (he has no side). */
export function startTicker(
  m: { home: Pick<TeamSheet, 'clubId' | 'name' | 'colors'>; away: Pick<TeamSheet, 'clubId' | 'name' | 'colors'>; mine?: 'home' | 'away' | undefined },
  halfMinutes: number,
): Ticker | null {
  if (m.mine !== 'home' && m.mine !== 'away') return null;
  const [homeCode, awayCode] = teamCodes(m.home.name, m.away.name);
  const colour = (c: string | undefined, fallback: string): string => (c && HEX.test(c) ? c.toLowerCase() : fallback);
  return {
    homeId: m.home.clubId,
    halfMinutes,
    attributes: {
      homeCode,
      awayCode,
      mine: m.mine,
      homeColor: colour(m.home.colors[0], COLOR_TOKENS.home),
      awayColor: colour(m.away.colors[0], COLOR_TOKENS.away),
    },
    content: { homeScore: 0, awayScore: 0, half: 'first', minute: 0, clock: clockLabel('live', 'first', 0), moment: 'Kick-off', state: 'live', pose: 'carry' },
    live: initLiveState(),
    rawMinute: 0,
    whistles: 0,
    alerted: false,
  };
}

/** The clock line: the half and the minute as of this update, or the break it is at. */
export function clockLabel(state: TickerState, half: TickerHalf, minute: number): string {
  if (state === 'full-time') return 'Full time';
  if (state === 'half-time') return half === 'golden' ? 'Golden point next' : 'Half-time';
  const m = `${Math.max(0, Math.floor(minute))}'`;
  return half === 'first' ? `1st half ${m}` : half === 'second' ? `2nd half ${m}` : `Golden point ${m}`;
}

/** The pose an event leaves the captain in: diving for a try, wrapped up after a big hit, arms up at full time. */
export function poseFor(kind: MatchEventKind): TickerPose {
  return kind === 'try' ? 'try' : kind === 'big-hit' ? 'tackle' : kind === 'full-time' ? 'fulltime' : 'carry';
}

/** One line, cut to fit. */
function fit(line: string): string {
  return line.length <= MOMENT_MAX ? line : `${line.slice(0, MOMENT_MAX - 1).trimEnd()}…`;
}

/** The moment line for a big event, or null for one that has none of its own (a whistle, a kick-off). */
export function momentLine(t: Ticker, ev: MatchEvent, minute: number): string | null {
  const code = ev.teamId === t.homeId ? t.attributes.homeCode : t.attributes.awayCode;
  const name = ev.player?.trim();
  const at = name ? `${name} (${code}) ${minute}'` : `${code} ${minute}'`;
  // The overlay's own banner words: TRY!, CONVERTED, PENALTY GOAL MISSED, FIELD GOAL! …
  const b = scoreBanner(ev, t.homeId, [code, code]);
  if (b) return fit(`${b.headline.replace(/!$/, '')}, ${at}`);
  if (ev.kind === 'big-hit') return fit(`BIG HIT, ${at}`);
  if (ev.kind === 'sin-bin') return fit(`SIN BIN, ${at}`);
  return null;
}

/** The full-time line and alert: who won, or a draw. */
function fullTime(t: Ticker, home: number, away: number, golden: boolean): { moment: string; alert: TickerAlert } {
  const { homeCode, awayCode } = t.attributes;
  const winner = home > away ? homeCode : away > home ? awayCode : null;
  const moment = winner ? `${winner} win${golden ? ' in golden point' : ''}` : 'A draw';
  return { moment, alert: { title: 'Full time', body: `${homeCode} ${home} – ${away} ${awayCode}. ${moment}.` } };
}

/**
 * Fold one event in. Returns the new ticker and whether this event alone is worth an
 * update (a big moment, or a change of state such as the second half's kick-off).
 * Events after full time change nothing.
 */
export function foldEvent(t: Ticker, ev: MatchEvent): { ticker: Ticker; matters: boolean; alert: TickerAlert | null } {
  if (t.content.state === 'full-time') return { ticker: t, matters: false, alert: null };
  const live = reduceEvent(t.live, ev, t.homeId, t.halfMinutes);
  const rawMinute = Math.max(t.rawMinute, Math.floor(ev.t));
  let { half, moment, pose } = t.content;
  let state: TickerState = t.content.state;
  let whistles = t.whistles;
  let alerted = t.alerted;
  let alert: TickerAlert | null = null;
  let matters = BIG.has(ev.kind);

  switch (ev.kind) {
    case 'half-time':
      whistles++;
      if (whistles === 1) {
        state = 'half-time';
        half = 'second';
      } else {
        // A drawn final's second whistle (N9.4): a break, then golden point (next score wins).
        // The sim kicks golden point off with a 'kickoff' event, which makes it live.
        state = 'half-time';
        half = 'golden';
        moment = 'GOLDEN POINT, next score wins';
      }
      pose = 'carry';
      break;
    case 'kickoff':
      // The second half (or golden point) is under way: no longer at the break. The live
      // sim emits a kickoff at each restart after a whistle (src/match/league/live/kicks.ts).
      if (state === 'half-time') {
        state = 'live';
        matters = true;
      }
      break;
    case 'full-time': {
      state = 'full-time';
      pose = 'fulltime';
      const ft = fullTime(t, live.homeScore, live.awayScore, ev.detail === 'golden-point' || half === 'golden');
      moment = ft.moment;
      if (!alerted) {
        alert = ft.alert;
        alerted = true;
      }
      break;
    }
    default:
      if (!matters) break;
      moment = momentLine(t, ev, shownMinute(t.halfMinutes, half, rawMinute)) ?? moment;
      pose = poseFor(ev.kind);
  }

  const minute = shownMinute(t.halfMinutes, half, rawMinute);
  const content: TickerContent = {
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    half,
    minute,
    clock: clockLabel(state, half, minute),
    moment,
    state,
    pose,
  };
  return { ticker: { ...t, live, rawMinute, whistles, alerted, content }, matters, alert };
}

/** The minute shown: the match minute, or golden point's own from 0 (as the HUD's clock restarts). */
function shownMinute(halfMinutes: number, half: TickerHalf, rawMinute: number): number {
  return half === 'golden' ? Math.max(0, Math.floor(rawMinute - 2 * halfMinutes)) : rawMinute;
}

/**
 * Fold a burst of events that arrived together (one tick; or Skip to full time and a
 * resumed match's catch-up, which arrive in one go) into at most one update: the state
 * at the end of the burst. Skip therefore sends one update, the final whistle's, with
 * its alert.
 */
export function foldBurst(t: Ticker, events: readonly MatchEvent[]): { ticker: Ticker; update: TickerUpdate | null } {
  let ticker = t;
  let matters = false;
  let alert: TickerAlert | null = null;
  for (const ev of events) {
    const r = foldEvent(ticker, ev);
    ticker = r.ticker;
    matters ||= r.matters;
    alert ??= r.alert;
  }
  return { ticker, update: matters ? { content: ticker.content, alert } : null };
}

/**
 * Full time from the result itself ('match:finished'), when the whistle's event did not
 * reach the ticker: the result's score, full time, the alert if it has not gone.
 * Null when the ticker is already at full time.
 */
export function finishTicker(t: Ticker, result: Pick<MatchResult, 'homeScore' | 'awayScore' | 'events'>): { ticker: Ticker; update: TickerUpdate | null } {
  if (t.content.state === 'full-time') return { ticker: t, update: null };
  const golden = t.content.half === 'golden' || result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const ft = fullTime(t, result.homeScore, result.awayScore, golden);
  const content: TickerContent = {
    ...t.content,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    state: 'full-time',
    pose: 'fulltime',
    moment: ft.moment,
    clock: clockLabel('full-time', t.content.half, t.content.minute),
  };
  const alert = t.alerted ? null : ft.alert;
  return { ticker: { ...t, content, alerted: true }, update: { content, alert } };
}
