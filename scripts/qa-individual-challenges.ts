// npx vite-node scripts/qa-individual-challenges.ts -- [--samples 4096] [--seed 710]
//   [--generated-per-position 2] [--out e2e-output/individual-challenges] [--strict-balance]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { runIndividualChallengeQA } from '../src/qa/individualChallenges';

const { values } = parseArgs({
  args: process.argv.slice(2).filter(arg => arg !== '--'),
  options: {
    samples: { type: 'string', default: '4096' },
    seed: { type: 'string', default: '710' },
    'generated-per-position': { type: 'string', default: '2' },
    out: { type: 'string', default: 'e2e-output/individual-challenges' },
    'strict-balance': { type: 'boolean' },
  },
});

const report = runIndividualChallengeQA({
  samples: Number(values.samples), firstSeed: Number(values.seed), generatedPerPosition: Number(values['generated-per-position']),
});
const out = values.out!;
const pct = (rate: number): string => `${(rate * 100).toFixed(2)}%`;
const pp = (delta: number): string => `${(delta * 100).toFixed(2)} pp`;
const largestSearch = report.cases.reduce((max, { autoMetrics }) => Math.max(autoMetrics.valueStates, max), 0);
const largestEnumeration = report.cases.reduce((max, { autoMetrics }) => Math.max(autoMetrics.classifications, max), 0);
const solveTimes = report.cases.map(row => row.autoSolveMs).sort((a, b) => a - b);
const lines = [
  '# Individual challenge balance',
  '',
  `Rule version ${report.ruleVersion}, Auto policy version ${report.policyVersion}. Competing policies share ${report.options.samples} career seeds within each edition/actor case. Cases use disjoint seed blocks starting at ${report.options.firstSeed}.`,
  '',
  `Jitter per roll step in tenths is ${report.parameters.jitter10.shoot} / ${report.parameters.jitter10.track} / ${report.parameters.jitter10.wrap} for Shoot / Track / Wrap. The fitting trait bonus is ${Object.values(report.parameters.traitBonus).join(' / ')} rating points for levels I / II / III.`,
  '',
  'Exact odds use weighted outcome enumeration. Sample odds and Wilson 95% intervals come from the indexed rolls.',
  '',
  `Correctness checks: ${report.correctness.passed ? 'pass' : 'fail'}`,
  ...report.correctness.problems.map(problem => `- ${problem}`),
  '',
  '## Initial balance hypotheses',
  '',
  ...report.gates.map(gate => `- ${gate.passed ? 'Pass' : 'Outside target'} · ${gate.name}. ${gate.detail}`),
  '',
  `Near peer means a synthetic no-trait actor with a baseline exact Auto title chance of 30–65%. ${report.diagnostics.nearPeerConservation}/${report.diagnostics.nearPeerCases} near-peer Auto cases used a low-cost call in 20–50% of simulated contests. See the JSON for all pacing and action frequencies.`,
  '',
  `The exact title chance fell within ${report.diagnostics.insideWilson95}/${report.diagnostics.totalSampleComparisons} descriptive Wilson 95% intervals. Policy runs within each case share seeds. The overall accuracy checks pool separately by policy across disjoint case blocks.`,
  '',
  `The largest initial exact solve visited ${largestSearch} decision states and classified ${largestEnumeration} outcomes. Observed Node solve time was ${solveTimes[0].toFixed(2)}–${solveTimes[solveTimes.length - 1].toFixed(2)} ms.`,
  '',
  `The indexed-roll audit uses a separate ${report.rollAudit.samples}-seed block starting at ${report.rollAudit.firstSeed}. Uniformity passed ${report.rollAudit.uniformity.filter(check => check.chiSquare <= check.limit).length}/7 per-index tests and independence passed ${report.rollAudit.independence.filter(check => check.chiSquare <= check.limit).length}/21 pairwise tests. Pearson thresholds adjust for a ${pct(report.diagnostics.familyAlpha)} nominal family error rate.`,
  '',
  '## Pooled exact and sampled title wins',
  '',
  `Bernstein thresholds adjust for a ${pct(report.diagnostics.familyAlpha)} family error rate across policies.`,
  '',
  '| Policy | Observed wins | Expected wins | Allowed absolute difference | Pass |',
  '| --- | ---: | ---: | ---: | --- |',
  ...report.pooledTitleSamples.map(pool =>
    `| ${pool.policy} | ${pool.observedWins} | ${pool.expectedWins.toFixed(2)} | ${pool.limit.toFixed(2)} | ${pool.passed ? 'yes' : 'no'} |`),
  '',
  '## Auto title-chance gains in near-peer cases',
  '',
  '| Edition | Actor | Best fixed | Over best fixed | Over myopic | Largest gain over a baseline |',
  '| --- | --- | --- | ---: | ---: | ---: |',
  ...report.nearPeerApproach.map(row =>
    `| ${row.edition} | ${row.actor} | ${row.bestFixed} | ${pp(row.gainOverBestFixed)} | ${pp(row.gainOverMyopic)} | ${pp(row.largestBaselineGain)} |`),
  '',
  '## Reachable useful-call witnesses',
  '',
  'Each witness strictly improves title chance over both alternatives.',
  '',
  '| Call | Edition | Actor | Clash | Energy | Score | Exact title and regular margin | Other calls |',
  '| --- | --- | --- | ---: | ---: | --- | --- | --- |',
  ...report.witnesses.map(({ call, actor, edition, progress, titleProbability, expectedMargin, alternatives }) =>
    `| ${call} | ${edition} | ${actor} | ${progress.clashIndex + 1} | ${progress.playerEnergy} | ${progress.playerScore}–${progress.crewScore} | ${pct(titleProbability)}, ${expectedMargin.toFixed(3)} | ${alternatives.map(other => `${other.call} ${pct(other.titleProbability)}, ${other.expectedMargin.toFixed(3)}`).join(' / ')} |`),
  '',
  '## Margin-only call witnesses',
  '',
  'These choices improve the expected regular score margin when all calls have the same title chance.',
  '',
  '| Call | Edition | Actor | Clash | Energy | Score | Exact title and regular margin | Other calls |',
  '| --- | --- | --- | ---: | ---: | --- | --- | --- |',
  ...report.marginWitnesses.map(({ call, actor, edition, progress, titleProbability, expectedMargin, alternatives }) =>
    `| ${call} | ${edition} | ${actor} | ${progress.clashIndex + 1} | ${progress.playerEnergy} | ${progress.playerScore}–${progress.crewScore} | ${pct(titleProbability)}, ${expectedMargin.toFixed(3)} | ${alternatives.map(other => `${other.call} ${pct(other.titleProbability)}, ${other.expectedMargin.toFixed(3)}`).join(' / ')} |`),
  '',
  '## Generated position groups',
  '',
  'These nominal samples show the event’s physical demands. Group results are descriptive and use each player’s actual challenge abilities.',
  '',
  '| Edition | Position group | Players | Exact Auto title range | Mean |',
  '| --- | --- | ---: | --- | ---: |',
  ...report.generatedGroups.map(row => `| ${row.edition} | ${row.positionGroup} | ${row.players} | ${pct(row.minimum)}–${pct(row.maximum)} | ${pct(row.mean)} |`),
  '',
  '## Actor and policy matrix',
  '',
  'Ratings are strength / speed / stamina / footy IQ. Generated ratings and traits use the production player generator. The JSON retains hidden-stat flags, underlying traits and all policy results.',
  '',
  '| Edition | Actor | Ratings | Exact Auto title | Sample Auto title [95%] | Exact tie | Fatigued before Mick (sample) | Any low-cost call (sample) | Power / Shoot | Angle / Track | Controlled / Wrap | Myopic |',
  '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...report.cases.map(row => {
    const [auto, ...baselines] = row.policies;
    const { strength, speed, stamina, footyIQ } = row.actor.actor.ratings;
    return `| ${row.edition} | ${row.actor.label} | ${strength} / ${speed} / ${stamina} / ${footyIQ} | ${pct(auto.exact.titleProbability)} | ${pct(auto.seeded.titleRate)} [${auto.seeded.confidence95.map(pct).join('–')}] | ${pct(auto.exact.tieProbability)} | ${pct(auto.seeded.fatiguedBeforeMickRate)} | ${pct(auto.seeded.lowCostChoiceRate)} | ${baselines.map(policy => pct(policy.exact.titleProbability)).join(' | ')} |`;
  }),
  '',
  '## Trait uplift in near-peer cases',
  '',
  '| Edition | Actor | Trait | Base title | I uplift | III uplift |',
  '| --- | --- | --- | ---: | ---: | ---: |',
  ...report.traits.filter(row => row.nearPeer).map(row => `| ${row.edition} | ${row.actor} | ${row.trait} | ${pct(row.baseline)} | ${(row.upliftI * 100).toFixed(2)} pp | ${(row.upliftIII * 100).toFixed(2)} pp |`),
  '',
];

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(join(out, 'report.md'), lines.join('\n'));
console.log(lines.slice(0, lines.indexOf('## Reachable useful-call witnesses')).join('\n'));
console.log(`Reports written to ${out}`);
if (!report.correctness.passed || (values['strict-balance'] && report.gates.some(gate => !gate.passed))) process.exitCode = 1;
