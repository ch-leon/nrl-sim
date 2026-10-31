import { describe, expect, it } from 'vitest';
import { classifyGesture, isBackwardDrag, pitchIntent } from '../../../src/match/view/controlsLayer';
import { fieldToWorldPoint } from '../../../src/scenes/matchField';
import { toFieldPt } from '../../../src/match/core/field';
const start = { x: 200, y: 100 };
describe('pitch gestures', () => {
  it('classifies quick, mostly horizontal and vertical swipes', () => {
    for (const [x, y, kind] of [[150, 105, 'pass-left'], [250, 105, 'pass-right'], [205, 50, 'step-up'], [205, 150, 'step-down']] as const) {
      expect(classifyGesture([start, { x, y }], 200)).toBe(kind);
    }
  });
  it('ignores taps, swipes beyond 600ms and any second finger', () => {
    expect(classifyGesture([start, { x: 210, y: 100 }], 100)).toBeNull();
    expect(classifyGesture([start, { x: 260, y: 100 }], 601)).toBeNull();
    expect(classifyGesture([start, { x: 260, y: 100, pointers: 2 }], 100)).toBeNull();
  });
  it('recognises a held backwards drag on the last, cancelling near its start', () => {
    const ctx = { lastTackle: true, attack: { x: 1, y: 0 } };
    expect(classifyGesture([start, { x: 100, y: 110 }], 500, ctx)).toBe('kick');
    expect(classifyGesture([start, { x: 100, y: 110 }, start], 500, ctx)).toBeNull();
    expect(classifyGesture([start, { x: 100, y: 110 }], 601)).toBeNull();
    expect(classifyGesture([start, { x: 300, y: 110 }], 500, { ...ctx, attack: { x: -1, y: 0 } })).toBe('kick');
  });
  it('keeps a vertical step on the last from becoming a diagonal backwards kick', () => {
    expect(classifyGesture([start, { x: 200, y: 10 }], 220,
      { lastTackle: true, attack: { x: 2, y: 1 } })).toBe('step-up');
  });
  it('kicks on every backward last-tackle drag without a hold, never passing or stepping', () => {
    const ctx = { lastTackle: true, attack: { x: 1, y: 0 } };
    const end = { x: 100, y: 100 };
    expect(classifyGesture([start, end], 220, ctx)).toBe('kick');
    expect(classifyGesture([start, { x: 175, y: 100, atMs: 40 }, end], 220, ctx)).toBe('kick');
    expect(classifyGesture([start, { ...end, atMs: 200 }], 220, ctx)).toBe('kick');
    expect(classifyGesture([start, { ...end, atMs: 200 }], 220, { ...ctx, lastTackle: false })).toBeNull();
  });
  it('accepts short slow vertical swipes and resolves the diagonal band by dominant axis', () => {
    expect(classifyGesture([start, { x: 205, y: 77 }], 590)).toBe('step-up');
    expect(classifyGesture([start, { x: 205, y: 78 }], 600)).toBe('step-up');
    expect(classifyGesture([start, { x: 205, y: 79 }], 590)).toBeNull();
    expect(classifyGesture([start, { x: 240, y: 139 }], 550)).toBe('pass-right');
    expect(classifyGesture([start, { x: 239, y: 140 }], 550)).toBe('step-down');
    expect(classifyGesture([start, { x: 240, y: 140 }], 550)).toBe('pass-right');
  });
  it('reserves diagonal backward drags for kicks and explains the non-last restriction in the view', () => {
    const points = [start, { x: 160, y: 70 }];
    expect(classifyGesture(points, 50, { attack: { x: 1, y: 0 }, lastTackle: true })).toBe('kick');
    expect(classifyGesture(points, 50, { attack: { x: 1, y: 0 }, lastTackle: false })).toBeNull();
  });
  // Use the same metres → field → screen projection as ControlsLayer.axis().
  const origin = toFieldPt({ x: 0, y: 0 }), metre = toFieldPt({ x: 1, y: 0 });
  const o = fieldToWorldPoint(origin.fx, origin.fy, 500);
  const f = fieldToWorldPoint(metre.fx, metre.fy, 500);
  for (const direction of [1, -1] as const) for (const lastTackle of [false, true]) {
    const attack = { x: (f.x - o.x) * direction, y: (f.y - o.y) * direction };
    const context = { attack, lastTackle };
    it.each([-10, 10])(`keeps 550ms vertical diagonals as steps (attack ${direction}, last ${lastTackle}, dx %s)`, (dx) => {
      for (const dy of [-45, 45]) {
        const points = [start, { x: start.x + dx, y: start.y + dy }];
        expect(classifyGesture(points, 550, context)).toBe(dy < 0 ? 'step-up' : 'step-down');
        expect(isBackwardDrag(points, context)).toBe(false);
      }
    });
    it(`reserves a drag along the real backward axis for kick (attack ${direction}, last ${lastTackle})`, () => {
      const scale = 70 / Math.hypot(attack.x, attack.y);
      const points = [start, { x: start.x - attack.x * scale, y: start.y - attack.y * scale }];
      expect(isBackwardDrag(points, context)).toBe(true);
      expect(classifyGesture(points, 550, context)).toBe(lastTackle ? 'kick' : null);
    });
  }
  it('converts through the projected lateral axis independently of attacking direction', () => {
    expect(pitchIntent('pass-left', { x: -1, y: 1 })).toBe('pass-right');
    expect(pitchIntent('step-up', { x: -1, y: 1 })).toBe('step-up');
    expect(pitchIntent('step-up', { x: 1, y: -1 })).toBe('step-down');
  });
});
