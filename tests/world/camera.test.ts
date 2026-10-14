import { describe, it, expect } from 'vitest';
import {
  clampZoom,
  clampScroll,
  fitZoom,
  isDrag,
  screenToWorld,
  zoomAnchorScroll,
} from '../../src/world/camera';

// The Grounds scenery field in world px (GroundsScene.worldBounds: grid + 9 cells of decor).
const GROUNDS_WORLD = { x: -576, y: -288, width: 2432, height: 1216 };
const DESKTOP = { width: 1280, height: 720 }; // FIT-scaled game canvas
const PHONE = { width: 390, height: 844 }; // portrait phone viewport

describe('camera.fitZoom', () => {
  it('is the zoom at which the view exactly fits the world on its tighter axis', () => {
    const world = { width: 2000, height: 1000 };
    // width-limited: 800/2000 = 0.4 vs 500/1000 = 0.5 -> 0.5 (height-limited)
    expect(fitZoom({ width: 800, height: 500 }, world)).toBe(0.5);
    // height-limited: 900/2000 = 0.45 vs 400/1000 = 0.4 -> 0.45 (width-limited)
    expect(fitZoom({ width: 900, height: 400 }, world)).toBe(0.45);
  });

  it('grows with the viewport, so a canvas resize raises the floor', () => {
    const small = fitZoom({ width: 800, height: 600 }, GROUNDS_WORLD);
    const big = fitZoom({ width: 1600, height: 1200 }, GROUNDS_WORLD);
    expect(big).toBeCloseTo(small * 2, 10);
  });

  it('gives the grounds floor for desktop and phone viewports', () => {
    // desktop: max(1280/2432, 720/1216) = 720/1216
    expect(fitZoom(DESKTOP, GROUNDS_WORLD)).toBeCloseTo(720 / 1216, 10);
    // phone: max(390/2432, 844/1216) = 844/1216
    expect(fitZoom(PHONE, GROUNDS_WORLD)).toBeCloseTo(844 / 1216, 10);
  });
});

describe('camera zoom floor on the grounds world (fitView)', () => {
  // Visible world size at a zoom is view / zoom; at the fit floor it must not
  // exceed the world on either axis, and the clamp must pin to both edges.
  for (const [name, view] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    it(`never shows past the world edge at the ${name} floor`, () => {
      const floor = fitZoom(view, GROUNDS_WORLD);
      for (const zoom of [floor, floor * 1.25, 1, 2]) {
        for (const s of [-1e6, 0, 1e6]) {
          const c = clampScroll(s, s, view, zoom, GROUNDS_WORLD);
          const tl = screenToWorld(0, 0, view, c, zoom);
          const br = screenToWorld(view.width, view.height, view, c, zoom);
          expect(tl.x).toBeGreaterThanOrEqual(GROUNDS_WORLD.x - 1e-6);
          expect(tl.y).toBeGreaterThanOrEqual(GROUNDS_WORLD.y - 1e-6);
          expect(br.x).toBeLessThanOrEqual(GROUNDS_WORLD.x + GROUNDS_WORLD.width + 1e-6);
          expect(br.y).toBeLessThanOrEqual(GROUNDS_WORLD.y + GROUNDS_WORLD.height + 1e-6);
        }
      }
    });

    it(`does not pin at the ${name} floor (scroll range is real, not a single point)`, () => {
      const floor = fitZoom(view, GROUNDS_WORLD);
      // The constraining axis is exactly world-sized: both extremes land on the
      // world edges, so the view is fully covered by the world with no slack.
      const axis =
        view.width / floor / GROUNDS_WORLD.width >= view.height / floor / GROUNDS_WORLD.height
          ? 'x'
          : 'y';
      const lo = clampScroll(-1e6, -1e6, view, floor, GROUNDS_WORLD);
      const hi = clampScroll(1e6, 1e6, view, floor, GROUNDS_WORLD);
      const tl = screenToWorld(0, 0, view, lo, floor);
      const br = screenToWorld(view.width, view.height, view, hi, floor);
      if (axis === 'x') {
        expect(tl.x).toBeCloseTo(GROUNDS_WORLD.x, 6);
        expect(br.x).toBeCloseTo(GROUNDS_WORLD.x + GROUNDS_WORLD.width, 6);
      } else {
        expect(tl.y).toBeCloseTo(GROUNDS_WORLD.y, 6);
        expect(br.y).toBeCloseTo(GROUNDS_WORLD.y + GROUNDS_WORLD.height, 6);
      }
    });
  }
});

describe('camera.clampZoom', () => {
  it('clamps to the default 0.5..2.0 range', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(5)).toBe(2.0);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(2.0)).toBe(2.0);
  });

  it('honours custom bounds', () => {
    expect(clampZoom(3, 1, 4)).toBe(3);
    expect(clampZoom(0.2, 1, 4)).toBe(1);
    expect(clampZoom(10, 1, 4)).toBe(4);
  });
});

describe('camera.isDrag', () => {
  it('reports movement below the threshold as a tap', () => {
    expect(isDrag(0, 0)).toBe(false);
    expect(isDrag(5, 5)).toBe(false); // hypot ~7.07 < 8
    expect(isDrag(-3, 4)).toBe(false); // hypot 5 < 8
  });

  it('reports movement at/above the threshold as a drag', () => {
    expect(isDrag(8, 0)).toBe(true);
    expect(isDrag(0, -8)).toBe(true);
    expect(isDrag(6, 6)).toBe(true); // hypot ~8.49 >= 8
  });

  it('honours a custom threshold', () => {
    expect(isDrag(10, 0, 20)).toBe(false);
    expect(isDrag(20, 0, 20)).toBe(true);
  });
});

