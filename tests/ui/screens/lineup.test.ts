import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { createNewGame, getState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { overallRating, playerStars } from '../../../src/data/player';
import { starsLabel } from '../../../src/ui/parts';
import { initLeague } from '../../../src/systems/fixtures';
import { openLineupScreen } from '../../../src/ui/screens/lineup';

beforeEach(() => { bus.clear(); stubDocument(); createNewGame('Bench Test', 600); initLeague(getState()); });
afterEach(() => { bus.clear(); vi.unstubAllGlobals(); });

describe('Lineup bench tiles (#600)', () => {
  it('show the overall as stars, never an unrounded number', () => {
    const s = getState();
    const benched = s.lineup.bench.map((id) => s.squad.find((p) => p.id === id)!);
    expect(benched.length).toBeGreaterThan(0);
    // An average of four stats that is not whole, and not exact in floating point: 46.65000000000002.
    Object.assign(benched[0]!.stats, { speed: 46.6, strength: 46.6, stamina: 46.7, handling: 46.7, kicking: 46.7, footyIQ: 46.7 });
    expect(Number.isInteger(overallRating(benched[0]!))).toBe(false);
    openLineupScreen();
    const body = document.body as unknown as StubNode;
    // SuperCOOKED 30: a bench card shows stars, not the number; nothing unrounded leaks into it.
    benched.forEach((p, i) => {
      const card = body.querySelector(`[data-spot="b${i}"]`)!;
      expect(card.querySelector('.nrl-stars')!.attrs['aria-label']).toBe(starsLabel(playerStars(p)));
      expect(card.textContent).not.toMatch(/\d\.\d/);
    });
  });
});

describe('Long press to swap on touch (#731 review)', () => {
  /** Fire `ev`'s listeners on a stub node, as the browser would. */
  const fire = (node: StubNode, ev: string): void => {
    for (const fn of (node as unknown as { listeners: Record<string, (() => void)[]> }).listeners[ev] ?? []) fn();
  };
  afterEach(() => { vi.useRealTimers(); });

  it('keeps the swap open when the press\'s click lands on the re-rendered card', () => {
    vi.useFakeTimers();
    openLineupScreen();
    const body = document.body as unknown as StubNode;
    const first = body.querySelector('[data-spot="s0"]')!;
    fire(first, 'pointerdown');
    vi.advanceTimersByTime(450);
    // The hold opened the swap and drew the field again: the finger lifts over a new card.
    const again = body.querySelector('[data-spot="s0"]')!;
    expect(again).not.toBe(first);
    expect(again.attrs['data-selected']).toBe('');
    fire(again, 'pointerup');
    again.click();
    expect(body.querySelector('[data-spot="s0"]')!.attrs['data-selected']).toBe('');
  });

  it('a mouse hold sends no click, so the next tap still works', () => {
    vi.useFakeTimers();
    openLineupScreen();
    const body = document.body as unknown as StubNode;
    fire(body.querySelector('[data-spot="s0"]')!, 'pointerdown');
    vi.advanceTimersByTime(450);
    fire(body.querySelector('[data-spot="s0"]')!, 'pointerup');
    // A fresh tap on the same card, while swapping, picks it again: the swap closes.
    const card = body.querySelector('[data-spot="s0"]')!;
    fire(card, 'pointerdown');
    vi.advanceTimersByTime(100);
    fire(card, 'pointerup');
    card.click();
    expect(body.querySelector('[data-spot="s0"]')!.attrs['data-selected']).toBeUndefined();
  });
});
