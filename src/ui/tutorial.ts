// src/ui/tutorial.ts — onboarding / tutorial flow. See BAK-202 (WU-15),
// ARCHITECTURE §4 (settings.tutorialDone), §5 (event bus), §6 (DOM overlay).
// No Phaser imports. A declarative ordered step list drives a pixel-styled
// speech-bubble panel rendered into #ui-root, with a gold frame anchored to a
// real UI element by CSS selector. Nothing is dimmed: the dim made the build
// menu look disabled and hid the grass the placement step asks for (#337 U2).
//
// Ownership: only the orchestrator (main.ts) decides *when* to auto-start — it
// calls startTutorial() after newGame; startTutorial() with no force is a no-op
// when settings.tutorialDone is already true. Replay is startTutorial(true),
// wired later from the settings popup (see REPLAY note at the bottom).
//
// #370: the first session is three guided taps (build a Training Paddock, sign a
// player, Advance Week) in place of the 11-step tour; what the old steps
// explained about Lineup, News, Finance and Contracts is a one-line hint the
// first time each screen opens (HINTS, settings.hintsSeen). DECISION (Leon).

import { bus, type Events } from '../core/events';
import { getState, setState, type GameState } from '../core/state';
import { FACILITY_CATALOG } from '../data/facility';
import { el, button, mount, ensureStyles, onScreenChange, SCREEN_KEY_ATTR } from './dom';

// ── Declarative step model ─────────────────────────────────────────────────

/** How a step advances: the bubble's Next button, or a named bus event. */
export type AdvanceOn = 'next-button' | keyof Events;

/** A single onboarding step. Pure data — no DOM, safe to unit-test. */
export interface TutorialStep {
  /** Stable identifier (also used as a DOM hook + test key). */
  id: string;
  /** Bubble body copy: one short sentence (#370; two at most before it, #337). */
  text: string;
  /** CSS selector into #ui-root to highlight, or null for a centered bubble. */
  anchor: string | null;
  /** Advance trigger: 'next-button' or a bus event name. */
  advanceOn: AdvanceOn;
  /** The nav screen the step opens when it starts, so it explains what is on screen (#337 U3). */
  opens?: string;
  /** Also advance once this selector is on screen (the placement bar, which has no bus event). */
  until?: string;
  /** Which of the three guided taps it belongs to (#370): the bubble reads "1 of 3". */
  tap: number;
  /** An Undo of this step's action (#370): the run comes back to this step (see tapUndone). */
  revertOn?: keyof Events;
  /** Another event that also ends the step (the demo stopping the first advance, #362). */
  alsoOn?: keyof Events;
}

/**
 * The onboarding steps, in order (BAK-202 spec; tied to their screens by #337;
 * three taps since #370). Tap 1 is two steps: Build opens with the paddock's row
 * framed, and once its placement bar is up the next step frames the bar and the
 * grass. Anchor selectors reference elements that really exist in the shipped UI:
 *   - nav buttons carry `data-screen="<id>"` (see ui/nav.ts registerScreen)
 *   - open screens carry `data-screen-key="<id>"` (see ui/dom.ts openScreen)
 *   - the Advance Week control is the button inside `.nrl-hud-actions` (ui/hud.ts)
 * An anchor may list fallbacks: the first on screen wins, so a screen in More's
 * sheet (#344) is highlighted on the More tab until the sheet is open. When only
 * a fallback is on screen the bubble offers Next, so a closed screen never strands the player.
 *
 * What became of the 11-step tour (#370): welcome and wrap dropped (the first tap
 * is the welcome; the end is a toast, see endTutorial); squad dropped (the Guide's
 * Squad page covers it); lineup, news, finance and contracts are HINTS.
 */
const inMore = (id: string): string => `.nrl-nav .nrl-btn[data-screen="${id}"], .nrl-nav [data-nav-more]`;

/** The paddock's name as the catalog has it, so a rename follows (#361 owns the names). */
const PADDOCK = FACILITY_CATALOG.trainingPaddock.name;

