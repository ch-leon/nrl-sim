import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, loadState, setState } from '../../src/core/state';
import { addFacility } from '../../src/data/club';
import { FACILITY_CATALOG, upgradeCost } from '../../src/data/facility';
import { STAFF_APPOINTMENT_PRICES, hireStaff, hireAttackCoach, releaseStaff } from '../../src/systems/staff';
import { demolishFacility, moveFacility, moveFee, upgradeFacility } from '../../src/world/placement';
import { commitUndo, demolishWithUndo, offerBuild, undoNow } from '../../src/systems/undo';

beforeEach(() => { bus.clear(); commitUndo(); createNewGame('Investments', 7); setState({ facilities: [] }); });

describe('upfront staff appointments', () => {
  for (const role of ['assistantCoach', 'analyst', 'welfare'] as const) {
    it(`${role} charges once at the cash boundary, preserves cap and refuses repeats`, () => {
      const fee = STAFF_APPOINTMENT_PRICES[role];
      setState({ money: fee - 1 });
      const before = structuredClone(getState());
      expect(hireStaff(role)).toBeNull();
      expect(getState()).toEqual(before);
      setState({ money: fee });
      const cap = structuredClone(getState().capAccount);
      let observed = false;
      bus.on('money:changed', () => { observed = getState().money === 0 && getState().staff.some(m => m.role === role); });
      expect(hireStaff(role)).not.toBeNull();
      expect(observed).toBe(true);
      expect(getState().capAccount).toEqual(cap);
      expect(hireStaff(role)).toBeNull();
      expect(releaseStaff(role)).toBe(true);
      expect(getState().money).toBe(0);
      expect(hireStaff(role)).toBeNull();
    });
  }
  for (const speciality of ['direct', 'width', 'kicking', 'razzle'] as const) {
    it(`${speciality} costs its published appointment fee with no difficulty scaling`, () => {
      setState({ reputation: 50, money: STAFF_APPOINTMENT_PRICES[speciality] });
      expect(hireAttackCoach(speciality)).not.toBeNull();
      expect(getState().money).toBe(0);
      expect(hireAttackCoach(speciality)).toBeNull();
    });
  }
});

describe('recorded construction spend', () => {
  it('quotes the new stand prices and move fee', () => {
    expect([1, 2, 3].map(l => upgradeCost(FACILITY_CATALOG.grandstand, l as 1 | 2 | 3))).toEqual([30_000, 60_000, 90_000]);
    expect(moveFee(FACILITY_CATALOG.grandstand)).toBe(3_000);
  });
  it('pays and places together, accumulates upgrades, preserves spend through reload/move and refunds once', () => {
    setState({ money: 183_000 });
    const cap = structuredClone(getState().capAccount);
    const f = addFacility('grandstand', 2, 2, 1, 30_000)!;
    expect(f.constructionSpend).toBe(30_000);
    expect(upgradeFacility(f.id)).toBe(true);
    expect(upgradeFacility(f.id)).toBe(true);
    expect(upgradeFacility(f.id)).toBe(false);
    loadState(JSON.parse(JSON.stringify(getState())));
    expect(moveFacility(f.id, 2, 8).ok).toBe(true);
    expect(getState().money).toBe(0);
    expect(getState().facilities[0]!.constructionSpend).toBe(180_000);
    expect(demolishFacility(f.id)).toBe(54_000);
    expect(demolishFacility(f.id)).toBeNull();
    expect(getState().money).toBe(54_000);
    expect(getState().capAccount).toEqual(cap);
  });
  it('does not fabricate refunds for a free authored facility, but records later upgrades', () => {
    setState({ money: 60_000 });
    const f = addFacility('grandstand', 2, 2)!;
    expect(upgradeFacility(f.id)).toBe(true);
    expect(demolishFacility(f.id)).toBe(18_000);
  });
  it('refuses purchases or upgrades without enough cash and preserves the complete state', () => {
    setState({ money: 29_999 });
    const before = structuredClone(getState());
    expect(addFacility('grandstand', 2, 2, 1, 30_000)).toBeNull();
    expect(getState()).toEqual(before);
    const f = addFacility('grandstand', 2, 2)!;
    const after = structuredClone(getState());
    expect(upgradeFacility(f.id)).toBe(false);
    expect(getState()).toEqual(after);
  });
  it('undo restores ownership and cash atomically and only once', () => {
    setState({ money: 30_000 });
    const f = addFacility('grandstand', 2, 2, 1, 30_000)!;
    offerBuild(f, 30_000);
    expect(undoNow()).toBe(true);
    expect(undoNow()).toBe(false);
    expect(getState().money).toBe(30_000);
    const rebuilt = addFacility('grandstand', 2, 2, 1, 30_000)!;
    expect(demolishWithUndo(rebuilt.id)).toBe(9_000);
    let atomic = false;
    bus.on('money:changed', () => { atomic = getState().money === 0 && getState().facilities[0]?.constructionSpend === 30_000; });
    expect(undoNow()).toBe(true);
    expect(atomic).toBe(true);
    expect(undoNow()).toBe(false);
  });
});
