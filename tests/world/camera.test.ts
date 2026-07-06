import { describe, it, expect } from 'vitest';
import { clampZoom, clampScroll, isDrag } from '../../src/world/camera';

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

  it('accounts for zoom when computing the max scroll', () => {
    // zoom 2 -> view world size 400x300 -> maxX = 1600, maxY = 1700
    expect(clampScroll(9999, 9999, view, 2, world)).toEqual({ x: 1600, y: 1700 });
    // zoom 0.5 -> view world size 1600x1200 -> maxX = max(0, 400) = 400
    expect(clampScroll(9999, 9999, view, 0.5, world)).toEqual({ x: 400, y: 800 });
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
