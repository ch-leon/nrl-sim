import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { newCardWeek, type GameState } from '../../src/core/state';
import { CAMP_RULES } from '../../src/data/playerAssignments';
import { recoverWeeklyFatigue, weeklyFatigueOf } from '../../src/systems/weeklyFatigue';
import { migrateState } from '../../src/core/save';
import {
  currentSkillsCamp,
  projectCampDeparture,
  changeCampBooking,
  departForCamp,
  completeCamp,
  awayPlayerIds
} from '../../src/systems/playerAssignments';

function boundary(week = 4): GameState {
  const raw = JSON.parse(
    readFileSync(new URL('../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8')
  );
  const result = migrateState(raw);
  if (!result.ok) throw Error(result.message);
  return { ...result.state, week, settings: { ...result.state.settings, spendPointsMyself: false } };
}
function reserve(s: GameState) {
  const camp = currentSkillsCamp(s)!;
  const action = { kind: 'book', participantId: s.squad[0]!.id, focus: 'balanced' } as const;
  const result = changeCampBooking(s, camp.id, camp.revision, action);
  if (!result.ok) throw Error(result.message);
  return result.state;
}
it('materialises a single revisioned annual place and rejects replay after cancellation and rebooking', () => {
  const s = boundary();
  expect(s.competitions?.assignments ?? []).toEqual([]);
  const booked = reserve(s),
    first = currentSkillsCamp(booked)!;
  expect(first.status).toBe('booked');
  expect(first.revision).toBe(1);
  const cancel = changeCampBooking(booked, first.id, 1, { kind: 'cancel' });
  if (!cancel.ok) throw Error(cancel.message);
  expect(currentSkillsCamp(cancel.state)).toMatchObject({ id: first.id, revision: 2, booking: null, status: 'available' });
  const again = reserve(cancel.state);
  expect(again.competitions!.assignments).toHaveLength(1);
  expect(changeCampBooking(again, first.id, 1, { kind: 'cancel' }).ok).toBe(false);
  expect(currentSkillsCamp(again)?.revision).toBe(3);
});
it('projects medical recovery before kickoff and expiry of bans after it, with the participant fit at departure', () => {
  const s = boundary(5);
  s.facilities = [];
  s.squad = s.squad.slice(0, 14).map((p) => ({ ...p, injuredWeeks: 0, suspendedWeeks: 0 }));
  const participantId = s.squad[0]!.id;
  s.squad[1]!.injuredWeeks = 1;
  expect(projectCampDeparture(s, { participantId })).toMatchObject({ reason: null, fitCount: 13 });
  s.squad[1]!.suspendedWeeks = 1;
  expect(projectCampDeparture(s, { participantId }).reason).toBeTruthy();
  s.squad[1]!.suspendedWeeks = 0;
  s.squad[0]!.injuredWeeks = 1;
  expect(projectCampDeparture(s, { participantId })).toMatchObject({ fitCount: 14 });
  expect(projectCampDeparture(s, { participantId }).reason).toMatch(/injur|fit/i);
});
it('keeps ownership through departure, completes once and cancels a fresh trial injury before recovery', () => {
  const s = reserve(boundary()),
    player = s.squad[0]!;
  const start = { ...s, week: 5 };
  const away = departForCamp(start);
  expect(awayPlayerIds(away).has(player.id)).toBe(true);
  expect(away.squad).toBe(s.squad);
  const returned = completeCamp({ ...away, week: 6 });
  expect(currentSkillsCamp(returned)).toMatchObject({
    status: 'completed',
    booking: { participantId: player.id },
    award: { mode: 'auto' }
  });
  expect(completeCamp(returned)).toBe(returned);
  expect(awayPlayerIds(returned).size).toBe(0);
  const injured = {
    ...start,
    squad: start.squad.map((p) => (p.id === player.id ? { ...p, name: 'Renamed on trial day', injuredWeeks: 1 } : p))
  };
  const cancelled = changeCampBooking(injured, currentSkillsCamp(injured)!.id, 1, { kind: 'cancel' });
  if (!cancelled.ok) throw Error(cancelled.message);
  for (const terminal of [cancelled.state, departForCamp(injured)]) {
    expect(currentSkillsCamp(terminal)).toMatchObject({
      status: 'cancelled',
      booking: { participantName: 'Renamed on trial day' },
      award: null
    });
  }
});


it('charges the Skills Camp player once on return and clears a fresh player by his next kickoff', () => {
  const booked = reserve(boundary());
  const id = currentSkillsCamp(booked)!.booking!.participantId;
  const away = departForCamp({ ...booked, week: CAMP_RULES.departureWeek, cardWeek: newCardWeek(854), facilities: [] });
  expect(awayPlayerIds(away).has(id)).toBe(true);
  const returned = completeCamp({ ...recoverWeeklyFatigue(away), week: CAMP_RULES.returnWeek });
  expect(weeklyFatigueOf(returned, id)).toBe(20);
  expect(completeCamp(returned)).toBe(returned);
  expect(weeklyFatigueOf(recoverWeeklyFatigue(returned), id)).toBe(0);
});
