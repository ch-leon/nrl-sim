// tests/world/playback.test.ts — scheduling + controller behaviour against a
// fake scene (no Phaser). Covers clock compression math, event ordering and
// intra-minute spreading, speed scaling, skip correctness, the single-finish
// guard, the anchored formation (no collapse after hundreds of events), and the
// animation beats (run/idle, tackle, try dive + celebrate, goal-kick arc).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  dueTimes,
  eventTimeMs,
  orderedEvents,
  PlaybackController,
  KICK_FLIGHTS,
  kickFlight,
  flightLift,
  moveProgress,
  moveSpeedFactor,
  cruiseFactor,
  slotSpeeds,
  SIM_MINUTES,
  REAL_SECONDS_AT_1X,
  type PlaybackActor,
  type PlaybackScene,
  type PlaybackSpeed,
} from '../../src/world/playback';
import { fieldToWorldPoint, fieldOffsetX } from '../../src/scenes/matchField';
import { HOOKER_SLOT, KICKER_SLOT, SLOTS } from '../../src/world/formation';
import type { PlayerAnim } from '../../src/art/match/players';
import { bus } from '../../src/core/events';
import type { MatchEvent, MatchEventKind, MatchResult } from '../../src/sim/events';
import type { Fixture } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';

// ── Fake scene ────────────────────────────────────────────────────────────────
interface FakeActor extends PlaybackActor {
  x: number;
  y: number;
  depth: number;
  anim: PlayerAnim;
  faceLeft: boolean;
  played: PlayerAnim[];
  /** Run-cycle time scales seen (one per frame while running). */
  runScales: number[];
}
interface FakeScene extends PlaybackScene {
  shakes: number;
  players: { home: FakeActor[]; away: FakeActor[] };
  ball: { place(x: number, y: number, lift: number, depth: number): void; x: number; y: number; lift: number; maxLift: number };
}

function actor(): FakeActor {
  const a: FakeActor = {
    x: 0,
    y: 0,
    depth: 0,
    anim: 'idle',
    faceLeft: false,
    played: [],
    runScales: [],
    place(x, y, depth) {
      a.x = x;
      a.y = y;
      a.depth = depth;
    },
    play(anim, faceLeft, timeScale) {
      if (anim === 'run') a.runScales.push(timeScale);
      if (a.played[a.played.length - 1] !== anim) a.played.push(anim);
      a.anim = anim;
      a.faceLeft = faceLeft;
    },
  };
  return a;
}

/** `real` uses the true iso projection; otherwise a simple linear map. */
function makeFakeScene(homeId = 'H', real = false): FakeScene {
  const off = fieldOffsetX();
  const scene: FakeScene = {
    homeId,
    shakes: 0,
    players: { home: Array.from({ length: 9 }, actor), away: Array.from({ length: 9 }, actor) },
    ball: {
      x: 0,
      y: 0,
      lift: 0,
      maxLift: 0,
      place(x, y, lift) {
        scene.ball.x = x;
        scene.ball.y = y;
        scene.ball.lift = lift;
        scene.ball.maxLift = Math.max(scene.ball.maxLift, lift);
      },
    },
    fieldToWorld: real ? (fx, fy) => fieldToWorldPoint(fx, fy, off) : (fx, fy) => ({ x: fx * 5, y: fy * 3 }),
    cameras: {
      main: {
        shake: () => {
          scene.shakes++;
        },
      },
    },
  };
  return scene;
}

function mkResult(events: MatchEvent[], overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    homeScore: 0,
    awayScore: 0,
    events,
    stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
    weather: 'clear',
    momentumTimeline: [],
    injuries: [],
    ...overrides,
  };
}

/** Advance in small frames (like a real game loop). */
function run(ctrl: PlaybackController, ms: number, frame = 16): void {
  for (let t = 0; t < ms; t += frame) ctrl.update(frame);
}

const FIX: Fixture = { round: 1, homeId: 'H', awayId: 'A' };

