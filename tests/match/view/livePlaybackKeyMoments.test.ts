// tests/match/view/livePlaybackKeyMoments.test.ts — slowing down for big moments
// (#366). From a line break to the next tackle, and from a try to its conversion,
// the match plays at ×1; the last two minutes of the second half and golden point
// at ×2 at most. An override on screen only: the chosen speed and the saved
// setting are never rewritten, a speed tap ends the moment, Skip ignores it.
import { describe, it, expect } from 'vitest';
import { KEY_MOMENT_LATE_MIN, KeyMoments, LivePlayback, keyMomentsOn, type LivePlaybackScene } from '../../../src/match/view/livePlayback';
import { migrateState } from '../../../src/core/save';
import { SAVE_VERSION } from '../../../src/core/state';
import { NINES } from '../../../src/match/league/rules';
import { sideSheet } from '../../../src/match/balance/measure';
import { createNewGame, getState, setState } from '../../../src/core/state';
import type Phaser from 'phaser';

const H = NINES.halfMinutes;
const early = { half: 1, seconds: 60 };

// The tsconfig has no Node types: the saves are read with Vite's JSON import.
const saves = import.meta.glob('../../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

describe('the setting (#366)', () => {
  it('is on when absent: every old save in the corpus migrates to v21 with no keyMoments and slows down', () => {
    expect(SAVE_VERSION).toBe(21);
    const files = Object.keys(saves);
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const r = migrateState(structuredClone(saves[f]));
      if (!r.ok) throw new Error(`${f}: ${r.message}`);
      expect(r.state.settings.keyMoments, f).toBeUndefined();
      expect(keyMomentsOn(r.state.settings), f).toBe(true);
    }
    expect(keyMomentsOn({ keyMoments: false })).toBe(false);
    expect(keyMomentsOn({ keyMoments: true })).toBe(true);
  });
});

describe('KeyMoments (#366)', () => {
  it('a line break plays at ×1 until the tackle, then the cap lifts', () => {
    const k = new KeyMoments();
    expect(k.cap(early, H)).toBeNull();
    k.note({ kind: 'line-break' });
    expect(k.cap(early, H)).toBe(1);
    k.phase('play');
    expect(k.cap(early, H)).toBe(1);
    k.phase('tackle');
    expect(k.cap(early, H)).toBeNull();
  });

  it('a break that ends in a try stays slow through the try until the conversion is taken', () => {
    const k = new KeyMoments();
    k.note({ kind: 'line-break' });
    k.note({ kind: 'try' });
    k.phase('try');
    k.phase('conversion');
    expect(k.cap(early, H)).toBe(1);
    k.note({ kind: 'conversion' });
    expect(k.cap(early, H)).toBeNull();
  });

  it('caps at ×2 for the last two minutes of the second half and in golden point', () => {
    const k = new KeyMoments();
    expect(k.cap({ half: 1, seconds: (H - 1) * 60 }, H)).toBeNull();
    expect(k.cap({ half: 2, seconds: (H - KEY_MOMENT_LATE_MIN) * 60 - 1 }, H)).toBeNull();
    expect(k.cap({ half: 2, seconds: (H - KEY_MOMENT_LATE_MIN) * 60 }, H)).toBe(2);
    expect(k.cap({ half: 3, seconds: 5 }, H)).toBe(2);
    expect(k.cap({ half: 2, seconds: H * 60, finished: true }, H)).toBeNull();
    // A break late on is still ×1.
    k.note({ kind: 'line-break' });
    expect(k.cap({ half: 2, seconds: H * 60 - 30 }, H)).toBe(1);
  });

  it('a speed tap ends the moment it is in; the next moment slows again', () => {
    const k = new KeyMoments();
    k.note({ kind: 'line-break' });
    k.waive(early, H);
    expect(k.cap(early, H)).toBeNull();
    k.note({ kind: 'try' });
    expect(k.cap(early, H)).toBe(1);
    const late = { half: 2, seconds: H * 60 - 60 };
    k.note({ kind: 'conversion' });
    k.waive(late, H);
    expect(k.cap(late, H)).toBeNull();
    // Golden point is a moment of its own.
    expect(k.cap({ half: 3, seconds: 1 }, H)).toBe(2);
  });
});

/** Anything a Phaser layer asks of the scene: a callable that returns itself. */
const noop: unknown = new Proxy(function () {}, { get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop });

