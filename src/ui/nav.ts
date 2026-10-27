// src/ui/nav.ts — the dock's tabs + screen registry. See BAK-163, #344 and
// docs/specs/ui-broadcast-quiet.md (the dock, 3i Office).
// nav.ts imports NO screen modules: screens register themselves from main.ts
// via registerScreen(). No Phaser imports.
//
// CLUB · SQUAD · LEAGUE · BUILD · OFFICE. CLUB is home: it closes whatever
// sheet is open. Each other tab opens its screen as a sheet above the dock, and
// tapping the open tab again closes it. The rest of the club sits in Office's
// pop-up sheet, a grid of tiles over the dimmed grounds, each with a status
// line (yellow when it wants attention). The open screen's tab carries
// aria-current="page" (its screen key, see openScreen in dom.ts); a screen in
// Office marks OFFICE and its own tile.

import {
  button,
  el,
  dock,
  mount,
  ensureStyles,
  activeScreen,
  closeScreen,
  screenKey,
  setScreenKey,
  onScreenChange,
} from './dom';

/** A tile's status line in Office: "+$3,240 / week", "3 unread" (attn: yellow). */
export interface NavStatus {
  text: string;
  attn?: boolean;
}

/** Where a destination sits and which other screen keys light it up. */
export interface NavPlacement {
  /** A tile in Office's sheet rather than a tab of its own. */
  more?: boolean;
  /** Other screen keys this entry stands for (League holds the ladder, Squad the lineup). */
  holds?: string[];
  /** Office tiles: the line under the name, read each time the sheet opens. */
  status?: () => NavStatus | null;
  /** No tab or tile: reached from inside another sheet (Lineup and Recruit, from Squad's segments) and by open(). */
  hidden?: boolean;
}

/** A registered nav destination. */
export interface NavScreen {
  id: string;
  label: string;
  open: () => void;
  more: boolean;
  holds: string[];
  hidden: boolean;
  status?: () => NavStatus | null;
}

/** Handle to the mounted tabs. */
export interface Nav {
  el: HTMLElement;
  registerScreen(id: string, label: string, open: () => void, placement?: NavPlacement): void;
  /** An alert count on a registered screen: a dot on its tab (or on OFFICE); 0 clears it. */
  setBadge(id: string, count: number): void;
  /** Open a registered screen as its tab or tile would (the tutorial, the money readout). */
  open(id: string): void;
  destroy(): void;
}

/** The label Office's tab reads: "OFFICE ▴" while its sheet is up. */
export const OFFICE_LABEL = 'Office';

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
    this.map.set(id, {
      id, label, open, more: placement.more === true, holds: placement.holds ?? [], hidden: placement.hidden === true,
      ...(placement.status ? { status: placement.status } : {}),
    });
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
    const holder = this.list().find((s) => !s.hidden && s.holds.includes(key))?.id ?? null;
    if (this.map.has(key) && !this.map.get(key)!.hidden) return key;
    return holder;
  }

  /** Whether `key` belongs to a screen in Office's sheet. */
  inMore(key: string | null): boolean {
    const id = this.owner(key);
    return id !== null && this.map.get(id)!.more;
  }
}

/** A tab's text: the label in caps, "▴" after it while it is open (not CLUB: home has nothing to close). */
export function tabText(label: string, open: boolean, home = false): string {
  return `${label.toUpperCase()}${open && !home ? ' ▴' : ''}`;
}

/**
 * Fill the dock's tab row and return a handle. registerScreen(id,label,open)
 * adds a tab that calls open() on a tap, or (placement.more) a tile in Office;
 * re-registering the same id replaces it in place (idempotent).
 */
