// src/sim/engine.ts — core stat-based, deterministic match simulation.
// See BAK-191 (WU-6), BAK-206 (Nines + contest/kicks), and ARCHITECTURE §6.
// Pure TypeScript, no Phaser. Alternating SET_TACKLES sets across 80 sim-minutes;
// each tackle rolls a weighted contest table. All randomness routes through mulberry32.

import { makeRng, type Rng } from '../utils/rng';
import { overallRating } from '../data/player';
import { ON_FIELD, SET_TACKLES, STAT_MAX } from '../config';
import type { Player, Position, RivalClub, Trait, WeatherKind } from '../core/state';
import type {
  KickKind,
  MatchEvent,
  MatchInjury,
  MatchResult,
  RosterEntry,
  TeamSheet,
} from './events';
import { mkEvent } from './events';
import { generatedRoster, stageEvents } from './staging';
import { hasTrait as hasTraitId, rollTraits, type TraitQuality } from '../data/traits';
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

/** Small home-ground edge (GitHub #8). Equal sheets → ~52–58% home wins. */
const HOME_ATTACK_NUDGE = 5;
const HOME_DEFENSE_NUDGE = 4;

/** Late-match fitness window (GitHub #6): t ≥ this minute. */
const FITNESS_LATE_T = 60;

/** Build mkEvent extras without passing `player: undefined` (exactOptionalPropertyTypes). */
function evExtra(
  base: { x?: number; y?: number; detail?: string },
  player?: string,
): Partial<Pick<MatchEvent, 'player' | 'x' | 'y' | 'detail'>> {
  return player === undefined ? base : { ...base, player };
}

// ── TeamSheet builders ───────────────────────────────────────────────────────

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

function toRosterEntry(p: Player): RosterEntry {
  return {
    name: p.name,
    position: p.position,
    stats: { ...p.stats },
    id: p.id,
    injuryRisk: p.injuryRisk,
    ...(p.traits.length > 0 ? { traits: [...p.traits] } : {}),
  };
}

/** Apply home attack/defense nudge without mutating the caller's sheet. */
function withHomeAdvantage(sheet: TeamSheet): TeamSheet {
  return {
    ...sheet,
    attack: clampStat(sheet.attack + HOME_ATTACK_NUDGE),
    defense: clampStat(sheet.defense + HOME_DEFENSE_NUDGE),
  };
}

/**
 * Build a TeamSheet from a squad. Excludes injured players (injuredWeeks > 0),
 * uses the best ON_FIELD by overall rating, and applies a morale modifier. If
 * fewer than ON_FIELD fit players are available, uses all fit players; throws
 * if zero.
 */