export const STEPS: readonly TutorialStep[] = [
  {
    id: 'build',
    text: `Tap ${PADDOCK} to build one.`,
    anchor: `[data-screen-key="build"] [data-facility="trainingPaddock"], ${inMore('build')}`,
    advanceOn: 'facility:placed',
    opens: 'build',
    until: '.nrl-placebar:not([hidden])',
    tap: 1,
    revertOn: 'facility:removed',
  },
  {
    id: 'place',
    text: 'Tap a green spot on the grass to build it there.',
    anchor: `.nrl-placebar:not([hidden]), ${inMore('build')}`,
    advanceOn: 'facility:placed',
    tap: 1,
  },
  {
    id: 'recruit',
    // The default sort is by rating, so the first enabled SIGN is the best player the club can afford.
    text: 'Tap Sign on the best player you can afford.',
    anchor:
      `[data-screen-key="recruit"] .nrl-row:has(.nrl-row-action:not(:disabled)), ` +
      `[data-screen-key="recruit"] .nrl-row-action:not(:disabled), ${inMore('recruit')}`,
    advanceOn: 'player:signed',
    opens: 'recruit',
    tap: 2,
    revertOn: 'player:unsigned',
  },
  {
    id: 'advance',
    text: 'Tap Advance Week to play your first match.',
    anchor: '.nrl-hud-actions .nrl-btn',
    advanceOn: 'week:advanced',
    tap: 3,
    alsoOn: 'commercial:demoEnded',
  },
] as const;

/** How many guided taps there are (the "of 3"). */
export const TAP_COUNT = Math.max(...STEPS.map((s) => s.tap));

/**
 * The one-line hints shown the first time each screen opens (#370), by the
 * screen's nav key. They carry what the old tour's steps for these screens said.
 */
export const HINTS: Readonly<Record<string, string>> = {
  lineup: 'Lineup sets your nine, kicker, captain and game plan; you can change the plan at half-time.',
  news: 'News keeps results and warnings; a decision shows here and as a red count on Advance Week.',
  finance: "Money in and out by line; the board's season goals are on Staff & Board.",
  contracts: 'Deals by expiry: renew before a player walks, or sell him for a fee.',
};

/** The end of a completed run (#370): what the old wrap step said, as a club toast. */
export const TUTORIAL_END_TEXT = "That's the loop. The Guide under More explains the rest.";

// ── Pure logic (unit-tested; no DOM) ───────────────────────────────────────

/**
 * Whether an auto-start (startTutorial() without force) should proceed for the
 * given settings. It should only run for a fresh game that hasn't completed the
 * tutorial. Extracted so tutorialDone gating is testable without the DOM.
 */
export function shouldAutoStart(settings: { tutorialDone: boolean }): boolean {
  return settings.tutorialDone === false;
}

/**
 * Whether a step advances on a bus event (vs. the Next button). When true, the
 * `advanceOn` value is a valid `keyof Events` and a per-step listener is bound.
 */
export function isEventStep(
  step: TutorialStep,
): step is TutorialStep & { advanceOn: keyof Events } {
  return step.advanceOn !== 'next-button';
}

/** Sentences in a step's copy (#337: two at most). */
export function sentenceCount(text: string): number {
  return text.split(/[.!?](?:\s|$)/).filter((t) => t.trim().length > 0).length;
}

/** Milliseconds between looks for a step's anchor while it is not on screen. */
export const ANCHOR_RETRY_MS = 500;

type Settings = GameState['settings'];

/** A Training Paddock already stands. */
function hasPaddock(s: Pick<GameState, 'facilities'>): boolean {
  return s.facilities.some((f) => f.defId === 'trainingPaddock');
}

/** Where a run starts (#370): at tap 2 when a paddock already stands (a save written mid-run, a replay). */
export function firstStepIndex(s: Pick<GameState, 'facilities'>): number {
  return hasPaddock(s) ? STEPS.findIndex((st) => st.id === 'recruit') : 0;
}

/**
 * Whether the Undo that fired `step.revertOn` took the step's work back, so the
 * run returns to it (#370): an undone build only when no paddock stands now (an
 * undone Weights Room leaves tap 1 done); an undone signing always.
 */
export function tapUndone(step: TutorialStep, s: Pick<GameState, 'facilities'>): boolean {
  if (step.id === 'build') return !hasPaddock(s);
  return step.revertOn !== undefined;
}

/**
 * Whether first-visit hints are on for this save (#370). `hintsSeen` absent is a
 * save from before the three taps (or one that never ran them): no hints, so an
 * existing save sees nothing new. `[]` is armed, none seen yet.
 */
export function hintsArmed(settings: Pick<Settings, 'hintsSeen'>): boolean {
  return Array.isArray(settings.hintsSeen);
}