// ── Pure helpers ────────────────────────────────────────────────────────────────
describe('eventTimeMs', () => {
  it('compresses 80 sim-min to ~90s at ×1', () => {
    expect(eventTimeMs(0, 1)).toBe(0);
    expect(eventTimeMs(SIM_MINUTES, 1)).toBe(REAL_SECONDS_AT_1X * 1000);
    expect(eventTimeMs(40, 1)).toBe((REAL_SECONDS_AT_1X * 1000) / 2);
  });

  it('scales inversely with speed', () => {
    expect(eventTimeMs(80, 2)).toBe(eventTimeMs(80, 1) / 2);
    expect(eventTimeMs(80, 4)).toBe(eventTimeMs(80, 1) / 4);
  });
});

describe('orderedEvents', () => {
  it('sorts by t and preserves same-minute order (stable)', () => {
    const evs: MatchEvent[] = [
      { t: 10, kind: 'run', teamId: 'H' },
      { t: 5, kind: 'set-start', teamId: 'H' },
      { t: 10, kind: 'break', teamId: 'H' },
      { t: 0, kind: 'kickoff', teamId: 'H' },
    ];
    const out = orderedEvents(evs);
    expect(out.map((e) => e.kind)).toEqual(['kickoff', 'set-start', 'run', 'break']);
  });
});

describe('dueTimes', () => {
  it('spreads events sharing a minute evenly across it, first one on the minute', () => {
    const evs = orderedEvents([
      { t: 10, kind: 'set-start', teamId: 'H' },
      { t: 10, kind: 'run', teamId: 'H' },
      { t: 10, kind: 'run', teamId: 'H' },
      { t: 12, kind: 'run', teamId: 'H' },
    ]);
    const d = dueTimes(evs);
    expect(d[0]).toBe(eventTimeMs(10, 1));
    expect(d[1]).toBeCloseTo(eventTimeMs(10 + 1 / 3, 1));
    expect(d[2]).toBeCloseTo(eventTimeMs(10 + 2 / 3, 1));
    expect(d[3]).toBe(eventTimeMs(12, 1));
    for (let i = 1; i < d.length; i++) expect(d[i]!).toBeGreaterThan(d[i - 1]!);
  });
});

