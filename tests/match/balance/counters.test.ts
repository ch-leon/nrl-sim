import { describe, expect, it } from 'vitest';
import { POSITIONS } from '../../../src/data/player';
import { cellsOf, checkPlan, POSITION_GROUPS, type Plan, type SideSpec } from '../../../src/match/balance/plan';
import { countEvents, measureCell, SIDE_COUNTS, sideSheet, squadSide } from '../../../src/match/balance/measure';
import { reportMarkdown } from '../../../src/match/balance/report';

const even = { name: 'balanced v slide', home: { rating: 60 }, away: { rating: 60 }, track: 'home' as const };
const plan = (home: SideSpec): Plan => ({ name: 'counters', seeds: 2, scenarios: [{ ...even, home }] });

describe('position stat overrides', () => {
  const overrides: SideSpec = {
    stats: { speed: 55, strength: 56 },
    positionStats: { backs: { speed: 80 }, halves: { handling: 85 }, pack: { strength: 80 }, prop: { strength: 90 } },
  };
  it('applies groups and exact positions after flat stats to starters and bench on every sheet kind', () => {
    const builders = [
      (spec: SideSpec) => sideSheet('H', spec),
      (spec: SideSpec) => sideSheet('H', { ...spec, club: 'rival-wolves' }),
      (spec: SideSpec) => squadSide('H', { ...spec, squad: 'player' }, 1).sheet,
      (spec: SideSpec) => squadSide('H', { ...spec, squad: 'rival' }, 1).sheet,
    ];
    for (const build of builders) {
      const sheet = build(overrides);
      const baseline = build({ stats: overrides.stats! });
      const before = [...baseline.roster!, ...baseline.bench!];
      expect(sheet.bench).toHaveLength(4);
      for (const [i, r] of [...sheet.roster!, ...sheet.bench!].entries()) {
        expect(r.stats!.speed).toBe((POSITION_GROUPS.backs as readonly string[]).includes(r.position) ? 80 : before[i]!.stats!.speed);
        expect(r.stats!.strength).toBe(r.position === 'prop' ? 90 : (POSITION_GROUPS.pack as readonly string[]).includes(r.position) ? 80 : before[i]!.stats!.strength);
        expect(r.stats!.handling).toBe((POSITION_GROUPS.halves as readonly string[]).includes(r.position) ? 85 : before[i]!.stats!.handling);
      }
    }
  });
  it('preserves legacy flat-only stats behavior when no positionStats are given', () => {
    expect(sideSheet('H', { stats: { speed: 55 } }).roster![0]!.stats!.speed).toBe(55);
    expect(sideSheet('H', { club: 'rival-wolves', stats: { speed: 55 } })).toEqual(sideSheet('H', { club: 'rival-wolves' }));
    for (const squad of ['player', 'rival'] as const) {
      expect(squadSide('H', { squad, stats: { speed: 55 } }, 1)).toEqual(squadSide('H', { squad }, 1));
    }
  });
  it('validates every position and rejects bad positions, stats and values', () => {
    expect(checkPlan(plan({ positionStats: Object.fromEntries(POSITIONS.map((p) => [p, { handling: 75 }])) }))).toEqual([]);
    for (const positionStats of [{ wing: { speed: 80 } }, { backs: { skill: 80 } }, { pack: { strength: 101 } },
      { halves: { handling: Number.NaN } }, { backs: { speed: '80' } }, { pack: null }, []]) {
      expect(checkPlan(plan({ positionStats: positionStats as never })).length).toBeGreaterThan(0);
    }
    expect(checkPlan({ ...plan({}), report: 'unknown' as never })).toContain('report must be matrix');
  });
});

