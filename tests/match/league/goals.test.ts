// tests/match/league/goals.test.ts — goal kicking (BAK-207 §5.1 2c): where a
// conversion is taken from, the odds by angle, distance, Skill and Big Boot,
// a conversion after every try, and field goals late with the scores close.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GOALS, conversionSpot, goalChance, inBonusZone, postsAngleDeg, postsFor } from '../../../src/match/league/goals';
import { LiveSim } from '../../../src/match/league/live';
import { PENALTY } from '../../../src/match/league/penalties';
import { NINES } from '../../../src/match/league/rules';
import { applyTuning } from '../../../src/match/league/tuning';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const posts = postsFor(1, 100, 34);

describe('kicks at goal (pure)', () => {
  it('a conversion is taken in line with the try, stepping back the wider it was', () => {
    const middle = conversionSpot(34, posts, 1);
    expect(middle).toEqual({ x: 100 - GOALS.minBackM, y: 34 });
    const wide = conversionSpot(10, posts, 1);
    const corner = conversionSpot(2, posts, 1);
    expect(wide.y).toBe(10);
    expect(100 - wide.x).toBeGreaterThan(GOALS.minBackM);
    expect(100 - corner.x).toBeGreaterThan(100 - wide.x);
    expect(100 - corner.x).toBeLessThanOrEqual(GOALS.maxBackM);
    // Attacking the other way, the spot is out from the other try line.
    expect(conversionSpot(34, postsFor(-1, 100, 34), -1).x).toBe(GOALS.minBackM);
  });
  it('the odds fall with the angle and the distance, and rise with Skill and Big Boot', () => {
    const at = (y: number): number => goalChance(conversionSpot(y, posts, 1), posts, 60);
    expect(at(34)).toBeGreaterThan(0.95);
    expect(at(34)).toBeGreaterThan(at(20));
    expect(at(20)).toBeGreaterThan(at(5));
    expect(at(5)).toBeGreaterThan(0.1);
    expect(postsAngleDeg({ x: 90, y: 34 }, posts)).toBeGreaterThan(postsAngleDeg({ x: 70, y: 34 }, posts));
    expect(goalChance({ x: 80, y: 34 }, posts, 60)).toBeGreaterThan(goalChance({ x: 72, y: 34 }, posts, 60));
    const wide = conversionSpot(12, posts, 1);
    expect(goalChance(wide, posts, 80)).toBeGreaterThan(goalChance(wide, posts, 60));
    expect(goalChance(wide, posts, 60, 0.85)).toBeGreaterThan(goalChance(wide, posts, 60));
  });
});

type Seen = { e: SimEvent; snap: Snapshot };
function play(seed: number, length?: { halves: 1 | 2; halfMinutes: number }): { sim: LiveSim; events: Seen[] } {
  const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed, length ? { length } : {});
  const events: Seen[] = [];
  while (!sim.finished && sim.tick < 60_000) {
    sim.step();
    const es = sim.tickEvents;
    if (es.length) {
      const snap = sim.snapshot();
      for (const e of es) events.push({ e, snap });
    }
  }
  return { sim, events };
}

describe('conversions in the live sim', () => {
  it('every try is followed by a conversion by the scoring side, with the clock stopped; good ones are worth two', () => {
    let good = 0;
    let all = 0;
    for (const seed of [1, 2]) {
      const { sim, events } = play(seed);
      const tries = events.filter((x) => x.e.kind === 'try');
      const convs = events.filter((x) => x.e.kind === 'conversion');
      expect(convs).toHaveLength(tries.length);
      tries.forEach((t, i) => {
        const c = convs[i]!;
        expect(c.e.side).toBe(t.e.side);
        expect(c.snap.clock!.seconds).toBeCloseTo(t.snap.clock!.seconds, 6);
        expect(c.e.text).toMatch(c.e.detail === 'good' ? /converts/ : /misses the conversion/);
      });
      good += convs.filter((x) => x.e.detail === 'good').length;
      all += convs.length;
      for (const side of ['home', 'away'] as const) {
        const made = convs.filter((x) => x.e.side === side && x.e.detail === 'good').length;
        const bonus = tries.filter((x) => x.e.side === side && x.e.detail === 'bonus').length;
        const pens = events.filter((x) => x.e.kind === 'penalty-goal' && x.e.side === side && x.e.detail === 'good').length;
        const fgs = events.filter((x) => x.e.kind === 'field-goal' && x.e.side === side && x.e.detail === 'good').length;
        expect(sim.points[side]).toBe(sim.tries[side] * NINES.tryPoints + bonus * (NINES.bonusTryPoints - NINES.tryPoints) + made * NINES.conversionPoints + pens * PENALTY.goalPoints + fgs * NINES.fieldGoalPoints);
      }
    }
    expect(all).toBeGreaterThan(4);
    expect(good).toBeGreaterThan(0);
    expect(good).toBeLessThan(all);
  });
});

