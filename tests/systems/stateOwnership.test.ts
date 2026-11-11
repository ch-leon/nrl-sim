import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, emptyFinance, getState, setMatchSettings, setState } from '../../src/core/state';
import * as saves from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, resumeWeek, weekHeld } from '../../src/core/time';
import { changeKit } from '../../src/systems/rename';
import { defaultKitDesign } from '../../src/art/match/kit';
import { FACILITY_CATALOG, upgradeCost } from '../../src/data/facility';
import { autoPick, autoPickKeepingPlan, commitLineup, placeAt, setCaptain, setKicker, setRotation, setTactics, swapSpots } from '../../src/systems/lineup';
import { takePlay } from '../../src/systems/playbook';
import { recordMatchAward, registerSeasonReview, snapshotBeforeRollover, buildSeasonReview } from '../../src/systems/stats';
import { registerFinanceSystem } from '../../src/systems/economy';
import { commitUndo, currentOffer, offerBuild, signWithUndo, undoNow } from '../../src/systems/undo';
import { openAllUnlocks } from '../../src/systems/unlocks';
import { upgradeFacility } from '../../src/world/placement';
import type { MatchResult } from '../../src/sim/events';
import { WEEKS_PER_SEASON } from '../../src/config';

let store: Map<string, string>;
let payloadWrites: string[];
let saveSpy: MockInstance<typeof saves.save>;
let changed: ReturnType<typeof vi.fn>;
let notify: ReturnType<typeof vi.fn>;
let movement: ReturnType<typeof vi.fn>;

beforeEach(() => {
  bus.clear(); clearTickHooks(); clearSeasonHooks(); clearHeldWeek(); commitUndo();
  saves.__unlockSaves(); setCareerNamespace(null); saves.setActiveSlot(1);
  store = new Map(); payloadWrites = [];
  saves.__setStorage({
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); if (key.endsWith('nrl-sim-save-slot-1')) payloadWrites.push(key); },
    removeItem: (key) => { store.delete(key); },
  });
  createNewGame('Ownership FC', 526);
  setState({ preseason: 0, money: 500_000, finance: [emptyFinance(1)] });
  saveSpy = vi.spyOn(saves, 'save');
  changed = vi.fn(); notify = vi.fn(); movement = vi.fn();
  bus.on('state:changed', changed); bus.on('ui:notify', notify); bus.on('money:changed', movement);
});

afterEach(() => {
  saves.__flushSaveMeta(); saves.__setStorage(null); saves.__unlockSaves();
  setCareerNamespace(null); clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
  commitUndo(); bus.clear(); vi.restoreAllMocks();
});

describe('lineup edits through their shared commit', () => {
  const edits = {
    kicker: () => setKicker(getState().lineup, getState().squad[0]!.id),
    captain: () => setCaptain(getState().lineup, getState().squad[0]!.id),
    tactics: () => setTactics(getState().lineup, { attack: 'expansive' }),
    rotation: () => setRotation(getState().lineup, 'heavy'),
    swap: () => swapSpots(getState().lineup, { kind: 'starter', slot: 0 }, { kind: 'starter', slot: 1 }),
    placement: () => placeAt(getState().lineup, { kind: 'starter', slot: 0 }, getState().squad[getState().squad.length - 1]!.id),
    auto: () => autoPickKeepingPlan(getState().squad, getState().lineup),
  };
  it.each(Object.keys(edits) as (keyof typeof edits)[])('%s applies the pure result and saves once, without money, toast or Undo', (kind) => {
    const before = structuredClone(getState());
    const next = edits[kind]();
    expect(getState()).toEqual(before); // calculations remain pure
    expect(commitLineup(next)).toBe(true);
    expect(getState()).toEqual({ ...before, lineup: next });
    expect(changed).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saves.load()?.lineup).toEqual(next); expect(payloadWrites).toHaveLength(1);
    expect(movement).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
    expect(currentOffer()).toBeNull();
    expect(commitLineup(next)).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1); expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('auto pick retains rotation, tactics, roles and taken plays exactly', () => {
    const s = getState();
    const lineup = { ...s.lineup, kicker: s.squad[0]!.id, captain: s.squad[1]!.id, plays: ['block-play'] as const };
    const input = { ...lineup, plays: [...lineup.plays] };
    expect(autoPickKeepingPlan(s.squad, input)).toEqual({
      ...autoPick(s.squad, input.rotation, input.tactics), kicker: input.kicker, captain: input.captain, plays: input.plays,
    });
    expect(input).toEqual({ ...lineup, plays: [...lineup.plays] });
  });

  it('a no-change tactic or swap does not publish, save or notify', () => {
    const l = getState().lineup;
    commitLineup(setTactics(l, l.tactics!));
    commitLineup(swapSpots(l, { kind: 'starter', slot: 0 }, { kind: 'starter', slot: 0 }));
    expect(changed).not.toHaveBeenCalled(); expect(saveSpy).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
  });
});

