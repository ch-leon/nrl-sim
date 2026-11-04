import { describe, expect, it } from 'vitest';
import { POSITIONS } from '../../../src/data/player';
import { cellsOf, checkPlan, POSITION_GROUPS, type Plan, type SideSpec } from '../../../src/match/balance/plan';
import { measureCell, SIDE_COUNTS, sideSheet, squadSide } from '../../../src/match/balance/measure';
import { reportMarkdown } from '../../../src/match/balance/report';

const even = { name: 'balanced v slide', home: { rating: 60 }, away: { rating: 60 }, track: 'home' as const };
const plan = (home: SideSpec): Plan => ({ name: 'counters', seeds: 2, scenarios: [{ ...even, home }] });

describe('position stat overrides', () => {
  const overrides: SideSpec = {
    stats: { speed: 55, strength: 56 },
    positionStats: { backs: { speed: 80 }, halves: { skill: 85 }, pack: { strength: 80 }, prop: { strength: 90 } },
  };
  it('applies groups and exact positions after flat stats to starters and bench on every sheet kind', () => {
    const sheets = [sideSheet('H', overrides), sideSheet('H', { ...overrides, club: 'rival-wolves' }),
      squadSide('H', { ...overrides, squad: 'player' }, 1).sheet,
      squadSide('H', { ...overrides, squad: 'rival' }, 1).sheet];
    for (const sheet of sheets) {
      expect(sheet.bench).toHaveLength(4);
      for (const r of [...sheet.roster!, ...sheet.bench!]) {
        expect(r.stats!.speed).toBe((POSITION_GROUPS.backs as readonly string[]).includes(r.position) ? 80 : 55);
        expect(r.stats!.strength).toBe(r.position === 'prop' ? 90 : (POSITION_GROUPS.pack as readonly string[]).includes(r.position) ? 80 : 56);
        if ((POSITION_GROUPS.halves as readonly string[]).includes(r.position)) expect(r.stats!.skill).toBe(85);
      }
    }
  });
  it('validates every position and rejects bad positions, stats and values', () => {
    expect(checkPlan(plan({ positionStats: Object.fromEntries(POSITIONS.map((p) => [p, { skill: 75 }])) }))).toEqual([]);
    for (const positionStats of [{ wing: { speed: 80 } }, { backs: { handling: 80 } }, { pack: { strength: 101 } },
      { halves: { skill: Number.NaN } }, { backs: { speed: '80' } }, { pack: null }, []]) {
      expect(checkPlan(plan({ positionStats: positionStats as never })).length).toBeGreaterThan(0);
    }
    expect(checkPlan({ ...plan({}), report: 'unknown' as never })).toContain('report must be matrix');
  });
});

describe('tracked counter measurements', () => {
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
    // These short seeds give one win and one loss; a one-minute cell below draws.
    const tiny = cell;
    const first = measureCell(tiny, 1, 4, 1);
    const second = measureCell(tiny, 1, 4, 2);
    const both = measureCell(tiny, 2, 4, 1);
    const xs = [first, second].map((r) => r.trackedWin! + r.trackedDraw! / 2);
    expect(xs).toEqual([1, 0]);
    expect(measureCell(tiny, 1, 1).pointsShare).toEqual({ mean: 0.5, se: 0 });
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
