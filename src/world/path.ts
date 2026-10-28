// Grid pathfinding — pure TS, no Phaser (ARCHITECTURE.md §1). 4-connected A* with
// a Manhattan heuristic. Deterministic tie-breaking (lower f, then insertion order)
// keeps findPath output stable for tests. See BAK-161. Footpaths (autoPaths, #395)
// are derived here too, from facility positions.
import { GRID_W, GRID_H } from '../config';
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import { FACILITY_DOOR } from '../art/grounds/facilities';
import { entranceColumn } from '../art/grounds/decor';

export class WalkGrid {
  readonly width: number;
  readonly height: number;
  // Row-major blocked flags, indexed [y * width + x]. All walkable initially.
  private blocked: boolean[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.blocked = new Array<boolean>(width * height).fill(false);
  }

  setBlocked(x: number, y: number, blocked: boolean): void {
    if (!this.inBounds(x, y)) return;
    this.blocked[y * this.width + x] = blocked;
  }

  /** False if out of bounds or blocked. */
  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return !this.blocked[y * this.width + x];
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}

export interface PathNode {
  x: number;
  y: number;
}

interface OpenEntry {
  x: number;
  y: number;
  g: number;
  f: number;
  order: number; // insertion order, for deterministic tie-breaking
}

// 4-connected neighbours: E, W, S, N (fixed order for determinism).
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * 4-connected A* (Manhattan heuristic). Returns [] if no path (including start or
 * target blocked, or target out of bounds). The returned path INCLUDES the target
 * and EXCLUDES the start cell.
 */
export function findPath(grid: WalkGrid, start: PathNode, target: PathNode): PathNode[] {
  if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(target.x, target.y)) {
    return [];
  }
  if (start.x === target.x && start.y === target.y) {
    return [];
  }

  const key = (x: number, y: number): number => y * grid.width + x;

  const open: OpenEntry[] = [];
  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>(); // childKey -> parentKey
  const closed = new Set<number>();
  let insertion = 0;

  const startKey = key(start.x, start.y);
  gScore.set(startKey, 0);
  open.push({
    x: start.x,
    y: start.y,
    g: 0,
    f: manhattan(start.x, start.y, target.x, target.y),
    order: insertion++,
  });

  while (open.length > 0) {
    // Pop the lowest f; ties broken by lower insertion order (determinism).
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i]!;
      const b = open[bestIdx]!;
      if (a.f < b.f || (a.f === b.f && a.order < b.order)) {
        bestIdx = i;
      }
    }
    const current = open.splice(bestIdx, 1)[0]!;
    const curKey = key(current.x, current.y);

    if (current.x === target.x && current.y === target.y) {
      return reconstruct(cameFrom, curKey, grid.width);
    }

    if (closed.has(curKey)) continue;
    closed.add(curKey);

    for (const [dx, dy] of NEIGHBOURS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      const nKey = key(nx, ny);
      if (closed.has(nKey)) continue;

      const tentativeG = current.g + 1;
      const knownG = gScore.get(nKey);
      if (knownG !== undefined && tentativeG >= knownG) continue;

      cameFrom.set(nKey, curKey);
      gScore.set(nKey, tentativeG);
      open.push({
        x: nx,
        y: ny,
        g: tentativeG,
        f: tentativeG + manhattan(nx, ny, target.x, target.y),
        order: insertion++,
      });
    }
  }

  return []; // no path
}

/** Walk parent links back to the start; drop the start cell, return target-last. */
function reconstruct(cameFrom: Map<number, number>, endKey: number, width: number): PathNode[] {
  const path: PathNode[] = [];
  let k: number | undefined = endKey;
  while (k !== undefined) {
    path.push({ x: k % width, y: Math.floor(k / width) });
    k = cameFrom.get(k);
  }
  path.reverse();
  path.shift(); // exclude the start cell
  return path;
}

/**
 * The walkable cell nearest to `from` (Manhattan rings, row-major within a ring),
 * or null if nothing is walkable. Used to step someone out of a footprint that a
 * facility has just been built or moved onto (#78).
 */
export function nearestWalkable(grid: WalkGrid, from: PathNode): PathNode | null {
  if (grid.isWalkable(from.x, from.y)) return { x: from.x, y: from.y };
  const maxR = grid.width + grid.height;
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const rest = r - Math.abs(dy);
      for (const dx of rest === 0 ? [0] : [-rest, rest]) {
        if (grid.isWalkable(from.x + dx, from.y + dy)) return { x: from.x + dx, y: from.y + dy };
      }
    }
  }
  return null;
}

// ── Footpaths (#395) ────────────────────────────────────────────────────────
//
// The main path is the entrance column down the middle of the grid plus the
// walkway ring just outside it. Every facility also gets a short footpath from
// its door to the nearest paved cell, derived here from facility positions alone:
// nothing is saved, so an old save gets its paths the moment it loads. Paths are
// for looks (and walking); they never block placement or change any number.

/** A facility as autoPaths needs it: what it is and where its footprint's origin sits. */
export interface SitedFacility {
  defId: FacilityDefId;
  x: number;
  y: number;
}

