import { describe, it, expect } from 'vitest';
import { TILE_W, TILE_H, GRID_W, GRID_H } from '../../../src/config';
import { decorLayout, decorTextures, surroundPaths, entranceColumn } from '../../../src/art/grounds/decor';

const inGrid = (gx: number, gy: number) => gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
const TALL = new Set(['decor-tree-0', 'decor-tree-1', 'decor-pine', 'decor-floodlight', 'decor-gate']);

describe('grounds decor', () => {
  it('never places scenery or paving on a buildable grid cell', () => {
    for (const d of decorLayout(GRID_W, GRID_H)) expect(inGrid(d.gx, d.gy)).toBe(false);
    for (const c of surroundPaths(GRID_W, GRID_H)) expect(inGrid(c.gx, c.gy)).toBe(false);
  });

  it('is deterministic', () => {
    expect(decorLayout(GRID_W, GRID_H)).toEqual(decorLayout(GRID_W, GRID_H));
  });

  it('every key the layout uses has a texture, TILE_W wide with the cell diamond at the bottom', () => {
    const tex = new Map(decorTextures().map((t) => [t.key, t.buf]));
    for (const d of decorLayout(GRID_W, GRID_H)) expect(tex.has(d.key), d.key).toBe(true);
    for (const [key, buf] of tex) {
      expect(buf.w, key).toBe(TILE_W);
      expect(buf.h, key).toBeGreaterThanOrEqual(TILE_H);
      expect(buf.opaqueCount(), key).toBeGreaterThan(0);
    }
  });

  it('fences ring the grid and the entrance arch sits on the entrance column', () => {
    const items = decorLayout(GRID_W, GRID_H);
    const fences = items.filter((d) => d.key.startsWith('decor-fence-'));
    expect(fences.length).toBe(2 * (GRID_W + 2) + 2 * (GRID_H + 2) - 1);
    const gate = items.filter((d) => d.key === 'decor-gate');
    expect(gate).toEqual([{ key: 'decor-gate', gx: entranceColumn(GRID_W), gy: -1 }]);
  });

  it('keeps tall scenery away from the front edges so it cannot hide grid tiles', () => {
    for (const d of decorLayout(GRID_W, GRID_H)) {
      if (!TALL.has(d.key)) continue;
      const front = (d.gx >= GRID_W && d.gy >= 0) || (d.gy >= GRID_H && d.gx >= 0);
      if (!front) continue;
      // Cells out from the front edges (Chebyshev): 3+ keeps a ~52px canopy below the grid.
      const dist = Math.max(d.gx - (GRID_W - 1), d.gy - (GRID_H - 1));
      expect(dist, `${d.key} @ ${d.gx},${d.gy}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('the walkway ring connects to the entrance road outside the gate', () => {
    const paved = new Set(surroundPaths(GRID_W, GRID_H).map((c) => `${c.gx},${c.gy}`));
    const mid = entranceColumn(GRID_W);
    expect(paved.has(`${mid},-1`)).toBe(true);
    expect(paved.has(`${mid},-2`)).toBe(true);
    expect(paved.has('-1,-1')).toBe(true);
    expect(paved.has(`${GRID_W},${GRID_H}`)).toBe(true);
  });
});
