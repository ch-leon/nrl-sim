// src/art/grounds/facilities.ts — `facility-<defId>` art for all 12 facilities.
//
// Each facility is a "lot": a ground base that fills its w×h footprint diamond
// exactly (lawn, paving or concrete — seamless with the lawn tiles around it),
// with a building and props standing on it. Buildings are inset from the lot
// edge so characters on neighbouring tiles never overlap their walls.
//
// Anchoring contract with GroundsScene: the footprint diamond's top vertex
// (grid point (x, y) of the facility origin) sits at texture pixel
// (h·TILE_W/2, lift). facilityArt() returns that as a normalised origin
// (originX, originY) so the scene can place the sprite at cellToWorld(x, y)
// with setOrigin(originX, originY) and the base lands on its tiles.
import { TILE_W, TILE_H } from '../../config';
import { FACILITY_CATALOG, type FacilityDefId } from '../../data/facility';
import { PixelBuffer, shade, mix, noise2, type Palette } from '../pixel';
import { IsoPainter, UNIT, pmod, stamp, tintPoly } from './iso3d';
import { grassBase, paverShade, seam, SEAM_T } from './tiles';
import {
  type Block,
  walls,
  flatRoof,
  gableU,
  gableV,
  hipRoof,
  slope,
  roofRibs,
  plaster,
  brick,
  boards,
  ribs,
  windowV,
  windowU,
  doorV,
  doorU,
  glassDoorV,
  decalV,
  decalU,
  signV,
  ICON,
  iconPal,
  PAL,
} from './parts';
import { OUTLINE, WHITE, CLUB, GRASS, STONE, METAL, WOOD, RED, LEAF } from './palette';

/** Headroom painted above the top vertex before cropping (multiple of 4). */
const MAX_LIFT = 96;

export interface FacilityArt {
  buf: PixelBuffer;
  /** Normalised origin that puts the footprint's top vertex on the anchor point. */
  originX: number;
  originY: number;
  /** Pixels of art above the footprint's top vertex. */
  lift: number;
}

/** Painting context for one facility lot. */
interface Lot {
  buf: PixelBuffer;
  iso: IsoPainter;
  U: number;
  V: number;
  /** Paint onto a fresh layer, give it a dark outline, composite onto the lot. */
  layer(paint: (iso: IsoPainter) => void): void;
}

function makeLot(w: number, h: number): Lot {
  const W = (w + h) * (TILE_W / 2);
  const H = MAX_LIFT + (w + h) * (TILE_H / 2);
  const buf = new PixelBuffer(W, H);
  const iso = new IsoPainter(buf, h * UNIT, MAX_LIFT);
  return {
    buf,
    iso,
    U: w * UNIT,
    V: h * UNIT,
    layer(paint) {
      const l = new PixelBuffer(W, H);
      paint(new IsoPainter(l, iso.ox, iso.oy));
      stamp(buf, l, OUTLINE);
    },
  };
}

/** Crop empty headroom (keeping lift a multiple of 4 so dithering stays in phase with the tiles). */
function finish(lot: Lot, w: number, h: number): FacilityArt {
  const { buf } = lot;
  let top = 0;
  outer: for (; top < MAX_LIFT; top++) {
    for (let x = 0; x < buf.w; x++) if (buf.get(x, top).alpha > 0) break outer;
  }
  top -= top % 4;
  const out = new PixelBuffer(buf.w, buf.h - top);
  out.data.set(buf.data.subarray(top * buf.w * 4));
  const o = facilityOrigin({ w, h }, out.h);
  return { buf: out, originX: o.x, originY: o.y, lift: MAX_LIFT - top };
}

// ── Lot bases ───────────────────────────────────────────────────────────────

/** Lawn base, seamless with the surrounding tile-grass. */
function lawn(lot: Lot): void {
  lot.iso.top(0, 0, lot.U, lot.V, 0, 0, (u, v, x, y) => grassBase(u, v, x, y));
  seam(lot.buf, GRASS.seam, SEAM_T);
}

/** Paved slab u0..u1 × v0..v1 (pavers, or flat concrete when `concrete`). */
function slab(lot: Lot, u0: number, v0: number, u1: number, v1: number, concrete = false): void {
  const { iso } = lot;
  iso.top(u0, v0, u1, v1, 0, STONE.mid, (u, v, x, y) => {
    const edge = u < u0 + 1 || v < v0 + 1 || u > u1 - 1 || v > v1 - 1;
    if (edge) return STONE.dark;
    if (concrete) return noise2(x, y, 61) < 0.1 ? STONE.mid : pmod(u, 16) < 0.7 || pmod(v, 16) < 0.7 ? STONE.mid : STONE.light;
    return paverShade(iso, x, y);
  });
}

/** Soft cast shadow to the building's lower-right (light from top-left). */
function castShadow(lot: Lot, b: Block, len = b.h * 0.5): void {
  const { iso } = lot;
  tintPoly(
    lot.buf,
    [iso.p(b.u1, b.v0), iso.p(b.u1 + len, b.v0 - len * 0.3), iso.p(b.u1 + len, b.v1 - len * 0.3), iso.p(b.u1, b.v1)],
    0x1d2b1a,
    0.35,
  );
}

/** Bottom-centre a palette sprite on a ground point. */
function prop(iso: IsoPainter, rows: readonly string[], pal: Palette, u: number, v: number, z = 0): void {
  const p = iso.p(u, v, z);
  const w = Math.max(...rows.map((r) => r.length));
  iso.buf.sprite(rows, pal, Math.round(p.x) - Math.floor(w / 2), Math.round(p.y) - rows.length + 1);
}

/** Vertical pole from z0 to z1 (1 or 2px thick). */
function pole(iso: IsoPainter, u: number, v: number, z0: number, z1: number, c: number, thick = false): void {
  iso.line([u, v, z0], [u, v, z1], c);
  if (thick) iso.line([u + 0.5, v - 0.5, z0], [u + 0.5, v - 0.5, z1], shade(c, 0.8));
}

/** Small round shrub. */
const SHRUB = ['.lLl.', 'lLHLl', 'lLLLd', '.ddd.'];
const SHRUB_PAL: Palette = { l: LEAF.mid, L: LEAF.light, H: LEAF.hi, d: LEAF.dark };

