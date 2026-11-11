import { describe, expect, it } from 'vitest';
import { ANIM_ORDER, opaqueBounds } from '../../../src/art/match/players';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { appearanceFor } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { PlayerFrameCache } from '../../../src/scenes/matchPlayers';
const kit = buildKit(0xccbb22, 0x213344, 'v');
describe('live match artwork', () => {
  it('supports every live-sim pose with the approved heads and bounded frames', () => {
    for (const action of [...ANIM_ORDER, 'carry'] as const) for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) for (let frame = 0; frame < 6; frame++) {
      const p = drawLivePlayer({ ...appearanceFor('same-player'), build }, kit, action, frame, facing, true);
      const bounds = opaqueBounds(p)!;
      expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
      expect(bounds.x1).toBeLessThan(p.w - 1); expect(bounds.y1).toBeLessThan(p.h - 1);
    }
  });
  it('bounds the frame cache across replacements and frees it between fixtures', () => {
    const cache = new PlayerFrameCache({ home: kit, away: kit });
    const picture = { who: 'captain', action: 'carry' as const, frame: 2, facing: 'front' as const, left: false, possession: true };
    const before = cache.get('home', picture);
    expect(cache.get('home', picture)).toBe(before);
    for (let i = 0; i < 600; i++) cache.get('home', { ...picture, who: `replacement-${i}` });
    expect(cache.size).toBe(512);
    expect(cache.get('home', picture).data).toEqual(before.data);
    cache.clear(); expect(cache.size).toBe(0);
  });
  it('ends the catch and pass on the continuing carry and running pixels', () => {
    const look = appearanceFor('same-player');
    for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) for (const gait of [-1, 0, 1, 2, 3, 4, 5]) {
      const a = { ...look, build };
      expect(drawLivePlayer(a, kit, 'catch', 5, facing, true, gait).data)
        .toEqual(drawLivePlayer(a, kit, 'carry', 0, facing, true, gait).data);
      expect(drawLivePlayer(a, kit, 'pass', 5, facing, false, gait).data)
        .toEqual(drawLivePlayer(a, kit, 'run', 0, facing, false, gait).data);
      for (let f = 0; f < 6; f++) for (const action of ['catch', 'pass'] as const) {
        const pixels = drawLivePlayer(a, kit, action, f, facing, action === 'catch', gait);
        const bounds = opaqueBounds(pixels)!;
        expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
        expect(bounds.x1).toBeLessThan(pixels.w - 1); expect(bounds.y1).toBeLessThan(pixels.h - 1);
      }
    }
  });
  it('caches hand progress and gait separately', () => {
    const cache = new PlayerFrameCache({ home: kit, away: kit });
    const picture = { who: 'captain', action: 'catch' as const, frame: 1, strideFrame: 0, facing: 'front' as const, left: false, possession: true };
    const first = cache.get('home', picture);
    const step = cache.get('home', { ...picture, strideFrame: 2 });
    expect(step.data).not.toEqual(first.data);
    expect(cache.get('home', picture)).toBe(first);
  });
});
