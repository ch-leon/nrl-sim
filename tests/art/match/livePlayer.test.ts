import { describe, expect, it } from 'vitest';
import { ANIM_ORDER, opaqueBounds } from '../../../src/art/match/players';
import { drawLivePlayer } from '../../../src/art/match/livePlayer';
import { HEAD_OPTIONS, appearanceFor, castLooks } from '../../../src/art/prototype/player';
import { drawHead } from '../../../src/art/prototype/head';
import { buildKit } from '../../../src/art/match/kit';
import { FRAME_CACHE_SIZE, PlayerFrameCache } from '../../../src/scenes/matchPlayers';
const kit = buildKit(0xccbb22, 0x213344, 'v');
describe('live match artwork', () => {
  it('supports every live-sim pose with the approved heads and bounded frames', () => {
    for (const action of [...ANIM_ORDER, 'carry', 'ready'] as const) for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) for (let frame = 0; frame < 6; frame++) {
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
  it('runs and stands lower and hunched when tired, and is untouched when fresh (#666)', () => {
    const look = appearanceFor('same-player');
    const top = (p: ReturnType<typeof drawLivePlayer>) => opaqueBounds(p)!.y0;
    for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) {
      const a = { ...look, build };
      for (const gait of [-1, 0, 1, 2, 3, 4, 5, 8]) {
        const action = gait < 0 ? 'idle' as const : 'run' as const;
        const fresh = drawLivePlayer(a, kit, action, Math.max(0, gait) % 6, facing, false, gait < 0 ? undefined : gait);
        expect(drawLivePlayer(a, kit, action, Math.max(0, gait) % 6, facing, false, gait < 0 ? undefined : gait, 0).data).toEqual(fresh.data);
        const tired = [1, 2].map(t => drawLivePlayer(a, kit, action, Math.max(0, gait) % 6, facing, false, gait < 0 ? undefined : gait, t));
        expect(top(tired[0]!)).toBeGreaterThan(top(fresh) - (gait === 2 || gait === 5 ? 1 : 0));
        expect(top(tired[1]!)).toBeGreaterThan(top(tired[0]!));
        for (const p of tired) {
          const b = opaqueBounds(p)!;
          expect(b.x0).toBeGreaterThan(0); expect(b.x1).toBeLessThan(p.w - 1); expect(b.y1).toBe(opaqueBounds(fresh)!.y1);
        }
      }
    }
  });
  it('paints the reactions over standing or running legs, inside the frame (#667)', () => {
    const look = appearanceFor('same-player');
    const legs = (p: ReturnType<typeof drawLivePlayer>) => Array.from(p.data.subarray(p.w * 4 * 36)).join();
    for (const action of ['handsOnHead', 'handsOnHips', 'armsFolded'] as const) for (const head of HEAD_OPTIONS) for (const facing of ['front', 'back'] as const) for (const build of ['lean', 'athletic', 'stocky'] as const) {
      const a = { ...look, head, build };
      for (const stride of [-1, 0, 2, 5, 8]) for (const frame of [0, 1]) {
        const pic = drawLivePlayer(a, kit, action, frame, facing, false, stride);
        const b = opaqueBounds(pic)!;
        expect(b.x0).toBeGreaterThan(0); expect(b.y0).toBeGreaterThan(0);
        expect(b.x1).toBeLessThan(pic.w - 1); expect(b.y1).toBeLessThan(pic.h - 1);
        // The legs are the run's (or the stand's): only the arms and head change.
        if (stride >= 0) expect(legs(pic)).toEqual(legs(drawLivePlayer(a, kit, 'run', 0, facing, false, stride)));
        expect(pic.data).not.toEqual(drawLivePlayer(a, kit, stride >= 0 ? 'run' : 'idle', frame, facing, false, stride >= 0 ? stride : undefined).data);
      }
    }
  });
  it('swings long hair a pixel against the stride and leaves the rest of the head alone (#670)', () => {
    const LONG = ['mullet', 'ponytail', 'braids', 'headband'];
    for (const head of HEAD_OPTIONS) for (const facing of ['front', 'back'] as const) {
      const a = { ...appearanceFor('same-player'), head };
      const still = drawHead(a, kit, facing).data;
      expect(drawHead(a, kit, facing, 0).data).toEqual(still);
      for (const s of [-1, 1]) {
        if (LONG.includes(head)) expect(drawHead(a, kit, facing, s).data).not.toEqual(still);
        else expect(drawHead(a, kit, facing, s).data).toEqual(still);
      }
    }
    // The tail's lowest pixel against the top of his head: it lags the bob on the run, and is fixed stood still.
    const pony = { ...appearanceFor('same-player'), head: 'ponytail' as const, beard: false };
    const tail = (p: ReturnType<typeof drawLivePlayer>) => {
      const rows: number[] = [];
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.get(x, y).alpha && p.get(x, y).color === pony.hair) rows.push(y);
      return Math.max(...rows) - opaqueBounds(p)!.y0;
    };
    const run = [0, 1, 2, 3, 4, 5].map(g => tail(drawLivePlayer(pony, kit, 'run', g, 'front', false, g)));
    expect(new Set(run).size).toBeGreaterThan(1);
    expect(tail(drawLivePlayer(pony, kit, 'idle', 0, 'front', false))).toBe(tail(drawLivePlayer(pony, kit, 'idle', 1, 'front', false)));
  });
  it('trails the jersey tail and shorts hem a pixel behind on the push-off and in flight (#670)', () => {
    const look = appearanceFor('same-player');
    const hemX = (p: ReturnType<typeof drawLivePlayer>) => {
      let min = Infinity;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.get(x, y).alpha && p.get(x, y).color === kit.shortsShade) min = Math.min(min, x);
      return min;
    };
    for (const build of ['lean', 'athletic', 'stocky'] as const) {
      const a = { ...look, build };
      const hem = [0, 1, 2, 3, 4, 5].map(g => hemX(drawLivePlayer(a, kit, 'run', g, 'front', false, g)));
      for (const g of [2, 3, 5]) expect(hem[g]).toBe(hem[0]! - 1);
      for (const g of [1, 4]) expect(hem[g]).toBe(hem[0]);
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
