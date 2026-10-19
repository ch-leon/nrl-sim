// src/match/balance/report.ts — write an experiment up: per scenario, one row
// per variant with the headline numbers, the §7 target bands marked, and the
// change against the baseline (or a previous run) flagged when it is bigger
// than luck would explain. Pure: results in, Markdown out.
import { MATCH_MINUTES, type CellResult, type CountKey } from './measure';

/** §7 balance targets per full Nines match, both sides combined. */
export const BANDS: Partial<Record<CountKey, readonly [number, number]>> = {
  tackles: [90, 120],
  breaks: [8, 14],
  offloads: [8, 14],
  errors: [10, 16],
  kicks: [12, 18],
  tries: [5, 9],
};

/** The columns of the summary table. */
const COLUMNS: readonly CountKey[] = ['tackles', 'breaks', 'lateBusts', 'offloads', 'errors', 'kicks', 'tries', 'bonusTries', 'bigHits', 'runDowns', 'gassed', 'subs', 'goals', 'fieldGoals', 'touchFinds', 'fortyTwenties', 'deadBalls', 'kickMetres', 'penalties', 'sixAgains', 'penaltyGoals', 'lostInContact', 'injuries'];

/** ✓ inside the §7 band, ↑ above, ↓ below, '' when the metric has no band. */
export function bandMark(key: CountKey, v: number): string {
  const b = BANDS[key];
  if (!b) return '';
  return v < b[0] ? '↓' : v > b[1] ? '↑' : '✓';
}

/** Fewer matches than this per row and the luck estimate itself is too shaky to flag anything. */
export const MIN_SEEDS_TO_FLAG = 8;

/**
 * The change from `base` to `cur`, flagged when it is beyond luck: more than
 * two standard errors of the difference. "+3.1*" is real, "+0.4" is noise.
 * `flag` false (too few matches) never marks.
 */
export function delta(cur: { mean: number; se: number }, base: { mean: number; se: number }, flag = true): string {
  const d = cur.mean - base.mean;
  const se = Math.sqrt(cur.se ** 2 + base.se ** 2);
  const s = `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
  return flag && se > 0 && Math.abs(d) > 2 * se ? `${s}*` : s;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const legsEnd = (r: CellResult): string => {
  const l = r.legs[r.legs.length - 1];
  return l ? `${pct(l.home)}/${pct(l.away)}` : '—';
};

export interface ReportInput {
  plan: { name: string; description?: string; seeds: number; minutes?: number };
  /** Commit, branch and date the run was made on. */
  meta: Record<string, string>;
  results: readonly CellResult[];
  /** A previous run's results to compare with (same variant and scenario names). */
  previous?: readonly CellResult[];
}

export function reportMarkdown(r: ReportInput): string {
  const out: string[] = [];
  out.push(`# Balance: ${r.plan.name}`, '');
  if (r.plan.description) out.push(r.plan.description, '');
  out.push(Object.entries(r.meta).map(([k, v]) => `**${k}** ${v}`).join(' · '), '');
  out.push(
    `${r.plan.seeds} matches per row, ${r.plan.minutes ? `${r.plan.minutes}-minute stretches, counts scaled to an 18-minute match` : 'whole matches (two 9:00 halves)'}; counts are both sides. Wins are on points. ` +
      `✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with ${MIN_SEEDS_TO_FLAG}+ matches a row); unmarked ones may be noise.`,
    '',
  );
  const scenarios = [...new Set(r.results.map((x) => x.scenario))];
  for (const sc of scenarios) {
    const rows = r.results.filter((x) => x.scenario === sc);
    const base = rows.find((x) => x.variant === 'baseline') ?? rows[0]!;
    out.push(`## ${sc}`, '');
    if (base.minutes !== (r.plan.minutes ?? MATCH_MINUTES)) out.push(`_${base.minutes}-minute stretch, counts scaled to 18._`, '');
    out.push(`| Variant | ${COLUMNS.join(' | ')} | Home win | Wrestle s | Legs end H/A |`);
    out.push(`|---|${COLUMNS.map(() => '---:').join('|')}|---:|---:|---:|`);
    for (const row of rows) {
      const cells = COLUMNS.map((k) => {
        const v = row.counts[k];
        const mark = bandMark(k, v.mean);
        const d = row === base ? '' : ` (${delta(v, base.counts[k], Math.min(row.seeds, base.seeds) >= MIN_SEEDS_TO_FLAG)})`;
        return `${v.mean.toFixed(1)}${mark ? ` ${mark}` : ''}${d}`;
      });
      out.push(`| ${row.variant} | ${cells.join(' | ')} | ${pct(row.homeWin)}${row.draw > 0 ? ` (${pct(row.draw)} drawn)` : ''} | ${row.wrestleSecs.toFixed(2)} | ${legsEnd(row)} |`);
    }
    out.push('');
    const prev = r.previous?.filter((x) => x.scenario === sc) ?? [];
    if (prev.length) {
      const moved: string[] = [];
      for (const row of rows) {
        const p = prev.find((x) => x.variant === row.variant);
        if (!p) continue;
        for (const k of COLUMNS) {
          // A run from before a metric existed has nothing to compare it with.
          const before = p.counts[k];
          if (!before) continue;
          const d = delta(row.counts[k], before, Math.min(row.seeds, p.seeds) >= MIN_SEEDS_TO_FLAG);
          if (d.endsWith('*')) moved.push(`${row.variant}: ${k} ${before.mean.toFixed(1)} → ${row.counts[k].mean.toFixed(1)} (${d})`);
        }
      }
      out.push(moved.length ? `**Changed since the previous run:** ${moved.join('; ')}` : '**Changed since the previous run:** nothing beyond noise.', '');
    }
  }
  const secs = r.results.reduce((a, x) => a + x.ms, 0) / 1000;
  out.push(`_${r.results.length} cells in ${secs.toFixed(0)} s._`, '');
  return out.join('\n');
}
