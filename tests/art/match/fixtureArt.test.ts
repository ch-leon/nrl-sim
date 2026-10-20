// N10.5 (#154): a fixture's match art, painted in one go so the art worker can paint
// it ahead. The same pixels as the scene's own painters, and keyed by kit design.
import { describe, it, expect } from 'vitest';
import { resolveKits, setKitDesign } from '../../../src/art/match/kit';
import { paintBackground, paintForeground } from '../../../src/art/match/stadium';
import { buildPlayerAtlas } from '../../../src/art/match/players';
import { buildCrowdAtlas, crowdShirts } from '../../../src/art/match/crowd';
import { fixtureArtBuffers, fixtureArtKey, paintFixtureArt, reviveFixtureArt } from '../../../src/art/match/fixtureArt';
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
const kitsOf = () => { const k = resolveKits(home, away); return { home: k.home, away: k.away }; };

describe('fixture art (N10.5)', () => {
  const offsetX = fieldOffsetX();
  const kits = kitsOf();
  const art = paintFixtureArt(offsetX, kits);

  it("paints the same pixels as the scene's painters", () => {
    const bg = paintBackground(offsetX, kits.home, kits.away);
    const fg = paintForeground(offsetX, kits.home, kits.away);
    expect([art.bg.ox, art.bg.oy, art.bg.buf.w, art.bg.buf.h]).toEqual([bg.ox, bg.oy, bg.buf.w, bg.buf.h]);
    expect(same(art.bg.buf.data, bg.buf.data)).toBe(true);
    expect(same(art.fg.buf.data, fg.buf.data)).toBe(true);
    sameAtlas(art.crowd, buildCrowdAtlas(crowdShirts(kits.home, kits.away)));
    sameAtlas(art.home, buildPlayerAtlas(kits.home));
    sameAtlas(art.away, buildPlayerAtlas(kits.away));
  });

  it("survives a Worker's transfer: cloned with its buffers moved, then revived", () => {
    const copy = paintFixtureArt(offsetX, kits);
    const moved = structuredClone(copy, { transfer: fixtureArtBuffers(copy) });
    expect(copy.bg.buf.data.length).toBe(0); // transferred, not copied
    const back = reviveFixtureArt(moved);
    expect(back.bg.buf).toBeInstanceOf(PixelBuffer);
    expect(same(back.bg.buf.data, art.bg.buf.data)).toBe(true);
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

  it('a wrapped buffer must be the right size', () => {
    expect(() => new PixelBuffer(2, 2, new Uint8ClampedArray(15))).toThrow();
    expect(new PixelBuffer(2, 2, new Uint8ClampedArray(16)).w).toBe(2);
  });
});
