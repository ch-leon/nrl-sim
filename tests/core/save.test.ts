import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  save, load, clearSave, hasSave, enableAutosave,
  SAVE_KEY, CORRUPT_KEY, __setStorage, slotKey, setActiveSlot, getSlotSummaries, deleteSlot,
  migrateState, exportSave, importSave, importIntoSlot, MIGRATIONS,
  type StorageLike,
} from '../../src/core/save';
import { showTitleFlow, type TitleChoice } from '../../src/ui/title';
import { createNewGame, getState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { DEFAULT_PLAYER_COLORS, isValidColorPair } from '../../src/config';

// Setup data loads asynchronously; save-slot tests use a synthetic catalogue.
vi.mock('../../src/data/towns.json', () => ({ default: [
  { id: '1', name: 'Exampleton', region: '01', country: 'AU', lat: -30, lon: 150, population: 5000, nickname: 'Wombats' },
] }));

// ── Map-backed fake storage (Node env has no localStorage) ───────────────────

function makeFakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

let storage: ReturnType<typeof makeFakeStorage>;

beforeEach(() => {
  bus.clear();
  storage = makeFakeStorage();
  __setStorage(storage);
  setActiveSlot(1);
});

afterEach(() => {
  __setStorage(null);
  vi.restoreAllMocks();
});

describe('save / load round-trip', () => {
  it('round-trips a GameState with no data loss', () => {
    const s = createNewGame('Round Trip', 42);
    save(s);
    const loaded = load();
    expect(loaded).toEqual(s);
  });

  it('persists under the slot key as JSON', () => {
    const s = createNewGame('Persist', 1);
    save(s);
    expect(storage.map.has(slotKey(1))).toBe(true);
    expect(JSON.parse(storage.map.get(slotKey(1))!)).toEqual(s);
  });
});

describe('load absence & corruption', () => {
  it('returns null when no save exists', () => {
    expect(load()).toBeNull();
  });

  it('returns null with no storage available', () => {
    __setStorage(null);
    // With no injected fake and no real localStorage (node), getStorage()->null.
    expect(load()).toBeNull();
  });

  it('unparseable JSON is corrupt: null, warns, preserves raw and source slot', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.map.set(slotKey(1), '{not valid json');
    const result = load();
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith('nrl-sim: corrupt save, ignoring');
    expect(storage.map.get(CORRUPT_KEY)).toBe('{not valid json');
    expect(storage.map.has(slotKey(1))).toBe(true);
  });

  it('non-numeric version is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bad = { ...createNewGame('V', 1), version: 'two' };
    storage.map.set(slotKey(1), JSON.stringify(bad));
    expect(load()).toBeNull();
    expect(storage.map.has(CORRUPT_KEY)).toBe(true);
  });

  it('missing required key is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createNewGame('M', 1) as unknown as Record<string, unknown>;
    delete s.league;
    storage.map.set(slotKey(1), JSON.stringify(s));
    expect(load()).toBeNull();
  });

  it('non-object payload is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.map.set(slotKey(1), JSON.stringify(42));
    expect(load()).toBeNull();
    expect(storage.map.get(CORRUPT_KEY)).toBe('42');
  });

  it('null payload is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.map.set(slotKey(1), JSON.stringify(null));
    expect(load()).toBeNull();
  });

  it('squad not an array is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createNewGame('SQ', 1) as unknown as Record<string, unknown>;
    s.squad = 'nope';
    storage.map.set(slotKey(1), JSON.stringify(s));
    expect(load()).toBeNull();
  });

  it('no exception escapes any corrupt path', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.map.set(slotKey(1), '\u0000\u0000broken');
    expect(() => load()).not.toThrow();
  });
});

describe('clearSave / hasSave', () => {
  it('clearSave removes the active slot but leaves CORRUPT_KEY', () => {
    save(createNewGame('C', 1));
    storage.map.set(CORRUPT_KEY, 'old-corrupt');
    clearSave();
    expect(storage.map.has(slotKey(1))).toBe(false);
    expect(storage.map.get(CORRUPT_KEY)).toBe('old-corrupt');
  });

  it('hasSave reflects presence', () => {
    expect(hasSave()).toBe(false);
    save(createNewGame('H', 1));
    expect(hasSave()).toBe(true);
    clearSave();
    expect(hasSave()).toBe(false);
  });
});

