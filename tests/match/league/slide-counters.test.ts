import { describe, expect, it } from 'vitest';
import { COUNTERS, slideCounter } from '../../../src/match/league/counters';
import { highBall, grubberRace } from '../../../src/match/league/kickContest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import { type AttackPreset, type DefencePreset } from '../../../src/match/league/presets';
import { type ContestMods } from '../../../src/match/league/contest';

class SlideSim extends LiveSim {
  constructor(attack: AttackPreset, defence: DefencePreset = 'slide') {
    super(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
  }
  fits(attack: number, defence: number) {
    this.planFit.home.attack = attack; this.planFit.away.defence = defence;
    return this;
  }
  contact(slot: number, afterOffload = false, support = true) {
    const carrier = this.players[slot]!;
    carrier.body.pos = { x: 50, y: slot === 1 ? 5 : 34 };
    this.offloadReceiver = afterOffload ? slot : null;
    const mods: ContestMods = {};
    this.applySlideContact(carrier, mods, support);
    return { mods, receiver: this.offloadReceiver };
  }
  targets(lastPlay = false) {
    this.lastPlay = lastPlay;
    this.phase = { kind: 'play' };
    this.attacking = 'home'; this.dir = 1; this.lineX = 60;
    this.ball = { kind: 'held', by: 5 };
    this.players[5]!.body.pos = { x: 40, y: 15 };
    for (const p of this.players.filter((p) => p.side === 'away')) p.body.pos.x = 80;
    for (const slot of [4, 5]) this.players[9 + slot]!.body.pos = { x: 43, y: 15 };
    this.assignTargets();
    return this.players.filter((p) => p.side === 'away').map((p) => ({ ...p.target }));
  }
  passRead(roll: number) {
    this.attacking = 'home'; this.dir = 1;
    const from = this.players[5]!, to = this.players[1]!, thief = this.players[10]!;
    for (const p of this.players) p.body.pos = { x: 80, y: 60 };
    from.body.pos = { x: 50, y: 34 }; to.body.pos = { x: 49, y: 5 };
    thief.body.pos = { x: 49.5, y: 20 }; thief.stats.footyIQ = 60;
    this.rng.next = () => roll;
    this.pass(from, to);
    return this.ball.kind === 'flight' ? this.ball.receiver : null;
  }
  endCarry(action: 'kick' | 'stoppage' | 'pass' | 'turnover') {
    this.offloadReceiver = 7;
    if (action === 'kick') {
      this.pendingKick = { at: this.tick, kicker: 5, to: { x: 80, y: 34 }, receiver: 9, peak: 20, kickoff: false, kind: 'long' };
      this.launchPendingKick();
    } else if (action === 'stoppage') {
      this.phase = { kind: 'full-time' };
      this.watchLineBreak(null);
    } else if (action === 'pass') this.pass(this.players[7]!, this.players[6]!);
    else this.turnover();
    return this.offloadReceiver;
  }
  cover() { return this.kickCover('home'); }
}

function tuned<T>(on: number, fn: () => T): T {
  const restore = applyTuning({ 'counters.slide.on': on });
  try { return fn(); } finally { restore(); }
}

describe('dormant Slide counters', () => {
  it('ships off, gates every cell and scales by both fits', () => {
    expect(COUNTERS.slide.on).toBe(0);
    for (const attack of ['grind', 'expansive', 'kick-chase', 'all-out'] as const) {
      expect(tuned(0, () => slideCounter(attack, 'slide', 1.5, 1.5))).toBe(0);
      tuned(1, () => {
        expect(slideCounter(attack, 'slide', 1, 1.5)).toBeCloseTo(3 * slideCounter(attack, 'slide', 1, 0.5));
        expect(slideCounter(attack, 'slide', 0.5, 1)).toBeCloseTo(slideCounter(attack, 'slide', 1, 0.5));
        expect(slideCounter(attack, 'slide', 0, 1.5)).toBe(0);
        expect(slideCounter(attack, 'rush', 1.5, 1.5)).toBe(0);
        expect(slideCounter(attack, 'compressed', 1.5, 1.5)).toBe(0);
      });
    }
    expect(tuned(1, () => slideCounter('balanced', 'slide', 1.5, 1.5))).toBe(0);
  });

  it('slides lanes farther with the ball and reads a wide cut-out on the existing roll', () => {
    const off = tuned(0, () => new SlideSim('expansive').targets());
    const on = tuned(1, () => new SlideSim('expansive').targets());
    expect(on[2]!.y).toBeLessThan(off[2]!.y);
    expect(tuned(0, () => new SlideSim('expansive').passRead(0.15))).toBe(1);
    expect(tuned(1, () => new SlideSim('expansive').passRead(0.15))).toBe(10);
    expect(tuned(1, () => new SlideSim('balanced').passRead(0.15))).toBe(1);
    expect(tuned(0, () => new SlideSim('expansive').contact(1).mods)).toEqual({});
    expect(tuned(1, () => new SlideSim('expansive').contact(1).mods.edge)).toBeLessThan(0);
    expect(tuned(1, () => new SlideSim('expansive').contact(7).mods)).toEqual({});
  });

  it('holds fullback and wingers deeper and improves bomb catches and grubber races', () => {
    const off = tuned(0, () => new SlideSim('kick-chase').targets(true));
    const on = tuned(1, () => new SlideSim('kick-chase').targets(true));
    for (const slot of [0, 1, 2]) expect(on[slot]!.x).toBeGreaterThan(off[slot]!.x);
    expect(tuned(1, () => new SlideSim('kick-chase').targets())).toEqual(tuned(0, () => new SlideSim('kick-chase').targets()));
    for (const enabled of [0, 1]) tuned(enabled, () => {
      const cover = new SlideSim('kick-chase').cover();
      const bomb = highBall(60, 60, 20, true, 1, cover);
      const old = highBall(60, 60, 20, true);
      const race = grubberRace(1, 1, true, cover);
      if (enabled) {
        expect(bomb.won).toBeLessThan(old.won);
        expect(bomb.spill).toBeLessThan(old.spill);
        expect(race).toBeLessThan(grubberRace(1, 1, true));
      } else {
        expect(bomb).toEqual(old);
        expect(race).toBe(grubberRace(1, 1, true));
      }
      expect(new SlideSim('balanced').cover()).toBe(0);
      expect(new SlideSim('expansive').cover()).toBe(0);
    });
  });

  it('opens the inside gap and pack offloads only for Tight with support', () => {
    expect(tuned(0, () => new SlideSim('grind').contact(7).mods)).toEqual({});
    const mods = tuned(1, () => new SlideSim('grind').contact(7).mods);
    expect(mods.offload).toBeGreaterThan(0); expect(mods.broken).toBeGreaterThan(0);
    expect(tuned(1, () => new SlideSim('grind').contact(1).mods)).toEqual({});
    expect(tuned(1, () => new SlideSim('grind').contact(7, false, false).mods.offload)).toBeUndefined();
  });

  it('helps All-out only at the offload receiver’s first contact', () => {
    expect(tuned(0, () => new SlideSim('all-out').contact(7, true).mods)).toEqual({});
    expect(tuned(1, () => new SlideSim('all-out').contact(7).mods)).toEqual({});
    const result = tuned(1, () => new SlideSim('all-out').contact(7, true));
    expect(result.mods.broken).toBeGreaterThan(0); expect(result.receiver).toBeNull();
    expect(tuned(1, () => new SlideSim('balanced').contact(7, true).mods)).toEqual({});
  });

  it('ends the second-phase advantage at a kick, stoppage, ordinary pass or turnover', () => tuned(1, () => {
    for (const action of ['kick', 'stoppage', 'pass', 'turnover'] as const) {
      expect(new SlideSim('all-out').endCarry(action)).toBeNull();
    }
  }));

  it('a fit-0.5 Slide changes the live mechanics less than a fit-1.5 Slide', () => tuned(1, () => {
    const contact = (attack: AttackPreset, fit: number, slot: number, second = false) =>
      new SlideSim(attack).fits(1, fit).contact(slot, second).mods;
    expect(contact('grind', 0.5, 7).offload).toBeLessThan(contact('grind', 1.5, 7).offload!);
    expect(contact('expansive', 0.5, 1).edge).toBeGreaterThan(contact('expansive', 1.5, 1).edge!);
    expect(contact('all-out', 0.5, 7, true).broken).toBeLessThan(contact('all-out', 1.5, 7, true).broken!);
    const cover = (fit: number) => new SlideSim('kick-chase').fits(1, fit).cover();
    expect(highBall(60, 60, 20, true, 1, cover(0.5)).won).toBeGreaterThan(highBall(60, 60, 20, true, 1, cover(1.5)).won);
    expect(grubberRace(1, 1, true, cover(0.5))).toBeGreaterThan(grubberRace(1, 1, true, cover(1.5)));
  }));

  it('Balanced replays exactly with Slide on at non-neutral fit', () => {
    const events = (on: number) => tuned(on, () => {
      const sim = new LiveSim(sideSheet('H', { rating: 80 }), sideSheet('A', { rating: 35 }), 3, { length: { halves: 2, halfMinutes: 0.2 } });
      const result = [];
      while (!sim.finished) { sim.step(); result.push(...sim.tickEvents); }
      return result;
    });
    expect(events(1)).toEqual(events(0));
  });
});
