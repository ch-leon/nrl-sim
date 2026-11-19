import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { GameState } from '../../src/core/state';
import type { IndividualChallengeRecord } from '../../src/data/individualChallenges';
import { eventOpportunities, closingEventOpportunities } from '../../src/systems/eventOpportunities';
import { changeChallenge } from '../../src/systems/individualChallenges';
import { changeCampBooking, currentSkillsCamp } from '../../src/systems/playerAssignments';

function state(week = 4): GameState {
  return { ...JSON.parse(readFileSync(new URL('../fixtures/saves/v33-assignments/v33-au-week-4.json', import.meta.url), 'utf8')), week };
}
const ids = (s: GameState, span = 1, seen?: ReadonlySet<string>) => closingEventOpportunities(s, span, seen).map(e => e.id);
it('shows all optional opportunities and the actual final booking weeks', () => {
  const rows = eventOpportunities(state());
  expect(rows.find(e => e.id === 'skills-camp')).toMatchObject({ status: 'available', closesWeek: 4, detail: 'Closes this week · Away Week 5' });
  expect(rows.find(e => e.id === 'showground')).toMatchObject({ status: 'available', closesWeek: 5 });
  expect(rows.find(e => e.id === 'open-cup')).toMatchObject({ status: 'available', closesWeek: 6 });
  expect(rows.find(e => e.id === 'invitational')).toMatchObject({ status: 'locked', detail: 'Win Break the Line to unlock entry' });
});
it('warns only before crossing an open unentered deadline, for single and multi-week advances', () => {
  expect(ids(state(3))).toEqual([]);
  expect(ids(state(4))).toEqual(['skills-camp']);
  expect(ids(state(5))).toEqual(['showground']);
  expect(ids(state(6))).toEqual(['open-cup']);
  expect(ids(state(1), 6)).toEqual(['skills-camp', 'showground', 'open-cup']);
  expect(ids(state(7))).toEqual([]);
});
it('suppresses registered and declined entries, but a cancelled booking is offered again', () => {
  let s = state(4);
  const camp = currentSkillsCamp(s)!;
  const booked = changeCampBooking(s, camp.id, camp.revision, { kind: 'book', participantId: s.squad[0]!.id, focus: 'balanced' });
  if (!booked.ok) throw Error(booked.message);
  expect(ids(booked.state)).toEqual([]);
  const cancel = changeCampBooking(booked.state, camp.id, 1, {kind: 'cancel'});
  if (!cancel.ok) throw Error(cancel.message);
  expect(ids(cancel.state)).toEqual(['skills-camp']);
  s = state(5);
  const challenge = changeChallenge(s, 'showground', {kind:'book', participantId:s.squad.find(p=>!p.injuredWeeks && !p.suspendedWeeks)!.id});
  if (!challenge.ok) throw Error(challenge.message);
  expect(ids(challenge.state)).toEqual([]);
  const cancelled = changeChallenge(challenge.state, 'showground', {kind:'cancel'});
  if (!cancelled.ok) throw Error(cancelled.message);
  expect(ids(cancelled.state)).toEqual(['showground']);
  s = state(6); s.competitions!.openCupEntry!.current.choice = 'decline';
  expect(ids(s)).toEqual([]);
});
it('keeps missed, locked, closed-career and legacy states honest', () => {
  const s = state(8);
  expect(eventOpportunities(s).filter(e=>['skills-camp','showground','open-cup'].includes(e.id)).every(e=>e.detail.includes('next season'))).toBe(true);
  s.competitions!.leagueCareer!.phase = 'next-season-choice';
  expect(ids(s, 30)).toEqual([]);
  expect(eventOpportunities(s).some(e=>e.status==='available')).toBe(false);
  delete s.competitions;
  expect(eventOpportunities(s)).toEqual([]);
});
it('acknowledgements apply only to the passed run and season', () => {
  const s = state(); const key = closingEventOpportunities(s, 1)[0]!.key;
  expect(ids(s, 1, new Set([key]))).toEqual([]);
  expect(ids(s)).toEqual(['skills-camp']);
  const next = state(); next.season++;
  next.competitions!.instances.forEach(i => i.season = next.season);
  next.competitions!.openCupEntry!.current.season = next.season;
  expect(ids(next, 1, new Set([key]))).toEqual(['skills-camp']);
});
it('keeps the Invitational discoverable before opening and warns only once it is open', () => {
  const s = state(8);
  // Qualification is an earned historical result, not the current booking window.
  s.competitions!.individualChallenges = [{
    editionId:'showground', clubId:s.clubId, season:s.season, status:'completed',
    contest:{progress:{result:'won'}},
  } as IndividualChallengeRecord];
  expect(eventOpportunities(s).find(e=>e.id==='invitational')).toMatchObject({status:'upcoming'});
  expect(ids(s, 20)).toEqual([]);
  expect(ids({...s, week:9}, 4)).toEqual([]);
  expect(ids({...s, week:9}, 5)).toEqual(['invitational']);
  expect(ids({...s, week:13})).toEqual(['invitational']);
  expect(eventOpportunities({...s, week:14}).find(e=>e.id==='invitational')).toMatchObject({status:'missed'});
});
it('offers no entries in a sacked career or before the initial League choice', () => {
  const s = state(); s.sacked = {season:1, reason:'Board decision'};
  expect(ids(s, 20)).toEqual([]);
  s.competitions!.leagueCareer!.phase = 'initial-choice';
  expect(eventOpportunities(s)).toEqual([]);
});
