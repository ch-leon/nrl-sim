import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enableAutosave, exportSave, deleteSlot, downloadSave, EXPORT_HELD_FAILED_TEXT, getActiveSlot, importIntoSlot, load, save, slotKey, __setStorage, type StorageLike } from '../../src/core/save';
import { bus } from '../../src/core/events';
import { readLiveMatch, writeLiveMatch } from '../../src/systems/liveMatchRecord';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearTickHooks, registerTickHook, resumeWeek, weekHeld } from '../../src/core/time';

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
let writes = 0;
let off: (() => void) | undefined;
beforeEach(() => {
  store = new Map();
  writes = 0;
  const storage: StorageLike = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { writes++; store.set(k, v); },
    removeItem: (k) => void store.delete(k),
  };
  __setStorage(storage);
  createNewGame('Autosave', 21);
});
afterEach(() => {
  off?.();
  off = undefined;
  clearHeldWeek();
  clearTickHooks();
  __setStorage(null);
});

describe('enableAutosave (QA finding 21)', () => {
  it('saves a change made between weeks when the page is hidden or unloaded', () => {
    const page = fakePage();
    off = enableAutosave({ doc: page.doc, win: page.win });
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
    off = undefined;
    expect(page.count()).toBe(0);
    setState({ money: 1 });
    page.fire('pagehide');
    expect(load()?.money).toBe(654_321);
  });

  it('does not save a held week, whose state is half-ticked', () => {
    const page = fakePage();
    off = enableAutosave({ doc: page.doc, win: page.win });
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
  });

  it('does not save over a save imported into the active slot (Settings → Import save, then reload)', () => {
    const page = fakePage();
    save(getState());
    off = enableAutosave({ doc: page.doc, win: page.win });
    const file = (clubName: string): string => exportSave({ ...getState(), clubName });

    // Into another slot: this game still owns its own, so the page going away saves it.
    expect(importIntoSlot(file('Other FC'), getActiveSlot() + 1)).not.toBeNull();
    setState({ money: 777 });
    page.fire('pagehide');
    expect(load()?.money).toBe(777);

    // Into this game's slot: Settings reloads to the title screen, and the pagehide on the
    // way must not write the game being left over the import (#295's checker).
    expect(importIntoSlot(file('Imported FC'), getActiveSlot())?.clubName).toBe('Imported FC');
    page.fire('pagehide');
    expect(load()?.clubName).toBe('Imported FC');
    page.doc.visibilityState = 'hidden';
    page.fire('visibilitychange');
    advanceWeek();
    save(getState()); // a screen that saves at once (the squad's focus) in the 600 ms before the reload
    expect(load()?.clubName).toBe('Imported FC');
    expect(load()?.week).toBe(1);
  });
});

// QA finding 22: the Lineup, the squad's focus and the fixture settings save straight after
// a change, and the HUD is live again while the rival round finishes. A change then wrote the
// held week's half-ticked state: the week's money and results in, the week counter not moved.
describe('save() during a held week (QA finding 22)', () => {
  it('writes nothing while the week is held; the week\'s end saves the change with the rest', () => {
    setState({ money: 500 });
    save(getState());
    registerTickHook('test-hold', 0, (ctx) => { setState({ money: 999 }); ctx.hold?.(); });
    advanceWeek();
    expect(weekHeld()).toBe(true);

    setState({ settings: { ...getState().settings, coachCalls: false } }); // a fixture setting, mid-hold
    save(getState());
    expect(load()).toMatchObject({ week: 1, money: 500 }); // the slot still holds the week's start

    resumeWeek();
    save(getState()); // the week's end (enableAutosave's week save)
    expect(load()).toMatchObject({ week: 2, money: 999 });
    expect(load()?.settings.coachCalls).toBe(false);
  });
});

