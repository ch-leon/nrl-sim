import type { PersonaConfig } from '../types';
export default {
  id: 'careless', label: 'Careless player', goals: ['Expose the floor of play'],
  difficulties: ['easy', 'normal', 'hard'], mistakeRate: 0.60,
  events: 'random', training: 'random',
  facilities: { policy: 'neglect', builds: [], reserve: 0 },
  recruits: { policy: 'stars', floor: 13, reserve: 0, wageWeeks: 0, renewStars: false },
  staff: { roles: [], fromWeek: 1, reserve: 0 },
  tactics: 'mismatch', attackCoach: 'mismatch', setPlays: 'poor-fit',
  points: { policy: 'random', hold: 0.5 }, calling: 'none', releases: 'depth',
} satisfies PersonaConfig;
