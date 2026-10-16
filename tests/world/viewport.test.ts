import { describe, it, expect } from 'vitest';
import {
  MIN_PLAYER_PX,
  MIN_VIEW_SCALE,
  isPortrait,
  playerPx,
  viewScale,
  zoomForViewport,
} from '../../src/world/viewport';
import { ZOOM_CLOSE, ZOOM_DEFAULT, ZOOM_WIDE } from '../../src/world/readability';

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 844, height: 390 },
];

describe('viewport maths', () => {
  it('detects portrait', () => {
    expect(isPortrait({ width: 390, height: 844 })).toBe(true);
    expect(isPortrait({ width: 1280, height: 800 })).toBe(false);
    expect(isPortrait({ width: 500, height: 500 })).toBe(false);
  });

  it('keeps the authored zoom on desktop and never exceeds 1', () => {
    expect(viewScale({ width: 1280, height: 800 })).toBe(1);
    expect(viewScale({ width: 3840, height: 2160 })).toBe(1);
  });

  it('floors the scale on small phones', () => {
    expect(viewScale({ width: 360, height: 740 })).toBe(MIN_VIEW_SCALE);
  });

  it('scales by the shorter side (rotation-safe)', () => {
    expect(viewScale({ width: 390, height: 844 })).toBe(viewScale({ width: 844, height: 390 }));
  });

  it('keeps players at least 16 CSS px tall at every size and beat', () => {
    for (const v of SIZES) {
      for (const z of [ZOOM_DEFAULT, ZOOM_CLOSE, ZOOM_WIDE]) {
        expect(playerPx(zoomForViewport(z, v))).toBeGreaterThanOrEqual(MIN_PLAYER_PX);
      }
    }
  });

  it('enforces the player-size floor for tiny zooms', () => {
    expect(playerPx(zoomForViewport(0.1, { width: 360, height: 740 }))).toBeGreaterThanOrEqual(MIN_PLAYER_PX);
  });

  it('always lands on a whole-number zoom (crisp pixel art while moving)', () => {
    for (const v of [
      { width: 1280, height: 800 },
      { width: 844, height: 390 },
      { width: 360, height: 740 },
      { width: 3840, height: 2160 },
    ]) {
      for (const z of [ZOOM_DEFAULT, ZOOM_CLOSE, ZOOM_WIDE, 1.75, 0.1]) {
        const out = zoomForViewport(z, v);
        expect(Number.isInteger(out)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
