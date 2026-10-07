// src/art/grounds/decor.ts — scenery framing the club grounds.
//
// Trees, bushes, flower beds, a white picket fence, an entrance arch and
// floodlight towers, all placed OUTSIDE the GRID_W×GRID_H buildable grid so
// placement and pathfinding are untouched. Layout (decorLayout /
// surroundPaths) is a pure function of the grid size so it is testable and
// identical every boot.
//
// Texture convention: every decor texture is TILE_W wide and its bottom TILE_H
// rows are the cell's diamond (top vertex at (TILE_W/2, h − TILE_H)), so the
// scene places it at cellToWorld(gx, gy) with origin (0.5, (h − TILE_H) / h).
import { TILE_W, TILE_H } from '../../config';
import { PixelBuffer, noise2, bayer, shade, mix } from '../pixel';
import { IsoPainter, UNIT, setUnder, stamp } from './iso3d';
import type { Side } from './tiles';
import { OUTLINE, LEAF, WOOD, WHITE, CLUB, METAL, STONE, RED } from './palette';

/** Fresh decor canvas with `lift` px above the cell's top vertex. */
function canvas(lift: number): { buf: PixelBuffer; iso: IsoPainter } {
  const buf = new PixelBuffer(TILE_W, lift + TILE_H);
  return { buf, iso: new IsoPainter(buf, TILE_W / 2, lift) };
}

/** Soft oval ground shadow, painted only on still-transparent pixels. */
function groundShadow(buf: PixelBuffer, cx: number, cy: number, rx: number, ry: number, a = 0.25): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) setUnder(buf, x, y, 0x000000, a);
    }
  }
}

/**
 * Paint a lumpy foliage mass from overlapping discs, lit from the top-left.
 * Each pixel takes its shading from the front-most disc covering it.
 */
function foliage(buf: PixelBuffer, discs: readonly [number, number, number][], seed: number): void {
  const tones = [LEAF.dark, LEAF.mid, LEAF.light, LEAF.hi] as const;
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      let hit: [number, number, number] | undefined;
      for (const d of discs) {
        if ((x + 0.5 - d[0]) ** 2 + (y + 0.5 - d[1]) ** 2 <= d[2] * d[2]) hit = d;
      }
      if (!hit) continue;
      const nx = (x + 0.5 - hit[0]) / hit[2];
      const ny = (y + 0.5 - hit[1]) / hit[2];
      const lit = -0.6 * nx - 0.8 * ny; // light from top-left
      let t = 0.45 + lit * 0.45 + (bayer(x, y) - 0.5) * 0.3;
      if (noise2(x, y, seed) < 0.12) t -= 0.25; // leaf clumps
      buf.set(x, y, tones[Math.max(0, Math.min(3, Math.floor(t * 4)))]!);
    }
  }
}

// ── Trees & shrubs ──────────────────────────────────────────────────────────

/** Round deciduous tree. `variant` changes the canopy shape. */
export function treeRound(variant: 0 | 1 = 0): PixelBuffer {
  const lift = 52;
  const { buf } = canvas(lift);
  const gy = lift + TILE_H / 2; // cell centre (trunk base)
  const layer = new PixelBuffer(buf.w, buf.h);
  layer.fillRect(30, gy - 12, 4, 12, WOOD.mid);
  layer.fillRect(30, gy - 12, 1, 12, WOOD.light);
  layer.fillRect(33, gy - 12, 1, 12, WOOD.dark);
  layer.set(29, gy - 1, WOOD.mid);
  layer.set(34, gy - 1, WOOD.dark);
  const discs: [number, number, number][] =
    variant === 0
      ? [[24, gy - 24, 9], [40, gy - 24, 9], [32, gy - 33, 11], [32, gy - 22, 10], [26, gy - 31, 8]]
      : [[25, gy - 20, 8], [39, gy - 21, 8], [32, gy - 28, 10], [30, gy - 38, 8], [36, gy - 34, 8]];
  foliage(layer, discs, 81 + variant);
  layer.outline(OUTLINE);
  buf.blit(layer);
  groundShadow(buf, 35, gy, 13, 5);
  return buf;
}

