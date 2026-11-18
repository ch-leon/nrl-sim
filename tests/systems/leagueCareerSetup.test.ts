import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/events';
import { activePack, selectPack } from '../../src/content';
import { __setStorage, exportOriginalSave, exportRecoverySaves, getSlotMeta, importSave, installImportedSave, loadSlot, setActiveSlot, writeSlot } from '../../src/core/save';
import { createNewGame, getState, setState, SAVE_VERSION } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { prepareLeagueCareer, startLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { leagueCareerStateProblem } from '../../src/systems/leagueEntryValidation';

function storage() {
  const bytes = new Map<string, string>();
  const store = { getItem: (k: string) => bytes.get(k) ?? null,
    setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
  __setStorage(store);
  vi.stubGlobal('localStorage', store);
  setActiveSlot(1);
  return { bytes, store };
}
const options = { clubName: 'Expansion', seed: 574, coachName: 'Coach', groundName: 'The Park',
  home: { town: 'Leeds', country: 'GB' }, colors: ['#123456', '#abcdef'] as [string,string] };

afterEach(() => { __setStorage(null); selectPack('au'); vi.unstubAllGlobals(); });

it.each(['AU', 'GB'])('prepares and installs the complete regional opening gate for %s', async country => {
  const { bytes } = storage();
  const classic = createNewGame('Existing', 31);
  const request = { ...options, home: {...options.home, country} };
  const candidate = await prepareLeagueCareer(request);
  expect(getState()).toBe(classic);
  expect(activePack().id).toBe('au');
  expect(bytes.size).toBe(0);
  expect(leagueCareerStateProblem(candidate)).toBeNull();
  expect(candidate.competitions!.instances).toHaveLength(27);
  expect(candidate.league.clubs).toHaveLength(24);
  expect(candidate.freeAgents).toHaveLength(12);
  expect(candidate.playerPopulation.shortlistIds).toEqual(candidate.freeAgents.map(p => p.id));
  const people = [...candidate.squad,...candidate.league.clubs.flatMap(c => c.squad ?? []),...candidate.freeAgents];
  expect(new Set(people.map(p => p.id)).size).toBe(492);
  expect(candidate.league.clubs.find(c => c.id === candidate.clubId)?.colors).toEqual(options.colors);
  expect(candidate).toMatchObject({ home:request.home, coachName:'Coach',groundName:'The Park' });
  expect(await startLeagueCareer(request)).toEqual({ok:true,state:candidate});
  expect(activePack().id).toBe(country === 'GB' ? 'uk' : 'au');
  expect(loadSlot()).toMatchObject({status:'ok',repairs:[],state:candidate});
  expect(installImportedSave(JSON.stringify(candidate),2)).toMatchObject({ok:true,state:candidate,repairs:[]});
});

it('keeps the original slot, parked match and installed career on refused replacements', async () => {
  const { bytes, store } = storage();
  const classic = createNewGame('Original', 14);
  expect(writeSlot(1,classic)).toBe(true);
  const original = exportOriginalSave(1)!;
  bytes.set(liveMatchKey(1),'parked');
  expect((await startLeagueCareer(options)).ok).toBe(false);
  const running = startLeagueCareer(options,{slot:1,expectedOriginal:original});
  bytes.delete(slotKey(1));
  expect((await running).ok).toBe(false);
  for(const raw of ['unreadable',JSON.stringify({...classic,version:SAVE_VERSION+1})]){
    bytes.set(slotKey(1),raw);
    expect((await startLeagueCareer(options,{slot:1,expectedOriginal:raw})).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(raw);
  }
  bytes.set(slotKey(1),original);
  const write = store.setItem;
  store.setItem = (k,v) => { if(k===slotKey(1)) throw new Error('quota'); write(k,v); };
  expect((await startLeagueCareer(options,{slot:1,expectedOriginal:original})).ok).toBe(false);
  expect(getState()).toBe(classic);
  expect(activePack().id).toBe('au');
  expect(bytes.get(slotKey(1))).toBe(original);
  expect(bytes.get(liveMatchKey(1))).toBe('parked');
});

it('refuses unsupported, future and invalid marked snapshots before normalization', async () => {
  const { bytes } = storage();
  const candidate = await prepareLeagueCareer(options);
  // v32/v33 League saves have supported migrations; v31 marked careers do not.
  for(const bad of [{...candidate,version:31},{...candidate,version:SAVE_VERSION+1},
    {...candidate,pack:'au'}, {...candidate,competitions:{...candidate.competitions,leagueCareer:null}}]){
    const raw=JSON.stringify(bad);
    bytes.set(slotKey(1),raw);
    expect(importSave(raw).ok).toBe(false);
    expect(loadSlot().status).toBe(bad.version>SAVE_VERSION?'future':'corrupt');
    expect(exportOriginalSave(1)).toBe(raw);
  }
});

it('publishes only after a confirmed historical replacement retains the old save and retires its match', async () => {
  const { bytes } = storage();
  const classic = createNewGame('Before', 24);
  expect(writeSlot(1,classic)).toBe(true);
  const revision = getSlotMeta(1)!.revision;
  const original = readFileSync(new URL('../fixtures/saves/league-career/v32-au-active.json', import.meta.url), 'utf8');
  bytes.set(slotKey(1),original);
  bytes.set(liveMatchKey(1),'parked');
  const seen = vi.fn();
  const off = bus.on('state:changed', state => {
    seen({ saved: bytes.get(slotKey(1)) === JSON.stringify(state), pack: activePack().id, parked: bytes.has(liveMatchKey(1)) });
  });
  try {
    expect((await startLeagueCareer(options,{slot:1,expectedOriginal:original})).ok).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith({saved:true,pack:'uk',parked:false});
    expect(exportRecoverySaves(1)).toContain(original);
    expect(getSlotMeta(1)!.revision).toBe(revision + 1);
  } finally { off(); }
});

it('rejects a change to the installed source while preparing an empty destination', async () => {
  const { bytes } = storage();
  createNewGame('Live club',45);
  const start = startLeagueCareer(options);
  setState({clubName:'Changed club'});
  expect((await start).ok).toBe(false);
  expect(getState().clubName).toBe('Changed club');
  expect(activePack().id).toBe('au');
  expect(bytes.has(slotKey(1))).toBe(false);
});
