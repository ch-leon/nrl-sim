import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it.each([100, 80, 60] as const)('starts an art worker with the frozen %sm field and matching fallback extent', async length => {
  vi.resetModules();
  vi.stubGlobal('name', length === 100 ? 'match-art' : `match-art--field-${length}`);
  const { FIELD_LENGTH } = await import('../../src/match/core/field');
  const { fieldOffsetX } = await import('../../src/scenes/matchField');
  const { paintFixtureArt } = await import('../../src/art/match/fixtureArt');
  const { fixtureArtFor, fixtureKits, warmMatchArt, clearFixtureArt } = await import('../../src/scenes/matchArtAhead');
  expect(FIELD_LENGTH).toBe(length);
  const kits = fixtureKits({ clubId: 'H', colors: ['#111111', '#ffffff'] }, { clubId: 'A', colors: ['#ff1111', '#eeeeee'] });
  const names: string[] = [];
  const messages: unknown[] = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('Worker', class {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_url: URL, options: WorkerOptions) { names.push(options.name!); }
    postMessage(request: { warm?: number }): void {
      messages.push(request);
      if (!('warm' in request)) queueMicrotask(() => this.onerror?.());
    }
    terminate(): void {}
  });
  warmMatchArt();
  const offset = fieldOffsetX();
  const art = await fixtureArtFor(offset, kits);
  const here = paintFixtureArt(offset, kits);
  expect(names).toEqual([length === 100 ? 'match-art' : `match-art--field-${length}`]);
  expect(messages[0]).toEqual({ warm: offset });
  expect(messages[1]).toMatchObject({ offsetX: offset, kits });
  const extent = (chunks: typeof art.bg) => chunks.map(c => [c.x, c.y, c.buf.w, c.buf.h]);
  expect(extent(art.bg)).toEqual(extent(here.bg));
  expect(extent(art.fg)).toEqual(extent(here.fg));
  expect(art.key).toBe(here.key);
  clearFixtureArt();
}, 30_000);