describe('storage error handling', () => {
  it('quota/storage errors surface via ui:notify and never throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notes: Array<{ text: string; kind: string }> = [];
    bus.on('ui:notify', (p) => notes.push(p));

    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: () => {},
    };
    __setStorage(throwing);

    const s = createNewGame('Q', 1);
    expect(() => save(s)).not.toThrow();
    expect(notes).toEqual([{ text: 'Save failed: storage full', kind: 'danger' }]);
    expect(warn).toHaveBeenCalled();
  });

  it('save with no storage warns via ui:notify and does not throw', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    __setStorage(null);
    const notes: Array<{ text: string; kind: string }> = [];
    bus.on('ui:notify', (p) => notes.push(p));
    const s = createNewGame('NS', 1);
    expect(() => save(s)).not.toThrow();
    expect(notes[0].kind).toBe('danger');
  });
});

describe('enableAutosave', () => {
  it('persists on week:advanced and unsub stops further autosaves', () => {
    const s = createNewGame('AS', 1);
    const unsub = enableAutosave();

    bus.emit('week:advanced', { week: 2, season: 1 });
    expect(storage.map.has(slotKey(1))).toBe(true);
    // Autosave captures live getState() — clear and re-emit to prove it re-saves.
    storage.map.delete(slotKey(1));
    bus.emit('week:advanced', { week: 3, season: 1 });
    expect(storage.map.has(slotKey(1))).toBe(true);

    unsub();
    storage.map.delete(slotKey(1));
    bus.emit('week:advanced', { week: 4, season: 1 });
    expect(storage.map.has(slotKey(1))).toBe(false);
    // sanity: saved payload is the live state
    void s;
  });

  it('autosaves the current live state', () => {
    createNewGame('LIVE', 5);
    enableAutosave();
    bus.emit('week:advanced', { week: 2, season: 1 });
    const loaded = load() as GameState;
    expect(loaded).toEqual(getState());
  });
});

// ── Title flow: exercised against a tiny in-file DOM stub (node env, no jsdom) ─

interface StubEl {
  tagName: string;
  children: StubEl[];
  parentNode: StubEl | null;
  style: { cssText: string; display: string };
  attrs: Record<string, string>;
  _text: string;
  type: string;
  value: string;
  _listeners: Record<string, Array<() => void>>;
  appendChild(c: StubEl): StubEl;
  removeChild(c: StubEl): StubEl;
  addEventListener(ev: string, fn: () => void): void;
  setAttribute(k: string, v: string): void;
  focus(): void;
  click(): void;
  replaceChildren(): void;
  set textContent(v: string);
  get textContent(): string;
  querySelector(sel: string): StubEl | null;
}

function makeStubEl(tagName: string): StubEl {
  const el: StubEl = {
    tagName,
    children: [],
    parentNode: null,
    style: new Proxy({ cssText: '', display: '' } as { cssText: string; display: string }, {
      get: (t, p: string) => (p in t ? (t as Record<string, string>)[p] : ''),
      set: (t, p: string, v) => { (t as Record<string, string>)[p] = String(v); return true; },
    }),
    attrs: {},
    _text: '',
    type: '',
    value: '',
    _listeners: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    addEventListener(ev, fn) { (el._listeners[ev] ||= []).push(fn); },
    setAttribute(k, v) { el.attrs[k] = v; },
    focus() {},
    replaceChildren() { for (const c of el.children) c.parentNode = null; el.children = []; },
    click() { for (const fn of el._listeners.click ?? []) fn(); },
    set textContent(v: string) { el._text = v; },
    get textContent(): string { return el._text; },
    querySelector(sel: string): StubEl | null {
      // supports only [data-attr] selectors used in tests
      const m = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
      const key = m ? m[1] : sel;
      const want = m?.[2];
      const walk = (node: StubEl): StubEl | null => {
        if (key in node.attrs && (want === undefined || node.attrs[key] === want)) return node;
        for (const c of node.children) {
          const found = walk(c);
          if (found) return found;
        }
        return null;
      };
      for (const c of el.children) {
        const found = walk(c);
        if (found) return found;
      }
      return null;
    },
  };
  return el;
}

