// Pure Open Cup sporting operations (#575). Calendar/match finalisation owns
// the actual games; reward settlement owns money, XP and honours.
import {
  competitionFixtureId, competitionInstanceId, createCompetitionInstance,
  validateCompetitionDefinition, validateCompetitions,
  type CompetitionDefinition, type CompetitionFixture, type CompetitionInstance, type CompetitionResult,
} from '../data/competition';
import { cyrb53 } from '../utils/hash';
import { makeRng } from '../utils/rng';

/** Version-one Open Cup dates; reduced fields leave the early dates unused. */
export const OPEN_CUP_SLOTS = Object.freeze([7, 10, 13, 16, 19]);

export interface OpenCupEntry {
  definition: CompetitionDefinition;
  season: number;
  seed: number;
  clubIds: readonly string[];
  currentSlot: number;
  ordinal?: number;
  playerId?: string;
  enterPlayer?: boolean;
  existingInstances?: readonly CompetitionInstance[];
}
export interface OpenCupDraw {
  instance: CompetitionInstance;
  held: boolean;
  playerEntered: boolean;
  byes: string[];
}
export interface OpenCupOutcome {
  id: string;
  kind: 'round-win' | 'title';
  competitionId: string;
  fixtureId: string;
  season: number;
  stageId: string;
  round: number;
  clubId: string;
}
export interface OpenCupAdvance {
  instance: CompetitionInstance;
  outcomes: OpenCupOutcome[];
}

const integer = (n: number, min = 0, max = Number.MAX_SAFE_INTEGER): boolean => Number.isSafeInteger(n) && n >= min && n <= max;
const seedFor = (identity: readonly unknown[]): number => parseInt(cyrb53(JSON.stringify(identity)).slice(-8), 16) >>> 0;

function assertDefinition(definition: CompetitionDefinition): void {
  const problem = validateCompetitionDefinition(definition);
  if (problem) throw new Error(`Invalid Open Cup definition: ${problem}`);
  if (definition.format.kind !== 'knockout' || definition.stages.length !== 1 || definition.minEntrants !== 2
    || definition.stages[0]!.rounds > OPEN_CUP_SLOTS.length || definition.slotCount < OPEN_CUP_SLOTS[OPEN_CUP_SLOTS.length - 1]!
    || definition.eligibility.kind !== 'open' || definition.venues.rounds !== 'drawn-home'
    || definition.venues.final !== 'neutral' || definition.drawnKnockout !== 'seeded-draw') {
    throw new Error('Unsupported Open Cup rules');
  }
}

function assertInstance(instance: CompetitionInstance): void {
  assertDefinition(instance.definition);
  const problem = validateCompetitions({ schemaVersion: 1, instances: [instance] }, {
    pack: instance.definition.pack, season: instance.season, clubIds: instance.entrantIds,
  });
  if (problem) throw new Error(`Invalid Open Cup instance: ${problem}`);
}

/** The shuffled field is the saved draw. No mutable career RNG is read here. */
function layout(instance: CompetitionInstance): { field: Array<string | null>; openingRound: number; byes: string[] } {
  const size = 2 ** Math.ceil(Math.log2(instance.entrantIds.length));
  const rounds = instance.definition.stages[0]!.rounds;
  const openingRound = rounds - Math.log2(size) + 1;
  const pairCount = size / 2;
  const rng = makeRng(seedFor(['open-cup-layout-v1', instance.id, instance.definition.version, instance.entrantIds]));
  const byePairs = new Set(rng.shuffle(Array.from({ length: pairCount }, (_, n) => n)).slice(0, size - instance.entrantIds.length));
  const field: Array<string | null> = [];
  const byes: string[] = [];
  let next = 0;
  for (let pair = 0; pair < pairCount; pair++) {
    const first = instance.entrantIds[next++]!;
    if (byePairs.has(pair)) {
      byes.push(first);
      field.push(...(rng.int(0, 1) ? [null, first] : [first, null]));
    } else {
      field.push(first, instance.entrantIds[next++]!);
    }
  }
  return { field, openingRound, byes };
}

