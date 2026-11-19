import { clubReservations } from './playerAvailability';
export { awayPlayerIds } from './playerAvailability';
import type { GameState, Player, TrainingFocus } from '../core/state';
import {
  CAMP_RULES,
  COACH_CANCELLED,
  campId,
  openingCampFixture,
  supportedCampCalendar,
  type CampBooking,
  type CampRecord
} from '../data/playerAssignments';
import { shownStats } from '../data/player';
import { isFieldable, resolveLineup } from './lineup';
import { injuryRecoveryPerWeek, levelPointSpendMode } from './training';
import { applyCampAward, campTrainingFoci } from './assignmentTraining';

export type CampAction = { kind: 'book'; participantId: string; focus: TrainingFocus | null } | { kind: 'cancel' };
export type CampRefusal = { ok: false; reason: string; message: string };
export type CampResult = { ok: true; state: GameState } | CampRefusal;
const refuse = (reason: string, message: string): CampRefusal => ({ ok: false, reason, message });

export function currentSkillsCamp(state: GameState): CampRecord | null {
  const c = state.competitions;
  const saved = c?.assignments?.find((r) => r.season === state.season && r.clubId === state.clubId);
  if (saved) return saved;
  const pack = state.pack ?? 'au';
  if (
    state.week < CAMP_RULES.opensWeek ||
    state.week > CAMP_RULES.closesWeek ||
    c?.leagueCareer?.phase !== 'active' ||
    !supportedCampCalendar(c, pack)
  )
    return null;
  const opening = openingCampFixture(c, state.season, state.clubId);
  if (opening?.fixture.status !== 'scheduled') return null;
  const { league, fixture } = opening;
  return {
    id: campId(state.season, state.clubId),
    season: state.season,
    clubId: state.clubId,
    pack,
    instanceId: league.id,
    fixtureId: fixture.id,
    opponentId: fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId,
    rules: { ...CAMP_RULES },
    revision: 0,
    status: 'available',
    booking: null,
    reason: null,
    award: null,
    awardBasis: null
  };
}

interface CampProjection {
  reason: string | null;
  fitCount: number;
  coverCount: number;
  starters: (Player | null)[];
  bench: Player[];
  cover: Player | null;
  role: 'starter' | 'bench' | 'reserve';
}
/** Project only from a week boundary. Before kickoff medical care has already run, discipline has not. */
export function projectCampDeparture(
  state: GameState,
  booking: Pick<CampBooking, 'participantId'>,
  targetSlot: number = CAMP_RULES.departureWeek,
  outgoingId?: string,
  ownReservation = campId(state.season, state.clubId),
  title: string = CAMP_RULES.title
): CampProjection {
  const intervals = Math.max(0, targetSlot - state.week);
  const recovery = (intervals + 1) * injuryRecoveryPerWeek(state.facilities);
  const squad = state.squad
    .filter((p) => p.id !== outgoingId)
    .map((p) => ({
      ...p,
      injuredWeeks: Math.max(0, p.injuredWeeks - recovery),
      suspendedWeeks: Math.max(0, (p.suspendedWeeks ?? 0) - intervals)
    }));
  const id = booking.participantId;
  const player = state.squad.find((p) => p.id === id && p.id !== outgoingId);
  const others = new Set(clubReservations(state).filter(r=>r.week === targetSlot && r.id !== ownReservation).map(r=>r.playerId));
  const fit = squad.filter(p => isFieldable(p) && !others.has(p.id));
  const selected = resolveLineup(state.lineup, squad, others);
  const starter = selected.starters.findIndex((p) => p?.id === id);
  const benched = selected.bench.some((p) => p.id === id);
  let reason: string | null = null;
  if (!player) reason = 'The booked player has left the club.';
  else if (others.has(id)) reason = 'The player already has a commitment for this week.';
  else if (player.injuredWeeks > 0) reason = 'The player is injured and must be fit before departure.';
  else if ((player.suspendedWeeks ?? 0) > 0) reason = `The player is suspended and cannot attend ${title}.`;
  const minimum = CAMP_RULES.minSquad;
  const remaining = fit.filter((p) => p.id !== id).length;
  if (!reason && remaining < minimum)
    reason = `Only ${remaining} players can cover the fixture. ${title} requires ${minimum}.`;
  const side = reason ? selected : resolveLineup(state.lineup, squad, new Set([...others, id]));
  const cover = reason
    ? null
    : starter >= 0
      ? (side.starters[starter] ?? null)
      : benched
        ? (side.bench.find((p) => !selected.bench.some((b) => b.id === p.id)) ?? null)
        : null;
  return {
    reason,
    coverCount: remaining,
    fitCount: reason ? fit.length : remaining,
    starters: side.starters,
    bench: side.bench,
    cover,
    role: starter >= 0 ? 'starter' : benched ? 'bench' : 'reserve'
  };
}
function replaceCamp(state: GameState, record: CampRecord): GameState {
  const c = state.competitions!;
  const rows = c.assignments ?? [];
  return {
    ...state,
    competitions: {
      ...c,
      assignments: rows.some((r) => r.id === record.id)
        ? rows.map((r) => (r.id === record.id ? record : r))
        : [...rows, record]
    }
  };
}
function cancelledCamp(state: GameState, r: CampRecord, reason: string): CampRecord {
  const b = r.booking!;
  const participant = state.squad.find((p) => p.id === b.participantId);
  return {
    ...r,
    status: 'cancelled',
    revision: r.revision + 1,
    reason,
    booking: { ...b, participantName: participant?.name ?? b.participantName }
  };
}
export function changeCampBooking(state: GameState, offerId: string, revision: number, action: CampAction): CampResult {
  const r = currentSkillsCamp(state);
  if (!r || r.id !== offerId || r.revision !== revision)
    return refuse('stale', 'This camp offer changed. Review the booking again.');
  if (state.competitions?.leagueCareer?.phase !== 'active' || state.week > CAMP_RULES.departureWeek)
    return refuse('closed', 'This Skills Camp has closed.');
  const next = { ...r, revision: revision + 1 };
  if (action.kind === 'cancel') {
    if (r.status !== 'booked') return refuse('closed', 'Only a booking before departure can be cancelled.');
    return {
      ok: true,
      state: replaceCamp(
        state,
        state.week <= CAMP_RULES.closesWeek
          ? { ...next, status: 'available', booking: null }
          : cancelledCamp(state, r, COACH_CANCELLED)
      )
    };
  }
  if (r.status !== 'available' || state.week > CAMP_RULES.closesWeek)
    return refuse('closed', 'Bookings are open in Weeks 1–4.');
  const projection = projectCampDeparture(state, action);
  if (projection.reason) return refuse('ineligible', projection.reason);
  const player = state.squad.find((p) => p.id === action.participantId)!;
  const manual = levelPointSpendMode(state.settings.spendPointsMyself) === 'manual';
  if (manual ? action.focus !== null : !action.focus || !campTrainingFoci(player).includes(action.focus))
    return refuse('focus', 'Choose an available training focus for the current spending mode.');
  return {
    ok: true,
    state: replaceCamp(state, {
      ...next,
      status: 'booked',
      booking: { participantId: player.id, participantName: player.name, bookedWeek: state.week, focus: action.focus }
    })
  };
}

