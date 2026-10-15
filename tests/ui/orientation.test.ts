import { describe, it, expect } from 'vitest';
import { PORTRAIT_QUERY, watchOrientation } from '../../src/ui/orientation';

/** A controllable stand-in for window.matchMedia(PORTRAIT_QUERY). */
function fakeMedia(initial: boolean) {
  let listener: ((e: { matches: boolean }) => void) | null = null;
  const queries: string[] = [];
  const mm = (q: string) => {
    queries.push(q);
    return {
      matches: initial,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        listener = fn;
      },
    } as unknown as MediaQueryList;
  };
  return { mm, queries, fire: (matches: boolean) => listener?.({ matches }) };
}

describe('landscape guard', () => {
  it('only blocks touch devices held upright (desktop windows never)', () => {
    expect(PORTRAIT_QUERY).toContain('orientation: portrait');
    expect(PORTRAIT_QUERY).toContain('pointer: coarse');
  });

  it('blocks at start when already upright, then unblocks on rotate', () => {
    const calls: string[] = [];
    const m = fakeMedia(true);
    const blocked = watchOrientation({ onBlock: () => calls.push('block'), onUnblock: () => calls.push('unblock') }, m.mm);
    expect(blocked).toBe(true);
    expect(m.queries).toEqual([PORTRAIT_QUERY]);
    m.fire(false);
    expect(calls).toEqual(['block', 'unblock']);
  });

  it('starts unblocked in landscape and ignores repeat events', () => {
    const calls: string[] = [];
    const m = fakeMedia(false);
    expect(watchOrientation({ onBlock: () => calls.push('block'), onUnblock: () => calls.push('unblock') }, m.mm)).toBe(false);
    m.fire(false); // no change
    m.fire(true);
    m.fire(true); // no change
    m.fire(false);
    expect(calls).toEqual(['block', 'unblock']);
  });
});