// ── Controller: scheduling ───────────────────────────────────────────────────────
describe('PlaybackController scheduling', () => {
  let events: MatchEvent[];
  beforeEach(() => {
    events = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 10, kind: 'run', teamId: 'H', x: 40, y: 50 },
      { t: 40, kind: 'half-time', teamId: 'H' },
      { t: 60, kind: 'try', teamId: 'H', x: 100, y: 30 },
      { t: 60, kind: 'conversion', teamId: 'H', detail: 'good', x: 90, y: 50 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
  });
  afterEach(() => bus.clear());

  it('fires every event in t order, re-emitted as match:event', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(`${e.kind}@${e.t}`));
    ctrl.update(200_000);
    expect(seen).toEqual(['kickoff@0', 'run@10', 'half-time@40', 'try@60', 'conversion@60', 'full-time@80']);
  });

  it('paces events: nothing fires before its scheduled time', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    // eventTimeMs(10,1) = 11250ms. Advance 5s: only kickoff.
    ctrl.update(5_000);
    expect(seen).toEqual(['kickoff']);
    ctrl.update(7_000);
    expect(seen).toEqual(['kickoff', 'run']);
  });

  it('speed multiplies the accumulation rate', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    ctrl.setSpeed(4 as PlaybackSpeed);
    ctrl.update(5_000); // 20000ms clock ≥ run(11250)
    expect(seen).toEqual(['kickoff', 'run']);
  });

  it('half-time pauses the clock then resumes', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    ctrl.update(46_000);
    expect(seen).toContain('half-time');
    expect(seen).not.toContain('try');
    ctrl.update(1_000);
    expect(seen).not.toContain('try');
    ctrl.update(60_000);
    expect(seen).toContain('try');
  });

  it('a try holds the clock so the celebration plays before the conversion', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    // The try is due at clock 67500ms; the 1.5s half-time pause pushes that to
    // 69000ms real. The conversion (half a minute later, clock 68062ms) would
    // fire ~560ms after the try without the try hold.
    ctrl.update(69_100);
    expect(seen).toContain('try');
    run(ctrl, 1_500);
    expect(seen).not.toContain('conversion');
    run(ctrl, 1_000);
    expect(seen).toContain('conversion');
  });

  it('skip emits every remaining event in order then finishes once', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    const seen: string[] = [];
    let finishes = 0;
    bus.on('match:event', (e) => seen.push(e.kind));
    bus.on('match:finished', () => finishes++);
    ctrl.update(6_000);
    expect(seen).toEqual(['kickoff']);
    ctrl.skip();
    expect(seen).toEqual(['kickoff', 'run', 'half-time', 'try', 'conversion', 'full-time']);
    expect(ctrl.finished).toBe(true);
    expect(finishes).toBe(1);
  });

  it('emits match:finished exactly once (natural full-time)', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    let finishes = 0;
    bus.on('match:finished', () => finishes++);
    ctrl.update(200_000);
    ctrl.update(50_000);
    ctrl.skip();
    expect(finishes).toBe(1);
  });

  it('does not emit match:finished when no fixture is supplied', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events));
    let finishes = 0;
    bus.on('match:finished', () => finishes++);
    ctrl.update(200_000);
    expect(finishes).toBe(0);
    expect(ctrl.finished).toBe(true);
  });

  it('emits match:event before any sprite moves for that event', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    let ballAtEmit: { x: number; y: number } | null = null;
    bus.on('match:event', (e) => {
      if (e.kind === 'run') ballAtEmit = { x: scene.ball.x, y: scene.ball.y };
    });
    ctrl.update(5_000);
    const settled = { x: scene.ball.x, y: scene.ball.y };
    ctrl.update(7_000);
    expect(ballAtEmit).toEqual(settled);
  });

  it('is presentation-only: never mutates GameState (no state:changed emitted)', () => {
    const ctrl = new PlaybackController(makeFakeScene(), mkResult(events), FIX);
    let stateChanges = 0;
    bus.on('state:changed', () => stateChanges++);
    ctrl.update(200_000);
    ctrl.skip();
    expect(stateChanges).toBe(0);
  });
});

