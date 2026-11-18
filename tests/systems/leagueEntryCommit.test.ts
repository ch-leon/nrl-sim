import { afterEach, describe, expect, it, vi } from 'vitest';
import { preparePack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, flushSaveMeta, lockSaves, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { createNewGame, getState, setState, stateInstallation } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem, registerTickHook, weekHeld, withFastForward } from '../../src/core/time';
import { registerAllSystems } from '../../src/qa/soak';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import * as leagueEntry from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { readLiveMatch, writeLiveMatch } from '../../src/systems/liveMatchRecord';
import { commitUndo, currentOffer, offerUndo } from '../../src/systems/undo';

const slot = 2;
const saveKey = DEV_TEST_PREFIX + slotKey(slot);
const matchKey = DEV_TEST_PREFIX + liveMatchKey(slot);
const selection = { leagueId: AU_CAREER_PROFILE.startingDivisionId, previewKey: 'preview' };
const notice = { text: 'Annual changes complete', kind: 'info' } as const;

function storageWithCareer() {
  const bytes = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => bytes.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { bytes.set(key, value); }),
    removeItem: vi.fn((key: string) => { bytes.delete(key); }),
  };
  setCareerNamespace(DEV_TEST_PREFIX);
  __setStorage(storage);
  vi.stubGlobal('localStorage', storage);
  setActiveSlot(slot);
  createNewGame('League entry', 573);
  return { bytes, storage };
}

function sidecar(season = 1) {
  return { season, week: 1, round: 1, homeId: 'player', awayId: 'rival', seed: 574, calls: [], tick: 30 };
}

function parkSidecarAndUndo() {
  expect(writeLiveMatch(sidecar(getState().season))).toBe(true);
  const offer = {
    kind: 'build' as const, text: 'Undo available', expiresAt: Number.MAX_SAFE_INTEGER,
    canRevert: () => true, revert: vi.fn(),
  };
  offerUndo(offer);
  return offer;
}

function preview() {
  const result = leagueEntry.previewLeagueEntry(getState(), selection.leagueId);
  if (!result.ok) throw new Error(result.message);
  return result.preview;
}

async function startWaitingCareer() {
  await preparePack('au');
  const state = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573);
  const c = state.competitions!;
  setState({ competitions: { ...c, leagueCareer: {
    version: 1, scheduleSeed: 573, clubId: state.clubId, phase: 'initial-choice',
    access: [{ leagueId: AU_CAREER_PROFILE.startingDivisionId }],
    initialFields: Object.fromEntries(c.world!.divisions.map(d =>
      [d.id, c.instances.find(i => i.id === d.instanceId)!.entrantIds.slice()])),
  } } });
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

