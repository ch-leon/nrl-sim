// tests/match/view/kickLayer.test.ts — kicks go wide (N15.3): the landing read off the
// ball, the framing maths and its return within a second, the trail's life, the watch
// over a kick, the framing of real matches' kicks, and the perf probe's longest-frame read.
import { describe, it, expect } from 'vitest';
import {
  FRAME_MARGIN,
  KICK_BACK_PER_S,
  KICK_HOLD_MS,
  KICK_OUT_PER_S,
  KICK_PAN_MAX_PX_PER_MS,
  KICK_RETURN_MS,
  KickWatch,
  LANDING_INSET,
  TRAIL_FADE_MS,
  contestants,
  framingHeld,
  cameraFrame,
  kickFrame,
  kickPoints,
  predictFlight,
  trailAlpha,
  trailStyle,
  type BallPoint,
  type Frame,
  type Kick,
  type WorldPt,
} from '../../../src/match/view/kickLayer';
import { GROUNDED_LIFT } from '../../../src/match/view/commentary';
import { easeZoom } from '../../../src/world/readability';
import { panTowards, fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';
import { flightAt, flightLift, grubberFlight, kickFlight, type BallState } from '../../../src/match/core/ball';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import type { PlayerSnap, SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const PHONE = { width: 844, height: 390 };
const DESKTOP = { width: 1280, height: 800 };
type Flight = Extract<BallState, { kind: 'flight' }>;

/** Where a world point lands on screen under a framing. */
const onScreen = (p: WorldPt, f: Frame, view: { width: number; height: number }) => ({
  x: (p.x - f.cx) * f.zoom + view.width / 2,
  y: (p.y - f.cy) * f.zoom + view.height / 2,
});
/** Inside the band the overlay leaves clear (a hair of slack for the float maths). */
const inBand = (p: WorldPt, f: Frame, view: { width: number; height: number }): boolean => {
  const s = onScreen(p, f, view);
  return s.x >= FRAME_MARGIN.left - 1e-6 && s.x <= view.width - FRAME_MARGIN.right + 1e-6 && s.y >= FRAME_MARGIN.top - 1e-6 && s.y <= view.height - FRAME_MARGIN.bottom + 1e-6;
};

describe('predictFlight: where a kick comes down, from its first three ticks in the air', () => {
  it('lands where the sim lands it and tops out where its flight does, for every kick height and length', () => {
    for (const peak of [7, 10, 12, 13, 20]) {
      for (const [from, to] of [
        [{ x: 30, y: 34 }, { x: 70, y: 20 }],
        [{ x: 80, y: 10 }, { x: 55, y: 60 }],
        [{ x: 50, y: 34 }, { x: 52, y: 34 }],
      ] as const) {
        const f = kickFlight(from, to, 100, null, peak) as Flight;
        const path: BallPoint[] = [1, 2, 3].map((t) => {
          const at = flightAt(f, 100 + t);
          return { x: at.pos.x, y: at.pos.y, lift: at.lift };
        });
        const p = predictFlight(path)!;
        expect(p.landing.x).toBeCloseTo(to.x, 6);
        expect(p.landing.y).toBeCloseTo(to.y, 6);
        // The top of the curve: no tick of the flight is higher, and it is the curve's own top.
        let top = 0;
        for (let t = 0; t <= f.ticks; t++) top = Math.max(top, flightAt(f, 100 + t).lift);
        expect(p.apex.lift).toBeGreaterThanOrEqual(top - 1e-9);
        let curveTop = 0;
        for (let u = 0; u <= 1; u += 1 / 4096) curveTop = Math.max(curveTop, flightLift(f.fromLift, f.peak, u));
        expect(p.apex.lift).toBeCloseTo(curveTop, 4);
      }
    }
  });

  it('reads nothing off too few ticks or heights that are not a falling curve', () => {
    expect(predictFlight([])).toBeNull();
    expect(predictFlight([{ x: 0, y: 0, lift: 1 }, { x: 1, y: 0, lift: 2 }])).toBeNull();
    // A straight line up, and a curve that bends upward: no landing.
    expect(predictFlight([{ x: 0, y: 0, lift: 1 }, { x: 1, y: 0, lift: 2 }, { x: 2, y: 0, lift: 3 }])).toBeNull();
    expect(predictFlight([{ x: 0, y: 0, lift: 1 }, { x: 1, y: 0, lift: 1.5 }, { x: 2, y: 0, lift: 3 }])).toBeNull();
  });
});

describe('kickFrame: the framing that holds the kicker and where the ball comes down', () => {
  it('keeps the zoom when the kick fits, centred in the band the overlay leaves clear', () => {
    const f = kickFrame([{ x: 100, y: 100 }, { x: 160, y: 120 }], PHONE, 2);
    expect(f.zoom).toBe(2);
    // The scoreboard above is shorter than the ticker and buttons below, and the Stats panel
    // wider than the left margin: the box sits a little high and to the left.
    expect(f.cx).toBeCloseTo(130 - (FRAME_MARGIN.left - FRAME_MARGIN.right) / 2 / 2);
    expect(f.cy).toBeCloseTo(110 - (FRAME_MARGIN.top - FRAME_MARGIN.bottom) / 2 / 2);
    const mid = onScreen({ x: 130, y: 110 }, f, PHONE);
    expect(mid.x).toBeCloseTo((FRAME_MARGIN.left + PHONE.width - FRAME_MARGIN.right) / 2);
    expect(mid.y).toBeCloseTo((FRAME_MARGIN.top + PHONE.height - FRAME_MARGIN.bottom) / 2);
    for (const p of [{ x: 100, y: 100 }, { x: 160, y: 120 }]) expect(inBand(p, f, PHONE)).toBe(true);
  });

  it('goes wide by whole numbers when it does not, never under 1', () => {
    // 500 px across needs 1000 at zoom 2: more than a phone's clear width, inside a desktop's.
    const wide = [{ x: 0, y: 0 }, { x: 500, y: 60 }];
    expect(kickFrame(wide, PHONE, 2).zoom).toBe(1);
    expect(kickFrame(wide, DESKTOP, 2).zoom).toBe(2);
    expect(kickFrame([{ x: 0, y: 0 }, { x: 600, y: 60 }], DESKTOP, 2).zoom).toBe(1);
    expect(kickFrame([{ x: 0, y: 0 }, { x: 500, y: 0 }], DESKTOP, 3).zoom).toBe(2);
    expect(kickFrame([{ x: 0, y: 0 }, { x: 5000, y: 5000 }], PHONE, 2).zoom).toBe(1);
    // A bomb's height counts: the top of its flight is a point to hold.
    expect(kickFrame([{ x: 100, y: 100 }, { x: 140, y: 100 }, { x: 140, y: 100 - 200 }], PHONE, 2).zoom).toBe(1);
    for (let w = 0; w < 1200; w += 37) for (const view of [PHONE, DESKTOP]) expect(Number.isInteger(kickFrame([{ x: 0, y: 0 }, { x: w, y: w / 3 }], view, 2).zoom)).toBe(true);
  });

  it('when they cannot all fit, holds the landing first, then the kicker, then the top of the flight as far as it goes', () => {
    // A bomb on a phone: 300 px from its top to the kicker, 194 px of clear band at zoom 1.
    const landing = { x: 0, y: 0 };
    const kicker = { x: 0, y: 150 };
    const top = { x: 0, y: -150 };
    const f = kickFrame([landing, kicker, top], PHONE, 2);
    expect(f.zoom).toBe(1);
    expect(inBand(landing, f, PHONE)).toBe(true);
    expect(inBand(kicker, f, PHONE)).toBe(true);
    expect(inBand(top, f, PHONE)).toBe(false);
    // The top is still as near the band as the other two allow: the kicker sits on its bottom edge.
    expect(onScreen(kicker, f, PHONE).y).toBeCloseTo(PHONE.height - FRAME_MARGIN.bottom);
    // The top pulls the frame up, but the landing keeps its inset from the band's bottom edge (the men under it).
    const high = { x: 0, y: -230 };
    const bomb = kickFrame([landing, { x: 0, y: -40 }, high], PHONE, 2);
    expect(bomb.zoom).toBe(1);
    expect(onScreen(landing, bomb, PHONE).y).toBeCloseTo(PHONE.height - FRAME_MARGIN.bottom - LANDING_INSET);
    expect(onScreen(high, bomb, PHONE).y).toBeLessThan(FRAME_MARGIN.top);
    // A kick too long to hold both: the landing stays in the band, its inset from the edge nearest the kicker.
    const far = kickFrame([{ x: 0, y: 0 }, { x: 0, y: 400 }], PHONE, 2);
    expect(inBand({ x: 0, y: 0 }, far, PHONE)).toBe(true);
    expect(onScreen({ x: 0, y: 0 }, far, PHONE).y).toBeCloseTo(FRAME_MARGIN.top + LANDING_INSET);
    // Across the field the same, the other way.
    const across = kickFrame([{ x: 0, y: 0 }, { x: -2000, y: 0 }], PHONE, 2);
    expect(onScreen({ x: 0, y: 0 }, across, PHONE).x).toBeCloseTo(PHONE.width - FRAME_MARGIN.right - LANDING_INSET);
  });

  it('goes out in half a second and comes back within a second of the catch or the bounce, at any speed', () => {
    // The framing holds KICK_HOLD_MS after the kick comes down, then the camera eases back at
    // KICK_BACK_PER_S with a pan cap too high to bind: the zoom is whole again and the pan home
    // inside the second. The cap is finite, so a 0 ms frame leaves the scroll where it is.
    expect(KICK_HOLD_MS + KICK_RETURN_MS).toBeLessThanOrEqual(1000);
    for (const fps of [60, 30, 20]) {
      const dt = 1000 / fps;
      let zoom = 1;
      let scroll = 0;
      for (let t = 0; t + dt <= KICK_RETURN_MS + 1e-9; t += dt) {
        zoom = easeZoom(zoom, 2, dt, KICK_BACK_PER_S);
        scroll = panTowards(scroll, 600, dt, KICK_BACK_PER_S, KICK_PAN_MAX_PX_PER_MS);
      }
      expect(zoom).toBe(2);
      expect(Math.abs(600 - scroll)).toBeLessThan(1);
      let out = 2;
      for (let t = 0; t + dt <= 500 + 1e-9; t += dt) out = easeZoom(out, 1, dt, KICK_OUT_PER_S);
      expect(out - 1).toBeLessThan(0.05);
    }
    expect(panTowards(250, 600, 0, KICK_BACK_PER_S, KICK_PAN_MAX_PX_PER_MS)).toBe(250);
    expect(framingHeld(null)).toBe(true);
    expect(framingHeld(KICK_HOLD_MS - 1)).toBe(true);
    expect(framingHeld(KICK_HOLD_MS)).toBe(false);
  });
});

describe('the trail', () => {
  it('is full while the kick is up and fades out after it comes down', () => {
    expect(trailAlpha(null)).toBe(1);
    expect(trailAlpha(0)).toBe(1);
    expect(trailAlpha(TRAIL_FADE_MS / 2)).toBeCloseTo(0.5);
    expect(trailAlpha(TRAIL_FADE_MS)).toBe(0);
    expect(trailAlpha(TRAIL_FADE_MS * 3)).toBe(0);
    // It outlasts the framing's hold: the camera is on its way back while the trail is still there to see.
    expect(trailAlpha(KICK_HOLD_MS)).toBeGreaterThan(0.5);
  });
});

// A hand-built tick: men and the ball.
const man = (side: 'home' | 'away', slot: number, x: number, y: number): PlayerSnap => ({ side, slot, x, y, pose: 'run', headX: 1, speed: 0 });
const snapAt = (tick: number, ball: { x: number; y: number; lift: number; holder?: { side: 'home' | 'away'; slot: number } | null }, players: PlayerSnap[] = []): Snapshot => ({
  tick,
  players,
  ball: { x: ball.x, y: ball.y, lift: ball.lift, holder: ball.holder ?? null },
  label: '',
  events: [],
});
const ev = (tick: number, kind: string, extra: Partial<SimEvent> = {}): SimEvent => ({ tick, kind, text: '', side: 'home', slot: 4, player: 'Kade Waratah', ...extra });
/** The ball of a flight at `tick`, as a snapshot shows it. */
const ballOf = (f: Flight, tick: number) => {
  const at = flightAt(f, tick);
  return { x: at.pos.x, y: at.pos.y, lift: at.lift };
};

describe('KickWatch', () => {
  it('starts at the kicker, draws the ball\'s path, reads where it lands and ends when someone has it', () => {
    const w = new KickWatch();
    const kicker = man('home', 4, 40, 30);
    const f = kickFlight({ x: 40, y: 30 }, { x: 72, y: 24 }, 10, null, 12) as Flight;
    w.event(ev(10, 'kick', { detail: 'long' }), snapAt(10, ballOf(f, 10), [kicker]));
    expect(w.kick).toMatchObject({ type: 'long', side: 'home', slot: 4, strike: { x: 40, y: 30 }, strikeTick: 10, downTick: null, flight: null, boot: false });
    // Big Boot (the event names him): the same kick, a wider trail in the trait colour.
    const boot = new KickWatch();
    boot.event(ev(10, 'kick', { detail: 'long', trait: 'Big Boot II' }), snapAt(10, ballOf(f, 10), [kicker]));
    expect(boot.kick!.boot).toBe(true);
    expect(trailStyle(true).widths[0]).toBeGreaterThan(trailStyle(false).widths[0]);
    expect(trailStyle(true).widths[1]).toBeGreaterThan(trailStyle(false).widths[1]);
    expect(trailStyle(true).color).not.toBe(trailStyle(false).color);
    for (let t = 11; t <= 12; t++) w.tick(snapAt(t, ballOf(f, t)));
    expect(w.kick!.flight).toBeNull();
    w.tick(snapAt(13, ballOf(f, 13)));
    expect(w.kick!.flight!.landing.x).toBeCloseTo(72, 6);
    expect(w.kick!.flight!.landing.y).toBeCloseTo(24, 6);
    for (let t = 14; t < 10 + f.ticks; t++) w.tick(snapAt(t, ballOf(f, t)));
    expect(w.kick!.path).toHaveLength(f.ticks - 1);
    w.tick(snapAt(10 + f.ticks, { x: 72, y: 24, lift: 1, holder: { side: 'away', slot: 0 } }));
    expect(w.kick!.downTick).toBe(10 + f.ticks);
    // Down is down: later ticks add nothing.
    w.tick(snapAt(11 + f.ticks, { x: 72, y: 24, lift: 0 }));
    expect(w.kick!.path).toHaveLength(f.ticks - 1);
  });

  it('ends when the ball lies on the ground two ticks running, not when it only comes down to it', () => {
    const w = new KickWatch();
    w.event(ev(10, 'kick', { detail: 'long' }), snapAt(10, { x: 40, y: 30, lift: 0.4 }));
    w.tick(snapAt(11, { x: 42, y: 30, lift: 3 }));
    w.tick(snapAt(12, { x: 44, y: 30, lift: 0 }));
    expect(w.kick!.downTick).toBeNull();
    w.tick(snapAt(13, { x: 44, y: 30, lift: 0 }));
    expect(w.kick!.downTick).toBe(13);
  });

  it('ends a kick whose flight it has read on the tick it lands (the bounce), and a grubber only when it lies still', () => {
    const w = new KickWatch();
    const f = kickFlight({ x: 40, y: 30 }, { x: 70, y: 30 }, 10, null, 12) as Flight;
    w.event(ev(10, 'kick', { detail: 'long' }), snapAt(10, ballOf(f, 10)));
    for (let t = 11; t < 10 + f.ticks; t++) w.tick(snapAt(t, ballOf(f, t)));
    expect(w.kick!.downTick).toBeNull();
    // Nobody under it: it bounces on from where it landed.
    w.tick(snapAt(10 + f.ticks, { x: 70, y: 30, lift: 0 }));
    expect(w.kick!.downTick).toBe(10 + f.ticks);
    const last = w.kick!.path[w.kick!.path.length - 1]!;
    expect([last.x, last.y]).toEqual([70, 30]);
    // A grubber's hops touch the ground a tick at a time and go on.
    const g = new KickWatch();
    g.event(ev(10, 'kick', { detail: 'grubber' }), snapAt(10, { x: 80, y: 30, lift: 0.3 }));
    for (const [i, lift] of [0.5, 0.2, 0, 0.3, 0.4, 0.1, 0, 0.2].entries()) g.tick(snapAt(11 + i, { x: 81 + i, y: 30, lift }));
    expect(g.kick!.downTick).toBeNull();
  });

  it('ends on an event that brings it down, and a skipped stretch forgets it', () => {
    const w = new KickWatch();
    w.event(ev(10, 'kickoff'), snapAt(10, { x: 50, y: 34, lift: 0.4 }));
    expect(w.kick!.type).toBe('kickoff');
    w.event(ev(30, 'touch', { detail: 'kick' }), snapAt(30, { x: 90, y: 0, lift: 0 }));
    expect(w.kick!.downTick).toBe(30);
    w.clear();
    expect(w.kick).toBeNull();
  });

  it('marks where a grubber skids, and reads no landing off its hops', () => {
    const w = new KickWatch();
    const f = grubberFlight({ x: 80, y: 30 }, { x: 100, y: 32 }, 10) as Flight;
    w.event(ev(10, 'kick', { detail: 'grubber' }), snapAt(10, ballOf(f, 10)));
    for (let t = 11; t < 10 + f.ticks; t++) w.tick(snapAt(t, ballOf(f, t)));
    expect(w.kick!.flight).toBeNull();
    // Four hops: it skids where each of the first three comes down, and once more as the last dies away.
    const xs = w.kick!.skids.map((s) => s.x);
    expect(xs).toHaveLength(4);
    for (const i of [0, 1, 2]) expect(Math.abs(xs[i]! - (80 + (20 * (i + 1)) / 4))).toBeLessThan(1.5);
    expect(xs[3]).toBeGreaterThan(xs[2]!);
    expect(xs[3]).toBeLessThan(100);
  });

  it('shows the contest under a bomb where it will come down, and who won it', () => {
    const w = new KickWatch();
    const kicker = man('home', 4, 40, 30);
    const chaser = man('home', 2, 61, 31);
    const fullback = man('away', 0, 63, 29);
    const far = man('away', 6, 30, 10);
    const men = [kicker, chaser, fullback, far];
    const f = kickFlight({ x: 40, y: 30 }, { x: 64, y: 30 }, 10, null, 20) as Flight;
    w.event(ev(10, 'kick', { detail: 'bomb' }), snapAt(10, ballOf(f, 10), men));
    // Going up: no contest yet.
    let t = 11;
    for (; flightAt(f, t).lift >= flightAt(f, t - 1).lift; t++) w.tick(snapAt(t, ballOf(f, t), men));
    expect(w.kick!.contest).toBeNull();
    // Over the top and coming down: the nearest man of each side to where it lands, as they get there.
    w.tick(snapAt(t, ballOf(f, t), men));
    expect(w.kick!.contest).toEqual([{ side: 'home', slot: 2 }, { side: 'away', slot: 0 }]);
    expect(f.ticks - (t - 10)).toBeGreaterThan(f.ticks / 3);
    const closer = man('home', 7, 64, 30.5);
    w.tick(snapAt(t + 1, ballOf(f, t + 1), [...men, closer]));
    expect(w.kick!.contest).toEqual([{ side: 'home', slot: 7 }, { side: 'away', slot: 0 }]);
    w.event(ev(10 + f.ticks, 'set-start', { side: 'away', slot: 0 }), snapAt(10 + f.ticks, { x: 64, y: 30, lift: 1, holder: { side: 'away', slot: 0 } }, [...men, closer]));
    expect(w.kick!.winner).toEqual({ side: 'away', slot: 0 });
    expect(w.kick!.downTick).toBe(10 + f.ticks);
  });

  it('gives the contest to whoever has the ball when it is taken without a word', () => {
    const w = new KickWatch();
    const men = [man('home', 2, 61, 31), man('away', 0, 63, 29)];
    const f = kickFlight({ x: 40, y: 30 }, { x: 64, y: 30 }, 10, null, 20) as Flight;
    w.event(ev(10, 'kick', { detail: 'bomb' }), snapAt(10, ballOf(f, 10), men));
    for (let t = 11; t < 10 + f.ticks; t++) w.tick(snapAt(t, ballOf(f, t), men));
    expect(w.kick!.contest).not.toBeNull();
    w.tick(snapAt(10 + f.ticks, { x: 64, y: 30, lift: 1, holder: { side: 'home', slot: 2 } }, men));
    expect(w.kick!.winner).toEqual({ side: 'home', slot: 2 });
  });

  it('has no contest without a man of each side near the ball, and none for a long kick', () => {
    const s = snapAt(20, { x: 60, y: 30, lift: 4 }, [man('home', 2, 61, 30), man('away', 0, 90, 30)]);
    expect(contestants(s, { x: 60, y: 30 }, 'home')).toBeNull();
    const w = new KickWatch();
    w.event(ev(10, 'kick', { detail: 'long' }), snapAt(10, { x: 40, y: 30, lift: 0.4 }));
    w.tick(snapAt(11, { x: 60, y: 30, lift: 4 }, [man('home', 2, 61, 30), man('away', 0, 60, 31)]));
    expect(w.kick!.contest).toBeNull();
  });
});

describe('kicks in real matches', () => {
  it('every kick comes down before the next, lands where the view read it would, and its framing holds the landing in a whole-number zoom', () => {
    // The sim's own flight, read here only to check the view's reading of it.
    const flightOf = (sim: LiveSim): Flight | null => {
      const b = (sim as unknown as { ball: BallState }).ball;
      return b.kind === 'flight' ? b : null;
    };
    const off = fieldOffsetX();
    const toWorld = (fx: number, fy: number) => fieldToWorldPoint(fx, fy, off);
    let kicks = 0;
    let read = 0;
    let checked = 0;
    const held = { phone: 0, desktop: 0 };
    const frames = { phone: 0, desktop: 0 };
    const zooms = { phone: new Set<number>(), desktop: new Set<number>() };
    const types = new Set<string>();
    const done: Kick[] = [];
    const aimed = new Map<Kick, { x: number; y: number }>();
    for (const seed of [31, 32]) {
      const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed);
      const w = new KickWatch();
      let open: Kick | null = null;
      while (!sim.finished && sim.tick < 100_000) {
        sim.step();
        const snap = sim.snapshot();
        for (const e of sim.tickEvents) {
          w.event(e, snap);
          if (w.kick !== open && w.kick) {
            if (open) expect(open.downTick, `the ${open.type} at ${open.strikeTick} came down`).not.toBeNull();
            if (open) done.push(open);
            open = w.kick;
            const f = flightOf(sim);
            if (f) aimed.set(open, f.to);
            kicks++;
            types.add(open.type);
          }
        }
        w.tick(snap);
        if (open && open.downTick === null && open.flight) {
          for (const [name, view] of [['phone', PHONE], ['desktop', DESKTOP]] as const) {
            const pts = kickPoints(open, toWorld);
            const f = kickFrame(pts, view, 2);
            zooms[name].add(f.zoom);
            frames[name]++;
            expect(inBand(pts[0]!, f, view), `the ${open.type} at ${open.strikeTick}: its landing in the band`).toBe(true);
            if (inBand(pts[1]!, f, view)) held[name]++;
          }
        }
      }
      if (open) done.push(open);
    }
    for (const k of done) {
      if (k.type === 'grubber') {
        expect(k.flight).toBeNull();
        continue;
      }
      if (!k.flight) continue;
      read++;
      // The view reads the spot the sim aimed it at, and where it came to ground it came down there.
      const to = aimed.get(k)!;
      expect(Math.hypot(to.x - k.flight.landing.x, to.y - k.flight.landing.y), `the ${k.type} at ${k.strikeTick}`).toBeLessThan(1e-6);
      const ground = k.path.find((p) => p.lift < GROUNDED_LIFT);
      if (ground) {
        checked++;
        expect(Math.hypot(ground.x - k.flight.landing.x, ground.y - k.flight.landing.y), `the ${k.type} at ${k.strikeTick}`).toBeLessThan(1e-6);
      }
      expect(k.flight.apex.lift).toBeGreaterThanOrEqual(Math.max(...k.path.map((p) => p.lift)) - 1e-9);
    }
    expect(kicks).toBeGreaterThan(20);
    // Nearly every kick's landing is read off its first ticks (a charge-down or a quick take may beat it).
    expect(read).toBeGreaterThan(0.9 * done.filter((k) => k.type !== 'grubber').length);
    expect(checked).toBeGreaterThan(2);
    // The phone goes wide for kicks. The landing stays in the band (asserted above).
    // Desktop holds the kicker with it. A phone holds him on most frames of these
    // two seeds (about 71% after the 7:00 cut) and loses him on a long kick, as
    // tuning §9 already says.
    expect(zooms.phone).toContain(1);
    for (const z of [...zooms.phone, ...zooms.desktop]) expect([1, 2]).toContain(z);
    expect(held.desktop / frames.desktop).toBeGreaterThan(0.9);
    expect(held.phone / frames.phone).toBeGreaterThan(0.65);
    for (const t of ['long', 'bomb', 'kickoff']) expect(types).toContain(t);
  });
});

describe('cameraFrame: a pinch keeps a kick from panning the camera', () => {
  const replay = { cx: 1, cy: 2, zoom: 1 };
  const kick = { cx: 9, cy: 8, zoom: 1 };
  it('takes the replay, else the kick, and skips the kick once the player holds the zoom', () => {
    expect(cameraFrame(replay, kick, false)).toBe(replay);
    expect(cameraFrame(null, kick, false)).toBe(kick);
    expect(cameraFrame(null, kick, true)).toBeNull();
    expect(cameraFrame(replay, kick, true)).toBe(replay);
    expect(cameraFrame(null, null, false)).toBeNull();
  });
});

describe('the perf probe', () => {
  const PROBE = Object.values(import.meta.glob('../../../scripts/e2e-perf.mjs', { query: '?raw', import: 'default', eager: true }))[0] as string;
  it('reads the longest frame while the match plays, under its own label, before Skip', () => {
    expect(PROBE).toContain('const MATCH_FRAME_MOMENT = `match play at ×4 (${MATCH_WATCH_MS / 1000} s): longest frame`;');
    expect(PROBE).toContain('matchFrameMs: pick(MATCH_FRAME_MOMENT)');
    expect(PROBE.indexOf('await timed(MATCH_FRAME_MOMENT')).toBeGreaterThan(PROBE.indexOf("'Advance Week → match scene (hand-off)'"));
    expect(PROBE.indexOf('await timed(MATCH_FRAME_MOMENT')).toBeLessThan(PROBE.indexOf("await timed('Skip → full time'"));
  });
});
