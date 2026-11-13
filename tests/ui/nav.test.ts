import { describe, it, expect } from 'vitest';
import { ScreenRegistry, tabText } from '../../src/ui/nav';

// DOM tests (createNav / button rendering) are skipped: jsdom is not installed
// and the vitest environment is 'node' (see vite.config.ts). The registry that
// backs createNav is extracted as a pure class so its id-keyed replace semantics
// are covered here without the DOM.
describe('ScreenRegistry (nav registry logic)', () => {
  it('registers a new screen and preserves insertion order', () => {
    const r = new ScreenRegistry();
    r.set('squad', 'Squad', () => {});
    r.set('recruit', 'Recruit', () => {});
    expect(r.size).toBe(2);
    expect(r.list().map((s) => s.id)).toEqual(['squad', 'recruit']);
    expect(r.has('squad')).toBe(true);
  });

  it('replaces an existing id in place (idempotent, no duplicates)', () => {
    const r = new ScreenRegistry();
    r.set('squad', 'Squad', () => {});
    r.set('recruit', 'Recruit', () => {});
    const replaced = r.set('squad', 'My Squad', () => {});
    expect(replaced).toBe(true);
    expect(r.size).toBe(2); // no duplicate added
    // Order is preserved (squad stays first, not moved to the end).
    expect(r.list().map((s) => s.id)).toEqual(['squad', 'recruit']);
    expect(r.get('squad')?.label).toBe('My Squad');
  });

  it('returns false when adding a brand-new id', () => {
    const r = new ScreenRegistry();
    expect(r.set('fixtures', 'Fixtures', () => {})).toBe(false);
  });

  it('stores the open callback and invokes the latest one after replace', () => {
    const r = new ScreenRegistry();
    let calls: string[] = [];
    r.set('build', 'Build', () => calls.push('v1'));
    r.set('build', 'Build', () => calls.push('v2'));
    r.get('build')?.open();
    expect(calls).toEqual(['v2']);
  });
});

describe('tabs and More (#344)', () => {
  const r = new ScreenRegistry();
  r.set('squad', 'Squad', () => {});
  r.set('fixtures', 'League', () => {}, { holds: ['ladder'] });
  r.set('staff', 'Staff', () => {}, { more: true });

  it('lights the tab a screen key belongs to', () => {
    expect(r.owner('squad')).toBe('squad');
    expect(r.owner('ladder')).toBe('fixtures');
    expect(r.owner('kit')).toBeNull();
    expect(r.owner(null)).toBeNull();
  });

  it('knows which screens live in the More sheet', () => {
    expect(r.inMore('staff')).toBe(true);
    expect(r.inMore('squad')).toBe(false);
    expect(r.inMore('ladder')).toBe(false);
    expect(r.list().filter((s) => !s.more).map((s) => s.id)).toEqual(['squad', 'fixtures']);
  });
});

import { CSS } from '../../src/ui/dom';

describe('the dock on landscape phones (Broadcast Quiet)', () => {
  it('is one 64px row: status, tabs, PLAY WEEK, with tab labels of 14px or more (rem since the text size, #371)', () => {
    expect(CSS).toMatch(/\.nrl-dock \{[^}]*height: 64px/);
    expect(CSS).toMatch(/\.nrl-dock-tabs > \.nrl-btn \{[^}]*height: 44px[^}]*font-size: 1rem/);
    const narrow = CSS.slice(CSS.indexOf('@media (max-width: 760px)'));
    expect(narrow).toMatch(/\.nrl-dock-tabs > \.nrl-btn \{[^}]*font-size: 0\.875rem/);
  });

  it('marks the open screen and clears the home bar', () => {
    expect(CSS).toMatch(/\.nrl-dock-tabs > \.nrl-btn\[aria-current="page"\]/);
    expect(CSS).toMatch(/\.nrl-dock-wrap \{[^}]*max\(12px, var\(--nrl-safe-b\)\)/);
  });

  it('shows the open tab with ▴ (not CLUB, home has nothing to close)', () => {
    expect(tabText('Squad', true)).toBe('SQUAD ▴');
    expect(tabText('Squad', false)).toBe('SQUAD');
    expect(tabText('Club', true, true)).toBe('CLUB');
  });
});

describe('hidden entries (Lineup, Recruit: Squad segments)', () => {
  const r = new ScreenRegistry();
  r.set('squad', 'Squad', () => {}, { holds: ['lineup', 'recruit'] });
  r.set('lineup', 'Lineup', () => {}, { hidden: true });
  it('light the tab that holds them, not their own', () => {
    expect(r.owner('lineup')).toBe('squad');
    expect(r.owner('squad')).toBe('squad');
    expect(r.get('lineup')?.hidden).toBe(true);
  });
});

