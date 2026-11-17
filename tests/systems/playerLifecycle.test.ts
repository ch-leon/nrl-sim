import { beforeEach, expect, it } from 'vitest';
import { careerFixture } from '../helpers/playerCareer';
import { getState, loadState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { signPlayer, releasePlayer, signingFee } from '../../src/systems/freeagency';
import { signWithUndo, undoNow, commitUndo } from '../../src/systems/undo';
import { renewEarly } from '../../src/systems/contracts';
import { expireEndedDeals } from '../../src/systems/cap';
import { validatePlayerPopulation } from '../../src/systems/playerCareer';
import { registerFinanceSystem } from '../../src/systems/economy';
beforeEach(() => { bus.clear(); commitUndo(); careerFixture(); });
it('signs and releases atomically with truthful histories and booked money', () => {
  loadState({ ...getState(), money: 1_000_000 });
  registerFinanceSystem();
  const before = getState(), who = before.freeAgents[0]!, fee = signingFee(before, who);
  const snapshots: string[] = [];
  bus.on('state:changed', () => { const s = getState(); snapshots.push(validatePlayerPopulation(s) ?? 'valid');
    if (s.squad.some(p => p.id === who.id)) expect(s.finance[0]!.transfers).toBe(-fee); });
  expect(signPlayer(getState(), who.id).ok).toBe(true);
  expect(getState().squad.find(p => p.id === who.id)!.clubHistory!.spells.slice(-1)[0]).toMatchObject({ clubId: 'player', arrival: 'signing' });
  bus.clear();
  expect(releasePlayer(getState(), who.id).ok).toBe(true);
  const released = getState().freeAgents.find(p => p.id === who.id)!;
  expect(released.clubHistory!.spells.slice(-1)[0]).toMatchObject({ departure: 'release', end: { season: 1, week: 1 } });
  expect(validatePlayerPopulation(getState())).toBeNull();
  expect(snapshots.every(x => x === 'valid')).toBe(true);
});
it('undo restores exact unsigned history and shortlist; renewal prevents undo', () => {
  loadState({ ...getState(), money: 1_000_000 });
  const before = getState(), who = before.freeAgents[0]!;
  expect(signWithUndo(who.id).ok).toBe(true);
  expect(undoNow()).toBe(true);
  expect(getState().freeAgents.find(p => p.id === who.id)).toEqual(who);
  expect(getState().playerPopulation.shortlistIds).toEqual(before.playerPopulation.shortlistIds);
  expect(getState().money).toBe(before.money);
  expect(signWithUndo(who.id).ok).toBe(true);
  expect(renewEarly(getState(), who.id).ok).toBe(true);
  expect(undoNow()).toBe(false);
});
it('expiry closes a spell while activating renewal preserves it', () => {
  const s = getState(), one = s.squad[0]!, two = s.squad[1]!;
  const players = [{ ...one, deal: { salary: 1_000, startSeason: 1, endSeason: 1 } },
    { ...two, deal: { salary: 1_000, startSeason: 1, endSeason: 1, renewal: { salary: 2_000, startSeason: 2, endSeason: 2 } } }];
  const next = expireEndedDeals(players, [], s.capAccount, 2);
  expect(next.freeAgents[0]!.clubHistory!.spells.slice(-1)[0]).toMatchObject({ departure: 'expiry', end: { season: 2, week: 1 } });
  expect(next.squad[0]!.clubHistory).toEqual(two.clubHistory);
});

import { clearSeasonHooks, clearTickHooks, advanceWeeks } from '../../src/core/time';
import { registerAgingSystem } from '../../src/systems/aging';
import { registerYouthSystem, callUpJuniors } from '../../src/systems/youth';
import { WEEKS_PER_SEASON } from '../../src/config';
import { makeRng } from '../../src/utils/rng';
it('archives retirees and retains older unsigned Academy people across annual intakes', () => {
  clearSeasonHooks(); clearTickHooks(); registerAgingSystem(); registerYouthSystem();
  const s = getState(), retiree = s.squad[0]!, unsigned = s.freeAgents[0]!;
  loadState({ ...s, week: WEEKS_PER_SEASON, preseason: 0,
    squad: s.squad.map(p => p.id === retiree.id ? { ...p, age: 37 } : p),
    freeAgents: s.freeAgents.map(p => p.id === unsigned.id ? { ...p, junior: true } : p) });
  advanceWeeks(1);
  expect(getState().playerPopulation.retired.find(p => p.id === retiree.id)?.age).toBe(38);
  expect(getState().freeAgents.find(p => p.id === unsigned.id)?.age).toBe(unsigned.age + 1);
  expect(validatePlayerPopulation(getState())).toBeNull();
  clearSeasonHooks(); clearTickHooks();
});
it('injuries and bans never create new people', () => {
  const s = getState();
  expect(callUpJuniors(makeRng(1), s.squad.map(p => ({ ...p, injuredWeeks: 9, suspendedWeeks: 9 })), 3, 1, 10)).toEqual([]);
});

import { rolloverRivalPopulation, rivalSigningTick } from '../../src/systems/rivals';
import { registerEconomySystem } from '../../src/systems/economy';
import { registerFixturesSystem } from '../../src/systems/fixtures';
import { importSave } from '../../src/core/save';
it('ages expired players once and archives rival retirees with reloadable minimum repairs', () => {
  clearSeasonHooks(); clearTickHooks();
  registerEconomySystem(); registerAgingSystem(); registerYouthSystem(); registerFixturesSystem();
  const s = getState(), expiring = s.squad[0]!, rival = s.league.clubs.find(c => c.squad)!, retiree = rival.squad![0]!;
  loadState({ ...s, week: WEEKS_PER_SEASON, preseason: 0, squad: s.squad.map(p => p.id === expiring.id ? { ...p, age: 24, deal: { salary: 1_000, startSeason: 1, endSeason: 1 } } : p),
    league: { ...s.league, clubs: s.league.clubs.map(c => c.id === rival.id ? { ...c, squad: c.squad!.map(p => ({ ...p, age: 37 })) } : c) } });
  advanceWeeks(1);
  const after = getState();
  const found = [...after.squad, ...after.freeAgents, ...after.league.clubs.flatMap(c => c.squad ?? [])].find(p => p.id === expiring.id)!;
  expect(found.age).toBe(25);
  expect(after.playerPopulation.retired.find(p => p.id === retiree.id)?.clubHistory.spells.slice(-1)[0]).toMatchObject({ departure: 'retirement' });
  expect(validatePlayerPopulation(after)).toBeNull();
  expect(importSave(JSON.stringify(after)).ok).toBe(true);
  clearSeasonHooks(); clearTickHooks();
});
it('weekly rival signings preserve histories and a current unsigned shortlist', () => {
  const s = getState(), club = s.league.clubs.find(c => c.squad)!;
  const base = { ...club, cash: 1_000_000, squad: club.squad!.slice(0, 13).map(p => ({ ...p, stats: { speed: 10, strength: 10, stamina: 10, handling: 10, kicking: 10, footyIQ: 10 }, deal: { salary: 100, startSeason: 1, endSeason: 1 } })) };
  let result = rivalSigningTick([base], s.freeAgents, makeRng(1));
  for (let seed = 2; !result.signed.length && seed < 30; seed++) result = rivalSigningTick([base], s.freeAgents, makeRng(seed));
  expect(result.signed).toHaveLength(1);
  const signed = result.clubs[0]!.squad!.find(p => p.id === result.signed[0]!.playerId)!;
  expect(signed.clubHistory!.spells.slice(-1)[0]).toMatchObject({ clubId: club.id, arrival: 'signing' });
  expect(result.freeAgents.some(p => p.id === signed.id)).toBe(false);
});
it('rollover does not manufacture a replacement for a preexisting voluntary shortfall', () => {
  const s = getState(), club = s.league.clubs.find(c => c.squad)!;
  const short = { ...club, cash: 0, squad: club.squad!.slice(0, 12).map(p => ({ ...p, age: 25 })) };
  const next = rolloverRivalPopulation({ ...s, season: 2, freeAgents: [], playerPopulation: { ...s.playerPopulation, shortlistIds: [] }, league: { ...s.league, clubs: s.league.clubs.map(c => c.id === club.id ? short : c) } }, makeRng(9));
  expect(next.league.clubs.find(c => c.id === club.id)!.squad).toHaveLength(12);
});

import { commitment, publishedCap, salaryDemand } from '../../src/systems/cap';
import { rolloverRivals } from '../../src/systems/rivals';
it('reserves every queued rival promise before making discretionary renewals', () => {
  const s = getState(), club = s.league.clubs.find(c => c.squad)!;
  const cap = publishedCap(club.capAccount!);
  const queuedSalary = 100_000;
  const currentTotal = cap - queuedSalary - 1_000;
  const current = club.squad!.slice(0, 13).map((p, i) => ({ ...p, age: 25,
    deal: { salary: Math.floor(currentTotal / 13) + (i === 0 ? currentTotal % 13 : 0), startSeason: 1, endSeason: 3 } }));
  const higher = { ...club.squad![13]!, age: 25, stats: { speed: 70, strength: 70, stamina: 70, handling: 70, kicking: 70, footyIQ: 70 },
    deal: { salary: 1_000, startSeason: 1, endSeason: 1 } };
  const queued = { ...club.squad![14]!, age: 25, stats: { speed: 10, strength: 10, stamina: 10, handling: 10, kicking: 10, footyIQ: 10 },
    deal: { salary: 1_000, startSeason: 1, endSeason: 1, renewal: { salary: queuedSalary, startSeason: 2, endSeason: 2 } } };
  expect(salaryDemand(higher)).toBeGreaterThan(1_000);
  for (const endings of [[higher, queued], [queued, higher]]) {
    const result = rolloverRivals([{ ...club, cash: 0, squad: [...current, ...endings] }], makeRng(42), s.clubId, 2);
    const next = result.clubs[0]!;
    expect(commitment(next.squad!, 2)).toBe(cap - 1_000);
    expect(next.squad!.find(p => p.id === queued.id)?.deal).toEqual(queued.deal.renewal);
    expect(next.squad!.some(p => p.id === higher.id)).toBe(false);
    expect(result.freeAgents.some(p => p.id === higher.id)).toBe(true);
    expect(next.capAccount!.protectedIds).toEqual([]);
  }
});
it('repairs one expiry vacancy even when that unsigned player retires in the same rollover', () => {
  clearSeasonHooks(); clearTickHooks();
  registerEconomySystem(); registerAgingSystem(); registerYouthSystem();
  const s = getState(), lost = s.squad[0]!;
  const squad = s.squad.slice(0, 13).map((p, i) => ({ ...p, age: i === 0 ? 37 : 25,
    deal: { salary: 1_000, startSeason: 1, endSeason: i === 0 ? 1 : 3 } }));
  loadState({ ...s, squad, preseason: 0, week: WEEKS_PER_SEASON });
  advanceWeeks(1);
  const after = getState();
  const archived = after.playerPopulation.retired.find(p => p.id === lost.id)!;
  expect(archived.age).toBe(38);
  expect(archived.clubHistory.spells.slice(-1)[0]).toMatchObject({ departure: 'expiry', end: { season: 2, week: 1 } });
  expect(after.squad).toHaveLength(13);
  const scholarship = after.squad.filter(p => p.emergencyForPlayerId === lost.id);
  expect(scholarship).toHaveLength(1);
  expect(scholarship[0]!.emergencyDealEndSeason).toBe(2);
  expect(validatePlayerPopulation(after)).toBeNull();
  expect(importSave(JSON.stringify(after)).ok).toBe(true);
  clearSeasonHooks(); clearTickHooks();
});
