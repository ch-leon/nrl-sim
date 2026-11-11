// #598: a double tap acted twice. A tap that signs or hires redraws the list, a
// different action then sits under the finger, and the second tap fired it. The
// guard (guardDoubleTap in ui/dom.ts) drops a repeat only when the content changed
// under the finger. The four screens are checked in the browser; this pins the
// rule on a stand-in container (vitest env is 'node': no DOM, no MutationObserver).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOUBLE_TAP, guardDoubleTap } from '../../src/ui/dom';

type Tap = { t: number; x?: number; y?: number; target?: { isConnected: boolean }; detail?: number };

/** A guarded container: tap() sends one click through the guard and says whether it got through. */
function guarded(): { tap: (c: Tap) => boolean; capture: boolean | undefined } {
  let listener: (e: MouseEvent) => void = () => {};
  let capture: boolean | undefined;
  const container = {
    addEventListener: (type: string, fn: (e: MouseEvent) => void, useCapture?: boolean) => {
      expect(type).toBe('click');
      listener = fn;
      capture = useCapture;
    },
  };
  guardDoubleTap(container as unknown as HTMLElement);
  return {
    get capture() { return capture; },
    tap: ({ t, x = 100, y = 100, target = { isConnected: true }, detail = 1 }) => {
      const e = { detail, timeStamp: t, clientX: x, clientY: y, target, preventDefault: vi.fn(), stopPropagation: vi.fn() };
      listener(e as unknown as MouseEvent);
      expect(e.preventDefault.mock.calls.length).toBe(e.stopPropagation.mock.calls.length);
      return e.stopPropagation.mock.calls.length === 0;
    },
  };
}

/** A MutationObserver the test feeds: note() is the container's content changing. */
function stubObserver(): { note: () => void; watching: () => MutationObserverInit | undefined } {
  let pending = 0;
  let init: MutationObserverInit | undefined;
  vi.stubGlobal('MutationObserver', class {
    observe(_node: unknown, opts: MutationObserverInit): void { init = opts; }
    takeRecords(): unknown[] { const n = pending; pending = 0; return Array.from({ length: n }); }
  });
  return { note: () => { pending++; }, watching: () => init };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('guardDoubleTap (#598)', () => {
  it('listens in the capture phase, ahead of the button it guards', () => {
    expect(guarded().capture).toBe(true);
  });

  it('lets the first click through, and drops the repeat once a redraw replaced the tapped button', () => {
    const g = guarded();
    const sign = { isConnected: true };
    expect(g.tap({ t: 1000, target: sign })).toBe(true);
    sign.isConnected = false; // the list was redrawn: the next man's SIGN is under the finger
    expect(g.tap({ t: 1180, target: { isConnected: true } })).toBe(false);
  });

  it('drops the repeat when the same button was rewritten in place (Hire became Release)', () => {
    const o = stubObserver();
    const g = guarded();
    expect(o.watching()).toEqual({ childList: true, characterData: true, subtree: true });
    const button = { isConnected: true };
    expect(g.tap({ t: 1000, target: button })).toBe(true);
    o.note();
    expect(g.tap({ t: 1180, target: button })).toBe(false);
  });

  it('lets a repeat through when nothing changed under the finger', () => {
    const o = stubObserver();
    const g = guarded();
    const chip = { isConnected: true };
    o.note(); // a change before the first tap is not one since it
    expect(g.tap({ t: 1000, target: chip })).toBe(true);
    expect(g.tap({ t: 1180, target: chip })).toBe(true);
    expect(g.tap({ t: 1300, target: chip })).toBe(true);
  });

  it('lets a deliberate second tap through: later than the window, or somewhere else', () => {
    const g = guarded();
    const gone = (): { isConnected: boolean } => ({ isConnected: false });
    expect(g.tap({ t: 1000, target: gone() })).toBe(true);
    expect(g.tap({ t: 1000 + DOUBLE_TAP.ms, target: gone() })).toBe(true); // a second signing a moment later
    expect(g.tap({ t: 1500, x: 100 + DOUBLE_TAP.px + 1, target: gone() })).toBe(true); // another row
    expect(g.tap({ t: 1600, x: 100 + DOUBLE_TAP.px + 1, y: 100 + DOUBLE_TAP.px, target: gone() })).toBe(false); // back inside both
  });

  it('a dropped click does not restart the window', () => {
    const g = guarded();
    const gone = (): { isConnected: boolean } => ({ isConnected: false });
    expect(g.tap({ t: 1000, target: gone() })).toBe(true);
    expect(g.tap({ t: 1180, target: gone() })).toBe(false);
    expect(g.tap({ t: 1360, target: gone() })).toBe(false);
    expect(g.tap({ t: 1420, target: gone() })).toBe(true); // 420ms after the tap that counted
  });

  it('never drops a keyboard or scripted click (detail 0), and such a click is not a tap to repeat', () => {
    const g = guarded();
    const gone = (): { isConnected: boolean } => ({ isConnected: false });
    expect(g.tap({ t: 1000, target: gone() })).toBe(true);
    expect(g.tap({ t: 1010, x: 0, y: 0, detail: 0, target: gone() })).toBe(true);
    expect(g.tap({ t: 1020, x: 0, y: 0, detail: 0, target: gone() })).toBe(true);
    expect(g.tap({ t: 1100, target: gone() })).toBe(false); // still the repeat of the tap at 1000
  });
});
