import { currentRound } from '../../core/season';
import { bus, type Events } from '../../core/events';
import { FINANCE_LINES, getState, loadState, type FinanceLine, type GameState, type Player, type PlacedFacility } from '../../core/state';
import { importSave } from '../../core/save';
import { PROGRESSION } from '../../config';
import { isFinalsRound, finalsSeeds } from '../../systems/fixtures';
import { classifyReason } from '../../systems/economy';
import { overallRating, playerStars, shownStats } from '../../data/player';
import { ageMod, facilityXpMultiplier, injuryMult, traitMult } from '../../systems/training';
import { foldEvents, playerOfTheMatch } from '../../systems/stats';
import { potentialStars } from '../../systems/potential';
import { DEFAULT_TACTICS, type TeamTactics } from '../../match/league/presets';
import type { PlayId } from '../../data/plays';
import type { SaveRepair } from '../../core/saveValidation';
import type { MatchResult, TeamSheet } from '../../sim/events';
import type { WeekLog } from './types';

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
  scoreFor?: number;
  scoreAgainst?: number;
  opponentName?: string;
  callsMade?: number;
}
export interface CashSample { elapsedWeek: number; season: number; week: number; money: number; bestNine: number }
export interface SeasonPlayer {
  name: string; position: string; totalXp: number; level: number; stars: number; potential: number; overall: number; atCeiling: boolean;
}
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
  ladder: number | null;
  premiership: boolean;
  debtWeeks: number;
  squadOverall: number;
  topOverall: number;
  bestNine: number;
  atCeiling: number;
  squadSize: number;
  xpGained: number;
  xpTraining: number;
  xpMatch: number;
  levelUps: number;
  pointsSpent: number;
  starsGained: number;
  players: SeasonPlayer[];
}
export interface DiaryRow {
  elapsed: number;
  season: number;
  week: number;
  phase: string;
  focus: string;
  pointsSpent: number;
  pointsOn: string;
  pointsLeft: number;
  signings: string;
  releases: string;
  facilities: string;
  staff: string;
  events: string;
  tactics: string;
  setPlays: string;
  calling: string;
  callsMade: number;
  match: string;
  ladder: number | null;
  premiers: boolean;
  cash: number;
  cashDelta: number;
  finance: Record<FinanceLine, number>;
  xpGained: number;
  xpTraining: number;
  xpMatch: number;
  levelUps: number;
  starsGained: number;
  squadOverall: number;
  bestNine: number;
  topOverall: number;
  atCeiling: number;
  squadSize: number;
  inDebt: boolean;
}
export interface ProgressClock { tracked: number; gained: number; weeks: number[]; already: number }
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
  diary: DiaryRow[];
  debtWeeks: number;
  stars: ProgressClock;
  potential: ProgressClock;
  bankruptcyWarnings: number;
  forcedSales: number;
  moneySackings: number;
  broke: boolean;
  saves: SaveHealth[];
  stability: { crashes: number; thrownTicks: number; invariantFailures: number; nonFinite: number };
}
const emptyFinance = (): Record<FinanceLine, number> => Object.fromEntries(FINANCE_LINES.map(k => [k, 0])) as Record<FinanceLine, number>;
const totalXp = (p: Pick<Player, 'level' | 'xp'>): number => ((p.level ?? 1) - 1) * PROGRESSION.XP_PER_LEVEL + (p.xp ?? 0);
export function playerAtCeiling(p: Player): boolean {
  return shownStats(p.position).every(k => (p.ceilings?.[k] ?? p.stats[k]) - p.stats[k] < 1);
}
const squadOverall = (squad: readonly Player[]): number => squad.length ? squad.reduce((n, p) => n + overallRating(p), 0) / squad.length : 0;
const topOverall = (squad: readonly Player[]): number => squad.reduce((n, p) => Math.max(n, overallRating(p)), 0);
const STAT_ORDER = ['speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'] as const;

interface Snap {
  id: string; name: string; totalXp: number; level: number; unspent: number; stars: number; potential: number;
  age: number; traits: Player['traits']; injuredWeeks: number; stats: Player['stats']; position: Player['position'];
}
const snapOf = (p: Player): Snap => ({
  id: p.id, name: p.name, totalXp: totalXp(p), level: p.level ?? 1, unspent: p.unspentPoints ?? 0,
  stars: playerStars(p), potential: p.ceilings ? potentialStars(p) : playerStars(p),
  age: p.age, traits: p.traits, injuredWeeks: p.injuredWeeks, stats: { ...p.stats }, position: p.position,
});
const awarded = (base: number, p: Pick<Snap, 'age' | 'traits'>, facilities: readonly PlacedFacility[]): number =>
  Math.max(0, base) * ageMod(p.age) * traitMult({ traits: p.traits } as Player) * facilityXpMultiplier(facilities);

