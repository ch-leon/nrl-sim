// #610: a list that ended on a whole row looked complete (192px of a 900px squad:
// four rows, and a phone draws no scrollbar until a finger moves). hintScroll in
// ui/dom.ts puts a class on the list while there is more below, and the
// stylesheet fades its foot. What the fade looks like is checked in the browser;
// this pins when the class is on, on a stand-in list (vitest env is 'node': no
// layout, no ResizeObserver, no MutationObserver unless the test supplies one).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSS, SCROLL_MORE_CLASS, hintScroll, moreBelow } from '../../src/ui/dom';

/** A list 192px tall holding `scrollHeight` of rows, with the listeners hintScroll gave it. */
function list(scrollHeight: number): {
  box: HTMLElement; set: (p: Partial<{ scrollTop: number; clientHeight: number; scrollHeight: number }>) => void;
  on: () => boolean; scroll: () => void; listening: () => boolean; passive: () => boolean | undefined;
} {
  const names = new Set<string>();
  const listeners = new Map<string, () => void>();
  let options: AddEventListenerOptions | undefined;
  const box = {
    scrollTop: 0, clientHeight: 192, scrollHeight,
    classList: {
      toggle: (name: string, force: boolean) => { if (force) names.add(name); else names.delete(name); return force; },
      remove: (name: string) => { names.delete(name); },
    },
    addEventListener: (type: string, fn: () => void, opts?: AddEventListenerOptions) => { listeners.set(type, fn); options = opts; },
    removeEventListener: (type: string, fn: () => void) => { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  return {
    box: box as unknown as HTMLElement,
    set: (p) => { Object.assign(box, p); },
    on: () => names.has(SCROLL_MORE_CLASS),
    scroll: () => listeners.get('scroll')?.(),
    listening: () => listeners.has('scroll'),
    passive: () => options?.passive,
  };
}

// hintScroll keeps one ResizeObserver for every list (as watchSeg does), made the first time
// one is there to make: so the stand-in's record is the file's, not a test's.
const sized = { fn: (_entries: { target: unknown }[]): void => {}, boxes: new Set<unknown>() };

/** Observers the test fires by hand: resize(box) is that box changing size, mutate() its rows or its class and style changing. */
function stubObservers(): { resize: (box: unknown) => void; mutate: () => void; watching: () => MutationObserverInit | undefined; mutationLive: () => number } {
  let mutate = (): void => {};
  let init: MutationObserverInit | undefined;
  let live = 0;
  vi.stubGlobal('ResizeObserver', class {
    constructor(fn: (entries: { target: unknown }[]) => void) { sized.fn = fn; }
    observe(box: unknown): void { sized.boxes.add(box); }
    unobserve(box: unknown): void { sized.boxes.delete(box); }
  });
  vi.stubGlobal('MutationObserver', class {
    constructor(fn: () => void) { mutate = fn; }
    observe(_node: unknown, opts: MutationObserverInit): void { init = opts; live++; }
    disconnect(): void { live--; }
  });
  return { resize: (box) => { if (sized.boxes.has(box)) sized.fn([{ target: box }]); }, mutate: () => mutate(), watching: () => init, mutationLive: () => live };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('moreBelow (#610)', () => {
  it('is true while rows wait under the foot, and false at the end or when the list fits', () => {
    expect(moreBelow({ scrollTop: 0, clientHeight: 192, scrollHeight: 900 })).toBe(true);
    expect(moreBelow({ scrollTop: 400, clientHeight: 192, scrollHeight: 900 })).toBe(true);
    expect(moreBelow({ scrollTop: 708, clientHeight: 192, scrollHeight: 900 })).toBe(false);
    expect(moreBelow({ scrollTop: 0, clientHeight: 192, scrollHeight: 192 })).toBe(false); // a three-man squad
  });

  it('gives a pixel of slack: a scroll that stops half a pixel short is the end', () => {
    expect(moreBelow({ scrollTop: 707.5, clientHeight: 192, scrollHeight: 900 })).toBe(false);
    expect(moreBelow({ scrollTop: 706, clientHeight: 192, scrollHeight: 900 })).toBe(true);
  });
});

describe('hintScroll (#610)', () => {
  it('marks a list with more below as it is set up, and leaves one that fits alone', () => {
    const long = list(900);
    hintScroll(long.box);
    expect(long.on()).toBe(true);
    const short = list(192);
    hintScroll(short.box);
    expect(short.on()).toBe(false);
  });

  it('follows the scroll: off at the end, on again a row back up; the listener is passive', () => {
    const l = list(900);
    hintScroll(l.box);
    expect(l.passive()).toBe(true);
    l.set({ scrollTop: 708 });
    l.scroll();
    expect(l.on()).toBe(false);
    l.set({ scrollTop: 663 });
    l.scroll();
    expect(l.on()).toBe(true);
  });

  it('works where there is no ResizeObserver or MutationObserver (the stub DOM): set up, and on a scroll', () => {
    expect(typeof ResizeObserver).toBe('undefined');
    expect(typeof MutationObserver).toBe('undefined');
    const l = list(900);
    const off = hintScroll(l.box);
    expect(l.on()).toBe(true);
    off();
    expect(l.on()).toBe(false);
  });

  it('looks again when the box changes size: a hint closed over the sheet gives the list room for all of it', () => {
    const o = stubObservers();
    const l = list(230);
    hintScroll(l.box);
    expect(l.on()).toBe(true);
    l.set({ clientHeight: 230 });
    o.resize(l.box);
    expect(l.on()).toBe(false);
  });

  it('one size observer serves every list, and is told which list changed', () => {
    const o = stubObservers();
    const squad = list(900);
    const ladder = list(729);
    hintScroll(squad.box);
    hintScroll(ladder.box);
    squad.set({ scrollHeight: 135 });
    ladder.set({ scrollHeight: 100 });
    o.resize(ladder.box);
    expect(ladder.on()).toBe(false);
    expect(squad.on()).toBe(true); // not looked at: its box did not change
  });

  it('looks again when the rows are redrawn or a toast reserves room at the foot (class and style on the list itself)', () => {
    const o = stubObservers();
    const l = list(900);
    hintScroll(l.box);
    expect(o.watching()).toEqual({ childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    // Sold down to three: the list fits.
    l.set({ scrollHeight: 135 });
    o.mutate();
    expect(l.on()).toBe(false);
    // At the end of twenty, then a toast's reserve adds 39px under the last row.
    l.set({ scrollHeight: 900, scrollTop: 708 });
    o.mutate();
    expect(l.on()).toBe(false);
    l.set({ scrollHeight: 939 });
    o.mutate();
    expect(l.on()).toBe(true);
  });

  it('comes off whole: the class, the listener and both observers', () => {
    const o = stubObservers();
    const l = list(900);
    const off = hintScroll(l.box);
    expect(sized.boxes.has(l.box)).toBe(true);
    expect(o.mutationLive()).toBe(1);
    off();
    expect(l.on()).toBe(false);
    expect(l.listening()).toBe(false);
    expect(sized.boxes.has(l.box)).toBe(false);
    expect(o.mutationLive()).toBe(0);
    // A size change after that is not its business.
    l.set({ scrollHeight: 900 });
    o.resize(l.box);
    expect(l.on()).toBe(false);
  });
});

describe('the fade (#610)', () => {
  const rule = CSS.slice(CSS.indexOf(`.${SCROLL_MORE_CLASS} {`), CSS.indexOf('}', CSS.indexOf(`.${SCROLL_MORE_CLASS} {`)));

  it('masks the foot only: opaque down to the fade, for Safari (-webkit-) and the rest', () => {
    const fade = 'linear-gradient(to bottom, #000 calc(100% - min(var(--nrl-scroll-fade, 44px), 30%)), transparent)';
    expect(rule).toContain(`-webkit-mask-image: ${fade};`);
    expect(rule).toContain(`mask-image: ${fade};`);
  });

  it('is a still cue: nothing animates it', () => {
    expect(rule).not.toMatch(/transition|animation/);
  });
});
