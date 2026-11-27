// Weekly fatigue carries between fixtures in a Labs career (#854).
import type { GameState } from '../core/state';
import { WEEKLY_FATIGUE } from '../data/cards';

export function weeklyFatigueOf(state: Pick<GameState, 'cardWeek'>, playerId: string): number {
  const value = state.cardWeek?.weeklyFatigue[playerId];
  return typeof value === 'number' ? value : WEEKLY_FATIGUE.MIN;
}

export function recoverWeeklyFatigue(state: GameState): GameState {
  const cw = state.cardWeek;
  if (!cw || !Object.keys(cw.weeklyFatigue).length) return state;
  const facilities = Number(state.facilities.some(f => f.defId === 'physioCentre'))
    + Number(state.facilities.some(f => f.defId === 'medicalBay'));
  const recovery = WEEKLY_FATIGUE.RECOVERY + facilities * WEEKLY_FATIGUE.FACILITY_RECOVERY;
  const weeklyFatigue = Object.fromEntries(state.squad.flatMap(({ id }) => {
    const remaining = weeklyFatigueOf(state, id) - recovery;
    return remaining > WEEKLY_FATIGUE.MIN ? [[id, remaining] as const] : [];
  }));
  return { ...state, cardWeek: { ...cw, weeklyFatigue } };
}

function addWeeklyFatigue(state: GameState, loads: ReadonlyMap<string, number>): GameState {
  const cw = state.cardWeek;
  if (!cw || !loads.size) return state;
  const updated = state.squad.flatMap(({ id }) => {
    const load = loads.get(id);
    return load === undefined ? [] : [[id, Math.min(WEEKLY_FATIGUE.MAX, weeklyFatigueOf(state, id) + load)] as const];
  });
  return { ...state, cardWeek: { ...cw, weeklyFatigue: { ...cw.weeklyFatigue, ...Object.fromEntries(updated) } } };
}

export function addBonusEventFatigue(state: GameState, participants: readonly string[]): GameState {
  return addWeeklyFatigue(state, new Map(participants.map(id => [id, WEEKLY_FATIGUE.BONUS_EVENT])));
}

export function applyMatchWeeklyFatigue(
  state: GameState, league: boolean, starters: readonly string[], interchange: readonly string[],
): GameState {
  if (!state.cardWeek) return state;
  if (!league) return addBonusEventFatigue(state, [...starters, ...interchange]);
  const loads = new Map<string, number>(interchange.map(id => [id, WEEKLY_FATIGUE.LEAGUE_BENCH]));
  for (const id of starters) loads.set(id, WEEKLY_FATIGUE.LEAGUE_STARTER);
  return addWeeklyFatigue(state, loads);
}