function matchBase(id: string, own: TeamSheet, result: MatchResult, homeId: string, awayId: string): number {
  const starters = new Set((own.roster ?? []).map(p => p.id).filter((x): x is string => !!x));
  const bench = new Set((own.bench ?? []).map(p => p.id).filter((x): x is string => !!x));
  if (!starters.has(id) && !bench.has(id)) return 0;
  const name = [...(own.roster ?? []), ...(own.bench ?? [])].find(p => p.id === id)?.name;
  const tally = name ? foldEvents(result.events, own.clubId).get(name) : undefined;
  const potm = playerOfTheMatch(result, homeId, awayId);
  return (starters.has(id) ? PROGRESSION.STARTER_XP : PROGRESSION.BENCH_XP)
    + (tally?.tries ?? 0) * PROGRESSION.TRY_XP + (tally?.lineBreaks ?? 0) * PROGRESSION.LINE_BREAK_XP
    + (potm && potm.teamId === own.clubId && potm.name === name ? PROGRESSION.POTM_XP : 0);
}

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
    weeks: 0, weeksToOverall: { '70': null, '80': null, '90': null }, cash: [], seasons: [], matches: [], diary: [],
    debtWeeks: 0, stars: { tracked: 0, gained: 0, weeks: [], already: 0 }, potential: { tracked: 0, gained: 0, weeks: [], already: 0 },
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
  let weekFinance = emptyFinance();
  let madeFinals = false;
  let active: Events['match:started'] | undefined;
  let expected: { season: number; round: number; tactics: TeamTactics } | undefined;
  let matched = false;
  let weekMatch: { own: TeamSheet; result: MatchResult; homeId: string; awayId: string; forfeit: boolean } | null = null;
  let opened: { season: number; week: number; preseason: number; squad: Snap[]; facilities: PlacedFacility[]; money: number } | null = null;
  let weekStartMoney: number | null = null;
  let weekForced = 0;
  const cohort = new Map<string, { startStars: number; starWeek: number | null; potentialWeek: number | null }>();
  for (const p of getState().squad) {
    const stars = playerStars(p);
    cohort.set(p.id, { startStars: stars, starWeek: null, potentialWeek: p.ceilings && stars >= potentialStars(p) ? 0 : null });
  }
  const publishCohort = (): void => {
    const starWeeks = [...cohort.values()].flatMap(c => c.starWeek === null ? [] : [c.starWeek]);
    const pot = [...cohort.values()].flatMap(c => c.potentialWeek === null ? [] : [c.potentialWeek]);
    metrics.stars = { tracked: cohort.size, gained: starWeeks.length, weeks: starWeeks, already: 0 };
    metrics.potential = { tracked: cohort.size, gained: pot.length, weeks: pot.filter(w => w > 0), already: pot.filter(w => w === 0).length };
  };
  const off = [
    bus.on('money:changed', e => {
      minMoney = Math.min(minMoney, e.balance);
      const line = classifyReason(e.reason);
      finance[line] += e.delta;
      weekFinance[line] += e.delta;
    }),
    bus.on('bankruptcy:warning', e => {
      metrics.bankruptcyWarnings++; metrics.forcedSales += e.forcedSales?.length ?? 0; weekForced += e.forcedSales?.length ?? 0; metrics.broke = true;
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
      const callsMade = result.calls ? result.calls.made[home ? 0 : 1] : 0;
      metrics.matches.push({ season: s.season, round: fixture.round,
        kind: fixture.round <= 0 ? 'trial' : isFinalsRound(fixture.round) ? 'final' : 'regular',
        win: ours > theirs, draw: ours === theirs, forfeit: false,
        tactics: { ...(own.tactics ?? DEFAULT_TACTICS) }, opponent: { ...(opponent.tactics ?? DEFAULT_TACTICS) },
        takenPlays: [...(own.plays ?? [])], scoreFor: ours, scoreAgainst: theirs, opponentName: opponent.name, callsMade,
      });
      weekMatch = { own, result, homeId: fixture.homeId, awayId: fixture.awayId, forfeit: false };
      matched = true; active = undefined;
    }),
    bus.on('ui:notify', e => {
      if (!expected || matched || e.kind !== 'danger' || !/ forfeited \(\d+–\d+\)\.$/.test(e.text)) return;
      metrics.matches.push({ season: expected.season, round: expected.round,
        kind: expected.round <= 0 ? 'trial' : isFinalsRound(expected.round) ? 'final' : 'regular',
        win: false, draw: false, forfeit: true, tactics: expected.tactics, opponent: { ...DEFAULT_TACTICS }, takenPlays: [],
        scoreFor: 0, scoreAgainst: 0, opponentName: '', callsMade: 0 });
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
  function openWeek(): void {
    weekStartMoney = getState().money;
    weekFinance = emptyFinance();
    weekForced = 0;
    weekMatch = null;
  }
  function beforeWeek(): void {
    const s = getState();
    if (weekStartMoney === null) openWeek();
    const round = currentRound(s);
    const f = s.league.fixtures.find(f => f.round === round && !f.result && (f.homeId === s.clubId || f.awayId === s.clubId));
    expected = f ? { season: s.season, round: f.round, tactics: { ...s.lineup.tactics } } : undefined;
    matched = false;
    weekMatch = null;
    opened = { season: s.season, week: s.week, preseason: s.preseason ?? 0, squad: s.squad.map(snapOf), facilities: s.facilities.map(f => ({ ...f })), money: s.money };
  }
  function playerRow(p: Player): SeasonPlayer {
    return { name: p.name, position: p.position, totalXp: totalXp(p), level: p.level ?? 1, stars: playerStars(p),
      potential: p.ceilings ? potentialStars(p) : playerStars(p), overall: overallRating(p), atCeiling: playerAtCeiling(p) };
  }
  function seasonSample(completed: boolean): CareerSeason {
    const s = getState();
    const rows = metrics.diary.filter(d => d.season === currentSeason);
    const history = s.history.find(h => h.season === currentSeason);
    const ladder = history?.ladderPosition ?? (s.league.ladder.findIndex(r => r.clubId === s.clubId) + 1 || null);
    return { season: currentSeason, completed, elapsedWeeks: metrics.weeks, broke: metrics.broke,
      failures: metrics.stability.crashes + metrics.stability.invariantFailures, money: s.money, minMoney, finance: { ...finance }, madeFinals,
      ladder, premiership: history?.premiership ?? false, debtWeeks: rows.filter(d => d.inDebt).length,
      squadOverall: squadOverall(s.squad), topOverall: topOverall(s.squad), bestNine: rating(s),
      atCeiling: s.squad.filter(playerAtCeiling).length, squadSize: s.squad.length,
      xpGained: rows.reduce((n, d) => n + d.xpGained, 0), xpTraining: rows.reduce((n, d) => n + d.xpTraining, 0),
      xpMatch: rows.reduce((n, d) => n + d.xpMatch, 0), levelUps: rows.reduce((n, d) => n + d.levelUps, 0),
      pointsSpent: rows.reduce((n, d) => n + d.pointsSpent, 0), starsGained: rows.reduce((n, d) => n + d.starsGained, 0),
      players: s.squad.map(playerRow) };
  }
  function afterWeek(log?: WeekLog): void {
    const s = getState();
    metrics.weeks++;
    minMoney = Math.min(minMoney, s.money);
    if (opened) {
      const snap = opened;
      const before = new Map(snap.squad.map(p => [p.id, p]));
      let pointsSpent = 0, pointsLeft = 0, xpGained = 0, xpTraining = 0, xpMatch = 0, levelUps = 0, starsGained = 0;
      const on: Record<string, number> = {};
      for (const p of s.squad) {
        pointsLeft += p.unspentPoints ?? 0;
        const b = before.get(p.id);
        const bLevel = b?.level ?? 1;
        const bUnspent = b?.unspent ?? 0;
        const gainedPts = ((p.level ?? 1) - bLevel) * PROGRESSION.POINTS_PER_LEVEL;
        pointsSpent += bUnspent + gainedPts - (p.unspentPoints ?? 0);
        levelUps += Math.max(0, (p.level ?? 1) - bLevel);
        xpGained += totalXp(p) - (b?.totalXp ?? 0);
        if (b && playerStars(p) > b.stars) starsGained++;
        if (b) for (const k of STAT_ORDER) {
          const up = Math.round(p.stats[k] - b.stats[k]);
          if (up > 0) on[k] = (on[k] ?? 0) + up;
        }
        if (b) {
          xpTraining += awarded(PROGRESSION.WEEKLY_XP * injuryMult({ injuredWeeks: b.injuredWeeks } as Player), b, snap.facilities);
          if (weekMatch && !weekMatch.forfeit) xpMatch += awarded(matchBase(p.id, weekMatch.own, weekMatch.result, weekMatch.homeId, weekMatch.awayId), b, snap.facilities);
        }
        const mark = cohort.get(p.id);
        if (mark) {
          if (mark.starWeek === null && playerStars(p) > mark.startStars) mark.starWeek = metrics.weeks;
          if (mark.potentialWeek === null && p.ceilings && playerStars(p) >= potentialStars(p)) mark.potentialWeek = metrics.weeks;
        }
      }
      const openedSeason = snap.season;
      const expectedRound = expected?.round;
      const played = expectedRound !== undefined ? [...metrics.matches].reverse().find(m => m.season === openedSeason && m.round === expectedRound) : undefined;
      const matchText = !played ? 'no match' : played.forfeit ? 'forfeit'
        : `${played.win ? 'W' : played.draw ? 'D' : 'L'}${played.scoreFor !== undefined ? ` ${played.scoreFor}-${played.scoreAgainst}` : ''}${played.opponentName ? ` ${played.opponentName}` : ''}`;
      const history = s.season !== snap.season ? s.history.find(h => h.season === snap.season) : undefined;
      const ladder = history?.ladderPosition ?? (s.league.ladder.findIndex(r => r.clubId === s.clubId) + 1 || null);
      const departed = snap.squad.filter(p => !s.squad.some(q => q.id === p.id)).map(p => p.name);
      const releases = [...(log?.releases ?? [])];
      if (weekForced && departed.length) releases.push(`force-sold ${departed.join(', ')}`);
      else if (departed.length) releases.push(`left ${departed.join(', ')}`);
      const phase = snap.preseason > 0 ? `trial ${snap.preseason}` : isFinalsRound(expected?.round ?? snap.week) ? 'final' : 'regular';
      const row: DiaryRow = {
        elapsed: metrics.weeks, season: snap.season, week: snap.week, phase,
        focus: log?.focus || s.training?.focus || 'balanced',
        pointsSpent, pointsOn: STAT_ORDER.filter(k => on[k]).map(k => `${k} ${on[k]}`).join(', '), pointsLeft,
        signings: (log?.signings ?? []).join('; '), releases: releases.join('; '), facilities: (log?.facilities ?? []).join('; '),
        staff: (log?.staff ?? []).join('; '), events: (log?.events ?? []).join('; '), tactics: log?.tactics || `${s.lineup.tactics.attack}/${s.lineup.tactics.defence}`,
        setPlays: (log?.setPlays ?? s.lineup.plays).join(' '), calling: log?.calling ?? 'none', callsMade: played?.callsMade ?? 0,
        match: matchText, ladder, premiers: history?.premiership ?? false,
        cash: s.money, cashDelta: s.money - (weekStartMoney ?? snap.money), finance: { ...weekFinance },
        xpGained, xpTraining, xpMatch, levelUps, starsGained,
        squadOverall: squadOverall(s.squad), bestNine: rating(s), topOverall: topOverall(s.squad),
        atCeiling: s.squad.filter(playerAtCeiling).length, squadSize: s.squad.length, inDebt: s.money < 0,
      };
      metrics.diary.push(row);
      metrics.debtWeeks = metrics.diary.filter(d => d.inDebt).length;
      publishCohort();
    }
    if (s.season !== currentSeason) {
      metrics.seasons.push(seasonSample(true));
      currentSeason = s.season;
      seasonStartElapsed = metrics.weeks;
      minMoney = s.money; finance = emptyFinance(); madeFinals = false;
    } else if (s.week > 1 && finalsSeeds(s).includes(s.clubId) && s.league.fixtures.some(f => isFinalsRound(f.round))) madeFinals = true;
    weekStartMoney = null;
    weekFinance = emptyFinance();
    weekForced = 0;
    opened = null;
    sample();
  }
  return {
    metrics, openWeek, beforeWeek, afterWeek,
    finish(): void {
      publishCohort();
      // Include an unfinished/sacked season; never quietly discard its money or games.
      if (!metrics.seasons.length || metrics.weeks > seasonStartElapsed || Object.values(finance).some(n => n !== 0)) metrics.seasons.push(seasonSample(false));
    },
    dispose(): void { off.forEach(stop => stop()); },
  };
}
