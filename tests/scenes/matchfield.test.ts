import { describe, it, expect } from 'vitest';
import {
  FIELD_LONG,
  FIELD_WIDE,
  IN_GOAL_DEPTH,
  PLAY_LONG,
  TEN_METRES,
  colorToInt,
  depthAtWorldY,
  fieldToGrid,
  fieldToWorldPoint,
  fieldOffsetX,
  fieldWorldBounds,
  panTowards,
  PAN_MAX_PX_PER_MS,
  PAN_RATE_PER_S,
  bonusZone,
  bonusZoneCorners,
  bonusZoneGrid,
} from '../../src/scenes/matchField';
import { FIELD_LENGTH, IN_GOAL, MID_Y } from '../../src/match/core/field';
import { GOALS, inBonusZone, postsFor } from '../../src/match/league/goals';
import { gridToScreen } from '../../src/world/iso';
import { TILE_W } from '../../src/config';

describe('matchField.colorToInt', () => {
  it('parses #rrggbb hex to a 24-bit int', () => {
    expect(colorToInt('#ff0000')).toBe(0xff0000);
    expect(colorToInt('#00ff00')).toBe(0x00ff00);
    expect(colorToInt('#0000ff')).toBe(0x0000ff);
    expect(colorToInt('#123456')).toBe(0x123456);
  });

  it('expands #rgb shorthand and tolerates a missing hash', () => {
    expect(colorToInt('#0f0')).toBe(0x00ff00);
    expect(colorToInt('abcdef')).toBe(0xabcdef);
  });

  it('falls back to white on garbage input', () => {
    expect(colorToInt('not-a-color')).toBe(0xffffff);
    expect(colorToInt('')).toBe(0xffffff);
  });
});

describe('matchField.fieldToGrid', () => {
  it('maps fx 0..100 onto try-line → try-line (in-goal beyond)', () => {
    expect(fieldToGrid(0, 0)).toEqual({ gx: IN_GOAL_DEPTH, gy: 0 });
    expect(fieldToGrid(100, 100)).toEqual({ gx: FIELD_LONG - IN_GOAL_DEPTH, gy: FIELD_WIDE });
    expect(fieldToGrid(50, 50)).toEqual({ gx: FIELD_LONG / 2, gy: FIELD_WIDE / 2 });
    expect(PLAY_LONG).toBe(FIELD_LONG - 2 * IN_GOAL_DEPTH);
    expect(TEN_METRES * 10).toBeCloseTo(PLAY_LONG);
  });

  it('places fx outside 0..100 in the in-goal areas', () => {
    expect(fieldToGrid(-12.5, 50).gx).toBeCloseTo(0);
    expect(fieldToGrid(112.5, 50).gx).toBeCloseTo(FIELD_LONG);
  });

  it('produces fractional cells for off-grid values', () => {
    const { gx } = fieldToGrid(33, 0);
    expect(Number.isInteger(gx)).toBe(false);
  });
});

describe('matchField.fieldToWorldPoint', () => {
  const off = fieldOffsetX();

  it('composes fieldToGrid + iso projection + offset', () => {
    const { gx, gy } = fieldToGrid(40, 60);
    const iso = gridToScreen(gx, gy);
    expect(fieldToWorldPoint(40, 60, off)).toEqual({ x: iso.x + off, y: iso.y });
  });

  it('offsetX keeps the widest cell on non-negative screenX (AC: off-canvas)', () => {
    // fy=100 at fx=0 is the most negative raw screenX inside the try-lines.
    const p = fieldToWorldPoint(0, 100, off);
    expect(p.x).toBeGreaterThanOrEqual(0);
  });

  it('maps midline try-line ends to opposite sides (AC)', () => {
    const near = fieldToWorldPoint(0, 50, off);
    const far = fieldToWorldPoint(100, 50, off);
    // Along the field length the iso screenX grows with gx, so far end is to the
    // right of the near end and they are distinct points.
    expect(far.x).toBeGreaterThan(near.x);
    expect(far).not.toEqual(near);
  });
});

describe('matchField.fieldWorldBounds', () => {
  const off = fieldOffsetX();
  const b = fieldWorldBounds(off);

  it('encloses all four projected corners plus padding', () => {
    const corners = [
      fieldToWorldPoint(0, 0, off),
      fieldToWorldPoint(100, 0, off),
      fieldToWorldPoint(0, 100, off),
      fieldToWorldPoint(100, 100, off),
    ];
    for (const c of corners) {
      expect(c.x).toBeGreaterThanOrEqual(b.x);
      expect(c.x).toBeLessThanOrEqual(b.x + b.width);
      expect(c.y).toBeGreaterThanOrEqual(b.y);
      expect(c.y).toBeLessThanOrEqual(b.y + b.height);
    }
  });

  it('has positive extent with a one-tile pad margin', () => {
    expect(b.width).toBeGreaterThan(TILE_W);
    expect(b.height).toBeGreaterThan(0);
    expect(b.x).toBeLessThan(0); // left pad pushes origin negative
  });
});

describe('matchField.depthAtWorldY', () => {
  it('sorts by ground-contact y (iso convention: depth = screenY + layer)', () => {
    const near = fieldToWorldPoint(60, 80, fieldOffsetX());
    const far = fieldToWorldPoint(40, 20, fieldOffsetX());
    expect(depthAtWorldY(near.y)).toBeGreaterThan(depthAtWorldY(far.y));
    expect(depthAtWorldY(100, 2)).toBe(102);
  });
});

