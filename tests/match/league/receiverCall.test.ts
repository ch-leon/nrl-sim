import { afterEach, describe, expect, it } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { applyTuning } from '../../../src/match/league/tuning';
import type { Phase } from '../../../src/match/league/live/types';
import { SET_TACKLES } from '../../../src/config';
import { Runner } from '../../../src/match/core/engine';
import { labSheet, DEFAULT_HOME, DEFAULT_AWAY } from '../../../src/match/lab/sheets';

/** Real DH decision/pass paths, with fixed geometry and dice; no visual-only fake recipient. */
class RuckSim extends LiveSim {
  draws = 0;
  constructor() {
    super(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 672);
    this.tick = 100; this.attacking = 'home'; this.dir = 1; this.tackles = 1;
    this.mark = { x: 50, y: 34 };
    for (const p of this.players) {
      p.body.pos = { x: 80, y: 60 }; p.body.vel = { x: 0, y: 0 };
      p.pose = 'idle'; p.poseUntil = 0; p.busyUntil = 10_000; p.traits = [];
    }
    this.players[6]!.body.pos = { x: 50, y: 34 }; this.players[6]!.pose = 'dummyHalf';
    this.players[6]!.busyUntil = 0;
    this.players[1]!.body.pos = { x: 47, y: 40 }; this.players[1]!.busyUntil = 0;
    this.ball = { kind: 'held', by: 6 };
    this.newRuck();
    this.rng.next = () => { this.draws++; return .5; };
  }
  newRuck() {
    this.phase = { kind: 'ruck', t0: this.tick, carrier: 4, tackler: 9, stage: 'dh', handover: false, heldAt: this.tick, down: 0, pace: null };
  }
  advance(tick: number) { this.tick = tick; if (this.phase.kind === 'ruck') this.stepRuck(this.phase); return this.snapshot(); }
  man(index: number) { return this.players[index]!; }
  get decision() { return this.phase.kind === 'ruck' ? this.phase.decision : undefined; }
  intent() { this.controlList.push({ tick: this.tick + 1, side: 'home', kind: 'pass-left' }); }
  loseBall() { this.ball = { kind: 'loose', pos: { x: 50, y: 34 }, vel: { x: 0, y: 0 } }; }
  holdAgain() { this.ball = { kind: 'held', by: 6 }; }
  lastTackle() { this.tackles = SET_TACKLES - 1; this.man(5).busyUntil = 0; this.man(5).body.pos = { x: 47, y: 28 }; }
  nearLine() { this.mark.x = 80; this.man(6).body.pos.x = 80; this.man(1).body.pos.x = 77; this.man(5).body.pos.x = 77; }
  offerPlay() { this.sheetPlays.home.push('block-play'); }
  markerLegs(first: number, second: number, roll = 0.14) {
    this.man(9).body.pos = { x: 51.8, y: 34 }; this.man(9).energy = first;
    this.man(16).body.pos = { x: 53.6, y: 34 }; this.man(16).energy = second;
    this.startRetreat();
    this.markers = this.currentMarkers().map(p => this.indexOf(p));
    this.rng.next = () => { this.draws++; return roll; };
  }
  get phaseNow(): Phase { return this.phase; }
  stealRead() {
    const d = this.man(9); d.body.pos = { x: 49, y: 36 }; d.busyUntil = 0; d.stats.footyIQ = 100;
    this.rng.next = () => { this.draws++; return 0; };
  }
}
const restores: (() => void)[] = [];
afterEach(() => { while (restores.length) restores.pop()!(); });

