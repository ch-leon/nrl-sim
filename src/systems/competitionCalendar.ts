// Structural calendar/result adapter. Production offers and finance remain gated.
import type { Fixture, GameState, LadderRow } from '../core/state';
import { careerNamespace } from '../core/storage/local';
import { DEV_TEST_PREFIX } from '../core/storageKeys';
import { NINES } from '../match/league/rules';
import { FORFEIT_SCORE, ON_FIELD, SQUAD_CAP, SQUAD_MIN } from '../config';
import { BENCH } from '../match/league/bench';
import { standingsOrder, completedCompetition, validateCompetitions, type CompetitionFixture, type CompetitionInstance, type CompetitionResult, type CompetitionStatus } from '../data/competition';
import type { CompetitionCalendarSlot } from '../data/competitionCalendar';

export const hasStructuralCalendar = (state: Pick<GameState, 'competitions'>): boolean => state.competitions?.calendar?.mode === 'structural';
export const structuralRuntimeAllowed = (): boolean => careerNamespace() === DEV_TEST_PREFIX;

/** Loaded active snapshots must pass the same support gate as fresh activation. */
export function structuralPolicyProblem(state: GameState): string | null {
  for (const instance of state.competitions?.instances ?? []) {
    if (instance.season !== state.season || !['entered', 'scheduled', 'active'].includes(instance.status)) continue;
    const definition = instance.definition;
    if (definition.eligibility.kind !== 'open') return 'This competition eligibility policy is not enabled yet.';
    if (definition.lineup.onField !== ON_FIELD || definition.lineup.benchSize !== BENCH.size
      || definition.lineup.minSquad !== SQUAD_MIN || definition.lineup.maxSquad !== SQUAD_CAP) return 'This competition lineup policy is not enabled yet.';
    if (Object.entries(definition.matchRules).some(([key, value]) => NINES[key as keyof typeof NINES] !== value)) return 'This competition rules snapshot needs a supported match engine.';
  }
  return null;
}

export function structuralAdvanceProblem(state: GameState): string | null {
  if (!hasStructuralCalendar(state)) return null;
  if (!structuralRuntimeAllowed()) return 'Competition prototypes require the isolated developer career.';
  if (state.competitions!.calendar!.status !== 'active') return 'The competition prototype is waiting for next-season setup.';
  const policy = structuralPolicyProblem(state); if (policy) return policy;
  if (state.competitions!.instances.some(i => i.season === state.season && i.fixtures.some(f => f.slot === state.week && f.status === 'pending')))
    return 'The competition prototype is waiting for this stage or selection.';
  return null;
}

/** Activation is an explicit local developer operation, never an imported flag. */
export function activateStructuralCalendar(state: GameState, slots: readonly CompetitionCalendarSlot[]): GameState {
  if (!structuralRuntimeAllowed()) throw new Error('Competition prototypes require the isolated developer career.');
  if (!state.competitions || state.week !== 1 || state.history.length || state.season !== 1) throw new Error('Start a new developer career for the competition prototype.');
  const unsupported = structuralPolicyProblem(state); if (unsupported) throw new Error(unsupported);
  const next: GameState = { ...state, preseason: 0, competitions: { ...state.competitions,
    calendar: { mode: 'structural', status: 'active', season: state.season, elapsedIntervals: 0, slots: slots.map(s => ({ ...s })) } } };
  const problem = validateCompetitions(next.competitions, { pack: next.pack ?? 'au', season: next.season, week: next.week, clubIds: next.league.clubs.map(c => c.id) });
  if (problem) throw new Error(`Invalid structural calendar: ${problem}`);
  return next;
}

export interface CalendarFixture { instance: CompetitionInstance; fixture: CompetitionFixture }

export function currentCalendarFixtures(state: GameState): CalendarFixture[] {
  const calendar = state.competitions?.calendar;
  if (!calendar || calendar.status !== 'active' || calendar.season !== state.season) return [];
  return state.competitions!.instances.filter(i => i.season === state.season && (i.status === 'scheduled' || i.status === 'active'))
    .flatMap(instance => instance.fixtures.filter(f => f.slot === state.week && f.status === 'scheduled').map(fixture => ({ instance, fixture })));
}

