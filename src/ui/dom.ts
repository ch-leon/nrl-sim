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

/** Currently open modal overlay, if any (guards against stacking). */
let openModalEl: HTMLElement | null = null;

/**
 * Open a centred modal containing `content`. Clicking the dimmed backdrop closes
 * it. Returns the backdrop element. Only one modal is open at a time — opening a
 * second closes the first.
 */
export function openModal(content: HTMLElement, opts: { class?: string } = {}): HTMLElement {
  ensureStyles();
  closeModal();
  const box = el(
    'div',
    { class: opts.class ? `nrl-modal ${opts.class}` : 'nrl-modal' },
    content,
  );
  const backdrop = el(
    'div',
    { class: 'nrl-modal-backdrop', onClick: () => closeModal() },
    box,
  );
  // Clicks inside the modal box must not bubble to the backdrop's close handler.
  box.addEventListener('click', (e) => e.stopPropagation());
  openModalEl = backdrop;
  getRoot().appendChild(backdrop);
  return backdrop;
}

/** Close the currently open modal, if any. */
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
  padding: 0.5rem;
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
.nrl-hud-actions { pointer-events: auto; }
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
  padding: 0.5rem;
  overflow-x: auto;
  white-space: nowrap;
  z-index: 10;
}
.nrl-nav .nrl-btn { flex: 0 0 auto; }

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
`;