describe('tracked counter measurements', () => {
  it('keeps opposing kick and try context when attributing kick counts to one side', () => {
    const events = [
      { tick: 1, kind: 'kick', side: 'home' as const, detail: 'bomb', text: '' },
      { tick: 2, kind: 'kick', side: 'away' as const, detail: 'long', text: '' },
      { tick: 3, kind: 'regather', side: 'home' as const, text: '' },
      { tick: 4, kind: 'kick', side: 'home' as const, detail: 'grubber', text: '' },
      { tick: 5, kind: 'try', side: 'away' as const, text: '' },
      { tick: 6, kind: 'try', side: 'home' as const, text: '' },
    ];
    expect(countEvents(events, 'home')).toMatchObject({ bombs: 1, bombsWon: 0, grubbers: 1, grubberTries: 0 });
    expect(countEvents(events, 'away')).toMatchObject({ bombs: 0, bombsWon: 0, grubbers: 0, grubberTries: 0 });
  });

  const cell = { variant: { name: 'baseline' }, scenario: { ...even, home: { rating: 60, tactics: { attack: 'expansive' as const } } } };
  it('pools both orientations per side while preserving legacy counts, including when tracking away', () => {
    const written = measureCell(cell, 2, 2);
    const swapped = measureCell({ ...cell, scenario: { ...cell.scenario, home: cell.scenario.away, away: cell.scenario.home, track: 'away' } }, 2, 2);
    const both = measureCell({ ...cell, scenario: { ...cell.scenario, bothWays: true } }, 2, 2);
    expect(both.counts).toEqual(written.counts);
    expect(both.trackedSeeds).toBe(4);
    for (const k of SIDE_COUNTS) {
      expect(both.trackedCounts![k].mean).toBeCloseTo((written.trackedCounts![k].mean + swapped.trackedCounts![k].mean) / 2);
      expect(both.opponentCounts![k].mean).toBeCloseTo((written.opponentCounts![k].mean + swapped.opponentCounts![k].mean) / 2);
      const pooledKey = k === 'pointsFor' || k === 'pointsAgainst' ? 'points' : k;
      expect(both.trackedCounts![k].mean + both.opponentCounts![k].mean).toBeCloseTo((written.counts[pooledKey].mean + swapped.counts[pooledKey].mean) / 2);
    }
    expect(both.trackedCounts!.pointsFor).toEqual(both.opponentCounts!.pointsAgainst);
  });
  it('calculates wins plus half draws and its sample SE on a two-seed cell', () => {
    // These short seeds give one draw and one loss with counters enabled (#465);
    // before switch-on they gave [1, 0]. A neutral one-minute control draws.
    const tiny = cell;
    const first = measureCell(tiny, 1, 4, 1);
    const second = measureCell(tiny, 1, 4, 2);
    const both = measureCell(tiny, 2, 4, 1);
    const xs = [first, second].map((r) => r.trackedWin! + r.trackedDraw! / 2);
    expect(xs).toEqual([0.5, 0]);
    expect(measureCell({ ...cell, scenario: even }, 1, 1).pointsShare).toEqual({ mean: 0.5, se: 0 });
    expect(new Set(xs).size).toBe(2);
    const mean = (xs[0]! + xs[1]!) / 2;
    expect(both.pointsShare!.mean).toBe(mean);
    expect(both.pointsShare!.se).toBeCloseTo(Math.sqrt(xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / 2));
    expect(first.pointsShare!.se).toBe(0);
  });
  it('opts into matrix and per-side tables, leaving the legacy report unchanged', () => {
    const result = measureCell(cellsOf(plan({}))[0]!, 1, 1);
    const input = { plan: plan({}), meta: {}, results: [result] };
    const legacy = reportMarkdown(input);
    const { pointsShare: _share, trackedCounts: _tracked, opponentCounts: _opponent, ...old } = result;
    expect(reportMarkdown({ ...input, results: [old] })).toBe(legacy);
    const matrix = reportMarkdown({ ...input, plan: { ...input.plan, report: 'matrix' } });
    expect(matrix).toContain('| Attack | Slide | Rush | Compressed |');
    expect(matrix).toContain('| Balanced | 50.0% ± 0.0% | — | — |');
    expect(matrix).toContain('| balanced v slide | tracked |');
    expect(matrix).toContain('| balanced v slide | opponent |');
    expect(matrix).toContain('pointsFor | pointsAgainst');
    expect(matrix).toContain('| balanced v slide | 1 | 50.0% ± 0.0% |');
    expect(legacy).not.toContain('Attack × defence');
  });
});