describe('showTitleFlow', () => {
  beforeEach(() => {
    // Install a minimal document global for the title flow.
    (globalThis as unknown as { document: { createElement(t: string): StubEl } }).document = {
      createElement: (t: string) => makeStubEl(t),
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it('with no save: goes straight to New Game form and resolves {new, clubName}', async () => {
    // ensure no save present
    clearSave();
    const root = makeStubEl('div');
    const p: Promise<TitleChoice> = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();

    const input = root.querySelector('[data-nrl-clubname]');
    const start = root.querySelector('[data-nrl-start]');
    expect(input).not.toBeNull();
    expect(start).not.toBeNull();

    input!.value = '  Sharks  ';
    start!.click();

    const choice = await p;
    expect(choice).toMatchObject({ mode: 'new', clubName: 'Sharks' }); // trimmed
    expect(root.children.length).toBe(0); // overlay removed
  });

  it('scrolls instead of clipping when taller than a landscape phone, inside the safe area (QA, #347)', () => {
    clearSave();
    const root = makeStubEl('div');
    void showTitleFlow(root as unknown as HTMLElement);
    const overlay = root.querySelector('[data-nrl-title]')!;
    const css = overlay.children.find((c) => c.tagName === 'style')!.textContent;
    const rule = (sel: string): string => css.match(new RegExp(`\\${sel} \\{([^}]*)\\}`))![1]!;
    expect(rule('.nrl-title')).toContain('overflow-y: auto');
    expect(rule('.nrl-title')).not.toContain('justify-content: center');
    for (const side of ['top', 'right', 'bottom', 'left']) expect(rule('.nrl-title')).toContain(`env(safe-area-inset-${side}`);
    expect(rule('.nrl-title-main')).toContain('margin: auto 0');
  });

  it('empty club name falls back to default', async () => {
    clearSave();
    const root = makeStubEl('div');
    const p = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-clubname]')!.value = '   ';
    root.querySelector('[data-nrl-start]')!.click();
    expect(await p).toMatchObject({ mode: 'new', clubName: 'Cavehole Crushers' });
  });

  it('with a save: Continue resolves {continue}', async () => {
    save(createNewGame('Existing', 1));
    const root = makeStubEl('div');
    const p = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();

    const cont = root.querySelector('[data-nrl-continue-1]');
    expect(cont).not.toBeNull();
    cont!.click();
    expect(await p).toEqual({ mode: 'continue' });
    expect(root.children.length).toBe(0);
  });

  it('shows the repair warning and recovery copy before continuing a repaired career', async () => {
    const s = createNewGame('Missing selection', 525);
    delete (s.lineup as unknown as Record<string, unknown>).captain;
    const original = JSON.stringify(s, null, 2);
    storage.map.set(slotKey(1), original);
    const root = makeStubEl('div');
    const choice = showTitleFlow(root as unknown as HTMLElement);
    const card = root.querySelector('[data-nrl-slot-1]')!;
    expect(card.children.some(c => c.textContent.includes('Career lineup repaired'))).toBe(true);
    expect(root.querySelector('[data-nrl-recovery-1-0]')).not.toBeNull();
    expect(storage.map.get(slotKey(1))).toBe(original);
    root.querySelector('[data-nrl-continue-1]')!.click();
    expect(await choice).toEqual({ mode: 'continue' });
    expect(load()!.lineup.captain).toBeNull();
  });

  it('with a save: New game opens the setup step, and Start asks before replacing the season (#350 T2)', async () => {
    save(createNewGame('Existing', 1));
    const root = makeStubEl('div');
    let settled = false;
    const p = showTitleFlow(root as unknown as HTMLElement).then((c) => { settled = true; return c; });
    await vi.dynamicImportSettled();

    // The slot cards, no setup yet.
    expect(root.querySelector('[data-nrl-clubname]')).toBeNull();
    root.querySelector('[data-nrl-new-1]')!.click();
    await vi.dynamicImportSettled();
    // The setup step replaces the cards.
    expect(root.querySelector('[data-nrl-slot-1]')).toBeNull();
    const input = root.querySelector('[data-nrl-clubname]');
    expect(input).not.toBeNull();
    input!.value = 'Bulldogs';
    root.querySelector('[data-nrl-start]')!.click();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(root.querySelector('[data-nrl-confirm]')!.textContent).toContain('This replaces Existing (S1 W1)');
    root.querySelector('[data-nrl-start-cancel]')!.click();
    expect(root.querySelector('[data-nrl-confirm]')).toBeNull();
    root.querySelector('[data-nrl-start]')!.click();
    root.querySelector('[data-nrl-start-confirm]')!.click();
    expect(await p).toMatchObject({ mode: 'new', clubName: 'Bulldogs' });
  });

  it('Back from the setup step returns to the slot cards', () => {
    save(createNewGame('Existing', 1));
    const root = makeStubEl('div');
    void showTitleFlow(root as unknown as HTMLElement);
    root.querySelector('[data-nrl-new-1]')!.click();
    root.querySelector('[data-nrl-back]')!.click();
    expect(root.querySelector('[data-nrl-clubname]')).toBeNull();
    expect(root.querySelector('[data-nrl-continue-1]')).not.toBeNull();
  });

  it('names every kit swatch (#351 T3)', () => {
    clearSave();
    const root = makeStubEl('div');
    void showTitleFlow(root as unknown as HTMLElement);
    expect(root.querySelector('[data-nrl-primary="#c0392b"]')!.attrs['aria-label']).toBe('Primary Crimson');
    expect(root.querySelector('[data-nrl-secondary="#1a1a2e"]')!.attrs['aria-label']).toBe('Secondary Navy-black');
    expect(root.querySelector('[data-nrl-primary="#f4d03f"]')!.attrs['aria-pressed']).toBe('true');
  });

  it('resolves exactly once (double click ignored)', async () => {
    clearSave();
    const root = makeStubEl('div');
    const p = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    const start = root.querySelector('[data-nrl-start]')!;
    start.click();
    start.click(); // second click after removal must be a no-op
    expect(await p).toMatchObject({ mode: 'new', clubName: 'Exampleton Wombats' });
  });
});

// ── Migration, future versions, export/import, slots ─────────────────────────

describe('migrateState', () => {
  it.each(Array.from({ length: 23 }, (_, i) => i + 1))('rejects v%i without migration or mutation', version => {
    const raw = { ...createNewGame('Old', 7), version };
    const before = JSON.stringify(raw);
    const result = migrateState(raw);
    expect(result).toMatchObject({ ok: false, outcome: 'unrecoverable', message: expect.stringMatching(/older version.*start a new career/i) });
    expect(JSON.stringify(raw)).toBe(before);
  });
  it('has no migration from 23 to 24', () => {
    expect(SAVE_VERSION).toBe(26);
    expect(MIGRATIONS.some(m => m.from === 23)).toBe(false);
  });
  it('refuses a future version with a clear message', () => {
    expect(migrateState({ version: SAVE_VERSION + 1 })).toMatchObject({ ok: false, reason: 'future', message: expect.stringMatching(/newer version/i) });
  });
  it.each([null, 42, [], {}, { version: '23' }])('rejects malformed input %j', raw => {
    expect(migrateState(raw)).toMatchObject({ ok: false, reason: 'corrupt' });
  });
});

describe('load: legacy and future saves', () => {
  it('a future-version save is refused, notified, and left untouched', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notes: Array<{ text: string; kind: string }> = [];
    bus.on('ui:notify', (p) => notes.push(p));
    const raw = JSON.stringify({ ...createNewGame('Fut', 1), version: SAVE_VERSION + 1 });
    storage.map.set(slotKey(1), raw);
    expect(load()).toBeNull();
    expect(storage.map.get(slotKey(1))).toBe(raw);
    expect(storage.map.has(CORRUPT_KEY)).toBe(false);
    expect(notes[0].kind).toBe('danger');
    expect(notes[0].text).toMatch(/newer version/i);
  });

  it('the legacy single save appears in slot 1, then the legacy key is removed', () => {
    const s = createNewGame('Legacy', 3);
    const raw = JSON.stringify(s);
    storage.map.set(SAVE_KEY, raw);
    const sums = getSlotSummaries();
    expect(sums[0]).toMatchObject({ slot: 1, status: 'ok', clubName: 'Legacy' });
    expect(sums[1].status).toBe('empty');
    expect(sums[2].status).toBe('empty');
    expect(storage.map.get(slotKey(1))).toBe(raw);
    expect(storage.map.has(SAVE_KEY)).toBe(false);
    expect(load()).toEqual({ ...s, version: SAVE_VERSION });
  });

  it('keeps the legacy key when the slot write fails, and still shows it in slot 1', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = JSON.stringify(createNewGame('Keep', 3));
    storage.map.set(SAVE_KEY, raw);
    const failing: StorageLike = {
      getItem: (k) => storage.getItem(k),
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
      removeItem: (k) => storage.removeItem(k),
    };
    __setStorage(failing);
    expect(getSlotSummaries()[0]).toMatchObject({ status: 'ok', clubName: 'Keep' });
    expect(storage.map.get(SAVE_KEY)).toBe(raw);
    expect(load()).not.toBeNull();
  });

  it('never overwrites an occupied slot 1 with the legacy save', () => {
    const slot1 = JSON.stringify(createNewGame('Slot1', 1));
    const legacy = JSON.stringify({ ...createNewGame('Legacy', 2), version: 1 });
    storage.map.set(slotKey(1), slot1);
    storage.map.set(SAVE_KEY, legacy);
    getSlotSummaries();
    expect(storage.map.get(slotKey(1))).toBe(slot1);
    expect(storage.map.get(SAVE_KEY)).toBe(legacy);
  });
});