// ── Controller: animation beats ──────────────────────────────────────────────────
describe('PlaybackController beats', () => {
  afterEach(() => bus.clear());

  it('runner carries the ball to the event spot, running then settling to idle', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 5, kind: 'set-start', teamId: 'A', x: 70, y: 40 },
      { t: 6, kind: 'run', teamId: 'A', x: 62, y: 35 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(6, 1) + 4_000);
    const spot = fieldToWorldPoint(62, 35, fieldOffsetX());
    // Ball sits in a carrier's hands at the run's spot (hand offset ≤ 8px).
    expect(Math.abs(scene.ball.x - spot.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(scene.ball.y - spot.y)).toBeLessThanOrEqual(1);
    const carrier = scene.players.away.find((a) => Math.abs(a.x - spot.x) < 1 && Math.abs(a.y - spot.y) < 1);
    expect(carrier).toBeDefined();
    expect(carrier!.played).toContain('run');
    // Everyone has arrived → idle, watching the ball (#20); anyone roughly level
    // with it faces the end they attack (away faces left).
    for (const side of ['home', 'away'] as const) {
      for (const a of scene.players[side]) {
        expect(a.anim).toBe('idle');
        const dx = scene.ball.x - a.x;
        const expected = Math.abs(dx) <= 12 ? side === 'away' : dx < 0;
        expect(a.faceLeft).toBe(expected);
      }
    }
  });

  it('players face their direction of travel while running', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 2, kind: 'set-start', teamId: 'H', x: 20, y: 50 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(2, 1) + 200);
    // Home retreats toward fx=20 (screen-left): runners face left.
    const runners = scene.players.home.filter((a) => a.anim === 'run');
    expect(runners.length).toBeGreaterThan(0);
    expect(runners.some((a) => a.faceLeft)).toBe(true);
  });

  it('tackle: tackler dives in, carrier is tackled, both get up; camera shakes', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 3, kind: 'run', teamId: 'H', x: 55, y: 50 },
      { t: 4, kind: 'big-hit', teamId: 'A', x: 58, y: 52 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(4, 1) + 5_000);
    expect(scene.players.away.some((a) => a.played.includes('tackle'))).toBe(true);
    expect(scene.players.home.some((a) => a.played.includes('tackled'))).toBe(true);
    expect(scene.shakes).toBe(1);
    // Back on their feet afterwards.
    expect([...scene.players.home, ...scene.players.away].every((a) => a.anim === 'idle')).toBe(true);
  });

  it('try: scorer dives over the line and the team celebrates', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 3, kind: 'break', teamId: 'H', x: 85, y: 30 },
      { t: 4, kind: 'try', teamId: 'H', x: 100, y: 30 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(4, 1) + 3_000);
    const line = fieldToWorldPoint(100, 30, fieldOffsetX());
    const scorer = scene.players.home.find((a) => a.played.includes('dive'));
    expect(scorer).toBeDefined();
    expect(scorer!.x).toBeGreaterThan(line.x); // over the try-line (home attacks +x)
    const celebrating = scene.players.home.filter((a) => a.anim === 'celebrate').length;
    // Nines: 9 on field — most of the side should celebrate.
    expect(celebrating).toBeGreaterThanOrEqual(7);
  });

  it('conversion: the kicker kicks and the ball arcs high toward the posts', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 4, kind: 'try', teamId: 'H', x: 100, y: 30 },
      { t: 5, kind: 'conversion', teamId: 'H', detail: 'good', x: 90, y: 50 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(5, 1) + 2_000); // through the try hold
    scene.ball.maxLift = 0;
    run(ctrl, 6_000);
    expect(scene.players.home[KICKER_SLOT]!.played).toContain('kick');
    expect(scene.ball.maxLift).toBeGreaterThan(40);
    // Ball comes down beyond the try-line.
    expect(scene.ball.x).toBeGreaterThan(fieldToWorldPoint(100, 50, fieldOffsetX()).x);
  });

  it('full-time: the winners celebrate', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs, { homeScore: 4, awayScore: 22 }), FIX);
    ctrl.skip();
    expect(scene.players.away.every((a) => a.anim === 'celebrate')).toBe(true);
    expect(scene.players.home.every((a) => a.anim === 'idle')).toBe(true);
  });

  it('depth follows each sprite’s feet y every frame', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 1, kind: 'set-start', teamId: 'A', x: 75, y: 70 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(1, 1) + 300);
    for (const a of [...scene.players.home, ...scene.players.away]) {
      expect(a.depth).toBeGreaterThan(a.y);
      expect(a.depth).toBeLessThan(a.y + 1.1);
    }
  });
});

// ── Regression: the formation must never collapse ───────────────────────────────
describe('PlaybackController anchored formation (bug: dots collapsed into one column)', () => {
  afterEach(() => bus.clear());

  it('after 500 random events the 18 Nines players stay spread across the field', () => {
    const rng = makeRng(1234);
    const kinds: MatchEventKind[] = [
      'set-start', 'run', 'break', 'tackle', 'big-hit', 'fend', 'break-tackle', 'kick', 'error', 'penalty',
    ];
    const events: MatchEvent[] = [{ t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 }];
    for (let i = 0; i < 500; i++) {
      events.push({
        t: Math.min(79, Math.floor((i / 500) * 80)),
        kind: kinds[Math.floor(rng.next() * kinds.length)]!,
        teamId: rng.next() < 0.5 ? 'H' : 'A',
        x: Math.round(rng.next() * 100),
        y: Math.round(5 + rng.next() * 90),
      });
    }
    const scene = makeFakeScene('H', true);
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const stdev = (xs: number[]): number => {
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
    };
    let checked = 0;
    bus.on('match:event', () => {
      // Check the targets set by the PREVIOUS event (this one hasn't applied yet).
      const t = ctrl.targets();
      const all = [...t.home, ...t.away];
      const screenX = all.map((p) => scene.fieldToWorld(p.fx, p.fy).x);
      const distinct = new Set(screenX.map((x) => Math.round(x / 4))).size;
      expect(stdev(screenX)).toBeGreaterThan(80);
      // 18 sprites → slightly fewer distinct x-buckets than the old 26-a-side test.
      expect(distinct).toBeGreaterThan(12);
      for (const side of [t.home, t.away]) {
        // Overall width stays open (detailed winger lanes covered in formation.test).
        expect(Math.max(...side.map((p) => p.fy)) - Math.min(...side.map((p) => p.fy))).toBeGreaterThan(40);
      }
      checked++;
    });
    ctrl.skip();
    expect(checked).toBe(events.length);
    // And the rendered sprites (snapped by skip) agree with the targets.
    const xs = [...scene.players.home, ...scene.players.away].map((a) => a.x);
    expect(stdev(xs)).toBeGreaterThan(80);
  });
});

