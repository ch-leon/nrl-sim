import { afterEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, setState, SAVE_VERSION } from '../../src/core/state';
import { migrateState, MIGRATIONS, LAST_PRE_FINANCE_VERSION, __setStorage, __unlockSaves, installImportedSave, loadSlot, exportOriginalSave } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearTickHooks, registerTickHook, resumeWeek, weekHeld } from '../../src/core/time';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { structuralAdvanceProblem } from '../../src/systems/competitionCalendar';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { competitions, progress } from '../data/leagueCareerFixtures';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
afterEach(() => {__setStorage(null); setCareerNamespace(null); clearHeldWeek(); clearTickHooks();});
describe('v31 additive progression save boundary', () => {
  it('introduces progression at v31 without moving the pre-finance cutoff', () => {
    expect(MIGRATIONS.find(m => m.from === 30)?.to).toBe(31);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(31); expect(LAST_PRE_FINANCE_VERSION).toBe(27);
  });
  it('migrates normal v30 bytes without constructing or inferring progression', () => {
    createNewGame('Existing', 30); const old = {...clone(getState()), version: 30}; const original = JSON.stringify(old);
    const result = migrateState(old); expect(result).toMatchObject({ok: true, repairs: [], state: {...old, version: SAVE_VERSION}});
    expect(JSON.stringify(old)).toBe(original);
    if (!result.ok) throw new Error(result.message);
    expect(result.state.competitions).toBeUndefined();
    expect(migrateState(result.state)).toMatchObject({ok: true, state: result.state});
  });
  it('does not admit a marker under an old stamp or authorise normal structural imports', () => {
    createNewGame('Existing', 30); const state = clone(getState());
    const c = competitions(1, false); c.leagueCareer = progress();
    const bad = {...state, version: 30, competitions: c}; const bytes = new Map([[slotKey(1), JSON.stringify(bad)]]); const original = bytes.get(slotKey(1));
    __setStorage({getItem: k => bytes.get(k) ?? null, setItem: (k,v) => {bytes.set(k,v);}, removeItem: k => {bytes.delete(k);}}); __unlockSaves();
    expect(migrateState(bad).ok).toBe(false);
    expect(installImportedSave(JSON.stringify({...bad, version: 31}), 1).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(original);
    expect(loadSlot(1).status).toBe('corrupt'); expect(exportOriginalSave(1)).toBe(original);
  });
  it('preserves v30 dormant and old DEV worlds without adding a marker', () => {
    setCareerNamespace(DEV_TEST_PREFIX); createNewGame('Existing DEV', 573);
    const dev = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573);
    for (const dormant of [false, true]) {
      const old = {...clone(dev), version: 30};
      if (dormant) { delete old.competitions!.calendar; delete old.competitions!.world; }
      const original = JSON.stringify(old); const result = migrateState(old);
      expect(result).toMatchObject({ok: true, state: {...old, version: SAVE_VERSION}, repairs: []});
      expect(result.ok && result.state.competitions).not.toHaveProperty('leagueCareer');
      expect(JSON.stringify(old)).toBe(original);
    }
  });
  it('refuses any marked load/import and advancement even in DEV for unsupported prototype markers', () => {
    setCareerNamespace(DEV_TEST_PREFIX); createNewGame('Inactive', 573);
    const state = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573);
    state.competitions!.leagueCareer = progress();
    setState(state); const before = JSON.stringify(getState());
    expect(structuralAdvanceProblem(state)).toMatch(/invalid|unsupported/i);
    advanceWeek(); advanceWeeks(3); expect(JSON.stringify(getState())).toBe(before);
    const bytes = new Map([[DEV_TEST_PREFIX + slotKey(1), before]]);
    __setStorage({getItem: k => bytes.get(k) ?? null, setItem: (k,v) => {bytes.set(k,v);}, removeItem: k => {bytes.delete(k);}}); __unlockSaves();
    expect(installImportedSave(before, 1).ok).toBe(false);
    expect(loadSlot(1).status).toBe('corrupt');
    expect(exportOriginalSave(1)).toBe(before);
  });

  it('also refuses malformed markers without a calendar and refuses held continuation', () => {
    createNewGame('Inactive', 7); setState({competitions: {schemaVersion: 1, instances: [], leagueCareer: progress()}});
    const before = JSON.stringify(getState()); advanceWeek(); advanceWeeks(2); expect(JSON.stringify(getState())).toBe(before);
    createNewGame('Held', 7); registerTickHook('hold', 1, ctx => ctx.hold!(), {trials: true}); advanceWeek();
    expect(weekHeld()).toBe(true); setState({competitions: {schemaVersion: 1, instances: [], leagueCareer: progress()}});
    const held = JSON.stringify(getState()); resumeWeek(); expect(JSON.stringify(getState())).toBe(held); expect(weekHeld()).toBe(true);
  });

});
