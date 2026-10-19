// Grid pathfinding — pure TS, no Phaser (ARCHITECTURE.md §1). 4-connected A* with
// a Manhattan heuristic. Deterministic tie-breaking (lower f, then insertion order)
// keeps findPath output stable for tests. See BAK-161.

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