describe('slots', () => {
  it('saves to the active slot independently', () => {
    save(createNewGame('A', 1));
    setActiveSlot(2);
    save(createNewGame('B', 2));
    expect(getSlotSummaries().map((s) => s.clubName)).toEqual(['A', 'B', undefined]);
    expect(load()!.clubName).toBe('B');
    setActiveSlot(1);
    expect(load()!.clubName).toBe('A');
  });

  it('deleteSlot clears only that slot', () => {
    save(createNewGame('A', 1));
    setActiveSlot(3);
    save(createNewGame('C', 3));
    deleteSlot(3);
    expect(hasSave(3)).toBe(false);
    expect(hasSave(1)).toBe(true);
  });

  it('rejects out-of-range slots', () => {
    expect(() => setActiveSlot(0)).toThrow();
    expect(() => setActiveSlot(4)).toThrow();
  });
});

describe('export / import', () => {
  it('export then import round-trips to an identical state', () => {
    const s = createNewGame('Round', 99);
    const res = importSave(exportSave(s));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state).toEqual(s);
  });

  it('import rejects garbage, wrong shape and future versions without writing', () => {
    expect(importSave('not json').ok).toBe(false);
    expect(importSave('{"version":1}').ok).toBe(false);
    const fut = importSave(JSON.stringify({ ...createNewGame('F', 1), version: 99 }));
    expect(fut.ok).toBe(false);
    if (!fut.ok) expect(fut.message).toMatch(/newer version/i);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(importIntoSlot('not json', 2)).toBeNull();
    expect(storage.map.has(slotKey(2))).toBe(false);
  });

  it('importIntoSlot writes a current state to the slot', () => {
    const s = createNewGame('Imp', 5);
    const out = importIntoSlot(JSON.stringify(s), 2);
    expect(out).toEqual(s);
    setActiveSlot(2);
    expect(load()).toEqual(s);
  });
});