/** Conical pine in three tiers. */
export function treePine(): PixelBuffer {
  const lift = 56;
  const { buf } = canvas(lift);
  const gy = lift + TILE_H / 2;
  const layer = new PixelBuffer(buf.w, buf.h);
  layer.fillRect(31, gy - 8, 3, 8, WOOD.dark);
  layer.fillRect(31, gy - 8, 1, 8, WOOD.mid);
  const tiers: [number, number, number][] = [
    [gy - 6, 13, 16], // [base y, half-width, height]
    [gy - 16, 11, 15],
    [gy - 26, 8, 16],
  ];
  for (const [by, hw, ht] of tiers) {
    for (let y = by - ht; y <= by; y++) {
      const w = Math.round(((y - (by - ht)) / ht) * hw);
      for (let x = 32 - w; x <= 32 + w - 1; x++) {
        const left = x < 32;
        const edge = y === by || noise2(x, y, 91) < 0.1;
        const c = edge ? 0x1f5130 : left ? (bayer(x, y) < 0.5 ? 0x3d8a4c : 0x34794a) : 0x285f39;
        layer.set(x, y, c);
      }
    }
  }
  layer.outline(OUTLINE);
  buf.blit(layer);
  groundShadow(buf, 35, gy, 11, 4);
  return buf;
}

/** Low round bush, optionally flowering. */
export function bush(flowers = false): PixelBuffer {
  const lift = 8;
  const { buf } = canvas(lift);
  const gy = lift + TILE_H / 2;
  const layer = new PixelBuffer(buf.w, buf.h);
  foliage(layer, [[27, gy - 5, 6], [37, gy - 5, 6], [32, gy - 9, 7]], flowers ? 97 : 95);
  if (flowers) {
    for (let i = 0; i < 7; i++) {
      const x = 24 + Math.floor(noise2(i, 1, 99) * 16);
      const y = gy - 13 + Math.floor(noise2(i, 2, 99) * 9);
      if (layer.get(x, y).alpha > 0) layer.set(x, y, i % 2 ? 0xf7a8c8 : WHITE);
    }
  }
  layer.outline(OUTLINE);
  buf.blit(layer);
  groundShadow(buf, 34, gy, 12, 4);
  return buf;
}

/** Raised timber flower bed inset in the cell. */
export function flowerBed(): PixelBuffer {
  const lift = 8;
  const { buf, iso } = canvas(lift);
  const layer = new PixelBuffer(buf.w, buf.h);
  const l = new IsoPainter(layer, iso.ox, iso.oy);
  l.box(6, 6, 26, 26, 0, 3, { top: 0x5a3d26, left: WOOD.mid, right: WOOD.dark });
  const petals = [RED.light, 0xffe36b, WHITE, 0xf7a8c8, 0xb57bf0] as const;
  l.top(7, 7, 25, 25, 3, LEAF.mid, (u, v, x, y) => {
    const n = noise2(x, y, 103);
    if (n < 0.22) return petals[Math.floor(noise2(Math.floor(u / 3), Math.floor(v / 3), 104) * petals.length)]!;
    return n < 0.6 ? LEAF.mid : n < 0.85 ? LEAF.light : LEAF.dark;
  });
  stamp(buf, layer, OUTLINE);
  return buf;
}

// ── Fences, gate, floodlights ───────────────────────────────────────────────

/** Ground-space endpoints of a cell side (in cell units 0..UNIT). */
function sideEnds(side: Side): [[number, number], [number, number]] {
  switch (side) {
    case 'n':
      return [[0, 0], [UNIT, 0]];
    case 'e':
      return [[UNIT, 0], [UNIT, UNIT]];
    case 's':
      return [[0, UNIT], [UNIT, UNIT]];
    case 'w':
      return [[0, 0], [0, UNIT]];
  }
}

/** White picket fence running along one side of a cell. */
export function fence(side: Side): PixelBuffer {
  const lift = 12;
  const { buf, iso } = canvas(lift);
  const [[ua, va], [ub, vb]] = sideEnds(side);
  // Inset slightly so the fence sits on the cell, not on its neighbour.
  const inset = 1.5;
  const du = side === 'e' ? -inset : side === 'w' ? inset : 0;
  const dv = side === 's' ? -inset : side === 'n' ? inset : 0;
  const at = (t: number, z: number): [number, number, number] => [ua + (ub - ua) * t + du, va + (vb - va) * t + dv, z];
  const shadeSide = side === 'e' || side === 'w'; // runs along v → faces ±u
  const rail = shadeSide ? 0xc9c4b8 : 0xe4dfd3;
  iso.line(at(0, 3), at(1, 3), rail);
  iso.line(at(0, 6), at(1, 6), rail);
  const pickets = 8;
  for (let i = 0; i <= pickets; i++) {
    const t = i / pickets;
    const post = i === 0 || i === pickets;
    const top = post ? 10 : 8;
    iso.line(at(t, 0), at(t, top), post ? 0xd9d3c5 : WHITE);
    iso.line(at(t, 0), at(t, 1), STONE.dark);
    iso.dot(...at(t, top + 1), mix(WHITE, OUTLINE, 0.25));
  }
  return buf;
}

