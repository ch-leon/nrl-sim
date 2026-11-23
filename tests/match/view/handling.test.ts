import { describe, expect, it, vi } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { passFlight, kickFlight } from '../../../src/match/core/ball';
import type { Snapshot, PlayerSnap, BallFlightSnap } from '../../../src/match/core/snapshot';
import { receivingPass, currentPass, passSpriteOffset } from '../../../src/match/view/handling';
import { pictureContext, playerPicture } from '../../../src/match/view/playerPicture';

const passer: PlayerSnap = { side: 'home', slot: 5, who: 'passer', x: 50, y: 34, pose: 'pass', headX: 1, headY: 0, speed: 6, odometer: 11 };
const receiver: PlayerSnap = { ...passer, slot: 1, who: 'receiver', x: 49, y: 15, pose: 'run', legs: .8 };
const flight: BallFlightSnap = { via: 'pass', from: { x: 50, y: 34 }, to: { x: 49, y: 15 }, startedTick: 100, arrivesTick: 116, fromLift: 1,
  receiver: { side: 'home', slot: 1, who: 'receiver' }, source: { player: { side: 'home', slot: 5, who: 'passer' }, headX: 1, headY: 0, speed: 6, odometer: 11, legs: .8, blown: false } };
const snap = (tick: number, over: Partial<Snapshot> = {}): Snapshot => ({ tick, players: [passer, receiver], ball: { x: 49.5, y: 24, lift: 1, holder: null, flight }, phase: { kind: 'play', since: 0 }, events: [], label: '', ...over });

class LaunchSim extends LiveSim {
  constructor() { super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1); }
  launch(intercept: boolean, scripted = false) {
    this.tick = 100; this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    for (const p of this.players) { p.body.pos = { x: 80, y: 60 }; p.traits = []; }
    const from = this.players[5]!, to = this.players[1]!, thief = this.players[10]!;
    from.body.pos = { x: 50, y: 34 }; from.body.vel = { x: 6, y: 0 }; from.energy = .2;
    to.body.pos = { x: 49, y: 5 }; thief.body.pos = { x: 49.5, y: 20 }; thief.stats.footyIQ = 60;
    this.rng.next = () => intercept ? 0 : .99;
    if (scripted) this.interceptThrow(from, to); else this.pass(from, to);
    return this.snapshot();
  }
  afterPose() { this.tick += 6; this.players[5]!.pose = 'run'; return this.snapshot(); }
  replaceSource() { this.players[5]!.key = 'replacement'; return this.snapshot(); }
  land(miss = false) {
    if (this.ball.kind !== 'flight' || this.ball.receiver === null) throw new Error('Expected a pass with a receiver');
    this.players[this.ball.receiver]!.body.pos = { ...this.ball.to, ...(miss ? { x: 80 } : {}) };
    this.tick = this.ball.t0 + this.ball.ticks;
    this.landings();
    return this.snapshot();
  }
  replaceThief() { this.players[10]!.key = 'replacement'; return this.snapshot(); }
  changeBall(kind: 'held' | 'loose' | 'kick' | 'new-pass') {
    this.tick++;
    this.ball = kind === 'held' ? { kind: 'held', by: 1 } : kind === 'loose' ? { kind: 'loose', pos: { x: 40, y: 20 }, vel: { x: 0, y: 0 } }
      : kind === 'kick' ? kickFlight({ x: 40, y: 20 }, { x: 60, y: 20 }, this.tick, 10)
        : passFlight({ x: 40, y: 20 }, { x: 39, y: 30 }, this.tick, 1);
    return this.snapshot();
  }
}

