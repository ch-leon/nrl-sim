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
  SIM_MINUTES,
  REAL_SECONDS_AT_1X,
  type PlaybackActor,
  type PlaybackScene,
  type PlaybackSpeed,
} from '../../src/world/playback';
import { fieldToWorldPoint, fieldOffsetX } from '../../src/scenes/matchField';
import { KICKER_SLOT } from '../../src/world/formation';
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
    place(x, y, depth) {
      a.x = x;
      a.y = y;
      a.depth = depth;
    },
    play(anim, faceLeft) {
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
    players: { home: Array.from({ length: 13 }, actor), away: Array.from({ length: 13 }, actor) },
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
    // Everyone has arrived → idle, facing the end they attack (away faces left).
    expect(scene.players.away.every((a) => a.anim === 'idle' && a.faceLeft)).toBe(true);
    expect(scene.players.home.every((a) => a.anim === 'idle' && !a.faceLeft)).toBe(true);
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
    expect(celebrating).toBeGreaterThanOrEqual(10);
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

  it('after 500 random events the 26 players stay spread across the field', () => {
    const rng = makeRng(1234);
    const kinds: MatchEventKind[] = ['set-start', 'run', 'break', 'tackle', 'big-hit', 'error', 'penalty'];
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
      expect(distinct).toBeGreaterThan(15);
      for (const side of [t.home, t.away]) {
        // Wingers keep opposite touchlines; the spine stays central.
        expect(Math.abs(side[1]!.fy - side[2]!.fy)).toBeGreaterThan(50);
        expect(Math.max(...side.map((p) => p.fy)) - Math.min(...side.map((p) => p.fy))).toBeGreaterThan(60);
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
