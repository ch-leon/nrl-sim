// src/ui/tutorial.ts — onboarding / tutorial flow. See BAK-202 (WU-15),
// ARCHITECTURE §4 (settings.tutorialDone), §5 (event bus), §6 (DOM overlay).
// No Phaser imports. A declarative ordered step list drives a pixel-styled
// speech-bubble panel rendered into #ui-root, with an optional darkened cutout
// highlight anchored to a real UI element by CSS selector.
//
// Ownership: only the orchestrator (main.ts) decides *when* to auto-start — it
// calls startTutorial() after newGame; startTutorial() with no force is a no-op
// when settings.tutorialDone is already true. Replay is startTutorial(true),
// wired later from the settings popup (see REPLAY note at the bottom).

import { bus, type Events } from '../core/events';
import { getState, setState } from '../core/state';
import { el, button, mount, ensureStyles } from './dom';

// ── Declarative step model ─────────────────────────────────────────────────

/** How a step advances: the bubble's Next button, or a named bus event. */
export type AdvanceOn = 'next-button' | keyof Events;

/** A single onboarding step. Pure data — no DOM, safe to unit-test. */
export interface TutorialStep {
  /** Stable identifier (also used as a DOM hook + test key). */
  id: string;
  /** Bubble body copy. */
  text: string;
  /** CSS selector into #ui-root to highlight, or null for a centered bubble. */
  anchor: string | null;
  /** Advance trigger: 'next-button' or a bus event name. */
  advanceOn: AdvanceOn;
}

/**
 * The onboarding steps, in order (BAK-202 spec; News, Finance and Contracts
 * added by N7, #188). Anchor selectors reference elements that really exist in
 * the shipped UI:
 *   - nav buttons carry `data-screen="<id>"` (see ui/nav.ts registerScreen)
 *   - the HUD money tile carries `data-hud="money"` (see ui/hud.ts)
 *   - the Advance Week control is the button inside `.nrl-hud-actions` (ui/hud.ts)
 */
export const STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    text:
      'Welcome to your club! The loop is simple: build facilities, recruit ' +
      'players, advance the week, play the match, then watch the money and ' +
      'ladder. Let’s walk through it.',
    anchor: null,
    advanceOn: 'next-button',
  },
  {
    id: 'build',
    text: 'Open Build and place a Training Paddock to develop your squad.',
    anchor: '.nrl-nav .nrl-btn[data-screen="build"]',
    advanceOn: 'facility:placed',
  },
  {
    id: 'recruit',
    text: 'Open Recruit and sign your first player from the free-agent pool.',
    anchor: '.nrl-nav .nrl-btn[data-screen="recruit"]',
    advanceOn: 'player:signed',
  },
  {
    id: 'squad',
    text: "Here's your squad. Check positions, stats and morale here any time.",
    anchor: '.nrl-nav .nrl-btn[data-screen="squad"]',
    advanceOn: 'next-button',
  },
  {
    id: 'advance',
    text: 'Advance a week to run training, wages and the next round.',
    anchor: '.nrl-hud-actions .nrl-btn',
    advanceOn: 'week:advanced',
  },
  {
    id: 'match',
    text:
      'On match day your team plays out the round. Watch it, or tap the ' +
      "match's Skip to jump to full time.",
    anchor: null,
    advanceOn: 'match:finished',
  },
  {
    id: 'news',
    text:
      'News keeps results, warnings and decision cards. A card waits two weeks ' +
      'for your answer, then takes its default; the badge counts what needs you.',
    anchor: '.nrl-nav .nrl-btn[data-screen="news"]',
    advanceOn: 'next-button',
  },
  {
    id: 'finance',
    text:
      'Finance shows where the money comes from and goes: gates, wages, upkeep, ' +
      "the runway, and the board's goals for the season.",
    anchor: '.nrl-nav .nrl-btn[data-screen="finance"]',
    advanceOn: 'next-button',
  },
  {
    id: 'contracts',
    text:
      'Contracts lists every deal by expiry. Renew early before a player walks, ' +
      'or sell for a fee. Tap any player card for his page.',
    anchor: '.nrl-nav .nrl-btn[data-screen="contracts"]',
    advanceOn: 'next-button',
  },
  {
    id: 'wrap',
    text:
      "That's the loop! Keep an eye on your money up top and your position on " +
      'the ladder. The ? button opens the Guide any time. Good luck, coach.',
    anchor: null,
    advanceOn: 'next-button',
  },
] as const;

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

/** Milliseconds between looks for a step's anchor while it is not on screen. */
export const ANCHOR_RETRY_MS = 500;

// ── Runtime state (module singleton) ───────────────────────────────────────

interface ActiveTutorial {
  index: number;
  /** Root overlay node (holds bubble + optional cutout). */
  overlay: HTMLElement;
  /** Unsubscribe for the current step's bus listener, if any. */
  offEvent: (() => void) | null;
  /** The anchor poll (an interval), while the step's anchor is not on screen. */
  retryTimer: ReturnType<typeof setTimeout> | null;
}

let active: ActiveTutorial | null = null;

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
  if (!force && !shouldAutoStart(getState().settings)) return;
  // DOM-less environments (node unit tests): nothing to render.
  if (typeof document === 'undefined') return;

  ensureStyles();
  ensureTutorialStyles();
  const overlay = el('div', {
    class: 'nrl-tutorial',
    attrs: { 'data-tutorial': 'overlay' },
  });
  mount(overlay);
  active = { index: 0, overlay, offEvent: null, retryTimer: null };
  renderStep();
}

