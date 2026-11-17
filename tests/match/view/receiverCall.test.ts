import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { callingPass } from '../../../src/match/view/handling';
import { pictureContext, playerPicture } from '../../../src/match/view/playerPicture';
import { screenPlayerFacing } from '../../../src/match/view/screenFacing';

const snapshot = (): Snapshot => ({
  tick: 102, phase: { kind: 'ruck', since: 90 }, label: '', events: [],
  players: [
    { side: 'home', slot: 6, who: 'passer', x: 50, y: 34, pose: 'dummyHalf', headX: 1, speed: 0 },
    { side: 'home', slot: 1, who: 'receiver', x: 47, y: 40, pose: 'run', headX: 1, speed: 4, odometer: 12 },
  ],
  ball: { x: 50, y: 34, lift: 1, holder: { side: 'home', slot: 6 } },
  passCall: { from: { side: 'home', slot: 6, who: 'passer' }, to: { side: 'home', slot: 1, who: 'receiver' }, startedTick: 102, releasesTick: 106 },
});
describe('pre-release intended-recipient picture (#672)', () => {
  it('uses exact current metadata, preserves ordinary feet/motion/facing/fatigue and reconstructs without prior draws', () => {
    for (const dir of [-1, 1]) for (const speed of [0, 4]) for (const legs of [1, .1]) {
      const s = snapshot(), p = s.players[1]!;
      Object.assign(p, { speed, legs, pose: speed ? 'run' : 'idle', headX: -.4, headY: .9 });
      const ctx = pictureContext(s, s), pic = playerPicture(p, p, s.tick, s.ball.holder, dir, ctx);
      const { call: _, ...ordinaryContext } = ctx;
      const ordinary = playerPicture(p, p, s.tick, s.ball.holder, dir, ordinaryContext);
      expect(pic).toMatchObject({ action: 'call', frame: 0, possession: false, strideFrame: speed ? ordinary.strideFrame : -1 });
      expect({ facing: pic.facing, left: pic.left, movement: pic.movement }).toEqual({ ...screenPlayerFacing(p, p, dir), movement: ordinary.movement });
      expect(pic.tired).toBe(legs === 1 ? undefined : 2);
      playerPicture(p, p, 105, s.ball.holder, -dir, ctx);
      expect(playerPicture(p, p, s.tick, s.ball.holder, dir, pictureContext(s, s))).toEqual(pic);
      s.tick++;
      expect(playerPicture(p, p, s.tick, s.ball.holder, dir, pictureContext(s)).frame).toBe(1);
    }
  });
  it('drops stale/legacy, wrong-identity, dead-phase and released metadata rather than guessing a caller', () => {
    const invalid = [
      (s: Snapshot) => { delete s.passCall; },
      (s: Snapshot) => { s.passCall!.from.who = 'old-passer'; },
      (s: Snapshot) => { s.passCall!.to.who = 'old-receiver'; },
      (s: Snapshot) => { s.passCall!.to.side = 'away'; },
      (s: Snapshot) => { s.passCall!.startedTick = 103; },
      (s: Snapshot) => { s.passCall!.releasesTick = 102; },
      (s: Snapshot) => { s.players[1]!.binned = true; },
      (s: Snapshot) => { s.ball.holder = null; },
      (s: Snapshot) => { s.phase!.kind = 'half-time'; },
    ];
    for (const change of invalid) {
      const s = snapshot(); change(s); const p = s.players[1]!;
      expect(callingPass(s)).toBeUndefined();
      expect(playerPicture(p, p, s.tick, s.ball.holder, 1, pictureContext(s)).action).not.toBe('call');
    }
  });
  it('supersedes cosmetic idle reactions, yields to real contact/kicks/receive, and ends at release', () => {
    const s = snapshot(), p = s.players[1]!;
    Object.assign(p, { pose: 'idle', speed: 0, blown: true, react: 'error', reactTick: 101 });
    const ctx = pictureContext(s);
    expect(playerPicture(p, p, 102, s.ball.holder, 1, ctx)).toMatchObject({ action: 'call', tired: 2 });
    expect(playerPicture(p, p, 102, s.ball.holder, 1, { ...ctx, incoming: { player: s.passCall!.to, frame: 1, tick: 102 } }).action).toBe('receive');
    for (const pose of ['tackled', 'kick', 'down']) expect(playerPicture({ ...p, pose }, p, 102, s.ball.holder, 1, ctx).action).not.toBe('call');
    expect(playerPicture(p, p, 102, s.ball.holder, 1, { ...ctx, contactPlayers: new Set(['home/1/receiver']) }).action).not.toBe('call');
    expect(playerPicture(p, p, 102, s.ball.holder, 1, { ...ctx, motionLive: false }).action).not.toBe('call');
    s.tick = 106;
    expect(callingPass(s)).toBeUndefined();
  });
});
