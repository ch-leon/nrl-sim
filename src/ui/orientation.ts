// src/ui/orientation.ts — a phone held upright is blocked, everywhere.
//
// On a touch device in portrait the whole game is covered: the title, every
// menu and sheet, the match report, the grounds and the live match. The Phaser
// loop sleeps until the phone is sideways again. iOS Safari will not let a page
// lock orientation, so the card asks, and where the browser allows it (an
// installed app, mostly Android) we also ask for a landscape lock. Desktop
// windows are never blocked, however narrow: the gate and the CSS both need a
// coarse (touch) pointer.

import { BRAND, type Brand } from '../brand';
import { COLOR_TOKENS as C } from './tokens';

/** A touch device held upright. Shared by the CSS and the JS. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';

/**
 * Whether the game shows ('play') or the rotate card covers it ('rotate').
 * Only a touch device held upright is ever blocked, and then the whole game is.
 * Pure.
 */
export function orientationGate(g: { portrait: boolean; coarse: boolean }): 'play' | 'rotate' {
  return g.portrait && g.coarse ? 'rotate' : 'play';
}

/** The rotate card's title. */
export const ROTATE_TITLE = 'Turn your phone sideways';

/** The rotate card's line, with the game's name from the brand (#363). */
export function rotateText(brand: Brand = BRAND): string {
  return `In ${brand.name}, the game plays in landscape. Turn your phone sideways to carry on.`;
}

/** <html> carries this while the rotate card is up. */
export const ROTATE_ON_CLASS = 'nrl-rotate-on';

type MatchMediaFn = (query: string) => Pick<MediaQueryList, 'matches' | 'addEventListener'>;

export interface LandscapeGuardHooks {
  /** Called when the phone is turned upright: the loop must sleep. */
  onBlock: () => void;
  /** Called when it is turned sideways again: the loop may wake. */
  onUnblock: () => void;
}

/**
 * Watch orientation and fire onBlock / onUnblock on every change (and once at
 * start if already upright). Returns whether the phone is upright right now.
 * `matchMedia` is injectable so tests run without a DOM.
 */
export function watchOrientation(hooks: LandscapeGuardHooks, matchMedia: MatchMediaFn): boolean {
  const mq = matchMedia(PORTRAIT_QUERY);
  let blocked = mq.matches;
  if (blocked) hooks.onBlock();
  mq.addEventListener('change', (e) => {
    const next = (e as MediaQueryListEvent).matches;
    if (next === blocked) return;
    blocked = next;
    if (blocked) hooks.onBlock();
    else hooks.onUnblock();
  });
  return blocked;
}

const STYLE_ID = 'nrl-rotate-styles';

function ensureRotateStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Shown by the gate's class on <html>, and only while upright on a touch device.
  style.textContent = `
.nrl-rotate { display: none; }
@media ${PORTRAIT_QUERY} {
  html.${ROTATE_ON_CLASS} .nrl-rotate {
    display: flex; position: fixed; inset: 0; z-index: 10000;
    align-items: center; justify-content: center; padding: 1.5rem;
    background: ${C.navy}; font-family: "IBM Plex Sans", system-ui, sans-serif;
  }
}
.nrl-rotate-card {
  background: ${C.panel}; color: ${C.text}; border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); padding: 24px 22px; max-width: 18rem;
  text-align: center; line-height: 1.45;
}
.nrl-rotate-phone {
  width: 2.2rem; height: 3.6rem; margin: 0 auto 1rem; border: 3px solid ${C.accent};
  border-radius: 0.45rem; background: ${C.button};
  animation: nrl-rotate-turn 2.4s ease-in-out infinite;
}
.nrl-rotate-title { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 1.375rem;
  letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 6px; }
.nrl-rotate-text { margin: 0; font-size: 0.875rem; color: ${C.text2}; }
@keyframes nrl-rotate-turn {
  0%, 20% { transform: rotate(0deg); }
  50%, 80% { transform: rotate(-90deg); }
  100% { transform: rotate(0deg); }
}
@media (prefers-reduced-motion: reduce) {
  .nrl-rotate-phone { animation: none; transform: rotate(-90deg); }
}`;
  document.head.appendChild(style);
}

/** Options for {@link initLandscapeGuard}. */
export type LandscapeGuardOpts = LandscapeGuardHooks;

/** Handle to the mounted guard. */
export interface LandscapeGuard {
  /** Re-read orientation and show or hide the card. */
  refresh(): void;
  /** Whether the phone is upright on a touch device now. */
  upright(): boolean;
}

/**
 * Mount the rotate card and pause / resume through the hooks. The loop sleeps,
 * and the card covers the game, whenever a touch device is held upright. Call
 * once at boot, before the title screen. A coarse-pointer device is also asked
 * to lock landscape; that fails on iOS Safari and the failure is ignored.
 */
export function initLandscapeGuard(opts: LandscapeGuardOpts): LandscapeGuard {
  ensureRotateStyles();
  const card = document.createElement('div');
  card.className = 'nrl-rotate';
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-label', ROTATE_TITLE);
  card.innerHTML =
    '<div class="nrl-rotate-card"><div class="nrl-rotate-phone" aria-hidden="true"></div>' +
    `<p class="nrl-rotate-title">${ROTATE_TITLE}</p></div>`;
  const text = document.createElement('p');
  text.className = 'nrl-rotate-text';
  text.textContent = rotateText();
  card.firstElementChild?.append(text);
  document.body.appendChild(card);

  const coarse = window.matchMedia('(pointer: coarse)');
  let upright = false;
  let locked = false;

  const refresh = (): void => {
    const gate = orientationGate({ portrait: upright, coarse: coarse.matches });
    document.documentElement.classList.toggle(ROTATE_ON_CLASS, gate === 'rotate');
    // Best effort, touch only. Real locks work installed / fullscreen (mainly Android).
    if (!coarse.matches || locked) return;
    locked = true;
    const o = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    try {
      void o?.lock?.('landscape')?.catch(() => undefined);
    } catch {
      /* iOS Safari throws instead of rejecting */
    }
  };

  upright = watchOrientation({
    onBlock: () => {
      upright = true;
      opts.onBlock();
      refresh();
    },
    onUnblock: () => {
      upright = false;
      opts.onUnblock();
      refresh();
    },
  }, (q) => window.matchMedia(q));
  refresh();

  return {
    refresh,
    upright: () => upright,
  };
}

/**
 * The bit of a Phaser game this pause needs. Kept narrow so the boot sites and
 * the unit test don't pull the whole engine in.
 */
export interface PortraitLoop {
  loop: { running: boolean; sleep: () => void };
  events: { once: (event: string, fn: () => void) => void };
}

/**
 * Sleep the loop when the phone is already upright (#315).
 *
 * Phaser emits `ready` and only then starts the loop. `TimeStep.sleep` does
 * nothing until `running` is true, so a listener that sleeps on `ready` never
 * pauses a game created in portrait. A microtask runs after `start` returns
 * and before the first frame. If the textures are not ready yet, `ready` is
 * still to come: sleep again on the microtask after it, once the loop is up.
 * `blocked` is read at sleep time, so a rotate to landscape in between is kept.
 */
export function sleepLoopIfPortrait(game: PortraitLoop, blocked: () => boolean): void {
  const sleep = (): void => {
    if (blocked() && game.loop.running) game.loop.sleep();
  };
  queueMicrotask(sleep);
  game.events.once('ready', () => queueMicrotask(sleep));
}