describe('matchField.panTowards', () => {
  const run = (fps: number, ms: number, target: number, maxPxPerMs = Infinity): number => {
    let x = 0;
    const dt = 1000 / fps;
    for (let t = 0; t < ms - 1e-9; t += dt) x = panTowards(x, target, dt, PAN_RATE_PER_S, maxPxPerMs);
    return x;
  };

  it('keeps the original ~3%-per-frame feel at 60fps', () => {
    expect(panTowards(0, 100, 1000 / 60, PAN_RATE_PER_S, Infinity)).toBeCloseTo(3, 1);
    expect(panTowards(100, 100, 16)).toBe(100); // no movement at the target
  });

  it('is frame-rate independent (#13)', () => {
    const at30 = run(30, 1000, 500);
    const at120 = run(120, 1000, 500);
    expect(Math.abs(at30 - at120)).toBeLessThan(0.5);
    expect(at30).toBeGreaterThan(0);
    expect(at30).toBeLessThan(500);
  });

  it('caps the pan speed so a long kick cannot whip the view', () => {
    const x = panTowards(0, 10_000, 100, PAN_RATE_PER_S, PAN_MAX_PX_PER_MS);
    expect(x).toBeCloseTo(PAN_MAX_PX_PER_MS * 100);
    expect(panTowards(0, -10_000, 100, PAN_RATE_PER_S, PAN_MAX_PX_PER_MS)).toBeCloseTo(-PAN_MAX_PX_PER_MS * 100);
    // Capped motion is also frame-rate independent.
    expect(Math.abs(run(30, 500, 10_000, 0.4) - run(120, 500, 10_000, 0.4))).toBeLessThan(1);
  });
});

// Nines (#77): the zone drawn on the pitch is the zone the sim scores five from.
describe('matchField.bonusZone', () => {
  it('is the in-goal between the uprights, try line to dead-ball line, at each end', () => {
    expect(bonusZone(1)).toEqual({ x0: FIELD_LENGTH, x1: FIELD_LENGTH + IN_GOAL, y0: MID_Y - GOALS.halfPosts, y1: MID_Y + GOALS.halfPosts });
    expect(bonusZone(-1)).toEqual({ x0: -IN_GOAL, x1: 0, y0: MID_Y - GOALS.halfPosts, y1: MID_Y + GOALS.halfPosts });
  });

  it('has exactly the bounds of the rule file: inside it is where inBonusZone says five, inside the in-goal', () => {
    for (const dir of [1, -1] as const) {
      const z = bonusZone(dir);
      const posts = postsFor(dir, FIELD_LENGTH, MID_Y);
      let inside = 0;
      for (let x = -14; x <= FIELD_LENGTH + 14; x += 0.25) {
        if (x > 14 && x < FIELD_LENGTH - 14) continue;
        for (let y = MID_Y - 6; y <= MID_Y + 6; y += 0.25) {
          const p = { x, y };
          const drawn = x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
          const scored = inBonusZone(p, posts, dir) && (x - posts.x) * dir <= IN_GOAL;
          expect(drawn, `${dir} at ${x}, ${y}`).toBe(scored);
          if (drawn) inside++;
        }
      }
      expect(inside).toBeGreaterThan(500);
    }
  });

  it('maps onto the grid from the try line into the in-goal, centred across', () => {
    const r = bonusZoneGrid(1);
    expect(r.x0).toBeCloseTo(FIELD_LONG - IN_GOAL_DEPTH);
    expect(r.x1).toBeCloseTo(FIELD_LONG - IN_GOAL_DEPTH + (IN_GOAL / FIELD_LENGTH) * PLAY_LONG);
    expect((r.y0 + r.y1) / 2).toBeCloseTo(FIELD_WIDE / 2);
    const l = bonusZoneGrid(-1);
    expect(l.x1).toBeCloseTo(IN_GOAL_DEPTH);
    expect(l.x0).toBeCloseTo(IN_GOAL_DEPTH - (IN_GOAL / FIELD_LENGTH) * PLAY_LONG);
    expect([l.y0, l.y1]).toEqual([r.y0, r.y1]);
    expect(l.x0).toBeGreaterThanOrEqual(0); // inside the painted in-goal
  });

  it('gives its corners on screen, the try-line pair first', () => {
    const off = fieldOffsetX();
    const toWorld = (fx: number, fy: number) => fieldToWorldPoint(fx, fy, off);
    const c = bonusZoneCorners(1, toWorld);
    const z = bonusZone(1);
    expect(c).toHaveLength(4);
    expect(c[0]).toEqual(toWorld(100, (z.y0 / 68) * 100));
    expect(c[1]).toEqual(toWorld(100, (z.y1 / 68) * 100));
    expect(c[2]).toEqual(toWorld(110, (z.y1 / 68) * 100));
    const back = bonusZoneCorners(-1, toWorld);
    expect(back[0]).toEqual(toWorld(0, (z.y0 / 68) * 100));
    expect(back[3]).toEqual(toWorld(-10, (z.y0 / 68) * 100));
  });
});
