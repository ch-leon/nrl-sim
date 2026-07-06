import Phaser from 'phaser';
import { GRID_W, GRID_H, TILE_W, TILE_H } from '../config';
import { gridToScreen, screenToGrid, depth, inBounds } from '../world/iso';
import { CameraController } from '../world/camera';
import { WalkGrid, findPath, type PathNode } from '../world/path';

type Dir = 'n' | 'e' | 's' | 'w';

// grid +x = 'e', +y = 's' (screen-down) — chosen to match the iso layout (BAK-161).
function stepDir(dx: number, dy: number): Dir {
  if (dx > 0) return 'e';
  if (dx < 0) return 'w';
  if (dy > 0) return 's';
  return 'n';
}

const CHAR_SPEED = 120; // px/s
const CHAR_LIFT = 8; // spawn nudge so feet sit on the diamond top

// Tile ids -> generated texture keys (BAK-158).
enum Tile {
  Grass = 0,
  Dirt = 1,
  Path = 2,
}
const KEY: Record<Tile, string> = {
  [Tile.Grass]: 'tile-grass',
  [Tile.Dirt]: 'tile-dirt',
  [Tile.Path]: 'tile-path',
};

/**
 * GroundsScene renders the 20x20 isometric club grounds from an in-memory tile
 * array (ARCHITECTURE.md §4 — no Tiled/JSON tilemaps). Depth-sorted via iso.depth
 * so later sprites (characters, facilities) layer correctly.
 */
export class GroundsScene extends Phaser.Scene {
  // Exposed for later WUs (placement, pathing) to read. Indexed [gy][gx].
  private tiles: Tile[][] = [];
  // X offset applied to every rendered tile so negative-screenX cells stay on canvas.
  private offsetX = GRID_H * (TILE_W / 2);
  private camController!: CameraController;

  // Character + pathing state (BAK-161).
  private walkGrid!: WalkGrid;
  private char!: Phaser.GameObjects.Sprite;
  private charCell: { gx: number; gy: number } = { gx: 0, gy: 0 };
  private path: PathNode[] = [];
  private lastDir: Dir = 's';

  constructor() {
    super('Grounds'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.tiles = this.buildTileArray();
    this.renderGround();
    this.setupCamera();
    this.setupCharacter();
    this.setupTapToMove();

    // Detach camera listeners when the scene shuts down (Grounds -> Match).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.camController.destroy());
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
    this.char = this.add.sprite(w.x, w.y - CHAR_LIFT, 'char-idle-s');
    this.char.setOrigin(0.5, 1); // feet sit on the tile
    this.char.setDepth(depth(startGx, startGy, 1));
  }

  /** Expose the walkability grid so later WUs can block facility footprints. */
  getWalkGrid(): WalkGrid {
    return this.walkGrid;
  }

  private setupTapToMove(): void {
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // BAK-159 contract: ignore taps that were actually pans.
      if (this.camController.wasDragging()) return;
      // Undo the centering offset before inverting the iso projection.
      const cell = screenToGrid(pointer.worldX - this.offsetX, pointer.worldY);
      if (!inBounds(cell.gx, cell.gy)) return;
      if (!this.walkGrid.isWalkable(cell.gx, cell.gy)) return;
      this.path = findPath(
        this.walkGrid,
        { x: this.charCell.gx, y: this.charCell.gy },
        { x: cell.gx, y: cell.gy },
      );
    });
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
    const targetY = target.y - CHAR_LIFT;
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
      this.char.setDepth(depth(this.charCell.gx, this.charCell.gy, 1));
      this.setFacing(dir);
    } else {
      const dir = stepDir(next.x - this.charCell.gx, next.y - this.charCell.gy);
      this.setFacing(dir);
      this.char.x += (dx / dist) * move;
      this.char.y += (dy / dist) * move;
    }
  }

  private setFacing(dir: Dir): void {
    this.lastDir = dir;
    const animKey = `walk-${dir}`;
    if (this.char.anims.currentAnim?.key !== animKey || !this.char.anims.isPlaying) {
      this.char.play(animKey, true);
    }
  }

  /** Compute grounds world bounds from the iso extent of the grid + one-tile padding. */
  private setupCamera(): void {
    // Corner cells span the projected extent. With offsetX applied, min screenX is
    // at the top corner (0, GRID_H-1) -> 0 after offset; max at (GRID_W-1, 0).
    const corners = [
      gridToScreen(0, 0),
      gridToScreen(GRID_W - 1, 0),
      gridToScreen(0, GRID_H - 1),
      gridToScreen(GRID_W - 1, GRID_H - 1),
    ];
    const xs = corners.map((c) => c.x + this.offsetX);
    const ys = corners.map((c) => c.y);
    const pad = TILE_W;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + TILE_W + pad; // + tile width for the far diamond
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + TILE_H + pad; // + tile height for the bottom diamond

    this.camController = new CameraController(this, {
      world: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    });
  }

  /** Default Grass with a few Path/Dirt cells for visual variety. */
  private buildTileArray(): Tile[][] {
    const tiles: Tile[][] = [];
    for (let gy = 0; gy < GRID_H; gy++) {
      const row: Tile[] = [];
      for (let gx = 0; gx < GRID_W; gx++) {
        row.push(Tile.Grass);
      }
      tiles.push(row);
    }
    // A path running down the middle column, with a dirt patch beside it.
    const mid = Math.floor(GRID_W / 2);
    for (let gy = 2; gy < GRID_H - 2; gy++) {
      tiles[gy]![mid] = Tile.Path;
    }
    for (let gy = 6; gy < 10; gy++) {
      for (let gx = 4; gx < 7; gx++) {
        tiles[gy]![gx] = Tile.Dirt;
      }
    }
    return tiles;
  }

  private renderGround(): void {
    // Offset x (this.offsetX) so cells where gy > gx (negative screenX) stay on-canvas.
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const p = gridToScreen(gx, gy);
        const img = this.add.image(p.x + this.offsetX, p.y, KEY[this.tiles[gy]![gx]!]);
        img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
        img.setDepth(depth(gx, gy));
      }
    }
  }
}
