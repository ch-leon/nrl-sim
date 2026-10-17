// tests/match/league/flow.test.ts — the ball moves through hands on the run
// (lab feedback round 2): receivers take passes at pace rather than
// flat-footed, the lead point allows for their run, and carrying the ball
// costs a little speed.
import { describe, it, expect } from 'vitest';
import { LiveSim, runOn } from '../../../src/match/league/live';
import { ACCEL } from '../../../src/match/core/body';
import type { TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(id: string, base = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: base,
    defense: base,
    kicking: base,
    fitness: base,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: base, strength: base, stamina: 50, skill: base, footyIQ: base } })),
  };
}

describe('runOn', () => {
  it('accelerates from rest, caps at top speed, and stops first when backing up', () => {
    expect(runOn(0, 6, 8, 1)).toBeCloseTo(3); // ½·6·1²
    expect(runOn(8, 6, 8, 1)).toBeCloseTo(8); // already flat out
    expect(runOn(0, 6, 3, 2)).toBeCloseTo(0.75 + 3 * 1.5); // 0.5 s to reach 3 m/s, then cruise
    expect(runOn(-3, 6, 8, 0.5)).toBeCloseTo(-0.75); // half a second just to stop
    expect(runOn(-3, 6, 8, 1)).toBeCloseTo(-0.75 + 0.75);
    expect(runOn(5, 6, 8, 0)).toBe(0);
    expect(ACCEL).toBeGreaterThan(0);
  });
});

describe('passing on the move', () => {
  /** Speed of the new holder at the tick a same-side pass arrives, over a few seeds. */
  function catchSpeeds(seeds: number, seconds: number): { all: number[]; fromRuck: number[]; loose: number } {
    const all: number[] = [];
    const fromRuck: number[] = [];
    let loose = 0;
    for (let s = 1; s <= seeds; s++) {
      const sim = new LiveSim(sheet('H'), sheet('A'), s);
      let prevHolder: string | null = null;
      let flightFrom: string | null = null;
      let prevLift = 0;
      for (let i = 0; i < seconds * 20; i++) {
        sim.step();
        const snap = sim.snapshot();
        loose += snap.events.filter((e) => e.kind === 'loose').length;
        const h = snap.ball.holder ? `${snap.ball.holder.side}:${snap.ball.holder.slot}` : null;
        const from: string | null = flightFrom;
        if (!h && prevHolder) flightFrom = prevHolder;
        else if (h && from && h !== from && snap.ball.lift < 2 && prevLift < 3 && from.split(':')[0] === h.split(':')[0]) {
          const p = snap.players.find((q) => `${q.side}:${q.slot}` === h)!;
          all.push(p.speed);
          if (from.endsWith(':6')) fromRuck.push(p.speed);
          flightFrom = null;
        }
        if (h) {
          prevHolder = h;
          if (snap.ball.lift >= 2) flightFrom = null;
        }
        prevLift = snap.ball.lift;
      }
    }
    return { all, fromRuck, loose };
  }
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

  it('receivers, the first receiver off the ruck included, take the ball at pace and the pass still finds them', () => {
    const { all, fromRuck, loose } = catchSpeeds(4, 150);
    expect(all.length).toBeGreaterThan(100);
    expect(mean(all)).toBeGreaterThan(2.2); // was 1.6 m/s before the run-on
    expect(mean(fromRuck)).toBeGreaterThan(2.0); // was 1.0 m/s
    // Leading the receiver must not throw it past him: a loose pass stays rare.
    expect(loose).toBeLessThanOrEqual(3);
  });

  it('the carrier runs a touch slower than a free runner of the same speed stat', () => {
    const carrier: number[] = [];
    const free: number[] = [];
    const sim = new LiveSim(sheet('H'), sheet('A'), 3);
    for (let i = 0; i < 120 * 20; i++) {
      sim.step();
      const snap = sim.snapshot();
      if (!snap.ball.holder) continue;
      for (const p of snap.players) {
        if (p.pose !== 'run' || p.speed < 5.5) continue; // flat-out runners only
        const holding = p.side === snap.ball.holder.side && p.slot === snap.ball.holder.slot;
        (holding ? carrier : free).push(p.speed);
      }
    }
    expect(carrier.length).toBeGreaterThan(50);
    expect(free.length).toBeGreaterThan(50);
    // Flat-out speeds cluster at the cap; the carrier's cap sits 5% under the free runner's
    // (the median ignores the short burst after a break).
    const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    expect(median(carrier)).toBeLessThan(median(free) * 0.97);
  });
});
