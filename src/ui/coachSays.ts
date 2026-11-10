// One practical next step, derived from the club as it stands. Never saved.
import type { GameState } from '../core/state';
import { FACILITY_CATALOG } from '../data/facility';
import { worstObjective } from '../systems/board';
import { isFieldable, LINEUP_SLOTS } from '../systems/lineup';
import { BENCH } from '../match/league/bench';
import { isScreenOpen } from '../systems/unlocks';
import { nextFixture } from '../systems/league';
import { decisionViews } from './decisions';
import { runwayLevel } from './hud';

export interface CoachContext {
  decisions: number;
  runwayWeeks: number | null;
}
export interface CoachSuggestion {
  text: string;
  screen: string | null;
}

/** First match wins; slot order breaks ties, with no state writes or dice. */
export function coachSays(state: GameState, ctx: CoachContext): CoachSuggestion {
  if (ctx.decisions > 0) {
    const card = decisionViews(state)[0];
    if (card) return { text: `Answer the ${card.title} card before we play.`, screen: 'news' };
  }
  const spots = [
    ...LINEUP_SLOTS.map((position, i) => ({ id: state.lineup.starters[i], position })),
    ...Array.from({ length: BENCH.size }, (_, i) => ({ id: state.lineup.bench[i], position: 'bench' })),
  ];
  for (const spot of spots) {
    const player = state.squad.find((p) => p.id === spot.id);
    if (!player) return { text: `The ${spot.position} spot is empty. Fix the lineup.`, screen: 'lineup' };
    if (!isFieldable(player)) return { text: `${player.name} can't play. Fix the lineup.`, screen: 'lineup' };
  }
  if (isScreenOpen(state, 'finance') && runwayLevel(ctx.runwayWeeks) !== 'ok') {
    const weeks = Math.max(0, Math.floor(ctx.runwayWeeks!));
    return { text: `${weeks} weeks of cash left. No building till that's sorted.`, screen: 'finance' };
  }
  const board = worstObjective(state, ctx.runwayWeeks);
  if (board && isScreenOpen(state, 'staff')) return { text: `The board's goal is at risk: ${board.objective.text}.`, screen: 'staff' };
  for (const position of new Set(LINEUP_SLOTS)) {
    const needed = LINEUP_SLOTS.filter((p) => p === position).length;
    if (state.squad.filter((p) => p.position === position && isFieldable(p)).length < needed) {
      return { text: `We're thin at ${position}. Have a look at the recruits.`, screen: 'recruit' };
    }
  }
  const trainingBuilt = state.facilities.some((f) => FACILITY_CATALOG[f.defId].training);
  if (!trainingBuilt && state.money >= FACILITY_CATALOG.trainingPaddock.cost) {
    return { text: 'Get a Training Paddock down.', screen: 'build' };
  }
  const fixture = nextFixture(state.league.fixtures, state.week, 'player');
  const opponent = fixture && state.league.clubs.find((c) => c.id === (fixture.homeId === 'player' ? fixture.awayId : fixture.homeId));
  return { text: opponent ? `${opponent.name} next. Play the week when you're ready.` : "Play the week when you're ready.", screen: null };
}
