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
// re-anchors toasts under the scoreboard, clear of the ticker (finding 3). It
// stays on through full-time (GitHub #14: the match view stays clean until
// "Back to Club"), when `nrl-match-final` is added too: the feed gives way to
// the Back-to-Club button and the result toast stays under the scoreboard.
// Both are removed on destroy (the
// scene's teardown when leaving), which hands the HUD/nav back.
//
// The ticker's lines come from the live playback (match/view/commentary.ts, N15.2)
// through `comment()`: the overlay keeps the score from the events and says
// nothing of its own.
import { REPLAY_OFFER_MS } from '../../match/view/replay';
import { el, panel, button, mount, ensureStyles } from '../dom';
import { bus } from '../../core/events';
import { truncateTicker } from '../../world/readability';
import type { MatchEvent, MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../../match/league/presets';
import { TACTIC_BLURB } from '../tacticsBlurbs';

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
 * the #224 note). Null on a brand-new week 1, and null once they are all there.
 * The wording is an unlock hint: an old save that lost chips and a later week
 * of a new club read the same way.
 */
export const CALLS_LOCKED_HINT = "More calls unlock as you build up the Coach's Office.";

export function callsLockedHint(unlocked: number, all: number, seasoned: boolean): string | null {
  if (!seasoned || unlocked >= all) return null;
  return CALLS_LOCKED_HINT;
}

// ── DOM overlay ────────────────────────────────────────────────────────────────

/** Lines kept in the full log behind the ticker's Log toggle. */
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
  /** Continue (or the card timed out): the match goes on. */
  onDone: () => void;
  /** Go on by itself after this long (half-time at ×4 and above). */
  autoMs?: number;
}

export interface PlanCardHandle {
  readonly el: HTMLElement;
  close(): void;
}

