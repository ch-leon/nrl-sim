import { describe, it, expect } from 'vitest';
import { TILE_W, TILE_H, GRID_W, GRID_H } from '../../../src/config';
import {
  grassTile,
  dirtTile,
  pathTile,
  highlightTile,
  pathEdge,
  dirtEdge,
  surroundTexture,
  tileMask,
  tileTextures,
  grassVariantKey,
  GRASS_KEYS,
  SIDES,
  SURROUND_SIZE,
} from '../../../src/art/grounds/tiles';
import type { PixelBuffer } from '../../../src/art/pixel';

const sameBuf = (a: PixelBuffer, b: PixelBuffer) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);

describe('ground tiles', () => {
  it('base tiles are TILE_W×TILE_H and fill exactly the iso diamond', () => {
    const mask = tileMask();
    for (const buf of [grassTile(0), grassTile(1), grassTile(2), dirtTile(), pathTile()]) {
      expect(buf.w).toBe(TILE_W);
      expect(buf.h).toBe(TILE_H);
      for (let y = 0; y < TILE_H; y++) {
        for (let x = 0; x < TILE_W; x++) {
          expect(buf.get(x, y).alpha > 0).toBe(mask.get(x, y).alpha > 0);
        }
      }
    }
  });

  it('the diamond mask has its top vertex at (TILE_W/2, 0)', () => {
    const mask = tileMask();
    expect(mask.get(TILE_W / 2, 0).alpha).toBe(255);
    expect(mask.get(0, 0).alpha).toBe(0);
    expect(mask.get(TILE_W - 1, TILE_H - 1).alpha).toBe(0);
  });

  it('is deterministic (no Math.random)', () => {
    expect(sameBuf(grassTile(2), grassTile(2))).toBe(true);
    expect(sameBuf(pathTile(), pathTile())).toBe(true);
    expect(sameBuf(surroundTexture(), surroundTexture())).toBe(true);
  });

  it('lawn variants differ from each other', () => {
    expect(sameBuf(grassTile(0), grassTile(1))).toBe(false);
    expect(sameBuf(grassTile(0), grassTile(2))).toBe(false);
  });

  it('highlights stay translucent inside and keep a brighter rim', () => {
    for (const ok of [true, false]) {
      const buf = highlightTile(ok);
      const centre = buf.get(TILE_W / 2, TILE_H / 2);
      expect(centre.alpha).toBeGreaterThan(0);
      expect(centre.alpha).toBeLessThan(200);
      expect(buf.get(TILE_W / 2, 0).alpha).toBeGreaterThan(200);
    }
  });

  it('edge overlays only paint inside the diamond, near their own side', () => {
    const mask = tileMask();
    for (const side of SIDES) {
      for (const buf of [pathEdge(side), dirtEdge(side)]) {
        expect(buf.opaqueCount()).toBeGreaterThan(0);
        for (let y = 0; y < TILE_H; y++) {
          for (let x = 0; x < TILE_W; x++) {
            if (buf.get(x, y).alpha > 0) expect(mask.get(x, y).alpha).toBeGreaterThan(0);
          }
        }
        // The centre of the tile is never covered.
        expect(buf.get(TILE_W / 2, TILE_H / 2).alpha).toBe(0);
      }
    }
  });

  it('surround texture is a square SURROUND_SIZE fill with no holes', () => {
    const buf = surroundTexture();
    expect(buf.w).toBe(SURROUND_SIZE);
    expect(buf.h).toBe(SURROUND_SIZE);
    expect(buf.opaqueCount()).toBe(SURROUND_SIZE * SURROUND_SIZE);
  });

  it('grassVariantKey is deterministic and uses every variant across the grid', () => {
    const seen = new Set<string>();
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const k = grassVariantKey(gx, gy);
        expect(k).toBe(grassVariantKey(gx, gy));
        seen.add(k);
      }
    }
    expect([...seen].sort()).toEqual([...GRASS_KEYS].sort());
  });

  it('tileTextures includes every ARCHITECTURE §7 tile key', () => {
    const keys = tileTextures().map((t) => t.key);
    for (const k of ['tile-grass', 'tile-dirt', 'tile-path', 'tile-highlight-ok', 'tile-highlight-bad']) {
      expect(keys).toContain(k);
    }
    expect(keys).toContain('tile-grass-1');
    expect(keys).toContain('tile-grass-2');
  });
});
