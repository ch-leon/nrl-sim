import Phaser from 'phaser';
import { registerGroundsArt } from '../art/grounds';

/**
 * BootScene generates all textures (ARCHITECTURE.md §4/§7 — no binary assets),
 * then hands off to GroundsScene. Grounds art (tiles, manager, facilities,
 * decor) is painted as pixel buffers in src/art/grounds/ and uploaded here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    registerGroundsArt(this);

    this.scene.start('Grounds');
  }
}
