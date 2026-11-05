import { describe, expect, it } from 'vitest';
import { COUNTERS, rushBroken, rushCounter } from '../../../src/match/league/counters';
import { derivedRatings, styleFit } from '../../../src/match/league/fit';
import { highBall, grubberRace } from '../../../src/match/league/kickContest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import { BASE, contestOdds } from '../../../src/match/league/contest';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';

function tuned<T>(on: number, fn: () => T): T {
  const restore = applyTuning({ 'counters.rush.on': on });
  try { return fn(); } finally { restore(); }
}
class RushSim extends LiveSim {
  constructor(attack: AttackPreset = 'all-out', defence: DefencePreset = 'rush') {
    super(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
  }
  gap() { return this.rushKickGap('home'); }
  spill() { return this.rushOffloadSpill('home'); }
  fits(a: number, d: number) { this.planFit.home.attack = a; this.planFit.away.defence = d; return this; }
  offloadPass() {
    this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!, t = this.players[16]!;
    for (const p of this.players) p.body.pos = { x: 90, y: 60 };
    c.body.pos = { x: 50, y: 34 }; t.body.pos = { x: 51, y: 34 };
    this.players[5]!.body.pos = { x: 49, y: 35 };
    const sit = this.situation(c, t, [t]);
    const plan = this.atkPlan(c), defence = this.defPlan();
    const odds = contestOdds(0.5, sit, {
      broken: defence.broken, bigHit: defence.bigHit,
      offload: (plan.offload - 1) * BASE.offload + defence.offload,
    });
    let draws = 0;
    this.rng.next = () => { draws++; return odds.broken + odds.fend + odds.offload / 2; };
    this.contest(c, t, [t]);
    return { extra: this.spillExtra, draws, offloaded: this.tickEvents.some((e) => e.kind === 'offload') };
  }
  targets() {
    this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    this.lineX = 60; this.tackles = 3; this.ball = { kind: 'held', by: 5 };
    this.players[5]!.body.pos = { x: 40, y: 15 };
    for (const p of this.players.filter((p) => p.side === 'away')) p.body.pos.x = 80;
    for (const slot of [4, 5]) this.players[9 + slot]!.body.pos = { x: 43, y: 15 };
    this.assignTargets();
    return this.players.filter((p) => p.side === 'away').map((p) => p.target.x);
  }
}
describe('Rush counters', () => {
  it('ships on and the disabled switch preserves the flat 0.11 for every carrier and fit', () => {
    expect(COUNTERS.rush.on).toBe(1);
    for (const carry of [30, 60, 90]) for (const fit of [0.5, 1, 1.5]) {
      expect(tuned(0, () => rushBroken(0.11, 'rush', carry, fit))).toBe(0.11);
    }
  });
  it('replaces flat busts with Carry and Rush fit, neutral at 0.11', () => tuned(1, () => {
    expect(rushBroken(0.11, 'rush', 60, 1)).toBe(0.11);
    expect(rushBroken(0.11, 'rush', 80, 1)).toBeGreaterThan(rushBroken(0.11, 'rush', 45, 1));
    expect(rushBroken(0.11, 'rush', 60, 1.5)).toBeLessThan(rushBroken(0.11, 'rush', 60, 0.5));
    expect(rushBroken(0, 'slide', 90, 0.5)).toBe(0);
    const stats = { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 };
    expect(derivedRatings({ position: 'prop', stats, traits: [{ id: 'wreckingBall' }] }).carry).toBeGreaterThan(60);
    expect(styleFit([{ position: 'prop', stats, traits: [{ id: 'hitman' }] }]).rush).toBeGreaterThan(1);
  }));
  it('spills offloads only for All-out against enabled Rush, scaled by both fits', () => {
    expect(tuned(0, () => new RushSim().spill())).toBe(0);
    tuned(1, () => {
      expect(new RushSim().spill()).toBeGreaterThan(0);
      expect(new RushSim().gap()).toBe(0);
      expect(new RushSim('kick-chase').gap()).toBeGreaterThan(0);
      expect(new RushSim().fits(1, 1.5).spill()).toBeCloseTo(3 * new RushSim().fits(1, 0.5).spill());
      for (const attack of ['grind', 'expansive', 'balanced', 'kick-chase'] as const) expect(new RushSim(attack).spill()).toBe(0);
      for (const defence of ['slide', 'compressed'] as const) expect(new RushSim('all-out', defence).spill()).toBe(0);
    });
  });
  it('passes the Rush spill bonus into a real offload without another RNG draw', () => {
    const off = tuned(0, () => new RushSim().offloadPass());
    const on = tuned(1, () => new RushSim().offloadPass());
    expect(off.offloaded).toBe(true); expect(on.offloaded).toBe(true);
    expect(off.extra).toBe(0); expect(on.extra).toBeGreaterThan(0);
    expect(on.draws).toBe(off.draws);
  });
  it('leaves Tight and Expansive without a base cell and gates other defences', () => tuned(1, () => {
    for (const attack of ['grind', 'expansive', 'balanced'] as const) expect(rushCounter(attack, 'rush', 1, 1)).toBe(0);
    expect(rushCounter('kick-chase', 'slide', 1, 1)).toBe(0);
    expect(rushCounter('kick-chase', 'rush', 0, 1)).toBe(0);
  }));
  it('brings the back three up and gives kick chasers space on existing contests', () => {
    const off = tuned(0, () => new RushSim('kick-chase').targets());
    const on = tuned(1, () => new RushSim('kick-chase').targets());
    for (const slot of [0, 1, 2]) expect(on[slot]).toBeLessThan(off[slot]!);
    expect(tuned(1, () => new RushSim('balanced').targets())).toEqual(tuned(0, () => new RushSim('balanced').targets()));
    const gap = tuned(1, () => rushCounter('kick-chase', 'rush', 1, 1));
    expect(highBall(60, 60, 20, true, 1, 0, gap).won).toBeGreaterThan(highBall(60, 60, 20, true).won);
    expect(grubberRace(1, 1, true, -gap)).toBeGreaterThan(grubberRace(1, 1, true));
  });
  it('neutral Tight and Expansive replay exactly with Rush enabled', () => {
    for (const attack of ['grind', 'expansive'] as const) {
      const replay = (on: number) => tuned(on, () => {
        const sim = new LiveSim(sideSheet('H', { rating: 60, tactics: { attack } }),
          sideSheet('A', { rating: 60, tactics: { defence: 'rush' } }), 7,
          { length: { halves: 2, halfMinutes: 0.2 } });
        const events = [];
        while (!sim.finished) { sim.step(); events.push(...sim.tickEvents); }
        return events;
      });
      expect(replay(1)).toEqual(replay(0));
    }
  });

});
