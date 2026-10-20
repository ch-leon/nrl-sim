import Phaser from 'phaser';
import { paintFacilitiesWhenIdle, registerGroundsArt } from '../art/grounds';
import { getState } from '../core/state';

/**
 * BootScene generates the grounds textures (ARCHITECTURE.md §4/§7 — no binary
 * assets), then hands off to GroundsScene. Grounds art (tiles, manager,
 * facilities, decor) is painted as pixel buffers in src/art/grounds/ and
 * uploaded here: only the facilities placed (N10.6); the rest are painted on
 * demand or in idle slices after the first frame.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    registerGroundsArt(this, getState().facilities ?? []);
    paintFacilitiesWhenIdle(this);

    this.scene.start('Grounds');
  }
}
