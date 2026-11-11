import { describe, expect, it } from 'vitest';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { passFlight } from '../../../src/match/core/ball';
import { statsOf } from '../../../src/match/league/live/types';
import { goalChance } from '../../../src/match/league/goals';

/** Fixed geometry and dice exercise the actual passing/catching and kick-off paths. */
class SplitSim extends LiveSim {
  constructor() { super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 536); }
  receive(handling: number, kicking: number): boolean {
    this.tick = 100; this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    for (const p of this.players) p.body.pos = { x: 80, y: 60 };
    const r = this.players[1]!;
    r.body.pos = { x: 50, y: 34 }; r.stats.handling = handling; r.stats.kicking = kicking;
    this.ball = passFlight({ x: 49, y: 34 }, r.body.pos, 0, 1);
    this.rng.next = () => 0.04;
    this.landings();
    return this.ball.kind === 'held';
  }
  passing(handling: number, kicking: number): boolean {
    this.tick = 100; this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    for (const p of this.players) { p.body.pos = { x: 80, y: 60 }; p.traits = []; }
    const h = this.players[7]!;
    h.body.pos = { x: 50, y: 34 }; h.catchTick = 0; h.decided = false;
    h.stats.handling = handling; h.stats.kicking = kicking;
    this.players[1]!.body.pos = { x: 49, y: 38 };
    this.players[16]!.body.pos = { x: 51.5, y: 34 };
    this.ball = { kind: 'held', by: 7 };
    this.rng.next = () => 0.5;
    this.stepPlay();
    return this.passInFlight();
  }
  private passInFlight(): boolean { return this.ball.kind === 'flight' && this.ball.via === 'pass'; }
  kickoff(handling: number, kicking: number) {
    this.tick = LIVE.restartMaxTicks + 1;
    const k = this.kicker('home'); k.stats.handling = handling; k.stats.kicking = kicking;
    this.rng.next = () => 0.5;
    this.stepRestart({ kind: 'restart', t0: 0, kicking: 'home' });
    return this.pendingKick?.to ?? null;
  }
}

describe('Handling and Kicking match responsibilities (#536)', () => {
  it('uses Handling for passing, independently of Kicking', () => {
    expect(new SplitSim().passing(1, 100)).toBe(false);
    expect(new SplitSim().passing(100, 1)).toBe(true);
    expect(new SplitSim().passing(100, 100)).toBe(true);
  });
  it('uses Handling for catching, independently of Kicking', () => {
    expect(new SplitSim().receive(1, 100)).toBe(false);
    expect(new SplitSim().receive(100, 1)).toBe(true);
    expect(new SplitSim().receive(100, 100)).toBe(true);
  });
  it('uses Kicking for kick-off depth, independently of Handling', () => {
    const low = new SplitSim().kickoff(100, 1);
    const high = new SplitSim().kickoff(1, 100);
    expect(low).not.toBeNull(); expect(high).not.toEqual(low);
    expect(new SplitSim().kickoff(100, 100)).toEqual(high);
  });
  it('carries both stats from the sheet to the live engine and keeps goal accuracy on Kicking', () => {
    const sheet = sideSheet('H', { rating: 60, stats: { handling: 10, kicking: 90 } });
    const s = statsOf(sheet.roster![0]);
    expect(s).toMatchObject({ handling: 10, kicking: 90 });
    const from = { x: 70, y: 10 }, posts = { x: 100, y: 34 };
    expect(goalChance(from, posts, s.kicking)).toBeGreaterThan(goalChance(from, posts, s.handling));
  });
});
