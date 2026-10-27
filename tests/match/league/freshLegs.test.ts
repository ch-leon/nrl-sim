// tests/match/league/freshLegs.test.ts — the Fresh legs coach call (#367): the
// coach's most tired man off for the freshest on the bench, at the next
// play-the-ball or stoppage (or in the sheds), once a half. Neither an attack
// nor a defence call; it rolls no dice, so a match without it is today's.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import { BENCH, pickFreshLegs } from '../../../src/match/league/bench';
import { CALLS, CallJudge, callIsBench, callIsDefence, callIsPlay, callResultText, chipState, paidOffText, unlockLevel, unlockedCalls, type CallInput } from '../../../src/match/league/calls';
import { callCaption } from '../../../src/ui/screens/matchOverlay';
import { checkPlan, type Plan } from '../../../src/match/balance/plan';
import { applyTuning } from '../../../src/match/league/tuning';
import type { LiveOptions } from '../../../src/match/league/live';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';
import type { MatchLength } from '../../../src/match/league/rules';

const H = sideSheet('H', { rating: 60, rotation: 'off' });
const A = sideSheet('A', { rating: 60 });
const fresh = (e: SimEvent): boolean => e.kind === 'interchange' && e.detail === 'fresh-legs';

interface Tick {
  tick: number;
  events: readonly SimEvent[];
  snap: Snapshot;
  /** The snapshot before this tick. */
  before: Snapshot;
}

/** A match with a home coach who calls Fresh legs whenever he may (from `from` on). */
function play(seed: number, opts: LiveOptions = {}, home: TeamSheet = H, from = 0): { sim: LiveSim; ticks: Tick[]; calls: CallInput[] } {
  const calls: CallInput[] = [];
  const sim = new LiveSim(home, A, seed, { ...opts, calls });
  const ticks: Tick[] = [];
  let before = sim.snapshot();
  while (!sim.finished) {
    if (sim.tick >= from && sim.callRefusal('home', 'fresh-legs') === null) calls.push({ tick: sim.tick + 1, side: 'home', call: 'fresh-legs' });
    sim.step();
    const snap = sim.snapshot();
    ticks.push({ tick: sim.tick, events: [...sim.tickEvents], snap, before });
    before = snap;
  }
  return { sim, ticks, calls };
}

const legsOf = (s: Snapshot, slot: number): number => s.players.find((p) => p.side === 'home' && p.slot === slot)!.legs!;

describe('Fresh legs, the pick (pure)', () => {
  const field = [
    { slot: 0, energy: 0.6, position: 'fullback' as const },
    { slot: 2, energy: 0.3, position: 'centre' as const },
    { slot: 5, energy: 0.3, position: 'prop' as const },
    { slot: 7, energy: 0.35, position: 'hooker' as const },
  ];
  it('the most tired man under the line (ties by slot), for the freshest of his own group first (ties by index)', () => {
    const bench = [{ energy: 1, position: 'prop' as const }, { energy: 0.7, position: 'winger' as const }, { energy: 0.7, position: 'centre' as const }];
    // Slots 2 and 5 tie on 0.3: slot 2, a centre; the backs on the bench are the winger and the centre, level: the first.
    expect(pickFreshLegs(field, bench, 0.4, 0.4)).toEqual({ slot: 2, bench: 1 });
    // No back on the bench: the freshest of anyone.
    expect(pickFreshLegs(field, [{ energy: 0.6, position: 'prop' }, { energy: 0.9, position: 'hooker' }], 0.4, 0.4)).toEqual({ slot: 2, bench: 1 });
    // A bench with no positions: the freshest.
    expect(pickFreshLegs(field, [{ energy: 0.5 }, { energy: 0.8 }], 0.4, 0.4)).toEqual({ slot: 2, bench: 1 });
  });
  it('skips the injured, the spent, and whoever is already taken; null when nobody is tired or nobody is fresh', () => {
    expect(pickFreshLegs(field, [{ energy: 1, injured: true }, { energy: 0.45 }], 0.4, 0.4)).toEqual({ slot: 2, bench: 1 });
    expect(pickFreshLegs(field, [{ energy: 0.39 }, { energy: 1, injured: true }], 0.4, 0.4)).toBeNull();
    expect(pickFreshLegs(field, [{ energy: 0.9 }], 0.25, 0.4)).toBeNull();
    expect(pickFreshLegs(field, [], 0.4, 0.4)).toBeNull();
    expect(pickFreshLegs(field, [{ energy: 0.9 }, { energy: 0.8 }], 0.4, 0.4, { slots: new Set([2]), bench: new Set([0]) })).toEqual({ slot: 5, bench: 1 });
  });
});