// ── Recipes ─────────────────────────────────────────────────────────────────

function trainingPaddock(lot: Lot): void {
  const { iso, U, V } = lot;
  // Mown stripes + painted lines.
  iso.top(0, 0, U, V, 0, 0, (u, v, x, y) => {
    const line =
      (Math.abs(u - 5) < 0.6 || Math.abs(u - (U - 5)) < 0.6 || Math.abs(u - U / 2) < 0.6) && v > 5 && v < V - 5;
    const lineV = (Math.abs(v - 5) < 0.6 || Math.abs(v - (V - 5)) < 0.6) && u > 5 && u < U - 5;
    if (line || lineV) return WHITE;
    const g = grassBase(u, v, x, y);
    return pmod(Math.floor(u / 8), 2) ? mix(g, GRASS.hi, 0.25) : g;
  });
  seam(lot.buf, GRASS.seam, SEAM_T);

  // Rugby posts at the back.
  lot.layer((l) => {
    for (const u of [22, 42]) {
      pole(l, u, 7, 0, 34, WHITE, true);
      l.wallV(8, u - 1, u + 2, 0, 6, CLUB.navy); // post pad
    }
    l.line([22, 7, 12], [42, 7, 12], WHITE);
    l.line([22, 7, 11], [42, 7, 11], shade(WHITE, 0.85));
  });
  // Scrum machine: low sled with two red pads.
  lot.layer((l) => {
    l.box(42, 16, 58, 26, 0, 2, { top: METAL.mid, left: METAL.light, right: METAL.dark });
    l.box(44, 24, 49, 28, 2, 10, { top: RED.light, left: RED.mid, right: RED.dark });
    l.box(51, 24, 56, 28, 2, 10, { top: RED.light, left: RED.mid, right: RED.dark });
  });
  // Cone ladder.
  const cone = ['.o.', '.w.', 'ooo', 'OOO'];
  const conePal: Palette = { o: 0xff8a1f, O: 0xd9620f, w: WHITE };
  for (const [u, v] of [[12, 30], [20, 40], [28, 30], [36, 40], [44, 30]] as const) {
    lot.layer((l) => prop(l, cone, conePal, u, v));
  }
  // Tackle bags.
  const bag = ['.bbb.', 'bBbbb', 'bBbbd', 'bBbbd', 'bbbbd', 'bBbbd', 'bBbbd', 'wwwww', '.ddd.'];
  const bagPal: Palette = { b: 0x2f6fd1, B: 0x6aa0f0, d: 0x1f4f9a, w: CLUB.gold };
  lot.layer((l) => prop(l, bag, bagPal, 46, 46));
  lot.layer((l) => prop(l, bag, bagPal, 54, 40));

  // Low post-and-rail fence around the paddock, gate gap at the front. Inset
  // enough that its outline stays inside the footprint.
  lot.layer((l) => {
    const e = 3;
    const runs: [number, number, number, number][] = [
      [e, e, U - e, e], // back (n)
      [e, e, e, V - e], // back (w)
      [U - e, e, U - e, V - e], // front (e)
    ];
    for (const [a0, b0, a1, b1] of runs) {
      l.line([a0, b0, 4], [a1, b1, 4], WOOD.light);
      l.line([a0, b0, 2], [a1, b1, 2], WOOD.mid);
    }
    // Seven evenly spaced posts per side; the middle one on the front (s) side
    // is left out to make the gate gap.
    const posts = Array.from({ length: 7 }, (_, i) => e + (i * (U - 2 * e)) / 6);
    for (const [a0, a1] of [[posts[0]!, posts[2]!], [posts[4]!, posts[6]!]] as const) {
      l.line([a0, V - e, 4], [a1, V - e, 4], WOOD.light);
      l.line([a0, V - e, 2], [a1, V - e, 2], WOOD.mid);
    }
    posts.forEach((t, i) => {
      pole(l, t, e, 0, 6, WOOD.dark);
      pole(l, e, t, 0, 6, WOOD.dark);
      pole(l, U - e, t, 0, 6, WOOD.dark);
      if (i !== 3) pole(l, t, V - e, 0, 6, WOOD.dark);
    });
  });
}

function weightsRoom(lot: Lot): void {
  lawn(lot);
  slab(lot, 5, 4, 60, 58);
  const b: Block = { u0: 10, v0: 8, u1: 54, v1: 48, h: 26 };
  castShadow(lot, b);
  const redBrick = 0xb9523a;
  lot.layer((l) => {
    walls(l, b, redBrick, (c) => brick(c, mix(c, 0xe8d2bc, 0.55)));
    flatRoof(l, b, 0xa3a3a3, 0x737b86);
    doorV(l, b.v1, 26, 38, 15, CLUB.navy, 0xdedede);
    l.wallV(b.v1, 27, 37, 0, 14, CLUB.navy, (a) => (Math.abs(a - 32) < 0.6 ? CLUB.navyDark : CLUB.navy));
    windowV(l, b.v1, 13, 22, 8, 18);
    windowV(l, b.v1, 42, 51, 8, 18);
    windowU(l, b.u1, 14, 24, 9, 19);
    windowU(l, b.u1, 32, 42, 9, 19);
    // Rooftop AC unit.
    l.box(16, 14, 26, 22, b.h, b.h + 6, { top: METAL.light, left: METAL.mid, right: METAL.dark }, {
      left: (a) => (pmod(a, 2) < 1 ? METAL.dark : METAL.mid),
    });
  });
  // Big rooftop sign: gold board with a dumbbell, on two legs.
  lot.layer((l) => {
    pole(l, 24, b.v1 - 6, b.h, b.h + 4, METAL.dark);
    pole(l, 44, b.v1 - 6, b.h, b.h + 4, METAL.dark);
    signV(l, b.v1 - 5, 20, b.h + 3, 28, 13, CLUB.gold, ICON.dumbbell, PAL.dark);
  });
  // Weight plates stacked by the door.
  lot.layer((l) => {
    l.box(42, 52, 48, 56, 0, 2, { top: 0x4a4a52, left: 0x3a3a40, right: 0x2a2a30 });
    l.box(43, 53, 47, 55, 2, 4, { top: 0x4a4a52, left: 0x3a3a40, right: 0x2a2a30 });
  });
}

