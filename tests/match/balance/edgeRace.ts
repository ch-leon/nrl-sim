// The #322 edge-race rate is one number over seeds 1..400 (both orientations).
// Vitest shards by file, and that one file was landing whole in unit shard 1/2
// and running past the job's 15-minute limit. The seeds are split across four
// files so the workers run a hundred at a time. The assertion is still the
// pooled rate: the same mean measureCell would report for all 400 at once.
//
// The fork pool leaves one core for the main process (cpus - 1 workers). If
// every part file waited for the others, four waiters would fill a 3-worker
// pool and the last file would never start. Only the lead file waits. The
// other three record their range and return, so a worker stays free. The lead
// fails if a range never arrives, which is what a shard split would look like.
//
// The filenames are part of that. Vitest shards by the sha1 of the path, and
// these four (`edgeRace.part.1-100.test.ts` and the three ranges after it)
// currently all land in unit shard 2/2, while `edgeRace.test.ts` stays in 1/2.
// Renaming them can put the 400-seed work back on the shard that was hitting
// the 15-minute limit.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'vitest';
import { MATCH_MINUTES, measureCell } from '../../../src/match/balance/measure';
import type { Overrides } from '../../../src/match/league/tuning';

// #672's 30-seed sample gave +0.747 busts/14 min; 100 seeds/orientation gave +1.40 (SE .575),
// under one SE above the margin, so ordinary seed noise could fail it (#722's back door read
// +0.77 at 100 seeds and +1.62 at 400). At 400 seeds/orientation main gives 2.869 (SE .065)
// → 3.401 (.073) tracked busts per five minutes, +1.49/14 min (SE .272): nearly two SE clear.
// The margin stays 1: the larger fixed sample roughly halves the SE, it does not move the bar.
export const EDGE_RACE_SEEDS = 400;
/** Extra busts per fourteen minutes for the tracked side; keep the historical rate threshold. */
export const EDGE_RACE_MARGIN = 1;

/** Seeds 1..400, in four equal ranges. Together they are exactly the old single sample. */
export const EDGE_RACE_RANGES = [
  { seedStart: 1, seeds: 100 },
  { seedStart: 101, seeds: 100 },
  { seedStart: 201, seeds: 100 },
  { seedStart: 301, seeds: 100 },
] as const;

/** The file for this range waits and checks the pooled rate. The others only record. */
export const EDGE_RACE_LEAD = EDGE_RACE_RANGES[3].seedStart;

const ON: Overrides = { 'race.on': 1, 'race.single': 0, 'counters.slide.expansiveSigned': 1, 'counters.compressed.expansiveRelative': 1 };

export interface EdgeRacePart {
  seedStart: number;
  seeds: number;
  /** Mean scaled busts for the tracked side, race off. */
  offMean: number;
  /** Mean scaled busts for the tracked side, race on. */
  onMean: number;
  /** Tracked matches behind each mean (both orientations). */
  offN: number;
  onN: number;
}

function cell(tuning: Overrides) {
  return {
    variant: { name: 'x', tuning },
    scenario: {
      name: 'fast-backs expansive v flat slide', track: 'home' as const, bothWays: true,
      home: { rating: 60, positionStats: { backs: { speed: 85 } }, tactics: { attack: 'expansive' as const } },
      away: { rating: 60, tactics: { defence: 'slide' as const } },
    },
  };
}

/** One seed range, on and off. `measureCell` plays `seedStart .. seedStart+seeds-1`. */
export function measureEdgeRacePart(seedStart: number, seeds: number): EdgeRacePart {
  const off = measureCell(cell({ ...ON, 'race.on': 0 }), seeds, undefined, seedStart);
  const on = measureCell(cell({ ...ON, 'race.on': 1, 'race.perPoint': 0.02, 'race.single': 0 }), seeds, undefined, seedStart);
  const part = {
    seedStart, seeds,
    offMean: off.trackedCounts!.busts.mean, onMean: on.trackedCounts!.busts.mean,
    offN: off.trackedSeeds!, onN: on.trackedSeeds!,
  };
  if (part.offN !== seeds * 2 || part.onN !== seeds * 2) {
    throw new Error(`edge race seeds ${seedStart} tracked ${part.offN}/${part.onN} matches, expected ${seeds * 2} each way`);
  }
  return part;
}

