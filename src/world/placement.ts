// src/world/placement.ts — facility placement (BAK-178 / WU-8).
//
// Two layers live here:
//   1. Pure, Phaser-free logic — validatePlacement / footprintTiles — unit-tested
//      under tests/world/placement.test.ts (ARCHITECTURE §1: sim/data logic is
//      headless). These never touch Phaser or the scene.
//      suggestSpot / validCells (#395) pick where the ghost starts and which spots
//      are tinted.
//   2. PlacementController — the Phaser view glue that drives the grid-snapped
//      ghost sprite, tint feedback, aim-then-confirm/cancel (#395), and (on
//      commit) money spend, facility append, and path-grid blocking. Excluded
//      from unit tests.
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
import { onEntrancePath, onWalkway, type WalkGrid } from './path';
import { GhostPreview, strokeFootprint } from './ghostPreview';
import { ghostStyle } from './buildFeedback';
import { offerBuild } from '../systems/undo';

export interface PlaceValidation {
  ok: boolean;
  reason?: string;
}

// Machine reasons (exact strings per spec) mapped to human copy for ui:notify.
export type PlaceReason = 'out-of-bounds' | 'overlap' | 'path' | 'duplicate' | 'insufficient-funds' | 'missing';

const REASON_TEXT: Record<PlaceReason, string> = {
  'out-of-bounds': "It won't fit there.",
  overlap: 'Something is already built there.',
  path: 'Keep the entrance path clear.',
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
 * no overlap with an existing facility's footprint, the entrance path left clear
 * (#395; facilities already on it in old saves stay put), no second copy of a
 * unique (income/gate) facility, and sufficient funds.
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

  // The entrance path stays clear for new builds and moves (#395).
  if (wanted.some((t) => onEntrancePath(t.x, t.y))) {
    return { ok: false, reason: 'path' };
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

// ── Where it fits (#395) ────────────────────────────────────────────────────

/** Would the footprint go here, money aside? (The valid-spot tint ignores funds; the Build button says what's short.) */
export function fits(v: PlaceValidation): boolean {
  return v.ok || v.reason === 'insufficient-funds';
}

/**
 * Every origin (top-left cell) where `defId`'s footprint fits, money aside, in
 * row-major order: the cells tinted while placing. One validatePlacement per
 * grid cell, so it is computed once per placement, not per frame.
 */
export function validCells(state: GameState, defId: FacilityDefId, opts: PlaceOpts = {}): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (fits(validatePlacement(state, defId, x, y, opts))) out.push({ x, y });
    }
  }
  return out;
}

/** Does a footprint at (x, y) touch the main path (the entrance column or the walkway ring)? */
export function besidePath(def: FacilityDef, x: number, y: number): boolean {
  const { w, h } = def.footprint;
  for (let i = -1; i <= w; i++) {
    for (let j = -1; j <= h; j++) {
      const edge = i === -1 || j === -1 || i === w || j === h;
      const corner = (i === -1 || i === w) && (j === -1 || j === h);
      if (!edge || corner) continue;
      if (onEntrancePath(x + i, y + j) || onWalkway(x + i, y + j)) return true;
    }
  }
  return false;
}

/**
 * Where the ghost starts (#395): the free spot whose footprint centre is nearest
 * `centre` (grid units, fractional: the middle of the screen), whole cells first,
 * then a spot beside the path, then the exact distance, then row-major. Null when
 * nothing fits anywhere.
 */
export function suggestSpot(
  state: GameState,
  defId: FacilityDefId,
  centre: { x: number; y: number },
  opts: PlaceOpts = {},
): { x: number; y: number } | null {
  const def = FACILITY_CATALOG[defId];
  let best: { x: number; y: number } | null = null;
  let bestKey: [number, number, number] | null = null;
  for (const c of validCells(state, defId, opts)) {
    const d = Math.hypot(c.x + (def.footprint.w - 1) / 2 - centre.x, c.y + (def.footprint.h - 1) / 2 - centre.y);
    const key: [number, number, number] = [Math.round(d), besidePath(def, c.x, c.y) ? 0 : 1, d];
    // validCells is row-major, so a strict "less than" keeps the row-major tie-break.
    if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = c;
      bestKey = key;
    }
  }
  return best;
}

