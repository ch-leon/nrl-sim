import Phaser from 'phaser';
import { GRID_W, GRID_H, TILE_W, TILE_H } from '../config';
import { gridToScreen, depth } from '../world/iso';
import { CameraController } from '../world/camera';

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

  constructor() {
    super('Grounds'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.tiles = this.buildTileArray();
    this.renderGround();
    this.setupCamera();

    // Detach camera listeners when the scene shuts down (Grounds -> Match).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.camController.destroy());
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
