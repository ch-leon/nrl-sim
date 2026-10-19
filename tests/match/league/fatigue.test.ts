// tests/match/league/fatigue.test.ts — legs and the wrestle (BAK-208 §8, F):
// energy drains with running and contact and costs pace and contest odds;
// a held tackle is a wrestle whose length sets the play-the-ball; more men
// end it sooner; a carrier with fight left when the grip goes is through.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import {
  LEGS_ENERGY, RECOVER_STOP, RECOVER_WALK, RUN_COST, SPENT_SPEED, TIRED_SPEED, afterRun, drainRate, isLegs, legsSpeed, tiredness,
} from '../../../src/match/league/fatigue';
import {
  GRIP_BASE, JOIN_GRIP, RUCK_QUICK_TICKS, RUCK_SLOW_TICKS, WRESTLE_MAX_S, drainOf, driveSpeed, fightOf, gripOf, holdOf, ruckTicks, wrestleTick, type WrestleState,
} from '../../../src/match/league/wrestle';
import { AVERAGE, OPEN, contestOdds, stepChance } from '../../../src/match/league/contest';
import type { TeamSheet } from '../../../src/sim/events';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(id: string, stats: Partial<{ speed: number; strength: number; stamina: number; skill: number; footyIQ: number }> = {}): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: 60,
    defense: 60,
    kicking: 60,
    fitness: 60,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60, ...stats } })),
  };
}
function play(sim: LiveSim, seconds: number, onTick?: (s: Snapshot) => void): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < seconds * 20; i++) {
    sim.step();
    const s = sim.snapshot();
    out.push(...s.events);
    onTick?.(s);
  }
  return out;
}
const AVG = { ...AVERAGE, stamina: 50 };

describe('legs (pure)', () => {
  it('Stamina sets the drain rate; a Workhorse drains slower', () => {
    expect(drainRate(50)).toBeCloseTo(1);
    expect(drainRate(80)).toBeLessThan(drainRate(50));
    expect(drainRate(20)).toBeGreaterThan(drainRate(50));
    expect(drainRate(100)).toBeGreaterThanOrEqual(0.6);
    expect(drainRate(0)).toBeLessThanOrEqual(1.4);
    expect(drainRate(50, [{ id: 'workhorse', level: 1 }])).toBeCloseTo(0.9);
    expect(drainRate(50, [{ id: 'workhorse', level: 3 }])).toBeLessThan(drainRate(50, [{ id: 'workhorse', level: 1 }]));
  });
  it('below 40% he is tired, below 20% spent: pace −10% / −20%, contest −5% / −10%', () => {
    expect(tiredness(1)).toBe(0);
    expect(tiredness(0.4)).toBe(0);
    expect(tiredness(0.39)).toBe(0.5);
    expect(tiredness(0.19)).toBe(1);
    expect(legsSpeed(0.8)).toBe(1);
    expect(legsSpeed(0.3)).toBe(TIRED_SPEED);
    expect(legsSpeed(0.1)).toBe(SPENT_SPEED);
    const fresh = contestOdds(0.5, { ...OPEN, support: true });
    const tired = contestOdds(0.5, { ...OPEN, support: true, carrierFatigue: tiredness(0.3) });
    const spent = contestOdds(0.5, { ...OPEN, support: true, carrierFatigue: tiredness(0.1) });
    expect(fresh.broken - tired.broken).toBeCloseTo(0.05);
    expect(fresh.broken - spent.broken).toBeCloseTo(0.1);
    expect(spent.fend).toBeLessThan(tired.fend);
    expect(contestOdds(0.5, { ...OPEN, tacklerFatigue: 1 })['big-hit']).toBeLessThan(fresh['big-hit']);
    expect(stepChance(AVERAGE, AVERAGE, { ...OPEN, carrierFatigue: 1 })).toBeLessThan(stepChance(AVERAGE, AVERAGE, OPEN));
  });
  it('running drains, standing and stoppages bring a little back, always within 0..1', () => {
    expect(afterRun(1, 100, 1, 0.05, 'no')).toBeCloseTo(1 - 100 * RUN_COST);
    expect(afterRun(0.5, 0, 1, 1, 'walk')).toBeCloseTo(0.5 + RECOVER_WALK);
    expect(afterRun(0.5, 0, 1, 1, 'stop')).toBeCloseTo(0.5 + RECOVER_STOP);
    expect(RECOVER_STOP).toBeGreaterThan(RECOVER_WALK);
    expect(afterRun(0.001, 1000, 1, 0.05, 'no')).toBe(0);
    expect(afterRun(1, 0, 1, 10, 'stop')).toBe(1);
  });
  it('the lab legs presets: fresh, the last ten minutes (tired), out on their feet (spent)', () => {
    expect(LEGS_ENERGY.fresh).toBe(1);
    expect(tiredness(LEGS_ENERGY.late)).toBe(0.5);
    expect(tiredness(LEGS_ENERGY.spent)).toBe(1);
    expect(isLegs('late')).toBe(true);
    expect(isLegs('knackered')).toBe(false);
  });
});

