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
 */
export function openModal(
  content: HTMLElement,
  opts: { class?: string; screen?: boolean } = {},
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
    { class: 'nrl-modal-backdrop', onClick: () => closeModal() },
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
const CSS = `
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
}

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
.nrl-placebar-text { flex: 1 1 auto; }
.nrl-placebar-cancel { flex: 0 0 auto; }
`;
