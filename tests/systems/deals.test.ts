import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, loadState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { importSave } from '../../src/core/save';
import { signingFee, signPlayer, releasePlayer } from '../../src/systems/freeagency';
import { renewEarly } from '../../src/systems/contracts';
import { commitment, publishedCap, releaseTerms, renewalAsk, salaryDemand } from '../../src/systems/cap';
import { trainWeek } from '../../src/systems/training';
import { registerEconomySystem } from '../../src/systems/economy';
import { advanceWeek, clearTickHooks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';
import { POSITIONS } from '../../src/data/player';
import { rivalSigningTick } from '../../src/systems/rivals';
import { makeRng } from '../../src/utils/rng';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  initLeague(createNewGame('Deals', 3));
});

function books() {
  const s = getState();
  return {
    money: s.money,
    squad: s.squad.map(p => p.id),
    agents: s.freeAgents.map(p => p.id),
    deals: s.squad.map(p => [p.id, p.deal, p.contractWeeks, p.wage]),
  };
}

describe('a signing needs the cash and the cap, both or neither', () => {
  it('takes the last dollar and refuses one dollar short without changing anything', () => {
    const agent = getState().freeAgents[0]!;
    const fee = signingFee(getState(), agent);
    loadState({ ...getState(), money: fee - 1 });
    const before = books();
    const refused = signPlayer(getState(), agent.id);
    expect(refused.reason).toBe('insufficient-funds');
    expect(refused.message).toContain(fee.toLocaleString('en-US'));
    expect(books()).toEqual(before);

    loadState({ ...getState(), money: fee });
    expect(signPlayer(getState(), agent.id).ok).toBe(true);
    expect(getState().money).toBe(0);
    const signed = getState().squad.find(p => p.id === agent.id)!;
    expect(signed.deal).toMatchObject({ salary: salaryDemand(agent), startSeason: 1, endSeason: 1 });
    expect(signed.junior).toBeUndefined();
  });

  it('fills the cap exactly and refuses one dollar of salary over it', () => {
    const fit = (over: number) => {
      createNewGame('Deals', 3);
      const s = getState();
      const agent = s.freeAgents[0]!;
      const salary = salaryDemand(agent);
      const cap = publishedCap(s.capAccount);
      const room = cap - salary + over;
      const base = Math.floor(room / s.squad.length);
      const extra = room - base * s.squad.length;
      const squad = s.squad.map((p, i) => ({
        ...p,
        deal: { salary: base + (i === 0 ? extra : 0), startSeason: s.season, endSeason: s.season },
      }));
      loadState({ ...s, squad, money: 5_000_000 });
      return { agent, salary, cap };
    };
    const exact = fit(0);
    expect(commitment(getState().squad, 1) + exact.salary).toBe(exact.cap);
    expect(signPlayer(getState(), exact.agent.id).ok).toBe(true);

    const over = fit(1);
    const before = books();
    const refused = signPlayer(getState(), over.agent.id);
    expect(refused.reason).toBe('over-cap');
    expect(refused.message).toContain('salary-cap');
    expect(books()).toEqual(before);
  });
});

