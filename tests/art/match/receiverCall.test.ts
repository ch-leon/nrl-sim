import { expect, it } from 'vitest';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { appearanceFor, type Movement } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { opaqueBounds } from '../../../src/art/match/players';
import { PlayerFrameCache } from '../../../src/scenes/matchPlayers';
import { shade } from '../../../src/art/pixel';
const kit = buildKit(0xe6b632, 0x21394a, 'v'), base = appearanceFor('call');
it('raises a readable arm over unchanged boots, gait, fatigue and movement in each build/view (#672)', () => {
  const moves: (Movement | undefined)[] = [undefined, 'drive', 'brake', 'cutBack'];
  for (const build of ['lean', 'athletic', 'stocky'] as const) for (const facing of ['front', 'back', 'side'] as const) for (const tired of [0, 2]) for (const gait of [-1, 0, 3, 8]) for (const movement of moves) {
    const look = { ...base, build, boots: 0xc040e0 };
    for (const frame of [0, 1]) {
      const pixels = drawLivePlayer(look, kit, 'call', frame, facing, false, gait, tired, 0, movement);
      const run = drawLivePlayer(look, kit, 'run', 0, facing, false, gait, tired, 0, movement);
      const boots = (img: typeof pixels) => Array.from({ length: img.w * img.h }, (_, i) => i).filter(i => {
        const p = img.get(i % img.w, Math.floor(i / img.w));
        return p.alpha > 0 && (p.color === look.boots || p.color === shade(look.boots, .7));
      });
      expect(boots(pixels)).toEqual(boots(run));
      expect(pixels.data).not.toEqual(run.data);
      const bounds = opaqueBounds(pixels)!;
      expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
      expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBeLessThan(pixels.h - 1);
    }
  }
});
it('keeps the two raised-arm beats bounded in the existing cache and reproduces them after eviction', () => {
  const cache = new PlayerFrameCache({ home: kit, away: kit }, undefined, 2);
  const p = { who: 'caller', action: 'call' as const, frame: 0, strideFrame: 8, facing: 'side' as const, left: false, possession: false };
  const a = cache.get('home', p), b = cache.get('home', { ...p, frame: 1 });
  expect(a.data).not.toEqual(b.data);
  cache.get('away', { ...p, action: 'run' });
  expect(cache.size).toBe(2); expect(cache.get('home', p).data).toEqual(a.data);
});
