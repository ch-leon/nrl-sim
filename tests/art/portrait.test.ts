import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TRAINING_KIT, PORTRAIT_W, PORTRAIT_H, buildPortrait, clearPortraitCache, kitKey,
  portraitCacheSize, portraitDataUrl, portraitKey,
} from '../../src/art/portrait';
import { kitFromColors } from '../../src/art/match/kit';
import { LOOKS, lookForPlayer } from '../../src/art/match/players';

const KIT = kitFromColors(['#8e1c1c', '#f2c14e'], 'player');

/** Deterministic stand-in for the canvas encoder: a checksum of the pixels. */
const fakeEncode = (buf: { data: Uint8ClampedArray; w: number; h: number }) => {
  let h = 0;
  for (const b of buf.data) h = (Math.imul(h, 31) + b) >>> 0;
  return `data:test/${buf.w}x${buf.h}/${h.toString(16)}`;
};

const pixels = (look: number, kit = KIT) => Array.from(buildPortrait(look, kit).data);

describe('buildPortrait', () => {
  it('paints a fixed-size, fully opaque framed portrait', () => {
    const p = buildPortrait(0, KIT);
    expect(p.w).toBe(PORTRAIT_W);
    expect(p.h).toBe(PORTRAIT_H);
    expect(p.opaqueCount()).toBe(PORTRAIT_W * PORTRAIT_H);
  });

  it('is deterministic for the same look and kit', () => {
    expect(pixels(3)).toEqual(pixels(3));
  });

  it('different looks give different pixels', () => {
    const outputs = new Set(LOOKS.map((_, i) => pixels(i).join(',')));
    expect(outputs.size).toBe(LOOKS.length);
  });

  it('the same look in a different club kit gives different pixels', () => {
    const other = kitFromColors(['#1a237e', '#ffd54f'], 'rival-thunder');
    expect(pixels(2, KIT)).not.toEqual(pixels(2, other));
  });

  it('the training kit differs from a club kit', () => {
    expect(pixels(2, TRAINING_KIT)).not.toEqual(pixels(2, KIT));
  });
});

describe('portrait keys', () => {
  it('kitKey is the same for the same club colours and pattern', () => {
    expect(kitKey(kitFromColors(['#8e1c1c', '#f2c14e'], 'player'))).toBe(kitKey(KIT));
  });

  it('portraitKey combines look and kit', () => {
    expect(portraitKey(4, KIT)).toBe(`4|${kitKey(KIT)}`);
    expect(portraitKey(4, KIT)).not.toBe(portraitKey(5, KIT));
    expect(portraitKey(4, KIT)).not.toBe(portraitKey(4, TRAINING_KIT));
  });
});

describe('portraitDataUrl', () => {
  beforeEach(() => clearPortraitCache());

  it('the same player gives the same key and the same output', () => {
    const a = portraitDataUrl('p-123', KIT, fakeEncode);
    clearPortraitCache();
    const b = portraitDataUrl('p-123', KIT, fakeEncode);
    expect(b).toBe(a);
  });

  it('uses the look the match uses for that player id', () => {
    const url = portraitDataUrl('p-abc', KIT, fakeEncode);
    expect(url).toBe(fakeEncode(buildPortrait(lookForPlayer('p-abc'), KIT)));
  });

  it('different players with different looks get different portraits', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p-${i}`);
    const urls = new Set(ids.map((id) => portraitDataUrl(id, KIT, fakeEncode)));
    // 30 players across 12 looks: every distinct look must yield a distinct URL.
    const looks = new Set(ids.map((id) => lookForPlayer(id)));
    expect(urls.size).toBe(looks.size);
  });

  it('reuses the cached portrait: the encoder runs once per look + kit', () => {
    const encode = vi.fn(fakeEncode);
    const first = portraitDataUrl('p-7', KIT, encode);
    const again = portraitDataUrl('p-7', KIT, encode);
    expect(again).toBe(first);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(portraitCacheSize()).toBe(1);
  });

  it('a second player who shares a look and kit reuses the same entry', () => {
    const encode = vi.fn(fakeEncode);
    // Find two ids that hash to the same look.
    const target = lookForPlayer('p-0');
    const twin = Array.from({ length: 200 }, (_, i) => `twin-${i}`).find((id) => lookForPlayer(id) === target)!;
    portraitDataUrl('p-0', KIT, encode);
    portraitDataUrl(twin, KIT, encode);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('a different kit is cached separately', () => {
    const encode = vi.fn(fakeEncode);
    portraitDataUrl('p-7', KIT, encode);
    portraitDataUrl('p-7', TRAINING_KIT, encode);
    expect(encode).toHaveBeenCalledTimes(2);
    expect(portraitCacheSize()).toBe(2);
  });
});
