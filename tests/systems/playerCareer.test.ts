import { describe, expect, it } from 'vitest';
import { getState } from '../../src/core/state';
import { refreshFreeAgents } from '../../src/systems/freeagency';
import { makeRng } from '../../src/utils/rng';
import { careerFixture } from '../helpers/playerCareer';

describe('persistent player population', () => {
  it('refresh retains the exact unsigned people and their progression', () => {
    const state = careerFixture();
    const before = structuredClone(state.freeAgents);
    refreshFreeAgents(state, makeRng(7));
    expect(getState().freeAgents).toEqual(before);
    expect(getState().freeAgents).toBe(state.freeAgents);
  });
  it('refresh leaves the match RNG unchanged', () => {
    const state = careerFixture();
    refreshFreeAgents(state, makeRng(state.rngSeed));
    expect(getState().rngSeed).toBe(state.rngSeed);
  });
  it('installed people have histories and a unique canonical owner', () => {
    const state = careerFixture();
    const owned = [...state.squad.map(p => ({ p, owner: state.clubId })),
      ...state.league.clubs.flatMap(c => (c.squad ?? []).map(p => ({ p, owner: c.id })))];
    for (const { p, owner } of owned) expect(p.clubHistory?.spells).toEqual([
      { clubId: owner, start: { season: 1, week: 1 }, arrival: 'opening' },
    ]);
    for (const p of state.freeAgents) expect(p.clubHistory?.spells).toEqual([]);
    const ids = [...owned.map(({ p }) => p.id), ...state.freeAgents.map(p => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(state.playerPopulation).toMatchObject({ schemaVersion: 1, retired: [], shortlistIds: state.freeAgents.map(p => p.id) });
  });
});

import * as continuity from '../../src/systems/playerCareer';
import { generatePlayer } from '../../src/data/player';
import type { GameState } from '../../src/core/state';

describe('history operations', () => {
  it('finds actual owners and rejects duplicate ownership', () => {
    const s = careerFixture();
    expect(continuity.ownerOf(s, s.squad[0]!.id)).toBe('player');
    expect(continuity.ownerOf(s, s.freeAgents[0]!.id)).toBe('unsigned');
    const club = s.league.clubs.find(c => c.squad)!;
    expect(continuity.ownerOf(s, club.squad![0]!.id)).toBe(club.id);
    expect(continuity.ownerOf(s, 'missing')).toBeUndefined();
    expect(() => continuity.ownerOf({ ...s, freeAgents: [...s.freeAgents, s.squad[0]!] }, s.squad[0]!.id)).toThrow(/duplicate/i);
  });
  it('observes only known ownership and allows empty unsigned histories', () => {
    const s = careerFixture();
    const p = s.freeAgents[0]!;
    expect(continuity.observedHistory(p, 'unsigned', { season: 4, week: 8 })).toEqual({ spells: [], academyDiscountUsed: true });
    expect(continuity.observedHistory({ ...p, junior: true }, 'unsigned', s).academyDiscountUsed).toBe(false);
    expect(continuity.observedHistory({ ...p, junior: true, departed: true }, 'unsigned', s).academyDiscountUsed).toBe(true);
    expect(continuity.validatePlayerPopulation(s)).toBeNull();
  });
  it('opens and closes exactly one spell without editing the source', () => {
    const s = careerFixture(); const p = s.freeAgents[0]!;
    const signed = continuity.openClubSpell(p, 'player', s, 'signing', 500);
    expect(signed.clubHistory?.spells).toEqual([{ clubId: 'player', start: { season: 1, week: 1 }, arrival: 'signing', transferFee: 500 }]);
    expect(p.clubHistory?.spells).toEqual([]);
    expect(() => continuity.openClubSpell(signed, 'player', s, 'signing')).toThrow(/open/i);
    const released = continuity.closeClubSpell(signed, { season: 2, week: 3 }, 'release');
    expect(released.clubHistory?.spells[0]).toMatchObject({ end: { season: 2, week: 3 }, departure: 'release' });
    expect(() => continuity.closeClubSpell(released, s, 'expiry')).toThrow(/open/i);
    expect(() => continuity.closeClubSpell(signed, { season: 0, week: 1 }, 'release')).toThrow();
    expect(() => continuity.openClubSpell(released, 'player', s, 'signing')).toThrow(/chronolog/i);
  });
  it('archives removed people with their actual progression; identical retries are no-ops', () => {
    const s = careerFixture(); const p = { ...s.squad[0]!, xp: 73, level: 4, unspentPoints: 2 };
    expect(() => continuity.archiveRetirees(s, [p], s)).toThrow(/live/i);
    const removed = { ...s, squad: s.squad.filter(x => x.id !== p.id) };
    const archived = continuity.archiveRetirees(removed, [p], s);
    const record = archived.playerPopulation.retired[0]!;
    expect(record).toMatchObject({ id: p.id, name: p.name, xp: 73, level: 4, unspentPoints: 2, career: p.career, stats: p.stats, ceilings: p.ceilings, traits: p.traits, retiredAt: { season: 1, week: 1 } });
    expect(record.clubHistory.spells[0]).toMatchObject({ departure: 'retirement', end: { season: 1, week: 1 } });
    expect(record).not.toHaveProperty('deal');
    expect(continuity.validatePlayerPopulation(archived)).toBeNull();
    expect(continuity.archiveRetirees(archived, [p], s)).toBe(archived);
    expect(() => continuity.archiveRetirees(archived, [{ ...p, xp: 74 }], s)).toThrow(/conflict/i);
  });
});

describe('market discovery and annual intake', () => {
  function crowded(): GameState {
    const s = careerFixture(); const rng = makeRng(98);
    return { ...s, freeAgents: [...s.freeAgents, ...Array.from({ length: 15 }, () => continuity.installPlayerHistory(generatePlayer(rng), 'unsigned', s))] };
  }
  it('same-date discovery is idempotent and input-order invariant; 100 refreshes produce no births', () => {
    const s = crowded(); const a = continuity.refreshMarketShortlist(s);
    expect(a.playerPopulation.shortlistIds).toHaveLength(12);
    expect(continuity.refreshMarketShortlist(a)).toEqual(a);
    expect(continuity.refreshMarketShortlist({ ...s, freeAgents: [...s.freeAgents].reverse() }).playerPopulation.shortlistIds).toEqual(a.playerPopulation.shortlistIds);
    let current = s;
    for (let i = 0; i < 100; i++) current = continuity.refreshMarketShortlist({ ...current, week: i + 1 });
    expect(current.freeAgents).toBe(s.freeAgents);
    expect(current.rngSeed).toBe(s.rngSeed);
    expect(current.playerPopulation.nextPlayerOrdinal).toBe(s.playerPopulation.nextPlayerOrdinal);
  });
  it('pins unsigned alumni and Academy prospects, and ignores stale signed shortlist IDs', () => {
    const s = crowded(); const [a, b, c] = s.freeAgents;
    s.freeAgents = [
      { ...a!, clubHistory: { spells: [{ clubId: 'player', start: { season: 1, week: 1 }, arrival: 'opening', end: { season: 1, week: 1 }, departure: 'expiry' }], academyDiscountUsed: true } },
      { ...b!, junior: true }, { ...c!, departed: true }, ...s.freeAgents.slice(3),
    ];
    s.playerPopulation.shortlistIds = [s.squad[0]!.id];
    expect(continuity.discoveredFreeAgents(s).map(p => p.id)).toEqual([a!.id, b!.id, c!.id]);
    expect(continuity.refreshMarketShortlist(s).freeAgents).toBe(s.freeAgents);
  });
  it('intake fills only the ordinary deficit once per season and keeps every existing person', () => {
    const s = careerFixture();
    s.season = 2; s.freeAgents = s.freeAgents.slice(0, 2);
    s.freeAgents[0] = { ...s.freeAgents[0]!, junior: true };
    s.playerPopulation.shortlistIds = s.freeAgents.map(p => p.id);
    const before = structuredClone(s);
    const next = continuity.intakeUnsignedMarket(s);
    expect(next.freeAgents).toHaveLength(13); // 1 ordinary + 11 births + 1 junior
    expect(next.freeAgents.slice(0, 2)).toEqual(s.freeAgents);
    expect(next.freeAgents.slice(2).every(p => /^career-person:\d+$/.test(p.id) && p.clubHistory?.spells.length === 0)).toBe(true);
    expect(next.rngSeed).toBe(s.rngSeed);
    expect(next.playerPopulation.lastMarketIntakeSeason).toBe(2);
    expect(continuity.intakeUnsignedMarket(next)).toBe(next);
    expect(s).toEqual(before);
    expect(continuity.validatePlayerPopulation(next)).toBeNull();
  });
  it('intake skips live and archived collisions and births at most twelve', () => {
    const s = careerFixture(); const p = s.freeAgents[0]!;
    s.season = 2; s.freeAgents = []; s.playerPopulation.shortlistIds = [];
    s.squad[0] = { ...s.squad[0]!, id: 'career-person:1' };
    const retired = { ...p, id: 'career-person:2' };
    const withArchive = continuity.archiveRetirees(s, [retired], s);
    const next = continuity.intakeUnsignedMarket(withArchive);
    expect(next.freeAgents).toHaveLength(12);
    expect(next.freeAgents[0]!.id).toBe('career-person:3');
    expect(new Set(next.freeAgents.map(p => p.id)).size).toBe(12);
    expect(next.playerPopulation.nextPlayerOrdinal).toBe(15);
  });
  it('does not birth or delete anyone when the durable ordinary pool already has twelve', () => {
    const s = crowded(); s.season = 2;
    const next = continuity.intakeUnsignedMarket(s);
    expect(next.freeAgents).toBe(s.freeAgents);
    expect(next.playerPopulation.lastMarketIntakeSeason).toBe(2);
    expect(next.playerPopulation.nextPlayerOrdinal).toBe(s.playerPopulation.nextPlayerOrdinal);
  });
});

it('an identical archived record is idempotent after JSON key reordering', () => {
  const s = careerFixture(); const p = s.freeAgents[0]!;
  const archived = continuity.archiveRetirees({ ...s, freeAgents: s.freeAgents.slice(1) }, [p], s);
  const record = archived.playerPopulation.retired[0]!;
  archived.playerPopulation.retired[0] = Object.fromEntries(Object.entries(record).reverse()) as typeof record;
  expect(continuity.archiveRetirees(archived, [p], s)).toBe(archived);
});

it('counts twelve ordinary unsigned alumni toward intake even when their history pins them in Recruit', () => {
  const s = careerFixture();
  s.freeAgents = s.freeAgents.map(player => continuity.closeClubSpell(
    continuity.openClubSpell(player, s.clubId, s, 'signing'), s, 'release',
  ));
  s.season = 2;
  expect(continuity.validatePlayerPopulation(s)).toBeNull();
  expect(continuity.discoveredFreeAgents({ ...s, playerPopulation: { ...s.playerPopulation, shortlistIds: [] } })).toHaveLength(12);
  const before = structuredClone(s);
  const next = continuity.intakeUnsignedMarket(s);
  expect(next.freeAgents).toHaveLength(12);
  expect(next.freeAgents).toBe(s.freeAgents);
  expect(next.playerPopulation.nextPlayerOrdinal).toBe(s.playerPopulation.nextPlayerOrdinal);
  expect(next.playerPopulation.lastMarketIntakeSeason).toBe(2);
  expect(continuity.validatePlayerPopulation(next)).toBeNull();
  expect(s).toEqual(before);
});

import { migrateState } from '../../src/core/save';

it.each([
  { ordinal: Number.MAX_SAFE_INTEGER - 1, ordinary: 11 },
  { ordinal: Number.MAX_SAFE_INTEGER - 2, ordinary: 10 },
])('leaves a valid population untouched when the entire intake cannot retain a valid counter ($ordinal, $ordinary unsigned)', ({ ordinal, ordinary }) => {
  const s = careerFixture();
  s.season = 2;
  s.freeAgents = s.freeAgents.slice(0, ordinary);
  s.playerPopulation = { ...s.playerPopulation, nextPlayerOrdinal: ordinal, shortlistIds: s.freeAgents.map(p => p.id) };
  expect(continuity.validatePlayerPopulation(s)).toBeNull();
  const loaded = migrateState(JSON.parse(JSON.stringify(s)));
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) return;
  const before = JSON.stringify(loaded.state);
  const next = continuity.intakeUnsignedMarket(loaded.state);
  expect(next).toBe(loaded.state);
  expect(JSON.stringify(next)).toBe(before);
  expect(continuity.validatePlayerPopulation(next)).toBeNull();
  expect(migrateState(JSON.parse(JSON.stringify(next))).ok).toBe(true);
});

it('allows the final available ordinal when the resulting counter remains valid', () => {
  const s = careerFixture();
  s.season = 2;
  s.freeAgents = s.freeAgents.slice(0, 11);
  s.playerPopulation = { ...s.playerPopulation, nextPlayerOrdinal: Number.MAX_SAFE_INTEGER - 2, shortlistIds: s.freeAgents.map(p => p.id) };
  expect(migrateState(s).ok).toBe(true);
  const next = continuity.intakeUnsignedMarket(s);
  expect(next.freeAgents).toHaveLength(12);
  expect(next.freeAgents[11]!.id).toBe(`career-person:${Number.MAX_SAFE_INTEGER - 2}`);
  expect(next.playerPopulation.nextPlayerOrdinal).toBe(Number.MAX_SAFE_INTEGER - 1);
  expect(continuity.validatePlayerPopulation(next)).toBeNull();
  expect(migrateState(JSON.parse(JSON.stringify(next))).ok).toBe(true);
});