describe('League entry commit', () => {
  it('publishes one installation and its notices only after the slot is durable', () => {
    const { bytes, storage } = storageWithCareer();
    const before = getState();
    expect(saveIfChanged(before)).toBe(true);
    const epoch = stateInstallation();
    const offer = parkSidecarAndUndo();
    expect(writeLiveMatch(sidecar(), 1)).toBe(true);
    const candidate = { ...before, money: before.money + 100 };
    vi.spyOn(leagueEntry, 'acceptLeagueEntry').mockReturnValue({ ok: true, state: candidate, notices: [notice] });

    const writes: unknown[] = [];
    storage.setItem.mockImplementation((key, value) => {
      if (key === saveKey) writes.push([getState(), stateInstallation(), currentOffer(), readLiveMatch()]);
      bytes.set(key, value);
    });
    const installations: unknown[] = [];
    const notices: unknown[] = [];
    bus.on('state:changed', state => installations.push([state, bytes.get(saveKey), currentOffer(), readLiveMatch()]));
    bus.on('ui:notify', payload => notices.push([payload, getState(), bytes.get(saveKey)]));
    const seasonEnded = vi.fn();
    const moneyChanged = vi.fn();
    bus.on('season:ended', seasonEnded);
    bus.on('money:changed', moneyChanged);

    expect(confirmLeagueEntry(selection)).toEqual({ ok: true, state: candidate });
    expect(writes).toEqual([[before, epoch, offer, sidecar()]]);
    expect(installations).toEqual([[candidate, JSON.stringify(candidate), null, null]]);
    expect(stateInstallation()).toBe(epoch + 1);
    expect(bytes.get(DEV_TEST_PREFIX + liveMatchKey(1))).toBe(JSON.stringify(sidecar()));
    expect(notices).toEqual([[notice, candidate, JSON.stringify(candidate)]]);
    expect(seasonEnded).not.toHaveBeenCalled();
    expect(moneyChanged).not.toHaveBeenCalled();
  });

  it('leaves the save, live state, Undo and sidecar alone when annual processing fails', () => {
    const { bytes, storage } = storageWithCareer();
    const before = getState();
    expect(saveIfChanged(before)).toBe(true);
    const offer = parkSidecarAndUndo();
    const refusal = { ok: false, reason: 'annual-failure', message: 'Cannot enter this league' } as const;
    vi.spyOn(leagueEntry, 'acceptLeagueEntry').mockReturnValue(refusal);
    const notifications = vi.fn();
    bus.on('ui:notify', notifications);
    storage.getItem.mockClear();

    expect(confirmLeagueEntry(selection)).toEqual(refusal);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(bytes.get(saveKey)).toBe(JSON.stringify(before));
    expect(bytes.get(matchKey)).toBe(JSON.stringify(sidecar()));
    expect(getState()).toBe(before);
    expect(currentOffer()).toBe(offer);
    expect(notifications).not.toHaveBeenCalled();
  });

  it('refuses a preview after the live career changed', async () => {
    const { bytes, storage } = storageWithCareer();
    await startWaitingCareer();
    const league = preview();
    expect(saveIfChanged(getState())).toBe(true);
    const saved = bytes.get(saveKey);
    setState({ rngSeed: getState().rngSeed + 1 });
    const current = getState();
    const offer = parkSidecarAndUndo();
    const notifications = vi.fn();
    bus.on('ui:notify', notifications);
    storage.getItem.mockClear();

    expect(confirmLeagueEntry(league)).toMatchObject({ ok: false, reason: 'stale' });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(bytes.get(saveKey)).toBe(saved);
    expect(bytes.get(matchKey)).toBe(JSON.stringify(sidecar()));
    expect(getState()).toBe(current);
    expect(currentOffer()).toBe(offer);
    expect(notifications).not.toHaveBeenCalled();
  });

  it.each(['quota', 'unreadable', 'locked', 'changed'] as const)('keeps the original when the occupied slot is %s', failure => {
    const { bytes, storage } = storageWithCareer();
    const before = getState();
    expect(saveIfChanged(before)).toBe(true);
    const epoch = stateInstallation();
    const offer = parkSidecarAndUndo();
    const candidate = { ...before, money: before.money + 100 };
    vi.spyOn(leagueEntry, 'acceptLeagueEntry').mockReturnValue({ ok: true, state: candidate, notices: [notice] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notifications = vi.fn();
    bus.on('ui:notify', notifications);
    if (failure === 'quota') {
      storage.setItem.mockImplementation((key, value) => {
        if (key === saveKey) throw new Error('Quota exceeded');
        bytes.set(key, value);
      });
    } else if (failure === 'unreadable') {
      storage.getItem.mockImplementationOnce(() => { throw new Error('Slot temporarily unreadable'); });
    } else if (failure === 'locked') {
      lockSaves();
      // Another session may have saved the exact candidate even though this page cannot write.
      bytes.set(saveKey, JSON.stringify(candidate));
    } else {
      bytes.set(saveKey, '{unreadable external contents');
    }
    const original = bytes.get(saveKey);

    expect(confirmLeagueEntry(selection)).toMatchObject({ ok: false, reason: 'storage' });
    expect(bytes.get(saveKey)).toBe(original);
    expect(bytes.get(matchKey)).toBe(JSON.stringify(sidecar()));
    expect(getState()).toBe(before);
    expect(stateInstallation()).toBe(epoch);
    expect(currentOffer()).toBe(offer);
    expect(notifications).not.toHaveBeenCalledWith(notice);
  });

  it('refuses a held week before building a candidate or touching storage', () => {
    const { storage } = storageWithCareer();
    registerTickHook('hold', 40, ctx => { ctx.hold!(); }, { trials: true });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    const build = vi.spyOn(leagueEntry, 'acceptLeagueEntry');
    storage.getItem.mockClear();

    expect(confirmLeagueEntry(selection)).toMatchObject({ ok: false, reason: 'held' });
    expect(build).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('retries a refused annual save and only accepts its preview once', async () => {
    const { bytes, storage } = storageWithCareer();
    await startWaitingCareer();
    expect(confirmLeagueEntry(preview())).toMatchObject({ ok: true });
    registerAllSystems();
    const intervals = getState().competitions!.calendar!.slots.length;
    const seasonEnded = vi.fn();
    bus.on('season:ended', seasonEnded);
    withFastForward(() => { for (let i = 0; i < intervals; i++) advanceWeek(); });
    const closed = getState();
    const before = JSON.stringify(closed);
    expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
    expect(bytes.get(saveKey)).toBe(before);
    expect(seasonEnded).toHaveBeenCalledTimes(1);
    const league = preview();
    const offer = parkSidecarAndUndo();
    const write = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementation((key, value) => {
      if (key === saveKey) throw new Error('Quota exceeded');
      write(key, value);
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(confirmLeagueEntry(league)).toMatchObject({ ok: false, reason: 'storage' });
    expect(getState()).toBe(closed);
    expect(bytes.get(saveKey)).toBe(before);
    expect(bytes.get(matchKey)).toBe(JSON.stringify(sidecar(closed.season)));
    expect(currentOffer()).toBe(offer);

    storage.setItem.mockImplementation(write);
    const result = confirmLeagueEntry(league);
    expect(result).toMatchObject({ ok: true, state: { season: 2, week: 1 } });
    const active = getState();
    const accepted = JSON.stringify(active);
    expect(active.competitions!.leagueCareer!.accepted!.quote).toEqual(league.quote);
    expect(bytes.get(saveKey)).toBe(accepted);
    expect(currentOffer()).toBeNull();
    expect(readLiveMatch()).toBeNull();
    expect(confirmLeagueEntry(league)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(getState()).toBe(active);
    expect(bytes.get(saveKey)).toBe(accepted);
    expect(seasonEnded).toHaveBeenCalledTimes(1);
  }, 60000);

  it('refuses a quarantined interval before building a candidate or touching storage', async () => {
    const { storage } = storageWithCareer();
    await startWaitingCareer();
    expect(confirmLeagueEntry(preview())).toMatchObject({ ok: true });
    registerAllSystems();
    registerTickHook('invalid post-tick state', 80, () => setState({ boardLoan: { owed: 1 } }), { trials: true });
    withFastForward(() => advanceWeek());
    const problem = failedIntervalProblem();
    expect(problem).not.toBeNull();
    const build = vi.spyOn(leagueEntry, 'acceptLeagueEntry');
    storage.getItem.mockClear();

    expect(confirmLeagueEntry(selection)).toMatchObject({ ok: false, reason: 'quarantine', message: problem });
    expect(build).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
  });
});