/** Show the plan card over the field until Continue (or `autoMs`). */
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
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
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
    go,
  );
  render();
  mount(card);
  // Any tap on the card holds it: the auto-continue is for a coach who isn't watching.
  if (o.autoMs) {
    timer = setTimeout(close, o.autoMs);
    card.addEventListener('pointerdown', () => {
      if (timer) clearTimeout(timer);
      timer = null;
    });
  }
  return { el: card, close };
}

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
  const callsLabel = el('div', { class: 'nrl-mo-stat-line', text: '' });
  callsLabel.style.display = 'none';
  // Possession and the tackle count stay on the live match while a replay rewinds the scoreboard.
  const statsNote = el('div', { class: 'nrl-mo-stat-note', text: 'Live match', attrs: { hidden: '' } });
  const statsBody = el('div', { class: 'nrl-mo-stats-body' }, statsNote, possLabel, possBar, tackleLabel, errorLabel, callsLabel);
  // #18: stats start collapsed on phones so the pitch stays clear.
  let statsOpen = typeof window === 'undefined' || window.innerWidth > 600;
  const statsToggle = button(statsOpen ? 'Stats ▾' : 'Stats ▸', () => {
    statsOpen = !statsOpen;
    statsBody.style.display = statsOpen ? '' : 'none';
    statsToggle.textContent = statsOpen ? 'Stats ▾' : 'Stats ▸';
  }, { class: 'nrl-mo-stats-toggle' });
  statsBody.style.display = statsOpen ? '' : 'none';
  const statsPanel = panel({ class: 'nrl-mo-stats' }, statsToggle, statsBody);

  // Commentary: a slim two-line ticker (previous line dimmed, latest bright);
  // the full log sits behind a toggle so it never covers play unasked (#17).
  const tickerPrev = el('div', { class: 'nrl-mo-line nrl-mo-line-prev' });
  const tickerLatest = el('div', { class: 'nrl-mo-line' });
  const log = el('div', { class: 'nrl-mo-feed' });
  const logPanel = panel({ class: 'nrl-mo-log' }, log);
  logPanel.style.display = 'none';
  let logOpen = false;
  const logToggle = button('Log ▴', () => {
    logOpen = !logOpen;
    logPanel.style.display = logOpen ? '' : 'none';
    logToggle.textContent = logOpen ? 'Log ▾' : 'Log ▴';
    if (logOpen) log.scrollTop = log.scrollHeight;
  }, { class: 'nrl-mo-log-toggle' });
  const commentaryPanel = panel(
    { class: 'nrl-mo-commentary' },
    el('div', { class: 'nrl-mo-ticker' }, tickerPrev, tickerLatest),
    logToggle,
  );

  // Big centre-screen pop-up for every scoring attempt (who, what, points).
  const banner = el('div', { class: 'nrl-mo-banner', attrs: { role: 'status', 'aria-live': 'polite' } });
  banner.hidden = true;

  root.append(scoreboard, statsPanel, logPanel, commentaryPanel, banner);
  mount(root);

  let replayTimer: ReturnType<typeof setTimeout> | null = null;
  let replayBtn: HTMLButtonElement | null = null;
  let replayTag: HTMLElement | null = null;
  const clearReplayOffer = (): void => {
    if (replayTimer) clearTimeout(replayTimer);
    replayTimer = null;
    replayBtn?.remove();
    replayBtn = null;
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
  let bannerWasTry = false;
  /** Built during a burst of events (Skip) and shown once the burst ends. */
  let queued: { b: ScoreBanner; score: string } | null = null;
  let flushScheduled = false;

  const hideBanner = (): void => {
    banner.hidden = true;
    banner.classList.remove('nrl-mo-banner-in');
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
      banner.style.background = sheet.colors[0];
      banner.style.color = inkFor(sheet.colors[0]);
      banner.style.borderColor = sheet.colors[1];
      banner.classList.toggle('nrl-mo-banner-miss', b.points === 0);
      // Restart the pop-in animation.
      banner.classList.remove('nrl-mo-banner-in');
      void banner.offsetWidth;
      banner.classList.add('nrl-mo-banner-in');
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
      clearReplayOffer();
      replayTag?.remove();
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
      replayBtn = button('Replay', () => {
        clearReplayOffer();
        onTap();
      }, { class: 'nrl-mo-replay' });
      root.append(replayBtn);
      replayTimer = setTimeout(clearReplayOffer, REPLAY_OFFER_MS);
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
body.nrl-match-active .nrl-audio-launcher { top: auto; bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px)); }
/* Toasts: under the scoreboard, in the overlay's top margin, clear of the ticker and the Log button (finding 3). */
body.nrl-match-active .nrl-toast-stack,
body.nrl-match-final .nrl-toast-stack {
  top: calc(3.6rem + env(safe-area-inset-top, 0px));
  bottom: auto;
  right: auto;
  left: calc(0.5rem + env(safe-area-inset-left, 0px));
  align-items: flex-start;
  max-width: min(22rem, calc(100vw - 12rem));
}
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
.nrl-mo-centre { text-align: center; min-width: 5.5rem; flex: 0 0 auto; }
.nrl-mo-score { font-size: clamp(1rem, 4vw, 1.4rem); font-weight: bold; display: block; }
.nrl-mo-meta { display: flex; gap: 0.4rem; justify-content: center; font-size: clamp(0.55rem, 2vw, 0.7rem); white-space: nowrap; }
.nrl-mo-stats {
  position: fixed; top: calc(4.5rem + env(safe-area-inset-top, 0px)); right: calc(0.5rem + env(safe-area-inset-right, 0px)); z-index: 15; min-width: 9.5rem;
}
.nrl-mo-stats-toggle { width: 100%; margin-bottom: 0.35rem; }
.nrl-mo-stat-line { font-size: 0.7rem; margin: 0.15rem 0; }
.nrl-mo-stat-note { font-size: 0.62rem; font-weight: bold; letter-spacing: 0.04em; margin: 0 0 0.15rem; }
.nrl-mo-stat-note[hidden] { display: none; }
.nrl-mo-poss-bar { height: 0.6rem; border: 2px solid #000; background: #b34747; margin: 0.2rem 0; }
.nrl-mo-poss-fill { display: block; height: 100%; background: #4779b3; width: 50%; }
.nrl-mo-commentary {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); right: calc(0.5rem + env(safe-area-inset-right, 0px)); bottom: calc(3.75rem + env(safe-area-inset-bottom, 0px)); z-index: 14;
  max-width: 34rem; margin: 0 auto; padding: 0.25rem 0.5rem;
  display: flex; align-items: center; gap: 0.5rem; box-sizing: border-box;
}
.nrl-mo-ticker { flex: 1 1 auto; min-width: 0; }
.nrl-mo-ticker .nrl-mo-line { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 1.25em; }
.nrl-mo-line-prev { opacity: 0.55; }
.nrl-mo-log-toggle { flex: 0 0 auto; }
/* Full log: opt-in, stacked just above the ticker. */
.nrl-mo-log {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); right: calc(0.5rem + env(safe-area-inset-right, 0px)); bottom: calc(7rem + env(safe-area-inset-bottom, 0px)); z-index: 14;
  max-width: 34rem; margin: 0 auto;
}
.nrl-mo-feed { display: flex; flex-direction: column; gap: 0.15rem; max-height: 8rem; overflow-y: auto; }
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
.nrl-mo-calls .nrl-btn { min-height: 44px; min-width: 4.6rem; padding: 0.15rem 0.4rem; font-size: 0.78rem; }
.nrl-mo-calls .nrl-btn[data-made] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; opacity: 1; }
.nrl-mo-final .nrl-mo-calls, body.nrl-match-final .nrl-mo-calls { display: none; }
.nrl-mo-controls .nrl-btn[data-active] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; }
/* The plan card (N11): over the field at half-time or from the Plan chip; above the controls. */
.nrl-mo-plan {
  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 25;
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  width: min(42rem, calc(100vw - 1rem)); max-height: calc(100vh - 1rem); overflow-y: auto; box-sizing: border-box; padding: 0.6rem 0.8rem;
}
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
  .nrl-mo-plan { gap: 0.2rem; padding: 0.35rem 0.6rem; }
  .nrl-mo-plan-head { font-size: 1rem; }
  .nrl-mo-plan-row .nrl-btn { padding: 0.1rem 0.35rem; font-size: 0.72rem; }
}
/* Full-time: scoreboard and stats stay put (HUD/nav are still hidden); the
   feed gives way to the Back-to-Club button (MatchScene, bottom-centre where
   the controls were). The result toast stays under the scoreboard, off the ticker. */
