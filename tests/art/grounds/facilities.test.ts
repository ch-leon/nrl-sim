import { describe, it, expect } from 'vitest';
import { TILE_W, TILE_H } from '../../../src/config';
import { FACILITY_CATALOG, type FacilityDefId } from '../../../src/data/facility';
import { facilityArt, facilityOrigin, facilityTextures } from '../../../src/art/grounds/facilities';
import { IsoPainter, UNIT } from '../../../src/art/grounds/iso3d';
import { PixelBuffer } from '../../../src/art/pixel';

const IDS = Object.keys(FACILITY_CATALOG) as FacilityDefId[];

/** The footprint diamond as a mask in the facility texture's own space. */
function footprintMask(buf: PixelBuffer, w: number, h: number): PixelBuffer {
  const o = facilityOrigin({ w, h }, buf.h);
  const mask = new PixelBuffer(buf.w, buf.h);
  new IsoPainter(mask, o.x * buf.w, o.y * buf.h).top(0, 0, w * UNIT, h * UNIT, 0, 0xffffff);
  return mask;
}

describe('facility art', () => {
  it('covers all 12 catalog facilities with non-empty facility-<defId> textures', () => {
    const tex = facilityTextures();
    expect(tex.map((t) => t.key).sort()).toEqual(IDS.map((id) => `facility-${id}`).sort());
    for (const t of tex) expect(t.buf.opaqueCount()).toBeGreaterThan(1000);
  });

  it('textures are exactly as wide as the footprint diamond and rise above it', () => {
    for (const id of IDS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const art = facilityArt(id);
      expect(art.buf.w).toBe((w + h) * (TILE_W / 2));
      expect(art.buf.h).toBe(art.lift + (w + h) * (TILE_H / 2));
      expect(art.lift).toBeGreaterThan(10); // real height (walls/posts/boards)
      expect(art.lift % 4).toBe(0); // keeps dithering in phase with the tiles
    }
  });

  it('origin puts the footprint top vertex at (h·TILE_W/2, lift)', () => {
    for (const id of IDS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const art = facilityArt(id);
      expect(art.originX * art.buf.w).toBeCloseTo(h * (TILE_W / 2));
      expect(art.originY * art.buf.h).toBeCloseTo(art.lift);
      const o = facilityOrigin({ w, h }, art.buf.h);
      expect(o).toEqual({ x: art.originX, y: art.originY });
    }
  });

  it('the base fills the footprint diamond exactly (nothing hangs below it)', () => {
    for (const id of IDS) {
      const { w, h } = FACILITY_CATALOG[id].footprint;
      const { buf, lift } = facilityArt(id);
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
});
