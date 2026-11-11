// Isolated developer entry and sporting-stage preparation (#573). Finance,
// promotion and a second-season setup remain owned by their later issues.
import { getState, setState, type GameState } from '../core/state';
import { weekHeld } from '../core/time';
import { activePack } from '../content';
import { DEFAULT_PLAYER_COLORS } from '../config';
import { autoPick } from './lineup';
import { createDivisionWorld, type RegionalCareerProfile } from '../data/divisions';
import { divisionForClub } from '../data/competitionDivisions';
import { createCompetitionInstance, competitionFixtureId, validateCompetitions, type CompetitionFixture, type CompetitionInstance } from '../data/competition';
import { activateStructuralCalendar, competitionLadder, hasStructuralCalendar, structuralRuntimeAllowed } from './competitionCalendar';
import { hashString } from './rivals';
import { makeRng } from '../utils/rng';

export function currentDivision(state: Pick<GameState, 'clubId' | 'competitions'>, clubId: string = state.clubId): ReturnType<typeof divisionForClub> {
  const competitions = state.competitions;
  return competitions?.world ? divisionForClub(competitions.world, competitions.instances, clubId) : undefined;
}

/** The registry can contain all 24 clubs; only an instance owns its league field. */
export function currentDivisionClubIds(state: GameState, clubId: string = state.clubId): readonly string[] {
  return state.competitions?.world ? currentDivision(state, clubId)?.instance.entrantIds ?? [] : state.league.clubs.map(c => c.id);
}

function trialInstances(world: ReturnType<typeof createDivisionWorld>, profile: RegionalCareerProfile, seed: number): CompetitionInstance[] {
  const trials: CompetitionInstance[] = [];
  for (const division of world.divisions) {
    const league = world.instances.find(i => i.id === division.instanceId)!;
    const ids = makeRng((seed ^ hashString(`${division.id}:trials`)) >>> 0).shuffle(league.entrantIds);
    const half = ids.length / 2;
    for (let round = 0; round < 2; round++) for (let i = 0; i < half; i++) {
      const homeId = round === 0 ? ids[i]! : ids[half + i]!;
      const awayId = round === 0 ? ids[half + i]! : ids[(i + 1) % half]!;
      const definition = { ...league.definition, id: `${world.profile.id}:trials`, name: 'Preseason trial',
        format: { kind: 'exhibition' as const }, minEntrants: 2, maxEntrants: 2,
        stages: [{ id: 'trial', name: 'Trial', kind: 'exhibition' as const, rounds: 1, slotIds: [profile.trialSlots[round]!] }],
        venues: { rounds: 'home-away' as const, final: 'same-as-rounds' as const } };
      delete definition.standings;
      const instance = createCompetitionInstance(definition, 1, trials.length, [homeId, awayId]);
      instance.status = 'scheduled'; instance.stageId = 'trial';
      instance.fixtures = [{ id: competitionFixtureId(instance.id, 0), competitionId: instance.id, stageId: 'trial', round: 1,
        slot: profile.trialSlots[round]!, homeId, awayId, neutral: false, status: 'scheduled' }];
      trials.push(instance);
    }
  }
  return trials;
}

/** Construct and install only into a genuinely fresh isolated developer career.
 * Ordinary careers, imports and paid competition offers cannot call around this gate. */