export function fixtureBridge({ instance, fixture }: CalendarFixture): Fixture {
  return { id: fixture.id, competitionId: instance.id, stageId: fixture.stageId, slot: fixture.slot!,
    round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, ...(fixture.result ? { result: fixture.result } : {}) };
}

export function sameFixtureIdentity(a: Fixture, b: Fixture): boolean {
  if (a.id !== undefined || b.id !== undefined || a.competitionId !== undefined || b.competitionId !== undefined) {
    return a.id !== undefined && a.id === b.id && a.competitionId !== undefined && a.competitionId === b.competitionId
      && a.stageId === b.stageId && a.slot === b.slot && a.round === b.round && a.homeId === b.homeId && a.awayId === b.awayId;
  }
  return a.round === b.round && a.homeId === b.homeId && a.awayId === b.awayId;
}

export function calendarFixtureContext(state: GameState, fixture: Fixture): CalendarFixture | undefined {
  return currentCalendarFixtures(state).find(ref => sameFixtureIdentity(fixtureBridge(ref), fixture));
}

export function calendarKnockout(state: GameState, fixture: Fixture): boolean {
  const context = calendarFixtureContext(state, fixture);
  const kind = context?.instance.definition.stages.find(s => s.id === fixture.stageId)?.kind;
  return kind === 'knockout' || kind === 'series';
}

function resolvedResult(instance: CompetitionInstance, fixture: CompetitionFixture, score: { homeScore: number; awayScore: number }, forfeit: boolean): CompetitionResult {
  const kind = instance.definition.stages.find(s => s.id === fixture.stageId)!.kind;
  if (score.homeScore !== score.awayScore) return { ...score, winnerId: score.homeScore > score.awayScore ? fixture.homeId : fixture.awayId, decider: forfeit ? 'forfeit' : 'score' };
  if (kind !== 'knockout' && kind !== 'series') return { ...score, decider: 'draw' };
  return { ...score, winnerId: instance.tieOrder.indexOf(fixture.homeId) < instance.tieOrder.indexOf(fixture.awayId) ? fixture.homeId : fixture.awayId, decider: instance.definition.drawnKnockout };
}

function progressInstance(instance: CompetitionInstance): CompetitionInstance {
  const def = instance.definition;
  let next = instance;
  const played = next.fixtures.filter(f => f.status === 'completed');
  let winnerId: string | undefined;
  if (def.format.kind === 'series') {
    const winsRequired = def.format.winsRequired;
    winnerId = next.entrantIds.find(id => played.filter(f => f.result?.winnerId === id).length === winsRequired);
    if (winnerId) next = { ...next, fixtures: next.fixtures.map(f => f.status === 'pending' || f.status === 'scheduled' ? { ...f, status: 'cancelled' } : f) };
  } else if (def.format.kind === 'exhibition') winnerId = played[0]?.result?.winnerId;
  else if (def.format.kind === 'league' && def.format.finalsSize === 0) {
    winnerId = standingsOrder(next.entrantIds, played, def.standings!, next.tieOrder)[0];
  } else {
    const last = [...def.stages].reverse().find(s => s.kind === 'knockout');
    winnerId = played.find(f => f.stageId === last?.id && f.round === last?.rounds)?.result?.winnerId;
  }
  const candidate = { ...next, status: 'completed' as const, ...(winnerId ? { winnerId } : {}) };
  return completedCompetition(candidate) === null ? candidate : { ...next, status: 'active' };
}

/** Test hook: result commits throw, the way an invalid transition fails in the background. */
let blockCalendarResults = false;
export function __blockCalendarResults(block: boolean): void {
  blockCalendarResults = block;
}

