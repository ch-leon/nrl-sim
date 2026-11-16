// tests/match/league/fatigue.test.ts — legs and the wrestle (BAK-208 §8, F):
// energy drains with running and contact and costs pace and contest odds;
// a held tackle is a wrestle whose length sets the play-the-ball; more men
// end it sooner; a carrier with fight left when the grip goes is through.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import {
  FATIGUE, LEGS_ENERGY, afterRun, drainRate, isLegs, legsSpeed, tiredness,
} from '../../../src/match/league/fatigue';
import {
  WRESTLE, drainOf, driveSpeed, fightOf, gripOf, holdOf, ruckTicks, wrestleTick, type WrestleState,
} from '../../../src/match/league/wrestle';
import { AVERAGE, OPEN, contestOdds, stepChance } from '../../../src/match/league/contest';
import type { TeamSheet } from '../../../src/sim/events';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(id: string, stats: Partial<{ speed: number; strength: number; stamina: number; handling: number; footyIQ: number }> = {}): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: 60,
    defense: 60,
    kicking: 60,
    fitness: 60,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, handling: 60, kicking: 60, footyIQ: 60, ...stats } })),
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

/** Matched carriers: only his legs change; the defender, geometry and roll stay fixed. */
class CarrierFatigueSim extends LiveSim {
  constructor(energy: number) {
    super(sheet('H'), sheet('A'), 1);
    this.tick = 100;
    this.attacking = 'home'; this.dir = 1;
    this.phase = { kind: 'play' };
    for (const p of this.players) {
      p.body.pos = { x: 90, y: 5 + p.slot * 7 };
      p.body.vel = { x: 0, y: 0 };
      p.lockUntil = 0; p.busyUntil = 0; p.cooldownUntil = 0;
    }
    const carrier = this.players[7]!, defender = this.players[16]!;
    carrier.energy = energy;
    carrier.body.pos = { x: 50, y: 34 };
    carrier.body.vel = { x: 5, y: 0 };
    carrier.catchTick = 0;
    defender.body.pos = { x: 51, y: 34 };
    this.ball = { kind: 'held', by: 7 };
  }
  contact(roll: number): string | undefined {
    this.rng.next = () => roll;
    this.contest(this.players[7]!, this.players[16]!, [this.players[16]!]);
    return this.tickEvents.find(e => e.kind === 'break-tackle' || e.kind === 'fend')?.kind;
  }
  stepAgainst(roll: number): boolean {
    this.rng.next = () => roll;
    this.pendingControl.home = { tick: this.tick, side: 'home', kind: 'step-up' };
    this.stepPlay();
    return this.tickEvents.some(e => e.kind === 'step');
  }
  runningSpeed(): number {
    const carrier = this.players[7]!;
    this.players[16]!.body.pos = { x: 90, y: 34 };
    carrier.body.vel = { x: 0, y: 0 };
    carrier.target = { x: 80, y: 34 };
    carrier.through = true;
    for (let i = 0; i < 40; i++) { this.tick++; this.move(); }
    return Math.hypot(carrier.body.vel.x, carrier.body.vel.y);
  }
}

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
    expect(legsSpeed(0.3)).toBe(FATIGUE.tiredSpeed);
    expect(legsSpeed(0.1)).toBe(FATIGUE.spentSpeed);
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
    expect(afterRun(1, 100, 1, 0.05, 'no')).toBeCloseTo(1 - 100 * FATIGUE.runCost);
    expect(afterRun(0.5, 0, 1, 1, 'walk')).toBeCloseTo(0.5 + FATIGUE.recoverWalk);
    expect(afterRun(0.5, 0, 1, 1, 'stop')).toBeCloseTo(0.5 + FATIGUE.recoverStop);
    expect(FATIGUE.recoverStop).toBeGreaterThan(FATIGUE.recoverWalk);
    expect(afterRun(0.001, 1000, 1, 0.05, 'no')).toBe(0);
    expect(afterRun(1, 0, 1, 10, 'stop')).toBe(1);
  });
  it('the lab legs presets: fresh, the last ten minutes (tired), cooked (spent)', () => {
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
    expect(fightOf(AVG, 1, 0.5)).toBeLessThan(WRESTLE.gripBase); // an even, fresh one-on-one is usually held
  });
  it('a second and third man drain it much faster; a tired tackler holds and grips less', () => {
    expect(drainOf([1, 1])).toBeGreaterThan(2 * drainOf([1]));
    expect(drainOf([1, 1, 1])).toBeGreaterThan(1.5 * drainOf([1, 1]));
    expect(drainOf([])).toBe(0);
    expect(holdOf(AVERAGE, 0.2)).toBeLessThan(holdOf(AVERAGE, 1));
    expect(holdOf({ ...AVERAGE, strength: 85 }, 1)).toBeGreaterThan(holdOf(AVERAGE, 1));
    expect(gripOf(AVERAGE, 1, true)).toBeCloseTo(WRESTLE.gripBase);
    expect(gripOf(AVERAGE, 1, false)).toBeCloseTo(WRESTLE.joinGrip);
    expect(gripOf(AVERAGE, 0.1, true)).toBeLessThan(WRESTLE.gripBase);
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
    expect(wrestleTick(w(99, 99), [0.3], 0.05, WRESTLE.wrestleMaxS)).toBe('held');
  });
  it('the wrestle sets the ruck: quick wrestle, quick play-the-ball; long one, the defence sets', () => {
    expect(ruckTicks(0.1)).toBe(WRESTLE.ruckQuickTicks);
    expect(ruckTicks(5)).toBe(WRESTLE.ruckSlowTicks);
    expect(ruckTicks(0.8)).toBeGreaterThan(ruckTicks(0.4));
    expect(ruckTicks(1.1)).toBeGreaterThan(ruckTicks(0.8));
  });
});

