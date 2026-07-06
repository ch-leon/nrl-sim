// src/sim/engine.ts — core stat-based, deterministic match simulation.
// See BAK-191 (WU-6) and ARCHITECTURE §6. Pure TypeScript, no Phaser.
// The match is simulated as alternating 6-tackle sets across 80 sim-minutes;
// each tackle rolls a weighted outcome table driven by the attack-vs-defense
// differential, momentum, and weather. All randomness routes through mulberry32.

import { makeRng, type Rng } from '../utils/rng';
import { overallRating } from '../data/player';
import { STAT_MAX } from '../config';
import type { Player, RivalClub, WeatherKind } from '../core/state';
import type { MatchEvent, MatchResult, TeamSheet } from './events';
import { mkEvent } from './events';
import {
  rollWeather,
  weatherMods,
  applyMomentumEvent,
  decayMomentum,
  momentumWeightMod,
  WIND_DISTANCE_JITTER,
  type WeatherMods,
} from './weather';

const clampStat = (n: number): number => Math.max(1, Math.min(STAT_MAX, n));

// ── TeamSheet builders ───────────────────────────────────────────────────────

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Build a TeamSheet from a squad. Excludes injured players (injuredWeeks > 0),
 * uses the best 13 by overall rating, and applies a morale modifier. If fewer
 * than 13 fit players are available, uses all fit players; throws if zero.
 */
export function teamSheetFromSquad(
  players: Player[],
  clubId: string,
  name: string,
  colors: [string, string],
): TeamSheet {
  const fit = players.filter((p) => p.injuredWeeks <= 0);
  if (fit.length === 0) throw new Error('no fit players');

  // Best 13 by overall rating (mean of the five stats via overallRating).
  const best = [...fit]
    .sort((a, b) => overallRating(b) - overallRating(a))
    .slice(0, 13);

  const attackRaw = mean(best.map((p) => (p.stats.speed + p.stats.skill + p.stats.footyIQ) / 3));
  const defenseRaw = mean(best.map((p) => (p.stats.strength + p.stats.stamina) / 2));
  const fitness = clampStat(Math.round(mean(best.map((p) => p.stats.stamina))));

  const kickers = best.filter(
    (p) => p.position === 'halfback' || p.position === 'five-eighth',
  );
  const kickerPool = kickers.length > 0 ? kickers : best;
  const kicking = clampStat(Math.round(Math.max(...kickerPool.map((p) => p.stats.skill))));

  // Morale modifier: ±10% on attack & defense at morale 0/100.
  const meanMorale = mean(best.map((p) => p.morale));
  const moraleMod = 1 + ((meanMorale - 50) / 50) * 0.1;

  return {
    clubId,
    name,
    attack: clampStat(Math.round(attackRaw * moraleMod)),
    defense: clampStat(Math.round(defenseRaw * moraleMod)),
    kicking,
    fitness,
    colors,
  };
}

// Small deterministic string hash for per-club jitter seeding.
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Build a TeamSheet from a rival club. All four aggregates derive from
 * club.strength with small deterministic jitter (±5, seeded by clubId hash),
 * clamped 1..100.
 */
export function teamSheetFromRival(club: RivalClub): TeamSheet {
  const rng = makeRng(hashString(club.id));
  const jitter = (): number => clampStat(Math.round(club.strength + rng.int(-5, 5)));
  return {
    clubId: club.id,
    name: club.name,
    attack: jitter(),
    defense: jitter(),
    kicking: jitter(),
    fitness: jitter(),
    colors: club.colors,
  };
}

// ── Match simulation ─────────────────────────────────────────────────────────

interface Side {
  sheet: TeamSheet;
  isHome: boolean;
  score: number;
  tackleCount: number;
  errorCount: number;
  tryCount: number;
}

// Base per-tackle outcome probabilities (favourable = run/break, unfavourable =
// error). These are the calibration knobs; tuned so equal 50s land 20-50 total
// points and 80v40 wins ≥80% & <100%.
const BASE_RUN = 0.62;
const BASE_BREAK = 0.1;
const BASE_ERROR = 0.09;
const BASE_PENALTY = 0.05;
const BASE_BIGHIT = 0.06;
// remainder (~0.08) folds into a plain tackle (no advance beyond run's minimum).

