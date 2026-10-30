import { describe, expect, it } from 'vitest';
import { classifyGesture, pitchIntent } from '../../../src/match/view/controlsLayer';
const start = { x: 200, y: 100 };
describe('pitch gestures', () => {
  it('classifies quick, mostly horizontal and vertical swipes', () => {
    for (const [x, y, kind] of [[150, 105, 'pass-left'], [250, 105, 'pass-right'], [205, 50, 'step-up'], [205, 150, 'step-down']] as const) {
      expect(classifyGesture([start, { x, y }], 200)).toBe(kind);
    }
  });
  it('ignores taps, slow swipes, diagonals and any second finger', () => {
    expect(classifyGesture([start, { x: 210, y: 100 }], 100)).toBeNull();
    expect(classifyGesture([start, { x: 260, y: 100 }], 400)).toBeNull();
    expect(classifyGesture([start, { x: 260, y: 160 }], 100)).toBeNull();
    expect(classifyGesture([start, { x: 260, y: 100, pointers: 2 }], 100)).toBeNull();
  });
  it('recognises a held backwards drag on the last, cancelling near its start', () => {
    const ctx = { lastTackle: true, attack: { x: 1, y: 0 } };
    expect(classifyGesture([start, { x: 100, y: 110 }], 500, ctx)).toBe('kick');
    expect(classifyGesture([start, { x: 100, y: 110 }, start], 500, ctx)).toBeNull();
    expect(classifyGesture([start, { x: 100, y: 110 }], 500)).toBeNull();
    expect(classifyGesture([start, { x: 300, y: 110 }], 500, { ...ctx, attack: { x: -1, y: 0 } })).toBe('kick');
  });
  it('converts through the projected lateral axis independently of attacking direction', () => {
    expect(pitchIntent('pass-left', { x: -1, y: 1 })).toBe('pass-right');
    expect(pitchIntent('step-up', { x: -1, y: 1 })).toBe('step-up');
    expect(pitchIntent('step-up', { x: 1, y: -1 })).toBe('step-down');
  });
});