describe('Fresh legs, the call (pure)', () => {
  it('neither attack nor defence, unlocked from level 0, and its chip shows either way', () => {
    expect(callIsBench('fresh-legs')).toBe(true);
    expect(callIsDefence('fresh-legs') || callIsPlay('fresh-legs')).toBe(false);
    expect(unlockedCalls(0)).toContain('fresh-legs');
    expect(unlockLevel('fresh-legs')).toBe(0);
    expect(chipState('fresh-legs', null, true, null)).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('fresh-legs', null, false, 'hold')).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('fresh-legs', 'used this half', true, null, true)).toEqual({ show: true, enabled: false, lit: true });
    expect(chipState('fresh-legs', 'no one’s tired yet', false, null)).toEqual({ show: true, enabled: false, lit: false });
    // The set's call still hides the others, as before.
    expect(chipState('hit-up', 'one call a set', true, 'shift-left').show).toBe(false);
  });
  it('each refusal has a short caption', () => {
    for (const why of ['used this half', 'no one’s tired yet', 'bench is spent']) {
      const c = callCaption(why, false);
      expect(c).not.toBe(why === 'used this half' ? '' : why);
      expect(c.length).toBeLessThanOrEqual(14);
    }
    expect(callCaption('used this half', true)).toBe('called');
  });
  it('the judge pays it on its swap only, never on the play; the tag names who came off and on', () => {
    const j = new CallJudge();
    j.make('home', 'fresh-legs', 'home', 1, 50);
    expect(j.observe([], 60, true, true)).toEqual([]);
    expect(j.observe([{ tick: 1, kind: 'try', text: '', side: 'home' }], 60, false, false)).toEqual([]);
    expect(j.observe([{ tick: 1, kind: 'interchange', text: '', side: 'home' }], 60, false, false)).toEqual([]);
    expect(j.swapped('away', 'X', 'Y')).toEqual([]);
    const [v] = j.swapped('home', 'Smith', 'Jones');
    expect(v).toMatchObject({ side: 'home', call: 'fresh-legs', paid: true, note: 'Smith off, Jones on' });
    expect(callResultText(v!)).toBe('Fresh legs: Smith off, Jones on');
    expect(j.paid.home).toBe(1);
    j.make('home', 'fresh-legs', 'home', 1, 50);
    const [l] = j.lapsed('home');
    expect(l).toMatchObject({ paid: false, note: 'nobody tired' });
    expect(callResultText(l!)).toBe('Fresh legs: nobody tired');
    expect(paidOffText('Larrikins', 'fresh-legs')).toBe('Fresh legs pay off for Larrikins');
  });
  it('a balance plan with a fresh-legs call validates', () => {
    const plan: Plan = { name: 'p', seeds: 2, minutes: 2, scenarios: [{ name: 'even', home: { rating: 60 }, away: { rating: 60 }, calls: { home: [{ call: 'fresh-legs' }] } }] };
    expect(checkPlan(plan)).toEqual([]);
  });
});