describe('a renewal is free and does not touch this deal', () => {
  it('queues one season after the current promise, and a second call changes nothing', () => {
    const player = getState().squad[0]!;
    const deal = { salary: player.deal!.salary, startSeason: 1, endSeason: 1 };
    loadState({
      ...getState(),
      money: 123_456,
      squad: getState().squad.map(p => p.id === player.id ? { ...p, deal, contractWeeks: 60 } : p),
    });
    const before = getState().money;
    expect(renewEarly(getState(), player.id).ok).toBe(true);
    const queued = getState().squad.find(p => p.id === player.id)!;
    expect(getState().money).toBe(before);
    expect(queued.contractWeeks).toBe(60);
    expect(queued.wage).toBe(player.wage);
    expect(queued.deal!.salary).toBe(deal.salary);
    expect(queued.deal!.renewal).toMatchObject({ startSeason: 2, endSeason: 2 });
    const first = queued.deal;
    expect(renewEarly(getState(), player.id).reason).toBe('already-renewed');
    expect(getState().money).toBe(before);
    expect(getState().squad.find(p => p.id === player.id)!.deal).toEqual(first);
    expect(getState().squad.find(p => p.id === player.id)!.contractWeeks).toBe(60);

    const loaded = importSave(JSON.stringify(getState()));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.squad.find(p => p.id === player.id)!.deal).toEqual(first);
  });

  it('refuses a renewal before the last season of the deal', () => {
    const player = getState().squad[0]!;
    const deal = { salary: 20_000, startSeason: 1, endSeason: 3 };
    loadState({
      ...getState(),
      squad: getState().squad.map(p => p.id === player.id ? { ...p, deal, contractWeeks: 60 } : p),
    });
    const before = books();
    const refused = renewEarly(getState(), player.id);
    expect(refused.reason).toBe('not-final-season');
    expect(refused.message).toContain('season 3');
    expect(books()).toEqual(before);
  });

  it('fills the season the renewal starts in exactly, and refuses one dollar over', () => {
    const s = getState();
    const player = s.squad[0]!;
    const ask = renewalAsk(player, false).salary;
    const cap = publishedCap(s.capAccount);
    const others = s.squad.filter(p => p.id !== player.id);
    const fill = (over: number) => {
      const bill = cap - ask + over;
      const base = Math.floor(bill / others.length);
      const extra = bill - base * others.length;
      return s.squad.map(p => p.id === player.id
        ? { ...p, deal: { salary: 1_000, startSeason: 1, endSeason: 1 } }
        : { ...p, deal: { salary: base + (p.id === others[0]!.id ? extra : 0), startSeason: 1, endSeason: 2 } });
    };
    loadState({ ...s, squad: fill(1) });
    const before = books();
    const refused = renewEarly(getState(), player.id);
    expect(refused.reason).toBe('over-cap');
    expect(refused.message).toContain('salary-cap');
    expect(books()).toEqual(before);

    loadState({ ...s, squad: fill(0) });
    expect(renewEarly(getState(), player.id).ok).toBe(true);
    expect(commitment(getState().squad, 2)).toBe(cap);
  });

  it('a queued renewal takes over at the rollover, with that salary and a season of weeks', () => {
    registerEconomySystem();
    const player = getState().squad[0]!;
    loadState({
      ...getState(),
      preseason: 0,
      week: 2,
      squad: getState().squad.map(p => p.id === player.id
        ? { ...p, contractWeeks: 10, deal: { salary: 10_000, startSeason: 1, endSeason: 1 } }
        : p),
    });
    const who = getState().squad.find(p => p.id === player.id)!;
    const ask = renewalAsk(who, false).salary;
    expect(renewEarly(getState(), player.id).ok).toBe(true);
    expect(getState().squad.find(p => p.id === player.id)!.deal!.renewal!.salary).toBe(ask);
    loadState({ ...getState(), week: WEEKS_PER_SEASON, preseason: 0 });
    advanceWeek();
    const kept = getState().squad.find(p => p.id === player.id)!;
    expect(getState().season).toBe(2);
    expect(kept.deal).toEqual({ salary: ask, startSeason: 2, endSeason: 2 });
    expect(kept.contractWeeks).toBe(WEEKS_PER_SEASON);
  });

  it('training does not reprice the salary already signed', () => {
    const player = getState().squad[0]!;
    const trained = trainWeek({ ...player, age: 34, stats: { ...player.stats, speed: player.stats.speed + 15 } }, [], 'balanced');
    expect(trained.deal).toEqual(player.deal);
    expect(salaryDemand(trained)).not.toBe(player.deal!.salary);
  });
});

