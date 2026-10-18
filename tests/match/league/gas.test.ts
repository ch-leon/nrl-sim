// tests/match/league/gas.test.ts — sprint and gas (BAK-208 §8.2, F2): the tank
// by Stamina, blowing and recovering, legs as the ceiling, the flier who makes
// the break but can't finish it, and the sim sprinting only when it matters.
import { describe, it, expect } from 'vitest';
import { GAS, canSprint, paceMult, refillSeconds, runCostMult, stepGas, tankSeconds, type GasState } from '../../../src/match/league/gas';
import { LiveSim, LIVE } from '../../../src/match/league/live';
import { FATIGUE } from '../../../src/match/league/fatigue';
import { arrive, integrate, makeBody, maxSpeedFor } from '../../../src/match/core/body';
import { TICK_S } from '../../../src/match/core/engine';
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
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60, ...stats } })),
  };
}

/**
 * A straight chase with the sim's own movement and gas: a carrier `lead` metres
 * clear, both going flat out. Returns how far the carrier got before he was
 * caught (within tackle reach), or null if he was still clear after `maxM`.
 */
function chase(carrier: { speed: number; stamina: number }, chaser: { speed: number; stamina: number }, lead: number, maxM: number): number | null {
  const c = makeBody({ x: lead, y: 30 }, maxSpeedFor(carrier.speed), { x: 1, y: 0 });
  const d = makeBody({ x: 0, y: 30 }, maxSpeedFor(chaser.speed), { x: 1, y: 0 });
  const cruise = (b: typeof c, carry: number): void => {
    b.vel = { x: b.maxSpeed * GAS.cruise * carry, y: 0 };
  };
  cruise(c, LIVE.carrySpeed);
  cruise(d, 1);
  const gc: GasState = { gas: 1, blown: false };
  const gd: GasState = { gas: 1, blown: false };
  const tc = tankSeconds(carrier.stamina);
  const td = tankSeconds(chaser.stamina);
  for (let t = 0; t < 30 / TICK_S; t++) {
    for (const [b, g, tank, refill, carry] of [
      [c, gc, tc, refillSeconds(carrier.stamina), LIVE.carrySpeed],
      [d, gd, td, refillSeconds(chaser.stamina), 1],
    ] as const) {
      const sprinting = canSprint(g);
      arrive(b, { x: b.pos.x + 50, y: 30 }, TICK_S, { through: true, maxSpeed: b.maxSpeed * paceMult(g, sprinting) * carry });
      integrate(b, TICK_S);
      stepGas(g, sprinting, false, 1, tank, refill, TICK_S);
    }
    if (c.pos.x - d.pos.x <= LIVE.tackleReach) return c.pos.x - lead;
    if (c.pos.x - lead >= maxM) return null;
  }
  return null;
}

