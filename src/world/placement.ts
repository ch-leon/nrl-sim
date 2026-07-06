// src/world/placement.ts — facility placement (BAK-178 / WU-8).
//
// Two layers live here:
//   1. Pure, Phaser-free logic — validatePlacement / footprintTiles — unit-tested
//      under tests/world/placement.test.ts (ARCHITECTURE §1: sim/data logic is
//      headless). These never touch Phaser or the scene.
//   2. PlacementController — the Phaser view glue that drives the grid-snapped
//      ghost sprite, tint feedback, confirm/cancel, and (on commit) money spend,
//      facility append, and path-grid blocking. Excluded from unit tests.
//
// A tiny scene registry (setActiveGroundsScene / activeGroundsScene) lets DOM
// screens (build.ts) reach the live GroundsScene without importing Phaser types
// across the boundary. GroundsScene.create() registers itself.

import type Phaser from 'phaser';
import { GRID_W, GRID_H } from '../config';
import { getState, type GameState } from '../core/state';
import { bus } from '../core/events';
import { spendMoney, addFacility } from '../data/club';
import { FACILITY_CATALOG, type FacilityDef, type FacilityDefId } from '../data/facility';
import type { WalkGrid } from './path';

export interface PlaceValidation {
  ok: boolean;
  reason?: string;
}

// Machine reasons (exact strings per spec) mapped to human copy for ui:notify.
export type PlaceReason = 'out-of-bounds' | 'overlap' | 'insufficient-funds';

const REASON_TEXT: Record<PlaceReason, string> = {
  'out-of-bounds': "It won't fit there.",
  overlap: 'Something is already built there.',
  'insufficient-funds': "You can't afford that.",
};

/** Human-readable copy for a validation reason (for ui:notify). */
export function reasonText(reason: string): string {
  return REASON_TEXT[reason as PlaceReason] ?? 'Cannot build there.';
}

/**
 * Grid tiles occupied by a footprint anchored at origin (x, y). Used for both
 * overlap testing and path-grid blocking. Order is row-major (y outer, x inner).
 */
export function footprintTiles(
  def: FacilityDef,
  x: number,
  y: number,
): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let dy = 0; dy < def.footprint.h; dy++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      tiles.push({ x: x + dx, y: y + dy });
    }
  }
  return tiles;
}

/**
 * Pure placement validation. Checks, in order: footprint fully inside the grid,
 * no overlap with an existing facility's footprint, and sufficient funds.
 * Returns the first failing reason (exact strings per spec) or { ok: true }.
 */
export function validatePlacement(
  state: GameState,
  defId: FacilityDefId,
  x: number,
  y: number,
): PlaceValidation {
  const def = FACILITY_CATALOG[defId];
  const { w, h } = def.footprint;

  // Bounds — exclusive upper edge (x+w / y+h).
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) {
    return { ok: false, reason: 'out-of-bounds' };
  }

  // Overlap — any occupied tile shared with an existing facility.
  const wanted = footprintTiles(def, x, y);
  const occupied = new Set<string>();
  for (const f of state.facilities) {
    const fDef = FACILITY_CATALOG[f.defId];
    for (const t of footprintTiles(fDef, f.x, f.y)) {
      occupied.add(`${t.x},${t.y}`);
    }
  }
  for (const t of wanted) {
    if (occupied.has(`${t.x},${t.y}`)) {
      return { ok: false, reason: 'overlap' };
    }
  }

  // Funds — build cost is the level-1 cost.
  if (state.money < def.cost) {
    return { ok: false, reason: 'insufficient-funds' };
  }

  return { ok: true };
}

// ── Scene registry (DOM ↔ live scene bridge) ───────────────────────────────

let active: GroundsSceneLike | null = null;

/** Minimal surface the build screen needs from the live GroundsScene. */
export interface GroundsSceneLike {
  enterPlacementMode(defId: FacilityDefId): void;
}

/** Called by GroundsScene.create() so DOM screens can reach the live scene. */
export function setActiveGroundsScene(scene: GroundsSceneLike | null): void {
  active = scene;
}

/** The currently-active GroundsScene, or null if none is mounted. */
export function activeGroundsScene(): GroundsSceneLike | null {
  return active;
}

// ── PlacementController (Phaser view glue) ──────────────────────────────────

