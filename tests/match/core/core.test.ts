// tests/match/core/core.test.ts — vectors, bodies, ball flights, flag codes and
// the fixed-step runner (BAK-207 #84).
import { describe, it, expect } from 'vitest';
import { add, clampLen, dist, len, lerp, norm, scale, sub } from '../../../src/match/core/vec';
import { ACCEL, BODY_RADIUS, MAX_SPEED, MIN_SPEED, arrive, brake, integrate, makeBody, maxSpeedFor, separate, speedOf } from '../../../src/match/core/body';
import { CARRY_LIFT, bounceFlight, flightAt, flightLift, landed, passFlight } from '../../../src/match/core/ball';
import { decodeFlag, encodeFlag } from '../../../src/match/core/flag';
import { RUN_SPEEDS, Runner, TICK_MS, TICK_S, replayRange, replayTo, type MatchSim } from '../../../src/match/core/engine';
import { FIELD_WIDTH, IN_GOAL, clampToGround, fromFieldPt, inGoal, inPlay, outOfBounds, toFieldPt } from '../../../src/match/core/field';
import type { Snapshot } from '../../../src/match/core/snapshot';

describe('vec', () => {
  it('does the arithmetic', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: -2, y: -2 });
    expect(scale({ x: 1, y: -2 }, 3)).toEqual({ x: 3, y: -6 });
    expect(len({ x: 3, y: 4 })).toBe(5);
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.25)).toEqual({ x: 2.5, y: 5 });
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(len(norm({ x: 5, y: 5 }))).toBeCloseTo(1);
    expect(len(clampLen({ x: 30, y: 40 }, 5))).toBeCloseTo(5);
    expect(clampLen({ x: 1, y: 1 }, 5)).toEqual({ x: 1, y: 1 });
  });
});

describe('field', () => {
  it('maps metres to the engine’s 0..100 field coords and back', () => {
    expect(toFieldPt({ x: 25, y: FIELD_WIDTH / 2 })).toEqual({ fx: 25, fy: 50 });
    expect(fromFieldPt({ fx: 25, fy: 50 })).toEqual({ x: 25, y: FIELD_WIDTH / 2 });
    expect(toFieldPt({ x: 0, y: FIELD_WIDTH })).toEqual({ fx: 0, fy: 100 });
  });
  it('knows the in-goals, the field of play and out of bounds', () => {
    expect(inPlay({ x: 50, y: 30 })).toBe(true);
    expect(inPlay({ x: 101, y: 30 })).toBe(false);
    expect(inGoal({ x: 103, y: 30 }, 1)).toBe(true);
    expect(inGoal({ x: 103, y: 30 }, -1)).toBe(false);
    expect(inGoal({ x: -3, y: 30 }, -1)).toBe(true);
    expect(inGoal({ x: 103, y: -1 }, 1)).toBe(false);
    expect(outOfBounds({ x: 50, y: -0.1 })).toBe(true);
    expect(outOfBounds({ x: 100 + IN_GOAL + 0.1, y: 30 })).toBe(true);
    expect(clampToGround({ x: 200, y: -5 }, 1)).toEqual({ x: 100 + IN_GOAL - 1, y: 1 });
  });
});

