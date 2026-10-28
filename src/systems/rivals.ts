// src/systems/rivals.ts — rival clubs with real squads (GitHub #74). Each rival
// keeps a persistent squad of Player objects on its RivalClub entry; its
// `strength` is derived from that squad, so everything that reads strength (the
// cheap round sim, board objectives, the ladder) keeps working unchanged.
//
//   - New game / old save: generateRivalSquad builds a squad that matches the
//     club's strength (seeded per club, so it never moves the main rngSeed).
//   - Weekly: rivals short of players or thin at a position sign the best-fit
//     affordable free agent for that need, and the rest may still sign an upgrade
//     from state.freeAgents (rivalSigningTick, rate-limited, Wave 3 task 04); rival
//     injuries heal; every rival player develops a
//     little by age on its own RNG stream, and the league anchor nudges every
//     rival back toward LEAGUE.MEAN when the league as a whole has drifted
//     (developRivalsWeek, #143).
//   - Season rollover: players age and retire through aging.ts and juniors top
//     the squad back up (rolloverRivals). This replaces the old strength drift.
// Pure functions plus one tick hook. No Phaser.
import { getState, setState, type GameState, type Player, type Position, type RivalClub } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook } from '../core/time';
import { LEAGUE, ON_FIELD, SEASON_ROUNDS, STAT_MAX, WEEKS_PER_SEASON } from '../config';
import { generatePlayerAround, marketWage, overallRating, POSITIONS, wageForOverall } from '../data/player';
import { makeRng, type Rng } from '../utils/rng';
import { ageAndRetirePlayers } from './aging';
import { STRENGTH_MAX, STRENGTH_MIN } from './league';
import { poolTarget } from './freeagency';

// ── Tuning ───────────────────────────────────────────────────────────────────

/** Players in a freshly generated rival squad: two per position plus two spare. */
export const RIVAL_SQUAD_SIZE = 20;
/** Juniors are added at rollover until the squad is back to this size. */
export const RIVAL_SQUAD_MIN = 18;
/** A rival at this size releases its weakest player to make room for a signing. */
export const RIVAL_SQUAD_MAX = 24;
/** Chance per rival per week to look for an upgrade when it needs nobody. ~27 weeks × 0.1 ≈ 2.7 looks a season. */
export const RIVAL_SIGN_CHANCE = 0.1;
/**
 * Chance per week a rival with a need (short of RIVAL_SQUAD_SIZE, or thin at a
 * position) signs for it. Not certain, so a player the user has their eye on is
 * still there for a week or two; a club in need usually fills it within two weeks.
 */
export const RIVAL_NEED_CHANCE = 0.5;
/** A position with fewer fit players than this is thin, and the club looks to sign there. */
export const RIVAL_POSITION_MIN = 2;
/**
 * Signings a rival may make in a week (DECISION (Leon): 1 in season). The finals
 * weeks are the off-season window for the clubs out of it, so every rival may
 * make RIVAL_SIGNINGS_OFFSEASON then.
 */
export const RIVAL_SIGNINGS_PER_WEEK = 1;
export const RIVAL_SIGNINGS_OFFSEASON = 2;
/** Rivals stop signing while this few signable free agents are left, so the pool never runs dry before its refresh. */
export const RIVAL_POOL_FLOOR = 6;
/**
 * A signing makes the news when the player is in the top ~20% of the pool
 * (DECISION (Leon)). A fresh pool's top fifth starts this far above its target
 * (freeagency.poolTarget; generateFreeAgent's spread puts the 80th percentile at
 * +6 at every target), so the line holds as rivals thin the pool between
 * refreshes. The old fixed 65 sat above almost every player a new club's pool
 * holds (it centres near 52), so the league's signings never showed.
 */
