import { describe, expect, it } from 'vitest';
import { checkCounterRows, counterSwingProblem, dormantShareProblem, presetShareProblem } from '../../../src/match/balance/acceptance';

describe('#465 owner-approved acceptance', () => {
  it('measures paired swings, rejecting an endpoint near 55% with too small a change', () => {
    expect(counterSwingProblem(.517, .541, 1)).toContain('2.40pp');
    expect(counterSwingProblem(.474, .4545, -1)).toContain('-1.95pp');
    expect(counterSwingProblem(.5275, .452, -1)).toContain('-7.55pp');
    for (const sign of [-1, 1]) {
      expect(counterSwingProblem(.5, .5 + sign * .04, sign)).toBeUndefined();
      expect(counterSwingProblem(.5, .5 + sign * .06, sign)).toBeUndefined();
      expect(counterSwingProblem(.5, .5 - sign * .05, sign)).toBeDefined();
      expect(counterSwingProblem(.5, .5 + sign * .0395, sign)).toBeDefined();
    }
  });
  it('requires at least nine points at full fit, allowing stronger counters', () => {
    for (const sign of [-1, 1]) {
      expect(counterSwingProblem(.5, .5 + sign * .09, sign, true)).toBeUndefined();
      expect(counterSwingProblem(.5, .5 + sign * .162, sign, true)).toBeUndefined();
      expect(counterSwingProblem(.5, .5 + sign * .0895, sign, true)).toBeDefined();
    }
  });
  it('uses the revised inclusive 42–58% preset band', () => {
    for (const share of [.42, .44, .50, .56, .58]) expect(presetShareProblem(share)).toBeUndefined();
    for (const share of [.4199, .5801]) expect(presetShareProblem(share)).toBeDefined();
  });
  it('requires true dormant main rather than a control changed by new tuning', () => {
    expect(dormantShareProblem('kick-chase v slide', .5275)).toBeUndefined();
    expect(dormantShareProblem('full fit kick-chase v rush', .5215)).toBeUndefined();
    expect(dormantShareProblem('kick-chase v slide', .5)).toContain('52.75%');
    expect(dormantShareProblem('unknown fixture', .5)).toBeDefined();
  });
  it('fails on incomplete evidence instead of passing vacuously', () => {
    expect(checkCounterRows([])).toHaveLength(16);
    expect(checkCounterRows([], true)).toHaveLength(16);
  });
});
