import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config';
import { GroundsScene } from './GroundsScene';

// Isometric diamond outline (2:1) in local texture space, TILE_W x TILE_H.
const DIAMOND: Phaser.Types.Math.Vector2Like[] = [
  { x: TILE_W / 2, y: 0 }, // top
  { x: TILE_W, y: TILE_H / 2 }, // right
  { x: TILE_W / 2, y: TILE_H }, // bottom
  { x: 0, y: TILE_H / 2 }, // left
];

// Slightly darker outline colours keyed to each fill for grid definition.
const TILE_DEFS: { key: string; fill: number; line: number; alpha: number }[] = [
  { key: 'tile-grass', fill: 0x3a7d34, line: 0x2c5f27, alpha: 1 },
  { key: 'tile-dirt', fill: 0x8a6a3a, line: 0x6b5230, alpha: 1 },
  { key: 'tile-path', fill: 0xb9a06a, line: 0x968052, alpha: 1 },
  { key: 'tile-highlight-ok', fill: 0x4caf50, line: 0x357a38, alpha: 0.5 },
  { key: 'tile-highlight-bad', fill: 0xe53935, line: 0xa32723, alpha: 0.5 },
];

/**
 * BootScene generates all placeholder textures (ARCHITECTURE.md §4/§7 — no binary
 * assets), then hands off to GroundsScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.generateTileTextures();

    // Deviation from BAK-158 wording (main.ts is orchestrator-owned): register &
    // start Grounds dynamically instead of editing main.ts. The orchestrator will
    // move registration into main.ts later.
    this.scene.add('Grounds', GroundsScene, true);
  }

  /** Generate the 2:1 iso diamond tile textures. */
  private generateTileTextures(): void {
    for (const def of TILE_DEFS) {
      const gfx = this.add.graphics();
      gfx.fillStyle(def.fill, def.alpha);
      gfx.fillPoints(DIAMOND, true);
      gfx.lineStyle(1, def.line, Math.min(1, def.alpha + 0.2));
      gfx.strokePoints(DIAMOND, true, true);
      gfx.generateTexture(def.key, TILE_W, TILE_H);
      gfx.destroy();
    }
  }
}
