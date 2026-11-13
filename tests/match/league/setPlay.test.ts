// tests/match/league/setPlay.test.ts — set plays in the live sim (#326, plan §3,
// §11 phase 1): a match with no plays is the match it always was, plays on or
// off; a play launches at the play-the-ball or a tap and its men run the
// script; its one roll decides a breakdown, an intercept or the play coming
// off; a coach (or Hard's AI coach) can call one live, and the judge pays it
// like a shift.
import { describe, it, expect, afterEach } from 'vitest';
import { LiveSim, type LiveOptions } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import { cellsOf, checkPlan, type Plan } from '../../../src/match/balance/plan';
import { measureCell } from '../../../src/match/balance/measure';
import { CALLS, CallJudge, callResultText, type CallInput } from '../../../src/match/league/calls';
import { PLAYS } from '../../../src/match/league/plays';
import { applyTuning } from '../../../src/match/league/tuning';
import { zoneOf } from '../../../src/match/league/presets';
import { supportSpots } from '../../../src/match/league/tactics';
import { formationTarget, ROLES } from '../../../src/match/league/roles';
import { FIELD_LENGTH, FIELD_WIDTH } from '../../../src/match/core/field';
import { LEGS_ENERGY } from '../../../src/match/league/fatigue';
import { labSheet, withPlays, DEFAULT_AWAY, DEFAULT_HOME } from '../../../src/match/lab/sheets';
import { labHash, parseLabHash } from '../../../src/match/lab/controller';
import type { PlayFrom, PlayId } from '../../../src/data/plays';
import type { Side, SimEvent } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';
import type { Player } from '../../../src/match/league/live/types';

const flat = (plays?: PlayId[], over: Parameters<typeof sideSheet>[1] = {}): TeamSheet => ({ ...sideSheet('H', { rating: 60, ...over }), ...(plays ? { plays } : {}) });
const A = sideSheet('A', { rating: 60 });
// Historical script trajectories need enough play for the pinned launches and refusal states.
// Keep their original seven-minute halves explicit; default-clock coverage lives in match.test.ts.
const SCRIPT_LENGTH = { halves: 2 as const, halfMinutes: 7 };

/** The pin's method (balance.test.ts): every event as tick:kind:side:detail. */
function stream(home: TeamSheet, away: TeamSheet, seed: number, opts: LiveOptions = {}): string[] {
  const sim = new LiveSim(home, away, seed, opts);
  const parts: string[] = [];
  while (!sim.finished && sim.tick < 100_000) {
    sim.step();
    for (const e of sim.tickEvents) parts.push(`${e.tick}:${e.kind}:${e.side ?? ''}:${e.detail ?? ''}`);
  }
  return parts;
}

/** A LiveSim that shows its set-play state, and can force the launch's one roll. */
class PlaySim extends LiveSim {
  force: number | null = null;
  private forcing = false;
  constructor(home: TeamSheet, away: TeamSheet, seed: number, opts: LiveOptions = {}) {
    super(home, away, seed, { length: SCRIPT_LENGTH, ...opts });
    const real = this.rng;
    (this as unknown as { rng: typeof real }).rng = { ...real, next: () => (this.forcing ? ((this.forcing = false), this.force!) : real.next()) };
  }
  protected override launchPlay(from: PlayFrom, launcher: Player): boolean {
    this.forcing = this.force !== null;
    const r = super.launchPlay(from, launcher);
    this.forcing = false;
    return r;
  }
  get script() {
    return this.scripted;
  }
  man(side: Side, slot: number): Player {
    return this.at(side, slot);
  }
  holderNow(): Player | null {
    return this.holder();
  }
  toLineNow(side: Side): number {
    return this.toLineFor(side, this.ballPos());
  }
  get attackDir(): 1 | -1 {
    return this.dir;
  }
  get kickPending(): boolean {
    return this.pendingKick !== null;
  }
  retarget(): void {
    this.assignTargets();
  }
  tapAt(side: Side, x: number): void {
    this.startSetPiece(side, { x, y: 30 }, 'tap');
  }
}

/** Step until `pred` holds for one of a tick's events (or the match ends); the event. */
function until(sim: LiveSim, pred: (e: SimEvent) => boolean, max = 100_000): SimEvent | null {
  while (!sim.finished && sim.tick < max) {
    sim.step();
    const e = sim.tickEvents.find(pred);
    if (e) return e;
  }
  return null;
}

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