/** The hint to show on screen `key` now, or null (not a hint screen, not armed, or already seen). */
export function hintFor(settings: Pick<Settings, 'hintsSeen'>, key: string | null): string | null {
  if (key === null || !Object.prototype.hasOwnProperty.call(HINTS, key)) return null;
  if (!hintsArmed(settings) || settings.hintsSeen!.includes(key)) return null;
  return HINTS[key]!;
}

/** `settings` with screen `key`'s hint marked seen (it shows once). */
export function markHintSeen(settings: Settings, key: string): Settings {
  const seen = settings.hintsSeen ?? [];
  return seen.includes(key) ? settings : { ...settings, hintsSeen: [...seen, key] };
}

// ── Runtime state (module singleton) ───────────────────────────────────────

interface ActiveTutorial {
  index: number;
  /** Root overlay node (holds bubble + optional cutout). */
  overlay: HTMLElement;
  /** Unsubscribe for the current step's bus listeners (its advance, its alsoOn, earlier steps' revertOn). */
  offEvent: (() => void) | null;
  /** The anchor poll (an interval), while the step's anchor is not on screen. */
  retryTimer: ReturnType<typeof setTimeout> | null;
  /** Unsubscribe for the match hold (see holdForMatch). */
  offMatch: () => void;
  /** A replay from Settings or the Guide: every tap also offers Next, as a step may not be doable in this save (#370). */
  replay: boolean;
}

let active: ActiveTutorial | null = null;
let openScreenById: ((id: string) => void) | null = null;
const afterTutorial: (() => void)[] = [];

/** How a step opens its screen (main.ts passes the nav's opener). */
export function setTutorialScreens(open: (id: string) => void): void {
  openScreenById = open;
}

/** Run `fn` now, or once the tutorial ends (the iOS install hint, #337 U4). */
export function whenTutorialDone(fn: () => void): void {
  if (active) afterTutorial.push(fn);
  else fn();
}

/** Body class the match overlay sets from kick-off until Back to Club (ui/screens/matchOverlay.ts). */
const MATCH_BODY_CLASS = 'nrl-match-active';

/** True while a tutorial run is on-screen. Used to guard double-starts. */
export function isTutorialActive(): boolean {
  return active !== null;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Start (or replay) the tutorial.
 *  - `force === false` (default): a no-op if the tutorial has already been
 *    completed (settings.tutorialDone) — the orchestrator calls this after a
 *    new game so a returning player isn't re-onboarded.
 *  - `force === true`: always runs from step 0 (settings replay), WITHOUT
 *    clearing tutorialDone until the run completes.
 * Guards against double-starts via isTutorialActive().
 */
export function startTutorial(force = false): void {
  if (isTutorialActive()) return;
  const s = getState();
  if (!force && !shouldAutoStart(s.settings)) return;
  // #370: arm the first-visit hints (a replay brings them back). Before the DOM
  // guard so the node tests see it.
  setState({ settings: { ...s.settings, hintsSeen: [] } });
  // DOM-less environments (node unit tests): nothing to render.
  if (typeof document === 'undefined') return;

  ensureStyles();
  ensureTutorialStyles();
  const overlay = el('div', {
    class: 'nrl-tutorial',
    attrs: { 'data-tutorial': 'overlay' },
  });
  mount(overlay);
  active = { index: firstStepIndex(getState()), overlay, offEvent: null, retryTimer: null, offMatch: holdForMatch(overlay), replay: force };
  renderStep();
}

/**
 * #337 U1: the tutorial stands aside for a match. It hides the moment the match
 * starts, before the match scene draws, and comes back once the club is on
 * screen again (the overlay's body class gone). CSS backs this up: nothing of
 * the tutorial shows under that class. Returns the teardown.
 */
function holdForMatch(overlay: HTMLElement): () => void {
  let seen = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const release = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    overlay.hidden = false;
    if (active?.overlay !== overlay) return;
    clearStepBindings(active);
    renderStep();
  };
  const off = bus.on('match:started', () => {
    overlay.hidden = true;
    seen = false;
    if (timer !== null) clearInterval(timer);
    timer = setInterval(() => {
      const on = document.body.classList.contains(MATCH_BODY_CLASS);
      if (on) seen = true;
      else if (seen) release();
    }, ANCHOR_RETRY_MS);
  });
  return () => {
    off();
    if (timer !== null) clearInterval(timer);
  };
}