function videoRoom(lot: Lot): void {
  lawn(lot);
  slab(lot, 5, 5, 60, 59);
  const b: Block = { u0: 10, v0: 10, u1: 54, v1: 50, h: 28 };
  castShadow(lot, b);
  lot.layer((l) => {
    walls(l, b, 0x5f86b5, (c) => ribs(c, 8));
    flatRoof(l, b, 0x8f99aa, 0x4c5466);
    // Big match screen on the lit wall: pitch, lines, two teams of dots.
    l.wallV(b.v1, 12, 46, 9, 25, 0x22252e);
    l.wallV(b.v1, 13, 45, 10, 24, GRASS.mid, (a, z) => {
      if (Math.abs(a - 29) < 0.6 || Math.abs(z - 17) < 0.5) return mix(GRASS.mid, WHITE, 0.6);
      const dot = (pa: number, pz: number) => Math.abs(a - pa) < 1 && Math.abs(z - pz) < 1;
      if (dot(18, 14) || dot(22, 20) || dot(25, 13)) return CLUB.gold;
      if (dot(34, 19) || dot(38, 14) || dot(41, 21)) return RED.mid;
      return pmod(Math.floor(a / 4), 2) ? GRASS.light : GRASS.mid;
    });
    doorU(l, b.u1, 32, 40, 15, 0x3a4a63);
    windowU(l, b.u1, 16, 26, 11, 21, 0xdfe6ee);
    // Small "play" sign on the shaded wall.
    decalU(l, ICON.play, iconPal(WHITE, CLUB.gold), b.u1, 44, 25);
  });
  // Satellite dish on the roof.
  const dish = [
    '...wwww...',
    '..wWWWWw..',
    '.wWWWWWWw.',
    'wWWWWWWWWw',
    'wWWWWWWWWs',
    '.wWWWWWWs.',
    '..wwwwss..',
    '....mm....',
    '...mmmm...',
  ];
  lot.layer((l) => {
    prop(l, dish, { w: WHITE, W: 0xdfe4ea, s: 0xb9c1cc, m: METAL.dark }, 22, 22, b.h);
    l.line([24, 20, b.h + 7], [27, 17, b.h + 11], METAL.dark);
    l.box(36, 30, 44, 36, b.h, b.h + 4, { top: METAL.light, left: METAL.mid, right: METAL.dark });
  });
}

function physioCentre(lot: Lot): void {
  lawn(lot);
  slab(lot, 4, 4, 60, 60);
  const b: Block = { u0: 10, v0: 8, u1: 54, v1: 48, h: 26 };
  const teal = 0x2fa59a;
  castShadow(lot, b);
  lot.layer((l) => {
    walls(l, b, 0xf2efe7, plaster);
    // Teal band and parapet.
    l.wallV(b.v1, b.u0, b.u1, 18, 20, teal);
    l.wallU(b.u1, b.v0, b.v1, 18, 20, shade(teal, 0.76));
    flatRoof(l, b, teal, 0xc9ccd0);
    glassDoorV(l, b.v1, 25, 37, 15, teal);
    windowV(l, b.v1, 13, 21, 7, 15, teal);
    windowV(l, b.v1, 41, 50, 7, 15, teal);
    windowU(l, b.u1, 14, 24, 7, 15, teal);
    windowU(l, b.u1, 32, 42, 7, 15, teal);
    // Canopy over the doors.
    l.box(23, b.v1, 39, b.v1 + 5, 16, 18, { top: teal, left: shade(teal, 0.85), right: shade(teal, 0.65) });
  });
  // Rooftop light-box cube with a green cross on both faces.
  lot.layer((l) => {
    const c = { u0: 36, v0: 30, u1: 48, v1: 42 };
    l.box(c.u0, c.v0, c.u1, c.v1, b.h, b.h + 12, { top: 0xe9ecef, left: WHITE, right: 0xd9dde2 });
    const green = iconPal(0x2fb34a);
    decalV(l, ICON.cross, green, c.u0 + 3, c.v1, b.h + 10);
    decalU(l, ICON.cross, iconPal(0x26943d), c.u1, c.v0 + 3, b.h + 10 + 0);
  });
  // Planters either side of the door.
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, 20, 54));
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, 44, 54));
}

function canteen(lot: Lot): void {
  lawn(lot);
  slab(lot, 4, 3, 60, 61);
  const b: Block = { u0: 8, v0: 6, u1: 50, v1: 36, h: 20 };
  const cream = 0xf3dca0;
  castShadow(lot, b);
  lot.layer((l) => {
    walls(l, b, cream, boards);
    // Serving hatch with a counter.
    l.wallV(b.v1, 18, 40, 7, 15, 0x5b3b25);
    l.wallV(b.v1, 19, 39, 8, 14, 0x3a2618, (a, z) => (z < 10 && pmod(a, 5) < 3 ? 0xd98b3a : 0x3a2618));
    l.box(17, b.v1, 41, b.v1 + 3, 6, 7, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark });
    doorU(l, b.u1, 12, 20, 14, RED.mid);
    windowU(l, b.u1, 24, 31, 8, 15);
    gableU(l, b, 12, 0xd2493c, cream);
    decalU(l, ICON.cup, iconPal(0x5b3b25, WHITE), b.u1, 17, b.h + 9);
  });
  // Striped awning over the hatch.
  lot.layer((l) => {
    slope(l, [[16, b.v1, 17], [42, b.v1, 17], [42, b.v1 + 8, 13], [16, b.v1 + 8, 13]], RED.mid, (_u, _v, _z, a) =>
      pmod(Math.floor(a / 3), 2) ? WHITE : RED.mid,
    'u');
    l.wallV(b.v1 + 8, 16, 42, 11, 13, RED.mid, (a) => (pmod(Math.floor(a / 3), 2) ? WHITE : RED.mid));
  });
  // Two outdoor tables with umbrellas.
  for (const [u, v, umb] of [[16, 50, CLUB.gold], [40, 50, 0x3f9ad6]] as const) {
    lot.layer((l) => {
      l.box(u - 3, v - 3, u + 3, v + 3, 5, 6, { top: WHITE, left: 0xd9d4c8, right: 0xbdb7aa });
      pole(l, u, v, 0, 5, METAL.dark);
      pole(l, u, v, 6, 13, METAL.dark);
      hipRoof(l, { u0: u - 6, v0: v - 6, u1: u + 6, v1: v + 6, h: 12 }, 4, umb, (c) => () => c, 0);
    });
  }
}

