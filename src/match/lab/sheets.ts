// src/match/lab/sheets.ts — team sheets for the lab from the fictional league's
// clubs (real names, colours and generated rosters), so the lab needs no save.
import { RIVAL_CLUBS } from '../../data/league';
import { teamSheetFromRival } from '../../sim/engine';
import type { TeamSheet } from '../../sim/events';

export interface LabClub {
  id: string;
  name: string;
}

export const LAB_CLUBS: readonly LabClub[] = RIVAL_CLUBS.map((c) => ({ id: c.id, name: c.name }));

export const DEFAULT_HOME = LAB_CLUBS[0]?.id ?? 'home';
export const DEFAULT_AWAY = LAB_CLUBS[1]?.id ?? 'away';

/** Sheet for a club id; unknown ids fall back to the first club. */
export function labSheet(clubId: string): TeamSheet {
  const club = RIVAL_CLUBS.find((c) => c.id === clubId) ?? RIVAL_CLUBS[0];
  if (!club) throw new Error('no clubs defined');
  return teamSheetFromRival(club);
}
