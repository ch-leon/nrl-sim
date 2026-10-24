// N14.5: three hires — their wages with the running costs, the Welfare Manager's odds
// and renewal cut, the save migration. The Assistant Coach and the Analyst act through
// the break rule (N14.1) and are tested with it.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, emptyFinance, getState, loadState, setState } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { STAFF, STAFF_ROLES, WELFARE_CARDS, WELFARE_RENEWAL_CUT, hireStaff, releaseStaff, staffWage, staffWages } from '../../src/systems/staff';
import { breakRuleSidesFor } from '../../src/systems/matchday';
import { whenBehindLine } from '../../src/ui/tacticsBlurbs';
import { applyEconomy, registerFinanceSystem, tickContracts, weeklyOverhead } from '../../src/systems/economy';
import { renewalWage, renewalWeeklyCost } from '../../src/systems/contracts';
import { cardWeight, drawEvent } from '../../src/systems/events';
import { EVENT_CARDS } from '../../src/data/events';
import { makeRng } from '../../src/utils/rng';
import { DIFFICULTY, ECON } from '../../src/config';

beforeEach(() => {
  bus.clear();
  createNewGame('Staff FC', 3);
});

describe('hiring and releasing', () => {
  it('one of each role, at the role\'s wage scaled by the difficulty, and released for nothing', () => {
    const m = hireStaff('assistantCoach')!;
    expect(m.wage).toBe(STAFF.assistantCoach.wage);
    expect(m.hiredSeason).toBe(1);
    expect(m.name).toMatch(/^\S+ \S+$/);
    expect(hireStaff('assistantCoach')).toBeNull();
    expect(getState().staff).toHaveLength(1);
    const money = getState().money;
    expect(releaseStaff('assistantCoach')).toBe(true);
    expect(releaseStaff('assistantCoach')).toBe(false);
    expect(getState().staff).toEqual([]);
    expect(getState().money).toBe(money);
    loadState({ ...getState(), settings: { ...getState().settings, difficulty: 'hard' } });
    expect(staffWage(getState(), 'welfare')).toBe(Math.round(STAFF.welfare.wage * DIFFICULTY.hard.wages));
  });

  it('a hire draws a name from the seed: the same game hires the same man', () => {
    const a = hireStaff('analyst')!.name;
    createNewGame('Staff FC', 3);
    expect(hireStaff('analyst')!.name).toBe(a);
  });
});

describe('the wages', () => {
  it('are paid every week with the running costs, on the overhead line', () => {
    for (const role of STAFF_ROLES) hireStaff(role);
    const wages = staffWages(getState());
    expect(wages).toBe(800 + 600 + 700);
    expect(weeklyOverhead(getState())).toBe(ECON.OVERHEAD_WEEKLY + wages);
    setState({ finance: [emptyFinance(1)] });
    const off = registerFinanceSystem();
    applyEconomy(getState());
    off();
    expect(getState().finance[0]!.overhead).toBe(-(ECON.OVERHEAD_WEEKLY + wages));
  });
});

describe('the Welfare Manager', () => {
  it('takes a tenth off a renewal ask', () => {
    const p = getState().squad[0]!;
    const before = renewalWage(p, getState());
    hireStaff('welfare');
    // Both asks are rounded to the dollar, so the cut is a tenth to within a dollar.
    expect(Math.abs(renewalWage(p, getState()) - before * (1 - WELFARE_RENEWAL_CUT))).toBeLessThanOrEqual(1);
    releaseStaff('welfare');
    expect(renewalWage(p, getState())).toBe(before);
  });

  it('cuts the ask at contract end and on the Contracts screen too', () => {
    const p = { ...getState().squad[0]!, contractWeeks: 1 };
    loadState({ ...getState(), squad: [p, ...getState().squad.slice(1)], money: 1_000_000 });
    const plain = renewalWage(p, getState());
    const shown = renewalWeeklyCost(getState(), p);
    hireStaff('welfare');
    expect(renewalWeeklyCost(getState(), p)).toBeLessThan(shown);
    tickContracts(getState());
    expect(Math.abs(getState().squad.find((x) => x.id === p.id)!.wage - plain * (1 - WELFARE_RENEWAL_CUT))).toBeLessThanOrEqual(1);
    // A club without staff (a rival's pricing) asks the full amount.
    expect(renewalWage(p, { reputation: getState().reputation, season: getState().season })).toBe(plain);
  });

  it('halves the grievance cards\' weight, and only theirs', () => {
    hireStaff('welfare');
    for (const c of EVENT_CARDS) {
      expect(cardWeight(c, getState())).toBe(WELFARE_CARDS.has(c.id) ? c.weight / 2 : c.weight);
      expect(cardWeight(c, { staff: [] })).toBe(c.weight);
    }
    expect([...WELFARE_CARDS].every((id) => EVENT_CARDS.some((c) => c.id === id))).toBe(true);
  });

  it('makes a grievance card the less likely draw over many weeks', () => {
    const share = (welfare: boolean): number => {
      createNewGame('Staff FC', 3);
      if (welfare) hireStaff('welfare');
      const s = getState();
      let grievance = 0;
      let drawn = 0;
      for (let seed = 1; seed <= 3000; seed++) {
        const ev = drawEvent({ ...s, eventDeck: { ...s.eventDeck, pending: [], lastDrawn: 0 } }, 10, makeRng(seed));
        if (!ev) continue;
        drawn++;
        if (WELFARE_CARDS.has(ev.cardId)) grievance++;
      }
      return grievance / drawn;
    };
    const without = share(false);
    const withWelfare = share(true);
    expect(without).toBeGreaterThan(0);
    expect(withWelfare).toBeLessThan(without * 0.7);
  });
});

describe('the Assistant Coach and the Analyst (N14)', () => {
  const coach = { role: 'assistantCoach' as const, name: 'Ali Coach', wage: 800, hiredSeason: 1 };

  it('the Assistant Coach changes the player’s plan only on a fast-forward', () => {
    expect(breakRuleSidesFor({ staff: [] }, 'away', true)).toEqual(['away']);
    expect(breakRuleSidesFor({ staff: [coach] }, 'away', false)).toEqual(['away']);
    expect(breakRuleSidesFor({ staff: [coach] }, 'away', true)).toEqual(['away', 'home']);
    expect(breakRuleSidesFor({ staff: [coach] }, 'home', true)).toEqual(['home', 'away']);
  });

  it('the Analyst names the more-open plan, and says nothing when the side is already there', () => {
    expect(whenBehindLine({ attack: 'balanced', defence: 'slide' })).toBe('Expansive · Rush');
    expect(whenBehindLine({ attack: 'kick-chase', defence: 'compressed' })).toBe('Expansive · Slide');
    expect(whenBehindLine({ attack: 'all-out', defence: 'rush' })).toBeNull();
    expect(STAFF.assistantCoach.blurb).not.toMatch(/later update/);
    expect(STAFF.analyst.blurb).not.toMatch(/later update/);
  });
});

describe('old saves (N14.5)', () => {
  it('a v18 save has hired nobody', () => {
    const raw = { ...JSON.parse(JSON.stringify(getState())), version: 18 } as Record<string, unknown>;
    delete raw.staff;
    const res = migrateState(raw);
    expect(res.ok && res.state.staff).toEqual([]);
  });
});
