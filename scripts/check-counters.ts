// Check saved balance-harness measurements; this script never runs the sim.
// vite-node scripts/check-counters.ts -- <kind> <artifact-or-run-directory>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCounterRows, presetShareProblem } from '../src/match/balance/acceptance';
import type { CellResult } from '../src/match/balance/measure';

const args = process.argv.slice(2).filter((x) => x !== '--');
const [kind, root] = args;
if (!kind || !root) throw Error('Usage: check-counters.ts <enabled|full-fit|fit-enabled|strong-pack|round-robin|yardstick> <directory>');
function readRows(dir: string): CellResult[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return readRows(path);
    return /^results\.shard-\d+\.jsonl$/.test(entry.name)
      ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as CellResult) : [];
  });
}
const rows = readRows(root);
const problems: string[] = [];
const requireRows = (variant: string, count: number, matches = 1000): CellResult[] => {
  const found = rows.filter((r) => r.variant === variant);
  if (found.length !== count || new Set(found.map((r) => r.scenario)).size !== count ||
    found.some((r) => r.trackedSeeds !== matches || !Number.isFinite(r.pointsShare?.mean))) {
    problems.push(`${variant}: expected ${count} unique complete ${matches}-match cells`);
  }
  return found;
};
if (kind === 'enabled' || kind === 'full-fit') {
  const full = kind === 'full-fit';
  requireRows('baseline', full ? 8 : 15);
  requireRows(full ? 'enabled defaults' : 'enabled', full ? 8 : 15);
  if (full) requireRows('fully dormant', 8);
  problems.push(...checkCounterRows(rows, full));
  if (!full) {
    for (const row of rows.filter((r) => r.variant === 'enabled' && (r.scenario.endsWith('v slide') || r.scenario.startsWith('balanced v ')))) {
      const share = row.scenario.startsWith('balanced v ') ? 1 - row.pointsShare!.mean : row.pointsShare!.mean;
      const problem = presetShareProblem(share);
      if (problem) problems.push(`${row.scenario}: ${problem}`);
    }
  }
} else if (kind === 'fit-enabled') {
  const before = requireRows('baseline', 5);
  for (const after of requireRows('enabled defaults', 5)) {
    const baseline = before.find((r) => r.scenario === after.scenario);
    const swing = (after.pointsShare!.mean - (baseline?.pointsShare?.mean ?? NaN)) * 100;
    const sign = after.scenario.includes('0.5') ? -1 : 1;
    if (!Number.isFinite(swing) || Math.abs(swing) > 4 + 1e-8 || sign * swing < -1e-8 ||
      (after.scenario.includes('neutral') && Math.abs(swing) > 1e-8)) problems.push(`${after.scenario}: own fit ${swing}pp`);
  }
} else if (kind === 'strong-pack') {
  requireRows('baseline', 3);
  for (const row of requireRows('enabled defaults', 3)) {
    if (!(row.trackedCounts!.offloads.mean >= 6)) problems.push(`${row.scenario}: offloads below 6`);
  }
} else if (kind === 'round-robin') {
  const shares = new Map<string, number[]>();
  const record = (plan: string, share: number) => shares.set(plan, [...(shares.get(plan) ?? []), share]);
  for (const row of requireRows('baseline', 105, 1000)) {
    const [home, away] = row.scenario.split(' v ');
    const share = row.pointsShare!.mean;
    record(home!, share); record(away!, 1 - share);

  }
  if (shares.size !== 15) problems.push('Round robin must contain all 15 plans');
  for (const [plan, values] of shares) {
    const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
    console.log(`${plan}: ${(mean * 100).toFixed(3)}% across ${values.length} opponents`);
    if (values.length !== 14 || mean > .53 + 1e-10) problems.push(`${plan}: must face 14 opponents and average at most 53%`);
  }
} else if (kind === 'yardstick') {
  requireRows('baseline', 2);
} else throw Error(`Unknown acceptance plan: ${kind}`);
if (problems.length) throw Error(problems.join('\n'));
console.log(`${kind}: all measurement guards passed (${rows.length} saved cells).`);