describe('no plays: the match it always was', () => {
  it('a flat 60 v 60 match with no sheet plays is bit-identical on the event stream with plays.on 0 and 1', () => {
    const on = stream(flat(), A, 1);
    restore = applyTuning({ 'plays.on': 0 });
    const off = stream(flat(), A, 1);
    expect(off).toEqual(on);
    expect(on.some((p) => p.includes(':set-play:') || p.includes(':play-breaks-down:'))).toBe(false);
  }, 60_000);
  it('plays.on 0 ignores a sheet’s plays: the match is the one without them', () => {
    restore = applyTuning({ 'plays.on': 0 });
    expect(stream(flat(['block-play', 'cut-out-winger', 'kick-pass']), A, 2)).toEqual(stream(flat(), A, 2));
  }, 60_000);
  it('a side with plays plays a different match, and the same one again', () => {
    const plays: PlayId[] = ['block-play', 'cut-out-winger', 'kick-pass'];
    const a = stream(flat(plays), A, 3, { length: { halves: 1, halfMinutes: 4 } });
    expect(a).toEqual(stream(flat(plays), A, 3, { length: { halves: 1, halfMinutes: 4 } }));
    expect(a).not.toEqual(stream(flat(), A, 3, { length: { halves: 1, halfMinutes: 4 } }));
    expect(a.some((p) => p.includes(':set-play:home:'))).toBe(true);
  }, 60_000);
});

