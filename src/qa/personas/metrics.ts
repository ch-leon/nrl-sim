import { currentRound } from '../../core/season';
import { bus, type Events } from '../../core/events';
import { FINANCE_LINES, getState, loadState, type FinanceLine, type GameState } from '../../core/state';
import { importSave } from '../../core/save';
import { isFinalsRound, finalsSeeds } from '../../systems/fixtures';
import { classifyReason } from '../../systems/economy';
import { DEFAULT_TACTICS, type TeamTactics } from '../../match/league/presets';
import type { PlayId } from '../../data/plays';
import type { SaveRepair } from '../../core/saveValidation';

export interface CareerMatch {
  season: number;
  round: number;
  kind: 'trial' | 'regular' | 'final';
  win: boolean;
  draw: boolean;
  forfeit: boolean;
  tactics: TeamTactics;
  opponent: TeamTactics;
  takenPlays: PlayId[];
}
export interface CashSample { elapsedWeek: number; season: number; week: number; money: number; bestNine: number }
export interface CareerSeason {
  season: number;
  completed: boolean;
  elapsedWeeks: number;
  broke: boolean;
  failures: number;
  money: number;
  minMoney: number;
  finance: Record<FinanceLine, number>;
  madeFinals: boolean;
}
export interface SaveHealth {
  season: number;
  ok: boolean;
  repairs: SaveRepair[];
  changed: boolean;
  message?: string;
}
export interface CareerMetrics {
  weeks: number;
  weeksToOverall: Record<'70' | '80' | '90', number | null>;
  cash: CashSample[];
  seasons: CareerSeason[];
  matches: CareerMatch[];
  bankruptcyWarnings: number;
  forcedSales: number;
  moneySackings: number;
  broke: boolean;
  saves: SaveHealth[];
  stability: { crashes: number; thrownTicks: number; invariantFailures: number; nonFinite: number };
}
const emptyFinance = (): Record<FinanceLine, number> => Object.fromEntries(FINANCE_LINES.map(k => [k, 0])) as Record<FinanceLine, number>;

/** Uses the production parser, migrations and saveValidation; installs the loaded state too. */
export function careerRoundTrip(s: GameState, endedSeason: number): SaveHealth {
  const text = JSON.stringify(s);
  const back = importSave(text);
  if (!back.ok) return { season: endedSeason, ok: false, repairs: [], changed: false, message: back.message };
  const changed = JSON.stringify(back.state) !== text;
  loadState(back.state);
  return { season: endedSeason, ok: true, repairs: back.repairs, changed };
}

export function emptyCareerMetrics(): CareerMetrics {
  return {
    weeks: 0, weeksToOverall: { '70': null, '80': null, '90': null }, cash: [], seasons: [], matches: [],
    bankruptcyWarnings: 0, forcedSales: 0, moneySackings: 0, broke: false, saves: [],
    stability: { crashes: 0, thrownTicks: 0, invariantFailures: 0, nonFinite: 0 },
  };
}

