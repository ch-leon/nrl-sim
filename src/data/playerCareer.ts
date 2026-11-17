import type { Player } from '../core/state';

export interface CareerDate { season: number; week: number }
export type ClubArrival = 'opening' | 'observed' | 'signing' | 'transfer' | 'emergency';
export type ClubDeparture = 'transfer' | 'release' | 'expiry' | 'retirement';
export interface ClubSpell {
  clubId: string;
  start: CareerDate;
  arrival: ClubArrival;
  end?: CareerDate;
  departure?: ClubDeparture;
  transferFee?: number;
}
export interface PlayerCareerHistory { spells: ClubSpell[]; academyDiscountUsed: boolean }
/** A final snapshot, without a live contract, fitness or morale. No second live registry. */
export type RetiredPlayerRecord = Pick<Player,
  'id' | 'name' | 'age' | 'position' | 'career' | 'seasonStats' | 'stats' | 'ceilings' | 'traits'
  | 'xp' | 'level' | 'unspentPoints' | 'joinedSeason'> & {
    retiredAt: CareerDate;
    clubHistory: PlayerCareerHistory;
  };
export interface PlayerPopulation {
  schemaVersion: 1;
  shortlistIds: string[];
  retired: RetiredPlayerRecord[];
  nextPlayerOrdinal: number;
  lastMarketIntakeSeason: number;
  lastAcademyIntakeSeason: number;
}
