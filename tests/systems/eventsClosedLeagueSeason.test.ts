// tests/systems/eventsClosedLeagueSeason.test.ts — the story deck waits while a
// closed League season is at the league choice (#837). A real AU career plays its
// first year, so the close, the trip offer and the books are the game's own.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preparePack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, exportRecoverySaves, flushSaveMeta, loadSlot, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { validateInput } from '../../src/core/saveValidation';
import { elapsedInterval } from '../../src/core/season';
import { createNewGame, getState, loadState, setState, type GameState } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../../src/core/time';
import { earnMoney } from '../../src/data/club';
import { cardById } from '../../src/data/events';
import { registerAllSystems } from '../../src/qa/soak';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { chooseEvent, isEligible, resolveEvent } from '../../src/systems/events';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { leagueCareerStateProblem } from '../../src/systems/leagueEntryValidation';
import { TRIP_REPAIR_NOTICE } from '../../src/systems/leagueTripRepair';
import { commitUndo } from '../../src/systems/undo';
import { advancesLeft, deadlineText, decisionChipItems, decisionViews } from '../../src/ui/decisions';

const slot = 2;
const saveKey = DEV_TEST_PREFIX + slotKey(slot);
const leagueId = AU_CAREER_PROFILE.startingDivisionId;

function storage() {
  const bytes = new Map<string, string>();
  const store = {
    getItem: vi.fn((key: string) => bytes.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { bytes.set(key, value); }),
    removeItem: vi.fn((key: string) => { bytes.delete(key); }),
  };
  setCareerNamespace(DEV_TEST_PREFIX);
  __setStorage(store);
  vi.stubGlobal('localStorage', store);
  setActiveSlot(slot);
  return bytes;
}

function preview() {
  const result = previewLeagueEntry(getState(), leagueId);
  if (!result.ok) throw new Error(result.message);
  return result.preview;
}

/** Confirm next season's league through the game's own commit path. */
function confirmNextLeague(): GameState {
  const result = confirmLeagueEntry(preview());
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

/** Play a real first League season to its close: the trip is offered there. */
async function closedSeason(): Promise<{ bytes: Map<string, string>; closed: GameState }> {
  const bytes = storage();
  createNewGame('Closed season', 573);
  await preparePack('au');
  const state = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573, undefined, { enterOpenCup: false });
  const c = state.competitions!;
  setState({ competitions: { ...c, leagueCareer: {
    version: 1, scheduleSeed: 573, clubId: state.clubId, phase: 'initial-choice',
    access: [{ leagueId }],
    initialFields: Object.fromEntries(c.world!.divisions.map(d =>
      [d.id, c.instances.find(i => i.id === d.instanceId)!.entrantIds.slice()])),
  } } });
  confirmNextLeague();
  registerAllSystems();
  const intervals = getState().competitions!.calendar!.slots.length;
  withFastForward(() => { for (let i = 0; i < intervals; i++) advanceWeek(); });
  const closed = getState();
  expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
  expect(closed.eventDeck.pending.some(p => p.cardId === 'baliTrip')).toBe(true);
  expect(validateInput(closed as unknown as Record<string, unknown>, closed.version)).toBeNull();
  return { bytes, closed };
}

const trip = (s: GameState) => s.eventDeck.pending.find(p => p.cardId === 'baliTrip')!;
const valid = (s: GameState) => validateInput(s as unknown as Record<string, unknown>, s.version);
/** The first season's review, frozen at its close. */
const closedReview = (s: GameState) => s.history.find(h => h.season === 1)!.review!;

/** The closed state with a deck seed whose "Let them go" has the incident. */
function withIncident(closed: GameState): GameState {
  for (let seed = 1; seed < 200; seed++) {
    const s = structuredClone(closed);
    s.eventDeck.rng = seed;
    const r = resolveEvent(s, trip(s).id, 0, elapsedInterval(s))!;
    if (r.state.eventDeck.flags.includes('baliIncident')) return s;
  }
  throw new Error('no incident seed');
}

/** Round-trip through the save slot. */
function reload(bytes: Map<string, string>, s: GameState) {
  expect(saveIfChanged(s)).toBe(true);
  expect(bytes.get(saveKey)).toBe(JSON.stringify(s));
  return loadSlot(slot);
}