/** Club entrance arch across the cell's 'n' side: brick pillars + banner. */
export function gateArch(): PixelBuffer {
  const lift = 40;
  const { buf, iso } = canvas(lift);
  const layer = new PixelBuffer(buf.w, buf.h);
  const l = new IsoPainter(layer, iso.ox, iso.oy);
  const brickC = { top: 0xd0705a, left: 0xb9523a, right: 0x8c3d2b };
  for (const u of [1, 27]) {
    l.box(u, 1, u + 4, 5, 0, 24, brickC, {
      left: (_a, z) => (Math.floor(z) % 3 === 0 ? 0xd9b8a0 : 0xb9523a),
      right: (_a, z) => (Math.floor(z) % 3 === 0 ? 0xa88a76 : 0x8c3d2b),
    });
    l.box(u - 0.5, 0.5, u + 4.5, 5.5, 24, 26, { top: CLUB.gold, left: CLUB.gold, right: CLUB.goldDark });
  }
  // Banner between the pillars.
  l.wallV(4, 5, 27, 26, 34, CLUB.navy, (a, z) =>
    z < 27 || z > 33 || a < 6 || a > 26 ? CLUB.gold : Math.abs(a - 16) < 4 && z > 28 && z < 32 ? WHITE : CLUB.navy,
  );
  l.top(5, 3, 27, 4, 34, CLUB.goldDark);
  stamp(buf, layer, OUTLINE);
  return buf;
}

/** Floodlight tower: lattice mast with a lamp bank facing the grounds. */
export function floodlight(): PixelBuffer {
  const lift = 104;
  const { buf, iso } = canvas(lift);
  const layer = new PixelBuffer(buf.w, buf.h);
  const l = new IsoPainter(layer, iso.ox, iso.oy);
  const c = UNIT / 2;
  l.box(c - 4, c - 4, c + 4, c + 4, 0, 4, { top: STONE.light, left: STONE.mid, right: STONE.dark });
  const top = 96;
  l.line([c - 2, c, 4], [c - 1, c, top], METAL.mid);
  l.line([c + 2, c, 4], [c + 1, c, top], METAL.dark);
  for (let z = 8; z < top - 4; z += 8) {
    l.line([c - 2, c, z], [c + 2, c, z + 4], METAL.light);
    l.line([c + 2, c, z + 4], [c - 2, c, z + 8], METAL.mid);
  }
  // Lamp bank facing +v (toward the camera / grounds).
  l.box(c - 8, c - 1, c + 8, c + 1, top - 2, top + 8, { top: METAL.light, left: METAL.dark, right: shade(METAL.dark, 0.8) });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      l.wallV(c + 1, c - 7 + i * 4, c - 4 + i * 4, top + j * 4, top + 3 + j * 4, 0xfff3b0);
    }
  }
  stamp(buf, layer, OUTLINE);
  groundShadow(buf, 34, lift + TILE_H / 2 + 2, 9, 3);
  return buf;
}

// ── Textures & layout ───────────────────────────────────────────────────────

export const FENCE_KEYS: Record<Side, string> = {
  n: 'decor-fence-n',
  e: 'decor-fence-e',
  s: 'decor-fence-s',
  w: 'decor-fence-w',
};

/** Every decor texture as { key, buf }. */
export function decorTextures(): { key: string; buf: PixelBuffer }[] {
  return [
    { key: 'decor-tree-0', buf: treeRound(0) },
    { key: 'decor-tree-1', buf: treeRound(1) },
    { key: 'decor-pine', buf: treePine() },
    { key: 'decor-bush', buf: bush(false) },
    { key: 'decor-bush-flower', buf: bush(true) },
    { key: 'decor-flowerbed', buf: flowerBed() },
    { key: 'decor-gate', buf: gateArch() },
    { key: 'decor-floodlight', buf: floodlight() },
    ...(Object.keys(FENCE_KEYS) as Side[]).map((s) => ({ key: FENCE_KEYS[s], buf: fence(s) })),
  ];
}

export interface DecorItem {
  key: string;
  gx: number;
  gy: number;
}

