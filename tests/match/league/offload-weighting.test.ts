import { describe, expect, it } from 'vitest';
import { sideSheet } from '../../../src/match/balance/measure';
import { BASE, carrierEdge, contestOdds } from '../../../src/match/league/contest';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';

class OffloadSim extends LiveSim {
  constructor(strength: number, handling: number) {
    super(sideSheet('H', { rating: 60, tactics: { attack: 'grind' },
      positionStats: { pack: { strength, handling } } }), sideSheet('A', { rating: 60 }), 543);
  }
  contact() {
    this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!, t = this.players[16]!;
    for (const p of this.players) p.body.pos = { x: 90, y: 60 };
    c.body.pos = { x: 50, y: 34 }; t.body.pos = { x: 51, y: 34 };
    this.players[5]!.body.pos = { x: 49, y: 35 };
    const sit = this.situation(c, t, [t]);
    const plan = this.atkPlan(c);
    let draws = 0;
    const odds = contestOdds(carrierEdge(c.stats, t.stats), sit, {
      edge: this.contestFitEdge('home', 'away'),
      offload: (plan.offload - 1) * BASE.offload + this.defPlan().offload,
    });
    this.rng.next = () => { draws++; return odds.broken + odds.fend + odds.offload / 2; };
    this.contest(c, t, [t]);
    return { plan: plan.offload, draws, offloaded: this.tickEvents.some(e => e.kind === 'offload') };
  }
  replay() {
    const events = [];
    for (let i = 0; i < 2400; i++) { this.step(); events.push(...this.tickEvents); }
    return { events, seed: this.rng.state() };
  }
}

describe('offload weighting (#543)', () => {
  it('a Strength-heavy forward beats the Handling-heavy equivalent in contact offload chance', () => {
    const strong = new OffloadSim(90, 30).contact();
    const handling = new OffloadSim(30, 90).contact();
    expect(strong.plan).toBeGreaterThan(handling.plan);
    expect(strong.offloaded).toBe(true);
    expect(handling.offloaded).toBe(true);
  });
  it('adds no RNG draws to a real offload with old and new weights', () => {
    const current = new OffloadSim(80, 40).contact();
    const restore = applyTuning({ 'fit.offload.strength': 1 });
    try {
      const previous = new OffloadSim(80, 40).contact();
      expect(previous.offloaded).toBe(true);
      expect(current.offloaded).toBe(true);
      // Existing contact and pass-lane interception rolls.
      expect(previous.draws).toBe(2);
      expect(current.draws).toBe(previous.draws);
    } finally { restore(); }
  });
  it('preserves the entire event and RNG stream where the offload calculation is neutral', () => {
    const current = new OffloadSim(60, 60).replay();
    const restore = applyTuning({ 'fit.offload.strength': 1 });
    try { expect(new OffloadSim(60, 60).replay()).toEqual(current); }
    finally { restore(); }
  });
});
