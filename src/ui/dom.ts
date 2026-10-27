// src/ui/dom.ts — dependency-free DOM helper kit + injected pixel-UI stylesheet.
// See ARCHITECTURE §1.6 (DOM-overlay decision) and BAK-163. No Phaser imports.
//
// The #ui-root container is `pointer-events: none` (index.html / BAK-157) so the
// Phaser world stays draggable underneath the overlay. Interactive controls
// created here opt back in with `pointer-events: auto` (see the injected CSS),
// so only real buttons/panels capture input and taps fall through the gaps.

const STYLE_ID = 'nrl-ui-styles';
const ROOT_ID = 'ui-root';

/** Options accepted by {@link el}. */
export interface ElOpts {
  class?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  onClick?: () => void;
}

/**
 * Generic element factory. Sets class/text/html/attrs, wires an optional click
 * handler, and appends any children (Nodes or strings). Strings become text
 * nodes. `text` and `html` are mutually exclusive; `html` wins if both given.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: ElOpts = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.html !== undefined) {
    node.innerHTML = opts.html;
  } else if (opts.text !== undefined) {
    node.textContent = opts.text;
  }
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  if (opts.onClick) node.addEventListener('click', opts.onClick);
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** A dark pixel-art panel (`div.nrl-panel`). */
export function panel(opts: { class?: string } = {}, ...children: (Node | string)[]): HTMLDivElement {
  const cls = opts.class ? `nrl-panel ${opts.class}` : 'nrl-panel';
  return el('div', { class: cls }, ...children);
}

/** A chunky pixel-art button (`button.nrl-btn`) wired to `onClick`. */
export function button(
  label: string,
  onClick: () => void,
  opts: { class?: string } = {},
): HTMLButtonElement {
  const cls = opts.class ? `nrl-btn ${opts.class}` : 'nrl-btn';
  return el('button', { class: cls, text: label, onClick, attrs: { type: 'button' } });
}

/** Get (or lazily create) the #ui-root overlay container. */
export function getRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    // Mirror the base CSS from index.html in case the root is created here
    // (e.g. in an isolated preview/test harness without the full page).
    root.style.position = 'absolute';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Mount a node into #ui-root (creating the root if absent). Ensures the shared
 * stylesheet is injected first. Returns the mounted node.
 */
export function mount(node: HTMLElement): HTMLElement {
  ensureStyles();
  getRoot().appendChild(node);
  return node;
}

// ── Layering rule (GitHub #14) ──────────────────────────────────────────────
// One rule for every nav screen (Squad, Recruit, Build, Fixtures, Ladder,
// History): a screen occupies the *screen region* — the band between the
// bottom edge of the HUD strip and the top edge of the nav bar — so it never
// sits under/over the HUD readouts, Advance Week, the ♪ button or the nav, and
// those stay clickable while a screen is open. Only one screen is open at a
// time (opening another, e.g. from the nav, replaces it).
//
// The HUD and nav publish their live heights as CSS custom properties
// (--nrl-hud-h / --nrl-nav-h, see trackChromeInset) which `.nrl-screen-region`
// uses for its top/bottom insets, so it follows wrapping on narrow screens and
// collapses to the full viewport when the chrome is hidden (match mode).
//
// True dialogs (confirmations, the facility popup, settings) still use
// openModal() without `screen`, which covers everything at z-index 100.
//
// z-order: ♪ 20 · screens 50 · HUD/nav 55 · toasts 60 · modals 100 · tutorial 200.
// The HUD and nav never overlap a screen; they sit above one so the ▾ menu and
// the nav's More sheet drop over it.
//
// Safe areas (#347): env(safe-area-inset-*) is read once into --nrl-safe-t/r/b/l
// and everything else uses those, so a check can simulate a notch where the
// browser reports none (scripts/e2e-webkit.mjs, WebKit on Linux).

/** CSS custom property holding the HUD strip's current height. */
export const HUD_INSET_VAR = '--nrl-hud-h';
/** CSS custom property holding the nav bar's current height. */
export const NAV_INSET_VAR = '--nrl-nav-h';

/**
 * Pure single-slot registry for "the open screen". Opening a new entry runs the
 * previous entry's closer first; close() is idempotent and re-entrancy safe (a
 * closer that itself calls close() is a no-op). DOM-free for unit testing.
 */
export class ScreenSlot<T = unknown> {
  private current: { key: T; close: () => void } | null = null;

  /** Close whatever is open, then make `key` the open screen. */
  open(key: T, close: () => void): void {
    this.close();
    this.current = { key, close };
  }

  /** Close the open screen (if any). Returns true if something was closed. */
  close(): boolean {
    const cur = this.current;
    if (!cur) return false;
    this.current = null;
    cur.close();
    return true;
  }

  /** The open screen's key, or null. */
  get active(): T | null {
    return this.current?.key ?? null;
  }
}

const screenSlot = new ScreenSlot<HTMLElement>();
const screenListeners = new Set<(key: string | null) => void>();

/** Attribute naming which nav destination an open screen belongs to (the nav marks that tab). */
export const SCREEN_KEY_ATTR = 'data-screen-key';

function emitScreenChange(): void {
  const key = screenKey();
  for (const fn of screenListeners) fn(key);
}

/**
 * Show `node` as THE open screen in the screen region (between HUD and nav).
 * Any previously open screen and any open dialog are closed first. `onClose`
 * runs when the screen is closed by any route (its own Close button calling
 * closeScreen(), another screen opening, or a match starting). `key` is the nav
 * destination it belongs to ('squad', 'finance', …), so the nav can mark it open
 * (#344). Returns `node`.
 */
export function openScreen(node: HTMLElement, onClose?: () => void, key?: string): HTMLElement {
  ensureStyles();
  closeModal();
  node.classList.add('nrl-screen-region');
  if (key) node.setAttribute(SCREEN_KEY_ATTR, key);
  screenSlot.open(node, () => {
    node.remove();
    onClose?.();
    if (screenSlot.active === null) emitScreenChange();
  });
  getRoot().appendChild(node);
  emitScreenChange();
  return node;
}

/** Close the open screen, if any. */
export function closeScreen(): void {
  screenSlot.close();
}

/** The currently open screen element, if any. */
export function activeScreen(): HTMLElement | null {
  return screenSlot.active;
}

/** The nav destination of the open screen, or null (no screen, or one with no key). */
export function screenKey(): string | null {
  return screenSlot.active?.getAttribute(SCREEN_KEY_ATTR) ?? null;
}

/** Re-tag the open screen (a tabbed screen switching tabs). */
export function setScreenKey(key: string): void {
  const node = screenSlot.active;
  if (!node || node.getAttribute(SCREEN_KEY_ATTR) === key) return;
  node.setAttribute(SCREEN_KEY_ATTR, key);
  emitScreenChange();
}

/** Call `fn` with the open screen's key whenever a screen opens or closes. Returns unsubscribe. */
export function onScreenChange(fn: (key: string | null) => void): () => void {
  screenListeners.add(fn);
  return () => screenListeners.delete(fn);
}

/**
 * The one header row of a screen (#336): title (with an optional one-line
 * summary under it), the screen's controls, and a 44px ✕ at the right that
 * closes it. The controls scroll sideways on a narrow phone; the title and the ✕
 * never move.
 */
export function screenHead(title: string, opts: { sub?: HTMLElement; controls?: Node[]; onClose?: () => void } = {}): HTMLElement {
  const titles = el('div', { class: 'nrl-screen-titles' }, el('span', { class: 'nrl-screen-title', text: title }));
  if (opts.sub) titles.append(opts.sub);
  const x = button('✕', opts.onClose ?? (() => closeScreen()), { class: 'nrl-screen-x' });
  x.setAttribute('aria-label', 'Close');
  return el('div', { class: 'nrl-screen-head' }, titles, el('div', { class: 'nrl-screen-tools' }, ...(opts.controls ?? [])), x);
}

/**
 * Publish `node`'s rendered height into the CSS custom property `cssVar` on
 * <html>, kept live with a ResizeObserver (wrapping, font scaling, and
 * display:none → 0). Returns a disposer that stops observing and resets the
 * property to 0px. No-ops gracefully where ResizeObserver is unavailable.
 */
export function trackChromeInset(node: HTMLElement, cssVar: string): () => void {
  const rootStyle = document.documentElement.style;
  const publish = (): void => {
    rootStyle.setProperty(cssVar, `${node.offsetHeight}px`);
  };
  publish();
  if (typeof ResizeObserver === 'undefined') {
    return () => rootStyle.setProperty(cssVar, '0px');
  }
  const ro = new ResizeObserver(publish);
  ro.observe(node);
  return () => {
    ro.disconnect();
    rootStyle.setProperty(cssVar, '0px');
  };
}

/** Currently open modal overlay, if any (guards against stacking). */
let openModalEl: HTMLElement | null = null;