describe('field goals in the live sim', () => {
  // Open the window so every set late in the set is a chance: the mechanism, not the rarity.
  let restore: () => void = () => {};
  beforeAll(() => {
    restore = applyTuning({ 'goals.fieldGoalLastS': 2000, 'goals.fieldGoalMargin.0': -50, 'goals.fieldGoalMargin.1': 50 });
  });
  afterAll(() => restore());

  it('the kicker drops for goal in range late in the set: a point if it goes over, a 20 m restart for the defence if not', () => {
    const drops: Seen[] = [];
    const results: Seen[] = [];
    let after: Seen[] = [];
    for (const seed of [1, 2, 3]) {
      const { sim, events } = play(seed, { halves: 1, halfMinutes: 6 });
      drops.push(...events.filter((x) => x.e.kind === 'drop-goal'));
      const fgs = events.filter((x) => x.e.kind === 'field-goal');
      results.push(...fgs);
      // A miss: the next event is the defence's 20-metre restart.
      after = after.concat(fgs.filter((x) => x.e.detail === 'missed').map((x) => events[events.indexOf(x) + 1]!).filter(Boolean));
      for (const side of ['home', 'away'] as const) {
        const made = (k: string): number => events.filter((x) => x.e.kind === k && x.e.side === side && x.e.detail === 'good').length;
        const bonus = events.filter((x) => x.e.kind === 'try' && x.e.side === side && x.e.detail === 'bonus').length;
        expect(sim.points[side]).toBe(sim.tries[side] * NINES.tryPoints + bonus * (NINES.bonusTryPoints - NINES.tryPoints) + made('conversion') * NINES.conversionPoints + made('field-goal') * NINES.fieldGoalPoints + made('penalty-goal') * PENALTY.goalPoints);
      }
    }
    expect(drops.length).toBeGreaterThan(3);
    for (const d of drops) {
      const toPosts = d.snap.players.find((p) => p.side === d.e.side && p.slot === d.e.slot)!;
      const px = d.e.side === 'home' ? 100 : 0;
      expect(Math.hypot(toPosts.x - px, toPosts.y - 34)).toBeLessThanOrEqual(GOALS.fieldGoalRangeM + 3);
    }
    expect(results.length).toBeGreaterThan(0);
    for (const a of after) if (a.e.kind === 'set-start') expect(a.e.text).toMatch(/20-metre restart/);
  });

  it('with the real window, field goals only come in the last minutes of the second half', () => {
    restore();
    for (const seed of [4, 5]) {
      const { events } = play(seed, { halves: 2, halfMinutes: 4 });
      for (const x of events.filter((y) => y.e.kind === 'drop-goal')) {
        expect(x.snap.clock!.half).toBe(2);
        expect(4 * 60 - x.snap.clock!.seconds).toBeLessThanOrEqual(GOALS.fieldGoalLastS + 1);
      }
    }
    restore = applyTuning({});
  });
});

describe('bonus-zone tries (Nines)', () => {
  it('the bonus zone is the in-goal between the posts, the line counting', () => {
    expect(inBonusZone({ x: 100, y: 34 }, posts, 1)).toBe(true);
    expect(inBonusZone({ x: 104, y: 34 + GOALS.halfPosts }, posts, 1)).toBe(true);
    expect(inBonusZone({ x: 104, y: 34 + GOALS.halfPosts + 0.1 }, posts, 1)).toBe(false);
    expect(inBonusZone({ x: 99.9, y: 34 }, posts, 1)).toBe(false); // short of the line
    expect(inBonusZone({ x: -3, y: 33 }, postsFor(-1, 100, 34), -1)).toBe(true);
    expect(inBonusZone({ x: 3, y: 33 }, postsFor(-1, 100, 34), -1)).toBe(false);
  });

  it('a carrier clear over the line goes round under the posts: a five-point try, grounded in the zone', () => {
    let bonus = 0;
    let plain = 0;
    for (let seed = 1; seed <= 10 && (bonus < 2 || plain < 2); seed++) {
      const { events } = play(seed);
      for (const t of events.filter((x) => x.e.kind === 'try')) {
        const scorer = t.snap.players.find((p) => p.side === t.e.side && p.slot === t.e.slot)!;
        const dir = scorer.x > 50 ? 1 : -1;
        if (t.e.detail === 'bonus') {
          bonus++;
          expect(t.e.text).toMatch(/under the posts/);
          expect(Math.abs(scorer.y - 34)).toBeLessThanOrEqual(GOALS.halfPosts + 0.01);
          expect(inBonusZone({ x: scorer.x, y: scorer.y }, postsFor(dir, 100, 34), dir)).toBe(true);
        } else plain++;
      }
    }
    // Some tries are scored with a man on the carrier (four), and some clear (five).
    expect(bonus).toBeGreaterThan(0);
    expect(plain).toBeGreaterThan(0);
  }, 30_000);
});
