// src/art/grounds/index.ts — club grounds art registration.
//
// groundsTextures() is the pure list of every generated grounds texture
// (tiles, manager frames, facilities, decor); registerGroundsArt() uploads them
// with toTexture and registers the manager's walk-<dir> animations. BootScene
// calls registerGroundsArt once at boot (ARCHITECTURE §1.4/§7: no binary art).
import type Phaser from 'phaser';
import { toTexture, type PixelBuffer } from '../pixel';
import { tileTextures } from './tiles';
import { charTextures, CHAR_DIRS, CHAR_WALK_FRAMES } from './manager';
import { facilityTextures } from './facilities';
import { decorTextures } from './decor';

/** Walk animation frame rate (frames/sec). */
const WALK_FPS = 8;

/** Every grounds texture as { key, buf } — pure, deterministic. */
export function groundsTextures(): { key: string; buf: PixelBuffer }[] {
  return [...tileTextures(), ...charTextures(), ...facilityTextures(), ...decorTextures()];
}

/** Upload all grounds textures and register `walk-<dir>` (looping, 8fps). */
export function registerGroundsArt(scene: Phaser.Scene): void {
  for (const { key, buf } of groundsTextures()) toTexture(scene, key, buf);
  for (const dir of CHAR_DIRS) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let f = 0; f < CHAR_WALK_FRAMES; f++) frames.push({ key: `char-walk-${dir}-${f}` });
    scene.anims.create({ key: `walk-${dir}`, frames, frameRate: WALK_FPS, repeat: -1 });
  }
}
