import { describe, expect, it } from 'vitest';
import { BASE, OPEN, RACE, edgeRace, stepChance, type ContestMods } from '../../../src/match/league/contest';
import { COUNTERS, slideCounter } from '../../../src/match/league/counters';
import { LiveSim } from '../../../src/match/league/live';
import { MID_Y } from '../../../src/match/core/field';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning, type Overrides } from '../../../src/match/league/tuning';
import type { AttackPreset, DefencePreset } from '../../../src/match/league/presets';

function tuned<T>(over: Overrides, fn: () => T): T {
  const restore = applyTuning(over);
  try { return fn(); } finally { restore(); }
}
const ON = { 'race.on': 1, 'race.perPoint': 0.008, 'race.cap': 0.12, 'race.fendShare': 0.5, 'race.wide': 1, 'race.backsOnly': 1, 'race.single': 1 };

class RaceSim extends LiveSim {
  constructor(attack: AttackPreset = 'expansive', defence: DefencePreset = 'rush') {
    super(sideSheet('H', { rating: 60, tactics: { attack } }), sideSheet('A', { rating: 60, tactics: { defence } }), 1);
  }
  /** One contact: home slot `slot` at `y` with Speed `cs` against away slot 9+`slot` with Speed `ts`. */
  race(slot: number, y: number, cs: number, ts: number, defenders = 1) {
    const c = this.players[slot]!, t = this.players[9 + slot]!;
    c.body.pos = { x: 50, y }; c.stats.speed = cs; t.stats.speed = ts;
    const mods: ContestMods = {};
    this.applyEdgeRace(c, t, defenders, mods);
    return mods;
  }
}

describe('the edge race (#322)', () => {
  it('is zero at equal Speed, signed by the Speed gap, capped, with a fend share, and off by the switch', () => {
    tuned(ON, () => {
      expect(edgeRace(60, 60)).toEqual({ broken: 0, fend: 0 });
      expect(edgeRace(70, 60).broken).toBeCloseTo(0.08);
      expect(edgeRace(70, 60).fend).toBeCloseTo(0.04);
      expect(edgeRace(50, 60).broken).toBeCloseTo(-0.08);
      expect(edgeRace(99, 40).broken).toBe(RACE.cap);
      expect(edgeRace(40, 99).broken).toBe(-RACE.cap);
    });
    tuned({ ...ON, 'race.on': 0 }, () => expect(edgeRace(80, 40)).toEqual({ broken: 0, fend: 0 }));
  });
  it('races only an outside back carrying wide, one-on-one', () => {
    const wide = MID_Y - 30;
    tuned(ON, () => {
      const sim = new RaceSim();
      expect(sim.race(1, wide, 75, 60).broken).toBeCloseTo(0.12);
      expect(sim.race(1, wide, 60, 75).broken).toBeCloseTo(-0.12);
      expect(sim.race(1, wide, 60, 60)).toEqual({});
      expect(sim.race(1, MID_Y, 75, 60)).toEqual({}); // the middle
      expect(sim.race(1, wide, 75, 60, 2)).toEqual({}); // two at the tackle
      expect(sim.race(7, wide, 75, 60)).toEqual({}); // a forward
    });
    tuned({ ...ON, 'race.wide': 0 }, () => expect(new RaceSim().race(1, MID_Y, 75, 60).broken).toBeCloseTo(0.12));
    tuned({ ...ON, 'race.backsOnly': 0 }, () => expect(new RaceSim().race(7, MID_Y - 30, 75, 60).broken).toBeCloseTo(0.12));
    tuned({ ...ON, 'race.single': 0 }, () => expect(new RaceSim().race(1, MID_Y - 30, 75, 60, 2).broken).toBeCloseTo(0.12));
    tuned({ ...ON, 'race.on': 0 }, () => expect(new RaceSim().race(1, wide, 80, 40)).toEqual({}));
  });
  it('does not care which attack plan he plays: a fast Balanced back races too', () => {
    tuned(ON, () => expect(new RaceSim('balanced').race(1, MID_Y - 30, 70, 60).broken).toBeCloseTo(0.08));
  });
  it('names the step slope without changing the step', () => {
    expect(BASE.stepSlope).toBe(200);
    const atk = { strength: 50, speed: 80, skill: 70, footyIQ: 50 }, def = { strength: 50, speed: 50, skill: 50, footyIQ: 50 };
    expect(stepChance(atk, def, OPEN)).toBeCloseTo(0.1 + 25 / 200);
    tuned({ 'contest.stepSlope': 100 }, () => expect(stepChance(atk, def, OPEN)).toBeCloseTo(0.1 + 25 / 100));
  });
});

describe('the signed Slide v Expansive response (#322)', () => {
  const cell = COUNTERS.slide.expansive;
  const response = COUNTERS.slide.expansiveFit + COUNTERS.fit.counterResponse;
  it('leaves neutral fits and the full-fit acceptance cell where they were', () => {
    const was = [slideCounter('expansive', 'slide', 1, 1), slideCounter('expansive', 'slide', 0.5, 1.5)];
    tuned({ 'counters.slide.expansiveSigned': 1 }, () => {
      expect(slideCounter('expansive', 'slide', 1, 1)).toBeCloseTo(was[0]!);
      expect(slideCounter('expansive', 'slide', 0.5, 1.5)).toBeCloseTo(was[1]!);
    });
  });
  it('stops paying a slower Slide line for the attack being quicker', () => {
    const before = slideCounter('expansive', 'slide', 1.3, 1);
    expect(before).toBeCloseTo(cell * 1.3 * (1 + response * 0.3));
    tuned({ 'counters.slide.expansiveSigned': 1 }, () => {
      expect(slideCounter('expansive', 'slide', 1.3, 1)).toBeCloseTo(cell * 1.3);
      expect(slideCounter('expansive', 'slide', 1.3, 1)).toBeLessThan(before);
      // A Slide line that out-fits the backs still gets the full response.
      expect(slideCounter('expansive', 'slide', 1, 1.3)).toBeCloseTo(cell * 1.3 * (1 + response * 0.3));
      // The other cells are untouched.
      expect(slideCounter('kick-chase', 'slide', 1.3, 1)).toBeCloseTo(tuned({ 'counters.slide.expansiveSigned': 0 }, () => slideCounter('kick-chase', 'slide', 1.3, 1)));
    });
  });
  it('the by-defence variant scales the cell by defence ÷ attack fit', () => {
    tuned({ 'counters.slide.expansiveSigned': 1, 'counters.slide.expansiveByDefence': 1 }, () => {
      expect(slideCounter('expansive', 'slide', 1, 1)).toBeCloseTo(cell);
      expect(slideCounter('expansive', 'slide', 1.25, 1)).toBeCloseTo(cell * 0.8);
      expect(slideCounter('expansive', 'slide', 1, 1.25)).toBeCloseTo(cell * 1.25 * (1 + response * 0.25));
      expect(slideCounter('expansive', 'slide', 0, 1)).toBe(0);
    });
  });
});
