// src/ui/nav.ts — bottom nav bar + screen registry. See BAK-163, #344.
// nav.ts imports NO screen modules: later WUs (squad/recruit/fixtures/build)
// register themselves from main.ts via registerScreen(). No Phaser imports.
//
// Four screens are tabs; the rest sit in More's sheet. The open screen's tab
// carries aria-current="page" (its screen key, see openScreen in dom.ts); a
// screen in the sheet marks More and its own row.

import {
  button,
  mount,
  ensureStyles,
  trackChromeInset,
  NAV_INSET_VAR,
  activeScreen,
  screenKey,
  setScreenKey,
  onScreenChange,
} from './dom';

/** Where a destination sits and which other screen keys light it up. */
export interface NavPlacement {
  /** In More's sheet rather than a tab of its own. */
  more?: boolean;
  /** Other screen keys this entry stands for (League holds the ladder). */
  holds?: string[];
}

/** A registered nav destination. */
export interface NavScreen {
  id: string;
  label: string;
  open: () => void;
  more: boolean;
  holds: string[];
}

/** Handle to a mounted nav bar. */
export interface Nav {
  el: HTMLElement;
  registerScreen(id: string, label: string, open: () => void, placement?: NavPlacement): void;
  /** Show a count badge on a registered screen's button; 0 hides it. */
  setBadge(id: string, count: number): void;
  /** Open a registered screen as its button would (the tutorial and the HUD's next-match chip). */
  open(id: string): void;
  destroy(): void;
}

/**
 * Pure, DOM-free screen registry with id-keyed replace semantics. Extracted so
 * registration/replacement logic is unit-testable without the DOM. Registering
 * an existing id replaces that entry in place (preserving order); a new id is
 * appended. The registry preserves insertion order for rendering.
 */
export class ScreenRegistry {
  private order: string[] = [];
  private map = new Map<string, NavScreen>();

  /** Add or replace a screen by id. Returns true if this replaced an existing id. */
  set(id: string, label: string, open: () => void, placement: NavPlacement = {}): boolean {
    const existed = this.map.has(id);
    this.map.set(id, { id, label, open, more: placement.more === true, holds: placement.holds ?? [] });
    if (!existed) this.order.push(id);
    return existed;
  }

  get(id: string): NavScreen | undefined {
    return this.map.get(id);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  /** Screens in insertion order. */
  list(): NavScreen[] {
    return this.order.map((id) => this.map.get(id)!);
  }

  get size(): number {
    return this.map.size;
  }

  /** The id of the entry a screen key lights up (its own id, or the entry that holds it). */
  owner(key: string | null): string | null {
    if (!key) return null;
    if (this.map.has(key)) return key;
    return this.list().find((s) => s.holds.includes(key))?.id ?? null;
  }

  /** Whether `key` belongs to a screen in More's sheet. */
  inMore(key: string | null): boolean {
    const id = this.owner(key);
    return id !== null && this.map.get(id)!.more;
  }
}

/**
 * Build the bottom nav bar, mount it into #ui-root, and return a handle.
 * registerScreen(id,label,open) adds a pixel button that calls open() on
 * click, as a tab or (placement.more) in More's sheet; re-registering the same
 * id replaces the existing button in place (idempotent — no duplicate buttons).
 */
export function createNav(): Nav {
  ensureStyles();

  const registry = new ScreenRegistry();
  // Live map of id -> its rendered button, so replacement can swap in place.
  const buttons = new Map<string, HTMLButtonElement>();
  const counts = new Map<string, number>();
  const root = document.createElement('div');
  root.className = 'nrl-nav';

  const sheet = document.createElement('div');
  sheet.className = 'nrl-nav-sheet';
  sheet.id = 'nrl-nav-sheet';
  sheet.setAttribute('role', 'menu');
  sheet.hidden = true;

  const more = button('More', () => setSheet(sheet.hidden));
  more.setAttribute('data-nav-more', '');
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-controls', sheet.id);
  more.setAttribute('aria-expanded', 'false');

  function setSheet(open: boolean): void {
    sheet.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
  }

  function pick(id: string): void {
    setSheet(false);
    registry.get(id)?.open();
    // A screen opened without a key still lights its own tab.
    if (activeScreen() && screenKey() === null) setScreenKey(id);
  }

  function layout(): void {
    const tabs = registry.list().filter((s) => !s.more);
    const sheeted = registry.list().filter((s) => s.more);
    root.replaceChildren(...tabs.map((s) => buttons.get(s.id)!));
    sheet.replaceChildren(...sheeted.map((s) => buttons.get(s.id)!));
    if (sheeted.length > 0) {
      more.setAttribute('data-nav-holds', sheeted.flatMap((s) => [s.id, ...s.holds]).join(' '));
      root.append(more, sheet);
    }
    mark(screenKey());
    paintMoreBadge();
  }

  function mark(key: string | null): void {
    const owner = registry.owner(key);
    for (const [id, btn] of buttons) {
      if (id === owner) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    if (registry.inMore(key)) more.setAttribute('aria-current', 'page');
    else more.removeAttribute('aria-current');
  }

  function registerScreen(id: string, label: string, open: () => void, placement: NavPlacement = {}): void {
    registry.set(id, label, open, placement);
    const btn = button(label, () => pick(id));
    btn.setAttribute('data-screen', id);
    if (placement.holds?.length) btn.setAttribute('data-nav-holds', placement.holds.join(' '));
    if (placement.more) btn.setAttribute('role', 'menuitem');
    buttons.set(id, btn);
    paintBadge(id);
    layout();
  }

  function paintBadge(id: string): void {
    const btn = buttons.get(id);
    if (btn) paint(btn, counts.get(id) ?? 0, registry.get(id)?.label ?? id);
  }

  function paintMoreBadge(): void {
    let total = 0;
    for (const s of registry.list()) if (s.more) total += counts.get(s.id) ?? 0;
    paint(more, total, 'More');
  }

  function setBadge(id: string, count: number): void {
    counts.set(id, count);
    paintBadge(id);
    if (registry.get(id)?.more) paintMoreBadge();
  }

  mount(root);
  // Screens sit above the nav (GitHub #14): publish our live height.
  const offInset = trackChromeInset(root, NAV_INSET_VAR);
  const offScreen = onScreenChange((key) => {
    setSheet(false);
    mark(key);
  });
  const onDown = (e: PointerEvent): void => {
    if (!sheet.hidden && !sheet.contains(e.target as Node) && !more.contains(e.target as Node)) setSheet(false);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !sheet.hidden) setSheet(false);
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey);

  return {
    el: root,
    registerScreen,
    setBadge,
    open: pick,
    destroy() {
      offInset();
      offScreen();
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}

function paint(btn: HTMLButtonElement, count: number, label: string): void {
  let badge = btn.querySelector<HTMLElement>('.nrl-nav-badge');
  if (count <= 0) {
    badge?.remove();
    btn.removeAttribute('aria-label');
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nrl-nav-badge';
    btn.appendChild(badge);
  }
  badge.textContent = count > 99 ? '99+' : String(count);
  btn.setAttribute('aria-label', `${label}, ${count} unread`);
}