/** How many cells of scenery to lay out beyond the grid on each side. */
export const SURROUND_DEPTH = 9;

/** Grid column the entrance path runs down (matches GroundsScene's path). */
export function entranceColumn(gridW: number): number {
  return Math.floor(gridW / 2);
}

/**
 * Paved cells outside the grid: a one-cell walkway ring hugging the grid and
 * an entrance road leading out through the back gate.
 */
export function surroundPaths(gridW: number, gridH: number): { gx: number; gy: number }[] {
  const out: { gx: number; gy: number }[] = [];
  for (let gy = -1; gy <= gridH; gy++) {
    for (let gx = -1; gx <= gridW; gx++) {
      if (gx === -1 || gy === -1 || gx === gridW || gy === gridH) out.push({ gx, gy });
    }
  }
  const mid = entranceColumn(gridW);
  for (let gy = -2; gy >= -SURROUND_DEPTH; gy--) out.push({ gx: mid, gy });
  return out;
}

/** True if (gx, gy) lies inside the buildable grid. */
function inGrid(gx: number, gy: number, w: number, h: number): boolean {
  return gx >= 0 && gy >= 0 && gx < w && gy < h;
}

/**
 * Deterministic scenery placement around the grid. Nothing is ever placed on
 * a grid cell; tall things (trees, floodlights) only go on the back sides or
 * well clear of the front edges so they never hide buildable tiles.
 */
export function decorLayout(gridW: number, gridH: number): DecorItem[] {
  const items: DecorItem[] = [];
  const mid = entranceColumn(gridW);

  // Picket fence just outside the walkway ring; the entrance arch on the back side.
  for (let gx = -1; gx <= gridW; gx++) {
    items.push(gx === mid ? { key: 'decor-gate', gx, gy: -1 } : { key: FENCE_KEYS.n, gx, gy: -1 });
    items.push({ key: FENCE_KEYS.s, gx, gy: gridH });
  }
  for (let gy = -1; gy <= gridH; gy++) {
    items.push({ key: FENCE_KEYS.w, gx: -1, gy });
    items.push({ key: FENCE_KEYS.e, gx: gridW, gy });
  }

  // Floodlights on the three corners that can't hide the grid.
  const D = 4;
  const lights: [number, number][] = [
    [-D, -D],
    [gridW + D - 1, -D],
    [-D, gridH + D - 1],
  ];
  for (const [gx, gy] of lights) items.push({ key: 'decor-floodlight', gx, gy });
  const taken = new Set(lights.map(([x, y]) => `${x},${y}`));

  // Scenery field: everything from 2 cells out to SURROUND_DEPTH.
  const S = SURROUND_DEPTH;
  for (let gy = -S; gy < gridH + S; gy++) {
    for (let gx = -S; gx < gridW + S; gx++) {
      if (gx >= -1 && gy >= -1 && gx <= gridW && gy <= gridH) continue; // grid + ring
      if (taken.has(`${gx},${gy}`)) continue;
      if (Math.abs(gx - mid) <= 1 && gy < 0) continue; // keep the entrance road clear
      // Distance outside the grid, and whether this cell is on a front side.
      const dx = gx < 0 ? -gx : gx - (gridW - 1);
      const dy = gy < 0 ? -gy : gy - (gridH - 1);
      const dist = Math.max(dx, dy);
      // Front = below the grid's two lower edges on screen; tall sprites there
      // would rise over buildable tiles. The left/right corner wedges are safe.
      const front = (gx >= gridW && gy >= 0) || (gy >= gridH && gx >= 0);
      const n = noise2(gx, gy, 211);
      const pick = noise2(gx, gy, 212);
      if (front && dist <= 2) {
        // Low planting along the front fence only.
        if (n < 0.22) items.push({ key: pick < 0.4 ? 'decor-flowerbed' : pick < 0.7 ? 'decor-bush-flower' : 'decor-bush', gx, gy });
        continue;
      }
      // Woodland thickens with distance from the grid.
      const density = Math.min(0.75, 0.18 + (dist - 2) * 0.09);
      if (n < density) {
        const key = pick < 0.35 ? 'decor-pine' : pick < 0.65 ? 'decor-tree-0' : pick < 0.9 ? 'decor-tree-1' : 'decor-bush';
        items.push({ key, gx, gy });
      } else if (n > 0.95) {
        items.push({ key: 'decor-bush-flower', gx, gy });
      }
    }
  }
  return items.filter((it) => !inGrid(it.gx, it.gy, gridW, gridH));
}
