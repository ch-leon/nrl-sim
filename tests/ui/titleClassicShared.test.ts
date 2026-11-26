// #819 r6: Classic in slot 1 while a League career and its live-match checkpoint sit under
// the legacy key. The slot holds League data, so it is occupied, exactly as on main:
// Import passes it by and Start asks Start over, and the checkpoint is never wiped unasked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubLocalStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from './stubDom';
import { showTitleFlow } from '../../src/ui/title';
import * as save from '../../src/core/save';
import { LEGACY_SAVE_KEY, liveMatchKey } from '../../src/core/storageKeys';
import { createNewGame, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { leagueSlotState } from '../helpers/leagueSlot';
import { CLASSIC_RETIRED_TEXT } from '../../src/core/classicSave';

vi.mock('../../src/core/save', async (original) => ({
  ...(await original<typeof import('../../src/core/save')>()),
  pickSaveFile: vi.fn(),
}));

function classicCareer(name: string, seed: number): GameState {
  const state = createNewGame(name, seed);
  state.league = initLeague(state);
  return state;
}

function matchFor(career: GameState): string {
  const away = career.league.clubs.find((c) => c.id !== career.clubId)!.id;
  return JSON.stringify({
    season: career.season, week: career.week, round: 1, homeId: career.clubId, awayId: away, seed: 7,
    calls: [{ tick: 40, side: 'home', call: 'hit-up' }], tick: 47,
  });
}

/** Classic in slot 1's key; a League career and its parked match under the legacy key. */
async function sharedSlotOne(): Promise<{ classic: string; league: string; checkpoint: string }> {
  const storage = stubLocalStorage();
  const classic = JSON.stringify(classicCareer('Classic Club', 54));
  const leagueState = await leagueSlotState('League Club');
  const league = JSON.stringify(leagueState);
  const checkpoint = matchFor(leagueState);
  storage.setItem(save.slotKey(1), classic);
  storage.setItem(LEGACY_SAVE_KEY, league);
  storage.setItem(liveMatchKey(1), checkpoint);
  return { classic, league, checkpoint };
}

describe('a Classic slot that shares its keys with League data is occupied (#819 r6)', () => {
  beforeEach(() => { stubDocument(); });
  afterEach(() => { vi.unstubAllGlobals(); save.__setStorage(null); });

  it('shows slot 1 occupied, with no Continue on the Classic career', async () => {
    await sharedSlotOne();
    expect(save.slotHasLeagueData(1)).toBe(true);
    const root = new StubNode('div');
    void showTitleFlow(root as unknown as HTMLElement);
    const card = root.querySelector('[data-nrl-slot-1]')!;
    expect(card.getAttribute('data-empty')).toBeNull();
    expect(root.querySelector('[data-nrl-slot-label-1]')!.textContent).toBe('Classic Club');
    expect(root.querySelector('[data-nrl-continue-1]')).toBeNull();
    expect(save.getSlotSummaries()[0]).toMatchObject({ slot: 1, status: 'ok', classic: true, message: CLASSIC_RETIRED_TEXT });
  });

  it('Import goes to slot 2, as on main, and the League checkpoint stays', async () => {
    const { classic, league, checkpoint } = await sharedSlotOne();
    const imported = await leagueSlotState('Imported Club');
    vi.mocked(save.pickSaveFile).mockResolvedValue(JSON.stringify(imported));
    const root = new StubNode('div');
    void showTitleFlow(root as unknown as HTMLElement);
    root.querySelector('[data-nrl-import]')!.click();
    await vi.waitFor(() => expect(localStorage.getItem(save.slotKey(2))).not.toBeNull());
    const two = save.loadSlot(2);
    expect(two.status === 'ok' && two.state.clubName).toBe('Imported Club');
    expect(localStorage.getItem(save.slotKey(1))).toBe(classic);
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBe(league);
    expect(localStorage.getItem(liveMatchKey(1))).toBe(checkpoint);
  });

  it('Start on slot 1 asks Start over first, and nothing is cleared before it is confirmed', async () => {
    const { classic, league, checkpoint } = await sharedSlotOne();
    const root = new StubNode('div');
    const choice = showTitleFlow(root as unknown as HTMLElement);
    root.querySelector('[data-nrl-new-1]')!.click();
    await vi.dynamicImportSettled();
    root.querySelector('[data-nrl-start]')!.click();
    expect(root.querySelector('[data-nrl-start-confirm]')).not.toBeNull();
    expect(localStorage.getItem(liveMatchKey(1))).toBe(checkpoint);
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBe(league);
    root.querySelector('[data-nrl-start-confirm]')!.click();
    expect(await choice).toMatchObject({ mode: 'new', careerMode: 'league', destination: { slot: 1, expectedOriginal: classic } });
  });
});