export const RIVAL_NOTABLE_ABOVE_TARGET = 6;
/** The same top share, read off a pool directly (notableOverall) when no pool target is given. */
export const RIVAL_NOTABLE_SHARE = 0.2;
/** First-graders are generated around the club strength; depth players this far below. */
export const RIVAL_DEPTH_GAP = 8;
/** Juniors arrive this far below their anchor, then develop (about +14 by their mid-twenties). */
export const RIVAL_JUNIOR_GAP = 14;
/**
 * League level juniors are anchored to: halfway between the club's strength and
 * this, so each generation pulls a club back toward the middle of the league.
 * The number lives in config (LEAGUE.MEAN, #140) beside the new-game start.
 */
export const RIVAL_LEAGUE_MEAN: number = LEAGUE.MEAN;
/**
 * Salary cap on a rival's squad, in weekly market wages: what a 20-man squad of
 * RIVAL_WAGE_CAP_OVERALL players costs on the wage curve (data/player.ts). A
 * signing that would break it is skipped, so the strongest clubs can't keep
 * buying the best free agents. The cap follows the curve (N6, #167): it was a
 * flat $21,000 under the old straight line, which 240 of 300 rivals at a new
 * game could sign a 65 under; 62.5 on the super-linear curve ($23,000) keeps
 * that same 240, so rivals sign exactly as they did.
 */
export const RIVAL_WAGE_CAP_OVERALL = 62.5;
export const RIVAL_WAGE_CAP = Math.round(20 * wageForOverall(RIVAL_WAGE_CAP_OVERALL));
/**
 * Each season a rival player's development is nudged this fraction of the way
 * toward RIVAL_LEAGUE_MEAN (stars fade a little faster, battlers catch up), so
 * picking the best nine of a growing squad can't ratchet strength upward.
 * Applied a week at a time (developRivalsWeek).
 */
export const RIVAL_DEVELOPMENT_PULL = 0.1;
/**
 * In-season development and the league anchor (#143). Development is a chance
 * each week of ±1 on each stat, so stats stay whole numbers and over a season a
 * player moves about the BY_AGE amount: the young gain, veterans fade. The
 * anchor works the same way on every rival once the rival mean has drifted past
 * ANCHOR_DEADBAND from LEAGUE.MEAN, at ANCHOR_RATE × the gap a week (capped at
 * ANCHOR_MAX), so the league's centre holds while clubs still rise and fall
 * against each other. Assumed (needs Leon): the rates. For scale, a player's
 * squad on one Training Paddock gains about 9 overall a season.
 */
export const RIVAL_DEVELOPMENT = {
  /** [up to this age, overall points a season]. */
  BY_AGE: [[21, 4], [25, 1.5], [29, 0], [32, -2], [Infinity, -4]] as readonly (readonly [number, number])[],
  ANCHOR_RATE: 0.1,
  ANCHOR_DEADBAND: 0.5,
  ANCHOR_MAX: 0.5,
} as const;
/** Tick order: before the free-agent refresh (60), so rivals pick from the pool the player saw. */
export const RIVALS_TICK_ORDER = 59;

const clampStat = (n: number): number => Math.max(1, Math.min(STAT_MAX, Math.round(n)));

/** FNV-1a string hash, for per-club seeds. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// ── Strength ─────────────────────────────────────────────────────────────────

/** Mean overall of the best ON_FIELD players, clamped to the league band. */
export function squadStrength(squad: readonly Player[]): number {
  if (squad.length === 0) return STRENGTH_MIN;
  const best = squad.map(overallRating).sort((a, b) => b - a).slice(0, ON_FIELD);
  const mean = best.reduce((t, n) => t + n, 0) / best.length;
  return Math.round(Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, mean)));
}

/** The club with its strength re-derived from its squad (unchanged if it has none). */
export function withDerivedStrength(club: RivalClub): RivalClub {
  if (!club.squad || club.squad.length === 0) return club;
  const strength = squadStrength(club.squad);
  return strength === club.strength ? club : { ...club, strength };
}

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * One rival player whose stats sit around `target` overall (data/player.ts
 * generatePlayerAround). Morale is neutral so the team sheet's morale modifier
 * doesn't flatter rivals.
 */