describe('the launch and the script (plan §3.3)', () => {
  it('a block play launches at tackle 2 in the attacking half (seed 3) and the second-row takes the pass', () => {
    const sim = new PlaySim(flat(['block-play']), A, 3);
    let launch: SimEvent | null = null;
    // Seed 7 reached tackle 2 in their half and completed the pass after #625; since the weighted
    // receiver (#649) its launch there (tick 16739) breaks down, and seed 3 is the first that completes.
    while (!launch) {
      const e = until(sim, (x) => x.kind === 'set-play');
      expect(e).not.toBeNull();
      if (sim.tackleCount === 1 && zoneOf(sim.toLineNow('home')) === 'attackingHalf') launch = e;
    }
    // No tick pinned: it moves whenever a default reshuffles the seed (1791 before the last-tackle call, #650).
    expect(launch.detail).toBe('block-play');
    expect(launch.player).toBe(sim.man('home', 5).name); // the halfback calls it
    expect(launch.text).toMatch(/calls the block play/);
    expect(sim.script?.men.map((i) => i % 9)).toEqual([5, 8]);
    let took = -1;
    while (sim.tick < launch.tick + 80 && took < 0) {
      sim.step();
      const h = sim.holderNow();
      if (h && h.side === 'home' && h.slot === 8) took = sim.tick;
    }
    expect(took).toBeGreaterThan(launch.tick);
    expect(sim.playsRun.launched.home).toBeGreaterThan(1);
    expect(sim.playsRun.launched.away).toBe(0);
  }, 60_000);

  it('a decoy runs the play’s line while it is scripted, not the support or shape spot', () => {
    const sim = new PlaySim(flat(['block-play']), A, 1);
    until(sim, (x) => x.kind === 'set-play');
    const s = sim.script!;
    sim.retarget();
    const decoy = sim.man('home', 7); // the prop's lead line
    const caller = sim.man('home', 5);
    const dir = sim.attackDir;
    expect(decoy.target.x).toBeCloseTo(caller.body.pos.x + dir * PLAYS.decoyLeadM);
    expect(decoy.target.y).toBeCloseTo(caller.body.pos.y + s.ySign * 2);
    const anchor = (sim.holderNow() ?? caller).body.pos;
    for (const spot of supportSpots(anchor, dir)) expect(Math.hypot(spot.x - decoy.target.x, spot.y - decoy.target.y)).toBeGreaterThan(0.5);
    const shape = formationTarget(ROLES[7]!, anchor, dir, true);
    expect(Math.hypot(shape.x - decoy.target.x, shape.y - decoy.target.y)).toBeGreaterThan(0.5);
  }, 60_000);

  it('a caller ten short breaks down on a roll where one whose needs are met does not, and tucks it', () => {
    // The same forced roll at every launch: 0.2 is under the ten-short odds and over the met ones.
    const shortSim = new PlaySim(flat(['block-play'], { positionStats: { halfback: { footyIQ: 48 } } }), A, 1);
    shortSim.force = 0.2;
    const bd = until(shortSim, (e) => e.kind === 'play-breaks-down');
    expect(bd).not.toBeNull();
    expect(bd!.detail).toBe('block-play');
    expect(bd!.player).toBe(shortSim.man('home', 5).name);
    expect(bd!.text).toMatch(/breaks down/);
    // He tucks it: the ball stays with him till he is tackled.
    while (shortSim.phaseKind === 'play') {
      expect(shortSim.holderNow()?.slot).toBe(5);
      shortSim.step();
    }
    const metSim = new PlaySim(flat(['block-play']), A, 1);
    metSim.force = 0.2;
    expect(until(metSim, (e) => e.kind === 'play-breaks-down')).toBeNull();
    expect(metSim.playsRun.launched.home).toBeGreaterThan(3);
    expect(metSim.playsRun.brokeDown.home).toBe(0);
  }, 60_000);

  it('an intercept flies to the lane defender', () => {
    let intercepts = 0;
    // Keep multiple trajectories; seed 22 supplies the interception after #625.
    for (const seed of [1, 2, 22]) {
      const sim = new PlaySim(flat(['block-play', 'second-man']), A, seed, { length: { halves: 1, halfMinutes: 7 } });
      sim.force = 0.0001;
      let thrown = -1;
      while (!sim.finished) {
        const before = sim.playsRun.intercepted.home;
        sim.step();
        if (sim.playsRun.intercepted.home > before) {
          thrown = sim.tick;
          // In the air to a defender.
          const snap = sim.snapshot();
          expect(snap.ball.holder).toBeNull();
        }
        if (thrown > 0 && sim.tickEvents.some((e) => e.kind === 'intercept' && e.side === 'away')) {
          intercepts++;
          thrown = -1;
        }
      }
    }
    expect(intercepts).toBeGreaterThan(0);
  }, 60_000);

  it('a tap launches a razzle play: the halfback takes it, and the decoys run', () => {
    const sim = new PlaySim(flat(['tap-rambo']), A, 1);
    until(sim, () => false, 400);
    while (sim.phaseKind !== 'play' || sim.inPossession !== 'home') sim.step();
    sim.tapAt('home', sim.attackDir > 0 ? FIELD_LENGTH - 30 : 30);
    const e = until(sim, (x) => x.kind === 'set-play');
    expect(e?.detail).toBe('tap-rambo');
    expect(sim.tickEvents.some((x) => x.kind === 'tap')).toBe(true);
    expect(sim.script?.men.map((i) => i % 9)).toEqual([5]);
    expect(sim.script?.decoys.map((d) => d.idx % 9)).toEqual([7, 8]);
  }, 60_000);

  it('a kick play sends the winger early for the corner, then the kick goes cross-field', () => {
    const sim = new PlaySim(flat(['kick-pass']), A, 2);
    // Test the successful script; breakdown odds have their own coverage above.
    sim.force = 0.99;
    const e = until(sim, (x) => x.kind === 'set-play');
    // No tick pinned (6054 before the last-tackle call, #650): the script is what is tested.
    expect(e).not.toBeNull();
    sim.retarget();
    const s = sim.script!;
    const wing = sim.man('home', s.edge === 'left' ? 1 : 2);
    const line = sim.attackDir > 0 ? FIELD_LENGTH : 0;
    expect(Math.abs(wing.target.x - line)).toBeLessThanOrEqual(6);
    expect(wing.target.y === 5 || wing.target.y === FIELD_WIDTH - 5).toBe(true);
    const kick = until(sim, (x) => x.kind === 'kick', e!.tick + 60);
    expect(kick?.detail).toBe('cross-field');
  }, 60_000);
});

