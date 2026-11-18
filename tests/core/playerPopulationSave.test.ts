import { afterEach, describe, expect, it } from 'vitest';
import { migrateState, __setStorage, __unlockSaves, importIntoSlot, slotKey, writeSlot } from '../../src/core/save';
import { careerFixture } from '../helpers/playerCareer';
import type { GameState } from '../../src/core/state';
import { validatePlayerPopulation } from '../../src/systems/playerCareer';

function legacy(): Record<string, any> {
  const state = structuredClone(careerFixture()) as any;
  state.version = 29; delete state.playerPopulation; delete state.competitionRewards;
  for (const p of [...state.squad, ...state.freeAgents, ...state.league.clubs.flatMap((c: any) => c.squad ?? [])]) delete p.clubHistory;
  return state;
}
afterEach(() => __setStorage(null));

describe('v30 population save boundary', () => {
  it('migrates v29 with observed ownership only, preserving every original field', () => {
    const raw = legacy(); raw.season = 3; raw.week = 4;
    raw.freeAgents[0].junior = true;
    raw.freeAgents[1].junior = true; raw.freeAgents[1].departed = true;
    raw.squad[0].id = 'career-person:1'; raw.lineup.starters = raw.lineup.starters.map((id: string) => id === careerFixture().squad[0]!.id ? raw.squad[0].id : id);
    const before = JSON.stringify(raw);
    const result = migrateState(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.playerPopulation).toEqual({ schemaVersion: 1, shortlistIds: raw.freeAgents.map((p: any) => p.id), retired: [], nextPlayerOrdinal: 2, lastMarketIntakeSeason: 3, lastAcademyIntakeSeason: 3 });
    expect(result.state.squad[0]!.clubHistory).toEqual({ spells: [{ clubId: 'player', start: { season: 3, week: 4 }, arrival: 'observed' }], academyDiscountUsed: true });
    expect(result.state.freeAgents[0]!.clubHistory).toEqual({ spells: [], academyDiscountUsed: false });
    expect(result.state.freeAgents[1]!.clubHistory).toEqual({ spells: [], academyDiscountUsed: true });
    const stripped = structuredClone(result.state) as any; stripped.version = 29; delete stripped.playerPopulation; delete stripped.competitionRewards;
    for (const p of [...stripped.squad, ...stripped.freeAgents, ...stripped.league.clubs.flatMap((c: any) => c.squad ?? [])]) delete p.clubHistory;
    expect(stripped).toEqual(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });
  it('rejects population or history metadata spoofed into old versions', () => {
    const raw = legacy(); raw.squad[0].clubHistory = { spells: 'bad' };
    expect(migrateState(raw).ok).toBe(false);
    delete raw.squad[0].clubHistory; raw.playerPopulation = {};
    expect(migrateState(raw).ok).toBe(false);
  });
  it.each([
    (s: GameState) => { delete s.squad[0]!.clubHistory; },
    (s: GameState) => { s.squad[0]!.clubHistory!.spells[0]!.clubId = 'unknown'; },
    (s: GameState) => { s.squad[0]!.clubHistory!.spells[0]!.clubId = s.league.clubs.find(c => c.squad)!.id; },
    (s: GameState) => { s.squad[0]!.clubHistory!.spells[0]!.start.week = 0; },
    (s: GameState) => { s.squad[0]!.clubHistory!.spells[0]!.start.season = 2; },
    (s: GameState) => { s.freeAgents[0]!.clubHistory!.spells = s.squad[0]!.clubHistory!.spells; },
    (s: GameState) => { s.playerPopulation.shortlistIds.push(s.squad[0]!.id); },
    (s: GameState) => { s.playerPopulation.shortlistIds.push(s.playerPopulation.shortlistIds[0]!); },
    (s: GameState) => { s.playerPopulation.nextPlayerOrdinal = 0; },
    (s: GameState) => { s.playerPopulation.lastMarketIntakeSeason = 2; },
    (s: GameState) => { s.playerPopulation.lastAcademyIntakeSeason = -1; },
    (s: GameState) => { s.squad[0]!.clubHistory!.academyDiscountUsed = false; },
  ])('rejects invalid ownership/history/population without editing an occupied save', mutate => {
    const bytes = new Map<string, string>();
    __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k,v) => { bytes.set(k,v); }, removeItem: k => { bytes.delete(k); } });
    __unlockSaves(); const s = careerFixture(); writeSlot(1, s);
    const original = bytes.get(slotKey(1)); const invalid = structuredClone(s); mutate(invalid);
    expect(validatePlayerPopulation(invalid)).not.toBeNull();
    expect(migrateState(invalid).ok).toBe(false);
    expect(importIntoSlot(JSON.stringify(invalid), 1)).toBeNull();
    expect(bytes.get(slotKey(1))).toBe(original);
  });
});

