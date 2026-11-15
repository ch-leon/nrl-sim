import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createNewGame, getState, loadState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { earnMoney, spendMoney } from '../../src/data/club';
import { FINANCE_STARTING_CASH, FINANCE_TIERS } from '../../src/data/financeRules';
import { bus } from '../../src/core/events';
import {
  __setStorage, __unlockSaves, exportOriginalSave, importSave, installImportedSave, LAST_PRE_FINANCE_VERSION, loadSlot, save, setActiveSlot, writeSlot,
} from '../../src/core/save';
import { slotKey } from '../../src/core/storageKeys';
import { initLeague } from '../../src/systems/fixtures';
import { applyEconomy, registerEconomySystem } from '../../src/systems/economy';
import { advanceWeek, advanceWeeks, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';
import { signPlayer } from '../../src/systems/freeagency';
import { renewEarly } from '../../src/systems/contracts';
import {
  capTotals, commitment, expireEndedDeals, relegateCap, SINGLE_LEAGUE_TIER, tierCap,
} from '../../src/systems/cap';
import { financeSummary } from '../../src/ui/screens/finance';

let bytes: Map<string, string>;
beforeEach(() => {
  bytes = new Map();
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  __unlockSaves();
  setActiveSlot(1);
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { __setStorage(null); bus.clear(); vi.restoreAllMocks(); });

function started(difficulty: 'easy' | 'normal' | 'hard' = 'normal', seed = 7): GameState {
  const state = createNewGame('Cap', seed, { difficulty });
  initLeague(state);
  return getState();
}

describe('fresh careers', () => {
  it.each(['easy', 'normal', 'hard'] as const)('starts %s cash from the finance profile and a legal premier squad', difficulty => {
    const state = started(difficulty, 3);
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.money).toBe(FINANCE_STARTING_CASH[difficulty]);
    expect(state.capAccount).toMatchObject({ tier: SINGLE_LEAGUE_TIER, purchasedLevel: 0, earnedBasisPoints: 0, receipts: [], protectedIds: [] });
    const totals = capTotals(state.squad, state.capAccount, state.season);
    expect(totals.current).toBe(commitment(state.squad, 1));
    expect(totals.current).toBeLessThanOrEqual(totals.cap);
    expect(totals.cap).toBe(FINANCE_TIERS.premier.annualCap);
    expect(state.squad.every(player => player.deal && player.deal.salary > 0 && player.deal.endSeason >= player.deal.startSeason)).toBe(true);
    for (const club of state.league.clubs) {
      if (club.id === 'player') continue;
      expect(club.cash).toBe(60_000);
      expect(commitment(club.squad!, 1)).toBeLessThanOrEqual(tierCap(SINGLE_LEAGUE_TIER));
    }
  });

  it('round-trips a new career through save and import', () => {
    const state = started();
    save(state);
    expect(loadSlot()).toMatchObject({ status: 'ok', state });
    expect(importSave(JSON.stringify(state))).toMatchObject({ ok: true, state });
  });
});

describe('accounting boundaries', () => {
  it('keeps cash movement off the cap and cap movement off the cash', () => {
    const state = started();
    const before = capTotals(state.squad, state.capAccount, state.season);
    const receipts = [...state.capAccount.receipts];
    const salaries = state.squad.map(player => player.deal!.salary);
    earnMoney(12_000, 'gate');
    spendMoney(4_000, 'build:trainingPaddock');
    const after = getState();
    expect(after.money).toBe(state.money + 8_000);
    expect(capTotals(after.squad, after.capAccount, after.season)).toEqual(before);
    expect(after.capAccount.receipts).toEqual(receipts);
    expect(after.squad.map(player => player.deal!.salary)).toEqual(salaries);
    expect(financeSummary(after).capCurrent).toBe(before.current);
    expect(financeSummary(after).capNext).toBe(before.next);
  });

  it('a week does not pay salaries, upkeep or overhead out of the bank', () => {
    const state = started();
    const cash = state.money;
    const cap = capTotals(state.squad, state.capAccount, state.season);
    applyEconomy(state);
    const after = getState();
    expect(after.money).toBeGreaterThanOrEqual(cash);
    expect(capTotals(after.squad, after.capAccount, after.season).current).toBe(cap.current);
    expect(after.squad.map(player => player.id)).toEqual(state.squad.map(player => player.id));
  });
});

describe('season rollover', () => {
  it('makes next season\'s commitment this season\'s, and drops a finished deal without paying it', () => {
    const state = started();
    const ending = state.squad[0]!;
    const squad = state.squad.map((player, index) => index === 0
      ? { ...player, deal: { salary: player.deal!.salary, startSeason: 1, endSeason: 1 } }
      : player);
    const before = capTotals(squad, state.capAccount, 1);
    const next = expireEndedDeals(squad, state.freeAgents, state.capAccount, 2);
    expect(next.squad.some(player => player.id === ending.id)).toBe(false);
    expect(next.freeAgents.some(player => player.id === ending.id && player.deal === undefined)).toBe(true);
    expect(commitment(next.squad, 2)).toBe(before.next);
    expect(commitment(squad, 2)).toBe(before.next);
    expect(state.money).toBe(getState().money);
  });
});

describe('relegation', () => {
  it('keeps every salary and protects only the excess over the lower cap', () => {
    const state = started();
    const players = state.squad.map(player => ({ ...player, deal: { salary: 40_000, startSeason: 1, endSeason: 2 } }));
    const bill = commitment(players, 1);
    expect(bill).toBeGreaterThan(FINANCE_TIERS.local.annualCap);
    const account = relegateCap(players, state.capAccount, 1, 'local');
    const totals = capTotals(players, account, 1);
    expect(players.map(player => player.deal!.salary)).toEqual(state.squad.map(() => 40_000));
    expect(totals.cap).toBe(FINANCE_TIERS.local.annualCap);
    expect(totals.protectedExcess).toBe(bill - totals.cap);
    expect(totals.current).toBe(bill);
    expect(totals.signingRoom).toBe(0);
    const gone = players[0]!.id;
    const shrunk = capTotals(players.slice(1), { ...account, protectedIds: account.protectedIds.filter(id => id !== gone) }, 1);
    expect(shrunk.protectedExcess).toBe(totals.protectedExcess - 40_000);
    const inside = relegateCap(players.slice(0, 8), state.capAccount, 1, 'local');
    expect(inside.protectedIds).toEqual([]);
  });
});

describe('rejected import', () => {
  it('refuses a pre-finance career and leaves the destination and the original bytes', () => {
    const destination = started();
    save(destination);
    const destinationBytes = bytes.get(slotKey(1));
    const old = JSON.stringify({ ...destination, version: 27 });
    expect(importSave(old)).toMatchObject({ ok: false, message: expect.stringMatching(/older version.*start a new career/i) });
    expect(installImportedSave(old, 1)).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
    expect(bytes.get(slotKey(1))).toBe(destinationBytes);
    expect(exportOriginalSave(1)).toBe(destinationBytes);
    expect(JSON.parse(destinationBytes!).version).toBe(SAVE_VERSION);
    writeSlot(2, destination);
    expect(installImportedSave(old, 2).ok).toBe(false);
    expect(JSON.parse(bytes.get(slotKey(2))!).clubName).toBe('Cap');
  });

  it('refuses version 27 and still loads a v28 finance career', () => {
    expect(LAST_PRE_FINANCE_VERSION).toBe(27);
    expect(SAVE_VERSION).toBeGreaterThan(LAST_PRE_FINANCE_VERSION);
    const current = started();
    expect(importSave(JSON.stringify({ ...current, version: LAST_PRE_FINANCE_VERSION })).ok).toBe(false);
    expect(importSave(JSON.stringify({ ...current, version: LAST_PRE_FINANCE_VERSION + 1 })).ok).toBe(true);
  });
});

describe('signings and renewals', () => {
  it('a new signing shows the weeks left in the season and leaves only when that deal ends', () => {
    const state = started();
    loadState({ ...getState(), preseason: 0, week: 1 });
    registerEconomySystem();
    const id = state.freeAgents[0]!.id;
    const name = state.freeAgents[0]!.name;
    expect(signPlayer(getState(), id).ok).toBe(true);
    const signed = getState().squad.find(player => player.id === id)!;
    expect(signed.contractWeeks).toBe(WEEKS_PER_SEASON);
    expect(signed.deal).toMatchObject({ startSeason: 1, endSeason: 1 });
    const warnings: string[] = [];
    bus.on('ui:notify', note => { if (note.text.includes(name) && note.text.includes('expires')) warnings.push(note.text); });
    advanceWeeks(WEEKS_PER_SEASON - 1);
    expect(getState().season).toBe(1);
    expect(getState().squad.some(player => player.id === id)).toBe(true);
    expect(warnings.some(text => text.includes('8 weeks'))).toBe(true);
    expect(warnings.some(text => text.includes('4 weeks'))).toBe(true);
    expect(warnings.some(text => text.includes('1 week'))).toBe(true);
    advanceWeek();
    expect(getState().season).toBe(2);
    expect(getState().squad.some(player => player.id === id)).toBe(false);
  });

  it('renews early over several seasons and each save still loads', () => {
    started();
    registerEconomySystem();
    const id = getState().squad[0]!.id;
    for (let season = 1; season <= 4; season++) {
      const squad = getState().squad.map(player => player.id === id
        ? { ...player, contractWeeks: 4, deal: { salary: player.deal?.salary ?? 20_000, startSeason: season, endSeason: season } }
        : player);
      loadState({ ...getState(), season, week: 2, preseason: 0, money: 1_000_000, squad });
      expect(renewEarly(getState(), id).ok).toBe(true);
      const deal = getState().squad.find(player => player.id === id)!.deal!;
      expect(deal.endSeason - deal.startSeason).toBeLessThanOrEqual(2);
      expect(deal.renewal).toMatchObject({ startSeason: season + 1, endSeason: season + 1 });
      const loaded = importSave(JSON.stringify(getState()));
      expect(loaded.ok, loaded.ok ? '' : loaded.message).toBe(true);
      if (!loaded.ok) return;
      loadState(loaded.state);
      loadState({ ...getState(), week: WEEKS_PER_SEASON, preseason: 0 });
      advanceWeek();
      expect(getState().season).toBe(season + 1);
      const promoted = getState().squad.find(player => player.id === id)!.deal!;
      expect(promoted).toMatchObject({ startSeason: season + 1, endSeason: season + 1 });
      expect(promoted.renewal).toBeUndefined();
    }
  });
});
