// Isometric projection math — pure, Phaser-free (ARCHITECTURE.md §1, §7).
// Projection: screenX = (gx - gy) * TILE_W/2, screenY = (gx + gy) * TILE_H/2.
// depth = screenY (+layer for objects sitting on a tile). See BAK-158.
import { GRID_W, GRID_H, TILE_W, TILE_H } from '../config';

export interface Point {
  x: number;
  y: number;
} // screen px

export interface Cell {
  gx: number;
  gy: number;
} // grid coords

/** Project grid coords to screen-space pixels. */
export function gridToScreen(gx: number, gy: number): Point {
  return { x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) };
}

/**
 * Inverse projection. `screenToGrid(gridToScreen(gx, gy))` rounds back to (gx, gy)
 * for all integer cells.
 */
export function screenToGrid(sx: number, sy: number): Cell {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
}

/**
 * Draw/sort order. Higher (gx + gy) draws in front (lower on screen).
 * Objects sitting on a tile pass `layer = 1` to sort above the floor tile.
 */
export function depth(gx: number, gy: number, layer = 0): number {
  return (gx + gy) * (TILE_H / 2) + layer;
}

/** True if the cell lies within the club-grounds grid. */
export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
}
