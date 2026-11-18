// Repeatable production evidence, using the same registered QA systems as soak.
// npx vite-node scripts/qa-league-career.ts [--pack au|uk] [--seed 573] [--seasons 2]
import './primeField';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateLeagueCareerUIFixtures, runLeagueCareerQA } from '../src/qa/leagueCareer';
const args = process.argv.slice(2);
const option = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1]! : fallback;
const packs = option('--pack', 'au,uk').split(',');
if (packs.some(pack => pack !== 'au' && pack !== 'uk')) throw new Error('--pack must be au or uk');
const seed = Number(option('--seed', '573'));
const seasons = Number(option('--seasons', '2'));
const out = option('--out', 'e2e-output/league-career');
mkdirSync(out, { recursive: true });
const results = [];
for (const pack of packs as Array<'au' | 'uk'>) {
  const runner = args.includes('--controlled-only') ? generateLeagueCareerUIFixtures : runLeagueCareerQA;
  const result = await runner({ pack, seed, seasons,
    snapshot: (name, state) => writeFileSync(join(out, `${pack}-${name}.json`), JSON.stringify(state)) });
  results.push(result);
  console.log(JSON.stringify(result, null, 2));
}
writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
if (results.some(result => result.problems.length)) process.exitCode = 1;
