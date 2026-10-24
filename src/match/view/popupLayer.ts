// src/match/view/popupLayer.ts — draws pop-ups (popups.ts) over players on a
// Phaser scene: pooled texts that follow the player, drift up and fade.
import Phaser from 'phaser';
import type { Side } from '../core/snapshot';
import { POPUP_LINE_H, TONE_COLOR, TRAIT_COLOR, clampPopupAnchor, type Popup, type PopupView } from './popups';

interface Live {
  text: Phaser.GameObjects.Text;
  side: Side;
  slot: number;
  born: number;
  ms: number;
  /** Stagger so two pop-ups on one player don't overlap. */
  lift: number;
  /** Extra lift (screen px) found on its first frame so it clears pop-ups already up over nearby players; null until placed. */
  clear: number | null;
  /** Lines of text (for its height when clearing). */
  lines: number;
  /** A trait line moves with the pop-up it belongs to. */
  parent?: Live;
}

const POOL = 6;
/** World px above the player's feet (just over the name tag). */
const BASE_LIFT = 40;
/** How far a pop-up drifts up over its life, world px. */
const DRIFT = 12;
/** Two pop-ups closer than this across (screen px) count as on top of each other; a line of text is about this tall. */
const CLEAR_W = 110;
const LINE_H = POPUP_LINE_H;

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
    const main: Live = { text, side, slot, born: this.now, ms: p.ms, lift: BASE_LIFT + stacked * 18, clear: null, lines: lines.length };
    this.live.push(main);
    // The trait line is a second text so it can carry its own colour.
    let traitText: Phaser.GameObjects.Text | null = null;
    if (p.trait) {
      traitText = this.pool.find((t) => !t.visible) ?? null;
      if (traitText) {
        text.setText(lines.slice(0, -1));
        traitText.setText(p.trait).setFontSize(p.big ? 14 : 11).setColor(TRAIT_COLOR).setAlpha(1).setVisible(true);
        // Tucked directly under the word and name (both texts hang from their bottom edge).
        this.live.push({ text: traitText, side, slot, born: this.now, ms: p.ms, lift: BASE_LIFT + stacked * 18 - (p.big ? 16 : 13), clear: 0, lines: 0, parent: main });
      }
    }
  }

  /**
   * Call every frame with the real delta and where each player's feet are.
   * `view` is the camera's visible rectangle in world px: the anchor is clamped
   * inside it (finding 4, clipped at the top at ×8).
   */
  update(
    deltaMs: number,
    zoom: number,
    feet: (side: Side, slot: number) => { x: number; y: number } | null,
    view?: PopupView,
  ): void {
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
      if (l.clear === null) l.clear = this.clearance(l, at, zoom);
      const clear = l.parent ? (l.parent.clear ?? 0) : l.clear;
      // Pop in (scale overshoot) then drift up and fade in the last third.
      const pop = u < 0.12 ? 0.6 + (u / 0.12) * 0.4 : 1;
      const raw = { x: at.x, y: at.y - l.lift - clear / zoom - DRIFT * u };
      // The text's own height, plus the stroke, so the top of the word stays inside the view.
      const localH = (l.text.height > 0 ? l.text.height : Math.max(1, l.lines) * LINE_H) + 4;
      const pos = view ? clampPopupAnchor(raw, localH / Math.max(zoom, 1e-3), view, zoom) : raw;
      l.text
        .setPosition(pos.x, pos.y)
        .setScale(pop / zoom)
        .setAlpha(u > 0.66 ? 1 - (u - 0.66) / 0.34 : 1);
    }
  }

  /**
   * How much higher (screen px) a new pop-up must sit to clear the pop-ups
   * already showing over players near it — two things at one ruck (SIX AGAIN!
   * and QUICK PTB!) stack instead of printing over each other.
   */
  private clearance(l: Live, at: { x: number; y: number }, zoom: number): number {
    // Texts hang from their bottom edge: one spans [bottom − height, bottom] on screen.
    const base = (at.y - l.lift) * zoom;
    const h = Math.max(1, l.lines) * LINE_H;
    let extra = 0;
    for (let tries = 0; tries < 6; tries++) {
      const bottom = base - extra;
      const over = this.live.find((o) => {
        if (o === l || o.clear === null || !o.text.visible || o.lines === 0) return false;
        const oBottom = o.text.y * zoom;
        const oTop = oBottom - o.lines * LINE_H;
        return Math.abs(o.text.x - at.x) * zoom < CLEAR_W && bottom > oTop && bottom - h < oBottom;
      });
      if (!over) break;
      // Sit just above it.
      extra = base - (over.text.y * zoom - over.lines * LINE_H - 2);
    }
    return Math.max(0, extra);
  }

  private recycleOldest(): Phaser.GameObjects.Text | null {
    const oldest = this.live.shift();
    if (!oldest) return null;
    oldest.text.setVisible(false);
    return oldest.text;
  }

  /** Drop every shout. A replay must not keep the live match's words on the rewound picture. */
  clear(): void {
    for (const l of this.live) l.text.setVisible(false);
    this.live.length = 0;
  }

  destroy(): void {
    for (const t of this.pool) t.destroy();
    this.pool.length = 0;
    this.live.length = 0;
  }
}
