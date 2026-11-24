import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { FIELD_WIDTH, MID_X, MID_Y } from '../../../src/match/core/field';
import type { Side } from '../../../src/match/core/snapshot';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import { benchJog, benchSeat } from '../../../src/match/view/officials';
import { tiredLevel } from '../../../src/match/view/playerPicture';
import { popupFor } from '../../../src/match/view/popups';

class ImpactSim extends LiveSim {
  constructor() {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 5);
    this.tick = 100;
    this.phase = { kind: 'play' };
  }

  replace(side: Side) {
    const p = this.at(side, 6);
    this.swapIn(p, 0);
    return p;
  }

  sendOff(side: Side, injured = false) {
    const player = this.at(side, 6);
    player.body.pos = { x: MID_X, y: 5 };
    if (injured) player.hurt = true;
    else player.energy = 0.2;
    this.callSwaps();
    return player.subSpot;
  }

  runWithBall(side: Side) {
    const runner = this.at(side, 6);
    this.attacking = side;
    this.ball = { kind: 'held', by: this.indexOf(runner) };
    runner.catchTick = this.tick;
    for (const p of this.players) {
      p.body.pos = { x: 5 + p.slot * 4, y: p.side === 'home' ? 8 : 60 };
      p.target = p.body.pos;
      p.through = p.wantsSprint = false;
    }
    runner.body.pos = { x: 40, y: MID_Y };
    runner.body.vel = { x: 5, y: 0 };
    runner.target = { x: 90, y: MID_Y };
    runner.through = true;
    for (let i = 0; i < 20; i++) {
      this.tick++;
      this.move();
    }
    return runner.body.pos.x;
  }

  contestBall(carrierSide: Side, newBall = true) {
    this.tick++;
    this.phase = { kind: 'play' };
    this.attacking = carrierSide;
    const c = this.at(carrierSide, 6);
    const t = this.at(carrierSide === 'home' ? 'away' : 'home', 6);
    if (newBall) c.catchTick = this.tick;
    c.body.pos = { x: MID_X, y: MID_Y };
    t.body.pos = { x: MID_X + this.dir, y: MID_Y };
    this.ball = { kind: 'held', by: this.indexOf(c) };
    // Both the existing result roll and the high-shot/error rolls land in the plain held branch.
    this.rng.next = () => 0.99;
    this.contest(c, t, [t]);
    return this.wrestleMen;
  }
}

const freshEvents = (s: LiveSim) => s.tickEvents.filter(e => e.kind === 'fresh-impact');
const tuned = <T>(overrides: Overrides, run: () => T): T => {
  const undo = applyTuning(overrides);
  try { return run(); } finally { undo(); }
};

describe('impact interchanges', () => {
  it('shares two uses between carrying and tackling and resets them only on a new stint', () => {
    const sim = new ImpactSim();
    expect(sim.contestBall('home')).toBe(1);
    expect(freshEvents(sim)).toEqual([]);
    const reserve = sim.replace('home').key;
    sim.runWithBall('home');
    expect(sim.contestBall('home', false)).toBe(1);
    expect(freshEvents(sim).map(e => e.detail)).toEqual(['carry']);

    expect(sim.contestBall('away')).toBe(1);
    expect(sim.contestBall('away', false)).toBe(1);
    expect(sim.contestBall('home')).toBe(1);
    expect(freshEvents(sim).map(e => e.detail)).toEqual(['carry', 'tackle']);
    expect(freshEvents(sim).every(e => e.player === reserve && e.side === 'home' && e.slot === 6)).toBe(true);
    expect(freshEvents(sim).map(e => popupFor(e)?.word)).toEqual(['FRESH LEGS', 'FRESH LEGS']);

    expect(sim.replace('home').key).not.toBe(reserve);
    expect(sim.contestBall('home')).toBe(1);
    expect(freshEvents(sim).map(e => e.detail)).toEqual(['carry', 'tackle', 'carry']);
  });

  it('adds visible ground on a carry with pace on, and the feature-off reserve never gets a cue', () => {
    const run = (overrides: Overrides) => tuned(overrides, () => {
      const sim = new ImpactSim();
      sim.replace('home');
      return { x: sim.runWithBall('home'), cues: freshEvents(sim).map(e => e.detail) };
    });
    const normal = run({});
    const slower = run({ 'bench.impact.pace': 0 });
    const off = run({ 'bench.impact.on': 0 });
    expect(normal.x - slower.x).toBeGreaterThan(0.2);
    expect(normal.cues).toEqual(['carry']);
    expect(off).toEqual({ x: slower.x, cues: [] });
    tuned({ 'bench.impact.on': 0 }, () => {
      const sim = new ImpactSim();
      expect(sim.sendOff('home')).toEqual({ x: MID_X, y: 1 });
      sim.replace('home');
      expect(sim.snapshot().interchangeExits).toBeUndefined();
    });
  });

  it('keeps the outgoing look from the actual handoff and jogs him to his own bench seat', () => {
    const sim = new ImpactSim();
    expect(sim.sendOff('home')).toEqual({ x: benchSeat('home', 2).x, y: FIELD_WIDTH - 1 });
    const before = sim.snapshot().players.find(p => p.side === 'home' && p.slot === 6)!;
    expect(tiredLevel(before)).toBe(2);
    const incoming = sim.replace('home');
    const after = sim.snapshot();
    expect(after.players.find(p => p.side === 'home' && p.slot === 6)?.who).toBe(incoming.key);
    const exit = after.interchangeExits?.[0]!;
    expect(exit).toEqual({ side: 'home', who: before.who, from: { x: before.x, y: before.y }, tick: after.tick, tired: 2 });
    const start = benchJog(exit, 0, after.tick)!;
    expect(start).toMatchObject({ ...exit.from, to: benchSeat('home', 0), stride: 6 });
    expect(benchJog(exit, 0, after.tick + 1)?.y).toBeGreaterThan(start.y);
    expect(start.to.y).toBeGreaterThan(FIELD_WIDTH);
    expect(benchJog(exit, 0, after.tick + 230)).toBeNull();
    expect(sim.sendOff('away', true)).toEqual({ x: benchSeat('away', 2).x, y: FIELD_WIDTH - 1 });
    const injured = sim.snapshot().players.find(p => p.side === 'away' && p.slot === 6)!;
    expect(tiredLevel(injured)).toBe(0);
    sim.replace('away');
    expect(sim.snapshot().interchangeExits?.find(p => p.who === injured.who)?.tired).toBe(0);
  });
});