// #369: Squad's red dot when a contract ends within 4 weeks: no number, a label, never in More.
import { badgeView, moreBadgeCount } from '../../src/ui/nav';

describe('the dot (#369)', () => {
  it('shows a dot with no number, read out by its label', () => {
    const v = badgeView('Squad', 0, 'Squad — 2 contracts end within 4 weeks');
    expect(v).toEqual({ count: null, dot: true, ariaLabel: 'Squad — 2 contracts end within 4 weeks' });
  });

  it('off, nothing shows and nothing is read out; a count still reads as before', () => {
    expect(badgeView('Squad', 0)).toEqual({ count: null, dot: false, ariaLabel: null });
    expect(badgeView('News', 3)).toEqual({ count: '3', dot: false, ariaLabel: 'News, 3 unread' });
    expect(badgeView('News', 120).count).toBe('99+');
    expect(badgeView('News', 2, 'a dot').ariaLabel).toBe('News, 2 unread; a dot');
  });

  it("doesn't add to More: only the sheet's counts do", () => {
    const r = new ScreenRegistry();
    r.set('squad', 'Squad', () => {});
    r.set('contracts', 'Contracts', () => {}, { more: true });
    r.set('finance', 'Finance', () => {}, { more: true });
    // Squad has a dot (and no count); the dot lives on its own button.
    expect(moreBadgeCount(r.list(), new Map())).toBe(0);
    expect(moreBadgeCount(r.list(), new Map([['squad', 4], ['finance', 2]]))).toBe(2);
  });
});

// #344: the open-tab marker (a fill and a bar, so it reads without colour) and what each button says.
import { navMarks, navSpeech, HOME_ID, OFFICE_ID } from '../../src/ui/nav';

describe('the marker (#344)', () => {
  const r = new ScreenRegistry();
  r.set('squad', 'Squad', () => {}, { holds: ['lineup'] });
  r.set('fixtures', 'League', () => {}, { holds: ['ladder'] });
  r.set('lineup', 'Lineup', () => {}, { hidden: true });
  r.set('staff', 'Staff & Board', () => {}, { more: true });

  it('marks CLUB, and only CLUB, with nothing over the grounds', () => {
    expect(navMarks(r, null, false, false)).toEqual({ current: [HOME_ID], open: [] });
  });

  it("marks an open tab with ▴, and the tab that holds a sheet's segment", () => {
    expect(navMarks(r, 'squad', false, true)).toEqual({ current: ['squad'], open: ['squad'] });
    expect(navMarks(r, 'lineup', false, true)).toEqual({ current: ['squad'], open: ['squad'] });
    expect(navMarks(r, 'ladder', false, true)).toEqual({ current: ['fixtures'], open: ['fixtures'] });
  });

  it('marks both OFFICE and the tile for a screen opened from Office', () => {
    expect(navMarks(r, 'staff', false, true)).toEqual({ current: ['staff', OFFICE_ID], open: [OFFICE_ID] });
  });

  it("while Office's sheet is up: OFFICE shows ▴, no tab is current and CLUB isn't lit", () => {
    expect(navMarks(r, null, true, false)).toEqual({ current: [], open: [OFFICE_ID] });
  });

  it('a screen with no tab (the kit) marks nothing, not CLUB', () => {
    expect(navMarks(r, 'kit', false, true)).toEqual({ current: [], open: [] });
  });

  it('upright, the Club home sheet (#350) marks CLUB with no ▴, not while Office is up', () => {
    expect(navMarks(r, HOME_ID, false, true)).toEqual({ current: [HOME_ID], open: [] });
    expect(navMarks(r, HOME_ID, true, true)).toEqual({ current: [], open: [OFFICE_ID] });
  });
});

describe('what a tab says (#344)', () => {
  it('its name, not the caps or ▴; aria-current says it is open, so the name never does', () => {
    expect(navSpeech('Squad', badgeView('Squad', 0))).toBe('Squad');
    expect(navSpeech('Club', badgeView('Club', 0))).toBe('Club');
    expect(navSpeech('Squad', badgeView('Squad', 0))).not.toMatch(/current|▴|SQUAD/);
  });

  it('then its alerts: a count, a dot (#369), both', () => {
    expect(navSpeech('Office', badgeView('Office', 2))).toBe('Office, 2 unread');
    const dot = 'Squad — 2 contracts end within 4 weeks';
    expect(navSpeech('Squad', badgeView('Squad', 0, dot))).toBe(dot);
    expect(navSpeech('News', badgeView('News', 1, 'a dot'))).toBe('News, 1 unread; a dot');
  });
});

