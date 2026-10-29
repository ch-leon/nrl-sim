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
// Office marks OFFICE and its own tile. The mark is a fill and a bar under the
// label, so it reads without its colour (#344).

import {
  button,
  el,
  dock,
  mount,
  ensureStyles,
  activeScreen,
  closeScreen,
  closeModal,
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
  /**
   * A red dot, no number, on a registered screen's tab (#369), read out as
   * `label`; off hides it. Unlike a count it never rolls up into OFFICE.
   */
  setDot(id: string, on: boolean, label?: string): void;
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

/** What a nav button's marks show (#369): the count's text, whether a dot shows, and what it reads out. */
export interface BadgeView {
  count: string | null;
  dot: boolean;
  ariaLabel: string | null;
}

/** A button's count and dot, as read out. Pure. (The dock shows a count as a dot too.) */
export function badgeView(label: string, count: number, dot: string | null = null): BadgeView {
  const unread = count > 0 ? `${label}, ${count} unread` : null;
  return {
    count: count > 0 ? (count > 99 ? '99+' : String(count)) : null,
    dot: dot !== null,
    ariaLabel: unread && dot ? `${unread}; ${dot}` : unread ?? dot,
  };
}

/** OFFICE's count: its tiles' counts. Dots stay on their own tabs (#369). Pure. */
export function moreBadgeCount(screens: readonly NavScreen[], counts: ReadonlyMap<string, number>): number {
  let total = 0;
  for (const s of screens) if (s.more) total += counts.get(s.id) ?? 0;
  return total;
}

/** The dock's two fixed buttons, by their data-screen: home and Office's sheet. */
export const HOME_ID = 'club';
export const OFFICE_ID = 'office';

/** What the dock marks for a screen key (#344). Pure. */
export interface NavMarks {
  /** Ids with aria-current="page", the fill and the bar: the open screen's tab, OFFICE and its tile, or CLUB at home. */
  current: string[];
  /** Ids whose label shows ▴: the open tab (CLUB never does), OFFICE while its sheet is up or holds the screen. */
  open: string[];
}

/**
 * The marks for screen `key`, with Office's sheet up or not and a screen up or not.
 * A screen in Office marks OFFICE and its tile; with nothing over the grounds, CLUB,
 * and CLUB too for the Club home sheet (key HOME_ID), home on a phone held upright (#350).
 */
export function navMarks(registry: ScreenRegistry, key: string | null, sheetUp: boolean, screenUp: boolean): NavMarks {
  const owner = registry.owner(key);
  const inMore = registry.inMore(key);
  const current: string[] = [];
  const open: string[] = [];
  if (!sheetUp && (key === HOME_ID || (owner === null && !screenUp))) current.push(HOME_ID);
  if (owner !== null) current.push(owner);
  if (owner !== null && !inMore && !sheetUp) open.push(owner);
  if (inMore) current.push(OFFICE_ID);
  if (inMore || sheetUp) open.push(OFFICE_ID);
  return { current, open };
}

/**
 * What a tab or tile reads out (#344): its name (not the caps or ▴), then its alerts (#369).
 * aria-current="page" says it is open, so the name doesn't. Pure.
 */
export function navSpeech(label: string, badge: BadgeView): string {
  return badge.ariaLabel ?? label;
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
  // A dot's read-out label by screen id (#369); absent means no dot.
  const dots = new Map<string, string>();

  // CLUB: home, the grounds with nothing over them (upright, the Club home sheet, #350: already home, it stays).
  const club = tabButton('Club', () => {
    setSheet(false);
    if (screenKey() !== HOME_ID) closeScreen();
  });
  club.setAttribute('data-screen', HOME_ID);
  club.setAttribute('data-nav-home', '');
  club.setAttribute('aria-label', 'Club');

  const sheet = el('div', { class: 'nrl-nav-sheet', attrs: { id: 'nrl-nav-sheet', role: 'menu', 'aria-label': 'Office' } });
  sheet.hidden = true;
  const dim = el('div', { class: 'nrl-office-dim', attrs: { 'aria-hidden': 'true' } });
  dim.hidden = true;
  dim.addEventListener('click', () => setSheet(false));

  // Office over the grounds: one sheet at a time, so an open screen closes first.
  const more = tabButton(OFFICE_LABEL, () => {
    if (!sheet.hidden) return setSheet(false);
    closeModal(); // a dialog left open (a decision) would sit over the tiles
    closeScreen();
    setSheet(true);
  });
  more.setAttribute('data-nav-more', '');
  more.setAttribute('data-screen', OFFICE_ID);
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
    if (!span || span.textContent === text) return;
    // ▴ in a span of its own, so a narrow dock can drop it (#344: the bar marks the open tab).
    const name = label.toUpperCase();
    span.replaceChildren(name, ...(text === name ? [] : [el('span', { class: 'nrl-nav-caret', text: text.slice(name.length) })]));
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
    const m = navMarks(registry, key, !sheet.hidden, activeScreen() !== null);
    const all: [string, HTMLButtonElement][] = [[HOME_ID, club], ...buttons, [OFFICE_ID, more]];
    for (const [id, btn] of all) {
      if (m.current.includes(id)) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
      if (!registry.get(id)?.more) setLabel(btn, m.open.includes(id));
    }
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
    const sc = registry.get(id);
    if (!btn || !sc) return;
    const v = badgeView(sc.label, counts.get(id) ?? 0, dots.get(id) ?? null);
    paint(btn, v, !sc.more);
    // A tile with nothing to add reads its name and status line as they show.
    if (sc.more && v.ariaLabel === null) btn.removeAttribute('aria-label');
    else say(btn, sc.label, v);
  }

  function paintMoreBadge(): void {
    const v = badgeView(OFFICE_LABEL, moreBadgeCount(registry.list(), counts));
    paint(more, v, true);
    say(more, OFFICE_LABEL, v);
  }

  /** A button's spoken label: its name (not the caps or ▴), then its alerts (#344). */
  function say(btn: HTMLButtonElement, label: string, v: BadgeView): void {
    const text = navSpeech(label, v);
    if (btn.getAttribute('aria-label') !== text) btn.setAttribute('aria-label', text);
  }

  function setBadge(id: string, count: number): void {
    counts.set(id, count);
    paintBadge(id);
    if (registry.get(id)?.more) {
      paintMoreBadge();
      if (!sheet.hidden) paintTiles();
    }
  }
  function setDot(id: string, on: boolean, label?: string): void {
    const next = on ? label ?? registry.get(id)?.label ?? id : null;
    if ((dots.get(id) ?? null) === next) return;
    if (next === null) dots.delete(id);
    else dots.set(id, next);
    paintBadge(id);
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
    setDot,
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

/** The alert on a tab (an 8px dot, for a count or a #369 dot); a tile shows no dot. What it reads out is say()'s. */
function paint(btn: HTMLButtonElement, v: BadgeView, dotted: boolean): void {
  let badge = btn.querySelector<HTMLElement>('.nrl-nav-dot');
  const on = dotted && (v.count !== null || v.dot);
  if (!on) badge?.remove();
  else {
    if (!badge) {
      badge = el('span', { class: 'nrl-nav-dot', attrs: { 'aria-hidden': 'true', 'data-nav-badge': '' } });
      btn.appendChild(badge);
    }
    if (v.count !== null) badge.setAttribute('data-count', v.count);
    else badge.removeAttribute('data-count');
  }
}
