// tests/systems/trainingFocus.test.ts — the squad's training focus (N11 item 5,
// docs/plans/N10-N12.md): one stat trains ×ON and the rest ×OFF (close to even in
// total), Balanced is the training there always was; the player page's weekly gain
// is the same sum the week's training adds; old saves train Balanced (v16).
import { describe, it, expect } from 'vitest';
import { createNewGame, getState } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { TRAINING_FOCUS } from '../../src/config';
import { applyTraining, focusMult, setTrainingFocus, trainPlayer, weakestStat, weeklyGain } from '../../src/systems/training';
import type { PlacedFacility, Player } from '../../src/core/state';

const PADDOCK_GYM: PlacedFacility[] = [
  { id: 'f1', defId: 'trainingPaddock', x: 0, y: 0, level: 2 },
  { id: 'f2', defId: 'teamGym', x: 10, y: 10, level: 2 },
] as PlacedFacility[];

function young(): Player {
  const p = createNewGame('Train FC', 5).squad[0]!;
  return { ...p, age: 21, injuredWeeks: 0, traits: [], stats: { speed: 50, strength: 50, stamina: 50, skill: 50, footyIQ: 50 } };
}

describe('the squad training focus (N11)', () => {
  it('the focused stat ×ON, the rest ×OFF; Balanced ×1; close to even in total', () => {
    expect(focusMult('balanced', 'speed')).toBe(1);
    expect(focusMult('speed', 'speed')).toBe(TRAINING_FOCUS.ON);
    expect(focusMult('speed', 'skill')).toBe(TRAINING_FOCUS.OFF);
    const total = TRAINING_FOCUS.ON + 4 * TRAINING_FOCUS.OFF;
    expect(total).toBeGreaterThan(4.5);
    expect(total).toBeLessThanOrEqual(5);
  });

  it('moves each stat’s gain by those factors; Balanced is the old training exactly', () => {
    const p = young();
    const bal = weeklyGain(p, PADDOCK_GYM, 'balanced');
    const str = weeklyGain(p, PADDOCK_GYM, 'strength');
    for (const k of ['speed', 'strength', 'stamina', 'skill', 'footyIQ'] as const) {
      if (bal[k] === 0) continue;
      expect(str[k] / bal[k]).toBeCloseTo(k === 'strength' ? TRAINING_FOCUS.ON : TRAINING_FOCUS.OFF, 6);
    }
    expect(trainPlayer(p, PADDOCK_GYM)).toEqual(trainPlayer(p, PADDOCK_GYM, 'balanced'));
  });

  it('the weekly gain is what a week’s training adds (no veteran decline under 31)', () => {
    const p = young();
    const g = weeklyGain(p, PADDOCK_GYM, 'skill');
    const after = trainPlayer(p, PADDOCK_GYM, 'skill');
    for (const k of ['speed', 'strength', 'stamina', 'skill', 'footyIQ'] as const) expect(after[k] - p.stats[k]).toBeCloseTo(g[k], 9);
  });

  it('the week trains the squad under the state’s focus', () => {
    createNewGame('Train FC', 5);
    const s = getState();
    const before = s.squad.map((p) => p.stats.speed);
    setTrainingFocus('speed');
    expect(getState().training.focus).toBe('speed');
    const st = { ...getState(), facilities: PADDOCK_GYM };
    const trained = applyTraining(st).squad;
    trained.forEach((p, i) => {
      const expected = trainPlayer({ ...s.squad[i]!, stats: { ...s.squad[i]!.stats, speed: before[i]! } }, PADDOCK_GYM, 'speed');
      expect(p.stats.speed).toBeCloseTo(expected.speed, 9);
    });
  });

  it('the managed manager’s pick is the squad’s weakest stat', () => {
    const squad = [young(), young()].map((p, i) => ({ ...p, stats: { ...p.stats, stamina: 30 + i } }));
    expect(weakestStat(squad)).toBe('stamina');
  });

  it('a v15 save loads training Balanced', () => {
    const base = createNewGame('Train FC', 5);
    const { training: _t, ...old } = base;
    void _t;
    const res = migrateState({ ...old, version: 15 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.training).toEqual({ focus: 'balanced' });
  });
});