describe('Fresh legs in the live sim', () => {
  it('swaps the most tired man for a fresh one at the next play-the-ball or stoppage, and pays', () => {
    const { sim, ticks } = play(1, { energy: 0.35, length: { halves: 1, halfMinutes: 2 } });
    const callAt = ticks.findIndex((t) => t.events.some((e) => e.kind === 'coach-call' && e.detail === 'fresh-legs'));
    const landAt = ticks.findIndex((t) => t.events.some(fresh));
    expect(callAt).toBeGreaterThanOrEqual(0);
    expect(landAt).toBeGreaterThanOrEqual(callAt);
    const t = ticks[landAt]!;
    const e = t.events.find(fresh)!;
    // The man who came off had the fewest legs of anyone on the field (ties by slot).
    const homeOn = t.before.players.filter((p) => p.side === 'home');
    const low = Math.min(...homeOn.map((p) => p.legs!));
    expect(legsOf(t.before, e.slot!)).toBe(low);
    expect(homeOn.find((p) => p.legs === low)!.slot).toBe(e.slot);
    expect(e.text).toMatch(/ on for /);
    // On from a rested bench: 0.9 legs.
    expect(legsOf(t.snap, e.slot!)).toBeGreaterThan(0.85);
    expect(t.events.some((x) => x.kind === 'call-paid' && x.detail === 'fresh-legs')).toBe(true);
    expect(sim.callsMade.home).toBe(1);
    expect(sim.callsPaid.home).toBe(1);
    expect(sim.verdicts.find((v) => v.call === 'fresh-legs')?.note).toMatch(/ off, .* on$/);
  });

  it('lands at a ruck where the man is free, else at the next stoppage after his jog', () => {
    const where = new Set<string>();
    for (let seed = 1; seed <= 30 && where.size < 2; seed++) {
      // Call from various points in the match so some land at a stoppage.
      const { ticks } = play(seed, { energy: 0.3, length: { halves: 1, halfMinutes: 3 } }, H, seed * 150);
      const t = ticks.find((x) => x.events.some(fresh));
      if (!t) continue;
      const stoppage = !t.snap.label.includes('· ruck ·');
      where.add(stoppage ? 'stoppage' : 'ruck');
      if (stoppage) {
        // He jogged toward the touchline first.
        const slot = t.events.find(fresh)!.slot!;
        const i = ticks.indexOf(t);
        const y = (k: number): number => ticks[k]!.snap.players.find((p) => p.side === 'home' && p.slot === slot)!.y;
        const edge = (v: number): number => Math.min(v, 68 - v);
        expect(edge(y(i - 1))).toBeLessThan(edge(y(Math.max(0, i - 40))) + 0.5);
      }
    }
    expect([...where].sort()).toEqual(['ruck', 'stoppage']);
  });

  it('once a half: refused while waiting and after it lands; a new call after half-time', () => {
    // Half-time gives legs back over 0.40: a higher line so the second half has someone tired.
    const restore = applyTuning({ 'calls.freshLegs.offBelow': 0.95 });
    let game: ReturnType<typeof play>;
    try {
      game = play(2, { energy: 0.3, length: { halves: 2, halfMinutes: 1 } });
    } finally {
      restore();
    }
    const { ticks, calls } = game;
    expect(calls).toHaveLength(2);
    const halfTime = ticks.findIndex((t) => t.snap.label.includes('· half-time ·'));
    expect(halfTime).toBeGreaterThan(0);
    expect(calls[0]!.tick).toBeLessThan(ticks[Math.max(0, halfTime)]!.tick);
    expect(calls[1]!.tick).toBeGreaterThan(ticks[Math.max(0, halfTime)]!.tick);
    expect(ticks.filter((t) => t.events.some(fresh))).toHaveLength(2);
  });

  it('a call still waiting at the siren lands in the sheds', () => {
    const length: MatchLength = { halves: 2, halfMinutes: 1 };
    let landed = false;
    for (let seed = 1; seed <= 20 && !landed; seed++) {
      const probe = new LiveSim(H, A, seed, { energy: 0.3, length });
      while (probe.phaseKind !== 'half-time') probe.step();
      const ht = probe.tick;
      const calls: CallInput[] = [];
      const sim = new LiveSim(H, A, seed, { energy: 0.3, length, calls });
      while (sim.tick < ht - 1) sim.step();
      if (sim.callRefusal('home', 'fresh-legs') !== null) continue;
      calls.push({ tick: ht, side: 'home', call: 'fresh-legs' });
      let at: string | null = null;
      let was = sim.phaseKind;
      do {
        was = sim.phaseKind;
        sim.step();
        if (sim.tickEvents.some(fresh)) at = was;
      } while (sim.phaseKind === 'half-time');
      expect(sim.freshLegsPending('home')).toBe(false);
      expect(at).toBe('half-time');
      expect(sim.callsPaid.home).toBe(1);
      // And the half's call is back.
      expect(sim.callRefusal('home', 'fresh-legs')).not.toBe('used this half');
      landed = true;
    }
    expect(landed).toBe(true);
  });

  it('refuses with a reason: nobody tired, the bench spent, used this half, not now', () => {
    const fresh0 = new LiveSim(H, A, 1);
    fresh0.step();
    expect(fresh0.callRefusal('home', 'fresh-legs')).toBe('no one’s tired yet');
    const noBench = new LiveSim(sideSheet('H', { rating: 60, bench: 0, rotation: 'off' }), A, 1, { energy: 0.3 });
    noBench.step();
    expect(noBench.callRefusal('home', 'fresh-legs')).toBe('bench is spent');
    const restore = applyTuning({ 'bench.recoverCap': 0.3 });
    try {
      const spent = new LiveSim(H, A, 1, { energy: 0.3 });
      spent.step();
      expect(spent.callRefusal('home', 'fresh-legs')).toBe('bench is spent');
    } finally {
      restore();
    }
    const tired = new LiveSim(H, A, 1, { energy: 0.3 });
    tired.step();
    expect(tired.callRefusal('home', 'fresh-legs')).toBeNull();
    expect(tired.call('home', 'fresh-legs')).toBeNull();
    expect(tired.callRefusal('home', 'fresh-legs')).toBe('used this half');
    expect(tired.freshLegsPending('home')).toBe(true);
    // It uses up neither of the set's calls.
    expect(tired.callRefusal('home', tired.inPossession === 'home' ? 'hit-up' : 'hold')).toBeNull();
    const ht = new LiveSim(H, A, 1, { energy: 0.3, length: { halves: 2, halfMinutes: 1 } });
    while (ht.phaseKind !== 'half-time') ht.step();
    expect(ht.callRefusal('home', 'fresh-legs')).toBe('not now');
  });

  it('with the rotation running, nobody is swapped twice at a stoppage and the bench keeps its men', () => {
    const rotating = sideSheet('H', { rating: 60, rotation: 'heavy' });
    for (const seed of [1, 2, 3]) {
      const { ticks, sim } = play(seed, { energy: 0.45 }, rotating);
      expect(sim.callsPaid.home).toBeGreaterThan(0);
      for (const t of ticks) {
        const swaps = t.events.filter((e) => e.kind === 'interchange' && e.side === 'home');
        if (!swaps.length) continue;
        expect(new Set(swaps.map((e) => e.slot)).size).toBe(swaps.length);
        const on = t.snap.players.filter((p) => p.side === 'home').map((p) => p.who);
        expect(new Set(on).size).toBe(on.length);
      }
      // Everyone who ever played is either on the field or on the bench: four on the bench, always.
      expect(sim.benchEnergyOf('home')).not.toBeNull();
      expect((sim as unknown as { bench: Record<'home', unknown[]> }).bench.home).toHaveLength(BENCH.size);
      // Half-time's swaps still run (the rotation's own, untagged).
      expect(ticks.some((t) => t.events.some((e) => e.kind === 'interchange' && e.side === 'home' && e.detail === undefined))).toBe(true);
    }
  });

  it('replays the same from its CallInput record, and runMatch plays the watched match', () => {
    // runMatch starts on fresh legs: a line high enough that the call comes up in a short match.
    const restore = applyTuning({ 'calls.freshLegs.offBelow': 0.95 });
    try {
      const length: MatchLength = { halves: 2, halfMinutes: 2 };
      const a = play(4, { length });
      expect(a.sim.callsPaid.home).toBeGreaterThan(0);
      const replay = new LiveSim(H, A, 4, { length, calls: [...a.calls] });
      const evs: SimEvent[] = [];
      while (!replay.finished) {
        replay.step();
        evs.push(...replay.tickEvents);
      }
      expect(evs).toEqual(a.ticks.flatMap((t) => t.events));
      const r = runMatch(H, A, { seed: 4, length, calls: [...a.calls] });
      expect([r.homeScore, r.awayScore]).toEqual([a.sim.points.home, a.sim.points.away]);
      expect(r.calls).toEqual({ made: [a.sim.callsMade.home, a.sim.callsMade.away], paid: [a.sim.callsPaid.home, a.sim.callsPaid.away] });
    } finally {
      restore();
    }
  });

  it('the AI coach never makes it', () => {
    const sim = new LiveSim(sideSheet('H', { rating: 60, rotation: 'off' }), sideSheet('A', { rating: 60, rotation: 'off' }), 3, { energy: 0.3, aiCoach: ['home', 'away'], length: { halves: 1, halfMinutes: 2 } });
    const made: SimEvent[] = [];
    while (!sim.finished) {
      sim.step();
      made.push(...sim.tickEvents.filter((e) => e.kind === 'coach-call'));
    }
    expect(made.some((e) => e.detail === 'fresh-legs')).toBe(false);
    expect(CALLS.ai.on).toBe(0);
  });
});