export function campDisposalProblem(state: GameState, playerId: string): string | null {
  for (const r of clubReservations(state)) {
    if (r.away && r.title === CAMP_RULES.title) return 'Finish the Skills Camp interval before changing the squad.';
    if (playerId === r.playerId) return r.away ? `This player is away at ${r.title}.` : `Cancel this player’s ${r.title} booking before moving him.`;
    const projection = (outgoingId?: string) => projectCampDeparture(state,{participantId:r.playerId},r.week,outgoingId,r.id,r.title);
    const after = projection(playerId);
    if (after.coverCount < CAMP_RULES.minSquad && after.coverCount < projection().coverCount)
      return `Arrange enough cover for ${r.title} before moving this player.`;
  }
  return null;
}

export function departForCamp(state: GameState): GameState {
  if (state.week !== CAMP_RULES.departureWeek) return state;
  const r = currentSkillsCamp(state);
  if (r?.status !== 'booked' || !r.booking) return state;
  const reason = projectCampDeparture(state, r.booking).reason;
  return replaceCamp(state, reason ? cancelledCamp(state, r, reason) : { ...r, revision: r.revision + 1, status: 'away' });
}
/** Called on the detached next-week candidate after every match hold has settled. */
export function completeCamp(state: GameState): GameState {
  if (state.week !== CAMP_RULES.returnWeek) return state;
  const r = currentSkillsCamp(state);
  if (r?.status !== 'away' || !r.booking) return state;
  const participant = state.squad.find((p) => p.id === r.booking!.participantId);
  if (!participant) throw Error('The returning Skills Camp player is missing.');
  const { player, receipt } = applyCampAward(participant, {
    ...(r.booking.focus ? { campFocus: r.booking.focus } : {}),
    clubFocus: state.training.focus,
    mode: levelPointSpendMode(state.settings.spendPointsMyself)
  });
  const awardBasis = {
    age: participant.age,
    clubFocus: state.training.focus,
    xpTraits: participant.traits
      .filter((t) => t.id === 'youngGun' || t.id === 'workhorse')
      .map(({ id, level }) => ({ id, level })),
    stats: Object.fromEntries(shownStats(participant.position).map((k) => [k, participant.stats[k]]))
  };
  return replaceCamp(
    { ...state, squad: state.squad.map((p) => (p.id === player.id ? player : p)) },
    {
      ...r,
      awardBasis,
      booking: { ...r.booking, participantName: player.name },
      revision: r.revision + 1,
      status: 'completed',
      award: receipt
    }
  );
}