describe('the wrestle (pure)', () => {
  it('fight comes from Strength and Stamina, less the legs he has lost, spread by the roll', () => {
    expect(fightOf({ ...AVG, strength: 85 }, 1, 0.5)).toBeGreaterThan(fightOf(AVG, 1, 0.5));
    expect(fightOf({ ...AVG, stamina: 85 }, 1, 0.5)).toBeGreaterThan(fightOf(AVG, 1, 0.5));
    expect(fightOf(AVG, 0.2, 0.5)).toBeLessThan(fightOf(AVG, 1, 0.5));
    expect(fightOf(AVG, 1, 0.99)).toBeGreaterThan(fightOf(AVG, 1, 0));
    expect(fightOf(AVG, 1, 0.5)).toBeLessThan(GRIP_BASE); // an even, fresh one-on-one is usually held
  });
  it('a second and third man drain it much faster; a tired tackler holds and grips less', () => {
    expect(drainOf([1, 1])).toBeGreaterThan(2 * drainOf([1]));
    expect(drainOf([1, 1, 1])).toBeGreaterThan(1.5 * drainOf([1, 1]));
    expect(drainOf([])).toBe(0);
    expect(holdOf(AVERAGE, 0.2)).toBeLessThan(holdOf(AVERAGE, 1));
    expect(holdOf({ ...AVERAGE, strength: 85 }, 1)).toBeGreaterThan(holdOf(AVERAGE, 1));
    expect(gripOf(AVERAGE, 1, true)).toBeCloseTo(GRIP_BASE);
    expect(gripOf(AVERAGE, 1, false)).toBeCloseTo(JOIN_GRIP);
    expect(gripOf(AVERAGE, 0.1, true)).toBeLessThan(GRIP_BASE);
  });
  it('he drives on while the fight lasts, less with more men on him', () => {
    expect(driveSpeed(1, 1)).toBeGreaterThan(driveSpeed(0.3, 1));
    expect(driveSpeed(1, 2)).toBeLessThan(driveSpeed(1, 1));
    expect(driveSpeed(0, 1)).toBe(0);
  });
  it('held when the fight is gone, free when the grip goes first, never longer than the cap', () => {
    const w = (fight: number, grip: number): WrestleState => ({ men: [0], fight, fight0: fight, grip, t0: 0, metres: 0 });
    const held = w(0.3, 2);
    let end = null;
    for (let i = 0; i < 40 && !end; i++) end = wrestleTick(held, [1], 0.05, i * 0.05);
    expect(end).toBe('held');
    const free = w(2, 0.3);
    end = null;
    for (let i = 0; i < 40 && !end; i++) end = wrestleTick(free, [1], 0.05, i * 0.05);
    expect(end).toBe('free');
    expect(free.fight).toBeGreaterThan(0);
    expect(wrestleTick(w(99, 99), [0.3], 0.05, WRESTLE_MAX_S)).toBe('held');
  });
  it('the wrestle sets the ruck: quick wrestle, quick play-the-ball; long one, the defence sets', () => {
    expect(ruckTicks(0.1)).toBe(RUCK_QUICK_TICKS);
    expect(ruckTicks(5)).toBe(RUCK_SLOW_TICKS);
    expect(ruckTicks(0.8)).toBeGreaterThan(ruckTicks(0.4));
    expect(ruckTicks(1.1)).toBeGreaterThan(ruckTicks(0.8));
  });
});

