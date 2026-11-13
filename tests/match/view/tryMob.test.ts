// tests/match/view/tryMob.test.ts — after a try the scorer's nearest mates are drawn gathering
// round him and eased back before the conversion; the sim's positions are untouched (#668).
import { describe, expect, it } from 'vitest';
import { MOB_BACK, MOB_HOLD, MOB_IN, mobWeight, tryScene } from '../../../src/match/view/tryMob';
import { LiveView, type ActorView } from '../../../src/match/view/liveView';
import { playerPicture, pictureContext, type PlayerPicture } from '../../../src/match/view/playerPicture';
import { LIVE } from '../../../src/match/league/live/knobs';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { toFieldPt } from '../../../src/match/core/field';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';

const T0 = 1000;
const scorer: PlayerSnap = { side: 'home', slot: 7, who: 'scorer', x: 96, y: 30, pose: 'celebrate', headX: 1, speed: 0, tryTick: T0, celebrationTick: T0 };
/** Mates at 3, 5, 7, 9 and 20 m, and the side that conceded. */
const mates: PlayerSnap[] = [3, 5, 7, 9, 20].map((d, i) => ({ side: 'home', slot: i, who: `mate${i}`, x: 96 - d, y: 30, pose: 'celebrate', headX: 1, speed: 0, celebrationTick: T0 }));
const them: PlayerSnap[] = [0, 1].map(i => ({ side: 'away', slot: i, who: `them${i}`, x: 80 - i * 5, y: 25, pose: 'idle', headX: -1, speed: 0 }));
const at = (tick: number, players: PlayerSnap[] = [scorer, ...mates, ...them]): Snapshot => ({
  tick, players: players.map(p => ({ ...p })), ball: { x: scorer.x, y: scorer.y, lift: .3, holder: { side: 'home', slot: 7 } }, label: '', events: [],
});

describe('try mob (#668)', () => {
  it('gathers over about a second, holds, and is back before the conversion lines up', () => {
    expect(mobWeight(-1)).toBe(0);
    expect(mobWeight(0)).toBe(0);
    expect(mobWeight(MOB_IN)).toBe(1);
    expect(mobWeight(MOB_HOLD - 1)).toBe(1);
    expect(mobWeight(MOB_BACK)).toBe(0);
    expect(MOB_BACK).toBeLessThan(LIVE.tryTicks);
    // Smooth: no tick moves the weight by more than a tenth.
    for (let a = 0; a < LIVE.tryTicks; a++) expect(Math.abs(mobWeight(a + 1) - mobWeight(a))).toBeLessThan(.12);
  });
  it('draws the nearest four mates in, never the far man or the other side, and only so far', () => {
    const scene = tryScene(at(T0 + 25))!;
    expect(scene).toMatchObject({ side: 'home', age: 25 });
    expect(scene.offsets.map(o => o.slot).sort()).toEqual([0, 1, 2, 3]);
    for (const o of scene.offsets) {
      const m = mates[o.slot]!;
      expect(Math.hypot(o.dx, o.dy)).toBeLessThanOrEqual(6.001);
      // Nearer to the scorer, and not on top of him.
      expect(Math.hypot(m.x + o.dx - scorer.x, m.y + o.dy - scorer.y)).toBeLessThan(Math.hypot(m.x - scorer.x, m.y - scorer.y));
      expect(Math.hypot(m.x + o.dx - scorer.x, m.y + o.dy - scorer.y)).toBeGreaterThan(2);
    }
    expect(tryScene(at(T0 + MOB_BACK))!.offsets).toEqual([]);
    const { tryTick: _scored, ...noTry } = scorer;
    expect(tryScene(at(T0, [noTry, ...mates, ...them]))).toBeNull();
  });
  it('moves nobody far in a tick, and leaves the sim snapshot as it was', () => {
    const before = JSON.stringify(at(T0 + 10));
    let last = tryScene(at(T0))!;
    for (let t = T0 + 1; t < T0 + LIVE.tryTicks; t++) {
      const now = tryScene(at(t))!;
      for (const o of now.offsets) {
        const was = last.offsets.find(q => q.slot === o.slot) ?? { dx: 0, dy: 0 };
        expect(Math.hypot(o.dx - was.dx, o.dy - was.dy)).toBeLessThan(.55);
      }
      last = now;
    }
    expect(JSON.stringify(at(T0 + 10))).toBe(before);
  });
  it('draws the mob where the scene says, and everyone on the sim\'s spot once it is over', () => {
    const pictures = new Map<string, PlayerPicture>();
    const placed = new Map<string, { x: number; y: number }>();
    const actor = (key: string): ActorView => ({ place: (x, y) => placed.set(key, { x, y }), play: () => {}, paint: p => pictures.set(key, p) });
    const off = fieldOffsetX();
    const world = (p: { x: number; y: number }) => { const f = toFieldPt(p); const w = fieldToWorldPoint(f.fx, f.fy, off); return { x: Math.round(w.x), y: Math.round(w.y) }; };
    const view = new LiveView({
      players: { home: Array.from({ length: 9 }, (_, i) => actor(`home/${i}`)), away: Array.from({ length: 9 }, (_, i) => actor(`away/${i}`)) },
      ball: { place: () => {} }, fieldToWorld: (fx, fy) => fieldToWorldPoint(fx, fy, off),
    });
    view.draw(at(T0 + 25), at(T0 + 25), 1);
    const mid = tryScene(at(T0 + 25))!;
    const o = mid.offsets.find(q => q.slot === 0)!;
    expect(placed.get('home/0')).toEqual(world({ x: mates[0]!.x + o.dx, y: mates[0]!.y + o.dy }));
    expect(placed.get('home/4')).toEqual(world(mates[4]!));
    expect(placed.get('home/7')).toEqual(world(scorer));
    // Standing in the mob: cheering on his own (fist pump or arms up), never a partner pose.
    expect(['fistPump', 'celebrate']).toContain(pictures.get('home/0')!.action);
    // The side that conceded stands hands on hips.
    expect(pictures.get('away/0')!.action).toBe('handsOnHips');
    // Running in during the gather: the run cycle, facing where he goes on screen.
    view.draw(at(T0 + 8), at(T0 + 9), 1);
    expect(pictures.get('home/2')!.action).toBe('run');
    // Over: on the sim's spot, as the conversion will have him.
    view.draw(at(T0 + MOB_BACK), at(T0 + MOB_BACK + 1), 1);
    for (const m of mates) expect(placed.get(`home/${m.slot}`)).toEqual(world(m));
  });
  it('trudges the conceding side back head down when it is on the move', () => {
    const s = at(T0 + 20);
    const runner = { ...them[0]!, pose: 'run', speed: 7, odometer: 10 };
    const ctx = { ...pictureContext(s), tryScene: { side: 'home' as const, age: 20, mob: new Map() } };
    expect(playerPicture(runner, runner, T0 + 20, s.ball.holder, 1, ctx)).toMatchObject({ action: 'run', tired: 2 });
    expect(playerPicture(runner, runner, T0 + 2, s.ball.holder, 1, { ...ctx, tryScene: { ...ctx.tryScene, age: 2 } }).tired).toBeUndefined();
  });
});