/**
 * End the tutorial: mark it done, tear down DOM and any live bus listener /
 * timer. Idempotent — safe to call when no tutorial is active. `completed`: the
 * run reached its end (not Skip), so the closing line shows as a club toast (#370).
 */
export function endTutorial(completed = false): void {
  if (!active) return;
  clearStepBindings(active);
  active.offMatch();
  active.overlay.remove();
  active = null;
  for (const fn of afterTutorial.splice(0)) fn();
  // Persist completion (replace the settings object wholesale — setState
  // shallow-merges top-level keys only, see state.ts).
  const s = getState();
  if (!s.settings.tutorialDone) {
    setState({ settings: { ...s.settings, tutorialDone: true } });
  }
  if (completed) bus.emit('ui:notify', { text: TUTORIAL_END_TEXT, kind: 'info' });
}

// ── Step lifecycle (DOM) ───────────────────────────────────────────────────

/** Remove the current step's bus listener and any pending retry timer. */
function clearStepBindings(a: ActiveTutorial): void {
  if (a.offEvent) {
    a.offEvent();
    a.offEvent = null;
  }
  if (a.retryTimer !== null) {
    clearInterval(a.retryTimer as ReturnType<typeof setInterval>);
    a.retryTimer = null;
  }
}

/** Advance to the next step, or end the tutorial after the last one. */
function advance(fired: keyof Events | null = null): void {
  if (!active) return;
  clearStepBindings(active);
  const index = nextStepIndex(active.index, fired);
  if (index >= STEPS.length) {
    endTutorial(true);
    return;
  }
  active.index = index;
  renderStep();
}

/**
 * The step after `index`, once `fired` (null: Next, or the `until` poll) has ended
 * it. An event that also ends the next step of the same tap skips that step too:
 * the paddock placed before the build step's poll saw the placement bar finishes
 * all of tap 1 (#370). STEPS.length when the run is over.
 */
export function nextStepIndex(index: number, fired: keyof Events | null): number {
  let i = index + 1;
  while (fired !== null && i < STEPS.length && STEPS[i]!.tap === STEPS[index]!.tap && STEPS[i]!.advanceOn === fired) i++;
  return i;
}

/**
 * The current step's bus listeners: its advance event, its `alsoOn` (which ends
 * the run: the demo stopped the first advance, so the paywall owns the screen),
 * and every earlier step's `revertOn`, so an Undo of an earlier tap's action
 * brings the run back to that tap (#370). Returns their teardown.
 */
function bindStep(a: ActiveTutorial, step: TutorialStep): () => void {
  const offs: (() => void)[] = [];
  if (isEventStep(step)) offs.push(bus.on(step.advanceOn, () => advance(step.advanceOn as keyof Events)));
  if (step.alsoOn) offs.push(bus.on(step.alsoOn, () => endTutorial()));
  for (let i = 0; i < a.index; i++) {
    const earlier = STEPS[i]!;
    if (!earlier.revertOn) continue;
    offs.push(bus.on(earlier.revertOn, () => {
      if (active !== a || !tapUndone(earlier, getState())) return;
      clearStepBindings(a);
      a.index = i;
      renderStep();
    }));
  }
  return () => {
    for (const off of offs) off();
  };
}

/**
 * Render the current step: build the bubble, bind its advance trigger, and set
 * up the cutout highlight (with a 500ms retry → centered fallback + forced Next
 * so the user is never stuck on a missing anchor).
 */
