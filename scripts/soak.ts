// scripts/soak.ts — headless multi-season soak of the club/league systems.
//
//   npm run soak                         5 seasons × 20 seeds, idle + managed + idle Hard, plus old saves
//   npm run soak -- --seasons 3 --seeds 5
//   npm run soak -- --difficulties easy,normal,hard   idle + managed on each difficulty (#148)
//   npm run soak -- --managed-only --difficulties easy,normal,hard   managed career guardrails
//   npm run soak -- --json out.json      also write every run's samples to a file
//   npm run soak -- --jobs 4             split the runs over 4 processes (same results, in order)
//   npm run soak -- --live-rivals        rival rounds on the live sim too (N9.2's setting; several times slower),
//                                        each style's score against its strength (#249), and at a level
//                                        rating the wins ÷ games and the break-rule switches (N14.2)
//   npm run soak -- --tune pace.extraPerStat=0.045   a match knob overridden by name for the whole run, as the
//                                        balance harness names it (repeatable; #322)
//
// Since the switch-over to the live match sim (BAK-207 Phase 4) every match the
// player's club plays is a whole live match, about 15 s a season headless, so the
// default size is over an hour on one core: use --jobs, or a smaller size.
//
// Prints one row per run, then the per-season averages by mode (the player's
// record, ladder finish, the rating gap between the player's best nine and the
// rival mean, and the managed manager's signings — GitHub #138; finals
// appearances and the win rate against the three nearest-rated rivals — N12.1),
// then every problem found; exits 1 if there were any. The checks live in
// src/qa/soak.ts.
//
// --live-rivals (N12.1) turns on "Rival matches on the match engine" for the
// fresh-game runs. The game plays those only in a week that is not
// fast-forwarded, so the runs advance a week at a time like a player tapping
// Advance Week, and in Node (no Worker) each round's seven matches play in place.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { levelWinRates, offTheLevelMean, runSoak, styleTable, summariseSeasons, tallyNet, LEVEL_OFF_MEAN, OLD_VERSIONS, STYLE_GAP_BAND, type FinanceLine, type SoakOptions, type SoakResult } from '../src/qa/soak';
import { DIFFICULTIES, type Difficulty } from '../src/config';
import { applyTuning } from '../src/match/league/tuning';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const seasons = opt('seasons', 5);
const seeds = opt('seeds', 20);
const str = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const jsonOut = str('json');
// Without --difficulties: idle and managed on Normal plus idle on Hard (the original soak).
const difficulties = str('difficulties')?.split(',').filter((d): d is Difficulty => DIFFICULTIES.includes(d as Difficulty));
const liveRivals = args.includes('--live-rivals');
// Match knobs by name (#322): set in this process and passed to every --jobs child, so a
// candidate value can be soaked before its default moves. Never on in the game.
const tuneArgs = args.flatMap((a, i) => (a === '--tune' && args[i + 1] ? ['--tune', args[i + 1]!] : []));
const tuning = Object.fromEntries(tuneArgs.filter((_, i) => i % 2 === 1).map((kv) => {
  const [key, value] = kv.split('=');
  return [key!, Number(value)];
}));
applyTuning(tuning);
const modes = args.includes('--managed-only') ? ['managed'] as const : ['idle', 'managed'] as const;

// Child of a --jobs run: play the runs in the given file, write the results, stop.
const childIn = str('child');
if (childIn) {
  const out = str('out')!;
  const specs = JSON.parse(readFileSync(childIn, 'utf8')) as SoakOptions[];
  writeFileSync(out, JSON.stringify(specs.map((o) => runSoak(o))));
  process.exit(0);
}

// Every run, in the order they print. --live-rivals is for the fresh games; the old saves stay a save check.
const live = liveRivals ? { liveRivals: true } : {};
const specs: SoakOptions[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  if (difficulties) {
    for (const difficulty of difficulties) {
      for (const mode of modes) specs.push({ seed: seed * 7919, seasons, mode, difficulty, ...live });
    }
  } else {
    for (const mode of modes) specs.push({ seed: seed * 7919, seasons, mode, ...live });
    if (!args.includes('--managed-only')) specs.push({ seed: seed * 7919, seasons, mode: 'idle', difficulty: 'hard', ...live });
  }
}
for (const v of OLD_VERSIONS) specs.push({ seed: 4242 + v, seasons: 2, mode: 'managed', fromVersion: v });

