import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { bus, type Events } from '../../src/core/events';
import { getState, setState } from '../../src/core/state';
import { __setStorage, __unlockSaves, exportSave, installImportedSave, load, save, setActiveSlot } from '../../src/core/save';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, advanceWeek, registerTickHook, weekHeld } from '../../src/core/time';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey } from '../../src/core/storageKeys';
import { initLeague } from '../../src/systems/fixtures';
import { registerEconomySystem } from '../../src/systems/economy';
import { registerTrainingSystem } from '../../src/systems/training';
import { MATCH_RESTARTED_TEXT, registerPlayerMatchSystem, resumePlayerMatch } from '../../src/systems/matchday';
import { isLiveMatchRecord, liveMatchSameRules, peelLiveMatchExport, readLiveMatch, writeLiveMatch } from '../../src/systems/liveMatchRecord';
import { isMatchEngineIdentity, matchEngineIdentity } from '../../src/systems/matchEngineIdentity';
import { activePack, preparePack, selectPack } from '../../src/content';
import { NINES } from '../../src/match/league/rules';
import { runMatch } from '../../src/match/league/match';

let bytes: Map<string, string>;
let starts: Events['match:started'][];
let notes: string[];
function listen(): void {
  bus.clear();
  bus.on('match:started', event => starts.push(event));
  bus.on('ui:notify', ({ text }) => notes.push(text));
}
beforeEach(() => {
  bytes = new Map();
  const storage = { getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  __setStorage(storage);
  __unlockSaves();
  setCareerNamespace(null);
  setActiveSlot(1);
  clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
  starts = []; notes = []; listen();
  createLegacyGame('Recovery', 524);
  initLeague(getState());
  registerTrainingSystem(); registerEconomySystem(); registerPlayerMatchSystem();
});
afterEach(() => {
  bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks();
  setCareerNamespace(null); selectPack('au'); __setStorage(null); __unlockSaves();
  Reflect.deleteProperty(globalThis, 'localStorage');
});

const badIds = [undefined, 'bad identity', 'nrl-live-999-00000000000000'] as const;
describe.each([null, DEV_TEST_PREFIX])('recovery namespace %s', namespace => {
  it.each(badIds)('restarts only this fixture on reload with identity %s, preserving once-only effects', engineId => {
    // The other namespace and another slot must remain byte-for-byte untouched.
    const other = namespace ? '' : DEV_TEST_PREFIX;
    bytes.set(other + liveMatchKey(1), 'other namespace');
    bytes.set((namespace ?? '') + liveMatchKey(2), 'other slot');
    setCareerNamespace(namespace);
    save(getState());
    expect(load()).not.toBeNull();
    const weekStart = JSON.stringify(getState());
    advanceWeek();
    const first = starts[0]!;
    const once = JSON.stringify(getState());
    const stale = { ...readLiveMatch()!, engineId, tick: 800,
      calls: [{ tick: 10, side: 'home', call: 'hit-up' }],
      plans: [{ tick: 20, side: 'home', tactics: { attack: 'grind', defence: 'rush' } }],
      controls: [{ tick: 30, side: 'home', kind: 'kick' }] };
    const key = (namespace ?? '') + liveMatchKey(1);
    bytes.set(key, JSON.stringify(stale));
    // Simulate boot: state comes from the saved week start, never the held week.
    clearHeldWeek(); listen(); setState(JSON.parse(weekStart));
    advanceWeek();
    const again = starts[1]!;
    expect(JSON.stringify(getState())).toBe(once); // wages, training and RNG exactly once
    expect(again.fixture).toEqual(first.fixture);
    expect(again.home).toEqual(first.home); expect(again.away).toEqual(first.away);
    expect(again.live).toMatchObject({ seed: first.live.seed, calls: [], plans: [] });
    expect(again.live.resumeAt).toBeUndefined(); expect(again.live.controls).toBeUndefined();
    expect(notes.filter(n => n === MATCH_RESTARTED_TEXT)).toHaveLength(1);
    expect(readLiveMatch()).toMatchObject({ engineId: matchEngineIdentity(), tick: 0 });
    expect(resumePlayerMatch()).toBe(true);
    expect(JSON.stringify(getState())).toBe(once);
    expect(notes.filter(n => n === MATCH_RESTARTED_TEXT)).toHaveLength(1);
    const result = runMatch(again.home, again.away, { seed: again.live.seed, weather: again.live.weather });
    bus.emit('match:finished', { fixture: again.fixture, result });
    const finished = JSON.stringify(getState());
    bus.emit('match:finished', { fixture: again.fixture, result });
    expect(JSON.stringify(getState())).toBe(finished);
    expect(weekHeld()).toBe(false);
    expect(getState().week).toBe(JSON.parse(weekStart).week + 1);
    expect(readLiveMatch()).toBeNull();
    expect(bytes.get(other + liveMatchKey(1))).toBe('other namespace');
    expect(bytes.get((namespace ?? '') + liveMatchKey(2))).toBe('other slot');
  });
});

it.each(badIds)('Save & exit drops incompatible inputs even at tick zero (%s), explains once and writes current metadata on progress', engineId => {
  advanceWeek();
  const before = JSON.stringify(getState());
  const record = { ...readLiveMatch()!, engineId, tick: 0, calls: [{ tick: 1, side: 'home', call: 'hit-up' }] };
  bytes.set(liveMatchKey(1), JSON.stringify(record));
  expect(resumePlayerMatch()).toBe(true);
  const live = starts[starts.length - 1]!.live;
  expect(live.calls).toEqual([]); expect(live.resumeAt).toBeUndefined();
  live.onProgress?.([], 40, []);
  expect(liveMatchSameRules(readLiveMatch()!)).toBe(true);
  expect(resumePlayerMatch()).toBe(true);
  expect(notes.filter(n => n === MATCH_RESTARTED_TEXT)).toHaveLength(1);
  expect(JSON.stringify(getState())).toBe(before);
});

it.each([matchEngineIdentity(), ...badIds])('export/import carries compatible identity or accepts fallback identity %s', engineId => {
  save(getState()); advanceWeek();
  starts[0]!.live.onProgress?.([{ tick: 1, side: 'home', call: 'hit-up' }], 40, []);
  const exported = JSON.parse(exportSave(getState()));
  expect(exported.nrlLiveMatch.engineId).toBe(matchEngineIdentity());
  exported.nrlLiveMatch.engineId = engineId;
  const text = JSON.stringify(exported);
  expect(peelLiveMatchExport(text).bad).toBe(false);
  clearHeldWeek(); listen();
  expect(installImportedSave(text, 1).ok).toBe(true);
  setState(load()!); advanceWeek();
  const live = starts[starts.length - 1]!.live;
  if (engineId === matchEngineIdentity()) {
    expect(live.resumeAt).toBe(40); expect(live.calls).toEqual(exported.nrlLiveMatch.calls);
    expect(notes).not.toContain(MATCH_RESTARTED_TEXT);
  } else {
    expect(live.resumeAt).toBeUndefined(); expect(live.calls).toEqual([]);
    expect(notes.filter(n => n === MATCH_RESTARTED_TEXT)).toHaveLength(1);
  }
});

it('retains stale bytes if replacement storage fails after rebuilding the fixture', () => {
  save(getState()); const saved = JSON.stringify(getState()); advanceWeek();
  const stale = { ...readLiveMatch()!, engineId: undefined, tick: 40 };
  bytes.set(liveMatchKey(1), JSON.stringify(stale));
  clearHeldWeek(); listen(); setState(JSON.parse(saved));
  const original = bytes.get(liveMatchKey(1));
  // The old record stays present through every earlier hook and fixture creation.
  bus.on('state:changed', () => expect(bytes.get(liveMatchKey(1))).toBe(original));
  globalThis.localStorage.setItem = () => { throw new Error('full'); };
  advanceWeek();
  expect(bytes.get(liveMatchKey(1))).toBe(original);
  expect(starts[starts.length - 1]!.live.calls).toEqual([]);
  expect(resumePlayerMatch()).toBe(true);
  expect(notes.filter(n => n === MATCH_RESTARTED_TEXT)).toHaveLength(1);
});

it('does not replace stale bytes when an earlier week hook fails', () => {
  advanceWeek();
  const stale = { ...readLiveMatch()!, engineId: undefined, tick: 40 };
  bytes.set(liveMatchKey(1), JSON.stringify(stale));
  const original = bytes.get(liveMatchKey(1));
  clearHeldWeek(); listen();
  registerTickHook('failed-before-match', 35, () => { throw new Error('cannot proceed'); });
  expect(() => advanceWeek()).toThrow('cannot proceed');
  expect(bytes.get(liveMatchKey(1))).toBe(original);
  expect(notes).not.toContain(MATCH_RESTARTED_TEXT);
});

it('checks both fixture teams before using a record', () => {
  advanceWeek(); const rec = readLiveMatch()!;
  writeLiveMatch({ ...rec, awayId: 'different', tick: 100 });
  expect(resumePlayerMatch()).toBe(true);
  expect(starts[starts.length - 1]!.live.resumeAt).toBeUndefined();
});

it('identity follows actual rules and pack selection, ignoring display-only changes', async () => {
  const id = matchEngineIdentity();
  expect(isMatchEngineIdentity(id)).toBe(true);
  const pack = activePack(); const original = pack.vocab.sport;
  pack.vocab.sport = 'display only';
  expect(matchEngineIdentity()).toBe(id); pack.vocab.sport = original;
  const points = NINES.tryPoints;
  try { NINES.tryPoints++; expect(matchEngineIdentity()).not.toBe(id); }
  finally { NINES.tryPoints = points; }
  await preparePack('uk'); selectPack('uk');
  expect(matchEngineIdentity()).not.toBe(id);
});

it('validates engine shape, finite nonnegative integral ticks and every timed input', () => {
  advanceWeek(); const rec = readLiveMatch()!;
  expect(isLiveMatchRecord(rec)).toBe(true);
  for (const engineId of [null, 3, '', 'nrl-live-0-00000000000000', 'bad']) {
    expect(isLiveMatchRecord({ ...rec, engineId })).toBe(false);
  }
  for (const tick of [NaN, Infinity, -1, 1.5]) expect(isLiveMatchRecord({ ...rec, tick })).toBe(false);
  for (const calls of [[null], [{}], [{ tick: 1, side: 'home', call: 'unknown' }],
    [{ tick: -1, side: 'home', call: 'rush' }], [{ tick: 1, side: 'x', call: 'rush' }],
    [{ tick: 1, side: 'home', call: 'set-play' }], [{ tick: 1, side: 'home', call: 'set-play', play: 'toString' }]]) {
    expect(isLiveMatchRecord({ ...rec, calls })).toBe(false);
  }
  for (const plans of [[null], [{}], [{ tick: 1, side: 'home', tactics: null }],
    [{ tick: Infinity, side: 'home', tactics: { attack: 'grind', defence: 'rush' } }],
    [{ tick: 1, side: 'home', tactics: { attack: 'unknown', defence: 'rush' } }]]) {
    expect(isLiveMatchRecord({ ...rec, plans })).toBe(false);
  }
  expect(isLiveMatchRecord({ ...rec, calls: [{ tick: 1, side: 'home', call: 'set-play', play: 'block-play' }],
    plans: [{ tick: 2, side: 'away', tactics: { attack: 'grind', defence: 'rush' } }] })).toBe(true);
});
