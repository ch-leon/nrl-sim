import { describe, it, expect } from 'vitest';
import {
  FIELD_LONG,
  FIELD_WIDE,
  IN_GOAL_DEPTH,
  PLAYERS_PER_TEAM,
  colorToInt,
  fieldToGrid,
  fieldToWorldPoint,
  fieldOffsetX,
  fieldWorldBounds,
  formationPositions,
  panTowards,
  tileVariantFor,
} from '../../src/scenes/matchField';
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
  it('maps normalized coords to fractional grid cells', () => {
    expect(fieldToGrid(0, 0)).toEqual({ gx: 0, gy: 0 });
    expect(fieldToGrid(100, 100)).toEqual({ gx: FIELD_LONG - 1, gy: FIELD_WIDE - 1 });
    expect(fieldToGrid(50, 50)).toEqual({
      gx: (FIELD_LONG - 1) / 2,
      gy: (FIELD_WIDE - 1) / 2,
    });
  });

  it('produces fractional cells for off-grid values', () => {
    const { gx } = fieldToGrid(33, 0);
    expect(gx).toBeCloseTo((33 / 100) * (FIELD_LONG - 1));
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
    // fy=100 -> gy = FIELD_WIDE-1 (most negative raw screenX at fx=0).
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

describe('matchField.tileVariantFor', () => {
  it('marks the in-goal columns at both ends as ingoal', () => {
    expect(tileVariantFor(0)).toBe('ingoal');
    expect(tileVariantFor(IN_GOAL_DEPTH - 1)).toBe('ingoal');
    expect(tileVariantFor(FIELD_LONG - 1)).toBe('ingoal');
    expect(tileVariantFor(FIELD_LONG - IN_GOAL_DEPTH)).toBe('ingoal');
  });

  it('alternates light/dark bands across the field of play', () => {
    // First playable band is light, next band is dark.
    expect(tileVariantFor(IN_GOAL_DEPTH)).toBe('light');
    expect(tileVariantFor(IN_GOAL_DEPTH + 3)).toBe('dark');
    expect(tileVariantFor(IN_GOAL_DEPTH + 6)).toBe('light');
  });
});

describe('matchField.formationPositions', () => {
  it('returns one dot per player, all within field bounds', () => {
    for (const attackingRight of [true, false]) {
      const spots = formationPositions(attackingRight);
      expect(spots).toHaveLength(PLAYERS_PER_TEAM);
      for (const s of spots) {
        expect(s.fx).toBeGreaterThanOrEqual(0);
        expect(s.fx).toBeLessThanOrEqual(100);
        expect(s.fy).toBeGreaterThanOrEqual(0);
        expect(s.fy).toBeLessThanOrEqual(100);
      }
    }
  });

  it('mirrors the two teams onto opposite halves (fx reflected around 50)', () => {
    const left = formationPositions(false);
    const right = formationPositions(true);
    for (let i = 0; i < left.length; i++) {
      expect(right[i]!.fx).toBeCloseTo(100 - left[i]!.fx);
      expect(right[i]!.fy).toBe(left[i]!.fy); // width unchanged
    }
    // Defending-left team sits in the low-fx half; attacking-right in the high half.
    const avgLeft = left.reduce((a, s) => a + s.fx, 0) / left.length;
    const avgRight = right.reduce((a, s) => a + s.fx, 0) / right.length;
    expect(avgLeft).toBeLessThan(50);
    expect(avgRight).toBeGreaterThan(50);
  });

  it('spreads dots across the full width (wingers wide, spine central)', () => {
    const spots = formationPositions(false);
    const fys = spots.map((s) => s.fy);
    expect(Math.min(...fys)).toBeLessThanOrEqual(10); // a winger hugs one touchline
    expect(Math.max(...fys)).toBeGreaterThanOrEqual(90); // the other winger the far
    expect(fys).toContain(50); // spine players on the middle
  });
});

describe('matchField.panTowards', () => {
  it('eases from current toward target by the factor', () => {
    expect(panTowards(0, 100, 0.02)).toBeCloseTo(2);
    expect(panTowards(0, 100, 0.5)).toBeCloseTo(50);
    expect(panTowards(100, 100, 0.02)).toBe(100); // no movement at the target
  });

  it('defaults to the spec 0.02 factor and converges monotonically', () => {
    let x = 0;
    const target = 500;
    const first = panTowards(x, target);
    x = first;
    const second = panTowards(x, target);
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(second).toBeLessThan(target);
  });
});
