// Smart speed is screen-only: dead time eases toward twice the chosen speed,
// open play stays at it, and a single frame does not jump the whole way.
import { describe, it, expect } from 'vitest';
import { blendPace, playbackPace, playbackSpeedOf, PACE_BLEND_MS } from '../../../src/match/view/livePlayback';

describe('smart playback pace', () => {
  it('doubles rucks, restarts, conversions and try celebrations, and leaves open play and contact', () => {
    for (const phase of ['ruck', 'restart', 'set-piece', 'conversion', 'try', 'penalty', 'goal']) {
      expect(playbackPace(phase), phase).toBe(2);
    }
    expect(playbackPace('play')).toBe(1);
    expect(playbackPace('tackle')).toBe(1);
    expect(playbackPace('half-time')).toBe(1);
    expect(playbackPace('full-time')).toBe(1);
  });

  it('plays contact at the chosen speed, and caps the ruck at x2 real speed (#628)', () => {
    for (const speed of [1, 2, 4, 8]) expect(playbackPace('tackle', speed), `tackle x${speed}`).toBe(1);
    expect(playbackPace('ruck', 1)).toBe(2);
    expect(playbackPace('ruck', 2)).toBe(1);
    // x4 and x8 are no slower than before: still doubled.
    expect(playbackPace('ruck', 4)).toBe(2);
    expect(playbackPace('ruck', 8)).toBe(2);
    expect(playbackPace('restart', 2)).toBe(2);
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

  it('reads a saved speed, and anything else is ×2', () => {
    expect(playbackSpeedOf(1)).toBe(1);
    expect(playbackSpeedOf(2)).toBe(2);
    expect(playbackSpeedOf(8)).toBe(8);
    expect(playbackSpeedOf(undefined)).toBe(2);
    expect(playbackSpeedOf(3)).toBe(2);
    expect(playbackSpeedOf('8')).toBe(2);
    expect(playbackSpeedOf(4)).toBe(4);
  });
});
