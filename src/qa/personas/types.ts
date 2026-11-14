import type { Difficulty } from '../../config';
import type { FacilityDefId } from '../../data/facility';
import type { HireRole } from '../../systems/staff';

/** Policy names describe reusable rules, never a persona-specific code path. */
export interface PersonaConfig {
  id: string;
  label: string;
  goals: string[];
  difficulties: Difficulty[];
  mistakeRate: number;
  events: 'value' | 'first' | 'random';
  training: 'weakest' | 'balanced' | 'random';
  facilities: { policy: 'invest' | 'first' | 'neglect' | 'none'; builds: FacilityDefId[]; reserve: number };
  recruits: { policy: 'improve' | 'short' | 'stars' | 'minimum'; floor: number; reserve: number; wageWeeks: number; renewStars: boolean };
  staff: { roles: HireRole[]; fromWeek: number; reserve: number };
  tactics: 'counter-fit' | 'defaults' | 'mismatch';
  attackCoach: 'fit' | 'mismatch' | 'none';
  setPlays: 'strongest' | 'one' | 'poor-fit' | 'none';
  /** How banked level points are spent after the week awards them. */
  points: { policy: 'optimal' | 'focus' | 'random' | 'partial'; hold: number };
  /** `ai` lets the existing match AI call for the player's side. `none` never opens the coach tray. */
  calling: 'ai' | 'none';
  /** `depth` releases the worst player outside the match-day 13 while the squad is above 16. */
  releases: 'none' | 'depth';
}
/** What the persona did in one week. Outcomes (cash, XP, the score) are observed separately. */
export interface WeekLog {
  focus: string;
  signings: string[];
  releases: string[];
  facilities: string[];
  staff: string[];
  events: string[];
  tactics: string;
  setPlays: string[];
  calling: 'ai' | 'none';
}
export function emptyWeekLog(): WeekLog {
  return { focus: '', signings: [], releases: [], facilities: [], staff: [], events: [], tactics: '', setPlays: [], calling: 'none' };
}
export interface SigningTally { count: number; fees: number; overall: number }
