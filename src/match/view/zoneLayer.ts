// src/match/view/zoneLayer.ts — the bonus zone lights up when a try is grounded
// in it (Nines, #77): the BONUS TRY! pop-up says "FROM THE ZONE" and this points
// at the zone painted on the pitch (matchField.bonusZone, from the rule file).
// The timing and which end are pure; the layer is one Phaser Graphics on the
// ground, under every sprite.
import type Phaser from 'phaser';
import { FIELD_LENGTH } from '../core/field';
import type { SimEvent, Snapshot } from '../core/snapshot';
import { bonusZoneCorners } from '../../scenes/matchField';

/**
 * How long the zone glows, real ms: past the BONUS TRY! pop-up and the overlay's
 * try banner (BANNER_MS.try, 3.2 s), which covers the middle of a phone's screen
 * where the scorer is, so the zone is still lit when the banner goes.
 */
export const ZONE_FLASH_MS = 4500;
/** Gentle pulses over the glow, and the last share of it spent fading out. */
const PULSES = 3;
const FADE = 0.2;
/** The glow's colour and its brightest alpha. */
const ZONE_FLASH_COLOR = 0xfff1a0;
const ZONE_FLASH_ALPHA = 0.55;

/** The glow's alpha `ageMs` into the flash: lit at once, pulsing gently, faded out by the end; 0 outside it. */
export function zoneFlashAlpha(ageMs: number): number {
  if (ageMs < 0 || ageMs >= ZONE_FLASH_MS) return 0;
  const u = ageMs / ZONE_FLASH_MS;
  const pulse = 0.78 + 0.22 * Math.cos(u * PULSES * 2 * Math.PI);
  return ZONE_FLASH_ALPHA * pulse * Math.min(1, (1 - u) / FADE);
}

/**
 * The end whose zone a bonus try was grounded in (1: the x = 100 end, -1: the
 * x = 0 end), read off where the scorer stands on the try's tick; null for any
 * other event.
 */
export function bonusTryEnd(e: SimEvent, snap: Snapshot): 1 | -1 | null {
  if (e.kind !== 'try' || e.detail !== 'bonus') return null;
  const scorer = snap.players.find((p) => p.side === e.side && p.slot === e.slot);
  if (!scorer) return null;
  return scorer.x > FIELD_LENGTH / 2 ? 1 : -1;
}

export class ZoneLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private age = -1;

  constructor(
    scene: Phaser.Scene,
    depth: number,
    private readonly toWorld: (fx: number, fy: number) => { x: number; y: number },
  ) {
    this.g = scene.add.graphics().setDepth(depth).setVisible(false);
  }

  /** Light the zone at `end`. */
  flash(end: 1 | -1): void {
    const pts = bonusZoneCorners(end, this.toWorld);
    this.g.clear().fillStyle(ZONE_FLASH_COLOR, 1).fillPoints(pts, true).lineStyle(2, 0xffffff, 1).strokePoints(pts, true);
    this.age = 0;
    this.g.setAlpha(zoneFlashAlpha(0)).setVisible(true);
  }

  /** Call every frame with the real delta. */
  update(deltaMs: number): void {
    if (this.age < 0) return;
    this.age += deltaMs;
    const a = zoneFlashAlpha(this.age);
    if (a <= 0) {
      this.age = -1;
      this.g.setVisible(false);
      return;
    }
    this.g.setAlpha(a);
  }

  destroy(): void {
    this.g.destroy();
  }
}