export function teamSheetFromSquad(
  players: Player[],
  clubId: string,
  name: string,
  colors: [string, string],
): TeamSheet {
  const fit = players.filter((p) => p.injuredWeeks <= 0);
  if (fit.length === 0) throw new Error('no fit players');

  const best = [...fit]
    .sort((a, b) => overallRating(b) - overallRating(a))
    .slice(0, ON_FIELD);

  const attackRaw = mean(best.map((p) => (p.stats.speed + p.stats.skill + p.stats.footyIQ) / 3));
  const defenseRaw = mean(best.map((p) => (p.stats.strength + p.stats.stamina) / 2));
  const fitness = clampStat(Math.round(mean(best.map((p) => p.stats.stamina))));

  const kickers = best.filter(
    (p) => p.position === 'halfback' || p.position === 'five-eighth',
  );
  const kickerPool = kickers.length > 0 ? kickers : best;
  const kicking = clampStat(Math.round(Math.max(...kickerPool.map((p) => p.stats.skill))));

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
    roster: best.map(toRosterEntry),
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Build a TeamSheet from a rival club. Aggregates derive from club.strength
 * with ±5 jitter; roster is a generated Nines side with synthetic stats.
 */
export function teamSheetFromRival(club: RivalClub): TeamSheet {
  const rng = makeRng(hashString(club.id));
  const jitter = (): number => clampStat(Math.round(club.strength + rng.int(-5, 5)));
  const attack = jitter();
  const defense = jitter();
  const kicking = jitter();
  const fitness = jitter();
  const quality: TraitQuality = club.strength >= 70 ? 'star' : club.strength >= 50 ? 'average' : 'rookie';
  const roster = generatedRoster(club.id).map((p) => {
    const stats = {
      speed: clampStat(attack + rng.int(-8, 8)),
      strength: clampStat(defense + rng.int(-8, 8)),
      stamina: clampStat(fitness + rng.int(-8, 8)),
      skill: clampStat(kicking + rng.int(-8, 8)),
      footyIQ: clampStat(attack + rng.int(-8, 8)),
    };
    // Rivals carry traits too, so their stars are memorable (BAK-208 §3).
    const traits = rollTraits(rng, p.position, quality);
    return { ...p, stats, ...(traits.length > 0 ? { traits } : {}) };
  });
  return {
    clubId: club.id,
    name: club.name,
    attack,
    defense,
    kicking,
    fitness,
    colors: club.colors,
    roster,
  };
}

// ── Actor selection (BAK-206 phase 4) ────────────────────────────────────────

const FORWARDS: ReadonlySet<Position> = new Set(['prop', 'hooker', 'second-row', 'lock']);
const BACKS: ReadonlySet<Position> = new Set(['fullback', 'winger', 'centre']);
const HALVES: ReadonlySet<Position> = new Set(['five-eighth', 'halfback']);

type StatKey = 'speed' | 'strength' | 'stamina' | 'skill' | 'footyIQ';

// Trait effects (#43). Deliberately small so team strength still dominates, and
// they only re-weight rolls the engine already makes (no extra rng draws), so a
// roster with no traits plays out exactly as before.
/** Weight multiplier on a `finisher` when a try scorer is picked. */
const FINISHER_SCORER_MULT = 1.5;
/** Weight multiplier on a `hitman` when the big-hit maker is picked. */
const HARDMAN_HIT_MULT = 1.6;
/** Per-hitman on-field bump to the defending side's big-hit weight. */
const HARDMAN_BIGHIT_WEIGHT = 0.03;
/** Kicking-success bonus (probability points) for a `playmaker` kicker. */
const PLAYMAKER_KICK_BONUS = 0.04;
/** Injury-chance multiplier for an `injuryProne` carrier (on top of opts.injuryRate). */
const INJURY_PRONE_MULT = 1.4;

const hasTrait = (p: RosterEntry | undefined, t: Trait): boolean => hasTraitId(p?.traits, t);

function pickActor(
  roster: readonly RosterEntry[],
  rng: Rng,
  prefer: (p: Position) => boolean,
  stat: StatKey,
  boost?: { trait: Trait; mult: number },
): string | undefined {
  if (roster.length === 0) return undefined;
  const weights = roster.map((p) => {
    const base = prefer(p.position) ? 3 : 1;
    const s = p.stats?.[stat] ?? 50;
    const traitMult = boost && hasTrait(p, boost.trait) ? boost.mult : 1;
    return base * (0.35 + s / 100) * traitMult;
  });
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < roster.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return roster[i]?.name;
  }
  return roster[roster.length - 1]?.name;
}

const HARDMAN = { trait: 'hitman', mult: HARDMAN_HIT_MULT } as const;
const FINISHER = { trait: 'finisher', mult: FINISHER_SCORER_MULT } as const;

function kickerEntry(roster: readonly RosterEntry[]): RosterEntry | undefined {
  const ranked = [...roster].sort((a, b) => {
    const rank = (p: RosterEntry): number =>
      p.position === 'halfback' ? 3 : p.position === 'five-eighth' ? 2 : 1;
    // A playmaker wins the kicking duties among equals-ish (+5 effective skill).
    const sk = (p: RosterEntry): number =>
      (p.stats?.skill ?? 50) + (hasTrait(p, 'playmaker') ? 5 : 0);
    return rank(b) - rank(a) || sk(b) - sk(a);
  });
  return ranked[0];
}

function kickerName(roster: readonly RosterEntry[]): string | undefined {
  return kickerEntry(roster)?.name;
}

/** Goal-kick success multiplier: a playmaker kicker is slightly more reliable. */
function kickerBonus(roster: readonly RosterEntry[]): number {
  return hasTrait(kickerEntry(roster), 'playmaker') ? PLAYMAKER_KICK_BONUS : 0;
}

// ── Match simulation ─────────────────────────────────────────────────────────

