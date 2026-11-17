import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { createNewGame, getState, loadState, setState, type GameState, type Player } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, TICK_ORDER } from '../../src/core/time';
import { __setStorage, __unlockSaves, importIntoSlot, slotKey, writeSlot, migrateState } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { BOARD, WEEKS_PER_SEASON } from '../../src/config';
import { initLeague, getCurrentFixture, registerFixturesSystem } from '../../src/systems/fixtures';
import { signPlayer, refreshFreeAgents } from '../../src/systems/freeagency';
import { quotePlayerSale, confirmPlayerSale, applyPlayerSale, transferBetweenClubs } from '../../src/systems/playerTransfers';
import { archiveRetirees, discoveredFreeAgents, ownerOf, validatePlayerPopulation } from '../../src/systems/playerCareer';
import { registerAllSystems, runSoak } from '../../src/qa/soak';
import { renewEarly } from '../../src/systems/contracts';
import { runMatch } from '../../src/match/league/match';
import { rivalSheet } from '../../src/systems/rivalRound';
import { currentDivision, setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { finaliseCalendarFixture } from '../../src/systems/competitionCalendar';

beforeAll(async () => { await preparePack('uk'); });
beforeEach(() => { bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); selectPack('au'); });
afterEach(() => { bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); selectPack('au'); setCareerNamespace(null); __setStorage(null); });
const live = (s: GameState): Player[] => [...s.squad, ...s.freeAgents, ...s.league.clubs.flatMap(c => c.squad ?? [])];
const allIds = (s: GameState): string[] => [...live(s).map(p => p.id), ...s.playerPopulation.retired.map(p => p.id)].sort();
function roundTrip(): GameState {
  const before = getState();
  const result = migrateState(JSON.parse(JSON.stringify(before)));
  expect(result.ok, result.ok ? '' : result.message).toBe(true);
  if (!result.ok) throw Error(result.message);
  expect(result.repairs).toEqual([]);
  expect(result.state.money).toBe(before.money);
  expect(result.state.finance).toEqual(before.finance);
  expect(result.state.league.clubs.map(c => c.cash)).toEqual(before.league.clubs.map(c => c.cash));
  expect(allIds(result.state)).toEqual(allIds(before));
  expect(validatePlayerPopulation(result.state)).toBeNull();
  loadState(result.state);
  return result.state;
}

