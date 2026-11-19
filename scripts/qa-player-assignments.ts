// npx vite-node scripts/qa-player-assignments.ts [--pack au|uk] [--difficulty easy|normal|hard]
//   [--role starter|bench|reserve] [--mode auto|saved-manual|qa-manual] [--out e2e-output/player-assignments]
import './primeField';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { runPlayerAssignmentQA, type AssignmentQAOptions } from '../src/qa/playerAssignments';
import manifest from '../tests/fixtures/saves/v33-assignments/manifest.json';

const { values } = parseArgs({ options: {
  pack: { type: 'string' }, difficulty: { type: 'string' }, role: { type: 'string' }, mode: { type: 'string' },
  out: { type: 'string', default: 'e2e-output/player-assignments' },
} });
function selected<T extends string>(name: string, value: string | undefined, choices: readonly T[]): readonly T[] {
  if (value === undefined) return choices;
  const match = choices.find(option => option === value);
  if (match === undefined) throw new Error(`--${name} must be ${choices.join(', ')}`);
  return [match];
}
const packs = selected('pack', values.pack, ['au', 'uk'] as const);
const difficulties = selected('difficulty', values.difficulty, ['easy', 'normal', 'hard'] as const);
const roles = selected('role', values.role, ['starter', 'bench', 'reserve'] as const);
const mode = selected('mode', values.mode, ['auto', 'saved-manual', 'qa-manual'] as const)[0]!;
const pairs = packs.flatMap(pack => difficulties.flatMap(difficulty => roles.map(role => ({ pack, difficulty, role, mode }))));
if (!values.mode) {
  const manualChecks = [
    { pack: 'uk', difficulty: 'normal', role: 'starter', mode: 'saved-manual' },
    { pack: 'au', difficulty: 'easy', role: 'bench', mode: 'qa-manual' },
  ] as const;
  pairs.push(...manualChecks.filter(pair => packs.includes(pair.pack) && difficulties.includes(pair.difficulty) && roles.includes(pair.role)));
}

function sourceFor(pack: AssignmentQAOptions['pack']): AssignmentQAOptions['source'] {
  const boundary = manifest.regions[pack].boundaries.find(item => item.week === 4);
  if (!boundary) throw new Error(`missing immutable Week 4 capture for ${pack}`);
  const { slot, rng_state: rngSeed } = boundary;
  const original = readFileSync(new URL(`../tests/fixtures/saves/v33-assignments/${slot.filename}`, import.meta.url));
  const sha256 = createHash('sha256').update(original).digest('hex');
  if (sha256 !== slot.sha256 || original.length !== slot.bytes) throw new Error(`source capture changed: ${slot.filename}`);
  return { text: original.toString('utf8'), filename: slot.filename, sha256, rngSeed,
    commit: manifest.source_commit, careerSeed: manifest.career_seed };
}

const sources = new Map(packs.map(pack => [pack, sourceFor(pack)]));
const results = [];
for (const pair of pairs) results.push(await runPlayerAssignmentQA({ ...pair, source: sources.get(pair.pack)! }));
mkdirSync(values.out!, { recursive: true });
writeFileSync(join(values.out!, 'report.json'), JSON.stringify(results, null, 2) + '\n');
for (const result of results) {
  const label = `${result.pack}/${result.difficulty}/${result.role}/${result.mode}`;
  if (result.problems.length) console.error(`${label} ${result.problems.join(' | ')}`);
  else console.log(`${label} ${result.player!.name}: ${result.camp!.development.effectiveXp} camp XP, ${result.decline!.development.effectiveXp} decline XP`);
}
const failed = results.filter(result => result.problems.length).length;
console.log(`${results.length - failed}/${results.length} pairs passed. Report in ${join(values.out!, 'report.json')}`);
if (failed) process.exitCode = 1;
