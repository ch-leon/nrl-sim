// tests/world/playback.test.ts — pure scheduling + controller behaviour against a
// fake scene (no Phaser). Covers clock compression math, event ordering, speed
// scaling, skip correctness, and the single-finish guard (BAK-194).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  eventTimeMs,
  orderedEvents,
  PlaybackController,
  SIM_MINUTES,
  REAL_SECONDS_AT_1X,
  type PlaybackScene,
  type PlaybackSpeed,
} from '../../src/world/playback';
import { bus } from '../../src/core/events';
import type { MatchEvent, MatchResult } from '../../src/sim/events';
import type { Fixture } from '../../src/core/state';

// ── Fake scene ────────────────────────────────────────────────────────────────
function makeFakeScene(homeId = 'H'): PlaybackScene & { shakes: number } {
  const dot = (): { x: number; y: number } => ({ x: 0, y: 0 });
  const scene = {
    homeId,
    homeDots: Array.from({ length: 13 }, dot),
    awayDots: Array.from({ length: 13 }, dot),
    ball: dot(),
    shakes: 0,
    fieldToWorld: (fx: number, fy: number) => ({ x: fx * 5, y: fy * 3 }),
    tweens: {
      add: (cfg: { targets: unknown; x?: number; y?: number; onComplete?: () => void }) => {
        // Apply target values synchronously so we can assert positions.
        const t = cfg.targets as { x?: number; y?: number };
        if (cfg.x !== undefined) t.x = cfg.x;
        if (cfg.y !== undefined) t.y = cfg.y;
        cfg.onComplete?.();
        return undefined;
      },
      killTweensOf: () => {},
    },
    cameras: { main: { shake: () => { scene.shakes++; } } },
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

// ── Controller ───────────────────────────────────────────────────────────────────
describe('PlaybackController', () => {
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
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(`${e.kind}@${e.t}`));

    // Advance well past full-time in one big tick.
    ctrl.update(200_000);
    expect(seen).toEqual([
      'kickoff@0', 'run@10', 'half-time@40', 'try@60', 'conversion@60', 'full-time@80',
    ]);
  });

  it('paces events: nothing fires before its scheduled time', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));

    // eventTimeMs(10,1) = (10/80)*90000 = 11250ms. Advance 5s: only kickoff.
    ctrl.update(5_000);
    expect(seen).toEqual(['kickoff']);
    // Advance to 12s total: run (11250ms) now due.
    ctrl.update(7_000);
    expect(seen).toEqual(['kickoff', 'run']);
  });

  it('speed multiplies the accumulation rate', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    ctrl.setSpeed(4 as PlaybackSpeed);
    // 5000ms real * 4 = 20000ms clock ≥ run(11250). kickoff+run fire.
    ctrl.update(5_000);
    expect(seen).toEqual(['kickoff', 'run']);
  });

  it('half-time pauses the clock then resumes', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const seen: string[] = [];
    bus.on('match:event', (e) => seen.push(e.kind));
    // Reach half-time (eventTimeMs(40,1)=45000ms).
    ctrl.update(46_000);
    expect(seen).toContain('half-time');
    expect(seen).not.toContain('try');
    // A small tick within the 1.5s pause window: try still blocked.
    ctrl.update(1_000);
    expect(seen).not.toContain('try');
    // Drain the pause + advance past the try (eventTimeMs(60,1)=67500ms).
    ctrl.update(60_000);
    expect(seen).toContain('try');
  });

  it('camera shakes on tackle and big-hit', () => {
    const scene = makeFakeScene();
    const evs: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 10, kind: 'big-hit', teamId: 'A', x: 30, y: 50 },
      { t: 20, kind: 'tackle', teamId: 'A', x: 35, y: 50 },
      { t: 80, kind: 'full-time', teamId: 'H' },
    ];
    const ctrl = new PlaybackController(scene, mkResult(evs), FIX);
    ctrl.update(200_000);
    expect(scene.shakes).toBe(2);
  });

  it('skip emits every remaining event in order then finishes once', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    const seen: string[] = [];
    let finishes = 0;
    bus.on('match:event', (e) => seen.push(e.kind));
    bus.on('match:finished', () => finishes++);

    ctrl.update(6_000); // fire kickoff only
    expect(seen).toEqual(['kickoff']);
    ctrl.skip();
    expect(seen).toEqual(['kickoff', 'run', 'half-time', 'try', 'conversion', 'full-time']);
    expect(ctrl.finished).toBe(true);
    expect(finishes).toBe(1);
  });

  it('emits match:finished exactly once (natural full-time)', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    let finishes = 0;
    bus.on('match:finished', () => finishes++);
    ctrl.update(200_000);
    // Extra ticks after finishing must not re-emit.
    ctrl.update(50_000);
    ctrl.skip();
    expect(finishes).toBe(1);
  });

  it('does not emit match:finished when no fixture is supplied', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events)); // no fixture
    let finishes = 0;
    bus.on('match:finished', () => finishes++);
    ctrl.update(200_000);
    expect(finishes).toBe(0);
    expect(ctrl.finished).toBe(true);
  });

  it('moves the ball to the event field position', () => {
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    ctrl.update(12_000); // through the run@10 (x:40,y:50)
    expect(scene.ball.x).toBe(40 * 5);
    expect(scene.ball.y).toBe(50 * 3);
  });

  it('is presentation-only: never mutates GameState (no state:changed emitted)', () => {
    // setState() publishes 'state:changed' (ARCHITECTURE §4). A full playback +
    // skip must never trigger it — the controller only reads `result` and emits
    // match:* events. This behaviourally guards the "no GameState mutation" AC.
    const scene = makeFakeScene();
    const ctrl = new PlaybackController(scene, mkResult(events), FIX);
    let stateChanges = 0;
    bus.on('state:changed', () => stateChanges++);
    ctrl.update(200_000);
    ctrl.skip();
    expect(stateChanges).toBe(0);
  });
});

// silence unused import in some CI type configs
void vi;