/**
 * Open a centred modal containing `content`. Clicking the dimmed backdrop closes
 * it. Returns the backdrop element. Only one modal is open at a time — opening a
 * second closes the first.
 *
 * With `screen: true` the modal is a nav *screen* instead of a dialog: it is
 * confined to the screen region (HUD and nav stay visible and usable), it
 * replaces any other open screen, and it is closed with closeScreen().
 *
 * With `region: true` a dialog stays a dialog (it sits over the open screen and
 * closeModal() closes it) but is laid out in the screen region like a screen
 * (#203): the HUD and nav stay whole and tappable, and a nav tap closes it.
 *
 * Screens and region dialogs are framed (#336): the box holds still and only
 * its content scrolls, so the ✕ in the corner never scrolls away. A dialog gets
 * the ✕ too with `closeButton: true`. `key` is a screen's nav destination (see
 * openScreen).
 */
export function openModal(
  content: HTMLElement,
  opts: { class?: string; screen?: boolean; closeButton?: boolean; region?: boolean; key?: string } = {},
): HTMLElement {
  ensureStyles();
  const framed = opts.screen === true || opts.region === true;
  const box = el(
    'div',
    { class: `nrl-modal${framed ? ' nrl-modal-framed' : ''}${opts.class ? ` ${opts.class}` : ''}` },
    framed ? el('div', { class: 'nrl-modal-scroll' }, content) : content,
  );
  // Clicks inside the modal box must not bubble to the backdrop's close handler.
  box.addEventListener('click', (e) => e.stopPropagation());

  // A ✕ in the corner (#195): on a phone a screen's own Close is often below
  // the fold. Screens with a Close in their header pass closeButton: false.
  const wantsX = opts.screen ? opts.closeButton !== false : opts.closeButton === true;
  if (wantsX) {
    const x = button('✕', () => (opts.screen ? closeScreen() : closeModal()), { class: 'nrl-screen-x' });
    x.setAttribute('aria-label', 'Close');
    box.classList.add('nrl-modal-has-x');
    box.prepend(x);
  }

  if (opts.screen) {
    const backdrop = el(
      'div',
      { class: 'nrl-modal-backdrop nrl-screen-backdrop', onClick: () => closeScreen() },
      box,
    );
    return openScreen(backdrop, undefined, opts.key);
  }

  closeModal();
  const backdrop = el(
    'div',
    { class: opts.region ? 'nrl-modal-backdrop nrl-dialog-region' : 'nrl-modal-backdrop', onClick: () => closeModal() },
    box,
  );
  openModalEl = backdrop;
  getRoot().appendChild(backdrop);
  return backdrop;
}

/** Whether a dialog (not a screen) is open. */
export function dialogOpen(): boolean {
  return openModalEl !== null && openModalEl.isConnected;
}

/** Close the currently open (dialog) modal, if any. Screens use closeScreen(). */
export function closeModal(): void {
  if (openModalEl) {
    openModalEl.remove();
    openModalEl = null;
  }
}

/**
 * Inject the shared pixel-UI stylesheet once. Idempotent: checks for an existing
 * <style id> before injecting so scene switches / re-mounts don't duplicate it.
 */
