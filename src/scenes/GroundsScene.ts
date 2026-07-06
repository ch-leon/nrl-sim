import Phaser from 'phaser';
import { GRID_W, GRID_H, TILE_W } from '../config';
import { gridToScreen, depth } from '../world/iso';

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

  constructor() {
    super('Grounds'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.tiles = this.buildTileArray();
    this.renderGround();
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
    // Offset x so cells where gy > gx (negative screenX) stay on-canvas.
    const offsetX = GRID_H * (TILE_W / 2);
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const p = gridToScreen(gx, gy);
        const img = this.add.image(p.x + offsetX, p.y, KEY[this.tiles[gy]![gx]!]);
        img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
        img.setDepth(depth(gx, gy));
      }
    }
  }
}
