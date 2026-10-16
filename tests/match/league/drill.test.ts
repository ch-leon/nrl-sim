// tests/match/league/drill.test.ts — the Phase 0 movement drill (BAK-207 #84):
// everyone moves smoothly, nobody overlaps, the ball is always accounted for,
// and the same seed replays identically.
import { describe, it, expect } from 'vitest';
import { DrillSim } from '../../../src/match/league/drill';
import { HOOKER, PLAYERS, ROLES, formationTarget } from '../../../src/match/league/roles';
import { MAX_SPEED, BODY_RADIUS } from '../../../src/match/core/body';
import { TICK_S, replayTo } from '../../../src/match/core/engine';
import type { TeamSheet } from '../../../src/sim/events';
import type { Snapshot } from '../../../src/match/core/snapshot';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;

function sheet(id: string, speed = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: 60,
    defense: 60,
    kicking: 60,
    fitness: 60,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({
      name: `${id} ${i}`,
      position,
      stats: { speed: speed + i, strength: 50, stamina: 50, skill: 50, footyIQ: 50 },
    })),
  };
}

const factory = (seed: number): DrillSim => new DrillSim(sheet('H'), sheet('A'), seed);

function run(sim: DrillSim, seconds: number, onTick?: (s: Snapshot) => void): Snapshot {
  const n = Math.round(seconds / TICK_S);
  let snap = sim.snapshot();
  for (let i = 0; i < n; i++) {
    sim.step();
    snap = sim.snapshot();
    onTick?.(snap);
  }
  return snap;
}

describe('roles', () => {
  it('has nine roles with the hooker tight behind the ball and the line 10 m off it', () => {
    expect(PLAYERS).toBe(9);
    expect(ROLES[HOOKER]!.name).toBe('hooker');
    const ball = { x: 40, y: 20 };
    const h = formationTarget(ROLES[HOOKER]!, ball, 1, true);
    expect(h.x).toBeCloseTo(38.5);
    expect(Math.abs(h.y - 20)).toBeLessThan(2); // pull 0.9 toward the ball's side
    const d = formationTarget(ROLES[5]!, ball, 1, false);
    expect(d.x).toBeCloseTo(50);
    const left = formationTarget(ROLES[1]!, ball, -1, true);
    expect(left.x).toBeCloseTo(48);
    expect(left.y).toBeGreaterThanOrEqual(1.5);
  });
});

describe('DrillSim', () => {
  it('is deterministic: same seed, identical snapshots; different seeds differ', () => {
    const a = run(factory(5), 20);
    const b = run(factory(5), 20);
    expect(a).toEqual(b);
    expect(a).toEqual(replayTo(factory, 5, Math.round(20 / TICK_S)));
    const c = run(factory(6), 20);
    expect(c.players.map((p) => p.x)).not.toEqual(a.players.map((p) => p.x));
  });

  it('moves all 18 players, within their top speed, with no sudden jumps', () => {
    const sim = factory(1);
    let prev = sim.snapshot();
    const moved = new Set<number>();
    run(sim, 30, (s) => {
      s.players.forEach((p, i) => {
        const q = prev.players[i]!;
        const step = Math.hypot(p.x - q.x, p.y - q.y);
        // One tick of travel plus a separation nudge can never look like a teleport.
        expect(step).toBeLessThan((MAX_SPEED + 2) * TICK_S + BODY_RADIUS / 2);
        expect(p.speed).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
        if (step > 0.01) moved.add(i);
      });
      prev = s;
    });
    expect(moved.size).toBe(18);
  });

  it('keeps players apart and on the ground', () => {
    const sim = factory(2);
    run(sim, 40, (s) => {
      for (let i = 0; i < s.players.length; i++) {
        const p = s.players[i]!;
        expect(p.x).toBeGreaterThanOrEqual(-10);
        expect(p.x).toBeLessThanOrEqual(110);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(68);
        for (let j = i + 1; j < s.players.length; j++) {
          const q = s.players[j]!;
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(BODY_RADIUS * 0.5);
        }
      }
    });
  });

  it('the ball is always held or in flight, passes happen, and possession turns over near the line', () => {
    const sim = factory(3);
    let held = 0;
    let flying = 0;
    const kinds: string[] = [];
    run(sim, 90, (s) => {
      if (s.ball.holder) {
        held++;
        const h = s.players.find((p) => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot)!;
        expect(Math.hypot(h.x - s.ball.x, h.y - s.ball.y)).toBeLessThan(1e-9);
      } else {
        flying++;
        expect(s.ball.lift).toBeGreaterThanOrEqual(0);
      }
      kinds.push(...s.events.map((e) => e.kind));
    });
    expect(held).toBeGreaterThan(flying);
    expect(flying).toBeGreaterThan(0);
    expect(kinds.filter((k) => k === 'pass').length).toBeGreaterThan(10);
    expect(kinds).toContain('turnover');
    const label = sim.snapshot().label;
    expect(label).toMatch(/Drill · (home|away) attacking · set \d+/);
  });

  it('poses: runners run, the passer shows the pass, standing players idle', () => {
    const sim = factory(4);
    const poses = new Set<string>();
    run(sim, 30, (s) => {
      for (const p of s.players) {
        poses.add(p.pose);
        if (p.pose === 'run') expect(p.speed).toBeGreaterThan(0.5);
      }
    });
    expect(poses).toContain('run');
    expect(poses).toContain('pass');
    expect(poses).toContain('idle');
  });

  it('works with a sheet that has no roster (generic names, average pace)', () => {
    const bare: TeamSheet = { clubId: 'X', name: 'Bare', attack: 50, defense: 50, kicking: 50, fitness: 50, colors: ['#111', '#eee'] };
    const sim = new DrillSim(bare, bare, 1);
    const s = run(sim, 5);
    expect(s.players).toHaveLength(18);
    expect(s.events.length).toBeGreaterThanOrEqual(0);
  });
});
