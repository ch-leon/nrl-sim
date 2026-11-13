import { describe, expect, it } from 'vitest';
import { careerAgencyCases, careerAgencyReport, careerAgencyMarkdown } from '../../src/qa/careerAgency';
import { emptyTally, type SeasonSample, type SoakResult } from '../../src/qa/soak';

const season = (n: number, bestNine: number): SeasonSample => ({
  season: n, money: 100_000, minMoney: 50_000, debtWeeks: 0, forcedSales: 0,
  squad: 20, freeAgents: 10, saveBytes: 1000, rivalStrength: [40, 70], reputation: 30,
  sacked: false, wins: 12, draws: 1, losses: 11, marginPerGame: 0, ladderPosition: 8,
  premiership: false, madeFinals: true, nearRivalWinRate: 0.5, nearRivalGames: 4,
  forfeits: 0, bestNine, rivalMean: 55, rivalRange: [40, 70], signings: 0,
  signingFees: 0, signedOverall: 0, finance: emptyTally(),
  styleMix: { attacks: 0, defences: 0, switches: 0, games: 0 },
});
const runs = (primary = 1, regression = -2): SoakResult[] => careerAgencyCases().map(c => ({
  seed: c.seed, mode: c.mode, pack: 'au', difficulty: 'normal',
  start: { bestNine: 50, rivalMean: 55, rivalRange: [40, 70] },
  seasons: [season(1, 55), season(2, 60 + (c.mode === 'managed' ? c.seed < 1000 ? regression : primary : 0))],
  problems: [], ms: 0,
}));

describe('maintained career agency gate', () => {
  it('uses the fixed primary forty and original four, each idle and managed for two AU Normal seasons', () => {
    const cases = careerAgencyCases();
    expect(cases).toHaveLength(88);
    expect(cases.filter(c => c.mode === 'idle').map(c => c.seed)).toEqual([
      ...Array.from({ length: 40 }, (_, i) => (i + 1) * 7919), 101, 102, 103, 104,
    ]);
    expect(cases.every(c => c.seasons === 2 && c.pack === 'au' && c.difficulty === 'normal')).toBe(true);
  });

  it('preserves the zero cutoff over all forty-four and reports the losing regression cohort', () => {
    const report = careerAgencyReport(runs());
    expect(report.problems).toEqual([]);
    expect(report.cohorts.map(c => [c.name, c.pairs])).toEqual([['primary40', 40], ['regression4', 4], ['combined44', 44]]);
    expect(report.cohorts[1]!.meanDifference).toBe(-2);
    expect(report.cohorts[2]!.meanDifference).toBeCloseTo(32 / 44);
    const text = careerAgencyMarkdown(report);
    expect(text).toContain('regression4');
    expect(text).toContain('95%');
    expect(text).toContain('-2.000');
    expect(text).toContain('does not establish equivalence');
    expect(careerAgencyReport(runs(-1, 2)).problems).toContain('combined44 managed best-nine mean is below idle');
    expect(careerAgencyReport(runs(0, 0)).problems).toEqual([]);
  });

  it('uses seed-paired variance rather than treating the two policies as independent samples', () => {
    const data = runs(0, 0);
    for (const r of data) {
      const i = Math.floor(r.seed / 7919);
      if (!i) continue;
      r.seasons[1]!.bestNine = 40 + i + (r.mode === 'managed' ? i % 2 ? 1 : -1 : 0);
    }
    const primary = careerAgencyReport(data).cohorts[0]!;
    const halfWidth = 2.02269092 / Math.sqrt(39);
    expect(primary.meanDifference).toBe(0);
    expect(primary.interval95[0]).toBeCloseTo(-halfWidth, 7);
    expect(primary.interval95[1]).toBeCloseTo(halfWidth, 7);
  });

  it('does not turn an exact tie in reported tenths into a negative gate through floating point cancellation', () => {
    const data = runs(0, 0);
    const changes = new Map([[7919, -0.1], [15838, -0.2], [23757, 0.3]]);
    for (const r of data) if (r.mode === 'managed') r.seasons[1]!.bestNine += changes.get(r.seed) ?? 0;
    const report = careerAgencyReport(data);
    expect(report.problems).toEqual([]);
    expect(report.cohorts[2]!.meanDifference).toBe(0);
  });

  it.each(['missing', 'duplicate', 'unexpected seed', 'wrong difficulty', 'wrong pack', 'live rivals', 'loaded save', 'short season', 'duplicate season', 'different start', 'nonfinite', 'invariant failure'])('fails closed on %s', kind => {
    const data = runs();
    const r = data[0]!;
    if (kind === 'missing') data.pop();
    if (kind === 'duplicate') data.push(structuredClone(r));
    if (kind === 'unexpected seed') r.seed = 7;
    if (kind === 'wrong difficulty') r.difficulty = 'hard';
    if (kind === 'wrong pack') r.pack = 'uk';
    if (kind === 'live rivals') r.liveRivals = true;
    if (kind === 'loaded save') r.fromVersion = 24;
    if (kind === 'short season') r.seasons.pop();
    if (kind === 'duplicate season') r.seasons[1]!.season = 1;
    if (kind === 'different start') r.start.bestNine++;
    if (kind === 'nonfinite') r.seasons[1]!.bestNine = NaN;
    if (kind === 'invariant failure') r.problems.push('ledger off');
    const report = careerAgencyReport(data);
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.cohorts).toEqual([]);
  });
});