function roundFixtures(instance: CompetitionInstance, field: readonly (string | null)[], round: number): CompetitionFixture[] {
  const stage = instance.definition.stages[0]!;
  const slot = OPEN_CUP_SLOTS[OPEN_CUP_SLOTS.length - stage.rounds + round - 1]!;
  const firstOrdinal = 2 ** (stage.rounds - round) - 1;
  const fixtures: CompetitionFixture[] = [];
  for (let pair = 0; pair < field.length / 2; pair++) {
    const homeId = field[pair * 2]!;
    const awayId = field[pair * 2 + 1]!;
    if (homeId === null || awayId === null) continue;
    fixtures.push({
      id: competitionFixtureId(instance.id, firstOrdinal + pair), competitionId: instance.id,
      stageId: stage.id, round, slot, homeId, awayId, neutral: round === stage.rounds, status: 'scheduled',
    });
  }
  return fixtures;
}

/** Draw once before the opening cup date. A declined player remains in the league. */
export function drawOpenCup(entry: OpenCupEntry): OpenCupDraw {
  const { definition, season, seed, clubIds, currentSlot, ordinal = 0, playerId = 'player', enterPlayer = true, existingInstances = [] } = entry;
  assertDefinition(definition);
  if (!integer(seed, 0, 0xffffffff) || !integer(season, 1) || !integer(ordinal)
    || !integer(currentSlot) || currentSlot >= OPEN_CUP_SLOTS[0]!) throw new Error('Open Cup entry is closed or invalid');
  if (existingInstances.some(i => i.definition.id === definition.id && i.season === season)) throw new Error('The annual Open Cup draw is already recorded');
  if (!clubIds.every(id => typeof id === 'string' && id.trim().length > 0) || new Set(clubIds).size !== clubIds.length) throw new Error('Invalid Open Cup entrants');
  const candidates = clubIds.filter(id => enterPlayer || id !== playerId).slice().sort();
  if (candidates.length > definition.maxEntrants) throw new Error('Too many Open Cup entrants');
  const rng = makeRng((seed ^ seedFor(['open-cup-draw-v1', definition.id, definition.version, season, ordinal])) >>> 0);
  const entrants = rng.shuffle(candidates);
  // A declined instance is the saved no-event receipt, not a one-club champion.
  if (entrants.length < 2) {
    const instance: CompetitionInstance = {
      id: competitionInstanceId(definition.id, season, ordinal), season,
      definition: JSON.parse(JSON.stringify(definition)) as CompetitionDefinition,
      entrantIds: entrants, tieOrder: [...entrants], status: 'declined', stageId: null, fixtures: [],
    };
    assertInstance(instance);
    return { instance, held: false, playerEntered: false, byes: [] };
  }
  const instance = createCompetitionInstance(definition, season, ordinal, entrants);
  instance.tieOrder = rng.shuffle(entrants);
  const draw = layout(instance);
  instance.status = 'scheduled'; instance.stageId = definition.stages[0]!.id;
  instance.fixtures = roundFixtures(instance, draw.field, draw.openingRound);
  assertInstance(instance);
  return { instance, held: true, playerEntered: enterPlayer && entrants.includes(playerId), byes: draw.byes };
}

/** Reconstructs original byes after reload without consulting a new seed/catalogue. */
export function openCupByes(instance: CompetitionInstance): string[] {
  assertInstance(instance);
  return instance.entrantIds.length < 2 ? [] : layout(instance).byes;
}

