import { nonFinitePaths, type SoakOptions, type SoakResult } from './soak';

export interface AgencyCohort {
  name: string;
  pairs: number;
  idleMean: number;
  managedMean: number;
  meanDifference: number;
  interval95: [number, number];
}
export interface AgencyReport { cohorts: AgencyCohort[]; problems: string[] }

const PRIMARY = Array.from({ length: 40 }, (_, i) => (i + 1) * 7919);
const REGRESSION = [101, 102, 103, 104];
const SEEDS = [...PRIMARY, ...REGRESSION];

/** Declared before measuring the short-clock ensemble; never resize until green. */
export function careerAgencyCases(): SoakOptions[] {
  return SEEDS.flatMap(seed => (['idle', 'managed'] as const).map(mode => ({
    seed, mode, seasons: 2, difficulty: 'normal' as const, pack: 'au' as const,
  })));
}
/** Validate complete matching careers before applying the unchanged zero cutoff. */
export function careerAgencyReport(runs: readonly SoakResult[]): AgencyReport {
  const problems: string[] = [];
  const byCase = new Map<string, SoakResult>();
  for (const r of runs) {
    const key = `${r.seed}/${r.mode}`;
    if (!SEEDS.includes(r.seed) || !['idle', 'managed'].includes(r.mode)) problems.push(`unexpected case ${key}`);
    if (byCase.has(key)) problems.push(`duplicate case ${key}`);
    byCase.set(key, r);
    if ((r.pack ?? 'au') !== 'au' || (r.difficulty ?? 'normal') !== 'normal' || r.liveRivals || r.fromVersion !== undefined || r.fromSave || r.persona) {
      problems.push(`mismatched career inputs ${key}`);
    }
    if (r.seasons.length !== 2 || r.seasons[0]?.season !== 1 || r.seasons[1]?.season !== 2) problems.push(`incomplete two-season career ${key}`);
    if (nonFinitePaths(r).length) problems.push(`nonfinite result ${key}`);
    problems.push(...r.problems.map(p => `${key}: ${p}`));
  }
  for (const seed of SEEDS) {
    const idle = byCase.get(`${seed}/idle`), managed = byCase.get(`${seed}/managed`);
    for (const mode of ['idle', 'managed']) if (!byCase.has(`${seed}/${mode}`)) problems.push(`missing case ${seed}/${mode}`);
    if (idle && managed && (idle.start.bestNine !== managed.start.bestNine || idle.start.rivalMean !== managed.start.rivalMean || idle.start.rivalRange.some((v, i) => v !== managed.start.rivalRange[i]))) {
      problems.push(`mismatched initial squads ${seed}`);
    }
  }
  if (problems.length) return { cohorts: [], problems };
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const cohorts: AgencyCohort[] = ([
    ['primary40', PRIMARY, 2.02269092], ['regression4', REGRESSION, 3.18244631], ['combined44', SEEDS, 2.01669220],
  ] as const).map(([name, seeds, critical]) => {
    const idle = seeds.map(seed => byCase.get(`${seed}/idle`)!.seasons[1]!.bestNine);
    const managed = seeds.map(seed => byCase.get(`${seed}/managed`)!.seasons[1]!.bestNine);
    // GapSample reports ratings in tenths. Sum those exact units, so an exact
    // zero stays zero rather than failing on binary floating point cancellation.
    const tenths = managed.map((v, i) => Math.round(v * 10) - Math.round(idle[i]! * 10));
    const differences = tenths.map(v => v / 10);
    const meanDifference = tenths.reduce((a, b) => a + b, 0) / (10 * seeds.length);
    const se = Math.sqrt(differences.reduce((n, d) => n + (d - meanDifference) ** 2, 0) / (seeds.length - 1) / seeds.length);
    return { name, pairs: seeds.length, idleMean: mean(idle), managedMean: mean(managed), meanDifference,
      interval95: [meanDifference - critical * se, meanDifference + critical * se] as [number, number] };
  });
  if (cohorts[2]!.meanDifference < 0) problems.push('combined44 managed best-nine mean is below idle');
  return { cohorts, problems };
}

export function careerAgencyMarkdown(report: AgencyReport): string {
  return [
    '## Career agency: fixed two-season AU Normal cohort', '',
    '| Cohort | Paired seeds | Idle best nine | Managed best nine | Managed − idle | Paired 95% t interval |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...report.cohorts.map(c => `| ${c.name} | ${c.pairs} | ${c.idleMean.toFixed(3)} | ${c.managedMean.toFixed(3)} | ${c.meanDifference.toFixed(3)} | [${c.interval95.map(v => v.toFixed(3)).join(', ')}] |`), '',
    'Gate: combined44 observed managed mean must be at least idle (zero cutoff). All cases and invariants are mandatory.',
    'The original four are reported separately; no claim requires every four-seed subset to win.',
    'Passing this gate does not establish equivalence or excuse adverse finance, progression or clock-comparison evidence.', '',
    ...(report.problems.length ? report.problems.map(p => `- FAIL: ${p}`) : ['Career agency gate passed.']),
  ].join('\n');
}