/**
 * Simulate a full match. Synchronous, <50ms, fully deterministic per seed.
 */
export function simulateMatch(
  home: TeamSheet,
  away: TeamSheet,
  opts: { seed: number; weather?: WeatherKind },
): MatchResult {
  const rng = makeRng(opts.seed);
  const weather: WeatherKind = opts.weather ?? rollWeather(rng.next);
  const wmods = weatherMods(weather);

  const events: MatchEvent[] = [];
  const momentumTimeline: { t: number; value: number }[] = [];

  const homeSide: Side = {
    sheet: home, isHome: true, score: 0, tackleCount: 0, errorCount: 0, tryCount: 0,
  };
  const awaySide: Side = {
    sheet: away, isHome: false, score: 0, tackleCount: 0, errorCount: 0, tryCount: 0,
  };

  let momentum = 0; // + = home
  let possessing: Side = homeSide;
  let defending: Side = awaySide;
  let fieldX = 20; // 0 = own line, 100 = opponent try-line
  let t = 0;
  let halfTimeEmitted = false;

  events.push(mkEvent(0, 'kickoff', home.clubId, { x: 50, y: 50 }));

  const flip = (): void => {
    const tmp = possessing;
    possessing = defending;
    defending = tmp;
  };

  const maybeHalfTime = (): void => {
    if (!halfTimeEmitted && t >= 40) {
      events.push(mkEvent(40, 'half-time', possessing.sheet.clubId));
      halfTimeEmitted = true;
    }
  };

  // Main loop: sets until 80 minutes elapse.
  while (t < 80) {
    const atk = possessing.sheet;
    const def = defending.sheet;
    // Attack-vs-defense differential in [-1, 1], scaled.
    const atkDiff = (atk.attack - def.defense) / 100;

    events.push(
      mkEvent(t, 'set-start', atk.clubId, { x: Math.round(fieldX), y: 50 }),
    );

    let setEnded = false;
    for (let tackle = 1; tackle <= 6 && !setEnded && t < 80; tackle++) {
      possessing.tackleCount++;
      t = Math.min(80, t + 0.5 + rng.next()); // advance 0.5-1.5 min per tackle, cap at 80
      maybeHalfTime();

      const outcome = rollTackle(atkDiff, momentum, possessing.isHome, wmods, rng);

      if (outcome === 'error') {
        events.push(mkEvent(t, 'error', atk.clubId, { x: Math.round(fieldX), y: 50 }));
        possessing.errorCount++;
        momentum = applyMomentumEvent(momentum, 'error', possessing.isHome);
        // Turnover: opponent starts near where the ball was lost (mirrored).
        fieldX = clampField(100 - fieldX + 10);
        flip();
        setEnded = true;
        break;
      }

      if (outcome === 'penalty') {
        events.push(mkEvent(t, 'penalty', atk.clubId, { x: Math.round(fieldX), y: 50 }));
        // Kick for goal if within range and worth it (fieldX >= 60).
        if (fieldX >= 60) {
          const prob = kickProb(atk.kicking, 0.62) * wmods.kickSuccessMult;
          if (rng.next() < prob) {
            possessing.score += 2;
            events.push(mkEvent(t, 'penalty-goal', atk.clubId, { x: Math.round(fieldX), y: 50 }));
          }
          // Restart after a shot at goal: opponent kicks off to possessing? Keep
          // it simple — possession flips, receiver starts ~30.
          fieldX = 30;
          flip();
          setEnded = true;
          break;
        }
        // Otherwise take the tap and continue this set (gain field position).
        fieldX = clampField(fieldX + 10);
        continue;
      }

      if (outcome === 'big-hit') {
        events.push(mkEvent(t, 'big-hit', def.clubId, { x: Math.round(fieldX), y: 50 }));
        // Momentum swings toward the DEFENDING team (they made the hit).
        momentum = applyMomentumEvent(momentum, 'big-hit', defending.isHome);
        // Chance the carrier coughs it up.
        if (rng.next() < 0.25 * wmods.errorMult) {
          events.push(mkEvent(t, 'error', atk.clubId, { x: Math.round(fieldX), y: 50 }));
          possessing.errorCount++;
          momentum = applyMomentumEvent(momentum, 'error', possessing.isHome);
          fieldX = clampField(100 - fieldX + 10);
          flip();
          setEnded = true;
          break;
        }
        // Held; minimal advance.
        fieldX = clampField(fieldX + 2);
        continue;
      }

      if (outcome === 'break') {
        const gain = 20 + Math.floor(rng.next() * 21); // 20-40m
        fieldX = clampField(fieldX + gain);
        events.push(mkEvent(t, 'break', atk.clubId, { x: Math.round(fieldX), y: 50 }));
        if (fieldX >= 80) {
          // Try chance scaled by attack.
          const tryProb = 0.35 + (atk.attack / 100) * 0.45; // 0.35-0.80
          if (rng.next() < tryProb) {
            scoreTry(possessing, t, events, atk);
            momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
            attemptConversion(possessing, t, events, atk, wmods, rng, fieldX);
            fieldX = 20;
            flip();
            setEnded = true;
            break;
          }
        }
        continue;
      }

      // outcome === 'run' (or plain tackle): advance 5-15m.
      const gain = 5 + Math.floor(rng.next() * 11);
      fieldX = clampField(fieldX + gain);
      events.push(mkEvent(t, 'run', atk.clubId, { x: Math.round(fieldX), y: 50 }));
      // If a run carries into the in-goal area, small try chance.
      if (fieldX >= 95) {
        const tryProb = 0.2 + (atk.attack / 100) * 0.3;
        if (rng.next() < tryProb) {
          scoreTry(possessing, t, events, atk);
          momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
          attemptConversion(possessing, t, events, atk, wmods, rng, fieldX);
          fieldX = 20;
          flip();
          setEnded = true;
          break;
        }
      }
    }

    if (!setEnded) {
      // 6th tackle with no score → downfield kick, flip possession.
      const dist = kickDistance(possessing.sheet.kicking, wmods, rng);
      // Receiver starts near ~30 from their own line (further with a big kick).
      const receiverStart = clampField(30 - (dist - 40) * 0.2);
      fieldX = clampField(receiverStart);
      flip();
    }

    // Late field-goal attempt: t≥75, margin ≤2, possessing team high attack.
    if (t >= 75) {
      const margin = possessing.score - defending.score;
      if (margin <= 0 && margin >= -2 && possessing.sheet.attack >= 60) {
        const prob = kickProb(possessing.sheet.kicking, 0.4) * wmods.kickSuccessMult;
        if (rng.next() < prob) {
          possessing.score += 1;
          events.push(mkEvent(t, 'field-goal', possessing.sheet.clubId));
        }
      }
    }

    // Per-set momentum decay + sample.
    momentum = decayMomentum(momentum);
    momentumTimeline.push({ t: Math.round(t), value: momentum });
  }

  maybeHalfTime();

  // 0-0 avoidance: force one late try for the higher-attack team.
  if (homeSide.score === 0 && awaySide.score === 0) {
    const winner = home.attack >= away.attack ? homeSide : awaySide;
    scoreTry(winner, 79, events, winner.sheet);
    attemptConversion(winner, 79, events, winner.sheet, wmods, rng, 90);
  }

  events.push(mkEvent(80, 'full-time', home.clubId));

  // Ensure events are ordered by t (they are appended in time order, but the
  // forced-try and full-time land at fixed minutes). Ties break by a phase rank
  // so kickoff sorts first and full-time always sorts last within a minute.
  const rank = (k: MatchEvent['kind']): number =>
    k === 'kickoff' ? -1 : k === 'full-time' ? 1 : 0;
  events.sort((a, b) => a.t - b.t || rank(a.kind) - rank(b.kind));

  const totalTackles = homeSide.tackleCount + awaySide.tackleCount;
  const homePoss = totalTackles === 0 ? 50 : Math.round((homeSide.tackleCount / totalTackles) * 100);
  const awayPoss = 100 - homePoss;

  const result: MatchResult = {
    homeScore: homeSide.score,
    awayScore: awaySide.score,
    events,
    stats: {
      possession: [homePoss, awayPoss],
      tackles: [homeSide.tackleCount, awaySide.tackleCount],
      errors: [homeSide.errorCount, awaySide.errorCount],
      tries: [homeSide.tryCount, awaySide.tryCount],
    },
    weather,
    momentumTimeline,
  };
  return result;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

type TackleOutcome = 'run' | 'break' | 'error' | 'penalty' | 'big-hit';

function clampField(x: number): number {
  return Math.max(0, Math.min(100, x));
}

/**
 * Roll a weighted tackle outcome. atkDiff in ~[-1,1] shifts run/break up and
 * error down for the stronger attack. Momentum nudges the favourable split by
 * at most ±8%. Weather scales error (rain) and break (rain) chances.
 */
function rollTackle(
  atkDiff: number,
  momentum: number,
  possIsHome: boolean,
  wmods: WeatherMods,
  rng: Rng,
): TackleOutcome {
  // Stat differential shifts weights: stronger attack → more breaks, fewer errors.
  const diffShift = atkDiff * 0.12; // up to ±12 pts of attack differential
  const momMod = momentumWeightMod(momentum, possIsHome); // ~0.92..1.08

  let breakW = (BASE_BREAK + diffShift) * wmods.breakMult * momMod;
  let runW = (BASE_RUN + diffShift * 0.5) * momMod;
  let errorW = (BASE_ERROR - diffShift) * wmods.errorMult;
  const penaltyW = BASE_PENALTY;
  const bigHitW = BASE_BIGHIT;

  breakW = Math.max(0.01, breakW);
  runW = Math.max(0.01, runW);
  errorW = Math.max(0.01, errorW);

  const total = runW + breakW + errorW + penaltyW + bigHitW;
  let r = rng.next() * total;
  if ((r -= runW) < 0) return 'run';
  if ((r -= breakW) < 0) return 'break';
  if ((r -= errorW) < 0) return 'error';
  if ((r -= penaltyW) < 0) return 'penalty';
  return 'big-hit';
}

function scoreTry(side: Side, t: number, events: MatchEvent[], sheet: TeamSheet): void {
  side.score += 4;
  side.tryCount++;
  events.push(mkEvent(t, 'try', sheet.clubId, { x: 100, y: 50 }));
}

// Conversion success as a function of kicking rating; base at kicking 50.
function kickProb(kicking: number, base: number): number {
  const p = base + ((kicking - 50) / 50) * 0.25;
  return Math.max(0.05, Math.min(0.98, p));
}

function attemptConversion(
  side: Side,
  t: number,
  events: MatchEvent[],
  sheet: TeamSheet,
  wmods: WeatherMods,
  rng: Rng,
  _fieldX: number,
): void {
  const prob = kickProb(sheet.kicking, 0.75) * wmods.kickSuccessMult;
  const good = rng.next() < prob;
  if (good) side.score += 2;
  events.push(
    mkEvent(t, 'conversion', sheet.clubId, { detail: good ? 'good' : 'missed', x: 90, y: 50 }),
  );
}

function kickDistance(kicking: number, wmods: WeatherMods, rng: Rng): number {
  const base = 30 + (kicking / 100) * 30; // 30-60m
  // Wind ±15%: engine rolls direction per kick.
  let windFactor = wmods.kickDistanceMult;
  if (wmods.kickDistanceMult !== 1.0) {
    // Wind: randomly help (×1.15) or hinder (×0.85).
    windFactor = rng.next() < 0.5 ? 1 + WIND_DISTANCE_JITTER : 1 - WIND_DISTANCE_JITTER;
  }
  return base * windFactor;
}
