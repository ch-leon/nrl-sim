// src/ui/screens/matchOverlay.ts — match scoreboard / stats / commentary overlay
// (BAK-196, WU-12). DOM-only (ARCHITECTURE §1.6), mounted into #ui-root when the
// Match scene starts and removed on 'match:finished' / scene exit.
//
// The running score/stats are derived PURELY from the re-emitted 'match:event'
// stream via `reduceEvent` (a pure reducer extracted so it is unit-testable
// without a DOM). At full-time the accumulated score/tries/errors match
// MatchResult exactly; possession/tackles are self-consistent (possession is the
// tackle-count ratio, mirroring the engine) and land within rounding of
// MatchResult.stats — see tests/ui/matchOverlayAccumulator.test.ts.
//
// Layout: while mounted the overlay puts `nrl-match-active` on <body>, which
// hides the HUD strip and bottom nav (no Advance Week / screen hopping
// mid-match, and nothing for the scoreboard or the ×1/×2/×4/Skip controls to
// collide with) and moves the sound button to the bottom-right corner; the toast
// lane (toasts.ts) moves to the row under the scoreboard. It stays on through
// full-time (GitHub #14: the match view stays clean until "Back to Club"), when
// `nrl-match-final` is added too: the feed gives way to the Back-to-Club button.
// Both are removed on destroy (the
// scene's teardown when leaving), which hands the HUD/nav back.
//
// The ticker's lines come from the live playback (match/view/commentary.ts, N15.2)
// through `comment()`: the overlay keeps the score from the events and says
// nothing of its own.
import { REPLAY_OFFER_MS } from '../../match/view/replay';
import { el, panel, button, mount, ensureStyles, getRoot } from '../dom';
import { bus } from '../../core/events';
import { truncateTicker } from '../../world/readability';
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../../match/league/presets';
import { TACTIC_BLURB } from '../tacticsBlurbs';
import type { CoachCall } from '../../match/league/calls';
import { MOMENTUM_STEP_MIN, momentumLabel, momentumShapes, momentumWindow, type MomentumEvent } from '../../match/view/momentum';

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
 * One ticker line when the Coach's Office has not unlocked every call (N15.6,
 * the #224 note). For a club with a season already behind it, not week 2 of a
 * new club, and not once every call is there. A season-1 save from before the
 * unlock tiers has no version stored, so it stays quiet too.
 */
export const CALLS_LOCKED_HINT = "More calls unlock as you build up the Coach's Office.";

/** True once a season has been completed, or the club is already into a later one. */
export function callsHintSeasoned(season: number, seasonsPlayed: number): boolean {
  return season > 1 || seasonsPlayed > 0;
}

export function callsLockedHint(unlocked: number, all: number, seasoned: boolean): string | null {
  if (!seasoned || unlocked >= all) return null;
  return CALLS_LOCKED_HINT;
}

// ── DOM overlay ────────────────────────────────────────────────────────────────

/** Lines kept in the full log behind the corner Log toggle. */
const MAX_LOG = 40;

export interface MatchOverlayHandle {
  /** Remove the overlay and unsubscribe all bus handlers. Idempotent. */
  destroy(): void;
  /** The live sim's running clock (match seconds and half), finer than the events' whole minutes. */
  setClock(matchSeconds: number, half: 1 | 2 | 'gp'): void;
  /** A line in the ticker and the log: every line comes this way, from the live playback's commentary (N15.2). */
  comment(line: string): void;
  /** Coach calls made and paid off, home and away (#73): a stats line once there is one. */
  setCalls?(made: Readonly<Record<'home' | 'away', number>>, paid: Readonly<Record<'home' | 'away', number>>): void;
  /** Show Replay for eight seconds after a try (N15.5). Tapping hides it and calls `onTap`. */
  offerReplay(onTap: () => void): void;
  /** How long the re-sim blocked the main thread, in ms. The page's perf read. */
  noteReplayBlock(ms: number): void;
  /** The picture is the replay: a REPLAY tag, cleared when the live view returns. */
  setReplaying(on: boolean): void;
  /** The scoreboard follows the replay, then the live score again. */
  setScore(home: number, away: number): void;
  /** Put the scoreboard back on the score the events have accumulated. */
  showLiveScore(): void;
}

/** The caption under a grey call chip (#348 M6): the sim's reason, short enough for the chip. */
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
};

/** What a call chip says under its name: why it is grey, "called" once made this set, nothing while it can be made. */
export function callCaption(why: string | null, made: boolean): string {
  if (made) return 'called';
  if (why === null) return '';
  return CALL_CAPTION[why] ?? why;
}

/** When each call can be made, for the calls list behind the "?" chip (coach-calls.md §3). */
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
  'fresh-legs': 'any time, once a half: your most tired man off for the freshest on the bench',
};

/** "2/5" for a side's calls paid off of made, "–" when it made none. */
export function callsLine(made: Readonly<Record<'home' | 'away', number>>, paid: Readonly<Record<'home' | 'away', number>>): string {
  const one = (s: 'home' | 'away'): string => (made[s] > 0 ? `${paid[s]}/${made[s]}` : '–');
  return `Calls paid off ${one('home')} / ${one('away')}`;
}

/** The plan card (N11): at half-time (the score, legs and calls) or after a try (Plan chip), the side's presets as two rows of chips. */
export interface PlanCardOptions {
  /** "Half-time", "Golden point" or "Change the plan". */
  head: string;
  /** Lines under the head: the score, each side's legs, the calls paid off. */
  lines: string[];
  /** The plan the side will play from the restart. */
  tactics: TeamTactics;
  /** A chip was tapped: the new plan (in force from the restart). Returns why not, or null. */
  onPick: (t: TeamTactics) => string | null;
  /** Continue: the match goes on. */
  onDone: () => void;
}

export interface PlanCardHandle {
  readonly el: HTMLElement;
  close(): void;
}

/**
 * Show the plan card over the field until Continue (#341: it waits for the coach
 * at every speed; it used to go on by itself while he was still reading it).
 */
