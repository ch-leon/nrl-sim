// Office pacing (#482), kept separate from the facility rules (#481).
// Only Office's tiles consult this: HUD, Finance's VIEW and warning links stay open.
import { bus } from '../core/events';
import { getState, setState, type GameState } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';

export const SCREEN_UNLOCK_LADDER = [
  { id: 'finance', round: null, reason: 'Opens after your first home game',
    line: "Finance is open. First gate's in; have a look at where the money goes." },
  { id: 'staff', round: 4, reason: 'Opens at round 4',
    line: "Staff & Board is open. You've had the board's first read. Time to meet the people behind the club." },
  { id: 'contracts', round: 12, reason: 'Opens at round 12',
    line: "Contracts is open. Get a look at who needs a new deal before the warnings start." },
] as const;

export function isScreenOpen(state: GameState, id: string): boolean {
  return !SCREEN_UNLOCK_LADDER.some((row) => row.id === id)
    || state.unlocks?.screens === undefined || state.unlocks.screens.includes(id);
}

export function screenLockReason(state: GameState, id: string): string | null {
  return isScreenOpen(state, id) ? null : SCREEN_UNLOCK_LADDER.find((row) => row.id === id)?.reason ?? null;
}

/** Pure; `round` lets the end-of-week hook open round 4 before that round starts. */
export function screensDue(state: GameState, round = state.week): string[] {
  return SCREEN_UNLOCK_LADDER.filter((row) => !isScreenOpen(state, row.id) && (
    state.season > 1 || (row.round === null
      ? state.league.fixtures.some((f) => f.homeId === state.clubId && f.result !== undefined)
      : round >= row.round)
  )).map((row) => row.id);
}

export function registerScreenUnlockSystem(): void {
  // After fixtures have their results and before autosave. Round N is available
  // when the previous week's play ends, rather than after playing round N.
  registerTickHook('screen-unlocks', TICK_ORDER.autosave - 1, () => {
    const state = getState();
    const due = screensDue(state, state.week + 1);
    if (!due.length || !state.unlocks) return;
    const screens = [...(state.unlocks.screens ?? []), ...due];
    const allOpen = SCREEN_UNLOCK_LADDER.every((row) => screens.includes(row.id));
    const unlocks = { ...state.unlocks, screens: allOpen ? undefined : screens };
    // The shared system clears the state once facilities and screens are all open.
    setState({ unlocks });
    for (const row of SCREEN_UNLOCK_LADDER) if (due.includes(row.id)) {
      bus.emit('ui:notify', { text: row.line, kind: 'info', from: 'coach' });
    }
  });
}
