import { describe, expect, it } from 'vitest';
import { BalanceSim, measureCell, sideSheet } from '../../../src/match/balance/measure';
import { checkPlan, type Plan } from '../../../src/match/balance/plan';
import { LiveSim } from '../../../src/match/league/live';

class ReadFits extends BalanceSim {
  fits() { return structuredClone(this.planFit); }
  packFit() { return this.tightFit.home; }
}

describe('headless starting-fit fixtures (#465)', () => {
  it('changes only the named starting fits, keeps flat playing stats, and reselects fits at a break', () => {
    const home = sideSheet('H', { rating: 60, tactics: { attack: 'grind' } });
    const away = sideSheet('A', { rating: 60 });
    const before = structuredClone([home, away]);
    const sim = new ReadFits(home, away, 1, { length: { halves: 2, halfMinutes: 0.02 },
      breakRuleSides: ['home'], breakRule: (f) => f.at === 'half-time' ? { attack: 'expansive', defence: 'slide' } : null },
    { home: { grind: 1.5, expansive: 0.5 }, away: { slide: 0.5 } });
    expect(sim.fits()).toEqual({ home: { attack: 1.5, defence: 1 }, away: { attack: 1, defence: 0.5 } });
    expect(sim.packFit()).toBe(1.5);
    expect([home, away]).toEqual(before);
    while (!sim.finished && !sim.planChanges.length) sim.step();
    expect(sim.planChanges).toHaveLength(1);
    expect(sim.fits().home).toEqual({ attack: 0.5, defence: 1 });
    expect(sim.fits().away).toEqual({ attack: 1, defence: 0.5 });
  });

  it('omitted and explicit neutral fixtures preserve the live replay and opening RNG', () => {
    const home = sideSheet('H', { rating: 60 }), away = sideSheet('A', { rating: 60 });
    const options = { length: { halves: 2 as const, halfMinutes: 0.1 } };
    const live = new LiveSim(home, away, 7, options);
    for (const sim of [new BalanceSim(home, away, 7, options), new BalanceSim(home, away, 7, options,
      { home: { balanced: 1, slide: 1 }, away: { balanced: 1, slide: 1 } })]) {
      const reference = new LiveSim(home, away, 7, options);
      expect(sim.snapshot()).toEqual(live.snapshot());
      while (!sim.finished) {
        sim.step(); reference.step();
        expect(sim.snapshot()).toEqual(reference.snapshot());
      }
    }
  });

  it('keeps fit fixtures with the written side in both orientations', () => {
    const home = { rating: 60, tactics: { attack: 'expansive' as const }, fit: { expansive: 1.5 } };
    const away = { rating: 60, fit: { slide: 0.5 } };
    const variant = { name: 'baseline' };
    const written = measureCell({ variant, scenario: { name: 'w', home, away, track: 'home' } }, 1, 0.5);
    const swapped = measureCell({ variant, scenario: { name: 's', home: away, away: home, track: 'away' } }, 1, 0.5);
    const both = measureCell({ variant, scenario: { name: 'b', home, away, track: 'home', bothWays: true } }, 1, 0.5);
    expect(both.trackedCounts!.pointsFor.mean).toBe((written.trackedCounts!.pointsFor.mean + swapped.trackedCounts!.pointsFor.mean) / 2);
    expect(both.trackedCounts!.busts.mean).toBe((written.trackedCounts!.busts.mean + swapped.trackedCounts!.busts.mean) / 2);
    expect(both.counts).toEqual(written.counts);
  });

  it('rejects unknown styles, non-finite values and fits outside 0–1.5', () => {
    const plan = (fit: unknown): Plan => ({ name: 'fit', seeds: 1, scenarios: [
      { name: 'fit', home: { fit: fit as never }, away: {} },
    ] });
    expect(checkPlan(plan({ grind: 1.5, slide: 0.5 }))).toEqual([]);
    for (const fit of [null, [], { tight: 1 }, { slide: -0.1 }, { grind: 1.6 }, { rush: Infinity }, { expansive: '1' }]) {
      expect(checkPlan(plan(fit)).length).toBeGreaterThan(0);
    }
  });
});
