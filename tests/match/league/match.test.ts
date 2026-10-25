// tests/match/league/match.test.ts — the whole match (BAK-207 §5.1, 2a): the
// clock and the siren, play on to the next dead ball, half-time (ends swapped,
// legs part-restored, the other side kicks off), full time, points, and
// runMatch's MatchResult agreeing with what the overlay counts.
import { describe, it, expect, beforeAll } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { PENALTY } from '../../../src/match/league/penalties';
import { NINES, clockText } from '../../../src/match/league/rules';
import { TICK_S } from '../../../src/match/core/engine';
import { initLiveState, possessionPct, reduceEvent } from '../../../src/ui/screens/matchOverlay';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
function sheet(id: string, rating = 60): TeamSheet {
  return {
    clubId: id,
    name: id,
    attack: rating,
    defense: rating,
    kicking: rating,
    fitness: rating,
    colors: ['#111', '#eee'],
    roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: rating, strength: rating, stamina: rating, skill: rating, footyIQ: rating } })),
  };
}

interface Played {
  sim: LiveSim;
  /** Every event with the snapshot of its tick. */
  events: { e: SimEvent; snap: Snapshot }[];
  /** Average legs per side before and after the tick the second half was set up. */
  halfTime: { before: number; after: number } | null;
  /** Clock seconds at each try and at the kick-off that followed it. */
  tryClock: { at: number; restart: number }[];
}

function play(seed: number): Played {
  const sim = new LiveSim(sheet('H'), sheet('A'), seed);
  const events: Played['events'] = [];
  let halfTime: Played['halfTime'] = null;
  const tryClock: Played['tryClock'] = [];
  let pendingTry: number | null = null;
  let half = 1;
  while (!sim.finished && sim.tick < 60_000) {
    const before = sim.energyOf('home');
    sim.step();
    const snap = sim.snapshot();
    for (const e of snap.events) {
      events.push({ e, snap });
      if (e.kind === 'try') pendingTry = snap.clock!.seconds;
      if (e.kind === 'kickoff' && pendingTry !== null) {
        tryClock.push({ at: pendingTry, restart: snap.clock!.seconds });
        pendingTry = null;
      }
    }
    if (snap.clock!.half !== half) {
      half = snap.clock!.half;
      halfTime = { before, after: sim.energyOf('home') };
      pendingTry = null;
    }
  }
  return { sim, events, halfTime, tryClock };
}