function fakeScene(): LivePlaybackScene & Phaser.Scene {
  const actor = () => ({ sprite: { x: 0, y: 0, flipX: false }, place() {}, play() {} });
  const base = {
    players: { home: Array.from({ length: 9 }, actor), away: Array.from({ length: 9 }, actor) },
    ball: { place() {} },
    cameras: { main: { zoom: 1, worldView: { x: 0, y: 0, width: 800, height: 400 }, shake() {} } },
    fieldToWorld: (fx: number, fy: number) => ({ x: fx * 10, y: fy * 4 }),
    focus: { carrier() {} },
    sideColors: { home: 0xffffff, away: 0 },
  };
  return new Proxy(base, { get: (t, p) => (p in t ? (t as Record<string | symbol, unknown>)[p] : noop) }) as unknown as LivePlaybackScene & Phaser.Scene;
}

function playback(keyMoments: boolean, speed: 1 | 2 | 4 | 8 = 8, seed = 11) {
  return new LivePlayback(fakeScene(), {
    home: sideSheet('H', { rating: 70 }),
    away: sideSheet('A', { rating: 45 }),
    seed,
    weather: 'clear',
    calls: [],
    speed,
    keyMoments: () => keyMoments,
    fixture: undefined,
    overlay: null,
    closeUpDone: () => {},
  });
}

/** Frames of 16 ms until `until` holds or the match ends; the frames it took. */
function frames(pb: LivePlayback, until: () => boolean, max = 400_000): number {
  let n = 0;
  while (!pb.finished && !until() && n < max) {
    pb.update(16);
    n++;
  }
  return n;
}

const sim = (pb: LivePlayback) => (pb as unknown as { sim: { phaseKind: string; matchSeconds: number } }).sim;

describe('LivePlayback key moments (#366)', () => {
  it('drops to ×1 on a line break, back to the chosen speed after the tackle, and never rewrites it', () => {
    createNewGame('Moments', 8);
    setState({ settings: { ...getState().settings, playbackSpeed: 8 } });
    const pb = playback(true, 8);
    let broke = false;
    const runner = (pb as unknown as { runner: { onEvents: ((e: { kind: string }[]) => void) | null } }).runner;
    const inner = runner.onEvents!;
    runner.onEvents = (es) => {
      if (es.some((e) => e.kind === 'line-break')) broke = true;
      inner(es as never);
    };
    frames(pb, () => broke);
    expect(broke).toBe(true);
    // Eased down through blendPace, settling at ×1 while the break is on.
    frames(pb, () => pb.runSpeed < 1.05 || sim(pb).phaseKind !== 'play', 200);
    if (sim(pb).phaseKind === 'play') expect(pb.runSpeed).toBeLessThan(1.05);
    expect(pb.getSpeed()).toBe(8);
    // After the tackle (or the try and its conversion), back to ×8 and its dead-time pace.
    frames(pb, () => pb.runSpeed > 7.9 && sim(pb).matchSeconds < (2 * NINES.halfMinutes - KEY_MOMENT_LATE_MIN) * 60);
    expect(pb.runSpeed).toBeGreaterThan(7.9);
    expect(pb.getSpeed()).toBe(8);
    expect(getState().settings.playbackSpeed).toBe(8);
  });

  it('caps at ×2 late in the second half', () => {
    const pb = playback(true, 8, 5);
    frames(pb, () => sim(pb).matchSeconds >= (2 * NINES.halfMinutes - KEY_MOMENT_LATE_MIN) * 60 + 5);
    // Out of any break: settled at the cap (×2), whatever the dead-time pace.
    frames(pb, () => pb.runSpeed <= 2.01, 400);
    expect(pb.runSpeed).toBeLessThanOrEqual(2.01);
    expect(pb.getSpeed()).toBe(8);
    // A tap on ×8 ends it for the rest of the half.
    pb.setSpeed(8);
    pb.update(16);
    expect(pb.runSpeed).toBeGreaterThanOrEqual(8);
  });

  it('with the setting off, nothing slows: the late minutes play at the chosen speed', () => {
    const pb = playback(false, 8, 5);
    frames(pb, () => sim(pb).matchSeconds >= (2 * NINES.halfMinutes - KEY_MOMENT_LATE_MIN) * 60 + 5);
    for (let i = 0; i < 200 && !pb.finished; i++) {
      pb.update(16);
      expect(pb.runSpeed).toBeGreaterThanOrEqual(8);
    }
  });

  it('is ignored on Skip: the match runs to full time with no moment held', () => {
    const pb = playback(true, 8, 5);
    frames(pb, () => sim(pb).matchSeconds > 60);
    pb.skip();
    expect(pb.finished).toBe(true);
    expect(pb.slowedTo).toBeNull();
  });
});
