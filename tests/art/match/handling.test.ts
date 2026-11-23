import { describe, expect, it } from 'vitest';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { appearanceFor, HEAD_OPTIONS, playerBallAnchor, CENTRE, FOOT, type Movement } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { opaqueBounds } from '../../../src/art/match/players';
import { PlayerFrameCache } from '../../../src/scenes/matchPlayers';

const kit = buildKit(0xe6b632, 0x21394a, 'sleeves'), base = appearanceFor('p-art-4');
describe('connected handling artwork (#702)', () => {
  it('keeps preparation/brace poses inside the existing frame with one continuing set of legs', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const head of HEAD_OPTIONS) for (const facing of ['front', 'back', 'side'] as const) {
      for (const gait of [-1, 0, 2, 5, 8]) for (const tired of [0, 2]) for (const action of ['receive', 'guard'] as const) for (const frame of [0, 1]) {
        const look = { ...base, build, head, stature: head === 'curls' ? 2 : -2 };
        const pixels = drawLivePlayer(look, kit, action, frame, facing, false, gait, tired);
        const bounds = opaqueBounds(pixels)!;
        expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
        expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBeLessThan(pixels.h - 1);
        if (action === 'receive') expect(pixels.data.subarray(36 * pixels.w * 4)).toEqual(drawLivePlayer(look, kit, 'run', 0, facing, false, gait, tired).data.subarray(36 * pixels.w * 4));
        // Preparation never paints a second ball.
        expect(Array.from(pixels.data).filter((_, i) => i % 4 === 3 && pixels.data[i - 1] === 255 && pixels.data[i - 2] === 255 && pixels.data[i - 3] === 255).length).toBe(0);
      }
    }
  });
  it('finishes pickup, catch, pass and aerial landing on their continuing carry/run through fatigue and movement', () => {
    const movements: (Movement | undefined)[] = [undefined, 'drive', 'brake', 'cutForward'];
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const facing of ['front', 'back', 'side'] as const) for (const tired of [0, 2]) {
      const look = { ...base, build };
      expect(drawLivePlayer(look, kit, 'dummyHalf', 5, facing, true).data).toEqual(drawLivePlayer(look, kit, 'carry', 0, facing === 'side' ? 'front' : facing, true, -1).data);
      for (const movement of movements) for (const gait of [-1, 0, 3, 8]) {
        for (const action of ['catch', 'airCatch'] as const) expect(drawLivePlayer(look, kit, action, 5, facing, true, gait, tired, 0, movement).data)
          .toEqual(drawLivePlayer(look, kit, 'carry', 0, facing, true, gait, tired, 0, movement).data);
        expect(drawLivePlayer(look, kit, 'pass', 5, facing, false, gait, tired, 0, movement).data)
          .toEqual(drawLivePlayer(look, kit, 'run', 0, facing, false, gait, tired, 0, movement).data);
      }
    }
  });
  it('shares its real rendered white ball panels with release/reception anchors across builds, fatigue and motion', () => {
    for (const build of ['lean', 'athletic', 'stocky'] as const) for (const stature of [-2, 2]) for (const tired of [0, 2]) for (const gait of [-1, 0, 2, 5, 8]) {
      const look = { ...base, build, stature };
      for (const movement of [undefined, 'drive', 'brake'] as const) for (const [action, frame] of [
        ['carry', 0], ['catch', 0], ['intercept', 0], ['intercept', 1], ['intercept', 2], ['intercept', 3], ['intercept', 4], ['intercept', 5],
      ] as const) {
        const anchor = playerBallAnchor(look, action, frame, gait, tired, movement);
        const pixels = drawLivePlayer(look, kit, action, frame, 'front', true, gait, tired, 0, movement);
        const x = Math.round(anchor.x + CENTRE - 4.5), y = Math.round(anchor.y + FOOT - 3.5);
        const white = [[2, 2], [6, 2], [2, 3], [6, 3]].filter(([dx, dy]) => pixels.get(x + dx!, y + dy!).color === 0xffffff);
        expect(white.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('draws the lane-side ball inward over successive poses', () => {
    const look = { ...base, build: 'stocky' as const };
    for (const start of [0, 3]) {
      const anchors = [0, 1, 2].map(beat => playerBallAnchor(look, 'intercept', start + beat, 3));
      anchors.push(playerBallAnchor(look, 'carry', 0, 3));
      expect(Math.sign(anchors[0]!.x)).toBe(start === 0 ? 1 : -1);
      for (let i = 1; i < anchors.length; i++) {
        const from = anchors[i - 1]!, to = anchors[i]!;
        expect(to.y).toBeGreaterThan(from.y);
        expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeLessThanOrEqual(10);
      }
    }
  });
  it('caches its two preparation beats separately and reproduces them after eviction', () => {
    const cache = new PlayerFrameCache({ home: kit, away: kit }, undefined, 2);
    const pic = { who: 'receiver', action: 'receive' as const, frame: 0, strideFrame: 2, facing: 'side' as const, left: false, possession: false };
    const a = cache.get('home', pic), b = cache.get('home', { ...pic, frame: 1 });
    expect(b.data).not.toEqual(a.data);
    cache.get('away', { ...pic, action: 'guard' });
    expect(cache.size).toBe(2);
    expect(cache.get('home', pic).data).toEqual(a.data);
  });
});