export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Chunky borders (3px solid #000 + 3px hard drop shadow), dark-on-parchment
// panels, monospace, pixelated rendering. Font sizes use clamp() so the HUD and
// nav stay legible on mobile. Every interactive/visible element opts back into
// pointer-events (the #ui-root container is pointer-events:none).
/** The shared stylesheet (exported for tests). */
export const CSS = `
:root {
  --nrl-safe-t: env(safe-area-inset-top, 0px);
  --nrl-safe-r: env(safe-area-inset-right, 0px);
  --nrl-safe-b: env(safe-area-inset-bottom, 0px);
  --nrl-safe-l: env(safe-area-inset-left, 0px);
}
.nrl-panel, .nrl-btn, .nrl-modal, .nrl-modal-backdrop, .nrl-hud, .nrl-nav {
  font-family: 'Courier New', monospace;
  image-rendering: pixelated;
  box-sizing: border-box;
}
.nrl-panel {
  pointer-events: auto;
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.5rem 0.75rem;
}
.nrl-btn {
  pointer-events: auto;
  cursor: pointer;
  font-weight: bold;
  font-size: clamp(0.7rem, 2.5vw, 0.95rem);
  color: #1a1a2e;
  background: #f4d03f;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.4rem 0.7rem;
  margin: 0;
  min-height: 44px; /* #18: phone tap target */
  min-width: 44px;
  line-height: 1.1;
  white-space: nowrap;
  image-rendering: pixelated;
}
.nrl-btn:hover:not(:disabled) { background: #f7dc6f; }
.nrl-btn:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 #000;
}
.nrl-btn:disabled {
  cursor: default;
  opacity: 0.5;
  background: #cfc9b4;
}

/* ── HUD ─────────────────────────────────────────────────────────────── */
.nrl-hud {
  pointer-events: none; /* strip is transparent; children opt in */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  /* #18: keep clear of notches / rounded corners. */
  padding: calc(0.5rem + var(--nrl-safe-t)) calc(0.5rem + var(--nrl-safe-r)) 0.5rem calc(0.5rem + var(--nrl-safe-l));
  z-index: 55;
}
.nrl-hud-readouts {
  pointer-events: auto;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.nrl-hud-stat {
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.3rem 0.6rem;
  font-size: clamp(0.75rem, 3vw, 1.05rem);
  font-weight: bold;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}
.nrl-hud-stat.nrl-flash-up { background: #7ec850; color: #0a2a00; }
.nrl-hud-stat.nrl-flash-down { background: #e06666; color: #2a0000; }
.nrl-hud-stat.nrl-money-negative { color: #b00020; }
/* #351 H2: under 20 weeks of runway the tile goes amber, under 8 red. */
.nrl-hud-stat.nrl-money-low { color: #8a4b00; border-color: #d08a00; }
.nrl-hud-stat.nrl-money-short { color: #b00020; border-color: #b00020; }
button.nrl-hud-stat { font-family: inherit; line-height: inherit; cursor: pointer; }
button.nrl-hud-stat:focus-visible { outline: 3px solid #3a6ea5; outline-offset: 1px; }
@media (pointer: coarse) { .nrl-hud-readouts .nrl-hud-stat { box-sizing: border-box; min-height: 44px; display: inline-flex; align-items: center; } }
/* N12.5: "in debt" beside a negative balance, a red tag that reads through the flash. */
.nrl-hud-debt { padding: 0 0.3em; font-size: 0.75em; background: #b00020; color: #fff; vertical-align: 0.1em; }
/* #239: below 760px the tag wraps the HUD onto a second row (93px against 60px at
   667×375), so the tile wears a red border instead; the words stay for screen readers. */
@media (max-width: 759px) {
  .nrl-hud-stat.nrl-money-negative { border-color: #b00020; }
  .nrl-hud-debt { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
.nrl-hud-spacer { flex: 1 1 auto; min-width: 0; display: flex; justify-content: flex-end; }
/* #350 H1: the next match, beside Advance Week: the opponent over home/away and the ladder place. */
.nrl-hud .nrl-btn.nrl-hud-next {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  background: #e8e0c8;
  color: #1a1a2e;
  font-size: 0.8rem;
  line-height: 1.15;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
.nrl-hud-next-detail { font-weight: normal; font-size: 0.9em; }
.nrl-hud .nrl-btn.nrl-hud-next:disabled { opacity: 1; cursor: default; }
/* As specific as the rule above, or a hidden chip (no match left; #368's board chip with all on track) shows as an empty box. */
.nrl-hud .nrl-btn.nrl-hud-next[hidden] { display: none; }
/* #368: the board objective at risk, beside the next match. Amber at risk, red off track. */
.nrl-hud-spacer { gap: 0.35rem; }
.nrl-hud .nrl-btn.nrl-hud-board { flex: 0 1 auto; border-color: var(--nrl-risk-amber, #d08a00); color: var(--nrl-risk-amber-ink, #8a4b00); }
.nrl-hud .nrl-btn.nrl-hud-board.nrl-hud-board-off { border-color: var(--nrl-risk-red, #b00020); color: var(--nrl-risk-red, #b00020); }
.nrl-hud .nrl-btn.nrl-hud-next:not(.nrl-hud-board) { flex: 0 1 auto; }
/* Below 760px the chip is "Board" over one word, so the toast lane keeps its 140px
   between the money and the chips; the week's "/27" makes room for it. */
.nrl-hud-board-narrow { display: none; }
@media (max-width: 759px) {
  .nrl-hud-board-wide { display: none; }
  .nrl-hud-board-narrow { display: inline; }
  .nrl-hud[data-board] .nrl-hud-week-total { display: none; }
  .nrl-hud[data-board] .nrl-hud-spacer { gap: 0.25rem; }
  .nrl-hud[data-board] .nrl-btn.nrl-hud-next { padding-left: 0.25rem; padding-right: 0.25rem; }
}
/* #350 H1: decisions waiting, a red count on Advance Week. */
.nrl-hud-alert {
  display: inline-block;
  min-width: 1.3em;
  margin-left: 0.4em;
  padding: 0 0.3em;
  border: 2px solid #000;
  border-radius: 1em;
  background: #b03a2e;
  color: #fff;
  font-size: 0.8em;
  line-height: 1.25em;
  text-align: center;
  vertical-align: 0.1em;
}
.nrl-hud-actions {
  pointer-events: auto;
  position: relative;
  display: flex;
  gap: 0.25rem;
  align-items: stretch;
}
/* #44: "Advance Week" menu. Tap targets stay ≥44px (.nrl-btn min-height). */
.nrl-hud-menu-toggle { min-width: 44px; padding: 0.4rem 0.5rem; }
/* N10.2: Stop beside the progress line while a multi-week advance runs. */
.nrl-hud-stop { min-width: 44px; padding: 0.4rem 0.6rem; background: #e8a33a; }
.nrl-hud-stop[hidden], .nrl-hud-menu-toggle[hidden] { display: none; }
/* The progress line reads like a HUD tile, not a faded button. */
.nrl-hud .nrl-btn.nrl-hud-progress:disabled { opacity: 1; background: #e8e0c8; color: #1a1a2e; cursor: default; }
.nrl-hud-menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  z-index: 11;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 10rem;
  padding: 0.35rem;
  background: #e8e0c8;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-hud-menu[hidden] { display: none; }
.nrl-hud-menu-item { width: 100%; text-align: left; }
/* Hide the "/total" week suffix on narrow screens. */
@media (max-width: 480px) {
  .nrl-hud-week-total { display: none; }
  .nrl-hud .nrl-btn { padding: 0.4rem 0.5rem; }
}
/* #336: a phone on its side has height for nothing. One row, 48px: small tiles
   and the 44px Advance Week, ▾ and ♪ (fx/audio.ts follows this padding). */
@media (max-height: 500px) {
  .nrl-hud {
    align-items: center;
    gap: 0.35rem;
    padding-top: calc(2px + var(--nrl-safe-t));
    padding-bottom: 2px;
  }
  .nrl-hud-readouts { flex-wrap: nowrap; gap: 0.3rem; }
  .nrl-hud-stat { font-size: 0.8rem; padding: 0.2rem 0.4rem; border-width: 2px; box-shadow: 2px 2px 0 #000; }
  .nrl-hud .nrl-btn { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .nrl-hud .nrl-btn.nrl-hud-next { font-size: 0.7rem; padding-left: 0.35rem; padding-right: 0.35rem; }
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
.nrl-nav {
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  /* #18: home-bar / side insets. The home bar's inset is its own margin, so it
     replaces the bar's bottom padding rather than adding to it. */
  padding: 0.25rem calc(0.5rem + var(--nrl-safe-r)) max(0.25rem, var(--nrl-safe-b)) calc(0.5rem + var(--nrl-safe-l));
  white-space: nowrap;
  z-index: 55;
}
/* #344: five tabs (four screens and More), equal, labels 12px or more at every size. */
.nrl-nav > .nrl-btn {
  flex: 1 1 0;
  min-width: 0;
  max-width: 11rem;
  padding: 0.3rem 0.25rem;
  font-size: max(12px, min(0.95rem, 2.3vw));
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The open screen's tab (aria-current): dark with a gold edge, so it reads at a
   glance. Not pressed in: that would push it into the home bar's band. A touch
   leaves :hover on the last tab tapped; the marker wins over it. */
.nrl-nav .nrl-btn[aria-current="page"],
.nrl-nav .nrl-btn[aria-current="page"]:hover:not(:disabled) {
  background: #1a1a2e;
  color: #f4d03f;
  box-shadow: inset 0 -3px 0 #f4d03f, 3px 3px 0 #000;
}
.nrl-nav .nrl-btn[aria-expanded="true"] { background: #fff6c2; }
/* More's sheet: the rest of the club's screens, over whatever is open. */
.nrl-nav-sheet {
  pointer-events: auto;
  position: fixed;
  right: calc(0.5rem + var(--nrl-safe-r));
  bottom: calc(var(--nrl-nav-h, 0px) + 0.25rem);
  display: grid;
  grid-template-columns: repeat(2, minmax(8.5rem, 1fr));
  gap: 0.4rem;
  max-width: calc(100vw - 1rem - var(--nrl-safe-l) - var(--nrl-safe-r));
  max-height: calc(100vh - var(--nrl-nav-h, 0px) - var(--nrl-hud-h, 0px) - 0.5rem);
  max-height: calc(100dvh - var(--nrl-nav-h, 0px) - var(--nrl-hud-h, 0px) - 0.5rem);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0.45rem 0.6rem 0.6rem 0.45rem;
  background: #e8e0c8;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-nav-sheet[hidden] { display: none; }
.nrl-nav-sheet .nrl-btn { font-size: max(12px, 0.9rem); }
@media (max-height: 500px) {
  .nrl-nav-sheet { grid-template-columns: repeat(4, minmax(7.5rem, 1fr)); }
}
.nrl-nav .nrl-nav-badge { margin-left: 0.15rem; }
/* A contract ending soon (#369): a dot, no number, until it is dealt with. */
.nrl-nav-dot, .nrl-row-dot {
  display: inline-block;
  width: 0.6em;
  height: 0.6em;
  margin-left: 0.3rem;
  vertical-align: 0.1em;
  border-radius: 50%;
  background: var(--nrl-alert-dot, #d32f2f);
  border: 1px solid #000;
}

/* ── Modal ───────────────────────────────────────────────────────────── */
.nrl-modal-backdrop {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 20, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.nrl-modal {
  pointer-events: auto;
  background: #e8e0c8;
  color: #1a1a2e;
  border: 4px solid #000;
  box-shadow: 6px 6px 0 #000;
  padding: 1rem;
  max-width: min(90vw, 480px);
  max-height: 85vh;
  max-height: 85dvh; /* #206: Safari's toolbars */
  overflow: auto;
}

/* ── Screen region (see the layering rule above openScreen in dom.ts) ── */
:root { --nrl-hud-h: 0px; --nrl-nav-h: 0px; }
.nrl-screen-region {
  pointer-events: auto;
  position: fixed;
  left: 0;
  right: 0;
  top: var(--nrl-hud-h, 0px);
  bottom: var(--nrl-nav-h, 0px);
  z-index: 50;
  box-sizing: border-box;
}
.nrl-screen-backdrop, .nrl-dialog-region {
  padding: 0.5rem calc(0.5rem + var(--nrl-safe-r)) 0.5rem calc(0.5rem + var(--nrl-safe-l));
}
.nrl-screen-backdrop .nrl-modal, .nrl-dialog-region .nrl-modal {
  /* Fit inside the region (drop-shadow included) rather than the viewport. */
  max-height: calc(100% - 6px);
  position: relative;
}
/* #336: a framed box (screens, region dialogs) holds still and only its content
   scrolls, so the ✕ in its corner is always on screen. A child that sets
   flex: 1 1 auto and min-height: 0 fills the box and scrolls inside itself
   (News, League, Guide); anything else scrolls with the box's content. */
.nrl-modal.nrl-modal-framed { display: flex; flex-direction: column; overflow: hidden; }
.nrl-modal-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
}
@media (max-height: 500px) {
  /* A screen or region dialog runs down to the nav, which sits above it and
     hides its drop shadow. */
  .nrl-screen-backdrop, .nrl-dialog-region { padding-top: 0.25rem; padding-bottom: 0; }
  .nrl-screen-backdrop .nrl-modal, .nrl-dialog-region .nrl-modal { max-height: calc(100% - 0.25rem); }
  .nrl-modal.nrl-modal-framed { padding: 0.4rem 0.65rem; }
}
.nrl-screen-backdrop .nrl-modal {
  /* #195: a landscape phone has width to spare and no height; use it. */
  width: min(96vw, 640px);
  max-width: none;
}
/* A region dialog (#203): between HUD and nav like a screen, above it like a dialog. */
.nrl-dialog-region {
  top: var(--nrl-hud-h, 0px);
  bottom: var(--nrl-nav-h, 0px);
}
/* Player of the Match (#203): a card, not a wall; taps beside it reach Back to Club. */
.nrl-potm-backdrop { pointer-events: none; background: transparent; }
.nrl-potm-backdrop .nrl-modal { pointer-events: auto; }
/* The match report (N9.5): as wide as a screen, above Back to Club, scrolling inside. */
.nrl-report-backdrop { bottom: calc(3.75rem + var(--nrl-safe-b)); align-items: flex-start; padding: calc(0.5rem + var(--nrl-safe-t)) var(--nrl-safe-r) 0 var(--nrl-safe-l); }
.nrl-report-backdrop .nrl-modal { width: min(96vw, 720px); max-width: none; max-height: calc(100% - 0.75rem); padding: 0.6rem 0.8rem; }
.nrl-report-head { min-height: 44px; }
.nrl-modal-has-x .nrl-report-head { padding-right: 2.75rem; }
.nrl-report h2 { margin: 0 0 0.2rem; font-size: 1rem; }
.nrl-report p { margin: 0.15rem 0; font-size: 0.8rem; }
.nrl-report .nrl-report-score { font-size: 1.05rem; font-weight: bold; }
/* #351 P2: a win and a loss look different. Green for a win; a loss is no error, so slate, not red. */
.nrl-report-result { display: inline-block; padding: 0.05rem 0.4rem; border: 2px solid #000; font-size: 0.9rem; letter-spacing: 1px; }
.nrl-report-win { background: #2d6a2f; color: #fff; }
.nrl-report-loss { background: #5a6b85; color: #fff; }
.nrl-report-draw { background: #e8e0c8; color: #1a1a2e; }
.nrl-report-changes { margin: 0.15rem 0; font-size: 0.8rem; }
.nrl-report-changes summary { cursor: pointer; min-height: 1.6rem; line-height: 1.6rem; }
@media (pointer: coarse) { .nrl-report-changes summary { min-height: 44px; line-height: 44px; } }
/* #368: "Why did I lose?" sits beside the plan changes, one line between them until opened. */
.nrl-report-folds { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 0 1rem; margin: 0.15rem 0; }
.nrl-report-folds > details { flex: 1 1 14rem; min-width: 0; margin: 0; }
.nrl-report-folds > details[open] { flex-basis: 100%; }
.nrl-report-why summary { font-weight: bold; }
.nrl-report-why-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.15rem 0; border-top: 1px solid #b8ae92; }
.nrl-report-why-row > span { flex: 1 1 auto; min-width: 0; }
.nrl-report-why-go { flex: 0 0 auto; font-size: 0.75rem; }
.nrl-report-body { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0.3rem 0; }
.nrl-report-scoring { flex: 1 1 18rem; display: flex; gap: 0.8rem; }
.nrl-report-side { flex: 1 1 0; min-width: 0; }
.nrl-report-side h3 { margin: 0 0 0.1rem; font-size: 0.85rem; }
.nrl-report-stats { flex: 1 1 14rem; border-collapse: collapse; font-size: 0.75rem; }
.nrl-report-stats th, .nrl-report-stats td { padding: 0.05rem 0.35rem; text-align: center; }
.nrl-report-stats td:first-child { text-align: left; white-space: nowrap; }
.nrl-report-stats th { font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 8rem; }
.nrl-screen-x {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  width: 44px;
  min-width: 44px;
  height: 44px;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
}
.nrl-modal-has-x > :not(.nrl-screen-x) > h2:first-child,
.nrl-modal-has-x > .nrl-modal-scroll > * > h2:first-child { padding-right: 2.75rem; }
/* In a screen's header row the ✕ sits in line, at the right end. */
.nrl-screen-head .nrl-screen-x { position: static; flex: 0 0 auto; }

/* ── Screen frame (#336): Squad, Lineup and Recruit ──────────────────────
   Position comes from .nrl-screen-region (openScreen); the frame pads clear of
   the notch (#347), and one header row holds title, controls and ✕. */
.nrl-screen {
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 20, 0.7);
  padding: 0.35rem calc(0.5rem + var(--nrl-safe-r)) 0.35rem calc(0.5rem + var(--nrl-safe-l));
  overflow: hidden;
  font-family: 'Courier New', monospace;
  box-sizing: border-box;
}
.nrl-screen-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  flex: 0 0 auto;
  min-width: 0;
}
.nrl-screen-titles { flex: 0 1 auto; min-width: 0; display: flex; flex-direction: column; }
.nrl-screen-title {
  font-weight: bold;
  font-size: clamp(0.9rem, 4vw, 1.3rem);
  line-height: 1.1;
  color: #f4d03f;
  text-shadow: 2px 2px 0 #000;
  white-space: nowrap;
}
.nrl-screen-titles .nrl-screen-sub { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* The controls: one row that scrolls sideways when the phone is narrow (padding
   keeps the buttons' drop shadows inside the scroller). Pushed right with a
   margin, not justify-content: an overflowing flex-end row spills off its start,
   where it cannot be scrolled to. */
.nrl-screen-tools {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  overflow-x: auto;
  padding: 0 3px 3px 0;
  scrollbar-width: thin;
}
.nrl-screen-tools > * { flex: 0 0 auto; }
.nrl-screen-tools > :first-child { margin-left: auto; }
.nrl-screen-tools .nrl-btn { padding: 0.3rem 0.5rem; }
.nrl-screen-label { color: #e8e0c8; font-size: 0.75rem; }
.nrl-screen-sub {
  font-size: clamp(0.65rem, 2.5vw, 0.85rem);
  color: #e8e0c8;
  margin-bottom: 0.4rem;
  flex: 0 0 auto;
}
.nrl-screen-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.5rem;
  align-content: start;
  padding-bottom: 0.5rem;
}
.nrl-screen-empty {
  color: #e8e0c8;
  padding: 1rem;
  text-align: center;
}
/* One selected-chip colour (sort, focus, filters). A touch leaves :hover on the
   last chip tapped; the selection wins over it. */
.nrl-sort-active, .nrl-btn.nrl-sort-active:hover:not(:disabled) { background: #7ec850; }

/* ── Toasts (ui:notify, #339): one at a time, in a lane over no control (toasts.ts
   places it: the top bar's gap at the club, under the scoreboard in a match) ── */
.nrl-toast-lane {
  pointer-events: none;
  position: fixed;
  top: calc(0.25rem + var(--nrl-safe-t));
  left: 50%;
  transform: translateX(-50%);
  width: min(30rem, calc(100vw - 1rem));
  display: flex;
  align-items: center;
  z-index: 60;
}
.nrl-toast-lane[hidden] { display: none; }
.nrl-toast-lane[data-lane="hud"] { transform: none; }
.nrl-toast-lane[data-lane="match"] {
  transform: none;
  left: calc(0.5rem + env(safe-area-inset-left, 0px));
  top: calc(var(--nrl-mo-board, 4rem) + 0.3rem);
  width: min(26rem, calc(100vw - 12rem));
  min-height: 44px;
}
.nrl-toast {
  pointer-events: auto;
  cursor: pointer;
  display: none;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  padding: 0.2rem 0.5rem;
  border: 2px solid #000;
  border-left-width: 6px;
  box-shadow: 2px 2px 0 #000;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: bold;
  line-height: 1.2;
}
.nrl-toast:first-child { display: flex; }
.nrl-toast-text { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.nrl-toast-more { flex: 0 0 auto; padding: 0 0.35em; background: #1a1a2e; color: #f4ecd8; border: 1px solid #000; }
.nrl-toast-more:empty { display: none; }
/* Red is for real problems only; routine stops and confirmations are neutral; good news is green with a gold edge. */
.nrl-toast-info { background: #e8e0c8; color: #1a1a2e; border-left-color: #5a6b85; }
.nrl-toast-success { background: #2e7d32; color: #fff; border-left-color: #f4d03f; }
.nrl-toast-danger { background: #b03a2e; color: #fff; }
.nrl-toast-danger .nrl-toast-text::before { content: '! '; }
.nrl-toast-in { animation: nrl-toast-in 160ms ease-out; }
@keyframes nrl-toast-in { from { opacity: 0; transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .nrl-toast-in { animation: none; } }

/* ── Update bar (N7, #181): a new build is waiting; never during a match ── */
.nrl-update-toast {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--nrl-nav-h, 0px) + 0.5rem + env(safe-area-inset-bottom, 0px));
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: min(94vw, 440px);
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.3rem 0.4rem 0.3rem 0.7rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 0.85rem;
  white-space: nowrap;
}
.nrl-update-toast .nrl-btn { flex: 0 0 auto; }
body.nrl-match-active .nrl-update-toast { display: none; }

/* ── History (season-end / past seasons) ─────────────────────────────── */
.nrl-history { font-size: 0.85rem; }
.nrl-history h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.nrl-history h3 { margin: 0 0 0.3rem; font-size: 0.9rem; }
.nrl-history p { margin: 0.15rem 0; }
.nrl-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.nrl-history-row {
  background: #f4efe0;
  border: 2px solid #000;
  padding: 0.4rem 0.6rem;
  font-weight: bold;
  font-size: 0.9rem;
}
.nrl-history-premiers {
  background: #f4d03f;
}
.nrl-history-detail { font-weight: normal; font-size: 0.78rem; margin-top: 0.1rem; }
.nrl-history-review, .nrl-history-books { margin-top: 0.3rem; padding: 0.25rem 0.6rem; font-size: 0.75rem; } /* 44px min from .nrl-btn (#194) */
.nrl-history-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.nrl-books-heading { margin: 0 0 0.5rem; font-weight: bold; }
.nrl-books-summary { margin: 0.5rem 0; }
.nrl-books-closing td { font-weight: bold; border-top: 1px solid #c8c0a8; }
/* Only the table scrolls, so the header row, the heading and the summary stay in view at phone height. */
.nrl-screen-backdrop .nrl-books-modal { display: flex; flex-direction: column; width: min(96vw, 720px); }
@media (max-height: 340px) { .nrl-books-heading { font-size: 0.8rem; margin-bottom: 0.25rem; } }
.nrl-season-books { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-season-books > .nrl-finance-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-finance-past { margin-top: 0.4rem; }

/* ── Season review (N7, #190) ──────────────────────────────────────────── */
.nrl-modal.nrl-review-modal { max-width: min(96vw, 720px); }
.nrl-season-review { font-size: 0.85rem; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-review-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* #351 E2: the review and the books open on one header row (title, the way to
   History, and the frame's ✕ beside it) that holds still while the rest scrolls. */
.nrl-review-head { display: flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; min-height: 44px; padding-right: 2.75rem; margin-bottom: 0.3rem; }
.nrl-review-head h2 { margin: 0; font-size: 1.1rem; min-width: 0; }
.nrl-review-head .nrl-btn { margin-left: auto; flex: 0 0 auto; padding: 0.25rem 0.6rem; font-size: 0.8rem; }
.nrl-review-finish {
  font-weight: bold;
  font-size: 1.05rem;
  background: #f4efe0;
  border: 2px solid #000;
  padding: 0.3rem 0.5rem;
  margin-bottom: 0.4rem;
}
.nrl-review-premiers { background: #f4d03f; }
.nrl-review-line { margin: 0.15rem 0; overflow-wrap: anywhere; }
.nrl-review-objectives { margin: 0 0 0.2rem 1.1rem; padding: 0; font-size: 0.8rem; }
.nrl-review-good { color: #1f5f24; }
.nrl-review-bad { color: #b00020; }

/* ── Finance (GitHub #39) ────────────────────────────────────────────── */
.nrl-finance { font-size: 0.85rem; }
.nrl-finance h2 {
  margin: 0 0 0.6rem;
  font-size: 1.1rem;
}
.nrl-finance h3 {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
}
.nrl-finance-panel { margin-bottom: 0.6rem; }
.nrl-finance-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.15rem 0;
}
.nrl-finance-label { min-width: 0; }
.nrl-finance-value { font-weight: bold; text-align: right; white-space: nowrap; }
.nrl-finance-neg { color: #b00020; }
.nrl-finance-contract { padding: 0.1rem 0; font-weight: bold; }
.nrl-finance-scroll { overflow-x: auto; }
.nrl-contract-actions { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
.nrl-finance-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  white-space: nowrap;
}
.nrl-finance-table th,
.nrl-finance-table td {
  padding: 0.2rem 0.3rem;
  text-align: right;
  border-bottom: 1px solid #b8ae92;
}
.nrl-finance-table th:first-child,
.nrl-finance-table td:first-child { text-align: left; }
.nrl-finance-table td.nrl-finance-neg { color: #b00020; }
.nrl-finance-pnl-table { width: 100%; }
.nrl-finance-pnl-net td { font-weight: bold; border-top: 2px solid #000; }
.nrl-finance-pnl-sub td { font-size: 0.72rem; color: #555; padding-top: 0; }
/* N14.5, #344, #350 F1: Staff & Board. The board's panel on the left, one
   parchment row per staff role beside it; one column on a narrow screen. */
.nrl-screen-body.nrl-staff { grid-template-columns: clamp(12rem, 30%, 17rem) minmax(0, 1fr); align-items: start; font-size: 0.85rem; }
.nrl-staff .nrl-board-panel { margin: 0; }
.nrl-staff-list { display: grid; gap: 0.5rem; align-content: start; }
.nrl-board h3 { margin: 0 0 0.2rem; font-size: 0.9rem; }
.nrl-board-patience { margin: 0 0 0.3rem; font-size: 0.75rem; }
.nrl-board-obj { padding: 0.15rem 0; border-top: 1px solid #b8ae92; font-size: 0.78rem; }
/* #368: the hub chip's risk word on each pending objective. */
.nrl-board-risk { font-weight: bold; white-space: nowrap; }
.nrl-board-on-track .nrl-board-risk { color: var(--nrl-risk-green, #2f6b1f); }
.nrl-board-at-risk .nrl-board-risk { color: var(--nrl-risk-amber-ink, #8a4b00); }
.nrl-board-off-track .nrl-board-risk { color: var(--nrl-risk-red, #b00020); }
@media (max-width: 600px) {
  .nrl-screen-body.nrl-staff { grid-template-columns: minmax(0, 1fr); }
}
.nrl-staff-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: #e8e0c8;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.nrl-staff-info { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
.nrl-staff-blurb { font-size: 0.72rem; color: #555; }
.nrl-staff-row .nrl-btn { flex: 0 0 auto; margin-right: 3px; } /* clear of the row's edge and its shadow */
/* 956×330: the head and the board make a left column and the staff rows take the
   full height beside them, each blurb run on after the role's name. */
@media (max-height: 340px) {
  .nrl-screen:has(> .nrl-staff) { position: relative; display: grid; grid-template-columns: clamp(12rem, 30%, 17rem) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); column-gap: 0.5rem; }
  .nrl-screen:has(> .nrl-staff) > .nrl-screen-head { grid-column: 1; grid-row: 1; min-width: 0; }
  .nrl-screen:has(> .nrl-staff) .nrl-screen-x { position: absolute; top: 0.35rem; right: calc(0.5rem + var(--nrl-safe-r)); }
  .nrl-screen-body.nrl-staff { display: contents; }
  .nrl-staff .nrl-board-panel { grid-column: 1; grid-row: 2; min-height: 0; max-height: 100%; overflow-y: auto; }
  .nrl-staff-list { grid-column: 2; grid-row: 1 / -1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 3.25rem 3px 0; }
  .nrl-staff-info { display: block; line-height: 1.2; }
  .nrl-staff-info strong { margin-right: 0.4em; }
}

/* ── News inbox (#45) ─────────────────────────────────────────────────── */
.nrl-nav-badge {
  display: inline-block;
  margin-left: 0.25rem;
  min-width: 1.1em;
  padding: 0 0.2em;
  background: #b03a2e;
  color: #fff;
  border: 2px solid #000;
  font-size: 0.85em;
  line-height: 1.2;
  text-align: center;
}
.nrl-screen-backdrop .nrl-news-modal {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(96vw, 640px);
  height: calc(100% - 6px);
  max-width: none;
  padding: 0.55rem 0.65rem;
}
.nrl-news { font-size: 0.9rem; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-news-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* #345: the title and the filters are one row beside the ✕; the feed gets the rest. */
.nrl-news-head { display: flex; align-items: center; gap: 0.6rem; flex: 0 0 auto; min-width: 0; padding-right: 2.75rem; margin-bottom: 0.3rem; }
.nrl-news h2 { margin: 0; font-size: 1.05rem; flex: 0 0 auto; }
.nrl-news h3 { margin: 0.6rem 0 0.2rem; font-size: 0.9rem; }
.nrl-news-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  min-width: 0;
  overflow-x: auto;
  padding: 0 3px 3px 0;
}
.nrl-news-filter { flex: 0 0 auto; }
.nrl-news-filter.nrl-news-active, .nrl-news-filter.nrl-news-active:hover:not(:disabled) { background: #7ec850; color: #1a1a2e; }
.nrl-news-list { overflow-y: visible; }
.nrl-news-item {
  padding: 0.2rem 0.4rem;
  margin-bottom: 0.25rem;
  border-left: 4px solid #5a6b85; /* the info toast's edge (#339) */
  overflow-wrap: anywhere;
}
.nrl-news-item.nrl-news-success { border-left-color: #2e7d32; }
.nrl-news-item.nrl-news-danger { border-left-color: #b03a2e; }
.nrl-news-empty { margin: 0.4rem 0; }
/* Waiting decisions: one row, however many, with the button to their popup. */
.nrl-news-decisions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  margin: 0 3px 0.35rem 0;
  padding: 0.15rem 0.2rem 0.15rem 0.5rem;
  background: #fff8e1;
  border: 3px solid #000;
  border-left: 6px solid #e8a33a;
}
.nrl-news-decisions[hidden] { display: none; }
.nrl-news-decisions-text { flex: 1 1 auto; min-width: 0; font-weight: bold; font-size: 0.85rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nrl-news-answer { flex: 0 0 auto; }
/* 956×330: a waiting decision shares the title's row, so the feed keeps four items. */
@media (max-height: 340px) {
  .nrl-screen-backdrop .nrl-news-modal { width: min(96vw, 820px); }
  .nrl-news { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); column-gap: 0.5rem; }
  .nrl-news-head { padding-right: 0; }
  .nrl-news-decisions { margin: 0 2.75rem 0.3rem 0; }
  .nrl-news-decisions[hidden] + .nrl-news-body { grid-row: 2; }
  .nrl-news-body { grid-column: 1 / -1; }
  .nrl-news-head:has(+ .nrl-news-decisions[hidden]) { grid-column: 1 / -1; padding-right: 2.75rem; }
}
.nrl-event-card {
  background: #fff8e1;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.4rem 0.5rem;
  margin: 0 3px 0.6rem 0;
}
.nrl-event-title { font-weight: bold; font-size: 1rem; line-height: 1.25; }
/* The deadline wraps (#345: it was cut off at "…or it's "Ban the t"). */
.nrl-event-meta { font-size: 0.75rem; color: #555; line-height: 1.3; overflow-wrap: anywhere; }
.nrl-event-text { margin: 0.35rem 0; overflow-wrap: anywhere; line-height: 1.35; font-size: 0.9rem; }
.nrl-event-choices { display: flex; flex-direction: column; gap: 0.4rem; }
.nrl-event-choice {
  flex: 1 1 auto;
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  white-space: normal;
  min-height: 44px;
}
.nrl-event-choice-label { font-weight: bold; font-size: 0.95rem; line-height: 1.2; }
.nrl-event-choice-hint { font-size: 0.78rem; opacity: 0.9; white-space: normal; font-weight: normal; line-height: 1.3; }
/* #346: a risk is its own line, marked so it never reads as a sure cost. */
.nrl-event-choice-risk {
  font-size: 0.78rem; white-space: normal; font-weight: normal; line-height: 1.3;
  color: #7a1f14; padding-left: 0.4rem; border-left: 3px solid #b03a2e; margin-top: 0.1rem;
}
/* The decisions popup and Advance Week's ask (#338, #345): a region dialog, one card. */
.nrl-dialog-region .nrl-decisions-modal { width: min(96vw, 640px); max-width: none; }
.nrl-decisions h2, .nrl-ask h2 { margin: 0 0 0.35rem; font-size: 1.05rem; padding-right: 2.75rem; min-height: 1.4rem; }
.nrl-decisions .nrl-event-card { margin-bottom: 0.2rem; }
.nrl-decisions-note { margin: 0 0 0.5rem; font-size: 0.85rem; }
.nrl-decisions-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.4rem 3px 3px 0; }
.nrl-decisions-actions .nrl-btn { flex: 1 1 12rem; }
.nrl-ask-answer, .nrl-decisions-go { background: #7ec850; }
.nrl-ask-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.nrl-ask-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.2rem 0.6rem; padding: 0.25rem 0.45rem; background: #fff8e1; border: 2px solid #000; border-left: 6px solid #3a6ea5; font-size: 0.85rem; }
.nrl-ask-row.nrl-ask-due { border-left-color: #b03a2e; }
.nrl-ask-title { font-weight: bold; }
.nrl-ask-note { color: #444; overflow-wrap: anywhere; }
/* Compact cards on short landscape and narrow portrait phones: choices stay
   in view, with their hints visible and targets at least 44px tall. */
@media (max-height: 500px), (max-width: 480px) {
  .nrl-screen-backdrop .nrl-news-modal { padding: 0.25rem 0.5rem; }
  .nrl-news h2 { font-size: 0.9rem; }
  .nrl-decisions h2, .nrl-ask h2 { font-size: 0.9rem; margin-bottom: 0.15rem; min-height: 0; line-height: 44px; }
  .nrl-event-card { padding: 0.15rem 0.4rem 0.1rem; margin-bottom: 0.25rem; }
  .nrl-event-title { font-size: 0.95rem; }
  .nrl-event-meta { font-size: 0.68rem; line-height: 1.2; }
  .nrl-event-text { margin: 0.05rem 0 0.15rem; font-size: 0.78rem; line-height: 1.2; }
  .nrl-event-choices { gap: 0.2rem; }
  .nrl-event-choice { padding: 0.1rem 0.45rem; }
  .nrl-event-choice-hint, .nrl-event-choice-risk { font-size: 0.7rem; line-height: 1.2; }
  .nrl-decisions-actions { margin-top: 0.25rem; }
}
/* Landscape has room for equal columns; portrait keeps the choices stacked. */
@media (max-height: 500px) {
  .nrl-event-head { display: flex; align-items: baseline; gap: 0.6rem; }
  .nrl-event-title { flex: 0 0 auto; }
  .nrl-event-meta { flex: 1 1 auto; min-width: 0; }
  .nrl-event-choices { flex-direction: row; align-items: stretch; gap: 0.4rem; }
  .nrl-event-choice { flex: 1 1 0; min-width: 0; width: auto; }
}
/* #368: the weekly summary card. Two columns (the squad; the money and the
   board) so a typical week fits a phone on its side without scrolling. */
.nrl-dialog-region .nrl-summary-modal { width: min(96vw, 640px); max-width: none; }
.nrl-summary h2 { margin: 0 0 0.3rem; font-size: 1.05rem; padding-right: 2.75rem; min-height: 1.4rem; }
.nrl-summary-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.35rem 0.75rem; }
.nrl-summary-col { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.nrl-summary-sec { padding: 0.2rem 0.45rem; background: var(--nrl-card-bg, #fff8e1); border: 2px solid #000; border-left: 6px solid var(--nrl-info, #3a6ea5); font-size: 0.82rem; }
.nrl-summary-sec h3 { margin: 0; font-size: 0.85rem; }
.nrl-summary-sec p { margin: 0.05rem 0 0; line-height: 1.25; overflow-wrap: anywhere; }
.nrl-summary-none { color: #555; font-style: italic; }
.nrl-summary-up { color: var(--nrl-risk-green, #2f6b1f); }
.nrl-summary-down { color: var(--nrl-risk-red, #b00020); }
.nrl-summary-board.nrl-summary-happy { border-left-color: var(--nrl-risk-green, #2f6b1f); }
.nrl-summary-board.nrl-summary-watching { border-left-color: var(--nrl-risk-amber, #d08a00); }
.nrl-summary-board.nrl-summary-worried { border-left-color: var(--nrl-risk-red, #b00020); }
.nrl-summary-advance { background: var(--nrl-go, #7ec850); }
@media (max-height: 500px), (max-width: 480px) {
  .nrl-summary h2 { font-size: 0.9rem; margin-bottom: 0.1rem; min-height: 0; line-height: 44px; }
  .nrl-summary-sec { font-size: 0.74rem; padding: 0.1rem 0.4rem; }
  .nrl-summary-sec h3 { font-size: 0.78rem; }
  .nrl-summary-col { gap: 0.2rem; }
}
.nrl-placebar {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: calc(var(--nrl-hud-h, 0px) + 0.4rem);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: max-content;
  max-width: min(94vw, 560px);
  background: #e8e0c8;
  color: #1a1a2e;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.3rem 0.4rem 0.3rem 0.6rem;
  font-size: 0.8rem;
}
.nrl-placebar[hidden] { display: none; }
.nrl-kit { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-kit h2 { margin: 0; font-size: 1.05rem; line-height: 44px; }
.nrl-kit h3 { margin: 0.5rem 0 0.2rem; font-size: 0.85rem; }
.nrl-kit-controls > h3:first-child { margin-top: 0; }
.nrl-kit-note { margin: 0 0 0.4rem; font-size: 0.75rem; }
.nrl-kit-body { display: flex; gap: 0.6rem; flex: 1 1 auto; min-height: 0; }
.nrl-kit-preview { display: flex; gap: 0.5rem; align-items: flex-end; align-self: flex-start; flex: 0 0 auto; }
.nrl-kit-preview figure { margin: 0; text-align: center; font-size: 0.7rem; }
.nrl-kit-sprite { width: 84px; height: 90px; image-rendering: pixelated; }
.nrl-kit-portrait { width: 72px; image-rendering: pixelated; }
.nrl-kit-controls { flex: 1 1 16rem; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-right: 3px; }
.nrl-kit-label { font-size: 0.72rem; font-weight: bold; margin-top: 0.2rem; }
.nrl-kit-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.nrl-kit-pattern[aria-pressed="true"], .nrl-kit-pattern[aria-pressed="true"]:hover:not(:disabled) { background: #7ec850; color: #1a1a2e; }
.nrl-kit-swatch {
  pointer-events: auto;
  width: 44px; height: 44px; /* #194: a tap target */
  border: 3px solid #555;
  cursor: pointer;
}
.nrl-kit-swatch[aria-pressed="true"] { border-color: #fff; box-shadow: 0 0 0 2px #000; }
.nrl-kit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.4rem; flex: 0 0 auto; padding: 0 3px 3px 0; }
.nrl-screen-backdrop .nrl-kit-modal { width: min(96vw, 760px); }
/* S4 (#351): on a landscape phone the title, note, preview and Save make a left
   column, so the controls scroll beside them at the box's full height. */
@media (max-height: 500px) {
  .nrl-kit { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; column-gap: 0.75rem; }
  .nrl-kit-body { display: contents; }
  .nrl-kit h2 { grid-column: 1; grid-row: 1; font-size: 0.95rem; line-height: 1.3; }
  .nrl-kit-note { grid-column: 1; grid-row: 2; max-width: 13.5rem; margin: 0.15rem 0 0.3rem; font-size: 0.7rem; }
  .nrl-kit-preview { grid-column: 1; grid-row: 3; gap: 0.35rem; }
  .nrl-kit-sprite { width: 56px; height: 60px; }
  .nrl-kit-portrait { width: 52px; }
  .nrl-kit-controls { grid-column: 2; grid-row: 1 / -1; padding-right: 2.75rem; }
  .nrl-kit-actions { grid-column: 1; grid-row: 4; justify-content: flex-start; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.3rem; }
}
/* ── League screen: the next-match card and the form guide (N7, #183) ──── */
/* A landscape phone has width to spare and no height: let the league use it. */
.nrl-screen-backdrop .nrl-league-modal { width: min(96vw, 760px); max-width: none; }
/* N14 (#263): only the tab's body scrolls, so the tabs and the ✕ stay in view at
   phone height (as the Guide, #206); one row clear of the ✕ holds them (#336). */
.nrl-league-tabs { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; min-height: 44px; flex: 0 0 auto; }
.nrl-modal-has-x .nrl-league-tabs { padding-right: 2.75rem; }
.nrl-league-tabs .nrl-btn[data-active], .nrl-league-tabs .nrl-btn[data-active]:hover:not(:disabled) { background: #7ec850; }
.nrl-league-note { flex: 1 1 auto; min-width: 0; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-league { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-league-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-ladder-table thead th { position: sticky; top: 0; z-index: 1; background: #e8e0c8; }
@media (max-height: 500px) { .nrl-ladder-table th, .nrl-rival-table th { padding-top: 0.05rem; padding-bottom: 0.05rem; } }
/* Too short for a header row above four 44px rows (956×330): the tabs and the note
   become a rail down the left, and the ✕ keeps the top-right corner over a gutter. */
@media (max-height: 340px) {
  .nrl-league { flex-direction: row; gap: 0.5rem; }
  .nrl-league-tabs { flex-direction: column; align-items: stretch; width: 6.5rem; margin: 0; }
  .nrl-modal-has-x .nrl-league-tabs { padding-right: 0; }
  .nrl-league-note { white-space: normal; font-size: 0.68rem; line-height: 1.25; }
  .nrl-modal-has-x .nrl-league-body { padding-right: 2.75rem; }
}
.nrl-next-match {
  background: #fff8e1;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.4rem 0.6rem;
  margin: 0 3px 0.6rem 0;
  font-size: 0.85rem;
}
.nrl-next-head { font-weight: bold; margin-bottom: 0.3rem; }
.nrl-next-label { background: #1a1a2e; color: #f4d03f; padding: 0 0.3rem; margin-right: 0.2rem; }
.nrl-next-sides { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; margin-bottom: 0.3rem; }
.nrl-next-side { display: flex; align-items: center; gap: 0.4rem; flex: 1 1 16rem; min-width: 0; }
.nrl-next-swatch { flex: 0 0 auto; width: 18px; height: 18px; border: 3px solid; box-sizing: border-box; }
.nrl-next-side-text { flex: 1 1 auto; min-width: 0; }
.nrl-next-name { font-weight: bold; }
.nrl-next-meta { font-size: 0.75rem; color: #555; }
.nrl-next-line { margin: 0.15rem 0; overflow-wrap: anywhere; }
.nrl-next-line b { margin-right: 0.3rem; }
.nrl-form { display: inline-flex; gap: 2px; white-space: nowrap; vertical-align: middle; }
.nrl-form i {
  display: inline-block;
  width: 1.15em;
  line-height: 1.3;
  text-align: center;
  font-style: normal;
  font-weight: bold;
  font-size: 0.75rem;
  color: #fff;
  border: 1px solid #000;
}
.nrl-form-W { background: #2e7d32; }
.nrl-form-D { background: #7a7a7a; }
.nrl-form-L { background: #b03a2e; }
.nrl-form-empty { color: #777; }
.nrl-ladder-scroll { overflow-x: auto; }
.nrl-ladder-table { border-collapse: collapse; font-size: 0.8rem; width: 100%; }
.nrl-ladder-table th, .nrl-ladder-table td { padding: 0.15rem 0.3rem; text-align: right; white-space: nowrap; }
.nrl-ladder-table th:nth-child(2), .nrl-ladder-table td:nth-child(2) { text-align: left; }
.nrl-ladder-table td.nrl-ladder-form { text-align: left; }
.nrl-ladder-table tr[data-player] { background: #f4d03f; }
/* Phone polish (#194): on a touch screen a club's name is a 44px target that fills
   its row; a mouse keeps the compact table. */
@media (pointer: coarse) {
  .nrl-ladder-table tbody tr { height: 44px; }
  .nrl-ladder-table td.nrl-ladder-name { padding-top: 0; padding-bottom: 0; }
  .nrl-ladder-name .nrl-ladder-club { display: flex; align-items: center; min-height: 44px; width: 100%; }
}
/* The next-match card's opponent: the same text link, with a 44px hit area (#194). */
.nrl-next-side .nrl-ladder-club { padding: 0.9rem 0.25rem; margin: -0.9rem -0.25rem; }
/* My season or every game (#351 X2): one row a round, your result's pip and score. */
.nrl-fixtures-views { display: flex; gap: 0.4rem; margin: 0 0 0.3rem; }
.nrl-fixture-mine { display: grid; grid-template-columns: minmax(0, 1fr) 1.4rem 3.2rem; align-items: center; gap: 0.4rem; padding: 0.2rem 0.4rem; border-bottom: 1px solid rgba(0,0,0,0.15); }
.nrl-fixture-mine[data-current] { background: #fff6c2; }
.nrl-fixture-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nrl-fixture-score { text-align: right; }
.nrl-next-form { display: flex; align-items: center; gap: 0.3rem; flex: 0 0 auto; }
.nrl-next-form small { font-size: 0.68rem; color: #555; }
.nrl-fixtures-round { margin: 0.6rem 0 0.2rem; font-size: 0.95rem; }
.nrl-fixtures-round[data-current] { color: #b03a2e; }
.nrl-fixture[data-player] { font-weight: bold; }
.nrl-ladder-club {
  pointer-events: auto;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  text-decoration: underline dotted;
  cursor: pointer;
}
.nrl-dialog-region .nrl-rival-modal { width: min(96vw, 640px); max-width: none; }
.nrl-rival-squad { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-rival-head { flex: 0 0 auto; min-height: 44px; margin-bottom: 0.1rem; display: flex; flex-direction: column; justify-content: center; }
.nrl-modal-has-x .nrl-rival-head { padding-right: 2.75rem; }
.nrl-rival-head h2 { margin: 0; font-size: 1rem; line-height: 1.2; }
.nrl-rival-head p { margin: 0; font-size: 0.72rem; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* 956×330: the club's block goes down the left, as the League's tabs do, so four rows show. */
@media (max-height: 340px) {
  .nrl-dialog-region .nrl-rival-modal { width: min(96vw, 760px); }
  .nrl-rival-squad { flex-direction: row; gap: 0.5rem; }
  .nrl-rival-head { flex: 0 0 10.5rem; justify-content: flex-start; margin: 0; }
  .nrl-modal-has-x .nrl-rival-head { padding-right: 0; }
  .nrl-rival-head p { white-space: normal; font-size: 0.68rem; }
  .nrl-modal-has-x .nrl-rival-scroll { padding-right: 2.75rem; }
}
.nrl-rival-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.nrl-rival-table { border-collapse: collapse; font-size: 0.75rem; width: 100%; }
.nrl-rival-table th, .nrl-rival-table td { padding: 0.15rem 0.3rem; text-align: left; white-space: nowrap; }
.nrl-rival-table thead th { position: sticky; top: 0; background: #e8e0c8; }
.nrl-rival-traits { font-size: 0.68rem; }
/* Full trait names (#349 S3) wrap inside the 44px row rather than push the table past its box. */
.nrl-rival-table td.nrl-rival-traits { white-space: normal; line-height: 1.2; min-width: 8rem; }
/* Rows are tap targets for the player page (N7, #185). */
.nrl-rival-table tbody tr.nrl-rival-row { height: 44px; cursor: pointer; }
.nrl-rival-table tbody tr.nrl-rival-row:hover, .nrl-rival-table tbody tr.nrl-rival-row:focus-visible { background: #f4d03f; outline: none; }

/* ── Player page (N7, #185) ──────────────────────────────────────────────── */
.nrl-modal.nrl-player-modal { max-width: min(94vw, 680px); padding: 0.6rem; }
.nrl-player-panel { padding: 0.5rem 0.7rem; }
.nrl-player { font-size: 0.82rem; }
.nrl-player-top { display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.3rem; }
.nrl-player-portrait {
  flex: 0 0 auto;
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: 3px solid #000;
  background: #cfc9b4;
}
.nrl-player-id { flex: 1 1 auto; min-width: 0; }
.nrl-player-name { display: flex; gap: 0.4rem; align-items: baseline; font-weight: bold; font-size: 1.05rem; overflow-wrap: anywhere; }
.nrl-player-name .nrl-card-ovr { flex: 0 0 auto; white-space: nowrap; overflow-wrap: normal; }
.nrl-player-where { font-size: 0.75rem; color: #555; }
.nrl-player-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 0.2rem 1rem; }
.nrl-player h3 { margin: 0.4rem 0 0.15rem; font-size: 0.82rem; border-bottom: 2px solid #b8ae92; }
.nrl-player-stats .nrl-statrow { grid-template-columns: 4.6rem 1fr 1.8rem; }
.nrl-player-trait { margin: 0.1rem 0; overflow-wrap: anywhere; }
.nrl-player-trait b { margin-right: 0.3rem; }
.nrl-player-trait-bad b { color: #8a3a00; }
.nrl-player-line { margin: 0.1rem 0; overflow-wrap: anywhere; }
.nrl-player-expiring { color: #b00020; }
/* The age curve and projected peak (#369), under the stat bars. */
.nrl-player-outlook { margin: -0.1rem 0 0.2rem; font-size: 0.72rem; line-height: 1.25; }
.nrl-player-outlook-body { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.1rem; }
.nrl-player-curve { flex: 0 0 auto; width: 5.5rem; height: 1.6rem; background: var(--nrl-curve-bg, #f3edd9); border: 1px solid #b8ae92; }
.nrl-player-outlook-note { min-width: 0; color: #555; font-size: 0.66rem; line-height: 1.2; }
/* #203: the actions stay pinned to the foot of the card's scroller while the rest scrolls. */
.nrl-player-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
  position: sticky;
  bottom: 0;
  padding: 0.4rem 3px 0.3rem 0;
  background: #e8e0c8;
  border-top: 2px solid #b8ae92;
  z-index: 1;
}
.nrl-player-actions .nrl-btn { flex: 1 1 8rem; white-space: normal; }
.nrl-modal-has-x .nrl-player-top { padding-right: 2.75rem; }
/* A landscape phone (#336): who he is and his deal on the left, his stats and
   traits on the right, so the stats show without scrolling. The ✕ in the
   corner is the one close (#349 A5). */
@media (max-height: 500px) {
  .nrl-modal.nrl-player-modal { max-width: min(96vw, 760px); width: min(96vw, 760px); padding: 0.4rem 0.5rem; }
  .nrl-player-panel { padding: 0.35rem 0.5rem; }
  .nrl-player { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 1rem; grid-template-areas: "top about" "details about" "actions actions"; align-items: start; }
  .nrl-player-grid { display: contents; }
  .nrl-player-top { grid-area: top; }
  .nrl-player-about { grid-area: about; }
  .nrl-player-details { grid-area: details; }
  .nrl-player-actions { grid-area: actions; margin-top: 0.3rem; }
  .nrl-player-about h3:first-child { margin-top: 0; }
  .nrl-modal-has-x .nrl-player-about { padding-right: 2.75rem; }
  .nrl-modal-has-x .nrl-player-top { padding-right: 0; }
  .nrl-player-portrait { width: 56px; height: 56px; }
  .nrl-player-why { order: 1; }
}
.nrl-player-why { flex: 1 1 100%; font-size: 0.72rem; color: #555; }
/* ── Guide, under More (N7, #188, #344) ─────────────────────────────────────────── */
.nrl-screen-backdrop .nrl-guide-modal { width: min(96vw, 760px); max-width: none; display: flex; flex-direction: column; }
/* #206: only the page scrolls; the tabs and the foot (Replay) stay in view. */
.nrl-guide { font-size: 0.85rem; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-guide-tabs, .nrl-guide-foot { flex: 0 0 auto; }
.nrl-guide-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-guide-tabs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
.nrl-guide-tabs .nrl-btn { flex: 1 1 auto; font-size: clamp(0.6rem, 1.7vw, 0.85rem); padding: 0.4rem 0.45rem; }
.nrl-guide-tabs .nrl-btn[aria-pressed="true"], .nrl-guide-tabs .nrl-btn[aria-pressed="true"]:hover:not(:disabled) { background: #7ec850; color: #1a1a2e; }
.nrl-guide h2 { margin: 0 0 0.3rem; font-size: 1.05rem; }
.nrl-guide h3 { margin: 0.5rem 0 0.15rem; font-size: 0.88rem; border-bottom: 2px solid #b8ae92; }
/* N14 (#263): the screen a page describes, one tap away. */
.nrl-guide-head { display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem 0.75rem; margin: 0 0 0.3rem; }
.nrl-guide-head h2 { margin: 0; }
.nrl-guide-link { font-size: 0.78rem; padding: 0.3rem 0.6rem; }
.nrl-guide p { margin: 0.2rem 0; overflow-wrap: anywhere; }
.nrl-guide ul { margin: 0.2rem 0 0.2rem 1.1rem; padding: 0; }
.nrl-guide li { margin: 0.15rem 0; overflow-wrap: anywhere; }
.nrl-guide-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
  padding-top: 0.5rem;
  border-top: 2px solid #b8ae92;
}
.nrl-guide-build { flex: 1 1 auto; font-size: 0.75rem; color: #555; }
.nrl-guide-update { background: #7ec850; }
.nrl-modal-has-x .nrl-guide-tabs { padding-right: 2.75rem; }
/* #206, #336: a landscape phone leaves the Guide little height. One row holds the
   tabs (swipe for more), Replay and the ✕, and the page has the rest, even with
   Safari's text boost. The build label sits in the frame's bottom edge. */
@media (max-height: 500px) {
  .nrl-screen-backdrop .nrl-guide-modal { padding: 0.5rem 0.75rem 0.85rem; }
  .nrl-guide { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto minmax(0, 1fr); column-gap: 0.4rem; }
  .nrl-guide-tabs { grid-column: 1; grid-row: 1; flex-wrap: nowrap; overflow-x: auto; margin-bottom: 0.3rem; padding: 0 3px 3px 0; }
  .nrl-modal-has-x .nrl-guide-tabs { padding-right: 3px; }
  .nrl-guide-tabs .nrl-btn { flex: 0 0 auto; }
  .nrl-guide-foot { grid-column: 2; grid-row: 1; align-self: start; flex-wrap: nowrap; margin: 0; padding: 0; border: 0; }
  .nrl-modal-has-x .nrl-guide-foot { margin-right: 2.75rem; }
  .nrl-guide-foot .nrl-btn { flex: 0 0 auto; }
  .nrl-guide-build { position: absolute; right: 0.75rem; bottom: 0.1rem; font-size: 0.6rem; line-height: 1; pointer-events: none; }
  .nrl-guide-body { grid-column: 1 / -1; grid-row: 2; }
  .nrl-guide { font-size: 0.8rem; }
  .nrl-guide h2 { font-size: 0.95rem; }
  .nrl-guide h3 { margin-top: 0.35rem; }
}
.nrl-card-open { cursor: pointer; }
.nrl-card-open:focus-visible { outline: 3px solid #3a6ea5; }
.nrl-card-more { color: #555; font-weight: bold; font-size: 1.1rem; line-height: 1; }
.nrl-placebar-text { flex: 1 1 auto; }
.nrl-placebar-cancel { flex: 0 0 auto; }

/* ── #370: the Undo toast and the first-visit hints. New colours are tokens with
   today's values, so the theme takes them over in one place. ── */
.nrl-toast.nrl-toast-action { cursor: default; max-height: none; padding-top: 0; padding-bottom: 0; gap: 0.3rem; }
/* Three short lines in the top bar's row, so a narrow phone's gap still reads the line. */
.nrl-toast-action .nrl-toast-text { flex: 1 1 auto; min-width: 0; font-size: 0.72rem; line-height: 1.1; -webkit-line-clamp: 3; overflow-wrap: anywhere; }
/* The 44px buttons run over the toast's own top and bottom edge, so the toast is 44px too and fits the top bar's row. */
.nrl-toast-action .nrl-btn { flex: 0 0 auto; min-height: 44px; min-width: 44px; margin: -2px 0; padding: 0 0.5rem; box-shadow: none; border-width: 2px; font-size: 0.8rem; }
.nrl-toast-btn { background: var(--nrl-toast-action-bg, #f4d03f); color: var(--nrl-toast-action-ink, #1a1a2e); }
.nrl-toast-btn[hidden] { display: none; }
.nrl-toast-x { width: 44px; padding: 0; background: var(--nrl-toast-x-bg, #e8e0c8); color: var(--nrl-toast-x-ink, #1a1a2e); }
.nrl-hint {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  padding: 0 0 0 0.6rem;
  background: var(--nrl-hint-bg, #e8e0c8);
  color: var(--nrl-hint-ink, #1a1a2e);
  border: 2px solid var(--nrl-hint-border, #000);
  border-left: 6px solid var(--nrl-hint-edge, #f4d03f);
  font-size: 0.78rem;
  line-height: 1.25;
}
.nrl-hint-text { flex: 1 1 auto; min-width: 0; }
/* A framed screen's ✕ sits in the corner over its scroll: the hint stops short of it. */
.nrl-modal-has-x .nrl-modal-scroll > .nrl-hint { margin-right: 2.75rem; }
.nrl-hint .nrl-hint-x { flex: 0 0 auto; width: 44px; min-height: 44px; padding: 0; box-shadow: none; border-width: 0 0 0 2px; }
`;
