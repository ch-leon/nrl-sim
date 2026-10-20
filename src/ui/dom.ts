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
// z-order: HUD/nav 10 · ♪ 20 · screens 50 · toasts 60 · modals 100 · tutorial 200.

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

/**
 * Show `node` as THE open screen in the screen region (between HUD and nav).
 * Any previously open screen and any open dialog are closed first. `onClose`
 * runs when the screen is closed by any route (its own Close button calling
 * closeScreen(), another screen opening, or a match starting). Returns `node`.
 */
export function openScreen(node: HTMLElement, onClose?: () => void): HTMLElement {
  ensureStyles();
  closeModal();
  node.classList.add('nrl-screen-region');
  screenSlot.open(node, () => {
    node.remove();
    onClose?.();
  });
  getRoot().appendChild(node);
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
 */
export function openModal(
  content: HTMLElement,
  opts: { class?: string; screen?: boolean; closeButton?: boolean; region?: boolean } = {},
): HTMLElement {
  ensureStyles();
  const box = el(
    'div',
    { class: opts.class ? `nrl-modal ${opts.class}` : 'nrl-modal' },
    content,
  );
  // Clicks inside the modal box must not bubble to the backdrop's close handler.
  box.addEventListener('click', (e) => e.stopPropagation());

  if (opts.screen) {
    // A ✕ in the corner (#195): on a phone a screen's own Close is often below
    // the fold. Screens with a Close in their header pass closeButton: false.
    if (opts.closeButton !== false) {
      const x = button('✕', () => closeScreen(), { class: 'nrl-screen-x' });
      x.setAttribute('aria-label', 'Close');
      box.classList.add('nrl-modal-has-x');
      box.prepend(x);
    }
    const backdrop = el(
      'div',
      { class: 'nrl-modal-backdrop nrl-screen-backdrop', onClick: () => closeScreen() },
      box,
    );
    return openScreen(backdrop);
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
  padding: calc(0.5rem + env(safe-area-inset-top, 0px)) calc(0.5rem + env(safe-area-inset-right, 0px)) 0.5rem calc(0.5rem + env(safe-area-inset-left, 0px));
  z-index: 10;
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
.nrl-hud-spacer { flex: 1 1 auto; }
.nrl-hud-actions {
  pointer-events: auto;
  position: relative;
  display: flex;
  gap: 0.25rem;
  align-items: stretch;
}
/* #44: "Advance Week" menu. Tap targets stay ≥44px (.nrl-btn min-height). */
.nrl-hud-menu-toggle { min-width: 44px; padding: 0.4rem 0.5rem; }
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
}

/* ── Nav ─────────────────────────────────────────────────────────────── */
.nrl-nav {
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 0.4rem;
  /* #18: home-bar / side insets; the row scrolls sideways when it overflows. */
  padding: 0.5rem calc(0.5rem + env(safe-area-inset-right, 0px)) calc(0.5rem + env(safe-area-inset-bottom, 0px)) calc(0.5rem + env(safe-area-inset-left, 0px));
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  white-space: nowrap;
  z-index: 10;
}
/* Narrow phones: tighter buttons so most of the nav fits without scrolling. */
@media (max-width: 480px) {
  .nrl-nav { gap: 0.15rem; }
  /* All seven items fit at 360px; the row still scrolls if a font is wider. */
  .nrl-nav .nrl-btn {
    padding: 0.4rem 0.1rem;
    font-size: 0.58rem;
    border-width: 2px;
    box-shadow: 2px 2px 0 #000;
  }
  .nrl-hud .nrl-btn { padding: 0.4rem 0.5rem; }
  /* #45: nine items (News added) don't fit one row at 360px. Wrap to rows of
     five so every item, badge included, is on screen without sideways scroll. */
}
.nrl-nav .nrl-btn { flex: 0 0 auto; }
/* #45: nine items (News added) don't fit one row at 360px. Wrap to rows of
   five so every item, badge included, is on screen without sideways scroll. */
@media (max-width: 480px) {
  .nrl-nav { flex-wrap: wrap; justify-content: center; overflow-x: visible; }
  .nrl-nav .nrl-btn { flex: 0 0 calc(20% - 0.15rem); min-width: 0; }
}
/* Landscape phones (844×390 and up to small laptops): ten items in one row of
   equal buttons, so Help (?) and News with its badge stay on screen instead of
   scrolling off the right edge. */
@media (min-width: 481px) and (max-width: 1000px) {
  .nrl-nav { gap: 0.25rem; overflow-x: visible; }
  .nrl-nav .nrl-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.4rem 0.05rem;
    /* #195: eleven labels at 667px ("Contracts") without an ellipsis. */
    font-size: clamp(0.5rem, 1.3vw, 0.85rem);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nrl-nav .nrl-nav-badge { margin-left: 0.15rem; }
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
.nrl-screen-backdrop {
  padding: 0.5rem calc(0.5rem + env(safe-area-inset-right, 0px)) 0.5rem calc(0.5rem + env(safe-area-inset-left, 0px));
}
.nrl-screen-backdrop .nrl-modal {
  /* Fit inside the region (drop-shadow included) rather than the viewport. */
  max-height: calc(100% - 6px);
  /* #195: a landscape phone has width to spare and no height; use it. */
  position: relative;
  width: min(96vw, 640px);
  max-width: none;
}
/* A region dialog (#203): between HUD and nav like a screen, above it like a dialog. */
.nrl-dialog-region {
  top: var(--nrl-hud-h, 0px);
  bottom: var(--nrl-nav-h, 0px);
  padding: 0.5rem calc(0.5rem + env(safe-area-inset-right, 0px)) 0.5rem calc(0.5rem + env(safe-area-inset-left, 0px));
  box-sizing: border-box;
}
.nrl-dialog-region .nrl-modal {
  max-height: calc(100% - 6px);
  position: relative;
}
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
.nrl-modal-has-x > :not(.nrl-screen-x) > h2:first-child { padding-right: 2.75rem; }

/* ── Toasts (ui:notify) — below the HUD, above screens, under dialogs ─── */
.nrl-toast-stack {
  pointer-events: none;
  position: fixed;
  top: calc(var(--nrl-hud-h, 0px) + 0.25rem);
  left: 0;
  right: 0;
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  z-index: 60;
}
/* #195: a rollover or a ×4 advance drops a stack of toasts over a phone screen; show the newest three. */
.nrl-toast-stack .nrl-toast:nth-last-child(n+4) { display: none; }
.nrl-toast {
  color: #fff;
  border: 3px solid #000;
  padding: 6px 14px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  box-shadow: 3px 3px 0 #000;
  max-width: 100%;
  box-sizing: border-box;
  text-align: center;
}
.nrl-toast-info { background: #3a6ea5; }
.nrl-toast-success { background: #2e7d32; }
.nrl-toast-danger { background: #b03a2e; }

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
.nrl-history h2 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}
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
.nrl-history-review { margin-top: 0.3rem; padding: 0.25rem 0.6rem; font-size: 0.75rem; } /* 44px min from .nrl-btn (#194) */

/* ── Season review (N7, #190) ──────────────────────────────────────────── */
.nrl-modal.nrl-review-modal { max-width: min(94vw, 560px); }
.nrl-season-review { font-size: 0.85rem; }
.nrl-season-review h2 { margin: 0 0 0.3rem; font-size: 1.1rem; }
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
.nrl-review-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
.nrl-review-actions .nrl-btn { flex: 1 1 8rem; }

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
.nrl-news { font-size: 0.85rem; }
.nrl-news h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.nrl-news h3 { margin: 0.6rem 0 0.2rem; font-size: 0.9rem; }
.nrl-news-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}
.nrl-news-filter { flex: 0 0 auto; }
.nrl-news-filter.nrl-news-active { background: #3a6ea5; color: #fff; }
.nrl-news-list { max-height: 55vh; overflow-y: auto; }
.nrl-news-item {
  padding: 0.2rem 0.4rem;
  margin-bottom: 0.25rem;
  border-left: 4px solid #3a6ea5;
  overflow-wrap: anywhere;
}
.nrl-news-item.nrl-news-success { border-left-color: #2e7d32; }
.nrl-news-item.nrl-news-danger { border-left-color: #b03a2e; }
.nrl-news-empty { margin: 0.4rem 0; }
.nrl-news-decisions h3 { margin-top: 0; }
.nrl-event-card {
  background: #fff8e1;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  padding: 0.4rem 0.5rem;
  margin: 0 3px 0.6rem 0;
}
.nrl-event-title { font-weight: bold; font-size: 0.95rem; }
.nrl-event-meta { font-size: 0.72rem; color: #555; }
.nrl-event-text { margin: 0.3rem 0; overflow-wrap: anywhere; }
.nrl-event-choices { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.nrl-event-choice {
  flex: 1 1 10rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}
.nrl-event-choice-label { font-weight: bold; }
.nrl-event-choice-hint { font-size: 0.72rem; opacity: 0.85; white-space: normal; font-weight: normal; }
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
.nrl-kit h2 { margin: 0; font-size: 1.05rem; }
.nrl-kit h3 { margin: 0.5rem 0 0.2rem; font-size: 0.85rem; }
.nrl-kit-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.nrl-kit-note { margin: 0.2rem 0 0.4rem; font-size: 0.75rem; }
.nrl-kit-body { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.nrl-kit-preview { display: flex; gap: 0.5rem; align-items: flex-end; flex: 0 0 auto; }
.nrl-kit-preview figure { margin: 0; text-align: center; font-size: 0.7rem; }
.nrl-kit-sprite { width: 84px; height: 90px; image-rendering: pixelated; }
.nrl-kit-portrait { width: 72px; image-rendering: pixelated; }
.nrl-kit-controls { flex: 1 1 16rem; min-width: 0; }
.nrl-kit-label { font-size: 0.72rem; font-weight: bold; margin-top: 0.2rem; }
.nrl-kit-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.nrl-kit-pattern[aria-pressed="true"] { background: #3a6ea5; color: #fff; }
.nrl-kit-swatch {
  pointer-events: auto;
  width: 44px; height: 44px; /* #194: a tap target */
  border: 3px solid #555;
  cursor: pointer;
}
.nrl-kit-swatch[aria-pressed="true"] { border-color: #fff; box-shadow: 0 0 0 2px #000; }
.nrl-kit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.6rem; }
/* ── League screen: the next-match card and the form guide (N7, #183) ──── */
/* A landscape phone has width to spare and no height: let the league use it. */
.nrl-screen-backdrop .nrl-league-modal { width: min(96vw, 760px); max-width: none; }
.nrl-league-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
.nrl-league-close { margin-left: auto; }
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
.nrl-ladder-pos { margin: 0 0 0.4rem; font-size: 0.85rem; }
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
/* The Fixtures tab's two toggles: a box you can see and hit (#194). */
.nrl-toggle-box { width: 24px; height: 24px; margin: 0 0.3rem 0 0; flex: 0 0 auto; accent-color: #3a6ea5; }
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
.nrl-rival-squad h2 { margin: 0 0 0.2rem; font-size: 1.05rem; }
.nrl-rival-squad p { margin: 0 0 0.4rem; font-size: 0.85rem; }
.nrl-rival-scroll { max-height: 55vh; overflow: auto; margin-bottom: 0.5rem; }
.nrl-rival-table { border-collapse: collapse; font-size: 0.75rem; width: 100%; }
.nrl-rival-table th, .nrl-rival-table td { padding: 0.15rem 0.3rem; text-align: left; white-space: nowrap; }
.nrl-rival-table thead th { position: sticky; top: 0; background: #e8e0c8; }
.nrl-rival-traits { font-size: 0.68rem; }
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
.nrl-player-where { font-size: 0.75rem; color: #555; }
.nrl-player-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 0.2rem 1rem; }
.nrl-player h3 { margin: 0.4rem 0 0.15rem; font-size: 0.82rem; border-bottom: 2px solid #b8ae92; }
.nrl-player-stats .nrl-statrow { grid-template-columns: 4.6rem 1fr 1.8rem; }
.nrl-player-trait { margin: 0.1rem 0; overflow-wrap: anywhere; }
.nrl-player-trait b { margin-right: 0.3rem; }
.nrl-player-trait-bad b { color: #8a3a00; }
.nrl-player-line { margin: 0.1rem 0; overflow-wrap: anywhere; }
.nrl-player-expiring { color: #b00020; }
/* #203: the actions stay pinned to the foot of the card while the rest scrolls. */
.nrl-player-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
  position: sticky;
  bottom: -0.6rem; /* over the card's bottom padding, so nothing scrolls under it */
  padding: 0.4rem 0 0.6rem;
  background: #e8e0c8;
  border-top: 2px solid #b8ae92;
  z-index: 1;
}
.nrl-player-actions .nrl-btn { flex: 1 1 8rem; white-space: normal; }
.nrl-player-actions .nrl-player-close { flex: 1 1 100%; }
.nrl-modal-has-x .nrl-player-top { padding-right: 2.75rem; }
/* A landscape phone: Close joins the row (the ✕ is in the corner too). */
@media (max-height: 500px) {
  .nrl-player-actions .nrl-player-close { flex: 1 1 6rem; }
  .nrl-player-why { order: 1; }
}
.nrl-player-why { flex: 1 1 100%; font-size: 0.72rem; color: #555; }
/* ── Guide under "?" (N7, #188) ─────────────────────────────────────────── */
.nrl-screen-backdrop .nrl-guide-modal { width: min(96vw, 760px); max-width: none; display: flex; flex-direction: column; }
/* #206: only the page scrolls; the tabs and the foot (Replay, Close) stay in view. */
.nrl-guide { font-size: 0.85rem; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-guide-tabs, .nrl-guide-foot { flex: 0 0 auto; }
.nrl-guide-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-guide-tabs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
.nrl-guide-tabs .nrl-btn { flex: 1 1 auto; font-size: clamp(0.6rem, 1.7vw, 0.85rem); padding: 0.4rem 0.45rem; }
.nrl-guide-tabs .nrl-btn[aria-pressed="true"] { background: #3a6ea5; color: #fff; }
.nrl-guide h2 { margin: 0 0 0.3rem; font-size: 1.05rem; }
.nrl-guide h3 { margin: 0.5rem 0 0.15rem; font-size: 0.88rem; border-bottom: 2px solid #b8ae92; }
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
/* #206: a landscape phone leaves the Guide ~180px; one row of tabs (swipe for
   more) and a one-line foot leave the page room, even with Safari's text boost. */
@media (max-height: 500px) {
  .nrl-screen-backdrop .nrl-guide-modal { padding: 0.5rem 0.75rem; }
  .nrl-guide-tabs { flex-wrap: nowrap; overflow-x: auto; margin-bottom: 0.3rem; }
  .nrl-guide-tabs .nrl-btn { flex: 0 0 auto; }
  .nrl-guide-foot { flex-wrap: nowrap; margin-top: 0.3rem; padding-top: 0.3rem; }
  .nrl-guide-foot .nrl-btn { flex: 0 0 auto; }
  .nrl-guide-build { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.nrl-card-open { cursor: pointer; }
.nrl-card-open:focus-visible { outline: 3px solid #3a6ea5; }
.nrl-card-more { color: #555; font-weight: bold; font-size: 1.1rem; line-height: 1; }
.nrl-placebar-text { flex: 1 1 auto; }
.nrl-placebar-cancel { flex: 0 0 auto; }
`;