describe('the match clock, halves and full time', () => {
  const seeds = [1, 2, 3];
  const games: Played[] = [];
  beforeAll(() => {
    for (const s of seeds) games.push(play(s));
  });

  it('kicks off, sounds the siren at 7:00, goes to half-time, and ends at full time after 14:00', () => {
    for (const g of games) {
      const kinds = g.events.map((x) => x.e.kind);
      expect(kinds[0]).toBe('kickoff');
      expect(['home', 'away']).toContain(g.events[0]!.e.side); // a coin toss (Phase 3)
      expect(kinds.filter((k) => k === 'siren')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'half-time')).toHaveLength(1);
      expect(kinds[kinds.length - 1]).toBe('full-time');
      const sirens = g.events.filter((x) => x.e.kind === 'siren');
      for (const s of sirens) expect(s.snap.clock!.seconds).toBeCloseTo(NINES.halfMinutes * 60, 6);
      // The half ends at the next dead ball, never long after the siren.
      const ht = g.events.find((x) => x.e.kind === 'half-time')!;
      const ft = g.events.find((x) => x.e.kind === 'full-time')!;
      expect((ht.e.tick - sirens[0]!.e.tick) * TICK_S).toBeLessThanOrEqual(NINES.playOnMaxS);
      expect((ft.e.tick - sirens[1]!.e.tick) * TICK_S).toBeLessThanOrEqual(NINES.playOnMaxS);
      expect(ft.snap.clock).toMatchObject({ half: 2, minute: 2 * NINES.halfMinutes, finished: true });
      expect(g.sim.finished).toBe(true);
      // Over: stepping again does nothing.
      const tick = g.sim.tick;
      g.sim.step();
      expect(g.sim.tick).toBe(tick);
    }
  });

  it('the side that received first kicks off the second half, and the ends swap', () => {
    const tryX: Record<string, number[]> = { 'home-1': [], 'away-1': [], 'home-2': [], 'away-2': [] };
    const openers = new Set<string>();
    for (const g of games) {
      const ht = g.events.findIndex((x) => x.e.kind === 'half-time');
      const next = g.events.slice(ht).find((x) => x.e.kind === 'kickoff')!;
      expect(next.e.side).not.toBe(g.events[0]!.e.side); // whoever received the opening kick-off
      openers.add(g.events[0]!.e.side!);
      expect(next.snap.clock!.half).toBe(2);
      for (const { e, snap } of g.events.filter((x) => x.e.kind === 'try')) tryX[`${e.side}-${snap.clock!.half}`]!.push(snap.ball.x);
    }
    // Home attacks +x before the break and -x after it; away the other way.
    for (const x of tryX['home-1']!) expect(x).toBeGreaterThan(50);
    for (const x of tryX['away-1']!) expect(x).toBeLessThan(50);
    for (const x of tryX['home-2']!) expect(x).toBeLessThan(50);
    for (const x of tryX['away-2']!) expect(x).toBeGreaterThan(50);
    expect(Object.values(tryX).flat().length).toBeGreaterThan(4);
    // The toss goes both ways across seeds.
    for (let seed = 4; openers.size < 2 && seed < 40; seed++) {
      const sim = new LiveSim(sheet('H', 60), sheet('A', 60), seed);
      while (!sim.tickEvents.some((e) => e.kind === 'kickoff')) sim.step();
      openers.add(sim.tickEvents.find((e) => e.kind === 'kickoff')!.side!);
    }
    expect(openers.size).toBe(2);
  });

  it('the clock stops from a try to the restart', () => {
    const all = games.flatMap((g) => g.tryClock);
    expect(all.length).toBeGreaterThan(2);
    for (const t of all) expect(t.restart - t.at).toBeLessThanOrEqual(TICK_S + 1e-9);
  });

  it('half-time gives back half the legs a player has lost', () => {
    for (const g of games) {
      const { before, after } = g.halfTime!;
      expect(before).toBeLessThan(0.9); // nine minutes have cost something
      expect(after).toBeCloseTo(before + (1 - before) * NINES.halfTimeLegsBack, 2);
    }
  });

  it('a try is worth four, a conversion two, a field goal one; the readout shows the clock and the score', () => {
    for (const g of games) {
      for (const side of ['home', 'away'] as const) {
        const made = (kind: string): number => g.events.filter((x) => x.e.kind === kind && x.e.side === side && x.e.detail === 'good').length;
        const bonus = g.events.filter((x) => x.e.kind === 'try' && x.e.side === side && x.e.detail === 'bonus').length;
        expect(g.sim.points[side]).toBe(g.sim.tries[side] * NINES.tryPoints + bonus * (NINES.bonusTryPoints - NINES.tryPoints) + made('conversion') * NINES.conversionPoints + made('field-goal') * NINES.fieldGoalPoints + made('penalty-goal') * PENALTY.goalPoints);
      }
      const last = g.events[g.events.length - 1]!.snap;
      expect(last.score).toEqual(g.sim.points);
      expect(last.label).toContain(`${g.sim.points.home}–${g.sim.points.away}`);
      expect(last.label).toContain(`2nd ${NINES.halfMinutes}:00`);
    }
    expect(clockText(1, 272.4)).toBe('1st 4:32');
  });

  it('a single stretch plays one half and no half-time', () => {
    const sim = new LiveSim(sheet('H'), sheet('A'), 4, { length: { halves: 1, halfMinutes: 1 } });
    const kinds: string[] = [];
    while (!sim.finished && sim.tick < 10_000) {
      sim.step();
      kinds.push(...sim.tickEvents.map((e) => e.kind));
    }
    expect(sim.finished).toBe(true);
    expect(kinds).not.toContain('half-time');
    expect(kinds[kinds.length - 1]).toBe('full-time');
    expect(sim.matchSeconds).toBeCloseTo(60, 6);
  });
});

describe('runMatch', () => {
  it('is deterministic, starts with a kick-off, ends at full time, and its stats agree with the overlay count', () => {
    const home = sheet('H', 65);
    const away = sheet('A', 55);
    for (const seed of [5, 6]) {
      const r = runMatch(home, away, { seed, weather: 'rain' });
      expect(runMatch(home, away, { seed, weather: 'rain' })).toEqual(r);
      expect(r.events[0]!.kind).toBe('kickoff');
      expect(r.events[r.events.length - 1]!.kind).toBe('full-time');
      expect(r.events.filter((e) => e.kind === 'half-time')).toHaveLength(1);
      for (let i = 1; i < r.events.length; i++) expect(r.events[i]!.t).toBeGreaterThanOrEqual(r.events[i - 1]!.t);
      expect(r.events[r.events.length - 1]!.t).toBe(2 * NINES.halfMinutes);
      expect(r.weather).toBe('rain');
      // Big hits can hurt (2f): each injury names a side's player, out 1–3 weeks.
      for (const i of r.injuries) {
        expect(['H', 'A']).toContain(i.teamId);
        expect(i.weeks).toBeGreaterThanOrEqual(1);
        expect(i.weeks).toBeLessThanOrEqual(3);
      }
      expect(r.momentumTimeline.length).toBeGreaterThan(10);
      let s = initLiveState();
      for (const ev of r.events) s = reduceEvent(s, ev, 'H');
      expect(s.homeScore).toBe(r.homeScore);
      expect(s.awayScore).toBe(r.awayScore);
      expect(s.tries).toEqual(r.stats.tries);
      expect(s.errors).toEqual(r.stats.errors);
      expect(s.tackles).toEqual(r.stats.tackles);
      expect(possessionPct(s)).toEqual(r.stats.possession);
      expect(s.half).toBe(2);
      expect(r.homeScore + r.awayScore).toBeGreaterThan(0);
    }
  });
});