// ── Kick flights by type (#15) ─────────────────────────────────────────────────
describe('PlaybackController kick flights (#15)', () => {
  afterEach(() => bus.clear());

  /** Kick for H at fx 45 (attacking +fx), followed by `next` in the same minute. */
  function kickScenario(detail: string, next: MatchEvent): { scene: FakeScene; ctrl: PlaybackController; lifts: number[]; seen: string[] } {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 10, kind: 'set-start', teamId: 'H', x: 40, y: 50 },
      { t: 10, kind: 'kick', teamId: 'H', x: 45, y: 40, detail },
      next,
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    const lifts: number[] = [];
    const place = scene.ball.place.bind(scene.ball);
    scene.ball.place = (x, y, lift, depth) => {
      if (seen.includes('kick')) lifts.push(lift);
      place(x, y, lift, depth);
    };
    return { scene, ctrl, lifts, seen };
  }

  const nearest = (scene: FakeScene, x: number, y: number): { side: 'home' | 'away'; d: number } => {
    let best = { side: 'home' as 'home' | 'away', d: Infinity };
    for (const side of ['home', 'away'] as const) {
      for (const a of scene.players[side]) {
        const d = Math.hypot(a.x - x, a.y - y);
        if (d < best.d) best = { side, d };
      }
    }
    return best;
  };

  it('a bomb goes up high and slow, the kicker kicks, and the receivers claim it', () => {
    const { scene, ctrl, lifts, seen } = kickScenario('bomb', { t: 10, kind: 'set-start', teamId: 'A', x: 75, y: 30 });
    run(ctrl, eventTimeMs(10, 1) + 450); // set-start, kick share minute 10 with the next set
    expect(seen).toContain('kick');
    // The next event is held back until the bomb has come down.
    expect(seen.filter((k) => k === 'set-start')).toHaveLength(1);
    run(ctrl, 3_500);
    expect(seen.filter((k) => k === 'set-start')).toHaveLength(2);
    expect(scene.players.home.some((a) => a.played.includes('kick'))).toBe(true);
    expect(Math.max(...lifts)).toBeGreaterThan(80);
    // Contest: somebody leapt for it (#19 catch pose).
    expect([...scene.players.home, ...scene.players.away].some((a) => a.played.includes('catch'))).toBe(true);
  });

  it('a bomb that leads to a set for the kicking side is regathered by the chaser', () => {
    const { scene, ctrl } = kickScenario('bomb', { t: 10, kind: 'set-start', teamId: 'H', x: 72, y: 30 });
    run(ctrl, eventTimeMs(10, 1) + 450);
    // Stop just after landing, before the next set reshuffles possession.
    let landed = false;
    for (let i = 0; i < 400 && !landed; i++) {
      run(ctrl, 16);
      landed = scene.ball.lift === 10; // CARRY_LIFT: held again
    }
    expect(landed).toBe(true);
    expect(nearest(scene, scene.ball.x, scene.ball.y).side).toBe('home');
  });

  it('a grubber stays low and bounces along the ground', () => {
    const { ctrl, lifts } = kickScenario('grubber', { t: 10, kind: 'set-start', teamId: 'A', x: 70, y: 40 });
    run(ctrl, eventTimeMs(10, 1) + 3_000);
    const flight = lifts.slice(lifts.findIndex((l) => l < 2)); // after it leaves the boot
    expect(Math.max(...flight)).toBeLessThan(12);
    // Several touch-downs (near-zero lift) separated by hops.
    let touches = 0;
    for (let i = 1; i < flight.length; i++) if (flight[i - 1]! >= 1.5 && flight[i]! < 1.5) touches++;
    expect(touches).toBeGreaterThanOrEqual(2);
  });

  it('a find-touch kick lands over the touchline and is left dead', () => {
    const { scene, ctrl } = kickScenario('find-touch', { t: 11, kind: 'set-start', teamId: 'A', x: 82, y: 20 });
    // Snapshot the ball as the receiving set fires (bus emits before anything moves).
    let atRestart: { x: number; y: number; lift: number } | null = null;
    bus.on('match:event', (e) => {
      if (e.kind === 'set-start' && e.teamId === 'A') atRestart = { x: scene.ball.x, y: scene.ball.y, lift: scene.ball.lift };
    });
    run(ctrl, eventTimeMs(11, 1) + 4_000);
    expect(atRestart).not.toBeNull();
    const off = fieldOffsetX();
    const line = fieldToWorldPoint(82, 0, off);
    const inside = fieldToWorldPoint(82, 5, off);
    // fy < 0 lies on the far side of the fy=0 touchline from the field.
    const outward = Math.sign(line.y - inside.y);
    expect(Math.sign(atRestart!.y - line.y)).toBe(outward);
    expect(atRestart!.lift).toBe(0);
  });

  it('each kick type has its own flight shape', () => {
    expect(KICK_FLIGHTS.bomb.peak).toBeGreaterThan(KICK_FLIGHTS.chip.peak);
    expect(KICK_FLIGHTS.bomb.dur).toBeGreaterThan(KICK_FLIGHTS.chip.dur);
    expect(KICK_FLIGHTS.grubber.bounces).toBeGreaterThan(0);
    expect(KICK_FLIGHTS['find-touch'].touch && KICK_FLIGHTS['40-20'].touch).toBe(true);
    expect(kickFlight(undefined)).toBe(KICK_FLIGHTS['find-touch']);
    expect(kickFlight('mystery')).toBe(KICK_FLIGHTS['find-touch']);
    // Grubber hops decay and touch down; parabola peaks mid-flight.
    expect(flightLift(0, 10, 0, 3)).toBeCloseTo(0);
    expect(flightLift(0, 10, 1 / 3, 3)).toBeCloseTo(0, 5);
    expect(flightLift(0, 10, 1 / 6, 3)).toBeGreaterThan(flightLift(0, 10, 5 / 6, 3));
    expect(flightLift(0, 100, 0.5)).toBeCloseTo(100);
  });

  it('skip settles mid-kick cleanly and still finishes once', () => {
    const { ctrl } = kickScenario('bomb', { t: 10, kind: 'set-start', teamId: 'A', x: 75, y: 30 });
    let finished = 0;
    bus.on('match:finished', () => finished++);
    run(ctrl, eventTimeMs(10, 1) + 600); // mid wind-up / flight
    ctrl.skip();
    expect(ctrl.finished).toBe(true);
    expect(finished).toBe(1);
  });
});

