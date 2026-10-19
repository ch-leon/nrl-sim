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
import { getState, setState, type GameState, type PlacedFacility } from '../core/state';
import { bus } from '../core/events';
import { spendMoney, addFacility, earnMoney } from '../data/club';
import { FACILITY_CATALOG, upgradeCost, type FacilityDef, type FacilityDefId } from '../data/facility';
import { GROUNDS } from '../config';
import type { WalkGrid } from './path';
import { GhostPreview } from './ghostPreview';

export interface PlaceValidation {
  ok: boolean;
  reason?: string;
}

// Machine reasons (exact strings per spec) mapped to human copy for ui:notify.
export type PlaceReason = 'out-of-bounds' | 'overlap' | 'duplicate' | 'insufficient-funds' | 'missing';

const REASON_TEXT: Record<PlaceReason, string> = {
  'out-of-bounds': "It won't fit there.",
  overlap: 'Something is already built there.',
  duplicate: 'You already have one — a second earns nothing extra. Upgrade it instead.',
  'insufficient-funds': "You can't afford that.",
  missing: 'That facility is no longer there.',
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

/** Options for validating a move rather than a new build (GitHub #78). */
export interface PlaceOpts {
  /** The facility being moved: its own footprint doesn't count as an overlap, and it isn't a duplicate. */
  ignoreId?: string;
  /** Money needed instead of the build cost (the move fee). */
  cost?: number;
}

/**
 * Pure placement validation. Checks, in order: footprint fully inside the grid,
 * no overlap with an existing facility's footprint, no second copy of a unique
 * (income/gate) facility, and sufficient funds.
 * Returns the first failing reason (exact strings per spec) or { ok: true }.
 */
export function validatePlacement(
  state: GameState,
  defId: FacilityDefId,
  x: number,
  y: number,
  opts: PlaceOpts = {},
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
    if (f.id === opts.ignoreId) continue;
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

  // Unique facilities (income/gate): a second copy would earn nothing extra.
  if (def.unique && state.facilities.some((f) => f.defId === defId && f.id !== opts.ignoreId)) {
    return { ok: false, reason: 'duplicate' };
  }

  // Funds — build cost is the level-1 cost (a move pays its fee instead).
  if (state.money < (opts.cost ?? def.cost)) {
    return { ok: false, reason: 'insufficient-funds' };
  }

  return { ok: true };
}

// ── Move and demolish (GitHub #78) ──────────────────────────────────────────

/** Fee to move a facility: GROUNDS.MOVE_FEE_RATE of its build cost, whatever its level. */
export function moveFee(def: FacilityDef): number {
  return Math.round(def.cost * GROUNDS.MOVE_FEE_RATE);
}

/** Everything spent on a facility at `level`: the build plus each upgrade. */
export function facilitySpend(def: FacilityDef, level: 1 | 2 | 3): number {
  let total = def.cost;
  for (let l = 2; l <= level; l++) total += upgradeCost(def, l as 2 | 3);
  return total;
}

/** Refund for demolishing: GROUNDS.DEMOLISH_REFUND_RATE of the build plus upgrades. */
export function demolishRefund(def: FacilityDef, level: 1 | 2 | 3): number {
  return Math.round(facilitySpend(def, level) * GROUNDS.DEMOLISH_REFUND_RATE);
}

/** Can `facility` move to (x, y)? Same rules as a build, minus itself, paying the move fee. */
export function validateMove(state: GameState, facility: PlacedFacility, x: number, y: number): PlaceValidation {
  const def = FACILITY_CATALOG[facility.defId];
  return validatePlacement(state, facility.defId, x, y, { ignoreId: facility.id, cost: moveFee(def) });
}

export type MoveResult = PlaceValidation & { fee?: number };

/**
 * Move a facility to (x, y), keeping its id and level, and charge the move fee
 * (ledger reason `move:<defId>`). Moving onto its own spot is a free no-op.
 * Invalid moves change nothing.
 */
export function moveFacility(facilityId: string, x: number, y: number): MoveResult {
  const s = getState();
  const facility = s.facilities.find((f) => f.id === facilityId);
  if (!facility) return { ok: false, reason: 'missing' };
  if (facility.x === x && facility.y === y) return { ok: true, fee: 0 };
  const v = validateMove(s, facility, x, y);
  if (!v.ok) return v;
  const def = FACILITY_CATALOG[facility.defId];
  const fee = moveFee(def);
  setState({ facilities: s.facilities.map((f) => (f.id === facilityId ? { ...f, x, y } : f)) });
  if (fee > 0) spendMoney(fee, `move:${facility.defId}`);
  return { ok: true, fee };
}

/**
 * Demolish a facility: remove it and refund part of what it cost (ledger reason
 * `demolish:<defId>`). Returns the refund, or null if there is no such facility.
 */
export function demolishFacility(facilityId: string): number | null {
  const s = getState();
  const facility = s.facilities.find((f) => f.id === facilityId);
  if (!facility) return null;
  const def = FACILITY_CATALOG[facility.defId];
  const refund = demolishRefund(def, facility.level);
  setState({ facilities: s.facilities.filter((f) => f.id !== facilityId) });
  if (refund > 0) earnMoney(refund, `demolish:${facility.defId}`);
  return refund;
}

// ── Placement mode listeners (for the DOM cancel bar) ───────────────────────

/** What placement mode is doing, for the DOM bar; null when it ends. */
export type PlacementMode =
  | { kind: 'build'; defId: FacilityDefId }
  | { kind: 'move'; defId: FacilityDefId; facilityId: string; fee: number };

const modeListeners = new Set<(mode: PlacementMode | null) => void>();

/** Subscribe to placement mode changes; returns the unsubscribe. */
export function onPlacementMode(fn: (mode: PlacementMode | null) => void): () => void {
  modeListeners.add(fn);
  return () => modeListeners.delete(fn);
}

function emitMode(mode: PlacementMode | null): void {
  for (const fn of [...modeListeners]) fn(mode);
}

// ── Scene registry (DOM ↔ live scene bridge) ───────────────────────────────

let active: GroundsSceneLike | null = null;

/** Minimal surface the build screen needs from the live GroundsScene. */
export interface GroundsSceneLike {
  enterPlacementMode(defId: FacilityDefId): void;
  /** Pick a facility up and place it elsewhere (#78). */
  enterMoveMode(facilityId: string): void;
  /** Leave build/move mode without changing anything. */
  cancelPlacement(): void;
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
  // Set while moving an existing facility (#78); null for a new build.
  private moving: PlacedFacility | null = null;
  private ghost: Phaser.GameObjects.Image[] = [];
  // Textured facility preview + outline (GitHub #24), on top of the tile highlights.
  private preview: GhostPreview | null = null;
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

  /** The facility being moved, if this is a move (#78). */
  get movingId(): string | null {
    return this.moving?.id ?? null;
  }

  /** Enter placement mode for a facility, spawning a fresh ghost. */
  enterPlacementMode(defId: FacilityDefId): void {
    this.clearGhost(); // rapid re-entry: destroy any existing ghost first
    this.moving = null;
    this.defId = defId;
    this.gx = 0;
    this.gy = 0;
    this.spawnGhost();
    this.moveGhost(this.gx, this.gy);
    emitMode({ kind: 'build', defId });
  }

  /** Pick up a placed facility: the ghost starts on its current spot, at its level (#78). */
  enterMoveMode(facility: PlacedFacility): void {
    this.clearGhost();
    this.moving = facility;
    this.defId = facility.defId;
    this.gx = facility.x;
    this.gy = facility.y;
    this.spawnGhost(facility.level);
    this.moveGhost(this.gx, this.gy);
    emitMode({ kind: 'move', defId: facility.defId, facilityId: facility.id, fee: moveFee(FACILITY_CATALOG[facility.defId]) });
  }

  /** Validation for the ghost's current spot: a build, or a move of `moving`. */
  private validate(gx: number, gy: number): PlaceValidation {
    const s = getState();
    if (this.moving) {
      const cur = s.facilities.find((f) => f.id === this.moving!.id);
      if (!cur) return { ok: false, reason: 'missing' };
      if (cur.x === gx && cur.y === gy) return { ok: true }; // put it back: free
      return validateMove(s, cur, gx, gy);
    }
    return validatePlacement(s, this.defId!, gx, gy);
  }

  /** Snap the ghost origin to (gx, gy) and retint the whole footprint ok/bad. */
  moveGhost(gx: number, gy: number): void {
    if (this.defId === null) return;
    this.gx = gx;
    this.gy = gy;
    const def = FACILITY_CATALOG[this.defId];
    const v = this.validate(gx, gy);
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

    const top = this.cellToWorld(gx, gy);
    const front = this.depthFn(gx + def.footprint.w - 1, gy + def.footprint.h - 1, 1.5);
    this.preview?.update(top, v.ok, front);
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
    if (this.moving) return this.confirmMove(def);
    const v = validatePlacement(getState(), defId, this.gx, this.gy);
    if (!v.ok) {
      bus.emit('ui:notify', {
        text: reasonText(v.reason ?? ''),
        kind: 'danger',
      });
      return v;
    }

    // Commit. Place first, pay only on success — addFacility re-checks bounds/
    // overlap independently, so paying first could deduct with no facility.
    const placed = addFacility(defId, this.gx, this.gy, 1); // emits facility:placed
    if (placed) {
      spendMoney(def.cost, `build:${defId}`);
      for (const t of footprintTiles(def, this.gx, this.gy)) {
        this.path.setBlocked(t.x, t.y, true);
      }
      bus.emit('ui:notify', { text: `${def.name} built!`, kind: 'success' });
    }
    this.exit();
    return v;
  }

  /** Commit a move; the scene re-renders and re-blocks the walk grid from state. */
  private confirmMove(def: FacilityDef): PlaceValidation {
    const r = moveFacility(this.moving!.id, this.gx, this.gy);
    if (!r.ok) {
      bus.emit('ui:notify', { text: reasonText(r.reason ?? ''), kind: 'danger' });
      return r;
    }
    if (r.fee) bus.emit('ui:notify', { text: `${def.name} moved (−$${r.fee.toLocaleString('en-US')}).`, kind: 'success' });
    this.exit();
    return r;
  }

  /** Cancel placement without mutating state. */
  cancel(): void {
    this.exit();
  }

  private exit(): void {
    const was = this.defId !== null;
    this.clearGhost();
    this.defId = null;
    this.moving = null;
    if (was) emitMode(null);
  }

  private spawnGhost(level: 1 | 2 | 3 = 1): void {
    if (this.defId === null) return;
    const def = FACILITY_CATALOG[this.defId];
    const count = def.footprint.w * def.footprint.h;
    for (let i = 0; i < count; i++) {
      const img = this.scene.add.image(0, 0, 'tile-highlight-ok');
      img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
      this.ghost.push(img);
    }
    this.preview = new GhostPreview(this.scene, this.defId, def, level);
  }

  private clearGhost(): void {
    for (const img of this.ghost) img.destroy();
    this.ghost = [];
    this.preview?.destroy();
    this.preview = null;
  }
}