import savedV28 from '../fixtures/saves/v28-finance-opening.json';
import savedV29 from '../fixtures/saves/v29-finance-settled.json';
import { reconcileMatchIncome } from '../../src/systems/matchIncome';
import { archiveRetirees, closeClubSpell, openClubSpell } from '../../src/systems/playerCareer';

it.each([savedV28, savedV29])('preserves recorded finance fixtures, receipts and booked flags on migration ($version)', raw => {
  const before = JSON.stringify(raw);
  const migrated = migrateState(raw);
  expect(migrated.ok).toBe(true);
  if (!migrated.ok) return;
  expect(migrated.state.money).toBe(raw.money);
  expect(migrated.state.capAccount).toEqual(raw.capAccount);
  expect(migrated.state.finance).toEqual(raw.finance);
  expect(migrated.state.rngSeed).toBe(raw.rngSeed);
  expect(migrated.state.squad.map(p => p.deal)).toEqual(raw.squad.map(p => p.deal));
  const existingIncome = 'matchIncome' in raw ? raw.matchIncome : [];
  expect(migrated.state.matchIncome).toEqual(existingIncome);
  expect(reconcileMatchIncome(migrated.state).money).toBe(migrated.state.money);
  expect(JSON.stringify(raw)).toBe(before);
});

it('rejects a second player-club roster instead of treating it as another canonical owner', () => {
  const s = careerFixture();
  const p = openClubSpell(s.freeAgents[0]!, s.clubId, s, 'signing');
  s.freeAgents = s.freeAgents.slice(1); s.playerPopulation.shortlistIds = s.freeAgents.map(p => p.id);
  s.league.clubs[0]!.squad = [p];
  expect(validatePlayerPopulation(s)).not.toBeNull();
});

it('rejects overlapping spells, malformed dates, fee metadata and multiple open spells', () => {
  const s = careerFixture(); const p = s.squad[0]!;
  const released = closeClubSpell(p, { season: 1, week: 2 }, 'release');
  const returned = openClubSpell(released, 'player', { season: 1, week: 3 }, 'signing');
  s.week = 4; s.squad[0] = returned;
  expect(validatePlayerPopulation(s)).toBeNull();
  const history = returned.clubHistory!;
  for (const spells of [
    [{ ...history.spells[0]!, end: { season: 1, week: 4 } }, history.spells[1]!],
    [{ ...history.spells[0]!, transferFee: -1 }, history.spells[1]!],
    [{ ...history.spells[0]!, end: { season: 1, week: 1.5 } }, history.spells[1]!],
    [history.spells[1]!, history.spells[1]!],
  ]) {
    expect(validatePlayerPopulation({ ...s, squad: [{ ...returned, clubHistory: { ...history, spells } }, ...s.squad.slice(1)] })).not.toBeNull();
  }
});

it('archives cannot collide, carry future retirement dates, open spells or malformed progression', () => {
  const s = careerFixture(); const p = s.squad[0]!;
  const archived = archiveRetirees({ ...s, squad: s.squad.slice(1) }, [p], s);
  for (const patch of [
    { id: s.squad[1]!.id }, { retiredAt: { season: 2, week: 1 } }, { retiredAt: { season: 1, week: 0 } },
    { clubHistory: p.clubHistory }, { xp: -1 }, { level: 0 }, { unspentPoints: 1.5 }, { stats: {} }, { ceilings: {} }, { traits: [{ id: 'made-up', level: 1 }] },
  ]) {
    const invalid = { ...archived, playerPopulation: { ...archived.playerPopulation, retired: [{ ...archived.playerPopulation.retired[0]!, ...patch }] } } as GameState;
    expect(migrateState(invalid).ok).toBe(false);
  }
});
