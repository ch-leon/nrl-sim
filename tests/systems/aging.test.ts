import { describe, expect, it, beforeEach } from 'vitest';
import {
  agePlayer,
  ageAndRetirePlayers,
  retirementChance,
  shouldRetire,
  registerAgingSystem,
} from '../../src/systems/aging';
import { generatePlayer } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';
import { RETIRE_HARD_AGE, RETIRE_SOFT_AGE, SQUAD_MIN } from '../../src/config';
import { createNewGame, getState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { clearSeasonHooks, clearTickHooks, advanceWeeks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';

describe('agePlayer', () => {
  it('increments age by one', () => {
    const p = generatePlayer(makeRng(1), { age: 25 });
    expect(agePlayer(p).age).toBe(26);
  });

  it('drops youngGun once past the young-gun age', () => {
    const p = { ...generatePlayer(makeRng(2), { age: 20 }), traits: ['youngGun' as const] };
    expect(agePlayer(p).traits).not.toContain('youngGun');
  });

  it('adds veteran at 31', () => {
    const p = { ...generatePlayer(makeRng(3), { age: 30 }), traits: [] };
    expect(agePlayer(p).traits).toContain('veteran');
  });

  it('does not duplicate veteran', () => {
    const p = { ...generatePlayer(makeRng(4), { age: 32 }), traits: ['veteran' as const] };
    expect(agePlayer(p).traits.filter((t) => t === 'veteran')).toHaveLength(1);
  });
});

describe('retirementChance / shouldRetire', () => {
  it('is 0 below soft age and 1 at/above hard age', () => {
    expect(retirementChance(RETIRE_SOFT_AGE - 1)).toBe(0);
    expect(retirementChance(RETIRE_HARD_AGE)).toBe(1);
    expect(retirementChance(RETIRE_HARD_AGE + 2)).toBe(1);
  });

  it('ramps linearly across the soft window', () => {
    expect(retirementChance(34)).toBeCloseTo(0.2);
    expect(retirementChance(35)).toBeCloseTo(0.4);
    expect(retirementChance(36)).toBeCloseTo(0.6);
    expect(retirementChance(37)).toBeCloseTo(0.8);
  });

  it('shouldRetire is deterministic for a seed', () => {
    const a = shouldRetire(35, makeRng(99));
    const b = shouldRetire(35, makeRng(99));
    expect(a).toBe(b);
  });

  it('always retires at hard age', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(shouldRetire(RETIRE_HARD_AGE, makeRng(seed))).toBe(true);
    }
  });

  it('never retires below soft age', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(shouldRetire(RETIRE_SOFT_AGE - 1, makeRng(seed))).toBe(false);
    }
  });
});

describe('ageAndRetirePlayers', () => {
  it('removes hard-age players from squad and free agents', () => {
    const oldie = { ...generatePlayer(makeRng(1), { age: RETIRE_HARD_AGE - 1 }), id: 'old' };
    const kid = { ...generatePlayer(makeRng(2), { age: 22 }), id: 'kid' };
    const faOld = { ...generatePlayer(makeRng(3), { age: RETIRE_HARD_AGE - 1 }), id: 'fa-old' };
    const result = ageAndRetirePlayers([oldie, kid], [faOld], makeRng(1));
    // After +1 year, oldie and faOld hit hard age → retired.
    expect(result.retired.map((p) => p.id).sort()).toEqual(['fa-old', 'old']);
    expect(result.squad.map((p) => p.id)).toEqual(['kid']);
    expect(result.freeAgents).toEqual([]);
    expect(result.squad[0]?.age).toBe(23);
  });

  it('is deterministic for the same seed', () => {
    const squad = [
      { ...generatePlayer(makeRng(10), { age: 34 }), id: 'a' },
      { ...generatePlayer(makeRng(11), { age: 35 }), id: 'b' },
    ];
    const a = ageAndRetirePlayers(squad, [], makeRng(42));
    const b = ageAndRetirePlayers(squad, [], makeRng(42));
    expect(a.retired.map((p) => p.id)).toEqual(b.retired.map((p) => p.id));
    expect(a.squad.map((p) => p.id)).toEqual(b.squad.map((p) => p.id));
    expect(a.rngSeed).toBe(b.rngSeed);
  });
});

describe('registerAgingSystem', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    createNewGame('Tester', 7);
  });

  it('notifies on retirement at season rollover', () => {
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    setState({
      squad: [{ ...generatePlayer(makeRng(1), { age: RETIRE_HARD_AGE - 1 }), id: 'vet', name: 'Old Mate' }],
      week: WEEKS_PER_SEASON,
    });
    registerAgingSystem();
    advanceWeeks(1);
    expect(toasts.some((t) => t.includes('Old Mate') && t.includes('retired'))).toBe(true);
    expect(getState().squad.every((p) => p.id !== 'vet')).toBe(true);
  });

  it('does not toast free-agent retirements', () => {
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    setState({
      freeAgents: [{ ...generatePlayer(makeRng(5), { age: RETIRE_HARD_AGE - 1 }), id: 'fa', name: 'Stranger Danger' }],
      week: WEEKS_PER_SEASON,
    });
    registerAgingSystem();
    advanceWeeks(1);
    expect(getState().freeAgents.every((p) => p.id !== 'fa')).toBe(true);
    expect(toasts.some((t) => t.includes('Stranger Danger'))).toBe(false);
  });

  it('warns when retirements drop the squad below SQUAD_MIN', () => {
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    const young = Array.from({ length: SQUAD_MIN - 1 }, (_, i) => ({
      ...generatePlayer(makeRng(100 + i), { age: 22 }),
      id: `y${i}`,
    }));
    setState({
      squad: [...young, { ...generatePlayer(makeRng(1), { age: RETIRE_HARD_AGE - 1 }), id: 'vet' }],
      week: WEEKS_PER_SEASON,
    });
    registerAgingSystem();
    advanceWeeks(1);
    expect(getState().squad).toHaveLength(SQUAD_MIN - 1);
    expect(toasts.some((t) => t.includes('after retirements') && t.includes(`need ${SQUAD_MIN}`))).toBe(true);
  });
});
