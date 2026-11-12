import { expect, it } from 'vitest';
import { AU_RULES } from '../../src/content/au';
import { FIELD_LENGTH } from '../../src/match/core/field';
import { fullMatch } from '../../src/match/league/rules';

it('ships 2:30 halves on the normal 100m field without a preview build', () => {
  expect(AU_RULES.halfMinutes).toBe(2.5);
  expect(fullMatch()).toEqual({ halves: 2, halfMinutes: 2.5 });
  expect(FIELD_LENGTH).toBe(100);
});
