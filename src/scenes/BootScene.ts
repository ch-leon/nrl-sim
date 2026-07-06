import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config';

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

// Character art (BAK-161): 16x16 frames, 4 dirs, idle + 4 walk frames each.
const CHAR_SIZE = 16;
const DIRS = ['n', 'e', 's', 'w'] as const;
type Dir = (typeof DIRS)[number];
const WALK_FRAMES = 4;
const CHAR_BODY = 0x2266cc;
const CHAR_OUTLINE = 0x14315f;
const CHAR_MARK = 0xffe066; // facing marker pixel

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
    this.generateCharacterTextures();
    this.registerCharacterAnims();

    this.scene.start('Grounds');
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

  /** Generate `char-idle-<dir>` and `char-walk-<dir>-<frame>` 16x16 textures. */
  private generateCharacterTextures(): void {
    for (const dir of DIRS) {
      this.drawCharFrame(`char-idle-${dir}`, dir, 0, false);
      for (let f = 0; f < WALK_FRAMES; f++) {
        this.drawCharFrame(`char-walk-${dir}-${f}`, dir, f, true);
      }
    }
  }

  private drawCharFrame(key: string, dir: Dir, frame: number, walking: boolean): void {
    const gfx = this.add.graphics();
    // Bob: frames 0/2 grounded, 1 up, 3 down — a simple two-step gait.
    const bob = walking ? ([0, -1, 0, 1][frame] ?? 0) : 0;

    // Body block (8x10), centred horizontally, feet near the bottom.
    const bw = 8;
    const bh = 10;
    const bx = (CHAR_SIZE - bw) / 2;
    const by = CHAR_SIZE - bh - 1 + bob;

    gfx.fillStyle(CHAR_OUTLINE, 1);
    gfx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    gfx.fillStyle(CHAR_BODY, 1);
    gfx.fillRect(bx, by, bw, bh);

    // Facing marker: a 2x2 pixel toward the travel direction.
    gfx.fillStyle(CHAR_MARK, 1);
    const cx = CHAR_SIZE / 2 - 1;
    const cy = by + 2;
    switch (dir) {
      case 'n':
        gfx.fillRect(cx, by, 2, 2);
        break;
      case 's':
        gfx.fillRect(cx, by + bh - 2, 2, 2);
        break;
      case 'e':
        gfx.fillRect(bx + bw - 2, cy, 2, 2);
        break;
      case 'w':
        gfx.fillRect(bx, cy, 2, 2);
        break;
    }

    gfx.generateTexture(key, CHAR_SIZE, CHAR_SIZE);
    gfx.destroy();
  }

  /** Register looping walk-<dir> anims from the generated walk frames (~8fps). */
  private registerCharacterAnims(): void {
    for (const dir of DIRS) {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let f = 0; f < WALK_FRAMES; f++) {
        frames.push({ key: `char-walk-${dir}-${f}` });
      }
      this.anims.create({ key: `walk-${dir}`, frames, frameRate: 8, repeat: -1 });
    }
  }
}