function sponsorBoard(lot: Lot): void {
  const { U } = lot;
  lawn(lot);
  const v = 18;
  // Low planter strip under the board.
  lot.layer((l) => {
    l.box(8, v - 4, U - 8, v + 4, 0, 3, { top: LEAF.mid, left: WOOD.mid, right: WOOD.dark }, {
      top: (_u, _v, x, y) => (noise2(x, y, 71) < 0.3 ? LEAF.light : noise2(x, y, 72) < 0.08 ? RED.light : LEAF.mid),
    });
  });
  lot.layer((l) => {
    for (const u of [16, 48]) {
      l.box(u - 1, v - 2, u + 1, v, 0, 14, { top: METAL.light, left: METAL.mid, right: METAL.dark });
    }
    // The board: thin box whose lit face is the advert.
    l.box(4, v - 2, U - 4, v, 13, 39, { top: METAL.light, left: CLUB.gold, right: METAL.dark }, {
      left: (a, z) => {
        if (a < 5 || a > U - 5 || z < 14 || z > 38) return CLUB.navy; // frame
        const band = Math.abs(z - 26 - (a - 32) * 0.3) < 3;
        if (band) return CLUB.navy;
        if (Math.abs(z - 26 - (a - 32) * 0.3) < 4) return WHITE;
        if (z > 31 && z < 33 && a > 26 && a < 54) return CLUB.navy; // "text"
        if (z > 18 && z < 20 && a > 10 && a < 36) return CLUB.navy;
        return CLUB.gold;
      },
    });
    decalV(l, ICON.ball, iconPal(0x8a4b22, WHITE), 44, v, 22);
    // Floodlamps on arms.
    for (const u of [18, 46]) {
      l.line([u, v, 39], [u, v + 3, 42], METAL.dark);
      l.box(u - 1, v + 2, u + 2, v + 4, 41, 43, { top: 0xfff3b0, left: METAL.mid, right: METAL.dark });
    }
  });
}

function grandstand(lot: Lot): void {
  const { U } = lot;
  lawn(lot);
  slab(lot, 3, 3, U - 3, 93, true);
  const u0 = 6;
  const u1 = U - 6;
  const front = 84;
  const depth = 12;
  const rise = 6;
  const tiers = 5;
  const back = front - depth * tiers;
  const concrete = 0xc8c3b8;
  castShadow(lot, { u0, v0: back, u1, v1: front, h: rise * tiers + 14 }, 16);
  lot.layer((l) => {
    // Back screen wall above the top tier.
    l.wallV(back, u0, u1, rise * tiers, rise * tiers + 14, 0x8a92a6, ribs(0x8a92a6, 6));
    l.wallU(u1, back - 4, back, 0, rise * tiers + 14, shade(0x8a92a6, 0.76));
    l.top(u0, back - 4, u1, back, rise * tiers + 14, 0x9aa2b6);
    for (let i = tiers - 1; i >= 0; i--) {
      const vf = front - depth * i;
      const vb = vf - depth;
      const z = rise * (i + 1);
      l.wallU(u1, vb, vf, 0, z, shade(concrete, 0.74));
      l.wallV(vf, u0, u1, rise * i, z, concrete, (_a, zz) => (zz > z - 1 ? shade(concrete, 1.08) : concrete));
      l.top(u0, vb, u1, vf, z, shade(concrete, 1.05));
      // A row of seat backs at the rear of each tread; centre aisle left clear.
      const seat = i % 2 ? CLUB.navy : CLUB.gold;
      for (const [a0, a1] of [[u0 + 2, U / 2 - 4], [U / 2 + 4, u1 - 2]] as const) {
        l.wallV(vb + 5, a0, a1, z, z + 3, seat, (a) => (pmod(a, 5) < 1 ? shade(seat, 0.7) : seat));
      }
    }
    // Centre aisle steps.
    for (let i = 0; i < tiers; i++) {
      const vf = front - depth * i;
      l.top(U / 2 - 3, vf - depth, U / 2 + 3, vf, rise * (i + 1), 0xe6e1d6, (_u, vv) =>
        pmod(vv, 6) < 1 ? shade(concrete, 0.85) : 0xe6e1d6,
      );
    }
  });
  // Cantilever roof on slim columns.
  lot.layer((l) => {
    const zr = rise * tiers + 22;
    for (const u of [u0 + 2, U / 2, u1 - 2]) pole(l, u, back + 1, rise * tiers, zr, METAL.dark, true);
    slope(l, [[u0 - 2, back - 6, zr + 4], [u1 + 2, back - 6, zr + 4], [u1 + 2, back + 34, zr - 2], [u0 - 2, back + 34, zr - 2]],
      0xdfe3e8, (_u, _v, _z, a) => (pmod(a, 8) < 1 ? 0xbfc5cd : 0xdfe3e8), 'u');
    l.wallV(back + 34, u0 - 2, u1 + 2, zr - 4, zr - 2, CLUB.navy);
    l.wallU(u1 + 2, back - 6, back + 34, zr - 4, zr - 2, CLUB.navyDark);
    // Club flags on the roof corners.
    for (const u of [u0, u1]) {
      pole(l, u, back - 4, zr + 4, zr + 16, METAL.dark);
      l.wallV(back - 4, u, u + 7, zr + 11, zr + 16, CLUB.gold, (_a, z) => (z < zr + 13 ? CLUB.navy : CLUB.gold));
    }
  });
}