export function showPlanCard(o: PlanCardOptions): PlanCardHandle {
  ensureStyles();
  let current: TeamTactics = { ...o.tactics };
  const chips: { preset: AttackPreset | DefencePreset; btn: HTMLButtonElement }[] = [];
  const hint = el('div', { class: 'nrl-mo-plan-hint' });
  const render = (): void => {
    for (const c of chips) c.btn.toggleAttribute('data-active', c.preset === current.attack || c.preset === current.defence);
    hint.textContent = `${PRESET_LABEL[current.attack]}: ${TACTIC_BLURB[current.attack]} ${PRESET_LABEL[current.defence]}: ${TACTIC_BLURB[current.defence]}`;
  };
  const row = (label: string, presets: readonly (AttackPreset | DefencePreset)[], pick: (p: AttackPreset | DefencePreset) => Partial<TeamTactics>): HTMLElement => {
    const r = el('div', { class: 'nrl-mo-plan-row' }, el('span', { class: 'nrl-mo-plan-label' }, label));
    for (const preset of presets) {
      const btn = button(PRESET_LABEL[preset], () => {
        const next = { ...current, ...pick(preset) };
        if (o.onPick(next) === null) current = next;
        render();
      });
      btn.setAttribute('data-tactic', preset);
      btn.title = TACTIC_BLURB[preset];
      chips.push({ preset, btn });
      r.append(btn);
    }
    return r;
  };
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    card.remove();
    o.onDone();
  };
  const go = button('Continue', close);
  go.classList.add('nrl-mo-plan-go');
  const card = panel(
    { class: 'nrl-mo-plan' },
    el('div', { class: 'nrl-mo-plan-head' }, o.head),
    ...o.lines.map((l) => el('div', { class: 'nrl-mo-plan-line' }, l)),
    row('Attack', ATTACK_PRESETS, (p) => ({ attack: p as AttackPreset })),
    row('Defence', DEFENCE_PRESETS, (p) => ({ defence: p as DefencePreset })),
    hint,
    el('div', { class: 'nrl-mo-plan-foot' }, go),
  );
  render();
  mount(card);
  return { el: card, close };
}

/** A sheet over the field (the pause menu, the calls list): a head, some lines, a row of actions. */
export interface MatchSheetOptions {
  head: string;
  lines?: (string | HTMLElement)[];
  actions: { label: string; onTap: () => void; attrs?: Record<string, string> }[];
  /** The sheet went, by any action or ✕: the match goes on. */
  onDone: () => void;
}

/** Show a sheet until one of its actions (each closes it first) or its ✕. */
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
    });
    for (const [k, v] of Object.entries(a.attrs ?? {})) b.setAttribute(k, v);
    return b;
  });
  const sheet = panel(
    { class: 'nrl-mo-sheet' },
    el('div', { class: 'nrl-mo-plan-head' }, o.head),
    x,
    el('div', { class: 'nrl-mo-sheet-body' }, ...(o.lines ?? []).map((l) => (typeof l === 'string' ? el('div', { class: 'nrl-mo-plan-line' }, l) : l))),
    el('div', { class: 'nrl-mo-sheet-actions' }, ...actions),
  );
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', o.head);
  mount(sheet);
  return { el: sheet, close };
}

/** Anything the coach is reading over the field: the plan card, a sheet, the full-time report. The replay offer waits under it (#341). */
export const CARD_SELECTOR = '.nrl-mo-plan, .nrl-mo-sheet, .nrl-modal';

let active: MatchOverlayHandle | null = null;

export interface MatchOverlayOptions {
  home: TeamSheet;
  away: TeamSheet;
  /** The recorded match (the classic replay); a live match has none until full time (#73). */
  result?: MatchResult;
  /** The weather badge when there is no result yet. */
  weather?: WeatherKind;
  /** Minutes in a half: 40 for the old engine's log (default), NINES.halfMinutes for a live match (BAK-207 2g). */
  halfMinutes?: number;
  /** The colours the sides show on the pitch (their rings, #340): swatches, possession and the try banner. Default: each club's first colour. */
  worn?: { home: string; away: string };
  /** The coach's side: his club is starred on the scoreboard (#348 M8). */
  mine?: 'home' | 'away';
}

