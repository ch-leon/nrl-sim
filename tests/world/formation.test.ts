// tests/world/formation.test.ts — the anchored formation model (pure).
import { describe, it, expect } from 'vitest';
import {
  FULLBACK_SLOT,
  HOOKER_SLOT,
  KICKER_SLOT,
  PLAYERS,
  attackDir,
  formationTargets,
  nearestIndex,
  pickRunner,
  type FieldPt,
} from '../../src/world/formation';
import { fieldOffsetX, fieldToWorldPoint } from '../../src/scenes/matchField';
import { makeRng } from '../../src/utils/rng';

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('formation basics', () => {
  it('home attacks toward fx=100, away toward fx=0 (engine absolute-x contract)', () => {
    expect(attackDir('home')).toBe(1);
    expect(attackDir('away')).toBe(-1);
  });

  it('returns 13 in-bounds targets per side for every phase', () => {
    for (const phase of ['open', 'break', 'kickoff', 'goal-kick'] as const) {
      const t = formationTargets({ attacking: 'away', ball: { fx: 30, fy: 70 }, phase, seed: 4 });
      for (const side of [t.home, t.away]) {
        expect(side).toHaveLength(PLAYERS);
        for (const p of side) {
          expect(p.fx).toBeGreaterThanOrEqual(-11);
          expect(p.fx).toBeLessThanOrEqual(111);
          expect(p.fy).toBeGreaterThanOrEqual(4);
          expect(p.fy).toBeLessThanOrEqual(96);
        }
      }
    }
  });

  it('is pure: same input → same output', () => {
    const a = formationTargets({ attacking: 'home', ball: { fx: 42, fy: 33 }, phase: 'open', seed: 9 });
    const b = formationTargets({ attacking: 'home', ball: { fx: 42, fy: 33 }, phase: 'open', seed: 9 });
    expect(a).toEqual(b);
  });
});

describe('open play shape', () => {
  it('attackers sit behind the ball, the defensive line ~10m upfield', () => {
    const ball = { fx: 40, fy: 50 };
    const t = formationTargets({ attacking: 'home', ball, phase: 'open', seed: 1 });
    // Home attacks +fx: attackers behind = lower fx.
    for (const p of t.home) expect(p.fx).toBeLessThanOrEqual(ball.fx + 1.5);
    const line = t.away.filter((_, i) => i !== FULLBACK_SLOT && i !== HOOKER_SLOT && i !== 8);
    expect(mean(line.map((p) => p.fx))).toBeGreaterThan(ball.fx + 7);
    expect(mean(line.map((p) => p.fx))).toBeLessThan(ball.fx + 14);
    // Fullback deepest.
    expect(t.away[FULLBACK_SLOT]!.fx).toBeGreaterThan(ball.fx + 20);
  });

  it('mirrors for the away side (attacking toward fx=0)', () => {
    const ball = { fx: 60, fy: 50 };
    const t = formationTargets({ attacking: 'away', ball, phase: 'open', seed: 1 });
    for (const p of t.away) expect(p.fx).toBeGreaterThanOrEqual(ball.fx - 1.5);
    expect(t.home[FULLBACK_SLOT]!.fx).toBeLessThan(ball.fx - 20);
  });

  it('wingers stay wide and the shape slides modestly toward the ball side', () => {
    const left = formationTargets({ attacking: 'home', ball: { fx: 50, fy: 10 }, phase: 'open', seed: 2 });
    const right = formationTargets({ attacking: 'home', ball: { fx: 50, fy: 90 }, phase: 'open', seed: 2 });
    expect(Math.abs(left.home[1]!.fy - left.home[2]!.fy)).toBeGreaterThan(60);
    expect(mean(left.home.map((p) => p.fy))).toBeLessThan(mean(right.home.map((p) => p.fy)));
  });

  it('defenders hold their try-line when attacked close to it', () => {
    const t = formationTargets({ attacking: 'home', ball: { fx: 97, fy: 50 }, phase: 'open', seed: 3 });
    t.away.forEach((p, i) => {
      if (i === FULLBACK_SLOT) expect(p.fx).toBeLessThanOrEqual(106.5);
      else expect(p.fx).toBeLessThanOrEqual(103);
    });
  });

  it('break: the beaten line chases from behind the ball', () => {
    const ball = { fx: 60, fy: 40 };
    const t = formationTargets({ attacking: 'home', ball, phase: 'break', seed: 3 });
    const chasers = t.away.filter((_, i) => i !== FULLBACK_SLOT);
    expect(mean(chasers.map((p) => p.fx))).toBeLessThan(ball.fx);
    expect(t.away[FULLBACK_SLOT]!.fx).toBeGreaterThan(ball.fx);
  });
});

describe('set pieces', () => {
  it('kickoff: kicker at the ball on halfway, receivers deep in their half', () => {
    const t = formationTargets({ attacking: 'home', ball: { fx: 50, fy: 50 }, phase: 'kickoff', seed: 0 });
    expect(Math.abs(t.home[KICKER_SLOT]!.fx - 48)).toBeLessThan(2);
    for (const p of t.home) expect(p.fx).toBeLessThan(50);
    for (const p of t.away) expect(p.fx).toBeGreaterThan(60);
  });

  it('goal-kick: kicker behind the mark, defenders in their in-goal', () => {
    const t = formationTargets({ attacking: 'home', ball: { fx: 90, fy: 40 }, phase: 'goal-kick', seed: 0 });
    expect(t.home[KICKER_SLOT]!.fx).toBeLessThan(90);
    for (const p of t.away) expect(p.fx).toBeGreaterThan(100);
  });
});

describe('carriers', () => {
  it('nearestIndex honours skips', () => {
    const pts: FieldPt[] = [
      { fx: 0, fy: 0 },
      { fx: 10, fy: 10 },
      { fx: 50, fy: 50 },
    ];
    expect(nearestIndex(pts, { fx: 9, fy: 9 })).toBe(1);
    expect(nearestIndex(pts, { fx: 9, fy: 9 }, [1])).toBe(0);
  });

  it('pickRunner never picks the dummy-half and rotates between players', () => {
    const ball = { fx: 50, fy: 50 };
    const t = formationTargets({ attacking: 'home', ball, phase: 'open', seed: 0 });
    const picks = new Set<number>();
    for (let s = 0; s < 40; s++) {
      const r = pickRunner(t.home, ball, s);
      expect(r).not.toBe(HOOKER_SLOT);
      picks.add(r);
    }
    expect(picks.size).toBeGreaterThan(2);
  });
});

describe('no compounding (regression for the vertical-line collapse)', () => {
  it('500 random sequential events keep both teams spread on screen', () => {
    const rng = makeRng(77);
    const off = fieldOffsetX();
    for (let i = 0; i < 500; i++) {
      const t = formationTargets({
        attacking: rng.next() < 0.5 ? 'home' : 'away',
        ball: { fx: rng.next() * 100, fy: 5 + rng.next() * 90 },
        phase: rng.next() < 0.15 ? 'break' : 'open',
        seed: i,
      });
      const xs = [...t.home, ...t.away].map((p) => fieldToWorldPoint(p.fx, p.fy, off).x);
      const m = mean(xs);
      const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
      expect(sd).toBeGreaterThan(80);
    }
  });
});
