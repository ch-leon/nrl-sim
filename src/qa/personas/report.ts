import { FINANCE_LINES, type FinanceLine } from '../../core/state';
import type { SoakResult } from '../soak';
import type { CareerMatch } from './metrics';

const mean = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const rate = (wins: number, games: number): number | null => games ? wins / games : null;
export interface Outlier {
  cell: string;
  games: number;
  winShare: number;
  restGames: number;
  restWinShare: number | null;
  difference: number | null;
  warning: boolean;
}
/** Observational win share; draws count as half, trials/forfeits excluded. Not causal. */
export function outliers(matches: readonly CareerMatch[], kind: 'strategy' | 'play'): Outlier[] {
  const games = matches.filter(m => m.kind !== 'trial' && !m.forfeit);
  const keys = (m: CareerMatch): string[] => kind === 'strategy' ? [`${m.tactics.attack} × ${m.opponent.defence}`] : m.takenPlays;
  const cells = [...new Set(games.flatMap(keys))].sort();
  const score = (xs: CareerMatch[]) => xs.reduce((n, m) => n + (m.win ? 1 : m.draw ? 0.5 : 0), 0);
  return cells.map(cell => {
    const here = games.filter(m => keys(m).includes(cell));
    const rest = games.filter(m => !keys(m).includes(cell));
    const winShare = score(here) / here.length;
    const restWinShare = rate(score(rest), rest.length);
    const difference = restWinShare === null ? null : winShare - restWinShare;
    return { cell, games: here.length, winShare, restGames: rest.length, restWinShare, difference,
      warning: here.length >= 10 && rest.length >= 10 && difference !== null && Math.abs(difference) >= 0.15 };
  });
}
export function summarisePersonas(runs: readonly SoakResult[]) {
  const groups = new Map<string, SoakResult[]>();
  for (const r of runs) {
    if (!r.persona || !r.career) continue;
    const key = `${r.persona.id}/${r.difficulty ?? 'normal'}/${r.pack ?? 'au'}${r.liveRivals ? '/live-rivals' : ''}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups].map(([key, rs]) => {
    const careers = rs.map(r => r.career!);
    const matches = careers.flatMap(c => c.matches);
    const regular = matches.filter(m => m.kind === 'regular');
    const finals = matches.filter(m => m.kind === 'final');
    const seasons = careers.flatMap(c => c.seasons);
    const completed = seasons.filter(s => s.completed);
    const minima = [...careers.flatMap(c => c.cash.map(x => x.money)), ...seasons.map(s => s.minMoney)];
    return { key, runs: rs.length, regularGames: regular.length, regularWinRate: rate(regular.filter(m => m.win).length, regular.length),
      finalsGames: finals.length, finalsWinRate: rate(finals.filter(m => m.win).length, finals.length),
      completedSeasons: completed.length, finalsShare: rate(completed.filter(s => s.madeFinals).length, completed.length),
      progression: Object.fromEntries((['70', '80', '90'] as const).map(t => {
        const reached = careers.flatMap(c => c.weeksToOverall[t] === null ? [] : [c.weeksToOverall[t]!]);
        return [t, { meanWeeks: mean(reached), reached: reached.length, censored: careers.length - reached.length }];
      })),
      endSeasonMoney: mean(completed.map(s => s.money)), minMoney: minima.length ? Math.min(...minima) : null,
      finance: Object.fromEntries(FINANCE_LINES.map(k => [k, mean(completed.map(s => s.finance[k]))])) as Record<FinanceLine, number | null>,
      brokeRate: careers.filter(c => c.broke).length / careers.length,
      bankruptcyWarnings: careers.reduce((n, c) => n + c.bankruptcyWarnings, 0), forcedSales: careers.reduce((n, c) => n + c.forcedSales, 0),
      moneySackings: careers.reduce((n, c) => n + c.moneySackings, 0),
      saveRoundTrips: careers.reduce((n, c) => n + c.saves.length, 0), repairs: careers.flatMap(c => c.saves).reduce((n, s) => n + s.repairs.length, 0),
      unrecoverableLoads: careers.flatMap(c => c.saves).filter(s => !s.ok).length,
      stability: { crashes: careers.reduce((n, c) => n + c.stability.crashes, 0), thrownTicks: careers.reduce((n, c) => n + c.stability.thrownTicks, 0),
        invariants: careers.reduce((n, c) => n + c.stability.invariantFailures, 0), nonFinite: careers.reduce((n, c) => n + c.stability.nonFinite, 0) },
      strategies: outliers(matches, 'strategy'), plays: outliers(matches, 'play'),
    };
  });
}

// Baselines compare matching configs/seed/difficulty/pack and completed season endpoints.
// Thus a one-season checked baseline also covers season one of a longer career.
export interface BaselineCase {
  key: string;
  endpoint: string;
  regularWinRate: number | null;
  minMoney: number;
  endMoney: number;
  broke: boolean;
  weeksToOverall: Record<'70' | '80' | '90', number | null>;
  failures: number;
  repairs: number;
}
export interface PersonaBaseline { schema: 1; description: string; cases: BaselineCase[] }
function caseKey(r: SoakResult): string {
  return JSON.stringify({ config: r.persona, seed: r.seed, difficulty: r.difficulty ?? 'normal', pack: r.pack ?? 'au', liveRivals: r.liveRivals ?? false, fromVersion: r.fromVersion ?? null });
}
export function makeBaseline(runs: readonly SoakResult[], description: string): PersonaBaseline {
  const cases: BaselineCase[] = [];
  for (const r of runs) {
    const c = r.career;
    if (!c || r.fromSave) continue;
    for (const season of c.seasons) {
      // Partial endpoints compare only at the same elapsed week, never with a whole season.
      const endWeek = season.elapsedWeeks;
      const regular = c.matches.filter(m => m.season <= season.season && m.kind === 'regular');
      const saves = c.saves.filter(s => s.season <= season.season);
      cases.push({ key: caseKey(r), endpoint: season.completed ? `season:${season.season}` : `weeks:${endWeek}`,
        regularWinRate: rate(regular.filter(m => m.win).length, regular.length), minMoney: Math.min(...c.seasons.filter(s => s.season <= season.season).map(s => s.minMoney)),
        endMoney: season.money, broke: season.broke,
        weeksToOverall: Object.fromEntries(Object.entries(c.weeksToOverall).map(([t, w]) => [t, w !== null && w <= endWeek ? w : null])) as BaselineCase['weeksToOverall'],
        failures: season.failures + saves.filter(s => !s.ok).length, repairs: saves.reduce((n, s) => n + s.repairs.length, 0),
      });
    }
  }
  return { schema: 1, description, cases };
}
export function compareBaseline(runs: readonly SoakResult[], baseline: PersonaBaseline): { compared: number; warnings: string[] } {
  if (baseline.schema !== 1 || !Array.isArray(baseline.cases)) throw new Error('Unsupported persona baseline');
  const current = makeBaseline(runs, 'current');
  const warnings: string[] = [];
  let compared = 0;
  for (const c of current.cases) {
    const b = baseline.cases.find(b => b.key === c.key && b.endpoint === c.endpoint);
    if (!b) continue;
    compared++;
    const identity = JSON.parse(c.key) as { config: { id: string }; seed: number; difficulty: string; pack: string };
    const label = `${identity.config.id}/${identity.difficulty}/${identity.pack} seed ${identity.seed} ${c.endpoint}`;
    const warn = (s: string) => warnings.push(`${label}: ${s}`);
    if (c.regularWinRate !== null && b.regularWinRate !== null && c.regularWinRate < b.regularWinRate - 0.1) warn('regular win rate fell >10 percentage points');
    if (c.minMoney < b.minMoney - Math.max(10_000, Math.abs(b.minMoney) * 0.25)) warn('minimum cash fell >25% (at least $10,000)');
    if (c.endMoney < b.endMoney - Math.max(10_000, Math.abs(b.endMoney) * 0.25)) warn('end cash fell >25% (at least $10,000)');
    if (c.broke && !b.broke) warn('new broke career');
    if (c.failures > b.failures) warn('more crashes, invariants or unloadable saves');
    if (c.repairs > b.repairs) warn('more save repairs');
    for (const t of ['70', '80', '90'] as const) {
      const prev = b.weeksToOverall[t], now = c.weeksToOverall[t];
      if (prev !== null && (now === null || now > prev + 4)) warn(`progression to ${t} is >4 weeks slower or not reached`);
    }
  }
  if (!compared) warnings.push('No matching baseline endpoints: use the documented baseline command for this pack/config/seed/horizon.');
  return { compared, warnings };
}
const fmt = (n: number | null, places = 1): string => n === null ? 'n/a' : n.toFixed(places);
const pct = (n: number | null): string => n === null ? 'n/a' : `${(n * 100).toFixed(1)}%`;
const table = (heads: string[], rows: (string | number)[][]): string => [
  `| ${heads.join(' | ')} |`, `| ${heads.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`),
].join('\n');
export function personaReport(runs: readonly SoakResult[], comparison: ReturnType<typeof compareBaseline>): string {
  const summary = summarisePersonas(runs);
  const lines = ['# AI persona career report', '',
    'Rule-based measurement only. Seed/config/difficulty/pack identify each career in JSON. Elapsed weeks include trials. Best-nine mean includes recruitment; it is not an individual training curve. Unreached thresholds are censored, not zero.', '',
    table(['Persona / difficulty / pack', 'Runs', 'Regular wins / games', 'Final wins / games', 'Finals share (completed seasons)', 'Broke rate', 'End-season cash', 'Min cash'], summary.map(s => [s.key, s.runs, `${pct(s.regularWinRate)} / ${s.regularGames}`, `${pct(s.finalsWinRate)} / ${s.finalsGames}`, `${pct(s.finalsShare)} / ${s.completedSeasons}`, pct(s.brokeRate), fmt(s.endSeasonMoney, 0), fmt(s.minMoney, 0)])), '',
    '## Baseline warnings', '', `Compared ${comparison.compared} matching endpoints. Baseline differences are warnings only.`, '',
    ...(comparison.warnings.length ? comparison.warnings.map(w => `- ${w}`) : ['No baseline regressions.']), '',
    '## Progression, finance and health', '',
  ];
  for (const s of summary) {
    lines.push(`### ${s.key}`, '', ...Object.entries(s.progression).map(([t, p]) => `- ${t} overall: ${fmt(p.meanWeeks)} weeks; ${p.reached} reached, ${p.censored} censored.`),
      `- Bankruptcy warnings: ${s.bankruptcyWarnings}; forced sales: ${s.forcedSales}; sacked with missed solvency objective: ${s.moneySackings}.`,
      `- Save round-trips: ${s.saveRoundTrips}; repairs: ${s.repairs}; unrecoverable: ${s.unrecoverableLoads}.`,
      `- Crashes: ${s.stability.crashes}; thrown ticks: ${s.stability.thrownTicks}; invariant failures: ${s.stability.invariants}; non-finite numbers: ${s.stability.nonFinite}.`, '',
      table(['Mean completed-season finance line', '$'], FINANCE_LINES.map(k => [k, fmt(s.finance[k], 0)])), '',
      'Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.', '',
      table(['Cell', 'Games', 'Win share', 'Rest games', 'Rest win share', 'Difference', 'Flag'], [...s.strategies, ...s.plays].map(o => [o.cell, o.games, pct(o.winShare), o.restGames, pct(o.restWinShare), pct(o.difference), o.warning ? 'WARNING' : ''])), '');
  }
  lines.push('## Per career', '');
  for (const r of runs) {
    if (!r.career || !r.persona) continue;
    const c = r.career;
    const single = summarisePersonas([r])[0]!;
    lines.push(`### ${r.persona.id} / ${r.difficulty ?? 'normal'} / ${r.pack ?? 'au'} / seed ${r.seed}`, '',
      `Regular: ${pct(single.regularWinRate)} wins / ${single.regularGames} games; finals: ${pct(single.finalsWinRate)} wins / ${single.finalsGames} games; finals share: ${pct(single.finalsShare)} / ${single.completedSeasons} completed seasons. Weeks: ${c.weeks}; to 70/80/90: ${Object.values(c.weeksToOverall).map(w => w ?? 'unreached').join(' / ')}; broke: ${c.broke}.`, '',
      table(['Season', 'Completed', 'End cash', 'Minimum cash', ...FINANCE_LINES], c.seasons.map(s => [s.season, String(s.completed), fmt(s.money, 0), fmt(s.minMoney, 0), ...FINANCE_LINES.map(k => fmt(s.finance[k], 0))])), '',
      `Save round-trips: ${c.saves.length}; repairs: ${c.saves.reduce((n, s) => n + s.repairs.length, 0)}; unrecoverable: ${c.saves.filter(s => !s.ok).length}. Stability: ${JSON.stringify(c.stability)}.`, '',
      ...c.saves.flatMap(s => [...s.repairs.map(p => `- S${s.season} repair ${p.field}: ${p.problem} → ${p.repair}`), ...(!s.ok ? [`- S${s.season} unloadable: ${s.message}`] : [])]),
      ...r.problems.map(p => `- ${p}`), '');
  }
  return lines.join('\n');
}
