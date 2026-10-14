// tests/world/readability.test.ts — ticker truncation, name-tag selection,
// carrier-marker target and zoom helpers (#17), plus the playback hooks that
// tag the sprite actually used for a beat.
import { describe, it, expect } from 'vitest';
import {
  NAME_TAG_MS,
  TICKER_MAX_CHARS,
  ZOOM_CLOSE,
  ZOOM_DEFAULT,
  ZOOM_WIDE,
  carrierMarkerTarget,
  easeZoom,
  nameTagFor,
  surname,
  truncateTicker,
  zoomForEvent,
} from '../../src/world/readability';
import { PlaybackController, type PlaybackActor, type PlaybackScene } from '../../src/world/playback';
import { KICKER_SLOT } from '../../src/world/formation';
import type { MatchEvent, MatchResult } from '../../src/sim/events';
import type { NameTag } from '../../src/world/readability';

describe('truncateTicker', () => {
  it('leaves short lines alone', () => {
    expect(truncateTicker('Radbourne sends it high.')).toBe('Radbourne sends it high.');
  });
  it('cuts long lines with an ellipsis within the budget', () => {
    const long = 'word '.repeat(60);
    const out = truncateTicker(long);
    expect(out.length).toBeLessThanOrEqual(TICKER_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('cuts mid-word when there is no usable word boundary', () => {
    expect(truncateTicker('abcdefghijklmnop', 8)).toBe('abcdefg…');
  });
  it('collapses whitespace and handles degenerate budgets', () => {
    expect(truncateTicker('  a   b  ')).toBe('a b');
    expect(truncateTicker('abc', 0)).toBe('');
    expect(truncateTicker('abc', 1)).toBe('…');
  });
});

describe('name tags', () => {
  const ev = (over: Partial<MatchEvent> = {}): MatchEvent => ({ t: 3, kind: 'run', teamId: 'H', player: 'Jarrah Kavanagh', ...over });

  it('takes the surname', () => {
    expect(surname('Jarrah Kavanagh')).toBe('Kavanagh');
    expect(surname('  Koro ')).toBe('Koro');
    expect(surname('')).toBe('');
  });
  it('tags the sprite playback chose, with the event player surname', () => {
    expect(nameTagFor(ev(), { side: 'away', slot: 4 })).toEqual({ side: 'away', slot: 4, text: 'Kavanagh' });
  });
  it('yields no tag without a player name or a chosen sprite', () => {
    const { player: _p, ...noPlayer } = ev();
    expect(nameTagFor(noPlayer, { side: 'home', slot: 1 })).toBeNull();
    expect(nameTagFor(ev(), null)).toBeNull();
  });
  it('shows for about a second and a half', () => {
    expect(NAME_TAG_MS).toBe(1500);
  });
});

describe('carrierMarkerTarget', () => {
  it('sits at the holder’s feet while the ball is held', () => {
    expect(carrierMarkerTarget({ mode: 'held', holder: { side: 'home', pos: { fx: 40, fy: 22 } } })).toEqual({ side: 'home', fx: 40, fy: 22 });
  });
  it('is absent in flight and on the ground', () => {
    expect(carrierMarkerTarget({ mode: 'flight' })).toBeNull();
    expect(carrierMarkerTarget({ mode: 'ground' })).toBeNull();
  });
});

describe('situational zoom', () => {
  it('is tighter at contact, wider for kicks and breaks', () => {
    expect(zoomForEvent('tackle')).toBe(ZOOM_CLOSE);
    expect(zoomForEvent('big-hit')).toBe(ZOOM_CLOSE);
    expect(zoomForEvent('kick')).toBe(ZOOM_WIDE);
    expect(zoomForEvent('break')).toBe(ZOOM_WIDE);
    expect(zoomForEvent('run')).toBe(ZOOM_DEFAULT);
    expect(ZOOM_CLOSE).toBeGreaterThan(ZOOM_DEFAULT);
    expect(ZOOM_WIDE).toBeLessThan(ZOOM_DEFAULT);
  });
  it('eases toward the target independent of frame rate and then snaps', () => {
    let a = ZOOM_DEFAULT;
    for (let i = 0; i < 60; i++) a = easeZoom(a, ZOOM_CLOSE, 1000 / 60);
    let b = ZOOM_DEFAULT;
    for (let i = 0; i < 20; i++) b = easeZoom(b, ZOOM_CLOSE, 1000 / 20);
    expect(a).toBeCloseTo(b, 5);
    expect(a).toBeGreaterThan(ZOOM_DEFAULT);
    expect(easeZoom(ZOOM_DEFAULT, ZOOM_CLOSE, 60_000)).toBe(ZOOM_CLOSE);
  });
  it('keeps a player ≥32px tall at the default zoom (21px figure)', () => {
    expect(21 * ZOOM_DEFAULT).toBeGreaterThanOrEqual(32);
  });
});

// ── Playback hooks ────────────────────────────────────────────────────────────
function fakeScene(): PlaybackScene & { tags: NameTag[]; marks: ({ side: string; x: number; y: number } | null)[]; views: PlaybackActor[] } {
  const views: PlaybackActor[] = [];
  const mk = (): PlaybackActor => {
    const v = { place() {}, play() {} };
    views.push(v);
    return v;
  };
  const scene = {
    homeId: 'H',
    tags: [] as NameTag[],
    marks: [] as ({ side: string; x: number; y: number } | null)[],
    views,
    players: { home: Array.from({ length: 9 }, mk), away: Array.from({ length: 9 }, mk) },
    ball: { place() {} },
    fieldToWorld: (fx: number, fy: number) => ({ x: fx * 5, y: fy * 3 }),
    cameras: { main: { shake() {} } },
    focus: {
      tag: (t: NameTag) => void scene.tags.push(t),
      carrier: (t: { side: string; x: number; y: number } | null) => void scene.marks.push(t),
    },
  };
  return scene as unknown as ReturnType<typeof fakeScene>;
}

function result(events: MatchEvent[]): MatchResult {
  return {
    homeScore: 0,
    awayScore: 0,
    events,
    stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
    weather: 'clear',
    momentumTimeline: [],
    injuries: [],
  };
}

describe('playback readability hooks', () => {
  it('tags the actor playback used: the kicker for a kick, the defending side for a tackle', () => {
    const scene = fakeScene();
    const events: MatchEvent[] = [
      { t: 1, kind: 'kick', teamId: 'H', player: 'Rhys Radbourne', x: 40, y: 50, detail: 'bomb' },
      { t: 30, kind: 'tackle', teamId: 'A', player: 'Levi Leilua', x: 60, y: 50, detail: 'held' },
    ];
    const ctrl = new PlaybackController(scene, result(events));
    // Run the clock past both events.
    for (let i = 0; i < 6000; i++) ctrl.update(16);
    expect(scene.tags[0]).toEqual({ side: 'home', slot: KICKER_SLOT, text: 'Radbourne' });
    const tackle = scene.tags.find((t) => t.text === 'Leilua');
    expect(tackle?.side).toBe('away');
    expect(tackle?.slot).toBeGreaterThanOrEqual(0);
  });

  it('does not tag in the instant (skip) path', () => {
    const scene = fakeScene();
    const ctrl = new PlaybackController(scene, result([{ t: 1, kind: 'try', teamId: 'H', player: 'A B', x: 100, y: 50 }]));
    ctrl.skip();
    expect(scene.tags).toEqual([]);
  });

  it('puts the carrier ring under the holder and clears it in flight', () => {
    const scene = fakeScene();
    const ctrl = new PlaybackController(scene, result([{ t: 1, kind: 'run', teamId: 'H', player: 'A B', x: 30, y: 40 }]));
    for (let i = 0; i < 400; i++) ctrl.update(16);
    const last = scene.marks[scene.marks.length - 1];
    expect(last?.side).toBe('home');
    expect(scene.marks.some((m) => m === null)).toBe(true); // ball was in the air during the pass
  });
});