/** Observation only; no game numbers or random draws change. Disposed after every career. */
export function observeCareer(rating: (s: GameState) => number) {
  const metrics = emptyCareerMetrics();
  let currentSeason = getState().season;
  let seasonStartElapsed = 0;
  let minMoney = getState().money;
  let finance = emptyFinance();
  let madeFinals = false;
  let active: Events['match:started'] | undefined;
  let expected: { season: number; round: number; tactics: TeamTactics } | undefined;
  let matched = false;
  const off = [
    bus.on('money:changed', e => {
      minMoney = Math.min(minMoney, e.balance);
      finance[classifyReason(e.reason)] += e.delta;
    }),
    bus.on('bankruptcy:warning', e => {
      metrics.bankruptcyWarnings++; metrics.forcedSales += e.forcedSales?.length ?? 0; metrics.broke = true;
    }),
    bus.on('board:sacked', e => {
      // Board reasons quote the failed objective; use its structured kind, not text matching.
      const cashFailure = getState().objectives.some(o => o.kind === 'solvent' && o.status === 'missed');
      if (e && cashFailure) { metrics.moneySackings++; metrics.broke = true; }
    }),
    bus.on('match:started', m => { active = m; }),
    bus.on('match:finished', ({ fixture, result }) => {
      const s = getState();
      if (!active || !(fixture.homeId === s.clubId || fixture.awayId === s.clubId)) return;
      const home = fixture.homeId === s.clubId;
      const own = home ? active.home : active.away;
      const opponent = home ? active.away : active.home;
      const ours = home ? result.homeScore : result.awayScore;
      const theirs = home ? result.awayScore : result.homeScore;
      metrics.matches.push({ season: s.season, round: fixture.round,
        kind: fixture.round <= 0 ? 'trial' : isFinalsRound(fixture.round) ? 'final' : 'regular',
        win: ours > theirs, draw: ours === theirs, forfeit: false,
        tactics: { ...(own.tactics ?? DEFAULT_TACTICS) }, opponent: { ...(opponent.tactics ?? DEFAULT_TACTICS) },
        takenPlays: [...(own.plays ?? [])],
      });
      matched = true; active = undefined;
    }),
    bus.on('ui:notify', e => {
      if (!expected || matched || e.kind !== 'danger' || !/ forfeited \(\d+–\d+\)\.$/.test(e.text)) return;
      metrics.matches.push({ season: expected.season, round: expected.round,
        kind: expected.round <= 0 ? 'trial' : isFinalsRound(expected.round) ? 'final' : 'regular',
        win: false, draw: false, forfeit: true, tactics: expected.tactics, opponent: { ...DEFAULT_TACTICS }, takenPlays: [] });
      matched = true;
    }),
  ];
  function sample(): void {
    const s = getState();
    const bestNine = rating(s);
    metrics.cash.push({ elapsedWeek: metrics.weeks, season: s.season, week: s.week, money: s.money, bestNine });
    for (const threshold of ['70', '80', '90'] as const) {
      if (metrics.weeksToOverall[threshold] === null && bestNine >= Number(threshold)) metrics.weeksToOverall[threshold] = metrics.weeks;
    }
  }
  sample();
  function beforeWeek(): void {
    const s = getState();
    const round = currentRound(s);
    const f = s.league.fixtures.find(f => f.round === round && !f.result && (f.homeId === s.clubId || f.awayId === s.clubId));
    expected = f ? { season: s.season, round: f.round, tactics: { ...s.lineup.tactics } } : undefined;
    matched = false;
  }
  function seasonSample(completed: boolean): CareerSeason {
    return { season: currentSeason, completed, elapsedWeeks: metrics.weeks, broke: metrics.broke,
      failures: metrics.stability.crashes + metrics.stability.invariantFailures, money: getState().money, minMoney, finance: { ...finance }, madeFinals };
  }
  function afterWeek(): void {
    const s = getState();
    metrics.weeks++;
    minMoney = Math.min(minMoney, s.money);
    if (s.season !== currentSeason) {
      metrics.seasons.push(seasonSample(true));
      currentSeason = s.season;
      seasonStartElapsed = metrics.weeks;
      minMoney = s.money; finance = emptyFinance(); madeFinals = false;
    } else if (s.week > 1 && finalsSeeds(s).includes(s.clubId) && s.league.fixtures.some(f => isFinalsRound(f.round))) madeFinals = true;
    sample();
  }
  return {
    metrics, beforeWeek, afterWeek,
    finish(): void {
      // Include an unfinished/sacked season; never quietly discard its money or games.
      if (!metrics.seasons.length || metrics.weeks > seasonStartElapsed || Object.values(finance).some(n => n !== 0)) metrics.seasons.push(seasonSample(false));
    },
    dispose(): void { off.forEach(stop => stop()); },
  };
}
