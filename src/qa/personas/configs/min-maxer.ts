import type { PersonaConfig } from '../types';
export default {
  id: 'min-maxer', label: 'Min-maxer', goals: ['Win', 'Grow the best nine', 'Keep spending reserves'],
  difficulties: ['easy', 'normal', 'hard'], mistakeRate: 0.03,
  events: 'value', training: 'weakest',
  facilities: { policy: 'invest', builds: ['trainingPaddock', 'teamGym', 'grandstand'], reserve: 40_000 },
  recruits: { policy: 'improve', floor: 17, reserve: 50_000, wageWeeks: 8, renewStars: true },
  staff: { roles: ['assistantCoach', 'analyst', 'welfare'], fromWeek: 1, reserve: 40_000 },
  tactics: 'counter-fit', attackCoach: 'fit', setPlays: 'strongest',
} satisfies PersonaConfig;
