import { describe, it, expect } from 'vitest';
import { gridToScreen, screenToGrid, depth, inBounds } from '../../src/world/iso';
import { GRID_W, GRID_H, TILE_W, TILE_H } from '../../src/config';

describe('iso.gridToScreen', () => {
  it('matches the ARCHITECTURE.md §7 projection formula', () => {
    expect(gridToScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gridToScreen(1, 0)).toEqual({ x: TILE_W / 2, y: TILE_H / 2 });
    expect(gridToScreen(0, 1)).toEqual({ x: -TILE_W / 2, y: TILE_H / 2 });
    expect(gridToScreen(2, 3)).toEqual({
      x: (2 - 3) * (TILE_W / 2),
      y: (2 + 3) * (TILE_H / 2),
    });
  });
});

describe('iso.screenToGrid round-trip', () => {
  it('inverts gridToScreen for every integer cell in bounds', () => {
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const p = gridToScreen(gx, gy);
        const back = screenToGrid(p.x, p.y);
        expect(back).toEqual({ gx, gy });
      }
    }
  });

  it('rounds nearby off-center screen points to the containing cell', () => {
    const p = gridToScreen(5, 7);
    // small nudges within half a tile should still resolve to (5,7)
    expect(screenToGrid(p.x + 4, p.y + 4)).toEqual({ gx: 5, gy: 7 });
    expect(screenToGrid(p.x - 4, p.y - 4)).toEqual({ gx: 5, gy: 7 });
  });
});

describe('iso.depth', () => {
  it('orders cells so higher gx+gy draws in front', () => {
    expect(depth(0, 0)).toBeLessThan(depth(1, 0));
    expect(depth(1, 0)).toBeLessThan(depth(1, 1));
    expect(depth(5, 5)).toBeLessThan(depth(6, 5));
  });

  it('equals screenY of gridToScreen for layer 0', () => {
    for (const [gx, gy] of [
      [0, 0],
      [3, 4],
      [19, 19],
    ] as const) {
      expect(depth(gx, gy)).toBe(gridToScreen(gx, gy).y);
    }
  });

  it('lifts objects above their own tile via the layer arg', () => {
    // an object on (2,2) with layer 1 must sort after the floor tile (2,2)...
    expect(depth(2, 2, 1)).toBeGreaterThan(depth(2, 2, 0));
    // ...but still before the next row's floor tile
    expect(depth(2, 2, 1)).toBeLessThan(depth(3, 2, 0));
  });
});

describe('iso.inBounds', () => {
  it('accepts cells inside the grid and rejects the rest', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(GRID_W - 1, GRID_H - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(GRID_W, 0)).toBe(false);
    expect(inBounds(0, GRID_H)).toBe(false);
  });
});