/** The sole structural result commit. Duplicate/stale/cancelled deliveries are no-ops. */
export function finaliseCalendarFixture(state: GameState, bridge: Fixture, score: { homeScore: number; awayScore: number }, forfeit = false): GameState {
  if (blockCalendarResults) throw new Error('Invalid result transition: result commit failed');
  if (!hasStructuralCalendar(state) || structuralAdvanceProblem(state) || ![score.homeScore, score.awayScore].every(n => Number.isSafeInteger(n) && n >= 0)) return state;
  const context = calendarFixtureContext(state, bridge);
  if (!context) return state;
  const { instance, fixture } = context;
  const result = resolvedResult(instance, fixture, score, forfeit);
  const updated = progressInstance({ ...instance, stageId: fixture.stageId,
    fixtures: instance.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed', result } : f) });
  const competitions = { ...state.competitions!, instances: state.competitions!.instances.map(i => i.id === instance.id ? updated : i) };
  const problem = validateCompetitions(competitions, { pack: state.pack ?? 'au', season: state.season, week: state.week, clubIds: state.league.clubs.map(c => c.id) });
  if (problem) throw new Error(`Invalid result transition: ${problem}`);
  const stage = instance.definition.stages.find(s => s.id === fixture.stageId)!;
  // A compatibility read model for the player's own league. Cup results never change it.
  const ladder = stage.kind === 'league' && instance.entrantIds.includes(state.clubId)
    ? competitionLadder(updated) : state.league.ladder;
  return { ...state, competitions, league: ladder === state.league.ladder ? state.league : { ...state.league, ladder } };
}

export function competitionLadder(instance: CompetitionInstance): LadderRow[] {
  const policy = instance.definition.standings!;
  const rows = new Map(instance.entrantIds.map(clubId => [clubId, { clubId, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 }]));
  const fixtures = instance.fixtures.filter(f => f.result && instance.definition.stages.find(s => s.id === f.stageId)?.kind === 'league');
  for (const f of fixtures) for (const [id, own, against] of [[f.homeId, f.result!.homeScore, f.result!.awayScore], [f.awayId, f.result!.awayScore, f.result!.homeScore]] as const) {
    const row = rows.get(id)!; row.played++; row.pointsFor += own; row.pointsAgainst += against;
    if (own > against) { row.wins++; row.points += policy.win; } else if (own < against) { row.losses++; row.points += policy.loss; } else { row.draws++; row.points += policy.draw; }
  }
  return standingsOrder(instance.entrantIds, fixtures, policy, instance.tieOrder).map(id => rows.get(id)!);
}

export function structuralSeasonResolved(state: GameState): boolean {
  const calendar = state.competitions?.calendar;
  return !!calendar && state.competitions!.instances.filter(i => i.season === calendar.season)
    .every(i => i.status === 'completed' || i.status === 'declined' || i.status === 'withdrawn');
}

const TERMINAL: ReadonlySet<CompetitionStatus> = new Set(['completed', 'declined', 'withdrawn']);

function recoveryLog(detail: string): void {
  console.error(`structural calendar recovered: ${detail}`);
}

function cancelFixture(fixture: CompetitionFixture): CompetitionFixture {
  if (fixture.status === 'completed' || fixture.status === 'cancelled') return fixture;
  const { result: _result, ...rest } = fixture;
  return { ...rest, status: 'cancelled' };
}

function withoutWinner(instance: CompetitionInstance): CompetitionInstance {
  const { winnerId: _winner, ...rest } = instance;
  return rest;
}

function declineInstance(instance: CompetitionInstance): CompetitionInstance {
  return { ...withoutWinner(instance), status: 'declined', stageId: null, fixtures: [] };
}

function withdrawInstance(instance: CompetitionInstance): CompetitionInstance {
  return { ...withoutWinner(instance), status: 'withdrawn', fixtures: instance.fixtures.map(cancelFixture) };
}

function applyInstances(state: GameState, instances: CompetitionInstance[]): GameState | null {
  const competitions = { ...state.competitions!, instances };
  const problem = validateCompetitions(competitions, {
    pack: state.pack ?? 'au', season: state.season, week: state.week, clubIds: state.league.clubs.map(c => c.id),
  });
  if (problem) {
    recoveryLog(`left unchanged (${problem})`);
    return null;
  }
  return { ...state, competitions };
}

/**
 * Close competitions an active calendar can never play. Offered and qualified
 * never enter; entered fixtures are not on this calendar. A normal scheduled
 * league is left alone.
 */
export function recoverUnfinishableCompetitions(state: GameState): GameState {
  if (!hasStructuralCalendar(state) || state.competitions!.calendar!.status !== 'active') return state;
  const season = state.competitions!.calendar!.season;
  let changed = false;
  const instances = state.competitions!.instances.map(instance => {
    if (instance.season !== season || TERMINAL.has(instance.status)) return instance;
    if (instance.status === 'offered' || instance.status === 'qualified') {
      changed = true;
      recoveryLog(`declined ${instance.id} (${instance.status})`);
      return declineInstance(instance);
    }
    if (instance.status === 'entered') {
      changed = true;
      recoveryLog(`withdrew ${instance.id} (entered)`);
      return withdrawInstance(instance);
    }
    return instance;
  });
  if (!changed) return state;
  return applyInstances(state, instances) ?? state;
}

function forfeitScore(instance: CompetitionInstance, fixture: CompetitionFixture): { homeScore: number; awayScore: number } {
  const homeWins = instance.tieOrder.indexOf(fixture.homeId) <= instance.tieOrder.indexOf(fixture.awayId);
  return homeWins ? { homeScore: FORFEIT_SCORE, awayScore: 0 } : { homeScore: 0, awayScore: FORFEIT_SCORE };
}

function abandonFixture(state: GameState, instanceId: string, fixtureId: string, err: unknown): GameState {
  const message = err instanceof Error ? err.message : 'result failed';
  recoveryLog(`abandoned ${instanceId} ${fixtureId} (${message})`);
  const cancelled = state.competitions!.instances.map(instance => instance.id !== instanceId ? instance : {
    ...instance,
    fixtures: instance.fixtures.map(fixture => fixture.id === fixtureId ? cancelFixture(fixture) : fixture),
  });
  const updated = applyInstances(state, cancelled);
  if (updated) return updated;
  recoveryLog(`withdrew ${instanceId} after ${fixtureId} could not be cancelled`);
  const closed = state.competitions!.instances.map(instance => instance.id === instanceId ? withdrawInstance(instance) : instance);
  return applyInstances(state, closed) ?? state;
}

function withdrawUnresolved(state: GameState): GameState {
  const season = state.competitions!.calendar!.season;
  let changed = false;
  const instances = state.competitions!.instances.map(instance => {
    if (instance.season !== season || TERMINAL.has(instance.status)) return instance;
    changed = true;
    recoveryLog(`withdrew ${instance.id} (${instance.status}) at the end of the calendar`);
    return withdrawInstance(instance);
  });
  if (!changed) return state;
  return applyInstances(state, instances) ?? state;
}

/**
 * After the interval's hooks: a result that never landed becomes a forfeit, or
 * the fixture is cancelled when the commit itself fails. Competitions that can
 * never finish are closed. The caller then advances; this does not hold the week.
 */
export function settleStructuralCalendar(state: GameState, week: number): GameState {
  let next = recoverUnfinishableCompetitions(state);
  for (const ref of currentCalendarFixtures(next)) {
    const live = currentCalendarFixtures(next).find(item => item.instance.id === ref.instance.id && item.fixture.id === ref.fixture.id);
    if (!live) continue;
    try {
      const settled = finaliseCalendarFixture(next, fixtureBridge(live), forfeitScore(live.instance, live.fixture), true);
      if (settled === next) throw new Error('fixture result was not accepted');
      recoveryLog(`forfeited ${live.instance.id} ${live.fixture.id}`);
      next = settled;
    } catch (err) {
      next = abandonFixture(next, live.instance.id, live.fixture.id, err);
    }
  }
  if (week >= next.competitions!.calendar!.slots.length && !structuralSeasonResolved(next)) next = withdrawUnresolved(next);
  return next;
}

/** Missing actual rival players produce a walkover, never a generated substitute sheet. */
export function resolveCalendarForfeits(state: GameState): GameState {
  let next = state;
  for (const { instance, fixture } of currentCalendarFixtures(state)) {
    if (fixture.homeId === state.clubId || fixture.awayId === state.clubId) continue;
    const fit = (id: string): number => (state.league.clubs.find(c => c.id === id)?.squad ?? []).filter(p => p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0).length;
    const minimum = instance.definition.lineup.minSquad;
    const homeFit = fit(fixture.homeId) >= minimum; const awayFit = fit(fixture.awayId) >= minimum;
    if (homeFit && awayFit) continue;
    // Structural-only double-unavailability uses the published frozen order.
    const homeWins = homeFit || (!awayFit && instance.tieOrder.indexOf(fixture.homeId) < instance.tieOrder.indexOf(fixture.awayId));
    next = finaliseCalendarFixture(next, fixtureBridge({ instance, fixture }), homeWins
      ? { homeScore: FORFEIT_SCORE, awayScore: 0 } : { homeScore: 0, awayScore: FORFEIT_SCORE }, true);
  }
  return next;
}
