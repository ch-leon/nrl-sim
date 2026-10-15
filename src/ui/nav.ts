// src/ui/nav.ts — bottom nav bar + screen registry. See BAK-163.
// nav.ts imports NO screen modules: later WUs (squad/recruit/fixtures/build)
// register themselves from main.ts via registerScreen(). No Phaser imports.

import { button, mount, ensureStyles, trackChromeInset, NAV_INSET_VAR } from './dom';

/** A registered nav destination. */
export interface NavScreen {
  id: string;
  label: string;
  open: () => void;
}

/** Handle to a mounted nav bar. */
export interface Nav {
  el: HTMLElement;
  registerScreen(id: string, label: string, open: () => void): void;
  /** Show a count badge on a registered screen's button; 0 hides it. */
  setBadge(id: string, count: number): void;
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
  set(id: string, label: string, open: () => void): boolean {
    const existed = this.map.has(id);
    this.map.set(id, { id, label, open });
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
}

/**
 * Build the bottom nav bar, mount it into #ui-root, and return a handle.
 * registerScreen(id,label,open) appends a pixel button that calls open() on
 * click; re-registering the same id replaces the existing button in place
 * (idempotent — no duplicate buttons).
 */
export function createNav(): Nav {
  ensureStyles();

  const registry = new ScreenRegistry();
  // Live map of id -> its rendered button, so replacement can swap in place.
  const buttons = new Map<string, HTMLButtonElement>();
  const root = document.createElement('div');
  root.className = 'nrl-nav';

  function registerScreen(id: string, label: string, open: () => void): void {
    const replaced = registry.set(id, label, open);
    const btn = button(label, () => registry.get(id)?.open());
    btn.setAttribute('data-screen', id);
    if (replaced) {
      const old = buttons.get(id);
      if (old) root.replaceChild(btn, old);
      else root.appendChild(btn);
    } else {
      root.appendChild(btn);
    }
    buttons.set(id, btn);
  }

  function setBadge(id: string, count: number): void {
    const btn = buttons.get(id);
    if (!btn) return;
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
    btn.setAttribute('aria-label', `${registry.get(id)?.label ?? id}, ${count} unread`);
  }

  mount(root);
  // Screens sit above the nav (GitHub #14): publish our live height.
  const offInset = trackChromeInset(root, NAV_INSET_VAR);

  return {
    el: root,
    registerScreen,
    setBadge,
    destroy() {
      offInset();
      root.remove();
    },
  };
}
