import { describe, expect, it } from 'vitest';
import { getState } from '../../src/core/state';
import { careerFixture } from '../helpers/playerCareer';
import { capTotals, commitmentProtection, expireEndedDeals, freshCapAccount, freezeSignedTerms, protectAddedDeals, reconcileProtection, relegateCap, reconcileClubProtection } from '../../src/systems/cap';
import { commitmentYears } from '../../src/systems/leagueSelection';
import { migrateState } from '../../src/core/save';
import { validateCurrent } from '../../src/core/saveValidation';

describe('exact signed-term protection', () => {
  const fixture = () => {
    const s = careerFixture();
    const cap = capTotals([], freshCapAccount('local'), 1).cap;
    const ordinary = { ...s.squad[0]!, deal: { salary: cap - 10, startSeason: 1, endSeason: 1 } };
    const protectedPlayer = { ...s.squad[1]!, deal: { salary: 20, startSeason: 1, endSeason: 1, renewal: { salary: 30, startSeason: 2, endSeason: 3 } } };
    const players = [ordinary, protectedPlayer];
    const account = protectAddedDeals(players, freshCapAccount('local'), 1, [protectedPlayer.id]);
    return {s, cap, players, account, protectedPlayer};
  };
  it('covers only the lawful excess and never creates new signing room', () => {
    const {players, account, cap} = fixture();
    expect(commitmentProtection(players, account, 1)).toMatchObject({ committed: cap + 10, protectedAmount: 20, protectedExcess: 10, unprotectedExcess: 0 });
    expect(capTotals(players, account, 1)).toMatchObject({protectedExcess: 10, signingRoom: 0});
    const over = [{...players[0]!, deal: {...players[0]!.deal, salary: cap + 5}}, players[1]!];
    expect(commitmentProtection(over, account, 1).unprotectedExcess).toBe(5);
  });
  it('does not transfer an emergency allowance to a queued renewal or altered deal', () => {
    const {players, account, protectedPlayer} = fixture();
    expect(commitmentYears(players, account, 1)[1]).toMatchObject({protectedAmount: 0});
    expect(expireEndedDeals(players, [], account, 2).capAccount.protectedIds).toEqual([]);
    const changed = players.map(p => p.id === protectedPlayer.id ? {...p, deal: {...p.deal, salary: 21}} : p);
    expect(reconcileProtection(changed, account, 1).protectedIds).toEqual([]);
    expect(reconcileProtection(players.slice(0, 1), account, 1).protectedIds).toEqual([]);
    const {protectedTerms: _terms, ...idsOnly} = account;
    expect(commitmentProtection(players, idsOnly, 1).protectedAmount).toBe(0);
  });
  it('freezes already signed future terms through promotion but not later promises', () => {
    const {players, account, protectedPlayer} = fixture();
    const frozen = freezeSignedTerms(players, account, 1);
    expect(frozen.protectedTerms).toHaveLength(3);
    const next = expireEndedDeals(players, [], frozen, 2);
    expect(commitmentProtection(next.squad, next.capAccount, 2).protectedAmount).toBe(30);
    const renewed = [{...next.squad[0]!, deal: {...next.squad[0]!.deal!, renewal: {salary: 40, startSeason: 4, endSeason: 4}}}];
    expect(commitmentYears(renewed, next.capAccount, 2).find(y => y.season === 4)).toMatchObject({protectedAmount: 0});
    expect(next.squad[0]!.id).toBe(protectedPlayer.id);
    expect(next.capAccount).toMatchObject({purchasedLevel: account.purchasedLevel, earnedBasisPoints: account.earnedBasisPoints, receipts: account.receipts});
  });
  it('migrates only each observed protected term for player and rival without altering finances', () => {
    const s = careerFixture();
    const rival = s.league.clubs.find(c => c.squad)!;
    s.capAccount.protectedIds = [s.squad[0]!.id];
    rival.capAccount!.protectedIds = [rival.squad![0]!.id];
    const {competitionRewards: _, ...old} = s;
    const raw = {...old, version: 30};
    const before = structuredClone(raw);
    const result = migrateState(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.capAccount.protectedTerms).toEqual([{playerId: s.squad[0]!.id, salary: s.squad[0]!.deal!.salary, startSeason: s.squad[0]!.deal!.startSeason, endSeason: s.squad[0]!.deal!.endSeason}]);
    expect(result.state.league.clubs.find(c => c.id === rival.id)!.capAccount!.protectedTerms).toHaveLength(1);
    expect(result.state.money).toBe(s.money);
    expect(result.state.squad).toEqual(s.squad);
    expect(raw).toEqual(before);
  });
  it('rejects forged or inconsistent current protection and keeps fresh accounts byte-compatible', () => {
    const {s, players, account} = fixture();
    expect(freshCapAccount('local')).not.toHaveProperty('protectedTerms');
    s.capAccount = protectAddedDeals(s.squad, s.capAccount, 1, []);
    const protectedState = {...s, capAccount: {...s.capAccount, protectedIds: [s.squad[0]!.id], protectedTerms: [{playerId: s.squad[0]!.id, ...s.squad[0]!.deal!}]}};
    expect(validateCurrent(protectedState).ok).toBe(true);
    for (const change of [
      {...protectedState.capAccount, protectedIds: []},
      {...protectedState.capAccount, protectedTerms: undefined},
      {...protectedState.capAccount, protectedTerms: [{...protectedState.capAccount.protectedTerms[0]!, salary: 999999}]},
      {...protectedState.capAccount, protectedTerms: [{...protectedState.capAccount.protectedTerms[0]!, extra: true}]},
      {...protectedState.capAccount, protectedTerms: [...protectedState.capAccount.protectedTerms, ...protectedState.capAccount.protectedTerms]},
    ]) expect(validateCurrent({...protectedState, capAccount: change}).ok).toBe(false);
    expect(account.protectedTerms?.length).toBe(1);
    expect(players[0]!.deal.salary).toBeGreaterThan(0);
  });
  it('preserves an observed leaked current renewal only through that exact agreement', () => {
    const s = careerFixture();
    const p = s.squad[0]!;
    const renewal = {salary: 1234, startSeason: 2, endSeason: 3};
    const {competitionRewards: _, ...old} = s;
    const raw = {...old, version: 30, season: 2,
      squad: s.squad.map(x => x.id === p.id ? {...x, deal: {salary: 1000, startSeason: 1, endSeason: 1, renewal}} : x),
      capAccount: {...s.capAccount, protectedIds: [p.id]}};
    const result = migrateState(raw);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.state.capAccount.protectedTerms).toEqual([{playerId: p.id, ...renewal}]);
    const next = expireEndedDeals(result.state.squad, [], result.state.capAccount, 2);
    expect(commitmentProtection(next.squad, next.capAccount, 3).protectedAmount).toBe(1234);
    expect(commitmentProtection(next.squad.map(x => x.id === p.id ? {...x, deal: {salary: 1234, startSeason: 4, endSeason: 4}} : x), next.capAccount, 4).protectedAmount).toBe(0);
  });
  it('keeps cap upgrades, earned additions, receipts and cash through involuntary protection', () => {
    const {s, players, account} = fixture();
    const upgraded = {...account, purchasedLevel: 2 as const, lastPurchaseSeason: 1, earnedBasisPoints: 500 as const, receipts: ['earned:1']};
    const before = structuredClone({players, upgraded, money: s.money});
    const frozen = freezeSignedTerms(players, upgraded, 1);
    expect(frozen).toMatchObject({purchasedLevel: 2, lastPurchaseSeason: 1, earnedBasisPoints: 500, receipts: ['earned:1']});
    expect(players).toEqual(before.players); expect(upgraded).toEqual(before.upgraded); expect(s.money).toBe(before.money);
  });

  it('checks only actual signed seasons even when a one-year term is at the largest safe season', () => {
    const s = careerFixture(); const cap = capTotals([], freshCapAccount('local'), 1).cap;
    const players = [{...s.squad[0]!, deal: {salary: cap + 1, startSeason: Number.MAX_SAFE_INTEGER, endSeason: Number.MAX_SAFE_INTEGER}}];
    const account = relegateCap(players, s.capAccount, 1, 'local');
    expect(account.protectedTerms).toEqual([{playerId: players[0]!.id, ...players[0]!.deal}]);
    expect(commitmentProtection(players, account, Number.MAX_SAFE_INTEGER)).toMatchObject({protectedExcess: 1, unprotectedExcess: 0});
  });
  it('still checks later queued obligations when this season fits the lower cap', () => {
    const s = careerFixture(); const cap = capTotals([], freshCapAccount('local'), 1).cap;
    const players = [{...s.squad[0]!, deal: {salary: 1, startSeason: 1, endSeason: 2,
      renewal: {salary: cap + 1, startSeason: 3, endSeason: 3}}}];
    const account = relegateCap(players, s.capAccount, 1, 'local');
    expect(account.protectedTerms).toHaveLength(2);
    expect(commitmentProtection(players, account, 3)).toMatchObject({protectedExcess: 1, unprotectedExcess: 0});
  });

  it('reconciles every club allowance without changing people, deals, cash or the store', () => {
    const s = careerFixture(); const rival = s.league.clubs.find(c => c.squad)!;
    s.capAccount = freezeSignedTerms(s.squad, s.capAccount, 1);
    rival.capAccount = freezeSignedTerms(rival.squad!, rival.capAccount!, 1);
    const input = {...s, season: 4}; const before = structuredClone(input); const stored = getState();
    const next = reconcileClubProtection(input);
    expect(next.capAccount).toEqual({...input.capAccount, protectedTerms: [], protectedIds: []});
    expect(next.league.clubs.find(c => c.id === rival.id)!.capAccount).toEqual({...rival.capAccount, protectedTerms: [], protectedIds: []});
    expect({...next, capAccount: input.capAccount, league: input.league}).toEqual(input);
    for (const club of next.league.clubs) {
      const prior = input.league.clubs.find(c => c.id === club.id)!;
      expect({...club, capAccount: prior.capAccount}).toEqual({...prior, capAccount: prior.capAccount});
    }
    expect(input).toEqual(before); expect(getState()).toBe(stored);
    const fresh = careerFixture(); expect(reconcileClubProtection(fresh)).toBe(fresh);
  });

});