function renderStep(): void {
  if (!active) return;
  const a = active;
  const step = STEPS[a.index]!;

  // Fresh overlay contents each step.
  a.overlay.replaceChildren();
  // Held for a match: the step draws when the club is back (holdForMatch).
  if (a.overlay.hidden) {
    a.offEvent = bindStep(a, step);
    return;
  }
  if (step.opens && !document.querySelector(`[data-screen-key="${step.opens}"]`)) openScreenById?.(step.opens);

  // Bind the advance trigger. Event steps get exactly one listener (the current
  // step's only) so acting "out of order" earlier does nothing.
  a.offEvent = bindStep(a, step);

  if (!step.anchor) {
    renderBubble(a, step, { centered: true, forceNext: false });
    return;
  }

  // Draw against the anchor on screen now, then keep looking every
  // ANCHOR_RETRY_MS: it may not be up yet (centered with a Next escape hatch), a
  // better one may appear (More's sheet opened, #344), or the step's `until` may
  // show. The poll stops with the step.
  const show = (found: { el: HTMLElement; fallback: boolean } | null): void => {
    a.overlay.replaceChildren();
    if (found) {
      scrollAnchorIntoView(found.el);
      renderCutout(a, found.el);
      dockClear(renderBubble(a, step, { centered: false, forceNext: found.fallback }), found.el);
    } else {
      renderBubble(a, step, { centered: true, forceNext: true });
    }
  };
  let found = findAnchor(step.anchor);
  let shown = found?.el ?? null;
  show(found);
  a.retryTimer = setInterval(() => {
    if (active !== a || STEPS[a.index] !== step || a.overlay.hidden) return;
    if (step.until && findAnchor(step.until)) {
      advance();
      return;
    }
    found = findAnchor(step.anchor!);
    const now = found?.el ?? null;
    if (now !== shown) {
      shown = now;
      show(found);
    } else if (now) {
      // Same anchor: follow it if the layout moved it, without scrolling it back.
      renderCutout(a, now);
      dockClear(a.overlay.querySelector('.nrl-tutorial-bubble')!, now);
    }
  }, ANCHOR_RETRY_MS);
}

/**
 * Look up an anchor within the UI overlay (falls back to whole document). A
 * comma-separated anchor is a list of choices, best first. An element that is
 * in the DOM but not on screen (the nav is display:none during a match, a
 * closed sheet) does not count: a cutout drawn around a zero-size box lands in
 * the corner, so the step keeps polling until the box is real.
 */
function findAnchor(selector: string): { el: HTMLElement; fallback: boolean } | null {
  const root: ParentNode = document.getElementById('ui-root') ?? document;
  const choices = selector.split(',');
  for (const [i, choice] of choices.entries()) {
    let found: HTMLElement | null;
    try {
      found =
        (root.querySelector(choice) as HTMLElement | null) ??
        (document.querySelector(choice) as HTMLElement | null);
    } catch {
      continue; // a selector this browser can't parse (:has before Safari 15.4)
    }
    if (!found) continue;
    const r = found.getBoundingClientRect();
    // On a nav tab when the step is about something on a screen: the screen was closed.
    if (r.width > 0 && r.height > 0) return { el: found, fallback: i > 0 && !choices[0]!.trim().startsWith('.nrl-nav') && found.closest('.nrl-nav') !== null };
  }
  return null;
}

/** Centre the anchor in view before highlighting (mobile-friendly). */
function scrollAnchorIntoView(anchorEl: HTMLElement): void {
  try {
    anchorEl.scrollIntoView({ block: 'center', inline: 'center' });
  } catch {
    // scrollIntoView options unsupported in some environments — ignore.
    anchorEl.scrollIntoView();
  }
}

/** Position the `.nrl-tutorial-cutout` frame over the anchor (pointer-events:none, so the anchor stays tappable). */
function renderCutout(a: ActiveTutorial, anchorEl: HTMLElement): void {
  const r = anchorEl.getBoundingClientRect();
  const pad = 6;
  const cutout = a.overlay.querySelector<HTMLElement>('.nrl-tutorial-cutout') ?? a.overlay.appendChild(el('div', { class: 'nrl-tutorial-cutout' }));
  cutout.style.top = `${r.top - pad}px`;
  cutout.style.left = `${r.left - pad}px`;
  cutout.style.width = `${r.width + pad * 2}px`;
  cutout.style.height = `${r.height + pad * 2}px`;
}

/** Bubble docks, tried in order until one leaves the anchor uncovered (More's sheet fills the bottom-left dock, #344). */
const DOCKS = ['', ' nrl-tutorial-top', ' nrl-tutorial-top nrl-tutorial-right', ' nrl-tutorial-right'];

/**
 * Dock the bubble clear of the anchor and its frame (#337 U2). When every dock
 * overlaps (a big row on a short screen), take the one that covers least.
 */
function dockClear(bubble: HTMLElement, anchorEl: HTMLElement): void {
  const pad = 6;
  const a = anchorEl.getBoundingClientRect();
  const r = { left: a.left - pad, right: a.right + pad, top: a.top - pad, bottom: a.bottom + pad };
  const base = bubble.classList.contains('nrl-tutorial-bar') ? 'nrl-tutorial-bubble nrl-tutorial-bar' : 'nrl-tutorial-bubble';
  let best = { dock: DOCKS[0]!, area: Infinity };
  for (const dock of DOCKS) {
    bubble.className = `${base}${dock}`;
    const b = bubble.getBoundingClientRect();
    const area = Math.max(0, Math.min(b.right, r.right) - Math.max(b.left, r.left)) *
      Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top));
    if (area === 0) return;
    if (area < best.area) best = { dock, area };
  }
  bubble.className = `${base}${best.dock}`;
}