/** A 0xRRGGBB colour as CSS. */
export function cssHex(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Stats start open only on a screen with room beside the field; a phone opens them (#348 M7). */
export function statsStartOpen(width: number, height: number): boolean {
  return width > 600 && height > 480;
}

/** How long the try banner holds the middle of the field before it docks under the scoreboard (#348 M7). */
export const BANNER_DOCK_MS = 1000;

/** The ticker before the first commentary line. */
export const TICKER_WAIT_TEXT = 'Kick-off soon…';

/** The countdown on the Replay try chip: whole seconds left, never 0 while it shows. */
export function replayCountdown(leftMs: number): number {
  return Math.max(1, Math.ceil(leftMs / 1000));
}

/**
 * Mount the match overlay. Idempotent — mounting while one is active tears the
 * old one down first (guards against double-mount / leaks). Subscribes to
 * 'match:event' (accumulate + render; the ticker's lines come through comment()) and removes itself on
 * 'match:finished'. Returns a handle whose destroy() also unsubscribes.
 */
export function mountMatchOverlay(opts: MatchOverlayOptions): MatchOverlayHandle {
  if (active) active.destroy();
  ensureStyles();
  injectOverlayStyles();

  const { home, away, result } = opts;
  const homeId = home.clubId;
  const worn = opts.worn ?? { home: home.colors[0], away: away.colors[0] };
  const halfMinutes = opts.halfMinutes ?? 40;
  /** Set once the live sim drives the clock: events then only move the score and stats. */
  let liveClock = false;

  let state = initLiveState();

  // Build DOM.
  const root = el('div', { class: 'nrl-match-overlay' });

  const scoreEl = el('span', { class: 'nrl-mo-score', text: '0 – 0' });
  const clockEl = el('span', { class: 'nrl-mo-clock', text: opts.halfMinutes ? formatClockSeconds(0, 2 * halfMinutes) : formatClock(0) });
  const halfEl = el('span', { class: 'nrl-mo-half', text: '1st' });
  const weatherEl = el('span', { class: 'nrl-mo-weather', text: weatherBadge(opts.weather ?? result?.weather ?? 'clear') });

  const homeChip = teamChip(home, worn.home, opts.mine === 'home');
  const awayChip = teamChip(away, worn.away, opts.mine === 'away');
  const momentum = momentumLine(worn);

  const scoreboard = panel(
    { class: 'nrl-mo-scoreboard' },
    homeChip,
    el('div', { class: 'nrl-mo-centre' }, scoreEl, momentum.svg, el('div', { class: 'nrl-mo-meta' }, clockEl, halfEl, weatherEl)),
    awayChip,
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

  // Stats panel (collapsible).
  const possFill = el('span', { class: 'nrl-mo-poss-fill' });
  possFill.style.background = worn.home;
  const possBar = el('div', { class: 'nrl-mo-poss-bar' }, possFill);
  possBar.style.background = worn.away;
  const possLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Possession 50% / 50%' });
  const tackleLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Tackles 0 / 0' });
  const errorLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Errors 0 / 0' });
  const callsLabel = el('div', { class: 'nrl-mo-stat-line', text: '' });
  callsLabel.style.display = 'none';
  // Possession and the tackle count stay on the live match while a replay rewinds the scoreboard.
  const statsNote = el('div', { class: 'nrl-mo-stat-note', text: 'Live match', attrs: { hidden: '' } });
  const statsBody = el('div', { class: 'nrl-mo-stats-body' }, statsNote, possLabel, possBar, tackleLabel, errorLabel, callsLabel);
  // #18, #348 M7: stats start collapsed on phones, portrait or landscape, so the pitch stays clear.
  let statsOpen = typeof window === 'undefined' || statsStartOpen(window.innerWidth, window.innerHeight);
  const statsToggle = button(statsOpen ? 'Stats ▾' : 'Stats ▸', () => {
    statsOpen = !statsOpen;
    statsBody.style.display = statsOpen ? '' : 'none';
    statsToggle.textContent = statsOpen ? 'Stats ▾' : 'Stats ▸';
  }, { class: 'nrl-mo-stats-toggle' });
  statsBody.style.display = statsOpen ? '' : 'none';
  const statsPanel = panel({ class: 'nrl-mo-stats' }, statsToggle, statsBody);

  // Commentary: a slim two-line ticker (previous line dimmed, latest bright).
  // The full log sits behind the corner Log button so it never covers play unasked (#17)
  // and the ticker is not a button tall. Open, it takes the ticker's place on the left half (#348 M4).
  const tickerPrev = el('div', { class: 'nrl-mo-line nrl-mo-line-prev' });
  // Until the first line comes, the ticker says what it is waiting for (#339).
  const tickerLatest = el('div', { class: 'nrl-mo-line nrl-mo-line-wait', text: TICKER_WAIT_TEXT });
  const log = el('div', { class: 'nrl-mo-feed' });
  const logPanel = panel({ class: 'nrl-mo-log' }, log);
  logPanel.id = 'nrl-mo-log';
  logPanel.style.display = 'none';
  let logOpen = false;
  const logToggle = button('', () => {
    logOpen = !logOpen;
    logPanel.style.display = logOpen ? '' : 'none';
    root.classList.toggle('nrl-mo-log-on', logOpen);
    logToggle.setAttribute('aria-expanded', String(logOpen));
    if (logOpen) log.scrollTop = log.scrollHeight;
    scheduleChrome();
  }, { class: 'nrl-mo-log-toggle' });
  logToggle.setAttribute('aria-expanded', 'false');
  logToggle.setAttribute('aria-controls', 'nrl-mo-log');
  logToggle.append(el('span', { class: 'nrl-mo-log-icon', attrs: { 'aria-hidden': 'true' } }), el('span', { class: 'nrl-mo-log-label', text: 'Log' }));
  const commentaryPanel = panel(
    { class: 'nrl-mo-commentary' },
    logPanel,
    el('div', { class: 'nrl-mo-ticker' }, tickerPrev, tickerLatest),
  );

  // Big centre-screen pop-up for every scoring attempt (who, what, points).
  const banner = el('div', { class: 'nrl-mo-banner', attrs: { role: 'status', 'aria-live': 'polite' } });
  banner.hidden = true;

  root.append(scoreboard, statsPanel, commentaryPanel, banner, logToggle);
  mount(root);

  // The ticker sits above whatever of the speed row, the call chips and the corner
  // buttons actually overlaps it. A fixed offset only clears two rows: a level-2
  // chip stack and a three-line speed row both climb higher (the checker's 667, 390 and 360).
  let chromeFrame = 0;
  const placeChrome = (): void => {
    chromeFrame = 0;
    const ticker = commentaryPanel.getBoundingClientRect();
    let clearance = 0;
    const consider = (node: Element | null): void => {
      if (!node) return;
      const r = node.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.left >= ticker.right - 0.5 || r.right <= ticker.left + 0.5) return;
      clearance = Math.max(clearance, window.innerHeight - r.top);
    };
    consider(document.querySelector('.nrl-mo-controls'));
    consider(document.querySelector('.nrl-mo-calls'));
    consider(document.querySelector('.nrl-audio-launcher'));
    consider(logToggle);
    // The replay chip, the docked banner and the toasts hang under the scoreboard, however tall it wraps.
    const boardBottom = scoreboard.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty(BOARD_VAR, `${Math.ceil(boardBottom)}px`);
    if (logOpen) {
      // The open log stops short of the calls column, so its foot only has to clear the speed row.
      const calls = document.querySelector('.nrl-mo-calls')?.getBoundingClientRect();
      const half = window.innerWidth / 2;
      const edge = calls && calls.width > 0 && calls.height > 0 ? Math.min(half, calls.left - 8) : half;
      const width = Math.max(LOG_MIN_W, Math.floor(edge - commentaryPanel.getBoundingClientRect().left));
      if (root.style.getPropertyValue('--nrl-mo-log-w') !== `${width}px`) root.style.setProperty('--nrl-mo-log-w', `${width}px`);
    }
    if (clearance <= 0) return;
    const bottom = Math.ceil(clearance + 8);
    root.style.setProperty('--nrl-mo-chrome', `${bottom}px`);
    // The open log fills the left half from the ticker's foot to just under the scoreboard and the
    // replay chip, even when all call chips wrap into several rows on a small landscape phone.
    const logHeight = Math.max(0, Math.floor(window.innerHeight - bottom - boardBottom - DOCK_ROW_PX - 20));
    root.style.setProperty('--nrl-mo-log-height', `${logHeight}px`);
  };
  const scheduleChrome = (): void => {
    if (chromeFrame) return;
    chromeFrame = requestAnimationFrame(placeChrome);
  };
  const chromeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleChrome) : null;
  const chromeSeen = new Set<Element>();
  const scanChrome = (): void => {
    document.querySelectorAll('.nrl-mo-controls, .nrl-mo-calls, .nrl-audio-launcher').forEach((node) => {
      if (chromeSeen.has(node)) return;
      chromeSeen.add(node);
      chromeObserver?.observe(node);
    });
    scheduleChrome();
  };
  const chromeMut = new MutationObserver(() => {
    scanChrome();
    tickReplay();
  });
  chromeMut.observe(getRoot(), { childList: true });
  window.addEventListener('resize', scheduleChrome);
  chromeObserver?.observe(scoreboard);
  chromeObserver?.observe(commentaryPanel);
  scanChrome();

  // The replay offer runs down only while nothing is open over the field: under the
  // half-time card, a sheet or the full-time report it hides and waits (#341).
  let replayTimer: ReturnType<typeof setInterval> | null = null;
  let replayBtn: HTMLButtonElement | null = null;
  let replayCount: HTMLElement | null = null;
  let replayLeft = 0;
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
    const covered = cardOpen();
    if (!covered) replayLeft -= now - replayAt;
    replayAt = now;
    if (replayLeft <= 0) {
      clearReplayOffer();
      return;
    }
    replayBtn.hidden = covered;
    if (replayCount) replayCount.textContent = String(replayCountdown(replayLeft));
  };
  document.body?.classList.add(MATCH_ACTIVE_CLASS);

  const render = (): void => {
    scoreEl.textContent = `${state.homeScore} – ${state.awayScore}`;
    if (!liveClock) {
      clockEl.textContent = formatClock(state.minute, 2 * halfMinutes);
      halfEl.textContent = state.half === 1 ? '1st' : '2nd';
    }
    const [ph, pa] = possessionPct(state);
    possLabel.textContent = `Possession ${ph}% / ${pa}%`;
    tackleLabel.textContent = `Tackles ${state.tackles[0]} / ${state.tackles[1]}`;
    errorLabel.textContent = `Errors ${state.errors[0]} / ${state.errors[1]}`;
    const fill = possBar.querySelector('.nrl-mo-poss-fill') as HTMLElement | null;
    if (fill) fill.style.width = `${ph}%`;
  };

  let prevLine = '';
  const appendCommentary = (line: string): void => {
    tickerPrev.textContent = truncateTicker(prevLine);
    tickerLatest.classList.remove('nrl-mo-line-wait');
    tickerLatest.textContent = truncateTicker(line);
    prevLine = line;
    log.append(el('div', { class: 'nrl-mo-line', text: line }));
    while (log.childElementCount > MAX_LOG) {
      log.firstElementChild?.remove();
    }
    if (logOpen) log.scrollTop = log.scrollHeight;
  };

  // ── Score banner ──
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  let dockTimer: ReturnType<typeof setTimeout> | null = null;
  let bannerWasTry = false;
  /** Built during a burst of events (Skip) and shown once the burst ends. */
  let queued: { b: ScoreBanner; score: string } | null = null;
  let flushScheduled = false;

  const hideBanner = (): void => {
    banner.hidden = true;
    if (dockTimer) clearTimeout(dockTimer);
    dockTimer = null;
    banner.classList.remove('nrl-mo-banner-in', 'nrl-mo-banner-docked');
    bannerWasTry = false;
    bannerTimer = null;
  };

  const showBanner = (b: ScoreBanner, score: string): void => {
    const sheet = b.side === 0 ? home : away;
    const pts = b.points > 0 ? `+${b.points}` : '';
    const scoreLine = el('div', { class: 'nrl-mo-banner-score', text: score });
    if (b.conversion && bannerWasTry && !banner.hidden) {
      // Conversion straight after the try: add it to the try banner.
      banner.querySelector('.nrl-mo-banner-score')?.remove();
      banner.append(
        el('div', { class: 'nrl-mo-banner-extra', text: `${b.headline}${pts ? ` ${pts}` : ''} · ${surnameOf(b.scorer)}` }),
        scoreLine,
      );
    } else {
      banner.replaceChildren(
        el('div', { class: 'nrl-mo-banner-head', text: b.headline }),
        el('div', { class: 'nrl-mo-banner-who', text: b.scorer }),
        el('div', { class: 'nrl-mo-banner-sub', text: `${b.team}${pts ? `  ${pts}` : ''}` }),
        scoreLine,
      );
      const colour = b.side === 0 ? worn.home : worn.away;
      banner.style.background = colour;
      banner.style.color = inkFor(colour);
      banner.style.borderColor = sheet.colors[1];
      banner.classList.toggle('nrl-mo-banner-miss', b.points === 0);
      // Restart the pop-in animation, in the middle of the field; then it docks out of the way.
      banner.classList.remove('nrl-mo-banner-in', 'nrl-mo-banner-docked');
      void banner.offsetWidth;
      banner.classList.add('nrl-mo-banner-in');
      if (dockTimer) clearTimeout(dockTimer);
      dockTimer = setTimeout(() => {
        dockTimer = null;
        banner.classList.add('nrl-mo-banner-docked');
      }, BANNER_DOCK_MS);
      bannerWasTry = b.headline === 'TRY!' || b.headline === 'BONUS TRY!'; // a bonus try's conversion folds in too (#77)
    }
    banner.hidden = false;
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, bannerLife(b.headline));

    if (b.points > 0) {
      // Pulse the score and light up the scoring team's chip.
      const chip = b.side === 0 ? homeChip : awayChip;
      for (const node of [scoreEl, chip]) {
        node.classList.remove('nrl-mo-scored');
        void node.offsetWidth;
        node.classList.add('nrl-mo-scored');
      }
    }
  };

  /** Events received since the last task tick — more than one means Skip. */
  let burst = 0;
  const onEvent = (ev: MatchEvent): void => {
    if (burst++ === 0) setTimeout(() => (burst = 0), 0);
    state = reduceEvent(state, ev, homeId, halfMinutes);
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
      queued = { b, score: `${state.homeScore} – ${state.awayScore}` };
      if (!flushScheduled) {
        flushScheduled = true;
        setTimeout(() => {
          flushScheduled = false;
          if (queued) showBanner(queued.b, queued.score);
          queued = null;
        }, 0);
      }
    }
  };

  const offEvent = bus.on('match:event', onEvent);
  let offFinished: () => void = () => {};

  const handle: MatchOverlayHandle = {
    destroy(): void {
      offEvent();
      offFinished();
      if (bannerTimer) clearTimeout(bannerTimer);
      if (dockTimer) clearTimeout(dockTimer);
      clearReplayOffer();
      replayTag?.remove();
      document.documentElement.style.removeProperty(BOARD_VAR);
      if (chromeFrame) cancelAnimationFrame(chromeFrame);
      chromeObserver?.disconnect();
      chromeMut.disconnect();
      window.removeEventListener('resize', scheduleChrome);
      queued = null;
      root.remove();
      document.body?.classList.remove(MATCH_ACTIVE_CLASS, MATCH_FINAL_CLASS);
      if (active === handle) active = null;
    },
    comment(line: string): void {
      appendCommentary(line);
    },
    setCalls(made, paid): void {
      callsLabel.style.display = made.home + made.away > 0 ? '' : 'none';
      callsLabel.textContent = callsLine(made, paid);
    },
    setClock(matchSeconds: number, half: 1 | 2 | 'gp'): void {
      liveClock = true;
      clockMin = (half === 'gp' ? 2 * halfMinutes * 60 + matchSeconds : matchSeconds) / 60;
      if (clockMin > nowMin) {
        nowMin = clockMin;
        if (nowMin - drawnAt >= MOMENTUM_STEP_MIN) drawMomentum();
      }
      // Golden point (N9.4): its own clock from 00:00.
      clockEl.textContent = formatClockSeconds(matchSeconds, half === 'gp' ? 60 : 2 * halfMinutes);
      // Full time keeps its label, except while a replay is showing an earlier half.
      if (root.classList.contains('nrl-mo-final') && !root.classList.contains('nrl-mo-replaying')) {
        halfEl.textContent = 'Full-time';
        return;
      }
      halfEl.textContent = half === 1 ? '1st' : half === 2 ? '2nd' : 'Golden point';
    },
    offerReplay(onTap: () => void): void {
      clearReplayOffer();
      // Still offered after the siren: at ×8 the last try's eight seconds often include full time.
      // A small chip docked under the scoreboard (#348 M5), not a big button over play.
      replayBtn = button('Replay try', () => {
        clearReplayOffer();
        onTap();
      }, { class: 'nrl-mo-replay' });
      replayCount = el('span', { class: 'nrl-mo-replay-count', attrs: { 'aria-hidden': 'true' } });
      replayBtn.append(replayCount);
      replayBtn.setAttribute('aria-label', 'Replay try');
      root.append(replayBtn);
      replayLeft = REPLAY_OFFER_MS;
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
      statsToggle.textContent = on ? (statsOpen ? 'Live ▾' : 'Live ▸') : statsOpen ? 'Stats ▾' : 'Stats ▸';
      if (on) {
        // The banner still shows the try's score. Hide it while the board is rewound, and bring it back if its time has not run out.
        banner.hidden = true;
        replayTag = el('div', { class: 'nrl-mo-replay-tag', text: 'REPLAY', attrs: { role: 'status' } });
        root.append(replayTag);
        return;
      }
      if (bannerTimer) banner.hidden = false;
    },
    setScore(home: number, away: number): void {
      scoreEl.textContent = `${home} – ${away}`;
    },
    showLiveScore(): void {
      scoreEl.textContent = `${state.homeScore} – ${state.awayScore}`;
    },
  };
  // Full-time: freeze on the final score (the result toast is transient). The
  // HUD/nav stay hidden until MatchScene destroys the overlay on Back-to-Club.
  offFinished = bus.on('match:finished', () => {
    offEvent();
    // Skip fires the whole log in one go: don't pop (or leave up) a stale
    // banner over the result. A natural finish keeps the last score's banner.
    queued = null;
    if (burst > 1) {
      if (bannerTimer) clearTimeout(bannerTimer);
      hideBanner();
    }
    halfEl.textContent = 'Full-time';
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

function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function teamChip(sheet: TeamSheet, colour: string, mine: boolean): HTMLElement {
  const swatch = el('span', { class: 'nrl-mo-swatch' });
  swatch.style.background = colour;
  const chip = el('div', { class: mine ? 'nrl-mo-chip nrl-mo-mine' : 'nrl-mo-chip' }, swatch, el('span', { class: 'nrl-mo-name', text: sheet.name }));
  if (mine) chip.title = 'Your club';
  return chip;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The sparkline's drawing box; CSS stretches it to the centre's width and a few px tall. */
const MOMENTUM_BOX = { width: 100, height: 12 };

/** The momentum line under the score (#366): home's share filled above the middle in its colour, away's below in its. */
function momentumLine(worn: { home: string; away: string }): { svg: SVGSVGElement; draw: (samples: Parameters<typeof momentumShapes>[0], label: string) => void } {
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
  return {
    svg,
    draw(samples, label): void {
      const s = momentumShapes(samples, MOMENTUM_BOX.width, MOMENTUM_BOX.height);
      homeShape.setAttribute('points', s.home);
      awayShape.setAttribute('points', s.away);
      if (svg.getAttribute('aria-label') !== label) svg.setAttribute('aria-label', label);
    },
  };
}

function weatherBadge(w: WeatherKind): string {
  switch (w) {
    case 'rain':
      return '🌧 Rain';
    case 'wind':
      return '💨 Wind';
    default:
      return '☀ Clear';
  }
}

const OVERLAY_STYLE_ID = 'nrl-match-overlay-styles';
/** The scoreboard's foot (px from the top), on <html>, for what docks under it: the replay chip, the banner, the toasts. */
const BOARD_VAR = '--nrl-mo-board';
/** Room kept under the scoreboard for the docked replay chip (a 44px chip and its gap). */
const DOCK_ROW_PX = 52;
/** The open log is never narrower than this, whatever the calls column takes. */
const LOG_MIN_W = 160;
/** Body class set while a match overlay is mounted (see header). */
export const MATCH_ACTIVE_CLASS = 'nrl-match-active';
/** Body class added at full-time (alongside MATCH_ACTIVE_CLASS) until exit. */
export const MATCH_FINAL_CLASS = 'nrl-match-final';

function injectOverlayStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(OVERLAY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = OVERLAY_STYLE_ID;
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);
}

export const OVERLAY_CSS = `
.nrl-match-overlay { font-family: 'Courier New', monospace; }
/* Match mode (live AND full-time, until Back to Club): the HUD strip and nav
   bar step aside; the sound button moves to the bottom-right corner. */
body.nrl-match-active .nrl-hud,
body.nrl-match-active .nrl-nav { display: none; }
body.nrl-match-active .nrl-audio-launcher { top: auto; bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px)); }
.nrl-mo-scoreboard {
  position: fixed; top: calc(0.5rem + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 0.75rem; z-index: 15;
  padding: 0.4rem 0.75rem;
  max-width: calc(100vw - 1rem); box-sizing: border-box;
}
.nrl-mo-chip { display: flex; align-items: center; gap: 0.35rem; font-weight: bold; min-width: 0; }
.nrl-mo-swatch { width: 0.9rem; height: 0.9rem; border: 2px solid #000; display: inline-block; flex: 0 0 auto; }
.nrl-mo-name {
  font-size: clamp(0.65rem, 2.5vw, 0.9rem);
  max-width: 26vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* The coach's club (#348 M8): starred and underlined. */
.nrl-mo-mine .nrl-mo-name { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px; }
.nrl-mo-mine::before { content: '★'; font-size: 0.8rem; line-height: 1; }
.nrl-mo-centre { text-align: center; min-width: 5.5rem; flex: 0 0 auto; }
.nrl-mo-score { font-size: clamp(1rem, 4vw, 1.4rem); font-weight: bold; display: block; }
.nrl-mo-momentum {
  display: block; width: 100%; height: var(--nrl-mo-momentum-h, 6px); overflow: visible;
  background: var(--nrl-mo-momentum-bg, rgba(26, 26, 46, 0.16));
}
.nrl-mo-momentum-fill { stroke: var(--nrl-mo-momentum-edge, #1a1a2e); stroke-width: 0.75px; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.nrl-mo-momentum-axis { stroke: var(--nrl-mo-momentum-axis, rgba(26, 26, 46, 0.45)); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.nrl-mo-meta { display: flex; gap: 0.4rem; justify-content: center; font-size: clamp(0.55rem, 2vw, 0.7rem); white-space: nowrap; }
.nrl-mo-stats {
  position: fixed; top: calc(var(--nrl-mo-board, 4rem) + 0.3rem); right: calc(0.5rem + env(safe-area-inset-right, 0px)); z-index: 15; min-width: 9.5rem;
}
.nrl-mo-stats-toggle { width: 100%; margin-bottom: 0.35rem; }
.nrl-mo-stat-line { font-size: 0.7rem; margin: 0.15rem 0; }
.nrl-mo-stat-note { font-size: 0.62rem; font-weight: bold; letter-spacing: 0.04em; margin: 0 0 0.15rem; }
.nrl-mo-stat-note[hidden] { display: none; }
.nrl-mo-poss-bar { height: 0.6rem; border: 2px solid #000; background: #b34747; margin: 0.2rem 0; }
.nrl-mo-poss-fill { display: block; height: 100%; background: #4779b3; width: 50%; border-right: 2px solid #000; box-sizing: border-box; }
.nrl-mo-commentary {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); right: calc(0.5rem + env(safe-area-inset-right, 0px));
  /* --nrl-mo-chrome is the measured top of the speed row and the chip stack (placeChrome). */
  bottom: var(--nrl-mo-chrome, calc(3.75rem + env(safe-area-inset-bottom, 0px))); z-index: 14;
  max-width: 34rem; margin: 0 auto; padding: 0.25rem 0.5rem;
  display: flex; align-items: center; gap: 0.5rem; box-sizing: border-box;
}
.nrl-mo-ticker { flex: 1 1 auto; min-width: 0; }
.nrl-mo-ticker .nrl-mo-line { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 1.25em; }
.nrl-mo-line-prev { opacity: 0.75; }
.nrl-mo-line-wait { font-style: italic; opacity: 0.75; }
/* The Log button sits in the bottom-left corner, on the empty side of the speed
   row (the ♪ button has the other corner). Not inside the ticker, which made that
   strip a button tall; labelled, since three bars alone read as a menu (#348 M4). */
.nrl-mo-log-toggle {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  z-index: 21; height: 44px; min-width: 44px; min-height: 44px; padding: 0 0.5rem;
  display: flex; align-items: center; gap: 0.3rem; font-size: 0.78rem;
}
/* The open fill wins over .nrl-btn:hover (that rule is an element plus :hover). */
.nrl-btn.nrl-mo-log-toggle[aria-expanded="true"],
.nrl-btn.nrl-mo-log-toggle[aria-expanded="true"]:hover:not(:disabled) {
  background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000;
}
.nrl-mo-log-icon {
  width: 12px; height: 10px; pointer-events: none; flex: 0 0 auto;
  background:
    linear-gradient(#1a1a2e, #1a1a2e) 0 0 / 12px 2px no-repeat,
    linear-gradient(#1a1a2e, #1a1a2e) 0 4px / 9px 2px no-repeat,
    linear-gradient(#1a1a2e, #1a1a2e) 0 8px / 12px 2px no-repeat;
}
.nrl-mo-log-label { pointer-events: none; }
/* Full log (#348 M4): opt-in; open, it takes the ticker's place and the left half,
   up to just under the scoreboard, so it is a read and not three lines that repeat the ticker. */
.nrl-mo-log {
  margin: 0; border: 0; box-shadow: none; background: transparent; padding: 0;
  max-height: var(--nrl-mo-log-height, 8rem); overflow: hidden;
  display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0;
}
.nrl-mo-feed { display: flex; flex-direction: column; gap: 0.15rem; max-height: var(--nrl-mo-log-height, 8rem); min-height: 0; overflow-y: auto; }
.nrl-mo-log-on .nrl-mo-ticker { display: none; }
.nrl-match-overlay.nrl-mo-log-on .nrl-mo-commentary {
  right: auto; width: var(--nrl-mo-log-w, calc(50vw - 0.5rem - env(safe-area-inset-left, 0px))); max-width: none; margin: 0;
}
.nrl-mo-line { font-size: clamp(0.6rem, 2.4vw, 0.8rem); line-height: 1.25; }
/* Playback controls (mounted by MatchScene): bottom-centre, where the nav bar
   sits outside a match; the commentary feed stacks above them. */
.nrl-mo-controls {
  position: fixed; left: 50%; bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  z-index: 20; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; pointer-events: auto;
  max-width: calc(100vw - 1rem);
}
.nrl-mo-calls {
  position: fixed; right: 0.5rem; bottom: calc(3.6rem + env(safe-area-inset-bottom, 0px));
  z-index: 20; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.3rem; max-width: 17.5rem; pointer-events: auto;
}
/* Three chip rows leave a readable log below the scoreboard on short phones.
   Give the speed row its content width so it stays beneath the wider chips. */
@media (min-width: 600px) and (max-height: 400px) {
  .nrl-mo-calls { max-width: 24rem; }
  .nrl-mo-controls { width: max-content; }
}
.nrl-mo-calls .nrl-btn { min-height: 44px; min-width: 4.6rem; padding: 0.15rem 0.4rem; font-size: 0.78rem; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; }
.nrl-mo-calls .nrl-btn[data-made] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; opacity: 1; }
/* Why a chip is grey, on the chip (#348 M6): a touch never shows the title. */
.nrl-mo-call-why { display: block; font-size: 0.6rem; font-weight: normal; line-height: 1.05; max-width: 6.5rem; overflow: hidden; text-overflow: ellipsis; }
.nrl-mo-call-why:empty { display: none; }
.nrl-mo-calls .nrl-btn:disabled:not([data-made]) { opacity: 0.8; }
.nrl-mo-calls .nrl-btn.nrl-mo-calls-help { min-width: 44px; background: #e8e0c8; }
.nrl-mo-final .nrl-mo-calls, body.nrl-match-final .nrl-mo-calls { display: none; }
/* The speed playing now, unmistakably (#348 M3). */
.nrl-mo-controls .nrl-btn[data-active], .nrl-mo-controls .nrl-btn[data-active]:hover:not(:disabled) {
  background: #1a1a2e; color: #f4d03f; box-shadow: inset 0 0 0 2px #f4d03f, 3px 3px 0 #000;
}
.nrl-mo-controls .nrl-mo-pause { background: #e8e0c8; }
/* Key moments (#366): the speed a break, a try or the last minutes hold the match at pulses; the chosen one stays lit. */
.nrl-mo-controls .nrl-btn[data-slow] {
  outline: 2px dashed var(--nrl-mo-slow-ring, #1a1a2e); outline-offset: -6px;
  animation: nrl-mo-slow 0.9s ease-in-out infinite alternate;
}
@keyframes nrl-mo-slow {
  from { background: var(--nrl-mo-slow-bg, #e8e0c8); box-shadow: 3px 3px 0 #000; }
  to { background: var(--nrl-mo-slow-pulse, #f4d03f); box-shadow: inset 0 0 0 2px var(--nrl-mo-slow-ring, #1a1a2e), 3px 3px 0 #000; }
}
/* What a call did (#366): a tag over the chips for two seconds; it never takes a tap or moves the chips. */
.nrl-mo-call-result {
  position: absolute; right: 0; bottom: calc(100% + 0.3rem); pointer-events: none; white-space: nowrap;
  padding: 0.15rem 0.5rem; font-size: 0.78rem; font-weight: bold;
  background: var(--nrl-mo-result-bg, #1a1a2e); color: var(--nrl-mo-result-ink, #f4ecd8);
  border: 2px solid var(--nrl-mo-result-edge, #000); box-shadow: 3px 3px 0 #000;
  animation: nrl-mo-extra-in 200ms ease-out;
}
.nrl-mo-call-result[data-paid] { color: var(--nrl-mo-result-paid, #f4d03f); }
/* The plan card (N11) and the sheets: over the field, above every match control and the toasts, under a dialog.
   The card waits for Continue (#341), and Continue stays in view however short the screen. */
.nrl-mo-plan, .nrl-mo-sheet {
  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 65;
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  width: min(42rem, calc(100vw - 1rem)); max-height: calc(100vh - 1rem); overflow-y: auto; box-sizing: border-box; padding: 0.6rem 0.8rem;
}
.nrl-mo-plan-foot {
  position: sticky; bottom: -0.6rem; align-self: stretch; display: flex; justify-content: center;
  margin: 0 -0.8rem -0.6rem; padding: 0.3rem 0.8rem 0.45rem; background: #e8e0c8; border-top: 2px solid #1a1a2e; z-index: 1;
}
.nrl-mo-sheet { width: min(28rem, calc(100vw - 1rem)); padding-top: 0.5rem; }
/* The head and its lines keep clear of the ✕ in the corner. */
.nrl-mo-sheet > .nrl-mo-plan-head, .nrl-mo-sheet .nrl-mo-plan-line { padding: 0 2.9rem; text-align: center; }
.nrl-mo-sheet-x { position: absolute; top: 0.25rem; right: 0.25rem; padding: 0; }
.nrl-mo-sheet-body { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; align-self: stretch; }
.nrl-mo-sheet-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; margin-top: 0.25rem; }
.nrl-mo-sheet-actions .nrl-btn:first-child { min-width: 7rem; }
.nrl-mo-call-help { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 0.6rem; font-size: clamp(0.62rem, 2vw, 0.8rem); text-align: left; align-self: stretch; }
.nrl-mo-call-help b { white-space: nowrap; }
.nrl-mo-call-help .nrl-mo-call-locked { opacity: 0.7; }
.nrl-mo-plan-head { font-size: clamp(1rem, 3.5vw, 1.4rem); font-weight: bold; letter-spacing: 0.06em; }
.nrl-mo-plan-line { font-size: clamp(0.65rem, 2.2vw, 0.85rem); }
.nrl-mo-plan-row { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.3rem; }
.nrl-mo-plan-label { font-size: 0.72rem; min-width: 3.6rem; text-align: right; }
.nrl-mo-plan-row .nrl-btn { min-height: 44px; padding: 0.15rem 0.45rem; font-size: 0.78rem; white-space: nowrap; }
.nrl-mo-plan-row .nrl-btn[data-active], .nrl-mo-plan-row .nrl-btn[data-active]:hover:not(:disabled) { background: #7ec850; }
.nrl-mo-plan-hint { font-size: 0.68rem; max-width: 36rem; text-align: center; }
.nrl-mo-plan-go { min-width: 9rem; }
.nrl-mo-calls .nrl-btn[data-plan] { background: #d6e8ff; }
@media (max-height: 480px) {
  .nrl-mo-plan, .nrl-mo-sheet { gap: 0.2rem; padding: 0.35rem 0.6rem; }
  .nrl-mo-plan-foot { bottom: -0.35rem; margin: 0 -0.6rem -0.35rem; padding: 0.25rem 0.6rem 0.3rem; }
  .nrl-mo-plan-head { font-size: 1rem; }
  .nrl-mo-plan-row .nrl-btn { padding: 0.1rem 0.35rem; font-size: 0.72rem; }
}
/* Full-time: scoreboard and stats stay put (HUD/nav are still hidden); the
   feed gives way to the Back-to-Club button (MatchScene, bottom-centre where
   the controls were). */
.nrl-mo-final .nrl-mo-commentary, .nrl-mo-final .nrl-mo-log, .nrl-mo-final .nrl-mo-log-toggle { display: none; }
/* Score banner: big, team-coloured, centre-top over the pitch; never blocks taps. */
.nrl-mo-banner {
  position: fixed; left: 50%; top: 22%; transform: translateX(-50%);
  z-index: 16; pointer-events: none; text-align: center;
  min-width: min(18rem, 80vw); max-width: 90vw; box-sizing: border-box;
  padding: 0.5rem 1.25rem 0.6rem; border: 4px solid #000;
  box-shadow: 0 0 0 3px #000, 6px 6px 0 #000;
  font-family: 'Courier New', monospace; text-shadow: none;
}
.nrl-mo-banner[hidden] { display: none; }
/* After a moment the banner docks: a strip under the scoreboard, off the play (#348 M7). */
.nrl-mo-banner.nrl-mo-banner-docked {
  top: calc(var(--nrl-mo-board, 4rem) + 0.3rem); min-width: 0; max-width: min(24rem, calc(100vw - 22rem));
  display: flex; align-items: center; gap: 0.5rem; padding: 0.15rem 0.6rem; border-width: 3px; box-shadow: 3px 3px 0 #000;
}
.nrl-mo-banner-docked .nrl-mo-banner-head { font-size: 0.95rem; letter-spacing: 0.04em; }
.nrl-mo-banner-docked .nrl-mo-banner-who { font-size: 0.78rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.nrl-mo-banner-docked .nrl-mo-banner-sub { display: none; }
.nrl-mo-banner-docked .nrl-mo-banner-extra { font-size: 0.72rem; margin: 0; padding: 0 0 0 0.4rem; border-top: 0; border-left: 2px dashed currentColor; white-space: nowrap; }
.nrl-mo-banner-docked .nrl-mo-banner-score { margin: 0; font-size: 0.78rem; white-space: nowrap; }
.nrl-mo-banner-head { font-size: clamp(1.4rem, min(7vw, 10vh), 3rem); font-weight: bold; letter-spacing: 0.08em; line-height: 1.05; }
.nrl-mo-banner-who { font-size: clamp(0.9rem, min(3.6vw, 5vh), 1.5rem); font-weight: bold; margin-top: 0.15rem; }
.nrl-mo-banner-sub { font-size: clamp(0.75rem, 2.6vw, 1rem); opacity: 0.9; }
.nrl-mo-banner-extra { font-size: clamp(0.8rem, 2.8vw, 1.05rem); font-weight: bold; margin-top: 0.3rem; padding-top: 0.25rem; border-top: 2px dashed currentColor; animation: nrl-mo-extra-in 260ms ease-out; }
.nrl-mo-banner-score {
  display: inline-block; margin-top: 0.35rem; padding: 0.1rem 0.5rem;
  background: #1a1a2e; color: #f4ecd8; border: 2px solid #000;
  font-size: clamp(0.9rem, min(3vw, 4.5vh), 1.2rem); font-weight: bold; letter-spacing: 0.05em;
}
.nrl-mo-banner-miss .nrl-mo-banner-head { font-size: clamp(1.2rem, 4.5vw, 1.9rem); }
.nrl-mo-banner-miss { filter: saturate(0.55); }
.nrl-mo-banner-in { animation: nrl-mo-banner-pop 420ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
@keyframes nrl-mo-banner-pop {
  0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
@keyframes nrl-mo-extra-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
/* Scoreboard flash on points. */
.nrl-mo-scored { animation: nrl-mo-scored 1.2s ease-out; }
@keyframes nrl-mo-scored {
  0%, 30% { transform: scale(1.35); color: #f4d03f; text-shadow: 2px 2px 0 #000; }
  100% { transform: scale(1); }
}
.nrl-mo-chip.nrl-mo-scored { animation: nrl-mo-chip-scored 1.2s ease-out; }
@keyframes nrl-mo-chip-scored { 0%, 40% { background: #f4d03f; } 100% { background: transparent; } }
/* Replay (N15.5, #348 M5): a small chip docked under the scoreboard, top-left, with
   its seconds left; not a big button over play. No centring transform: the pressed
   nudge (.nrl-btn:active) would replace it and slide the button off the finger. */
.nrl-mo-replay, .nrl-mo-replay-tag {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); top: calc(var(--nrl-mo-board, 4rem) + 0.3rem);
  z-index: 26; pointer-events: auto; min-height: 44px;
}
.nrl-mo-replay { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.5rem; font-size: 0.78rem; }
.nrl-mo-replay[hidden] { display: none; }
.nrl-mo-replay-count {
  display: inline-grid; place-items: center; min-width: 1.3rem; height: 1.3rem; padding: 0 0.15rem; box-sizing: border-box;
  background: #1a1a2e; color: #f4d03f; font-size: 0.72rem;
}
.nrl-mo-replay-tag { display: grid; place-items: center; box-sizing: border-box;
  pointer-events: none; padding: 0.35rem 0.8rem; background: #1a1a2e; color: #fff; border: 3px solid #000;
  font-weight: bold; letter-spacing: 0.08em; box-shadow: 3px 3px 0 #000;
}
@media (prefers-reduced-motion: reduce) {
  .nrl-mo-banner-in, .nrl-mo-scored, .nrl-mo-chip.nrl-mo-scored, .nrl-mo-banner-extra, .nrl-mo-call-result { animation: none; }
  .nrl-mo-controls .nrl-btn[data-slow] { animation: none; background: var(--nrl-mo-slow-pulse, #f4d03f); }
}
/* Short (landscape phone) viewports: keep stats and commentary apart. */
@media (max-height: 480px) {
  .nrl-mo-controls { gap: 0.25rem; }
  .nrl-mo-controls .nrl-btn { padding: 0.2rem 0.4rem; font-size: 0.72rem; }
  .nrl-mo-stats { min-width: 8.5rem; padding: 0.3rem 0.5rem; }
  .nrl-mo-stat-line { font-size: 0.62rem; margin: 0.05rem 0; }
  .nrl-mo-commentary { max-width: min(34rem, calc(100vw - 13rem)); margin: 0; }
  .nrl-mo-banner { top: 19%; min-width: 14rem; padding: 0.25rem 0.9rem 0.35rem; border-width: 3px; }
  .nrl-mo-banner-score { margin-top: 0.2rem; }
}
`;