export function rivalPlayer(rng: Rng, clubId: string, position: Position, target: number, age?: number): Player {
  const base = generatePlayerAround(rng, target, { position, ...(age !== undefined ? { age } : {}) });
  return {
    ...base,
    id: `${clubId}:${base.id}`,
    morale: 50,
    career: { games: 0, tries: 0, tackles: 0, lineBreaks: 0 },
  };
}

/**
 * A squad for `club` matching its current strength: two players per position
 * (the first of each pair a first-grader), plus two spare first-graders. The top
 * ON_FIELD come out close to `club.strength`.
 */
export function generateRivalSquad(club: Pick<RivalClub, 'id' | 'strength'>, seed: number): Player[] {
  const rng = makeRng(seed);
  const first = club.strength - 1; // picking the best 9 of 11 lifts the mean back up
  const squad: Player[] = [];
  for (const pos of POSITIONS) {
    squad.push(rivalPlayer(rng, club.id, pos, first));
    squad.push(rivalPlayer(rng, club.id, pos, club.strength - RIVAL_DEPTH_GAP));
  }
  while (squad.length < RIVAL_SQUAD_SIZE) squad.push(rivalPlayer(rng, club.id, rng.pick(POSITIONS), first));
  return squad;
}

/** Seed for a club's generated squad: per game (rngSeed) and per club, without drawing from the main RNG. */
export function rivalSquadSeed(rngSeed: number, clubId: string): number {
  return (hashString(clubId) ^ Math.imul(rngSeed >>> 0, 2654435761)) >>> 0;
}

/** Give every rival without a squad a generated one and derive strength from it. */
export function withRivalSquads(clubs: readonly RivalClub[], rngSeed: number, playerId = 'player'): RivalClub[] {
  return clubs.map((c) => {
    if (c.id === playerId || (c.squad && c.squad.length > 0)) return c;
    return withDerivedStrength({ ...c, squad: generateRivalSquad(c, rivalSquadSeed(rngSeed, c.id)) });
  });
}

// ── Weekly: signings and injuries ────────────────────────────────────────────

/** A player's weekly market wage: data/player.ts owns the formula (#146); re-exported for existing imports. */
export { marketWage };

/** Σ market wages of a squad (what the rival salary cap counts). */
export function squadWages(squad: readonly Player[]): number {
  return squad.reduce((t, p) => t + marketWage(p), 0);
}

/** Best overall per position in a squad (0 where the position is empty). */
function bestByPosition(squad: readonly Player[]): Map<Position, number> {
  const out = new Map<Position, number>(POSITIONS.map((p) => [p, 0] as const));
  for (const p of squad) out.set(p.position, Math.max(out.get(p.position) ?? 0, overallRating(p)));
  return out;
}

/** The position whose best player is weakest (ties: POSITIONS order). */
export function weakestPosition(squad: readonly Player[]): Position {
  const best = bestByPosition(squad);
  let pick: Position = POSITIONS[0]!;
  for (const pos of POSITIONS) if ((best.get(pos) ?? 0) < (best.get(pick) ?? 0)) pick = pos;
  return pick;
}

/**
 * The free agent a rival would sign, or null: the best one at its weakest
 * position who beats its current best there; failing that, the best one who
 * would walk into its starting side. Academy prospects are the player's own and
 * are never taken.
 */
export function pickSigning(squad: readonly Player[], freeAgents: readonly Player[]): Player | null {
  const pool = freeAgents.filter((p) => !p.junior);
  if (pool.length === 0) return null;
  const byOverall = (a: Player, b: Player): number => overallRating(b) - overallRating(a) || a.id.localeCompare(b.id);
  const weak = weakestPosition(squad);
  const weakBest = bestByPosition(squad).get(weak) ?? 0;
  const atWeak = pool.filter((p) => p.position === weak && overallRating(p) > weakBest).sort(byOverall);
  if (atWeak[0]) return atWeak[0];
  const ranked = squad.map(overallRating).sort((a, b) => b - a);
  const cut = ranked[Math.min(ON_FIELD, ranked.length) - 1] ?? 0;
  return pool.filter((p) => overallRating(p) > cut).sort(byOverall)[0] ?? null;
}