/**
 * Build the speech-bubble panel: body text, an always-present Skip button, and a
 * Next button when the step advances on the button (or when `forceNext` is set
 * for a stuck/missing anchor). `centered` toggles centered vs. bottom layout.
 */
function renderBubble(
  a: ActiveTutorial,
  step: TutorialStep,
  opts: { centered: boolean; forceNext: boolean },
): HTMLElement {
  const wantsNext = step.advanceOn === 'next-button' || opts.forceNext || a.replay;

  const body = el('div', { class: 'nrl-tutorial-text', text: step.text });

  // "1 of 3" (#370) at the start of the button row, so it costs the copy no room.
  const actions = el('div', { class: 'nrl-tutorial-actions' },
    el('span', { class: 'nrl-tutorial-count', text: `${step.tap} of ${TAP_COUNT}` }));
  actions.appendChild(button('Skip', () => endTutorial(), { class: 'nrl-tutorial-skip' }));
  if (wantsNext) {
    actions.appendChild(button('Next', () => advance(), { class: 'nrl-tutorial-next' }));
  }

  // A step that opened its screen keeps to a bar on a landscape phone, so the screen shows under it.
  const bubbleClass = opts.centered
    ? 'nrl-tutorial-bubble nrl-tutorial-centered'
    : step.opens ? 'nrl-tutorial-bubble nrl-tutorial-bar' : 'nrl-tutorial-bubble';
  const bubble = el(
    'div',
    { class: bubbleClass, attrs: { 'data-step': step.id } },
    body,
    actions,
  );
  a.overlay.appendChild(bubble);
  return bubble;
}

// ── First-visit hints (#370) ─────────────────────────────────────────────

/** The hint line for screen `key`: the text and a 44px ✕. */
function hintLine(key: string, text: string): HTMLElement {
  const line = el('div', { class: 'nrl-hint', attrs: { 'data-hint': key, role: 'note' } }, el('span', { class: 'nrl-hint-text', text }));
  const x = button('✕', () => line.remove(), { class: 'nrl-hint-x' });
  x.setAttribute('aria-label', 'Dismiss hint');
  line.append(x);
  return line;
}

/**
 * Show each screen's one-line hint the first time it opens (#370): at the top of
 * the screen, under its header (inside a framed screen's scroll, which its own
 * re-renders leave alone). It is marked seen as it shows, so it shows once; not
 * while a guided tap is up (it shows on the next visit instead). Call once, after
 * the screens are registered. Returns the unsubscribe.
 */
export function initFirstVisitHints(): () => void {
  return onScreenChange((key) => {
    if (isTutorialActive()) return;
    const s = getState();
    const text = hintFor(s.settings, key);
    if (!text || !key) return;
    const node = document.querySelector<HTMLElement>(`[${SCREEN_KEY_ATTR}="${key}"]`);
    if (!node) return;
    const line = hintLine(key, text);
    const scroll = node.querySelector('.nrl-modal-scroll');
    const head = node.querySelector('.nrl-screen-head');
    if (scroll) scroll.prepend(line);
    else if (head) head.after(line);
    else node.prepend(line);
    setState({ settings: markHintSeen(s.settings, key) });
  });
}

// ── Styles ───────────────────────────────────────────────────────────────
// Injected once, lazily, from startTutorial. Kept out of dom.ts (owned by WU-5)
// so this ticket edits only files it owns. Pixel-art styling to match the kit:
// chunky borders, hard drop shadow, monospace, pixelated rendering.

const TUTORIAL_STYLE_ID = 'nrl-tutorial-styles';

function ensureTutorialStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(TUTORIAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TUTORIAL_STYLE_ID;
  style.textContent = TUTORIAL_CSS;
  document.head.appendChild(style);
}

