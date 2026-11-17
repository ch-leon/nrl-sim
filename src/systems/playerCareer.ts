import { generateFreeAgent, POSITIONS, shownStats } from '../data/player';
import { TRAIT_IDS } from '../data/traits';
import { poolTarget } from './freeagency';
import type { GameState, Player } from '../core/state';
import type { CareerDate, ClubArrival, ClubDeparture, PlayerCareerHistory, PlayerPopulation, RetiredPlayerRecord } from '../data/playerCareer';
import { makeRng } from '../utils/rng';

export const MARKET_SHORTLIST_SIZE = 12;

/** Legacy evidence establishes today's owner only, never an invented earlier club. */
export function observedHistory(player: Player, owner: string, date: CareerDate, arrival: ClubArrival = 'observed'): PlayerCareerHistory {
  return {
    spells: owner === 'unsigned' ? [] : [{ clubId: owner, start: { season: date.season, week: date.week }, arrival }],
    academyDiscountUsed: owner !== 'unsigned' || player.junior !== true || player.departed === true,
  };
}

/** Installation boundary for freshly generated rosters. Existing history is never reset. */
export function installPlayerHistory(player: Player, owner: string, date: CareerDate, arrival: ClubArrival = 'opening'): Player {
  return player.clubHistory ? player : { ...player, clubHistory: observedHistory(player, owner, date, arrival) };
}

export function initialPlayerPopulation(state: Pick<GameState, 'season' | 'squad' | 'freeAgents' | 'league'>): PlayerPopulation {
  const ids = new Set([...state.squad, ...state.freeAgents, ...state.league.clubs.flatMap(c => c.squad ?? [])].map(p => p.id));
  let nextPlayerOrdinal = 1;
  while (ids.has(`career-person:${nextPlayerOrdinal}`)) nextPlayerOrdinal++;
  return { schemaVersion: 1, shortlistIds: state.freeAgents.map(p => p.id), retired: [], nextPlayerOrdinal,
    lastMarketIntakeSeason: state.season, lastAcademyIntakeSeason: state.season };
}

