// N10.5 (#154): the next fixture's match art is painted ahead, in the art worker,
// and kept by kit design until the match scene takes it.
import { describe, it, expect, afterEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { fixtureArtKey, fixtureArtBuffers, fixtureArtPieces, paintFixtureArt, type FixtureKits } from '../../src/art/match/fixtureArt';
import { clearFixtureArt, fixtureArtFor, fixtureKits, initMatchArtAhead, nextFixtureSides, takeFixtureArt } from '../../src/scenes/matchArtAhead';
import { fieldOffsetX } from '../../src/scenes/matchField';

const g = globalThis as { Worker?: unknown; window?: unknown };
let built = 0;
let posted = 0;

/** A Worker that paints as artWorker.ts does and transfers the buffers back, one task later (or fails). */
function stubWorker(mode: 'paint' | 'error'): void {
  g.window ??= {};
  g.Worker = class {
    constructor() { built++; }
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage(msg: { offsetX: number; kits: FixtureKits }): void {
      posted++;
      setTimeout(() => {
        if (mode === 'error') return this.onerror?.();
        const art = paintFixtureArt(msg.offsetX, msg.kits);
        this.onmessage?.({ data: structuredClone(art, { transfer: fixtureArtBuffers(art) }) });
      }, 0);
    }
    terminate(): void {}
  };
}

const offsetX = fieldOffsetX();
const kitsA = fixtureKits({ clubId: 'aa', colors: ['#1e3a8a', '#ffffff'] }, { clubId: 'bb', colors: ['#b91c1c', '#facc15'] });
const kitsB = fixtureKits({ clubId: 'aa', colors: ['#1e3a8a', '#ffffff'] }, { clubId: 'cc', colors: ['#14532d', '#f0abfc'] });
const sameBytes = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean => {
  if (a.length !== b.length) return false;
  const x = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
  const y = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
};

afterEach(() => {
  delete g.Worker;
  delete g.window;
  built = 0;
  posted = 0;
  clearFixtureArt();
  bus.clear();
});

describe('the next fixture painted ahead (N10.5)', () => {
  it('keeps one painting by kit key: asked twice it paints once; taken, it is gone', async () => {
    stubWorker('paint');
    const [a, b] = await Promise.all([fixtureArtFor(offsetX, kitsA), fixtureArtFor(offsetX, kitsA)]);
    expect(a).toBe(b);
    expect(posted).toBe(1);
    expect(takeFixtureArt(fixtureArtKey(offsetX, kitsB))).toBeNull(); // another fixture's kits
    expect(takeFixtureArt(a.key)).toBe(a);
    expect(takeFixtureArt(a.key)).toBeNull();
  }, 30_000);

  it("the worker's painting equals painting here, byte for byte", async () => {
    stubWorker('paint');
    const art = await fixtureArtFor(offsetX, kitsA);
    const here = paintFixtureArt(offsetX, kitsA);
    expect(art.bg.every((c, i) => sameBytes(c.buf.data, here.bg[i]!.buf.data))).toBe(true);
    expect(sameBytes(art.home.buf.data, here.home.buf.data)).toBe(true);
    expect(art.crowd.frames).toEqual(here.crowd.frames);
  }, 30_000);

  it('a different opponent paints again, after the first, on the same worker', async () => {
    stubWorker('paint');
    const [a, b] = await Promise.all([fixtureArtFor(offsetX, kitsA), fixtureArtFor(offsetX, kitsB)]);
    expect(a.key).not.toBe(b.key);
    expect(built).toBe(1);
    expect(posted).toBe(2);
    expect(takeFixtureArt(a.key)).toBeNull(); // only the latest is kept
    expect(takeFixtureArt(b.key)).toBe(b);
  }, 30_000);

  it('a failing worker: the art is painted here, the same pixels', async () => {
    stubWorker('error');
    const art = await fixtureArtFor(offsetX, kitsA);
    expect(posted).toBe(1);
    const here = paintFixtureArt(offsetX, kitsA);
    expect(art.bg.every((c, i) => sameBytes(c.buf.data, here.bg[i]!.buf.data))).toBe(true);
  }, 30_000);

  it("looks up the player's next fixture and paints it once the week is in", async () => {
    createNewGame('Ahead FC', 5);
    initLeague(getState());
    const sides = nextFixtureSides(getState());
    expect(sides).not.toBeNull();
    const [home, away] = sides!;
    expect([home.clubId, away.clubId]).toContain(PLAYER_ID);
    stubWorker('paint');
    const off = initMatchArtAhead({ textures: () => null, busy: () => false });
    await new Promise((r) => setTimeout(r, 0)); // the look is scheduled, not inside the tap
    const key = fixtureArtKey(offsetX, fixtureKits(home, away));
    await fixtureArtFor(offsetX, fixtureKits(home, away)); // the painting already under way
    expect(posted).toBe(1);
    expect(takeFixtureArt(key)).not.toBeNull();
    off();
  }, 30_000);

  it('uploads the painting one texture per slice, never under a match; another fixture frees them', async () => {
    const live = new Set<string>();
    const textures = {
      exists: (k: string) => live.has(k),
      remove: (k: string) => live.delete(k),
      createCanvas: (k: string, w: number, h: number) => {
        live.add(k);
        return { getContext: () => ({ createImageData: () => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => {} }) as unknown as CanvasRenderingContext2D, refresh: () => {} };
      },
    };
    const slices: (() => void)[] = [];
    let matchOn = true;
    stubWorker('paint');
    const off = initMatchArtAhead({ textures: () => textures, busy: () => matchOn, schedule: (fn) => slices.push(() => fn()) });
    const art = await fixtureArtFor(offsetX, kitsA);
    const pieces = fixtureArtPieces(art);
    slices.shift()!(); // a match is on: nothing goes up
    expect(live.size).toBe(0);
    matchOn = false;
    let n = 0;
    while (slices.length) { slices.shift()!(); n++; }
    expect(live.size).toBe(pieces.length);
    expect(n).toBe(pieces.length); // one per slice
    expect(pieces.every((p) => p.texKey && live.has(p.texKey) && p.buf.w === 1)).toBe(true);
    await fixtureArtFor(offsetX, kitsB); // the next fixture: the old textures go
    expect(pieces.some((p) => live.has(p.texKey!))).toBe(false);
    const b = takeFixtureArt(fixtureArtKey(offsetX, kitsB))!;
    while (slices.length) slices.shift()!(); // taken: its match uploads the rest itself
    expect(fixtureArtPieces(b).some((p) => p.texKey)).toBe(false);
    off();
  }, 30_000);
});