describe('legs and the wrestle in the live sim', () => {
  it('legs drain over a match, and a Stamina-80 squad outlasts a Stamina-40 one over ten minutes (#100)', () => {
    let home = 0;
    let away = 0;
    // The mechanic on the sheets as written: in a real match the gap between the sides counts for less (rating.spread, Phase 3).
    // Isolate fatigue: unequal Stamina also changes Balanced style fit now (#465).
    // The fit bonus has its own integration coverage in fit-bonus.test.ts.
    const restore = applyTuning({ 'rating.spread': 1, 'counters.fit.on': 0 });
    try {
      // Explicit historical seven-minute halves leave ten minutes of physical play to sample.
      // Four seeds: two left the mean within a few hundredths of the line whenever the seeds reshuffle.
      // Seeds 5–8 since the kick contests (#99) reshuffled every match: seeds 1–4 now leave the
      // Stamina-40 side at 0.83, 0.75, 0.84 and 0.79 (0.80; 0.76 before), seeds 5–8 at 0.75. On all
      // eight the Stamina-80 side is at least 0.11 ahead.
      // Seeds 1–16 since the weighted receiver (#649) reshuffled them again: one seed alone
      // runs 0.60–0.83 for the Stamina-40 side, so four seeds put the mean (0.78 on 5–8)
      // over the line by luck. Over 1–16 it is 0.75, the Stamina-80 side 0.11–0.16 ahead.
      for (let s = 1; s <= 16; s++) {
        const sim = new LiveSim(sheet('H', { stamina: 40 }), sheet('A', { stamina: 80 }), s, { length: { halves: 2, halfMinutes: 7 } });
        play(sim, 600);
        home += sim.energyOf('home') / 16;
        away += sim.energyOf('away') / 16;
      }
    } finally {
      restore();
    }
    // 0.75 until the deeper kick-off (#397), which left the Stamina-40 side at about 0.76 after ten minutes over seeds 1–4.
    expect(home).toBeLessThan(0.77);
    expect(away).toBeLessThan(1);
    expect(away).toBeGreaterThan(home + 0.08);
  });
  it('a carrier on spent legs is slower and busts, fends and steps less against a fresh defender', () => {
    // Whole matches with both sides spent also slow the retreating defence
    // (#625). Isolate carrier fatigue against the same fresh defender instead.
    const tally = (energy: number) => {
      const totals = { busts: 0, fends: 0, steps: 0 };
      // Uniform matched rolls cover the actual integration odds without seed luck.
      for (let i = 0; i < 500; i++) {
        const roll = (i + 0.5) / 500;
        const outcome = new CarrierFatigueSim(energy).contact(roll);
        if (outcome === 'break-tackle') totals.busts++;
        if (outcome === 'fend') totals.fends++;
        if (new CarrierFatigueSim(energy).stepAgainst(roll)) totals.steps++;
      }
      return { ...totals, top: new CarrierFatigueSim(energy).runningSpeed() };
    };
    const fresh = tally(1);
    const spent = tally(LEGS_ENERGY.spent);
    expect(fresh.top).toBeGreaterThan(0);
    expect(spent.top).toBeLessThanOrEqual(fresh.top * FATIGUE.spentSpeed + 1e-9);
    for (const action of ['busts', 'fends', 'steps'] as const) {
      expect(fresh[action], action).toBeGreaterThan(0);
      expect(spent[action], action).toBeLessThan(fresh[action]);
    }
  });
  it('a held tackle is a wrestle: the bar runs down, more men end it sooner, and the tackle comes when he is held', () => {
    const lengths: Record<number, number[]> = { 1: [], 2: [], 3: [] };
    let bad = 0;
    // Six seeds: an offload ends some wrestles too (Phase 3), and the sample needs 80 plain tackles.
    for (let s = 1; s <= 6; s++) {
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
    // Seeds 1–10 (was 1–6): with the last-tackle call (#650) seeds 1–6 held no late break.
    for (let s = 1; s <= 10; s++) es.push(...play(new LiveSim(sheet('H', { strength: 90, stamina: 85 }), sheet('A', { strength: 35 }), s), 150));
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
