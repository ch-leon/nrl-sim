import { describe, it, expect } from 'vitest';
import {
  charFrame,
  charTextures,
  CHAR_DIRS,
  CHAR_WALK_FRAMES,
  CHAR_W,
  CHAR_H,
  CHAR_FOOT_Y,
} from '../../../src/art/grounds/manager';
import { PixelBuffer } from '../../../src/art/pixel';

const sameBuf = (a: PixelBuffer, b: PixelBuffer) => a.data.every((v, i) => v === b.data[i]);

function topRow(buf: PixelBuffer): number {
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) if (buf.get(x, y).alpha === 255) return y;
  return -1;
}

function mirror(src: PixelBuffer): PixelBuffer {
  const out = new PixelBuffer(src.w, src.h);
  out.data.set(src.data);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      const j = (y * src.w + (src.w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) out.data[j + k] = src.data[i + k]!;
    }
  }
  return out;
}

describe('manager character', () => {
  it('produces an idle + 4 walk frames for every direction under the §7 keys', () => {
    const keys = charTextures().map((t) => t.key);
    for (const d of CHAR_DIRS) {
      expect(keys).toContain(`char-idle-${d}`);
      for (let f = 0; f < CHAR_WALK_FRAMES; f++) expect(keys).toContain(`char-walk-${d}-${f}`);
    }
    expect(keys).toHaveLength(CHAR_DIRS.length * (1 + CHAR_WALK_FRAMES));
  });

  it('every frame is CHAR_W×CHAR_H, non-empty and deterministic', () => {
    for (const d of CHAR_DIRS) {
      for (const f of [null, 0, 1, 2, 3]) {
        const a = charFrame(d, f);
        expect(a.w).toBe(CHAR_W);
        expect(a.h).toBe(CHAR_H);
        expect(a.opaqueCount()).toBeGreaterThan(150);
        expect(sameBuf(a, charFrame(d, f))).toBe(true);
      }
    }
  });

  it('feet touch the ground-contact row in contact frames', () => {
    for (const d of CHAR_DIRS) {
      const buf = charFrame(d, null);
      let solid = 0;
      for (let x = 0; x < CHAR_W; x++) if (buf.get(x, CHAR_FOOT_Y).alpha === 255) solid++;
      expect(solid).toBeGreaterThan(3);
    }
  });

  it('walk cycle alternates poses and bobs up 1px on passing frames', () => {
    const contact = topRow(charFrame('e', 0));
    expect(topRow(charFrame('e', 1))).toBe(contact - 1);
    expect(topRow(charFrame('e', 3))).toBe(contact - 1);
    expect(sameBuf(charFrame('e', 0), charFrame('e', 2))).toBe(false);
  });

  it("'s' and 'w' are mirrors of 'e' and 'n' (iso diagonals)", () => {
    for (const f of [null, 0, 1, 2, 3]) {
      expect(sameBuf(charFrame('s', f), mirror(charFrame('e', f)))).toBe(true);
      expect(sameBuf(charFrame('w', f), mirror(charFrame('n', f)))).toBe(true);
    }
  });

  it('front views (e/s) show the face; back views (n/w) do not', () => {
    // Count skin-ish pixels in the head rows: the face makes front views far richer.
    const skin = (buf: PixelBuffer) => {
      let n = 0;
      for (let y = 2; y < 12; y++) for (let x = 0; x < CHAR_W; x++) if (buf.get(x, y).color === 0xf7cfa6) n++;
      return n;
    };
    expect(skin(charFrame('e', null))).toBeGreaterThan(skin(charFrame('n', null)) + 15);
  });
});