// ── Ruck + contact animation (#19) ────────────────────────────────────────────
describe('PlaybackController ruck and contact beats (#19)', () => {
  afterEach(() => bus.clear());

  const tackleThenRun = (kind: 'tackle' | 'big-hit'): MatchEvent[] => [
    { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
    { t: 3, kind: 'run', teamId: 'H', x: 55, y: 50 },
    { t: 4, kind: kind, teamId: 'A', x: 58, y: 52 },
    { t: 5, kind: 'run', teamId: 'H', x: 62, y: 46 },
    { t: 80, kind: 'full-time', teamId: 'H' },
  ];

  it('a tackled carrier plays the ball and the dummy-half stoops to collect it', () => {
    const scene = makeFakeScene('H', true);
    const ctrl = new PlaybackController(scene, mkResult(tackleThenRun('tackle')), FIX);
    const dh = scene.players.home[HOOKER_SLOT]!;
    let dhHeld = false;
    const place = scene.ball.place.bind(scene.ball);
    scene.ball.place = (x, y, lift, depth) => {
      if (Math.hypot(x - dh.x, y - dh.y) < 9 && lift >= 3) dhHeld = true;
      place(x, y, lift, depth);
    };
    run(ctrl, eventTimeMs(5, 1) + 3_000);
    expect(scene.players.home.some((a) => a.played.includes('ptb'))).toBe(true);
    expect(dh.played).toContain('dummyHalf');
    // The next carry goes through the dummy-half's hands.
    expect(dhHeld).toBe(true);
  });

  it('a big-hit drives the carrier back toward his own line', () => {
    const spot = fieldToWorldPoint(58, 52, fieldOffsetX());
    const lie = (kind: 'tackle' | 'big-hit'): number => {
      const scene = makeFakeScene('H', true);
      const ctrl = new PlaybackController(scene, mkResult(tackleThenRun(kind).slice(0, 3)), FIX);
      run(ctrl, eventTimeMs(4, 1) + 3_000);
      const carrier = scene.players.home.find((a) => a.played.includes('tackled'))!;
      return carrier.x;
    };
    // Home attacks +x (screen-right): driven back = further left than a normal tackle.
    expect(lie('big-hit')).toBeLessThan(lie('tackle') - 5);
    expect(lie('tackle')).toBeCloseTo(spot.x, 0);
  });

  it('a fend: carrier straight-arms, defender is shrugged off', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 3, kind: 'fend', teamId: 'H', x: 58, y: 40 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(3, 1) + 4_000);
    expect(scene.players.home.some((a) => a.played.includes('fend'))).toBe(true);
    expect(scene.players.away.some((a) => a.played.includes('tackled'))).toBe(true);
  });

  it('a break-tackle: the defender dives and misses', () => {
    const scene = makeFakeScene('H', true);
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 3, kind: 'break-tackle', teamId: 'H', x: 58, y: 40 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    run(ctrl, eventTimeMs(3, 1) + 4_000);
    const missed = scene.players.away.find((a) => a.played.includes('tackle'));
    expect(missed).toBeDefined();
    expect(missed!.played).toContain('down');
    expect(scene.players.home.some((a) => a.played.includes('fend'))).toBe(true);
  });

  it('a line break gets there faster than an ordinary carry', () => {
    const arrival = (kind: 'run' | 'break'): number => {
      const scene = makeFakeScene('H', true);
      const evs: MatchEvent[] = [
        { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
        { t: 3, kind, teamId: 'H', x: 75, y: 30 },
        { t: 80, kind: 'full-time', teamId: 'H' },
      ];
      const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
      run(ctrl, eventTimeMs(3, 1));
      const spot = fieldToWorldPoint(75, 30, fieldOffsetX());
      for (let ms = 0; ms < 5_000; ms += 16) {
        ctrl.update(16);
        if (Math.abs(scene.ball.x - spot.x) <= 8 && Math.abs(scene.ball.y - spot.y) <= 1) return ms;
      }
      return Infinity;
    };
    expect(arrival('break')).toBeLessThan(arrival('run') * 0.8);
  });
});

