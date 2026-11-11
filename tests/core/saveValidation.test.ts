import { shownStats } from '../../src/data/player';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { isPlayer, isPlayerStats, isPlacedFacility, REPAIR_NOTICE } from '../../src/core/saveValidation';
import { __setStorage, __unlockSaves, exportRecoverySaves, getSlotSummaries, importSave, installImportedSave, loadSlot, migrateState, MIGRATIONS, setActiveSlot, writeSlot } from '../../src/core/save';
import { initLeague } from '../../src/systems/fixtures';
import { resolveLineup } from '../../src/systems/lineup';
import { preparePack, selectPack } from '../../src/content';
import { setCareerNamespace, type StorageLike } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, recoveryKey, slotKey } from '../../src/core/storageKeys';

let bytes: Map<string, string>;
let storage: StorageLike;
const fresh = (): GameState => createNewGame('Boundary', 525);
beforeEach(() => {
  bytes = new Map();
  storage = { getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } };
  __setStorage(storage); __unlockSaves(); setActiveSlot(1); setCareerNamespace(null); selectPack('au');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { __setStorage(null); setCareerNamespace(null); vi.restoreAllMocks(); });

describe('focused boundary validators', () => {
  it('accepts generated players, fractional training/injuries, optional tallies and flags without changing bytes', () => {
    const s = fresh();
    s.squad[0] = { ...s.squad[0]!, age: 16, injuredWeeks: 0.5, stats: { ...s.squad[0]!.stats, speed: 55.5 }, junior: true, departed: false, seasonStats: { season: 2, games: 1, tries: 0, tackles: 2, lineBreaks: 0, sinBins: 0 } };
    s.money = -1000000;
    const raw = JSON.stringify(s);
    const result = migrateState(s);
    expect(result).toMatchObject({ ok: true, outcome: 'valid', repairs: [] });
    if (result.ok) { expect(result.state).toBe(s); expect(JSON.stringify(result.state)).toBe(raw); }
    expect(isPlayer(s.squad[0])).toBe(true);
    expect(isPlayerStats(s.squad[0]!.stats)).toBe(true);
  });
  it.each([null, [], {}, { speed: 1 }, ...[NaN, Infinity, -Infinity, 0, 101, '50'].map(speed => ({ speed, strength: 50, stamina: 50, handling: 50, kicking: 50, footyIQ: 50 }))])('refuses malformed stats %j', stats => {
    expect(isPlayerStats(stats)).toBe(false);
    expect(isPlayer({ ...fresh().squad[0], stats })).toBe(false);
  });
  it.each([
    { id: '' }, { name: 4 }, { age: NaN }, { age: 20.5 }, { position: 'quarterback' }, { morale: 101 }, { injuryRisk: Infinity }, { injuredWeeks: -1 }, { suspendedWeeks: '0' }, { wage: -1 }, { contractWeeks: null }, { junior: 1 }, { departed: 'no' }, { joinedSeason: 0 }, { career: {} }, { seasonStats: { games: 0, tries: 0, tackles: 0, lineBreaks: 0, season: Infinity } }, { traits: [{ id: 'unknown', level: 1 }] }, { traits: [{ id: 'finisher', level: 4 }] }, { traits: [{ id: 'finisher', level: 1 }, { id: 'finisher', level: 2 }] },
  ])('refuses malformed player field %j in every roster', patch => {
    const s = fresh(); initLeague(s);
    for (const roster of [getState().squad, getState().freeAgents, getState().league.clubs.find(c => c.squad)!.squad!]) {
      const before = roster[0]!;
      roster[0] = { ...before, ...patch } as typeof before;
      expect(migrateState(getState())).toMatchObject({ ok: false, outcome: 'unrecoverable' });
      roster[0] = before;
    }
  });
  const facility = { id: 'f1', defId: 'trainingPaddock', level: 1, x: 0, y: 0 };
  it('accepts catalogue facility levels and grid edges', () => {
    for (const level of [1, 2, 3]) expect(isPlacedFacility({ ...facility, level, x: 18, y: 18 })).toBe(true);
  });
  it.each([null, { ...facility, id: 2 }, { ...facility, defId: 'missing' }, { ...facility, defId: 'toString' }, { ...facility, level: 4 }, { ...facility, x: Infinity }, { ...facility, y: -1 }, { ...facility, x: 19 }, { ...facility, x: 0.5 }])('refuses malformed facility %j', value => {
    expect(isPlacedFacility(value)).toBe(false);
    expect(migrateState({ ...fresh(), facilities: [value] }).ok).toBe(false);
  });
  it.each(['squad', 'freeAgents', 'rivals', 'facilities', 'club', 'ladder'])('refuses duplicate %s ids without dropping data', kind => {
    fresh(); initLeague(getState());
    const s = getState();
    if (kind === 'squad') s.squad.push(s.squad[0]!);
    if (kind === 'freeAgents') s.freeAgents.push(s.squad[0]!);
    if (kind === 'rivals') s.league.clubs.find(c => c.squad)!.squad!.push(s.squad[0]!);
    if (kind === 'facilities') s.facilities = [facility, facility] as GameState['facilities'];
    if (kind === 'club') s.league.clubs.push(s.league.clubs[0]!);
    if (kind === 'ladder') s.league.ladder.push(s.league.ladder[0]!);
    expect(migrateState(s).ok).toBe(false);
  });
  it.each([
    { money: Infinity }, { money: '10' }, { season: 0 }, { week: 28 }, { rngSeed: NaN }, { reputation: 101 }, { preseason: 3 }, { pack: 'unknown' }, { home: { town: 'Here', lat: NaN } }, { weather: 'snow' }, { boardLoan: { owed: -1 } }, { settings: { volume: NaN } }, { training: { focus: 'wages' } }, { unlocks: { facilities: ['unknown'] } }, { lineup: { starters: [] } },
  ])('refuses malformed career scalars/catalogue fields %j', patch => {
    expect(migrateState({ ...fresh(), ...patch })).toMatchObject({ ok: false, outcome: 'unrecoverable' });
  });
  it('rejects missing rival rosters, dangling fixture and catalogue references; never invents results or rosters', () => {
    fresh(); initLeague(getState());
    const s = getState();
    const club = s.league.clubs.find(c => c.squad)!; const squad = club.squad;
    delete club.squad;
    expect(migrateState(s).ok).toBe(false);
    club.squad = squad!;
    s.league.fixtures[0]!.homeId = 'missing';
    expect(migrateState(s).ok).toBe(false);
    expect(migrateState({ ...fresh(), facilities: [{ ...facility, defId: 'missing' }] }).ok).toBe(false);
  });
  it('uses the saved UK season before pack preparation, regardless of the currently selected pack', async () => {
    await preparePack('uk');
    const s = createNewGame('UK', 5, { home: { town: 'Here', country: 'GB' } }); initLeague(s);
    const uk = { ...getState(), week: 25 };
    selectPack('au');
    expect(migrateState(uk)).toMatchObject({ ok: true, outcome: 'valid' });
    expect(migrateState({ ...uk, week: 26 }).ok).toBe(false);
  });
});

