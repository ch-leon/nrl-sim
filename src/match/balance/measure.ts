// src/match/balance/measure.ts — play one cell of an experiment (a variant on
// a scenario) over its seeds, headless, and count what happened per match.
// By default each seed is a whole match (two 9:00 halves to full time); a plan
// or scenario can ask for a single stretch of N minutes instead, whose counts
// are scaled to an 18-minute match so they still read against the §7 targets.
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { TICK_S } from '../core/engine';
import type { SimEvent } from '../core/snapshot';
import { LEGS_ENERGY } from '../league/fatigue';
import { LiveSim } from '../league/live';
import { aiCoachSides, type CallInput } from '../league/calls';
import { fullMatch, type MatchLength } from '../league/rules';
import { DEFAULT_TACTICS } from '../league/presets';
import { applyTuning } from '../league/tuning';
import { labSheet, starTraits } from '../lab/sheets';
import type { Cell, SideSpec } from './plan';

export const MATCH_MINUTES = 18;
const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const BENCH_POSITIONS = ['prop', 'second-row', 'centre', 'halfback'] as const;

/** Count metrics, per match (or per 18 minutes of a shorter stretch). */
export const COUNTS = [
  'tackles', 'bigHits', 'busts', 'lateBusts', 'fends', 'steps', 'breaks', 'offloads', 'errors', 'kicks', 'tries',
  'intercepts', 'strips', 'quickPtb', 'slowPtb', 'gassed', 'wrestles', 'held1', 'held2', 'held3',
  'runDowns', 'blown', 'subs', 'goals', 'goalMisses', 'fieldGoals', 'fgMisses', 'chargeDowns', 'bonusTries',
  'touchFinds', 'fortyTwenties', 'onTheFull', 'bundled', 'deadBalls', 'dropOuts', 'kickMetres',
  'penalties', 'sixAgains', 'penaltyGoals', 'penGoalMisses', 'offsides', 'highShots', 'penTaps', 'penTouch', 'penShots', 'penConcededHome', 'penConcededAway',
  'lostInContact', 'injuries', 'lineBreaks', 'coachCalls', 'callsPaid', 'completion',
  'sinBins', 'shortMin', 'binSwing', 'points', 'margin',
] as const;
export type CountKey = (typeof COUNTS)[number];

export interface Stat {
  mean: number;
  /** Standard error of the mean over the seeds (how much of a difference is just luck). */
  se: number;
}

export interface CellResult {
  variant: string;
  scenario: string;
  tuning: Record<string, number>;
  seeds: number;
  minutes: number;
  counts: Record<CountKey, Stat>;
  /** Mean wrestle length, seconds. */
  wrestleSecs: number;
  /** Home side's share of matches won / drawn on points. */
  homeWin: number;
  draw: number;
  /** Average legs (0..1) per side at each 3-minute mark of the match clock. */
  legs: { minute: number; home: number; away: number }[];
  /** Wall-clock seconds this cell took. */
  ms: number;
}

/** A team sheet for one side of a scenario. */
export function sideSheet(id: string, spec: SideSpec): TeamSheet {
  const tactics = { ...DEFAULT_TACTICS, ...(spec.tactics ?? {}) };
  const bench = spec.bench ?? 4;
  const rotation = spec.rotation ?? 'standard';
  if (spec.club) {
    const s = labSheet(spec.club, spec.traits ?? 'gen', spec.tactics ?? {});
    return { ...s, clubId: `${s.clubId}:${id}`, bench: (s.bench ?? []).slice(0, bench), rotation };
  }
  const r = spec.rating ?? 60;
  const entry = (position: RosterEntry['position'], name: string, key: string): RosterEntry => {
    const e: RosterEntry = { name, position, stats: { speed: r, strength: r, stamina: r, skill: r, footyIQ: r, ...(spec.stats ?? {}) } };
    if (spec.traits === 'stars') e.traits = starTraits(position, key);
    return e;
  };
  const roster = POSITIONS.map((position, i) => entry(position, `${id} ${position} ${i}`, `${id}:${i}`));
  const reserves = BENCH_POSITIONS.slice(0, bench).map((position, i) => entry(position, `${id} bench ${position} ${i}`, `${id}:bench:${i}`));
  return { clubId: id, name: id, attack: r, defense: r, kicking: r, fitness: r, colors: ['#111', '#eee'], roster, bench: reserves, rotation, tactics };
}

const LATE = (e: SimEvent): boolean => e.kind === 'break-tackle' && e.detail === 'wrestle';

