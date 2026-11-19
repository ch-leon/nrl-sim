// Project every known club commitment against the same fixture and cover pool.
import type { GameState } from '../core/state';
import { CHALLENGE_EDITIONS } from '../data/individualChallengeRules';
import { CAMP_RULES } from '../data/playerAssignments';

export type ClubRoster = Pick<GameState, 'season' | 'clubId' | 'competitions'>;
export interface PlayerReservation {
  id: string;
  playerId: string;
  week: number;
  title: string;
  away: boolean;
}
export function clubReservations(state: ClubRoster): PlayerReservation[] {
  const result: PlayerReservation[] = [];
  for (const r of state.competitions?.assignments ?? []) {
    if (r.season === state.season && r.clubId === state.clubId && r.booking && (r.status === 'booked' || r.status === 'away'))
      result.push({id:r.id,playerId:r.booking.participantId,week:r.rules.departureWeek,title:CAMP_RULES.title,away:r.status==='away'});
  }
  for (const r of state.competitions?.individualChallenges ?? []) {
    if (r.season !== state.season || r.clubId !== state.clubId || !['booked','coaching','ready-for-interval'].includes(r.status)) continue;
    const edition = CHALLENGE_EDITIONS[r.editionId];
    result.push({id:r.id,playerId:r.participantId,week:edition.eventWeek,title:edition.name,away:r.status!=='booked'});
  }
  return result;
}

export function awayPlayerIds(state: ClubRoster): ReadonlySet<string> {
  return new Set(clubReservations(state).filter(r=>r.away).map(r=>r.playerId));
}