/** Fit to play: not injured or suspended. */
function isFit(p: Player): boolean {
  return p.injuredWeeks <= 0 && !(p.suspendedWeeks && p.suspendedWeeks > 0);
}

/** Fit players at each position. */
function fitByPosition(squad: readonly Player[]): Map<Position, number> {
  const out = new Map<Position, number>(POSITIONS.map((p) => [p, 0] as const));
  for (const p of squad) if (isFit(p)) out.set(p.position, (out.get(p.position) ?? 0) + 1);
  return out;
}

/** Why a rival signs: to fill a squad short of players or a thin position, or for an upgrade. */
export interface RivalNeed {
  kind: 'size' | 'thin';
  position: Position;
}

/**
 * What a rival needs, or null: a thin position (fewer than RIVAL_POSITION_MIN
 * fit, after retirements or injuries) first, then a squad short of
 * RIVAL_SQUAD_SIZE, filled at its thinnest position (ties: the weakest, then
 * POSITIONS order).
 */
export function rivalNeed(squad: readonly Player[]): RivalNeed | null {
  const fit = fitByPosition(squad);
  const best = bestByPosition(squad);
  let thinnest: Position = POSITIONS[0]!;
  for (const pos of POSITIONS) {
    const n = fit.get(pos) ?? 0;
    const m = fit.get(thinnest) ?? 0;
    if (n < m || (n === m && (best.get(pos) ?? 0) < (best.get(thinnest) ?? 0))) thinnest = pos;
  }
  if ((fit.get(thinnest) ?? 0) < RIVAL_POSITION_MIN) return { kind: 'thin', position: thinnest };
  if (squad.length < RIVAL_SQUAD_SIZE) return { kind: 'size', position: thinnest };
  return null;
}

/** Can `squad` take `target` under the squad limit and the salary cap? */
function fits(squad: readonly Player[], target: Player): boolean {
  return squad.length < RIVAL_SQUAD_MAX && squadWages(squad) + marketWage(target) <= RIVAL_WAGE_CAP;
}

/**
 * The squad with room made for `target`: as it is if the player fits, else less
 * its weakest player (one at most, and never one whose going would leave a
 * position thinner than RIVAL_POSITION_MIN once `target` is in), or null when
 * even that doesn't fit.
 */
function makeRoom(squad: readonly Player[], target: Player): { squad: Player[]; released: Player | null } | null {
  if (fits(squad, target)) return { squad: [...squad], released: null };
  const fit = fitByPosition(squad);
  const spare = (p: Player): boolean => {
    const now = fit.get(p.position) ?? 0;
    const after = now - (isFit(p) ? 1 : 0) + (p.position === target.position ? 1 : 0);
    return after >= Math.min(RIVAL_POSITION_MIN, now);
  };
  const worst = squad
    .filter(spare)
    .sort((a, b) => overallRating(a) - overallRating(b) || a.id.localeCompare(b.id))[0];
  if (!worst) return null;
  const without = squad.filter((p) => p.id !== worst.id);
  return fits(without, target) ? { squad: without, released: worst } : null;
}

/**
 * The free agent a rival signs for `need`, or null: the best affordable one at
 * the needed position (after making room); for a squad short of players with
 * nobody there, the best affordable one anywhere. Academy prospects are the
 * player's own and are never taken.
 */
export function pickNeedSigning(squad: readonly Player[], freeAgents: readonly Player[], need: RivalNeed): Player | null {
  const byOverall = (a: Player, b: Player): number => overallRating(b) - overallRating(a) || a.id.localeCompare(b.id);
  const affordable = freeAgents.filter((p) => !p.junior && makeRoom(squad, p) !== null).sort(byOverall);
  return affordable.find((p) => p.position === need.position) ?? (need.kind === 'size' ? affordable[0] ?? null : null);
}