it('play selection adds/removes once and refuses an unowned/full selection with one toast and no save', () => {
  setState({ playbook: { owned: ['block-play', 'inside-ball', 'short-side-raid', 'kick-pass'] } });
  changed.mockClear();
  const before = getState();
  takePlay('block-play');
  expect(getState()).toEqual({ ...before, lineup: { ...before.lineup, plays: ['block-play'] } });
  expect(changed).toHaveBeenCalledTimes(1); expect(saveSpy).toHaveBeenCalledTimes(1);
  takePlay('block-play');
  expect(getState().lineup.plays).toEqual([]); expect(saveSpy).toHaveBeenCalledTimes(2);
  setState({ lineup: { ...getState().lineup, plays: ['block-play', 'inside-ball', 'short-side-raid'] } });
  saveSpy.mockClear(); changed.mockClear();
  takePlay('kick-pass');
  expect(saveSpy).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledTimes(1); expect(notify).toHaveBeenCalledWith({ text: 'Three is the most. Leave one out first.', kind: 'info' });
  setState({ playbook: { owned: [] } });
  changed.mockClear(); notify.mockClear();
  takePlay('kick-pass');
  expect(changed).not.toHaveBeenCalled(); expect(saveSpy).not.toHaveBeenCalled(); expect(notify).toHaveBeenCalledTimes(1);
  expect(movement).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
});

it('an upgrade charges one finance movement, publishes once after payment, toasts once and leaves autosave/Undo ownership intact', () => {
  const facility = { id: 'upgrade-me', defId: 'trainingPaddock' as const, level: 1 as const, x: 0, y: 0 };
  setState({ facilities: [facility] });
  offerBuild(facility, FACILITY_CATALOG.trainingPaddock.cost);
  const offer = currentOffer();
  notify.mockClear(); changed.mockClear();
  registerFinanceSystem();
  const before = structuredClone(getState());
  const cost = upgradeCost(FACILITY_CATALOG.trainingPaddock, 2);
  expect(upgradeFacility(facility.id)).toBe(true);
  expect(getState()).toEqual({ ...before, money: before.money - cost,
    finance: [{ ...before.finance[0]!, facilities: -cost }], facilities: [{ ...facility, level: 2 }] });
  expect(movement).toHaveBeenCalledTimes(1);
  expect(movement.mock.calls[0]![0]).toMatchObject({ delta: -cost, reason: 'upgrade:trainingPaddock' });
  expect(changed).toHaveBeenCalledTimes(3); // money, one ledger booking, facilities
  expect(notify).toHaveBeenCalledTimes(1); expect(saveSpy).not.toHaveBeenCalled();
  expect(currentOffer()).toBe(offer); expect(offer!.canRevert(getState())).toBe(false);
  expect(undoNow()).toBe(false); // the original build cannot undo an upgraded building
});

it.each(['missing', 'max', 'funds'])('refused upgrade (%s) has no side effects', (why) => {
  setState({ money: why === 'funds' ? 0 : 500_000, facilities: why === 'missing' ? [] : [
    { id: 'f', defId: 'trainingPaddock', level: why === 'max' ? 3 : 1, x: 0, y: 0 },
  ] });
  const before = getState(); changed.mockClear();
  expect(upgradeFacility('f')).toBe(false); expect(getState()).toBe(before);
  expect(changed).not.toHaveBeenCalled(); expect(movement).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
  expect(saveSpy).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
});

it('the kit operation returns the same validated edit as a pure patch; invalid drafts return no change', () => {
  const design = defaultKitDesign(['#174d29', '#ffffff'], 'player');
  const before = getState();
  expect(changeKit(design, '#174d29')).toEqual({ kit: design });
  expect(changeKit({ ...design, trim: '#174d29' }, '#174d29')).toBeNull();
  expect(getState()).toBe(before);
  expect(changed).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
  expect(saveSpy).not.toHaveBeenCalled(); expect(movement).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
});

it('the match award is counted once without a notification/save, while rival/no-action results change nothing', () => {
  const result: Pick<MatchResult, 'homeScore' | 'awayScore' | 'events'> = {
    homeScore: 4, awayScore: 0, events: [{ kind: 'try', t: 1, teamId: 'player', player: 'Amy' }],
  };
  expect(recordMatchAward(result, 'player', 'rival')?.name).toBe('Amy');
  expect(getState().potmTally).toEqual({ season: 1, counts: { Amy: 1 } });
  expect(changed).toHaveBeenCalledTimes(1);
  recordMatchAward({ ...result, events: [] }, 'player', 'rival');
  recordMatchAward({ ...result, events: [{ ...result.events[0]!, teamId: 'rival' }] }, 'rival', 'player');
  expect(changed).toHaveBeenCalledTimes(1); expect(notify).not.toHaveBeenCalled(); expect(saveSpy).not.toHaveBeenCalled();
  expect(movement).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
});