// ── Movement feel (#20) ───────────────────────────────────────────────────────
describe('movement profile (#20)', () => {
  it('moveProgress runs 0 → 1 monotonically for both profiles', () => {
    for (const accel of [0, 0.25]) {
      expect(moveProgress(0, accel)).toBeCloseTo(0);
      expect(moveProgress(1, accel)).toBeCloseTo(1);
      let prev = -1;
      for (let u = 0; u <= 1.0001; u += 0.01) {
        const e = moveProgress(u, accel);
        expect(e).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = e;
      }
    }
  });

  it('from rest it accelerates; already running it does not; both pull up at the end', () => {
    // From rest: slower than linear early, ~full cruise mid-move.
    expect(moveProgress(0.05, 0.25)).toBeLessThan(0.05);
    expect(moveSpeedFactor(0.05, 0.25)).toBeLessThan(moveSpeedFactor(0.5, 0.25));
    // Running start: already at cruise speed (≥ average) on the first frame.
    expect(moveSpeedFactor(0, 0)).toBeGreaterThanOrEqual(1);
    expect(moveSpeedFactor(0, 0)).toBeCloseTo(moveSpeedFactor(0.5, 0));
    // Both decelerate into the target.
    expect(moveSpeedFactor(0.98, 0)).toBeLessThan(0.2);
    expect(cruiseFactor(0.25)).toBeGreaterThan(cruiseFactor(0));
  });

  it('speed factor integrates to the progress curve', () => {
    for (const accel of [0, 0.25]) {
      let sum = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) sum += moveSpeedFactor((i + 0.5) / n, accel) / n;
      expect(sum).toBeCloseTo(1, 3);
    }
  });

  it('slotSpeeds: outside backs out-pace props, and the speed stat matters', () => {
    const roster = SLOTS.map((s) => ({ name: s.role, position: s.role as never, stats: { speed: 60, strength: 50, stamina: 50, skill: 50, footyIQ: 50 } }));
    const base = slotSpeeds(roster);
    const winger = SLOTS.findIndex((s) => s.role === 'winger');
    const prop = SLOTS.findIndex((s) => s.role === 'prop');
    expect(base[winger]!).toBeGreaterThan(base[prop]!);
    const quick = roster.map((r, i) => (i === prop ? { ...r, stats: { ...r.stats, speed: 95 } } : r));
    expect(slotSpeeds(quick)[prop]!).toBeGreaterThan(base[prop]!);
    expect(slotSpeeds(undefined)).toHaveLength(SLOTS.length);
    expect(slotSpeeds(roster)).toEqual(base); // deterministic
  });
});

