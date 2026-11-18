// tests/native/liveMatch.test.ts — the bus-to-plugin driver for the iPhone Live Activity
// (docs/specs/ios.md §3, "The bridge"; Phase 3), against a fake plugin and a real bus.
import { describe, expect, it } from 'vitest';
import { EventEmitter, type Events, type LiveMatchData } from '../../src/core/events';
import { installLiveMatch, type LiveMatchNative } from '../../src/native/liveMatch';
import { mkEvent } from '../../src/sim/events';
import { runMatch } from '../../src/match/league/match';
import { sideSheet } from '../../src/match/balance/measure';
import { NINES } from '../../src/match/league/rules';
import type { Fixture } from '../../src/core/state';

type Call = [string, unknown?];

function setup(opts: { reject?: boolean } = {}) {
  const bus = new EventEmitter();
  const calls: Call[] = [];
  const answer = <T>(v: T): Promise<T> => (opts.reject ? Promise.reject(new Error('Live Activities are off')) : Promise.resolve(v));
  const native: LiveMatchNative = {
    isAvailable: () => answer({ available: true }),
    startMatch: (o) => (calls.push(['start', o]), answer({ started: true })),
    updateMatch: (o) => (calls.push(['update', o]), answer(undefined)),
    endMatch: () => (calls.push(['end']), answer(undefined)),
  };
  const leave: (() => void)[] = [];
  const stop = installLiveMatch({ bus, native, halfMinutes: () => NINES.halfMinutes, onMatchLeft: (fn) => leave.push(fn) });
  return { bus, calls, stop, hooks: leave, leaveMatch: () => leave.splice(0).forEach((fn) => fn()) };
}

const home = sideSheet('H', { rating: 60 });
const away = sideSheet('A', { rating: 60 });
const fixture = { id: 'f1', round: 1, homeId: 'H', awayId: 'A' } as unknown as Fixture;
const started = (live: Partial<LiveMatchData>): Events['match:started'] => ({ fixture, home, away, live: { seed: 1, weather: 'clear', ...live } });
const tick = (): Promise<void> => new Promise((r) => queueMicrotask(r));

describe('installLiveMatch', () => {
  it('starts at kick-off of the player\'s match and ignores one he is not in', async () => {
    const a = setup();
    a.bus.emit('match:started', started({}));
    a.bus.emit('match:event', mkEvent(1, 'try', home.clubId, { player: 'X' }));
    await tick();
    expect(a.calls).toEqual([]);

    a.bus.emit('match:started', started({ planSide: 'away' }));
    expect(a.calls).toHaveLength(1);
    expect(a.calls[0]![0]).toBe('start');
    expect((a.calls[0]![1] as { attributes: { mine: string } }).attributes.mine).toBe('away');
  });

  it('sends one silent update per big moment and nothing for routine play', async () => {
    const a = setup();
    a.bus.emit('match:started', started({ coachSide: 'home', planSide: 'home' }));
    a.bus.emit('match:event', mkEvent(0, 'kickoff', away.clubId));
    a.bus.emit('match:event', mkEvent(0, 'run', away.clubId));
    await tick();
    expect(a.calls.map((c) => c[0])).toEqual(['start']);
    a.bus.emit('match:event', mkEvent(1, 'try', home.clubId, { player: 'X' }));
    await tick();
    expect(a.calls[1]).toEqual(['update', { content: expect.objectContaining({ homeScore: 4, pose: 'try' }) }]);
  });

  it('collapses Skip to full time into one update, the final whistle\'s, with the alert', async () => {
    const a = setup();
    a.bus.emit('match:started', started({ planSide: 'home' }));
    const res = runMatch(home, away, { seed: 3, weather: 'clear' });
    for (const ev of res.events) a.bus.emit('match:event', ev);
    a.bus.emit('match:finished', { fixture, result: res });
    await tick();
    const updates = a.calls.filter((c) => c[0] === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0]![1]).toEqual({
      content: expect.objectContaining({ homeScore: res.homeScore, awayScore: res.awayScore, state: 'full-time' }),
      alert: expect.objectContaining({ title: 'Full time' }),
    });
  });

  it('ends the activity when the player leaves the match, and only once', async () => {
    const a = setup();
    a.bus.emit('match:started', started({ planSide: 'home' }));
    a.leaveMatch();
    a.leaveMatch();
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'end']);
  });

  it('ends on Save & exit; a stale leave hook does not end the next match', () => {
    const a = setup();
    a.bus.emit('match:started', started({ planSide: 'home' }));
    a.bus.emit('match:parked', { tick: 40 });
    a.bus.emit('match:started', started({ planSide: 'home' }));
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'end', 'start']);
    // The first match's scene-shutdown hook fires late: the resumed match's activity stays.
    a.hooks[0]!();
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'end', 'start']);
    a.hooks[1]!();
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'end', 'start', 'end']);
  });

  it('a new kick-off ends an activity that was never ended', () => {
    const a = setup();
    a.bus.emit('match:started', started({ planSide: 'home' }));
    a.bus.emit('match:started', started({ planSide: 'home' }));
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'end', 'start']);
  });

  it('stays quiet when the plugin refuses (Live Activities switched off)', async () => {
    const a = setup({ reject: true });
    a.bus.emit('match:started', started({ planSide: 'home' }));
    a.bus.emit('match:event', mkEvent(1, 'try', home.clubId, { player: 'X' }));
    await tick();
    a.leaveMatch();
    await tick();
    expect(a.calls.map((c) => c[0])).toEqual(['start', 'update', 'end']);
  });
});
