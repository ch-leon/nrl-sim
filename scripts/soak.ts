// scripts/soak.ts — headless multi-season soak of the club/league systems.
//
//   npm run soak                         5 seasons × 20 seeds, idle + managed, plus old saves
//   npm run soak -- --seasons 3 --seeds 5
//
// Prints a summary table and every problem found; exits 1 if there were any.
// The checks live in src/qa/soak.ts.
import { runSoak, OLD_VERSIONS, type SoakResult } from '../src/qa/soak';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const seasons = opt('seasons', 5);
const seeds = opt('seeds', 20);

const results: SoakResult[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  for (const mode of ['idle', 'managed'] as const) results.push(runSoak({ seed: seed * 7919, seasons, mode }));
  results.push(runSoak({ seed: seed * 7919, seasons, mode: 'idle', difficulty: 'hard' }));
}
for (const v of OLD_VERSIONS) results.push(runSoak({ seed: 4242 + v, seasons: 2, mode: 'managed', fromVersion: v }));

const pad = (s: string | number, n: number): string => String(s).padStart(n);
console.log(`${pad('seed', 7)} ${pad('mode', 8)} ${pad('from', 4)} ${pad('seasons', 7)} ${pad('money', 9)} ${pad('minMoney', 9)} ${pad('squad', 5)} ${pad('pool', 5)} ${pad('KB', 6)} ${pad('rivals', 7)} ${pad('rep', 4)} ${pad('ms', 6)} problems`);
for (const r of results) {
  const last = r.seasons[r.seasons.length - 1];
  const minMoney = Math.min(...r.seasons.map((s) => s.minMoney));
  console.log([
    pad(r.seed, 7), pad(r.difficulty === 'hard' ? `${r.mode}/H` : r.mode, 8), pad(r.fromVersion ?? '-', 4), pad(r.seasons.length, 7),
    pad(last ? Math.round(last.money) : '-', 9), pad(Number.isFinite(minMoney) ? Math.round(minMoney) : '-', 9),
    pad(last?.squad ?? '-', 5), pad(last?.freeAgents ?? '-', 5), pad(last ? (last.saveBytes / 1024).toFixed(0) : '-', 6),
    pad(last ? `${last.rivalStrength[0]}-${last.rivalStrength[1]}` : '-', 7), pad(last?.reputation ?? '-', 4), pad(r.ms, 6),
    `${r.problems.length}${last?.sacked ? ' (sacked)' : ''}`,
  ].join(' '));
}
const all = results.flatMap((r) => r.problems.map((p) => `seed ${r.seed} ${r.mode}${r.fromVersion !== undefined ? ` from v${r.fromVersion}` : ''}: ${p}`));
console.log(all.length ? `\n${all.length} problems:\n${all.join('\n')}` : '\nNo problems.');
process.exit(all.length ? 1 : 0);
