// scripts/soak.ts — headless multi-season soak of the club/league systems.
//
//   npm run soak                         5 seasons × 20 seeds, idle + managed + idle Hard, plus old saves
//   npm run soak -- --seasons 3 --seeds 5
//   npm run soak -- --json out.json      also write every run's samples to a file
//
// Prints one row per run, then the per-season averages by mode (the player's
// record, ladder finish, the rating gap between the player's best nine and the
// rival mean, and the managed manager's signings — GitHub #138), then every
// problem found; exits 1 if there were any. The checks live in src/qa/soak.ts.
import { writeFileSync } from 'node:fs';
import { runSoak, summariseSeasons, OLD_VERSIONS, type SoakResult } from '../src/qa/soak';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const seasons = opt('seasons', 5);
const seeds = opt('seeds', 20);
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : undefined;

const results: SoakResult[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  for (const mode of ['idle', 'managed'] as const) results.push(runSoak({ seed: seed * 7919, seasons, mode }));
  results.push(runSoak({ seed: seed * 7919, seasons, mode: 'idle', difficulty: 'hard' }));
}
for (const v of OLD_VERSIONS) results.push(runSoak({ seed: 4242 + v, seasons: 2, mode: 'managed', fromVersion: v }));

const pad = (s: string | number, n: number): string => String(s).padStart(n);
const signed = (n: number, digits = 1): string => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
const k = (n: number): string => `$${Math.round(n / 1000)}k`;
const modeLabel = (r: { mode: string; difficulty?: string }): string =>
  r.difficulty && r.difficulty !== 'normal' ? `${r.mode}/${r.difficulty[0]!.toUpperCase()}` : r.mode;

// One row per run; the record, finish, gap and signings columns are the last season's.
console.log(`${pad('seed', 7)} ${pad('mode', 9)} ${pad('from', 4)} ${pad('seasons', 7)} ${pad('money', 9)} ${pad('minMoney', 9)} ${pad('squad', 5)} ${pad('pool', 5)} ${pad('KB', 6)} ${pad('rivals', 7)} ${pad('rep', 4)} ${pad('record', 8)} ${pad('margin', 6)} ${pad('pos', 3)} ${pad('nine', 5)} ${pad('rmean', 5)} ${pad('gap', 5)} ${pad('signed', 12)} ${pad('ms', 6)} problems`);
for (const r of results) {
  const last = r.seasons[r.seasons.length - 1];
  const minMoney = Math.min(...r.seasons.map((s) => s.minMoney));
  console.log([
    pad(r.seed, 7), pad(modeLabel(r), 9), pad(r.fromVersion ?? '-', 4), pad(r.seasons.length, 7),
    pad(last ? Math.round(last.money) : '-', 9), pad(Number.isFinite(minMoney) ? Math.round(minMoney) : '-', 9),
    pad(last?.squad ?? '-', 5), pad(last?.freeAgents ?? '-', 5), pad(last ? (last.saveBytes / 1024).toFixed(0) : '-', 6),
    pad(last ? `${last.rivalStrength[0]}-${last.rivalStrength[1]}` : '-', 7), pad(last?.reputation ?? '-', 4),
    pad(last ? `${last.wins}-${last.draws}-${last.losses}` : '-', 8), pad(last ? signed(last.marginPerGame) : '-', 6),
    pad(last?.ladderPosition ?? '-', 3), pad(last ? last.bestNine.toFixed(1) : '-', 5), pad(last ? last.rivalMean.toFixed(1) : '-', 5),
    pad(last ? signed(last.bestNine - last.rivalMean) : '-', 5),
    pad(last ? (last.signings ? `${last.signings}×${last.signedOverall.toFixed(0)} ${k(last.signingFees)}` : '-') : '-', 12),
    pad(r.ms, 6),
    `${r.problems.length}${last?.sacked ? ' (sacked)' : ''}`,
  ].join(' '));
}

// Per-season averages over the seeds, by mode: the baseline for the parity work.
const summary = summariseSeasons(results);
if (summary.length) {
  console.log(`\nPer season, averaged over ${seeds} seeds (record, margin a game, ladder finish, share in the top eight / premiers / sacked, the player's best nine v the rival mean, rival range, money, managed signings). Start gap = best nine − rival mean at week 1.`);
  console.log(`${pad('mode', 9)} ${pad('season', 6)} ${pad('runs', 4)} ${pad('record', 14)} ${pad('margin', 6)} ${pad('pos', 4)} ${pad('top8', 4)} ${pad('prem', 4)} ${pad('sack', 4)} ${pad('nine', 5)} ${pad('rmean', 5)} ${pad('gap', 5)} ${pad('range', 7)} ${pad('money', 7)} ${pad('signings', 18)} ${pad('start', 5)}`);
  for (const s of summary) {
    console.log([
      pad(modeLabel(s), 9), pad(s.season, 6), pad(s.runs, 4),
      pad(`${s.wins.toFixed(1)}-${s.draws.toFixed(1)}-${s.losses.toFixed(1)}`, 14), pad(signed(s.marginPerGame), 6), pad(s.ladderPosition.toFixed(1), 4),
      pad(`${Math.round(s.finals * 100)}%`, 4), pad(`${Math.round(s.premierships * 100)}%`, 4), pad(`${Math.round(s.sacked * 100)}%`, 4),
      pad(s.bestNine.toFixed(1), 5), pad(s.rivalMean.toFixed(1), 5), pad(signed(s.gap), 5), pad(`${s.rivalRange[0]}-${s.rivalRange[1]}`, 7),
      pad(k(s.money), 7), pad(s.signings ? `${s.signings.toFixed(1)} at ${s.signedOverall.toFixed(0)} ovr, ${k(s.signingFees)}` : '-', 18),
      pad(signed(s.startGap), 5),
    ].join(' '));
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ seasons, seeds, results, summary }, null, 1));
  console.log(`\nWrote ${jsonOut}`);
}

const all = results.flatMap((r) => r.problems.map((p) => `seed ${r.seed} ${r.mode}${r.fromVersion !== undefined ? ` from v${r.fromVersion}` : ''}: ${p}`));
console.log(all.length ? `\n${all.length} problems:\n${all.join('\n')}` : '\nNo problems.');
process.exit(all.length ? 1 : 0);
