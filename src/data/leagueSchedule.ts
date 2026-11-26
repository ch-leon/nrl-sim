import {
  competitionFixtureId, competitionInstanceId, validateCompetitions,
  type CompetitionCareerState, type CompetitionDefinition, type CompetitionInstance,
} from './competition';
import type { CompetitionCalendarSlot } from './competitionCalendar';
import type { CompetitionWorldMetadata } from './competitionDivisions';
import { buildDivisionLeague, buildDivisionTrialFixtures, divisionTrialDefinitionId, type LeagueFields } from './divisions';

export interface SavedLeagueSchedule {
  world: CompetitionWorldMetadata;
  instances: CompetitionInstance[];
  slots: CompetitionCalendarSlot[];
}

// Templates are JSON snapshots. Object key order does not change a definition.
function definitionKey(definition: CompetitionDefinition): string {
  return JSON.stringify(definition, (_key, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const fields = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(fields).sort().map(key => [key, fields[key]]));
  });
}

/** Each saved trial date must contain a complete draw for one source division. */
export function savedTrialDefinitions(profileId: string, leagues: readonly CompetitionInstance[], current: readonly CompetitionInstance[],
  slots: readonly CompetitionCalendarSlot[]): Array<[CompetitionDefinition, CompetitionDefinition]> {
  const definitionId = divisionTrialDefinitionId(profileId);
  const divisionByClub = new Map(leagues.flatMap((league, index) => league.entrantIds.map(id => [id, index] as const)));
  const datesByDivision = leagues.map(() => new Map<number, CompetitionInstance[]>());
  for (const trial of current.filter(i => i.definition.id === definitionId)) {
    const fixture = trial.fixtures[0];
    const slot = trial.definition.stages[0]?.slotIds?.[0];
    if (trial.definition.format.kind !== 'exhibition' || trial.fixtures.length !== 1 || !fixture || slot === undefined
      || slots[slot - 1]?.kind !== 'preseason' || fixture.slot !== slot
      || fixture.id !== competitionFixtureId(trial.id, 0)) throw new Error('Invalid saved trial fixture or date');
    const division = divisionByClub.get(fixture.homeId);
    if (division === undefined || division !== divisionByClub.get(fixture.awayId)) throw new Error('Invalid saved trial division');
    const dates = datesByDivision[division]!;
    const games = dates.get(slot) ?? [];
    games.push(trial);
    dates.set(slot, games);
  }

  let ordinal = 0;
  return datesByDivision.map((dates, division) => {
    if (dates.size !== 2) throw new Error('Missing or inconsistent saved trial dates');
    const league = leagues[division]!;
    const half = league.entrantIds.length / 2;
    const rounds = [...dates.entries()].sort(([a], [b]) => a - b).map(([, games]) => {
      const first = games[0]!.definition;
      const key = definitionKey(first);
      const entrants = games.flatMap(i => i.entrantIds);
      const gameIds = new Set(games.map(i => i.id));
      if (games.length !== half || new Set(entrants).size !== league.entrantIds.length
        || games.some(i => definitionKey(i.definition) !== key)) throw new Error('Inconsistent saved trial templates or field');
      for (let game = 0; game < half; game++) {
        if (!gameIds.has(competitionInstanceId(definitionId, league.season, ordinal++))) throw new Error('Invalid saved trial identity');
      }
      return first;
    });
    return [rounds[0]!, rounds[1]!];
  });
}

/** Build the upcoming main leagues and trials from the current saved sporting
 * snapshots. Definitions are preserved as saved. The caller owns lifecycle
 * gating, retained instances, clocks and validation against runtime policies. */
export function buildSavedLeagueSchedule(source: CompetitionCareerState, season: number, fields: LeagueFields,
  scheduleSeed: number, clubIds: readonly string[]): SavedLeagueSchedule {
  const { world, calendar, leagueCareer } = source;
  if (!world || !calendar) throw new Error('Missing saved League world or calendar');
  if (!Number.isSafeInteger(season) || season !== calendar.season + 1) throw new Error('Invalid target League season');
  if (!Number.isSafeInteger(scheduleSeed) || scheduleSeed < 0 || scheduleSeed > 0xffffffff
    || (leagueCareer && scheduleSeed !== leagueCareer.scheduleSeed)) throw new Error('Invalid saved League schedule seed');

  const clubs = new Set(clubIds);
  if (clubs.size !== clubIds.length || clubIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Invalid canonical club registry');
  // An unmarked structural calendar advances its state year before a new draw.
  const sourceStateYear = calendar.status === 'awaiting-next-season' && !leagueCareer ? season : calendar.season;
  const context = { pack: world.profile.pack, clubIds, ...(leagueCareer ? { clubId: leagueCareer.clubId } : {}) };
  const problem = validateCompetitions(source, { ...context, season: sourceStateYear });
  if (problem || source.instances.some(i => i.season > calendar.season)) throw new Error(`Invalid saved League schedule: ${problem ?? 'future instance'}`);

  const current = source.instances.filter(i => i.season === calendar.season);
  const leagues = world.divisions.map(d => {
    const league = current.find(i => i.id === d.instanceId)!;
    const definitionId = `${world.profile.id}:${d.id}`;
    if (league.definition.id !== definitionId || league.id !== competitionInstanceId(definitionId, calendar.season, 0)
      || league.entrantIds.length < 2 || league.entrantIds.length % 2 !== 0) {
      throw new Error('Invalid saved division schedule');
    }
    return league;
  });
  if (current.filter(i => i.definition.format.kind === 'league').length !== leagues.length) throw new Error('Unexpected saved division instance');

  const fieldIds = new Set(Object.keys(fields));
  const selected = Object.values(fields).flat();
  if (fieldIds.size !== leagues.length
    || world.divisions.some((d, i) => !fieldIds.has(d.id) || !Array.isArray(fields[d.id])
      || fields[d.id]!.length !== leagues[i]!.entrantIds.length)
    || selected.length !== clubs.size || new Set(selected).size !== selected.length || selected.some(id => !clubs.has(id))) {
    throw new Error('Invalid selected League fields');
  }

  const templates = savedTrialDefinitions(world.profile.id, leagues, current, calendar.slots);
  const nextLeagues = world.divisions.map((d, i) => buildDivisionLeague(world.profile.id, d.id, leagues[i]!.definition, season, fields[d.id]!, scheduleSeed));
  const nextWorld: CompetitionWorldMetadata = { profile: { ...world.profile }, divisions: world.divisions.map((d, i) => ({ ...d, instanceId: nextLeagues[i]!.id })),
    ...(world.bigThree ? { bigThree: { ...world.bigThree } } : {}) };
  const trials: CompetitionInstance[] = [];
  for (const [i, division] of nextWorld.divisions.entries()) {
    trials.push(...buildDivisionTrialFixtures(world.profile.id, division.id, nextLeagues[i]!, scheduleSeed, trials.length, templates[i]!));
  }
  const instances = [...nextLeagues, ...trials];
  const slots = calendar.slots.map(slot => ({ ...slot }));
  const outputProblem = validateCompetitions({ schemaVersion: 1, world: nextWorld, instances,
    calendar: { mode: 'structural', status: 'active', season, slots, elapsedIntervals: 0 } }, { ...context, season });
  if (outputProblem) throw new Error(`Invalid next League schedule: ${outputProblem}`);
  return { world: nextWorld, instances, slots };
}