describe('player continuity through registered runtime hooks', () => {
  it.each(['au', 'uk'] as const)('keeps the %s recruit through sale, an opposing match, discovery, expiry, retirement and reload', pack => {
    createNewGame('Continuity integration', 572, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
    initLeague(getState());
    setState({ preseason: 0, money: 1_000_000 });
    registerAllSystems();
    const initial = getState();
    const first = getCurrentFixture(initial, initial.clubId)!;
    const buyerId = first.homeId === initial.clubId ? first.awayId : first.homeId;
    const prospect = discoveredFreeAgents(initial)[0]!;
    // A deliberate starting-quality prospect and funded opponent make the witness
    // independent of random AI squad selection or a lucky sale offer.
    setState({ freeAgents: initial.freeAgents.map(p => p.id === prospect.id ? { ...p, age: 24,
      stats: { speed: 85, strength: 85, stamina: 85, handling: 85, kicking: 85, footyIQ: 85 },
      ceilings: { speed: 95, strength: 95, stamina: 95, handling: 95, kicking: 95, footyIQ: 95 },
      xp: 17, level: 2, unspentPoints: 1 } : p),
      league: { ...initial.league, clubs: initial.league.clubs.map(c => !c.squad ? c : { ...c, cash: c.id === buyerId ? 1_000_000 : 0,
        squad: c.squad.map(p => ({ ...p, injuredWeeks: 0, suspendedWeeks: 0,
          ...(c.id === buyerId ? { stats: { speed: 20, strength: 20, stamina: 20, handling: 20, kicking: 20, footyIQ: 20 },
            deal: { salary: 1000, startSeason: 1, endSeason: 3 } } : {}) })) }) } });
    const ids = allIds(getState());
    expect(signPlayer(getState(), prospect.id).ok).toBe(true);
    expect(renewEarly(getState(), prospect.id).ok).toBe(true);
    const signed = structuredClone(getState().squad.find(p => p.id === prospect.id)!);
    const preview = quotePlayerSale(getState(), prospect.id);
    if (!preview.ok) throw Error(preview.message);
    expect(preview.offer.buyerId).toBe(buyerId);
    const cancelled = JSON.stringify(getState()); // Discarding a quote has no write path.
    quotePlayerSale(getState(), prospect.id);
    expect(JSON.stringify(getState())).toBe(cancelled);
    const beforeCash = getState().money;
    const buyerCash = getState().league.clubs.find(c => c.id === buyerId)!.cash!;
    expect(confirmPlayerSale(preview.offer).ok).toBe(true);
    const moved = live(getState()).find(p => p.id === prospect.id)!;
    const { clubHistory: _oldHistory, ...oldAttributes } = signed;
    const { clubHistory: _newHistory, ...newAttributes } = moved;
    expect(newAttributes).toEqual(oldAttributes);
    expect(allIds(getState())).toEqual(ids);
    expect(getState().money).toBe(beforeCash + preview.offer.fee);
    expect(getState().league.clubs.find(c => c.id === buyerId)!.cash).toBe(buyerCash - preview.offer.fee);
    const loaded = roundTrip();
    expect(ownerOf(loaded, prospect.id)).toBe(buyerId);
    expect(applyPlayerSale(loaded, preview.offer).ok).toBe(false);
    const buyer = loaded.league.clubs.find(c => c.id === buyerId)!;
    expect(rivalSheet(buyer).roster!.some(p => p.id === prospect.id)).toBe(true);
    let appeared = false;
    let finishMatch = (): void => { throw Error('The match did not start'); };
    const stop = bus.on('match:started', ({ fixture, home, away, live: options }) => {
      const opposing = home.clubId === buyerId ? home : away;
      appeared = opposing.roster!.some(p => p.id === prospect.id);
      const result = runMatch(home, away, { seed: options.seed, weather: options.weather });
      finishMatch = () => bus.emit('match:finished', { fixture, result });
    });
    advanceWeek();
    expect(appeared).toBe(true);
    finishMatch(); stop();
    expect(getState().league.fixtures.find(f => f.round === first.round && f.homeId === first.homeId && f.awayId === first.awayId)?.result).toBeDefined();
    const beforeRefresh = allIds(getState());
    const oldRng = getState().rngSeed;
    for (let i = 0; i < 100; i++) setState(refreshFreeAgents(getState()));
    expect(allIds(getState())).toEqual(beforeRefresh);
    expect(getState().rngSeed).toBe(oldRng);
    roundTrip();

    // End-of-year witness uses the real ordered hooks: expiry precedes age,
    // while a queued renewal keeps its existing club spell.
    const s = getState();
    const expiry = s.squad[0]!, renewal = s.squad[1]!, retiree = s.freeAgents[0]!;
    setState({ week: WEEKS_PER_SEASON, squad: s.squad.map(p => p.id === expiry.id ? { ...p, age: 24, deal: { salary: 1000, startSeason: 1, endSeason: 1 } }
      : p.id === renewal.id ? { ...p, age: 24, deal: { salary: 1000, startSeason: 1, endSeason: 1, renewal: { salary: 1000, startSeason: 2, endSeason: 2 } } } : p),
      freeAgents: s.freeAgents.map(p => p.id === retiree.id ? { ...p, age: 37 } : p) });
    const beforeRolloverIds = allIds(getState());
    const continuous = structuredClone(getState().squad.find(p => p.id === renewal.id)!.clubHistory);
    advanceWeeks(1);
    expect(getState().season).toBe(2);
    const agedExpired = live(getState()).find(p => p.id === expiry.id)!;
    expect(agedExpired.age).toBe(25);
    expect(agedExpired.clubHistory!.spells.some(spell => spell.clubId === s.clubId && spell.departure === 'expiry')).toBe(true);
    expect(getState().squad.find(p => p.id === renewal.id)!.clubHistory).toEqual(continuous);
    expect(getState().playerPopulation.retired.find(p => p.id === retiree.id)?.age).toBe(38);
    expect(beforeRolloverIds.every(id => allIds(getState()).includes(id))).toBe(true);
    expect(new Set(allIds(getState())).size).toBe(allIds(getState()).length);
    expect(getState().competitions?.calendar?.mode).not.toBe('structural');
    roundTrip();
  }, 30_000);

  it('measures five full runtime seasons with controlled board objectives and no lost identities', () => {
    const boundaries: { season: number; live: number; retired: number; births: number; bytes: number }[] = [];
    createNewGame('Population cohort', 2026); initLeague(getState());
    let knownIds = allIds(getState());
    for (let year = 1; year <= 5; year++) {
      // Isolate persistence from the board's separate dismissal policy. Every
      // economy, match, market, Academy and lifecycle hook still runs normally.
      const fromSave = { ...getState(), objectives: [], boardPatience: BOARD.MAX_PATIENCE };
      const result = runSoak({ seed: 2026, seasons: 1, mode: 'managed', fromSave });
      expect(result.problems).toEqual([]);
      expect(result.seasons).toHaveLength(1);
      const s = getState();
      const ids = allIds(s);
      expect(knownIds.every(id => ids.includes(id))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
      expect(validatePlayerPopulation(s)).toBeNull();
      const born = ids.filter(id => !knownIds.includes(id));
      expect(born.every(id => id.startsWith('career-person:'))).toBe(true);
      expect(born.length).toBe(s.playerPopulation.nextPlayerOrdinal - 1 - (boundaries[boundaries.length - 1]?.births ?? 0));
      boundaries.push({ season: s.season, live: live(s).length, retired: s.playerPopulation.retired.length,
        births: s.playerPopulation.nextPlayerOrdinal - 1, bytes: new TextEncoder().encode(JSON.stringify(s)).length });
      knownIds = ids;
      roundTrip();
    }
    console.info('Continuity five-season full-hook controlled cohort:', JSON.stringify(boundaries));
  }, 90_000);
});

it('moves a person across divisions without copying rosters or enabling the next structural season', () => {
  setCareerNamespace(DEV_TEST_PREFIX);
  createNewGame('Cross-division continuity', 572);
  const s = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 572);
  const playerDivision = currentDivision(s)!.division.id;
  const buyer = s.league.clubs.find(c => c.squad && currentDivision(s, c.id)!.division.id !== playerDivision)!;
  const buyerDivision = currentDivision(s, buyer.id)!.division.id;
  const p = s.squad[0]!;
  // Test the shared pure transaction with named clubs, leaving ordinary sale
  // preference policy to its unit suite.
  const funded = { ...s, league: { ...s.league, clubs: s.league.clubs.map(c => c.id !== buyer.id ? c : { ...c, cash: 1_000_000,
    squad: c.squad!.map(x => ({ ...x, deal: { salary: 1000, startSeason: 1, endSeason: 3 } })) }) } };
  const ids = allIds(funded);
  const result = transferBetweenClubs(funded, s.clubId, buyer.id, p.id, 1000);
  if (!result.ok) throw Error(result.message);
  setState(result.state);
  expect(ownerOf(getState(), p.id)).toBe(buyer.id);
  expect(allIds(getState())).toEqual(ids);
  expect(currentDivision(getState())!.division.id).toBe(playerDivision);
  expect(currentDivision(getState(), buyer.id)!.division.id).toBe(buyerDivision);
  expect(getState().competitions).toEqual(s.competitions);
  roundTrip();
  registerFixturesSystem();
  registerTickHook('integration-player-result', TICK_ORDER.match, () => {
    const current = getState(), f = getCurrentFixture(current, current.clubId);
    if (f) setState(finaliseCalendarFixture(current, f, { homeScore: 12, awayScore: 0 }));
  }, { trials: true });
  advanceWeeks(25);
  expect(getState().season).toBe(2);
  expect(getState().competitions!.calendar!.status).toBe('awaiting-next-season');
  expect(ownerOf(getState(), p.id)).toBe(buyer.id);
  expect(allIds(getState())).toEqual(ids);
  const stopped = JSON.stringify(getState());
  advanceWeeks(3);
  expect(JSON.stringify(getState())).toBe(stopped);
  roundTrip();
});


it('rejects duplicate ownership and live/retired collisions without replacing an occupied career', () => {
  const bytes = new Map<string, string>();
  __setStorage({ getItem: key => bytes.get(key) ?? null, setItem: (key, value) => { bytes.set(key, value); }, removeItem: key => { bytes.delete(key); } });
  __unlockSaves();
  createNewGame('Occupied', 572); initLeague(getState());
  const original = getState();
  expect(writeSlot(1, original)).toBe(true);
  const originalBytes = bytes.get(slotKey(1));
  const duplicate = structuredClone(original);
  duplicate.freeAgents.push(duplicate.squad[0]!);
  const archived = archiveRetirees({ ...original, squad: original.squad.slice(1) }, [original.squad[0]!], original);
  const collision = { ...archived, squad: original.squad };
  for (const malformed of [duplicate, collision]) {
    expect(importIntoSlot(JSON.stringify(malformed), 1)).toBeNull();
    expect(bytes.get(slotKey(1))).toBe(originalBytes);
    expect(getState()).toBe(original);
  }
});