function academy(lot: Lot): void {
  const { U } = lot;
  lawn(lot);
  const b: Block = { u0: 12, v0: 10, u1: 84, v1: 60, h: 36 };
  slab(lot, 8, 6, 88, 66);
  slab(lot, 41, 66, 55, U - 1);
  castShadow(lot, b, 16);
  const cream = 0xf1e4c4;
  const brickC = 0xa84f3a;
  lot.layer((l) => {
    walls(l, b, cream, (c) => {
      const lowerC = c === cream ? brickC : shade(brickC, 0.76);
      return (a, z, x, y) => (z < 14 ? brick(lowerC, mix(lowerC, WHITE, 0.45))(a, z, x, y) : plaster(c)(a, z, x, y));
    });
    l.wallV(b.v1, b.u0, b.u1, 14, 15, WHITE);
    l.wallU(b.u1, b.v0, b.v1, 14, 15, shade(WHITE, 0.8));
    for (const u of [16, 28, 60, 72]) windowV(l, b.v1, u, u + 8, 4, 11, WHITE);
    for (const u of [16, 28, 42, 60, 72]) windowV(l, b.v1, u, u + 8, 19, 29, WHITE);
    for (const v of [16, 30, 44]) {
      windowU(l, b.u1, v, v + 8, 4, 11);
      windowU(l, b.u1, v, v + 8, 19, 29);
    }
    doorV(l, b.v1, 43, 53, 13, CLUB.navy);
    gableU(l, b, 18, 0x4d6c9e, cream);
    // Crest on the gable end: graduation cap on a gold roundel.
    decalU(l, ['.yyyyyyy.', 'yyyyyyyyy', 'yyyyyyyyy', 'yyyyyyyyy', 'yyyyyyyyy', 'yyyyyyyyy', '.yyyyyyy.'], { y: CLUB.gold }, b.u1, 31, b.h + 11);
    decalU(l, ICON.cap, iconPal(CLUB.navy, RED.mid), b.u1, 31, b.h + 10);
  });
  // Entrance portico.
  lot.layer((l) => {
    for (const u of [41, 55]) l.box(u - 1, b.v1 + 5, u + 1, b.v1 + 7, 0, 16, { top: WHITE, left: WHITE, right: 0xd8d2c4 });
    l.box(39, b.v1, 57, b.v1 + 8, 16, 19, { top: 0xe9e4d8, left: WHITE, right: 0xd0cabd });
    l.box(40, b.v1, 56, b.v1 + 4, 0, 1, { top: STONE.hi, left: STONE.light, right: STONE.mid });
  });
  // Flagpole with the club flag.
  lot.layer((l) => {
    pole(l, 8, 80, 0, 44, METAL.light);
    l.wallV(80, 8, 18, 36, 43, CLUB.gold, (_a, z) => (z < 39 ? CLUB.navy : CLUB.gold));
  });
  for (const [u, v] of [[30, 70], [66, 70], [20, 86]] as const) lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, u, v));
}

function coachsOffice(lot: Lot): void {
  lawn(lot);
  slab(lot, 6, 6, 56, 52);
  const b: Block = { u0: 12, v0: 10, u1: 48, v1: 44, h: 20 };
  castShadow(lot, b);
  const blue = 0xa2c8de;
  lot.layer((l) => {
    walls(l, b, blue, boards);
    doorV(l, b.v1, 18, 26, 13, 0x3f7d4a);
    windowV(l, b.v1, 32, 43, 7, 15);
    windowU(l, b.u1, 16, 28, 7, 15);
    hipRoof(l, b, 14, 0x3f8a4d);
    // Chimney.
    l.box(36, 16, 40, 20, b.h + 4, b.h + 14, { top: 0x6b4a3a, left: 0xa8553f, right: 0x7f3e2f });
  });
  // Clipboard sign on a post by the path.
  lot.layer((l) => {
    pole(l, 56, 56, 0, 10, WOOD.dark, true);
    signV(l, 57, 50, 9, 13, 12, 0xfaf6ea, ICON.clipboard, iconPal(OUTLINE, CLUB.gold));
  });
  // Bench out front.
  lot.layer((l) => {
    l.box(30, 50, 42, 53, 3, 4, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark });
    l.box(30, 50, 42, 51, 4, 8, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark });
  });
}

function scoutOffice(lot: Lot): void {
  lawn(lot);
  slab(lot, 5, 6, 56, 58);
  const b: Block = { u0: 10, v0: 12, u1: 46, v1: 48, h: 22 };
  castShadow(lot, b);
  const timber = 0xb5794a;
  lot.layer((l) => {
    walls(l, b, timber, boards);
    windowV(l, b.v1, 14, 26, 8, 17, 0xf3e3c6);
    doorV(l, b.v1, 32, 40, 14, 0x5c3a22, 0xf3e3c6);
    windowU(l, b.u1, 18, 28, 8, 17, 0xf3e3c6);
    windowU(l, b.u1, 34, 42, 8, 17, 0xf3e3c6);
    gableV(l, b, 14, 0x4f5562, timber);
    // Binoculars sign hung on the gable end.
    signV(l, b.v1, 21, b.h, 15, 10, 0xf3e3c6, ICON.binoculars, iconPal(OUTLINE));
    // Antenna mast with a red tip on the ridge.
    l.line([28, 14, b.h + 14], [28, 14, b.h + 28], METAL.dark);
    l.line([25, 14, b.h + 24], [31, 14, b.h + 24], METAL.dark);
    l.dot(28, 14, b.h + 29, RED.light);
  });
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, 22, 56));
}

