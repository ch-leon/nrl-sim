// N14 (#263): the forecast on the next-match card. The fixtures system rolls next
// week's weather at the end of this week, so the card can say it and the match plays in it.
import { describe, it, expect, afterEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER, withFastForward } from '../../src/core/time';
import { initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { forecastFor } from '../../src/ui/screens/fixtures';
import { registerYouthSystem } from '../../src/systems/youth';
import { WEEKS_PER_SEASON } from '../../src/config';
import { setState } from '../../src/core/state';
import { advanceWeeks } from '../../src/core/time';

function newGame(seed: number): void {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Forecast FC', seed);
  initLeague(getState());
  // The fixtures system alone: its two weather hooks are what the forecast is. The
  // match phase reads state.weather (matchday passes it to the sim); the probe reads it there.
  registerFixturesSystem();
}

afterEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

describe('the forecast (N14)', () => {
  it('the match plays in the weather the card forecast, over 40 seeds', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      newGame(seed);
      withFastForward(() => advanceWeek()); // week 1: rolled on the day (a new game has no forecast yet)
      const forecast = forecastFor(getState());
      if (!forecast) continue; // a bye in week 2
      // What the match reads: state.weather in the match phase (matchday passes it to the sim).
      let played: string | undefined;
      registerTickHook('probe-weather', TICK_ORDER.match - 0.5, () => { played = getState().weather; });
      withFastForward(() => advanceWeek());
      expect(getState().week, `seed ${seed}`).toBe(3);
      expect(played, `seed ${seed}`).toBe(forecast);
      checked++;
    }
    expect(checked).toBeGreaterThan(30);
  }, 120_000);

  it('no forecast for a match that is not this coming week', () => {
    newGame(3);
    const s = getState();
    // A week with no player fixture: the card says nothing about the weather.
    const later = { ...s, week: s.week, weather: 'rain' as const, league: { ...s.league, fixtures: s.league.fixtures.map((f) => ({ ...f, round: f.round + 1 })) } };
    expect(forecastFor(later)).toBeUndefined();
    expect(forecastFor({ ...s, weather: 'wind' })).toBe('wind');
  });
});

describe('the rollover is already on screen (N14)', () => {
  it("the Academy intake goes to the news, not the toast stack (the review shows it)", () => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    createNewGame('Quiet FC', 5);
    registerYouthSystem();
    const seen: { text: string; quiet?: boolean }[] = [];
    bus.on('ui:notify', (n) => seen.push(n));
    setState({ week: WEEKS_PER_SEASON });
    advanceWeeks(1);
    const intake = seen.find((n) => n.text.startsWith('Academy intake'));
    expect(intake?.quiet).toBe(true);
  });
});
