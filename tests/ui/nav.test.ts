import { describe, it, expect } from 'vitest';
import { ScreenRegistry } from '../../src/ui/nav';

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

describe('nav layout on landscape phones (QA)', () => {
  it('shares one row between equal tabs with labels of 12px or more', () => {
    expect(CSS).toMatch(/\.nrl-nav > \.nrl-btn \{[^}]*flex: 1 1 0/);
    expect(CSS).toMatch(/\.nrl-nav > \.nrl-btn \{[^}]*font-size: max\(12px,/);
    expect(CSS).toMatch(/\.nrl-nav-sheet \.nrl-btn \{[^}]*font-size: max\(12px,/);
  });

  it('marks the open screen and clears the home bar', () => {
    expect(CSS).toMatch(/\.nrl-nav \.nrl-btn\[aria-current="page"\]/);
    expect(CSS).toMatch(/\.nrl-nav \{[^}]*max\(0\.25rem, var\(--nrl-safe-b\)\)/);
  });
});
