// src/ui/orientation.ts — which views need a phone held sideways (#350 P1).
//
// Upright, the menus work (Leon's Option B, 29 Oct 2026): the title, every sheet
// the five tabs and Office open, the match report. The live match and the grounds
// (the club view, placing or moving a building, a building's card) are drawn for
// landscape, so while one of those is up on a touch device held upright we cover
// the game with a "Turn your phone sideways" card. iOS Safari won't let a web page
// lock orientation, so the card asks instead.
//
// The Phaser loop sleeps whenever the phone is upright: on a menu the grounds are
// hidden behind it, and under the card a match must not run on. Desktop windows
// are never blocked, however narrow: the gate and the CSS both need a coarse
// (touch) pointer.
//
// Where the browser allows it (installed PWA / fullscreen on Android) we also ask
// for a landscape lock while a landscape-only view is up, and unlock otherwise;
// failures are ignored.

import { BRAND, type Brand } from '../brand';
import { COLOR_TOKENS as C } from './tokens';

/** A touch device held upright: the menus' portrait layout and the gate. Shared by the CSS and the JS. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';

/**
 * What is on screen, as far as orientation goes: a menu (title, a sheet, a dialog,
 * the match report) or one of the views drawn for landscape.
 */
export type OrientationView = 'menu' | 'match' | 'grounds' | 'placement' | 'facility';

/** The views that need the phone sideways (#350): the live match and the grounds. */
export const LANDSCAPE_ONLY: ReadonlySet<OrientationView> = new Set(['match', 'grounds', 'placement', 'facility']);

/**
 * Whether `view` shows ('menu') or the rotate card covers it ('rotate'). Only a
 * touch device held upright is ever blocked, and then only on a landscape-only
 * view. Pure.
 */
export function orientationGate(g: { portrait: boolean; coarse: boolean; view: OrientationView }): 'menu' | 'rotate' {
  return g.portrait && g.coarse && LANDSCAPE_ONLY.has(g.view) ? 'rotate' : 'menu';
}

/** The rotate card's title. */
export const ROTATE_TITLE = 'Turn your phone sideways';

/** The rotate card's line (#350), with the game's name from the brand (#363). */
export function rotateText(brand: Brand = BRAND): string {
  return `In ${brand.name}, the match and the grounds play in landscape. Turn your phone sideways to carry on.`;
}

/** The card's way back to the menus, shown only over the grounds (nothing is in play there). */
export const ROTATE_BACK_LABEL = '◂ Back to the menus';

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
.nrl-rotate-back {
  margin-top: 16px; min-height: 44px; min-width: 44px; padding: 0 16px; border: 0; border-radius: 10px;
  background: ${C.button}; color: ${C.text}; font: 600 0.9375rem "IBM Plex Sans", system-ui, sans-serif; cursor: pointer;
}
.nrl-rotate-back[hidden] { display: none; }
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
export interface LandscapeGuardOpts extends LandscapeGuardHooks {
  /** What is on screen now. Default: a match, so every upright screen is blocked (the match lab, `/#lab`). */
  view?: () => OrientationView;
  /** The card's ◂ Back over the grounds. Absent: no button. */
  onBack?: () => void;
}

/** Handle to the mounted guard. */
export interface LandscapeGuard {
  /** Re-read the view and show or hide the card (call after anything that changes the view). */
  refresh(): void;
  /** Swap the view getter (the club game sets it once the save is loaded). */
  setView(view: () => OrientationView): void;
  /** Whether the phone is upright on a touch device now. */
  upright(): boolean;
}

/**
 * Mount the rotate card and pause / resume through the hooks: the loop sleeps
 * whenever the phone is upright, the card shows when the view also needs
 * landscape. Call once at boot, before the title screen.
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
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'nrl-rotate-back';
  back.setAttribute('data-rotate-back', '');
  back.textContent = ROTATE_BACK_LABEL;
  back.hidden = true;
  back.addEventListener('click', () => opts.onBack?.());
  card.firstElementChild?.append(text, back);
  document.body.appendChild(card);

  let view = opts.view ?? ((): OrientationView => 'match');
  const coarse = window.matchMedia('(pointer: coarse)');
  let upright = false;
  let locked: boolean | null = null;

  const refresh = (): void => {
    const v = view();
    const gate = orientationGate({ portrait: upright, coarse: coarse.matches, view: v });
    document.documentElement.classList.toggle(ROTATE_ON_CLASS, gate === 'rotate');
    back.hidden = !(gate === 'rotate' && v === 'grounds' && opts.onBack);
    // Best effort, touch only: real locks only work installed / fullscreen (mainly Android).
    const wantLock = coarse.matches && LANDSCAPE_ONLY.has(v);
    if (wantLock === locked || !coarse.matches) return;
    locked = wantLock;
    const o = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    try {
      if (wantLock) o?.lock?.('landscape').catch(() => undefined);
      else o?.unlock?.();
    } catch {
      /* not supported here */
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
    setView: (fn) => {
      view = fn;
      refresh();
    },
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