export function setupStructuralDivisionCareer(profile: RegionalCareerProfile, seed: number, colors: [string, string] = DEFAULT_PLAYER_COLORS): GameState {
  const state = getState();
  if (!structuralRuntimeAllowed()) throw new Error('Competition prototypes require the isolated developer career.');
  if (weekHeld() || state.season !== 1 || state.week !== 1 || state.preseason !== 1 || state.history.length
    || state.competitions !== undefined || state.facilities.length || state.league.fixtures.some(f => f.result)
    || state.squad.some(p => (p.career?.games ?? 0) > 0)) throw new Error('Start a fresh developer career for regional divisions.');
  const world = createDivisionWorld(profile, activePack(), seed, { name: state.clubName, colors, difficulty: state.settings.difficulty });
  const leagues = world.instances.map(i => ({ ...i, status: 'scheduled' as const, stageId: 'regular',
    fixtures: i.fixtures.map(f => ({ ...f, status: 'scheduled' as const, slot: i.definition.stages[0]!.slotIds![f.round - 1]! })) }));
  const local = leagues.find(i => i.entrantIds.includes(state.clubId))!;
  const instances = [...leagues, ...trialInstances(world, profile, seed)];
  const next = activateStructuralCalendar({ ...state, rngSeed: (seed ^ hashString(`${profile.id}:calendar`)) >>> 0,
    squad: world.squad, freeAgents: [], lineup: autoPick(world.squad), objectives: [],
    league: { clubs: world.clubs, fixtures: [], ladder: competitionLadder(local) },
    competitions: { schemaVersion: 1, instances, world: { profile: world.profile, divisions: world.divisions } } }, profile.calendarSlots);
  setState(next);
  return getState();
}

/** Prepare future finals only after their actual predecessor results exist.
 * Called through existing fixture hooks after held match results are committed. */
export function prepareDivisionFinals(state: GameState): GameState {
  const competitions = state.competitions;
  if (!hasStructuralCalendar(state) || !competitions?.world || competitions.calendar!.status !== 'active') return state;
  let changed = false;
  const instances = competitions.instances.map(instance => {
    if (!competitions.world!.divisions.some(d => d.instanceId === instance.id) || instance.status === 'completed') return instance;
    const format = instance.definition.format;
    const regularStage = instance.definition.stages.find(s => s.kind === 'league')!;
    const finalStage = instance.definition.stages.find(s => s.kind === 'knockout');
    if (format.kind !== 'league' || !format.finalsSize || !finalStage?.slotIds) return instance;
    const regular = instance.fixtures.filter(f => f.stageId === regularStage.id);
    if (regular.length !== instance.entrantIds.length / 2 * regularStage.rounds || regular.some(f => f.status !== 'completed')) return instance;
    const ranked = competitionLadder(instance).slice(0, format.finalsSize).map(r => r.clubId);
    const finals = instance.fixtures.filter(f => f.stageId === finalStage.id);
    const round = finals.length ? Math.max(...finals.map(f => f.round)) + 1 : 1;
    if (round > finalStage.rounds) return instance;
    let field: string[];
    if (round === 1) {
      let order = [1, 2];
      while (order.length < format.finalsSize) {
        const size = order.length * 2;
        order = order.flatMap(seed => [seed, size + 1 - seed]);
      }
      field = order.map(seed => ranked[seed - 1]!);
    } else {
      const previous = finals.filter(f => f.round === round - 1);
      if (previous.length !== format.finalsSize / 2 ** (round - 1) || previous.some(f => f.status !== 'completed' || !f.result?.winnerId)) return instance;
      field = previous.map(f => f.result!.winnerId!);
    }
    const added: CompetitionFixture[] = [];
    for (let i = 0; i < field.length; i += 2) {
      const a = field[i]!; const b = field[i + 1]!;
      const homeId = ranked.indexOf(a) < ranked.indexOf(b) ? a : b;
      added.push({ id: competitionFixtureId(instance.id, instance.fixtures.length + added.length), competitionId: instance.id,
        stageId: finalStage.id, round, slot: finalStage.slotIds[round - 1]!, homeId, awayId: homeId === a ? b : a,
        neutral: round === finalStage.rounds && instance.definition.venues.final === 'neutral', status: 'scheduled' });
    }
    changed = true;
    return { ...instance, fixtures: [...instance.fixtures, ...added] };
  });
  if (!changed) return state;
  const next = { ...state, competitions: { ...competitions, instances } };
  const problem = validateCompetitions(next.competitions, { pack: next.pack ?? 'au', season: next.season, week: next.week, clubIds: next.league.clubs.map(c => c.id) });
  if (problem) throw new Error(`Invalid division finals transition: ${problem}`);
  return next;
}
