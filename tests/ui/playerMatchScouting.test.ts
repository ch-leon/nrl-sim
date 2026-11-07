import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from './stubDom';
import { createNewGame, getState, loadState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { getCurrentFixture, initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { rivalStyle } from '../../src/systems/rivalRound';
import { openNextMatch } from '../../src/ui/screens/fixtures';
import { openLineupScreen } from '../../src/ui/screens/lineup';
import { openRivalSquad } from '../../src/ui/screens/rivalSquad';
import { styleLine } from '../../src/ui/tacticsBlurbs';
import { counterRead } from '../../src/ui/matchupRead';
import type { TeamSheet } from '../../src/sim/events';
import type { TeamTactics } from '../../src/match/league/presets';

const habit: TeamTactics = { attack: 'expansive', defence: 'compressed' };
const reset = (): void => { bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); };
beforeEach(reset);
afterEach(() => { reset(); vi.unstubAllGlobals(); });

describe('player-match scouting uses kick-off habit context', () => {
  it.each(['normal', 'hard'] as const)('%s: seed 42 fixtures, lineup and rival scouting match the emitted kick-off, regardless of upcoming tactics', difficulty => {
    createNewGame('Scouting', 42, { difficulty });
    initLeague(getState());
    const base = structuredClone(getState());
    const picks: TeamTactics[] = [];
    for (const upcoming of [habit, { attack: 'grind', defence: 'rush' } as const]) {
      reset();
      stubDocument();
      loadState(structuredClone(base));
      setState({ recentPlans: [habit, habit, habit], lineup: { ...getState().lineup, tactics: upcoming } });
      registerPlayerMatchSystem();
      const state = getState(), fixture = getCurrentFixture(state, PLAYER_ID)!;
      const opponent = state.league.clubs.find(c => c.id === (fixture.homeId === PLAYER_ID ? fixture.awayId : fixture.homeId))!;
      const legacy = rivalStyle(opponent);
      const seed = state.rngSeed;
      const preview = openNextMatch() as unknown as StubNode;
      const theyPlay = preview.querySelector('[data-preview-line="They play"]')!.textContent;
      const advice = preview.querySelector('[data-preview-line="Counters"]')!.textContent;
      openLineupScreen();
      const body = document.body as unknown as StubNode;
      const planButton = body.querySelector('[data-plan]')! as unknown as HTMLButtonElement;
      planButton.onclick!.call(planButton, {} as PointerEvent);
      const lineup = body.querySelector('[data-plan-opponent]')!.textContent;
      openRivalSquad(opponent);
      const scouting = body.querySelector('[data-usual-fit]')!.getAttribute('data-style');
      expect(getState().rngSeed).toBe(seed);
      let rival: TeamSheet | undefined, player: TeamSheet | undefined;
      const off = bus.on('match:started', ({ home, away }) => {
        rival = home.clubId === PLAYER_ID ? away : home;
        player = home.clubId === PLAYER_ID ? home : away;
      });
      advanceWeek(); off();
      expect(rival).toBeDefined();
      const actual = rival!.tactics!;
      expect(actual).toEqual({ attack: 'expansive', defence: 'slide' });
      expect(legacy).not.toEqual(actual);
      expect(theyPlay).toContain(styleLine(actual));
      expect(lineup).toContain(styleLine(actual));
      expect(scouting).toBe(`${actual.attack}/${actual.defence}`);
      expect(advice).toBe(`Counters${counterRead(player!.roster ?? [], actual.defence)}`);
      picks.push(actual);
    }
    expect(picks[0]).toEqual(picks[1]);
  });
});
