import { describe, it, expect } from 'vitest';
import { kitFromColors } from '../../src/art/match/kit';
import { PlayerFrameCache, FRAME_CACHE_SIZE } from '../../src/scenes/matchPlayers';
import type { PlayerPicture } from '../../src/match/view/playerPicture';

const kit = kitFromColors(['#f4d03f', '#1a1a2e'], 'player');
const kits = { home: kit, away: kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers') };
const pic = (frame: number, over: Partial<PlayerPicture> = {}): PlayerPicture =>
  ({ who: 'p/1', action: 'run', frame, facing: 'front', left: false, possession: false, ...over });

describe('PlayerFrameCache', () => {
  it('hands back the same frame for the same picture and counts hits and misses', () => {
    const cache = new PlayerFrameCache(kits);
    const a = cache.get('home', pic(2));
    expect(cache.get('home', pic(2))).toBe(a);
    expect(cache.get('away', pic(2))).not.toBe(a);
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 2, evictions: 0, peak: 2 });
  });

  it('is bounded and drops the frame used least recently', () => {
    const cache = new PlayerFrameCache(kits, undefined, 3);
    const first = cache.get('home', pic(0));
    cache.get('home', pic(1));
    cache.get('home', pic(2));
    cache.get('home', pic(0)); // 0 is now the newest; 1 is the oldest
    cache.get('home', pic(3)); // evicts 1
    expect(cache.size).toBe(3);
    expect(cache.stats().evictions).toBe(1);
    expect(cache.get('home', pic(0))).toBe(first);
    const misses = cache.stats().misses;
    cache.get('home', pic(1));
    expect(cache.stats().misses).toBe(misses + 1);
    expect(cache.size).toBe(3);
  });

  it('draws the same pixels whatever the cache has seen', () => {
    const warm = new PlayerFrameCache(kits, undefined, 2);
    for (let f = 0; f < 6; f++) warm.get('home', pic(f));
    const cold = new PlayerFrameCache(kits);
    expect(Array.from(warm.get('home', pic(4)).data)).toEqual(Array.from(cold.get('home', pic(4)).data));
  });

  it('keeps a default capacity that holds the busiest passage', () => {
    expect(new PlayerFrameCache(kits).capacity).toBe(FRAME_CACHE_SIZE);
    expect(FRAME_CACHE_SIZE).toBeGreaterThan(465);
  });
});
