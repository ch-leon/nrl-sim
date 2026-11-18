import { describe, expect, it } from 'vitest';
import { careerFixture } from '../helpers/playerCareer';
import { getState } from '../../src/core/state';
import { agePlayerPopulation } from '../../src/systems/aging';
import { expirePlayerDeals } from '../../src/systems/economy';
import { applyAnnualYouth } from '../../src/systems/youth';
import { rolloverRivalPopulation, rolloverRivalPopulationChecked } from '../../src/systems/rivals';
import { expireEndedDeals, freezeSignedTerms } from '../../src/systems/cap';
import { makeRng } from '../../src/utils/rng';
import { bus } from '../../src/core/events';

describe('annual population owners', () => {
  it('expires before ageing, archives the actual people and returns only own notices without store writes', () => {
    const state = careerFixture();
    const input = {...state, season: 2, week: 1, squad: state.squad.map((p, i) => ({...p, age: i < 2 ? 37 : 22,
      deal: {...p.deal!, endSeason: i === 0 ? 1 : 2}}))};
    input.capAccount = freezeSignedTerms(input.squad, input.capAccount, 2);
    const before = structuredClone(input); const stored = getState(); const notices: unknown[] = [];
    const off = bus.on('ui:notify', n => notices.push(n));
    const expired = expirePlayerDeals(input);
    expect(expired.state.squad).toEqual(expireEndedDeals(input.squad, input.freeAgents, input.capAccount, 2).squad);
    expect(expired.notices).toHaveLength(1);
    const aged = agePlayerPopulation(expired.state);
    const archived = aged.state.playerPopulation.retired;
    expect(archived.find(p => p.id === input.squad[0]!.id)?.clubHistory.spells.slice(-1)[0]?.departure).toBe('expiry');
    expect(archived.find(p => p.id === input.squad[1]!.id)?.clubHistory.spells.slice(-1)[0]?.departure).toBe('retirement');
    expect(aged.state.capAccount.protectedTerms?.some(t => t.playerId === input.squad[1]!.id)).toBe(false);
    expect(aged.notices).toHaveLength(1);
    expect(aged.notices[0]!.text).toContain(input.squad[1]!.name);
    expect(input).toEqual(before); expect(getState()).toBe(stored); expect(notices).toEqual([]); off();
  });
  it('runs youth once, uses only real annual vacancies and does not advance the primary RNG', () => {
    const state = careerFixture();
    const input = {...state, season: 2, week: 1, squad: state.squad.slice(0, 8)};
    const before = structuredClone(input);
    const youth = applyAnnualYouth(input, 26);
    expect(youth.ok).toBe(true); if (!youth.ok) return;
    expect(youth.state.squad).toEqual(input.squad);
    expect(youth.state.freeAgents.length - input.freeAgents.length).toBe(3);
    expect(youth.state.rngSeed).toBe(input.rngSeed);
    expect(youth.state.playerPopulation.lastAcademyIntakeSeason).toBe(2);
    expect(applyAnnualYouth(youth.state)).toEqual({ok: true, state: youth.state, notices: []});
    expect(input).toEqual(before);
  });
  it('rejects the complete youth candidate if emergency birth admission exhausts IDs', () => {
    const s = careerFixture();
    const input = {...s, season: 2, week: 1, squad: s.squad.slice(0, 8),
      playerPopulation: {...s.playerPopulation, nextPlayerOrdinal: Number.MAX_SAFE_INTEGER - 4}};
    // An expiring player supplies a genuine vacancy; ordinary intake fits but
    // the scholarship cannot get a durable ID, so neither batch can commit.
    const expired = expirePlayerDeals({...input, squad: [...input.squad, {...s.squad[8]!, deal: {...s.squad[8]!.deal!, endSeason: 1}}]}).state;
    const before = structuredClone(expired);
    const youth = applyAnnualYouth(expired);
    expect(youth).toMatchObject({ok: false, state: expired, notices: []});
    expect(expired).toEqual(before);
  });
  it('reports rival market admission exhaustion and preserves input, store and primary RNG', () => {
    const s = careerFixture();
    const input = {...s, season: 2, freeAgents: [], league: {...s.league, clubs: s.league.clubs.filter(c => c.id === s.clubId)}, playerPopulation: {...s.playerPopulation, nextPlayerOrdinal: Number.MAX_SAFE_INTEGER - 1}};
    const before = structuredClone(input); const stored = getState(); const rng = makeRng(123); const seed = rng.state();
    const result = rolloverRivalPopulationChecked(input, rng);
    expect(result).toMatchObject({ok: false, state: input, notices: [], error: 'Unsigned market birth admission failed'});
    expect(input).toEqual(before); expect(getState()).toBe(stored); expect(input.rngSeed).toBe(s.rngSeed);
    expect(rng.state()).toBe(seed);
  });
  it('matches legacy rival outcomes and preserves its caller RNG continuation', () => {
    const s = careerFixture();
    const input = {...s, season: 2}; const before = structuredClone(input);
    const checkedRng = makeRng(456); const legacyRng = makeRng(456);
    const checked = rolloverRivalPopulationChecked(input, checkedRng);
    expect(checked.ok).toBe(true); if (!checked.ok) return;
    const legacy = rolloverRivalPopulation(input, legacyRng);
    expect(legacy).toEqual(checked.state);
    expect(legacyRng.state()).toBe(checked.rngSeed);
    expect(legacyRng.state()).not.toBe(456);
    expect(legacyRng.next()).toBe(makeRng(checked.rngSeed).next());
    expect(checkedRng.state()).toBe(456); expect(input).toEqual(before);
  });
  it('uses the supplied annual interval for a genuine scholarship and never repeats its receipt', () => {
    const s = careerFixture();
    const lost = s.squad[0]!;
    const input = {...s, season: 2, week: 1, squad: s.squad.slice(0, 13).map((p, i) => ({...p,
      deal: {salary: 1000, startSeason: 1, endSeason: i === 0 ? 1 : 3}}))};
    const expired = expirePlayerDeals(input).state;
    const youth = applyAnnualYouth(expired, 26);
    expect(youth.ok).toBe(true); if (!youth.ok) return;
    expect(youth.state.squad.filter(p => p.emergencyForPlayerId === lost.id)).toHaveLength(1);
    expect(youth.state.squad.find(p => p.emergencyForPlayerId === lost.id)?.contractWeeks).toBe(26);
    expect(applyAnnualYouth(youth.state, 26).state).toBe(youth.state);
  });

  it('rejects ordinary youth birth admission without changing state or intake receipts', () => {
    const s = careerFixture();
    const input = {...s, season: 2, playerPopulation: {...s.playerPopulation, nextPlayerOrdinal: Number.MAX_SAFE_INTEGER - 1}};
    const before = structuredClone(input);
    expect(applyAnnualYouth(input)).toMatchObject({ok: false, state: input, error: 'Academy birth admission failed', notices: []});
    expect(input).toEqual(before);
  });
  it('rejects rival emergency birth admission atomically before any market intake', () => {
    const s = careerFixture();
    const input = {...s, season: 2, freeAgents: [], playerPopulation: {...s.playerPopulation, nextPlayerOrdinal: Number.MAX_SAFE_INTEGER - 1},
      league: {...s.league, clubs: s.league.clubs.map(c => c.squad ? {...c, squad: c.squad.map(p => ({...p, age: 37}))} : c)}};
    const before = structuredClone(input); const rng = makeRng(234);
    expect(rolloverRivalPopulationChecked(input, rng)).toMatchObject({ok: false, state: input, notices: [], error: 'Rival emergency birth admission failed'});
    expect(input).toEqual(before); expect(rng.state()).toBe(234);
  });

  it('uses the supplied season interval when activating an already signed renewal', () => {
    const s = careerFixture(); const p = s.squad[0]!;
    const input = {...s, season: 2, squad: [{...p, deal: {salary: 1000, startSeason: 1, endSeason: 1,
      renewal: {salary: 2000, startSeason: 2, endSeason: 3}}}]};
    expect(expirePlayerDeals(input, 25).state.squad[0]!.contractWeeks).toBe(50);
    expect(expirePlayerDeals(input).state.squad[0]!.contractWeeks).toBe(54);
  });

});
