import { CAMP_RULES } from '../data/playerAssignments';
import type { PlayerReservation } from '../systems/playerAvailability';

export function reservationText(trips: readonly PlayerReservation[], id: string): string | null {
  const dates = trips.filter(t => t.playerId === id).sort((a,b) => a.week - b.week);
  return dates.map(t => `${t.title} · ${t.away ? 'Away now' : 'Away Week ' + t.week} · Back Week ${t.week+1}`).join(' / ') || null;
}
export function nextReservation(trips: readonly PlayerReservation[], id: string): PlayerReservation | undefined {
  return trips.filter(t=>t.playerId===id).sort((a,b)=>a.week-b.week)[0];
}
export function tripLabel(trip: PlayerReservation): string {
  return trip.title === CAMP_RULES.title ? 'Camp' : 'Contest';
}
