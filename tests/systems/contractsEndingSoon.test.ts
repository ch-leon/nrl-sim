// tests/systems/contractsEndingSoon.test.ts — the Squad tab's red dot (#369):
// squad contracts ending within 4 weeks, juniors and departed players aside.
import { describe, it, expect } from 'vitest';
import type { Player } from '../../src/core/state';
import { CONTRACT_DOT_WEEKS, contractsEndingSoon, endingSoonLabel, endsInTag } from '../../src/systems/contracts';
import { CONTRACTS } from '../../src/config';
import { EXPIRY_WINDOW_WEEKS } from '../../src/ui/screens/finance';

const mk = (id: string, contractWeeks: number, over: Partial<Player> = {}): Player => ({
  id, name: id, age: 25, position: 'lock',
  stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 },
  morale: 50, injuryRisk: 10, injuredWeeks: 0, traits: [], wage: 5000, contractWeeks, ...over,
});

describe('contractsEndingSoon', () => {
  it('counts 4 weeks and under, not 5, soonest first', () => {
    const squad = [mk('e5', 5), mk('d4', 4), mk('c1', 1), mk('b3', 3), mk('a52', CONTRACTS.NEW_CONTRACT_WEEKS)];
    expect(CONTRACT_DOT_WEEKS).toBe(4);
    expect(contractsEndingSoon({ squad }).map((p) => p.id)).toEqual(['c1', 'b3', 'd4']);
  });

  it('leaves out departed players and juniors', () => {
    const squad = [mk('gone', 2, { departed: true }), mk('kid', 1, { junior: true }), mk('real', 2)];
    expect(contractsEndingSoon({ squad }).map((p) => p.id)).toEqual(['real']);
  });

  it('is its own window, apart from Finance\'s 8 weeks', () => {
    const squad = [mk('six', 6)];
    expect(EXPIRY_WINDOW_WEEKS).toBe(8);
    expect(contractsEndingSoon({ squad })).toEqual([]);
    expect(contractsEndingSoon({ squad }, EXPIRY_WINDOW_WEEKS)).toHaveLength(1);
  });

  it('a renewal clears it', () => {
    const squad = [mk('p', 3)];
    expect(contractsEndingSoon({ squad })).toHaveLength(1);
    expect(contractsEndingSoon({ squad: [{ ...squad[0]!, contractWeeks: CONTRACTS.NEW_CONTRACT_WEEKS }] })).toEqual([]);
  });

  it('reads out and tags', () => {
    expect(endingSoonLabel(1)).toBe('Squad — 1 contract ends within 4 weeks');
    expect(endingSoonLabel(2)).toBe('Squad — 2 contracts end within 4 weeks');
    expect(endsInTag({ contractWeeks: 3 })).toBe('ends in 3 wk');
  });
});
