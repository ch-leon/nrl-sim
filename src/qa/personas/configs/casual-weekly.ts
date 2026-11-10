import type { PersonaConfig } from '../types';
export default {
  id: 'casual-weekly', label: 'Casual weekly player', goals: ['Stay competitive', 'Finish seasons solvent'],
  difficulties: ['easy', 'normal', 'hard'], mistakeRate: 0.20,
  events: 'first', training: 'balanced',
  facilities: { policy: 'first', builds: ['trainingPaddock'], reserve: 40_000 },
  recruits: { policy: 'short', floor: 16, reserve: 30_000, wageWeeks: 8, renewStars: true },
  staff: { roles: ['welfare'], fromWeek: 16, reserve: 60_000 },
  tactics: 'defaults', attackCoach: 'none', setPlays: 'none',
} satisfies PersonaConfig;