/** A date-local stream: discovery never consumes the match or progression RNG. */
function marketSeed(state: Pick<GameState, 'season' | 'week' | 'clubId'>): number {
  let hash = 2166136261;
  for (const char of `market:${state.clubId}:${state.season}:${state.week}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function pinned(state: GameState, p: Player): boolean {
  return p.junior === true || p.departed === true || p.clubHistory?.spells.some(s => s.clubId === state.clubId) === true;
}

export function discoveredFreeAgents(state: GameState): Player[] {
  const ids = new Set(state.playerPopulation.shortlistIds);
  return state.freeAgents.filter(p => ids.has(p.id) || pinned(state, p));
}

export function refreshMarketShortlist(state: GameState): GameState {
  const ordinary = state.freeAgents.filter(p => !pinned(state, p)).map(p => p.id).sort();
  const shortlistIds = makeRng(marketSeed(state)).shuffle(ordinary).slice(0, MARKET_SHORTLIST_SIZE);
  return { ...state, playerPopulation: { ...state.playerPopulation, shortlistIds } };
}

/** Canonical rosters alone determine ownership. Duplicate IDs are never resolved by order. */
function ownedPeople(state: GameState): { player: Player; owner: string }[] {
  return [...state.squad.map(player => ({ player, owner: state.clubId })),
    ...state.freeAgents.map(player => ({ player, owner: 'unsigned' })),
    ...state.league.clubs.flatMap(c => (c.squad ?? []).map(player => ({ player, owner: c.id })))];
}

export function ownerOf(state: GameState, id: string): string | undefined {
  const matches = ownedPeople(state).filter(({ player }) => player.id === id);
  if (matches.length > 1) throw new Error(`Duplicate player ownership: ${id}`);
  return matches[0]?.owner;
}

const dateOf = ({ season, week }: CareerDate): CareerDate => ({ season, week });
const compareDates = (a: CareerDate, b: CareerDate): number => a.season - b.season || a.week - b.week;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const validDate = (v: unknown): v is CareerDate => record(v) && integer(v.season, 1) && integer(v.week, 1);
const arrivals: readonly string[] = ['opening', 'observed', 'signing', 'transfer', 'emergency'];
const departures: readonly string[] = ['transfer', 'release', 'expiry', 'retirement'];

export function openClubSpell(player: Player, clubId: string, date: CareerDate, arrival: ClubArrival, transferFee?: number): Player {
  const history = player.clubHistory;
  if (!history || history.spells.some(s => !s.end)) throw new Error('Opening a club spell requires installed history with no open spell');
  const last = history.spells[history.spells.length - 1];
  if (!validDate(date) || (last?.end && compareDates(last.end, date) > 0) || last?.departure === 'retirement') throw new Error('Invalid club spell chronology');
  if (!clubId || clubId === 'unsigned' || !arrivals.includes(arrival) || (transferFee !== undefined && !integer(transferFee))) throw new Error('Invalid club arrival');
  return { ...player, clubHistory: { academyDiscountUsed: true, spells: [...history.spells,
    { clubId, start: dateOf(date), arrival, ...(transferFee === undefined ? {} : { transferFee }) }] } };
}

export function closeClubSpell(player: Player, date: CareerDate, departure: ClubDeparture): Player {
  const history = player.clubHistory;
  const open = history?.spells.filter(s => !s.end) ?? [];
  if (!history || open.length !== 1) throw new Error('Closing a club spell requires exactly one open spell');
  if (!validDate(date) || compareDates(open[0]!.start, date) > 0 || !departures.includes(departure)) throw new Error('Invalid club departure chronology');
  return { ...player, clubHistory: { ...history, spells: history.spells.map(s => s === open[0] ? { ...s, end: dateOf(date), departure } : s) } };
}

function retiredRecord(player: Player, date: CareerDate): RetiredPlayerRecord {
  const p = player.clubHistory?.spells.some(s => !s.end) ? closeClubSpell(player, date, 'retirement') : player;
  if (!p.clubHistory) throw new Error('Retirement requires installed history');
  return structuredClone({ id: p.id, name: p.name, age: p.age, position: p.position, stats: p.stats, ceilings: p.ceilings, traits: p.traits,
    ...(p.career === undefined ? {} : { career: p.career }), ...(p.seasonStats === undefined ? {} : { seasonStats: p.seasonStats }),
    ...(p.xp === undefined ? {} : { xp: p.xp }), ...(p.level === undefined ? {} : { level: p.level }),
    ...(p.unspentPoints === undefined ? {} : { unspentPoints: p.unspentPoints }), ...(p.joinedSeason === undefined ? {} : { joinedSeason: p.joinedSeason }),
    retiredAt: dateOf(date), clubHistory: p.clubHistory });
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => record(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
}

/** The caller removes all retirees atomically from live rosters before archiving. */
export function archiveRetirees(state: GameState, players: readonly Player[], date: CareerDate): GameState {
  if (!validDate(date) || compareDates(date, state) > 0) throw new Error('Invalid retirement date');
  const retired = [...state.playerPopulation.retired];
  for (const player of players) {
    if (ownerOf(state, player.id) !== undefined) throw new Error(`Cannot archive live player: ${player.id}`);
    const next = retiredRecord(player, date);
    if (!validHistory(next.clubHistory, new Set([state.clubId, ...state.league.clubs.map(c => c.id)]), date, undefined)) throw new Error('Invalid retired history');
    const previous = retired.find(p => p.id === player.id);
    if (previous) {
      if (stableJson(previous) !== stableJson(next)) throw new Error(`Conflicting retirement: ${player.id}`);
    } else retired.push(next);
  }
  if (retired.length === state.playerPopulation.retired.length) return state;
  const ids = new Set(retired.map(p => p.id));
  return { ...state, playerPopulation: { ...state.playerPopulation, retired, shortlistIds: state.playerPopulation.shortlistIds.filter(id => !ids.has(id)) } };
}

/** Annual births are separate from discovery; the lifecycle owner calls this once. */
export function intakeUnsignedMarket(state: GameState): GameState {
  if (state.playerPopulation.lastMarketIntakeSeason >= state.season) return state;
  const ids = new Set([...ownedPeople(state).map(({ player }) => player.id), ...state.playerPopulation.retired.map(p => p.id)]);
  let nextPlayerOrdinal = state.playerPopulation.nextPlayerOrdinal;
  const deficit = Math.max(0, MARKET_SHORTLIST_SIZE - state.freeAgents.filter(p => !pinned(state, p)).length);
  const rng = makeRng(marketSeed({ ...state, week: 1 }) ^ 0x572a11);
  const births: Player[] = [];
  for (let i = 0; i < deficit; i++) {
    while (ids.has(`career-person:${nextPlayerOrdinal}`)) nextPlayerOrdinal++;
    if (!Number.isSafeInteger(nextPlayerOrdinal + 1)) throw new Error('Player ordinal exhausted');
    const id = `career-person:${nextPlayerOrdinal++}`;
    ids.add(id);
    births.push(installPlayerHistory({ ...generateFreeAgent(rng, poolTarget(state)), id }, 'unsigned', state));
  }
  return { ...state, freeAgents: births.length ? [...state.freeAgents, ...births] : state.freeAgents,
    playerPopulation: { ...state.playerPopulation, nextPlayerOrdinal, lastMarketIntakeSeason: state.season } };
}

function validHistory(value: unknown, clubs: Set<string>, now: CareerDate, owner: string | undefined): value is PlayerCareerHistory {
  if (!record(value) || !Array.isArray(value.spells) || typeof value.academyDiscountUsed !== 'boolean') return false;
  if ((owner !== undefined && owner !== 'unsigned' || value.spells.length > 0) && !value.academyDiscountUsed) return false;
  let previousEnd: CareerDate | undefined;
  let openOwner: string | undefined;
  for (let i = 0; i < value.spells.length; i++) {
    const spell: unknown = value.spells[i];
    if (!record(spell) || typeof spell.clubId !== 'string' || !clubs.has(spell.clubId) || !validDate(spell.start)
      || compareDates(spell.start, now) > 0 || typeof spell.arrival !== 'string' || !arrivals.includes(spell.arrival)
      || (spell.transferFee !== undefined && !integer(spell.transferFee)) || (previousEnd && compareDates(previousEnd, spell.start) > 0)) return false;
    if (spell.end === undefined) {
      if (spell.departure !== undefined || i !== value.spells.length - 1) return false;
      openOwner = spell.clubId;
    } else {
      if (!validDate(spell.end) || compareDates(spell.start, spell.end) > 0 || compareDates(spell.end, now) > 0
        || typeof spell.departure !== 'string' || !departures.includes(spell.departure)
        || (spell.departure === 'retirement' && (owner !== undefined || i !== value.spells.length - 1))) return false;
      previousEnd = spell.end;
    }
  }
  return openOwner === (owner === 'unsigned' ? undefined : owner);
}

function validRetired(p: unknown): p is RetiredPlayerRecord {
  if (!record(p) || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name || !integer(p.age, 1)
    || !POSITIONS.includes(p.position as Player['position']) || !record(p.stats) || !record(p.ceilings) || !Array.isArray(p.traits)) return false;
  const range = (v: unknown, lo: number, hi = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const stats = ['speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'];
  const ceilings = p.ceilings;
  const tally = (v: unknown): boolean => record(v) && ['games', 'tries', 'tackles', 'lineBreaks'].every(k => integer(v[k])) && (v.sinBins === undefined || integer(v.sinBins));
  return stats.every(k => range((p.stats as Record<string, unknown>)[k], 1, 100))
    && Object.keys(ceilings).every(k => stats.includes(k) && range(ceilings[k], 1, 100))
    && shownStats(p.position as Player['position']).every(k => range(ceilings[k], 1, 100))
    && p.traits.every(t => record(t) && TRAIT_IDS.includes(t.id as typeof TRAIT_IDS[number]) && integer(t.level, 1, 3))
    && new Set(p.traits.map(t => t.id)).size === p.traits.length
    && (p.xp === undefined || range(p.xp, 0)) && (p.level === undefined || integer(p.level, 1))
    && (p.unspentPoints === undefined || integer(p.unspentPoints)) && (p.joinedSeason === undefined || integer(p.joinedSeason, 1))
    && (p.career === undefined || tally(p.career))
    && (p.seasonStats === undefined || tally(p.seasonStats) && record(p.seasonStats) && integer(p.seasonStats.season, 1));
}

/** Strict boundary validation; metadata is never inferred or repaired on current saves. */
export function validatePlayerPopulation(state: GameState): string | null {
  if (state.league.clubs.some(c => c.id === state.clubId && c.squad?.length)) return 'Player club has a second roster';
  const population = state.playerPopulation;
  if (!record(population) || population.schemaVersion !== 1 || !Array.isArray(population.shortlistIds) || !Array.isArray(population.retired)
    || !integer(population.nextPlayerOrdinal, 1, Number.MAX_SAFE_INTEGER - 1)
    || !integer(population.lastMarketIntakeSeason, 1, state.season) || !integer(population.lastAcademyIntakeSeason, 1, state.season)) return 'Invalid player population metadata';
  const clubs = new Set([state.clubId, ...state.league.clubs.map(c => c.id)]);
  const ids = new Set<string>(); const unsigned = new Set<string>();
  for (const { player, owner } of ownedPeople(state)) {
    if (ids.has(player.id)) return 'Duplicate live player ownership';
    ids.add(player.id);
    if (owner === 'unsigned') unsigned.add(player.id);
    if (!validHistory(player.clubHistory, clubs, state, owner)) return 'Invalid player club history or current owner';
    if (!player.clubHistory.academyDiscountUsed && (owner !== 'unsigned' || !player.junior || player.departed)) return 'Invalid unused Academy discount';
  }
  if (new Set(population.shortlistIds).size !== population.shortlistIds.length || population.shortlistIds.some(id => typeof id !== 'string' || !unsigned.has(id))) return 'Invalid unsigned shortlist';
  for (const player of population.retired) {
    if (!validRetired(player) || !validDate(player.retiredAt) || compareDates(player.retiredAt, state) > 0
      || !validHistory(player.clubHistory, clubs, player.retiredAt, undefined)) return 'Invalid retired player record';
    if (ids.has(player.id)) return 'Live/archive player collision';
    ids.add(player.id);
  }
  return null;
}
