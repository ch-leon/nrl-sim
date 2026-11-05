// Fixed-input rival choices (#469). No upcoming player tactics or RNG.
import type { Difficulty } from '../../config';
import { COUNTERS } from './counters';
import { COUNTER_MATRIX } from './counterMatrix';
import { styleFit, type StyleFit } from './fit';
import { ATTACK_PRESETS, DEFENCE_PRESETS, DEFAULT_TACTICS, type TeamTactics, type StyleEntry } from './presets';

export { COUNTER_MATRIX } from './counterMatrix';

export interface RivalPlanContext {
  difficulty: Difficulty;
  recentPlans: readonly TeamTactics[];
  playerRoster: readonly StyleEntry[];
}

/** Joint-plan mode. Equal counts favour the most recently played plan. */
export function usualPlan(recent: readonly TeamTactics[]): TeamTactics {
  const window = recent.slice(0, 3);
  const count = (p: TeamTactics): number => window.filter(q => p.attack === q.attack && p.defence === q.defence).length;
  return window.reduce((best, p) => count(p) > count(best) ? p : best, window[0] ?? DEFAULT_TACTICS);
}

/** Fit edge plus signed attack/defence cells, in expected win-share points. */
export function planValue(plan: TeamTactics, opponent: TeamTactics, own: StyleFit, theirs: StyleFit): number {
  return COUNTERS.ai.fit * (own[plan.attack] + own[plan.defence] - theirs[opponent.attack] - theirs[opponent.defence])
    + COUNTERS.ai.matrix * (COUNTER_MATRIX[plan.attack][opponent.defence] * own[plan.attack] * theirs[opponent.defence]
      - COUNTER_MATRIX[opponent.attack][plan.defence] * theirs[opponent.attack] * own[plan.defence]);
}

/** Easy maximises its own fit. Normal counters the mode; Hard weights all three habits by player fit. */
export function pickRivalPlan(own: StyleFit, theirs: StyleFit, difficulty: Difficulty, recent: readonly TeamTactics[]): TeamTactics {
  const history = recent.slice(0, 3);
  const usual = usualPlan(history);
  const habits = difficulty === 'hard' && history.length ? history : [usual];
  // Balanced / Slide wins a completely equal tie; remaining ties use preset order.
  let best: TeamTactics = { ...DEFAULT_TACTICS };
  const value = (p: TeamTactics): number => {
    if (difficulty === 'easy') return own[p.attack] + own[p.defence];
    let total = 0, weights = 0;
    for (const habit of habits) {
      const weight = difficulty === 'hard' ? (theirs[habit.attack] + theirs[habit.defence]) / 2 : 1;
      total += weight * planValue(p, habit, own, theirs);
      weights += weight;
    }
    return weights ? total / weights : planValue(p, usual, own, theirs);
  };
  let score = value(best);
  for (const attack of ATTACK_PRESETS) for (const defence of DEFENCE_PRESETS) {
    const plan = { attack, defence }, next = value(plan);
    if (next > score) { best = plan; score = next; }
  }
  return best;
}

export function learnedRivalPlan(nine: readonly StyleEntry[], context: RivalPlanContext): TeamTactics {
  return pickRivalPlan(styleFit(nine), styleFit(context.playerRoster), context.difficulty, context.recentPlans);
}
