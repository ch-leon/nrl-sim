import { describe, expect, it } from 'vitest';
import { COUNTERS, compressedCounter } from '../../../src/match/league/counters';
import { BASE, OPEN, compressedContact, contestOdds, type ContestMods } from '../../../src/match/league/contest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';

function tuned<T>(on: number, fn: () => T): T {
  const restore = applyTuning({ 'counters.compressed.on': on, 'counters.tight.on': 1,
    'counters.fit.on': 1, 'counters.slide.on': 1, 'counters.rush.on': 1 });
  try { return fn(); } finally { restore(); }
}
class CompressedSim extends LiveSim {
  constructor(attack: AttackPreset = 'grind', defence: DefencePreset = 'compressed') {
    super(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
  }
  fits(a: number, d: number) { this.planFit.home.attack = a; this.planFit.away.defence = d; return this; }
  contact(slot = 7, y = 34, contactD = 60, speed = 60, support = true) {
    const c = this.players[slot]!; c.body.pos = { x: 50, y }; c.stats.speed = speed;
    const t = this.players[16]!; t.body.pos = { x: 51, y };
    t.stats.strength = contactD; t.stats.footyIQ = contactD;
    const mods: ContestMods = {};
    this.applyCompressedContact(c, [t], mods, support);
    return mods;
  }
  commits(y = 34, far = false) {
    this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!; c.body.pos = { x: 50, y };
    const defs = this.players.filter((p) => p.side === 'away');
    defs.forEach((p, i) => { p.body.pos = { x: far ? 60 + i * 3 : 51 + i * 2.25, y }; });
    return this.committed(c, defs).length;
  }
  targets() {
    this.phase = { kind: 'play' }; this.attacking = 'home'; this.dir = 1;
    this.lineX = 60; this.ball = { kind: 'held', by: 5 };
    this.players[5]!.body.pos = { x: 40, y: 34 };
    for (const p of this.players.filter((p) => p.side === 'away')) p.body.pos.x = 80;
    this.assignTargets();
    return this.players.filter((p) => p.side === 'away').map((p) => ({ ...p.target }));
  }
  resolve(roll: number) {
    this.attacking = 'home'; this.dir = 1;
    const c = this.players[7]!, t = this.players[16]!;
    for (const p of this.players) p.body.pos = { x: 90, y: 60 };
    c.body.pos = { x: 50, y: 34 }; t.body.pos = { x: 51, y: 34 };
    this.players[5]!.body.pos = { x: 49, y: 35 };
    let draws = 0;
    this.rng.next = () => { draws++; return roll; };
    this.contest(c, t, [t]);
    return { draws, events: this.tickEvents.map((e) => e.kind) };
  }
}

describe('dormant Compressed counters', () => {
  it('ships off, gates other cells and defences, and scales both fits', () => {
    expect(COUNTERS.compressed.on).toBe(0);
    for (const attack of ['grind', 'expansive'] as const) {
      expect(tuned(0, () => compressedCounter(attack, 'compressed', 1.5, 1.5))).toBe(0);
      tuned(1, () => {
        expect(compressedCounter(attack, 'compressed', 1, 1.5)).toBeCloseTo(3 * compressedCounter(attack, 'compressed', 1, 0.5));
        expect(compressedCounter(attack, 'compressed', 0.5, 1)).toBeCloseTo(compressedCounter(attack, 'compressed', 1, 0.5));
        expect(compressedCounter(attack, 'compressed', 0, 1)).toBe(0);
        for (const defence of ['slide', 'rush'] as const) expect(compressedCounter(attack, defence, 1, 1)).toBe(0);
      });
    }
    tuned(1, () => {
      for (const attack of ['balanced', 'kick-chase', 'all-out'] as const) expect(compressedCounter(attack, 'compressed', 1, 1)).toBe(0);
    });
  });
  it('commits one extra real defender only against Tight in the middle', () => {
    expect(tuned(1, () => new CompressedSim().commits())).toBe(tuned(0, () => new CompressedSim().commits()) + 1);
    expect(tuned(1, () => new CompressedSim().commits(34, true))).toBe(tuned(0, () => new CompressedSim().commits(34, true)));
    for (const y of [5, 63]) expect(tuned(1, () => new CompressedSim().commits(y))).toBe(tuned(0, () => new CompressedSim().commits(y)));
    for (const attack of ['balanced', 'expansive', 'kick-chase', 'all-out'] as const) {
      expect(tuned(1, () => new CompressedSim(attack).commits())).toBe(tuned(0, () => new CompressedSim(attack).commits()));
    }
    expect(tuned(1, () => new CompressedSim().fits(0, 1).commits())).toBe(tuned(0, () => new CompressedSim().commits()));
  });
  it('reduces middle busts and supported offloads with Contact D and fit', () => {
    expect(tuned(0, () => new CompressedSim().contact())).toEqual({});
    tuned(1, () => {
      const low = new CompressedSim().contact(7, 34, 40), high = new CompressedSim().contact(7, 34, 80);
      expect(high.broken).toBeLessThan(low.broken!); expect(high.offload).toBeLessThan(low.offload!);
      expect(new CompressedSim().fits(1, 1.5).contact().broken).toBeLessThan(new CompressedSim().fits(1, 0.5).contact().broken!);
      expect(new CompressedSim().contact(7, 5)).toEqual({});
      expect(new CompressedSim().contact(7, 34, 60, 60, false).offload).toBeUndefined();
      const sit = { ...OPEN, support: true };
      const odds = contestOdds(0.5, sit, compressedContact(0.04, 80, true));
      expect(odds.broken).toBeLessThan(BASE.broken); expect(odds.offload).toBeLessThan(BASE.offload);
      expect(contestOdds(0.5, OPEN, compressedContact(0.04, 80, false)).offload).toBe(0);
    });
  });
  it('pulls the line inward and helps only edge backs, more for speed and fit', () => {
    const off = tuned(0, () => new CompressedSim('expansive').targets());
    const on = tuned(1, () => new CompressedSim('expansive').targets());
    expect(on[1]!.y).toBeGreaterThan(off[1]!.y); expect(on[2]!.y).toBeLessThan(off[2]!.y);
    expect(tuned(0, () => new CompressedSim('expansive').contact(1, 5))).toEqual({});
    tuned(1, () => {
      const sim = new CompressedSim('expansive');
      expect(sim.contact(1, 5, 60, 80).broken).toBeGreaterThan(sim.contact(1, 5, 60, 40).broken!);
      expect(sim.fits(1, 1.5).contact(1, 5).broken).toBeGreaterThan(sim.fits(1, 0.5).contact(1, 5).broken!);
      expect(sim.contact(1, 34)).toEqual({}); expect(sim.contact(7, 5)).toEqual({});
      expect(new CompressedSim('expansive', 'slide').contact(1, 5)).toEqual({});
    });
    for (const attack of ['balanced', 'kick-chase', 'all-out'] as const) {
      expect(tuned(1, () => new CompressedSim(attack).targets())).toEqual(tuned(0, () => new CompressedSim(attack).targets()));
    }
  });
  it('changes contact on the existing roll without adding a draw', () => {
    const off = tuned(0, () => new CompressedSim().resolve(0.08));
    const on = tuned(1, () => new CompressedSim().resolve(0.08));
    expect(off.events).toContain('break-tackle'); expect(on.events).not.toContain('break-tackle');
    expect(off.draws).toBe(1); expect(on.draws).toBe(off.draws);
  });
  it('neutral attacks replay exactly with Compressed enabled and earlier counters on', () => {
    for (const attack of ['balanced', 'kick-chase', 'all-out'] as const) {
      const replay = (on: number) => tuned(on, () => {
        const sim = new LiveSim(sideSheet('H', { rating: 80, tactics: { attack } }),
          sideSheet('A', { rating: 35, tactics: { defence: 'compressed' } }), 7,
          { length: { halves: 2, halfMinutes: 0.2 } });
        const events = [];
        while (!sim.finished) { sim.step(); events.push(...sim.tickEvents); }
        return events;
      });
      expect(replay(1)).toEqual(replay(0));
    }
  });
});