describe('gas (pure)', () => {
  it('Stamina sets the tank and the refill; Jets makes the tank bigger', () => {
    expect(tankSeconds(30)).toBeCloseTo(2.17, 1);
    expect(tankSeconds(50)).toBeCloseTo(3.28, 1);
    expect(tankSeconds(80)).toBeCloseTo(4.94, 1);
    expect(tankSeconds(50, [{ id: 'jets', level: 1 }])).toBeCloseTo(tankSeconds(50) * 1.4);
    expect(tankSeconds(50, [{ id: 'jets', level: 3 }])).toBeGreaterThan(tankSeconds(50, [{ id: 'jets', level: 1 }]));
    expect(refillSeconds(80)).toBeLessThan(refillSeconds(30));
  });
  it('sprinting empties the tank in its seconds and blows him; a quarter back and he can go again', () => {
    const g: GasState = { gas: 1, blown: false };
    let ticks = 0;
    while (!stepGas(g, true, false, 1, 2, 10, TICK_S)) ticks++;
    expect(ticks * TICK_S).toBeCloseTo(2, 1);
    expect(g.blown).toBe(true);
    expect(canSprint(g)).toBe(false);
    expect(paceMult(g, true)).toBe(GAS.blown);
    let back = 0;
    while (g.blown) {
      stepGas(g, false, false, 1, 2, 10, TICK_S);
      back++;
    }
    expect(back * TICK_S).toBeCloseTo(10 * GAS.recoverAt, 0);
    expect(paceMult(g, false)).toBe(GAS.cruise);
    expect(paceMult(g, true)).toBe(1);
  });
  it('legs are the ceiling: tired legs cap the tank and slow the refill; standing refills faster', () => {
    const tired: GasState = { gas: 0.1, blown: false };
    const fresh: GasState = { gas: 0.1, blown: false };
    for (let i = 0; i < 400; i++) {
      stepGas(tired, false, false, 0.4, 3, 10, TICK_S);
      stepGas(fresh, false, false, 1, 3, 10, TICK_S);
    }
    expect(tired.gas).toBeCloseTo(0.4);
    expect(fresh.gas).toBeCloseTo(1);
    const a: GasState = { gas: 0, blown: false };
    const b: GasState = { gas: 0, blown: false };
    stepGas(a, false, true, 1, 3, 10, 1);
    stepGas(b, false, false, 1, 3, 10, 1);
    expect(a.gas).toBeCloseTo(b.gas * GAS.standRefill);
    expect(runCostMult(true)).toBeGreaterThan(runCostMult(false));
  });
  it('the flier makes the break but cannot finish it: Speed 90 / Stamina 30 is run down by Speed 70 / Stamina 80; with Stamina 70 he gets away', () => {
    const caught = chase({ speed: 90, stamina: 30 }, { speed: 70, stamina: 80 }, 2, 60);
    expect(caught).not.toBeNull();
    expect(caught!).toBeGreaterThan(10); // he does make the break first
    expect(caught!).toBeLessThan(35);
    expect(chase({ speed: 90, stamina: 70 }, { speed: 70, stamina: 80 }, 2, 60)).toBeNull();
  });
});

describe('sprint and gas in the live sim', () => {
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
  it('most of the time players cruise; they sprint when it matters, and gas never tops the legs', () => {
    let sprint = 0;
    let total = 0;
    let over = 0;
    for (let s = 1; s <= 3; s++) {
      play(new LiveSim(sheet('H'), sheet('A'), s), 180, (snap) => {
        for (const p of snap.players) {
          total++;
          if (p.sprint) sprint++;
          if (p.sprint && p.blown) over++;
        }
      });
    }
    const share = sprint / total;
    expect(share).toBeGreaterThan(0.03);
    expect(share).toBeLessThan(0.35);
    expect(over).toBe(0); // a blown player never sprints
    // On 30% legs the tank never fills past them (legs themselves creep back only a little: a stoppage's worth a second).
    const sim = new LiveSim(sheet('H'), sheet('A'), 2, { energy: 0.3 });
    play(sim, 60, (snap) => {
      for (const p of snap.players) expect(p.gas ?? 0).toBeLessThanOrEqual(0.3 + FATIGUE.recoverStop * snap.tick * TICK_S + 1e-9);
    });
  });
  it('low-Stamina fliers run dry more often and get run down; carriers caught from behind after a break are announced', () => {
    const es: SimEvent[] = [];
    for (let s = 1; s <= 6; s++) es.push(...play(new LiveSim(sheet('H', { speed: 85, stamina: 30 }), sheet('A', { speed: 65, stamina: 80 }), s), 180));
    const blown = (side: 'home' | 'away'): number => es.filter((e) => e.kind === 'blown' && e.side === side).length;
    expect(blown('home')).toBeGreaterThan(blown('away'));
    const runDowns = es.filter((e) => e.kind === 'run-down');
    expect(runDowns.length).toBeGreaterThan(0);
    expect(runDowns.every((e) => e.text.includes('runs down'))).toBe(true);
  });
});
