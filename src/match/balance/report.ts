// src/match/balance/report.ts — write an experiment up: per scenario, one row
// per variant with the headline numbers, the §7 target bands marked, and the
// change against the baseline (or a previous run) flagged when it is bigger
// than luck would explain. Pure: results in, Markdown out.
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL } from '../league/presets';
import { SIDE_COUNTS, MATCH_MINUTES, type CellResult, type CountKey, type Stat, type WatchStats } from './measure';
import { LAST_TACKLES, ORIGINS } from './watch';
import { SHAPE_LABEL, SHAPE_NAMES, type ShapeName } from '../league/shapes';

/**
 * §7 balance targets per full Nines match, both sides combined. Tackles, line
 * breaks and kicks are at the sim's tempo (a tackle every 5–7 s of game clock,
 * Phase 3, assumed pending Leon); the rest as first set.
 */
export const BANDS: Partial<Record<CountKey, readonly [number, number]>> = {
  // Counts scaled ×7/9 with the half (9 → 7). Completion is a share, so it stays.
  tackles: [117, 163],
  lineBreaks: [10, 19],
  offloads: [6, 11],
  errors: [8, 12],
  kicks: [16, 25],
  tries: [4, 7],
  completion: [70, 80],
  grubberTries: [0.2, 0.3],
  grubberRepeats: [0.05, 0.3],
  grubberDropouts: [0, 0.15],
};

/** The columns of the summary table. */
const COLUMNS: readonly CountKey[] = ['tackles', 'lineBreaks', 'breaks', 'lateBusts', 'offloads', 'errors', 'kicks', 'tries', 'bonusTries', 'bigHits', 'runDowns', 'gassed', 'subs', 'goals', 'fieldGoals', 'touchFinds', 'fortyTwenties', 'deadBalls', 'kickMetres', 'penalties', 'sixAgains', 'penaltyGoals', 'sinBins', 'shortMin', 'binSwing', 'lostInContact', 'injuries', 'completion', 'grubbers', 'grubberTries', 'grubberRepeats', 'grubberDropouts', 'grubberTurnovers'];

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

/** Try origins' headings. */
const ORIGIN_LABEL: Record<(typeof ORIGINS)[number], string> = { kick: 'kick', setPlay: 'set play', offload: 'offload', break: 'break 20 m+', drive: 'drive <5 m', other: 'other' };

const pct = (v: number): string => `${Math.round(v * 100)}%`;
/** A tenth. Side win is read against the 42–58% band; retain a tenth when reading endpoints. */
const pct1 = (v: number): string => `${(v * 100).toFixed(1)}%`;
const legsEnd = (r: CellResult): string => {
  const l = r.legs[r.legs.length - 1];
  return l ? `${pct(l.home)}/${pct(l.away)}` : '—';
};

