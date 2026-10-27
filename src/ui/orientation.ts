// src/ui/orientation.ts — landscape-only play on phones and tablets.
//
// Portrait is too cramped to play, and browsers (iOS Safari above all) won't
// let a web page lock orientation, so on touch devices held upright we cover
// the game with a "rotate your phone" card and pause the game loop until it is
// turned sideways. Desktop windows are never blocked, however narrow: the CSS
// media query and the JS guard both require a coarse (touch) pointer.
//
// Where the browser does allow it (installed PWA / fullscreen on Android), we
// also ask for a landscape lock on the first tap; failures are ignored.

/** Touch device held upright → blocked. Shared by the CSS and the JS guard. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';

type MatchMediaFn = (query: string) => Pick<MediaQueryList, 'matches' | 'addEventListener'>;

export interface LandscapeGuardHooks {
  /** Called when play must stop (device turned upright). */
  onBlock: () => void;
  /** Called when play may resume (device turned sideways). */
  onUnblock: () => void;
}

/**
 * Watch orientation and fire onBlock / onUnblock on every change (and once at
 * start if already upright). Returns whether play is blocked right now.
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
  style.textContent = `
.nrl-rotate { display: none; }
@media ${PORTRAIT_QUERY} {
  .nrl-rotate {
    display: flex; position: fixed; inset: 0; z-index: 10000;
    align-items: center; justify-content: center; padding: 1.5rem;
    background: #0e1630; font-family: "IBM Plex Sans", system-ui, sans-serif;
  }
}
.nrl-rotate-card {
  background: #141d3a; color: #fff; border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); padding: 24px 22px; max-width: 18rem;
  text-align: center; line-height: 1.45;
}
.nrl-rotate-phone {
  width: 2.2rem; height: 3.6rem; margin: 0 auto 1rem; border: 3px solid #f4d03f;
  border-radius: 0.45rem; background: #1f2b55;
  animation: nrl-rotate-turn 2.4s ease-in-out infinite;
}
.nrl-rotate-title { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 22px;
  letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 6px; }
.nrl-rotate-text { margin: 0; font-size: 14px; color: #c9d1ea; }
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

/**
 * Mount the rotate card (shown purely by CSS when upright on a touch device)
 * and pause / resume through the hooks. Call once at boot, before the title
 * screen, so the card covers everything.
 */
export function initLandscapeGuard(hooks: LandscapeGuardHooks): void {
  ensureRotateStyles();
  const card = document.createElement('div');
  card.className = 'nrl-rotate';
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-label', 'Rotate your device');
  card.innerHTML =
    '<div class="nrl-rotate-card"><div class="nrl-rotate-phone" aria-hidden="true"></div>' +
    '<p class="nrl-rotate-title">Turn your phone sideways</p>' +
    '<p class="nrl-rotate-text">NRL Sim plays in landscape. The game is paused until you rotate.</p></div>';
  document.body.appendChild(card);

  watchOrientation(hooks, (q) => window.matchMedia(q));

  // Best effort: real locks only work installed / fullscreen (mainly Android).
  const tryLock = (): void => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation?.lock?.('landscape').catch(() => undefined);
  };
  window.addEventListener('pointerdown', tryLock, { once: true });
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
