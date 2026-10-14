import Phaser from 'phaser';
import { GRID_W, GRID_H, TILE_W, TILE_H } from '../config';
import { gridToScreen, screenToGrid, depth, inBounds } from '../world/iso';
import { CameraController } from '../world/camera';
import { WalkGrid, findPath, type PathNode } from '../world/path';
import {
  PlacementController,
  footprintTiles,
  setActiveGroundsScene,
} from '../world/placement';
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import { getState, type PlacedFacility } from '../core/state';
import { bus } from '../core/events';
import { openFacilityPopup } from '../ui/screens/build';
import { attachGroundsFx } from '../fx/particles';
import {
  grassVariantKey,
  pathEdgeKey,
  dirtEdgeKey,
  SIDES,
  SURROUND_KEY,
  SURROUND_SIZE,
  type Side,
} from '../art/grounds/tiles';
import { CHAR_H, CHAR_FOOT_Y } from '../art/grounds/manager';
import { facilityOrigin, facilityTextureKey } from '../art/grounds/facilities';
import { decorLayout, surroundPaths, entranceColumn } from '../art/grounds/decor';
import { ROUGH } from '../art/grounds/palette';

type Dir = 'n' | 'e' | 's' | 'w';

// grid +x = 'e', +y = 's' — on screen +gx runs right-down and +gy left-down;
// the manager's frames face those diagonals (src/art/grounds/manager.ts).
function stepDir(dx: number, dy: number): Dir {
  if (dx > 0) return 'e';
  if (dx < 0) return 'w';
  if (dy > 0) return 's';
  return 'n';
}

const CHAR_SPEED = 120; // px/s
// Feet stand on the tile centre: half a tile below the cell's top vertex.
const CHAR_FOOT_DY = TILE_H / 2;
// Characters sort one layer above facilities (layer 1) so that on a depth tie
// (standing just in front of a building's front row) they draw in front.
const CHAR_LAYER = 2;
// CameraController's default minimum zoom — the surround fill covers that view.
const MIN_ZOOM = 0.5;

// Tile ids -> generated texture keys (BAK-158). Grass picks a lawn variant per cell.
enum Tile {
  Grass = 0,
  Dirt = 1,
  Path = 2,
}
const KEY: Record<Exclude<Tile, Tile.Grass>, string> = {
  [Tile.Dirt]: 'tile-dirt',
  [Tile.Path]: 'tile-path',
};

// Neighbour offset for each cell side (n = -gy, e = +gx, s = +gy, w = -gx).
const SIDE_STEP: Record<Side, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

// Material of a cell anywhere on the map: grid tiles, the paved surround, or rough grass.
type Material = Tile | 'rough';

/**
 * GroundsScene renders the 20x20 isometric club grounds from an in-memory tile
 * array (ARCHITECTURE.md §4 — no Tiled/JSON tilemaps). Depth-sorted via iso.depth
 * so later sprites (characters, facilities) layer correctly.
 */
export class GroundsScene extends Phaser.Scene {
  // Exposed for later WUs (placement, pathing) to read. Indexed [gy][gx].
  private tiles: Tile[][] = [];
  // Paved cells outside the grid (walkway ring + entrance road), as "gx,gy" keys.
  private pavedSurround = new Set<string>();
  // X offset applied to every rendered tile so negative-screenX cells stay on canvas.
  private offsetX = GRID_H * (TILE_W / 2);
  private camController!: CameraController;

  // Character + pathing state (BAK-161).
  private walkGrid!: WalkGrid;
  private char!: Phaser.GameObjects.Sprite;
  private charCell: { gx: number; gy: number } = { gx: 0, gy: 0 };
  private path: PathNode[] = [];
  private lastDir: Dir = 's';

  // Facility placement (WU-8 / BAK-178).
  private placement!: PlacementController;
  // Rendered facility sprites keyed by PlacedFacility instance id (for re-render).
  private facilitySprites = new Map<string, Phaser.GameObjects.Image>();
  private offFacilityPlaced: (() => void) | null = null;
  private offStateChanged: (() => void) | null = null;

