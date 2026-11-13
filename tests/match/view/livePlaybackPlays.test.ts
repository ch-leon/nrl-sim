// tests/match/view/livePlaybackPlays.test.ts — a set play called from the match
// screen (#326, phase 3), through LivePlayback as the coach tray calls it: the call
// is recorded with its play (so a resumed or skipped match replays it), a second is
// refused ("one play a set"), the tray sees it waiting ("next play"), it is run at the
// next play-the-ball as the coach's play, and its verdict comes back for the tag over
// COACH. A side with no plays sees none of it.
import { describe, it, expect } from 'vitest';
import { LivePlayback, type LivePlaybackScene } from '../../../src/match/view/livePlayback';
import { sideSheet } from '../../../src/match/balance/measure';
import { createNewGame } from '../../../src/core/state';
import { callResultText, type CallVerdict } from '../../../src/match/league/calls';
import type { PlayId } from '../../../src/data/plays';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type Phaser from 'phaser';

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

const PLAYS: PlayId[] = ['second-man', 'block-play', 'cut-out-winger'];

function playback(plays: PlayId[] | null, verdicts: CallVerdict[]) {
  const home = { ...sideSheet('H', { rating: 60 }), ...(plays ? { plays } : {}) };
  return new LivePlayback(fakeScene(), {
    home,
    away: sideSheet('A', { rating: 60 }),
    seed: 5,
    weather: 'clear',
    calls: [],
    speed: 8,
    keyMoments: () => false,
    fixture: undefined,
    overlay: null,
    closeUpDone: () => {},
    onCallResult: (v) => verdicts.push(v),
  });
}

/** Frames of 16 ms until `until` holds or the match ends. */
function frames(pb: LivePlayback, until: () => boolean, max = 400_000): void {
  let n = 0;
  while (!pb.finished && !until() && n < max) {
    pb.update(16);
    n++;
  }
}

/** Every sim event the playback hears, in order. */
function heard(pb: LivePlayback): SimEvent[] {
  const out: SimEvent[] = [];
  const runner = (pb as unknown as { runner: { onEvents: ((e: SimEvent[]) => void) | null } }).runner;
  const inner = runner.onEvents!;
  runner.onEvents = (events) => {
    out.push(...events);
    inner(events);
  };
  return out;
}

const sim = (pb: LivePlayback) => (pb as unknown as { sim: { phaseKind: string; tackleCount: number } }).sim;
const opts = (pb: LivePlayback) => (pb as unknown as { opts: { calls: { tick: number; side: string; call: string; play?: PlayId }[] } }).opts;

describe('a set play from the tray (#326, phase 3)', () => {
  it('is recorded with its play, waits for the next play-the-ball, runs as the coach’s and comes back as a verdict', () => {
    createNewGame('Plays', 6);
    const verdicts: CallVerdict[] = [];
    const pb = playback(PLAYS, verdicts);
    const events = heard(pb);
    expect(pb.playsOf('home')).toEqual(PLAYS);
    expect(pb.playsOf('away')).toEqual([]);
    // The tray's caption: each play's worst man against its IQ needs.
    for (const id of PLAYS) {
      const fit = pb.playFit('home', id);
      expect(fit.roles.length).toBeGreaterThan(0);
      expect(fit.worst.short).toBe(Math.max(...fit.roles.map((r) => r.short)));
    }
    // At a completed tackle, with the second-man play on: call it before the play-the-ball.
    // An open-play call can legitimately lapse if the carrier turns it over first.
    frames(pb, () => pb.inPossession === 'home' && sim(pb).phaseKind === 'ruck' && pb.callRefusal('home', 'set-play', 'second-man') === null);
    expect(pb.callRefusal('home', 'set-play', 'second-man')).toBeNull();
    // Defending, the other side can't call one of ours; nor a play not taken in.
    expect(pb.callRefusal('away', 'set-play', 'second-man')).not.toBeNull();
    expect(pb.callRefusal('home', 'set-play', 'kick-pass')).toBe('not in your three');
    expect(pb.call('home', 'set-play', 'second-man')).toBeNull();
    const all = opts(pb).calls;
    const rec = all[all.length - 1]!;
    expect(rec).toMatchObject({ side: 'home', call: 'set-play', play: 'second-man' });
    expect(rec.tick).toBe(pb.tick + 1);
    // Waiting: the tray shows it as the next play; a second play this set is refused, tapped or not yet taken.
    expect(pb.pendingPlay('home')).toBe('second-man');
    expect(pb.callRefusal('home', 'set-play', 'block-play')).toBe('one play a set');
    expect(pb.call('home', 'set-play', 'block-play')).toBe('one play a set');
    const tackleAtCall = sim(pb).tackleCount;
    // The sim takes it on the next tick and holds it for the play-the-ball.
    frames(pb, () => pb.tick > rec.tick);
    const launch = () => events.find((e) => e.kind === 'set-play' && e.side === 'home' && e.tick >= rec.tick);
    frames(pb, () => !!launch() || verdicts.some((v) => v.call === 'set-play'));
    const run = launch();
    expect(run, `ticks ${pb.tick}, verdicts ${JSON.stringify(verdicts)}`).toBeDefined();
    {
      // Run at the next play-the-ball, as the coach's play (its text names the team, not the half).
      expect(run!.detail).toBe('second-man');
      expect(run!.text).toMatch(/run the second-man play/);
      expect(sim(pb).tackleCount).toBeGreaterThanOrEqual(tackleAtCall);
      expect(events.some((e) => e.kind === 'coach-call' && e.detail === 'set-play:second-man')).toBe(true);
      expect(pb.pendingPlay('home')).toBeNull();
    }
    // Its verdict comes back for the tag over COACH, named for the play.
    frames(pb, () => verdicts.some((v) => v.call === 'set-play'));
    const v = verdicts.find((x) => x.call === 'set-play')!;
    expect(v.play).toBe('second-man');
    expect(callResultText(v).startsWith('Second man')).toBe(true);
  }, 120_000);

  it('a side with no plays: nothing to call, nothing waiting', () => {
    createNewGame('No plays', 6);
    const pb = playback(null, []);
    expect(pb.playsOf('home')).toEqual([]);
    expect(pb.pendingPlay('home')).toBeNull();
    frames(pb, () => pb.inPossession === 'home' && sim(pb).phaseKind === 'play');
    expect(pb.callRefusal('home', 'set-play', 'second-man')).toBe('not in your three');
    expect(pb.call('home', 'set-play', 'second-man')).toBe('not in your three');
    expect(opts(pb).calls).toEqual([]);
  }, 60_000);
});
