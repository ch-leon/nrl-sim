import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __setStorage,
  __unlockSaves,
  exportRecoverySaves,
  installImportedSave,
  loadSlot,
  migrateState,
  setActiveSlot
} from '../../src/core/save';
import { getState, loadState, type GameState } from '../../src/core/state';

import { preparePack } from '../../src/content';
import { bus, type Events } from '../../src/core/events';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, weekHeld, withFastForward } from '../../src/core/time';
import { registerAllSystems } from '../../src/qa/soak';
import { captureOpenCupEntryPreview, confirmOpenCupChoice } from '../../src/systems/openCupEntryCommit';
import { drawOpenCup } from '../../src/systems/openCup';

function store() {
  const bytes = new Map<string, string>();
  const storage = {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => {
      bytes.set(k, v);
    },
    removeItem: (k: string) => {
      bytes.delete(k);
    }
  };
  vi.stubGlobal('localStorage', storage);
  __setStorage(storage);
  __unlockSaves();
  setActiveSlot(1);
  return bytes;
}
afterEach(() => {
  bus.clear();
  clearHeldWeek();
  clearSeasonHooks();
  clearTickHooks();
  __setStorage(null);
  vi.unstubAllGlobals();
});
function capture(name: string): GameState {
  return JSON.parse(readFileSync(new URL('../fixtures/saves/league-career/v32-' + name + '.json', import.meta.url), 'utf8'));
}

describe('released v32 cup entry migration', () => {
  for (const region of ['au', 'uk'])
    for (const point of ['initial-choice', 'active', 'week-6', 'week-7', 'week-19', 'next-season-choice']) {
      it(region + ' ' + point + ' retains its sporting world', () => {
        const old = capture(region + '-' + point);
        const source = JSON.stringify(old);
        const result = migrateState(old);
        if (!result.ok) throw Error(result.message);
        expect(result.state.version).toBe(33);
        expect(result.state.competitionRewards).toEqual([]);
        const { competitionRewards: _rewards, ...preserved } = structuredClone(result.state);
        delete preserved.competitions!.openCupEntry;
        expect({ ...preserved, version: 32 }).toEqual(old);
        expect(result.state.competitions!.instances).toEqual(old.competitions!.instances);
        expect(result.state.rngSeed).toBe(old.rngSeed);
        expect(result.state.money).toBe(old.money);
        expect(result.state.capAccount).toEqual(old.capAccount);
        const entry = result.state.competitions!.openCupEntry;
        if (point.endsWith('choice')) expect(entry).toBeUndefined();
        else
          expect(entry!.current).toMatchObject({
            choice: 'unanswered',
            lifecycle: old.week < 7 ? 'open' : 'unavailable',
            resolution: old.week < 7 ? null : 'legacy-window-missed'
          });
        expect(JSON.stringify(old)).toBe(source);
      });
    }
  it('keeps the old developer cup inert', () => {
    const old = capture('dev-open-cup');
    const r = migrateState(old);
    expect(r.ok && r.state).toEqual({ ...old, version: 33, competitionRewards: [] });
  });
  it('rejects new fields in an old format by presence', () => {
    for (const mutate of [
      (s: any) => {
        s.competitionRewards = [];
      },
      (s: any) => {
        s.competitions.openCupEntry = null;
      },
      (s: any) => {
        s.league.clubs[1].reputation = false;
      },
      ...['execution', 'basis', 'squad'].map(key => (s: any) => {
        s.competitions.instances[0].definition.rewards = [{ [key]: null }];
      })
    ]) {
      const old = capture('au-active');
      mutate(old);
      expect(migrateState(old).ok).toBe(false);
    }
  });
});