function medicalBay(lot: Lot): void {
  lawn(lot);
  slab(lot, 5, 4, 60, 58);
  const b: Block = { u0: 10, v0: 8, u1: 52, v1: 46, h: 24 };
  castShadow(lot, b);
  const wall = 0xeeeae0;
  lot.layer((l) => {
    walls(l, b, wall, plaster);
    l.wallV(b.v1, b.u0, b.u1, 11, 13, RED.mid);
    l.wallU(b.u1, b.v0, b.v1, 11, 13, RED.dark);
    glassDoorV(l, b.v1, 25, 37, 10, RED.mid);
    windowV(l, b.v1, 13, 21, 15, 21);
    windowV(l, b.v1, 41, 49, 15, 21);
    windowU(l, b.u1, 14, 22, 15, 21);
    windowU(l, b.u1, 30, 38, 15, 21);
    // Big red cross over the doors.
    decalV(l, ICON.cross, PAL.red, 28, b.v1, 22);
    gableV(l, b, 12, 0x6f9fd0, wall);
    // Round vent in the gable.
    decalV(l, ['.ooo.', 'ommmo', 'ommmo', '.ooo.'], { o: 0xb9b3a6, m: 0x6d7682 }, 29, b.v1, b.h + 7);
  });
  // Ambulance-bay marking + a stretcher by the door.
  lot.layer((l) => {
    l.box(42, 50, 54, 54, 3, 4, { top: WHITE, left: 0xd8dde3, right: 0xb7bec7 });
    pole(l, 43, 53, 0, 3, METAL.dark);
    pole(l, 53, 53, 0, 3, METAL.dark);
    l.box(42, 50, 45, 54, 4, 5, { top: 0xd7e9f7, left: 0xb9d4ea, right: 0x9dbbd3 });
  });
}

function teamGym(lot: Lot): void {
  const { U } = lot;
  lawn(lot);
  slab(lot, 4, 6, 92, 82, true);
  const b: Block = { u0: 8, v0: 10, u1: 84, v1: 72, h: 32 };
  castShadow(lot, b, 18);
  const clad = 0x3e4d70;
  lot.layer((l) => {
    walls(l, b, clad, (c) => ribs(c, 3));
    // Gold accent stripe.
    l.wallV(b.v1, b.u0, b.u1, 22, 25, CLUB.gold);
    l.wallU(b.u1, b.v0, b.v1, 22, 25, CLUB.goldDark);
    // Roller door.
    l.wallV(b.v1, 34, 62, 0, 19, METAL.dark);
    l.wallV(b.v1, 35, 61, 0, 18, METAL.light, (_a, z) => (pmod(z, 2) < 1 ? METAL.mid : METAL.light));
    // Clerestory windows on the shaded side.
    for (const v of [16, 30, 44, 58]) windowU(l, b.u1, v, v + 10, 14, 20, METAL.light);
    doorU(l, b.u1, 62, 68, 13, CLUB.navy);
    windowV(l, b.v1, 14, 26, 8, 17, METAL.light);
    windowV(l, b.v1, 68, 80, 8, 17, METAL.light);
    gableU(l, b, 14, 0xbac2cb, clad, roofRibs, 2);
    // Sign board over the roller door with a kettlebell.
    signV(l, b.v1, 38, 26, 22, 12, WHITE, ICON.kettlebell, iconPal(CLUB.navy));
    decalU(l, ICON.dumbbell, iconPal(CLUB.gold), b.u1, 36, b.h + 8);
  });
  // Tyre-flip tyres out front.
  for (const [u, v] of [[20, 80], [U - 26, 80]] as const) {
    lot.layer((l) => {
      l.box(u - 4, v - 4, u + 4, v + 4, 0, 3, { top: 0x2b2b30, left: 0x3a3a40, right: 0x222226 }, {
        top: (uu, vv) => (Math.abs(uu - u) < 2 && Math.abs(vv - v) < 2 ? 0x18181b : 0x2b2b30),
      });
    });
  }
}

const RECIPES: Record<FacilityDefId, (lot: Lot) => void> = {
  trainingPaddock,
  weightsRoom,
  videoRoom,
  physioCentre,
  canteen,
  sponsorBoard,
  grandstand,
  academy,
  coachsOffice,
  scoutOffice,
  medicalBay,
  teamGym,
};


// ── Level upgrades ──────────────────────────────────────────────────────────
//
// L1 is the base recipe. L2 layers on an awning, accent trim, a side annex,
// more props and a flag; L3 adds an extra storey (flat roofs) or a lit rooftop
// sign (pitched roofs), floodlight masts and more flags. Everything stays
// inside the lot so the footprint and anchor never change.

export type FacilityLevel = 1 | 2 | 3;
export const FACILITY_LEVELS: readonly FacilityLevel[] = [1, 2, 3];

const LAMP = 0xfff3b0;

interface Upgrade {
  b: Block;
  accent: number;
  /** Flat roofs get an extra storey at L3; pitched roofs get a lit sign. */
  flat: boolean;
  /** Pitched roof rise, for placing the L3 rooftop sign. */
  rise?: number;
}

const UPGRADES: Partial<Record<FacilityDefId, Upgrade>> = {
  weightsRoom: { b: { u0: 10, v0: 8, u1: 54, v1: 48, h: 26 }, accent: CLUB.gold, flat: true },
  videoRoom: { b: { u0: 10, v0: 10, u1: 54, v1: 50, h: 28 }, accent: 0x7fb2ea, flat: true },
  physioCentre: { b: { u0: 10, v0: 8, u1: 54, v1: 48, h: 26 }, accent: 0x2fa59a, flat: true },
  canteen: { b: { u0: 8, v0: 6, u1: 50, v1: 36, h: 20 }, accent: RED.mid, flat: false, rise: 12 },
  academy: { b: { u0: 12, v0: 10, u1: 84, v1: 60, h: 36 }, accent: CLUB.gold, flat: false, rise: 18 },
  coachsOffice: { b: { u0: 12, v0: 10, u1: 48, v1: 44, h: 20 }, accent: 0x3f8a4d, flat: false, rise: 14 },
  scoutOffice: { b: { u0: 10, v0: 12, u1: 46, v1: 48, h: 22 }, accent: 0xd9a441, flat: false, rise: 14 },
  medicalBay: { b: { u0: 10, v0: 8, u1: 52, v1: 46, h: 24 }, accent: RED.mid, flat: false, rise: 12 },
  teamGym: { b: { u0: 8, v0: 10, u1: 84, v1: 72, h: 32 }, accent: CLUB.gold, flat: false, rise: 14 },
};

/** Floodlight mast with a lamp head. */
function mast(l: IsoPainter, u: number, v: number, z: number): void {
  pole(l, u, v, 0, z, METAL.dark, true);
  l.box(u - 3, v - 1, u + 3, v + 1, z, z + 3, { top: LAMP, left: METAL.mid, right: METAL.dark });
}

