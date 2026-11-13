// tests/match/view/stripHold.test.ts — an important commentary line holds the strip for
// STRIP_HOLD_MS of real time (#637): routine lines never replace it, an important one waits its turn.
import { describe, it, expect } from 'vitest';
import { StripHold, STRIP_HOLD_MS } from '../../../src/match/view/stripHold';

describe('the strip hold', () => {
  it('shows a routine line at once, and a routine line replaces a routine line', () => {
    const h = new StripHold();
    expect(h.offer('Makes the tackle.', 'routine', 0)).toBe('Makes the tackle.');
    expect(h.offer('Plays it quickly.', 'routine', 10)).toBe('Plays it quickly.');
  });

  it('holds an important line against routine lines for its time, and is then replaced', () => {
    const h = new StripHold();
    expect(h.offer('TRY!', 'important', 1000)).toBe('TRY!');
    expect(h.offer('Makes the tackle.', 'routine', 1100)).toBeNull();
    expect(h.offer('Plays it quickly.', 'routine', 1000 + STRIP_HOLD_MS - 1)).toBeNull();
    expect(h.nextAt()).toBeNull();
    expect(h.offer('Handover.', 'routine', 1000 + STRIP_HOLD_MS)).toBe('Handover.');
  });

  it('lets an important line wait behind a held one rather than replace it', () => {
    const h = new StripHold();
    h.offer('TRY!', 'important', 0);
    expect(h.offer('Jarrah has two tonight!', 'important', 5)).toBeNull();
    expect(h.nextAt()).toBe(STRIP_HOLD_MS);
    expect(h.release(STRIP_HOLD_MS - 1)).toBeNull();
    expect(h.release(STRIP_HOLD_MS)).toBe('Jarrah has two tonight!');
    // That one is held in its turn.
    expect(h.offer('Quick play-the-ball.', 'routine', STRIP_HOLD_MS + 10)).toBeNull();
    expect(h.offer('Quick play-the-ball.', 'routine', 2 * STRIP_HOLD_MS)).toBe('Quick play-the-ball.');
  });

  it('holds for at least a second: the hold is real time, so ×1 and ×2 read alike', () => {
    expect(STRIP_HOLD_MS).toBeGreaterThanOrEqual(1000);
  });

  it('"now" clears the hold (Skip, full time), and a pile of important lines keeps the newest two', () => {
    const h = new StripHold();
    h.offer('TRY!', 'important', 0);
    h.offer('a', 'important', 1);
    h.offer('b', 'important', 2);
    h.offer('c', 'important', 3);
    expect(h.release(STRIP_HOLD_MS)).toBe('b');
    expect(h.release(2 * STRIP_HOLD_MS)).toBe('c');
    expect(h.release(3 * STRIP_HOLD_MS)).toBeNull();
    h.offer('TRY!', 'important', 5000);
    expect(h.offer('Skipping to full time…', 'now', 5010)).toBe('Skipping to full time…');
    expect(h.offer('x', 'routine', 5020)).toBe('x');
  });
});
