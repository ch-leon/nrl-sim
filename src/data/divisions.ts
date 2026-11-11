// Dormant regional world construction (#573). Calling this does not select a
// pack, replace a career, activate a calendar or apply financial rules.
import type { ContentPack } from '../content/pack';
import { activePack } from '../content';
import type { Player, Position, RivalClub } from '../core/state';
import { difficultyMultipliers, type Difficulty } from '../config';
import { generatePlayer, generatePlayerAround, POSITIONS } from './player';
import { createCompetitionInstance, competitionFixtureId, type CompetitionDefinition, type CompetitionInstance } from './competition';
import { generateRivalSquad, hashString, rivalSquadSeed, squadStrength } from '../systems/rivals';
import { makeRng } from '../utils/rng';

export type CareerClubIdentity = Omit<RivalClub, 'squad' | 'strength'>;
export interface DivisionProfile {
  id: string;
  name: string;
  rank: number;
  regularRounds: number;
  finalsSize: number;
  /** Initial generation target, not a budget or a measured balance result. */
  ratingMean: number;
  entrants: readonly { clubId: string; strength: number }[];
}
export interface RegionalCareerProfile {
  id: string;
  version: number;
  pack: string;
  slotCount: number;
  startingDivisionId: string;
  startingSquad: { firstGrade: number; depthGap: number; heroes: number; size: number };
  clubs: readonly CareerClubIdentity[];
  divisions: readonly DivisionProfile[];
}
/** Membership belongs to the referenced instance, never another copied squad. */
export interface DivisionMetadata {
  id: string;
  name: string;
  rank: number;
  ratingMean: number;
  instanceId: string;
}
export interface DivisionWorld {
  profile: { id: string; version: number; pack: string; startingDivisionId: string };
  clubs: RivalClub[];
  squad: Player[];
  divisions: DivisionMetadata[];
  instances: CompetitionInstance[];
}
export interface DivisionPairing { round: number; homeId: string; awayId: string }

const present = (s: string): boolean => typeof s === 'string' && s.trim().length > 0;
const integer = (n: number, min: number, max = Number.MAX_SAFE_INTEGER): boolean => Number.isSafeInteger(n) && n >= min && n <= max;
const rating = (n: number): boolean => Number.isFinite(n) && n >= 1 && n <= 100;
const hex = /^#[0-9a-f]{6}$/i;
const powerOfTwo = (n: number): boolean => n >= 2 && Number.isInteger(Math.log2(n));

/** Validate authored membership before any players or fixtures are constructed. */
export function validateRegionalCareerProfile(profile: RegionalCareerProfile, pack: ContentPack): string[] {
  const problems: string[] = [];
  if (!present(profile.id) || !integer(profile.version, 1) || profile.pack !== pack.id || !integer(profile.slotCount, 1)) problems.push('career profile identity');
  const clubIds = new Set<string>();
  for (const club of profile.clubs) {
    if (!present(club.id) || club.id === 'player' || clubIds.has(club.id) || !present(club.name)
      || club.colors.length !== 2 || !club.colors.every(c => hex.test(c))) problems.push('career club identity');
    clubIds.add(club.id);
  }
  const divisionIds = new Set<string>();
  const ranks = new Set<number>();
  const assigned = new Set<string>();
  for (const division of profile.divisions) {
    if (!present(division.id) || divisionIds.has(division.id) || !present(division.name)
      || !integer(division.rank, 0, profile.divisions.length - 1) || ranks.has(division.rank) || !rating(division.ratingMean)) problems.push('division identity/rank');
    divisionIds.add(division.id); ranks.add(division.rank);
    const count = division.entrants.length;
    if (count < 2 || count % 2 !== 0 || !integer(division.regularRounds, count - 1, 2 * (count - 1))) problems.push('division schedule');
    if (division.finalsSize !== 0 && (!powerOfTwo(division.finalsSize) || division.finalsSize > count)) problems.push('division finals');
    const finalsRounds = division.finalsSize ? Math.log2(division.finalsSize) : 0;
    if (division.regularRounds + finalsRounds > profile.slotCount) problems.push('division calendar capacity');
    for (const entrant of division.entrants) {
      if ((entrant.clubId !== 'player' && !clubIds.has(entrant.clubId)) || assigned.has(entrant.clubId) || !rating(entrant.strength)) problems.push('division entrant ownership');
      assigned.add(entrant.clubId);
    }
  }
  const start = profile.divisions.find(d => d.id === profile.startingDivisionId);
  if (!start || start.rank !== 0 || !start.entrants.some(e => e.clubId === 'player')) problems.push('starting division');
  if (profile.divisions.length === 0 || assigned.size !== clubIds.size + 1 || !assigned.has('player') || [...clubIds].some(id => !assigned.has(id))) problems.push('career club coverage');
  const s = profile.startingSquad;
  if (!rating(s.firstGrade) || !integer(s.depthGap, 0) || s.firstGrade - s.depthGap < 1 || !integer(s.heroes, 0)
    || !integer(s.size, pack.league.squadMin, pack.league.squadCap) || s.size < s.heroes + 2 * POSITIONS.length) problems.push('starting squad');
  return problems;
}

/** A complete single round robin plus up to one mirrored return leg. The
 * explicit round bound replaces the legacy global season-length assumption. */
