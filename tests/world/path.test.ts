import { describe, it, expect } from 'vitest';
import { WalkGrid, findPath } from '../../src/world/path';

describe('WalkGrid', () => {
  it('is all walkable initially', () => {
    const g = new WalkGrid(5, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expect(g.isWalkable(x, y)).toBe(true);
      }
    }
  });

  it('treats out-of-bounds cells as non-walkable', () => {
    const g = new WalkGrid(5, 5);
    expect(g.isWalkable(-1, 0)).toBe(false);
    expect(g.isWalkable(0, -1)).toBe(false);
    expect(g.isWalkable(5, 0)).toBe(false);
    expect(g.isWalkable(0, 5)).toBe(false);
  });

  it('setBlocked toggles walkability', () => {
    const g = new WalkGrid(5, 5);
    g.setBlocked(2, 2, true);
    expect(g.isWalkable(2, 2)).toBe(false);
    g.setBlocked(2, 2, false);
    expect(g.isWalkable(2, 2)).toBe(true);
  });
});

describe('findPath', () => {
  it('finds a straight clear path, excluding start and including target', () => {
    const g = new WalkGrid(5, 1);
    const path = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('returns [] when target equals start', () => {
    const g = new WalkGrid(5, 5);
    expect(findPath(g, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([]);
  });

  it('has a Manhattan-length path on an open grid', () => {
    const g = new WalkGrid(10, 10);
    const path = findPath(g, { x: 0, y: 0 }, { x: 3, y: 4 });
    expect(path.length).toBe(7); // |3-0| + |4-0|
    expect(path[path.length - 1]).toEqual({ x: 3, y: 4 });
  });

  it('routes around a wall (obstacle avoidance)', () => {
    const g = new WalkGrid(5, 5);
    // Vertical wall at x=2 for y=0..3, leaving a gap at y=4.
    for (let y = 0; y < 4; y++) g.setBlocked(2, y, true);
    const path = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path.length).toBeGreaterThan(0);
    // never steps on a blocked cell
    for (const n of path) expect(g.isWalkable(n.x, n.y)).toBe(true);
    // must reach the target
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
    // must have detoured through the y=4 gap (path longer than the blocked straight line)
    expect(path.length).toBeGreaterThan(4);
  });

  it('returns [] when the target is fully walled off', () => {
    const g = new WalkGrid(5, 5);
    // Wall off (4,4) completely.
    g.setBlocked(3, 4, true);
    g.setBlocked(4, 3, true);
    expect(findPath(g, { x: 0, y: 0 }, { x: 4, y: 4 })).toEqual([]);
  });

  it('returns [] when the start cell is blocked', () => {
    const g = new WalkGrid(5, 5);
    g.setBlocked(0, 0, true);
    expect(findPath(g, { x: 0, y: 0 }, { x: 4, y: 4 })).toEqual([]);
  });

  it('returns [] when the target cell is blocked', () => {
    const g = new WalkGrid(5, 5);
    g.setBlocked(4, 4, true);
    expect(findPath(g, { x: 0, y: 0 }, { x: 4, y: 4 })).toEqual([]);
  });

  it('returns [] for an out-of-bounds target', () => {
    const g = new WalkGrid(5, 5);
    expect(findPath(g, { x: 0, y: 0 }, { x: 9, y: 9 })).toEqual([]);
  });

  it('is deterministic across repeated runs', () => {
    const g = new WalkGrid(8, 8);
    g.setBlocked(3, 3, true);
    g.setBlocked(3, 4, true);
    const a = findPath(g, { x: 0, y: 0 }, { x: 7, y: 7 });
    const b = findPath(g, { x: 0, y: 0 }, { x: 7, y: 7 });
    expect(a).toEqual(b);
  });
});
