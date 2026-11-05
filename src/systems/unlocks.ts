// New careers open facilities through season one. Absence preserves old-save behaviour.
import { getState, setState, type GameState } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { SEASON_ROUNDS } from '../config';
import { FACILITY_CATALOG, type FacilityDefId } from '../data/facility';
import { SCREEN_UNLOCK_LADDER, isScreenOpen, registerScreenUnlockSystem } from './screenUnlocks';

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
  { facilities: ['grandstand'], trigger: 'lastRoundOrReputation', reason: `Opens at round ${SEASON_ROUNDS}, or reputation 40` },
];

export function isFacilityOpen(state: Pick<GameState, 'unlocks'>, id: FacilityDefId): boolean {
  return !state.unlocks || state.unlocks.facilities.includes(id);
}

export function unlockReason(id: FacilityDefId): string {
  return UNLOCK_LADDER.find((row) => row.facilities.includes(id))!.reason;
}

/** Pure: fixtures with results are played; scheduled home games and draws are not wins. */
export function unlocksDue(state: GameState): FacilityDefId[] {
  if (!state.unlocks) return [];
  const played = state.league.fixtures.filter((f) => f.round > 0 && f.result);
  const home = played.some((f) => f.homeId === state.clubId);
  const win = played.some((f) => f.homeId === state.clubId
    ? f.result!.homeScore > f.result!.awayScore
    : f.awayId === state.clubId && f.result!.awayScore > f.result!.homeScore);
  return UNLOCK_LADDER.filter((row) => {
    if (state.season > 1) return true;
    switch (row.trigger) {
      case 'screen': return false;
      case 'start': return true;
      case 'home': return home;
      case 'roundOrWin': return state.week >= row.round! || win;
      case 'round': return state.week >= row.round!;
      case 'lastRoundOrReputation': return state.week >= SEASON_ROUNDS || state.reputation >= 40;
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