export function divisionPairings(clubIds: readonly string[], rounds: number, seed: number): DivisionPairing[] {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0 || new Set(clubIds).size !== n || !clubIds.every(present)
    || !integer(rounds, n - 1, 2 * (n - 1)) || !integer(seed, 0, 0xffffffff)) throw new Error('Invalid division schedule');
  const ids = makeRng(seed).shuffle(clubIds);
  const firstLeg: DivisionPairing[][] = [];
  for (let round = 1; round < n; round++) {
    const games: DivisionPairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i]!; const b = ids[n - 1 - i]!;
      const homeFirst = (round + i) % 2 === 1;
      games.push({ round, homeId: homeFirst ? a : b, awayId: homeFirst ? b : a });
    }
    firstLeg.push(games);
    ids.splice(1, 0, ids.pop()!);
  }
  const fixtures = firstLeg.flat();
  for (let i = 0; i < rounds - (n - 1); i++) {
    for (const f of firstLeg[i]!) fixtures.push({ round: n + i, homeId: f.awayId, awayId: f.homeId });
  }
  return fixtures;
}

function divisionDefinition(profile: RegionalCareerProfile, division: DivisionProfile, pack: ContentPack): CompetitionDefinition {
  return {
    id: `${profile.id}:${division.id}`, version: profile.version, pack: profile.pack, name: division.name,
    format: { kind: 'league', finalsSize: division.finalsSize },
    minEntrants: division.entrants.length, maxEntrants: division.entrants.length, slotCount: profile.slotCount,
    stages: [
      { id: 'regular', name: 'League', kind: 'league', rounds: division.regularRounds },
      ...(division.finalsSize ? [{ id: 'finals', name: 'Finals', kind: 'knockout' as const, rounds: Math.log2(division.finalsSize) }] : []),
    ],
    matchRules: { ...pack.rules },
    lineup: { onField: pack.league.onField, benchSize: 4, minSquad: pack.league.squadMin, maxSquad: pack.league.squadCap },
    eligibility: { kind: 'open' }, venues: { rounds: 'home-away', final: 'neutral' },
    standings: { win: 2, draw: 1, loss: 0, tieBreakers: ['points-difference', 'points-for', 'head-to-head-points', 'frozen-order'] },
    drawnKnockout: 'seeded-draw', rewards: [],
  };
}

function streamSeed(seed: number, profileId: string, label: string): number {
  return (seed ^ hashString(`${profileId}:${label}`)) >>> 0;
}

function startingSquad(profile: RegionalCareerProfile, seed: number, difficulty: Difficulty): Player[] {
  const rng = makeRng(streamSeed(seed, profile.id, 'player-squad'));
  const starting = profile.startingSquad;
  const firstGrade = starting.firstGrade + difficultyMultipliers(difficulty).startRating;
  const depth = firstGrade - starting.depthGap;
  const plan: { target?: number; position?: Position }[] = [
    ...Array.from({ length: starting.heroes }, () => ({})),
    ...POSITIONS.map(position => ({ target: firstGrade, position })),
    ...POSITIONS.map(position => ({ target: depth, position })),
  ];
  while (plan.length < starting.size) plan.push({ target: depth });
  return rng.shuffle(plan).map(slot => ({
    ...(slot.target === undefined ? generatePlayer(rng, { quality: 'star' }) : generatePlayerAround(rng, slot.target, slot.position ? { position: slot.position } : {})),
    career: { games: 0, tries: 0, tackles: 0, lineBreaks: 0 }, joinedSeason: 1,
  }));
}

/** Construct only a new, dormant prototype world. The caller prepares/selects
 * the region first because existing player generators use its names and rules.
 * This function neither changes that selection nor writes to the career store.
 * Installing the result and routing its clock are separate activation work. */
export function createDivisionWorld(
  profile: RegionalCareerProfile,
  pack: ContentPack,
  seed: number,
  player: { name: string; colors: [string, string]; difficulty?: Difficulty },
): DivisionWorld {
  const problems = validateRegionalCareerProfile(profile, pack);
  if (problems.length || activePack() !== pack || !integer(seed, 0, 0xffffffff) || !present(player.name)
    || player.colors.length !== 2 || !player.colors.every(c => hex.test(c))) throw new Error(`Invalid regional career: ${problems.join(', ') || 'active pack, seed or player'}`);
  const squad = startingSquad(profile, seed, player.difficulty ?? 'normal');
  const targets = new Map(profile.divisions.flatMap(d => d.entrants.map(e => [e.clubId, e.strength] as const)));
  const clubs: RivalClub[] = [{ id: 'player', name: player.name, colors: [...player.colors], strength: squadStrength(squad) }];
  for (const identity of profile.clubs) {
    const target = targets.get(identity.id)!;
    const players = generateRivalSquad({ id: identity.id, strength: target }, rivalSquadSeed(streamSeed(seed, profile.id, 'rivals'), identity.id));
    clubs.push({ id: identity.id, name: identity.name, colors: [...identity.colors], ...(identity.home ? { home: { ...identity.home } } : {}), strength: squadStrength(players), squad: players });
  }
  const divisions: DivisionMetadata[] = [];
  const instances = [...profile.divisions].sort((a, b) => a.rank - b.rank).map(division => {
    const instance = createCompetitionInstance(divisionDefinition(profile, division, pack), 1, 0, division.entrants.map(e => e.clubId));
    instance.tieOrder = makeRng(streamSeed(seed, profile.id, `${division.id}:standings`)).shuffle(instance.entrantIds);
    instance.fixtures = divisionPairings(instance.entrantIds, division.regularRounds, streamSeed(seed, profile.id, `${division.id}:fixtures`)).map((f, index) => ({
      ...f, id: competitionFixtureId(instance.id, index), competitionId: instance.id, stageId: 'regular', neutral: false, status: 'pending',
    }));
    divisions.push({ id: division.id, name: division.name, rank: division.rank, ratingMean: division.ratingMean, instanceId: instance.id });
    return instance;
  });
  return { profile: { id: profile.id, version: profile.version, pack: profile.pack, startingDivisionId: profile.startingDivisionId }, clubs, squad, divisions, instances };
}