describe('handling presentation (#702)', () => {
  it('projects actual pass/interception targets and write-only source facts, including after pass pose expiration', () => {
    for (const [intercept, scripted, side] of [[false, false, 'home'], [true, false, 'away'], [true, true, 'away']] as const) {
      const sim = new LaunchSim(), s = sim.launch(intercept, scripted);
      expect(s.ball.flight?.receiver?.side).toBe(side);
      expect(s.ball.flight?.source?.player.side).toBe('home');
      expect(s.ball.flight?.source).toMatchObject({ speed: 6, legs: .2 });
      const next = sim.afterPose();
      expect(next.ball.flight?.source).toEqual(s.ball.flight?.source);
      expect(next.ball.flight?.receiver).toEqual(s.ball.flight?.receiver);
      expect(next.players.find(p => p.side === 'home' && p.slot === 5)!.pose).toBe('run');
      expect(sim.snapshot()).toEqual(next);
      // Snapshot edits cannot alias the engine's flight or the stored launch identity.
      s.ball.flight!.from.x = -999; s.ball.flight!.source!.player.who = 'fake'; s.ball.flight!.receiver!.who = 'fake';
      expect(sim.snapshot()).toEqual(next);
    }
  });
  it('never revives a source after a new flight/possession or source identity replacement', () => {
    for (const kind of ['held', 'loose', 'kick', 'new-pass'] as const) {
      const sim = new LaunchSim(); sim.launch(false); const s = sim.changeBall(kind);
      expect(s.ball.flight?.source).toBeUndefined();
      if (kind === 'held' || kind === 'loose') expect(s.ball.flight).toBeUndefined();
    }
    const sim = new LaunchSim(); sim.launch(false);
    expect(sim.replaceSource().ball.flight?.source).toBeUndefined();
  });
  it('prepares only the exact incoming recipient, only after launch, with two bounded poses and continuing feet', () => {
    expect(receivingPass(snap(107))).toBeUndefined();
    for (const [tick, frame] of [[108, 0], [113, 1], [115, 1]] as const) {
      const s = snap(tick), ctx = pictureContext(s);
      const a = playerPicture(receiver, receiver, tick, null, 1, ctx);
      expect(a).toMatchObject({ action: 'receive', frame, possession: false });
      expect(a.strideFrame).toBe(playerPicture(receiver, receiver, tick, null, 1).strideFrame);
      expect(playerPicture(passer, passer, tick, null, 1, ctx).action).toBe('pass');
      playerPicture(receiver, receiver, 900, null, -1);
      expect(playerPicture(receiver, receiver, tick, null, 1, pictureContext(structuredClone(s)))).toEqual(a);
    }
    const thief = { ...receiver, side: 'away' as const, who: 'thief' };
    const s = snap(114, { players: [passer, receiver, thief], ball: { ...snap(114).ball, flight: { ...flight, receiver: thief } } });
    expect(playerPicture(thief, thief, 114, null, 1, pictureContext(s)).action).toBe('run');
    expect(playerPicture(receiver, receiver, 114, null, 1, pictureContext(s)).action).not.toBe('receive');
    const anchor = vi.fn(() => ({ x: 5, y: -10 }));
    passSpriteOffset(s, 114, anchor, 10);
    expect(anchor).toHaveBeenCalledTimes(1);
    expect(anchor).toHaveBeenCalledWith(flight.source!.player, 'release', s.ball.flight);
  });
  it('publishes a take only at successful landings, tied to the actual holder and identity', () => {
    for (const scripted of [false, true]) {
      const sim = new LaunchSim();
      const launch = sim.launch(true, scripted);
      expect(launch.interception).toBeUndefined();
      const s = sim.land();
      expect(s.events).toContainEqual(expect.objectContaining({ kind: 'intercept', tick: s.tick, side: 'away', slot: 1 }));
      expect(s.interception).toEqual({ player: launch.ball.flight!.receiver, tick: s.tick, fromX: .5, fromY: 14 });
      s.interception!.player.who = 'fake';
      expect(sim.snapshot().interception!.player).toEqual(launch.ball.flight!.receiver);
      expect(sim.replaceThief().interception).toBeUndefined();
    }
    for (const [intercept, miss] of [[false, false], [true, true]]) {
      const sim = new LaunchSim();
      sim.launch(intercept);
      expect(sim.land(miss).interception).toBeUndefined();
    }
  });
  it('reaches toward the lane on either side and keeps the same movement as the return', () => {
    const p = { ...receiver, caughtTick: 116, legs: .1 };
    const previous = { ...p, x: p.x - .2, speed: p.speed - .3 };
    const holder = { side: p.side, slot: p.slot };
    const take = { player: { ...holder, who: p.who! }, tick: 116, fromX: -2, fromY: 1 };
    for (const screenDir of [-1, 1]) for (const lane of [-1, 1]) {
      const interception = { ...take, fromX: take.fromX * lane, fromY: take.fromY * lane };
      const ctx = pictureContext(snap(116, { ball: { ...snap(116).ball, holder }, interception }));
      for (const [age, beat] of [[0, 0], [1, 1], [2, 2], [3, 2]] as const) {
        const tick = 116 + age;
        const travel = playerPicture(p, previous, tick, holder, screenDir);
        const reached = playerPicture(p, previous, tick, holder, screenDir, ctx);
        expect(reached).toEqual({ ...travel, action: 'intercept', frame: beat + (lane < 0 ? 0 : 3) });
      }
      expect(playerPicture(p, previous, 120, holder, screenDir, ctx)).toEqual(playerPicture(p, previous, 120, holder, screenDir));
    }
    const ctx = { interception: take };
    for (const changed of [{ pose: 'kick' }, { pose: 'pass' }, { pose: 'fend' }, { pose: 'tackled' }, { who: 'replacement' }, { caughtTick: 117 }, { binned: true }]) {
      const q = { ...p, ...changed };
      expect(playerPicture(q, q, 117, holder, 1, ctx).action).not.toBe('intercept');
    }
    expect(playerPicture(p, previous, 116, null, 1, ctx).action).not.toBe('intercept');
    const contact = { startedTick: 116, carrier: take.player, defenders: [] };
    const stopped = snap(116, { ball: { ...snap(116).ball, holder }, interception: take, contact });
    expect(playerPicture(p, previous, 116, holder, 1, pictureContext(stopped)).action).not.toBe('intercept');
  });
  it('cancels preparation for contact, invalid/stale identities, kicks, old snapshots and dead phases', () => {
    for (const over of [{ who: 'replacement' }, { binned: true }, { pose: 'tackled' }, { pose: 'dummyHalf' }]) {
      const p = { ...receiver, ...over }, s = snap(114, { players: [passer, p] });
      expect(playerPicture(p, p, 114, null, 1, pictureContext(s)).action).not.toBe('receive');
    }
    for (const f of [{ ...flight, via: 'kick' as const }, { ...flight, startedTick: 120 }, { ...flight, arrivesTick: 113 }, { ...flight, to: { x: NaN, y: 0 } }]) {
      expect(receivingPass(snap(114, { ball: { ...snap(114).ball, flight: f } }))).toBeUndefined();
    }
    const old = snap(114); delete old.ball.flight;
    expect(receivingPass(old)).toBeUndefined();
    expect(currentPass(snap(114, { phase: { kind: 'half-time', since: 110 } }))).toBeNull();
    const contact = { startedTick: 114, carrier: { side: receiver.side, slot: receiver.slot, who: receiver.who! }, defenders: [{ side: 'away' as const, slot: passer.slot, who: passer.who! }] };
    const s = snap(114, { contact });
    expect(playerPicture(receiver, receiver, 114, null, 1, pictureContext(s)).action).not.toBe('receive');
    expect(playerPicture(receiver, receiver, 115, null, 1, pictureContext(snap(114))).action).not.toBe('receive');
    const held = snap(114, { ball: { ...snap(114).ball, holder: { side: 'home', slot: 1 } } });
    expect(receivingPass(held)).toBeUndefined();
  });
  it('lets a confirmed incoming pass supersede cosmetic fatigue/error reactions while retaining tired posture', () => {
    for (const p of [{ ...receiver, pose: 'idle', speed: 0, legs: .1, blown: true }, { ...receiver, reactTick: 110, react: 'error' as const }]) {
      const s = snap(114, { players: [passer, p] });
      const prepared = playerPicture(p, p, 114, null, 1, pictureContext(s));
      expect(prepared.action).toBe('receive');
      if (p.blown) expect(prepared.tired).toBe(2);
      expect(playerPicture(p, p, 114, null, 1).action).not.toBe('receive');
    }
  });
  it('braces a free defender approaching the actual carrier, and suppresses that cue at dead balls', () => {
    const defender = { ...receiver, x: 47, y: 34, headX: 1, headY: 0 };
    const ctx = { carrier: { side: 'away' as const, x: 50, y: 34 } };
    expect(playerPicture(defender, defender, 114, null, 1, ctx).action).toBe('guard');
    expect(playerPicture(defender, defender, 114, null, 1, { ...ctx, motionLive: false }).action).toBe('run');
    expect(playerPicture({ ...defender, headX: -1 }, defender, 114, null, 1, ctx).action).toBe('run');
  });
  it('corrects launched pass centres from fixed source to actual receiver anchors without history', () => {
    const s = snap(115), anchors = (_p: unknown, end: 'release' | 'receive') => end === 'release' ? { x: 9, y: -7 } : { x: 12, y: -10 };
    expect(passSpriteOffset(s, 100, anchors, 10)).toEqual({ x: 9, y: 4.5 });
    expect(passSpriteOffset(s, 116, anchors, 10)).toEqual({ x: 12, y: -8.5 });
    const once = passSpriteOffset(s, 115, anchors, 10);
    passSpriteOffset(snap(105), 105, anchors, 10);
    expect(passSpriteOffset(s, 115, anchors, 10)).toEqual(once);
    const bad = snap(115, { players: [{ ...passer, who: 'replacement' }, { ...receiver, who: 'replacement' }] });
    expect(passSpriteOffset(bad, 115, anchors, 10)).toBeNull();
    const kicked = snap(115, { ball: { ...s.ball, flight: { ...flight, via: 'kick' } } });
    expect(passSpriteOffset(kicked, 115, anchors, 10)).toBeNull();
  });
});