describe('explicit repairs and outcomes', () => {
  it.each(['starters', 'bench', 'kicker', 'captain'] as const)('repairs only the documented %s row deterministically, retaining input', field => {
    const s = fresh();
    delete (s.lineup as unknown as Record<string, unknown>)[field];
    const original = JSON.stringify(s);
    const missing = { ...s.lineup, [field]: field === 'starters' ? Array(9).fill(null) : field === 'bench' ? [] : null };
    const expected = field === 'starters' || field === 'bench' ? resolveLineup(missing, s.squad).lineup : missing;
    const result = migrateState(s);
    expect(result).toMatchObject({ ok: true, outcome: 'repaired', repairs: [{ field: `lineup.${field}`, notification: REPAIR_NOTICE }] });
    if (result.ok) expect(result.state.lineup).toEqual(expected);
    expect(migrateState(s)).toEqual(result);
    expect(JSON.stringify(s)).toBe(original);
  });
  it('handles duplicate/dangling bench selections with the existing lineup resolver', () => {
    const s = fresh(); s.lineup.bench = [s.lineup.starters[0]!, 'gone'];
    const result = migrateState(s);
    expect(result).toMatchObject({ ok: true, outcome: 'repaired' });
    if (result.ok) expect(result.state.lineup).toEqual(resolveLineup(s.lineup, s.squad).lineup);
  });
  it('keeps legitimate empty/injured/banned selections and departed event subjects (historical narrative)', () => {
    const s = fresh(); s.lineup.starters[0] = null;
    s.lineup.captain = 'departed'; s.lineup.bench[0] = 'departed';
    s.squad[0]!.injuredWeeks = 3; s.squad[1]!.suspendedWeeks = 2;
    s.eventDeck.pending = [{ id: 'old', cardId: 'fanDay', season: 1, week: 1, expiresAt: 3, subjectId: 'left', subjectName: 'Former player' }];
    expect(migrateState(s)).toMatchObject({ ok: true, outcome: 'valid', state: s, repairs: [] });
  });
  it('returns unsupported before interpreting future nested schemas and leaves original untouched', () => {
    const future = { version: SAVE_VERSION + 1, squad: 'future schema' }; const raw = JSON.stringify(future);
    expect(migrateState(future)).toMatchObject({ ok: false, outcome: 'unsupported', reason: 'future' });
    bytes.set(slotKey(1), raw); expect(loadSlot()).toMatchObject({ status: 'future' });
    expect(bytes).toEqual(new Map([[slotKey(1), raw]]));
  });
  it.each([1, 3, 5, 7, 10, 16, 20, 22])('rejects malformed historical v%i before migration dereferences it and keeps exact bytes', version => {
    const s = { ...fresh(), version, squad: [null] }; const raw = ` \n${JSON.stringify(s)}\n`;
    expect(() => migrateState(s)).not.toThrow();
    expect(migrateState(s)).toMatchObject({ ok: false, outcome: 'unrecoverable' });
    bytes.set(slotKey(1), raw); expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(bytes.get(slotKey(1))).toBe(raw);
    expect(installImportedSave(raw, 2).ok).toBe(false); expect(bytes.has(slotKey(2))).toBe(false);
  });
  it('rejects old input before any historical migration runs', () => {
    const step = MIGRATIONS[0]!;
    const run = vi.spyOn(step, 'run').mockImplementation(() => { throw new Error('migration failed'); });
    const raw = { ...fresh(), version: 1 }; const original = JSON.stringify(raw);
    expect(migrateState(raw)).toMatchObject({ ok: false, outcome: 'unrecoverable', message: expect.stringMatching(/start a new career/i) });
    expect(run).not.toHaveBeenCalled();
    expect(JSON.stringify(raw)).toBe(original);
  });
});

