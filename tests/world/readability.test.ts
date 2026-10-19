// tests/world/readability.test.ts — ticker truncation, name-tag selection,
// carrier-marker target and zoom helpers (#17).
import { describe, it, expect } from 'vitest';
import {
  NAME_TAG_MS,
  TICKER_MAX_CHARS,
  ZOOM_CLOSE,
  ZOOM_DEFAULT,
  ZOOM_WIDE,
  carrierMarkerTarget,
  easeZoom,
  nameTagFor,
  surname,
  truncateTicker,
  zoomForEvent,
} from '../../src/world/readability';
import type { MatchEvent } from '../../src/sim/events';

describe('truncateTicker', () => {
  it('leaves short lines alone', () => {
    expect(truncateTicker('Radbourne sends it high.')).toBe('Radbourne sends it high.');
  });
  it('cuts long lines with an ellipsis within the budget', () => {
    const long = 'word '.repeat(60);
    const out = truncateTicker(long);
    expect(out.length).toBeLessThanOrEqual(TICKER_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('cuts mid-word when there is no usable word boundary', () => {
    expect(truncateTicker('abcdefghijklmnop', 8)).toBe('abcdefg…');
  });
  it('collapses whitespace and handles degenerate budgets', () => {
    expect(truncateTicker('  a   b  ')).toBe('a b');
    expect(truncateTicker('abc', 0)).toBe('');
    expect(truncateTicker('abc', 1)).toBe('…');
  });
});

describe('name tags', () => {
  const ev = (over: Partial<MatchEvent> = {}): MatchEvent => ({ t: 3, kind: 'run', teamId: 'H', player: 'Jarrah Kavanagh', ...over });

  it('takes the surname', () => {
    expect(surname('Jarrah Kavanagh')).toBe('Kavanagh');
    expect(surname('  Koro ')).toBe('Koro');
    expect(surname('')).toBe('');
  });
  it('tags the sprite playback chose, with the event player surname', () => {
    expect(nameTagFor(ev(), { side: 'away', slot: 4 })).toEqual({ side: 'away', slot: 4, text: 'Kavanagh' });
  });
  it('yields no tag without a player name or a chosen sprite', () => {
    const { player: _p, ...noPlayer } = ev();
    expect(nameTagFor(noPlayer, { side: 'home', slot: 1 })).toBeNull();
    expect(nameTagFor(ev(), null)).toBeNull();
  });
  it('shows for about a second and a half', () => {
    expect(NAME_TAG_MS).toBe(1500);
  });
});

describe('carrierMarkerTarget', () => {
  it('sits at the holder’s feet while the ball is held', () => {
    expect(carrierMarkerTarget({ mode: 'held', holder: { side: 'home', pos: { fx: 40, fy: 22 } } })).toEqual({ side: 'home', fx: 40, fy: 22 });
  });
  it('is absent in flight and on the ground', () => {
    expect(carrierMarkerTarget({ mode: 'flight' })).toBeNull();
    expect(carrierMarkerTarget({ mode: 'ground' })).toBeNull();
  });
});

describe('situational zoom', () => {
  it('is tighter at contact, wider for kicks and breaks', () => {
    expect(zoomForEvent('tackle')).toBe(ZOOM_DEFAULT); // every few seconds live: no close-up
    expect(zoomForEvent('big-hit')).toBe(ZOOM_CLOSE);
    expect(zoomForEvent('try')).toBe(ZOOM_CLOSE);
    expect(zoomForEvent('kick')).toBe(ZOOM_WIDE);
    expect(zoomForEvent('break')).toBe(ZOOM_WIDE);
    expect(zoomForEvent('run')).toBe(ZOOM_DEFAULT);
    expect(ZOOM_CLOSE).toBeGreaterThan(ZOOM_DEFAULT);
    expect(ZOOM_WIDE).toBeLessThanOrEqual(ZOOM_DEFAULT);
    // Whole-number zooms only: fractional zooms make moving pixel art shimmer.
    for (const z of [ZOOM_DEFAULT, ZOOM_CLOSE, ZOOM_WIDE]) expect(Number.isInteger(z)).toBe(true);
  });
  it('eases toward the target independent of frame rate and then snaps', () => {
    let a = ZOOM_DEFAULT;
    for (let i = 0; i < 60; i++) a = easeZoom(a, ZOOM_CLOSE, 1000 / 60);
    let b = ZOOM_DEFAULT;
    for (let i = 0; i < 20; i++) b = easeZoom(b, ZOOM_CLOSE, 1000 / 20);
    expect(a).toBeCloseTo(b, 5);
    expect(a).toBeGreaterThan(ZOOM_DEFAULT);
    expect(easeZoom(ZOOM_DEFAULT, ZOOM_CLOSE, 60_000)).toBe(ZOOM_CLOSE);
  });
  it('keeps a player ≥32px tall at the default zoom (21px figure)', () => {
    expect(21 * ZOOM_DEFAULT).toBeGreaterThanOrEqual(32);
  });
});
