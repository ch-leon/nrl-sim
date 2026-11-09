import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  save, load, clearSave, hasSave, enableAutosave,
  SAVE_KEY, CORRUPT_KEY, __setStorage, slotKey, setActiveSlot, getSlotSummaries, deleteSlot,
  migrateState, exportSave, importSave, importIntoSlot, MIGRATIONS,
  type StorageLike,
} from '../../src/core/save';
import { showTitleFlow, type TitleChoice } from '../../src/ui/title';
import { createNewGame, getState, SAVE_VERSION, type GameState, type SeasonFinance, emptyFinance } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { DEFAULT_PLAYER_COLORS, isValidColorPair } from '../../src/config';
import { autoPick } from '../../src/systems/lineup';

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
  const v1 = (): Record<string, unknown> => ({ ...createNewGame('Old', 7), version: 1 });

  it('a v1 save loads unchanged apart from the version stamp and default difficulty', () => {
    const old = v1();
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state).toMatchObject({
        clubName: 'Old',
        version: SAVE_VERSION,
        settings: { ...(old.settings as object), difficulty: 'normal' },
      });
    }
  });

  it('a v2 save (no settings.difficulty) loads as Normal and keeps its other settings', () => {
    const { difficulty: _drop, ...settings } = createNewGame('V2', 3).settings;
    const old = { ...createNewGame('V2', 3), version: 2, settings: { ...settings, volume: 0.3 } };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.settings.difficulty).toBe('normal');
      expect(res.state.settings.volume).toBe(0.3);
      expect(res.state.version).toBe(SAVE_VERSION);
    }
    expect('difficulty' in old.settings).toBe(false);
  });

  it('a v4 save gains default board patience and objectives for the current season', () => {
    const { boardPatience: _b, objectives: _o, ...base } = createNewGame('V4', 5);
    const old = { ...base, version: 4, season: 3 };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.boardPatience).toBe(5);
      expect(res.state.objectives.map((o) => o.kind)).toEqual(['finals', 'solvent']);
      expect(res.state.objectives.every((o) => o.status === 'pending' && o.id.startsWith('s3-'))).toBe(true);
    }
    expect(old).not.toHaveProperty('boardPatience');
  });

  it('a v3 save gains empty tallies, join season and extended history', () => {
    const base = createNewGame('V3', 5);
    const old = {
      ...base, version: 3, season: 4,
      squad: base.squad.map(({ career: _c, joinedSeason: _j, ...p }) => p),
      freeAgents: [],
      history: [{ season: 3, ladderPosition: 2, premiership: false }],
    };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      for (const p of res.state.squad) {
        expect(p.career).toEqual({ games: 0, tries: 0, tackles: 0, lineBreaks: 0 });
        expect(p.joinedSeason).toBe(4);
      }
      expect(res.state.history[0]).toEqual({
        season: 3, ladderPosition: 2, premiership: false,
        wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0,
      });
    }
    expect(old.squad[0]).not.toHaveProperty('career');
  });

  it('a v5 save turns string traits into levelled instances (hardMan → hitman, junk dropped)', () => {
    const base = createNewGame('V5', 5);
    const old = {
      ...base, version: 5,
      squad: base.squad.map((p, i) => ({ ...p, traits: i === 0 ? ['finisher', 'hardMan', 'bogus'] : i === 1 ? [] : ['veteran'] })),
      freeAgents: base.freeAgents.map((p) => ({ ...p, traits: ['playmaker', 'playmaker'] })),
    };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.squad[0]!.traits).toEqual([{ id: 'finisher', level: 1 }, { id: 'hitman', level: 1 }]);
      expect(res.state.squad[1]!.traits).toEqual([]);
      expect(res.state.squad[2]!.traits).toEqual([{ id: 'veteran', level: 1 }]);
      expect(res.state.freeAgents[0]!.traits).toEqual([{ id: 'playmaker', level: 1 }]);
    }
    expect(old.squad[0]!.traits).toEqual(['finisher', 'hardMan', 'bogus']);
  });

  it('a v6 save gains an empty events deck seeded from its rngSeed (#75)', () => {
    const base = createNewGame('V6', 6);
    const { eventDeck: _drop, ...rest } = base;
    const old = { ...rest, version: 6 };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.eventDeck).toEqual({
        rng: (base.rngSeed ^ 0x9e3779b9) >>> 0, pending: [], cooldowns: {}, lastDrawn: 0, modifiers: [], flags: [],
      });
    }
    expect('eventDeck' in old).toBe(false);
  });

  it('keeps pending events, modifiers and cooldowns through a save round-trip (#75)', () => {
    const base = createNewGame('Deck', 9);
    const eventDeck = {
      rng: 123, lastDrawn: 5, cooldowns: { fanDay: 21 },
      pending: [{ id: 'fanDay-s1w5', cardId: 'fanDay', season: 1, week: 5, expiresAt: 7 }],
      modifiers: [{ id: 'm', cardId: 'merchDeal', label: 'Merch royalties', trigger: 'weekly' as const, weeksLeft: 3, effects: [{ kind: 'money' as const, amount: 1500 }] }],
      flags: [],
    };
    save({ ...base, eventDeck });
    expect(load()?.eventDeck).toEqual(eventDeck);
  });

  it('a v7 save gains rival squads matching each rival\'s strength (#74)', async () => {
    const { initLeague } = await import('../../src/systems/fixtures');
    const { squadStrength } = await import('../../src/systems/rivals');
    createNewGame('V7', 7);
    const base = getState();
    initLeague(base);
    const withLeague = getState();
    const old = {
      ...withLeague, version: 7,
      league: { ...withLeague.league, clubs: withLeague.league.clubs.map(({ squad: _s, ...c }) => c) },
    };
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      const [player, ...rivals] = res.state.league.clubs;
      expect(player!.squad).toBeUndefined();
      rivals.forEach((c, i) => {
        expect(c.squad!.length).toBeGreaterThanOrEqual(18);
        expect(c.strength).toBe(squadStrength(c.squad!));
        expect(Math.abs(c.strength - old.league.clubs[i + 1]!.strength)).toBeLessThanOrEqual(2);
      });
      // Same save, same squads.
      const again = migrateState(old);
      expect(again.ok && again.state.league.clubs).toEqual(res.state.league.clubs);
    }
    expect(old.league.clubs.every((c) => !('squad' in c))).toBe(true);
  });

  it('a v8 save loads with no kit design, keeping its current look (#79)', () => {
    const base = createNewGame('V8', 8);
    const { kit: _k, ...rest } = base;
    const res = migrateState({ ...rest, version: 8 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.kit).toBeUndefined();
    }
    const designed = { ...base, kit: { pattern: 'stripes' as const, trim: '#ffffff', alt: { jersey: '#ffffff', trim: '#1a1a2e', pattern: 'v' as const } } };
    save(designed);
    expect(load()?.kit).toEqual(designed.kit);
  });

  it('a v9 save gains empty books for the season it is in (#172)', () => {
    const base = createNewGame('V9', 9);
    const { finance: _f, ...rest } = base;
    const res = migrateState({ ...rest, version: 9, season: 3 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.finance).toEqual([emptyFinance(3)]);
    }
    // A current save keeps its books as they are.
    const booked = { ...base, finance: [{ ...emptyFinance(1), gate: 24_000, wages: -18_000 }] };
    save(booked);
    expect(load()?.finance).toEqual(booked.finance);
  });

  it('a v10 save gains today’s auto-picked lineup (#69)', () => {
    const base = createNewGame('V10', 10);
    const { lineup: _l, ...rest } = base;
    const res = migrateState({ ...rest, version: 10 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.lineup).toEqual(autoPick(base.squad));
      expect(res.state.lineup.starters.every((id) => id !== null)).toBe(true);
    }
    // A current save keeps the coach's picks as they are.
    const picked = { ...base, lineup: { ...base.lineup, rotation: 'heavy' as const, starters: [...base.lineup.starters].reverse() } };
    save(picked);
    expect(load()?.lineup).toEqual(picked.lineup);
  });

  it('a v12 save loads with rival matches on the cheap sim (N9.2), and the setting saves', () => {
    const base = createNewGame('V12', 12);
    const res = migrateState({ ...base, version: 12 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.settings.liveRivals).toBeUndefined();
    }
    const on = { ...base, settings: { ...base.settings, liveRivals: true } };
    save(on);
    expect(load()?.settings.liveRivals).toBe(true);
  });

  it('a v11 save loads with no season reviews and no award tally yet (#190)', () => {
    const base = createNewGame('V11', 11);
    const played = {
      ...base,
      version: 11,
      history: [{ season: 1, ladderPosition: 4, premiership: false, wins: 14, losses: 9, draws: 1, pointsFor: 480, pointsAgainst: 400 }],
    };
    const res = migrateState(played);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.history[0]).toEqual(played.history[0]);
      expect(res.state.history[0]?.review).toBeUndefined();
      expect(res.state.potmTally).toBeUndefined();
    }
    // A current save keeps its review and tally as they are.
    const reviewed = {
      ...base,
      history: [{ season: 1, ladderPosition: 2, premiership: true, review: { juniors: 3, reputation: { from: 30, to: 49 } } }],
      potmTally: { season: 2, counts: { 'Zeke Leilua': 2 } },
    };
    save(reviewed);
    expect(load()?.history[0]?.review).toEqual(reviewed.history[0]!.review);
    expect(load()?.potmTally).toEqual(reviewed.potmTally);
  });

  it('a v16 save gets a Running costs line of 0 on every season it has booked (N12.3)', () => {
    const base = createNewGame('V16', 16);
    const strip = ({ overhead: _o, ...lines }: SeasonFinance): Omit<SeasonFinance, 'overhead'> => lines;
    const books = [
      { ...emptyFinance(1), wages: -480_000, gate: 330_000, upkeep: -2_000 },
      { ...emptyFinance(2), wages: -410_000, gate: 390_000, prize: 15_000 },
      { ...emptyFinance(3), wages: -18_000 },
    ];
    const old = { ...base, version: 16, season: 3, finance: books.map(strip) };
    expect(old.finance.every((e) => !('overhead' in e))).toBe(true);
    const res = migrateState(old);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.version).toBe(SAVE_VERSION);
      expect(res.state.finance).toEqual(books.map((e) => ({ ...e, overhead: 0 })));
    }
    // A v14 save (before N11's kicker, captain and training focus) gets the same books on the way up.
    const v14 = migrateState({ ...old, version: 14 });
    expect(v14.ok && v14.state.finance).toEqual(books.map((e) => ({ ...e, overhead: 0 })));
    expect(old.finance.every((e) => !('overhead' in e))).toBe(true); // the input is untouched
    // A current save keeps its running costs as they are.
    const booked = { ...base, finance: [{ ...emptyFinance(1), wages: -18_000, overhead: -4_500 }] };
    save(booked);
    expect(load()?.finance).toEqual(booked.finance);
  });

  it('does not mutate its input', () => {
    const old = v1();
    const copy = JSON.parse(JSON.stringify(old));
    migrateState(old);
    expect(old).toEqual(copy);
  });

  it('steps are contiguous and end at SAVE_VERSION', () => {
    MIGRATIONS.forEach((m, i) => {
      expect(m.to).toBe(m.from + 1);
      if (i > 0) expect(m.from).toBe(MIGRATIONS[i - 1].to);
    });
    expect(MIGRATIONS[MIGRATIONS.length - 1].to).toBe(SAVE_VERSION);
  });

  it('refuses a future version with a clear message', () => {
    const res = migrateState({ ...createNewGame('F', 1), version: SAVE_VERSION + 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('future');
      expect(res.message).toMatch(/newer version/i);
    }
  });

  it('rejects structurally invalid saves as corrupt', () => {
    for (const bad of [null, 42, [], { version: 1 }, { ...v1(), squad: 'x' }]) {
      const res = migrateState(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe('corrupt');
    }
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
    const raw = JSON.stringify({ ...s, version: 1 });
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
    const raw = JSON.stringify({ ...createNewGame('Keep', 3), version: 1 });
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

  it('importIntoSlot writes a migrated state to the slot', () => {
    const s = createNewGame('Imp', 5);
    const out = importIntoSlot(JSON.stringify({ ...s, version: 1 }), 2);
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
