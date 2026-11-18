// Trusted installed-state readers: saved membership, definitions and dates own
// League presentation. Admission/entry validate once at their boundaries.
import type { Fixture, GameState } from '../core/state';
import type { CompetitionFixture, CompetitionInstance } from '../data/competition';
import { divisionForClub } from '../data/competitionDivisions';
import { competitionLadder, fixtureBridge } from './competitionCalendar';

export type LeagueReadState = Pick<GameState, 'league'> & Partial<Pick<GameState, 'clubId' | 'week' | 'season' | 'competitions'>>;
export type LeagueClockState = Partial<Pick<GameState, 'competitions'>>;

export function leagueChoiceRequired(state: LeagueClockState): boolean {
  const phase = state.competitions?.leagueCareer?.phase;
  return phase === 'initial-choice' || phase === 'next-season-choice';
}

export interface LeagueFixtureView {
  instance: CompetitionInstance;
  fixture: CompetitionFixture;
  bridge: Fixture;
  slot: number;
  stageLabel: string;
  stageKind: CompetitionInstance['definition']['stages'][number]['kind'];
  status: CompetitionFixture['status'];
  winnerId?: string;
  decider?: NonNullable<CompetitionFixture['result']>['decider'];
}

export function leagueFixtureView(instance: CompetitionInstance, fixture: CompetitionFixture): LeagueFixtureView {
  const stage = instance.definition.stages.find(s => s.id === fixture.stageId)!;
  return { instance, fixture, bridge: fixtureBridge({ instance, fixture }), slot: fixture.slot!,
    stageLabel: `${stage.name}${stage.rounds > 1 ? ` · round ${fixture.round}` : ''}`,
    stageKind: stage.kind, status: fixture.status,
    ...(fixture.result?.winnerId ? { winnerId: fixture.result.winnerId } : {}),
    ...(fixture.result ? { decider: fixture.result.decider } : {}) };
}

/** Only actual entered fixtures appear; an offered optional cup is not a schedule. */
export function leagueSeasonView(state: LeagueReadState) {
  const competitions = state.competitions;
  if (!competitions?.leagueCareer || !competitions.world || !competitions.calendar) return null;
  const clubId = state.clubId ?? competitions.leagueCareer.clubId;
  const membership = divisionForClub(competitions.world, competitions.instances, clubId);
  if (!membership) return null;
  const { division, instance } = membership;
  const calendar = competitions.calendar;
  const instances = competitions.instances.filter(i => i.season === instance.season &&
    (i.id === instance.id || i.entrantIds.includes(clubId) &&
      ['scheduled', 'active', 'completed', 'withdrawn'].includes(i.status)));
  const fixtures = instances.flatMap(i => i.fixtures.map(f => leagueFixtureView(i, f)))
    .sort((a, b) => a.slot - b.slot || a.fixture.id.localeCompare(b.fixture.id));
  const choiceRequired = leagueChoiceRequired(state);
  const week = state.week ?? 1;
  const next = choiceRequired || calendar.status !== 'active' ? undefined : fixtures.find(f =>
    f.slot >= week && f.status === 'scheduled' && ['scheduled', 'active'].includes(f.instance.status) &&
    (f.fixture.homeId === clubId || f.fixture.awayId === clubId));
  const currentFixtures = fixtures.filter(f => f.slot === week);
  const currentSlot = calendar.slots.find(s => s.id === week);
  const currentLabel = currentSlot?.kind === 'rest' ? 'Rest week'
    : currentFixtures.find(f => f.fixture.homeId === clubId || f.fixture.awayId === clubId)?.stageLabel
      ?? (currentSlot?.kind === 'preseason' ? 'Pre-season' : 'No club fixture');
  const finalsSize = instance.definition.format.kind === 'league' ? instance.definition.format.finalsSize : 0;
  const harder = competitions.world.divisions.find(d => d.rank === division.rank + 1);
  const goal = !finalsSize ? 'No finals this season: no finals title or new league unlock.'
    : !harder ? `Win the ${division.name} finals title. You have reached the highest league; no harder league remains.`
    : competitions.leagueCareer.access.some(a => a.leagueId === harder.id)
      ? `Access to ${harder.name} is permanent. You can choose it next season.`
      : `Win the ${division.name} finals title to unlock ${harder.name} permanently. League choice follows the season.`;
  return { division, instance, clubId, calendar, goal, phase: competitions.leagueCareer.phase, choiceRequired,
    clubs: state.league.clubs.filter(c => instance.entrantIds.includes(c.id)),
    ladder: competitionLadder(instance), fixtures, next, currentFixtures, currentSlot, currentLabel,
    regularRounds: instance.definition.stages.filter(s => s.kind === 'league').reduce((n, s) => n + s.rounds, 0),
    finalsSize,
    fieldSize: instance.entrantIds.length,
  };
}
export type LeagueSeasonView = NonNullable<ReturnType<typeof leagueSeasonView>>;

/** A bridge is for existing match/gate APIs, never a second saved fixture list. */
export function nextSeasonFixture(state: LeagueReadState, clubId: string = state.clubId ?? 'player'): Fixture | undefined {
  const view = leagueSeasonView(state);
  if (view) {
    if (view.choiceRequired || view.calendar.status !== 'active') return undefined;
    if (clubId === view.clubId) return view.next?.bridge;
    return view.fixtures.find(f => f.status === 'scheduled' && ['scheduled', 'active'].includes(f.instance.status)
      && f.slot >= (state.week ?? 1) && (f.fixture.homeId === clubId || f.fixture.awayId === clubId))?.bridge;
  }
  const week = state.week ?? 1;
  return state.league.fixtures.filter(f => !f.result && (f.round >= week || week === 1 && f.round <= 0)
    && (f.homeId === clubId || f.awayId === clubId)).sort((a, b) => a.round - b.round)[0];
}

/** Sporting decisions can resolve a tied score. Trial form is excluded. */
export function leagueClubResults(view: LeagueSeasonView, clubId: string) {
  return view.fixtures.filter(f => f.status === 'completed' && f.fixture.result && f.stageKind !== 'exhibition'
    && (f.fixture.homeId === clubId || f.fixture.awayId === clubId)).map(f => {
    const home = f.fixture.homeId === clubId;
    const result = f.fixture.result!;
    const pointsFor = home ? result.homeScore : result.awayScore;
    const pointsAgainst = home ? result.awayScore : result.homeScore;
    return { round: f.fixture.round, slot: f.slot, label: `Week ${f.slot} · ${f.stageLabel}`,
      opponentId: home ? f.fixture.awayId : f.fixture.homeId, home, pointsFor, pointsAgainst,
      result: (f.winnerId ? f.winnerId === clubId ? 'W' : 'L' : pointsFor > pointsAgainst ? 'W' : pointsFor < pointsAgainst ? 'L' : 'D') as 'W' | 'D' | 'L',
      ...(f.decider && f.decider !== 'score' && f.decider !== 'draw' ? { decider: f.decider } : {}) };
  });
}
