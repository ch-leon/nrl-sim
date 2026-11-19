import { describe, expect, it } from 'vitest';
import { CAPTAIN_POSES, BALL_PANEL_COLORS, brandKit, captainPoses } from '../../src/art/captainPoses';
import { COLOR_TOKENS } from '../../src/ui/tokens';

const alpha = (p: { data: Uint8ClampedArray; w: number }, x: number, y: number) => p.data[(y * p.w + x) * 4 + 3]!;

describe('captain icon poses', () => {
  const poses = captainPoses();
  const sizes = CAPTAIN_POSES.map(n => `${poses[n].w}x${poses[n].h}`);

  it('renders the same pixels every time', () => {
    const again = captainPoses();
    for (const n of CAPTAIN_POSES) expect(Array.from(again[n].data)).toEqual(Array.from(poses[n].data));
  });

  it('shares one canvas so the figure does not jump between poses', () => {
    expect(new Set(sizes).size).toBe(1);
    expect(poses.carry.w).toBeGreaterThan(8);
    expect(poses.carry.h).toBeGreaterThan(8);
  });

  it('is non-empty with transparent corners', () => {
    for (const n of CAPTAIN_POSES) {
      const p = poses[n];
      let opaque = 0;
      for (let i = 3; i < p.data.length; i += 4) if (p.data[i] !== 0) opaque++;
      expect(opaque, n).toBeGreaterThan(100);
      for (const [x, y] of [[0, 0], [p.w - 1, 0], [0, p.h - 1], [p.w - 1, p.h - 1]] as const) expect(alpha(p, x, y), `${n} ${x},${y}`).toBe(0);
    }
  });

  it('draws four different poses', () => {
    const keys = CAPTAIN_POSES.map(n => Array.from(poses[n].data).join(','));
    expect(new Set(keys).size).toBe(4);
  });

  it('keeps the ball in every pose', () => {
    for (const n of CAPTAIN_POSES) {
      let ball = 0;
      for (let y = 0; y < poses[n].h; y++) for (let x = 0; x < poses[n].w; x++) {
        const c = poses[n].get(x, y);
        if (c.alpha === 255 && BALL_PANEL_COLORS.includes(c.color)) ball++;
      }
      expect(ball, n).toBeGreaterThanOrEqual(8);
    }
  });

  it('wears the brand colours', () => {
    expect(brandKit().jersey).toBe(parseInt(COLOR_TOKENS.accent.slice(1), 16));
    expect(brandKit().trim).toBe(parseInt(COLOR_TOKENS.navy.slice(1), 16));
  });
});
