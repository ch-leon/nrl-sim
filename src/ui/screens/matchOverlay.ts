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
// collide with), moves the sound button to the bottom-right corner and
// re-anchors toasts above the commentary feed. It stays on through full-time
// (GitHub #14: the match view stays clean until "Back to Club"), when
// `nrl-match-final` is added too: the feed gives way to the Back-to-Club button
// and the result toast sits just above it. Both are removed on destroy (the
// scene's teardown when leaving), which hands the HUD/nav back.
import { el, panel, button, mount, ensureStyles } from '../dom';
import { bus } from '../../core/events';
import { makeRng } from '../../utils/rng';
import { commentaryFor } from '../../sim/commentary';
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';

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
 * `half` flips on `half-time` and via `ev.t >= 40`.
 */
export function reduceEvent(s: LiveState, ev: MatchEvent, homeId: string): LiveState {
  const next: LiveState = {
    ...s,
    possessionTicks: [s.possessionTicks[0], s.possessionTicks[1]],
    tackles: [s.tackles[0], s.tackles[1]],
    errors: [s.errors[0], s.errors[1]],
    tries: [s.tries[0], s.tries[1]],
  };
  const i = ev.teamId === homeId ? 0 : 1;

  // Minute / half.
  next.minute = Math.max(next.minute, Math.min(80, ev.t));
  if (ev.kind === 'half-time') next.half = 2;
  else if (ev.t >= 40) next.half = 2;

  // Scoring + counters.
  switch (ev.kind) {
    case 'try':
      addScore(next, i, 4);
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

/** MM:SS clock from a sim minute (minute 40 → "40:00"), clamped to 80:00. */
export function formatClock(minute: number): string {
  const m = Math.max(0, Math.min(80, Math.floor(minute)));
  return `${String(m).padStart(2, '0')}:00`;
}

// ── DOM overlay ────────────────────────────────────────────────────────────────

const MAX_COMMENTARY = 6;

export interface MatchOverlayHandle {
  /** Remove the overlay and unsubscribe all bus handlers. Idempotent. */
  destroy(): void;
}

let active: MatchOverlayHandle | null = null;

export interface MatchOverlayOptions {
  home: TeamSheet;
  away: TeamSheet;
  result: MatchResult;
  /** Seed for the commentary rng so replays read identically. Defaults derived
   *  from the result's final score + event count. */
  seed?: number;
}

/**
 * Mount the match overlay. Idempotent — mounting while one is active tears the
 * old one down first (guards against double-mount / leaks). Subscribes to
 * 'match:event' (accumulate + render + commentary) and removes itself on
 * 'match:finished'. Returns a handle whose destroy() also unsubscribes.
 */
export function mountMatchOverlay(opts: MatchOverlayOptions): MatchOverlayHandle {
  if (active) active.destroy();
  ensureStyles();
  injectOverlayStyles();

  const { home, away, result } = opts;
  const homeId = home.clubId;
  const seed = opts.seed ?? deriveSeed(result);
  const rng = makeRng(seed);

  let state = initLiveState();

  // Build DOM.
  const root = el('div', { class: 'nrl-match-overlay' });

  const scoreEl = el('span', { class: 'nrl-mo-score', text: '0 – 0' });
  const clockEl = el('span', { class: 'nrl-mo-clock', text: formatClock(0) });
  const halfEl = el('span', { class: 'nrl-mo-half', text: '1st' });
  const weatherEl = el('span', { class: 'nrl-mo-weather', text: weatherBadge(result.weather) });

  const homeChip = teamChip(home);
  const awayChip = teamChip(away);

  const scoreboard = panel(
    { class: 'nrl-mo-scoreboard' },
    homeChip,
    el('div', { class: 'nrl-mo-centre' }, scoreEl, el('div', { class: 'nrl-mo-meta' }, clockEl, halfEl, weatherEl)),
    awayChip,
  );

  // Stats panel (collapsible).
  const possBar = el('div', { class: 'nrl-mo-poss-bar' }, el('span', { class: 'nrl-mo-poss-fill' }));
  const possLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Possession 50% / 50%' });
  const tackleLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Tackles 0 / 0' });
  const errorLabel = el('div', { class: 'nrl-mo-stat-line', text: 'Errors 0 / 0' });
  const statsBody = el('div', { class: 'nrl-mo-stats-body' }, possLabel, possBar, tackleLabel, errorLabel);
  let statsOpen = true;
  const statsToggle = button('Stats ▾', () => {
    statsOpen = !statsOpen;
    statsBody.style.display = statsOpen ? '' : 'none';
    statsToggle.textContent = statsOpen ? 'Stats ▾' : 'Stats ▸';
  }, { class: 'nrl-mo-stats-toggle' });
  const statsPanel = panel({ class: 'nrl-mo-stats' }, statsToggle, statsBody);

  // Commentary feed.
  const feed = el('div', { class: 'nrl-mo-feed' });
  const commentaryPanel = panel({ class: 'nrl-mo-commentary' }, feed);

  root.append(scoreboard, statsPanel, commentaryPanel);
  mount(root);
  document.body?.classList.add(MATCH_ACTIVE_CLASS);

  const render = (): void => {
    scoreEl.textContent = `${state.homeScore} – ${state.awayScore}`;
    clockEl.textContent = formatClock(state.minute);
    halfEl.textContent = state.half === 1 ? '1st' : '2nd';
    const [ph, pa] = possessionPct(state);
    possLabel.textContent = `Possession ${ph}% / ${pa}%`;
    tackleLabel.textContent = `Tackles ${state.tackles[0]} / ${state.tackles[1]}`;
    errorLabel.textContent = `Errors ${state.errors[0]} / ${state.errors[1]}`;
    const fill = possBar.querySelector('.nrl-mo-poss-fill') as HTMLElement | null;
    if (fill) fill.style.width = `${ph}%`;
  };

  const appendCommentary = (line: string): void => {
    feed.append(el('div', { class: 'nrl-mo-line', text: line }));
    while (feed.childElementCount > MAX_COMMENTARY) {
      feed.firstElementChild?.remove();
    }
    feed.scrollTop = feed.scrollHeight;
  };

  const onEvent = (ev: MatchEvent): void => {
    state = reduceEvent(state, ev, homeId);
    render();
    const line = commentaryFor(ev, home.name, away.name, rng.next, homeId);
    if (line) appendCommentary(line);
  };

  const offEvent = bus.on('match:event', onEvent);
  let offFinished: () => void = () => {};

  const handle: MatchOverlayHandle = {
    destroy(): void {
      offEvent();
      offFinished();
      root.remove();
      document.body?.classList.remove(MATCH_ACTIVE_CLASS, MATCH_FINAL_CLASS);
      if (active === handle) active = null;
    },
  };
  // Full-time: freeze on the final score (the result toast is transient). The
  // HUD/nav stay hidden until MatchScene destroys the overlay on Back-to-Club.
  offFinished = bus.on('match:finished', () => {
    offEvent();
    halfEl.textContent = 'Full-time';
    root.classList.add('nrl-mo-final');
    document.body?.classList.add(MATCH_FINAL_CLASS);
  });

  active = handle;
  render();
  return handle;
}

/** Tear down the current overlay if one is mounted (safe no-op otherwise). */
export function unmountMatchOverlay(): void {
  if (active) active.destroy();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function teamChip(sheet: TeamSheet): HTMLElement {
  const swatch = el('span', { class: 'nrl-mo-swatch' });
  swatch.style.background = sheet.colors[0];
  return el('div', { class: 'nrl-mo-chip' }, swatch, el('span', { class: 'nrl-mo-name', text: sheet.name }));
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

/** Deterministic seed for commentary from the result (score + event count). */
function deriveSeed(result: MatchResult): number {
  return ((result.homeScore + 1) * 73856093) ^ ((result.awayScore + 1) * 19349663) ^ result.events.length;
}

const OVERLAY_STYLE_ID = 'nrl-match-overlay-styles';
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

const OVERLAY_CSS = `
.nrl-match-overlay { font-family: 'Courier New', monospace; }
/* Match mode (live AND full-time, until Back to Club): the HUD strip and nav
   bar step aside; the sound button moves to the bottom-right corner. */
body.nrl-match-active .nrl-hud,
body.nrl-match-active .nrl-nav { display: none; }
body.nrl-match-active .nrl-audio-launcher { top: auto; bottom: 0.5rem; }
/* Toasts: above the commentary feed (clear of the scoreboard and stats). */
body.nrl-match-active .nrl-toast-stack { top: auto; bottom: 13.25rem; }
.nrl-mo-scoreboard {
  position: fixed; top: 0.5rem; left: 50%; transform: translateX(-50%);
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
.nrl-mo-centre { text-align: center; min-width: 5.5rem; flex: 0 0 auto; }
.nrl-mo-score { font-size: clamp(1rem, 4vw, 1.4rem); font-weight: bold; display: block; }
.nrl-mo-meta { display: flex; gap: 0.4rem; justify-content: center; font-size: clamp(0.55rem, 2vw, 0.7rem); white-space: nowrap; }
.nrl-mo-stats {
  position: fixed; top: 4.5rem; right: 0.5rem; z-index: 15; min-width: 9.5rem;
}
.nrl-mo-stats-toggle { width: 100%; margin-bottom: 0.35rem; }
.nrl-mo-stat-line { font-size: 0.7rem; margin: 0.15rem 0; }
.nrl-mo-poss-bar { height: 0.6rem; border: 2px solid #000; background: #b34747; margin: 0.2rem 0; }
.nrl-mo-poss-fill { display: block; height: 100%; background: #4779b3; width: 50%; }
.nrl-mo-commentary {
  position: fixed; left: 0.5rem; right: 0.5rem; bottom: 3.25rem; z-index: 14;
  max-width: 34rem; margin: 0 auto;
}
.nrl-mo-feed { display: flex; flex-direction: column; gap: 0.15rem; max-height: 8rem; overflow-y: auto; }
.nrl-mo-line { font-size: clamp(0.6rem, 2.4vw, 0.8rem); line-height: 1.25; }
/* Playback controls (mounted by MatchScene): bottom-centre, where the nav bar
   sits outside a match; the commentary feed stacks above them. */
.nrl-mo-controls {
  position: fixed; left: 50%; bottom: 0.5rem; transform: translateX(-50%);
  z-index: 20; display: flex; gap: 0.35rem; pointer-events: auto;
}
.nrl-mo-controls .nrl-btn[data-active] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; }
/* Full-time: scoreboard and stats stay put (HUD/nav are still hidden); the
   feed gives way to the Back-to-Club button (MatchScene, bottom-centre where
   the controls were) and the result toast sits just above it. */
.nrl-mo-final .nrl-mo-commentary { display: none; }
body.nrl-match-final .nrl-toast-stack { bottom: 3.75rem; }
/* Short (landscape phone) viewports: keep stats and commentary apart. */
@media (max-height: 480px) {
  .nrl-mo-stats { top: 4rem; min-width: 8.5rem; padding: 0.3rem 0.5rem; }
  .nrl-mo-stat-line { font-size: 0.62rem; margin: 0.05rem 0; }
  .nrl-mo-feed { max-height: 3.4rem; }
  .nrl-mo-commentary { max-width: min(34rem, calc(100vw - 13rem)); margin: 0; }
  body.nrl-match-active .nrl-toast-stack { bottom: 8.25rem; }
  body.nrl-match-final .nrl-toast-stack { bottom: 3.75rem; }
}
`;
