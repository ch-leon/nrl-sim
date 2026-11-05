import { expect, it } from 'vitest';
import { applyTuning } from '../../../src/match/league/tuning';
import { LIVE, LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';

class OffloadSim extends LiveSim {
  constructor(attack: AttackPreset, defence: DefencePreset, attackFit: number, defenceFit: number) {
    super(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
    this.planFit.home.attack = attackFit; this.planFit.away.defence = defenceFit;
  }
  contact(roll: number) {
    this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!, t = this.players[16]!;
    for (const p of this.players) p.body.pos = { x: 90, y: 60 };
    c.body.pos = { x: 50, y: 34 }; t.body.pos = { x: 51, y: 34 };
    this.players[5]!.body.pos = { x: 49, y: 35 };
    let draws = 0;
    this.rng.next = () => { draws++; return roll; };
    this.contest(c, t, [t]);
    return { offloaded: this.tickEvents.some((e) => e.kind === 'offload'), ticks: this.offloadUntil - this.tick, draws };
  }
}

it('extends the real All-out offload window only for a fit advantage over Slide, without another RNG draw', () => {
  const restore = applyTuning({ 'counters.slide.on': 1, 'counters.slide.allOutRecovery': 0 });
  try {
    const cases: [AttackPreset, DefencePreset, number, number, number][] = [
      ['all-out', 'slide', 1.5, 0.5, 2], ['all-out', 'slide', 1, 1, 1],
      ['all-out', 'slide', 0.5, 1.5, 1], ['all-out', 'rush', 1.5, 0.5, 1],
      ['balanced', 'slide', 1.5, 0.5, 1],
    ];
    for (const [attack, defence, a, d, multiplier] of cases) {
      const make = (roll: number) => new OffloadSim(attack, defence, a, d).contact(roll);
      let roll = 0.01, before = make(roll);
      while (!before.offloaded && roll < 0.99) { roll += 0.01; before = make(roll); }
      expect(before.offloaded).toBe(true);
      expect(before.ticks).toBe(LIVE.beatenCooldown);
      const on = applyTuning({ 'counters.slide.allOutRecovery': 1 });
      try {
        const after = make(roll);
        expect(after.offloaded).toBe(true);
        expect(after.ticks).toBe(LIVE.beatenCooldown * multiplier);
        expect(after.draws).toBe(before.draws);
      } finally { on(); }
    }
  } finally { restore(); }
});