/** Apply only after the match's bounded golden point. This never changes scores or state. */
export function openCupResult(instance: CompetitionInstance, fixtureId: string,
  score: { homeScore: number; awayScore: number }, forfeit = false): CompetitionResult {
  assertInstance(instance);
  const fixture = instance.fixtures.find(f => f.id === fixtureId);
  if (!fixture || fixture.status === 'cancelled' || !integer(score.homeScore) || !integer(score.awayScore)) throw new Error('Invalid Open Cup result');
  if (fixture.result) {
    if (fixture.result.homeScore !== score.homeScore || fixture.result.awayScore !== score.awayScore) throw new Error('Open Cup result is already final');
    return { ...fixture.result };
  }
  if (score.homeScore === score.awayScore) {
    if (forfeit) throw new Error('An Open Cup forfeit needs a winner');
    const winnerId = instance.tieOrder.indexOf(fixture.homeId) < instance.tieOrder.indexOf(fixture.awayId) ? fixture.homeId : fixture.awayId;
    return { ...score, winnerId, decider: instance.definition.drawnKnockout };
  }
  return { ...score, winnerId: score.homeScore > score.awayScore ? fixture.homeId : fixture.awayId, decider: forfeit ? 'forfeit' : 'score' };
}

function outcome(instance: CompetitionInstance, fixture: CompetitionFixture, kind: OpenCupOutcome['kind']): OpenCupOutcome {
  const clubId = fixture.result!.winnerId!;
  return {
    id: JSON.stringify([instance.id, fixture.id, clubId, kind]), kind, competitionId: instance.id,
    fixtureId: fixture.id, season: instance.season, stageId: fixture.stageId, round: fixture.round, clubId,
  };
}

/** Consumes finalised scores. A next round (or completed status) is its consumption receipt. */
export function advanceOpenCup(instance: CompetitionInstance): OpenCupAdvance {
  assertInstance(instance);
  if (instance.status === 'declined' || instance.status === 'withdrawn' || instance.status === 'completed') return { instance, outcomes: [] };
  if (instance.status !== 'scheduled' && instance.status !== 'active') throw new Error('The Open Cup has not been drawn');
  if (instance.fixtures.length === 0) throw new Error('Open Cup fixtures are missing');
  const draw = layout(instance);
  let field: Array<string | null> = draw.field;
  const lastRound = Math.max(...instance.fixtures.map(f => f.round));
  for (let round = draw.openingRound; round <= lastRound; round++) {
    const expected = roundFixtures(instance, field, round);
    const actual = instance.fixtures.filter(f => f.round === round);
    if (actual.length !== expected.length) throw new Error('Open Cup draw no longer matches its saved field');
    for (const want of expected) {
      const found = actual.find(f => f.id === want.id);
      if (!found || found.homeId !== want.homeId || found.awayId !== want.awayId || found.slot !== want.slot
        || found.stageId !== want.stageId || found.neutral !== want.neutral || found.status === 'cancelled') throw new Error('Open Cup draw no longer matches its saved field');
    }
    const winners: Array<string | null> = [];
    let unresolved = false;
    for (let pair = 0; pair < field.length / 2; pair++) {
      const home = field[pair * 2]!; const away = field[pair * 2 + 1]!;
      if (home === null || away === null) { winners.push(home ?? away); continue; }
      const fixture = actual.find(f => f.id === competitionFixtureId(instance.id, 2 ** (instance.definition.stages[0]!.rounds - round) - 1 + pair))!;
      if (fixture.status !== 'completed') { unresolved = true; winners.push(null); }
      else winners.push(fixture.result!.winnerId!);
    }
    if (unresolved) {
      if (round !== lastRound) throw new Error('Open Cup advanced before its previous round finished');
      const status = instance.fixtures.some(f => f.status === 'completed') ? 'active' as const : 'scheduled' as const;
      return { instance: instance.status === status ? instance : { ...instance, status }, outcomes: [] };
    }
    field = winners;
    if (round !== lastRound) continue;
    const outcomes = actual.map(f => outcome(instance, f, 'round-win'));
    const finalRound = instance.definition.stages[0]!.rounds;
    const next: CompetitionInstance = round === finalRound
      ? { ...instance, status: 'completed', winnerId: field[0]!, fixtures: [...instance.fixtures] }
      : { ...instance, status: 'active', fixtures: [...instance.fixtures, ...roundFixtures(instance, field, round + 1)] };
    if (round === finalRound) outcomes.push(outcome(instance, actual[0]!, 'title'));
    assertInstance(next);
    return { instance: next, outcomes };
  }
  throw new Error('Invalid Open Cup round');
}