describe('calling a play (plan §3.2)', () => {
  it('says why not: at the breaks, not your ball, not in your three, one play a set, not from here, last tackle, the kick’s away', () => {
    const sim = new PlaySim(flat(['block-play', 'kick-pass']), A, 1);
    const seen = new Set<string>();
    seen.add(sim.callRefusal('home', 'set-play', 'block-play') ?? 'ok');
    while (!sim.finished) {
      sim.step();
      for (const id of ['block-play', 'kick-pass'] as const) seen.add(sim.callRefusal(sim.inPossession, 'set-play', id) ?? 'ok');
      seen.add(sim.callRefusal(sim.inPossession === 'home' ? 'away' : 'home', 'set-play', 'block-play') ?? 'ok');
      seen.add(sim.callRefusal('home', 'set-play', 'chip-chase') ?? 'ok');
      seen.add(sim.callRefusal('home', 'set-play') ?? 'ok');
    }
    for (const why of ['at the breaks', 'not your ball', 'not in your three', 'one play a set', 'not from here', 'last tackle', 'the kick’s away', 'ok']) expect([...seen], why).toContain(why);
  }, 60_000);

  it('a coach’s call waits for the play-the-ball, is its own channel, is judged, and replays from the record', () => {
    const calls: CallInput[] = [];
    const home = flat(['block-play', 'second-man']);
    const opts = { length: { halves: 1 as const, halfMinutes: 7 }, calls };
    const sim = new PlaySim(home, A, 4, opts);
    const events: SimEvent[] = [];
    while (!sim.finished) {
      // At a tackle, so it lands at the next play-the-ball.
      if (sim.phaseKind === 'tackle' && sim.callRefusal('home', 'set-play', 'second-man') === null) calls.push({ tick: sim.tick + 1, side: 'home', call: 'set-play', play: 'second-man' });
      if (sim.phaseKind === 'tackle' && sim.callRefusal('home', 'hit-up') === null) calls.push({ tick: sim.tick + 1, side: 'home', call: 'hit-up' });
      sim.step();
      events.push(...sim.tickEvents);
    }
    const called = events.filter((e) => e.kind === 'coach-call' && e.detail === 'set-play:second-man');
    expect(called.length).toBeGreaterThan(0);
    // The same set's Hit-up was still allowed: a play uses neither of the set's calls.
    const firstCall = called[0]!;
    expect(events.some((e) => e.kind === 'coach-call' && e.detail === 'hit-up' && e.tick >= firstCall.tick - 40 && e.tick <= firstCall.tick + 40)).toBe(true);
    const run = events.filter((e) => e.kind === 'set-play' && e.text.includes('run the second-man play'));
    expect(run.length).toBeGreaterThan(0);
    expect(run[0]!.tick).toBeGreaterThan(firstCall.tick);
    const verdicts = sim.verdicts.filter((v) => v.call === 'set-play');
    expect(verdicts.length).toBe(called.length);
    for (const v of verdicts) expect(v.play).toBe('second-man');
    // The record: { seed, sheets, calls[] } plays the same match.
    const replay = runMatch(home, A, { seed: 4, length: opts.length, calls: structuredClone(calls) });
    expect([replay.homeScore, replay.awayScore]).toEqual([sim.points.home, sim.points.away]);
    expect(replay.calls?.made[0]).toBe(sim.callsMade.home);
  }, 60_000);

  it('Hard’s AI coach calls one of his three, and it is run; with no AI coach only the half calls them', () => {
    const plays: PlayId[] = ['block-play', 'cut-out-winger', 'kick-pass'];
    const ai = new PlaySim(flat(plays), A, 1, { aiCoach: ['home'] });
    // His first set-play call, whatever his other calls come before it (pinned to the cut-out at tick 635
    // after #649, and the block play at 663 before it, until the last-tackle call, #650, put a shift first).
    const call = until(ai, (e) => e.kind === 'coach-call' && e.side === 'home' && (e.detail ?? '').startsWith('set-play:'));
    expect(plays.map((p) => `set-play:${p}`)).toContain(call?.detail);
    const launch = until(ai, (e) => e.kind === 'set-play');
    expect(launch?.side).toBe('home');
    expect(launch?.detail).toBe(call!.detail!.slice('set-play:'.length));
    const none = stream(flat(plays), A, 1);
    expect(none.some((p) => p.includes(':coach-call:'))).toBe(false);
    expect(none.some((p) => p.includes(':set-play:home:'))).toBe(true);
  }, 60_000);
});

describe('the judge pays a play off like a shift (plan §3.2)', () => {
  it('on 8 m or a break; not on a breakdown or an intercept; a play the set never ran lapses', () => {
    const j = new CallJudge();
    const ev = (kind: string, side: Side = 'home'): SimEvent => ({ tick: 1, kind, text: '', side });
    j.make('home', 'set-play', 'home', 1, 40, 'block-play');
    const [nine] = j.observe([], 40 + CALLS.paid.shiftM + 1, true, false);
    expect(nine).toMatchObject({ paid: true, call: 'set-play', play: 'block-play', metres: 9, how: 'gain' });
    expect(callResultText(nine!)).toBe('Block play +9m');
    j.make('home', 'set-play', 'home', 1, 40, 'block-play');
    expect(j.observe([], 40 + CALLS.paid.shiftM - 3, true, false)[0]).toMatchObject({ paid: false });
    j.make('home', 'set-play', 'home', 1, 40, 'cut-out-winger');
    const [brk] = j.observe([ev('line-break')], 41, false, false);
    expect(brk).toMatchObject({ paid: true, how: 'line-break' });
    expect(callResultText(brk!)).toBe('Cut-out: line break!');
    j.make('home', 'set-play', 'home', 1, 40, 'block-play');
    const [bd] = j.observe([ev('play-breaks-down')], 40, false, false);
    expect(bd).toMatchObject({ paid: false, how: 'breakdown' });
    expect(callResultText(bd!)).toBe('Block play: broke down');
    j.make('home', 'set-play', 'home', 1, 40, 'long-ball');
    const [pick] = j.observe([ev('intercept', 'away')], 40, false, false);
    expect(callResultText(pick!)).toBe('Long ball: intercepted');
    const [lapsed] = j.playLapsed('home', 'kick-pass');
    expect(callResultText(lapsed!)).toBe('Kick-pass: not run');
    expect(j.made.home).toBe(6);
    expect(j.paid.home).toBe(2);
  });
});

