import { describe, expect, it } from 'vitest';
import { allocateLeagueFields, commitmentYears, leagueAccessFromClose, leagueCommitmentPreview } from '../../src/systems/leagueSelection';
import { leagueCloseFacts } from '../../src/data/leagueCareer';
import { freshCapAccount, publishedCap } from '../../src/systems/cap';
import { competitions, progress, profile, fields } from '../data/leagueCareerFixtures';

function source() { const c = competitions(); return {c, close: leagueCloseFacts(c.world!, c.instances, 1)}; }
describe('permanent factual league access', () => {
  it('unions only a real finals title, never auto-moves or duplicates and survives renamed leagues', () => {
    const {c, close} = source(); const original = JSON.stringify({c, close});
    const unlocked = leagueAccessFromClose(progress(), close, c.world!, c.instances);
    expect(unlocked.map(a => a.leagueId)).toEqual(profile.divisions.slice(0, 2).map(d => d.id));
    expect(leagueAccessFromClose({...progress(), access: unlocked}, close, c.world!, c.instances)).toEqual(unlocked);
    c.world!.divisions.forEach(d => { d.name = 'Renamed'; });
    expect(leagueAccessFromClose(progress(), close, c.world!, c.instances)).toEqual(unlocked);
    expect(JSON.stringify({c: {...c, world: {...c.world!, divisions: profile.divisions.map((d, i) => ({...c.world!.divisions[i]!, name: d.name}))}}, close})).toBe(original);
  });
  it.each(['loss', 'minor-only', 'withdrawn', 'missing-final', 'top-title'] as const)('grants nothing for %s and keeps existing access', fault => {
    const {c, close} = source(); const league = c.instances[0]!;
    if (fault === 'loss') { league.winnerId = league.entrantIds.find(id => id !== 'player')!; }
    if (fault === 'minor-only') { delete close.leagues[0]!.championId; delete close.leagues[0]!.finalFixtureId; }
    if (fault === 'withdrawn') league.status = 'withdrawn';
    if (fault === 'missing-final') league.fixtures.pop();
    if (fault === 'top-title') { close.leagues[0]!.leagueId = profile.divisions[2]!.id; }
    expect(leagueAccessFromClose(progress(), close, c.world!, c.instances)).toEqual(progress().access);
  });
});
describe('original-field adjacent vacancy allocation', () => {
  it.each([0, 1, 2])('moves to rank %i through original AI fields only', rank => {
    const {c, close} = source(); const before = JSON.stringify({c, close});
    const allocation = allocateLeagueFields(c.world!, close, 'player', profile.divisions[rank]!.id, c.instances);
    expect(allocation.fields[profile.divisions[rank]!.id]).toContain('player');
    expect(Object.values(allocation.fields).flat().sort()).toEqual(Object.values(fields).flat().sort());
    expect(new Set(Object.values(allocation.fields).flat()).size).toBe(6);
    expect(Object.values(allocation.fields).every(f => f.length === 2)).toBe(true);
    expect(allocation.movements).toHaveLength(rank ? rank + 1 : 0);
    expect(JSON.stringify({c, close})).toBe(before);
    if (rank === 0) expect(allocation.fields).toEqual(fields);
  });
  it('uses highest lower AI for a two-tier downward choice with stable ID ties and shuffled registry', () => {
    const {c, close} = source();
    const local = close.leagues[0]!, top = close.leagues[2]!;
    const other = top.standings[0]!.clubId;
    local.standings.find(s => s.clubId === 'player')!.clubId = other;
    top.standings[0]!.clubId = 'player';
    c.instances[0]!.entrantIds = local.standings.map(s => s.clubId); c.instances[2]!.entrantIds = top.standings.map(s => s.clubId);
    close.leagues.forEach(l => l.standings.forEach(s => {s.position = 1;}));
    const allocation = allocateLeagueFields(c.world!, close, 'player', local.leagueId, c.instances);
    const expectedLocal = [...local.standings].sort((a,b) => a.clubId.localeCompare(b.clubId))[0]!.clubId;
    expect(allocation.movements).toContainEqual({clubId: expectedLocal, fromLeagueId: local.leagueId, toLeagueId: close.leagues[1]!.leagueId});
    expect(allocateLeagueFields({...c.world!, divisions: [...c.world!.divisions].reverse()}, {...close, leagues: [...close.leagues].reverse()}, 'player', local.leagueId, c.instances)).toEqual(allocation);
    expect(Object.values(allocation.fields).flat().sort()).toEqual(Object.values(fields).flat().sort());
  });

  it('uses published frozen standings before alphabetical ID when the sporting table is tied', () => {
    const {c} = source(); const middle = c.instances[1]!;
    middle.tieOrder = [...middle.entrantIds].sort();
    const close = leagueCloseFacts(c.world!, c.instances, 1);
    const allocation = allocateLeagueFields(c.world!, close, 'player', profile.divisions[1]!.id, c.instances);
    const lowest = middle.tieOrder[1]!;
    expect(lowest).toBe([...middle.entrantIds].sort()[middle.entrantIds.length - 1]);
    expect(lowest).not.toBe([...middle.entrantIds].sort()[0]);
    expect(allocation.movements).toContainEqual({clubId: lowest, fromLeagueId: profile.divisions[1]!.id, toLeagueId: profile.startingDivisionId});
  });

  it('records the exact two-tier upward vacancy chain from distinct standings', () => {
    const {c, close} = source();
    close.leagues[1]!.standings = [{clubId: 'rival-wolves', position: 1}, {clubId: 'rival-thunder', position: 2}];
    close.leagues[2]!.standings = [{clubId: 'rival-brumbies', position: 1}, {clubId: 'rival-cyclones', position: 2}];
    expect(allocateLeagueFields(c.world!, close, 'player', 'au-premier', c.instances).movements).toEqual([
      {clubId: 'player', fromLeagueId: 'au-local', toLeagueId: 'au-premier'},
      {clubId: 'rival-thunder', fromLeagueId: 'au-championship', toLeagueId: 'au-local'},
      {clubId: 'rival-cyclones', fromLeagueId: 'au-premier', toLeagueId: 'au-championship'},
    ]);
  });
  it('records the exact two-tier downward chain, choosing sporting leaders over first alphabetical IDs', () => {
    const {c, close} = source();
    close.leagues[0]!.standings = [{clubId: 'rival-reapers', position: 1}, {clubId: 'rival-cyclones', position: 2}];
    close.leagues[1]!.standings = [{clubId: 'rival-wolves', position: 1}, {clubId: 'rival-thunder', position: 2}];
    close.leagues[2]!.standings = [{clubId: 'player', position: 1}, {clubId: 'rival-brumbies', position: 2}];
    c.instances[0]!.entrantIds = ['rival-reapers', 'rival-cyclones']; c.instances[2]!.entrantIds = ['player', 'rival-brumbies'];
    expect(allocateLeagueFields(c.world!, close, 'player', 'au-local', c.instances).movements).toEqual([
      {clubId: 'player', fromLeagueId: 'au-premier', toLeagueId: 'au-local'},
      {clubId: 'rival-wolves', fromLeagueId: 'au-championship', toLeagueId: 'au-premier'},
      {clubId: 'rival-reapers', fromLeagueId: 'au-local', toLeagueId: 'au-championship'},
    ]);
  });
  it('rejects foreign destinations and duplicate original membership', () => {
    const {c, close} = source();
    expect(() => allocateLeagueFields(c.world!, close, 'player', 'missing', c.instances)).toThrow();
    close.leagues[1]!.standings[0]!.clubId = 'player';
    expect(() => allocateLeagueFields(c.world!, close, 'player', profile.startingDivisionId, c.instances)).toThrow();
  });
});
describe('all covered signed obligations', () => {
  it('includes every target year through the last renewal with exact-cap and later excess', () => {
    const account = {...freshCapAccount('local'), purchasedLevel: 1 as const, earnedBasisPoints: 500 as const};
    const cap = publishedCap(account);
    const players = [{deal: {salary: cap, startSeason: 2, endSeason: 3, renewal: {salary: cap + 1, startSeason: 4, endSeason: 4}}}];
    expect(commitmentYears(players, account, 2)).toEqual([
      {season: 2, committed: cap, cap, protectionBasis: 'deferred', protectedAmount: 0, unprotectedExcess: 0},
      {season: 3, committed: cap, cap, protectionBasis: 'deferred', protectedAmount: 0, unprotectedExcess: 0},
      {season: 4, committed: cap + 1, cap, protectionBasis: 'deferred', protectedAmount: 0, unprotectedExcess: 1},
    ]);
    expect(commitmentYears([], account, 5)).toEqual([{season: 5, committed: 0, cap, protectionBasis: 'deferred', protectedAmount: 0, unprotectedExcess: 0}]);
  });
  it('discloses lower-cap pending policy and preserves purchased/earned basis without granting protection', () => {
    const account = {...freshCapAccount('premier'), purchasedLevel: 2 as const, earnedBasisPoints: 1000 as const, protectedIds: ['p']};
    const players = [{id: 'p', deal: {salary: 999999, startSeason: 1, endSeason: 3}}];
    const before = JSON.stringify({account,players}); const preview = leagueCommitmentPreview(players, account, 2, 0);
    expect(preview.policyPendingReason).toMatch(/voluntary lower-cap/i);
    expect(preview.cap).toBe(publishedCap({...account, tier: 'local'}));
    expect(preview.purchasedAddition + preview.earnedAddition + preview.baseCap).toBe(preview.cap);
    expect(preview.years.every(y => y.protectedAmount === 0 && y.unprotectedExcess > 0)).toBe(true);
    expect(JSON.stringify({account,players})).toBe(before);
  });
  it('rejects unsupported future base terms before enumeration without changing inputs', () => {
    const players = [{deal: {salary: 100, startSeason: 1_000_000_000, endSeason: 1_000_000_002}}];
    const before = JSON.stringify(players);
    expect(() => commitmentYears(players, freshCapAccount('local'), 2)).toThrow(/future base commitment/i);
    expect(JSON.stringify(players)).toBe(before);
  });
  it('allows a lower cap when every signed year fits without a pending-policy blocker', () => {
    expect(leagueCommitmentPreview([{deal: {salary: 100, startSeason: 1, endSeason: 3}}], freshCapAccount('premier'), 2, 0).policyPendingReason).toBeUndefined();
  });

});
