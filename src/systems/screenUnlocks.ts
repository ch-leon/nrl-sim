// Office pacing (#482), kept separate from the facility rules (#481).
// Only Office's tiles consult this: HUD, Finance's VIEW and warning links stay open.
import { bus } from '../core/events';
import { getState, setState, type GameState } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { leagueClubResults, leagueSeasonView, type LeagueReadState } from './leagueSeasonView';

export const SCREEN_UNLOCK_LADDER = [
  { id: 'finance', round: null, reason: 'Opens after your first home game',
    line: "Finance is open. First gate's in; have a look at where the money goes." },
  { id: 'staff', round: 4, reason: 'Opens at round 4',
    line: "Staff & Board is open. You've had the board's first read. Time to meet the people behind the club." },
  { id: 'contracts', round: 12, reason: 'Opens at round 12',
    line: "Contracts is open. Get a look at who needs a new deal before the warnings start." },
] as const;

/**
 * A League career's season-one progress (#831), or null on the Classic calendar.
 * Its games are league, finals and Open Cup fixtures; trials (exhibition stages)
 * are excluded. `round` is the next league round, as `state.week` is in Classic.
 */
export interface LeagueUnlockProgress { home: boolean; win: boolean; round: number; regularRounds: number | null }
export function leagueUnlockProgress(state: LeagueReadState): LeagueUnlockProgress | null {
  if (!state.competitions?.leagueCareer) return null;
  const view = leagueSeasonView(state);
  if (!view) return { home: false, win: false, round: 1, regularRounds: null };
  const results = leagueClubResults(view, view.clubId);
  const roundsPlayed = view.fixtures.filter(f => f.instance.id === view.instance.id && f.stageKind === 'league'
    && f.status === 'completed' && (f.fixture.homeId === view.clubId || f.fixture.awayId === view.clubId)).length;
  return { home: results.some(r => r.home), win: results.some(r => r.result === 'W'),
    round: roundsPlayed + 1, regularRounds: view.regularRounds };
}

/** In a League career "round" is the league round, not the calendar week. */
export function ladderReason(state: Pick<LeagueReadState, 'competitions'> | undefined, reason: string): string {
  if (!state?.competitions?.leagueCareer) return reason;
  return reason.replace('first home game', 'first home game once the trials are done')
    .replace('first win', 'first win once the trials are done')
    .replace(/\bround (\d+)/, 'league round $1');
}

export function isScreenOpen(state: GameState, id: string): boolean {
  return !SCREEN_UNLOCK_LADDER.some((row) => row.id === id)
    || state.unlocks?.screens === undefined || state.unlocks.screens.includes(id);
}

export function screenLockReason(state: GameState, id: string): string | null {
  if (isScreenOpen(state, id)) return null;
  const reason = SCREEN_UNLOCK_LADDER.find((row) => row.id === id)?.reason;
  return reason === undefined ? null : ladderReason(state, reason);
}

/**
 * Pure; `round` lets the end-of-week hook open round 4 before that round starts.
 * A League career ignores it: its next league round already looks ahead once
 * this week's result is in.
 */
export function screensDue(state: GameState, round = state.week): string[] {
  const league = leagueUnlockProgress(state);
  const home = league ? league.home
    : state.league.fixtures.some((f) => f.round > 0 && f.homeId === state.clubId && f.result !== undefined);
  const next = league ? league.round : round;
  return SCREEN_UNLOCK_LADDER.filter((row) => !isScreenOpen(state, row.id) && (
    state.season > 1 || (row.round === null ? home : next >= row.round)
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