describe('camera.clampScroll', () => {
  const view = { width: 800, height: 600 };
  const world = { x: 0, y: 0, width: 2000, height: 2000 };

  it('leaves an in-bounds scroll untouched', () => {
    expect(clampScroll(500, 500, view, 1, world)).toEqual({ x: 500, y: 500 });
  });

  it('clamps to the world minimum', () => {
    expect(clampScroll(-100, -50, view, 1, world)).toEqual({ x: 0, y: 0 });
  });

  it('clamps to the world maximum accounting for the view size at zoom 1', () => {
    // maxX = 2000 - 800 = 1200, maxY = 2000 - 600 = 1400
    expect(clampScroll(9999, 9999, view, 1, world)).toEqual({ x: 1200, y: 1400 });
  });

  it('accounts for zoom around the view centre, like Phaser (#13)', () => {
    // zoom 2 -> visible world 400x300 centred on scroll + view/2, so the scroll
    // range shifts by (400 - 800)/2 = -200 (x) and (300 - 600)/2 = -150 (y).
    expect(clampScroll(9999, 9999, view, 2, world)).toEqual({ x: 1400, y: 1550 });
    expect(clampScroll(-9999, -9999, view, 2, world)).toEqual({ x: -200, y: -150 });
    // zoom 0.5 -> visible world 1600x1200 -> x in [400, 800], y in [300, 1100].
    // (The old top-left model allowed only x in [0, 400]; intersected with
    // Phaser's own clamp, a world wider than the view could not pan at all.)
    expect(clampScroll(9999, 9999, view, 0.5, world)).toEqual({ x: 800, y: 1100 });
    expect(clampScroll(-9999, -9999, view, 0.5, world)).toEqual({ x: 400, y: 300 });
  });

  it('keeps the visible world rect inside the world at any zoom', () => {
    for (const zoom of [0.5, 0.75, 1, 1.5, 2.5]) {
      for (const s of [-9999, 0, 700, 9999]) {
        const c = clampScroll(s, s, view, zoom, world);
        const tl = screenToWorld(0, 0, view, c, zoom);
        const br = screenToWorld(view.width, view.height, view, c, zoom);
        expect(tl.x).toBeGreaterThanOrEqual(world.x - 1e-9);
        expect(tl.y).toBeGreaterThanOrEqual(world.y - 1e-9);
        expect(br.x).toBeLessThanOrEqual(world.x + world.width + 1e-9);
        expect(br.y).toBeLessThanOrEqual(world.y + world.height + 1e-9);
      }
    }
  });

  it('pins the map when the world is smaller than the view (maxX >= minX)', () => {
    const small = { x: 0, y: 0, width: 300, height: 200 };
    // view world size 800x600 > world -> max clamps to world.x/y (no negative range)
    expect(clampScroll(9999, 9999, view, 1, small)).toEqual({ x: 0, y: 0 });
    expect(clampScroll(-9999, -9999, view, 1, small)).toEqual({ x: 0, y: 0 });
  });

  it('respects a non-zero world origin', () => {
    const offsetWorld = { x: 100, y: 200, width: 2000, height: 2000 };
    expect(clampScroll(0, 0, view, 1, offsetWorld)).toEqual({ x: 100, y: 200 });
  });
});

describe('camera.zoomAnchorScroll (#13)', () => {
  const view = { width: 1280, height: 720 };

  it('screenToWorld: the view centre is scroll + view/2 at any zoom', () => {
    for (const zoom of [0.5, 1, 2]) {
      expect(screenToWorld(640, 360, view, { x: 100, y: 50 }, zoom)).toEqual({ x: 740, y: 410 });
    }
  });

  it('keeps the anchor world point under the same screen point across steps', () => {
    const anchors = [
      { x: 640, y: 360 }, // centre — the case that drifted 58px/32px per step
      { x: 100, y: 650 },
      { x: 1200, y: 40 },
    ];
    for (const a of anchors) {
      let scroll = { x: 300, y: 200 };
      let zoom = 1;
      const fixed = screenToWorld(a.x, a.y, view, scroll, zoom);
      for (const next of [1.1, 1.21, 1.331, 0.9, 0.5, 2.5]) {
        scroll = zoomAnchorScroll(a.x, a.y, view, scroll, zoom, next);
        zoom = next;
        const w = screenToWorld(a.x, a.y, view, scroll, zoom);
        expect(w.x).toBeCloseTo(fixed.x, 6);
        expect(w.y).toBeCloseTo(fixed.y, 6);
      }
    }
  });

  it('zooming in N steps then out N steps returns to the starting scroll', () => {
    const start = { x: 420, y: 180 };
    let scroll = start;
    let zoom = 1;
    const steps = [1.1, 1.1, 1.1, 1.1];
    for (const f of steps) {
      scroll = zoomAnchorScroll(900, 500, view, scroll, zoom, zoom * f);
      zoom *= f;
    }
    for (const f of steps) {
      scroll = zoomAnchorScroll(900, 500, view, scroll, zoom, zoom / f);
      zoom /= f;
    }
    expect(scroll.x).toBeCloseTo(start.x, 6);
    expect(scroll.y).toBeCloseTo(start.y, 6);
  });

  it('zooming at the exact view centre leaves scroll unchanged', () => {
    expect(zoomAnchorScroll(640, 360, view, { x: 640, y: 320 }, 1, 1.1)).toEqual({ x: 640, y: 320 });
  });
});