/**
 * The 400-seed rate. Each part's mean is the mean of its own matches, and the
 * parts partition seeds 1..400, so the match-weighted mean is the mean of the
 * concatenated matches: the same figure one `measureCell(..., 400)` call
 * returns. These sides are rating sheets, so the seed picks the match and not
 * the players, and every range uses the same sheets as that single call.
 * Equal match counts make the pool the plain average of the part means.
 * Addition order can move it by a rounding error, nothing next to the margin.
 * Counts are for a full match (`MATCH_MINUTES`, five at the current clock);
 * scaling by 14 / MATCH_MINUTES keeps the old fourteen-minute bar.
 */
export function extraBustsPer14Minutes(parts: readonly EdgeRacePart[]): number {
  const weight = (n: number, mean: number) => n * mean;
  const onN = parts.reduce((a, p) => a + p.onN, 0);
  const offN = parts.reduce((a, p) => a + p.offN, 0);
  const on = parts.reduce((a, p) => a + weight(p.onN, p.onMean), 0) / onN;
  const off = parts.reduce((a, p) => a + weight(p.offN, p.offMean), 0) / offN;
  return (on - off) * 14 / MATCH_MINUTES;
}

export function assertEdgeRace(parts: readonly EdgeRacePart[]): void {
  const starts = [...parts].map((p) => p.seedStart).sort((a, b) => a - b);
  expect(starts).toEqual(EDGE_RACE_RANGES.map((r) => r.seedStart));
  expect(parts.reduce((a, p) => a + p.seeds, 0)).toBe(EDGE_RACE_SEEDS);
  expect(extraBustsPer14Minutes(parts)).toBeGreaterThan(EDGE_RACE_MARGIN);
}

/** One vitest run's workers share the parent pid, so the parts meet here. */
function partDir(): string {
  return join(tmpdir(), `nrl-edge-race-${process.ppid}`);
}

function readParts(dir: string): EdgeRacePart[] {
  const parts: EdgeRacePart[] = [];
  for (const range of EDGE_RACE_RANGES) {
    const path = join(dir, `part-${range.seedStart}.json`);
    try {
      const part = JSON.parse(readFileSync(path, 'utf8')) as EdgeRacePart;
      if (part.seedStart !== range.seedStart || part.seeds !== range.seeds) {
        throw new Error(`edge-race part ${path} is seeds ${part.seedStart}+${part.seeds}, expected ${range.seedStart}+${range.seeds}`);
      }
      parts.push(part);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw err;
    }
  }
  return parts;
}

/**
 * Play this range and record it. The lead file then waits for the other three
 * ranges in this run and checks the pooled 400-seed rate. A hundred seeds on
 * their own are too noisy for the margin of 1, so a part file does not assert
 * that rate from its own sample.
 */
export async function publishEdgeRacePart(seedStart: number, seeds: number): Promise<void> {
  const dir = partDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `started-${seedStart}`), '');
  const part = measureEdgeRacePart(seedStart, seeds);
  const dest = join(dir, `part-${seedStart}.json`);
  const tmp = `${dest}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(part));
  renameSync(tmp, dest);
  const lead = seedStart === EDGE_RACE_LEAD;
  const deadline = Date.now() + (lead ? 11 * 60_000 : 2_000);
  while (Date.now() < deadline) {
    const parts = readParts(dir);
    if (parts.length === EDGE_RACE_RANGES.length) {
      assertEdgeRace(parts);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (lead) {
    const got = readParts(dir).map((p) => p.seedStart).join(', ') || 'none';
    throw new Error(`edge-race ranges did not all report in this run (got ${got}; ${dir})`);
  }
}
