import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/state';
import { competitions, progress } from '../data/leagueCareerFixtures';
import { leagueSeasonView } from '../../src/systems/leagueSeasonView';

function state() {
  const s = createNewGame('Read FC', 574);
  s.competitions = competitions(1, false);
  s.competitions.leagueCareer = { ...progress(), phase: 'active' };
  s.league.fixtures = [{ round: 1, homeId: 'player', awayId: 'wrong' }];
  return s;
}

describe('saved League season view', () => {
  it('reads its own saved field, standings and chronological dates without changing state', () => {
    const s = state();
    const instance = s.competitions!.instances[0]!;
    instance.definition.stages[0]!.name = 'Regional rounds';
    instance.fixtures.reverse();
    const before = JSON.stringify(s);
    const v = leagueSeasonView(s)!;
    expect(v.instance.id).toBe(instance.id);
    expect(v.ladder.map(r => r.clubId).sort()).toEqual([...instance.entrantIds].sort());
    expect(v.fixtures.map(f => f.slot)).toEqual([3, 4]);
    expect(v.next?.slot).toBe(3);
    expect(v.next?.stageLabel).toBe('Regional rounds · round 1');
    expect(v.fixtures.some(f => f.bridge.awayId === 'wrong')).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('retains cancelled rows but never selects them or withdrawn competitions as next', () => {
    const s = state(); const own = s.competitions!.instances[0]!;
    own.fixtures[0]!.status = 'cancelled';
    expect(leagueSeasonView(s)!.next?.slot).toBe(4);
    expect(leagueSeasonView(s)!.fixtures[0]!.status).toBe('cancelled');
    own.status = 'withdrawn'; s.week = 4;
    expect(leagueSeasonView(s)!.currentLabel).toBe('No club fixture');
    expect(leagueSeasonView(s)!.next).toBeUndefined();
  });

  it.each(['initial-choice', 'next-season-choice'] as const)('has no next fixture at %s', phase => {
    const s = state(); s.competitions!.leagueCareer!.phase = phase;
    const v = leagueSeasonView(s)!;
    expect(v.choiceRequired).toBe(true); expect(v.next).toBeUndefined();
  });

  it('retains saved deciders and orders finals after regular rounds even when round restarts', () => {
    const s = state(); s.competitions = competitions(); s.competitions.leagueCareer = { ...progress(), phase: 'active' };
    const v = leagueSeasonView(s)!;
    expect(v.fixtures.map(f => f.slot)).toEqual([3, 4, 5]);
    expect(v.fixtures[2]!.stageLabel).toBe('Finals');
    expect(v.fixtures[2]!.winnerId).toBe('player');
    expect(v.fixtures[2]!.decider).toBe('score');
  });

  it('labels quiet intervals and distinguishes future fixtures from this week', () => {
    const s = state(); s.week = 2; s.competitions!.calendar!.slots[1]!.kind = 'rest';
    const v = leagueSeasonView(s)!;
    expect(v.currentLabel).toBe('Rest week');
    expect(v.next?.slot).toBe(3); expect(v.currentFixtures).toHaveLength(0);
  });

  it('leaves unmarked careers on their original readers', () => {
    const s = state(); delete s.competitions!.leagueCareer;
    expect(leagueSeasonView(s)).toBeNull();
  });
  it('uses the saved frozen standings order and keeps the global club registry out of the field', () => {
    const s = state(); const own = s.competitions!.instances[0]!;
    own.tieOrder.reverse();
    for (const f of own.fixtures) { f.status = 'completed'; f.result = { homeScore: 10, awayScore: 10, decider: 'draw' }; }
    const v = leagueSeasonView(s)!;
    expect(v.ladder.map(row => row.clubId)).toEqual(own.tieOrder);
    expect(v.fieldSize).toBe(2);
    expect(v.fixtures.every(row => row.instance.id === own.id)).toBe(true);
  });

  it('includes actual registered player trials but excludes offered events and other divisions', () => {
    const s = state(); const own = s.competitions!.instances[0]!;
    const trial = structuredClone(own); trial.id = 'trial'; trial.definition.format = { kind: 'exhibition' };
    trial.definition.stages = [{ id: 'trial', name: 'Warm up', kind: 'exhibition', rounds: 1, slotIds: [1] }];
    trial.fixtures = [{ ...trial.fixtures[0]!, id: 'trial:f0', competitionId: trial.id, stageId: 'trial', round: 1, slot: 1 }];
    s.competitions!.instances.push(trial);
    expect(leagueSeasonView(s)!.next?.stageLabel).toBe('Warm up');
    trial.status = 'offered';
    expect(leagueSeasonView(s)!.fixtures.map(row => row.slot)).toEqual([3, 4]);
  });

  it('states the title-only unlock, permanent access and no-finals goals from saved definitions', () => {
    const s = state(); const c = s.competitions!;
    const own = c.world!.divisions[0]!, harder = c.world!.divisions[1]!;
    expect(leagueSeasonView(s)!.goal).toContain(`Win the ${own.name} finals title to unlock ${harder.name} permanently`);
    c.leagueCareer!.access.push({ leagueId: harder.id });
    expect(leagueSeasonView(s)!.goal).toContain(`Access to ${harder.name} is permanent`);
    c.instances[0]!.definition.format = { kind: 'league', finalsSize: 0 };
    expect(leagueSeasonView(s)!.goal).toContain('No finals this season');
    expect(leagueSeasonView(s)!.goal).toContain('no finals title or new league unlock');
  });

  it('does not invent another tier above the highest saved league', () => {
    const s = state(); const c = s.competitions!;
    const first = c.instances[0]!, last = c.instances[2]!;
    const other = last.entrantIds[0]!;
    first.entrantIds = first.entrantIds.map(id => id === 'player' ? other : id);
    first.tieOrder = [...first.entrantIds];
    last.entrantIds = last.entrantIds.map(id => id === other ? 'player' : id);
    last.tieOrder = [...last.entrantIds];
    expect(leagueSeasonView(s)!.goal).toContain('no harder league remains');
  });

});
