// src/art/match/fixtureArt.ts — everything a fixture's match scene paints for its
// colours, painted in one go (N10.5): the stadium's background and foreground
// layers, the crowd atlas and the two sides' player atlases. Pure and Phaser-free,
// so the art worker (artWorker.ts) can paint the next fixture during the week and
// MatchScene only uploads it (or finds it uploaded ahead). The same pixels as
// painting them in the scene.
import { PixelBuffer } from '../pixel';
import type { Kit } from './kit';
import { paintBackground, paintForeground } from './stadium';
import { buildPlayerAtlas, type AtlasFrame } from './players';
import { buildCrowdAtlas, crowdShirts } from './crowd';

/**
 * Largest texture edge of a layer's chunk (N10.5: was 1024). A ×4 phone in software GL
 * spends about 0.3 s uploading a megapixel, so a 1024² chunk froze a frame for 300 ms;
 * a 512² one is about 80 ms, and each goes up in its own idle slice or frame.
 */
export const LAYER_CHUNK = 512;

/**
 * Pixels on their way to a texture. `texKey` is set once they are uploaded ahead
 * (matchArtAhead.ts), and `buf` is then dropped to a 1×1 stand-in to free the memory.
 */
export interface TexturePiece {
  buf: PixelBuffer;
  texKey?: string;
}

/** One texture of a world-space layer, placed with its top-left corner at world (x, y). */
export interface LayerChunk extends TexturePiece {
  name: string;
  x: number;
  y: number;
}

/** An atlas: its pixels and named frames. */
export interface AtlasPixels extends TexturePiece {
  frames: AtlasFrame[];
}

/** The two kits a fixture is played in (the away side in its clash strip if it needs one). */
export interface FixtureKits {
  home: Kit;
  away: Kit;
}

export interface FixtureArt {
  /** The kit design it was painted for: a kit change is a different key, so it repaints. */
  key: string;
  bg: LayerChunk[];
  fg: LayerChunk[];
  crowd: AtlasPixels;
  home: AtlasPixels;
  away: AtlasPixels;
}

/** The cache key for a fixture's art: the field offset and both kits, field by field. */
export function fixtureArtKey(offsetX: number, kits: FixtureKits): string {
  return JSON.stringify([offsetX, kits.home, kits.away]);
}

/**
 * A big world-space layer split into ≤LAYER_CHUNK(+1px overlap) pieces; fully
 * transparent pieces are left out. Chunks overlap their right/bottom neighbour by
 * 1px: at fractional camera zoom the quads round independently and would leave a seam.
 */
export function chunkLayer(prefix: string, cv: { buf: PixelBuffer; ox: number; oy: number }): LayerChunk[] {
  const chunks: LayerChunk[] = [];
  const { buf } = cv;
  for (let cy = 0; cy < buf.h; cy += LAYER_CHUNK) {
    for (let cx = 0; cx < buf.w; cx += LAYER_CHUNK) {
      const w = Math.min(LAYER_CHUNK + 1, buf.w - cx);
      const h = Math.min(LAYER_CHUNK + 1, buf.h - cy);
      const part = new PixelBuffer(w, h);
      // Row-wise copy (fast path: straight RGBA slices).
      for (let y = 0; y < h; y++) {
        const src = ((cy + y) * buf.w + cx) * 4;
        part.data.set(buf.data.subarray(src, src + w * 4), y * w * 4);
      }
      if (part.opaqueCount() === 0) continue; // fully transparent chunk
      chunks.push({ name: `${prefix}-${cx}-${cy}`, buf: part, x: cv.ox + cx, y: cv.oy + cy });
    }
  }
  return chunks;
}

/** Paint a fixture's art (about 0.4 s headless, most of it the background). */
export function paintFixtureArt(offsetX: number, kits: FixtureKits): FixtureArt {
  return {
    key: fixtureArtKey(offsetX, kits),
    bg: chunkLayer('match-bg', paintBackground(offsetX, kits.home, kits.away)),
    fg: chunkLayer('match-fg', paintForeground(offsetX, kits.home, kits.away)),
    crowd: buildCrowdAtlas(crowdShirts(kits.home, kits.away)),
    home: buildPlayerAtlas(kits.home),
    away: buildPlayerAtlas(kits.away),
  };
}

/** Every texture in the art: the layers' chunks, then the crowd and the two player atlases. */
export function fixtureArtPieces(art: FixtureArt): TexturePiece[] {
  return [...art.bg, ...art.fg, art.crowd, art.home, art.away];
}

/** Every pixel buffer in the art, for a Worker's transfer list. */
export function fixtureArtBuffers(art: FixtureArt): ArrayBuffer[] {
  return fixtureArtPieces(art).map((p) => p.buf.data.buffer as ArrayBuffer);
}

/**
 * The art back from a structured clone (a Worker's reply): plain objects with the
 * pixel arrays, wrapped as PixelBuffers again.
 */
export function reviveFixtureArt(raw: FixtureArt): FixtureArt {
  const buf = (b: PixelBuffer): PixelBuffer => new PixelBuffer(b.w, b.h, b.data);
  const layer = (l: LayerChunk[]): LayerChunk[] => l.map((c) => ({ name: c.name, buf: buf(c.buf), x: c.x, y: c.y }));
  const atlas = (a: AtlasPixels): AtlasPixels => ({ buf: buf(a.buf), frames: a.frames });
  return { key: raw.key, bg: layer(raw.bg), fg: layer(raw.fg), crowd: atlas(raw.crowd), home: atlas(raw.home), away: atlas(raw.away) };
}
