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
}
export interface SigningTally { count: number; fees: number; overall: number }
