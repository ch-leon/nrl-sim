// src/art/match/fixtureArt.ts — everything a fixture's match scene paints for its
// colours, painted in one go (N10.5): the stadium's background and foreground
// layers, the crowd atlas and the two sides' player atlases. Pure and Phaser-free,
// so the art worker (artWorker.ts) can paint the next fixture during the week and
// MatchScene only uploads it. The same pixels as painting them in the scene.
import { PixelBuffer } from '../pixel';
import type { Kit } from './kit';
import { paintBackground, paintForeground } from './stadium';
import { buildPlayerAtlas, type AtlasFrame } from './players';
import { buildCrowdAtlas, crowdShirts } from './crowd';

/** A world-space layer: its pixels and the world coords of their top-left corner. */
export interface LayerPixels {
  buf: PixelBuffer;
  ox: number;
  oy: number;
}

/** An atlas: its pixels and named frames. */
export interface AtlasPixels {
  buf: PixelBuffer;
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
  bg: LayerPixels;
  fg: LayerPixels;
  crowd: AtlasPixels;
  home: AtlasPixels;
  away: AtlasPixels;
}

/** The cache key for a fixture's art: the field offset and both kits, field by field. */
export function fixtureArtKey(offsetX: number, kits: FixtureKits): string {
  return JSON.stringify([offsetX, kits.home, kits.away]);
}

/** Paint a fixture's art (about 0.4 s headless, most of it the background). */
export function paintFixtureArt(offsetX: number, kits: FixtureKits): FixtureArt {
  const layer = (cv: { buf: PixelBuffer; ox: number; oy: number }): LayerPixels => ({ buf: cv.buf, ox: cv.ox, oy: cv.oy });
  return {
    key: fixtureArtKey(offsetX, kits),
    bg: layer(paintBackground(offsetX, kits.home, kits.away)),
    fg: layer(paintForeground(offsetX, kits.home, kits.away)),
    crowd: buildCrowdAtlas(crowdShirts(kits.home, kits.away)),
    home: buildPlayerAtlas(kits.home),
    away: buildPlayerAtlas(kits.away),
  };
}

/** Every pixel buffer in the art, for a Worker's transfer list. */
export function fixtureArtBuffers(art: FixtureArt): ArrayBuffer[] {
  return [art.bg, art.fg, art.crowd, art.home, art.away].map((p) => p.buf.data.buffer as ArrayBuffer);
}

/**
 * The art back from a structured clone (a Worker's reply): plain objects with the
 * pixel arrays, wrapped as PixelBuffers again.
 */
export function reviveFixtureArt(raw: FixtureArt): FixtureArt {
  const buf = (b: PixelBuffer): PixelBuffer => new PixelBuffer(b.w, b.h, b.data);
  const layer = (l: LayerPixels): LayerPixels => ({ buf: buf(l.buf), ox: l.ox, oy: l.oy });
  const atlas = (a: AtlasPixels): AtlasPixels => ({ buf: buf(a.buf), frames: a.frames });
  return { key: raw.key, bg: layer(raw.bg), fg: layer(raw.fg), crowd: atlas(raw.crowd), home: atlas(raw.home), away: atlas(raw.away) };
}
