// tests/native/clubWidgets.test.ts — the bus-to-plugin driver for the iPhone's club widgets
// (docs/specs/ios.md §3 (b) and (c), Phase 5), against a fake plugin and a real bus.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, loadState, setState, type GameState } from '../../src/core/state';
import { clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { installClubWidgets, type ClubWidgetsNative } from '../../src/native/clubWidgets';
import type { ClubSnapshot } from '../../src/native/clubSnapshot';

const tick = (): Promise<void> => new Promise((r) => queueMicrotask(r));
const flush = async (): Promise<void> => { for (let i = 0; i < 5; i++) await tick(); };

type Answer = 'ok' | 'reject' | 'refuse';

function setup(opts: { career?: boolean; reject?: boolean; answer?: Answer } = {}) {
  const written: ClubSnapshot[] = [];
  let answer: Answer = opts.answer ?? (opts.reject ? 'reject' : 'ok');
  const native: ClubWidgetsNative = {
    writeSnapshot: ({ json }) => {
      written.push(JSON.parse(json) as ClubSnapshot);
      // The Swift plugin never rejects: it answers { written: false } without the App Group.
      return answer === 'reject' ? Promise.reject(new Error('no App Group')) : Promise.resolve({ written: answer === 'ok' });
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
  return { written, stop, setReject: (v: boolean) => { answer = v ? 'reject' : 'ok'; }, setAnswer: (v: Answer) => { answer = v; } };
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

  it('treats { written: false } (no App Group, or a snapshot Swift could not decode) as not written, and retries', async () => {
    const a = setup({ answer: 'refuse' }); stops.push(a.stop);
    await flush();
    expect(a.written).toHaveLength(1);
    setState({ money: getState().money + 1 });
    await flush();
    expect(a.written).toHaveLength(2);
    a.setAnswer('ok');
    setState({ money: getState().money + 1 });
    await flush();
    expect(a.written).toHaveLength(3);
    setState({ money: getState().money + 1 });
    await flush();
    expect(a.written).toHaveLength(3);
  });

  it('writes a club rename and a colour change', async () => {
    const a = setup(); stops.push(a.stop);
    await flush();
    setState({ clubName: 'Renamed FC' });
    await flush();
    expect(a.written[a.written.length - 1]!.club.name).toBe('Renamed FC');
    const league = getState().league;
    setState({ league: { ...league, clubs: league.clubs.map((c) => (c.id === 'player' ? { ...c, colors: ['#123456', '#fedcba'] as [string, string] } : c)) } });
    await flush();
    expect(a.written[a.written.length - 1]!.club.colors).toEqual(['#123456', '#fedcba']);
    expect(a.written).toHaveLength(3);
  });

  it('writes the career loaded in place of another (Continue, or switching slot)', async () => {
    const a = setup(); stops.push(a.stop);
    await flush();
    const other = createNewGame('Other Slot RLFC', 99);
    loadState(other);
    initLeague(getState());
    await flush();
    expect(a.written[a.written.length - 1]!.club.name).toBe('Other Slot RLFC');
  });
});

describe('installClubWidgets, one event at a time', () => {
  /** A career whose snapshot changes without a state:changed, so each event is tested alone. */
  function quiet() {
    setState(createNewGame('Quiet FC', 3));
    initLeague(getState());
    let s: GameState = { ...getState(), preseason: 0, week: 3 };
    const written: ClubSnapshot[] = [];
    const stop = installClubWidgets({
      bus,
      native: { writeSnapshot: ({ json }) => (written.push(JSON.parse(json) as ClubSnapshot), Promise.resolve({ written: true })) },
      read: () => s,
    });
    stops.push(stop);
    return { written, set: (week: number) => { s = { ...s, week }; } };
  }

  it('week:advanced alone writes the new week', async () => {
    const q = quiet();
    await flush();
    q.set(4);
    bus.emit('week:advanced', { week: 4, season: 1 });
    await flush();
    expect(q.written.map((w) => w.week)).toEqual([3, 4]);
  });

  it('match:committed alone writes the new state', async () => {
    const q = quiet();
    await flush();
    q.set(5);
    bus.emit('match:committed', { fixture: getState().league.fixtures[0]!, result: {} as never });
    await flush();
    expect(q.written.map((w) => w.week)).toEqual([3, 5]);
  });

  it('a change with no event writes nothing (nothing polls)', async () => {
    const q = quiet();
    await flush();
    q.set(6);
    await flush();
    expect(q.written.map((w) => w.week)).toEqual([3]);
  });
});
