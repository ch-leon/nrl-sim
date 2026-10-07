import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../../src/art/match/kit';
import {
  PAL,
  cameraWorldBounds,
  crowdSeats,
  foregroundWorldBounds,
  paintBackground,
  paintForeground,
  stadiumWorldBounds,
} from '../../../src/art/match/stadium';
import { isoProject, isoUnproject } from '../../../src/art/match/iso3d';
import { FIELD_LONG, FIELD_WIDE, IN_GOAL_DEPTH, fieldOffsetX, fieldToWorldPoint, fieldWorldBounds } from '../../../src/scenes/matchField';

/** Byte-for-byte equality of two pixel arrays. */
function sameData(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const off = fieldOffsetX();
const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'player');
const away = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');

const inside = (r: { x: number; y: number; width: number; height: number }, p: { x: number; y: number }): boolean =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

describe('iso3d projection', () => {
  it('unproject inverts project on the ground plane', () => {
    const w = isoProject(7.25, 3.5, 0, off);
    const g = isoUnproject(w.x, w.y, off);
    expect(g.gx).toBeCloseTo(7.25);
    expect(g.gy).toBeCloseTo(3.5);
    expect(isoProject(1, 1, 10, off).y).toBe(isoProject(1, 1, 0, off).y - 10);
  });
});

describe('stadium bounds', () => {
  it('camera bounds contain the field; painted bounds contain the camera bounds', () => {
    const cam = cameraWorldBounds(off);
    const bg = stadiumWorldBounds(off);
    const field = fieldWorldBounds(off);
    for (const p of [
      { x: field.x + 1, y: field.y + 1 },
      { x: field.x + field.width - 1, y: field.y + field.height - 1 },
    ]) expect(inside(cam, p)).toBe(true);
    expect(cam.x).toBeGreaterThanOrEqual(bg.x);
    expect(cam.y).toBeGreaterThanOrEqual(bg.y);
    expect(cam.x + cam.width).toBeLessThanOrEqual(bg.x + bg.width);
    expect(cam.y + cam.height).toBeLessThanOrEqual(bg.y + bg.height);
  });
});

describe('paintBackground / paintForeground', () => {
  const bg = paintBackground(off, home, away);
  const fg = paintForeground(off, home, away);
  const bgAt = (w: { x: number; y: number }) => bg.buf.get(Math.floor(w.x - bg.ox), Math.floor(w.y - bg.oy));

  it('background is fully opaque and sized to the stadium bounds', () => {
    const b = stadiumWorldBounds(off);
    expect(bg.buf.w).toBe(b.width);
    expect(bg.buf.h).toBe(b.height);
    expect(bg.buf.opaqueCount()).toBe(bg.buf.w * bg.buf.h);
  });

  it('paints grass on the field, white on the try-line and halfway', () => {
    const grass = bgAt(fieldToWorldPoint(25, 30, off));
    expect(grass.color === PAL.line).toBe(false);
    expect((grass.color >> 8) & 0xff).toBeGreaterThan((grass.color >> 16) & 0xff); // green dominant
    // Scan along the try-line for line pixels.
    let lines = 0;
    for (let fy = 10; fy < 90; fy += 2) {
      const w = isoProject(IN_GOAL_DEPTH, (fy / 100) * FIELD_WIDE, 0, off);
      for (let dx = -2; dx <= 2; dx++) if (bgAt({ x: w.x + dx, y: w.y }).color === PAL.line) lines++;
    }
    expect(lines).toBeGreaterThan(30);
  });

  it('is deterministic', () => {
    const again = paintBackground(off, home, away);
    expect(sameData(again.buf.data, bg.buf.data)).toBe(true);
  });

  it('foreground leaves the playing field transparent (it only frames the near edges)', () => {
    expect(foregroundWorldBounds(off).width).toBe(fg.buf.w);
    for (const [fx, fy] of [
      [50, 50],
      [10, 90],
      [95, 95],
      [5, 5],
    ] as const) {
      const w = fieldToWorldPoint(fx, fy, off);
      const p = fg.buf.get(Math.floor(w.x - fg.ox), Math.floor(w.y - fg.oy));
      expect(p.alpha).toBe(0);
    }
    expect(fg.buf.opaqueCount()).toBeGreaterThan(5000);
  });
});

describe('crowdSeats', () => {
  const seats = crowdSeats();

  it('is deterministic and sizeable, with both layers and views', () => {
    expect(crowdSeats()).toEqual(seats);
    expect(seats.length).toBeGreaterThan(600);
    expect(seats.length).toBeLessThan(2000);
    expect(seats.some((s) => s.layer === 'back' && s.view === 'front')).toBe(true);
    expect(seats.some((s) => s.layer === 'front' && s.view === 'back')).toBe(true);
    expect(new Set(seats.map((s) => s.bay)).size).toBe(3);
  });

  it('no seat is on the playing field', () => {
    for (const s of seats) {
      const onField = s.gx > 0 && s.gx < FIELD_LONG && s.gy > 0 && s.gy < FIELD_WIDE;
      expect(onField).toBe(false);
    }
  });
});
