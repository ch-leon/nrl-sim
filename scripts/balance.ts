// scripts/balance.ts — run a balance experiment (balance/README.md).
//
//   npm run balance -- --plan balance/plans/standard.json
//   npm run balance -- --plan balance/plans/sweep-example.json --seeds 40
//   npm run balance -- --resume balance/runs/20261018-0412-grip-sweep
//   npm run balance -- --plan big.json --jobs 4   split across 4 processes (one per core)
//   npm run balance -- --list            every knob and its current value
//   npm run balance -- --check --plan …  validate a plan without running it
//
// Each finished cell is appended to <run>/results*.jsonl at once, so a run that
// is stopped keeps what it did and --resume carries on from there (with or
// without --jobs). The report
// (<run>/report.md) is rewritten after every cell. Run with vite-node so it
// imports the sim's TypeScript directly.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { cellKey, cellsOf, checkPlan, type Plan } from '../src/match/balance/plan';
import { measureCell, type CellResult } from '../src/match/balance/measure';
import { reportMarkdown } from '../src/match/balance/report';
import { listKnobs } from '../src/match/league/tuning';

const args = process.argv.slice(2).filter((a) => a !== '--');
const flag = (name: string): boolean => args.includes(`--${name}`);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const die = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

if (flag('list')) {
  for (const k of listKnobs()) console.log(`${k.path} = ${k.value}`);
  process.exit(0);
}

const resume = opt('resume');
/** A worker started by --jobs: "i/N" runs every Nth remaining cell from i. */
const shard = opt('shard');
const jobs = Math.max(1, Number(opt('jobs') ?? 1) || 1);
const planPath = resume ? join(resume, 'plan.json') : opt('plan');
if (!planPath) die('Usage: npm run balance -- --plan <file.json> | --resume <run dir> | --list');
if (!existsSync(planPath!)) die(`No such plan: ${planPath}`);
const plan: Plan = JSON.parse(readFileSync(planPath!, 'utf8'));
if (!resume) {
  if (opt('seeds')) plan.seeds = Number(opt('seeds'));
  if (opt('minutes')) plan.minutes = Number(opt('minutes'));
}
const errs = checkPlan(plan);
if (errs.length) die(`Plan has problems:\n  ${errs.join('\n  ')}`);
const cells = cellsOf(plan);
if (flag('check')) {
  console.log(`OK: ${cells.length} cells (${cells.length / plan.scenarios.length} variants × ${plan.scenarios.length} scenarios) × ${plan.seeds} seeds × ${plan.minutes ? `${plan.minutes} min` : 'whole matches'}`);
  process.exit(0);
}

const git = (cmd: string): string => {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '?';
  }
};
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** A fresh run never lands in an existing folder (that would silently reuse its results): add -2, -3… if it must. */
const freshDir = (base: string): string => {
  let d = base;
  for (let i = 2; existsSync(d); i++) d = `${base}-${i}`;
  return d;
};
const dir = resume ?? freshDir(join(opt('out') ?? 'balance/runs', `${stamp}-${slug}`));
mkdirSync(dir, { recursive: true });
const shardIdx = shard ? Number(shard.split('/')[0]) : -1;
const shardN = shard ? Number(shard.split('/')[1]) : 1;
const resultsPath = join(dir, shard ? `results.shard-${shardIdx}.jsonl` : 'results.jsonl');
const metaPath = join(dir, 'meta.json');
if (!resume) {
  writeFileSync(join(dir, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  const dirty = git('status --porcelain -- src') ? ' (uncommitted changes)' : '';
  writeFileSync(metaPath, `${JSON.stringify({ commit: `${git('rev-parse --short HEAD')}${dirty}`, branch: git('rev-parse --abbrev-ref HEAD'), started: new Date().toISOString() }, null, 2)}\n`);
}
const meta: Record<string, string> = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
const readFile = (p: string): CellResult[] => (existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as CellResult) : []);
/** A run's results: results.jsonl plus any workers' shard files, in plan order. */
const order = new Map(cells.map((c, i) => [cellKey(c), i]));
const keyOf = (r: CellResult): string => cellKey({ variant: { name: r.variant }, scenario: { name: r.scenario } });
const readRun = (d: string): CellResult[] =>
  existsSync(d) ? readdirSync(d).filter((f) => /^results(\.shard-\d+)?\.jsonl$/.test(f)).flatMap((f) => readFile(join(d, f))) : [];
const sorted = (rs: CellResult[]): CellResult[] => rs.sort((a, b) => (order.get(keyOf(a)) ?? 1e9) - (order.get(keyOf(b)) ?? 1e9));
const results = sorted(readRun(dir));
const prevArg = opt('previous');
const previous = prevArg ? (prevArg.endsWith('.jsonl') ? readFile(prevArg) : readRun(prevArg)) : undefined;
const writeReport = (): void => writeFileSync(join(dir, 'report.md'), reportMarkdown({ plan, meta, results: sorted(results), ...(previous ? { previous } : {}) }));

const done = new Set(results.map(keyOf));
const todo = cells.filter((c) => !done.has(cellKey(c))).filter((_, i) => !shard || i % shardN === shardIdx);

if (jobs > 1 && !shard) {
  // Fan out: one worker per job on the same run directory, then one report.
  console.log(`${plan.name}: ${cells.length} cells, ${todo.length} to run on ${jobs} workers → ${dir}`);
  const bin = join('node_modules', '.bin', 'vite-node');
  const workers = Array.from({ length: jobs }, (_, i) =>
    new Promise<number>((res) => spawn(bin, ['scripts/balance.ts', '--', '--resume', dir, '--shard', `${i}/${jobs}`], { stdio: 'inherit' }).on('exit', (code) => res(code ?? 1))),
  );
  void Promise.all(workers).then((codes) => {
    results.splice(0, results.length, ...readRun(dir));
    writeReport();
    console.log(`Report: ${join(dir, 'report.md')}`);
    process.exit(codes.every((c) => c === 0) ? 0 : 1);
  });
} else {
  const tag = shard ? `[worker ${shardIdx + 1}/${shardN}] ` : '';
  if (!shard) console.log(`${plan.name}: ${cells.length} cells, ${todo.length} to run → ${dir}`);
  let spent = 0;
  todo.forEach((cell, i) => {
    const r = measureCell(cell, plan.seeds, plan.minutes, plan.seedStart ?? 1);
    appendFileSync(resultsPath, `${JSON.stringify(r)}\n`);
    results.push(r);
    if (!shard) writeReport();
    spent += r.ms;
    const eta = (spent / (i + 1)) * (todo.length - i - 1);
    console.log(`${tag}[${i + 1}/${todo.length}] ${cellKey(cell)} — ${(r.ms / 1000).toFixed(1)} s, about ${Math.ceil(eta / 60000)} min left`);
  });
  if (!shard) {
    writeReport();
    console.log(`Report: ${join(dir, 'report.md')}`);
  }
}
