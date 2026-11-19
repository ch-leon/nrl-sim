import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrateState } from '../../src/core/save';
import { SAVE_VERSION } from '../../src/core/state';
import { validateInput } from '../../src/core/saveValidation';
import { currentSkillsCamp, changeCampBooking, departForCamp } from '../../src/systems/playerAssignments';

function raw() {
  return JSON.parse(readFileSync(new URL('../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8'));
}
it('upgrades a genuine v33 booked-free League save and refuses assignment injection before the marked-save migration', () => {
  const s = raw();
  expect(migrateState(s)).toMatchObject({ ok: true, state: { version: 34, squad: s.squad } });
  expect(migrateState({ ...s, competitions: { ...s.competitions, assignments: [] } })).toMatchObject({ ok: false });
});
it('rejects unknown record keys, invalid revisions, late reservations, absent owners and half-ticked Away imports', () => {
  const result = migrateState(raw());
  if (!result.ok) throw Error(result.message);
  const s = result.state;
  const current = currentSkillsCamp(s)!;
  const booked = changeCampBooking(s, current.id, 0, {
    kind: 'book',
    participantId: s.squad[0]!.id,
    focus: s.settings.spendPointsMyself ? null : 'balanced'
  });
  if (!booked.ok) throw Error(booked.message);
  expect(migrateState(booked.state).ok).toBe(true);
  const row = booked.state.competitions!.assignments![0]!;
  for (const change of [
    { unsafe: true },
    { revision: 2 },
    { booking: { ...row.booking, participantId: 'missing' } },
    { rules: { ...row.rules, baseXp: 200 } }
  ]) {
    const altered = {
      ...booked.state,
      competitions: { ...booked.state.competitions, assignments: [{ ...row, ...change }] }
    };
    expect(migrateState(altered).ok).toBe(false);
  }
  const away = departForCamp({ ...booked.state, week: 5 });
  expect(validateInput(away as unknown as Record<string, unknown>, SAVE_VERSION)).toBeTruthy();
  expect(migrateState(away).ok).toBe(false);
  expect(migrateState({ ...booked.state, week: 6 }).ok).toBe(false);
});
