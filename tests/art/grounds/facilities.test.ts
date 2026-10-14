import { describe, it, expect } from 'vitest';
import { TILE_W, TILE_H } from '../../../src/config';
import { FACILITY_CATALOG, type FacilityDefId } from '../../../src/data/facility';
import { facilityArt, facilityOrigin, facilityTextureKey, facilityTextures } from '../../../src/art/grounds/facilities';
import { IsoPainter, UNIT } from '../../../src/art/grounds/iso3d';
import { PixelBuffer } from '../../../src/art/pixel';

const LEVELS = [1, 2, 3] as const;
const IDS = Object.keys(FACILITY_CATALOG) as FacilityDefId[];

/** The footprint diamond as a mask in the facility texture's own space. */
function footprintMask(buf: PixelBuffer, w: number, h: number): PixelBuffer {
  const o = facilityOrigin({ w, h }, buf.h);
  const mask = new PixelBuffer(buf.w, buf.h);
  new IsoPainter(mask, o.x * buf.w, o.y * buf.h).top(0, 0, w * UNIT, h * UNIT, 0, 0xffffff);
  return mask;
}

describe('facility art', () => {
  it('covers all 12 catalog facilities x 3 levels with non-empty facility-<defId>-<level> textures', () => {
    const tex = facilityTextures();
    expect(tex.map((t) => t.key).sort()).toEqual(IDS.flatMap((id) => LEVELS.map((l) => `facility-${id}-${l}`)).sort());
    for (const t of tex) expect(t.buf.opaqueCount()).toBeGreaterThan(1000);
  });

  it('textures are exactly as wide as the footprint diamond and rise above it', () => {
    for (const id of IDS) for (const level of LEVELS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const art = facilityArt(id, level);
      expect(art.buf.w, `${id} L${level}`).toBe((w + h) * (TILE_W / 2));
      expect(art.buf.h).toBe(art.lift + (w + h) * (TILE_H / 2));
      expect(art.lift).toBeGreaterThan(10); // real height (walls/posts/boards)
      expect(art.lift % 4).toBe(0); // keeps dithering in phase with the tiles
    }
  });

  it('origin puts the footprint top vertex at (h·TILE_W/2, lift)', () => {
    for (const id of IDS) for (const level of LEVELS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const art = facilityArt(id, level);
      expect(art.originX * art.buf.w).toBeCloseTo(h * (TILE_W / 2));
      expect(art.originY * art.buf.h).toBeCloseTo(art.lift);
      const o = facilityOrigin({ w, h }, art.buf.h);
      expect(o).toEqual({ x: art.originX, y: art.originY });
    }
  });

  it('the base fills the footprint diamond exactly (nothing hangs below it)', () => {
    for (const id of IDS) for (const level of LEVELS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const { buf, lift } = facilityArt(id, level);
      const mask = footprintMask(buf, w, h);
      const sideVertexY = lift + Math.max(w, h) * (TILE_H / 2);
      for (let y = 0; y < buf.h; y++) {
        for (let x = 0; x < buf.w; x++) {
          const inside = mask.get(x, y).alpha > 0;
          if (inside) expect(buf.get(x, y).alpha, `${id} hole at ${x},${y}`).toBe(255);
          // Below both side vertices, everything outside the diamond is clear.
          else if (y > sideVertexY + 1) expect(buf.get(x, y).alpha, `${id} spill at ${x},${y}`).toBe(0);
        }
      }
    }
  });

  it('is deterministic', () => {
    for (const id of ['grandstand', 'canteen', 'sponsorBoard'] as FacilityDefId[]) {
      const a = facilityArt(id).buf;
      const b = facilityArt(id).buf;
      expect(a.data.every((v, i) => v === b.data[i])).toBe(true);
    }
  });

  it('L1, L2 and L3 art differ for every facility, with the footprint origin unchanged', () => {
    for (const id of IDS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const arts = LEVELS.map((l) => facilityArt(id, l));
      for (const [i, j] of [[0, 1], [1, 2], [0, 2]] as const) {
        const a = arts[i]!.buf;
        const b = arts[j]!.buf;
        const same = a.w === b.w && a.h === b.h && a.data.every((v, k) => v === b.data[k]);
        expect(same, `${id} L${i + 1} vs L${j + 1}`).toBe(false);
      }
      for (const art of arts) {
        // Top vertex of the footprint sits at the same place for every level.
        expect(art.originX * art.buf.w).toBeCloseTo(h * (TILE_W / 2));
        expect(art.originY * art.buf.h).toBeCloseTo(art.lift);
        expect(art.buf.w).toBe((w + h) * (TILE_W / 2));
        expect(art.buf.h).toBe(art.lift + (w + h) * (TILE_H / 2));
      }
    }
  });

  it('facilityTextureKey clamps odd levels', () => {
    expect(facilityTextureKey('canteen', 2)).toBe('facility-canteen-2');
    expect(facilityTextureKey('canteen', 0)).toBe('facility-canteen-1');
    expect(facilityTextureKey('canteen', 9)).toBe('facility-canteen-3');
  });
});
