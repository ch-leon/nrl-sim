// src/ui/dom.ts — dependency-free DOM helper kit + the injected UI stylesheet.
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

// ── Layering rule (GitHub #14, Broadcast Quiet) ─────────────────────────────
// The grounds (or the pitch) are always visible. The dock at the bottom is the
// only navigation and never moves; every nav screen opens as a navy *sheet*
// above it (top 12, sides 12, bottom = the dock's height + 12), so the dock
// stays whole and tappable while a screen is open. Only one screen is open at a
// time (opening another, e.g. from the dock, replaces it). Tapping the open
// screen's tab, or CLUB, closes it.
//
// The dock publishes its live height as a CSS custom property (--nrl-nav-h, see
// trackChromeInset) which `.nrl-screen-region` uses for its bottom inset, so it
// collapses to the full viewport when the dock is hidden (match mode).
// --nrl-hud-h is kept for the top inset and stays 0: there is no top bar.
//
// True dialogs (confirmations, the facility card, settings) still use
// openModal() without `screen`, which covers everything at z-index 100.
//
// z-order: decisions chip 45 · sheets 50 · dock 55 · Office 56 · toasts 60 · modals 100 · tutorial 200.
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
 * The one header row of a sheet (#336): title (with an optional one-line
 * summary beside it), the sheet's controls pushed right. Sheets close from the
 * dock (their tab, or CLUB); `close: true` adds a ✕ at the right end for a
 * screen the dock does not hold.
 */
export function screenHead(
  title: string,
  opts: { sub?: HTMLElement; controls?: Node[]; onClose?: () => void; close?: boolean; lead?: Node[] } = {},
): HTMLElement {
  const titles = el('div', { class: 'nrl-screen-titles' }, ...(opts.lead ?? []));
  if (title) titles.append(el('span', { class: 'nrl-screen-title', text: title }));
  if (opts.sub) titles.append(opts.sub);
  const head = el('div', { class: 'nrl-screen-head' }, titles, el('div', { class: 'nrl-screen-tools' }, ...(opts.controls ?? [])));
  if (opts.close || opts.onClose) {
    const x = button('✕', opts.onClose ?? (() => closeScreen()), { class: 'nrl-screen-x' });
    x.setAttribute('aria-label', 'Close');
    head.append(x);
  }
  return head;
}

/** One choice in a {@link segmented} control. */
export interface SegItem<T extends string> {
  id: T;
  label: string;
  title?: string;
}

/** Handle to a segmented control: its element, and a setter for the selected item. */
export interface Segmented<T extends string> {
  el: HTMLElement;
  buttons: Map<T, HTMLButtonElement>;
  set(id: T): void;
}

/**
 * The sub-navigation inside a sheet: a #1b264a track of choices, the selected
 * one yellow. `onPick` runs on a tap of an unselected item (and of the selected
 * one with `repeat: true`); the caller re-renders and calls set().
 */
export function segmented<T extends string>(
  items: readonly SegItem<T>[],
  selected: T | null,
  onPick: (id: T) => void,
  opts: { class?: string; label?: string; repeat?: boolean } = {},
): Segmented<T> {
  const track = el('div', { class: opts.class ? `nrl-seg ${opts.class}` : 'nrl-seg', attrs: { role: 'group' } });
  if (opts.label) track.setAttribute('aria-label', opts.label);
  const buttons = new Map<T, HTMLButtonElement>();
  let current = selected;
  for (const it of items) {
    const b = button(it.label, () => {
      if (it.id === current && !opts.repeat) return;
      onPick(it.id);
    });
    b.setAttribute('data-seg', it.id);
    if (it.title) b.title = it.title;
    buttons.set(it.id, b);
    track.append(b);
  }
  const set = (id: T | null): void => {
    current = id;
    for (const [k, b] of buttons) b.setAttribute('aria-pressed', String(k === id));
  };
  set(selected);
  return { el: track, buttons, set };
}

/** A "◂ SQUAD" button back to the screen this one was opened from. */
export function backButton(label: string, onClick: () => void): HTMLButtonElement {
  const b = button(`◂ ${label}`, onClick, { class: 'nrl-back' });
  b.setAttribute('data-back', '');
  return b;
}

/** The dock's three parts, created on first use (the HUD fills status and play, the nav the tabs). */
export interface DockParts {
  wrap: HTMLElement;
  dock: HTMLElement;
  status: HTMLElement;
  tabs: HTMLElement;
  play: HTMLElement;
}

let dockParts: DockParts | null = null;

/**
 * The dock: the only navigation, bottom 12 / sides 12, 64 tall. Left the
 * status block (money, week), then the tabs, then PLAY WEEK. Its height
 * (plus the 12px under it) is published as --nrl-nav-h, so sheets sit above it.
 */