/** Club flag on a pole. */
function flag(l: IsoPainter, u: number, v: number, z: number): void {
  pole(l, u, v, 0, z, METAL.light);
  l.wallV(v, u, u + 8, z - 7, z, CLUB.gold, (_a, zz) => (zz < z - 3 ? CLUB.navy : CLUB.gold));
}

/** Gold level pips on the lot's front corner (1–3), readable at low zoom. */
function pips(lot: Lot, level: FacilityLevel): void {
  const { U, V } = lot;
  lot.layer((l) => {
    for (let i = 0; i < level; i++) {
      const u = U / 2 - (level * 5) / 2 + i * 6;
      l.box(u, V - 8, u + 4, V - 4, 0, 3, { top: CLUB.gold, left: CLUB.goldDark, right: CLUB.goldDark });
    }
  });
}

function upgradeBuilding(lot: Lot, up: Upgrade, level: FacilityLevel): void {
  const { b, accent } = up;
  const { U, V } = lot;
  const cx = (b.u0 + b.u1) / 2;
  const front = Math.min(b.v1 + 8, V - 4);
  // L2: striped awning over the entrance, accent trim, side annex, props, flag.
  lot.layer((l) => {
    const u0 = cx - 14;
    const u1 = cx + 14;
    const zA = Math.min(b.h * 0.6, 18);
    slope(l, [[u0, b.v1, zA], [u1, b.v1, zA], [u1, b.v1 + 8, zA - 4], [u0, b.v1 + 8, zA - 4]], accent, (_u, _v, _z, a) =>
      pmod(Math.floor(a / 3), 2) ? WHITE : accent,
    'u');
    l.wallV(b.v1 + 8, u0, u1, zA - 6, zA - 4, accent, (a) => (pmod(Math.floor(a / 3), 2) ? WHITE : accent));
    l.wallV(b.v1, b.u0, b.u1, b.h - 3, b.h - 1, accent);
    l.wallU(b.u1, b.v0, b.v1, b.h - 3, b.h - 1, shade(accent, 0.76));
  });
  lot.layer((l) => {
    const a = { u0: b.u0, v0: b.v1, u1: b.u0 + 10, v1: b.v1 + 8, h: 9 };
    l.box(a.u0, a.v0, a.u1, a.v1, 0, a.h, { top: shade(accent, 1.1), left: mix(accent, WHITE, 0.5), right: shade(accent, 0.7) });
    l.wallV(a.v1, a.u0 + 2, a.u1 - 2, 2, 7, 0xbfe6f5);
  });
  lot.layer((l) => {
    l.box(b.u1 - 12, front, b.u1 - 6, front + 4, 0, 4, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark });
    l.box(b.u1 - 5, front, b.u1 - 1, front + 4, 0, 6, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark });
  });
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, b.u0 + 16, front + 2));
  lot.layer((l) => flag(l, Math.min(b.u1 + 3, U - 4), b.v1 - 2, b.h + 12));
  if (level < 3) return;

  // L3: extra storey / lit rooftop sign, glass front, floodlights, more flags.
  if (up.flat) {
    lot.layer((l) => {
      const s: Block = { u0: b.u0 + 8, v0: b.v0 + 8, u1: b.u1 - 8, v1: b.v1 - 8, h: 14 };
      l.box(s.u0, s.v0, s.u1, s.v1, b.h, b.h + s.h, { top: shade(accent, 1.15), left: 0xe9edf2, right: 0xc2c8d0 });
      l.wallV(s.v1, s.u0 + 3, s.u1 - 3, b.h + 4, b.h + 11, 0xbfe6f5);
      l.wallV(s.v1, s.u0 + 3, s.u1 - 3, b.h + 7, b.h + 8, WHITE);
      l.wallU(s.u1, s.v0 + 3, s.v1 - 3, b.h + 4, b.h + 11, 0x8cc3de);
      l.wallV(s.v1, s.u0, s.u1, b.h + 12, b.h + 14, accent);
    });
  } else {
    lot.layer((l) => {
      const vm = (b.v0 + b.v1) / 2;
      const z = b.h + (up.rise ?? 12);
      pole(l, cx - 10, vm, z - 2, z + 4, METAL.dark);
      pole(l, cx + 10, vm, z - 2, z + 4, METAL.dark);
      l.box(cx - 14, vm - 1, cx + 14, vm + 1, z + 4, z + 14, { top: LAMP, left: LAMP, right: shade(accent, 0.8) }, {
        left: (a, zz) => (a < 2 || a > 26 || zz < 5 || zz > 12 ? accent : mix(LAMP, WHITE, 0.4)),
      });
    });
  }
  lot.layer((l) => {
    l.wallV(b.v1, cx - 11, cx + 11, 0, 3, accent); // lit threshold strip
    l.wallV(b.v1, cx - 10, cx + 10, 3, 4, LAMP);
  });
  lot.layer((l) => mast(l, 5, V - 5, 44));
  lot.layer((l) => mast(l, U - 5, V - 5, 44));
  lot.layer((l) => flag(l, b.u0 + 4, V - 8, 30));
}

function upgradePaddock(lot: Lot, level: FacilityLevel): void {
  const { U, V } = lot;
  lot.layer((l) => {
    l.box(10, 54, 24, 57, 0, 3, { top: WOOD.light, left: WOOD.mid, right: WOOD.dark }); // bench
    l.box(40, 52, 50, 56, 0, 5, { top: WHITE, left: 0xd8dde3, right: 0xb7bec7 }); // water cooler
    l.wallV(8, 14, 50, 14, 22, CLUB.navy, (a, z) => (z > 19 || a < 17 ? CLUB.gold : CLUB.navy)); // banner
    pole(l, 14, 8, 0, 14, METAL.dark);
    pole(l, 50, 8, 0, 14, METAL.dark);
  });
  lot.layer((l) => flag(l, U - 6, 8, 40));
  if (level < 3) return;
  lot.layer((l) => {
    l.box(6, 12, 20, 24, 0, 14, { top: 0xdfe3e8, left: 0xe9edf2, right: 0xb9c1cc }); // pavilion
    l.wallV(24, 8, 18, 0, 9, 0x3a4a63);
    l.box(4, 10, 22, 26, 14, 17, { top: CLUB.navy, left: CLUB.navy, right: CLUB.navyDark });
  });
  lot.layer((l) => mast(l, 6, V - 6, 48));
  lot.layer((l) => mast(l, U - 6, V - 6, 48));
  lot.layer((l) => mast(l, U - 6, 10, 48));
}