interface Side {
  sheet: TeamSheet;
  roster: RosterEntry[];
  isHome: boolean;
  score: number;
  tackleCount: number;
  errorCount: number;
  tryCount: number;
}

// Contest weights (BAK-206): richer outcomes + more line breaks than BAK-191.
const BASE_TACKLE = 0.38;
const BASE_FEND = 0.11;
const BASE_BREAK_TACKLE = 0.1;
const BASE_BREAK = 0.14;
const BASE_ERROR = 0.08;
const BASE_PENALTY = 0.05;
const BASE_BIGHIT = 0.09;

type ContestOutcome =
  | 'tackle'
  | 'fend'
  | 'break-tackle'
  | 'break'
  | 'error'
  | 'penalty'
  | 'big-hit';

/**
 * Simulate a full match. Synchronous, <50ms, fully deterministic per seed.
 */
export function simulateMatch(
  home: TeamSheet,
  away: TeamSheet,
  opts: { seed: number; weather?: WeatherKind; injuryRate?: number },
): MatchResult {
  const rng = makeRng(opts.seed);
  const weather: WeatherKind = opts.weather ?? rollWeather(rng.next);
  const wmods = weatherMods(weather);

  const events: MatchEvent[] = [];
  const injuries: MatchInjury[] = [];
  const momentumTimeline: { t: number; value: number }[] = [];

  const homeSheet = withHomeAdvantage(home);
  const homeSide: Side = {
    sheet: homeSheet,
    roster: home.roster && home.roster.length > 0 ? home.roster : generatedRoster(home.clubId),
    isHome: true,
    score: 0,
    tackleCount: 0,
    errorCount: 0,
    tryCount: 0,
  };
  const awaySide: Side = {
    sheet: away,
    roster: away.roster && away.roster.length > 0 ? away.roster : generatedRoster(away.clubId),
    isHome: false,
    score: 0,
    tackleCount: 0,
    errorCount: 0,
    tryCount: 0,
  };

  let momentum = 0;
  let possessing: Side = homeSide;
  let defending: Side = awaySide;
  let fieldX = 20;
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

  while (t < 80) {
    const atk = possessing.sheet;
    const def = defending.sheet;
    const atkDiff = (atk.attack - def.defense) / 100;

    events.push(
      mkEvent(t, 'set-start', atk.clubId, { x: Math.round(fieldX), y: 50 }),
    );

    let setEnded = false;
    for (let tackle = 1; tackle <= SET_TACKLES && !setEnded && t < 80; tackle++) {
      possessing.tackleCount++;
      t = Math.min(80, t + 0.5 + rng.next());
      maybeHalfTime();

      // Speculative early kick (tackle 1, mostly from own half).
      if (tackle === 1 && fieldX < 45 && rng.next() < 0.04 + atk.kicking / 2000) {
        const early = resolveKickInner(possessing, defending, t, events, fieldX, wmods, rng, true);
        fieldX = early.fieldX;
        if (early.scoredTry) {
          momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
        }
        if (early.flip) flip();
        setEnded = true;
        break;
      }

      const outcome = rollContest(
        atkDiff,
        momentum,
        possessing.isHome,
        wmods,
        rng,
        possessing.sheet.fitness,
        t,
        defending.roster.filter((p) => hasTrait(p, 'hitman')).length,
      );

      if (outcome === 'error') {
        const carrier = pickActor(possessing.roster, rng, () => true, 'skill');
        events.push(
          mkEvent(t, 'error', atk.clubId, evExtra({ x: Math.round(fieldX), y: 50 }, carrier)),
        );
        possessing.errorCount++;
        momentum = applyMomentumEvent(momentum, 'error', possessing.isHome);
        fieldX = clampField(100 - fieldX + 10);
        flip();
        setEnded = true;
        break;
      }

      if (outcome === 'penalty') {
        events.push(mkEvent(t, 'penalty', atk.clubId, { x: Math.round(fieldX), y: 50 }));
        if (fieldX >= 60) {
          const kicker = kickerName(possessing.roster);
          const prob = (kickProb(atk.kicking, 0.62) + kickerBonus(possessing.roster)) * wmods.kickSuccessMult;
          const good = rng.next() < prob;
          if (good) possessing.score += 2;
          events.push(
            mkEvent(
              t,
              'penalty-goal',
              atk.clubId,
              evExtra({ x: Math.round(fieldX), y: 50, detail: good ? 'good' : 'missed' }, kicker),
            ),
          );
          fieldX = 30;
          flip();
          setEnded = true;
          break;
        }
        fieldX = clampField(fieldX + 10);
        continue;
      }

      if (outcome === 'big-hit') {
        const hitter = pickActor(defending.roster, rng, (p) => FORWARDS.has(p), 'strength', HARDMAN);
        const carrier = pickActor(possessing.roster, rng, () => true, 'skill');
        const loss = 2 + Math.floor(rng.next() * 11); // 2-12m driven back
        fieldX = clampField(fieldX - loss);
        const inj = rollBigHitInjury(possessing.roster, carrier, atk.clubId, rng, opts.injuryRate ?? 1);
        const detail = inj ? 'driven|injured' : 'driven';
        if (inj) injuries.push(inj);
        events.push(
          mkEvent(t, 'big-hit', def.clubId, evExtra({ x: Math.round(fieldX), y: 50, detail }, hitter)),
        );
        momentum = applyMomentumEvent(momentum, 'big-hit', defending.isHome);
        if (rng.next() < 0.25 * wmods.errorMult) {
          events.push(
            mkEvent(t, 'error', atk.clubId, evExtra({ x: Math.round(fieldX), y: 50, detail: 'jarred' }, carrier)),
          );
          possessing.errorCount++;
          momentum = applyMomentumEvent(momentum, 'error', possessing.isHome);
          fieldX = clampField(100 - fieldX + 10);
          flip();
          setEnded = true;
          break;
        }
        continue;
      }

      if (outcome === 'break') {
        const runner = pickActor(
          possessing.roster,
          rng,
          (p) => BACKS.has(p) || HALVES.has(p),
          'speed',
          FINISHER,
        );
        const gain = 20 + Math.floor(rng.next() * 21);
        fieldX = clampField(fieldX + gain);
        events.push(
          mkEvent(t, 'break', atk.clubId, evExtra({ x: Math.round(fieldX), y: 50 }, runner)),
        );
        if (fieldX >= 75) {
          const tryProb = 0.4 + (atk.attack / 100) * 0.45;
          if (rng.next() < tryProb) {
            scoreTry(possessing, t, events, runner);
            momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
            attemptConversion(possessing, t, events, wmods, rng);
            fieldX = 20;
            flip();
            setEnded = true;
            break;
          }
        }
        continue;
      }

      if (outcome === 'break-tackle') {
        const runner = pickActor(
          possessing.roster,
          rng,
          (p) => FORWARDS.has(p) || HALVES.has(p),
          'strength',
          FINISHER,
        );
        const gain = 12 + Math.floor(rng.next() * 14);
        fieldX = clampField(fieldX + gain);
        events.push(
          mkEvent(
            t,
            'break-tackle',
            atk.clubId,
            evExtra({ x: Math.round(fieldX), y: 50, detail: 'through' }, runner),
          ),
        );
        if (fieldX >= 95 && rng.next() < 0.25 + atk.attack / 400) {
          scoreTry(possessing, t, events, runner);
          momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
          attemptConversion(possessing, t, events, wmods, rng);
          fieldX = 20;
          flip();
          setEnded = true;
          break;
        }
        continue;
      }

      if (outcome === 'fend') {
        const runner = pickActor(possessing.roster, rng, (p) => FORWARDS.has(p), 'skill');
        const gain = 8 + Math.floor(rng.next() * 11);
        fieldX = clampField(fieldX + gain);
        events.push(
          mkEvent(t, 'fend', atk.clubId, evExtra({ x: Math.round(fieldX), y: 50, detail: 'fend' }, runner)),
        );
        continue;
      }

      // Completed tackle (held).
      {
        const tackler = pickActor(defending.roster, rng, (p) => FORWARDS.has(p), 'strength');
        const gain = Math.floor(rng.next() * 9); // 0-8m
        fieldX = clampField(fieldX + gain);
        events.push(
          mkEvent(t, 'tackle', def.clubId, evExtra({ x: Math.round(fieldX), y: 50, detail: 'held' }, tackler)),
        );
        if (fieldX >= 95 && rng.next() < 0.15 + atk.attack / 500) {
          const scorer = pickActor(possessing.roster, rng, (p) => BACKS.has(p), 'speed', FINISHER);
          scoreTry(possessing, t, events, scorer);
          momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
          attemptConversion(possessing, t, events, wmods, rng);
          fieldX = 20;
          flip();
          setEnded = true;
          break;
        }
      }
    }

    if (!setEnded) {
      const kickResult = resolveKickInner(possessing, defending, t, events, fieldX, wmods, rng, false);
      fieldX = kickResult.fieldX;
      if (kickResult.scoredTry) {
        momentum = applyMomentumEvent(momentum, 'try', possessing.isHome);
      }
      if (kickResult.flip) flip();
    }

    // Late field-goal: t≥75, tied or trailing by ≤2, decent attack.
    if (t >= 75) {
      const margin = possessing.score - defending.score;
      if (margin <= 0 && margin >= -2 && possessing.sheet.attack >= 55) {
        const kicker = kickerName(possessing.roster);
        const prob = (kickProb(possessing.sheet.kicking, 0.4) + kickerBonus(possessing.roster)) * wmods.kickSuccessMult;
        const good = rng.next() < prob;
        if (good) possessing.score += 1;
        events.push(
          mkEvent(
            t,
            'field-goal',
            possessing.sheet.clubId,
            evExtra({ detail: good ? 'good' : 'missed', x: Math.round(fieldX), y: 50 }, kicker),
          ),
        );
      }
    }

    momentum = decayMomentum(momentum);
    momentumTimeline.push({ t: Math.round(t), value: momentum });
  }

  maybeHalfTime();

  if (homeSide.score === 0 && awaySide.score === 0) {
    const winner = home.attack >= away.attack ? homeSide : awaySide;
    const scorer = pickActor(winner.roster, makeRng(opts.seed ^ 0x0dd), (p) => BACKS.has(p), 'speed');
    scoreTry(winner, 79, events, scorer);
    attemptConversion(winner, 79, events, wmods, rng);
  }

  events.push(mkEvent(80, 'full-time', home.clubId));

  const staged = stageEvents(events, home, away, opts.seed);

  const rank = (k: MatchEvent['kind']): number =>
    k === 'kickoff' ? -1 : k === 'full-time' ? 1 : 0;
  staged.sort((a, b) => a.t - b.t || rank(a.kind) - rank(b.kind));

  const totalTackles = homeSide.tackleCount + awaySide.tackleCount;
  const homePoss = totalTackles === 0 ? 50 : Math.round((homeSide.tackleCount / totalTackles) * 100);
  const awayPoss = 100 - homePoss;

  return {
    homeScore: homeSide.score,
    awayScore: awaySide.score,
    events: staged,
    stats: {
      possession: [homePoss, awayPoss],
      tackles: [homeSide.tackleCount, awaySide.tackleCount],
      errors: [homeSide.errorCount, awaySide.errorCount],
      tries: [homeSide.tryCount, awaySide.tryCount],
    },
    weather,
    momentumTimeline,
    injuries,
  };
}

