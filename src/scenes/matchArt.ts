// src/scenes/matchArt.ts — thin Phaser registration for the generated match art.
//
// The art itself is pure (src/art/match/*); this module is the only place that
// uploads those PixelBuffers as textures, registers atlas frames and player
// animations, and creates the static stadium layers. Every key it creates is
// recorded so MatchScene can free them on shutdown — the stadium layers are a
// few megapixels and are rebuilt per fixture (team colours differ). Keys carry a
// per-registry serial so a quick restart of the scene can never have its fresh
// textures removed by the previous instance's deferred cleanup.
import Phaser from 'phaser';
import { PixelBuffer, toTexture } from '../art/pixel';
import type { Kit } from '../art/match/kit';
import {
  ANIM_ORDER,
  PLAYER_ANIMS,
  buildPlayerAtlas,
  frameName,
  type PlayerAnim,
} from '../art/match/players';
import { buildCrowdAtlas, crowdShirts } from '../art/match/crowd';
import { drawBall, drawCrossbar, drawShadow, drawUpright } from '../art/match/props';
import type { Canvas3D } from '../art/match/iso3d';

/** Largest texture edge we upload (safe on old mobile GPUs capped at 2048). */
const CHUNK = 1024;

let registrySerial = 0;

export class MatchArtRegistry {
  private readonly scene: Phaser.Scene;
  private readonly textureKeys: string[] = [];
  private readonly animKeys: string[] = [];
  private readonly serial: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.serial = ++registrySerial;
  }

  /** Upload a buffer under `key` (tracked for cleanup); returns the real key. */
  texture(key: string, buf: PixelBuffer): string {
    const real = `${key}~${this.serial}`;
    toTexture(this.scene, real, buf);
    this.textureKeys.push(real);
    return real;
  }

  /** Upload a buffer and register named sub-frames on it. */
  atlas(key: string, buf: PixelBuffer, frames: readonly { name: string; x: number; y: number; w: number; h: number }[]): string {
    const real = this.texture(key, buf);
    const tex = this.scene.textures.get(real);
    for (const f of frames) tex.add(f.name, 0, f.x, f.y, f.w, f.h);
    return real;
  }

  /**
   * A big world-space layer split into ≤CHUNK textures, placed as Images at
   * `depth`. Returns the created images.
   */
  layer(keyPrefix: string, cv: Canvas3D, depth: number): Phaser.GameObjects.Image[] {
    const images: Phaser.GameObjects.Image[] = [];
    const { buf } = cv;
    for (let cy = 0; cy < buf.h; cy += CHUNK) {
      for (let cx = 0; cx < buf.w; cx += CHUNK) {
        const w = Math.min(CHUNK, buf.w - cx);
        const h = Math.min(CHUNK, buf.h - cy);
        const part = new PixelBuffer(w, h);
        // Row-wise copy (fast path: straight RGBA slices).
        for (let y = 0; y < h; y++) {
          const src = ((cy + y) * buf.w + cx) * 4;
          part.data.set(buf.data.subarray(src, src + w * 4), y * w * 4);
        }
        if (part.opaqueCount() === 0) continue; // fully transparent chunk
        const key = this.texture(`${keyPrefix}-${cx}-${cy}`, part);
        const img = this.scene.add.image(cv.ox + cx, cv.oy + cy, key).setOrigin(0, 0).setDepth(depth);
        images.push(img);
      }
    }
    return images;
  }

  /** Player atlas + one Phaser animation per look × anim for a kit. */
  players(atlasKey: string, kit: Kit): string {
    const { buf, frames } = buildPlayerAtlas(kit);
    const key = this.atlas(atlasKey, buf, frames);
    const looks = new Set(frames.map((f) => Number(f.name.split('-')[0])));
    for (const look of looks) {
      for (const anim of ANIM_ORDER) {
        const spec = PLAYER_ANIMS[anim];
        const animKey = playerAnimKey(key, look, anim);
        if (this.scene.anims.exists(animKey)) this.scene.anims.remove(animKey);
        this.scene.anims.create({
          key: animKey,
          frames: Array.from({ length: spec.frames }, (_, f) => ({ key, frame: frameName(look, anim, f) })),
          frameRate: spec.frameRate,
          repeat: spec.repeat,
        });
        this.animKeys.push(animKey);
      }
    }
    return key;
  }

  /** Crowd spectator atlas for a fixture's colours. */
  crowd(key: string, home: Kit, away: Kit): string {
    const { buf, frames } = buildCrowdAtlas(crowdShirts(home, away));
    return this.atlas(key, buf, frames);
  }

  /** Ball, shadows and goalpost pieces. */
  props(prefix: string, home: Kit): { ball: string; shadow: string; ballShadow: string; upright: string; crossbar: string } {
    return {
      ball: this.texture(`${prefix}-ball`, drawBall()),
      shadow: this.texture(`${prefix}-shadow`, drawShadow(12, 5, 0.28)),
      ballShadow: this.texture(`${prefix}-ball-shadow`, drawShadow(6, 3, 0.3)),
      upright: this.texture(`${prefix}-upright`, drawUpright(home)),
      crossbar: this.texture(`${prefix}-crossbar`, drawCrossbar()),
    };
  }

  /** Remove every texture and animation this registry created. */
  destroy(): void {
    for (const k of this.animKeys) if (this.scene.anims.exists(k)) this.scene.anims.remove(k);
    for (const k of this.textureKeys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.animKeys.length = 0;
    this.textureKeys.length = 0;
  }
}

/** Animation key for a player atlas look + anim. */
export function playerAnimKey(atlasKey: string, look: number, anim: PlayerAnim): string {
  return `${atlasKey}-${look}-${anim}`;
}