  constructor() {
    super('Grounds'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.tiles = this.buildTileArray();
    this.renderGround();
    this.setupCamera();
    this.setupCharacter();
    this.setupPlacement();
    this.setupTapToMove();
    this.renderFacilities();

    // Register with the DOM ↔ scene bridge so build.ts can start placement mode.
    setActiveGroundsScene(this);
    attachGroundsFx(this); // BAK-201: pooled coin/dust/confetti particle FX (WU-14)

    // Re-render facilities whenever one is placed or state otherwise changes
    // (e.g. an upgrade bumps a level). Kept unsubscribed on shutdown.
    this.offFacilityPlaced = bus.on('facility:placed', () => this.renderFacilities());
    this.offStateChanged = bus.on('state:changed', () => this.renderFacilities());

    // Detach camera listeners + bus subs when the scene shuts down (Grounds -> Match).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.camController.destroy();
      this.offFacilityPlaced?.();
      this.offStateChanged?.();
      setActiveGroundsScene(null);
    });
  }

  private setupPlacement(): void {
    this.placement = new PlacementController(this, this.walkGrid, {
      cellToWorld: (gx, gy) => this.cellToWorld(gx, gy),
      depth,
    });
  }

  /** Enter facility placement mode (called from the DOM build menu via the registry). */
  enterPlacementMode(defId: FacilityDefId): void {
    this.placement.enterPlacementMode(defId);
  }

  /** Grid -> world (screen) point with the centering offset baked in. */
  private cellToWorld(gx: number, gy: number): { x: number; y: number } {
    const p = gridToScreen(gx, gy);
    return { x: p.x + this.offsetX, y: p.y };
  }

  private setupCharacter(): void {
    // All cells walkable initially; facilities (WU-8) will call setBlocked.
    this.walkGrid = new WalkGrid(GRID_W, GRID_H);

    const startGx = Math.floor(GRID_W / 2);
    const startGy = Math.floor(GRID_H / 2);
    this.charCell = { gx: startGx, gy: startGy };
    const w = this.cellToWorld(startGx, startGy);
    this.char = this.add.sprite(w.x, w.y + CHAR_FOOT_DY, 'char-idle-s');
    // Anchor on the ground-contact row so the feet sit on the tile centre.
    this.char.setOrigin(0.5, (CHAR_FOOT_Y + 1) / CHAR_H);
    this.char.setDepth(depth(startGx, startGy, CHAR_LAYER));
  }

  /** Grid cell under a pointer. Tiles anchor at their top vertex, so shift by half a tile. */
  private pointerCell(pointer: Phaser.Input.Pointer): { gx: number; gy: number } {
    return screenToGrid(pointer.worldX - this.offsetX, pointer.worldY - TILE_H / 2);
  }

  /** Expose the walkability grid so later WUs can block facility footprints. */
  getWalkGrid(): WalkGrid {
    return this.walkGrid;
  }

  private setupTapToMove(): void {
    // While in placement mode the ghost follows the pointer (grid-snapped).
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.placement.active) return;
      const cell = this.pointerCell(pointer);
      this.placement.moveGhost(cell.gx, cell.gy);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // BAK-159 contract: ignore taps that were actually pans.
      if (this.camController.wasDragging()) return;
      const cell = this.pointerCell(pointer);

      // Placement mode: a tap snaps to and confirms the current cell.
      if (this.placement.active) {
        this.placement.moveGhost(cell.gx, cell.gy);
        this.placement.confirm(); // commits if valid; notifies + stays on ghost logic if not
        return;
      }

      // Tapping a placed facility opens its upgrade/info popup.
      const hit = this.facilityAt(cell.gx, cell.gy);
      if (hit) {
        openFacilityPopup(hit);
        return;
      }

      if (!inBounds(cell.gx, cell.gy)) return;
      if (!this.walkGrid.isWalkable(cell.gx, cell.gy)) return;
      this.path = findPath(
        this.walkGrid,
        { x: this.charCell.gx, y: this.charCell.gy },
        { x: cell.gx, y: cell.gy },
      );
    });
  }

  /** The placed facility whose footprint covers (gx, gy), if any. */
  private facilityAt(gx: number, gy: number): PlacedFacility | undefined {
    return getState().facilities.find((f) => {
      const def = FACILITY_CATALOG[f.defId];
      return gx >= f.x && gx < f.x + def.footprint.w && gy >= f.y && gy < f.y + def.footprint.h;
    });
  }

  /**
   * Render every placed facility from state as a `facility-<defId>-<level>` sprite and
   * block its footprint tiles for pathing. Idempotent: existing sprites are
   * reused/updated (levels can change on upgrade); removed facilities are culled.
   */
  private renderFacilities(): void {
    const facilities = getState().facilities;
    const seen = new Set<string>();

    for (const f of facilities) {
      seen.add(f.id);
      const def = FACILITY_CATALOG[f.defId];
      // Anchor the sprite at the top vertex of the footprint's origin (x, y) tile
      // — the same top-vertex convention the tile images use. Facility textures
      // rise above their footprint diamond, so the origin comes from
      // facilityOrigin() (diamond top vertex within the texture).
      const world = this.cellToWorld(f.x, f.y);
      // Depth uses the footprint's FRONT tile (max gx+gy) so it layers above
      // tiles/characters standing behind it (ARCHITECTURE §7).
      const frontGx = f.x + def.footprint.w - 1;
      const frontGy = f.y + def.footprint.h - 1;
      const d = depth(frontGx, frontGy, 1);

      const key = facilityTextureKey(f.defId, f.level);
      let sprite = this.facilitySprites.get(f.id);
      if (!sprite) {
        sprite = this.add.image(world.x, world.y, key);
        this.facilitySprites.set(f.id, sprite);
      }
      // Level art differs in height, so the swap re-derives the origin too.
      if (sprite.texture.key !== key) sprite.setTexture(key);
      const o = facilityOrigin(def.footprint, sprite.height);
      sprite.setOrigin(o.x, o.y);
      sprite.setPosition(world.x, world.y);
      sprite.setDepth(d);

      // Block the footprint for pathfinding (safe to repeat).
      for (const t of footprintTiles(def, f.x, f.y)) {
        this.walkGrid.setBlocked(t.x, t.y, true);
      }
    }

    // Cull sprites for facilities no longer in state (defensive; no removal yet).
    for (const [id, sprite] of this.facilitySprites) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.facilitySprites.delete(id);
      }
    }
  }

  update(_time: number, delta: number): void {
    this.stepCharacter(delta);
  }

  private stepCharacter(delta: number): void {
    if (this.path.length === 0) {
      if (this.char.anims.isPlaying) {
        this.char.anims.stop();
        this.char.setTexture(`char-idle-${this.lastDir}`);
      }
      return;
    }

    const next = this.path[0]!;
    const target = this.cellToWorld(next.x, next.y);
    const targetY = target.y + CHAR_FOOT_DY;
    const dx = target.x - this.char.x;
    const dy = targetY - this.char.y;
    const dist = Math.hypot(dx, dy);
    const move = (CHAR_SPEED * delta) / 1000;

    if (dist <= move || dist === 0) {
      // Arrived at the node: snap, advance, update facing/depth.
      this.char.setPosition(target.x, targetY);
      const stepped = this.path.shift()!;
      const dir = stepDir(stepped.x - this.charCell.gx, stepped.y - this.charCell.gy);
      this.charCell = { gx: stepped.x, gy: stepped.y };
      this.char.setDepth(depth(this.charCell.gx, this.charCell.gy, CHAR_LAYER));
      this.setFacing(dir);
    } else {
      const dir = stepDir(next.x - this.charCell.gx, next.y - this.charCell.gy);
      this.setFacing(dir);
      this.char.x += (dx / dist) * move;
      this.char.y += (dy / dist) * move;
      // In transit, sort with whichever of the two cells is further forward so
      // the floor tile being stepped onto never draws over the feet.
      const fwd = next.x + next.y > this.charCell.gx + this.charCell.gy ? { gx: next.x, gy: next.y } : this.charCell;
      this.char.setDepth(depth(fwd.gx, fwd.gy, CHAR_LAYER));
    }
  }

  private setFacing(dir: Dir): void {
    this.lastDir = dir;
    const animKey = `walk-${dir}`;
    if (this.char.anims.currentAnim?.key !== animKey || !this.char.anims.isPlaying) {
      this.char.play(animKey, true);
    }
  }

  /**
   * Pannable world bounds: the iso extent of the grid, padded far enough to
   * pan out over the walkway, fence, trees and floodlights.
   */
  private worldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    // Corner cells span the projected extent. With offsetX applied, min screenX is
    // at the left corner (0, GRID_H-1); max at the right corner (GRID_W-1, 0).
    const corners = [
      gridToScreen(0, 0),
      gridToScreen(GRID_W - 1, 0),
      gridToScreen(0, GRID_H - 1),
      gridToScreen(GRID_W - 1, GRID_H - 1),
    ];
    const xs = corners.map((c) => c.x + this.offsetX);
    const ys = corners.map((c) => c.y);
    const pad = TILE_W * 4;
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + TILE_W + pad, // + tile width for the far diamond
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + TILE_H + pad, // + tile height for the bottom diamond
    };
  }

  private setupCamera(): void {
    const { minX, minY, maxX, maxY } = this.worldBounds();
    this.camController = new CameraController(this, {
      world: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    });
    // Start centred on the grounds (bounds clamp this when zoomed out).
    const mid = this.cellToWorld(GRID_W / 2, GRID_H / 2);
    this.cameras.main.centerOn(mid.x, mid.y);
    this.cameras.main.setBackgroundColor(ROUGH.mid);
  }

  /** Default Grass with a Path column (gate to front fence) and a Dirt patch. */
  private buildTileArray(): Tile[][] {
    const tiles: Tile[][] = [];
    for (let gy = 0; gy < GRID_H; gy++) {
      const row: Tile[] = [];
      for (let gx = 0; gx < GRID_W; gx++) {
        row.push(Tile.Grass);
      }
      tiles.push(row);
    }
    // A path running the full middle column — from the entrance gate on the back
    // edge to the walkway on the front — with a dirt patch beside it.
    const mid = entranceColumn(GRID_W);
    for (let gy = 0; gy < GRID_H; gy++) {
      tiles[gy]![mid] = Tile.Path;
    }
    for (let gy = 6; gy < 10; gy++) {
      for (let gx = 4; gx < 7; gx++) {
        tiles[gy]![gx] = Tile.Dirt;
      }
    }
    return tiles;
  }

  /** Material at any cell: grid tiles inside, paved walkway/road around, rough beyond. */
  private materialAt(gx: number, gy: number): Material {
    if (inBounds(gx, gy)) return this.tiles[gy]![gx]!;
    return this.pavedSurround.has(`${gx},${gy}`) ? Tile.Path : 'rough';
  }

  /**
   * Draw the ground: rough grass under everything, the grid's tiles (lawn
   * variant per cell), the paved surround, curb/fringe overlays where materials
   * meet, then the scenery outside the grid. Nothing outside the grid touches
   * placement or the walk grid — it is purely visual.
   */
  private renderGround(): void {
    this.pavedSurround = new Set(surroundPaths(GRID_W, GRID_H).map((c) => `${c.gx},${c.gy}`));
    this.renderSurroundFill();

    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const t = this.tiles[gy]![gx]!;
        this.placeTile(gx, gy, t === Tile.Grass ? grassVariantKey(gx, gy) : KEY[t]);
      }
    }
    for (const c of surroundPaths(GRID_W, GRID_H)) this.placeTile(c.gx, c.gy, KEY[Tile.Path]);

    for (const d of decorLayout(GRID_W, GRID_H)) {
      const w = this.cellToWorld(d.gx, d.gy);
      const img = this.add.image(w.x, w.y, d.key);
      // Decor textures' bottom TILE_H rows are the cell diamond (decor.ts convention).
      img.setOrigin(0.5, (img.height - TILE_H) / img.height);
      img.setDepth(depth(d.gx, d.gy, 1));
    }
  }

  /** One floor tile (top vertex at the projected point) plus any edge overlays. */
  private placeTile(gx: number, gy: number, key: string): void {
    const w = this.cellToWorld(gx, gy);
    const img = this.add.image(w.x, w.y, key);
    img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
    img.setDepth(depth(gx, gy));

    const m = this.materialAt(gx, gy);
    for (const side of SIDES) {
      const [dx, dy] = SIDE_STEP[side];
      const n = this.materialAt(gx + dx, gy + dy);
      let edge: string | null = null;
      if (m === Tile.Path && n !== Tile.Path) edge = pathEdgeKey(side);
      else if (m === Tile.Dirt && n === Tile.Grass) edge = dirtEdgeKey(side);
      if (!edge) continue;
      const e = this.add.image(w.x, w.y, edge);
      e.setOrigin(0.5, 0);
      e.setDepth(depth(gx, gy) + 0.5); // above its own tile, below anything standing on it
    }
  }

  /**
   * Cover everything the camera can show with the seamless rough-grass texture:
   * the pannable world plus enough extra that a fully zoomed-out view (where
   * the world is smaller than the viewport and pinned top-left) is still grass.
   */
  private renderSurroundFill(): void {
    const b = this.worldBounds();
    const size = SURROUND_SIZE;
    const x1 = Math.max(b.maxX, b.minX + this.scale.width / MIN_ZOOM) + size;
    const y1 = Math.max(b.maxY, b.minY + this.scale.height / MIN_ZOOM) + size;
    for (let y = b.minY - size; y < y1; y += size) {
      for (let x = b.minX - size; x < x1; x += size) {
        this.add.image(x, y, SURROUND_KEY).setOrigin(0, 0).setDepth(-1e6);
      }
    }
  }
}
