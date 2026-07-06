import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot'); // scene key per ARCHITECTURE.md §7
  }

  create(): void {
    this.add.text(16, 16, 'NRL Sim — Boot OK', { color: '#ffffff' });
  }
}
