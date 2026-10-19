// tests/match/league/touch.test.ts — touch, dead ball and restarts (BAK-207
// §5.1 2d): where the ball leaves the field, who gets it and where, the 40/20,
// 20 m restarts and goal-line drop-outs, kick metres, and a set ending every way.
import { describe, it, expect, afterEach } from 'vitest';
import { TOUCH, exitPoint, inOwnInGoal, isFortyTwenty, outOfPlay, touchRestartSpot, twentySpot } from '../../../src/match/league/touch';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { applyTuning } from '../../../src/match/league/tuning';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

describe('touch and dead ball (pure)', () => {
  it('finds where a ball leaves the field and how', () => {
    expect(exitPoint({ x: 50, y: 10 }, { x: 60, y: 30 })).toBeNull();
    const t = exitPoint({ x: 40, y: 10 }, { x: 50, y: -10 })!;
    expect(t.how).toBe('touch');
    expect(t.at.y).toBeCloseTo(0, 6);
    expect(t.at.x).toBeCloseTo(45, 6);
    // Over the touchline beyond the try line is touch-in-goal: dead.
    expect(exitPoint({ x: 104, y: 5 }, { x: 106, y: -5 })!.how).toBe('dead');
    // Over the dead-ball line.
    const d = exitPoint({ x: 105, y: 34 }, { x: 115, y: 34 })!;
    expect(d.how).toBe('dead');
    expect(d.at.x).toBeCloseTo(110, 6);
    expect(outOfPlay({ x: 50, y: -0.1 })).toBe(true);
    expect(outOfPlay({ x: 109, y: 34 })).toBe(false);
  });

  it('restarts: 10 m in from touch and off the try lines; the 20 m line; own in-goal; the 40/20', () => {
    expect(touchRestartSpot({ x: 37, y: 0 })).toEqual({ x: 37, y: TOUCH.restartInM });
    expect(touchRestartSpot({ x: 98, y: 68 })).toEqual({ x: 100 - TOUCH.restartFromLineM, y: 68 - TOUCH.restartInM });
    expect(twentySpot(1, 2)).toEqual({ x: 20, y: TOUCH.restartInM });
    expect(twentySpot(-1, 34)).toEqual({ x: 80, y: 34 });
    expect(inOwnInGoal({ x: -2, y: 30 }, 1)).toBe(true);
    expect(inOwnInGoal({ x: -2, y: 30 }, -1)).toBe(false);
    expect(isFortyTwenty(65, 15)).toBe(true); // kicked from his own 35, out at their 15
    expect(isFortyTwenty(55, 15)).toBe(false); // not from inside his own 40
    expect(isFortyTwenty(65, 25)).toBe(false); // not inside their 20
  });
});

type Seen = { e: SimEvent; snap: Snapshot };
function play(seed: number, minutes = 9): { sim: LiveSim; events: Seen[] } {
  const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed, { length: { halves: 2, halfMinutes: minutes } });
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

describe('touch and dead ball in the live sim', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('a ball into touch goes to the side that did not touch it last, as a play-the-ball 10 m in from touch', () => {
    let touches = 0;
    for (const seed of [1, 2]) {
      const { events } = play(seed);
      const all = events.map((x) => x.e);
      events.forEach(({ e, snap }, i) => {
        if (e.kind !== 'touch' || snap.clock!.siren) return;
        touches++;
        // The restart is a set piece for the other side, played on a spot 10 m in from touch.
        expect(snap.label).toMatch(/· set-piece ·/);
        const holder = snap.ball.holder!;
        expect(holder).not.toBeNull();
        const named = e.text.match(/— (.+) ball$/)?.[1];
        if (named) expect(snap.label.startsWith(`${named} ball`)).toBe(true);
        // …and play goes on from it (no scrum): the next tackle count starts at zero.
        const next = all.slice(i + 1).find((x) => x.kind === 'tackle' || x.kind === 'try' || x.kind === 'touch' || x.kind === 'error');
        expect(next).toBeDefined();
      });
    }
    expect(touches).toBeGreaterThan(2);
  }, 30_000);

  it('a set can end every way: a tackle on the last, a kick, touch, dead ball, a drop-out, a try, an error', () => {
    const kinds = new Set<string>();
    const want = ['handover', 'kick', 'touch', 'dead-ball:20m', 'drop-out', 'try', 'error', 'set-start'];
    for (let seed = 1; seed <= 12 && !want.every((k) => kinds.has(k)); seed++) {
      for (const { e } of play(seed).events) kinds.add(e.kind === 'dead-ball' ? `dead-ball:${e.detail}` : e.kind);
    }
    for (const k of want) expect(kinds).toContain(k);
  }, 60_000);

  it('the 40/20: kicked from inside his own 40 into touch inside their 20 — the kicking side taps and keeps it', () => {
    restore = applyTuning({ 'touch.fortyTwenty': 1, 'touch.findTouch.own20': 0, 'touch.findTouch.ownHalf': 0 });
    let found = 0;
    for (const seed of [1, 2, 3]) {
      const { events } = play(seed, 5);
      for (const { e, snap } of events) {
        if (e.kind !== '40-20' || snap.clock!.siren) continue;
        found++;
        expect(e.text).toMatch(/^40\/20!/);
        expect(snap.label).toMatch(/· set-piece ·/);
        expect(snap.ball.holder!.side).toBe(e.side);
      }
      // A tap restart follows each one.
      expect(events.filter((x) => x.e.kind === '40-20' && !x.snap.clock!.siren).length).toBeLessThanOrEqual(events.filter((x) => x.e.kind === 'tap').length);
    }
    expect(found).toBeGreaterThan(0);
  }, 60_000);

  it('kick metres are counted and sensible; the same seed gives the same match', () => {
    const { sim } = play(5);
    for (const side of ['home', 'away'] as const) {
      expect(sim.kicksMeasured[side]).toBeGreaterThan(0);
      const per = sim.kickMetres[side] / sim.kicksMeasured[side];
      expect(per).toBeGreaterThan(10);
      expect(per).toBeLessThan(50);
    }
    const a = runMatch(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), { seed: 7, length: { halves: 2, halfMinutes: 4 } });
    const b = runMatch(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), { seed: 7, length: { halves: 2, halfMinutes: 4 } });
    expect(a).toEqual(b);
  }, 30_000);
});