describe('body steering', () => {
  it('maps the speed stat onto a 6–9 m/s range', () => {
    expect(maxSpeedFor(1)).toBe(MIN_SPEED);
    expect(maxSpeedFor(100)).toBe(MAX_SPEED);
    expect(maxSpeedFor(50)).toBeCloseTo(7.2);
    expect(maxSpeedFor(60)).toBeCloseTo(7.8); // neutral pace is unchanged
    expect(maxSpeedFor(70)).toBeCloseTo(8.4);
    expect(maxSpeedFor(500)).toBe(MAX_SPEED);
  });

  it('arrives at a target and stops there, never exceeding top speed or the acceleration cap', () => {
    const b = makeBody({ x: 0, y: 0 }, 8);
    let peak = 0;
    let maxDv = 0;
    for (let i = 0; i < 200; i++) {
      const before = { ...b.vel };
      arrive(b, { x: 30, y: 10 }, TICK_S);
      maxDv = Math.max(maxDv, dist(before, b.vel));
      integrate(b, TICK_S);
      peak = Math.max(peak, speedOf(b));
    }
    expect(dist(b.pos, { x: 30, y: 10 })).toBeLessThan(0.15);
    expect(speedOf(b)).toBeLessThan(0.5);
    expect(peak).toBeLessThanOrEqual(8 + 1e-9);
    expect(maxDv).toBeLessThanOrEqual(ACCEL * TICK_S + 1e-9);
  });

  it('`through` runs flat out at a moving point and does not brake on a fixed one', () => {
    const b = makeBody({ x: 0, y: 0 }, 8);
    for (let i = 0; i < 60; i++) {
      arrive(b, { x: b.pos.x + 12, y: 0 }, TICK_S, { through: true }); // a carrier's running line
      integrate(b, TICK_S);
    }
    expect(speedOf(b)).toBeCloseTo(8, 1);
    expect(b.pos.x).toBeGreaterThan(20);
    expect(b.heading).toEqual({ x: 1, y: 0 });
    const c = makeBody({ x: 0, y: 0 }, 8);
    let ticks = 0;
    while (c.pos.x <= 10 && ticks < 60) {
      arrive(c, { x: 10, y: 0 }, TICK_S, { through: true });
      integrate(c, TICK_S);
      ticks++;
    }
    expect(c.pos.x).toBeGreaterThan(10); // ran through it (≈1.6 s: 0.9 s accelerating, then flat out)
    expect(ticks).toBeLessThan(40);
    expect(speedOf(c)).toBeCloseTo(8, 1); // never braked for the point
  });

  it('`through` turns toward a target behind it (a retreating player who gets the ball)', () => {
    const b = makeBody({ x: 20, y: 0 }, 8, { x: -1, y: 0 });
    b.vel = { x: -8, y: 0 };
    for (let i = 0; i < 60; i++) {
      arrive(b, { x: b.pos.x + 12, y: 0 }, TICK_S, { through: true });
      integrate(b, TICK_S);
    }
    expect(b.vel.x).toBeCloseTo(8, 1);
    expect(b.heading.x).toBe(1);
  });

  it('a slower `maxSpeed` option caps the pace (a jog)', () => {
    const b = makeBody({ x: 0, y: 0 }, 8);
    for (let i = 0; i < 60; i++) {
      arrive(b, { x: 100, y: 0 }, TICK_S, { maxSpeed: 3 });
      integrate(b, TICK_S);
    }
    expect(speedOf(b)).toBeCloseTo(3, 5);
  });

  it('brakes to a stop and keeps the last heading while still', () => {
    const b = makeBody({ x: 0, y: 0 }, 8, { x: 1, y: 0 });
    b.vel = { x: -6, y: 0 };
    integrate(b, TICK_S);
    expect(b.heading.x).toBe(-1);
    for (let i = 0; i < 40; i++) brake(b, TICK_S);
    expect(speedOf(b)).toBe(0);
    expect(b.heading.x).toBe(-1);
  });

  it('separates overlapping bodies, leaving skipped ones in place', () => {
    const a = makeBody({ x: 10, y: 10 }, 8);
    const b = makeBody({ x: 10.2, y: 10 }, 8);
    const c = makeBody({ x: 20, y: 20 }, 8);
    separate([a, b, c]);
    expect(dist(a.pos, b.pos)).toBeCloseTo(BODY_RADIUS, 6);
    expect(c.pos).toEqual({ x: 20, y: 20 });
    const d = makeBody({ x: 0, y: 0 }, 8);
    const e = makeBody({ x: 0, y: 0 }, 8); // coincident: deterministic nudge
    separate([d, e], BODY_RADIUS, new Set([d]));
    expect(d.pos).toEqual({ x: 0, y: 0 });
    expect(dist(d.pos, e.pos)).toBeCloseTo(BODY_RADIUS, 6);
  });
});

