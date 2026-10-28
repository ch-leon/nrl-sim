import { describe, it, expect } from 'vitest';
import { autoPaths, onEntrancePath, onWalkway, type SitedFacility } from '../../src/world/path';
import { FACILITY_CATALOG } from '../../src/data/facility';
import { FACILITY_DOOR } from '../../src/art/grounds/facilities';
import { GRID_W, GRID_H } from '../../src/config';

const key = (c: { x: number; y: number }): string => `${c.x},${c.y}`;
const covered = (fs: readonly SitedFacility[]): Set<string> => {
  const out = new Set<string>();
  for (const f of fs) {
    const { w, h } = FACILITY_CATALOG[f.defId].footprint;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.add(`${f.x + dx},${f.y + dy}`);
  }
  return out;
};
const paved = (x: number, y: number): boolean => onEntrancePath(x, y) || onWalkway(x, y);

describe('main path (#395)', () => {
  it('the entrance path is the middle column of the grid; the walkway rings it', () => {
    const mid = Math.floor(GRID_W / 2);
    expect(onEntrancePath(mid, 0)).toBe(true);
    expect(onEntrancePath(mid, GRID_H - 1)).toBe(true);
    expect(onEntrancePath(mid, -1)).toBe(false);
    expect(onEntrancePath(mid - 1, 5)).toBe(false);
    expect(onWalkway(-1, 5)).toBe(true);
    expect(onWalkway(GRID_W, GRID_H)).toBe(true);
    expect(onWalkway(0, 0)).toBe(false);
    expect(onWalkway(-2, 5)).toBe(false);
  });
});

describe('autoPaths (#395)', () => {
  it('no facilities, no footpaths', () => {
    expect(autoPaths([])).toEqual([]);
  });

  it('runs straight from the door (middle of the front edge) to the nearest path', () => {
    // A 2×2 paddock at (4, 4): door on the 's' side, middle cell (5, 6). The entrance
    // column (x = 10) is 5 cells east; the walkway ring (y = 20) is 14 south; x = -1 is 6 west.
    const paths = autoPaths([{ defId: 'trainingPaddock', x: 4, y: 4 }]);
    expect(FACILITY_DOOR.trainingPaddock).toBe('s');
    expect(paths[0]).toBeDefined();
    expect(paths.some((c) => c.x === 5 && c.y === 6)).toBe(true); // starts at the door
    // It joins the main path: some cell is next to a paved cell.
    expect(paths.some((c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => paved(c.x + dx!, c.y + dy!)))).toBe(true);
    // Shortest: door (5,6) to x = 9 (next to the column) is 5 cells.
    expect(paths).toHaveLength(5);
  });

  it('a door already on the path needs no footpath', () => {
    // A paddock at (0, 18): its door row is y = 20, the walkway ring.
    expect(autoPaths([{ defId: 'trainingPaddock', x: 0, y: GRID_H - 2 }])).toEqual([]);
  });

  it('routes around buildings and never under one', () => {
    const fs: SitedFacility[] = [
      { defId: 'trainingPaddock', x: 4, y: 4 },
      // A wall of buildings between the paddock's door and the entrance column.
      { defId: 'grandstand', x: 6, y: 5 },
      { defId: 'teamGym', x: 6, y: 8 },
    ];
    const paths = autoPaths(fs);
    const under = covered(fs);
    expect(paths.length).toBeGreaterThan(0);
    for (const c of paths) expect(under.has(key(c))).toBe(false);
    // Every footpath cell is connected: each touches another footpath cell or the main path.
    const set = new Set(paths.map(key));
    for (const c of paths) {
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => set.has(`${c.x + dx!},${c.y + dy!}`) || paved(c.x + dx!, c.y + dy!));
      expect(ok).toBe(true);
    }
  });

  it('later footpaths join earlier ones', () => {
    const a = autoPaths([{ defId: 'trainingPaddock', x: 4, y: 4 }]);
    const both = autoPaths([
      { defId: 'trainingPaddock', x: 4, y: 4 },
      { defId: 'weightsRoom', x: 4, y: 8 },
    ]);
    for (const c of a) expect(both.some((d) => d.x === c.x && d.y === c.y)).toBe(true);
    const extra = both.filter((c) => !a.some((d) => d.x === c.x && d.y === c.y));
    // The weights room's door is (5, 10): it reaches the paddock's path or the main path.
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.length).toBeLessThanOrEqual(a.length + 4);
  });

  it('is deterministic: same facilities, same cells, row-major', () => {
    const fs: SitedFacility[] = [
      { defId: 'canteen', x: 2, y: 2 },
      { defId: 'videoRoom', x: 14, y: 3 },
      { defId: 'grandstand', x: 12, y: 12 },
    ];
    const a = autoPaths(fs);
    expect(autoPaths(fs.map((f) => ({ ...f })))).toEqual(a);
    const sorted = [...a].sort((p, q) => p.y - q.y || p.x - q.x);
    expect(a).toEqual(sorted);
  });

  it('no route, no path', () => {
    // A paddock at (2, 2) whose door cells (2, 4) and (3, 4) are a pocket sealed off by other buildings.
    const fs: SitedFacility[] = [
      { defId: 'trainingPaddock', x: 2, y: 2 },
      { defId: 'sponsorBoard', x: 2, y: 1 }, // north
      { defId: 'sponsorBoard', x: 2, y: 5 }, // south of the pocket
      { defId: 'trainingPaddock', x: 0, y: 2 }, // west
      { defId: 'trainingPaddock', x: 0, y: 4 },
      { defId: 'trainingPaddock', x: 4, y: 2 }, // east
      { defId: 'trainingPaddock', x: 4, y: 4 },
    ];
    const paths = autoPaths(fs).map(key);
    expect(paths).not.toContain('2,4');
    expect(paths).not.toContain('3,4');
    // The others still get theirs.
    expect(paths.length).toBeGreaterThan(0);
  });

  it('starts from the video room door on its +gx side', () => {
    expect(FACILITY_DOOR.videoRoom).toBe('e');
    // Video room 2×2 at (4, 4): door cell (6, 5); straight east to x = 9.
    const paths = autoPaths([{ defId: 'videoRoom', x: 4, y: 4 }]);
    expect(paths).toEqual([{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }]);
  });

  it('an old-save facility sitting on the entrance column is routed around', () => {
    const fs: SitedFacility[] = [{ defId: 'trainingPaddock', x: 9, y: 5 }, { defId: 'weightsRoom', x: 6, y: 5 }];
    const paths = autoPaths(fs);
    const under = covered(fs);
    for (const c of paths) expect(under.has(key(c))).toBe(false);
  });
});
