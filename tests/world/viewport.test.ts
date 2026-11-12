import { describe, it, expect } from 'vitest';
import {
  isSoftwareRenderer,
  MAX_DENSITY,
  MIN_PLAYER_PX,
  MIN_VIEW_SCALE,
  backingSize,
  cssZoom,
  densityFor,
  isPortrait,
  playerPx,
  screenDensity,
  setScreenDensity,
  viewScale,
  zoomForViewport,
} from '../../src/world/viewport';
import { ZOOM_CLOSE, ZOOM_DEFAULT, ZOOM_WIDE, zoomForBeat } from '../../src/world/readability';

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

  it('keeps players at least MIN_PLAYER_PX CSS px tall at every size, density and beat', () => {
    for (const v of SIZES) {
      for (const d of [1, 1.5, 2, 2.625, 3]) {
        for (const z of [ZOOM_DEFAULT, ZOOM_CLOSE, ZOOM_WIDE]) {
          expect(playerPx(zoomForViewport(z, v, d), d)).toBeGreaterThanOrEqual(MIN_PLAYER_PX);
        }
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
      for (const d of [1, 2, 3]) {
        for (const z of [ZOOM_DEFAULT, ZOOM_CLOSE, ZOOM_WIDE, 1.75, 0.1]) {
          const out = zoomForViewport(z, v, d);
          expect(Number.isInteger(out)).toBe(true);
          expect(out).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

// #627: zoom steps are whole device px, so a dense screen has steps between ×1 and ×2.
describe('zoom at the screen\'s pixel density', () => {
  const PHONE = { width: 844, height: 390 };
  const DESKTOP = { width: 1280, height: 800 };
  // [devicePixelRatio, default, close] in canvas px per art px. A 3× screen renders at 1.5 (MAX_DENSITY).
  const CASES: [string, { width: number; height: number }, number, number, number][] = [
    ['phone', PHONE, 1, 2, 3],
    ['phone', PHONE, 2, 3, 4], // ×1.5 and ×2 in CSS terms
    ['phone', PHONE, 3, 2, 3], // density 1.5: ×1.33 and ×2
    ['desktop', DESKTOP, 1, 2, 3],
    ['desktop', DESKTOP, 2, 4, 5], // ×2 and ×2.5
    ['desktop', DESKTOP, 3, 3, 4], // ×2 and ×2.67
  ];
  for (const [name, view, dpr, def, close] of CASES) {
    const d = densityFor(dpr);
    it(`${name} ${view.width}×${view.height} at ${dpr}×: default ${def}, close-up ${close}`, () => {
      expect(zoomForViewport(ZOOM_DEFAULT, view, d)).toBe(def);
      expect(zoomForBeat(ZOOM_DEFAULT, view, d)).toBe(def);
      expect(zoomForBeat(ZOOM_WIDE, view, d)).toBe(def);
      expect(zoomForBeat(ZOOM_CLOSE, view, d)).toBe(close);
    });
  }

  it('shows a phone more of the field on a dense screen, players still readable', () => {
    // World px across the view at the default: 422 at 1×, 563 at 2×, 633 at 3×.
    const across = (dpr: number): number => (PHONE.width * densityFor(dpr)) / zoomForViewport(ZOOM_DEFAULT, PHONE, densityFor(dpr));
    expect(across(1)).toBeCloseTo(422);
    expect(across(2)).toBeCloseTo(562.67, 1);
    expect(across(3)).toBeCloseTo(633);
    expect(playerPx(zoomForViewport(ZOOM_DEFAULT, PHONE, densityFor(3)), densityFor(3))).toBeGreaterThanOrEqual(MIN_PLAYER_PX);
  });

  it('a close-up is one step in on every viewport and density, never the default', () => {
    for (const v of SIZES) {
      for (const d of [1, 1.5, 2, 2.625, 3]) {
        expect(zoomForBeat(ZOOM_CLOSE, v, d)).toBe(zoomForBeat(ZOOM_DEFAULT, v, d) + 1);
      }
    }
  });

  it('keeps the density in 1..MAX_DENSITY, a whole fraction of a denser screen, and sizes the backing store in whole px', () => {
    expect(densityFor(0)).toBe(1);
    expect(densityFor(Number.NaN)).toBe(1);
    expect(densityFor(0.5)).toBe(1);
    expect(densityFor(1.5)).toBe(1.5);
    expect(densityFor(2)).toBe(2);
    expect(densityFor(3)).toBe(1.5); // shown at ×2 by the browser: whole device px
    expect(densityFor(2.625)).toBeCloseTo(1.3125);
    expect(densityFor(4)).toBe(MAX_DENSITY);
    for (const dpr of [1.25, 2, 2.625, 3, 3.5, 4]) {
      const d = densityFor(dpr);
      expect(d).toBeLessThanOrEqual(MAX_DENSITY);
      if (dpr > MAX_DENSITY) expect(Number.isInteger(Math.round((dpr / d) * 1e6) / 1e6)).toBe(true);
    }
    expect(backingSize({ width: 844, height: 390 }, 2)).toEqual({ width: 1688, height: 780 });
    expect(backingSize({ width: 412.5, height: 915 }, 2.625)).toEqual({ width: 1083, height: 2402 });
  });

  it('reads a camera zoom in CSS terms at the current density', () => {
    expect(screenDensity()).toBe(1);
    expect(cssZoom({ zoom: 2 })).toBe(2);
    setScreenDensity(2);
    try {
      expect(cssZoom({ zoom: 3 })).toBe(1.5);
    } finally {
      setScreenDensity(1);
    }
  });
});

describe('isSoftwareRenderer', () => {
  it('names the software rasterisers, not a GPU or a masked name', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)')).toBe(true);
    expect(isSoftwareRenderer('Apple GPU')).toBe(false);
    expect(isSoftwareRenderer('Adreno (TM) 640')).toBe(false);
    expect(isSoftwareRenderer('Mali-G78 MP14')).toBe(false);
    expect(isSoftwareRenderer('WebKit WebGL')).toBe(false);
  });
});