/** The facility a footprint at (x, y) would overlap, if any (for "Overlaps the Gym"). */
export function overlapping(
  state: GameState,
  defId: FacilityDefId,
  x: number,
  y: number,
  ignoreId?: string,
): PlacedFacility | undefined {
  const wanted = new Set(footprintTiles(FACILITY_CATALOG[defId], x, y).map((t) => `${t.x},${t.y}`));
  return state.facilities.find(
    (f) => f.id !== ignoreId && footprintTiles(FACILITY_CATALOG[f.defId], f.x, f.y).some((t) => wanted.has(`${t.x},${t.y}`)),
  );
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

// ── Placement mode listeners (for the DOM placement bar) ────────────────────

/** What placement mode is doing, for the DOM bar; null when it ends. */
export type PlacementMode =
  | { kind: 'build'; defId: FacilityDefId }
  | { kind: 'move'; defId: FacilityDefId; facilityId: string; fee: number };

/**
 * Where the ghost is aimed and whether it can go there (#395), for the bar's
 * Build here button. `home` is a move's own spot (putting it back is free);
 * `blocker` is the facility in the way when the reason is 'overlap'.
 */
export interface PlacementAim {
  x: number;
  y: number;
  v: PlaceValidation;
  home: boolean;
  blocker?: FacilityDefId;
}

const modeListeners = new Set<(mode: PlacementMode | null) => void>();
const aimListeners = new Set<(aim: PlacementAim) => void>();

/** Subscribe to placement mode changes; returns the unsubscribe. */
export function onPlacementMode(fn: (mode: PlacementMode | null) => void): () => void {
  modeListeners.add(fn);
  return () => modeListeners.delete(fn);
}

/** Subscribe to the ghost's aim (every move of the ghost while placing); returns the unsubscribe. */
export function onPlacementAim(fn: (aim: PlacementAim) => void): () => void {
  aimListeners.add(fn);
  return () => aimListeners.delete(fn);
}

function emitMode(mode: PlacementMode | null): void {
  for (const fn of [...modeListeners]) fn(mode);
}

function emitAim(aim: PlacementAim): void {
  for (const fn of [...aimListeners]) fn(aim);
}

// ── Scene registry (DOM ↔ live scene bridge) ───────────────────────────────

let active: GroundsSceneLike | null = null;

/** Minimal surface the build screen needs from the live GroundsScene. */
export interface GroundsSceneLike {
  enterPlacementMode(defId: FacilityDefId): void;
  /** Pick a facility up and place it elsewhere (#78). */
  enterMoveMode(facilityId: string): void;
  /** Build (or move) at the aimed spot: the bar's Build here button (#395). */
  confirmPlacement(): void;
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
 * validatePlacement, over a soft tint on every spot where the footprint fits
 * (#395). Aim, then build (#395): moving the ghost never spends anything;
 * confirm (the bar's Build here, or a second tap on the ghost) commits via
 * spendMoney + addFacility, blocks the path grid, and emits facility:placed;
 * cancel just tears the ghost down. Hover (mouse) draws a light outline only.
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
  // Soft tint on every origin where the footprint fits (#395), and the hover outline.
  private validTiles: Phaser.GameObjects.Image[] = [];
  private hoverGfx: Phaser.GameObjects.Graphics | null = null;
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

  /** Enter placement mode for a facility, the ghost starting on `start` (suggestSpot, #395). */
  enterPlacementMode(defId: FacilityDefId, start: { x: number; y: number } = { x: 0, y: 0 }): void {
    this.clearGhost(); // rapid re-entry: destroy any existing ghost first
    this.moving = null;
    this.defId = defId;
    this.spawnGhost();
    this.refreshValid();
    emitMode({ kind: 'build', defId });
    this.moveGhost(start.x, start.y);
  }

  /** Pick up a placed facility: the ghost starts on its current spot, at its level (#78). */
  enterMoveMode(facility: PlacedFacility): void {
    this.clearGhost();
    this.moving = facility;
    this.defId = facility.defId;
    this.spawnGhost(facility.level);
    this.refreshValid();
    emitMode({ kind: 'move', defId: facility.defId, facilityId: facility.id, fee: moveFee(FACILITY_CATALOG[facility.defId]) });
    this.moveGhost(facility.x, facility.y);
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

  /** Snap the ghost origin to (gx, gy), retint the whole footprint ok/bad, and tell the bar. */
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
    this.clearHover();

    const home = !!this.moving && this.moving.x === gx && this.moving.y === gy;
    const blocker = v.reason === 'overlap' ? overlapping(getState(), this.defId, gx, gy, this.moving?.id)?.defId : undefined;
    emitAim({ x: gx, y: gy, v, home, ...(blocker ? { blocker } : {}) });
  }

  /** The ghost's origin (where Build here would build). */
  get aim(): { x: number; y: number } {
    return { x: this.gx, y: this.gy };
  }

  /**
   * Is a tap at grid cell (gx, gy) / world point (wx, wy) on the ghost? Either a
   * footprint cell or an opaque pixel of the building rising above it, so tapping
   * the ghost's roof counts as the second tap (#395).
   */
  hitsGhost(gx: number, gy: number, wx: number, wy: number): boolean {
    if (this.defId === null) return false;
    const def = FACILITY_CATALOG[this.defId];
    if (gx >= this.gx && gx < this.gx + def.footprint.w && gy >= this.gy && gy < this.gy + def.footprint.h) return true;
    return this.preview?.hits(wx, wy) ?? false;
  }

  /** Mouse hover: a light outline where a click would aim (the ghost itself stays put). */
  hover(gx: number, gy: number): void {
    if (this.defId === null) return;
    if (gx === this.gx && gy === this.gy) return this.clearHover();
    const def = FACILITY_CATALOG[this.defId];
    const ok = fits(this.validate(gx, gy));
    if (!this.hoverGfx) this.hoverGfx = this.scene.add.graphics();
    this.hoverGfx.clear().setDepth(this.depthFn(gx + def.footprint.w - 1, gy + def.footprint.h - 1, 1.4));
    strokeFootprint(this.hoverGfx, this.cellToWorld(gx, gy), def, ghostStyle(ok).outlineColor, !ok);
  }

  clearHover(): void {
    this.hoverGfx?.clear();
  }

  /**
   * Recompute the valid-spot tint (once per placement, and again from refresh()
   * if the facilities change underneath it). Money is ignored here: the
   * tint says where it fits, the Build here button says what it costs.
   */
  private refreshValid(): void {
    for (const img of this.validTiles) img.destroy();
    this.validTiles = [];
    if (this.defId === null) return;
    const cells = validCells(getState(), this.defId, this.moving ? { ignoreId: this.moving.id } : {});
    for (const c of cells) {
      const w = this.cellToWorld(c.x, c.y);
      const img = this.scene.add.image(w.x, w.y, 'tile-valid');
      img.setOrigin(0.5, 0);
      img.setDepth(this.depthFn(c.x, c.y, 0.6)); // over curbs (+0.5), under the ghost (+1)
      this.validTiles.push(img);
    }
  }

  /** Facilities changed under the ghost (an Undo, say): retint and re-check the aim. */
  refresh(): void {
    if (this.defId === null) return;
    this.refreshValid();
    this.moveGhost(this.gx, this.gy);
  }

  /**
   * Re-validate and, if valid, commit: spend money, append the PlacedFacility,
   * block footprint tiles for pathing, and exit. Invalid confirm mutates nothing
   * and emits a neutral ui:notify (a refusal, not a problem: #339). Returns the validation result either way.
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
        kind: 'info',
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
      offerBuild(placed, def.cost); // "built!" with a 5-second Undo (#370)
    }
    this.exit();
    return v;
  }

  /** Commit a move; the scene re-renders and re-blocks the walk grid from state. */
  private confirmMove(def: FacilityDef): PlaceValidation {
    const r = moveFacility(this.moving!.id, this.gx, this.gy);
    if (!r.ok) {
      bus.emit('ui:notify', { text: reasonText(r.reason ?? ''), kind: 'info' });
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
    for (const img of this.validTiles) img.destroy();
    this.validTiles = [];
    this.hoverGfx?.destroy();
    this.hoverGfx = null;
    this.preview?.destroy();
    this.preview = null;
  }
}
