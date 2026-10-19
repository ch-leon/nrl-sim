// tests/match/league/bench.test.ts — interchanges (BAK-207 §5.1 2b, #70): the
// coach's rotation rule, the bench's slow recovery, the swap itself (after a
// try with a jog to the sideline, at half-time in the sheds), and a rotating
// side finishing on better legs than the same side without a bench.
import { describe, it, expect, beforeAll } from 'vitest';
import { BENCH, benchRecover, pickSwaps } from '../../../src/match/league/bench';
import { LiveSim } from '../../../src/match/league/live';
import { teamSheetFromRival, teamSheetFromSquad } from '../../../src/sim/engine';
import { generatedRoster } from '../../../src/sim/staging';
import { RIVAL_CLUBS } from '../../../src/data/league';
import { generatePlayer } from '../../../src/data/player';
import { makeRng } from '../../../src/utils/rng';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';

describe('the bench (pure)', () => {
  it('the coach takes off the most tired men under his line, for bench men fresh enough, a few at a time', () => {
    const field = [
      { slot: 0, energy: 0.8 },
      { slot: 1, energy: 0.4 },
      { slot: 2, energy: 0.5 },
      { slot: 3, energy: 0.3 },
      { slot: 4, energy: 0.6 },
    ];
    const bench = [{ energy: 0.9 }, { energy: 0.6 }, { energy: 1 }, { energy: 0.45 }];
    expect(pickSwaps(field, bench, 'off')).toEqual([]);
    // Standard: under 55%, at most two, freshest bench man first.
    expect(pickSwaps(field, bench, 'standard')).toEqual([
      { slot: 3, bench: 2 },
      { slot: 1, bench: 0 },
    ]);
    // Heavy: a higher line and three at a time.
    expect(pickSwaps(field, bench, 'heavy').map((s) => s.slot)).toEqual([3, 1, 2]);
    // Nobody on the bench is fresh enough: no swap.
    expect(pickSwaps(field, [{ energy: 0.35 }], 'standard')).toEqual([]);
    expect(pickSwaps(field, [], 'heavy')).toEqual([]);
  });
  it('a benched player gets his legs back slowly, up to 90%; a fresh reserve stays fresh', () => {
    expect(benchRecover(0.4, 60)).toBeCloseTo(0.4 + BENCH.recoverPerMin);
    // Off at 40%, back on four minutes later at 60% (BAK-208 §8.2).
    expect(benchRecover(0.4, 240)).toBeCloseTo(0.6);
    expect(benchRecover(0.85, 600)).toBe(BENCH.recoverCap);
    expect(benchRecover(1, 60)).toBe(1);
  });
});

describe('sheets carry a bench', () => {
  it('a squad’s next four fit players; a rival’s generated four, named apart from (and not changing) its starters', () => {
    const rng = makeRng(3);
    const squad = Array.from({ length: 15 }, (_, i) => generatePlayer(rng, { position: i % 2 ? 'prop' : 'centre' }));
    squad[0]!.injuredWeeks = 2;
    const sheet = teamSheetFromSquad(squad, 'me', 'Me', ['#111', '#eee']);
    expect(sheet.roster).toHaveLength(9);
    expect(sheet.bench).toHaveLength(4);
    expect(sheet.bench!.some((b) => b.id === squad[0]!.id)).toBe(false); // the injured man sits out
    const club = RIVAL_CLUBS[0]!;
    const rival = teamSheetFromRival(club);
    expect(rival.bench).toHaveLength(4);
    expect(rival.roster!.map((r) => r.name)).toEqual(generatedRoster(club.id).map((r) => r.name));
    const names = new Set(rival.roster!.map((r) => r.name));
    for (const b of rival.bench!) expect(names.has(b.name)).toBe(false);
  });
});

describe('interchanges in the live sim', () => {
  interface Game {
    events: { e: SimEvent; snap: Snapshot }[];
    /** Home's average legs over the last five minutes of the clock. */
    lateLegs: number;
  }
  function play(home: TeamSheet, away: TeamSheet, seed: number): Game {
    const sim = new LiveSim(home, away, seed);
    const events: Game['events'] = [];
    let sum = 0;
    let n = 0;
    while (!sim.finished && sim.tick < 60_000) {
      sim.step();
      const es = sim.tickEvents;
      if (es.length) {
        const snap = sim.snapshot();
        for (const e of es) events.push({ e, snap });
      }
      if (sim.matchSeconds >= 13 * 60) {
        sum += sim.energyOf('home');
        n++;
      }
    }
    return { events, lateLegs: sum / n };
  }
  const seeds = [1, 2, 3];
  const on: Game[] = [];
  const off: Game[] = [];
  beforeAll(() => {
    const away = sideSheet('A', { rating: 60 });
    for (const s of seeds) {
      on.push(play(sideSheet('H', { rating: 60, rotation: 'heavy' }), away, s));
      off.push(play(sideSheet('H', { rating: 60, rotation: 'off' }), away, s));
    }
  });

  it('a side that rotates finishes on better legs than the same side without a bench', () => {
    const mean = (gs: Game[]): number => gs.reduce((a, g) => a + g.lateLegs, 0) / gs.length;
    expect(mean(on)).toBeGreaterThan(mean(off) + 0.08);
    for (const g of off) expect(g.events.some((x) => x.e.kind === 'interchange' && x.e.side === 'home')).toBe(false);
  });

  it('swaps are announced "X on for Y", put the new man in the slot, and happen at stoppages only', () => {
    const subs = on.flatMap((g) => g.events.filter((x) => x.e.kind === 'interchange'));
    expect(subs.length).toBeGreaterThan(3);
    for (const { e, snap } of subs) {
      expect(e.text).toMatch(/^.+ on for .+$/);
      expect(e.text.startsWith(`${e.player} on for`)).toBe(true);
      const p = snap.players.find((q) => q.side === e.side && q.slot === e.slot)!;
      expect(p.who).toBe(e.player); // flat squads have no ids: the look follows the name
      // Never in open play: only at a stoppage — the restart after a try or a drop-out, or a set piece after touch or a dead ball (2d).
      expect(snap.label).toMatch(/· (restart|set-piece) ·/);
    }
  });

  it('at half-time tired men are swapped in the sheds, after the break gives everyone legs back', () => {
    // A short match from cooked legs: the break brings them to 60%, still under Heavy's line; the rested bench comes on.
    const sim = new LiveSim(sideSheet('H', { rating: 60, rotation: 'heavy' }), sideSheet('A', { rating: 60, rotation: 'off' }), 7, { energy: 0.2, length: { halves: 2, halfMinutes: 1 } });
    const subs: { e: SimEvent; label: string }[] = [];
    while (!sim.finished && sim.tick < 20_000) {
      sim.step();
      for (const e of sim.tickEvents) if (e.kind === 'interchange') subs.push({ e, label: sim.snapshot().label });
    }
    const atBreak = subs.filter((s) => s.label.includes('2nd 0:00'));
    expect(atBreak.length).toBe(BENCH.heavy.perStoppage);
    expect(atBreak.every((s) => s.e.side === 'home')).toBe(true);
  });
});
