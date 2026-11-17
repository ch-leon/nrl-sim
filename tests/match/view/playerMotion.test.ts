import { describe, expect, it } from 'vitest';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';
import { playerMotion, movementStride } from '../../../src/match/view/playerMotion';
import { playerPicture, pictureContext, strideFor } from '../../../src/match/view/playerPicture';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { screenHeading } from '../../../src/match/view/screenFacing';

const prev: PlayerSnap = { side: 'home', slot: 0, who: 'runner', x: 20, y: 20, pose: 'run', headX: 1, headY: 0, speed: 2, odometer: 10 };
const cur = (over: Partial<PlayerSnap> = {}): PlayerSnap => ({ ...prev, x: 20.1, odometer: 10.1, ...over });
const ball = (side: 'home' | 'away' | null, x = 10, y = 20) => ({ ball: { side, x, y, previousX: x, previousY: y } });

describe('movement presentation (#698)', () => {
  it('drives out of a start, plants a steering change and brakes into a stop', () => {
    expect(playerMotion(cur({ speed: 2.4 }), prev).movement).toBe('drive');
    expect(playerMotion(cur({ speed: 1.6 }), prev).movement).toBe('brake');
    expect(playerMotion(cur({ speed: .4 }), { ...prev, speed: 1 }).movement).toBe('brake');
    expect(playerMotion(cur({ headX: 0, headY: 1 }), prev).movement).toMatch(/^cut/);
    expect(playerMotion(cur(), prev)).toEqual({});
    expect(playerMotion(cur({ speed: 7.5 }), { ...prev, speed: 7.3 })).toEqual({});
    // A mirror changes screen coordinates and sprite flip together, preserving the outside-foot pose.
    expect(playerMotion(cur({ headX: 0, headY: 1 }), prev, -1).movement)
      .toBe(playerMotion(cur({ headX: 0, headY: 1 }), prev, 1).movement);
  });
  it('shows a defender backpedalling at the actual opposing ball while attacking support runs normally', () => {
    const retreat = playerMotion(cur(), prev, 1, ball('away'));
    expect(retreat).toMatchObject({ movement: 'backpedal', left: true });
    const mirror = playerMotion(cur(), prev, -1, ball('away'));
    expect(mirror).toMatchObject({ movement: 'backpedal', left: false });
    expect(playerMotion(cur(), prev, 1, ball('home'))).toEqual({});
    expect(playerMotion(cur(), prev, 1, ball(null))).toEqual({});
    expect(playerMotion(cur(), prev, 1, { ...ball(null), ruck: { side: 'home' } }).movement).toBe('backpedal');
    expect(playerMotion(cur({ speed: 5 }), { ...prev, speed: 5 }, 1, ball('away'))).toEqual({});
    expect(playerMotion(cur(), prev, 1, ball('away', -50))).toEqual({});
    expect(playerMotion(cur(), prev, 1, ball('away', 19))).toEqual({});
  });
  it('uses lateral footwork only when slow defending travel crosses the direction to the ball', () => {
    const travel = screenHeading(1, 0);
    let target = { x: 20, y: 30 }, smallest = Infinity;
    for (let d = 0; d < 360; d++) {
      const x = Math.cos(d * Math.PI / 180), y = Math.sin(d * Math.PI / 180);
      const projected = screenHeading(x, y);
      const dot = Math.abs(travel.x * projected.x + travel.y * projected.y);
      if (dot < smallest) { target = { x: 20 + x * 10, y: 20 + y * 10 }; smallest = dot; }
    }
    const at = playerMotion(cur(), prev, 1, ball('away', target.x, target.y));
    expect(at.movement).toMatch(/^shuffle/);
    expect(at.facing).toBeDefined();
    expect(playerMotion(cur(), prev, 1, ball('home', target.x, target.y)).movement).toBeUndefined();
  });
  it('ignores substitutions, placements, rewind, prior contact and dead-ball resets', () => {
    for (const over of [{ who: 'replacement' }, { x: 25 }, { odometer: 0 }, { speed: 7 }, { binned: true }]) {
      expect(playerMotion(cur({ speed: 2.4, ...over }), prev)).toEqual({});
    }
    expect(playerMotion(cur({ speed: 2.4 }), { ...prev, pose: 'dummyHalf' })).toEqual({});
    expect(playerMotion(cur({ speed: 2.4 }), prev, 1, { motionLive: false })).toEqual({});
  });
  it('keeps the stride distance linked, with only two support or four transfer beats', () => {
    expect(new Set(Array.from({ length: 12 }, (_, f) => movementStride(f, 'cutForward')))).toEqual(new Set([0, 3]));
    expect(new Set(Array.from({ length: 12 }, (_, f) => movementStride(f, 'backpedal')))).toEqual(new Set([0, 1, 3, 4]));
    expect(movementStride(-1, 'brake')).toBe(-1);
    expect([0, .5, 1, 1.5, 2].map(m => movementStride(0, 'drive', m))).toEqual([0, 1, 3, 4, 0]);
    for (const metres of [10, 10.5, 11, 12, 13.5]) {
      const p = cur({ speed: 2.4, odometer: metres });
      const shown = playerPicture(p, prev, 120, null, 1);
      expect(shown.movement).toBe('drive');
      expect(shown.strideFrame).toBe(movementStride(strideFor(p, prev, 120), 'drive', p.odometer, p.slot));
      expect(playerPicture(p, prev, 800, null, 1).strideFrame).toBe(shown.strideFrame);
    }
  });
  it('keeps explicit attacking context through a real pass after its pose ends, and handles loose/legacy snapshots', () => {
    const sim = new LiveSim(sideSheet('H', { rating: 62 }), sideSheet('A', { rating: 58 }), 1);
    let before = sim.snapshot(), launched: { tick: number; side: 'home' | 'away' } | undefined, tail = 0;
    for (let t = 0; t < 1000; t++) {
      sim.step(); const s = sim.snapshot();
      const passer = s.players.find(p => p.pose === 'pass' && p.caughtTick === s.tick);
      if (passer) launched = { tick: s.tick, side: passer.side };
      if (s.ball.holder) launched = undefined;
      if (launched && s.tick - launched.tick > 5 && !s.ball.holder && !before.ball.holder) {
        expect(s.attacking).toBe(launched.side);
        expect(pictureContext(s, before).ball?.side).toBe(launched.side);
        tail++;
      }
      before = s;
    }
    expect(tail).toBeGreaterThan(0);
    const loose: Snapshot = { tick: 50, attacking: 'away', players: [prev], ball: { x: 10, y: 20, lift: 0, holder: null }, events: [], label: '' };
    expect(pictureContext(loose).ball?.side).toBe('away');
    const { attacking: _, ...legacy } = loose;
    expect(pictureContext(legacy).ball?.side).toBeNull();
    expect(pictureContext(legacy, { ...legacy, ball: { ...legacy.ball, holder: { side: 'home', slot: 2 } } }).ball?.side).toBe('home');
    expect(pictureContext({ ...legacy, players: [{ ...prev, side: 'away', pose: 'ptb' }] }).ball?.side).toBe('away');
  });
  it('reads the ball from the snapshot and repeats exact pictures after pause and seek', () => {
    const p = cur();
    const before: Snapshot = { tick: 119, players: [prev], ball: { x: 10, y: 20, lift: 0, holder: { side: 'away', slot: 2 } }, events: [], label: '', phase: { kind: 'play', since: 0 } };
    const s = { ...before, tick: 120, players: [p] };
    const snapshot = JSON.stringify([s, before]);
    const ctx = pictureContext(s, before);
    const picture = playerPicture(p, prev, s.tick, s.ball.holder, 1, ctx);
    expect(picture).toMatchObject({ movement: 'backpedal', left: true });
    playerPicture(cur({ x: 50 }), prev, 300, null, -1);
    expect(playerPicture(p, prev, s.tick, s.ball.holder, 1, pictureContext(s, before))).toEqual(picture);
    expect(JSON.stringify([s, before])).toBe(snapshot);
    for (const pose of ['tackle', 'tackled', 'down', 'kick', 'ptb', 'dummyHalf', 'celebrate']) {
      expect(playerPicture({ ...p, pose }, prev, 120, null, 1, ctx).movement).toBeUndefined();
    }
    // A support runner never inherits the opponent's defensive facing.
    expect(playerPicture(p, prev, 120, { side: 'home', slot: 2 }, 1, { ...ctx, ball: { ...ctx.ball!, side: 'home' } }).movement).toBeUndefined();
  });
});