describe('title flow new-game options', () => {
  beforeEach(() => {
    (globalThis as unknown as { document: { createElement(t: string): StubEl } }).document = {
      createElement: (t: string) => makeStubEl(t),
    };
  });
  afterEach(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it('returns the picked colours and difficulty', async () => {
    clearSave();
    const root = makeStubEl('div');
    const p: Promise<TitleChoice> = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-primary="#c0392b"]')!.click();
    root.querySelector('[data-nrl-difficulty-hard]')!.click();
    root.querySelector('[data-nrl-start]')!.click();
    const choice = await p;
    expect(choice.difficulty).toBe('hard');
    expect(choice.colors?.[0]).toBe('#c0392b');
    expect(isValidColorPair(choice.colors![0], choice.colors![1])).toBe(true);
  });

  it('defaults to Normal and the default kit', async () => {
    clearSave();
    const root = makeStubEl('div');
    const p: Promise<TitleChoice> = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-start]')!.click();
    expect(await p).toMatchObject({ difficulty: 'normal', colors: DEFAULT_PLAYER_COLORS });
  });
});

describe('title flow slots', () => {
  beforeEach(() => {
    (globalThis as unknown as { document: { createElement(t: string): StubEl } }).document = {
      createElement: (t: string) => makeStubEl(t),
    };
  });
  afterEach(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it('shows three slots; Continue on slot 2 makes it the active slot', async () => {
    save(createNewGame('One', 1));
    setActiveSlot(2);
    save(createNewGame('Two', 2));
    setActiveSlot(1);
    const root = makeStubEl('div');
    const p = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    for (const n of [1, 2, 3]) expect(root.querySelector(`[data-nrl-slot-${n}]`)).not.toBeNull();
    expect(root.querySelector('[data-nrl-continue-3]')).toBeNull();
    root.querySelector('[data-nrl-continue-2]')!.click();
    expect(await p).toEqual({ mode: 'continue' });
    expect(load()!.clubName).toBe('Two');
  });

  it('New Game on an empty slot targets that slot', async () => {
    save(createNewGame('One', 1));
    const root = makeStubEl('div');
    const p = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-new-3]')!.click();
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-clubname]')!.value = 'Third';
    root.querySelector('[data-nrl-start]')!.click();
    expect(await p).toMatchObject({ mode: 'new', clubName: 'Third' });
    save(createNewGame('Third', 3));
    expect(hasSave(3)).toBe(true);
  });

  it('Delete needs a second click and then empties the slot', () => {
    save(createNewGame('One', 1));
    const root = makeStubEl('div');
    void showTitleFlow(root as unknown as HTMLElement);
    root.querySelector('[data-nrl-delete-1]')!.click();
    expect(hasSave(1)).toBe(true);
    root.querySelector('[data-nrl-delete-1]')!.click();
    expect(hasSave(1)).toBe(false);
    expect(root.querySelector('[data-nrl-delete-1]')).toBeNull();
  });

  it('a rejected slot stays visible with raw recovery and requires confirmation before Start over', async () => {
    const raw = 'original rejected bytes';
    storage.map.set(slotKey(1), raw);
    const root = makeStubEl('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    expect(root.querySelector('[data-nrl-slot-label-1]')!.textContent).toBe('Unreadable save');
    expect(root.querySelector('[data-nrl-recover-1]')).not.toBeNull();
    expect(root.querySelector('[data-nrl-continue-1]')).toBeNull();
    root.querySelector('[data-nrl-new-1]')!.click();
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-start]')!.click();
    expect(storage.map.get(slotKey(1))).toBe(raw);
    root.querySelector('[data-nrl-start-confirm]')!.click();
    expect((await result).mode).toBe('new');
    expect(hasSave(1)).toBe(false);
    save(createNewGame('Deliberate replacement', 522));
    expect(load()?.clubName).toBe('Deliberate replacement');
  });

  it('a future-version slot offers Delete but not Continue or New', () => {
    storage.map.set(slotKey(1), JSON.stringify({ ...createNewGame('F', 1), version: 99 }));
    const root = makeStubEl('div');
    void showTitleFlow(root as unknown as HTMLElement);
    expect(root.querySelector('[data-nrl-continue-1]')).toBeNull();
    expect(root.querySelector('[data-nrl-new-1]')).toBeNull();
    expect(root.querySelector('[data-nrl-recover-1]')).not.toBeNull();
    expect(root.querySelector('[data-nrl-delete-1]')).not.toBeNull();
  });
});