function upgradeSponsorBoard(lot: Lot, level: FacilityLevel): void {
  const { U } = lot;
  const v = 18;
  lot.layer((l) => {
    // Front ticker screen with scrolling "text" bars.
    l.box(12, v + 4, U - 12, v + 6, 2, 11, { top: METAL.light, left: CLUB.navy, right: METAL.dark }, {
      left: (a, z) => (z > 4 && z < 7 && pmod(a, 6) < 4 ? LAMP : z > 8 ? CLUB.gold : CLUB.navy),
    });
    for (const u of [8, U - 8]) l.box(u - 1, v + 7, u + 1, v + 9, 0, 6, { top: LEAF.light, left: LEAF.mid, right: LEAF.dark });
  });
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, 6, v + 12));
  lot.layer((l) => prop(l, SHRUB, SHRUB_PAL, U - 6, v + 12));
  if (level < 3) return;
  lot.layer((l) => {
    // Second tier on top, lit.
    l.box(10, v - 2, U - 10, v, 39, 53, { top: METAL.light, left: LAMP, right: METAL.dark }, {
      left: (a, z) => (a < 3 || a > U - 23 || z < 41 || z > 51 ? CLUB.navy : pmod(Math.floor(a / 5), 2) ? CLUB.gold : 0xfff7d0),
    });
    for (const u of [4, U - 4]) pole(l, u, v + 6, 0, 44, METAL.dark, true);
  });
  lot.layer((l) => flag(l, 4, v + 8, 56));
  lot.layer((l) => flag(l, U - 12, v + 8, 56));
}

function upgradeGrandstand(lot: Lot, level: FacilityLevel): void {
  const { U } = lot;
  lot.layer((l) => {
    // Ticket booth with a striped roof at the front-left.
    l.box(10, 86, 24, 92, 0, 12, { top: RED.mid, left: 0xf2efe7, right: 0xc9c5ba });
    l.wallV(92, 13, 21, 3, 9, 0xbfe6f5);
    l.box(8, 85, 26, 93, 12, 14, { top: RED.light, left: RED.mid, right: RED.dark });
    // Club banner across the front of the tiers.
    l.wallV(84, 10, U - 10, 1, 5, CLUB.navy, (a) => (pmod(Math.floor(a / 6), 2) ? CLUB.navy : CLUB.gold));
  });
  lot.layer((l) => flag(l, U - 12, 88, 24));
  lot.layer((l) => flag(l, U - 6, 90, 20));
  if (level < 3) return;
  for (const [u, v] of [[4, 8], [U - 4, 8], [4, 90], [U - 4, 90]] as const) lot.layer((l) => mast(l, u, v, 84));
  lot.layer((l) => {
    // Lit scoreboard on the back wall.
    l.wallV(24, 20, U - 20, 36, 52, CLUB.navyDark);
    l.wallV(24, 22, U - 22, 38, 50, 0x1b2a1e, (a, z) => (z > 43 && z < 46 && pmod(a, 5) < 3 ? LAMP : 0x1b2a1e));
  });
}

function upgradeLot(defId: FacilityDefId, lot: Lot, level: FacilityLevel): void {
  if (level >= 2) {
    const up = UPGRADES[defId];
    if (up) upgradeBuilding(lot, up, level);
    else if (defId === 'trainingPaddock') upgradePaddock(lot, level);
    else if (defId === 'sponsorBoard') upgradeSponsorBoard(lot, level);
    else upgradeGrandstand(lot, level);
  }
  pips(lot, level);
}

/**
 * Sprite origin that lands a facility texture's footprint diamond on its tiles
 * when the sprite is positioned at the footprint origin's top vertex. Derived
 * from the footprint and texture height alone: the bottom (w+h)·TILE_H/2 rows
 * are the diamond, whose top vertex sits h·TILE_W/2 from the left edge.
 */
export function facilityOrigin(footprint: { w: number; h: number }, texH: number): { x: number; y: number } {
  const { w, h } = footprint;
  return { x: h / (w + h), y: (texH - (w + h) * (TILE_H / 2)) / texH };
}

/**
 * The footprint side each facility's door faces, as drawn above (#395): most open
 * onto their +gy ('s') face; the video room's door is on its +gx ('e') wall. The
 * auto footpath (src/world/path.ts autoPaths) leaves from the middle of this side.
 */
export const FACILITY_DOOR: Record<FacilityDefId, 's' | 'e'> = {
  trainingPaddock: 's', // gate gap in the front fence
  weightsRoom: 's',
  videoRoom: 'e',
  physioCentre: 's',
  canteen: 's', // serving hatch and tables
  sponsorBoard: 's', // the advert faces this way
  grandstand: 's',
  academy: 's',
  coachsOffice: 's',
  scoutOffice: 's',
  medicalBay: 's',
  teamGym: 's', // roller door
};

/** Generate the art for one catalog facility at a level (pure; deterministic). */
export function facilityArt(defId: FacilityDefId, level: FacilityLevel = 1): FacilityArt {
  const { w, h } = FACILITY_CATALOG[defId].footprint;
  const lot = makeLot(w, h);
  RECIPES[defId](lot);
  upgradeLot(defId, lot, level);
  return finish(lot, w, h);
}

/** Texture key for a facility at a level (ARCHITECTURE §7). */
export function facilityTextureKey(defId: FacilityDefId, level: number): string {
  return `facility-${defId}-${Math.min(3, Math.max(1, Math.floor(level) || 1))}`;
}

/** Every facility texture keyed `facility-<defId>-<level>` (levels 1–3). */
export function facilityTextures(): { key: string; buf: PixelBuffer }[] {
  return (Object.keys(FACILITY_CATALOG) as FacilityDefId[]).flatMap((defId) =>
    FACILITY_LEVELS.map((level) => ({ key: facilityTextureKey(defId, level), buf: facilityArt(defId, level).buf })),
  );
}