/** Is (x, y) a grid cell of the entrance path (the paved column from the gate to the front walkway)? */
export function onEntrancePath(x: number, y: number, gridW = GRID_W, gridH = GRID_H): boolean {
  return x === entranceColumn(gridW) && y >= 0 && y < gridH;
}

/** Is (x, y) on the walkway ring hugging the grid (one cell outside it)? */
export function onWalkway(x: number, y: number, gridW = GRID_W, gridH = GRID_H): boolean {
  if (x < -1 || y < -1 || x > gridW || y > gridH) return false;
  return x === -1 || y === -1 || x === gridW || y === gridH;
}

type Step = readonly [number, number];
const SIDE_STEP: Record<'n' | 'e' | 's' | 'w', Step> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/**
 * Cells next to a footprint, door first: the middle of the door side, the rest of
 * that side nearest-first, then the other sides the same way. A footpath starts
 * from the first of these that can reach the main path.
 */
function doorCells(f: SitedFacility): { x: number; y: number; out: Step }[] {
  const { w, h } = FACILITY_CATALOG[f.defId].footprint;
  const door = FACILITY_DOOR[f.defId];
  const sides = [door, ...(['s', 'e', 'n', 'w'] as const).filter((s) => s !== door)];
  const out: { x: number; y: number; out: Step }[] = [];
  for (const side of sides) {
    const along = side === 's' || side === 'n' ? w : h;
    const mid = Math.floor(along / 2);
    const order = Array.from({ length: along }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
    for (const i of order) {
      const x = side === 'e' ? f.x + w : side === 'w' ? f.x - 1 : f.x + i;
      const y = side === 's' ? f.y + h : side === 'n' ? f.y - 1 : f.y + i;
      out.push({ x, y, out: SIDE_STEP[side] });
    }
  }
  return out;
}

/**
 * The footpath cells for a set of facilities: for each facility in order, a route
 * from its door (FACILITY_DOOR) to the nearest paved cell (the entrance path, the
 * walkway ring, or a footpath laid for an earlier facility), around every
 * footprint. The route keeps going the way it is heading where it can, so paths
 * run in straight legs. A facility with no route gets no path. Pure and
 * deterministic: same facilities, same cells, row-major order.
 */
export function autoPaths(facilities: readonly SitedFacility[], gridW = GRID_W, gridH = GRID_H): PathNode[] {
  // Work on the grid plus the walkway ring: index (y + 1) * W2 + (x + 1).
  const W2 = gridW + 2;
  const H2 = gridH + 2;
  const idx = (x: number, y: number): number => (y + 1) * W2 + (x + 1);
  const inside = (x: number, y: number): boolean => x >= -1 && y >= -1 && x <= gridW && y <= gridH;

  const blocked = new Uint8Array(W2 * H2);
  for (const f of facilities) {
    const { w, h } = FACILITY_CATALOG[f.defId].footprint;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (inside(f.x + dx, f.y + dy)) blocked[idx(f.x + dx, f.y + dy)] = 1;
  }
  const paved = new Uint8Array(W2 * H2);
  for (let y = -1; y <= gridH; y++) {
    for (let x = -1; x <= gridW; x++) {
      if (blocked[idx(x, y)]) continue;
      if (onWalkway(x, y, gridW, gridH) || onEntrancePath(x, y, gridW, gridH)) paved[idx(x, y)] = 1;
    }
  }

  const laid = new Uint8Array(W2 * H2);
  const dist = new Int32Array(W2 * H2);
  for (const f of facilities) {
    // Distance to the nearest paved cell, through open ground (multi-source BFS).
    dist.fill(-1);
    const queue: number[] = [];
    for (let i = 0; i < paved.length; i++) if (paved[i]) { dist[i] = 0; queue.push(i); }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q]!;
      const x = (i % W2) - 1;
      const y = Math.floor(i / W2) - 1;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(nx, ny)) continue;
        const n = idx(nx, ny);
        if (blocked[n] || dist[n] !== -1) continue;
        dist[n] = dist[i]! + 1;
        queue.push(n);
      }
    }

    const start = doorCells(f).find((c) => inside(c.x, c.y) && !blocked[idx(c.x, c.y)] && dist[idx(c.x, c.y)]! >= 0);
    if (!start) continue;
    // Walk downhill to the path, preferring to keep the current heading.
    let { x, y } = start;
    let heading: Step = start.out;
    while (dist[idx(x, y)]! > 0) {
      paved[idx(x, y)] = 1;
      laid[idx(x, y)] = 1;
      const d = dist[idx(x, y)]!;
      const next = [heading, ...NEIGHBOURS].find(([dx, dy]) => inside(x + dx, y + dy) && dist[idx(x + dx, y + dy)] === d - 1)!;
      heading = next;
      x += next[0];
      y += next[1];
    }
  }

  const out: PathNode[] = [];
  for (let y = 0; y < gridH; y++) for (let x = 0; x < gridW; x++) if (laid[idx(x, y)]) out.push({ x, y });
  return out;
}