describe('ball flights', () => {
  it('a pass is timed by distance, starts at hand height and lands on the target', () => {
    const f = passFlight({ x: 0, y: 0 }, { x: 16, y: 0 }, 100, 3);
    expect(f.kind).toBe('flight');
    if (f.kind !== 'flight') return;
    expect(f.ticks).toBe(Math.round(1 / TICK_S)); // 16 m at 16 m/s = 1 s
    expect(flightAt(f, 100)).toMatchObject({ pos: { x: 0, y: 0 }, lift: CARRY_LIFT, u: 0 });
    expect(flightAt(f, 120).pos).toEqual({ x: 16, y: 0 });
    expect(flightAt(f, 120).lift).toBe(0);
    expect(landed(f, 119)).toBe(false);
    expect(landed(f, 120)).toBe(true);
    expect(flightAt(f, 110).lift).toBeGreaterThan(CARRY_LIFT / 2);
  });
  it('a loose ball bounces on in the direction it was travelling, low, then lies there', () => {
    const b = bounceFlight({ x: 50, y: 30 }, { x: -3, y: 0 }, 200, 6, 16, 3);
    expect(b.kind).toBe('flight');
    if (b.kind !== 'flight') return;
    expect(b.via).toBe('bounce');
    expect(b.receiver).toBeNull();
    expect(b.to).toEqual({ x: 44, y: 30 });
    expect(landed(b, 216)).toBe(true);
    let touches = 0;
    let peak = 0;
    let prev = 1;
    for (let t = 200; t <= 216; t++) {
      const { lift } = flightAt(b, t);
      peak = Math.max(peak, lift);
      if (prev >= 0.3 && lift < 0.3) touches++;
      prev = lift;
    }
    expect(peak).toBeLessThan(1.5);
    expect(touches).toBeGreaterThanOrEqual(2);
    expect(flightAt(b, 216).lift).toBe(0);
  });

  it('lift is a parabola, or decaying hops for a bouncing ball', () => {
    expect(flightLift(0, 10, 0.5)).toBeCloseTo(10);
    expect(flightLift(0, 10, 1)).toBe(0);
    expect(flightLift(0, 2, 1 / 3, 3)).toBeCloseTo(0, 5);
    expect(flightLift(0, 2, 1 / 6, 3)).toBeGreaterThan(flightLift(0, 2, 5 / 6, 3));
  });
});

describe('flag codes', () => {
  it('round-trips seed, tick, teams and a unicode note', () => {
    const code = encodeFlag({ seed: 42, tick: 1234, home: 'crushers', away: 'larrikins', note: 'ball went thru the winger — ✓' });
    expect(code.startsWith('nrl1:42:1234:crushers~larrikins:')).toBe(true);
    expect(decodeFlag(code)).toEqual({ seed: 42, tick: 1234, home: 'crushers', away: 'larrikins', note: 'ball went thru the winger — ✓' });
    expect(decodeFlag(`  ${code}\n`)).not.toBeNull();
  });
  it('tolerates an empty note and rejects junk', () => {
    expect(decodeFlag(encodeFlag({ seed: 1, tick: 0, home: 'a', away: 'b', note: '' }))).toMatchObject({ note: '' });
    expect(decodeFlag('nrl1:1:0:a~b')).toMatchObject({ seed: 1, tick: 0, home: 'a', away: 'b', note: '' });
    expect(decodeFlag('hello')).toBeNull();
    expect(decodeFlag('nrl1:x:0:a~b:')).toBeNull();
    expect(decodeFlag('nrl1:1:-3:a~b:')).toBeNull();
    expect(decodeFlag('nrl1:1:0:ab:')).toBeNull();
    expect(decodeFlag('nrl2:1:0:a~b:')).toBeNull();
  });
  it('sanitises team ids that would break the format', () => {
    const f = decodeFlag(encodeFlag({ seed: 1, tick: 1, home: 'a:b c', away: 'x~y', note: 'n' }));
    expect(f).toMatchObject({ home: 'a-b-c', away: 'x-y' });
  });
});

/** A sim that counts ticks and records an event every 10th. */
function counter(seed: number): MatchSim {
  let tick = 0;
  return {
    get tick() {
      return tick;
    },
    get finished() {
      return tick >= 1000;
    },
    step() {
      tick++;
    },
    snapshot(): Snapshot {
      return {
        tick,
        players: [],
        ball: { x: tick + seed, y: 0, lift: 0, holder: null },
        label: `t${tick}`,
        events: tick % 10 === 0 ? [{ tick, kind: 'ten', text: `ten ${tick}` }] : [],
      };
    },
  };
}