/** The lowest overall that makes the news: the top RIVAL_NOTABLE_SHARE of `pool` (Infinity when it is empty). */
export function notableOverall(pool: readonly Player[]): number {
  const ovr = pool.filter((p) => !p.junior).map(overallRating).sort((a, b) => b - a);
  if (ovr.length === 0) return Infinity;
  return ovr[Math.max(1, Math.ceil(ovr.length * RIVAL_NOTABLE_SHARE)) - 1]!;
}

export interface SigningResult {
  clubs: RivalClub[];
  freeAgents: Player[];
  news: string[];
  /** Every signing, for tests and tuning. */
  signed: { clubId: string; playerId: string; overall: number; reason: 'size' | 'thin' | 'upgrade' }[];
}

export interface SigningOptions {
  playerId?: string;
  /** Signings each rival may make this week (RIVAL_SIGNINGS_PER_WEEK; RIVAL_SIGNINGS_OFFSEASON in the finals weeks). */
  perClub?: number;
  /** Which rival picks first; turns with the week so no club always has first pick. */
  start?: number;
  /** Lowest overall that makes the news (default: notableOverall of the pool as the week began). */
  notable?: number;
}

/**
 * One week of rival free agency (pure). Each rival, up to `perClub` times: with a
 * need (rivalNeed) it rolls RIVAL_NEED_CHANCE and signs pickNeedSigning's choice;
 * with none it rolls RIVAL_SIGN_CHANCE for pickSigning's upgrade. Either releases
 * its weakest player to the pool first if the squad limit or the RIVAL_WAGE_CAP
 * needs the room. Nobody signs while RIVAL_POOL_FLOOR or fewer signable agents
 * are left. Clubs are visited in league order from `start`, so an earlier club
 * can take a player a later one wanted. Signings at `notable` or above make the news.
 */
export function rivalSigningTick(clubs: readonly RivalClub[], freeAgents: readonly Player[], rng: Rng, opts: SigningOptions = {}): SigningResult {
  const { playerId = 'player', perClub = RIVAL_SIGNINGS_PER_WEEK, start = 0, notable = notableOverall(freeAgents) } = opts;
  let pool = [...freeAgents];
  const news: string[] = [];
  const signed: SigningResult['signed'] = [];
  const out = [...clubs];
  const n = clubs.length;
  for (let k = 0; k < n; k++) {
    const i = (((start % n) + n) % n + k) % n;
    let club = out[i]!;
    if (club.id === playerId || !club.squad) continue;
    for (let t = 0; t < perClub; t++) {
      if (pool.filter((p) => !p.junior).length <= RIVAL_POOL_FLOOR) break;
      const squad: Player[] = club.squad!;
      const need = rivalNeed(squad);
      if (rng.next() >= (need ? RIVAL_NEED_CHANCE : RIVAL_SIGN_CHANCE)) break;
      const target = need ? pickNeedSigning(squad, pool, need) : pickSigning(squad, pool);
      if (!target) break;
      // Make room under the squad limit and the salary cap by releasing the weakest
      // player (one at most); if that still doesn't fit, there's no deal.
      const room = makeRoom(squad, target);
      if (!room) break;
      if (room.released) pool.push({ ...room.released, injuredWeeks: 0 });
      pool = pool.filter((p) => p.id !== target.id);
      const ovr = overallRating(target);
      signed.push({ clubId: club.id, playerId: target.id, overall: ovr, reason: need?.kind ?? 'upgrade' });
      if (ovr >= notable) news.push(`${club.name} sign ${ovr}-rated ${target.position} ${target.name}.`);
      club = withDerivedStrength({ ...club, squad: [...room.squad, { ...target, morale: 50, departed: false }] });
    }
    out[i] = club;
  }
  return { clubs: out, freeAgents: pool, news, signed };
}

// ── Weekly: development and the league anchor (#143) ─────────────────────────

/** Expected change in overall over a season for a player of `age` (RIVAL_DEVELOPMENT.BY_AGE). */
export function developmentRate(age: number): number {
  for (const [upTo, rate] of RIVAL_DEVELOPMENT.BY_AGE) if (age <= upTo) return rate;
  return 0;
}

