import { describe, expect, it } from 'vitest';
import { refereeKit, refereeLook } from '../../../src/art/match/bench';
import { drawTouchJudge, TOUCH_JUDGE_JOG_FRAMES, TOUCH_JUDGE_POSES } from '../../../src/art/match/touchJudge';
import { appearanceFor, CENTRE, drawPrototypePlayer, FOOT } from '../../../src/art/prototype/player';
import type { PixelBuffer } from '../../../src/art/pixel';

const kit = refereeKit();
const wave = ['waveIn', 'waveMidIn', 'waveAcross', 'waveMidOut', 'waveOut'] as const;

function cloth(frame: PixelBuffer) {
  const pixels = [];
  for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
    const { color, alpha } = frame.get(x, y);
    if (alpha && (color === 0xf5cd4c || color === 0xe45134)) pixels.push({ x, y, color });
  }
  expect(pixels.length).toBeGreaterThanOrEqual(16);
  expect(new Set(pixels.map(p => p.color)).size).toBe(2);
  for (const { x, y } of pixels) {
    expect(x).toBeGreaterThan(1);
    expect(x).toBeLessThan(frame.w - 2);
    expect(y).toBeGreaterThan(1);
    expect(y).toBeLessThan(FOOT);
  }
  return {
    x: pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length,
    y: pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length,
  };
}

describe.each(['front', 'back'] as const)('touch judge sprites seen from the %s', facing => {
  it('carries the flag low over six planted jog frames', () => {
    const look = { ...appearanceFor('touch-judge-0'), tape: false, boots: refereeLook().boots };
    const frames = Array.from({ length: TOUCH_JUDGE_JOG_FRAMES }, (_, jog) => {
      const player = drawPrototypePlayer(look, kit, 'run', jog, facing, false, jog + 6);
      const judge = drawTouchJudge(look, kit, facing, 'sideline', jog);
      const boots: number[] = [];
      for (let x = 0; x < player.w; x++) {
        const boot = player.get(x, FOOT);
        if (boot.alpha) {
          expect(judge.get(x, FOOT)).toEqual(boot);
          boots.push(x);
        }
      }
      expect(boots.length).toBeGreaterThan(0);
      expect(cloth(judge).y).toBeGreaterThan(FOOT - 10);
      return boots.join(',');
    });
    expect(new Set(frames).size).toBeGreaterThan(2);
  });

  it.each([0, 1])('keeps official %i planted through both signals', i => {
    const look = { ...appearanceFor(`touch-judge-${i}`), tape: false, boots: refereeLook().boots };
    const standing = drawPrototypePlayer(look, kit, 'idle', 0, facing);
    const frames = new Map(TOUCH_JUDGE_POSES.map(pose => [pose, drawTouchJudge(look, kit, facing, pose)]));
    const resting = frames.get('ready')!;
    const watching = frames.get('watch')!;
    const rowBytes = standing.w * 4;
    const atShoulders = (24 - look.stature) * rowBytes;
    expect(watching.data.slice(atShoulders)).toEqual(resting.data.slice(atShoulders));
    expect(watching.data.slice(0, atShoulders)).not.toEqual(resting.data.slice(0, atShoulders));

    for (const [pose, frame] of frames) {
      // The face stays on the standing registration outside the upward glance.
      if (pose !== 'watch') for (let y = 0; y < 17; y++) for (let x = CENTRE - 9; x <= CENTRE + 9; x++) {
        expect(frame.get(x, y)).toEqual(standing.get(x, y));
      }
      for (let y = FOOT - 1; y <= FOOT; y++) for (let x = 0; x < standing.w; x++) {
        const boot = standing.get(x, y);
        if (boot.alpha) expect(frame.get(x, y)).toEqual(boot);
      }
    }

    const flags = wave.map(pose => cloth(frames.get(pose)!));
    expect(flags[0]!.x).toBeLessThan(CENTRE - 8);
    expect(flags[4]!.x).toBeGreaterThan(CENTRE + 8);
    for (let i = 1; i < flags.length; i++) expect(flags[i]!.x).toBeGreaterThan(flags[i - 1]!.x + 3);
    const ys = flags.map(p => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(3);
    expect(Math.min(...ys)).toBeGreaterThan(FOOT - 11);
    expect(cloth(frames.get('up')!).y).toBeLessThan(11);
    expect(cloth(resting).y).toBeGreaterThan(FOOT - 8);
  });
});