/** Play the runs over `jobs` child processes (round-robin), and return the results in run order. */
async function runInJobs(all: SoakOptions[], jobs: number): Promise<SoakResult[]> {
  const dir = mkdtempSync(join(tmpdir(), 'soak-'));
  try {
    const chunks = Array.from({ length: jobs }, (_, j) => all.map((o, i) => ({ o, i })).filter(({ i }) => i % jobs === j));
    const outs = await Promise.all(chunks.map((chunk, j) => new Promise<{ i: number; r: SoakResult }[]>((resolve, reject) => {
      const inFile = join(dir, `in-${j}.json`);
      const outFile = join(dir, `out-${j}.json`);
      writeFileSync(inFile, JSON.stringify(chunk.map(({ o }) => o)));
      const child = spawn('npx', ['vite-node', 'scripts/soak.ts', '--', '--child', inFile, '--out', outFile, ...tuneArgs], { stdio: ['ignore', 'ignore', 'inherit'] });
      child.on('exit', (code) => {
        if (code !== 0) return reject(new Error(`soak job ${j + 1} exited ${code}`));
        const rs = JSON.parse(readFileSync(outFile, 'utf8')) as SoakResult[];
        resolve(rs.map((r, k) => ({ i: chunk[k]!.i, r })));
      });
    })));
    return outs.flat().sort((a, b) => a.i - b.i).map(({ r }) => r);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const jobs = Math.max(1, Math.min(opt('jobs', 1), specs.length));
const results: SoakResult[] = jobs > 1 ? await runInJobs(specs, jobs) : specs.map((o) => runSoak(o));

const pad = (s: string | number, n: number): string => String(s).padStart(n);
const signed = (n: number, digits = 1): string => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
const k = (n: number): string => `$${Math.round(n / 1000)}k`;
const modeLabel = (r: { mode: string; difficulty?: string }): string =>
  r.difficulty && r.difficulty !== 'normal' ? `${r.mode}/${r.difficulty[0]!.toUpperCase()}` : r.mode;

const pct = (n: number): string => `${Math.round(n * 100)}%`;

// One row per run; the record, finish, gap and signings columns are the last season's;
// fin (finals appearances of seasons played) and near (wins ÷ games against the
// three nearest-rated rivals, games in brackets) are the whole run's (N12.1), and so is
// forf (rounds forfeited short of 13 fit, finding 20).
if (liveRivals) console.log('Rival rounds on the live sim (--live-rivals) in the fresh-game runs.');
if (tuneArgs.length) console.log(`Match knobs overridden (--tune): ${Object.entries(tuning).map(([key, v]) => `${key} = ${v}`).join(', ')}.`);
console.log(`${pad('seed', 7)} ${pad('mode', 9)} ${pad('from', 4)} ${pad('seasons', 7)} ${pad('money', 9)} ${pad('minMoney', 9)} ${pad('squad', 5)} ${pad('pool', 5)} ${pad('KB', 6)} ${pad('rivals', 7)} ${pad('rep', 4)} ${pad('record', 8)} ${pad('margin', 6)} ${pad('pos', 3)} ${pad('forf', 4)} ${pad('fin', 4)} ${pad('near', 9)} ${pad('nine', 5)} ${pad('rmean', 5)} ${pad('gap', 5)} ${pad('signed', 12)} ${pad('ms', 6)} problems`);
for (const r of results) {
  const last = r.seasons[r.seasons.length - 1];
  const minMoney = Math.min(...r.seasons.map((s) => s.minMoney));
  const nearGames = r.seasons.reduce((t, s) => t + s.nearRivalGames, 0);
  const nearWins = r.seasons.reduce((t, s) => t + Math.round(s.nearRivalWinRate * s.nearRivalGames), 0);
  console.log([
    pad(r.seed, 7), pad(modeLabel(r), 9), pad(r.fromVersion ?? '-', 4), pad(r.seasons.length, 7),
    pad(last ? Math.round(last.money) : '-', 9), pad(Number.isFinite(minMoney) ? Math.round(minMoney) : '-', 9),
    pad(last?.squad ?? '-', 5), pad(last?.freeAgents ?? '-', 5), pad(last ? (last.saveBytes / 1024).toFixed(0) : '-', 6),
    pad(last ? `${last.rivalStrength[0]}-${last.rivalStrength[1]}` : '-', 7), pad(last?.reputation ?? '-', 4),
    pad(last ? `${last.wins}-${last.draws}-${last.losses}` : '-', 8), pad(last ? signed(last.marginPerGame) : '-', 6),
    pad(last?.ladderPosition ?? '-', 3), pad(r.seasons.reduce((t, s) => t + s.forfeits, 0), 4),
    pad(last ? `${r.seasons.filter((s) => s.madeFinals).length}/${r.seasons.length}` : '-', 4),
    pad(nearGames ? `${pct(nearWins / nearGames)} (${nearGames})` : '-', 9),
    pad(last ? last.bestNine.toFixed(1) : '-', 5), pad(last ? last.rivalMean.toFixed(1) : '-', 5),
    pad(last ? signed(last.bestNine - last.rivalMean) : '-', 5),
    pad(last ? (last.signings ? `${last.signings}×${last.signedOverall.toFixed(0)} ${k(last.signingFees)}` : '-') : '-', 12),
    pad(r.ms, 6),
    `${r.problems.length}${last?.sacked ? ' (sacked)' : ''}`,
  ].join(' '));
}

// Per-season averages over the seeds, by mode: the baseline for the parity work.
const summary = summariseSeasons(results);
if (summary.length) {
  console.log(`\nPer season, averaged over ${seeds} seeds of the fresh-game runs (record, margin a game, ladder finish, share in the top eight / premiers / sacked, rounds forfeited, finals appearances per run so far, the win rate against the three nearest-rated rivals (games in brackets), the player's best nine v the rival mean, rival range, money, managed signings${liveRivals ? ', distinct attack/defence styles' : ''}). Start gap = best nine − rival mean at week 1.`);
  console.log(`${pad('mode', 9)} ${pad('season', 6)} ${pad('runs', 4)} ${pad('record', 14)} ${pad('margin', 6)} ${pad('pos', 4)} ${pad('top8', 4)} ${pad('prem', 4)} ${pad('sack', 4)} ${pad('forf', 4)} ${pad('fin', 4)} ${pad('near', 10)} ${pad('nine', 5)} ${pad('rmean', 5)} ${pad('gap', 5)} ${pad('range', 7)} ${pad('money', 7)} ${pad('signings', 18)} ${pad('start', 5)}${liveRivals ? ` ${pad('styles', 7)}` : ''}`);
  for (const s of summary) {
    console.log([
      pad(modeLabel(s), 9), pad(s.season, 6), pad(s.runs, 4),
      pad(`${s.wins.toFixed(1)}-${s.draws.toFixed(1)}-${s.losses.toFixed(1)}`, 14), pad(signed(s.marginPerGame), 6), pad(s.ladderPosition.toFixed(1), 4),
      pad(pct(s.finals), 4), pad(pct(s.premierships), 4), pad(pct(s.sacked), 4), pad(s.forfeits.toFixed(1), 4),
      pad(s.finalsAppearances.toFixed(1), 4), pad(s.nearRivalGames ? `${pct(s.nearRivalWinRate)} (${s.nearRivalGames})` : '-', 10),
      pad(s.bestNine.toFixed(1), 5), pad(s.rivalMean.toFixed(1), 5), pad(signed(s.gap), 5), pad(`${s.rivalRange[0]}-${s.rivalRange[1]}`, 7),
      pad(k(s.money), 7), pad(s.signings ? `${s.signings.toFixed(1)} at ${s.signedOverall.toFixed(0)} ovr, ${k(s.signingFees)}` : '-', 18),
      pad(signed(s.startGap), 5),
      ...(liveRivals ? [pad(`${s.attackStyles.toFixed(1)}/${s.defenceStyles.toFixed(1)}`, 7)] : []),
    ].join(' '));
  }
}

// The season P&L by mode (N6, #161): where the money came from and went.
if (summary.length) {
  const ks = (n: number): string => (Math.abs(n) < 500 ? '0' : `${n < 0 ? '-' : '+'}${Math.round(Math.abs(n) / 1000)}k`);
  const cols: readonly [FinanceLine, string][] = [
    ['wages', 'wages'], ['upkeep', 'upkeep'], ['overhead', 'overhead'], ['sponsor', 'sponsor'], ['grant', 'grant'], ['gate', 'gates'], ['prize', 'prize'], ['boardGrant', 'board'],
    ['events', 'events'], ['transfers', 'transfers'], ['contracts', 'contracts'], ['facilities', 'facilities'], ['other', 'other'],
  ];
  console.log(`\nSeason P&L, averaged over ${seeds} seeds ($k a season; negative = spent). sponsor = Sponsor Board, grant = the reputation grant, board = objective grants, transfers = signing fees and sales, contracts = renewals and releases, facilities = build / upgrade / move / demolish. Net = Σ lines; money = the balance at the rollover.`);
  console.log(`${pad('mode', 9)} ${pad('season', 6)} ${cols.map(([, h]) => pad(h, 10)).join(' ')} ${pad('net', 7)} ${pad('money', 7)}`);
  for (const s of summary) {
    console.log([
      pad(modeLabel(s), 9), pad(s.season, 6),
      ...cols.map(([l]) => pad(ks(s.finance[l]), 10)),
      pad(ks(tallyNet(s.finance)), 7), pad(k(s.money), 7),
    ].join(' '));
  }
}

// Rival styles over the seasons (#249, N11): every rival-v-rival game on the live sim, each
// style's score (a win 1, a draw ½) against what its strength gaps alone predict.
if (liveRivals) {
  const games = results.flatMap((r) => r.styleGames ?? []);
  const switches = games.reduce((t, g) => t + g.switches, 0);
  console.log(`\nRival styles in ${games.length} rival-v-rival games on the live sim (#249, N14.2).`);
  console.log(`Break-rule switches: ${switches} in ${games.length} games (${games.length ? (switches / games.length).toFixed(2) : '0'} a match).`);
  const mix = (key: 'attack' | 'defence'): string => {
    const rows = styleTable(games, key);
    const total = rows.reduce((t, r) => t + r.games, 0);
    return rows.map((r) => `${r.style} ${total ? Math.round((r.games / total) * 100) : 0}%`).join(', ');
  };
  console.log(`Attack mix: ${mix('attack') || '-'}`);
  console.log(`Defence mix: ${mix('defence') || '-'}`);
  console.log(`\nWins ÷ games at a level rating (clubs within ${STYLE_GAP_BAND} points as the week began). A draw is half a win. ! = more than ${LEVEL_OFF_MEAN * 100} points from even; logged for N13, not tuned here.`);
  for (const key of ['attack', 'defence'] as const) {
    console.log(`${pad(key, 11)} ${pad('games', 6)} ${pad('score', 6)} ${pad('off', 6)}`);
    const rows = levelWinRates(games, key);
    for (const row of rows) {
      const off = (row.score - 0.5) * 100;
      console.log([pad(row.style, 11), pad(row.games, 6), pad(pct(row.score), 6), pad(`${signed(off, 1)}${Math.abs(off) > LEVEL_OFF_MEAN * 100 ? '!' : ''}`, 6)].join(' '));
    }
    const logged = offTheLevelMean(rows);
    console.log(logged.length
      ? `Logged for N13 (${key}, level rating): ${logged.map((r) => `${r.style} ${pct(r.score)} over ${r.games} sides (${signed((r.score - 0.5) * 100)} pts)`).join('; ')}.`
      : `Logged for N13 (${key}, level rating): none more than 4 points from even.`);
  }
  console.log(`\nAgainst strength, every game (#249): each side's score against the score its strength gap predicts (the mean of every side with the same gap, in 2-point bands). * = beyond two standard errors. A difference over 4 points is logged for N13 too.`);
  for (const key of ['attack', 'defence'] as const) {
    console.log(`${pad(key, 11)} ${pad('games', 6)} ${pad('score', 6)} ${pad('expect', 6)} ${pad('diff', 6)} ${pad('se', 5)}`);
    const rows = styleTable(games, key);
    const wide: string[] = [];
    for (const row of rows) {
      const d = row.score - row.expected;
      console.log([pad(row.style, 11), pad(row.games, 6), pad(pct(row.score), 6), pad(pct(row.expected), 6), pad(`${signed(d * 100)}${Math.abs(d) > 2 * row.se ? '*' : ''}`, 6), pad((row.se * 100).toFixed(1), 5)].join(' '));
      if (Math.abs(d) > LEVEL_OFF_MEAN) wide.push(`${row.style} ${signed(d * 100)} over ${row.games} sides`);
    }
    console.log(wide.length
      ? `Logged for N13 (${key}, against strength): ${wide.join('; ')}.`
      : `Logged for N13 (${key}, against strength): none more than 4 points from the strength-adjusted mean.`);
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ seasons, seeds, liveRivals, results, summary }, null, 1));
  console.log(`\nWrote ${jsonOut}`);
}

