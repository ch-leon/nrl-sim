import { createNewGame, getState, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';

/** Real installed population, including the rival owners. */
export function careerFixture(seed = 572): GameState {
  createNewGame('Continuity', seed);
  initLeague(getState());
  return getState();
}

/** Make a true pre-v30 fixture instead of spoofing a version on new metadata. */
export function withoutPopulationMetadata(state: GameState) {
  const { playerPopulation: _population, competitionRewards: _rewards, ...rest } = state;
  const strip = (players: GameState['squad']) => players.map(({ clubHistory: _history, ...player }) => player);
  return { ...rest, squad: strip(state.squad), freeAgents: strip(state.freeAgents),
    league: { ...state.league, clubs: state.league.clubs.map(c => c.squad ? { ...c, squad: strip(c.squad) } : c) } };
}