/** One week's chance of a ±1 step that averages `perSeason` over a season. */
function stepStat(value: number, perSeason: number, rng: Rng): number {
  if (perSeason === 0) return value;
  const p = Math.min(1, Math.abs(perSeason) / WEEKS_PER_SEASON);
  if (rng.next() >= p) return value;
  return clampStat(value + Math.sign(perSeason));
}

/** Nudge every stat of `p` by a chance of ±1 that averages `perSeason` over a season. */
function nudgeStats(p: Player, perSeason: number, rng: Rng): Player {
  if (perSeason === 0) return p;
  const s = p.stats;
  return {
    ...p,
    stats: {
      speed: stepStat(s.speed, perSeason, rng),
      strength: stepStat(s.strength, perSeason, rng),
      stamina: stepStat(s.stamina, perSeason, rng),
      skill: stepStat(s.skill, perSeason, rng),
      footyIQ: stepStat(s.footyIQ, perSeason, rng),
    },
  };
}

/** A week of development for one rival player: by age, plus the pull toward the league mean. */
export function developRivalPlayerWeek(p: Player, rng: Rng): Player {
  const perSeason = developmentRate(p.age) + (RIVAL_LEAGUE_MEAN - overallRating(p)) * RIVAL_DEVELOPMENT_PULL;
  return nudgeStats(p, perSeason, rng);
}

/** Mean strength of the rivals (the player's entry and squadless clubs excluded). */
export function rivalMeanStrength(clubs: readonly RivalClub[], playerId = 'player'): number {
  const rivals = clubs.filter((c) => c.id !== playerId && c.squad && c.squad.length > 0);
  if (rivals.length === 0) return RIVAL_LEAGUE_MEAN;
  return rivals.reduce((t, c) => t + c.strength, 0) / rivals.length;
}

/**
 * The league anchor's weekly correction, in overall points a season, for a rival
 * mean of `mean`: zero inside the deadband, otherwise toward LEAGUE.MEAN at
 * ANCHOR_RATE × the gap a week (capped), expressed per season for nudgeStats.
 */
export function anchorPerSeason(mean: number): number {
  const gap = mean - RIVAL_LEAGUE_MEAN;
  if (Math.abs(gap) <= RIVAL_DEVELOPMENT.ANCHOR_DEADBAND) return 0;
  const weekly = Math.min(RIVAL_DEVELOPMENT.ANCHOR_MAX, Math.abs(gap) * RIVAL_DEVELOPMENT.ANCHOR_RATE);
  return -Math.sign(gap) * weekly * WEEKS_PER_SEASON;
}

/**
 * One week of rival development (pure): every rival player develops by age with
 * the pull toward the league mean, then the anchor nudges every rival player
 * toward LEAGUE.MEAN if the rival mean has drifted. Strengths are re-derived.
 * `rng` is the rivals' own development stream (rivalDevelopSeed), never rngSeed.
 */
export function developRivalsWeek(clubs: readonly RivalClub[], rng: Rng, playerId = 'player'): RivalClub[] {
  const developed = clubs.map((club) => {
    if (club.id === playerId || !club.squad) return club;
    return withDerivedStrength({ ...club, squad: club.squad.map((p) => developRivalPlayerWeek(p, rng)) });
  });
  const anchor = anchorPerSeason(rivalMeanStrength(developed, playerId));
  if (anchor === 0) return developed;
  return developed.map((club) => {
    if (club.id === playerId || !club.squad) return club;
    return withDerivedStrength({ ...club, squad: club.squad.map((p) => nudgeStats(p, anchor, rng)) });
  });
}

/** Rival injuries heal a week. Returns the same array when nothing changed. */
export function healRivals(clubs: readonly RivalClub[]): RivalClub[] {
  let changed = false;
  const out = clubs.map((c) => {
    if (!c.squad?.some((p) => p.injuredWeeks > 0)) return c;
    changed = true;
    return { ...c, squad: c.squad.map((p) => (p.injuredWeeks > 0 ? { ...p, injuredWeeks: p.injuredWeeks - 1 } : p)) };
  });
  return changed ? out : (clubs as RivalClub[]);
}

