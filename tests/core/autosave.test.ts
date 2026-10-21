import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enableAutosave, load, __setStorage, type StorageLike } from '../../src/core/save';
import { createNewGame, setState } from '../../src/core/state';
import { advanceWeek, clearTickHooks, registerTickHook, resumeWeek, weekHeld } from '../../src/core/time';

// QA finding 21: a change made between weeks (here, money) was saved only by the next
// week's advance, so a phone that dropped the tab lost it. The page going away saves it,
// unless a week is held (its state is half-ticked).

/** A page stand-in: listeners by event type, and the document's visibility. */
function fakePage() {
  const listeners = new Map<string, Set<() => void>>();
  const target = {
    addEventListener: (type: string, fn: () => void) => { listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)); },
    removeEventListener: (type: string, fn: () => void) => { listeners.get(type)?.delete(fn); },
  };
  const doc = { ...target, visibilityState: 'visible' };
  const fire = (type: string) => { for (const fn of listeners.get(type) ?? []) fn(); };
  const count = () => [...listeners.values()].reduce((t, s) => t + s.size, 0);
  return { doc, win: target, fire, count };
}

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  const storage: StorageLike = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
  __setStorage(storage);
  createNewGame('Autosave', 21);
});
afterEach(() => {
  clearTickHooks();
  __setStorage(null);
});

describe('enableAutosave (QA finding 21)', () => {
  it('saves a change made between weeks when the page is hidden or unloaded', () => {
    const page = fakePage();
    const off = enableAutosave({ doc: page.doc, win: page.win });
    setState({ money: 123_456 });
    expect(load()).toBeNull(); // nothing saved yet: no week has advanced

    page.fire('visibilitychange'); // still visible: no save
    expect(load()).toBeNull();
    page.doc.visibilityState = 'hidden';
    page.fire('visibilitychange');
    expect(load()?.money).toBe(123_456);

    setState({ money: 654_321 });
    page.fire('pagehide');
    expect(load()?.money).toBe(654_321);

    off();
    expect(page.count()).toBe(0);
    setState({ money: 1 });
    page.fire('pagehide');
    expect(load()?.money).toBe(654_321);
  });

  it('does not save a held week, whose state is half-ticked', () => {
    const page = fakePage();
    const off = enableAutosave({ doc: page.doc, win: page.win });
    setState({ money: 500 });
    page.fire('pagehide');
    expect(load()?.week).toBe(1);

    let release: (() => void) | undefined;
    registerTickHook('test-hold', 0, (ctx) => { setState({ money: 999 }); ctx.hold?.(); release = resumeWeek; });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    page.fire('pagehide');
    expect(load()?.money).toBe(500); // the held week's half-ticked state is not written

    release?.(); // the week finishes: week:advanced saves it
    expect(weekHeld()).toBe(false);
    expect(load()?.week).toBe(2);
    off();
  });
});