describe('PlaybackController movement feel (#20)', () => {
  afterEach(() => bus.clear());

  const setRetreat: MatchEvent[] = [
    { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
    { t: 2, kind: 'set-start', teamId: 'H', x: 20, y: 50 },
    { t: 80, kind: 'full-time', teamId: 'H' },
  ];

  it('players ease away from a standstill instead of starting at full speed', () => {
    const scene = makeFakeScene('H', true);
    const ctrl = new PlaybackController(scene, mkResult(setRetreat), FIX);
    run(ctrl, eventTimeMs(2, 1) - 16);
    const fb = scene.players.home[0]!;
    const x0 = fb.x;
    run(ctrl, 16 * 3); // the set fires and he sets off
    const early = Math.abs(fb.x - x0);
    run(ctrl, 16 * 6);
    const later = Math.abs(fb.x - x0);
    // Covers more in the next 6 frames than in the first 3 (accelerating).
    expect(later - early).toBeGreaterThan(early * 2);
  });

  it('the run cycle speeds up and slows down with ground speed', () => {
    const scene = makeFakeScene('H', true);
    const ctrl = new PlaybackController(scene, mkResult(setRetreat), FIX);
    run(ctrl, eventTimeMs(2, 1) + 3_000);
    const scales = scene.players.home.flatMap((a) => a.runScales);
    expect(scales.length).toBeGreaterThan(20);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.45 - 1e-9);
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.7 + 1e-9);
    expect(new Set(scales.map((v) => v.toFixed(2))).size).toBeGreaterThan(5);
  });

  it('a quicker player covers the same ground in less time', () => {
    const arrive = (pace: number): number => {
      const scene = makeFakeScene('H', true);
      const speeds = { home: Array.from({ length: 9 }, () => pace), away: Array.from({ length: 9 }, () => 1) };
      const ctrl = new PlaybackController(scene, mkResult(setRetreat), FIX, { speeds });
      run(ctrl, eventTimeMs(2, 1));
      const fb = scene.players.home[0]!;
      let last = fb.x;
      for (let ms = 0; ms < 6_000; ms += 16) {
        ctrl.update(16);
        if (ms > 100 && fb.x === last && fb.anim === 'idle') return ms;
        last = fb.x;
      }
      return Infinity;
    };
    expect(arrive(1.2)).toBeLessThan(arrive(0.9));
  });
});