// ── Kick resolution ──────────────────────────────────────────────────────────

interface KickResolve {
  fieldX: number;
  flip: boolean;
  scoredTry: boolean;
}

/**
 * A playmaker kicker (#43) leans on the creative kicks — more grubbers near the
 * line, more 40-20 attempts, fewer safe find-touch. Same draw count either way.
 */
function chooseKickKind(fieldX: number, early: boolean, rng: Rng, playmaker = false): KickKind {
  if (early) {
    if (rng.next() < (playmaker ? 0.33 : 0.25)) return '40-20';
    return rng.next() < 0.55 ? 'bomb' : 'chip';
  }
  if (fieldX >= 72) {
    const r = rng.next();
    if (r < (playmaker ? 0.55 : 0.45)) return 'grubber';
    if (r < (playmaker ? 0.8 : 0.75)) return 'bomb';
    return 'chip';
  }
  if (fieldX >= 40) {
    const r = rng.next();
    if (r < (playmaker ? 0.3 : 0.4)) return 'bomb';
    if (r < (playmaker ? 0.6 : 0.75)) return 'find-touch';
    return 'grubber';
  }
  return rng.next() < (playmaker ? 0.24 : 0.15) ? '40-20' : 'find-touch';
}

function resolveKickInner(
  possessing: Side,
  defending: Side,
  t: number,
  events: MatchEvent[],
  fieldX: number,
  wmods: WeatherMods,
  rng: Rng,
  early: boolean,
): KickResolve {
  const kickerE = kickerEntry(possessing.roster);
  const kind = chooseKickKind(fieldX, early, rng, hasTrait(kickerE, 'playmaker'));
  const kicker = kickerE?.name;
  const dist = kickDistance(possessing.sheet.kicking, wmods, rng);

  events.push(
    mkEvent(
      t,
      'kick',
      possessing.sheet.clubId,
      evExtra({ x: Math.round(fieldX), y: 50, detail: kind }, kicker),
    ),
  );

  if (kind === '40-20') {
    const success = rng.next() < 0.1 + possessing.sheet.kicking / 500 + kickerBonus(possessing.roster);
    if (success) {
      return { fieldX: clampField(78 + rng.next() * 10), flip: false, scoredTry: false };
    }
    return { fieldX: clampField(25 + (dist - 40) * 0.15), flip: true, scoredTry: false };
  }

  if (kind === 'bomb' || kind === 'chip') {
    const chaser = pickActor(
      possessing.roster,
      rng,
      (p) => p === 'winger' || p === 'fullback' || p === 'centre',
      'speed',
      FINISHER,
    );
    const fullback = pickActor(
      defending.roster,
      rng,
      (p) => p === 'fullback' || p === 'winger',
      'skill',
    );
    const chaseAt = clampField(fieldX + dist * (kind === 'chip' ? 0.45 : 0.55));
    const chaserSpeed =
      possessing.roster.find((p) => p.name === chaser)?.stats?.speed ?? possessing.sheet.attack;
    const fbSkill =
      defending.roster.find((p) => p.name === fullback)?.stats?.skill ?? defending.sheet.defense;
    const contest = (chaserSpeed - fbSkill) / 200 + (kind === 'bomb' ? 0.08 : 0.04);
    if (rng.next() < 0.18 + contest) {
      if (chaseAt >= 70 && rng.next() < 0.35 + possessing.sheet.attack / 300) {
        scoreTry(possessing, t, events, chaser);
        attemptConversion(possessing, t, events, wmods, rng);
        return { fieldX: 20, flip: true, scoredTry: true };
      }
      return { fieldX: clampField(chaseAt - 5), flip: false, scoredTry: false };
    }
    return { fieldX: clampField(100 - chaseAt + 8), flip: true, scoredTry: false };
  }

  if (kind === 'grubber') {
    const tipAt = clampField(fieldX + 12 + rng.next() * 18);
    if (tipAt >= 88 && rng.next() < 0.28 + possessing.sheet.attack / 350) {
      const scorer = pickActor(
        possessing.roster,
        rng,
        (p) => BACKS.has(p) || HALVES.has(p),
        'speed',
        FINISHER,
      );
      scoreTry(possessing, t, events, scorer);
      attemptConversion(possessing, t, events, wmods, rng);
      return { fieldX: 20, flip: true, scoredTry: true };
    }
    return { fieldX: clampField(22 + rng.next() * 10), flip: true, scoredTry: false };
  }

  const receiverStart = clampField(22 - (dist - 40) * 0.25);
  return { fieldX: receiverStart, flip: true, scoredTry: false };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function clampField(x: number): number {
  return Math.max(0, Math.min(100, x));
}

/**
 * Late-match fitness mods (GitHub #6). fitness 50 = neutral; higher → fewer
 * errors and better break retention after FITNESS_LATE_T.
 */
function fitnessContestMods(
  fitness: number,
  t: number,
): { errorMult: number; breakMult: number } {
  if (t < FITNESS_LATE_T) return { errorMult: 1, breakMult: 1 };
  const delta = (clampStat(fitness) - 50) / 50; // ≈ −1 .. +1
  return {
    errorMult: Math.max(0.55, Math.min(1.55, 1 - delta * 0.4)),
    breakMult: Math.max(0.65, Math.min(1.4, 1 + delta * 0.3)),
  };
}

function rollContest(
  atkDiff: number,
  momentum: number,
  possIsHome: boolean,
  wmods: WeatherMods,
  rng: Rng,
  fitness: number,
  t: number,
  defHardMen = 0,
): ContestOutcome {
  const diffShift = atkDiff * 0.12;
  const momMod = momentumWeightMod(momentum, possIsHome);
  const fit = fitnessContestMods(fitness, t);

  let breakW = (BASE_BREAK + diffShift) * wmods.breakMult * momMod * fit.breakMult;
  let breakTackleW = (BASE_BREAK_TACKLE + diffShift * 0.5) * momMod * fit.breakMult;
  let fendW = (BASE_FEND + diffShift * 0.4) * momMod;
  let tackleW = (BASE_TACKLE - diffShift * 0.3) / momMod;
  let errorW = (BASE_ERROR - diffShift) * wmods.errorMult * fit.errorMult;
  const penaltyW = BASE_PENALTY;
  let bigHitW = (BASE_BIGHIT - diffShift * 0.3) * (1 + HARDMAN_BIGHIT_WEIGHT * defHardMen);

  breakW = Math.max(0.02, breakW);
  breakTackleW = Math.max(0.02, breakTackleW);
  fendW = Math.max(0.02, fendW);
  tackleW = Math.max(0.05, tackleW);
  errorW = Math.max(0.01, errorW);
  bigHitW = Math.max(0.02, bigHitW);

  const total = tackleW + fendW + breakTackleW + breakW + errorW + penaltyW + bigHitW;
  let r = rng.next() * total;
  if ((r -= tackleW) < 0) return 'tackle';
  if ((r -= fendW) < 0) return 'fend';
  if ((r -= breakTackleW) < 0) return 'break-tackle';
  if ((r -= breakW) < 0) return 'break';
  if ((r -= errorW) < 0) return 'error';
  if ((r -= penaltyW) < 0) return 'penalty';
  return 'big-hit';
}

/**
 * Small deterministic injury chance on a big-hit vs carrier injuryRisk (GitHub #7).
 * Returns null when the carrier walks away; weeks ∈ {1,2,3} when hurt.
 */
export function rollBigHitInjury(
  roster: readonly RosterEntry[],
  carrierName: string | undefined,
  teamId: string,
  rng: Rng,
  injuryRate = 1,
): MatchInjury | null {
  if (!carrierName) return null;
  const entry = roster.find((p) => p.name === carrierName);
  const risk = entry?.injuryRisk ?? 20;
  // ~3.5% at risk 20, ~5.5% at 40, ~11.5% at 100 — rare but meaningful.
  const proneMult = hasTrait(entry, 'injuryProne') ? INJURY_PRONE_MULT : 1;
  const chance = (0.015 + (risk / 100) * 0.1) * injuryRate * proneMult;
  if (rng.next() >= chance) return null;
  const weeks = 1 + Math.floor(rng.next() * 3);
  const injury: MatchInjury = { teamId, playerName: carrierName, weeks };
  if (entry?.id !== undefined) injury.playerId = entry.id;
  return injury;
}

function scoreTry(side: Side, t: number, events: MatchEvent[], player?: string): void {
  side.score += 4;
  side.tryCount++;
  events.push(mkEvent(t, 'try', side.sheet.clubId, evExtra({ x: 100, y: 50 }, player)));
}

function kickProb(kicking: number, base: number): number {
  const p = base + ((kicking - 50) / 50) * 0.25;
  return Math.max(0.05, Math.min(0.98, p));
}

function attemptConversion(
  side: Side,
  t: number,
  events: MatchEvent[],
  wmods: WeatherMods,
  rng: Rng,
): void {
  const prob = (kickProb(side.sheet.kicking, 0.75) + kickerBonus(side.roster)) * wmods.kickSuccessMult;
  const good = rng.next() < prob;
  if (good) side.score += 2;
  events.push(
    mkEvent(
      t,
      'conversion',
      side.sheet.clubId,
      evExtra({ detail: good ? 'good' : 'missed', x: 90, y: 50 }, kickerName(side.roster)),
    ),
  );
}

function kickDistance(kicking: number, wmods: WeatherMods, rng: Rng): number {
  const base = 30 + (kicking / 100) * 30;
  let windFactor = wmods.kickDistanceMult;
  if (wmods.kickDistanceMult !== 1.0) {
    windFactor = rng.next() < 0.5 ? 1 + WIND_DISTANCE_JITTER : 1 - WIND_DISTANCE_JITTER;
  }
  return base * windFactor;
}
