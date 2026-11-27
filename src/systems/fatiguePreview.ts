// Project the saved calendar with today's picks and bookings. Interchange at
// the previewed match is conditional, since a player may never take the field.
import type { GameState } from '../core/state';
import { WEEKLY_FATIGUE } from '../data/cards';
import { leagueSeasonView, type LeagueFixtureView } from './leagueSeasonView';
import { resolveLineup } from './lineup';
import { clubReservations } from './playerAvailability';
import { injuryRecoveryPerWeek } from './training';
import { addBonusEventFatigue, applyMatchWeeklyFatigue, recoverWeeklyFatigue, weeklyFatigueOf } from './weeklyFatigue';

type DatedFixture = LeagueFixtureView & { slot: number };
interface FatigueFixture { id: string; week: number; label: string }
interface FatigueAppearance { before: number; after: number; interchange: boolean }

export interface WeeklyFatiguePreview {
  league?: FatigueFixture;
  kickoff?: Readonly<Record<string, number>>;
  awayAtKickoff: ReadonlySet<string>;
  event?: { fixture?: FatigueFixture; players: ReadonlyMap<string, FatigueAppearance> };
}

export function crossedFatigueLines(before: number, after: number): number[] {
  return WEEKLY_FATIGUE.INJURY_TIERS.map(t => t.above)
    .filter(line => (before > line) !== (after > line)).reverse();
}

function fixtureText(state: GameState, match: DatedFixture): FatigueFixture {
  const { fixture } = match;
  const rivalId = fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId;
  const opponent = state.league.clubs.find(c => c.id === rivalId)?.name ?? rivalId;
  const stage = match.stageKind === 'league' ? `Round ${fixture.round}` : match.stageLabel;
  return { id: fixture.id, week: match.slot, label: `${stage} v ${opponent}` };
}

export function previewWeeklyFatigue(
  state: GameState, booking?: { week: number; playerId: string },
): WeeklyFatiguePreview | undefined {
  if (!state.cardWeek) return;
  const season = leagueSeasonView(state);
  const fixtures = season?.choiceRequired || season?.calendar.status !== 'active' ? [] :
    (season?.fixtures ?? []).flatMap(f => f.status === 'scheduled' && typeof f.fixture.slot === 'number'
      && f.fixture.slot >= state.week && ['scheduled', 'active'].includes(f.instance.status)
      && (f.fixture.homeId === state.clubId || f.fixture.awayId === state.clubId)
      ? [{ ...f, slot: f.fixture.slot }] : []);
  const isLeague = (f: DatedFixture): boolean => f.instance.definition.format.kind === 'league';
  const next = fixtures[0];
  const bonusMatch = !booking && next && !isLeague(next) ? next : undefined;
  const eventWeek = booking?.week ?? bonusMatch?.slot;
  const league = fixtures.find(f => isLeague(f) && (eventWeek === undefined || f.slot > eventWeek));
  const result: WeeklyFatiguePreview = { awayAtKickoff: new Set(), ...(league ? { league: fixtureText(state, league) } : {}) };
  const reservations = clubReservations(state);
  const injuryRecovery = injuryRecoveryPerWeek(state.facilities);
  let projected = state;
  for (let week = state.week; week <= (league?.slot ?? eventWeek ?? 0); week++) {
    projected = recoverWeeklyFatigue(projected);
    const away = new Set(reservations.filter(r => r.week === week).map(r => r.playerId));
    if (league?.slot === week) {
      result.kickoff = projected.cardWeek!.weeklyFatigue;
      result.awayAtKickoff = away;
      break;
    }

    const entrant = booking?.week === week ? booking.playerId : undefined;
    if (entrant !== undefined) away.add(entrant);
    const match = fixtures.find(f => f.slot === week);
    const intervals = week - state.week;
    const squad = match ? state.squad.map(player => ({
      ...player,
      injuredWeeks: Math.max(0, player.injuredWeeks - (intervals + 1) * injuryRecovery),
      suspendedWeeks: Math.max(0, (player.suspendedWeeks ?? 0) - intervals),
    })) : [];
    const side = match ? resolveLineup(state.lineup, squad, away) : undefined;
    const starters = side?.starters.flatMap(p => p ? [p.id] : []) ?? [];
    const previewThisMatch = bonusMatch?.slot === week;
    const interchange = previewThisMatch ? side?.bench.map(p => p.id) ?? [] : [];
    const before = projected;
    if (match) projected = applyMatchWeeklyFatigue(projected, isLeague(match), starters, interchange);
    if (away.size) projected = addBonusEventFatigue(projected, [...away]);
    if (week === eventWeek) {
      const ids = entrant !== undefined ? [entrant] : [...starters, ...interchange];
      result.event = {
        ...(bonusMatch ? { fixture: fixtureText(state, bonusMatch) } : {}),
        players: new Map(ids.map(id => [id, {
          before: weeklyFatigueOf(before, id), after: weeklyFatigueOf(projected, id), interchange: interchange.includes(id),
        }])),
      };
    }
  }
  return result;
}