.nrl-mo-final .nrl-mo-commentary, .nrl-mo-final .nrl-mo-log { display: none; }
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
/* Replay (N15.5): above the ticker, clear of the speed buttons and the calls. */
.nrl-mo-replay, .nrl-mo-replay-tag {
  position: fixed; left: 50%; bottom: calc(8rem + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  z-index: 26; pointer-events: auto; min-height: 44px; min-width: 7rem;
}
.nrl-mo-replay-tag {
  pointer-events: none; padding: 0.35rem 0.8rem; background: #1a1a2e; color: #fff; border: 3px solid #000;
  font-weight: bold; letter-spacing: 0.08em; box-shadow: 3px 3px 0 #000;
}
@media (prefers-reduced-motion: reduce) {
  .nrl-mo-banner-in, .nrl-mo-scored, .nrl-mo-chip.nrl-mo-scored, .nrl-mo-banner-extra { animation: none; }
}
/* Short (landscape phone) viewports: keep stats and commentary apart. */
@media (max-height: 480px) {
  .nrl-mo-controls { gap: 0.25rem; }
  .nrl-mo-controls .nrl-btn { padding: 0.2rem 0.4rem; font-size: 0.72rem; }
  .nrl-mo-stats { top: 4rem; min-width: 8.5rem; padding: 0.3rem 0.5rem; }
  .nrl-mo-stat-line { font-size: 0.62rem; margin: 0.05rem 0; }
  .nrl-mo-feed { max-height: 3.4rem; }
  .nrl-mo-commentary, .nrl-mo-log { max-width: min(34rem, calc(100vw - 13rem)); margin: 0; }
  .nrl-mo-banner { top: 19%; min-width: 14rem; padding: 0.25rem 0.9rem 0.35rem; border-width: 3px; }
  .nrl-mo-banner-score { margin-top: 0.2rem; }
  body.nrl-match-active .nrl-toast-stack,
  body.nrl-match-final .nrl-toast-stack { top: calc(3.1rem + env(safe-area-inset-top, 0px)); }
  .nrl-mo-replay, .nrl-mo-replay-tag { bottom: calc(6.6rem + env(safe-area-inset-bottom, 0px)); }
}
`;
