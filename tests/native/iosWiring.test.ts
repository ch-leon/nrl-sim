// tests/native/iosWiring.test.ts — startIosNative's real wiring (src/native/ios.ts): the
// game's bus and the Match scene's shutdown, with a stub game and a stub plugin.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startIosNative, type IosGame } from '../../src/native/ios';
import type { LiveMatchNative } from '../../src/native/liveMatch';
import type { ClubWidgetsNative } from '../../src/native/clubWidgets';
import { createNewGame, loadState } from '../../src/core/state';
import { bus, type Events } from '../../src/core/events';
import { sideSheet } from '../../src/match/balance/measure';
import type { Fixture } from '../../src/core/state';

const home = sideSheet('H', { rating: 60 });
const away = sideSheet('A', { rating: 60 });
const kickOff: Events['match:started'] = {
  fixture: { id: 'f1', round: 1, homeId: 'H', awayId: 'A' } as unknown as Fixture,
  home, away, live: { seed: 1, weather: 'clear', planSide: 'home' },
};

function stubNative(calls: string[]): LiveMatchNative {
  return {
    isAvailable: async () => ({ available: true }),
    startMatch: async () => (calls.push('start'), { started: true }),
    updateMatch: async () => void calls.push('update'),
    endMatch: async () => void calls.push('end'),
  };
}

let stop: (() => void) | null = null;
afterEach(() => {
  stop?.();
  stop = null;
  vi.restoreAllMocks();
});

describe('startIosNative', () => {
  it('ends the activity when the Match scene shuts down', () => {
    const calls: string[] = [];
    const hooks = new Map<string, () => void>();
    const game: IosGame = { scene: { getScene: (key) => (key === 'Match' ? { events: { once: (ev, fn) => hooks.set(ev, fn) } } : null) } };
    stop = startIosNative(game, stubNative(calls));
    bus.emit('match:started', kickOff);
    expect(calls).toEqual(['start']);
    expect([...hooks.keys()]).toEqual(['shutdown']);
    hooks.get('shutdown')!();
    expect(calls).toEqual(['start', 'end']);
  });

  it('with no Match scene to watch, ends the activity at once and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const calls: string[] = [];
    stop = startIosNative({ scene: { getScene: () => null } }, stubNative(calls));
    bus.emit('match:started', kickOff);
    expect(calls).toEqual(['start', 'end']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('starts the club widgets too: the loaded career is written once, a new one on load', async () => {
    const jsons: string[] = [];
    const widgets: ClubWidgetsNative = { writeSnapshot: async ({ json }) => (jsons.push(json), { written: true }) };
    loadState(createNewGame('Wired FC', 5));
    stop = startIosNative({ scene: { getScene: () => null } }, stubNative([]), widgets);
    await new Promise((r) => setTimeout(r, 0));
    expect(jsons.map((j) => (JSON.parse(j) as { club: { name: string } }).club.name)).toEqual(['Wired FC']);
    loadState(createNewGame('Rewired FC', 6));
    await new Promise((r) => setTimeout(r, 0));
    expect(jsons).toHaveLength(2);
    stop();
    stop = null;
    loadState(createNewGame('Stopped FC', 7));
    await new Promise((r) => setTimeout(r, 0));
    expect(jsons).toHaveLength(2);
  });
});