describe('the lab and the harness', () => {
  it('?plays=1 gives both sides the first three of their style’s family, and the hash keeps it', () => {
    const p = parseLabHash('#lab?seed=4&hatk=grind&plays=1', { home: DEFAULT_HOME, away: DEFAULT_AWAY });
    expect(p.plays).toBe(true);
    expect(labHash({ seed: 4, home: p.home, away: p.away, tactics: p.tactics, plays: true })).toContain('plays=1');
    expect(parseLabHash('#lab?seed=4', { home: DEFAULT_HOME, away: DEFAULT_AWAY }).plays).toBeUndefined();
    const sheet = withPlays(labSheet(DEFAULT_HOME, 'gen', { attack: 'grind' }), true);
    expect(sheet.plays).toEqual(['block-play', 'inside-ball', 'short-side-raid']);
    expect(withPlays(labSheet(DEFAULT_HOME), false).plays).toBeUndefined();
  });
  // Seed 1 at tick 1031 and seed 4 at tick 514 before the weighted receiver (#649) reshuffled them; seed 3 at 653
  // and seed 4's block play breaking down at 991 before the last-tackle call (#650): seed 4's first breakdown is now the
  // away side's, and seed 9 or 11 the first of 1–12 whose is the home side's.
  it('the lab’s named seeds: a block play launched (seed 3, tick 690) and a home play breaking down (seed 11, tick 1579)', () => {
    const lab = (seed: number): PlaySim =>
      new PlaySim(withPlays({ ...labSheet(DEFAULT_HOME, 'gen', { attack: 'grind' }), rotation: 'standard' }, true), withPlays({ ...labSheet(DEFAULT_AWAY, 'gen', {}), rotation: 'standard' }, true), seed, { energy: LEGS_ENERGY.fresh, weather: 'clear', calls: [] });
    const one = lab(3);
    const launch = until(one, (e) => e.kind === 'set-play' && e.side === 'home');
    expect([launch?.tick, launch?.detail, one.script?.outcome]).toEqual([690, 'block-play', 'ok']);
    expect(one.script?.decoys.map((d) => d.idx % 9)).toEqual([7]);
    const eleven = lab(11);
    const bd = until(eleven, (e) => e.kind === 'play-breaks-down');
    expect([bd?.tick, bd?.detail, bd?.side]).toEqual([1579, 'inside-ball', 'home']);
  }, 60_000);
  it('a scenario names its plays (`plays`), a typo fails fast, and the cell plays them', () => {
    const plan = (plays: PlayId[]): Plan => ({ name: 'p', seeds: 1, minutes: 4, scenarios: [{ name: 's', home: { rating: 60, plays }, away: { rating: 60 } }] });
    expect(checkPlan(plan(['block-play']))).toEqual([]);
    expect(checkPlan(plan(['flying-wedge' as PlayId])).join('\n')).toMatch(/flying-wedge/);
    expect(checkPlan(plan(['block-play', 'inside-ball', 'second-man', 'kick-pass'])).join('\n')).toMatch(/at most 3/);
    expect(sideSheet('H', { rating: 60, plays: ['kick-pass'] }).plays).toEqual(['kick-pass']);
    expect(sideSheet('H', { rating: 60 }).plays).toBeUndefined();
    const withPlay = measureCell(cellsOf(plan(['block-play', 'second-man']))[0]!, 1, 4);
    expect(measureCell(cellsOf(plan(['block-play', 'second-man']))[0]!, 1, 4).counts).toEqual(withPlay.counts);
  }, 60_000);
});