export function createNav(): Nav {
  ensureStyles();
  const parts = dock();
  const root = parts.tabs;

  const registry = new ScreenRegistry();
  const buttons = new Map<string, HTMLButtonElement>();
  const counts = new Map<string, number>();

  // CLUB: home, the grounds with nothing over them.
  const club = tabButton('Club', () => {
    setSheet(false);
    closeScreen();
  });
  club.setAttribute('data-screen', 'club');
  club.setAttribute('data-nav-home', '');

  const sheet = el('div', { class: 'nrl-nav-sheet', attrs: { id: 'nrl-nav-sheet', role: 'menu', 'aria-label': 'Office' } });
  sheet.hidden = true;
  const dim = el('div', { class: 'nrl-office-dim', attrs: { 'aria-hidden': 'true' } });
  dim.hidden = true;
  dim.addEventListener('click', () => setSheet(false));

  // Office over the grounds: one sheet at a time, so an open screen closes first.
  const more = tabButton(OFFICE_LABEL, () => {
    if (!sheet.hidden) return setSheet(false);
    closeScreen();
    setSheet(true);
  });
  more.setAttribute('data-nav-more', '');
  more.setAttribute('data-screen', 'office');
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-controls', sheet.id);
  more.setAttribute('aria-expanded', 'false');

  function tabButton(label: string, onTap: () => void): HTMLButtonElement {
    const b = button('', onTap);
    b.append(el('span', { class: 'nrl-nav-label', text: tabText(label, false) }));
    b.setAttribute('data-label', label);
    return b;
  }

  function setLabel(b: HTMLButtonElement, open: boolean): void {
    const label = b.getAttribute('data-label') ?? '';
    const text = tabText(label, open, b === club);
    const span = b.querySelector('.nrl-nav-label');
    if (span && span.textContent !== text) span.textContent = text;
  }

  function setSheet(open: boolean): void {
    if (open) paintTiles();
    sheet.hidden = !open;
    dim.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
    mark(screenKey());
  }

  function pick(id: string, toggle = true): void {
    setSheet(false);
    const owner = registry.owner(screenKey());
    // A tab tapped while its own sheet is open closes it (#344: the dock is a toggle).
    if (toggle && owner === id && !registry.get(id)?.more && activeScreen()) {
      closeScreen();
      return;
    }
    registry.get(id)?.open();
    // A screen opened without a key still lights its own tab.
    if (activeScreen() && screenKey() === null) setScreenKey(id);
  }

  function layout(): void {
    const tabs = registry.list().filter((s) => !s.more && !s.hidden);
    const sheeted = registry.list().filter((s) => s.more && !s.hidden);
    root.replaceChildren(club, ...tabs.map((s) => buttons.get(s.id)!));
    sheet.replaceChildren(...sheeted.map((s) => buttons.get(s.id)!));
    if (sheeted.length > 0) {
      more.setAttribute('data-nav-holds', sheeted.flatMap((s) => [s.id, ...s.holds]).join(' '));
      root.append(more);
    }
    mark(screenKey());
    paintMoreBadge();
  }

  function mark(key: string | null): void {
    const owner = registry.owner(key);
    const office = !sheet.hidden || registry.inMore(key);
    for (const [id, btn] of buttons) {
      if (id === owner) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
      if (!registry.get(id)?.more) setLabel(btn, id === owner && sheet.hidden);
    }
    if (registry.inMore(key)) more.setAttribute('aria-current', 'page');
    else more.removeAttribute('aria-current');
    setLabel(more, office);
    // Home is lit when nothing is over the grounds.
    if (owner === null && !activeScreen() && sheet.hidden) club.setAttribute('aria-current', 'page');
    else club.removeAttribute('aria-current');
  }

  function registerScreen(id: string, label: string, open: () => void, placement: NavPlacement = {}): void {
    registry.set(id, label, open, placement);
    let btn: HTMLButtonElement;
    if (placement.more) {
      btn = button('', () => pick(id));
      btn.append(el('span', { class: 'nrl-office-name', text: label }), el('span', { class: 'nrl-office-status' }));
      btn.setAttribute('role', 'menuitem');
    } else {
      btn = tabButton(label, () => pick(id));
    }
    btn.setAttribute('data-screen', id);
    if (placement.holds?.length) btn.setAttribute('data-nav-holds', placement.holds.join(' '));
    buttons.set(id, btn);
    paintBadge(id);
    layout();
  }

  /** Office's status lines, read when the sheet opens. */
  function paintTiles(): void {
    for (const s of registry.list()) {
      if (!s.more) continue;
      const line = buttons.get(s.id)?.querySelector<HTMLElement>('.nrl-office-status');
      if (!line) continue;
      let st: NavStatus | null = null;
      try {
        st = s.status?.() ?? null;
      } catch {
        st = null; // no game loaded yet
      }
      line.textContent = st?.text ?? '';
      line.toggleAttribute('data-attn', st?.attn === true);
    }
  }

  function paintBadge(id: string): void {
    const btn = buttons.get(id);
    const s = registry.get(id);
    if (btn && s) paint(btn, counts.get(id) ?? 0, s.label, !s.more);
  }

  function paintMoreBadge(): void {
    let total = 0;
    for (const s of registry.list()) if (s.more) total += counts.get(s.id) ?? 0;
    paint(more, total, OFFICE_LABEL, true);
  }

  function setBadge(id: string, count: number): void {
    counts.set(id, count);
    paintBadge(id);
    if (registry.get(id)?.more) {
      paintMoreBadge();
      if (!sheet.hidden) paintTiles();
    }
  }

  // Over the grounds and any sheet, under the dock (the dock stays bright and tappable).
  mount(dim);
  mount(sheet);
  const offScreen = onScreenChange((key) => {
    setSheet(false);
    mark(key);
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (!sheet.hidden) setSheet(false);
    else if (activeScreen() && !document.querySelector('.nrl-modal-backdrop:not(.nrl-screen-backdrop)')) closeScreen();
  };
  document.addEventListener('keydown', onKey);
  mark(screenKey());

  return {
    el: root,
    registerScreen,
    setBadge,
    open: (id) => pick(id, false),
    destroy() {
      offScreen();
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
      sheet.remove();
      dim.remove();
    },
  };
}

/** The alert on a tab (an 8px dot) or the count's spoken label on an Office tile. */
function paint(btn: HTMLButtonElement, count: number, label: string, dot: boolean): void {
  let badge = btn.querySelector<HTMLElement>('.nrl-nav-dot');
  if (count <= 0) {
    badge?.remove();
    btn.removeAttribute('aria-label');
    return;
  }
  if (dot && !badge) {
    badge = el('span', { class: 'nrl-nav-dot', attrs: { 'aria-hidden': 'true', 'data-nav-badge': '' } });
    btn.appendChild(badge);
  }
  if (badge) badge.setAttribute('data-count', String(count));
  btn.setAttribute('aria-label', `${label}, ${count} waiting`);
}
