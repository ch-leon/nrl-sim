// src/match/balance/measure.ts — play one cell of an experiment (a variant on
// a scenario) over its seeds, headless, and count what happened per match.
// By default each seed is a whole match (two 7:00 halves to full time); a plan
// or scenario can ask for a single stretch of N minutes instead, whose counts
// are scaled to a 14-minute match so they still read against the §7 targets.
// A side is a flat squad, a league club's generated roster, or (N12.2) a squad
// built the way the game builds it, a new one every seed.
import type { RosterEntry, TeamSheet } from '../../sim/events';
import { LEAGUE, ON_FIELD, difficultyMultipliers } from '../../config';
import { createNewGame, type Player } from '../../core/state';
import { generatePlayerAround, overallRating } from '../../data/player';
import { makeRng } from '../../utils/rng';
import { autoPick, resolveLineup } from '../../systems/lineup';
import { generateRivalSquad, hashString, squadStrength } from '../../systems/rivals';
import { rivalMatchSheet } from '../../systems/matchday';
import { teamSheetFromSquad } from '../league/sheets';
import { rivalEdge, type DifficultyEdge } from '../league/spread';
import { TICK_S } from '../core/engine';
import type { SimEvent } from '../core/snapshot';
import { LEGS_ENERGY } from '../league/fatigue';
import { LiveSim, type PlanInput } from '../league/live';
import { aiCoachSides, type CallInput } from '../league/calls';
import { NINES, fullMatch, type MatchLength } from '../league/rules';
import { DEFAULT_TACTICS } from '../league/presets';
import { applyTuning } from '../league/tuning';
import { labSheet, starTraits } from '../lab/sheets';
import type { Cell, SideSpec } from './plan';

/** A full match: two halves. Stretches scale their counts up to this. */
export const MATCH_MINUTES = 2 * NINES.halfMinutes;
const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const BENCH_POSITIONS = ['prop', 'second-row', 'centre', 'halfback'] as const;

