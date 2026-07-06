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
