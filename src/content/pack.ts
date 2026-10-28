// src/content/pack.ts — a league/locale content pack (GitHub #361). Everything
// that makes the game one league in one place sits behind this shape: the
// league's size and season, the match rules, the rival clubs, the name pools,
// the words players read for the sport, and the season-end trip card. The game
// reads the active pack through src/content/index.ts activePack(); config.ts,
// match/league/rules.ts and src/data/* re-export its values under their old
// names, so call sites never see it.
//
// Only display strings and values live here. Data keys (`footyIQ`), card ids
// and flag ids stay as they are in the code, because saves store them. Pure
// data and checks: no Phaser, no store, no runtime imports (config.ts imports
// the active pack, so a runtime import of config here would be a cycle).
import type { RivalClub } from '../core/state';

/** The league's shape: config.ts re-exports each of these under its old name. */
export interface LeagueShape {
  /** Regular-season rounds (config SEASON_ROUNDS). */
  seasonRounds: number;
  /** Finals weeks after the regular season, if qualified (config FINALS_WEEKS). */
  finalsWeeks: number;
  /** Players on the field per side (config ON_FIELD). */
  onField: number;
  /** Tackles per set before a last-tackle kick (config SET_TACKLES). */
  setTackles: number;
  /** Points awarded to the non-forfeiting side (config FORFEIT_SCORE). */
  forfeitScore: number;
  /** Fit players needed to field a side (config SQUAD_MIN). */
  squadMin: number;
  /** Most players a squad may hold (config SQUAD_CAP). */
  squadCap: number;
  /** The league's rating centre and where a new game starts against it (config LEAGUE). */
  rating: {
    readonly MEAN: number;
    readonly START_STARS: number;
    readonly START_FIRST_GRADE: number;
    readonly START_DEPTH_GAP: number;
    readonly POOL_BELOW: number;
  };
}

/**
 * The match rules (tuning reference §13). match/league/rules.ts re-exports the
 * active pack's object as NINES, and the balance harness overrides its fields
 * by name (`rules.halfMinutes`), so it is mutable and its key order is the
 * order `npm run balance -- --list` prints.
 */
export interface MatchRules {
  halfMinutes: number;
  tryPoints: number;
  bonusTryPoints: number;
  conversionPoints: number;
  fieldGoalPoints: number;
  halfTimeTicks: number;
  halfTimeLegsBack: number;
  playOnMaxS: number;
  goldenPointMinutes: number;
  goldenPointBreakTicks: number;
}

/** The text on the match stadium's hoardings (art/match/stadium.ts), by panel. The colours stay in the art. */
export interface StadiumSigns {
  /** The red panel: the food at the ground. */
  food: string;
  /** The blue panel: the sport's own word. */
  sport: string;
  /** The panel in the home side's kit. */
  home: string;
  /** The dark panel: the other food at the ground. */
  snack: string;
  /** The white panel. */
  score: string;
  /** The panel in the away side's kit. */
  away: string;
  /** The orange panel. */
  cheer: string;
}

/** The words players read for the sport. */
export interface Vocabulary {
  /** The `footyIQ` stat's label: "Footy IQ". Mid-sentence it is lowered by inlineIqStat(). */
  iqStat: string;
  /** The sport in a word, as a fan says it: "footy". */
  sport: string;
  stadiumSigns: StadiumSigns;
}

/** The season-end trip card (events deck `baliTrip`). Its id, and the flag its incident sets, stay in data/events.ts. */
export interface TripText {
  /** Where the squad wants to go, for sentences that name it (the Guide). */
  destination: string;
  title: string;
  text: string;
  /** The news line when the trip goes ahead. */
  outcome: string;
  /** One of these is posted when the trip's incident lands; {player} is who it landed on. */
  hitNews: readonly string[];
  /** Posted when it doesn't. */
  missNews: string;
}

/** A card's text in this pack, replacing the deck's own. Ids are data/events.ts card ids. */
export interface CardText {
  title?: string;
  text?: string;
}

export interface ContentPack {
  /** Short id, as VITE_CONTENT_PACK names it: 'au'. */
  id: string;
  league: LeagueShape;
  rules: MatchRules;
  /** The rival clubs a new game starts with (data/league.ts RIVAL_CLUBS). ids are `rival-` kebab-case and stable. */
  clubs: readonly RivalClub[];
  /** Name pools for generated players (data/names.ts). */
  names: { first: readonly string[]; last: readonly string[] };
  vocab: Vocabulary;
  events: {
    trip: TripText;
    /** Text overrides by card id; empty when the deck's own text is this pack's. */
    cardText: Readonly<Record<string, CardText>>;
  };
}

/** Fewest names a pool may hold: a 30-man squad and fifteen rival squads draw from them. */
export const MIN_NAMES = 20;

const HEX = /^#[0-9a-f]{6}$/i;

/** "Footy IQ" → "footy IQ", for the stat's name mid-sentence. */
export function inlineIqStat(pack: ContentPack): string {
  const s = pack.vocab.iqStat;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * What is wrong with a pack, one line each; empty when it is fit to play.
 * Checks what the game relies on: unique club ids (never the player's
 * `'player'`), two hex colours a club, enough names, a season with rounds in
 * it, and a squad that can field a side.
 */
export function validatePack(pack: ContentPack): string[] {
  const problems: string[] = [];
  const { league } = pack;
  if (!pack.id) problems.push('pack has no id');
  if (!(league.seasonRounds > 0) || !Number.isInteger(league.seasonRounds)) problems.push(`seasonRounds must be a positive whole number (${league.seasonRounds})`);
  if (!(league.finalsWeeks >= 0) || !Number.isInteger(league.finalsWeeks)) problems.push(`finalsWeeks must be a whole number, 0 or more (${league.finalsWeeks})`);
  if (!(league.onField > 0)) problems.push(`onField must be positive (${league.onField})`);
  if (!(league.setTackles > 0)) problems.push(`setTackles must be positive (${league.setTackles})`);
  if (league.squadMin < league.onField) problems.push(`squadMin ${league.squadMin} cannot field ${league.onField}`);
  if (league.squadCap < league.squadMin) problems.push(`squadCap ${league.squadCap} is below squadMin ${league.squadMin}`);
  if (!(pack.rules.halfMinutes > 0)) problems.push(`rules.halfMinutes must be positive (${pack.rules.halfMinutes})`);

  if (pack.clubs.length === 0) problems.push('pack has no clubs');
  const ids = new Set<string>();
  for (const c of pack.clubs) {
    if (!c.id || c.id === 'player') problems.push(`club "${c.name}" has id "${c.id}"`);
    else if (ids.has(c.id)) problems.push(`club id "${c.id}" is used twice`);
    ids.add(c.id);
    if (!c.name) problems.push(`club "${c.id}" has no name`);
    if (c.colors.length !== 2 || !c.colors.every((h) => HEX.test(h))) problems.push(`club "${c.id}" needs two hex colours`);
  }

  for (const [pool, names] of [['first', pack.names.first], ['last', pack.names.last]] as const) {
    const unique = new Set(names).size;
    if (unique < MIN_NAMES) problems.push(`${pool} names: ${unique} unique, need ${MIN_NAMES}`);
  }

  if (!pack.vocab.iqStat) problems.push('vocab.iqStat is empty');
  const trip = pack.events.trip;
  if (!trip.destination || !trip.title || !trip.text || !trip.outcome) problems.push('the season-end trip card is missing text');
  if (trip.hitNews.length === 0) problems.push('the season-end trip card has no incident news');
  return problems;
}