it('season review hooks stamp the completed record once at the same order, using the unchanged pure builder', () => {
  setState({ week: WEEKS_PER_SEASON, history: [{ season: 1, ladderPosition: 4, premiership: false }] });
  const before = snapshotBeforeRollover(getState());
  const reviewWrites = vi.fn();
  let history = getState().history;
  bus.on('state:changed', (s) => { if (s.history !== history) { reviewWrites(); history = s.history; } });
  registerSeasonReview(); registerSeasonReview(); // named hooks replace instead of duplicating
  advanceWeek();
  expect(getState().history[0]!.review).toEqual(buildSeasonReview(before, getState()));
  expect(reviewWrites).toHaveBeenCalledTimes(1);
  expect(saveSpy).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled(); expect(movement).not.toHaveBeenCalled();
});

it('match settings and unlock opt-out preserve unrelated state, without duplicate effects or a hidden save', () => {
  const before = getState();
  setMatchSettings({ coachCalls: false, liveRivals: true });
  expect(getState()).toEqual({ ...before, settings: { ...before.settings, coachCalls: false, liveRivals: true } });
  openAllUnlocks();
  expect(getState().unlocks).toBeUndefined();
  expect(changed).toHaveBeenCalledTimes(2); expect(saveSpy).not.toHaveBeenCalled();
  expect(movement).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled(); expect(currentOffer()).toBeNull();
});

it('coach edits keep the signing Undo snapshot and reverse its fee once without replacing later choices', () => {
  registerFinanceSystem();
  const before = getState(); const snapshot = structuredClone(before.lineup);
  const agent = before.freeAgents[0]!;
  expect(signWithUndo(agent.id).ok).toBe(true);
  const offer = currentOffer();
  expect(offer?.kind).toBe('sign');
  const next = setCaptain(getState().lineup, before.squad[0]!.id);
  commitLineup(next);
  expect(currentOffer()).toBe(offer); expect(before.lineup).toEqual(snapshot);
  expect(undoNow()).toBe(true); expect(undoNow()).toBe(false);
  expect(getState().money).toBe(before.money);
  expect(getState().finance).toEqual(before.finance);
  expect(getState().freeAgents).toEqual(before.freeAgents);
  expect(getState().squad).toEqual(before.squad);
  expect(getState().lineup).toBe(next);
  expect(movement).toHaveBeenCalledTimes(2); // fee and the reversing movement
  expect(notify).toHaveBeenCalledTimes(1); // the original signing Undo offer
  expect(saveSpy).toHaveBeenCalledTimes(1); // only the coach edit saves immediately
});

describe.each(['lineup', 'play', 'settings'] as const)('%s edits retain the existing persistence guards', (operation) => {
  beforeEach(() => setState({ playbook: { owned: ['block-play'] } }));
  const edit = (): void => {
    if (operation === 'lineup') commitLineup(setCaptain(getState().lineup, getState().squad[0]!.id));
    else if (operation === 'play') takePlay('block-play');
    else { setMatchSettings({ coachCalls: false, liveRivals: true }); saves.save(getState()); }
  };
  it('refuses a held week until it settles', () => {
    saves.save(getState()); const original = store.get(saves.slotKey(1));
    registerTickHook('hold', 0, (ctx) => ctx.hold?.()); advanceWeek();
    expect(weekHeld()).toBe(true);
    edit();
    expect(store.get(saves.slotKey(1))).toBe(original);
    resumeWeek(); saves.save(getState());
    expect(saves.load()?.lineup).toEqual(getState().lineup);
    expect(saves.load()?.settings).toEqual(getState().settings);
  });

  it('cannot overwrite an import into the active slot', () => {
    saves.save(getState());
    expect(saves.importIntoSlot(saves.exportSave({ ...getState(), clubName: 'Imported FC' }), 1)).not.toBeNull();
    const imported = store.get(saves.slotKey(1));
    edit();
    expect(store.get(saves.slotKey(1))).toBe(imported);
  });

  it('cannot write after the developer-career transition locks saves', () => {
    saves.save(getState()); saves.__flushSaveMeta(); const before = new Map(store);
    saves.lockSaves();
    edit(); saves.__flushSaveMeta();
    expect(store).toEqual(before);
  });

  it('writes a developer career only in its own namespace', () => {
    saves.save(getState()); saves.__flushSaveMeta(); const normal = new Map(store);
    setCareerNamespace(DEV_TEST_PREFIX); saves.setActiveSlot(1); payloadWrites = [];
    edit(); saves.__flushSaveMeta();
    for (const [key, value] of normal) expect(store.get(key)).toBe(value);
    expect(saves.load()?.lineup).toEqual(getState().lineup);
    expect(saves.load()?.settings).toEqual(getState().settings);
    expect(payloadWrites).toHaveLength(1); expect(payloadWrites[0]).toMatch(new RegExp(`^${DEV_TEST_PREFIX}`));
  });
});
