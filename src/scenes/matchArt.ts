// src/scenes/matchArt.ts — thin Phaser registration for the generated match art.
//
// The art itself is pure (src/art/match/*); this module is the only place that
// uploads those PixelBuffers as textures, registers atlas frames, and creates the
// static stadium layers. Every key it creates (or adopts, uploaded ahead by
// matchArtAhead.ts) is recorded so MatchScene can free them on shutdown — the stadium layers are a
// few megapixels and are rebuilt per fixture (team colours differ). Keys carry a
// per-registry serial so a quick restart of the scene can never have its fresh
// textures removed by the previous instance's deferred cleanup.
import Phaser from 'phaser';
import { toTexture } from '../art/pixel';
import type { PixelBuffer } from '../art/pixel';
import type { Kit } from '../art/match/kit';
import { drawCrossbar, drawPlayerShadow, drawShadow, drawUpright } from '../art/match/props';
import type { Lighting } from '../art/match/atmosphere';
import { ballPixels } from '../art/prototype/player';
import type { AtlasPixels, LayerChunk, TexturePiece } from '../art/match/fixtureArt';

let registrySerial = 0;

export class MatchArtRegistry {
  private readonly scene: Phaser.Scene;
  private readonly textureKeys: string[] = [];
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
    return this.frames(this.texture(key, buf), frames);
  }

  /**
   * A piece's texture: the one uploaded ahead (N10.5, matchArtAhead.ts), adopted
   * and freed with the rest, or the pixels uploaded now.
   */
  private own(key: string, piece: TexturePiece): string {
    if (piece.texKey && this.scene.textures.exists(piece.texKey)) {
      this.textureKeys.push(piece.texKey);
      return piece.texKey;
    }
    return this.texture(key, piece.buf);
  }

  /** Take charge of textures uploaded ahead (N10.5), so a shutdown before build() still frees them. */
  adopt(pieces: readonly TexturePiece[]): void {
    for (const p of pieces) if (p.texKey && this.scene.textures.exists(p.texKey)) this.textureKeys.push(p.texKey);
  }

  /** Register named sub-frames on a texture. */
  private frames(real: string, frames: readonly { name: string; x: number; y: number; w: number; h: number }[]): string {
    const tex = this.scene.textures.get(real);
    for (const f of frames) if (!tex.has(f.name)) tex.add(f.name, 0, f.x, f.y, f.w, f.h);
    return real;
  }

  /** A big world-space layer, already split into chunks (fixtureArt.ts), placed as Images at `depth`. */
  layer(chunks: readonly LayerChunk[], depth: number): Phaser.GameObjects.Image[] {
    return chunks.map((c) => this.scene.add.image(c.x, c.y, this.own(c.name, c)).setOrigin(0, 0).setDepth(depth));
  }

  /** Crowd spectator atlas for a fixture's colours (painted in fixtureArt.ts). */
  crowd(key: string, atlas: AtlasPixels): string {
    return this.frames(this.own(key, atlas), atlas.frames);
  }

  /** Ball, shadows and goalpost pieces. */
  props(prefix: string, home: Kit, lighting: Lighting = 'day'): { ball: string; shadow: string; ballShadow: string; upright: string; crossbar: string } {
    return {
      ball: this.texture(`${prefix}-ball`, ballPixels()),
      shadow: this.texture(`${prefix}-shadow`, drawPlayerShadow(lighting)),
      ballShadow: this.texture(`${prefix}-ball-shadow`, drawShadow(8, 4, 0.3)),
      upright: this.texture(`${prefix}-upright`, drawUpright(home)),
      crossbar: this.texture(`${prefix}-crossbar`, drawCrossbar()),
    };
  }

  /** Remove every texture and animation this registry created. */
  destroy(): void {
    for (const k of this.textureKeys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.textureKeys.length = 0;
  }
}
