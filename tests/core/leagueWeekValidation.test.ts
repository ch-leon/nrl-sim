import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, loadState, type GameState } from '../../src/core/state';
import { __setStorage, __unlockSaves } from '../../src/core/save';
import { bus, type Events } from '../../src/core/events';
import { selectPack } from '../../src/content';
import { setCareerNamespace } from '../../src/core/storage/local';
import { acceptLeagueEntry, previewLeagueEntry } from '../../src/systems/leagueEntry';
import { currentCalendarFixtures, finaliseCalendarFixture, finaliseCalendarRound, fixtureBridge, structuralAdvanceProblem, type RoundResult } from '../../src/systems/competitionCalendar';
import { registerAllSystems } from '../../src/qa/soak';
import * as time from '../../src/core/time';
import * as saveValidation from '../../src/core/saveValidation';
import { leagueSlotState } from '../helpers/leagueSlot';

// #739: a League week walked the whole save once per guard and once per fixture
// result (19 passes in an interactive week). These pin the count and the guards.

async function activeLeague(): Promise<GameState> {
  const s = await leagueSlotState();
  const p = previewLeagueEntry(s, s.competitions!.leagueCareer!.access[0]!.leagueId); if (!p.ok) throw new Error(p.message);
  const a = acceptLeagueEntry(s, p.preview); if (!a.ok) throw new Error(a.message);
  return a.state;
}

/** One interactive week: PLAY WEEK, then the player's match lands. */
function playWeek(): void {
  let match: Events['match:started'] | undefined;
  const off = bus.on('match:started', m => { match = m; });
  time.advanceWeek(); off();
  if (!match) return;
  const home = match.fixture.homeId === getState().clubId;
  bus.emit('match:finished', { fixture: match.fixture, result: { homeScore: home ? 24 : 0, awayScore: home ? 0 : 24, events: [], injuries: [],
    stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] }, weather: 'clear', momentumTimeline: [] } });
}

/** This week's rival-v-rival results, as the cheap sim would hand them to the round. */
function rivalRound(state: GameState): RoundResult[] {
  return currentCalendarFixtures(state).map(fixtureBridge)
    .filter(f => f.homeId !== state.clubId && f.awayId !== state.clubId)
    .map((bridge, i) => ({ bridge, score: { homeScore: 10 + i, awayScore: 4 } }));
}

const oneByOne = (state: GameState, results: readonly RoundResult[]): GameState =>
  results.reduce((s, r) => finaliseCalendarFixture(s, r.bridge, r.score), state);

beforeEach(() => {
  const bytes = new Map<string, string>();
  const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
  __setStorage(storage); __unlockSaves(); vi.stubGlobal('localStorage', storage); bus.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { __setStorage(null); bus.clear(); time.clearHeldWeek(); time.clearTickHooks(); time.clearSeasonHooks(); setCareerNamespace(null); selectPack('au'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('whole-save validation in a League week (#739)', () => {
  it('walks the whole save 7 times in an interactive week with a full rival round, not once per result', async () => {
    loadState(await activeLeague()); registerAllSystems();
    const week = getState().week;
    expect(rivalRound(getState()).length).toBeGreaterThan(2);
    const walks = vi.spyOn(saveValidation, 'validateInput');
    playWeek();
    expect(getState().week).toBe(week + 1);
    // The advance, the round before and after, the player's result and its
    // release, the week's settlement and its end. Admission was paid on entry.
    expect(walks).toHaveBeenCalledTimes(7);
  });

  it('walks each state once from the league chooser to the first advance', async () => {
    const opening = await leagueSlotState();
    const walks = vi.spyOn(saveValidation, 'validateInput');
    const previews = opening.competitions!.world!.divisions.map(d => previewLeagueEntry(opening, d.id));
    expect(previews.length).toBeGreaterThan(1);
    expect(walks).toHaveBeenCalledTimes(1);
    const chosen = previews.find(p => p.ok && p.preview.eligible); if (!chosen?.ok) throw new Error('no eligible league');
    const accepted = acceptLeagueEntry(opening, chosen.preview); if (!accepted.ok) throw new Error(accepted.message);
    expect(walks).toHaveBeenCalledTimes(2);
    loadState(accepted.state);
    expect(structuralAdvanceProblem(getState())).toBeNull();
    expect(walks).toHaveBeenCalledTimes(3);
  });

  it('walks one state once for the same running evidence', async () => {
    const state = await activeLeague(); loadState(state);
    expect(structuralAdvanceProblem(state)).toBeNull();
    const walks = vi.spyOn(saveValidation, 'validateInput');
    expect(structuralAdvanceProblem(state)).toBeNull();
    expect(structuralAdvanceProblem(state)).toBeNull();
    expect(walks).not.toHaveBeenCalled();
    expect(structuralAdvanceProblem({ ...state })).toBeNull();
    expect(walks).toHaveBeenCalledTimes(1);
  });

  it('checks the whole save before and after a round, whatever its size, and lands the same results', async () => {
    const state = await activeLeague(); loadState(state);
    const results = rivalRound(state);
    const expected = oneByOne({ ...state }, results);
    const walks = vi.spyOn(saveValidation, 'validateInput');
    const round = finaliseCalendarRound(state, results);
    expect(walks).toHaveBeenCalledTimes(2);
    expect(round).not.toBe(state);
    expect(round).toEqual(expected);
  });

  it('refuses a round on an invalid League career, as it refuses a single result', async () => {
    const valid = await activeLeague(); loadState(valid);
    const invalid = { ...valid, money: Number.NaN };
    const results = rivalRound(valid);
    // Admitted once, so the refusal comes from the whole-save pass, not admission.
    expect(structuralAdvanceProblem(valid)).toBeNull();
    expect(structuralAdvanceProblem(invalid)).toMatch(/invalid or unsupported/);
    expect(finaliseCalendarFixture(invalid, results[0]!.bridge, results[0]!.score)).toBe(invalid);
    expect(finaliseCalendarRound(invalid, results)).toBe(invalid);
  });

  it('replays a round that ends invalid result by result, so it stops where a single result would', async () => {
    const source = await activeLeague(); loadState(source);
    const results = rivalRound(source);
    const real = saveValidation.validateInput;
    // Only the round's source passes: every state after the first result is invalid.
    vi.spyOn(saveValidation, 'validateInput').mockImplementation((v, ...rest) => v === source ? real(v, ...rest) : 'Invalid save data: test.');
    const round = finaliseCalendarRound(source, results);
    const done = (s: GameState) => s.competitions!.instances.flatMap(i => i.fixtures).filter(f => f.status === 'completed').length;
    expect(done(round)).toBe(done(source) + 1);
    expect(round).toEqual(oneByOne(source, results));
  });
});