// QA finding 21's follow-up: a held week is never written, so a change made between weeks was
// lost if the tab died while the week held (the live match, the rival round): the slot kept the
// previous week's end. The week's start saves it, before any hook can hold.
describe('the week-start save', () => {
  it('saves a change made between weeks before the week can hold', () => {
    const page = fakePage();
    off = enableAutosave({ doc: page.doc, win: page.win });
    advanceWeek(); // week 1 → 2, saved at its end
    setState({ money: 600 }); // a hire between weeks
    registerTickHook('test-hold', 40, (ctx) => { setState({ money: 999 }); ctx.hold?.(); });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    // The tab dies here, mid-match: no pagehide reaches a page the phone has already dropped.
    expect(load()).toMatchObject({ week: 2, money: 600 });
    resumeWeek();
    expect(load()).toMatchObject({ week: 3, money: 999 });
  });

  it('writes nothing at the week start when nothing changed since the last save', () => {
    const page = fakePage();
    off = enableAutosave({ doc: page.doc, win: page.win });
    save(getState()); // a new game is saved at its first week's start (or its first hide), like any change
    writes = 0;
    advanceWeek();
    advanceWeek();
    expect(writes).toBe(2); // each week's end, no more
    setState({ money: 600 });
    advanceWeek();
    expect(writes).toBe(4); // the change at the week's start, then the week's end
    off();
    off = undefined;
    setState({ money: 700 });
    advanceWeek();
    expect(writes).toBe(4); // unsubscribed: the week-start hook is gone too
  });
});

/** The live-match record uses localStorage; point it at the same map as the slot. */
function shareLocalStorage(): void {
  const storage: StorageLike = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
}

describe('export and import during a held week', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('exports the week-start save and the match, not the half-ticked week', () => {
    shareLocalStorage();
    const page = fakePage();
    off = enableAutosave({ doc: page.doc, win: page.win });
    const money = getState().money;
    registerTickHook('hold', 40, (ctx) => { setState({ money: 1 }); ctx.hold?.(); });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(getState().money).toBe(1);
    const record = {
      season: getState().season, week: getState().week, round: 1, homeId: 'p', awayId: 'r', seed: 9,
      calls: [{ tick: 4, side: 'home' as const, call: 'rush' as const }], tick: 80,
    };
    expect(writeLiveMatch(record)).toBe(true);
    const parsed = JSON.parse(exportSave(getState())) as { money: number; nrlLiveMatch?: { tick: number; calls: unknown[] } };
    expect(parsed.money).toBe(money);
    expect(parsed.nrlLiveMatch?.tick).toBe(80);
    expect(parsed.nrlLiveMatch?.calls).toEqual(record.calls);

    expect(importIntoSlot(JSON.stringify(parsed), getActiveSlot())?.money).toBe(money);
    expect(load()?.money).toBe(money);
    expect(load()).not.toHaveProperty('nrlLiveMatch');
    expect(JSON.parse(store.get(slotKey(1))!)).not.toHaveProperty('nrlLiveMatch');
    expect(readLiveMatch()?.tick).toBe(80);
  });

  it('importing a save with no match clears a stale record, and a bad record is refused', () => {
    shareLocalStorage();
    save(getState());
    expect(writeLiveMatch({
      season: 1, week: 1, round: 1, homeId: 'p', awayId: 'r', seed: 3, calls: [], tick: 40,
    })).toBe(true);
    const plain = exportSave(getState());
    expect(JSON.parse(plain)).not.toHaveProperty('nrlLiveMatch');
    expect(importIntoSlot(plain, getActiveSlot())).not.toBeNull();
    expect(readLiveMatch()).toBeNull();

    const bad = JSON.parse(plain) as Record<string, unknown>;
    bad.nrlLiveMatch = { tick: 'nope' };
    expect(importIntoSlot(JSON.stringify(bad), getActiveSlot())).toBeNull();
    expect(load()?.clubName).toBe('Autosave');
  });

  it('refuses to export a held week whose last landed save is another week', () => {
    save(getState()); // week 1 landed; nothing saves the week-2 kick-off
    advanceWeek();
    registerTickHook('hold', 40, (ctx) => { setState({ money: 1 }); ctx.hold?.(); });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(getState().week).toBe(2);
    const notes: string[] = [];
    const offNote = bus.on('ui:notify', (n) => notes.push(n.text));
    downloadSave(getState());
    offNote();
    expect(notes).toContain(EXPORT_HELD_FAILED_TEXT);
  });

  it('deletes the live-match record with the slot', () => {
    shareLocalStorage();
    save(getState());
    writeLiveMatch({ season: 1, week: 1, round: 1, homeId: 'p', awayId: 'r', seed: 3, calls: [], tick: 40 });
    expect(readLiveMatch()?.tick).toBe(40);
    deleteSlot(1);
    expect(readLiveMatch()).toBeNull();
    expect(store.has('nrl-live-match-1')).toBe(false);
    expect(store.has(slotKey(1))).toBe(false);
  });
});