it.each(['au', 'uk'] as const)('resumes the genuine %s week-six match and expires unanswered entry', async region => {
  await preparePack(region);
  const bytes = store(),
    old = capture(region + '-week-6');
  const live = JSON.parse(
    readFileSync(new URL('../fixtures/saves/league-career/live-matches/v32-' + region + '-week-6.json', import.meta.url), 'utf8')
  );
  const envelope = JSON.stringify({ ...old, nrlLiveMatch: live }, null, 2);
  expect(installImportedSave(envelope, 1).ok).toBe(true);
  expect(exportRecoverySaves(1)).toContain(envelope);
  expect(bytes.get(liveMatchKey(1))).toBe(JSON.stringify(live));
  const loaded = loadSlot(1);
  if (loaded.status !== 'ok') throw Error('Could not load captured game');
  loadState(loaded.state);
  registerAllSystems();
  const selection = captureOpenCupEntryPreview();
  if (!selection.ok) throw Error(selection.message);
  let match: Events['match:started'] | undefined;
  bus.on('match:started', m => {
    match = m;
  });
  advanceWeek();
  expect(weekHeld()).toBe(true);
  expect(match!.fixture.id).toBe(live.fixtureId);
  expect(match!.live.seed).toBe(live.seed);
  expect(confirmOpenCupChoice({ ...selection.preview, choice: 'enter' })).toMatchObject({ ok: false, reason: 'held' });
  bus.emit('match:finished', {
    fixture: match!.fixture,
    result: {
      homeScore: 12,
      awayScore: 0,
      events: [],
      injuries: [],
      stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
      weather: 'clear',
      momentumTimeline: []
    }
  });
  expect(getState().week).toBe(7);
  expect(getState().competitions!.openCupEntry!.current.resolution).toBe('expired');
  expect(loadSlot(1)).toMatchObject({ status: 'ok', state: { week: 7 } });
});
it('loads a released Classic career and advances a full interval', async () => {
  await preparePack('au');
  const bytes = store();
  const source = readFileSync(new URL('../fixtures/saves/v29-finance-settled.json', import.meta.url), 'utf8');
  bytes.set(slotKey(1), source);
  const loaded = loadSlot(1);
  if (loaded.status !== 'ok') throw Error('Cannot load Classic career');
  loadState(loaded.state);
  registerAllSystems();
  withFastForward(() => {
    advanceWeek();
    advanceWeek();
    advanceWeek();
  });
  expect(getState().week).toBe(loaded.state.week + 1);
});
it.each(['week-6', 'week-7'])('preserves an inert pre-existing v32 cup at %s', point => {
  const state = capture('au-' + point);
  // DERIVED migration case: add a seeded inert cup to a detached genuine v32 career.
  const template = capture('dev-open-cup').competitions!.instances.find(i => i.definition.id.endsWith(':open-cup'))!.definition;
  const instance = drawOpenCup({
    definition: template,
    clubIds: state.league.clubs.map(c => c.id),
    playerId: 'player',
    enterPlayer: false,
    seed: 2,
    season: 1,
    currentSlot: 1
  }).instance;
  state.competitions!.instances.push(instance);
  const migrated = migrateState(state);
  if (!migrated.ok) throw Error(migrated.message);
  expect(migrated.state.competitions!.openCupEntry!.current).toMatchObject({ lifecycle: 'unavailable', resolution: 'legacy-cup' });
  expect(migrated.state.competitions!.instances).toEqual(state.competitions!.instances);
  expect(migrated.state.matchIncome).toEqual(state.matchIncome);
  expect(migrated.state.competitionRewards).toEqual([]);
});
it('rejects corrupt old finance, population, cap, entry, history and runtime before replacing an occupied slot', () => {
  const bytes = store(),
    initial = capture('au-active');
  expect(installImportedSave(JSON.stringify(initial), 1).ok).toBe(true);
  const destination = bytes.get(slotKey(1));
  bytes.set(liveMatchKey(1), 'parked');
  const old = capture('au-next-season-choice');
  for (const mutate of [
    (s: GameState) => {
      s.finance[0]!.prize = NaN;
    },
    (s: GameState) => {
      s.playerPopulation.lastMarketIntakeSeason++;
    },
    (s: GameState) => {
      s.capAccount.tier = 'premier';
    },
    (s: GameState) => {
      s.competitions!.leagueCareer!.accepted!.receiptId = 'wrong';
    },
    (s: GameState) => {
      s.history = [];
    },
    (s: GameState) => {
      s.competitions!.instances[0]!.definition.lineup.onField = 1;
    }
  ]) {
    const derived = structuredClone(old);
    mutate(derived);
    expect(installImportedSave(JSON.stringify(derived), 1).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(destination);
    expect(bytes.get(liveMatchKey(1))).toBe('parked');
  }
});
it('rejects the missing required current ledger', () => {
  const migrated = migrateState(capture('au-active'));
  if (!migrated.ok) throw Error(migrated.message);
  const { competitionRewards: _, ...missing } = migrated.state;
  expect(migrateState(missing).ok).toBe(false);
});

it('retains the source and paired destination when ownership changes during an imported held-save write', () => {
  const bytes = store(),
    original = capture('au-active'),
    live = JSON.parse(readFileSync(new URL('../fixtures/saves/league-career/live-matches/v32-au-week-6.json', import.meta.url), 'utf8'));
  expect(installImportedSave(JSON.stringify(original), 2).ok).toBe(true);
  const prior = bytes.get(slotKey(2));
  bytes.set(liveMatchKey(2), 'original match');
  const write = globalThis.localStorage.setItem;
  let changed = false;
  vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation((key, payload) => {
    write(key, payload);
    if (key === slotKey(2) && !changed) {
      changed = true;
      setActiveSlot(3);
    }
  });
  const rejected = installImportedSave(JSON.stringify({ ...capture('au-week-6'), nrlLiveMatch: live }, null, 2), 2);
  expect(rejected.ok).toBe(false);
  expect(bytes.get(slotKey(2))).toBe(prior);
  expect(bytes.get(liveMatchKey(2))).toBe('original match');
});

it.each(['removal throws', 'removal ignored', 'payload mismatch'] as const)(
  'preserves occupied slot two and its match when clearing the verified import fails: %s',
  fault => {
    const bytes = store(),
      key = slotKey(2),
      match = liveMatchKey(2);
    expect(installImportedSave(JSON.stringify(capture('au-active')), 2).ok).toBe(true);
    const original = bytes.get(key);
    bytes.set(match, 'old match');
    const remove = globalThis.localStorage.removeItem,
      put = globalThis.localStorage.setItem;
    const badRemove = vi.spyOn(globalThis.localStorage, 'removeItem').mockImplementation(k => {
      if (k === match && fault === 'removal throws') throw Error('cannot remove');
      if (k === match && fault === 'removal ignored') return;
      remove(k);
    });
    const badPut = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation((k, v) => {
      put(k, k === key && v !== original && fault === 'payload mismatch' ? 'damaged' : v);
    });
    const incoming = JSON.stringify(capture('au-week-6'));
    expect(installImportedSave(incoming, 2).ok).toBe(false);
    expect(bytes.get(key)).toBe(original);
    expect(bytes.get(match)).toBe('old match');
    badRemove.mockRestore();
    badPut.mockRestore();
    expect(installImportedSave(incoming, 2).ok).toBe(true);
    expect(bytes.has(match)).toBe(false);
    expect(JSON.parse(bytes.get(key)!).week).toBe(6);
  }
);

it('does not replace independently changed destination bytes after the parked match write', () => {
  const bytes = store(),
    key = slotKey(2),
    match = liveMatchKey(2);
  expect(installImportedSave(JSON.stringify(capture('au-active')), 2).ok).toBe(true);
  const live = JSON.parse(
    readFileSync(new URL('../fixtures/saves/league-career/live-matches/v32-au-week-6.json', import.meta.url), 'utf8')
  );
  bytes.set(match, 'prior parked match');
  const replacement = JSON.stringify({ ...capture('au-active'), clubName: 'Replaced elsewhere' });
  const put = globalThis.localStorage.setItem;
  vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation((k, v) => {
    put(k, v);
    if (k === match && v === JSON.stringify(live)) put(key, replacement);
  });
  expect(installImportedSave(JSON.stringify({ ...capture('au-week-6'), nrlLiveMatch: live }), 2).ok).toBe(false);
  expect(bytes.get(key)).toBe(replacement);
  expect(bytes.get(match)).toBe('prior parked match');
});

it.each(['sidecar','career'] as const)('leaves a competing complete held pair intact when replaced after the %s write',step=>{
  const bytes=store(), careerKey=slotKey(2), matchKey=liveMatchKey(2);
  const sidecar=(region:string)=>JSON.parse(readFileSync(new URL('../fixtures/saves/league-career/live-matches/v32-'+region+'-week-6.json',import.meta.url),'utf8'));
  const ukCareer=JSON.stringify(capture('uk-week-6')), ukMatch=JSON.stringify(sidecar('uk'));
  const put=globalThis.localStorage.setItem;
  let replaced=false;
  vi.spyOn(globalThis.localStorage,'setItem').mockImplementation((k,v)=>{
    put(k,v);
    if(!replaced && k===(step==='sidecar'?matchKey:careerKey)){
      replaced=true;bytes.set(careerKey,ukCareer);bytes.set(matchKey,ukMatch);
    }
  });
  const incoming=JSON.stringify({...capture('au-week-6'),nrlLiveMatch:sidecar('au')});
  expect(installImportedSave(incoming,2).ok).toBe(false);
  expect(bytes.get(careerKey)).toBe(ukCareer);
  expect(bytes.get(matchKey)).toBe(ukMatch);
});