afterEach(() => {
  flushSaveMeta();
  clearHeldWeek();
  clearTickHooks();
  clearSeasonHooks();
  commitUndo();
  __unlockSaves();
  __setStorage(null);
  setActiveSlot(1);
  setCareerNamespace(null);
  bus.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the deck at the League choice (#837)', () => {
  it('holds the trip until next season, where an incident books to the new year and the save reloads', async () => {
    const { bytes, closed } = await closedSeason();
    const seeded = withIncident(closed);
    loadState(seeded);
    const review = structuredClone(closedReview(seeded));

    // At the choice the card is shown as waiting and cannot be answered.
    const view = decisionViews(getState()).find(v => v.id === trip(seeded).id)!;
    expect(view.waiting).toBe(true);
    expect(deadlineText(view)).toBe(`Confirm next season's league, then answer before you advance, or it's "Ban the trip".`);
    expect(decisionChipItems(getState()).find(i => i.title === view.title)?.note).toBe('after the league choice');
    expect(chooseEvent(trip(seeded).id, 0)).toBe(false);
    expect(getState()).toBe(seeded);
    expect(valid(getState())).toBeNull();

    // The league choice goes through with the trip pending.
    const started = confirmNextLeague();
    expect(started).toMatchObject({ season: 2, week: 1 });
    expect(trip(started).expiresAt).toBe(trip(seeded).expiresAt);
    expect(advancesLeft(trip(started), started)).toBe(1);
    expect(decisionViews(started).find(v => v.id === trip(seeded).id)?.waiting).toBeUndefined();

    // Answered in the new season: the incident lands there, the closed review stays as it was.
    const before = getState();
    const books = before.finance.find(f => f.season === 2)!.events;
    expect(chooseEvent(trip(seeded).id, 0)).toBe(true);
    const after = getState();
    expect(after.eventDeck.flags).toContain('baliIncident');
    expect(after.eventDeck.pending.some(p => p.cardId === 'baliTrip')).toBe(false);
    expect(after.money).toBe(before.money - 2_500);
    expect(after.boardPatience).toBe(before.boardPatience - 1);
    expect(after.reputation).toBe(before.reputation - 2);
    expect(after.finance.find(f => f.season === 2)!.events).toBe(books - 2_500);
    expect(closedReview(after).board).toEqual(review.board);
    expect(closedReview(after).money).toEqual(review.money);
    expect(closedReview(after).reputation).toEqual(review.reputation);
    expect(valid(after)).toBeNull();
    expect(leagueCareerStateProblem(after)).toBeNull();

    const loaded = reload(bytes, after);
    expect(loaded).toMatchObject({ status: 'ok', outcome: 'valid', repairs: [] });
    expect(loaded.status === 'ok' && loaded.state).toEqual(after);

    // The hangover can follow in the new year.
    expect(isEligible(cardById('baliHangover')!, after, elapsedInterval(after))).toBe(true);
  }, 60000);

  it('takes defaults that fell due at the choice on the first advance of the new season', async () => {
    const { bytes, closed } = await closedSeason();
    const now = elapsedInterval(closed);
    // A card already due at the close, whose default costs board patience and reputation.
    setState({ eventDeck: { ...closed.eventDeck, pending: [...closed.eventDeck.pending,
      { id: 'hangover-due', cardId: 'baliHangover', season: closed.season, week: closed.week, expiresAt: now }] } });
    const waiting = getState();
    const review = structuredClone(closedReview(waiting));

    // Time cannot pass at the choice, so nothing expires against the closed season.
    advanceWeek();
    expect(getState()).toBe(waiting);
    expect(valid(waiting)).toBeNull();
    const atChoice = reload(bytes, waiting);
    expect(atChoice).toMatchObject({ status: 'ok', outcome: 'valid' });
    expect(atChoice.status === 'ok' && atChoice.state).toEqual(waiting);

    const started = confirmNextLeague();
    expect(started.eventDeck.pending.map(p => p.id)).toEqual(waiting.eventDeck.pending.map(p => p.id));
    const notices: string[] = [];
    bus.on('ui:notify', ({ text }) => notices.push(text));
    withFastForward(() => advanceWeek());
    const played = getState();
    expect(played.week).toBe(2);
    expect(played.eventDeck.pending.some(p => p.id === 'hangover-due' || p.cardId === 'baliTrip')).toBe(false);
    // Ban the trip and Ride it out are the defaults; the board's patience drops in the new season.
    expect(notices.some(t => t.includes('The trip is off.'))).toBe(true);
    expect(notices.some(t => t.includes('The club rode it out.'))).toBe(true);
    expect(played.boardPatience).toBe(started.boardPatience - 1);
    expect(closedReview(played).board).toEqual(review.board);
    expect(closedReview(played).money).toEqual(review.money);
    expect(valid(played)).toBeNull();
    const loaded = reload(bytes, played);
    expect(loaded).toMatchObject({ status: 'ok', outcome: 'valid', repairs: [] });
  }, 60000);

  it('repairs a save stuck by a trip incident answered at the choice, and nothing else', async () => {
    const { bytes, closed } = await closedSeason();
    loadState(withIncident(closed));
    // The pre-fix answer, as chooseEvent committed it: state, then money through the books.
    const r = resolveEvent(getState(), trip(getState()).id, 0, elapsedInterval(getState()))!;
    setState({ squad: r.state.squad, reputation: r.state.reputation, boardPatience: r.state.boardPatience, eventDeck: r.state.eventDeck });
    for (const m of r.money) earnMoney(m.amount, m.reason);
    const stuck = getState();
    expect(stuck.boardPatience).toBe(closed.boardPatience - 1);
    expect(valid(stuck)).toBe('Invalid save data: league career frozen board.');
    const raw = JSON.stringify(stuck);

    // Off by more than the trip, or without its incident flag: still refused.
    bytes.set(saveKey, JSON.stringify({ ...stuck, boardPatience: stuck.boardPatience - 1 }));
    expect(loadSlot(slot)).toMatchObject({ status: 'corrupt' });
    bytes.set(saveKey, JSON.stringify({ ...stuck, eventDeck: { ...stuck.eventDeck, flags: stuck.eventDeck.flags.filter(f => f !== 'baliIncident') } }));
    expect(loadSlot(slot)).toMatchObject({ status: 'corrupt' });

    bytes.set(saveKey, raw);
    const loaded = loadSlot(slot);
    expect(loaded).toMatchObject({ status: 'ok', outcome: 'repaired', repairs: [{ notification: TRIP_REPAIR_NOTICE }] });
    if (loaded.status !== 'ok') throw new Error('not loaded');
    expect(exportRecoverySaves(slot)).toContain(raw);
    const repaired = loaded.state;
    expect(closedReview(repaired).board!.patience).toBe(stuck.boardPatience);
    expect({ ...repaired, history: stuck.history }).toEqual(stuck);
    expect(valid(repaired)).toBeNull();

    // The repaired career chooses its league and plays on.
    loadState(repaired);
    expect(confirmNextLeague()).toMatchObject({ season: 2, week: 1 });
    expect(reload(bytes, getState())).toMatchObject({ status: 'ok', outcome: 'valid' });
  }, 60000);
});