/** Count metrics, per match (or per MATCH_MINUTES of a shorter stretch). */
export const COUNTS = [
  'tackles', 'bigHits', 'busts', 'lateBusts', 'fends', 'steps', 'breaks', 'offloads', 'errors', 'kicks', 'tries',
  'intercepts', 'strips', 'quickPtb', 'slowPtb', 'gassed', 'wrestles', 'held1', 'held2', 'held3',
  'runDowns', 'blown', 'subs', 'goals', 'goalMisses', 'fieldGoals', 'fgMisses', 'chargeDowns', 'bonusTries',
  'touchFinds', 'fortyTwenties', 'onTheFull', 'bundled', 'deadBalls', 'dropOuts', 'kickMetres',
  'penalties', 'sixAgains', 'penaltyGoals', 'penGoalMisses', 'offsides', 'highShots', 'penTaps', 'penTouch', 'penShots', 'penConcededHome', 'penConcededAway',
  'lostInContact', 'injuries', 'lineBreaks', 'coachCalls', 'callsPaid', 'completion',
  'sinBins', 'shortMin', 'binSwing', 'points', 'margin', 'homeMargin', 'goldenPoint', 'goldenPointWon', 'draws',
  'bombs', 'bombsWon', 'bombsSpilled', 'grubbers', 'grubberTries', 'grubberRepeats', 'grubberDropouts', 'grubberTurnovers', 'kickTries',
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
  /** Home side's share of matches won / drawn on points, in the matchup as written. */
  homeWin: number;
  draw: number;
  /**
   * Win rate of the scenario's tracked side (N13). With `bothWays` it pools the
   * written matchup and the same seed with the sides swapped, so a preset's
   * rate is not just its home rate. Absent when the scenario tracks nobody.
   */
  trackedWin?: number;
  trackedDraw?: number;
  /** Matches the tracked rate is over (twice `seeds` when the scenario plays both ways). */
  trackedSeeds?: number;
  /** Average legs (0..1) per side at each 3-minute mark of the match clock. */
  legs: { minute: number; home: number; away: number }[];
  /** Squad-built sides (N12.2): each one's best nine (mean overall, the soak's rating), averaged over the seeds. */
  nine?: { home?: number; away?: number };
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

/** Mean overall of a squad's best nine: the soak's rating for the player's club, and a rival's strength before rounding (systems/rivals.ts). */
export function bestNine(squad: readonly Player[]): number {
  const best = squad.map(overallRating).sort((a, b) => b - a).slice(0, ON_FIELD);
  return best.reduce((a, b) => a + b, 0) / best.length;
}

/** How many rival squads a styled side may draw before the plan is called impossible. */
const STYLE_DRAWS = 500;

/**
 * A squad-built side for one squad seed (N12.2) and its best nine, built as
 * matchday.ts builds the two sides of the player's match: a new game's squad
 * through its opening lineup (resolveLineup and teamSheetFromSquad), or a
 * rival's generated squad as matchday's rivalMatchSheet fields it (his coach's
 * auto-pick and the style his nine gives him, N11). A rival with no `rating` is
 * built at `level`. Note: a `player` squad is a whole new game,
 * so the module's game state is that game afterwards (the soak does the same).
 */
export function squadSide(id: string, spec: SideSpec, seed: number, level: number = LEAGUE.MEAN): { sheet: TeamSheet; nine: number } {
  let squad: Player[];
  let sheet: TeamSheet;
  if (spec.squad === 'player') {
    const game = createNewGame(id, seed, { difficulty: spec.difficulty });
    squad = game.squad;
    let lineup = game.lineup;
    if (spec.noStar) {
      // The same squad with its star(s) swapped for a first-grader at his position, and the opening pick made again.
      const target = LEAGUE.START_FIRST_GRADE + difficultyMultipliers(spec.difficulty).startRating;
      const stars = new Set([...squad].sort((a, b) => overallRating(b) - overallRating(a)).slice(0, LEAGUE.START_STARS).map((p) => p.id));
      const rng = makeRng(seed ^ 0x5eed);
      squad = squad.map((p) => (stars.has(p.id) ? generatePlayerAround(rng, target, { position: p.position }) : p));
      lineup = autoPick(squad);
    }
    sheet = teamSheetFromSquad(squad, id, id, ['#111', '#eee'], resolveLineup(lineup, squad));
  } else {
    const strength = Math.round(spec.rating ?? level);
    // With a style, the first of this seed's draws whose nine reads as it (#322).
    for (let draw = 0; ; draw++) {
      squad = generateRivalSquad({ id: 'rival', strength }, draw === 0 ? seed : (hashString(`style:${draw}`) ^ seed) >>> 0);
      sheet = rivalMatchSheet({ id, name: id, colors: ['#111', '#eee'], strength: squadStrength(squad), squad });
      if (!spec.style || sheet.tactics?.attack === spec.style) break;
      if (draw >= STYLE_DRAWS) throw new Error(`no ${spec.style} rival squad in ${STYLE_DRAWS} draws at strength ${strength}`);
    }
  }
  const traits = (r: RosterEntry, key: string): RosterEntry => {
    if (!spec.traits || spec.traits === 'gen') return r;
    const { traits: _drop, ...rest } = r;
    return spec.traits === 'stars' ? { ...rest, traits: starTraits(r.position, key) } : rest;
  };
  sheet = {
    ...sheet,
    roster: (sheet.roster ?? []).map((r, i) => traits(r, `${id}:${i}`)),
    bench: (sheet.bench ?? []).slice(0, spec.bench ?? 4).map((r, i) => traits(r, `${id}:bench:${i}`)),
    ...(spec.rotation ? { rotation: spec.rotation } : {}),
    ...(spec.tactics ? { tactics: { ...DEFAULT_TACTICS, ...(sheet.tactics ?? {}), ...spec.tactics } } : {}),
  };
  return { sheet, nine: bestNine(squad) };
}

/** The squad seed for a scenario's n-th squad of a kind on a match seed: the same squads whichever end they play, so a swapped scenario meets the same pair. */
const squadSeed = (kind: string, n: number, seed: number): number => (hashString(`squad:${kind}:${n}`) ^ Math.imul(seed >>> 0, 2654435761)) >>> 0;

/**
 * Both sides of a scenario for one match seed. Flat and club sides are the same
 * every seed; squad-built ones are new each seed, a levelled rival (no `rating`)
 * built after the other side, at its best nine.
 */
export function scenarioSides(home: SideSpec, away: SideSpec, seed: number): { home: TeamSheet; away: TeamSheet; nine: { home?: number; away?: number } } {
  const levelled = (s: SideSpec): boolean => s.squad === 'rival' && s.rating === undefined;
  const build = (id: string, spec: SideSpec, n: number, level?: number): { sheet: TeamSheet; nine?: number } =>
    spec.squad ? squadSide(id, spec, squadSeed(spec.squad, n, seed), level) : { sheet: sideSheet(id, spec) };
  const awayN = home.squad !== undefined && home.squad === away.squad ? 1 : 0;
  let h: { sheet: TeamSheet; nine?: number };
  let a: { sheet: TeamSheet; nine?: number };
  if (levelled(home) && !levelled(away)) {
    a = build('A', away, awayN);
    h = build('H', home, 0, a.nine);
  } else {
    h = build('H', home, 0);
    a = build('A', away, awayN, h.nine);
  }
  return {
    home: h.sheet,
    away: a.sheet,
    nine: { ...(h.nine !== undefined ? { home: h.nine } : {}), ...(a.nine !== undefined ? { away: a.nine } : {}) },
  };
}

/** A side that is the rival of a player on a difficulty (`rivalOf`) plays with that difficulty's edge, as matchday.ts gives it (N12.2); read after the variant's knobs are on. */
export function scenarioEdge(home: SideSpec, away: SideSpec): DifficultyEdge | undefined {
  if (home.rivalOf) return rivalEdge('home', home.rivalOf);
  return away.rivalOf ? rivalEdge('away', away.rivalOf) : undefined;
}

/** A try this soon after his side's kick came from it (12 s). */
const KICK_TRY_TICKS = 240;

const LATE = (e: SimEvent): boolean => e.kind === 'break-tackle' && e.detail === 'wrestle';

/** Per-match counts from one match's events. */
function countEvents(es: readonly SimEvent[]): Record<CountKey, number> {
  const c = Object.fromEntries(COUNTS.map((k) => [k, 0])) as Record<CountKey, number>;
  // The kick in play (#99 close-out): a try by the kicking side within KICK_TRY_TICKS of its kick is a kick try.
  // A grubber's next act is one of: try, repeat set (the chase regathers), dropout, or turnover.
  let lastKick: { side: string | undefined; detail: string | undefined; tick: number } | null = null;
  let grubber: { side: string; tick: number; ours: boolean } | null = null;
  const closeGrubber = (kind: 'grubberTries' | 'grubberRepeats' | 'grubberDropouts' | 'grubberTurnovers'): void => {
    if (!grubber) return;
    c[kind]++;
    grubber = null;
  };
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
        if (e.kind === 'drop' && lastKick?.detail === 'bomb') c.bombsSpilled++;
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
        if (grubber) closeGrubber(grubber.ours ? 'grubberRepeats' : 'grubberTurnovers');
        c.kicks++;
        if (e.detail === 'bomb') c.bombs++;
        else if (e.detail === 'grubber' && e.side) {
          c.grubbers++;
          grubber = { side: e.side, tick: e.tick, ours: false };
        }
        lastKick = { side: e.side, detail: e.detail, tick: e.tick };
        break;
      case 'kickoff':
        if (grubber) closeGrubber(grubber.ours ? 'grubberRepeats' : 'grubberTurnovers');
        lastKick = null;
        break;
      case 'regather':
        if (lastKick?.detail === 'bomb') c.bombsWon++;
        if (grubber && e.side === grubber.side) grubber.ours = true;
        break;
      case 'set-start':
        if (grubber && e.side) {
          if (e.side === grubber.side) grubber.ours = true;
          else closeGrubber('grubberTurnovers');
        }
        break;
      case 'dead-ball':
        c.deadBalls++;
        if (grubber) closeGrubber(e.detail === 'drop-out' ? 'grubberDropouts' : 'grubberTurnovers');
        break;
      case 'try':
        c.tries++;
        if (e.detail === 'bonus') c.bonusTries++;
        if (lastKick && lastKick.side === e.side && e.tick - lastKick.tick <= KICK_TRY_TICKS) c.kickTries++;
        if (grubber && e.side === grubber.side && e.tick - grubber.tick <= KICK_TRY_TICKS) closeGrubber('grubberTries');
        else if (grubber) closeGrubber(grubber.ours ? 'grubberRepeats' : 'grubberTurnovers');
        lastKick = null;
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
        if (grubber) closeGrubber('grubberTurnovers');
        break;
      case '40-20':
        c.fortyTwenties++;
        c.touchFinds++;
        if (grubber && e.side === grubber.side) grubber.ours = true;
        break;
      case 'on-full':
        c.onTheFull++;
        if (grubber) closeGrubber('grubberTurnovers');
        break;
      case 'half-time':
      case 'full-time':
        if (grubber) closeGrubber(grubber.ours ? 'grubberRepeats' : 'grubberTurnovers');
        if (e.kind === 'full-time' && e.detail === 'golden-point') c.goldenPointWon++;
        break;
      case 'golden-point':
        c.goldenPoint++;
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
  if (grubber) closeGrubber(grubber.ours ? 'grubberRepeats' : 'grubberTurnovers');
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
    // Flat and club sides once; squad-built sides (N12.2) a new pair every seed.
    const squads = cell.scenario.home.squad !== undefined || cell.scenario.away.squad !== undefined;
    const fixed = squads ? null : scenarioSides(cell.scenario.home, cell.scenario.away, seedStart);
    const nineSum = { home: 0, away: 0 };
    const edge = scenarioEdge(cell.scenario.home, cell.scenario.away);
    const perSeed: Record<CountKey, number>[] = [];
    let wrestleTicks = 0;
    let wins = 0;
    let draws = 0;
    let trackedWins = 0;
    let trackedDraws = 0;
    let trackedN = 0;
    const legSum = new Map<number, { home: number; away: number }>();
    const track = cell.scenario.track;
    const bothWays = cell.scenario.bothWays === true;
    const flipSide = (side: 'home' | 'away'): 'home' | 'away' => (side === 'home' ? 'away' : 'home');
    /**
     * One match. `flip` plays the sheets already swapped: counts, the home-win
     * rate and the legs stay on the written orientation, and the tracked side's
     * result is read off whichever end it is sitting at.
     */
    const playOne = (homeSheet: TeamSheet, awaySheet: TeamSheet, seed: number, flip: boolean): { homePts: number; awayPts: number } => {
      const onSim = (side: 'home' | 'away'): 'home' | 'away' => (flip ? flipSide(side) : side);
      const callList: CallInput[] = [];
      const rules = cell.scenario.calls;
      const aiSides = (cell.scenario.aiCoach ?? aiCoachSides(['home', 'away'])).map(onSim);
      const planRules = cell.scenario.plans ?? [];
      const planList: PlanInput[] = [];
      const planDone = planRules.map(() => false);
      const simEdge = edge && flip ? { ...edge, side: flipSide(edge.side) } : edge;
      const ruleSides = (cell.scenario.breakRule ?? []).map(onSim);
      const sim = new LiveSim(homeSheet, awaySheet, seed, { energy: legsAt, length, ...(cell.scenario.weather ? { weather: cell.scenario.weather } : {}), ...(rules ? { calls: callList } : {}), ...(aiSides.length ? { aiCoach: aiSides } : {}), ...(cell.scenario.finals ? { goldenPoint: true } : {}), ...(planRules.length ? { plans: planList } : {}), ...(ruleSides.length ? { breakRuleSides: ruleSides } : {}), ...(simEdge ? { difficultyEdge: simEdge } : {}) });
      const events: SimEvent[] = [];
      const held = [0, 0, 0, 0];
      const bins = new BinSwing();
      let inW = 0;
      let lastMen = 0;
      let nextLegs = 3;
      let matchWrestles = 0;
      while (!sim.finished && sim.tick < MAX_TICKS) {
        if (rules) {
          for (const written of ['home', 'away'] as const) {
            const side = onSim(written);
            const r = (rules[written] ?? []).find((x) => (x.tackle === undefined || x.tackle === sim.tackleCount) && sim.callRefusal(side, x.call) === null);
            if (r) callList.push({ tick: sim.tick + 1, side, call: r.call });
          }
        }
        if (planRules.length) {
          const k = sim.phaseKind;
          planRules.forEach((r, i) => {
            if (planDone[i] || sim.planRefusal() !== null) return;
            const simSide = onSim(r.side);
            const scoredBy = k === 'try' ? sim.inPossession : null;
            const due = r.at === 'half-time' ? k === 'half-time' : r.at === 'try' ? scoredBy !== null : scoredBy !== null && scoredBy !== simSide;
            if (!due) return;
            planDone[i] = true;
            planList.push({ tick: sim.tick + 1, side: simSide, tactics: { ...sim.planFor(simSide), ...r.tactics } });
          });
        }
        sim.step();
        if (flip) continue;
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
          matchWrestles++;
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
      if (!flip) {
        const c = countEvents(events);
        c.wrestles = matchWrestles;
        c.held1 = held[1]!;
        c.held2 = held[2]!;
        c.held3 = held[3]!;
        c.kickMetres = sim.kickMetres.home + sim.kickMetres.away;
        c.shortMin = bins.shortS / 60;
        c.binSwing = bins.swing;
        // Completion is a share (%), not a count: not scaled to 18 minutes.
        const sets = sim.sets.home + sim.sets.away;
        c.completion = sets > 0 ? (100 * (sim.setsCompleted.home + sim.setsCompleted.away)) / sets : 0;
        // The score: both sides' points, the winning margin, and the home side's (signed).
        c.points = sim.points.home + sim.points.away;
        c.margin = Math.abs(sim.points.home - sim.points.away);
        c.homeMargin = sim.points.home - sim.points.away;
        c.draws = sim.points.home === sim.points.away ? 1 : 0;
        perSeed.push(c);
        if (sim.points.home > sim.points.away) wins++;
        else if (sim.points.home === sim.points.away) draws++;
      }
      return { homePts: sim.points.home, awayPts: sim.points.away };
    };
    const noteTracked = (pts: { homePts: number; awayPts: number }, flip: boolean): void => {
      if (!track) return;
      trackedN++;
      // After the swap the written home sheet is the sim's away end.
      const trackedIsHome = flip ? track === 'away' : track === 'home';
      if (pts.homePts === pts.awayPts) trackedDraws++;
      else if (trackedIsHome ? pts.homePts > pts.awayPts : pts.awayPts > pts.homePts) trackedWins++;
    };
    for (let s = seedStart; s < seedStart + seeds; s++) {
      const sides = fixed ?? scenarioSides(cell.scenario.home, cell.scenario.away, s);
      nineSum.home += sides.nine.home ?? 0;
      nineSum.away += sides.nine.away ?? 0;
      noteTracked(playOne(sides.home, sides.away, s, false), false);
      if (bothWays) noteTracked(playOne(sides.away, sides.home, s, true), true);
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
      ...(track && trackedN > 0 ? { trackedWin: trackedWins / trackedN, trackedDraw: trackedDraws / trackedN, trackedSeeds: trackedN } : {}),
      legs: [...legSum.entries()].map(([minute, v]) => ({ minute, home: v.home / seeds, away: v.away / seeds })),
      ...(squads
        ? { nine: { ...(cell.scenario.home.squad ? { home: nineSum.home / seeds } : {}), ...(cell.scenario.away.squad ? { away: nineSum.away / seeds } : {}) } }
        : {}),
      ms: Date.now() - t0,
    };
  } finally {
    restore();
  }
}