/** Per-match counts from one match's events. */
function countEvents(es: readonly SimEvent[]): Record<CountKey, number> {
  const c = Object.fromEntries(COUNTS.map((k) => [k, 0])) as Record<CountKey, number>;
  for (const e of es) {
    switch (e.kind) {
      case 'tackle':
        c.tackles++;
        break;
      case 'big-hit':
        c.tackles++;
        c.bigHits++;
        break;
      case 'break-tackle':
        if (LATE(e)) c.lateBusts++;
        else c.busts++;
        c.breaks++;
        break;
      case 'fend':
        c.fends++;
        c.breaks++;
        break;
      case 'step':
        c.steps++;
        c.breaks++;
        break;
      case 'offload':
        c.offloads++;
        break;
      case 'error':
      case 'drop':
        c.errors++;
        if (e.detail === 'contact') c.lostInContact++;
        break;
      case 'injury':
        c.injuries++;
        break;
      case 'line-break':
        c.lineBreaks++;
        break;
      case 'coach-call':
        c.coachCalls++;
        break;
      case 'call-paid':
        c.callsPaid++;
        break;
      case 'kick':
        c.kicks++;
        break;
      case 'try':
        c.tries++;
        if (e.detail === 'bonus') c.bonusTries++;
        break;
      case 'intercept':
        c.intercepts++;
        break;
      case 'strip':
        c.strips++;
        break;
      case 'quick-ptb':
        c.quickPtb++;
        break;
      case 'slow-ptb':
        c.slowPtb++;
        break;
      case 'gassed':
        c.gassed++;
        break;
      case 'run-down':
        c.runDowns++;
        break;
      case 'blown':
        c.blown++;
        break;
      case 'touch':
        if (e.detail === 'kick') c.touchFinds++;
        else if (e.detail === 'bundled') c.bundled++;
        break;
      case '40-20':
        c.fortyTwenties++;
        c.touchFinds++;
        break;
      case 'on-full':
        c.onTheFull++;
        break;
      case 'dead-ball':
        c.deadBalls++;
        break;
      case 'drop-out':
        c.dropOuts++;
        break;
      case 'penalty':
        c.penalties++;
        if (e.detail === 'offside') c.offsides++;
        else if (e.detail === 'high') c.highShots++;
        if (e.side === 'home') c.penConcededHome++;
        else c.penConcededAway++;
        break;
      case 'penalty-choice':
        if (e.detail === 'tap') c.penTaps++;
        else if (e.detail === 'touch') c.penTouch++;
        else c.penShots++;
        break;
      case 'penalty-goal':
        if (e.detail === 'good') c.penaltyGoals++;
        else c.penGoalMisses++;
        break;
      case 'six-again':
        c.sixAgains++;
        break;
      case 'interchange':
        c.subs++;
        break;
      case 'sin-bin':
        c.sinBins++;
        break;
      case 'conversion':
        if (e.detail === 'good') c.goals++;
        else c.goalMisses++;
        break;
      case 'field-goal':
        if (e.detail === 'good') c.fieldGoals++;
        else c.fgMisses++;
        break;
      case 'charge-down':
        c.chargeDowns++;
        break;
      default:
        break;
    }
  }
  return c;
}

/** Points a scoring event is worth, by the side named on it. */
export function pointsOf(e: SimEvent): number {
  if (e.kind === 'try') return e.detail === 'bonus' ? 5 : 4;
  if (e.detail !== 'good') return 0;
  if (e.kind === 'conversion' || e.kind === 'penalty-goal') return 2;
  return e.kind === 'field-goal' ? 1 : 0;
}

/**
 * The sin bins' swing (#71), taken a tick at a time while exactly one side is a
 * man short: the minutes of match clock that lasted (`shortMin`) and the points
 * the full side scored minus the short side's over them (`binSwing`). Spells
 * with a man off on both sides count for neither. The swing per bin is
 * binSwing / shortMin × BIN.minutes.
 */
export class BinSwing {
  shortS = 0;
  swing = 0;
  private lastS = 0;
  /** After a tick: `short` names the side alone a man short (null otherwise), `matchS` the clock, `es` the tick's events. */
  tick(short: 'home' | 'away' | null, matchS: number, es: readonly SimEvent[]): void {
    if (short) {
      this.shortS += matchS - this.lastS;
      for (const e of es) {
        const pts = pointsOf(e);
        if (pts === 0 || !e.side) continue;
        this.swing += e.side === short ? -pts : pts;
      }
    }
    this.lastS = matchS;
  }
}

function stat(xs: readonly number[]): Stat {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const varc = n > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  return { mean, se: Math.sqrt(varc / n) };
}

/** No match comes near this many ticks; it only guards against one that never finishes. */
const MAX_TICKS = 100_000;

/**
 * Play one cell: apply its tuning, run every seed, put the knobs back. Whole
 * matches unless the scenario (or else the plan) gives `minutes`: then one
 * stretch of that long from a kick-off.
 */
