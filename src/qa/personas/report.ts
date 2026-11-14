import { FINANCE_LINES, type FinanceLine } from '../../core/state';
import type { SoakResult } from '../soak';
import type { CareerMatch, DiaryRow } from './metrics';

const mean = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
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
      openingMoney: mean(careers.flatMap(c => c.cash[0] ? [c.cash[0].money] : [])),
      weeklyCashDelta: mean(careers.flatMap(c => (c.diary ?? []).map(d => d.cashDelta))),
      meanDebtWeeks: mean(careers.map(c => c.debtWeeks ?? 0)),
      premierships: completed.filter(s => s.premiership).length,
      meanLadder: mean(completed.flatMap(s => s.ladder ? [s.ladder] : [])),
      stars: { tracked: careers.reduce((n, c) => n + (c.stars?.tracked ?? 0), 0), gained: careers.reduce((n, c) => n + (c.stars?.gained ?? 0), 0),
        medianWeeks: median(careers.flatMap(c => c.stars?.weeks ?? [])) },
      potential: { tracked: careers.reduce((n, c) => n + (c.potential?.tracked ?? 0), 0), reached: careers.reduce((n, c) => n + (c.potential?.gained ?? 0), 0),
        already: careers.reduce((n, c) => n + (c.potential?.already ?? 0), 0), medianWeeks: median(careers.flatMap(c => c.potential?.weeks ?? [])) },
      ceilings: [1, 3, 5].map(season => {
        const rows = completed.filter(s => s.season === season && s.squadSize);
        return { season, at: rows.reduce((n, s) => n + (s.atCeiling ?? 0), 0), squad: rows.reduce((n, s) => n + (s.squadSize ?? 0), 0) };
      }),
      xpPerSeason: mean(completed.map(s => s.xpGained ?? 0)),
      levelUpsPerSeason: mean(completed.map(s => s.levelUps ?? 0)),
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
  return JSON.stringify({ config: r.persona, seed: r.seed, difficulty: r.difficulty ?? 'normal', pack: r.pack ?? 'au', liveRivals: r.liveRivals ?? false, fromVersion: r.fromVersion ?? null, fieldLength: r.match?.fieldLength ?? null, halfMinutes: r.match?.halfMinutes ?? null });
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
const cashShort = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(a)}`;
};
export interface ReportMatch {
  fieldLength: number;
  halfMinutes: number;
  halves: number;
  totalMinutes: number;
  fortyTwenty: boolean;
  how: string;
}
type Summary = ReturnType<typeof summarisePersonas>[number];
/** Plain-language flags. The numbers are still printed when a flag does not trip. */
export function balanceReadings(s: Summary): string[] {
  const out: string[] = [];
  if (s.brokeRate === 0 && s.endSeasonMoney !== null && s.openingMoney !== null && s.endSeasonMoney > s.openingMoney + 150_000 && (s.minMoney ?? -1) > 0) {
    out.push(`WARNING: money looks easy. Completed seasons end about ${cashShort(s.endSeasonMoney)} after opening at ${cashShort(s.openingMoney)}, and no career went into debt.`);
  }
  if (s.completedSeasons > 0 && s.endSeasonMoney !== null && s.endSeasonMoney < 0) {
    out.push(`WARNING: money looks hard. Completed seasons end at ${fmt(s.endSeasonMoney, 0)} on average. Broke rate ${pct(s.brokeRate)} (a bankruptcy warning, or a sacking for a missed solvency objective).`);
  }
  if (s.runs > 0 && s.moneySackings / s.runs >= 0.25) {
    out.push(`WARNING: the board is sacking clubs for money. ${s.moneySackings} of ${s.runs} careers missed the solvency objective and were sacked.`);
  }
  if ((s.weeklyCashDelta ?? 0) > 5_000) out.push(`WARNING: cash climbs by ${cashShort(s.weeklyCashDelta ?? 0)} a week on average (threshold $5,000).`);
  const early = s.ceilings.find(c => c.season === 1);
  if (early && early.squad > 0 && early.at / early.squad > 0.2) out.push(`WARNING: players are hitting their stat ceilings early. ${pct(early.at / early.squad)} of the season-1 squad cannot gain another point.`);
  if (s.stars.medianWeeks !== null && s.stars.medianWeeks < 8 && s.stars.gained >= 5) out.push(`WARNING: XP looks steep. The median opening player who gains a star does it in ${fmt(s.stars.medianWeeks)} weeks (threshold 8).`);
  if (s.completedSeasons >= 3 && s.stars.tracked > 0 && s.stars.gained / s.stars.tracked < 0.25) out.push(`WARNING: XP looks flat. Only ${pct(s.stars.gained / s.stars.tracked)} of opening players gained a star.`);
  return out;
}
function groupRuns(runs: readonly SoakResult[], key: string): SoakResult[] {
  return runs.filter(r => r.persona && r.career && `${r.persona.id}/${r.difficulty ?? 'normal'}/${r.pack ?? 'au'}${r.liveRivals ? '/live-rivals' : ''}` === key);
}
const weekLabel = (d: { season: number; week: number; phase: string }): string =>
  d.phase.startsWith('trial') ? `S${d.season} ${d.phase}` : d.phase === 'final' ? `S${d.season} W${d.week} final` : `S${d.season} W${d.week}`;
function weeklyMean(rows: DiaryRow[][]): { elapsed: number; season: number; week: number; phase: string; n: number; cash: number; delta: number; xp: number; levels: number; overall: number; bestNine: number; debt: number; winRate: number | null }[] {
  const max = Math.max(0, ...rows.map(r => r.length));
  const out = [];
  for (let i = 0; i < max; i++) {
    const xs = rows.flatMap(r => r[i] ? [r[i]!] : []);
    const played = xs.filter(x => x.match.startsWith('W') || x.match.startsWith('L ') || x.match.startsWith('D ') || x.match === 'W' || x.match === 'L' || x.match === 'D');
    out.push({
      elapsed: xs[0]?.elapsed ?? i + 1, season: xs[0]?.season ?? 0, week: xs[0]?.week ?? 0, phase: xs[0]?.phase ?? '', n: xs.length,
      cash: mean(xs.map(x => x.cash)) ?? 0, delta: mean(xs.map(x => x.cashDelta)) ?? 0, xp: mean(xs.map(x => x.xpGained)) ?? 0,
      levels: mean(xs.map(x => x.levelUps)) ?? 0, overall: mean(xs.map(x => x.squadOverall)) ?? 0, bestNine: mean(xs.map(x => x.bestNine)) ?? 0,
      debt: xs.filter(x => x.inDebt).length / xs.length,
      winRate: played.length ? played.filter(x => x.match.startsWith('W')).length / played.length : null,
    });
  }
  return out;
}
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const DIARY_HEAD = ['series', 'season', 'week', 'elapsed', 'phase', 'n', 'training_focus', 'points_spent', 'points_on', 'points_left', 'signings', 'releases', 'action_facilities', 'staff', 'action_events', 'tactics', 'set_plays', 'calling', 'calls_made', 'match', 'ladder', 'premiers', 'cash', 'cash_delta', ...FINANCE_LINES.map(k => `cash_${k}`), 'xp_gained', 'xp_training', 'xp_match', 'level_ups', 'stars_gained', 'squad_overall', 'best_nine', 'top_overall', 'at_ceiling', 'squad_size', 'in_debt'];
function diaryCells(series: string, d: DiaryRow, n = 1): (string | number)[] {
  return [series, d.season, d.week, d.elapsed, d.phase, n, d.focus, d.pointsSpent, d.pointsOn, d.pointsLeft, d.signings, d.releases, d.facilities, d.staff, d.events, d.tactics, d.setPlays, d.calling, d.callsMade, d.match, d.ladder ?? '', d.premiers ? 'yes' : '', Math.round(d.cash), Math.round(d.cashDelta), ...FINANCE_LINES.map(k => Math.round(d.finance[k])), Math.round(d.xpGained), Math.round(d.xpTraining), Math.round(d.xpMatch), d.levelUps, d.starsGained, d.squadOverall.toFixed(1), d.bestNine.toFixed(1), d.topOverall.toFixed(1), d.atCeiling, d.squadSize, d.inDebt ? 'yes' : ''];
}
/** One CSV per persona and difficulty: the lowest seed's week-by-week diary, then the average across seeds. */
export function personaDiaryFiles(runs: readonly SoakResult[]): { name: string; csv: string }[] {
  const summary = summarisePersonas(runs);
  return summary.map(s => {
    const group = groupRuns(runs, s.key);
    const seed = Math.min(...group.map(r => r.seed));
    const rep = group.find(r => r.seed === seed)!;
    const lines = [DIARY_HEAD.join(',')];
    for (const d of rep.career?.diary ?? []) lines.push(diaryCells(`seed-${seed}`, d).map(csvCell).join(','));
    const meanRows = weeklyMean(group.map(r => r.career?.diary ?? []));
    for (const w of meanRows) {
      const same = group.flatMap(r => r.career?.diary.filter(d => d.elapsed === w.elapsed) ?? []);
      const blank: DiaryRow = { elapsed: w.elapsed, season: w.season, week: w.week, phase: '', focus: '', pointsSpent: mean(same.map(d => d.pointsSpent)) ?? 0, pointsOn: '', pointsLeft: mean(same.map(d => d.pointsLeft)) ?? 0, signings: '', releases: '', facilities: '', staff: '', events: '', tactics: '', setPlays: '', calling: '', callsMade: mean(same.map(d => d.callsMade)) ?? 0, match: w.winRate === null ? '' : `${(w.winRate * 100).toFixed(0)}%`, ladder: mean(same.flatMap(d => d.ladder === null ? [] : [d.ladder])), premiers: false, cash: w.cash, cashDelta: w.delta, finance: Object.fromEntries(FINANCE_LINES.map(k => [k, mean(same.map(d => d.finance[k])) ?? 0])) as DiaryRow['finance'], xpGained: w.xp, xpTraining: mean(same.map(d => d.xpTraining)) ?? 0, xpMatch: mean(same.map(d => d.xpMatch)) ?? 0, levelUps: w.levels, starsGained: mean(same.map(d => d.starsGained)) ?? 0, squadOverall: w.overall, bestNine: w.bestNine, topOverall: mean(same.map(d => d.topOverall)) ?? 0, atCeiling: mean(same.map(d => d.atCeiling)) ?? 0, squadSize: mean(same.map(d => d.squadSize)) ?? 0, inDebt: false };
      const cells = diaryCells('average', blank, w.n);
      cells[cells.length - 1] = `${(w.debt * 100).toFixed(0)}%`;
      lines.push(cells.map(csvCell).join(','));
    }
    const [id, difficulty] = s.key.split('/');
    return { name: `${id}-${difficulty}.csv`, csv: lines.join('\n') + '\n' };
  });
}
export function personaReport(runs: readonly SoakResult[], comparison: ReturnType<typeof compareBaseline>, measured?: ReportMatch): string {
  const summary = summarisePersonas(runs);
  const lines = ['# AI persona career report', '',
    'Rule-based measurement only. Seed/config/difficulty/pack identify each career in JSON. Elapsed weeks include trials. Best-nine mean includes recruitment; it is not an individual training curve. Unreached thresholds are censored, not zero. Star and potential weeks are for the players who started the career. A star week is the first week that player\'s star rating went up. Potential weeks exclude anyone who was already at their potential stars.', '',
    measured
      ? `Match clock: ${measured.halves} halves of ${measured.halfMinutes} minutes, ${measured.totalMinutes} minutes of match time in total. Verified from \`fullMatch()\` (\`src/match/league/rules.ts\`), which reads \`rules.halfMinutes\` (${measured.halfMinutes}) and is passed into every persona \`runMatch\`. 40/20 is ${measured.fortyTwenty ? 'on' : 'off'}. ${measured.how}`
      : 'Match settings were not attached to this report.',
    '',
    'Money in these careers is the live weekly books (gate, wages, sponsors, facilities, events). The finance testing contract (#595) publishes salary, cap and match-income quotes, and those quotes are not what a career spends yet. Potential stars are visible on every player; there is no separate scout-fog concealment. The Scout Office still changes the free-agent pool and the signing fee, and the min-maxer builds one. Careers start on the current save and round-trip through the production importer (formats 24–27 are the supported new-career path). Watchability work is how the match is drawn; these runs play the same headless live sim and do not render it.',
    '',
    'Balance flags, not failures: money looks easy when a completed season ends more than $150,000 above the opening cash and nobody goes into debt; money looks hard when completed seasons end below zero; a solvency sacking in at least a quarter of careers is flagged on its own. Cash is climbing fast above $5,000 a week. Ceilings are early when more than 20% of a season-1 squad cannot take another point. XP is steep when the median star arrives in under 8 weeks, and flat when fewer than 25% of opening players gain a star in a run of three or more seasons. Broke means a bankruptcy warning (the balance went below zero; a forced sale is counted on that same warning) or a sacking for a missed solvency objective. A debt week is a week that ended below zero, which is what raises the warning.',
    '',
    'The diary splits XP into training and match. That split is an estimate rebuilt from the sheets and the weekly formula. It can fall short of XP gained when an event or a facility built the same week adds XP the estimate does not see. XP gained is the observed change.',
    '',
    table(['Persona / difficulty / pack', 'Runs', 'Regular wins / games', 'Final wins / games', 'Finals share (completed seasons)', 'Premierships', 'Mean ladder', 'Broke rate', 'End-season cash', 'Min cash'], summary.map(s => [s.key, s.runs, `${pct(s.regularWinRate)} / ${s.regularGames}`, `${pct(s.finalsWinRate)} / ${s.finalsGames}`, `${pct(s.finalsShare)} / ${s.completedSeasons}`, s.premierships, fmt(s.meanLadder, 1), pct(s.brokeRate), fmt(s.endSeasonMoney, 0), fmt(s.minMoney, 0)])), '',
    '## Baseline warnings', '', `Compared ${comparison.compared} matching endpoints. Baseline differences are warnings only. A different field length or half length does not match the checked baseline.`, '',
    ...(comparison.warnings.length ? comparison.warnings.map(w => `- ${w}`) : ['No baseline regressions.']), '',
    '## Progression, finance and health', '',
  ];
  for (const s of summary) {
    const group = groupRuns(runs, s.key);
    const seed = group.length ? Math.min(...group.map(r => r.seed)) : 0;
    const rep = group.find(r => r.seed === seed);
    const readings = balanceReadings(s);
    lines.push(`### ${s.key}`, '',
      ...Object.entries(s.progression).map(([t, p]) => `- ${t} overall (best nine, including recruitment): ${fmt(p.meanWeeks)} weeks; ${p.reached} reached, ${p.censored} censored.`),
      `- Opening players gaining a star: ${s.stars.gained} of ${s.stars.tracked}; median ${fmt(s.stars.medianWeeks)} weeks among those who did.`,
      `- Reaching potential stars: ${s.potential.reached} of ${s.potential.tracked} (${s.potential.already} already there at week 0); median ${fmt(s.potential.medianWeeks)} weeks among those who got there later.`,
      `- Stat ceilings at the season rollover: ${s.ceilings.map(c => `S${c.season} ${c.at}/${c.squad}`).join('; ')}.`,
      `- Mean XP per completed season ${fmt(s.xpPerSeason, 0)}; mean level-ups per completed season ${fmt(s.levelUpsPerSeason, 1)}.`,
      `- Cash: opening ${fmt(s.openingMoney, 0)}; mean weekly change ${fmt(s.weeklyCashDelta, 0)}; mean weeks in debt ${fmt(s.meanDebtWeeks, 1)}.`,
      `- Bankruptcy warnings: ${s.bankruptcyWarnings}; forced sales: ${s.forcedSales}; sacked with missed solvency objective: ${s.moneySackings}.`,
      `- Save round-trips: ${s.saveRoundTrips}; repairs: ${s.repairs}; unrecoverable: ${s.unrecoverableLoads}.`,
      `- Crashes: ${s.stability.crashes}; thrown ticks: ${s.stability.thrownTicks}; invariant failures: ${s.stability.invariants}; non-finite numbers: ${s.stability.nonFinite}.`,
      ...(readings.length ? readings.map(w => `- ${w}`) : ['- No balance flag on the thresholds above.']),
      '',
      table(['Mean completed-season finance line', '$'], FINANCE_LINES.map(k => [k, fmt(s.finance[k], 0)])), '',
      `Weekly diary for seed ${seed}. Cash is the balance after the week's decisions and the match. Full rows, and the average across seeds, are in the CSV.`, '',
      table(['Wk', 'Focus', 'Points', 'Cash', 'Change', 'XP', 'Levels', 'Squad', 'Match'], (rep?.career?.diary ?? []).map(d => [weekLabel(d), d.focus, d.pointsSpent ? `${d.pointsSpent} ${d.pointsOn}`.trim() : '0', cashShort(d.cash), cashShort(d.cashDelta), Math.round(d.xpGained), d.levelUps, d.squadOverall.toFixed(1), d.match])), '',
      'Mean across seeds, one row per week. Debt is the share of careers in the red. Win% ignores byes and forfeits.', '',
      table(['Wk', 'n', 'Cash', 'Change', 'XP', 'Levels', 'Squad', 'Best 9', 'Debt', 'Win%'], weeklyMean(group.map(r => r.career?.diary ?? [])).map(w => [weekLabel(w), w.n, cashShort(w.cash), cashShort(w.delta), Math.round(w.xp), w.levels.toFixed(2), w.overall.toFixed(1), w.bestNine.toFixed(1), pct(w.debt), pct(w.winRate)])), '',
      'Attack × opposing defence and taken-play win share versus the rest. Draws count as half; trials and forfeits are excluded. WARNING requires ≥10 games in both groups and ≥15 percentage points difference. These are observational, confounded by squad/difficulty and co-selected plays; they do not prove a balance defect.', '',
      table(['Cell', 'Games', 'Win share', 'Rest games', 'Rest win share', 'Difference', 'Flag'], [...s.strategies, ...s.plays].map(o => [o.cell, o.games, pct(o.winShare), o.restGames, pct(o.restWinShare), pct(o.difference), o.warning ? 'WARNING' : ''])), '');
  }
  lines.push('## Per career', '');
  for (const r of runs) {
    if (!r.career || !r.persona) continue;
    const c = r.career;
    const single = summarisePersonas([r])[0]!;
    lines.push(`### ${r.persona.id} / ${r.difficulty ?? 'normal'} / ${r.pack ?? 'au'} / seed ${r.seed}`, '',
      `Regular: ${pct(single.regularWinRate)} wins / ${single.regularGames} games; finals: ${pct(single.finalsWinRate)} wins / ${single.finalsGames} games; finals share: ${pct(single.finalsShare)} / ${single.completedSeasons} completed seasons. Weeks: ${c.weeks}; to 70/80/90: ${Object.values(c.weeksToOverall).map(w => w ?? 'unreached').join(' / ')}; broke: ${c.broke}; weeks in debt: ${c.debtWeeks}. Opening players gaining a star: ${c.stars.gained}/${c.stars.tracked}.`, '',
      table(['Season', 'Completed', 'End cash', 'Minimum cash', ...FINANCE_LINES], c.seasons.map(s => [s.season, String(s.completed), fmt(s.money, 0), fmt(s.minMoney, 0), ...FINANCE_LINES.map(k => fmt(s.finance[k], 0))])), '',
      `Save round-trips: ${c.saves.length}; repairs: ${c.saves.reduce((n, s) => n + s.repairs.length, 0)}; unrecoverable: ${c.saves.filter(s => !s.ok).length}. Stability: ${JSON.stringify(c.stability)}.`, '',
      ...c.saves.flatMap(s => [...s.repairs.map(p => `- S${s.season} repair ${p.field}: ${p.problem} → ${p.repair}`), ...(!s.ok ? [`- S${s.season} unloadable: ${s.message}`] : [])]),
      ...r.problems.map(p => `- ${p}`), '');
  }
  return lines.join('\n');
}
