// src/match/view/popupLayer.ts — draws pop-ups (popups.ts) over players on a
// Phaser scene: pooled texts that follow the player, drift up and fade.
import Phaser from 'phaser';
import type { Side } from '../core/snapshot';
import { TONE_COLOR, TRAIT_COLOR, type Popup } from './popups';

interface Live {
  text: Phaser.GameObjects.Text;
  side: Side;
  slot: number;
  born: number;
  ms: number;
  /** Stagger so two pop-ups on one player don't overlap. */
  lift: number;
}

const POOL = 6;
/** World px above the player's feet (just over the name tag). */
const BASE_LIFT = 40;
/** How far a pop-up drifts up over its life, world px. */
const DRIFT = 12;

export class PopupLayer {
  private readonly pool: Phaser.GameObjects.Text[] = [];
  private readonly live: Live[] = [];
  private now = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    for (let i = 0; i < POOL; i++) {
      const t = scene.add
        .text(0, 0, '', {
          fontFamily: '"Courier New", monospace',
          fontStyle: 'bold',
          fontSize: '16px',
          color: '#ffffff',
          stroke: '#10101c',
          strokeThickness: 4,
          align: 'center',
          resolution: 2,
        })
        .setOrigin(0.5, 1)
        .setDepth(depth)
        .setVisible(false);
      this.pool.push(t);
    }
  }

  show(p: Popup, side: Side, slot: number): void {
    const text = this.pool.find((t) => !t.visible) ?? this.recycleOldest();
    if (!text) return;
    const stacked = this.live.filter((l) => l.side === side && l.slot === slot).length;
    const lines = [p.word, ...(p.sub ? [p.sub] : []), ...(p.trait ? [p.trait] : [])];
    text.setText(lines);
    text.setFontSize(p.big ? 22 : 16);
    text.setColor(TONE_COLOR[p.tone]);
    text.setAlpha(1).setVisible(true);
    this.live.push({ text, side, slot, born: this.now, ms: p.ms, lift: BASE_LIFT + stacked * 18 });
    // The trait line is a second text so it can carry its own colour.
    let traitText: Phaser.GameObjects.Text | null = null;
    if (p.trait) {
      traitText = this.pool.find((t) => !t.visible) ?? null;
      if (traitText) {
        text.setText(lines.slice(0, -1));
        traitText.setText(p.trait).setFontSize(p.big ? 14 : 11).setColor(TRAIT_COLOR).setAlpha(1).setVisible(true);
        // Tucked directly under the word and name (both texts hang from their bottom edge).
        this.live.push({ text: traitText, side, slot, born: this.now, ms: p.ms, lift: BASE_LIFT + stacked * 18 - (p.big ? 16 : 13) });
      }
    }
  }

  /** Call every frame with the real delta and where each player's feet are. */
  update(deltaMs: number, zoom: number, feet: (side: Side, slot: number) => { x: number; y: number } | null): void {
    this.now += deltaMs;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]!;
      const u = (this.now - l.born) / l.ms;
      if (u >= 1) {
        l.text.setVisible(false);
        this.live.splice(i, 1);
        continue;
      }
      const at = feet(l.side, l.slot);
      if (!at) continue;
      // Pop in (scale overshoot) then drift up and fade in the last third.
      const pop = u < 0.12 ? 0.6 + (u / 0.12) * 0.4 : 1;
      l.text
        .setPosition(at.x, at.y - l.lift - DRIFT * u)
        .setScale(pop / zoom)
        .setAlpha(u > 0.66 ? 1 - (u - 0.66) / 0.34 : 1);
    }
  }

  private recycleOldest(): Phaser.GameObjects.Text | null {
    const oldest = this.live.shift();
    if (!oldest) return null;
    oldest.text.setVisible(false);
    return oldest.text;
  }

  destroy(): void {
    for (const t of this.pool) t.destroy();
    this.pool.length = 0;
    this.live.length = 0;
  }
}