export function dock(): DockParts {
  if (dockParts && dockParts.wrap.isConnected) return dockParts;
  ensureStyles();
  const status = el('div', { class: 'nrl-dock-status' });
  const tabs = el('div', { class: 'nrl-dock-tabs nrl-nav', attrs: { role: 'navigation', 'aria-label': 'Club' } });
  const play = el('div', { class: 'nrl-dock-play' });
  const d = el('div', { class: 'nrl-dock' }, status, tabs, el('div', { class: 'nrl-dock-spacer' }), play);
  const wrap = el('div', { class: 'nrl-dock-wrap' }, d);
  mount(wrap);
  trackChromeInset(wrap, NAV_INSET_VAR);
  dockParts = { wrap, dock: d, status, tabs, play };
  return dockParts;
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
 * its content scrolls, so a header row never scrolls away. A dialog (or a
 * sheet) gets a ✕ in its corner with `closeButton: true`. `key` is a screen's nav destination (see
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

  // A ✕ in the corner (#195) for a dialog that asks for one. Sheets close from
  // the dock (their tab, or CLUB), so they take one only with closeButton: true.
  const wantsX = opts.closeButton === true;
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

// Broadcast Quiet (docs/specs/ui-broadcast-quiet.md): navy sheets over the
// grounds, Barlow Condensed caps for labels and buttons, IBM Plex Sans for body
// text, IBM Plex Mono for every number, one yellow primary a screen. Every
// interactive/visible element opts back into pointer-events (the #ui-root
// container is pointer-events:none).
/** The shared stylesheet (exported for tests). */
export const CSS = `
:root {
  --nrl-safe-t: env(safe-area-inset-top, 0px);
  --nrl-safe-r: env(safe-area-inset-right, 0px);
  --nrl-safe-b: env(safe-area-inset-bottom, 0px);
  --nrl-safe-l: env(safe-area-inset-left, 0px);
  /* Broadcast Quiet tokens (docs/specs/ui-broadcast-quiet.md). */
  --nrl-navy: #0e1630;
  --nrl-panel: #141d3a;
  --nrl-raised: #1b264a;
  --nrl-button: #1f2b55;
  --nrl-line: #26325c;
  --nrl-me: #24346b;
  --nrl-sheet: rgba(14, 22, 48, 0.97);
  --nrl-text: #ffffff;
  --nrl-text-2: #c9d1ea;
  --nrl-muted: #9aa6c7;
  --nrl-accent: #f4d03f;
  --nrl-on-accent: #0e1630;
  --nrl-pos: #6fd896;
  --nrl-neg: #f0a39b;
  --nrl-alert: #e0574a;
  --nrl-win: #2d8a4a;
  --nrl-injured: #5a2430;
  --nrl-bench: #3a6ea5;
  --nrl-out: #b03a2e;
  --nrl-fit-good: #3fbf6a;
  --nrl-fit-ok: #e8a33a;
  --nrl-fit-bad: #d9534f;
  --nrl-home: #f4d03f;
  --nrl-away: #2f8a46;
  --nrl-shadow-chip: 0 4px 14px rgba(0, 0, 0, 0.35);
  --nrl-shadow-tray: 0 6px 20px rgba(0, 0, 0, 0.4);
  --nrl-shadow-modal: 0 12px 40px rgba(0, 0, 0, 0.4);
  --nrl-f-label: 'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif;
  --nrl-f-body: 'IBM Plex Sans', system-ui, sans-serif;
  --nrl-f-num: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
}
.nrl-panel, .nrl-btn, .nrl-modal, .nrl-modal-backdrop, .nrl-dock, .nrl-screen {
  font-family: var(--nrl-f-body);
  box-sizing: border-box;
}
#ui-root input, #ui-root select, #ui-root textarea { font: inherit; }
/* Every number in Plex Mono: money, scores, ratings, the clock. */
.nrl-num { font-family: var(--nrl-f-num); font-weight: 600; font-variant-numeric: tabular-nums; }
/* A raised tile inside a sheet. */
.nrl-panel {
  pointer-events: auto;
  background: var(--nrl-raised);
  color: var(--nrl-text);
  border-radius: 10px;
  padding: 8px 10px;
}
/* Buttons: secondary by default (#1f2b55, white); one yellow primary a screen
   (.nrl-btn-primary); destructive keeps the secondary fill with a red label. */
.nrl-btn {
  pointer-events: auto;
  cursor: pointer;
  font-family: var(--nrl-f-label);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--nrl-text);
  background: var(--nrl-button);
  border: 0;
  border-radius: 10px;
  padding: 0 14px;
  margin: 0;
  min-height: 44px; /* #18: phone tap target */
  min-width: 44px;
  line-height: 1.1;
  white-space: nowrap;
  transition: background 0.12s ease, transform 0.08s ease;
}
.nrl-btn:hover:not(:disabled) { background: #283669; }
.nrl-btn:active:not(:disabled) { transform: translateY(1px); }
.nrl-btn:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; }
.nrl-btn.nrl-btn-primary { background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-btn.nrl-btn-primary:hover:not(:disabled) { background: #f7da5e; }
.nrl-btn.nrl-btn-danger { background: var(--nrl-button); color: var(--nrl-neg); }
.nrl-btn.nrl-btn-danger:hover:not(:disabled) { background: #283669; }
/* Disabled stays visible and says why (the reason is the label or the title). */
.nrl-btn:disabled { cursor: default; opacity: 0.55; }
.nrl-btn.nrl-btn-primary:disabled { background: var(--nrl-raised); color: var(--nrl-muted); opacity: 1; }
/* One selected-chip look everywhere (sorts, filters, tabs, presets): yellow, navy text.
   A touch leaves :hover on the last chip tapped; the selection wins over it. */
.nrl-btn.nrl-sort-active, .nrl-btn.nrl-sort-active:hover:not(:disabled),
.nrl-btn[data-active], .nrl-btn[data-active]:hover:not(:disabled),
.nrl-seg > .nrl-btn[aria-pressed="true"], .nrl-seg > .nrl-btn[aria-pressed="true"]:hover:not(:disabled),
.nrl-seg > .nrl-btn[aria-selected="true"], .nrl-seg > .nrl-btn[aria-selected="true"]:hover:not(:disabled) {
  background: var(--nrl-accent);
  color: var(--nrl-on-accent);
}
/* Segmented control: the sub-navigation inside a sheet. */
.nrl-seg {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  background: var(--nrl-raised);
  border-radius: 10px;
  flex: 0 0 auto;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.nrl-seg::-webkit-scrollbar { display: none; }
.nrl-seg > .nrl-btn {
  flex: 0 0 auto;
  min-height: 38px;
  min-width: 0;
  padding: 0 14px;
  border-radius: 8px;
  background: transparent;
  color: var(--nrl-text);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.nrl-seg > .nrl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
@media (pointer: coarse) { .nrl-seg > .nrl-btn { min-height: 44px; } }
/* A small caps label (column heads, section titles). */
.nrl-label {
  font-family: var(--nrl-f-label);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nrl-muted);
}
.nrl-pos { color: var(--nrl-pos); }
.nrl-neg { color: var(--nrl-neg); }
.nrl-attn { color: var(--nrl-accent); }
.nrl-muted { color: var(--nrl-muted); }

/* ── Dock (the only navigation): status · tabs · PLAY WEEK ───────────────── */
.nrl-dock-wrap {
  pointer-events: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 calc(12px + var(--nrl-safe-r)) max(12px, var(--nrl-safe-b)) calc(12px + var(--nrl-safe-l));
  z-index: 55;
}
.nrl-dock {
  pointer-events: auto;
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px 0 14px;
  border-radius: 16px;
  background: var(--nrl-sheet);
  box-shadow: var(--nrl-shadow-chip);
  color: var(--nrl-text);
  box-sizing: border-box;
}
.nrl-dock-status { display: flex; align-items: center; flex: 0 0 auto; }
.nrl-dock-status:empty { display: none; }
.nrl-dock-statusbox {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 14px 0 0;
  min-height: 44px;
  background: none;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: default;
}
button.nrl-dock-statusbox { cursor: pointer; }
button.nrl-dock-statusbox:focus-visible { outline: 2px solid var(--nrl-accent); outline-offset: 2px; border-radius: 8px; }
.nrl-dock-money { font-family: var(--nrl-f-num); font-size: 15px; font-weight: 600; line-height: 1.2; white-space: nowrap; transition: color 0.15s ease; }
.nrl-dock-week { font-family: var(--nrl-f-label); font-size: 13px; font-weight: 600; letter-spacing: 0.06em; color: var(--nrl-muted); white-space: nowrap; }
/* #351 H2: under 20 weeks of runway the money goes amber, under 8 red; N12.5 in debt is red with its tag. */
.nrl-dock-money.nrl-money-low { color: var(--nrl-fit-ok); }
.nrl-dock-money.nrl-money-short, .nrl-dock-money.nrl-money-negative { color: var(--nrl-neg); }
.nrl-dock-money.nrl-flash-up { color: var(--nrl-pos); }
.nrl-dock-money.nrl-flash-down { color: var(--nrl-neg); }
.nrl-hud-debt { margin-left: 4px; padding: 0 4px; border-radius: 4px; font-family: var(--nrl-f-label); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; background: var(--nrl-out); color: #fff; vertical-align: 1px; }
.nrl-dock-divider { width: 1px; height: 36px; background: var(--nrl-line); margin-right: 6px; flex: 0 0 auto; }
.nrl-dock-tabs { display: flex; align-items: center; gap: 2px; min-width: 0; flex: 0 1 auto; }
.nrl-dock-tabs > .nrl-btn {
  flex: 0 1 auto;
  min-width: 0;
  height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  background: transparent;
  color: var(--nrl-text-2);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}
.nrl-dock-tabs > .nrl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); }
/* The open sheet's tab (aria-current); a touch leaves :hover on it, the marker wins. */
.nrl-dock-tabs > .nrl-btn[aria-current="page"], .nrl-dock-tabs > .nrl-btn[aria-current="page"]:hover:not(:disabled),
.nrl-dock-tabs > .nrl-btn[aria-expanded="true"], .nrl-dock-tabs > .nrl-btn[aria-expanded="true"]:hover:not(:disabled) {
  background: var(--nrl-button);
  color: var(--nrl-accent);
  font-weight: 700;
}
/* An alert: an 8px dot after the label (the count is in its spoken label). */
.nrl-nav-dot { width: 8px; height: 8px; border-radius: 4px; background: var(--nrl-alert); flex: 0 0 auto; }
.nrl-dock-spacer { flex: 1 1 auto; min-width: 4px; }
.nrl-dock-play { position: relative; display: flex; align-items: stretch; flex: 0 0 auto; height: 50px; }
.nrl-dock-play:empty { display: none; }
.nrl-dock-play-group { display: flex; align-items: stretch; border-radius: 12px; overflow: hidden; background: var(--nrl-accent); color: var(--nrl-on-accent); }
.nrl-dock-play-group > .nrl-btn {
  min-height: 50px;
  border-radius: 0;
  background: transparent;
  color: var(--nrl-on-accent);
}
.nrl-dock-play-group > .nrl-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.18); }
.nrl-dock-advance { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 16px; max-width: 15rem; }
.nrl-dock-advance-label { font-family: var(--nrl-f-label); font-size: 19px; font-weight: 700; letter-spacing: 0.04em; line-height: 1; white-space: nowrap; }
.nrl-dock-advance-sub { font-family: var(--nrl-f-body); font-size: 12px; font-weight: 500; letter-spacing: 0; text-transform: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; line-height: 1.3; }
.nrl-dock-advance-sub:empty { display: none; }
.nrl-btn.nrl-hud-menu-toggle { width: 40px; min-width: 40px; padding: 0; font-size: 14px; border-left: 1px solid rgba(14, 22, 48, 0.25); }
.nrl-btn.nrl-hud-stop { width: auto; padding: 0 14px; border-left: 1px solid rgba(14, 22, 48, 0.25); font-size: 16px; }
.nrl-hud-stop[hidden], .nrl-hud-menu-toggle[hidden] { display: none; }
/* N10.2: while a multi-week advance runs the button is a progress line, not a faded button. */
.nrl-dock-play-group > .nrl-btn.nrl-hud-progress:disabled { opacity: 1; cursor: default; }
/* #350 H1: decisions waiting, a count on the play button (the chip top-left says what they are). */
.nrl-hud-alert {
  display: inline-block;
  min-width: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--nrl-alert);
  color: #fff;
  font-family: var(--nrl-f-num);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  vertical-align: 2px;
}
/* #44: the ▾ menu: multi-week advances, over the dock's right end. */
.nrl-hud-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  z-index: 11;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 11rem;
  padding: 6px;
  background: var(--nrl-navy);
  border-radius: 12px;
  box-shadow: var(--nrl-shadow-tray);
}
.nrl-hud-menu[hidden] { display: none; }
.nrl-hud-menu-item { width: 100%; text-align: left; }
/* A narrow phone (667px): tighter tabs, the sub-line goes. */
@media (max-width: 760px) {
  .nrl-dock { padding: 0 6px 0 10px; }
  .nrl-dock-statusbox { padding-right: 8px; }
  .nrl-dock-tabs > .nrl-btn { padding: 0 8px; font-size: 14px; letter-spacing: 0.04em; }
  .nrl-dock-advance { padding: 0 10px; }
  .nrl-dock-advance-label { font-size: 16px; }
  .nrl-btn.nrl-hud-menu-toggle { width: 34px; min-width: 34px; }
}
@media (max-width: 620px) {
  .nrl-dock-advance-sub, .nrl-dock-week-total { display: none; }
}

/* ── Office: the pop-up sheet over a dimmed grounds view ─────────────────── */
.nrl-office-dim {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  background: rgba(5, 9, 22, 0.35);
  z-index: 54;
}
.nrl-office-dim[hidden], .nrl-nav-sheet[hidden] { display: none; }
.nrl-nav-sheet {
  pointer-events: auto;
  position: fixed;
  left: calc(12px + var(--nrl-safe-l));
  right: calc(12px + var(--nrl-safe-r));
  bottom: calc(var(--nrl-nav-h, 0px) + 8px);
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  max-height: calc(100vh - var(--nrl-nav-h, 0px) - 20px);
  max-height: calc(100dvh - var(--nrl-nav-h, 0px) - 20px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 10px 12px;
  background: var(--nrl-sheet);
  border-radius: 16px;
  box-shadow: var(--nrl-shadow-tray);
  z-index: 56;
  animation: nrl-sheet-up 180ms ease-out;
}
.nrl-nav-sheet > .nrl-btn {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 0 12px;
  background: var(--nrl-raised);
  border-radius: 10px;
  text-align: left;
  text-transform: none;
  letter-spacing: 0;
  overflow: hidden;
}
.nrl-nav-sheet > .nrl-btn:hover:not(:disabled) { background: #22305c; }
.nrl-nav-sheet > .nrl-btn[aria-current="page"] { box-shadow: inset 0 0 0 2px var(--nrl-accent); }
.nrl-office-name { font-family: var(--nrl-f-label); font-size: 18px; font-weight: 700; letter-spacing: 0.02em; color: var(--nrl-text); }
.nrl-office-status { font-family: var(--nrl-f-body); font-size: 12px; font-weight: 400; color: var(--nrl-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.nrl-office-status[data-attn] { color: var(--nrl-accent); }
.nrl-office-status:empty { display: none; }
@media (max-width: 560px) { .nrl-nav-sheet { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@keyframes nrl-sheet-up { from { opacity: 0; transform: translateY(12px); } }
@media (prefers-reduced-motion: reduce) { .nrl-nav-sheet, .nrl-screen-region { animation: none !important; } }

/* ── Decisions chip: the club home's one thing on the grounds ───────────── */
.nrl-decisions-chip {
  pointer-events: auto;
  position: fixed;
  top: calc(12px + var(--nrl-safe-t));
  left: calc(16px + var(--nrl-safe-l));
  height: 44px;
  max-width: calc(100vw - 32px - var(--nrl-safe-l) - var(--nrl-safe-r));
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 0 14px;
  border-radius: 12px;
  background: rgba(14, 22, 48, 0.95);
  box-shadow: var(--nrl-shadow-chip);
  color: var(--nrl-text);
  z-index: 45;
  box-sizing: border-box;
}
.nrl-decisions-chip[hidden] { display: none; }
.nrl-decisions-chip-count { font-family: var(--nrl-f-label); font-size: 15px; font-weight: 700; letter-spacing: 0.06em; color: var(--nrl-accent); white-space: nowrap; }
.nrl-decisions-chip-top { font-size: 13px; color: var(--nrl-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.nrl-decisions-chip .nrl-btn { min-height: 34px; height: 34px; border-radius: 8px; padding: 0 12px; font-size: 15px; flex: 0 0 auto; }
body.nrl-match-active .nrl-decisions-chip { display: none; }

/* ── Modal ───────────────────────────────────────────────────────────── */
.nrl-modal-backdrop {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  background: rgba(5, 9, 22, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.nrl-modal {
  pointer-events: auto;
  position: relative;
  background: var(--nrl-navy);
  color: var(--nrl-text);
  border-radius: 18px;
  box-shadow: var(--nrl-shadow-modal);
  padding: 14px 16px;
  max-width: min(90vw, 480px);
  max-height: 85vh;
  max-height: 85dvh; /* #206: Safari's toolbars */
  overflow: auto;
  box-sizing: border-box;
  font-size: 14px;
}
.nrl-modal h2 { font-family: var(--nrl-f-label); font-size: 22px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.15; }
.nrl-modal h3 { font-family: var(--nrl-f-label); font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); }

/* ── Sheets (the layering rule above openScreen in dom.ts) ───────────────
   A screen is a navy sheet above the dock: top 12, sides 12, bottom 88 on a
   phone. Long lists scroll inside it; its header row holds still. */
:root { --nrl-hud-h: 0px; --nrl-nav-h: 0px; }
.nrl-screen-region {
  pointer-events: auto;
  position: fixed;
  left: calc(12px + var(--nrl-safe-l));
  right: calc(12px + var(--nrl-safe-r));
  top: calc(var(--nrl-hud-h, 0px) + 12px + var(--nrl-safe-t));
  bottom: calc(var(--nrl-nav-h, 0px) + 12px);
  max-width: 1180px;
  margin: 0 auto;
  z-index: 50;
  box-sizing: border-box;
  animation: nrl-sheet-up 180ms ease-out;
}
.nrl-screen-backdrop { background: transparent; padding: 0; display: flex; align-items: stretch; justify-content: stretch; }
.nrl-screen-backdrop .nrl-modal {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border-radius: 16px;
  background: var(--nrl-sheet);
  box-shadow: var(--nrl-shadow-tray);
  padding: 10px 14px;
}
/* A region dialog (#203): above the sheets, the dock still whole and tappable below it. */
.nrl-dialog-region {
  top: var(--nrl-hud-h, 0px);
  bottom: var(--nrl-nav-h, 0px);
  padding: calc(12px + var(--nrl-safe-t)) calc(12px + var(--nrl-safe-r)) 12px calc(12px + var(--nrl-safe-l));
  background: rgba(5, 9, 22, 0.35);
}
.nrl-dialog-region .nrl-modal {
  /* Fit inside the region rather than the viewport. */
  max-height: 100%;
  width: min(100%, 640px);
  max-width: none;
  border-radius: 16px;
}
/* #336: a framed box (sheets, region dialogs) holds still and only its content
   scrolls, so the header row is always on screen. A child that sets
   flex: 1 1 auto and min-height: 0 fills the box and scrolls inside itself. */
.nrl-modal.nrl-modal-framed { display: flex; flex-direction: column; overflow: hidden; }
.nrl-modal-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
}
/* Player of the Match (#203): a card, not a wall; taps beside it reach Back to Club. */
.nrl-potm-backdrop { pointer-events: none; background: transparent; }
.nrl-potm-backdrop .nrl-modal { pointer-events: auto; }
/* The ✕: 36×36 on #1f2b55, top-right of a dialog (sheets close from the dock). */
.nrl-screen-x {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border-radius: 8px;
  font-family: var(--nrl-f-body);
  font-size: 15px;
  line-height: 1;
}
.nrl-screen-x::after { content: ''; position: absolute; inset: -4px; } /* a 44px hit area */
.nrl-modal-has-x > :not(.nrl-screen-x) > h2:first-child,
.nrl-modal-has-x > .nrl-modal-scroll > * > h2:first-child { padding-right: 44px; }
/* In a screen's header row the ✕ sits in line, at the right end. */
.nrl-screen-head .nrl-screen-x { position: relative; top: auto; right: auto; flex: 0 0 auto; }

/* ── Screen frame (#336): the sheet itself, for screens built on screenHead ── */
.nrl-screen {
  display: flex;
  flex-direction: column;
  background: var(--nrl-sheet);
  color: var(--nrl-text);
  border-radius: 16px;
  box-shadow: var(--nrl-shadow-tray);
  padding: 10px 14px;
  overflow: hidden;
  box-sizing: border-box;
  font-size: 13px;
}
.nrl-screen-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 44px;
}
.nrl-screen-titles { flex: 0 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
.nrl-screen-title {
  font-family: var(--nrl-f-label);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.1;
  color: var(--nrl-text);
  white-space: nowrap;
}
.nrl-screen-sub {
  font-size: 13px;
  color: var(--nrl-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 0 1 auto;
}
.nrl-screen-titles .nrl-screen-sub { margin: 0; }
/* The controls: one row that scrolls sideways when the phone is narrow. Pushed
   right with a margin, not justify-content: an overflowing flex-end row spills
   off its start, where it cannot be scrolled to. */
.nrl-screen-tools {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.nrl-screen-tools::-webkit-scrollbar { display: none; }
.nrl-screen-tools > * { flex: 0 0 auto; }
.nrl-screen-tools > :first-child { margin-left: auto; }
.nrl-screen-label { color: var(--nrl-muted); font-family: var(--nrl-f-label); font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.nrl-screen-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
}
.nrl-screen-empty {
  color: var(--nrl-muted);
  padding: 24px;
  text-align: center;
}
/* A table in a sheet: Barlow column heads, 1px #1f2b55 row rules, numbers in Mono. */
.nrl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.nrl-table th {
  font-family: var(--nrl-f-label);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nrl-muted);
  text-align: left;
  padding: 4px 6px;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: var(--nrl-navy);
  z-index: 1;
}
.nrl-table td { padding: 0 6px; height: 30px; border-top: 1px solid var(--nrl-button); white-space: nowrap; }
.nrl-table td.nrl-num, .nrl-table th.nrl-num { text-align: right; }
/* Back to the screen this one opened from: "◂ SQUAD". */
.nrl-btn.nrl-back { min-height: 36px; padding: 0 10px; font-size: 14px; border-radius: 8px; }
@media (pointer: coarse) { .nrl-btn.nrl-back { min-height: 44px; } }

/* ── Toasts (ui:notify, #339): one at a time, in a lane over no control (toasts.ts
   places it: just above the dock at the club, under the score bug in a match) ── */
.nrl-toast-lane {
  pointer-events: none;
  position: fixed;
  top: calc(12px + var(--nrl-safe-t));
  left: 50%;
  transform: translateX(-50%);
  width: min(30rem, calc(100vw - 2rem));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 60;
}
.nrl-toast-lane[hidden] { display: none; }
.nrl-toast-lane[data-lane="dock"] { top: auto; bottom: calc(var(--nrl-nav-h, 0px) + 20px); }
.nrl-toast-lane[data-lane="match"] {
  transform: none;
  justify-content: flex-start;
  left: calc(16px + env(safe-area-inset-left, 0px));
  top: calc(var(--nrl-mo-board, 4rem) + 10px);
  width: min(26rem, calc(100vw - 2rem));
  min-height: 44px;
}
.nrl-toast {
  pointer-events: auto;
  cursor: pointer;
  display: none;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 10px;
  border-left: 4px solid var(--nrl-muted);
  box-shadow: var(--nrl-shadow-chip);
  font-family: var(--nrl-f-body);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
}
.nrl-toast:first-child { display: flex; }
.nrl-toast-text { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.nrl-toast-more { flex: 0 0 auto; padding: 0 6px; border-radius: 6px; background: var(--nrl-button); color: var(--nrl-text-2); font-family: var(--nrl-f-num); font-size: 12px; }
.nrl-toast-more:empty { display: none; }
/* Red is for real problems only; routine stops and confirmations are neutral; good news is green with a gold edge. */
.nrl-toast-info { background: rgba(14, 22, 48, 0.97); color: var(--nrl-text); border-left-color: var(--nrl-muted); }
.nrl-toast-success { background: #1d5a33; color: #fff; border-left-color: var(--nrl-accent); }
.nrl-toast-danger { background: #7a2a24; color: #fff; border-left-color: var(--nrl-alert); }
.nrl-toast-danger .nrl-toast-text::before { content: '! '; font-weight: 700; }
.nrl-toast-in { animation: nrl-toast-in 150ms ease-out; }
@keyframes nrl-toast-in { from { opacity: 0; transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .nrl-toast-in { animation: none; } }

/* ── Update bar (N7, #181): a new build is waiting; never during a match ── */
.nrl-update-toast {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: calc(12px + env(safe-area-inset-top, 0px));
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(94vw, 460px);
  background: rgba(14, 22, 48, 0.97);
  color: var(--nrl-text);
  border-radius: 12px;
  box-shadow: var(--nrl-shadow-chip);
  padding: 4px 4px 4px 14px;
  font-family: var(--nrl-f-label);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
.nrl-update-toast .nrl-btn { flex: 0 0 auto; }
body.nrl-match-active .nrl-update-toast { display: none; }

/* ── Short screens ──────────────────────────────────────────────────────
   Shorter than the design's 390 (667×375, Safari's 956×330 with its toolbars): a
   56px dock and 8px gaps, so a sheet keeps four 44px rows. 844×390 is untouched. */
@media (max-height: 380px) {
  .nrl-dock-wrap { padding-bottom: max(8px, var(--nrl-safe-b)); }
  .nrl-dock { height: 56px; }
  .nrl-dock-play { height: 46px; }
  .nrl-dock-play-group > .nrl-btn { min-height: 46px; }
  .nrl-screen-region { top: calc(var(--nrl-hud-h, 0px) + 8px + var(--nrl-safe-t)); bottom: calc(var(--nrl-nav-h, 0px) + 8px); }
  .nrl-screen, .nrl-screen-backdrop .nrl-modal { padding: 6px 12px; }
  .nrl-screen-head { margin-bottom: 4px; }
  .nrl-nav-sheet { bottom: calc(var(--nrl-nav-h, 0px) + 6px); }
}

/* ── News (#45), under Office ───────────────────────────────────────────── */
.nrl-news { font-size: 13px; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-news-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* #345: the title and the filters are one row; the feed gets the rest. */
.nrl-news-head { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; min-width: 0; min-height: 44px; margin-bottom: 8px; }
.nrl-news h2 { margin: 0; flex: 0 0 auto; }
.nrl-news-filters { margin-left: auto; }
.nrl-news h3 { margin: 10px 0 4px; }
.nrl-news-week:first-child h3 { margin-top: 0; }
.nrl-news-list { overflow-y: visible; }
.nrl-news-item {
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 8px;
  background: var(--nrl-panel);
  border-left: 3px solid var(--nrl-muted); /* the info toast's edge (#339) */
  color: var(--nrl-text);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.nrl-news-item.nrl-news-success { border-left-color: var(--nrl-pos); }
.nrl-news-item.nrl-news-danger { border-left-color: var(--nrl-alert); }
.nrl-news-empty { margin: 24px 0; text-align: center; color: var(--nrl-muted); }
/* Waiting decisions: one row, however many, with the button to their popup. */
.nrl-news-decisions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  margin: 0 0 8px;
  padding: 0 6px 0 12px;
  min-height: 48px;
  background: var(--nrl-raised);
  border-radius: 10px;
}
.nrl-news-decisions[hidden] { display: none; }
.nrl-news-decisions-text { flex: 1 1 auto; min-width: 0; color: var(--nrl-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nrl-news-decisions-text b { font-family: var(--nrl-f-label); font-size: 15px; letter-spacing: 0.06em; color: var(--nrl-accent); margin-right: 8px; }
.nrl-news-answer { flex: 0 0 auto; min-height: 36px; }

/* ── A decision card (#75, #338, #346): the story, its deadline, a row per choice ── */
.nrl-event-card { margin: 0 0 8px; }
.nrl-event-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 12px; padding-right: 44px; }
.nrl-event-title { font-family: var(--nrl-f-label); font-size: 22px; font-weight: 700; letter-spacing: 0.02em; line-height: 1.15; }
/* The deadline wraps (#345: it was cut off at "…or it's "Ban the t"). */
.nrl-event-meta { font-size: 12px; color: var(--nrl-accent); line-height: 1.3; overflow-wrap: anywhere; }
.nrl-event-text { margin: 6px 0 10px; overflow-wrap: anywhere; line-height: 1.45; font-size: 14px; color: var(--nrl-text-2); }
.nrl-event-choices { display: flex; flex-direction: column; gap: 6px; }
.nrl-btn.nrl-event-choice {
  flex: 1 1 auto;
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  background: var(--nrl-raised);
  text-align: left;
  text-transform: none;
  letter-spacing: 0;
  white-space: normal;
  min-height: 48px;
}
.nrl-btn.nrl-event-choice:hover:not(:disabled) { background: #22305c; }
.nrl-event-choice-label { font-family: var(--nrl-f-label); font-size: 17px; font-weight: 700; letter-spacing: 0.02em; line-height: 1.2; color: var(--nrl-text); }
.nrl-event-choice-hint { font-family: var(--nrl-f-body); font-size: 12px; font-weight: 400; line-height: 1.35; color: var(--nrl-text-2); }
/* #346: a risk is its own line, marked so it never reads as a sure cost. */
.nrl-event-choice-risk {
  font-family: var(--nrl-f-body); font-size: 12px; font-weight: 400; line-height: 1.35;
  color: var(--nrl-neg); padding-left: 8px; border-left: 2px solid var(--nrl-alert); margin-top: 2px;
}
/* The decisions popup and Advance Week's ask (#338, #345): a region dialog, one card. */
.nrl-dialog-region .nrl-decisions-modal { width: min(100%, 680px); }
.nrl-decisions h2, .nrl-ask h2 { margin: 0 0 8px; padding-right: 44px; min-height: 36px; display: flex; align-items: center; }
.nrl-decisions-count { font-family: var(--nrl-f-label); font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); margin: 0 0 2px; }
.nrl-decisions-note { margin: 0 0 12px; color: var(--nrl-text-2); }
.nrl-decisions-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.nrl-decisions-actions .nrl-btn { flex: 1 1 12rem; }
.nrl-ask-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.nrl-ask-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 8px 12px; border-radius: 8px; background: var(--nrl-raised); border-left: 3px solid var(--nrl-bench); font-size: 13px; }
.nrl-ask-row.nrl-ask-due { border-left-color: var(--nrl-accent); }
.nrl-ask-title { font-family: var(--nrl-f-label); font-size: 17px; font-weight: 700; }
.nrl-ask-note { color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-ask-due .nrl-ask-note { color: var(--nrl-accent); }
/* Short landscape phones: the choices side by side, so all of them show with their hints. */
@media (max-height: 500px) {
  .nrl-event-title { font-size: 20px; }
  .nrl-event-text { margin: 4px 0 8px; font-size: 13px; line-height: 1.35; }
  .nrl-event-choices { flex-direction: row; align-items: stretch; }
  .nrl-btn.nrl-event-choice { flex: 1 1 0; min-width: 0; width: auto; justify-content: flex-start; }
  .nrl-decisions h2, .nrl-ask h2 { margin-bottom: 4px; }
}
@media (max-width: 480px) {
  .nrl-event-choices { flex-direction: column; }
}

/* ── Placement bar (#78): what to do while placing or moving, and Cancel ── */
.nrl-placebar {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: calc(12px + var(--nrl-safe-t));
  z-index: 46;
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: min(94vw, 600px);
  min-height: 52px;
  box-sizing: border-box;
  background: rgba(14, 22, 48, 0.95);
  color: var(--nrl-text);
  border-radius: 12px;
  box-shadow: var(--nrl-shadow-chip);
  padding: 4px 4px 4px 14px;
  font-size: 13px;
}
.nrl-placebar[hidden] { display: none; }
.nrl-placebar-text { flex: 1 1 auto; line-height: 1.35; }
.nrl-placebar-text b { font-family: var(--nrl-f-label); font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-accent); margin-right: 6px; }
.nrl-placebar-cancel { flex: 0 0 auto; }

/* ── Kit & colours (#79), under Office ───────────────────────────────────── */
.nrl-kit { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-kit-head { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; min-height: 44px; margin-bottom: 8px; }
.nrl-kit h2 { margin: 0; }
.nrl-kit h3 { margin: 10px 0 4px; }
.nrl-kit-controls > h3:first-child { margin-top: 0; }
.nrl-kit-note { margin: 0; font-size: 12px; color: var(--nrl-muted); }
.nrl-kit-body { display: flex; gap: 16px; flex: 1 1 auto; min-height: 0; }
.nrl-kit-side { display: flex; flex-direction: column; gap: 10px; flex: 0 0 auto; }
.nrl-kit-preview { display: flex; gap: 8px; align-items: flex-end; padding: 8px 10px; border-radius: 10px; background: var(--nrl-panel); }
.nrl-kit-preview figure { margin: 0; text-align: center; font-family: var(--nrl-f-label); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nrl-muted); }
.nrl-kit-sprite { width: 72px; height: 77px; image-rendering: pixelated; }
.nrl-kit-portrait { width: 60px; image-rendering: pixelated; }
.nrl-kit-controls { flex: 1 1 16rem; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.nrl-kit-label { font-family: var(--nrl-f-label); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nrl-muted); margin: 6px 0 4px; }
.nrl-kit-row { display: flex; flex-wrap: wrap; gap: 6px; }
.nrl-kit-row .nrl-seg { flex-wrap: wrap; }
.nrl-kit-swatch {
  pointer-events: auto;
  width: 44px; height: 44px; /* #194: a tap target */
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
}
.nrl-kit-swatch[aria-pressed="true"] { border-color: var(--nrl-navy); box-shadow: 0 0 0 2px var(--nrl-accent); }
.nrl-kit-actions { display: flex; flex-wrap: wrap; gap: 8px; flex: 0 0 auto; }
.nrl-kit-actions .nrl-btn { flex: 1 1 auto; }
/* 956×330: smaller figures, so the preview and Save fit beside the controls. */
@media (max-height: 340px) {
  .nrl-kit-head { margin-bottom: 4px; }
  .nrl-kit-side { gap: 6px; }
  .nrl-kit-preview { padding: 4px 8px; }
  .nrl-kit-sprite { width: 48px; height: 52px; }
  .nrl-kit-portrait { width: 42px; }
}
/* ── Guide, under Office (N7, #188, #344) ─────────────────────────────────── */
/* #206: only the page scrolls; the tabs and the foot (Replay) stay in view. */
.nrl-guide { font-size: 13px; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.nrl-guide-tabs, .nrl-guide-foot { flex: 0 0 auto; }
.nrl-guide-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-right: 4px; }
/* One row: the page tabs (a segmented control that swipes sideways), then Replay. */
.nrl-guide-top { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; min-width: 0; margin-bottom: 10px; }
.nrl-guide-top .nrl-guide-tabs { flex: 0 1 auto; min-width: 0; }
.nrl-guide-tabs > .nrl-btn { padding: 0 12px; font-size: 15px; }
.nrl-guide h2 { margin: 0; }
.nrl-guide h3 { margin: 12px 0 4px; }
/* N14 (#263): the screen a page describes, one tap away. */
.nrl-guide-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; margin: 0 0 6px; }
.nrl-btn.nrl-guide-link { min-height: 36px; padding: 0 12px; font-size: 14px; border-radius: 8px; }
.nrl-guide p { margin: 4px 0; line-height: 1.5; color: var(--nrl-text-2); overflow-wrap: anywhere; }
.nrl-guide ul { margin: 4px 0 4px 18px; padding: 0; color: var(--nrl-text-2); }
.nrl-guide li { margin: 3px 0; line-height: 1.45; overflow-wrap: anywhere; }
.nrl-guide b, .nrl-guide strong { color: var(--nrl-text); }
.nrl-guide-figure { border-radius: 10px; overflow: hidden; background: var(--nrl-panel); padding: 6px; }
.nrl-guide-foot { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.nrl-guide-build { font-family: var(--nrl-f-num); font-size: 11px; color: var(--nrl-muted); white-space: nowrap; }
@media (max-width: 760px) { .nrl-guide-build { display: none; } }
`;
