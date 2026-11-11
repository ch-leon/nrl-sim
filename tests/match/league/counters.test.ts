import { describe, expect, it } from 'vitest';
import { attackPlan, PACK, type Zone } from '../../../src/match/league/presets';
import { styleFit } from '../../../src/match/league/fit';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { LiveSim } from '../../../src/match/league/live';
import type { TeamSheet } from '../../../src/sim/events';

const zones: Zone[] = ['own20', 'ownHalf', 'midfield', 'attackingHalf', 'redZone'];
const positions = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(strength: number): TeamSheet {
  return { clubId: 'test', name: 'Test', colors: ['#111', '#eee'], attack: 60, defense: 60, kicking: 60, fitness: 60,
    tactics: { attack: 'grind', defence: 'slide' },
    roster: positions.map((position) => ({ name: position, position, stats: {
      speed: 60, strength: PACK.includes(position) ? strength : 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60,
    } })),
  };
}
// Read the live wiring without advancing the RNG or changing team selection.
class ReadPlans extends LiveSim {
  plan(slot: number, side: 'home' | 'away' = 'home') {
    this.attacking = side;
    return this.atkPlan(this.players.find((p) => p.side === side && p.slot === slot)!);
  }
}

describe('Tight rebuild', () => {
  it('registers the switch on and the disabled switch preserves every legacy zone, even for a strong pack', () => {
    expect(listKnobs().find((k) => k.path === 'counters.tight.on')?.value).toBe(1);
    const restore = applyTuning({ 'counters.tight.on': 0 });
    try {
      for (const [i, zone] of zones.entries()) {
        const plan = attackPlan('grind', zone);
        expect(plan.offload).toBe([0, 0, 0, 0.5, 0.7][i]);
        expect(plan).toMatchObject({ pass: zone === 'own20' ? -0.25 : -0.15,
          step: zone === 'redZone' ? 0.8 : 0.6, hitUps: 1, earlyKick: 0.2,
          earlyTerritory: zone === 'own20' ? 0.4 : 0.25,
          kickBias: { long: 1.6, bomb: 0.7, chip: 0.5, 'cross-field': 0.5 } });
        expect(attackPlan('grind', zone, 1.5, 'prop')).toEqual(plan);
      }
    } finally { restore(); }
  });
  it('scales only pack carriers deterministically, keeps weak packs neutral and retains the tight shape', () => {
    const old = zones.map((z) => attackPlan('grind', z));
    const restore = applyTuning({ 'counters.tight.on': 1 });
    try {
      const weak = styleFit(sheet(40).roster!).grind;
      const flat = styleFit(sheet(60).roster!).grind;
      const strong = styleFit(sheet(80).roster!).grind;
      for (const [i, zone] of zones.entries()) {
        for (const position of PACK) {
          const p = attackPlan('grind', zone, strong, position);
          expect(p.offload).toBeGreaterThan(attackPlan('grind', zone, flat, position).offload);
          expect(attackPlan('grind', zone, weak, position).offload).toBe(1);
          expect(p).toEqual(attackPlan('grind', zone, strong, position));
          expect({ ...p, offload: old[i]!.offload }).toEqual(old[i]);
        }
        for (const position of ['winger', 'fullback', 'centre', 'halfback', 'five-eighth']) {
          expect(attackPlan('grind', zone, strong, position)).toEqual(old[i]);
        }
        expect(attackPlan('balanced', zone, strong, 'prop')).toEqual(attackPlan('balanced', zone));
      }
    } finally { restore(); }
  });
  it('caches each side’s starting sheet fit before kick-off, independently of later sheet changes', () => {
    const restore = applyTuning({ 'counters.tight.on': 1 });
    try {
      const home = sheet(80), away = sheet(60);
      const sim = new ReadPlans(home, away, 1);
      const before = sim.plan(7);
      expect(before.offload).toBeGreaterThan(sim.plan(7, 'away').offload);
      for (const p of home.roster!) p.stats!.strength = 1;
      expect(sim.plan(7)).toEqual(before);
      expect(new ReadPlans(sheet(80), away, 1).plan(7)).toEqual(before);
      expect(sim.plan(1).offload).toBeLessThan(before.offload);
    } finally { restore(); }
  });
});