describe('a release previews the payout and refuses when the cash is short', () => {
  it('pays exactly the quoted payout and frees the cap, or leaves everything', () => {
    const player = getState().squad[0]!;
    const terms = releaseTerms(player, 1, getState().week);
    expect(terms.payout).toBeGreaterThan(0);
    expect(terms.capFreed).toBe(player.deal!.salary);
    loadState({ ...getState(), money: terms.payout - 1 });
    const before = books();
    expect(releasePlayer(getState(), player.id).reason).toBe('insufficient-funds');
    expect(books()).toEqual(before);

    loadState({ ...getState(), money: terms.payout });
    const capBefore = commitment(getState().squad, 1);
    expect(releasePlayer(getState(), player.id).ok).toBe(true);
    expect(getState().money).toBe(0);
    expect(commitment(getState().squad, 1)).toBe(capBefore - terms.capFreed);
    expect(getState().freeAgents.find(p => p.id === player.id)!.deal).toBeUndefined();
  });

  it('a queued renewal is part of the payout, capped at the larger salary, and leaves next season', () => {
    const player = getState().squad[0]!;
    const renewalSalary = 40_000;
    const deal = {
      salary: 1_000, startSeason: 1, endSeason: 1,
      renewal: { salary: renewalSalary, startSeason: 2, endSeason: 2 },
    };
    loadState({
      ...getState(),
      money: 1_000_000,
      squad: getState().squad.map(p => p.id === player.id ? { ...p, deal } : p),
    });
    const held = getState().squad.find(p => p.id === player.id)!;
    const terms = releaseTerms(held, 1, getState().week);
    expect(terms.nextCapFreed).toBe(renewalSalary);
    expect(terms.payout).toBeGreaterThan(deal.salary);
    expect(terms.payout).toBeLessThanOrEqual(renewalSalary);
    const nextBefore = commitment(getState().squad, 2);
    expect(releasePlayer(getState(), player.id).ok).toBe(true);
    expect(commitment(getState().squad, 2)).toBe(nextBefore - renewalSalary);
    expect(getState().money).toBe(1_000_000 - terms.payout);
  });
});

describe('a rival later signing is checked against the cap, not the wallet', () => {
  it('refuses when the new salary does not fit the cap, and still signs when it does', () => {
    const s = getState();
    const club = s.league.clubs.find(c => c.id !== s.clubId && c.squad && c.squad.length > 0)!;
    const target = { ...s.freeAgents.find(p => !p.junior)!, injuredWeeks: 0, junior: false };
    const template = club.squad![0]!;
    const squad = POSITIONS.flatMap((position, index) => [0, 1].map(n => ({
      ...template,
      id: `r${index}${n}`,
      name: `R ${position} ${n}`,
      position,
      injuredWeeks: 0,
      wage: 100,
      stats: { speed: 40, strength: 40, stamina: 40, handling: 40, kicking: 40, footyIQ: 40 },
      deal: { salary: 1_000, startSeason: 1, endSeason: 1 },
    })));
    const pool = Array.from({ length: 8 }, (_, i) => ({ ...target, id: `fa${i}`, name: `Fa ${i}` }));
    const wallet = club.cash ?? 0;
    const base = { ...club, cash: wallet, squad };
    let seed = 0;
    for (seed = 1; seed < 40; seed++) {
      const signed = rivalSigningTick([base], pool, makeRng(seed), { perClub: 1, season: 1 });
      if (signed.signed.length !== 1) continue;
      const player = signed.clubs[0]!.squad!.find(p => p.id === signed.signed[0]!.playerId)!;
      expect(player.deal!.salary).toBe(salaryDemand(pool[0]!));
      expect(signed.clubs[0]!.cash).toBe(wallet);
      const stuffed = squad.map(p => ({ ...p, deal: { salary: 600_000, startSeason: 1, endSeason: 1 } }));
      const over = rivalSigningTick([{ ...base, squad: stuffed }], pool, makeRng(seed), { perClub: 1, season: 1 });
      expect(over.signed).toEqual([]);
      expect(over.clubs[0]!.squad).toHaveLength(stuffed.length);
      expect(over.clubs[0]!.cash).toBe(wallet);
      return;
    }
    expect(seed).toBeLessThan(40);
  });
});
