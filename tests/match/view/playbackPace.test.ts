// Smart speed is screen-only: dead time eases toward twice the chosen speed,
// open play stays at it, and a single frame does not jump the whole way.
import { describe, it, expect } from 'vitest';
import { blendPace, playbackPace, playbackSpeedOf, PACE_BLEND_MS } from '../../../src/match/view/livePlayback';

describe('smart playback pace', () => {
  it('doubles rucks, tackles, restarts, conversions and try celebrations, and leaves open play', () => {
    for (const phase of ['ruck', 'tackle', 'restart', 'set-piece', 'conversion', 'try', 'penalty', 'goal']) {
      expect(playbackPace(phase), phase).toBe(2);
    }
    expect(playbackPace('play')).toBe(1);
    expect(playbackPace('half-time')).toBe(1);
    expect(playbackPace('full-time')).toBe(1);
  });

  it('eases between paces instead of snapping', () => {
    const oneFrame = blendPace(1, 2, 16);
    expect(oneFrame).toBeGreaterThan(1);
    expect(oneFrame).toBeLessThan(1.15);
    const settled = blendPace(1, 2, PACE_BLEND_MS * 4);
    expect(settled).toBeGreaterThan(1.95);
    expect(settled).toBeLessThanOrEqual(2);
    expect(blendPace(2, 1, 0)).toBe(2);
  });

  it('reads a saved speed, and anything else is ×4', () => {
    expect(playbackSpeedOf(1)).toBe(1);
    expect(playbackSpeedOf(2)).toBe(2);
    expect(playbackSpeedOf(8)).toBe(8);
    expect(playbackSpeedOf(undefined)).toBe(4);
    expect(playbackSpeedOf(3)).toBe(4);
    expect(playbackSpeedOf('8')).toBe(4);
  });
});