const damaged = (): string => { const s = fresh(); delete (s.lineup as unknown as Record<string, unknown>).captain; return JSON.stringify(s, null, 2); };
describe('preservation gates', () => {
  it('retains source before returning a repaired load and before replacing current-version bytes', () => {
    const raw = damaged(); bytes.set(slotKey(1), raw);
    const result = loadSlot(); expect(result).toMatchObject({ status: 'ok', outcome: 'repaired' });
    expect(exportRecoverySaves(1)).toContain(raw); expect(bytes.get(slotKey(1))).toBe(raw);
    expect(getSlotSummaries()[0].message).toBe(REPAIR_NOTICE);
    if (result.status === 'ok') expect(writeSlot(1, result.state)).toBe(true);
    expect(JSON.parse(bytes.get(slotKey(1))!).lineup.captain).toBe(null);
    expect(exportRecoverySaves(1)).toContain(raw);
  });
  it.each(['quota', 'readback'])('refuses repairs on preservation %s failure for loads and imports', failure => {
    const incoming = damaged(); const destination = JSON.stringify(fresh()); bytes.set(slotKey(1), incoming); bytes.set(slotKey(2), destination); bytes.set(liveMatchKey(2), 'live');
    const set = storage.setItem; const get = storage.getItem;
    storage.setItem = (k, v) => { if (failure === 'quota' && (k === recoveryKey(1) || k === recoveryKey(2))) throw new Error('quota'); set(k, v); };
    storage.getItem = k => failure === 'readback' && (k === recoveryKey(1) || k === recoveryKey(2)) ? null : get(k);
    expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(installImportedSave(incoming, 2).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(incoming); expect(bytes.get(slotKey(2))).toBe(destination); expect(bytes.get(liveMatchKey(2))).toBe('live');
  });
  it('preserves both the repaired import original and the occupied destination', () => {
    const incoming = damaged(); const destination = JSON.stringify(fresh()); bytes.set(slotKey(1), destination);
    expect(installImportedSave(incoming, 1)).toMatchObject({ ok: true, outcome: 'repaired' });
    expect(exportRecoverySaves(1)).toEqual([incoming, destination]);
  });
  it('rejects historical imports without installing or writing recovery', () => {
    const incoming = JSON.stringify({ ...fresh(), version: 22 }, null, 2);
    expect(installImportedSave(incoming, 1).ok).toBe(false);
    expect(bytes.size).toBe(0);
  });
  it('invalid imports leave the existing destination and live match byte-for-byte intact', () => {
    const destination = JSON.stringify(fresh()); bytes.set(slotKey(1), destination); bytes.set(liveMatchKey(1), 'live');
    const bad = { ...fresh(), freeAgents: [{ id: 'fake' }] }; const before = new Map(bytes);
    expect(importSave(JSON.stringify(bad)).ok).toBe(false);
    expect(installImportedSave(JSON.stringify(bad), 1).ok).toBe(false);
    expect(bytes).toEqual(before);
  });
  it('repairs only within the developer namespace', () => {
    const raw = damaged(); bytes.set(slotKey(1), 'normal original'); bytes.set(liveMatchKey(1), 'normal live');
    setCareerNamespace(DEV_TEST_PREFIX); bytes.set(DEV_TEST_PREFIX + slotKey(1), raw);
    expect(loadSlot()).toMatchObject({ status: 'ok', outcome: 'repaired' });
    expect(exportRecoverySaves(1)).toEqual([raw]);
    expect(bytes.get(slotKey(1))).toBe('normal original'); expect(bytes.get(liveMatchKey(1))).toBe('normal live'); expect(bytes.has(recoveryKey(1))).toBe(false);
  });
});

it('never runs nested validation during autosave, and refuses externally changed source bytes until reopened', async () => {
  const validation = await import('../../src/core/saveValidation');
  const { enableAutosave, save } = await import('../../src/core/save');
  const { bus } = await import('../../src/core/events');
  const s = fresh(); save(s);
  expect(loadSlot()).toMatchObject({ status: 'ok' });
  const boundary = vi.spyOn(validation, 'validateInput');
  const current = vi.spyOn(validation, 'validateCurrent');
  const off = enableAutosave({});
  try {
    bus.emit('week:advanced', { season: 1, week: 1 });
    expect(boundary).not.toHaveBeenCalled(); expect(current).not.toHaveBeenCalled();
    const changed = JSON.stringify({ ...s, money: s.money + 20 }); bytes.set(slotKey(1), changed);
    bus.emit('week:advanced', { season: 1, week: 1 });
    expect(bytes.get(slotKey(1))).toBe(changed);
    expect(boundary).not.toHaveBeenCalled(); expect(current).not.toHaveBeenCalled();
    expect(loadSlot()).toMatchObject({ status: 'ok' });
    expect(boundary).toHaveBeenCalled();
    save(s); expect(bytes.get(slotKey(1))).toBe(JSON.stringify(s));
  } finally { off(); }
});

it('a missing bench repair preserves departed/injured starter intent and leader choices', () => {
  const s = fresh(); s.lineup.starters[0] = 'departed'; s.lineup.captain = 'departed';
  delete (s.lineup as unknown as Record<string, unknown>).bench;
  const back = migrateState(s);
  expect(back).toMatchObject({ ok: true, outcome: 'repaired', repairs: [{ field: 'lineup.bench' }] });
  if (back.ok) {
    expect(back.state.lineup.starters).toEqual(s.lineup.starters);
    expect(back.state.lineup.captain).toBe('departed');
    expect(migrateState(back.state)).toMatchObject({ ok: true, outcome: 'valid', repairs: [] });
  }
});

it.each([
  { rotation: 'turbo' }, { tactics: { attack: 'unknown', defence: 'slide' } }, { tactics: { attack: 'balanced', defence: 1 } },
  { plays: ['unknown'] }, { plays: ['block-play'] }, { starters: [1, ...Array(8).fill(null)] }, { bench: [null] }, { kicker: 4 }, { captain: false },
])('refuses malformed lineup enums and selections %j rather than guessing coach intent', patch => {
  const s = fresh();
  expect(migrateState({ ...s, lineup: { ...s.lineup, ...patch } })).toMatchObject({ ok: false, outcome: 'unrecoverable' });
});

it.each([
  { league: { clubs: [null], fixtures: [], ladder: [] }, version: 7 },
  { settings: null, version: 2 }, { history: [null], version: 3 },
  { finance: [null], version: 16 }, { eventDeck: null, version: 20 },
])('refuses historical structures before a migration reads them %j', patch => {
  const source = { ...fresh(), ...patch }; const before = JSON.stringify(source);
  expect(migrateState(source)).toMatchObject({ ok: false, outcome: 'unrecoverable' });
  expect(JSON.stringify(source)).toBe(before);
});

it('does not install a repaired import when retaining its occupied destination fails', () => {
  const incoming = damaged(); const destination = JSON.stringify(fresh()); bytes.set(slotKey(1), destination); bytes.set(liveMatchKey(1), 'existing live');
  const set = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === recoveryKey(1) && (JSON.parse(value) as string[]).includes(destination)) throw new Error('destination backup failed');
    set(key, value);
  };
  expect(installImportedSave(incoming, 1)).toMatchObject({ ok: false });
  expect(exportRecoverySaves(1)).toContain(incoming);
  expect(bytes.get(slotKey(1))).toBe(destination); expect(bytes.get(liveMatchKey(1))).toBe('existing live');
});

