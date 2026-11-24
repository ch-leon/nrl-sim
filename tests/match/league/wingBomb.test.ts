import { describe, expect, it } from 'vitest';
import { SET_TACKLES } from '../../../src/config';
import type { BallState } from '../../../src/match/core/ball';
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y, inPlay } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { dist, type Vec } from '../../../src/match/core/vec';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { KICK_CONTEST } from '../../../src/match/league/kickContest';
import { LiveSim } from '../../../src/match/league/live';
import { LIVE } from '../../../src/match/league/live/knobs';
import { other, type Player } from '../../../src/match/league/live/types';
import { bombTarget } from '../../../src/match/league/tactics';
import { applyTuning } from '../../../src/match/league/tuning';

type Flight = Extract<BallState, { kind: 'flight' }>;
type WingState = 'ahead' | 'deep' | 'central' | 'locked' | 'binned' | 'leaving';
type BombSetup = { depth?: number; state?: WingState };

class BombSim extends LiveSim {
  private wing!: Player;
  private cover!: Player;

  constructor(home = labSheet(DEFAULT_HOME, 'none'), away = labSheet(DEFAULT_AWAY, 'none'), seed = 650) {
    super(home, away, seed);
  }

  private placeKicker(side: Side, edge: 1 | -1, options: BombSetup) {
    this.attacking = side;
    this.dir = this.dirOf(side);
    this.tackles = SET_TACKLES - 1;
    this.lastPlay = true;
    this.tick = 100;
    this.phase = { kind: 'play' };
    const dir = this.dir;
    const goal = dir > 0 ? FIELD_LENGTH : 0;
    const at = (depth: number, y: number): Vec => ({ x: goal - dir * depth, y });
    const kicker = this.kicker(side);
    const fullback = this.fullback(other(side));
    const slot = edge < 0 ? 1 : 2;
    this.wing = this.at(side, slot);
    this.cover = this.at(other(side), slot);
    for (const player of this.players) {
      player.body.pos = at(55 + player.slot, 7 + player.slot * 6);
      player.body.vel = { x: 0, y: 0 };
      player.energy = 1;
      player.gas = { gas: 1, blown: false };
    }
    const depth = options.depth ?? 27;
    kicker.body.pos = at(depth, MID_Y);
    kicker.catchTick = this.tick - LIVE.kickRunTicks;
    this.ball = { kind: 'held', by: this.indexOf(kicker) };
    fullback.body.pos = at(10, MID_Y);
    fullback.cooldownUntil = this.tick + 100; // The fullback is sweeping, outside the committed tackle group.
    this.wing.body.pos = at(depth + 1, MID_Y + edge * 27);
    this.wing.body.vel = { x: dir * 4, y: 0 };
    this.cover.body.pos = at(15, MID_Y + edge * 24);
    const wing = this.wing;
    switch (options.state) {
      case 'ahead': wing.body.pos.x = at(depth - 1, 0).x; break;
      case 'deep': wing.body.pos.x = at(depth + 22, 0).x; break;
      case 'central': wing.body.pos.y = MID_Y; break;
      case 'locked': wing.lockUntil = this.tick + 100; break;
      case 'binned': wing.binUntilS = 100; this.refreshOnField(); break;
      case 'leaving': wing.subFor = 0; break;
    }
    return { dir, goal, fullback };
  }

  bomb(side: Side, edge: 1 | -1, roll: number, options: BombSetup & { aimed?: boolean; lateAhead?: boolean } = {}) {
    const { dir, goal, fullback } = this.placeKicker(side, edge, options);
    if (options.aimed) this.pendingControl[side] = { tick: this.tick, side, kind: 'kick', aim: this.cover.body.pos };
    else this.kickCall = 'bomb'; // The kicker has already made his ordinary last-tackle call.

    let draws = 0;
    this.rng.next = () => { draws++; return roll; };
    this.stepPlay();
    expect(this.pendingKick?.kind).toBe('bomb');
    this.assignTargets();
    const coverRead = fullback.target;
    this.tick += LIVE.kickContactTicks;
    if (options.lateAhead) this.wing.body.pos.x = this.kicker(side).body.pos.x + dir;
    this.launchPendingKick();
    const flight = this.ball as BallState;
    if (flight.kind !== 'flight') throw new Error('No bomb launched');
    expect(draws).toBe(1);
    expect(flight).toMatchObject({ peak: KICK_CONTEST.bomb.peak, receiver: this.indexOf(fullback), via: 'kick' });
    const event = this.tickEvents[this.tickEvents.length - 1];
    expect(event).toMatchObject({ side, kind: 'kick', detail: 'bomb' });
    return { flight, dir, goal, coverRead, stock: bombTarget(flight.from, dir, fullback.body.pos, roll) };
  }

  chooseLast(options: BombSetup, rolls: number[]) {
    this.placeKicker('home', -1, options);
    this.rng.next = () => {
      const roll = rolls.shift();
      if (roll === undefined) throw new Error('Unexpected last-tackle roll');
      return roll;
    };
    this.stepPlay();
    expect(rolls).toHaveLength(0);
    return { call: this.kickCall, kick: this.pendingKick?.kind };
  }

  settle(flight: Flight, roll: number) {
    let draws = 0;
    this.rng.next = () => { draws++; return roll; };
    while (this.tick + 1 < flight.t0 + flight.ticks) this.step();
    expect(dist(this.wing.body.pos, flight.to)).toBeLessThan(KICK_CONTEST.bomb.contestM);
    expect(dist(this.cover.body.pos, flight.to)).toBeLessThan(KICK_CONTEST.bomb.contestM);
    this.step();
    expect(draws).toBe(1);
    return this.tickEvents;
  }