/**
 * Drives the grid-snapped placement ghost on GroundsScene. The ghost is a set of
 * per-footprint-tile highlight images tinted ok/bad (all-or-nothing) based on
 * validatePlacement. Confirm commits via spendMoney + addFacility, blocks the
 * path grid, and emits facility:placed; cancel just tears the ghost down.
 */
export class PlacementController {
  private scene: Phaser.Scene;
  private path: WalkGrid;
  private cellToWorld: (gx: number, gy: number) => { x: number; y: number };
  private depthFn: (gx: number, gy: number, layer?: number) => number;

  private defId: FacilityDefId | null = null;
  private ghost: Phaser.GameObjects.Image[] = [];
  private gx = 0;
  private gy = 0;

  constructor(
    scene: Phaser.Scene,
    path: WalkGrid,
    deps: {
      cellToWorld: (gx: number, gy: number) => { x: number; y: number };
      depth: (gx: number, gy: number, layer?: number) => number;
    },
  ) {
    this.scene = scene;
    this.path = path;
    this.cellToWorld = deps.cellToWorld;
    this.depthFn = deps.depth;
  }

  get active(): boolean {
    return this.defId !== null;
  }

  /** Enter placement mode for a facility, spawning a fresh ghost. */
  enterPlacementMode(defId: FacilityDefId): void {
    this.clearGhost(); // rapid re-entry: destroy any existing ghost first
    this.defId = defId;
    this.gx = 0;
    this.gy = 0;
    this.spawnGhost();
    this.moveGhost(this.gx, this.gy);
  }

  /** Snap the ghost origin to (gx, gy) and retint the whole footprint ok/bad. */
  moveGhost(gx: number, gy: number): void {
    if (this.defId === null) return;
    this.gx = gx;
    this.gy = gy;
    const def = FACILITY_CATALOG[this.defId];
    const v = validatePlacement(getState(), this.defId, gx, gy);
    const key = v.ok ? 'tile-highlight-ok' : 'tile-highlight-bad';

    const tiles = footprintTiles(def, gx, gy);
    for (let i = 0; i < this.ghost.length; i++) {
      const img = this.ghost[i]!;
      const t = tiles[i]!;
      const w = this.cellToWorld(t.x, t.y);
      img.setTexture(key);
      img.setPosition(w.x, w.y);
      // Sit just above the floor tile at that cell.
      img.setDepth(this.depthFn(t.x, t.y, 1));
    }
  }

  /**
   * Re-validate and, if valid, commit: spend money, append the PlacedFacility,
   * block footprint tiles for pathing, and exit. Invalid confirm mutates nothing
   * and emits a ui:notify danger. Returns the validation result either way.
   */
  confirm(): PlaceValidation {
    if (this.defId === null) return { ok: false, reason: 'out-of-bounds' };
    const defId = this.defId;
    const def = FACILITY_CATALOG[defId];
    const v = validatePlacement(getState(), defId, this.gx, this.gy);
    if (!v.ok) {
      bus.emit('ui:notify', {
        text: reasonText(v.reason ?? ''),
        kind: 'danger',
      });
      return v;
    }

    // Commit. spendMoney is the single source of truth for the deduction.
    spendMoney(def.cost, `build:${defId}`);
    const placed = addFacility(defId, this.gx, this.gy, 1); // emits facility:placed
    if (placed) {
      for (const t of footprintTiles(def, this.gx, this.gy)) {
        this.path.setBlocked(t.x, t.y, true);
      }
      bus.emit('ui:notify', { text: `${def.name} built!`, kind: 'success' });
    }
    this.exit();
    return v;
  }

  /** Cancel placement without mutating state. */
  cancel(): void {
    this.exit();
  }

  private exit(): void {
    this.clearGhost();
    this.defId = null;
  }

  private spawnGhost(): void {
    if (this.defId === null) return;
    const def = FACILITY_CATALOG[this.defId];
    const count = def.footprint.w * def.footprint.h;
    for (let i = 0; i < count; i++) {
      const img = this.scene.add.image(0, 0, 'tile-highlight-ok');
      img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
      this.ghost.push(img);
    }
  }

  private clearGhost(): void {
    for (const img of this.ghost) img.destroy();
    this.ghost = [];
  }
}