describe('format-24 ceiling compatibility (#538)', () => {
  it('backfills every pre-change v24 roster deterministically without mutation or RNG draws', () => {
    fresh(); initLeague(getState());
    const source = JSON.parse(JSON.stringify(getState()));
    source.version = 24;
    const rosters = [source.squad, source.freeAgents, ...source.league.clubs.map((c: { squad?: unknown[] }) => c.squad ?? [])];
    for (const roster of rosters) for (const p of roster) delete p.ceilings;
    source.squad[0].stats.speed = 99.75;
    const original = JSON.stringify(source);
    const first = migrateState(source);
    const second = importSave(original);
    expect(first.ok).toBe(true); expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.state).toEqual(second.state);
    expect(first.state.version).toBe(SAVE_VERSION);
    expect(first.state.rngSeed).toBe(source.rngSeed);
    expect(first.state.lineup).toEqual(source.lineup);
    expect(JSON.stringify(source)).toBe(original);
    const players = [...first.state.squad, ...first.state.freeAgents, ...first.state.league.clubs.flatMap(c => c.squad ?? [])];
    for (const p of players) for (const key of shownStats(p.position)) expect(p.ceilings[key]).toBeGreaterThanOrEqual(p.stats[key]);
    expect(migrateState(first.state)).toMatchObject({ ok: true, state: first.state });
    bytes.set(slotKey(1), original);
    const loaded = loadSlot();
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state).toEqual(first.state);
  });

  it('preserves stored ceilings even when legacy training has passed them', () => {
    const s = fresh();
    const p = s.squad[0]!;
    const key = shownStats(p.position)[0]!;
    p.stats[key] = 100;
    const result = migrateState(s);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.squad[0]!.ceilings).toEqual(p.ceilings);
  });

  it.each([null, {}, { speed: 101 }, { speed: '50' }, { speed: 0 }, { speed: 50, madeUp: 50 }])('rejects malformed present ceilings %j', ceilings => {
    const s = fresh();
    s.squad[0] = { ...s.squad[0]!, ceilings } as typeof s.squad[number];
    expect(migrateState(s).ok).toBe(false);
  });
});

it.each([0, 101, -1, NaN, Infinity, '50', null])('rejects invalid individual ceiling %j in a complete ceiling record', value => {
  const s = fresh();
  const p = s.squad[0]!;
  const key = shownStats(p.position)[0]!;
  s.squad[0] = { ...p, ceilings: { ...p.ceilings, [key]: value } } as typeof p;
  expect(migrateState(s).ok).toBe(false);
});
