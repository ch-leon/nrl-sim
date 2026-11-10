import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { bus, type LiveMatchData } from '../../src/core/events';
import { getState, loadState, setState } from '../../src/core/state';
import { __setStorage, load, slotKey, setActiveSlot } from '../../src/core/save';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { runMatch } from '../../src/match/league/match';
import type { Fixture } from '../../src/core/state';
import type { TeamSheet } from '../../src/sim/events';
import type { TeamTactics } from '../../src/match/league/presets';

const wide: TeamTactics = { attack: 'expansive', defence: 'compressed' };
const tight: TeamTactics = { attack: 'grind', defence: 'slide' };
type Started = { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData };

beforeEach(() => { bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); createLegacyGame('Habits', 42); initLeague(getState()); registerPlayerMatchSystem(); });
afterEach(() => { clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear(); __setStorage(null); });

function kickOff(): Started {
  let match: Started | undefined;
  const off = bus.on('match:started', m => { match = m; });
  advanceWeek(); off();
  expect(match).toBeDefined();
  return match!;
}
function rival(m: Started): TeamTactics | undefined { return (m.home.clubId === PLAYER_ID ? m.away : m.home).tactics; }

describe('saved recent league plans', () => {
  it('refuses a v21 save without filling plan history or changing its bytes', () => {
    const { recentPlans: _, ...old } = getState();
    const raw = JSON.stringify({ ...old, version: 21 });
    const map = new Map([[slotKey(1), raw]]);
    __setStorage({ getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); } });
    setActiveSlot(1);
    expect(load()).toBeNull();
    expect(map.get(slotKey(1))).toBe(raw);
    expect(JSON.parse(raw)).not.toHaveProperty('recentPlans');
  });
  it.each(['normal', 'hard'] as const)('%s reads history but never the upcoming lineup tactics', difficulty => {
    const original = structuredClone(getState());
    const pick = (history: TeamTactics[], upcoming: TeamTactics) => {
      clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
      loadState(structuredClone(original)); registerPlayerMatchSystem();
      setState({ settings: { ...getState().settings, difficulty }, recentPlans: history, lineup: { ...getState().lineup, tactics: upcoming } });
      return rival(kickOff());
    };
    const a = pick([wide, wide, wide], wide);
    expect(pick([wide, wide, wide], tight)).toEqual(a);
    expect(pick([tight, tight, tight], tight)).not.toEqual(a);
  });
  it('records the kick-off plan once at full time, copying and trimming to three', () => {
    setState({ recentPlans: [tight, tight, tight], lineup: { ...getState().lineup, tactics: wide } });
    const m = kickOff();
    expect(getState().recentPlans).toEqual([tight, tight, tight]);
    setState({ lineup: { ...getState().lineup, tactics: tight } });
    const result = runMatch(m.home, m.away, { ...m.live });
    bus.emit('match:finished', { fixture: m.fixture, result });
    expect(getState().recentPlans).toEqual([wide, tight, tight]);
    bus.emit('match:finished', { fixture: m.fixture, result });
    expect(getState().recentPlans).toEqual([wide, tight, tight]);
  });
});
