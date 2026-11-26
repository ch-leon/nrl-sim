// New careers open facilities through season one. Absence preserves old-save behaviour.
import { getState, setState, type GameState } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { SEASON_ROUNDS } from '../config';
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import type { LeagueReadState } from './leagueSeasonView';
import { SCREEN_UNLOCK_LADDER, isScreenOpen, ladderReason, leagueUnlockProgress, registerScreenUnlockSystem } from './screenUnlocks';

export { isScreenOpen, screenLockReason, screensDue } from './screenUnlocks';

type Trigger = 'screen' | 'start' | 'roundOrWin' | 'home' | 'round' | 'lastRoundOrReputation';
export const UNLOCK_LADDER: readonly {
  facilities: readonly FacilityDefId[];
  trigger: Trigger;
  round?: number;
  reason: string;
  screens?: readonly string[];
}[] = [
  { facilities: ['trainingPaddock', 'weightsRoom', 'canteen', 'sponsorBoard'], trigger: 'start', reason: 'Open from the start' },
  { facilities: ['videoRoom', 'physioCentre'], trigger: 'roundOrWin', round: 2, reason: 'Opens at round 2, or after your first win' },
  { facilities: ['coachsOffice'], trigger: 'home', reason: 'Opens after your first home game' },
  { facilities: ['scoutOffice', 'medicalBay'], trigger: 'round', round: 5, reason: 'Opens at round 5' },
  { facilities: ['teamGym', 'academy'], trigger: 'round', round: 8, reason: 'Opens at round 8' },
  ...SCREEN_UNLOCK_LADDER.map((row) => ({
    facilities: [] as FacilityDefId[], screens: [row.id], trigger: 'screen' as const,
    ...(row.round === null ? {} : { round: row.round }), reason: row.reason,
  })),
  { facilities: ['grandstand'], trigger: 'lastRoundOrReputation', get reason() { return `Opens at round ${SEASON_ROUNDS}, or reputation 40`; } },
];

export function isFacilityOpen(state: Pick<GameState, 'unlocks'>, id: FacilityDefId): boolean {
  return !state.unlocks || state.unlocks.facilities.includes(id);
}

/** Without a state (or in Classic) the Classic wording; a League career's names its league rounds. */
export function unlockReason(id: FacilityDefId, state?: LeagueReadState): string {
  const row = UNLOCK_LADDER.find((r) => r.facilities.includes(id))!;
  if (row.trigger !== 'lastRoundOrReputation' || !state?.competitions?.leagueCareer) return ladderReason(state, row.reason);
  const rounds = leagueUnlockProgress(state)?.regularRounds;
  return rounds ? `Opens at league round ${rounds}, or reputation 40` : 'Opens at the last league round, or reputation 40';
}

/**
 * Pure: fixtures with results are played; scheduled home games and draws are not wins.
 * A League career (#831) reads its own season's results and counts league rounds
 * played, so `week` (the hook's look-ahead) does not move its ladder.
 */
export function unlocksDue(state: GameState): FacilityDefId[] {
  if (!state.unlocks) return [];
  const league = leagueUnlockProgress(state);
  let home: boolean, win: boolean;
  if (league) ({ home, win } = league);
  else {
    const played = state.league.fixtures.filter((f) => f.round > 0 && f.result);
    home = played.some((f) => f.homeId === state.clubId);
    win = played.some((f) => f.homeId === state.clubId
      ? f.result!.homeScore > f.result!.awayScore
      : f.awayId === state.clubId && f.result!.awayScore > f.result!.homeScore);
  }
  const round = league ? league.round : state.week;
  const lastRound = league ? league.regularRounds ?? Infinity : SEASON_ROUNDS;
  return UNLOCK_LADDER.filter((row) => {
    if (state.season > 1) return true;
    switch (row.trigger) {
      case 'screen': return false;
      case 'start': return true;
      case 'home': return home;
      case 'roundOrWin': return round >= row.round! || win;
      case 'round': return round >= row.round!;
      case 'lastRoundOrReputation': return round >= lastRound || state.reputation >= 40;
    }
  }).flatMap((row) => row.facilities.filter((id) => !isFacilityOpen(state, id)));
}

export function registerUnlockSystem(): void {
  registerScreenUnlockSystem();
  // After results/reputation, before autosave. Counters advance after all hooks:
  // the next round's facilities must already be available when that round starts.
  registerTickHook('unlocks', TICK_ORDER.autosave - 1, () => {
    const s = getState();
    if (!s.unlocks) return;
    const due = unlocksDue({ ...s, week: s.week + 1 });
    const facilities = [...s.unlocks.facilities, ...due];
    const complete = Object.keys(FACILITY_CATALOG).every((id) => facilities.includes(id as FacilityDefId));
    if (!due.length && !complete) return;
    const screensComplete = SCREEN_UNLOCK_LADDER.every((row) => isScreenOpen(s, row.id));
    setState({ unlocks: complete && screensComplete ? undefined : { ...s.unlocks, facilities } });
    if (due.length) {
      const names = due.map((id) => FACILITY_CATALOG[id].name).join(', ');
      bus.emit('ui:notify', { from: 'coach', kind: 'info', text: `${names} ${due.length === 1 ? "is" : "are"} open. Build when the club can afford it.` });
    }
  });
}

/** The existing Settings opt-out from staged unlocks. No immediate save or notification. */
export function openAllUnlocks(): void {
  setState({ unlocks: undefined });
}
