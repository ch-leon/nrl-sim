import { describe, it, expect } from 'vitest';
import { createNewGame, getState } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { setTrainingFocus, weakestStat } from '../../src/systems/training';
const young = () => createNewGame('Train FC', 5).squad[0]!;
describe('training focus', () => {
  it('stores the squad focus for spending', () => {
    young(); setTrainingFocus('kicking'); expect(getState().training.focus).toBe('kicking');
  });
  it('the managed manager’s pick is the squad’s weakest stat', () => {
    const squad = [young(), young()].map((p, i) => ({ ...p, stats: { ...p.stats, stamina: 1 + i } }));
    expect(weakestStat(squad)).toBe('stamina');
  });

  it('a v15 save requires a new career', () => {
    const base = createNewGame('Train FC', 5);
    const { training: _t, ...old } = base;
    void _t;
    const res = migrateState({ ...old, version: 15 });
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
  });
});