describe('committed ordinary dummy-half choice (#672)', () => {
  it('leaves pickup two ticks, commits once for four ticks, then throws to that exact identity on the existing release', () => {
    const sim = new RuckSim();
    expect(sim.advance(100).passCall).toBeUndefined(); expect(sim.advance(101).passCall).toBeUndefined();
    const call = sim.advance(102).passCall!;
    expect(call).toMatchObject({ from: { side: 'home', slot: 6 }, to: { side: 'home', slot: 1 }, startedTick: 102, releasesTick: 106 });
    const draws = sim.draws;
    for (let t = 103; t < 106; t++) expect(sim.advance(t).passCall).toEqual(call);
    expect(sim.draws).toBe(draws);
    const release = sim.advance(106);
    expect(release.passCall).toBeUndefined();
    expect(release.ball.flight).toMatchObject({ via: 'pass', startedTick: 106, receiver: call.to });
    expect(release.ball.holder).toBeNull();
  });
  it('keeps snapshot projection pure, self-contained and detached from mutable intent', () => {
    const sim = new RuckSim(), snap = sim.advance(102), count = sim.draws;
    expect(sim.snapshot()).toEqual(snap); expect(sim.draws).toBe(count);
    snap.passCall!.to.who = 'tampered';
    expect(sim.snapshot().passCall!.to.who).not.toBe('tampered');
    sim.advance(104); expect(sim.advance(106).ball.flight?.startedTick).toBe(106);
  });
  it('commits darts without showing a caller, and zero lead retains release-time choice and draw timing', () => {
    restores.push(applyTuning({ 'live.dartChance': 1 }));
    const dart = new RuckSim();
    expect(dart.advance(102).passCall).toBeUndefined(); expect(dart.decision?.to).toBeNull();
    expect(dart.advance(106).events.some(e => e.kind === 'dart')).toBe(true);
    restores.pop()!(); restores.push(applyTuning({ 'live.dhDecisionLeadTicks': 0 }));
    const legacy = new RuckSim();
    for (let t = 100; t < 106; t++) { expect(legacy.advance(t).passCall).toBeUndefined(); expect(legacy.draws).toBe(0); }
    expect(legacy.advance(106).ball.flight).toMatchObject({ startedTick: 106, receiver: { side: 'home', slot: 1 } });
    expect(legacy.draws).toBe(2);
  });
  it('draws once for the ordinary dart and names tired markers only when their legs tip it', () => {
    const fresh = new RuckSim(); fresh.markerLegs(1, 1);
    const mixed = new RuckSim(); mixed.markerLegs(.38, 1);
    const tired = new RuckSim(); tired.markerLegs(.38, .38);
    for (const sim of [fresh, mixed]) {
      expect(sim.advance(102).passCall).toBeDefined();
      expect(sim.advance(106).ball.flight?.via).toBe('pass');
    }
    expect(tired.advance(102).passCall).toBeUndefined();
    expect(tired.advance(106).events).toContainEqual(expect.objectContaining({ kind: 'dart', detail: 'tired-marker' }));
    expect(tired.draws).toBe(fresh.draws);
    const base = new RuckSim(); base.markerLegs(.38, .38, .04);
    base.advance(102);
    const dart = base.advance(106).events.find(e => e.kind === 'dart');
    expect(dart).toBeDefined(); expect(dart?.detail).toBeUndefined();
  });
  it('reads the current available markers and keeps a directed or cancelled ruck on its usual path', () => {
    for (const unavailable of ['binned', 'replaced', 'locked', 'away-from-ruck'] as const) {
      const sim = new RuckSim(); sim.markerLegs(.18, 1);
      const marker = sim.man(9);
      if (unavailable === 'binned') marker.binUntilS = 20;
      if (unavailable === 'replaced') marker.key = 'replacement';
      if (unavailable === 'locked') marker.lockUntil = 103;
      if (unavailable === 'away-from-ruck') marker.body.pos.x = 68;
      expect(sim.advance(102).passCall).toBeDefined();
    }
    const directed = new RuckSim(); directed.markerLegs(.38, .38);
    expect(directed.call('home', 'shift-left')).toBeNull();
    expect(directed.advance(102).passCall).toBeDefined();
    expect(directed.advance(106).events.some(e => e.kind === 'dart')).toBe(false);
    const cancelled = new RuckSim(); cancelled.markerLegs(.38, .38);
    expect(cancelled.advance(102).passCall).toBeUndefined();
    expect(cancelled.call('home', 'shift-left')).toBeNull();
    const carry = cancelled.advance(106).events.find(e => e.kind === 'dart');
    expect(carry).toBeDefined(); expect(carry?.detail).toBeUndefined();
  });
  it('restores the fresh-marker dart path when the bonus is disabled', () => {
    const fresh = new RuckSim(); fresh.markerLegs(1, 1);
    const expected = fresh.advance(102).passCall;
    restores.push(applyTuning({ 'fatigue.markerDartBonus': 0 }));
    const disabled = new RuckSim(); disabled.markerLegs(.18, .18);
    expect(disabled.advance(102).passCall).toEqual(expected);
    expect(disabled.draws).toBe(fresh.draws);
  });
  it('does not revive or reroll a call after identity, eligibility or possession is lost', () => {
    for (const cause of ['receiver', 'source', 'busy', 'range', 'ball'] as const) {
      const sim = new RuckSim(); sim.advance(102); const draws = sim.draws;
      if (cause === 'receiver') sim.man(1).key = 'replacement';
      if (cause === 'source') sim.man(6).key = 'new-hooker';
      if (cause === 'busy') sim.man(1).busyUntil = 104;
      if (cause === 'range') sim.man(1).body.pos.x = 53;
      if (cause === 'ball') sim.loseBall();
      expect(sim.snapshot().passCall).toBeUndefined();
      expect(sim.advance(103).passCall).toBeUndefined(); expect(sim.decision?.cancelled).toBe(true);
      sim.holdAgain(); sim.man(1).busyUntil = 0; sim.man(1).body.pos.x = 47;
      sim.man(2).busyUntil = 0; sim.man(2).body.pos = { x: 47, y: 28 };
      expect(sim.advance(104).passCall).toBeUndefined();
      const end = sim.advance(106);
      expect(end.events.some(e => e.kind === 'dart')).toBe(true); expect(end.ball.flight).toBeUndefined();
      expect(sim.draws).toBe(draws);
      // A later ruck gets its own choice; cancellation is never global state.
      sim.newRuck(); expect(sim.advance(108).passCall).toBeDefined();
    }
  });
  it('lets admitted manual and coach attempts cancel, even if their pass/play cannot execute, but rejected/opposing calls do not', () => {
    const manual = new RuckSim(); manual.advance(102); manual.intent(); manual.step();
    expect(manual.snapshot().passCall).toBeUndefined(); expect(manual.decision?.cancelled).toBe(true);
    manual.man(1).busyUntil = 999; // no left receiver: the attempted control cannot pass
    const before = manual.draws;
    expect(manual.advance(106).events.some(e => e.kind === 'dart')).toBe(true); expect(manual.draws).toBe(before);
    const shifted = new RuckSim(); shifted.advance(102);
    expect(shifted.call('home', 'shift-left')).toBeNull(); expect(shifted.snapshot().passCall).toBeUndefined();
    expect(shifted.advance(106).events.some(e => e.kind === 'dart')).toBe(true);
    const played = new RuckSim(); played.advance(102); played.offerPlay();
    expect(played.call('home', 'set-play', 'block-play')).toBeNull(); expect(played.snapshot().passCall).toBeUndefined();
    played.man(5).pose = 'down'; played.man(5).lockUntil = 999;
    // Locked script participants make launch fail; the cancelled call still cannot be reselected.
    expect(played.advance(106).events.some(e => e.kind === 'dart')).toBe(true);
    const untouched = new RuckSim(), call = untouched.advance(102).passCall;
    expect(untouched.call('home', 'grubber')).not.toBeNull();
    expect(untouched.snapshot().passCall).toEqual(call);
    expect(untouched.call('away', 'rush')).toBeNull(); expect(untouched.snapshot().passCall).toEqual(call);
    const lateKick = new RuckSim(); lateKick.lastTackle(); lateKick.nearLine(); lateKick.advance(102);
    const kickDraws = lateKick.draws;
    expect(lateKick.call('home', 'grubber')).toBeNull(); expect(lateKick.snapshot().passCall).toBeUndefined();
    expect(lateKick.advance(106).ball.flight?.receiver?.slot).toBe(5); expect(lateKick.draws).toBe(kickDraws);
  });
  it('preserves scripted release-time selection, last-tackle kicker priority and actual lane interceptions', () => {
    const scripted = new RuckSim(); scripted.offerPlay();
    expect(scripted.advance(102).passCall).toBeUndefined(); expect(scripted.draws).toBe(0);
    const last = new RuckSim(); last.lastTackle();
    expect(last.advance(102).passCall?.to.slot).toBe(5);
    expect(last.advance(106).ball.flight?.receiver?.slot).toBe(5);
    const intercepted = new RuckSim(), call = intercepted.advance(102).passCall!;
    intercepted.stealRead(); const flight = intercepted.advance(106).ball.flight!;
    expect(call.to).toMatchObject({ side: 'home', slot: 1 });
    expect(flight.receiver).toMatchObject({ side: 'away', slot: 0 });
    expect(intercepted.snapshot().passCall).toBeUndefined();
  });
  it('reconstructs the real seed1 call171→release175→catch181 with the committed identity after seeking', () => {
    const home = labSheet(DEFAULT_HOME), away = labSheet(DEFAULT_AWAY);
    const runner = new Runner(seed => new LiveSim(home, away, seed), 1);
    runner.seek(171);
    const called = runner.cur;
    expect(called.passCall).toMatchObject({ startedTick: 171, releasesTick: 175,
      from: { side: 'away', slot: 6, who: 'Toby Cobbleton' }, to: { side: 'away', slot: 7, who: 'Hunter Faleolo' } });
    runner.seek(175); expect(runner.cur.ball.flight?.receiver).toEqual(called.passCall!.to);
    expect(runner.cur.passCall).toBeUndefined();
    runner.seek(181);
    expect(runner.cur.ball.holder).toEqual({ side: 'away', slot: 7 });
    expect(runner.cur.players.find(p => p.side === 'away' && p.slot === 7)).toMatchObject({ who: 'Hunter Faleolo', caughtTick: 181 });
    runner.seek(100); runner.seek(171); expect(runner.cur).toEqual(called);
  });
});