  firstCornerBomb(until: number, edge: 1 | -1): Flight | undefined {
    while (!this.finished && this.tick < until) {
      this.step();
      const flight = this.ball;
      if (flight.kind !== 'flight' || !this.tickEvents.some(e => e.kind === 'kick' && e.detail === 'bomb')) continue;
      const touch = edge < 0 ? flight.to.y : FIELD_WIDTH - flight.to.y;
      if (touch <= 12) return flight;
    }
    return undefined;
  }
}

describe('ordinary attacking bombs to the winger’s corner (#650)', () => {
  it('lands safely on either edge in either direction, with the same aim for the fullback’s read', () => {
    for (const side of ['home', 'away'] as const) for (const edge of [-1, 1] as const) for (const roll of [0, 0.5, 1]) {
      const { flight, dir, goal, coverRead } = new BombSim().bomb(side, edge, roll);
      const toLine = (goal - flight.to.x) * dir;
      const toTouch = edge < 0 ? flight.to.y : FIELD_WIDTH - flight.to.y;
      expect(inPlay(flight.to)).toBe(true);
      expect(toLine).toBeCloseTo(12 - roll * 4);
      expect(toTouch).toBeCloseTo(8 + roll * 4);
      expect(coverRead).toEqual(flight.to);
    }
  });

  it('keeps the fullback bomb from midfield, or with no eligible winger who can arrive', () => {
    const scenarios = [
      { depth: 45 },
      { state: 'ahead' }, { state: 'deep' }, { state: 'central' },
      { state: 'locked' }, { state: 'binned' }, { state: 'leaving' },
    ] as const;
    for (const options of scenarios) {
      const { flight, stock, coverRead } = new BombSim().bomb('home', -1, 0.5, options);
      expect(flight.to, JSON.stringify(options)).toEqual(stock);
      expect(coverRead).toEqual(stock);
    }
  });

  it('retains an explicit Lab aim and restores the old ordinary aim with the switch off', () => {
    const aimed = new BombSim().bomb('home', -1, 0.5, { aimed: true });
    const restore = applyTuning({ 'wingBomb.on': 0 });
    try {
      const ordinary = new BombSim().bomb('home', -1, 0.5);
      expect(ordinary.flight.to).toEqual(ordinary.stock);
      expect(new BombSim().bomb('home', -1, 0.5, { aimed: true }).flight).toEqual(aimed.flight);
    } finally {
      restore();
    }
  });

  it('checks the winger again when the kick is struck', () => {
    const { flight, stock, coverRead } = new BombSim().bomb('home', -1, 0.5, { lateAhead: true });
    expect(coverRead.y).toBe(10);
    expect(flight.to).toEqual(stock);
  });

  it('adds the bomb to the ordinary close-range kick roll only with a viable corner chase', () => {
    const kick = (options: BombSetup) => new BombSim().chooseLast(options, [0, 0, 0.5]);
    expect(kick({ depth: 18 })).toEqual({ call: 'bomb', kick: 'bomb' });
    expect(kick({ depth: 18, state: 'ahead' })).toEqual({ call: 'cross-field', kick: 'cross-field' });
    expect(kick({ depth: 9 })).toEqual({ call: 'cross-field', kick: 'cross-field' });
    expect(new BombSim().chooseLast({ depth: 18 }, [0.99])).toEqual({ call: 'pass', kick: undefined });

    const restore = applyTuning({ 'wingBomb.on': 0 });
    try {
      expect(kick({ depth: 18 })).toEqual({ call: 'cross-field', kick: 'cross-field' });
      expect(new BombSim().chooseLast({ depth: 18 }, [0.99])).toEqual({ call: 'pass', kick: undefined });
    } finally {
      restore();
    }
  });

  it('gives the winger an ordinary contest and can be won back or caught by the defence', () => {
    for (const side of ['home', 'away'] as const) {
      const edge = side === 'home' ? -1 : 1;
      const won = new BombSim();
      const wonEvents = won.settle(won.bomb(side, edge, 0.5).flight, 0);
      expect(wonEvents).toContainEqual(expect.objectContaining({ kind: 'regather', side, detail: 'contest', slot: edge < 0 ? 1 : 2 }));

      const caught = new BombSim();
      const caughtEvents = caught.settle(caught.bomb(side, edge, 0.5).flight, 0.99);
      expect(caughtEvents).toContainEqual(expect.objectContaining({ kind: 'set-start', side: other(side), detail: 'caught' }));
    }
  });

  it('finds both corners in ordinary seeded play without a coach call or a Lab aim', () => {
    // Reapers v Wolves (Kick-chase): seed 1 bombs to the low corner, attacking toward
    // +x, at 1543. Seed 32 bombs to the high corner, attacking toward −x, at 3194.
    // With the dive off, seed 42 is still the old high-corner bomb at 3303.
    const chase = { attack: 'kick-chase' } as const;
    const low = new BombSim(labSheet('rival-reapers', 'gen', chase), labSheet('rival-wolves', 'gen', chase), 1).firstCornerBomb(2_000, -1);
    const high = new BombSim(labSheet('rival-reapers', 'gen', chase), labSheet('rival-wolves', 'gen', chase), 32).firstCornerBomb(3_600, 1);
    if (!low || !high) throw new Error('Expected a natural bomb to each corner');
    expect(low.to.y).toBeLessThanOrEqual(12);
    expect(low.to.x - low.from.x).toBeGreaterThan(0);
    expect(high.to.y).toBeGreaterThanOrEqual(FIELD_WIDTH - 12);
    expect(high.to.x - high.from.x).toBeLessThan(0);
  }, 15_000);
});