describe('legs and the wrestle in the live sim', () => {
  it('legs drain over a match, and a Stamina-80 squad outlasts a Stamina-40 one over ten minutes (#100)', () => {
    let home = 0;
    let away = 0;
    for (let s = 1; s <= 2; s++) {
      const sim = new LiveSim(sheet('H', { stamina: 40 }), sheet('A', { stamina: 80 }), s);
      play(sim, 600);
      home += sim.energyOf('home') / 2;
      away += sim.energyOf('away') / 2;
    }
    expect(home).toBeLessThan(0.75);
    expect(away).toBeLessThan(1);
    expect(away).toBeGreaterThan(home + 0.08);
  });
  it('a side on spent legs is slower and busts, fends and steps less', () => {
    const tally = (energy: number): { breaks: number; tackles: number; top: number } => {
      let breaks = 0;
      let tackles = 0;
      let top = 0;
      for (let s = 1; s <= 8; s++) {
        const es = play(new LiveSim(sheet('H'), sheet('A'), s, { energy }), 150, (snap) => {
          for (const p of snap.players) top = Math.max(top, p.speed);
        });
        breaks += es.filter((e) => e.kind === 'break-tackle' || e.kind === 'fend' || e.kind === 'step').length;
        tackles += es.filter((e) => e.kind === 'tackle' || e.kind === 'big-hit').length;
      }
      return { breaks, tackles, top };
    };
    const fresh = tally(1);
    const spent = tally(LEGS_ENERGY.spent);
    expect(spent.top).toBeLessThan(fresh.top * 0.9);
    expect(spent.breaks / spent.tackles).toBeLessThan(fresh.breaks / fresh.tackles);
  });
  it('a held tackle is a wrestle: the bar runs down, more men end it sooner, and the tackle comes when he is held', () => {
    const lengths: Record<number, number[]> = { 1: [], 2: [], 3: [] };
    let bad = 0;
    for (let s = 1; s <= 4; s++) {
      let start = -1;
      let last: Snapshot['wrestle'];
      play(new LiveSim(sheet('H'), sheet('A'), s), 150, (snap) => {
        const w = snap.wrestle;
        if (w && !last) start = snap.tick;
        if (w && last && w.fight > last.fight + 1e-9) bad++;
        const held = snap.events.find((e) => e.kind === 'tackle');
        if (held) {
          if (!last) bad++; // every plain tackle ends a wrestle
          else lengths[last.men]!.push(snap.tick - start);
        }
        last = w;
      });
    }
    expect(bad).toBe(0);
    const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    expect(lengths[1]!.length + lengths[2]!.length + lengths[3]!.length).toBeGreaterThan(80);
    expect(lengths[2]!.length).toBeGreaterThan(lengths[1]!.length); // help usually arrives
    expect(avg(lengths[2]!)).toBeLessThan(avg(lengths[1]!));
  });
  it('a strong carrier against weak tacklers sometimes breaks free; quick and slow play-the-balls are announced', () => {
    const es: SimEvent[] = [];
    for (let s = 1; s <= 6; s++) es.push(...play(new LiveSim(sheet('H', { strength: 90, stamina: 85 }), sheet('A', { strength: 35 }), s), 150));
    const late = es.filter((e) => e.kind === 'break-tackle' && e.detail === 'wrestle');
    expect(late.length).toBeGreaterThan(0);
    expect(late.every((e) => e.side === 'home' || e.side === 'away')).toBe(true);
    expect(late.filter((e) => e.side === 'home').length).toBeGreaterThan(late.filter((e) => e.side === 'away').length);
    expect(es.some((e) => e.kind === 'quick-ptb')).toBe(true);
    expect(es.some((e) => e.kind === 'slow-ptb')).toBe(true);
  });
  it('players starting on tired legs are announced once as they go below 20%', () => {
    const es = play(new LiveSim(sheet('H', { stamina: 20 }), sheet('A', { stamina: 20 }), 2, { energy: 0.24 }), 120);
    const gassed = es.filter((e) => e.kind === 'gassed');
    expect(gassed.length).toBeGreaterThan(0);
    const names = gassed.map((e) => e.player);
    expect(new Set(names).size).toBe(names.length);
  });
  it('the label shows each side’s legs', () => {
    const sim = new LiveSim(sheet('H'), sheet('A'), 1, { energy: LEGS_ENERGY.late });
    expect(sim.snapshot().label).toContain('legs 38/38%');
  });
});
