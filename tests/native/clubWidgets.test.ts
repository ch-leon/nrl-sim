// tests/native/clubWidgets.test.ts — the bus-to-plugin driver for the iPhone's club widgets
// (docs/specs/ios.md §3 (b) and (c), Phase 5), against a fake plugin and a real bus.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState, type GameState } from '../../src/core/state';
import { clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { installClubWidgets, type ClubWidgetsNative } from '../../src/native/clubWidgets';
import type { ClubSnapshot } from '../../src/native/clubSnapshot';

const tick = (): Promise<void> => new Promise((r) => queueMicrotask(r));
const flush = async (): Promise<void> => { await tick(); await tick(); };

function setup(opts: { career?: boolean; reject?: boolean } = {}) {
  const written: ClubSnapshot[] = [];
  let reject = opts.reject ?? false;
  const native: ClubWidgetsNative = {
    writeSnapshot: ({ json }) => {
      written.push(JSON.parse(json) as ClubSnapshot);
      return reject ? Promise.reject(new Error('no App Group')) : Promise.resolve({ written: true });
    },
  };
  let career: GameState | null = null;
  if (opts.career !== false) {
    setState(createNewGame('Test FC', 7));
    initLeague(getState());
    setState({ preseason: 0, week: 3 });
    career = getState();
  }
  const read = (): GameState | null => (career ? getState() : null);
  const stop = installClubWidgets({ bus, native, read });
  return { written, stop, setReject: (v: boolean) => { reject = v; } };
}

let stops: (() => void)[] = [];
beforeEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); });
afterEach(() => { for (const s of stops) s(); stops = []; bus.clear(); });

describe('installClubWidgets', () => {
  it('writes the career already loaded once, after install', async () => {
    const a = setup(); stops.push(a.stop);
    expect(a.written).toEqual([]);
    await flush();
    expect(a.written).toHaveLength(1);
    expect(a.written[0]).toMatchObject({ club: { name: 'Test FC' }, week: 3 });
  });

  it('writes nothing with no career (a fresh install)', async () => {
    const a = setup({ career: false }); stops.push(a.stop);
    bus.emit('week:advanced', { week: 1, season: 1 });
    await flush();
    expect(a.written).toEqual([]);
  });

  it('folds a burst of changes into one write and skips an unchanged snapshot', async () => {
    const a = setup(); stops.push(a.stop);
    await flush();
    setState({ week: 4 });
    setState({ money: getState().money + 1 });
    bus.emit('week:advanced', { week: 4, season: 1 });
    await flush();
    expect(a.written.map((s) => s.week)).toEqual([3, 4]);
    // Money is not on the widget: nothing new to write.
    setState({ money: getState().money + 5 });
    bus.emit('match:committed', { fixture: getState().league.fixtures[0]!, result: {} as never });
    await flush();
    expect(a.written).toHaveLength(2);
  });

  it('writes when an injury or banked points change', async () => {
    const a = setup(); stops.push(a.stop);
    await flush();
    const squad = getState().squad;
    setState({ squad: squad.map((p, i) => (i === 0 ? { ...p, injuredWeeks: 2 } : { ...p, injuredWeeks: 0 })) });
    await flush();
    expect(a.written[a.written.length - 1]!.injured).toMatchObject({ name: squad[0]!.name });
    setState({ settings: { ...getState().settings, spendPointsMyself: true }, squad: getState().squad.map((p, i) => (i === 1 ? { ...p, unspentPoints: 3 } : { ...p, unspentPoints: 0 })) });
    await flush();
    expect(a.written[a.written.length - 1]!.points).toBe(3);
    expect(a.written).toHaveLength(3);
  });

  it('swallows a refused write and tries the same snapshot again on the next change', async () => {
    const a = setup({ reject: true }); stops.push(a.stop);
    await flush();
    expect(a.written).toHaveLength(1);
    a.setReject(false);
    setState({ money: getState().money + 1 });
    await flush();
    expect(a.written).toHaveLength(2);
    setState({ money: getState().money + 1 });
    await flush();
    expect(a.written).toHaveLength(2);
  });

  it('stops listening when stopped', async () => {
    const a = setup();
    await flush();
    a.stop();
    setState({ week: 9 });
    await flush();
    expect(a.written).toHaveLength(1);
  });
});
