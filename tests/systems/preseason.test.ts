import { beforeEach, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, loadState, setState, SAVE_VERSION } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER, weekHeld } from '../../src/core/time';
import { currentRound } from '../../src/core/season';
import { migrateState } from '../../src/core/save';
import { getCurrentFixture, initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { registerEconomySystem, gateReceipts, homeGate } from '../../src/systems/economy';
import { registerUnlockSystem } from '../../src/systems/unlocks';
import { weekSnapshot, weekSummary } from '../../src/ui/weekSummary';

beforeEach(() => { bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); });

it('preserves optional phase on save/reload and leaves a v21 legacy season unchanged forever', () => {
  createNewGame('Trials', 42);
  initLeague(getState());
  for (const phase of [1, 2, 0] as const) {
    setState({ preseason: phase });
    const s = getState();
    const back = migrateState(JSON.parse(JSON.stringify(s)));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.state).toEqual(s);
  }
  const { preseason: _phase, ...legacy } = createNewGame('Legacy', 42);
  loadState(legacy);
  initLeague(getState());
  registerFixturesSystem();
  const back = migrateState(JSON.parse(JSON.stringify(getState())));
  expect(back.ok).toBe(true);
  if (back.ok) loadState(back.state);
  advanceWeeks(27);
  expect(getState().version).toBe(SAVE_VERSION);
  expect(SAVE_VERSION).toBe(23);
  expect(getState().season).toBe(2);
  expect(getState()).not.toHaveProperty('preseason');
  expect(getState().league.fixtures.every((f) => f.round > 0)).toBe(true);
});

it('pays a small gate, leaves contracts and unlocks alone, then resumes normal contracts in round 1', () => {
  createNewGame('Trials', 42);
  initLeague(getState());
  const contracts = getState().squad.map((p) => p.contractWeeks);
  const unlocks = getState().unlocks;
  registerFixturesSystem();
  registerEconomySystem();
  registerUnlockSystem();
  // Stamp player wins without the match cost to isolate economy and unlock rules.
  registerTickHook('test-win', TICK_ORDER.match, () => {
    const s = getState();
    const f = getCurrentFixture(s, s.clubId)!;
    setState({ league: { ...s.league, fixtures: s.league.fixtures.map((x) => x === f ? { ...x, result: { homeScore: 40, awayScore: 0 } } : x) } });
  }, { trials: true });
  for (let i = 0; i < 2; i++) {
    const s = getState();
    const f = getCurrentFixture(s, s.clubId)!;
    expect(gateReceipts(s)).toBe(f.homeId === s.clubId ? Math.round(homeGate(s, { ...f, round: 1 }).receipts * 0.25) : 0);
    advanceWeeks(1);
    expect(getState().squad.map((p) => p.contractWeeks)).toEqual(contracts);
    expect(getState().unlocks).toEqual(unlocks);
  }
  advanceWeeks(1);
  expect(getState().squad.map((p) => p.contractWeeks)).toEqual(contracts.map((w) => w - 1));
});

it('holds a live trial until its result lands and can reload/replay between trials', () => {
  createNewGame('Trials', 42);
  initLeague(getState());
  registerFixturesSystem();
  registerPlayerMatchSystem();
  let started: Parameters<typeof bus.emit<'match:started'>>[1] | undefined;
  bus.on('match:started', (m) => { started = m; });
  advanceWeek();
  expect(weekHeld()).toBe(true);
  expect(getState().preseason).toBe(1);
  expect(started?.fixture.round).toBe(-1);
  const result = { homeScore: 12, awayScore: 4, events: [], stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] }, weather: 'clear', momentumTimeline: [], injuries: [] } as const;
  bus.emit('match:finished', { fixture: started!.fixture, result: JSON.parse(JSON.stringify(result)) });
  expect(weekHeld()).toBe(false);
  expect(getState().preseason).toBe(2);
  const before = weekSnapshot(getState());
  const saved = JSON.parse(JSON.stringify(getState()));
  advanceWeeks(1);
  const end = getState();
  expect(weekSummary(before, weekSnapshot(end))).toMatchObject({ title: 'Pre-season trial 2', weeks: 1 });
  loadState(saved);
  advanceWeeks(1);
  expect(getState()).toEqual(end);
  expect(currentRound(end)).toBe(1);
});

it('starts two trials again after all 27 competitive weeks of a new career', () => {
  createNewGame('Trials', 42);
  initLeague(getState());
  registerFixturesSystem();
  advanceWeeks(29);
  expect(getState()).toMatchObject({ season: 2, week: 1, preseason: 1 });
  expect(getState().history).toHaveLength(1);
  expect(getState().league.fixtures.filter((f) => f.round <= 0)).toHaveLength(16);
});

it('counts trials in multi-week estimates and stamps their money separately from round 1', async () => {
  const { targetSpan } = await import('../../src/core/advanceRules');
  const { stampMovement } = await import('../../src/systems/economy');
  createNewGame('Trials', 42);
  expect(targetSpan({ kind: 'seasonEnd' }, 1, 1)).toBe(29);
  expect(targetSpan({ kind: 'finals' }, 1, 1)).toBe(26);
  expect(targetSpan({ kind: 'seasonEnd' }, 1, 2)).toBe(28);
  expect(targetSpan({ kind: 'seasonEnd' }, 1, 0)).toBe(27);
  expect(stampMovement(getState(), 'wages')).toMatchObject({ season: 1, week: -1 });
  setState({ preseason: 2 });
  expect(stampMovement(getState(), 'wages')).toMatchObject({ season: 1, week: 0 });
  setState({ preseason: 0 });
  expect(stampMovement(getState(), 'wages')).toMatchObject({ season: 1, week: 1 });
});

it('shows the seeded forecast and quarter home-gate projection during trials', async () => {
  const { forecastFor } = await import('../../src/ui/screens/fixtures');
  const { financeSummary } = await import('../../src/ui/screens/finance');
  createNewGame('Trials', 42);
  initLeague(getState());
  setState({ preseason: 2, weather: 'rain', league: { ...getState().league,
    fixtures: getState().league.fixtures.map((f) => f.round === -1 ? { ...f, result: { homeScore: 0, awayScore: 0 } } : f),
  } });
  const s = getState();
  expect(forecastFor(s)).toBe('rain');
  const home = s.league.fixtures.find((f) => f.round >= 0 && f.homeId === s.clubId)!;
  const summary = financeSummary(s);
  expect(summary.nextHome?.round).toBe(home.round);
  expect(summary.nextHome?.projectedGate).toBe(homeGate(s, home).receipts);
});


it.each([1, 2] as const)('calls up emergency juniors before trial %s with contracts through the competitive season', async (preseason) => {
  const { registerYouthSystem } = await import('../../src/systems/youth');
  const { fitSquadCount } = await import('../../src/systems/matchday');
  createNewGame('Trials', 42);
  initLeague(getState());
  const before = getState().squad;
  setState({ preseason, squad: before.map((p, i) => ({ ...p, injuredWeeks: i < 9 ? 0 : 5 })) });
  registerYouthSystem();
  let fitAtMatch = 0;
  registerTickHook('test-match-selection', TICK_ORDER.match, () => {
    fitAtMatch = fitSquadCount(getState().squad);
  }, { trials: true });
  advanceWeeks(1);
  expect(fitAtMatch).toBe(13);
  const called = getState().squad.filter((p) => !before.some((old) => old.id === p.id));
  expect(called).toHaveLength(4);
  expect(called.every((p) => p.contractWeeks === 27)).toBe(true);
});
