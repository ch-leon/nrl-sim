import { afterEach, describe, expect, it } from 'vitest';
import { createNewGame, SAVE_VERSION } from '../../src/core/state';
import { __setStorage, __unlockSaves, exportOriginalSave, exportRecoverySaves, loadSlot, migrateState, MIGRATIONS, setActiveSlot, writeSlot } from '../../src/core/save';
import { validateCurrent } from '../../src/core/saveValidation';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, slotKey } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { careerFixture } from '../helpers/playerCareer';
import { archiveRetirees } from '../../src/systems/playerCareer';
import { commitmentProtection, expireEndedDeals, freezeSignedTerms } from '../../src/systems/cap';

afterEach(() => { __setStorage(null); setCareerNamespace(null); });

describe('v32 exact protection preserves v31 checkpoints', () => {
  it('keeps v31 as the additive progression format and gives protection its own migration', () => {
    expect(SAVE_VERSION).toBe(32);
    const old = {...careerFixture(), version: 30};
    expect(MIGRATIONS.find(m => m.from === 30)!.run(old)).toEqual(old);
    expect(MIGRATIONS.find(m => m.from === 31)?.to).toBe(32);
  });
  it.each(['normal', 'DEV'] as const)('loads base-shaped %s v31 IDs for player and rival, preserving originals and observed agreements', mode => {
    setCareerNamespace(mode === 'DEV' ? DEV_TEST_PREFIX : null);
    let s = careerFixture();
    if (mode === 'DEV') {
      createNewGame('Existing DEV', 574);
      s = setupStructuralDivisionCareer(AU_CAREER_PROFILE, 574);
    }
    const p = s.squad[0]!; const rival = s.league.clubs.find(c => c.squad)!; const ai = rival.squad![0]!;
    p.deal = {...p.deal!, renewal: {salary: 1234, startSeason: p.deal!.endSeason + 1, endSeason: p.deal!.endSeason + 1}};
    ai.deal = {...ai.deal!, renewal: {salary: 2345, startSeason: ai.deal!.endSeason + 1, endSeason: ai.deal!.endSeason + 1}};
    s.capAccount.protectedIds = [p.id]; rival.capAccount!.protectedIds = [ai.id];
    const raw = {...s, version: 31}; const original = JSON.stringify(raw);
    const key = (mode === 'DEV' ? DEV_TEST_PREFIX : '') + slotKey(1);
    const bytes = new Map([[key, original]]);
    __setStorage({getItem: k => bytes.get(k) ?? null, setItem: (k,v) => {bytes.set(k,v);}, removeItem: k => {bytes.delete(k);}});
    __unlockSaves(); setActiveSlot(1);
    const loaded = loadSlot(1);
    expect(loaded.status).toBe('ok'); if (loaded.status !== 'ok') throw Error(JSON.stringify(loaded));
    const state = loaded.state;
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.capAccount.protectedTerms).toEqual([{playerId: p.id, salary: p.deal.salary, startSeason: p.deal.startSeason, endSeason: p.deal.endSeason}]);
    const account = state.league.clubs.find(c => c.id === rival.id)!.capAccount!;
    expect(account.protectedTerms).toEqual([{playerId: ai.id, salary: ai.deal.salary, startSeason: ai.deal.startSeason, endSeason: ai.deal.endSeason}]);
    expect(commitmentProtection(state.squad, state.capAccount, p.deal.renewal!.startSeason).protectedAmount).toBe(0);
    expect(commitmentProtection(rival.squad!, account, ai.deal.renewal!.startSeason).protectedAmount).toBe(0);
    expect(state.money).toBe(s.money); expect(state.squad).toEqual(s.squad); expect(state.rngSeed).toBe(s.rngSeed);
    expect(JSON.stringify(raw)).toBe(original); expect(exportOriginalSave(1)).toBe(original); expect(bytes.get(key)).toBe(original);
    expect(writeSlot(1, state)).toBe(true);
    expect(exportRecoverySaves(1)).toContain(original);
    expect(loadSlot(1)).toMatchObject({status: 'ok', state});
  });
  it('drops old departed, retired, expired and unknown protection IDs for both owners', () => {
    let s = {...careerFixture(), season: 2, week: 1};
    const own = s.squad.slice(0, 4); const rival = s.league.clubs.find(c => c.squad)!; const ai = rival.squad!.slice(0, 4);
    const live = (p: typeof own[0]) => ({...p!, deal: {salary: 1000, startSeason: 1, endSeason: 2}});
    const stale = (p: typeof own[0]) => ({...p!, deal: {salary: 1000, startSeason: 1, endSeason: 1}});
    s = {...s, squad: [live(own[0]), stale(own[1]), ...s.squad.slice(4)],
      league: {...s.league, clubs: s.league.clubs.map(c => c.id === rival.id ? {...c, squad: [live(ai[0]), stale(ai[1]), ...c.squad!.slice(4)]} : c)}};
    s = archiveRetirees(s, [own[3]!, ai[3]!], s);
    s.capAccount.protectedIds = [...own.map(p => p.id), 'unknown'];
    s.league.clubs.find(c => c.id === rival.id)!.capAccount!.protectedIds = [...ai.map(p => p.id), 'unknown'];
    const result = migrateState({...s, version: 31});
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.message);
    expect(result.state.capAccount.protectedIds).toEqual([own[0]!.id]);
    expect(result.state.league.clubs.find(c => c.id === rival.id)!.capAccount!.protectedIds).toEqual([ai[0]!.id]);
  });
  it('retains already recorded queued protections and round-trips v32 without re-observing them', () => {
    const s = careerFixture(); const p = s.squad[0]!;
    p.deal = {salary: 1000, startSeason: 1, endSeason: 1, renewal: {salary: 2000, startSeason: 2, endSeason: 2}};
    s.capAccount = freezeSignedTerms(s.squad, s.capAccount, 1);
    const rival = s.league.clubs.find(c => c.squad)!; const ai = rival.squad![0]!;
    ai.deal = {salary: 3000, startSeason: 1, endSeason: 1, renewal: {salary: 4000, startSeason: 2, endSeason: 2}};
    rival.capAccount = freezeSignedTerms(rival.squad!, rival.capAccount!, 1);
    const before = structuredClone(s);
    const result = migrateState({...s, version: 31});
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.message);
    expect(result.state.capAccount).toEqual(before.capAccount);
    expect(result.state.league.clubs.find(c => c.id === rival.id)!.capAccount).toEqual(before.league.clubs.find(c => c.id === rival.id)!.capAccount);
    expect(expireEndedDeals(result.state.squad, [], result.state.capAccount, 2).capAccount.protectedIds).toContain(p.id);
    expect(migrateState(JSON.parse(JSON.stringify(result.state)))).toMatchObject({ok: true, state: result.state, repairs: []});
  });
  it('rejects forged rival protection and expired exact terms at the current format', () => {
    const s = careerFixture(); const rival = s.league.clubs.find(c => c.squad)!;
    rival.capAccount = freezeSignedTerms(rival.squad!, rival.capAccount!, 1);
    rival.capAccount.protectedTerms![0]!.salary++;
    expect(validateCurrent({...s}).ok).toBe(false);
    const current = careerFixture(); const player = current.squad[0]!;
    current.capAccount.protectedIds = [player.id];
    current.capAccount.protectedTerms = [{playerId: player.id, salary: 1000, startSeason: 1, endSeason: 1}];
    player.deal = {salary: 1000, startSeason: 1, endSeason: 1};
    expect(validateCurrent({...current, season: 2}).ok).toBe(false);
  });
});