describe('the dock at every text size (#344)', () => {
  const rule = (sel: string): string => {
    const i = CSS.indexOf(`${sel} {`);
    return i < 0 ? '' : CSS.slice(i, CSS.indexOf('}', i));
  };

  it("puts a 3px accent bar (the token, not a colour) under the open tab's label and an open tile's name", () => {
    const tab = rule('.nrl-dock-tabs > .nrl-btn[aria-current="page"] .nrl-nav-label::after, .nrl-dock-tabs > .nrl-btn[aria-expanded="true"] .nrl-nav-label::after');
    expect(tab).toMatch(/height: 3px/);
    expect(tab).toMatch(/background: var\(--nrl-accent\)/);
    const tile = rule('.nrl-nav-sheet > .nrl-btn[aria-current="page"] .nrl-office-name::after');
    expect(tile).toMatch(/height: 3px/);
    expect(tile).toMatch(/background: var\(--nrl-accent\)/);
  });

  it("gives way PLAY WEEK's sub-line first, never its label, and closes the tabs up at Large and Larger to 900px", () => {
    expect(rule('.nrl-dock-play')).toMatch(/flex: 0 100 auto/);
    expect(rule('.nrl-dock-play')).not.toMatch(/min-width: 0/);
    expect(rule('.nrl-dock-advance-sub')).toMatch(/overflow: hidden;\s*white-space: normal;[^\n]*\n\s*overflow-wrap: anywhere/);
    expect(rule('.nrl-nav-label')).toMatch(/text-overflow: ellipsis/);
    const wide = CSS.slice(CSS.indexOf('@media (max-width: 900px)'));
    expect(wide).toMatch(/^@media \(max-width: 900px\) \{\s*html\[data-text-size\] \.nrl-dock-tabs > \.nrl-btn \{ padding: 0 5px/);
  });

  it('stacks into two rows in a narrow window, and to 620px at Large and Larger: money and PLAY WEEK over the five tabs', () => {
    expect(CSS).toMatch(/html\[data-text-size\] \.nrl-dock \{ height: auto; flex-wrap: wrap/);
    expect(CSS.slice(CSS.indexOf('@media (max-width: 560px)'))).toMatch(/html \.nrl-dock \{ height: auto; flex-wrap: wrap/);
    expect(CSS).toMatch(/html\[data-text-size\] \.nrl-dock-tabs \{ order: 1; flex: 1 1 100%/);
    const narrow = CSS.slice(CSS.indexOf('@media (max-width: 560px)'));
    expect(narrow).toMatch(/\.nrl-dock-tabs \{ order: 1; flex: 1 1 100%/);
    expect(narrow).toMatch(/\.nrl-nav-caret \{ display: none; \}/);
  });

  it("holds ▴'s room on a closed tab at Normal, after the dot; not at Large or Larger, to 620px or upright, where ▴ takes room only when open (#607)", () => {
    expect(rule('.nrl-nav-room')).toMatch(/order: 1; flex: 0 0 auto; margin-left: -6px; white-space: pre; visibility: hidden/);
    expect(rule('.nrl-dock-tabs > .nrl-btn')).toMatch(/gap: 6px/); // the gap the room's margin takes back
    expect(CSS).toMatch(/\.nrl-dock-tabs > \.nrl-btn:has\(\.nrl-nav-caret\) > \.nrl-nav-room, html\[data-text-size\] \.nrl-nav-room \{ display: none; \}/);
    expect(CSS.slice(CSS.indexOf('@media (max-width: 620px)'))).toMatch(/^@media \(max-width: 620px\) \{[^@]*\n  \.nrl-nav-room \{ display: none; \}/);
    expect(PORTRAIT_CSS).toMatch(/html:root \.nrl-nav-caret, html:root \.nrl-nav-room \{ display: none; \}/);
  });

  it('gives tab padding back for it on a phone at Normal, under the Large and Larger rules (#607)', () => {
    expect(CSS).toMatch(/@media \(min-width: 761px\) and \(max-width: 900px\) \{ \.nrl-dock-tabs > \.nrl-btn \{ padding: 0 8px; \} \}/);
    expect(CSS).toMatch(/@media \(min-width: 621px\) and \(max-width: 760px\) \{ \.nrl-dock-tabs > \.nrl-btn \{ padding: 0 6px; \} \}/);
  });
});

import { beforeEach, afterEach, vi } from 'vitest';
import { createNav } from '../../src/ui/nav';
import { stubDocument, StubNode } from './stubDom';
import { bus } from '../../src/core/events';
import { el, openScreen, closeScreen } from '../../src/ui/dom';
import { PORTRAIT_CSS } from '../../src/ui/portrait';

// #607: the dock never moves. A closed tab holds ▴'s room; the open tab's label carries the ▴ itself.
describe('the tabs stay put when one opens (#607)', () => {
  beforeEach(() => { stubDocument(); bus.clear(); });
  afterEach(() => { closeScreen(); vi.unstubAllGlobals(); });
  it("every tab but CLUB has ▴'s room from the start; ▴ itself is in the open tab's label only", () => {
    const nav = createNav();
    nav.registerScreen('squad', 'Squad', () => openScreen(el('div'), undefined, 'squad'));
    nav.registerScreen('fixtures', 'League', () => openScreen(el('div'), undefined, 'fixtures'));
    nav.registerScreen('staff', 'Staff & Board', () => {}, { more: true });
    const body = document.body as unknown as StubNode;
    const ids = ['club', 'squad', 'fixtures', 'office'];
    const tab = (id: string): StubNode => body.querySelector(`[data-screen="${id}"]`)!;
    const rooms = (): (string | null)[] => ids.map((id) => tab(id).querySelector('.nrl-nav-room')?.textContent ?? null);
    const labels = (): string[] => ids.map((id) => tab(id).querySelector('.nrl-nav-label')!.textContent);
    const everyRoom = [null, ' ▴', ' ▴', ' ▴'];
    expect([rooms(), labels()]).toEqual([everyRoom, ['CLUB', 'SQUAD', 'LEAGUE', 'OFFICE']]);
    // The room is as wide as what an open label gains: the same text.
    expect(tabText('Squad', true)).toBe(`${tabText('Squad', false)}${rooms()[1]}`);

    tab('squad').click();
    expect(tab('squad').getAttribute('aria-current')).toBe('page');
    expect([rooms(), labels()]).toEqual([everyRoom, ['CLUB', 'SQUAD ▴', 'LEAGUE', 'OFFICE']]);
    expect(tab('squad').querySelector('.nrl-nav-caret')!.textContent).toBe(' ▴');
    tab('office').click(); // Office's sheet over the grounds: the screen closes first
    expect([rooms(), labels()]).toEqual([everyRoom, ['CLUB', 'SQUAD', 'LEAGUE', 'OFFICE ▴']]);
    tab('club').click();
    expect([rooms(), labels()]).toEqual([everyRoom, ['CLUB', 'SQUAD', 'LEAGUE', 'OFFICE']]);
    // The room is after the label in the tab, the alert dot after both: CSS (order) draws the dot between.
    nav.setDot('squad', true, 'Squad — 1 contract ends within 4 weeks');
    expect(tab('squad').children.map((c) => c.className)).toEqual(['nrl-nav-label', 'nrl-nav-room', 'nrl-nav-dot']);
    // What a tab says is its aria-label, so the hidden ▴ is never read out.
    expect(tab('squad').getAttribute('aria-label')).toBe('Squad — 1 contract ends within 4 weeks');
    expect(tab('fixtures').getAttribute('aria-label')).toBe('League');
    nav.destroy();
  });
});

describe('Office locks (#482)', () => {
  beforeEach(() => { stubDocument(); bus.clear(); });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps a locked tile dimmed with its reason; tapping explains, direct open bypasses; unlocking restores the tile', () => {
    const nav = createNav();
    const open = vi.fn();
    let reason: string | null = 'Opens after your first home game';
    nav.registerScreen('finance', 'Finance', open, { more: true, locked: () => reason, status: () => ({ text: '+$100 / week', attn: true }) });
    const body = document.body as unknown as StubNode;
    const office = body.querySelector('[data-nav-more]')!;
    const tile = body.querySelector('[data-screen="finance"]')!;
    office.click();
    expect(tile.classList.contains('nrl-office-locked')).toBe(true);
    expect(tile.getAttribute('aria-disabled')).toBe('true');
    expect(tile.textContent).toContain(reason);
    expect(tile.querySelector('.nrl-office-status')?.hasAttribute('data-attn')).toBe(false);
    const notify = vi.fn(); bus.on('ui:notify', notify);
    tile.click();
    expect(open).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith({ text: reason, kind: 'info' });
    nav.open('finance');
    expect(open).toHaveBeenCalledTimes(1);
    reason = null; office.click();
    expect(tile.classList.contains('nrl-office-locked')).toBe(false);
    expect(tile.hasAttribute('aria-disabled')).toBe(false);
    expect(tile.textContent).toContain('+$100 / week');
    tile.click(); expect(open).toHaveBeenCalledTimes(2);
    nav.destroy();
  });
  it('leaves a tile without a lock callback unchanged', () => {
    const nav = createNav(); const open = vi.fn();
    nav.registerScreen('news', 'News', open, { more: true });
    const body = document.body as unknown as StubNode;
    body.querySelector('[data-nav-more]')!.click();
    const tile = body.querySelector('[data-screen="news"]')!;
    expect(tile.hasAttribute('aria-disabled')).toBe(false);
    tile.click(); expect(open).toHaveBeenCalledOnce();
    nav.destroy();
  });
});
