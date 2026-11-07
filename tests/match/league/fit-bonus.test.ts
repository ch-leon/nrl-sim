import { describe, expect, it } from 'vitest';
import { fitEdge } from '../../../src/match/league/counters';
import { AVERAGE, OPEN, carrierEdge, contestOdds } from '../../../src/match/league/contest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';

class ReadFit extends LiveSim {
  fits() { return structuredClone(this.planFit); }
  edge(attacker: 'home' | 'away') { return this.contestFitEdge(attacker, attacker === 'home' ? 'away' : 'home'); }
}

describe('own-style fit bonus', () => {
  it('ships on and gives zero edge at fit 1, with signed edges above and below it', () => {
    expect(listKnobs().find((k) => k.path === 'counters.fit.on')?.value).toBe(1);
    const restore = applyTuning({ 'counters.fit.on': 1 });
    try {
      expect(fitEdge(1)).toBe(0);
      expect(fitEdge(1.5)).toBeGreaterThan(0);
      expect(fitEdge(0.5)).toBeLessThan(0);
      const odds = (fit: number) => contestOdds(carrierEdge(AVERAGE, AVERAGE), OPEN, { edge: fitEdge(fit) });
      expect(odds(1.5).broken).toBeGreaterThan(odds(1).broken);
      expect(odds(0.5)['big-hit']).toBeGreaterThan(odds(1)['big-hit']);
    } finally { restore(); }
  });

  it('knob 0 gives zero edge for any fit', () => {
    const restore = applyTuning({ 'counters.fit.on': 0 });
    try { for (const fit of [0, 0.5, 1, 1.5]) expect(fitEdge(fit)).toBe(0); }
    finally { restore(); }
  });

  it('a half-time plan change switches attack and defence fit on the side that changes', () => {
    const home = sideSheet('H', { rating: 60, positionStats: { pack: { strength: 100 }, backs: { speed: 35 } } });
    const away = sideSheet('A', { rating: 60 });
    const restore = applyTuning({ 'counters.fit.on': 1 });
    try {
      const sim = new ReadFit(home, away, 3, { length: { halves: 2, halfMinutes: 1 },
        breakRuleSides: ['home'], breakRule: (f) => f.at === 'half-time' ? { attack: 'grind', defence: 'compressed' } : null });
      const before = sim.fits();
      const attackBefore = sim.edge('home');
      const defenceBefore = sim.edge('away');
      while (!sim.finished && !sim.planChanges.length) sim.step();
      expect(sim.planChanges).toHaveLength(1);
      expect(sim.fits().home.attack).toBeGreaterThan(before.home.attack);
      expect(sim.fits().home.defence).toBeGreaterThan(before.home.defence);
      expect(sim.edge('home')).toBeGreaterThan(attackBefore);
      expect(sim.edge('away')).toBeLessThan(defenceBefore);
      expect(sim.fits().away).toEqual(before.away);
    } finally { restore(); }
  });

  it('neutral starters replay exactly with the knob on, including a half-time plan change', () => {
    const events = (on: number) => {
      const restore = applyTuning({ 'counters.fit.on': on });
      try {
        const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 11,
          { length: { halves: 2, halfMinutes: 1 }, breakRuleSides: ['away'], breakRule: (f) => f.at === 'half-time' ? { attack: 'expansive', defence: 'rush' } : null });
        const result = [];
        while (!sim.finished) { sim.step(); result.push(...sim.tickEvents); }
        return result;
      } finally { restore(); }
    };
    expect(events(1)).toEqual(events(0));
  });
});
