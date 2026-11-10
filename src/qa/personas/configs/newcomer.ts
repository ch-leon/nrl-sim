import type { PersonaConfig } from '../types';
export default {
  id: 'newcomer', label: 'Newcomer', goals: ['Follow obvious buttons', 'Survive season one'],
  difficulties: ['easy', 'normal', 'hard'], mistakeRate: 0.15,
  events: 'first', training: 'balanced',
  facilities: { policy: 'none', builds: [], reserve: 0 },
  recruits: { policy: 'minimum', floor: 13, reserve: 0, wageWeeks: 0, renewStars: false },
  staff: { roles: [], fromWeek: 1, reserve: 0 },
  tactics: 'defaults', attackCoach: 'none', setPlays: 'none',
} satisfies PersonaConfig;