// Forfeits are the game working as written (a club short of 13 fit forfeits), not a problem;
// but a run that forfeits whole seasons says the manager can't keep a squad (finding 20).
// Every run counts here, the old-save ones too; the per-season `forf` above is fresh games only.
const forfeiting = results.filter((r) => r.seasons.some((s) => s.forfeits > 0));
if (forfeiting.length) {
  const by = new Map<string, number>();
  for (const r of forfeiting) {
    const label = r.fromVersion !== undefined ? 'old saves' : modeLabel(r);
    by.set(label, (by.get(label) ?? 0) + 1);
  }
  const whole = results.filter((r) => r.seasons.some((s) => s.forfeits > 0 && s.forfeits >= s.wins + s.draws + s.losses)).length;
  console.log(`\nForfeits: ${forfeiting.length} of ${results.length} runs forfeited rounds (${[...by].map(([m, n]) => `${m} ${n}`).join(', ')}); ${whole} forfeited a whole season.`);
} else console.log(`\nForfeits: none in ${results.length} runs.`);

const all = results.flatMap((r) => r.problems.map((p) => `seed ${r.seed} ${r.mode}${r.fromVersion !== undefined ? ` from v${r.fromVersion}` : ''}: ${p}`));
console.log(all.length ? `\n${all.length} problems:\n${all.join('\n')}` : '\nNo problems.');
process.exit(all.length ? 1 : 0);
