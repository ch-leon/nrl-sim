import { describe, expect, it } from 'vitest';
import { appearanceFor, HEAD_OPTIONS, MOVEMENT_POSES, type Movement } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { opaqueBounds } from '../../../src/art/match/players';
import { headSpot } from '../../../src/art/match/lookUp';

const kit = buildKit(0xe6b632, 0x21394a, 'sleeves');
const movements = Object.keys(MOVEMENT_POSES) as Movement[];
const base = appearanceFor('p-art-4');

describe('movement pose artwork (#698)', () => {
  it('keeps every planted and transfer pose grounded inside the frame across builds, heads and fatigue', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) {
      for (const facing of ['front', 'back', 'side'] as const) for (const movement of movements) for (const gait of [0, 1, 3, 4]) {
        for (const tired of [0, 2]) {
          const look = { ...base, build, head, stature: head === 'curls' ? 2 : -2 };
          const pixels = drawLivePlayer(look, kit, 'run', gait, facing, false, gait, tired, 0, movement);
          const bounds = opaqueBounds(pixels)!;
          expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
          expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBe(38);
        }
      }
    }
  });
  it('distinguishes starting, braking, left/right cuts and defensive footwork silhouettes', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) {
      const images = movements.map(movement => drawLivePlayer({ ...base, build }, kit, 'run', 0, 'side', false, 0, 0, 0, movement));
      expect(new Set(images.map(p => Array.from(p.data).join())).size).toBe(movements.length);
      // A planted cut begins with the head facing into it and the shoulders still turning.
      const a = drawLivePlayer({ ...base, build }, kit, 'run', 0, 'front', false, 0, 0, 0, 'cutForward');
      const b = drawLivePlayer({ ...base, build }, kit, 'run', 3, 'front', false, 3, 0, 0, 'cutForward');
      expect(a.data).not.toEqual(b.data);
    }
  });
  it('carries a continuous movement pose through the last catch, pass and aerial landing beats', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const movement of movements) for (const gait of [0, 3]) for (const facing of ['front', 'back', 'side'] as const) {
      const look = { ...base, build };
      const carry = drawLivePlayer(look, kit, 'carry', 0, facing, true, gait, 0, 0, movement);
      for (const action of ['catch', 'airCatch'] as const) expect(drawLivePlayer(look, kit, action, 5, facing, true, gait, 0, 0, movement).data).toEqual(carry.data);
      expect(drawLivePlayer(look, kit, 'pass', 5, facing, false, gait, 0, 0, movement).data)
        .toEqual(drawLivePlayer(look, kit, 'run', 0, facing, false, gait, 0, 0, movement).data);
    }
  });
  it('tips the head at the movement anchor and preserves every pixel below the chin', () => {
    for (const movement of movements) for (const gait of [0, 1, 3, 4]) for (const facing of ['front', 'back', 'side'] as const) for (const tired of [0, 2]) {
      const at = headSpot('run', gait, gait, tired, base.stature, movement);
      const straight = drawLivePlayer(base, kit, 'run', gait, facing, false, gait, tired, 0, movement);
      const up = drawLivePlayer(base, kit, 'run', gait, facing, false, gait, tired, 2, movement);
      expect(up.data).not.toEqual(straight.data);
      expect(up.data.subarray((at.y + 17) * up.w * 4)).toEqual(straight.data.subarray((at.y + 17) * up.w * 4));
      const bounds = opaqueBounds(up)!;
      expect(bounds.x0).toBeGreaterThan(0); expect(bounds.x1).toBeLessThan(up.w - 1);
    }
  });
  it('does not apply movement to shared ruck, contact and moment artwork', () => {
    for (const movement of movements) for (const action of ['ready', 'dummyHalf', 'ptb', 'kick', 'down', 'tackle', 'tackled', 'dive', 'celebrate'] as const) {
      expect(drawLivePlayer(base, kit, action, 2, 'front', false, 0, 0, 0, movement).data)
        .toEqual(drawLivePlayer(base, kit, action, 2, 'front', false, 0).data);
    }
  });
});
