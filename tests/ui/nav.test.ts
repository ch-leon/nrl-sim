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
  it('is one 64px row: status, tabs, PLAY WEEK, with tab labels of 14px or more', () => {
    expect(CSS).toMatch(/\.nrl-dock \{[^}]*height: 64px/);
    expect(CSS).toMatch(/\.nrl-dock-tabs > \.nrl-btn \{[^}]*height: 44px[^}]*font-size: 16px/);
    const narrow = CSS.slice(CSS.indexOf('@media (max-width: 760px)'));
    expect(narrow).toMatch(/\.nrl-dock-tabs > \.nrl-btn \{[^}]*font-size: 14px/);
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
