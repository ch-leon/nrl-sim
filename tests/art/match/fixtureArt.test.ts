// N10.5 (#154): a fixture's match art, painted in one go so the art worker can paint
// it ahead. The same pixels as the scene's own painters, and keyed by kit design.
import { describe, it, expect } from 'vitest';
import { resolveKits, setKitDesign } from '../../../src/art/match/kit';
import { clearGroundCache, paintBackground, paintForeground, warmGround } from '../../../src/art/match/stadium';
import { buildPlayerAtlas } from '../../../src/art/match/players';
import { buildCrowdAtlas, crowdShirts } from '../../../src/art/match/crowd';
import { chunkLayer, fixtureArtBuffers, fixtureArtKey, LAYER_CHUNK, paintFixtureArt, reviveFixtureArt, type LayerChunk } from '../../../src/art/match/fixtureArt';
import { PixelBuffer } from '../../../src/art/pixel';
import { fieldOffsetX } from '../../../src/scenes/matchField';

const home = { clubId: 'fa-home', colors: ['#1e3a8a', '#ffffff'] as [string, string] };
const away = { clubId: 'fa-away', colors: ['#b91c1c', '#facc15'] as [string, string] };
/** Byte for byte (toEqual walks millions of pixels one at a time). */
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean => {
  if (a.length !== b.length) return false;
  const x = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
  const y = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
};
const sameAtlas = (a: { buf: PixelBuffer; frames: unknown }, b: { buf: PixelBuffer; frames: unknown }): void => {
  expect([a.buf.w, a.buf.h, a.frames]).toEqual([b.buf.w, b.buf.h, b.frames]);
  expect(same(a.buf.data, b.buf.data)).toBe(true);
};
const sameChunks = (a: LayerChunk[], b: LayerChunk[]): void => {
  expect(a.map((c) => [c.name, c.x, c.y, c.buf.w, c.buf.h])).toEqual(b.map((c) => [c.name, c.x, c.y, c.buf.w, c.buf.h]));
  a.forEach((c, i) => expect(same(c.buf.data, b[i]!.buf.data)).toBe(true));
};
const kitsOf2 = () => {
  const k = resolveKits({ clubId: 'fa-other', colors: ['#14532d', '#f0abfc'] }, { clubId: 'fa-home', colors: ['#1e3a8a', '#ffffff'] });
  return { home: k.home, away: k.away };
};
const kitsOf = () => { const k = resolveKits(home, away); return { home: k.home, away: k.away }; };

describe('fixture art (N10.5)', () => {
  const offsetX = fieldOffsetX();
  const kits = kitsOf();
  const art = paintFixtureArt(offsetX, kits);

  it("paints the same pixels as the scene's painters", () => {
    sameChunks(art.bg, chunkLayer('match-bg', paintBackground(offsetX, kits.home, kits.away)));
    sameChunks(art.fg, chunkLayer('match-fg', paintForeground(offsetX, kits.home, kits.away)));
    sameAtlas(art.crowd, buildCrowdAtlas(crowdShirts(kits.home, kits.away)));
    sameAtlas(art.home, buildPlayerAtlas(kits.home));
    sameAtlas(art.away, buildPlayerAtlas(kits.away));
  });

  it("survives a Worker's transfer: cloned with its buffers moved, then revived", () => {
    const copy = paintFixtureArt(offsetX, kits);
    const moved = structuredClone(copy, { transfer: fixtureArtBuffers(copy) });
    expect(copy.bg[0]!.buf.data.length).toBe(0); // transferred, not copied
    const back = reviveFixtureArt(moved);
    expect(back.bg[0]!.buf).toBeInstanceOf(PixelBuffer);
    sameChunks(back.bg, art.bg);
    sameChunks(back.fg, art.fg);
    sameAtlas(back.home, art.home);
    expect(back.key).toBe(art.key);
  });

  it('is keyed by the kit design: a kit change is a new key, the same kits the same key', () => {
    expect(fixtureArtKey(offsetX, kitsOf())).toBe(art.key);
    setKitDesign('fa-home', { pattern: 'hoops', trim: '#00ff00', alt: { jersey: '#000000', trim: '#ffffff', pattern: 'plain' } });
    try {
      expect(fixtureArtKey(offsetX, kitsOf())).not.toBe(art.key);
    } finally {
      setKitDesign('fa-home', null);
    }
    expect(fixtureArtKey(offsetX, kitsOf())).toBe(art.key);
  });

  it('chunks a layer into pieces of at most LAYER_CHUNK (+1 px overlap), leaving out the transparent ones, every opaque pixel kept', () => {
    const cv = paintBackground(offsetX, kits.home, kits.away);
    const chunks = chunkLayer('t', cv);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.buf.w).toBeLessThanOrEqual(LAYER_CHUNK + 1);
      expect(c.buf.h).toBeLessThanOrEqual(LAYER_CHUNK + 1);
      expect(c.buf.opaqueCount()).toBeGreaterThan(0);
    }
    // Every opaque pixel of the layer is in the chunk that starts at its tile.
    let opaque = 0;
    for (let y = 0; y < cv.buf.h; y += 7) {
      for (let x = 0; x < cv.buf.w; x += 7) {
        const a = cv.buf.data[(y * cv.buf.w + x) * 4 + 3]!;
        if (a === 0) continue;
        opaque++;
        const c = chunks.find((k) => k.x === cv.ox + Math.floor(x / LAYER_CHUNK) * LAYER_CHUNK && k.y === cv.oy + Math.floor(y / LAYER_CHUNK) * LAYER_CHUNK)!;
        expect(c.buf.data[((y - (c.y - cv.oy)) * c.buf.w + (x - (c.x - cv.ox))) * 4 + 3]).toBe(a);
      }
    }
    expect(opaque).toBeGreaterThan(1000);
  });

  it('the ground is painted once and copied: a background from the cache is the same pixels as one painted fresh', () => {
    clearGroundCache();
    const fresh = paintBackground(offsetX, kits.home, kits.away); // paints the ground, keeps it
    const t0 = performance.now();
    const cached = paintBackground(offsetX, kits.home, kits.away);
    const cachedMs = performance.now() - t0;
    expect(same(cached.buf.data, fresh.buf.data)).toBe(true);
    // Another fixture's kits on the kept ground, against painting it all again.
    const other = kitsOf2();
    const onCache = paintBackground(offsetX, other.home, other.away);
    clearGroundCache();
    const allFresh = paintBackground(offsetX, other.home, other.away);
    expect(same(onCache.buf.data, allFresh.buf.data)).toBe(true);
    // Warmed ahead (the worker at start-up), then used.
    clearGroundCache();
    warmGround(offsetX);
    expect(same(paintBackground(offsetX, other.home, other.away).buf.data, allFresh.buf.data)).toBe(true);
    expect(cachedMs).toBeLessThan(250); // the ground is about 90% of it (about 0.4 s painted)
  });

  it('a wrapped buffer must be the right size', () => {
    expect(() => new PixelBuffer(2, 2, new Uint8ClampedArray(15))).toThrow();
    expect(new PixelBuffer(2, 2, new Uint8ClampedArray(16)).w).toBe(2);
  });
});