/** Put injuries from the player's match onto a rival's squad (by id). */
export function injureRivalPlayers(clubs: readonly RivalClub[], injuries: readonly { teamId: string; playerId?: string; weeks: number }[]): RivalClub[] {
  return clubs.map((c) => {
    const hits = injuries.filter((i) => i.teamId === c.id && i.playerId);
    if (hits.length === 0 || !c.squad) return c;
    return {
      ...c,
      squad: c.squad.map((p) => {
        const hit = hits.find((i) => i.playerId === p.id);
        return hit ? { ...p, injuredWeeks: Math.max(p.injuredWeeks, hit.weeks) } : p;
      }),
    };
  });
}

// ── Season rollover ──────────────────────────────────────────────────────────

export interface RolloverResult {
  clubs: RivalClub[];
  retired: number;
  juniors: number;
}

/**
 * Season rollover for every rival (pure): age and retire through aging.ts,
 * heal everyone, then top the squad up to RIVAL_SQUAD_MIN with juniors at the
 * club's weakest positions, and re-derive strength. Development happens during
 * the season (developRivalsWeek, #143), not here.
 */
export function rolloverRivals(clubs: readonly RivalClub[], rng: Rng, playerId = 'player'): RolloverResult {
  let retired = 0;
  let juniors = 0;
  const out = clubs.map((club) => {
    if (club.id === playerId || !club.squad) return club;
    const aged = ageAndRetirePlayers(club.squad, [], rng);
    retired += aged.retired.length;
    const squad = aged.squad.map((p) => (p.injuredWeeks > 0 ? { ...p, injuredWeeks: 0 } : p));
    while (squad.length < RIVAL_SQUAD_MIN) {
      const anchor = (club.strength + RIVAL_LEAGUE_MEAN) / 2;
      squad.push(rivalPlayer(rng, club.id, weakestPosition(squad), anchor - RIVAL_JUNIOR_GAP, rng.int(17, 19)));
      juniors++;
    }
    return withDerivedStrength({ ...club, squad });
  });
  return { clubs: out, retired, juniors };
}

// ── Store glue ───────────────────────────────────────────────────────────────

/** Weekly rival seed: from the season, week and current rngSeed, without advancing it. */
export function rivalWeekSeed(state: Pick<GameState, 'season' | 'week' | 'rngSeed'>): number {
  return (hashString(`rivals:${state.season}:${state.week}`) ^ state.rngSeed) >>> 0;
}

/** The development stream's seed for the week: its own hash, so signings and development never share dice. */
export function rivalDevelopSeed(state: Pick<GameState, 'season' | 'week' | 'rngSeed'>): number {
  return (hashString(`rivals-develop:${state.season}:${state.week}`) ^ state.rngSeed) >>> 0;
}

/** Install the weekly rival hook: heal injuries, sign free agents (more in the finals weeks), then develop and anchor. */
export function registerRivalsSystem(): void {
  registerTickHook('rivals', RIVALS_TICK_ORDER, () => {
    const s = getState();
    if (s.league.clubs.length === 0) return;
    const healed = healRivals(s.league.clubs);
    const perClub = s.week > SEASON_ROUNDS ? RIVAL_SIGNINGS_OFFSEASON : RIVAL_SIGNINGS_PER_WEEK;
    const r = rivalSigningTick(healed, s.freeAgents, makeRng(rivalWeekSeed(s)), {
      perClub, start: s.week, notable: Math.round(poolTarget(s)) + RIVAL_NOTABLE_ABOVE_TARGET,
    });
    const clubs = developRivalsWeek(r.clubs, makeRng(rivalDevelopSeed(s)));
    setState({ league: { ...s.league, clubs }, freeAgents: r.freeAgents });
    for (const text of r.news) bus.emit('ui:notify', { text, kind: 'info' });
  });
}
