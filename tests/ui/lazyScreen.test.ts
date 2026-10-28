// tests/ui/lazyScreen.test.ts — screens in their own chunks (#400): the opener's
// timing and give-up rules with a fake clock and slot, then the real chunks
// (the Guide in the stand-in DOM, the Match Lab's boot) resolving through it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LOADING_DELAY_MS, closeLoading, lazyOpener, screenDeps, type LazyDeps } from '../../src/ui/lazyScreen';
import { activeScreen, closeScreen } from '../../src/ui/dom';
import { StubNode } from './stubDom';

/** A fake screen slot and a fake clock (vi's timers). */
function fakeDeps(): LazyDeps & { slot: { open: unknown }; loadings: number } {
  const d = {
    slot: { open: null as unknown },
    loadings: 0,
    current: () => d.slot.open,
    loading: () => {
      d.loadings++;
      d.slot.open = 'loading';
      return d.slot.open;
    },
    setTimer: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimer: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
  return d;
}

/** A load that resolves (or fails) when the test says. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('lazyOpener', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a chunk that arrives inside 150 ms opens with no loading state in between', async () => {
    const deps = fakeDeps();
    const opened: string[] = [];
    const chunk = deferred<{ id: string }>();
    const open = lazyOpener(() => chunk.promise, (m) => opened.push(m.id), deps);
    const done = open();
    await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS - 1);
    chunk.resolve({ id: 'guide' });
    await done;
    await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS);
    expect(LOADING_DELAY_MS).toBe(150);
    expect(deps.loadings).toBe(0);
    expect(opened).toEqual(['guide']);
  });

  it('a slow chunk shows the loading state at 150 ms, then opens over it', async () => {
    const deps = fakeDeps();
    const opened: string[] = [];
    const chunk = deferred<{ id: string }>();
    const open = lazyOpener(() => chunk.promise, (m) => opened.push(m.id), deps);
    const done = open();
    await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS);
    expect(deps.loadings).toBe(1);
    expect(opened).toEqual([]);
    chunk.resolve({ id: 'guide' });
    await done;
    expect(opened).toEqual(['guide']);
  });

  it('once loaded, every later open is immediate and loads nothing', async () => {
    const deps = fakeDeps();
    let opens = 0;
    const load = vi.fn(async () => ({}));
    const open = lazyOpener(load, () => opens++, deps);
    await open();
    void open(); // not awaited: it must already have opened
    expect(opens).toBe(2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a player who moved on while it loaded is left where they are; the chunk is kept for next time', async () => {
    const deps = fakeDeps();
    let opens = 0;
    const chunk = deferred<object>();
    const load = vi.fn(() => chunk.promise);
    const open = lazyOpener(load, () => opens++, deps);
    const done = open();
    deps.slot.open = 'squad'; // tapped Squad before the Guide arrived
    chunk.resolve({});
    await done;
    expect(opens).toBe(0);
    await open();
    expect(opens).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('closing the loading state (back to the club) gives the open up too', async () => {
    const deps = fakeDeps();
    let opens = 0;
    const chunk = deferred<object>();
    const open = lazyOpener(() => chunk.promise, () => opens++, deps);
    const done = open();
    await vi.advanceTimersByTimeAsync(LOADING_DELAY_MS);
    deps.slot.open = null;
    chunk.resolve({});
    await done;
    expect(opens).toBe(0);
  });

  it('a second tap while loading supersedes the first: one open, one load', async () => {
    const deps = fakeDeps();
    let opens = 0;
    const chunk = deferred<object>();
    const load = vi.fn(() => chunk.promise);
    const open = lazyOpener(load, () => opens++, deps);
    const first = open();
    const second = open();
    chunk.resolve({});
    await Promise.all([first, second]);
    expect(opens).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a failed fetch reports once and the next tap fetches again', async () => {
    const deps = fakeDeps();
    const failed = vi.fn();
    let opens = 0;
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    const open = lazyOpener(load, () => opens++, deps, failed);
    await open();
    expect(failed).toHaveBeenCalledTimes(1);
    expect(opens).toBe(0);
    await open();
    expect(load).toHaveBeenCalledTimes(2);
    expect(opens).toBe(1);
  });
});

// ── The real chunks ──────────────────────────────────────────────────────────

/** The stand-in DOM plus what dom.ts's screen slot needs: ids, head/body, classList, remove(). */
class SlotNode extends StubNode {
  classList = { add: (c: string) => { this.className = `${this.className} ${c}`.trim(); } };
  remove(): void { this.parentNode?.removeChild(this); }
  /** Also `.class` (the Guide marks its selected tab across `.nrl-btn`). */
  override querySelectorAll(sel: string): StubNode[] {
    if (!sel.startsWith('.')) return super.querySelectorAll(sel);
    return this.all().filter((n) => n.className.split(' ').includes(sel.slice(1)));
  }
}

function stubSlotDocument(): SlotNode {
  const head = new SlotNode('head');
  const body = new SlotNode('body');
  const find = (id: string): SlotNode | null => ([head, body, ...head.all(), ...body.all()] as SlotNode[]).find((n) => n.id === id) ?? null;
  vi.stubGlobal('document', {
    head,
    body,
    getElementById: find,
    createElement: (tag: string) => new SlotNode(tag),
    createTextNode: (text: string) => new SlotNode('#text', text),
  });
  return body;
}

describe('the lazy screens resolve and render (#400)', () => {
  afterEach(() => {
    closeScreen();
    vi.unstubAllGlobals();
  });

  it('the Guide: its chunk loads through the opener and its sheet opens, keyed help', async () => {
    const body = stubSlotDocument();
    const open = lazyOpener(() => import('../../src/ui/guide/guide'), (m) => void m.openGuideScreen(), screenDeps('Guide', { key: 'help', class: 'nrl-guide-modal' }));
    await open();
    const screen = activeScreen() as unknown as SlotNode;
    expect(screen).not.toBeNull();
    expect(screen.getAttribute('data-screen-key')).toBe('help');
    expect(screen.querySelector('[data-guide]')).not.toBeNull();
    expect(screen.querySelectorAll('[data-guide-tab]').length).toBeGreaterThan(1);
    expect(body.all()).toContain(screen);
  });

  it('the loading state is the screen\'s title and "Loading…" in its own slot, closed by closeLoading', () => {
    stubSlotDocument();
    const placeholder = screenDeps('Guide', { key: 'help', class: 'nrl-guide-modal' }).loading() as SlotNode;
    expect(placeholder).toBe(activeScreen());
    expect(placeholder.getAttribute('data-screen-key')).toBe('help');
    expect(placeholder.querySelector('[data-lazy-loading="help"]')).not.toBeNull();
    expect(placeholder.words()).toContain('Guide');
    expect(placeholder.words()).toContain('Loading…');
    closeLoading('help');
    expect(activeScreen()).toBeNull();
  });

  it('the Match Lab: its boot chunk resolves to bootLab', async () => {
    // Phaser needs a browser; the chunk's own modules only define classes on it at load.
    vi.doMock('phaser', () => ({ default: { Scene: class {}, Game: class {} } }));
    const lab = await import('../../src/match/lab/boot');
    expect(typeof lab.bootLab).toBe('function');
    vi.doUnmock('phaser');
  });
});
