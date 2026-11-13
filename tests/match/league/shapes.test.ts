// Attack shapes at the play-the-ball (#649 step 2, BAK-208 §4.2): the table,
// the weighted pick with its one roll, and the spots; off plays as before.
import { describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { FIELD_WIDTH } from '../../../src/match/core/field';
import { ATTACK_PRESETS } from '../../../src/match/league/presets';
import { SHAPES, SHAPE_NAMES, pickShape, shapeCall, shapeSlot, shapeSpot, shapeWeights, tackleBucket, type ShapeMan, type ShapeName } from '../../../src/match/league/shapes';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';

describe('attack shapes: the table', () => {
  it('buckets the tackle count: early, middle, late, and no shape on the last', () => {
    expect([0, 1, 2, 3, 4, 5].map((t) => tackleBucket(t, 5))).toEqual(['early', 'early', 'middle', 'late', null, null]);
    expect(tackleBucket(3, 6)).toBe('middle');
  });
  it('weights by preset, zone and tackle: Tight leans on the pod, Expansive on the edge; no back door on the line', () => {
    const grind = shapeWeights('grind', 'midfield', 'middle');
    const wide = shapeWeights('expansive', 'midfield', 'middle');
    expect(grind.pod).toBeGreaterThan(grind.edge);
    expect(wide.edge).toBeGreaterThan(wide.pod);
    expect(wide.backDoor).toBeGreaterThan(grind.backDoor);
    expect(shapeWeights('balanced', 'line', 'middle').backDoor).toBe(0);
    expect(shapeWeights('balanced', 'own20', 'early').pod).toBeGreaterThan(shapeWeights('balanced', 'redZone', 'late').pod);
    // Every preset can reach every shape somewhere (none vanishingly rare by construction).
    for (const p of ATTACK_PRESETS) for (const n of SHAPE_NAMES) expect(shapeWeights(p, 'midfield', 'middle')[n]).toBeGreaterThan(0);
  });
  it('picks by cumulative weight over one roll among the shapes on offer; the edge takes its other side in the top of its band', () => {
    const w: Record<ShapeName, number> = { spread: 1, pod: 1, edge: 1, backDoor: 1 };
    const all = { pod: { first: 1, alt: null }, edge: { first: -1, alt: 1 }, backDoor: { first: -1, alt: null } } as const;
    expect(pickShape(w, 0.1, all, 1)).toEqual({ name: 'spread', sign: 1 });
    expect(pickShape(w, 0.3, all, 1)).toEqual({ name: 'pod', sign: 1 });
    expect(pickShape(w, 0.55, all, 1)).toEqual({ name: 'edge', sign: -1 });
    expect(pickShape(w, 0.9, all, 1)).toEqual({ name: 'backDoor', sign: -1 });
    // Edge band is 0.5–0.75: its top shortShare (0.3) goes to its other side when it has one.
    expect(pickShape(w, 0.74, all, 1)).toEqual({ name: 'edge', sign: 1 });
    expect(pickShape(w, 0.74, { ...all, edge: { first: -1, alt: null } }, 1)).toEqual({ name: 'edge', sign: -1 });
    // A shape not on offer (out of reach) is not picked: its share goes to the rest.
    expect(pickShape(w, 0.55, { pod: all.pod }, 1)).toEqual({ name: 'pod', sign: 1 });
    expect(pickShape(w, 0.99, {}, -1)).toEqual({ name: 'spread', sign: -1 });
    expect(pickShape({ spread: 0, pod: 0, edge: 0, backDoor: 0 }, 0.5, all, 1).name).toBe('spread');
  });
  it('names each man once per shape, either way it is played, and keeps every spot on the field', () => {
    for (const name of ['pod', 'edge', 'backDoor'] as const) {
      const men = Object.keys(SHAPES.spots[name]).filter((k) => k !== 'room') as ShapeMan[];
      for (const sign of [1, -1] as const) {
        const slots = men.map((m) => shapeSlot(m, sign));
        expect(new Set(slots).size).toBe(slots.length);
        expect(slots).not.toContain(6); // the hooker is the dummy-half
        for (const y of [3, 20, 34, 50, 65]) {
          for (const slot of slots) {
            const at = shapeSpot(shapeCall('home', name, sign), slot, y, 50, 1)!;
            expect(at.pos.y).toBeGreaterThanOrEqual(1.5);
            expect(at.pos.y).toBeLessThanOrEqual(FIELD_WIDTH - 1.5);
            expect(at.pos.x).toBeLessThan(50); // behind the ball
          }
        }
      }
    }
    expect(shapeSpot(shapeCall('home', 'spread', 1), 7, 34, 50, 1)).toBeNull();
    expect(shapeSpot(shapeCall('home', 'pod', 1), 2, 34, 50, 1)).toBeNull(); // the winger holds his lane
  });
  it('lays the edge shift across the open side wherever the ruck is, and plays the pod off the ruck', () => {
    const edge = (y: number, sign: 1 | -1): number => shapeSpot(shapeCall('home', 'edge', sign), shapeSlot('nearWing', sign), y, 50, 1)!.pos.y;
    expect(edge(34, 1)).toBeGreaterThan(55);
    expect(edge(10, 1)).toBeGreaterThan(55);
    expect(edge(50, -1)).toBeLessThan(10);
    const prop = shapeSpot(shapeCall('home', 'pod', -1), 7, 40, 50, -1)!;
    expect(prop.pos).toEqual({ x: 53, y: 37 });
  });
});

describe('attack shapes: in the sim', () => {
  const home = labSheet(DEFAULT_HOME, 'gen');
  const away = labSheet(DEFAULT_AWAY, 'gen');
  type Hooked = { rng: { next: () => number }; chooseShape: (c: unknown) => unknown };
  const play = (seed: number): { events: number; home: number; away: number; draws: number; shapeDraws: number; picks: number; shown: Set<string> } => {
    const sim = new LiveSim(home, away, seed);
    const hooked = sim as unknown as Hooked;
    const rng = hooked.rng;
    const next = rng.next.bind(rng);
    let draws = 0;
    rng.next = () => { draws++; return next(); };
    // Every roll the shape takes, and whether a shape came of it.
    const choose = hooked.chooseShape.bind(sim);
    let shapeDraws = 0;
    let bad = 0;
    hooked.chooseShape = (c) => {
      const d0 = draws;
      const s = choose(c);
      shapeDraws += draws - d0;
      if (draws - d0 !== (s ? 1 : 0)) bad++;
      return s;
    };
    let events = 0;
    const shown = new Set<string>();
    while (!sim.finished) {
      sim.step();
      events += sim.tickEvents.length;
      if (sim.tick % 5 === 0) {
        const snap = sim.snapshot();
        expect('shape' in snap).toBe(true);
        if (snap.shape) shown.add(snap.shape.name);
      }
    }
    expect(bad).toBe(0);
    const picks = Object.values(sim.shapesPicked).reduce((a, n) => a + n, 0);
    return { events, home: sim.points.home, away: sim.points.away, draws, shapeDraws, picks, shown };
  };

  it('is a set of knobs by name, with its neighbours', () => {
    const names = listKnobs().map((k) => k.path);
    for (const k of ['shapes.on', 'shapes.holdTicks', 'shapes.lineM', 'shapes.reachM', 'shapes.maxShiftM', 'shapes.shortShare', 'shapes.weights.grind.pod', 'shapes.zones.line.backDoor', 'shapes.tackles.early.pod', 'shapes.spots.edge.nearWing.dy', 'shapes.spots.backDoor.nearHalf.depth']) {
      expect(names).toContain(k);
    }
  });
  it('off (shapes.on 0) draws no roll and shows no shape: the match as before it (seeds 1 and 11, pinned from a65edf9)', () => {
    const restore = applyTuning({ 'shapes.on': 0 });
    try {
      for (const seed of [1, 11]) {
        const off = play(seed);
        expect(off.shapeDraws).toBe(0);
        expect(off.picks).toBe(0);
        expect(off.shown.size).toBe(0);
        expect({ events: off.events, home: off.home, away: off.away, draws: off.draws }).toEqual(OFF[seed]);
      }
      // Its other knobs do nothing while it is off.
      const r2 = applyTuning({ 'shapes.holdTicks': 0, 'shapes.reachM': 0, 'shapes.maxShiftM': 0, 'shapes.weights.balanced.pod': 9, 'shapes.spots.pod.prop.dy': 8 });
      try {
        const off = play(1);
        expect({ events: off.events, home: off.home, away: off.away, draws: off.draws }).toEqual(OFF[1]);
      } finally {
        r2();
      }
    } finally {
      restore();
    }
  });
  it('on, it rolls once for each shape it picks and the view sees them', () => {
    expect(SHAPES.on).toBe(1);
    const on = play(11);
    expect(on.picks).toBeGreaterThan(10);
    expect(on.shapeDraws).toBe(on.picks);
    expect(on.draws).not.toBe(OFF[11]!.draws);
    expect(on.shown.size).toBeGreaterThanOrEqual(3);
  });
  type Inside = LiveSim & { phase: { kind: string; t0?: number; pace?: string | null }; shape: { at: number; name: string } | null; shapeInForce: () => unknown; shapeBallOut: { tick: number; shorts: number[] } | null };
  it('picks at the tackle: the shape is in force from the tackle it was picked at, and a quick play-the-ball drops it', () => {
    let tackles = 0;
    let quick = 0;
    for (let seed = 1; seed <= 4 && quick === 0; seed++) {
      const sim = new LiveSim(home, away, seed) as unknown as Inside;
      while (!sim.finished) {
        sim.step();
        const ph = sim.phase;
        if (ph.kind === 'tackle' && sim.shape && sim.shape.at === ph.t0 && sim.shape.name !== 'spread') {
          tackles++;
          expect(sim.shapeInForce()).toBe(sim.shape);
        }
        if (ph.kind === 'ruck' && ph.pace === 'quick') {
          quick++;
          expect(sim.shapeInForce()).toBeNull();
        }
      }
    }
    expect(tackles).toBeGreaterThan(10);
    expect(quick).toBeGreaterThan(0);
  }, 60_000);
  it('is formed as the ball leaves the ruck: every man it places within 2 m of his spot, most of the time', () => {
    let n = 0;
    let formed = 0;
    for (const seed of [1, 2, 3]) {
      const sim = new LiveSim(home, away, seed) as unknown as Inside;
      let last = -1;
      while (!sim.finished) {
        sim.step();
        const o = sim.shapeBallOut;
        if (!o || o.tick === last) continue;
        last = o.tick;
        n++;
        if (o.shorts.every((d) => d <= 2)) formed++;
      }
    }
    expect(n).toBeGreaterThan(20);
    expect(formed / n).toBeGreaterThan(0.75);
    // Without the levers (spots as the table says, offered from any distance) it mostly is not.
    const restore = applyTuning({ 'shapes.maxShiftM': 0, 'shapes.reachM': 0 });
    try {
      let m = 0;
      let ok = 0;
      const sim = new LiveSim(home, away, 1) as unknown as Inside;
      let last = -1;
      while (!sim.finished) {
        sim.step();
        const o = sim.shapeBallOut;
        if (!o || o.tick === last) continue;
        last = o.tick;
        m++;
        if (o.shorts.every((d) => d <= 2)) ok++;
      }
      expect(ok / m).toBeLessThan(formed / n);
    } finally {
      restore();
    }
  }, 60_000);
});

/** Seeds 1 and 11 at the off value: what a65edf9 plays (the 30-match totals agree too, in the commit message). */
const OFF: Record<number, { events: number; home: number; away: number; draws: number }> = {
  1: { events: 131, home: 6, away: 4, draws: 795 },
  11: { events: 142, home: 8, away: 12, draws: 842 },
};