export interface ReportInput {
  plan: { name: string; description?: string; seeds: number; minutes?: number; report?: 'matrix' };
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
  if (r.plan.report === 'matrix') {
    out.push(...matrixReport(r.results));
    const secs = r.results.reduce((a, x) => a + x.ms, 0) / 1000;
    out.push(`_${r.results.length} cells in ${secs.toFixed(0)} s._`, '');
    return out.join('\n');
  }
  out.push(
    `${r.plan.seeds} matches per row, ${r.plan.minutes ? `${r.plan.minutes}-minute stretches, counts scaled to a ${MATCH_MINUTES}-minute match` : `whole matches (two ${MATCH_MINUTES / 2}-minute halves)`}; counts are both sides. Wins are on points. ` +
      `✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with ${MIN_SEEDS_TO_FLAG}+ matches a row); unmarked ones may be noise.`,
    '',
  );
  const scenarios = [...new Set(r.results.map((x) => x.scenario))];
  for (const sc of scenarios) {
    const rows = r.results.filter((x) => x.scenario === sc);
    const base = rows.find((x) => x.variant === 'baseline') ?? rows[0]!;
    out.push(`## ${sc}`, '');
    if (base.minutes !== (r.plan.minutes ?? MATCH_MINUTES)) out.push(`_${base.minutes}-minute stretch, counts scaled to ${MATCH_MINUTES}._`, '');
    if (base.seeds !== r.plan.seeds) out.push(`_${base.seeds} matches in this row (the plan's other rows use ${r.plan.seeds})._`, '');
    const tracked = rows.some((x) => x.trackedWin !== undefined);
    if (tracked && base.trackedSeeds && base.trackedSeeds !== base.seeds) {
      out.push(`_Side win is the tracked side over ${base.trackedSeeds} matches, both ways round. The other columns are the matchup as written (${base.seeds})._`, '');
    }
    out.push(`| Variant | ${COLUMNS.join(' | ')} | Home win |${tracked ? ' Side win |' : ''} Wrestle s | Legs end H/A |`);
    out.push(`|---|${COLUMNS.map(() => '---:').join('|')}|---:|${tracked ? '---:|' : ''}---:|---:|`);
    for (const row of rows) {
      const cells = COLUMNS.map((k) => {
        const v = row.counts[k];
        const mark = bandMark(k, v.mean);
        const d = row === base ? '' : ` (${delta(v, base.counts[k], Math.min(row.seeds, base.seeds) >= MIN_SEEDS_TO_FLAG)})`;
        return `${v.mean.toFixed(k.startsWith('grubber') ? 3 : 1)}${mark ? ` ${mark}` : ''}${d}`;
      });
      const side = tracked
        ? ` ${row.trackedWin === undefined ? '—' : `${pct1(row.trackedWin)}${row.trackedDraw ? ` (${pct1(row.trackedDraw)} drawn)` : ''}`} |`
        : '';
      out.push(`| ${row.variant} | ${cells.join(' | ')} | ${pct(row.homeWin)}${row.draw > 0 ? ` (${pct(row.draw)} drawn)` : ''} |${side} ${row.wrestleSecs.toFixed(2)} | ${legsEnd(row)} |`);
    }
    out.push('');
    out.push(...watchTable(rows, base));
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

/**
 * A set of per-match counts as shares of their total, in percent. The standard
 * error treats the events (tries, last tackles) as independent draws, which is
 * all a share of a few per match can claim; `matches` is how many matches the
 * counts came over and `minutes` how long each was (a stretch's counts are
 * scaled, its events are not).
 */
export function sharesOf<K extends string>(counts: Record<K, Stat>, keys: readonly K[], matches: number, minutes: number): { shares: Record<K, Stat>; perMatch: number } {
  const total = keys.reduce((a, k) => a + counts[k].mean, 0);
  const n = total * matches * (minutes / MATCH_MINUTES);
  const shares = Object.fromEntries(keys.map((k) => {
    const p = total > 0 ? counts[k].mean / total : 0;
    return [k, { mean: 100 * p, se: n > 0 ? 100 * Math.sqrt((p * (1 - p)) / n) : 0 }];
  })) as Record<K, Stat>;
  return { shares, perMatch: total };
}

const pctStat = (s: Stat): Stat => ({ mean: s.mean * 100, se: s.se * 100 });

type Shaped = 'pod' | 'edge' | 'backDoor';
/** The share of these shapes' play-the-balls that were formed at ball-out (pooled; its ± treats each as a draw), or nothing with none. */
function formedShare(w: WatchStats, r: CellResult, ks: readonly Shaped[]): Stat | undefined {
  const f = w.shapesFormed;
  if (!f) return undefined;
  const n = ks.reduce((a, k) => a + f[`${k}N`].mean, 0);
  if (n <= 0) return undefined;
  const p = ks.reduce((a, k) => a + f[`${k}Formed`].mean, 0) / n;
  return { mean: 100 * p, se: 100 * Math.sqrt((p * (1 - p)) / (n * r.seeds)) };
}
/** The mean distance short of the spot, metres, over shaped play-the-balls (a man's mean per ruck); nothing with none. */
function formedShort(w: WatchStats): Stat | undefined {
  const f = w.shapesFormed;
  if (!f) return undefined;
  const n = f.podN.mean + f.edgeN.mean + f.backDoorN.mean;
  return n > 0 ? { mean: (f.podShort.mean + f.edgeShort.mean + f.backDoorShort.mean) / n, se: 0 } : undefined;
}

/** One shape's share of the shapes picked in a row, or nothing when none were (off, or a run from before #649 step 2). */
function shapeShare(w: WatchStats, r: CellResult, k: ShapeName): Stat | undefined {
  if (!w.shapes || SHAPE_NAMES.every((n) => w.shapes![n].mean === 0)) return undefined;
  return sharesOf(w.shapes, SHAPE_NAMES, r.seeds, r.minutes).shares[k];
}

/** The watchability columns, in order: header, and the value of each for one result (undefined when it predates them). */
const WATCH_COLUMNS: readonly { head: string; digits: number; get: (w: WatchStats, r: CellResult) => Stat | undefined }[] = [
  { head: 'Lead changes', digits: 2, get: (w) => w.flow.leadChanges },
  { head: 'Within 6, 1 min out %', digits: 0, get: (w) => pctStat(w.flow.closeLate) },
  { head: 'Decided last min %', digits: 0, get: (w) => pctStat(w.flow.decidedLate) },
  { head: 'Winner\'s biggest deficit', digits: 1, get: (w) => w.flow.comeback },
  ...ORIGINS.map((k) => ({ head: `Try ${ORIGIN_LABEL[k]} %`, digits: 0, get: (w: WatchStats, r: CellResult) => sharesOf(w.origins, ORIGINS, r.seeds, r.minutes).shares[k] })),
  ...LAST_TACKLES.map((k) => ({ head: `Last tackle ${k} %`, digits: 0, get: (w: WatchStats, r: CellResult) => sharesOf(w.lastTackles, LAST_TACKLES, r.seeds, r.minutes).shares[k] })),
  // Who took the dummy-half's ball (#649); a dash in results from before it.
  { head: '1st receiver same man %', digits: 0, get: (w) => w.receivers?.sameMan },
  { head: '1st receiver slots', digits: 1, get: (w) => w.receivers?.slots },
  // The attack shapes picked (#649 step 2), as shares of the picks; a dash with none picked (shapes off) or in results from before them.
  ...SHAPE_NAMES.map((k) => ({ head: `Shape ${SHAPE_LABEL[k].toLowerCase()} %`, digits: 0, get: (w: WatchStats, r: CellResult) => shapeShare(w, r, k) })),
  // Formed as the ball left the ruck (#649 step 2): every man the shape places within SHAPE_FORMED_M of his spot.
  { head: 'Shape formed %', digits: 0, get: (w: WatchStats, r: CellResult) => formedShare(w, r, ['pod', 'edge', 'backDoor']) },
  { head: 'Formed pod %', digits: 0, get: (w: WatchStats, r: CellResult) => formedShare(w, r, ['pod']) },
  { head: 'Formed edge %', digits: 0, get: (w: WatchStats, r: CellResult) => formedShare(w, r, ['edge']) },
  { head: 'Formed back door %', digits: 0, get: (w: WatchStats, r: CellResult) => formedShare(w, r, ['backDoor']) },
  { head: 'Shape short m', digits: 1, get: (w: WatchStats) => formedShort(w) },
];

/** The watchability table for one scenario's rows, or nothing when none of them has the measures (a run from before #648). */
function watchTable(rows: readonly CellResult[], base: CellResult): string[] {
  if (!rows.some((x) => x.watch)) return [];
  const out: string[] = [];
  out.push(`| Variant | ${WATCH_COLUMNS.map((c) => c.head).join(' | ')} |`, `|---|${WATCH_COLUMNS.map(() => '---:').join('|')}|`);
  for (const row of rows) {
    const cells = WATCH_COLUMNS.map((c) => {
      const v = row.watch ? c.get(row.watch, row) : undefined;
      if (!v) return '—';
      const b = base.watch ? c.get(base.watch, base) : undefined;
      const d = row === base || !b ? '' : ` (${delta(v, b, Math.min(row.seeds, base.seeds) >= MIN_SEEDS_TO_FLAG)})`;
      return `${v.mean.toFixed(c.digits)}${d}`;
    });
    out.push(`| ${row.variant} | ${cells.join(' | ')} |`);
  }
  const w = base.watch;
  if (w) {
    out.push('', `_Tries ${sharesOf(w.origins, ORIGINS, base.seeds, base.minutes).perMatch.toFixed(1)} and last tackles ${sharesOf(w.lastTackles, LAST_TACKLES, base.seeds, base.minutes).perMatch.toFixed(1)} a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._`);
  }
  out.push('');
  return out;
}

/** Opt-in counter report. Matrix rows use the documented `<attack> v <defence>` names. */
function matrixReport(results: readonly CellResult[]): string[] {
  const out: string[] = [];
  const share = (s: Stat | undefined): string => s ? `${pct1(s.mean)} ± ${pct1(s.se)}` : '—';
  const variants = [...new Set(results.map((r) => r.variant))];
  out.push('Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.', '');
  for (const variant of variants) {
    const rows = results.filter((r) => r.variant === variant);
    out.push(`## Attack × defence points share — ${variant}`, '');
    out.push(`| Attack | ${DEFENCE_PRESETS.map((d) => PRESET_LABEL[d]).join(' | ')} |`);
    out.push('|---|---:|---:|---:|');
    for (const attack of ATTACK_PRESETS) {
      out.push(`| ${PRESET_LABEL[attack]} | ${DEFENCE_PRESETS.map((defence) => share(rows.find((r) => r.scenario === `${attack} v ${defence}`)?.pointsShare)).join(' | ')} |`);
    }
    out.push('', `## Tracked-side rows — ${variant}`, '');
    out.push('| Scenario | Matches | Points share ± SE |', '|---|---:|---:|');
    for (const row of rows) out.push(`| ${row.scenario} | ${row.trackedSeeds ?? '—'} | ${share(row.pointsShare)} |`);
    out.push('', `## Per-side counts — ${variant}`, '', `| Scenario | Side | ${SIDE_COUNTS.join(' | ')} |`, `|---|---|${SIDE_COUNTS.map(() => '---:').join('|')}|`);
    for (const row of rows) {
      for (const [side, counts] of [['tracked', row.trackedCounts], ['opponent', row.opponentCounts]] as const) {
        if (counts) out.push(`| ${row.scenario} | ${side} | ${SIDE_COUNTS.map((k) => counts[k].mean.toFixed(1)).join(' | ')} |`);
      }
    }
    out.push('');
  }
  return out;
}
