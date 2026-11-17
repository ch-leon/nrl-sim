import { describe, expect, it } from 'vitest';
import { AU_PACK } from '../../src/content/au';
import { AU_CAREER_PROFILE as profile } from '../../src/content/career/au';
import { buildDivisionSchedule, type LeagueFields } from '../../src/data/divisions';
import { buildDivisionTrials } from '../../src/systems/divisionCareer';
import { validateCompetitions } from '../../src/data/competition';
import { createNewGame, getState } from '../../src/core/state';

const fields: LeagueFields = Object.fromEntries(profile.divisions.map(d => [d.id, d.entrants.map(e => e.clubId)]));
describe('pure season-only regional scheduling', () => {
  it.each([1, 2, 3])('builds season %i without people or external RNG changes', season => {
    const original = JSON.stringify({ profile, fields, rules: AU_PACK.rules });
    createNewGame('Purity witness', 987); const before = JSON.stringify(getState());
    const schedule = buildDivisionSchedule(profile, AU_PACK, season, fields, 573);
    const trials = buildDivisionTrials(schedule, profile, season, 573);
    expect(buildDivisionSchedule(profile, AU_PACK, season, fields, 573)).toEqual(schedule);
    expect(JSON.stringify(getState())).toBe(before);
    expect(JSON.stringify({ profile, fields, rules: AU_PACK.rules })).toBe(original);
    expect(Object.keys(schedule).sort()).toEqual(['divisions', 'instances', 'profile']);
    const instances = [...schedule.instances, ...trials];
    expect(instances.every(i => i.season === season && i.id.includes(`:s${season}:`))).toBe(true);
    expect(new Set(instances.flatMap(i => i.fixtures.map(f => f.id))).size).toBe(192);
    for (const league of schedule.instances) {
      expect(league.entrantIds).toEqual(fields[schedule.divisions.find(d => d.instanceId === league.id)!.id]);
      expect(league.fixtures.every(f => f.slot !== undefined && f.status === 'scheduled')).toBe(true);
      for (const a of league.entrantIds) for (const b of league.entrantIds.filter(id => id !== a))
        expect(league.fixtures.filter(f => f.homeId === a && f.awayId === b)).toHaveLength(1);
    }
    for (const clubId of Object.values(fields).flat()) expect(trials.flatMap(i => i.fixtures).filter(f => f.homeId === clubId || f.awayId === clubId).map(f => f.slot)).toEqual([1, 4]);
    expect(validateCompetitions({ schemaVersion: 1, instances, world: { profile: schedule.profile, divisions: schedule.divisions }, calendar: { mode: 'structural', status: 'active', season, elapsedIntervals: 0, slots: profile.calendarSlots } }, { pack: 'au', season, week: 1, clubIds: Object.values(fields).flat() })).toBeNull();
    schedule.instances[0]!.definition.matchRules.tryPoints++;
    expect(AU_PACK.rules.tryPoints).toBe(4);
  });
  it('rejects missing, duplicate, foreign or wrong-sized chosen fields', () => {
    for (const bad of [{}, { ...fields, extra: [] }, { ...fields, [profile.startingDivisionId]: ['missing'] }, { ...fields, [profile.startingDivisionId]: fields[profile.divisions[1]!.id] }])
      expect(() => buildDivisionSchedule(profile, AU_PACK, 2, bad, 573)).toThrow();
  });
  it('derives distinct season-2 and season-3 draws from the same immutable schedule seed', () => {
    const second = buildDivisionSchedule(profile, AU_PACK, 2, fields, 573);
    const third = buildDivisionSchedule(profile, AU_PACK, 3, fields, 573);
    const draw = (schedule: typeof second) => schedule.instances.map(i => i.fixtures.map(f => [f.round, f.homeId, f.awayId]));
    expect(draw(second)).not.toEqual(draw(third));
  });

});