describe('Runner', () => {
  it('starts paused at tick 0 and only advances while playing', () => {
    const r = new Runner(counter, 1);
    expect(r.tick).toBe(0);
    r.update(500);
    expect(r.tick).toBe(0);
    r.play();
    r.update(500);
    expect(r.tick).toBe(10);
    expect(r.playing).toBe(true);
  });

  it('pause holds the tick and play carries on from there', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.update(TICK_MS * 10);
    expect(r.tick).toBe(10);
    r.pause();
    r.update(TICK_MS * 40);
    expect(r.playing).toBe(false);
    expect(r.tick).toBe(10);
    r.play();
    r.update(TICK_MS * 4);
    expect(r.tick).toBe(14);
  });

  it('replayRange matches replayTo at every tick in the window, events copied', () => {
    const range = replayRange(counter, 4, 8, 25);
    expect(range.map((s) => s.tick)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    for (const s of range) {
      const one = replayTo(counter, 4, s.tick);
      expect(s.ball).toEqual(one.ball);
      expect(s.events.map((e) => e.text)).toEqual(one.events.map((e) => e.text));
      s.events.push({ tick: -1, kind: 'probe', text: 'probe' });
      expect(replayTo(counter, 4, s.tick).events.some((e) => e.kind === 'probe')).toBe(false);
    }
    expect(replayRange(counter, 4, 0, 2).map((s) => s.tick)).toEqual([0, 1, 2]);
    expect(replayRange(counter, 4, 5, 1).map((s) => s.tick)).toEqual([5]);
  });

  it('banks partial ticks so frame rate does not change the tick count', () => {
    const a = new Runner(counter, 1);
    const b = new Runner(counter, 1);
    a.play();
    b.play();
    for (let i = 0; i < 60; i++) a.update(1000 / 60);
    b.update(1000);
    expect(a.tick).toBe(20);
    expect(b.tick).toBe(20);
    expect(a.alpha).toBeGreaterThanOrEqual(0);
    expect(a.alpha).toBeLessThan(1);
  });

  it('speed scales how much sim time a real ms is worth', () => {
    expect(RUN_SPEEDS).toContain(1);
    for (const s of RUN_SPEEDS) {
      const r = new Runner(counter, 1);
      r.setSpeed(s);
      r.play();
      r.update(TICK_MS * 40);
      expect(r.tick).toBe(Math.round(40 * s));
    }
  });

  it('step advances exactly one tick and pauses; prev/cur straddle it', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.step();
    expect(r.playing).toBe(false);
    expect(r.tick).toBe(1);
    expect(r.prev.tick).toBe(0);
    expect(r.cur.tick).toBe(1);
    expect(r.alpha).toBe(0);
  });

  it('seek reproduces the same snapshot a fresh sim shows at that tick', () => {
    const r = new Runner(counter, 7);
    r.play();
    r.update(10_000);
    expect(r.tick).toBe(200);
    r.seek(37);
    expect(r.tick).toBe(37);
    expect(r.playing).toBe(false);
    expect(r.cur).toEqual(replayTo(counter, 7, 37));
    expect(r.prev.tick).toBe(36);
    expect(r.maxTick).toBe(200); // scrub range keeps the furthest point reached
    expect(r.recent.map((e) => e.tick)).toEqual([10, 20, 30]);
  });

  it('reseed starts over on the new seed', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.update(1000);
    r.reseed(9);
    expect(r.seed).toBe(9);
    expect(r.tick).toBe(0);
    expect(r.maxTick).toBe(0);
    expect(r.cur.ball.x).toBe(9);
  });

  it('keeps a full history, reports events as they happen, and replays silently on seek', () => {
    const r = new Runner(counter, 1);
    const seen: number[] = [];
    r.onEvents = (evs) => seen.push(...evs.map((e) => e.tick));
    r.play();
    r.update(2000); // 40 ticks → events at 10, 20, 30, 40
    expect(seen).toEqual([10, 20, 30, 40]);
    expect(r.history.map((e) => e.tick)).toEqual([10, 20, 30, 40]);
    r.seek(25);
    expect(seen).toEqual([10, 20, 30, 40]); // nothing re-fired
    expect(r.history.map((e) => e.tick)).toEqual([10, 20]); // but the record matches the new position
    r.step();
    r.play();
    r.update(250); // to tick 31
    expect(seen).toEqual([10, 20, 30, 40, 30]);
  });

  it('a slow-motion beat spends its real ms at the factor, then resumes full rate', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.slowMo(300, 0.5);
    r.update(300); // 300 real ms at half speed = 150 sim ms = 3 ticks
    expect(r.tick).toBe(3);
    r.update(300); // back to full: 6 more
    expect(r.tick).toBe(9);
    r.slowMo(100, 0.25);
    r.update(400); // 100 ms × 0.25 + 300 ms = 325 sim ms → 6 ticks (+25 ms banked)
    expect(r.tick).toBe(15);
    r.setSpeed(2);
    r.slowMo(200, 0.5);
    r.update(200); // 200 × 0.5 × ×2 = 200 sim ms + 25 banked → 4 ticks
    expect(r.tick).toBe(19);
  });

  it('stops at the end of a finished sim and caps a huge catch-up', () => {
    const r = new Runner(counter, 1);
    r.play();
    r.update(60_000); // 1200 ticks requested; one update fast-forwards at most 200
    expect(r.tick).toBe(200);
    r.update(60_000);
    r.update(60_000);
    r.update(60_000);
    r.update(60_000);
    expect(r.tick).toBe(1000);
    expect(r.finished).toBe(true);
    expect(r.playing).toBe(false);
    r.step();
    expect(r.tick).toBe(1000);
  });
});