export function measureCell(cell: Cell, seeds: number, planMinutes?: number, seedStart = 1): CellResult {
  const t0 = Date.now();
  const stretch = cell.scenario.minutes ?? planMinutes;
  const restore = applyTuning(cell.variant.tuning ?? {});
  try {
    const length: MatchLength = stretch ? { halves: 1, halfMinutes: stretch } : fullMatch();
    const minutes = length.halves * length.halfMinutes;
    const scale = MATCH_MINUTES / minutes;
    const legsAt = cell.scenario.legs === undefined ? 1 : typeof cell.scenario.legs === 'number' ? cell.scenario.legs : LEGS_ENERGY[cell.scenario.legs];
    const home = sideSheet('H', cell.scenario.home);
    const away = sideSheet('A', cell.scenario.away);
    const perSeed: Record<CountKey, number>[] = [];
    let wrestleTicks = 0;
    let wrestleCount = 0;
    let wins = 0;
    let draws = 0;
    const legSum = new Map<number, { home: number; away: number }>();
    for (let s = seedStart; s < seedStart + seeds; s++) {
      // Coach calls (#73): each side makes the scenario's calls whenever it is allowed to.
      const callList: CallInput[] = [];
      const rules = cell.scenario.calls;
      // The AI coach (N9.6): the scenario's sides, or both when the variant turns calls.ai on.
      const aiSides = cell.scenario.aiCoach ?? aiCoachSides(['home', 'away']);
      const sim = new LiveSim(home, away, s, { energy: legsAt, length, ...(cell.scenario.weather ? { weather: cell.scenario.weather } : {}), ...(rules ? { calls: callList } : {}), ...(aiSides.length ? { aiCoach: aiSides } : {}) });
      const events: SimEvent[] = [];
      const held = [0, 0, 0, 0];
      const bins = new BinSwing();
      let inW = 0;
      let lastMen = 0;
      let nextLegs = 3;
      while (!sim.finished && sim.tick < MAX_TICKS) {
        if (rules) {
          for (const side of ['home', 'away'] as const) {
            const r = (rules[side] ?? []).find((x) => (x.tackle === undefined || x.tackle === sim.tackleCount) && sim.callRefusal(side, x.call) === null);
            if (r) callList.push({ tick: sim.tick + 1, side, call: r.call });
          }
        }
        sim.step();
        // Read the tick straight off the sim: building a snapshot every tick cost a third of the run.
        const tickEvents = sim.tickEvents;
        if (tickEvents.length) events.push(...tickEvents);
        const outH = sim.binnedOf('home') > 0;
        const outA = sim.binnedOf('away') > 0;
        bins.tick(outH !== outA ? (outH ? 'home' : 'away') : null, sim.matchSeconds, tickEvents);
        const men = sim.wrestleMen;
        if (men > 0) {
          inW++;
          lastMen = men;
        } else if (inW > 0) {
          wrestleTicks += inW;
          wrestleCount++;
          if (tickEvents.some((e) => e.kind === 'tackle')) held[Math.min(3, lastMen)]!++;
          inW = 0;
        }
        if (sim.matchSeconds >= nextLegs * 60) {
          // A legs reading every 3 minutes of the match clock.
          const acc = legSum.get(nextLegs) ?? { home: 0, away: 0 };
          acc.home += sim.energyOf('home');
          acc.away += sim.energyOf('away');
          legSum.set(nextLegs, acc);
          nextLegs += 3;
        }
      }
      const c = countEvents(events);
      c.wrestles = wrestleCount;
      c.held1 = held[1]!;
      c.held2 = held[2]!;
      c.held3 = held[3]!;
      c.kickMetres = sim.kickMetres.home + sim.kickMetres.away;
      c.shortMin = bins.shortS / 60;
      c.binSwing = bins.swing;
      // Completion is a share (%), not a count: not scaled to 18 minutes.
      const sets = sim.sets.home + sim.sets.away;
      c.completion = sets > 0 ? (100 * (sim.setsCompleted.home + sim.setsCompleted.away)) / sets : 0;
      // The score: both sides' points, and the winning margin.
      c.points = sim.points.home + sim.points.away;
      c.margin = Math.abs(sim.points.home - sim.points.away);
      wrestleCount = 0;
      perSeed.push(c);
      if (sim.points.home > sim.points.away) wins++;
      else if (sim.points.home === sim.points.away) draws++;
    }
    const counts = Object.fromEntries(COUNTS.map((k) => [k, stat(perSeed.map((c) => c[k] * (k === 'completion' ? 1 : scale)))])) as Record<CountKey, Stat>;
    const totalWrestles = perSeed.reduce((a, c) => a + c.wrestles, 0);
    return {
      variant: cell.variant.name,
      scenario: cell.scenario.name,
      tuning: { ...(cell.variant.tuning ?? {}) },
      seeds,
      minutes,
      counts,
      wrestleSecs: totalWrestles ? (wrestleTicks * TICK_S) / totalWrestles : 0,
      homeWin: wins / seeds,
      draw: draws / seeds,
      legs: [...legSum.entries()].map(([minute, v]) => ({ minute, home: v.home / seeds, away: v.away / seeds })),
      ms: Date.now() - t0,
    };
  } finally {
    restore();
  }
}
