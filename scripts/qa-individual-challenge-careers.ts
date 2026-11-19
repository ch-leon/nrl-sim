import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CHALLENGE_CAREER_QA_CASES, runIndividualChallengeCareerQA,
  type ChallengeCareerQACase, type ChallengeCareerQASource } from '../src/qa/individualChallengeCareers';
import v33 from '../tests/fixtures/saves/v33-assignments/manifest.json';
import v34 from '../tests/fixtures/saves/v34-challenges/manifest.json';

const { values } = parseArgs({ options: {
  pack: { type: 'string' }, edition: { type: 'string' }, difficulty: { type: 'string' },
  role: { type: 'string' }, mode: { type: 'string' }, coaching: { type: 'string' },
  out: { type: 'string', default: 'e2e-output/individual-challenge-careers' },
} });

function validate<T extends string>(option: string, value: string | undefined, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined;
  const selected = allowed.find(item => item === value);
  if (selected === undefined) throw new Error(`--${option} must be ${allowed.join(', ')}`);
  return selected;
}

const filters = {
  pack: validate('pack', values.pack, ['au', 'uk']),
  edition: validate('edition', values.edition, ['showground', 'invitational']),
  difficulty: validate('difficulty', values.difficulty, ['easy', 'normal', 'hard']),
  role: validate('role', values.role, ['starter', 'bench', 'reserve']),
  mode: validate('mode', values.mode, ['auto', 'manual']),
  coaching: validate('coaching', values.coaching, ['manual', 'auto', 'finish']),
} as const;
const cases = CHALLENGE_CAREER_QA_CASES.filter(scenario =>
  Object.entries(filters).every(([key, value]) => value === undefined || scenario[key as keyof typeof filters] === value));
if (!cases.length) throw new Error('No representative QA case matches these filters.');

function sourceFor({ pack, camp }: ChallengeCareerQACase): ChallengeCareerQASource {
  const manifest = camp ? v33 : v34;
  const folder = camp ? 'v33-assignments' : 'v34-challenges';
  const boundary = manifest.regions[pack].boundaries[0]!;
  const { slot } = boundary;
  const bytes = readFileSync(new URL(`../tests/fixtures/saves/${folder}/${slot.filename}`, import.meta.url));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== slot.sha256 || bytes.length !== slot.bytes) throw new Error(`source capture changed: ${slot.filename}`);
  return { text: bytes.toString('utf8'), filename: slot.filename, sha256,
    commit: manifest.source_commit, version: manifest.saved_format, week: boundary.week,
    careerSeed: manifest.career_seed, rngSeed: boundary.rng_state };
}

const results = [];
for (const scenario of cases) {
  const result = await runIndividualChallengeCareerQA({ ...scenario, source: sourceFor(scenario) });
  results.push(result);
  const label = `${result.pack}/${result.edition}/${result.difficulty}/${result.role}/${result.mode}/${result.coaching}`;
  if (result.problems.length) console.error(`${label} ${result.problems.join(' | ')}`);
  else console.log(`${label} ${result.player!.name} ${result.contest!.progress.result}, ${result.event!.development.effectiveXp} event XP vs ${result.stay!.development.effectiveXp} stay XP, ${result.award!.cash} club prize (${result.ms} ms)`);
}
mkdirSync(values.out!, { recursive: true });
const report = join(values.out!, 'report.json');
writeFileSync(report, JSON.stringify(results, null, 2) + '\n');
const failed = results.filter(result => result.problems.length).length;
console.log(`${results.length - failed}/${results.length} pairs passed. Report in ${report}`);
if (failed) process.exitCode = 1;