export const TUTORIAL_CSS = `
.nrl-tutorial {
  position: fixed;
  inset: 0;
  pointer-events: none; /* only the bubble takes taps */
  z-index: 200;         /* above HUD/nav (55) and modals (100) */
  font-family: 'Courier New', monospace;
  image-rendering: pixelated;
}
.nrl-tutorial-cutout {
  position: fixed;
  pointer-events: none;
  border: 3px solid #f4d03f;
  box-shadow: 0 0 0 3px #000, 0 0 12px 2px #f4d03f;
  z-index: 200;
}
/* #337 U1: never over a match, live or at full time. */
body.nrl-match-active .nrl-tutorial, .nrl-tutorial[hidden] { display: none; }
.nrl-tutorial-bubble {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  bottom: calc(5rem + var(--nrl-safe-b, 0px)); /* clear of the nav and the home bar */
  transform: translateX(-50%);
  max-width: min(90vw, 320px);
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.75rem 0.9rem;
  z-index: 201;
  /* #206: never taller than the room above its dock. The copy scrolls inside the
     bubble and Skip / Next stay pinned at its foot, so however big the text gets
     (iOS Safari's landscape text boost, a larger system font) they stay on screen.
     dvh follows Safari's toolbars; the vh line is the fallback. */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 5.75rem - var(--nrl-safe-b, 0px) - var(--nrl-safe-t, 0px));
  max-height: calc(100dvh - 5.75rem - var(--nrl-safe-b, 0px) - var(--nrl-safe-t, 0px));
}
.nrl-tutorial-centered {
  top: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  max-height: calc(100vh - 1.5rem);
  max-height: calc(100dvh - 1.5rem);
}
.nrl-tutorial-text {
  font-size: clamp(0.8rem, 3vw, 1rem);
  line-height: 1.35;
  margin-bottom: 0.7rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.nrl-tutorial-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex: 0 0 auto;
}
/* A landscape phone (#195): the bubble docks bottom-left, clear of the tile the
   player has to tap, the match's speed buttons and the home bar. */
@media (max-height: 500px) {
  .nrl-tutorial-bubble, .nrl-tutorial-centered {
    top: auto;
    bottom: calc(4.5rem + var(--nrl-safe-b, 0px));
    left: calc(0.75rem + var(--nrl-safe-l, 0px));
    right: auto;
    transform: none;
    /* 300px with border-box is ~265px of copy: every step fits unscrolled at
       750×340 and 956×330 (#208); the height cap below is the backstop. */
    max-width: min(60vw, 300px);
    max-height: calc(100vh - 5.25rem - var(--nrl-safe-b, 0px) - var(--nrl-safe-t, 0px));
    max-height: calc(100dvh - 5.25rem - var(--nrl-safe-b, 0px) - var(--nrl-safe-t, 0px));
  }
}
/* The bar: one row above the nav, copy then Skip and Next, over about one row of
   the screen the step opened instead of half of it. */
@media (max-height: 500px) {
  .nrl-tutorial-bubble.nrl-tutorial-bar {
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    left: calc(0.75rem + var(--nrl-safe-l, 0px));
    right: calc(0.75rem + var(--nrl-safe-r, 0px));
    bottom: calc(var(--nrl-nav-h, 3.5rem) + 0.25rem);
    max-width: 640px;
    padding: 0.35rem 0.6rem;
  }
  /* Capped in rem, which a text boost leaves alone: boosted copy scrolls (#206) instead of growing the bar over the screen. */
  .nrl-tutorial-bar .nrl-tutorial-text { margin: 0; font-size: 0.8rem; line-height: 1.25; max-height: 5rem; }
}
.nrl-tutorial-bubble.nrl-tutorial-top { top: calc(var(--nrl-hud-h, 0px) + 0.25rem); bottom: auto; }
/* #370: which of the three taps this is. */
.nrl-tutorial-count {
  align-self: center;
  margin-right: auto;
  padding: 0 0.3em;
  background: var(--nrl-tutorial-count-bg, #1a1a2e);
  color: var(--nrl-tutorial-count-ink, #f4d03f);
  font-size: 0.85em;
  font-weight: bold;
  white-space: nowrap;
}
.nrl-tutorial-bubble.nrl-tutorial-right { left: auto; right: calc(0.75rem + var(--nrl-safe-r, 0px)); transform: none; }
`;

// REPLAY (orchestrator wiring): the Guide's footer (ui/guide/guide.ts, under
// "?") has a "Replay tutorial" button whose onClick calls startTutorial(true):
//   import { startTutorial } from '../ui/tutorial';
// Auto-start (main.ts, after createNewGame/loadState): call `startTutorial();`
// (no force) — it self-guards on settings.tutorialDone.