/**
 * End the tutorial: mark it done, tear down DOM and any live bus listener /
 * timer. Idempotent — safe to call when no tutorial is active.
 */
export function endTutorial(): void {
  if (!active) return;
  clearStepBindings(active);
  active.overlay.remove();
  active = null;
  // Persist completion (replace the settings object wholesale — setState
  // shallow-merges top-level keys only, see state.ts).
  const s = getState();
  if (!s.settings.tutorialDone) {
    setState({ settings: { ...s.settings, tutorialDone: true } });
  }
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
function advance(): void {
  if (!active) return;
  clearStepBindings(active);
  if (active.index >= STEPS.length - 1) {
    endTutorial();
    return;
  }
  active.index += 1;
  renderStep();
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

  // Bind the advance trigger. Event steps get exactly one listener (the current
  // step's only) so acting "out of order" earlier does nothing.
  if (isEventStep(step)) {
    a.offEvent = bus.on(step.advanceOn, () => advance());
  }

  const anchorEl = step.anchor ? findAnchor(step.anchor) : null;

  if (step.anchor && !anchorEl) {
    // Anchor not in the DOM yet (screen not open, or the nav hidden by a match).
    // Render centered for now with a Next escape hatch and keep looking every
    // ANCHOR_RETRY_MS; once it appears (Back to Club after a match, #188),
    // re-render anchored. The poll stops with the step.
    renderBubble(a, step, { centered: true, forceNext: true });
    a.retryTimer = setInterval(() => {
      if (active !== a || STEPS[a.index] !== step) return;
      const retryEl = findAnchor(step.anchor!);
      if (!retryEl) return;
      clearInterval(a.retryTimer as ReturnType<typeof setInterval>);
      a.retryTimer = null;
      a.overlay.replaceChildren();
      scrollAnchorIntoView(retryEl);
      renderCutout(a, retryEl);
      renderBubble(a, step, { centered: false, forceNext: false });
    }, ANCHOR_RETRY_MS);
    return;
  }

  if (anchorEl) {
    scrollAnchorIntoView(anchorEl);
    renderCutout(a, anchorEl);
    renderBubble(a, step, { centered: false, forceNext: false });
  } else {
    renderBubble(a, step, { centered: true, forceNext: false });
  }
}

/** Look up an anchor within the UI overlay (falls back to whole document). */
function findAnchor(selector: string): HTMLElement | null {
  const root: ParentNode = document.getElementById('ui-root') ?? document;
  return (
    (root.querySelector(selector) as HTMLElement | null) ??
    (document.querySelector(selector) as HTMLElement | null)
  );
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

/**
 * Position a `.nrl-tutorial-cutout` over the anchor. A huge box-shadow spread
 * darkens everything *outside* the cutout, drawing the eye to the anchor while
 * leaving it clickable (the cutout itself is pointer-events:none).
 */
function renderCutout(a: ActiveTutorial, anchorEl: HTMLElement): void {
  const r = anchorEl.getBoundingClientRect();
  const pad = 6;
  const cutout = el('div', { class: 'nrl-tutorial-cutout' });
  cutout.style.top = `${r.top - pad}px`;
  cutout.style.left = `${r.left - pad}px`;
  cutout.style.width = `${r.width + pad * 2}px`;
  cutout.style.height = `${r.height + pad * 2}px`;
  a.overlay.appendChild(cutout);
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
): void {
  const wantsNext = step.advanceOn === 'next-button' || opts.forceNext;

  const body = el('div', { class: 'nrl-tutorial-text', text: step.text });

  const actions = el('div', { class: 'nrl-tutorial-actions' });
  actions.appendChild(button('Skip', () => endTutorial(), { class: 'nrl-tutorial-skip' }));
  if (wantsNext) {
    actions.appendChild(button('Next', () => advance(), { class: 'nrl-tutorial-next' }));
  }

  const bubbleClass = opts.centered
    ? 'nrl-tutorial-bubble nrl-tutorial-centered'
    : 'nrl-tutorial-bubble';
  const bubble = el(
    'div',
    { class: bubbleClass, attrs: { 'data-step': step.id } },
    body,
    actions,
  );
  a.overlay.appendChild(bubble);
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

const TUTORIAL_CSS = `
.nrl-tutorial {
  position: fixed;
  inset: 0;
  pointer-events: none; /* backdrop is drawn by the cutout's box-shadow */
  z-index: 200;         /* above HUD/nav (10) and modals (100) */
  font-family: 'Courier New', monospace;
  image-rendering: pixelated;
}
.nrl-tutorial-cutout {
  position: fixed;
  pointer-events: none;
  border: 3px solid #f4d03f;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  z-index: 200;
}
.nrl-tutorial-bubble {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  bottom: 5rem;              /* clear of the bottom nav bar */
  transform: translateX(-50%);
  max-width: min(90vw, 320px);
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.75rem 0.9rem;
  z-index: 201;
}
.nrl-tutorial-centered {
  top: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
}
.nrl-tutorial-text {
  font-size: clamp(0.8rem, 3vw, 1rem);
  line-height: 1.35;
  margin-bottom: 0.7rem;
}
.nrl-tutorial-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
`;

// REPLAY (orchestrator wiring): the Guide's footer (ui/guide/guide.ts, under
// "?") has a "Replay tutorial" button whose onClick calls startTutorial(true):
//   import { startTutorial } from '../ui/tutorial';
// Auto-start (main.ts, after createNewGame/loadState): call `startTutorial();`
// (no force) — it self-guards on settings.tutorialDone.
