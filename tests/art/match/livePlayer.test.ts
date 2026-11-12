import { describe, expect, it } from 'vitest';
import { ANIM_ORDER, opaqueBounds } from '../../../src/art/match/players';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { appearanceFor, castLooks } from '../../../src/art/prototype/player';
import { buildKit } from '../../../src/art/match/kit';
import { FRAME_CACHE_SIZE, PlayerFrameCache } from '../../../src/scenes/matchPlayers';
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
    for (let i = 0; i < FRAME_CACHE_SIZE + 100; i++) cache.get('home', { ...picture, who: `replacement-${i}` });
    expect(cache.size).toBe(FRAME_CACHE_SIZE);
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
  it('draws six distinct running and jogging frames, in flight on two of them, and a breathing idle', () => {
    const look = appearanceFor('same-player');
    const soles = (p: ReturnType<typeof drawLivePlayer>) => opaqueBounds(p)!.y1;
    for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) for (const action of ['run', 'carry'] as const) {
      const a = { ...look, build };
      const ground = soles(drawLivePlayer(a, kit, 'idle', 0, facing, false));
      const run = [0, 1, 2, 3, 4, 5].map(g => drawLivePlayer(a, kit, action, g, facing, action === 'carry', g));
      expect(new Set(run.map(p => Array.from(p.data).join())).size).toBe(6);
      // Flight: both boots off the turf on beats 2 and 5, planted on the others.
      expect(run.map(soles)).toEqual(run.map((_, g) => g === 2 || g === 5 ? expect.any(Number) : ground));
      for (const g of [2, 5]) expect(soles(run[g]!)).toBeLessThan(ground);
      const jog = [6, 7, 8, 9, 10, 11].map(g => drawLivePlayer(a, kit, action, g - 6, facing, action === 'carry', g));
      expect(new Set(jog.map(p => Array.from(p.data).join())).size).toBe(6);
      for (const p of [...run, ...jog]) {
        const bounds = opaqueBounds(p)!;
        expect(bounds.x0).toBeGreaterThan(0); expect(bounds.y0).toBeGreaterThan(0);
        expect(bounds.x1).toBeLessThan(p.w - 1); expect(bounds.y1).toBeLessThan(p.h - 1);
      }
      const idle = [0, 1].map(f => drawLivePlayer(a, kit, 'idle', f, facing, false));
      expect(idle[0]!.data).not.toEqual(idle[1]!.data);
      expect(soles(idle[1]!)).toBe(ground);
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
  it('fends on the run: the legs keep striding under the straight arm (#644)', () => {
    const look = appearanceFor('same-player');
    const legs = (p: ReturnType<typeof drawLivePlayer>) => Array.from(p.data.subarray(p.w * 4 * 30)).join();
    for (const facing of ['front', 'back'] as const) for (const f of [2, 4]) {
      const strides = [0, 1, 2, 3, 4, 5].map(g => drawLivePlayer(look, kit, 'fend', f, facing, true, g));
      expect(new Set(strides.map(legs)).size).toBe(6);
      // The legs are the run cycle's; the arm is not the carry's tuck.
      for (let g = 0; g < 6; g++) {
        expect(legs(strides[g]!)).not.toBe(legs(drawLivePlayer(look, kit, 'fend', f, facing, true, (g + 3) % 6)));
        expect(strides[g]!.data).not.toEqual(drawLivePlayer(look, kit, 'carry', g, facing, true, g).data);
      }
    }
  });
  it('gives the tackle and the beaten man a start, a middle and an end (#644)', () => {
    const look = appearanceFor('same-player');
    for (const action of ['tackle', 'tackled'] as const) for (const facing of ['front', 'back'] as const) {
      const beats = [0, 2, 4].map(f => Array.from(drawLivePlayer(look, kit, action, f, facing, false).data).join());
      expect(new Set(beats).size).toBe(3);
      expect(drawLivePlayer(look, kit, action, 0, facing, false).data).toEqual(drawLivePlayer(look, kit, action, 1, facing, false).data);
    }
  });
  it('shows a 3×5 back number from the team sheet and real sleeve cuffs (#644)', () => {
    const look = castLooks([{ roster: [{ id: 'p-9', name: 'Nine', position: 'hooker' }, { id: 'p-13', name: 'Lock', position: 'lock' }] }]);
    const sleeves = buildKit(0x1d2b5c, 0xe6b632, 'sleeves');
    const count = (p: ReturnType<typeof drawLivePlayer>, colour: number) => {
      let n = 0;
      for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3] && (p.data[i]! << 16 | p.data[i + 1]! << 8 | p.data[i + 2]!) === colour) n++;
      return n;
    };
    const plainKit = { ...kit, pattern: 'plain' as const };
    const { number: _, ...unnumbered } = look('p-13');
    const back = drawLivePlayer(look('p-13'), plainKit, 'idle', 0, 'back', false);
    const bare = drawLivePlayer(unnumbered, plainKit, 'idle', 0, 'back', false);
    // Second on the sheet wears 2: all eleven lit pixels of the glyph, in trim on a plain panel.
    expect(look('p-13').number).toBe(2);
    expect(count(back, kit.trim) - count(bare, kit.trim)).toBe(11);
    expect(drawLivePlayer(look('p-9'), plainKit, 'idle', 0, 'back', false).data).not.toEqual(back.data);
    expect(drawLivePlayer(look('p-13'), kit, 'idle', 0, 'front', false).data).toEqual(drawLivePlayer(unnumbered, kit, 'idle', 0, 'front', false).data);
    for (const action of ['idle', 'run', 'carry', 'fend'] as const) {
      const plain = drawLivePlayer(look('p-9'), { ...sleeves, pattern: 'plain' }, action, 1, 'front', true, 1);
      expect(count(drawLivePlayer(look('p-9'), sleeves, action, 1, 'front', true, 1), sleeves.trim) - count(plain, sleeves.trim)).toBeGreaterThanOrEqual(6);
    }
  });
});
