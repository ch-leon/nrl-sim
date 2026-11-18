import { describe, expect, it } from 'vitest';
import { AU_PACK } from '../../src/content/au';
import { UK_PACK } from '../../src/content/uk';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { createNewGame, getState } from '../../src/core/state';
import { validateCompetitions, type CompetitionInstance, type CompetitionCareerState } from '../../src/data/competition';
import { buildDivisionSchedule, type LeagueFields, type RegionalCareerProfile } from '../../src/data/divisions';
import { buildSavedLeagueSchedule } from '../../src/data/leagueSchedule';
import { leagueCloseFacts, leagueEntryReceiptId } from '../../src/data/leagueCareer';
import type { ContentPack } from '../../src/content/pack';
import { buildDivisionTrials } from '../../src/systems/divisionCareer';
import { openCupProfileSlots, structuralOpenCup } from '../../src/systems/openCupCareer';

const regions = [{ profile: AU_CAREER_PROFILE, pack: AU_PACK }, { profile: UK_CAREER_PROFILE, pack: UK_PACK }];
const seed = 573;

function snapshot(profile: RegionalCareerProfile, pack: ContentPack, season: number) {
  const fields: LeagueFields = Object.fromEntries(profile.divisions.map(d => [d.id, d.entrants.map(e => e.clubId)]));
  const clubIds = ['player', ...profile.clubs.map(c => c.id)];
  const schedule = buildDivisionSchedule(profile, pack, season, fields, seed);
  const world = { profile: schedule.profile, divisions: schedule.divisions };
  const trials = buildDivisionTrials(schedule, profile, season, seed);
  const source = { schemaVersion: 1, world, instances: [...schedule.instances, ...trials],
    calendar: { mode: 'structural', status: 'active', season, elapsedIntervals: 0, slots: profile.calendarSlots.map(s => ({ ...s })) },
  } satisfies CompetitionCareerState;
  return { source, fields, clubIds, leagues: schedule.instances, trials };
}

const trialDraw = (instances: readonly CompetitionInstance[]) => instances.filter(i => i.definition.format.kind === 'exhibition')
  .flatMap(i => i.fixtures.map(f => [f.slot, f.homeId, f.awayId]));

describe('saved League calendar scheduling', () => {
  it.each(regions)('rebuilds complete $pack.id years 2 and 3 with the established draws', ({ profile, pack }) => {
    const { source, fields, clubIds } = snapshot(profile, pack, 1);
    source.instances.push(structuralOpenCup(profile, pack, seed, clubIds, 'player')!);
    const live = createNewGame('Schedule purity witness', 987);
    const liveBefore = JSON.stringify(live);
    const before = JSON.stringify({ source, fields, clubIds });
    const second = buildSavedLeagueSchedule(source, 2, fields, seed, clubIds);
    const fromSecond: CompetitionCareerState = { schemaVersion: 1, world: second.world, instances: [...source.instances, ...second.instances],
      calendar: { ...source.calendar, season: 2, slots: second.slots } };
    const third = buildSavedLeagueSchedule(fromSecond, 3, fields, seed, clubIds);

    for (const [year, previous, rebuilt] of [[2, source, second], [3, fromSecond, third]] as const) {
      const authored = buildDivisionSchedule(profile, pack, year, fields, seed);
      expect(rebuilt).toEqual({ world: { profile: authored.profile, divisions: authored.divisions }, slots: profile.calendarSlots,
        instances: [...authored.instances, ...buildDivisionTrials(authored, profile, year, seed)] });
      expect(buildSavedLeagueSchedule(previous, year, fields, seed, clubIds)).toEqual(rebuilt);
      const fixtures = rebuilt.instances.flatMap(i => i.fixtures);
      expect(new Set(fixtures.map(f => f.id)).size).toBe(192);
      expect(Object.keys(rebuilt).sort()).toEqual(['instances', 'slots', 'world']);
      expect(rebuilt.instances.every(i => i.id.includes(`:s${year}:`) && i.fixtures.every(f => f.slot && f.status === 'scheduled'))).toBe(true);
      const busy = new Set(fixtures.map(f => f.slot));
      expect(openCupProfileSlots(profile)).toHaveLength(5);
      expect(openCupProfileSlots(profile).every(slot => !busy.has(slot))).toBe(true);
      for (const league of authored.instances) {
        for (const a of league.entrantIds) for (const b of league.entrantIds.filter(id => id !== a))
          expect(league.fixtures.filter(f => f.homeId === a && f.awayId === b)).toHaveLength(1);
      }
      for (const clubId of clubIds) {
        const dates = fixtures.filter(f => f.homeId === clubId || f.awayId === clubId).map(f => f.slot);
        expect(dates).toHaveLength(16);
        expect(new Set(dates).size).toBe(dates.length);
      }
      expect(validateCompetitions({ schemaVersion: 1, world: rebuilt.world, instances: rebuilt.instances,
        calendar: { ...source.calendar, season: year, slots: rebuilt.slots } }, { pack: pack.id, season: year, week: 1, clubIds })).toBeNull();
    }
    const divisionDraw = (instances: readonly CompetitionInstance[]) => instances.filter(i => i.definition.format.kind === 'league')
      .flatMap(i => i.fixtures.map(f => [f.round, f.homeId, f.awayId]));
    expect(divisionDraw(second.instances)).not.toEqual(divisionDraw(third.instances));
    expect(trialDraw(second.instances)).not.toEqual(trialDraw(third.instances));
    expect(second.instances[0]!.tieOrder).not.toEqual(third.instances[0]!.tieOrder);
    expect(JSON.stringify({ source, fields, clubIds })).toBe(before);
    expect(getState()).toBe(live);
    expect(JSON.stringify(getState())).toBe(liveBefore);
  });

  it('uses saved rules and dates for the source division even after clubs move', () => {
    const { source, fields, clubIds, leagues, trials } = snapshot(AU_CAREER_PROFILE, AU_PACK, 1);
    const [local, next] = source.world.divisions;
    const localLeague = leagues[0]!;
    local!.name = 'Saved Local League';
    localLeague.definition.name = local!.name;
    localLeague.definition.matchRules.tryPoints = 5;
    localLeague.definition.lineup.benchSize = 3;
    localLeague.definition.standings = { win: 3, draw: 1, loss: 0, tieBreakers: ['points-for', 'frozen-order'] };
    localLeague.definition.venues.final = 'same-as-rounds';
    localLeague.definition.drawnKnockout = 'higher-seed';
    localLeague.definition.format = { kind: 'league', finalsSize: 2 };
    localLeague.definition.stages[0] = { ...localLeague.definition.stages[0]!, id: 'round-robin', name: 'Home and Away',
      slotIds: [7, ...localLeague.definition.stages[0]!.slotIds!.slice(2), 24] };
    localLeague.definition.stages[1] = { id: 'decider', kind: 'knockout', name: 'Grand Final', rounds: 1, slotIds: [25] };
    localLeague.stageId = 'round-robin';
    for (const f of localLeague.fixtures) {
      f.stageId = 'round-robin';
      f.slot = localLeague.definition.stages[0]!.slotIds![f.round - 1]!;
    }
    source.calendar.slots[1]!.kind = 'preseason';
    for (const trial of trials.filter(t => t.entrantIds.every(id => localLeague.entrantIds.includes(id)))) {
      const f = trial.fixtures[0]!;
      if (f.slot === 1) {
        f.slot = 2;
        trial.definition.stages[0]!.slotIds = [2];
      }
      trial.definition.name = f.slot === 2 ? 'Local warm-up' : 'Local hit-out';
      trial.definition.matchRules.tryPoints = f.slot === 2 ? 6 : 5;
      trial.definition.stages[0]!.name = trial.definition.name;
      trial.definition.stages[0]!.id = 'local-trial';
      trial.stageId = 'local-trial';
      f.stageId = 'local-trial';
    }
    const moved = fields[next!.id]![0]!;
    const target = { ...fields, [local!.id]: [...fields[local!.id]!.slice(1), moved], [next!.id]: ['player', ...fields[next!.id]!.slice(1)] };
    const before = JSON.stringify({ source, target });
    const rebuilt = buildSavedLeagueSchedule({ ...source, instances: [...source.instances].reverse() }, 2, target, seed, clubIds);
    expect(rebuilt.slots).toEqual(source.calendar.slots);
    expect(rebuilt.world.divisions[0]).toEqual({ ...local, instanceId: rebuilt.instances[0]!.id });
    expect(rebuilt.instances[0]!.definition).toEqual(localLeague.definition);
    expect(rebuilt.instances[0]!.entrantIds).toEqual(target[local!.id]);
    expect(new Set(rebuilt.instances[0]!.fixtures.map(f => f.slot))).toEqual(new Set(localLeague.definition.stages[0]!.slotIds));
    expect(rebuilt.instances[0]!.fixtures.every(f => f.stageId === 'round-robin')).toBe(true);

    const outputTrials = rebuilt.instances.filter(i => i.definition.format.kind === 'exhibition');
    for (const id of target[local!.id]!) {
      const games = outputTrials.filter(i => i.entrantIds.includes(id));
      expect(games.map(i => i.fixtures[0]!.slot)).toEqual([2, 4]);
      expect(games.every(i => i.stageId === 'local-trial')).toBe(true);
      expect(games.map(i => i.definition.matchRules.tryPoints)).toEqual([6, 5]);
      expect(games.map(i => i.definition.name)).toEqual(['Local warm-up', 'Local hit-out']);
    }
    const playerTrials = outputTrials.filter(i => i.entrantIds.includes('player'));
    expect(playerTrials.map(i => [i.fixtures[0]!.slot, i.definition.name])).toEqual([[1, 'Preseason trial'], [4, 'Preseason trial']]);

    rebuilt.instances[0]!.definition.standings!.tieBreakers.pop();
    rebuilt.instances[0]!.definition.stages[0]!.slotIds!.reverse();
    outputTrials[0]!.definition.matchRules.tryPoints++;
    expect(outputTrials[1]!.definition.matchRules.tryPoints).toBe(6);
    rebuilt.slots[0]!.kind = 'rest';
    rebuilt.world.divisions[0]!.name = 'Edited output';
    rebuilt.world.profile.version++;
    expect(JSON.stringify({ source, target })).toBe(before);
  });

  it('preserves separate saved semifinal and grand final stages', () => {
    const { source, fields, clubIds, leagues, trials } = snapshot(AU_CAREER_PROFILE, AU_PACK, 1);
    const definition = leagues[0]!.definition;
    const [semifinal, grandFinal] = definition.stages[1]!.slotIds!;
    definition.stages.splice(1, 1,
      { id: 'semifinal', name: 'Semifinals', kind: 'knockout', rounds: 1, slotIds: [semifinal!] },
      { id: 'grand-final', name: 'Grand Final', kind: 'knockout', rounds: 1, slotIds: [grandFinal!] });
    expect(validateCompetitions(source, { pack: 'au', season: 1, week: 1, clubIds })).toBeNull();

    const next = buildSavedLeagueSchedule(source, 2, fields, seed, clubIds);
    expect(next.instances[0]!.definition).toEqual(definition);
    expect(next.instances[0]!.fixtures.every(f => f.stageId === definition.stages[0]!.id)).toBe(true);
    expect(next.slots).toEqual(source.calendar.slots);
    expect(next.instances.slice(leagues.length).map(i => i.definition)).toEqual(trials.map(i => i.definition));
  });

  it('takes trial templates from a closed marked season and binds its saved seed', () => {
    const { source, fields, clubIds, trials } = snapshot(AU_CAREER_PROFILE, AU_PACK, 1);
    for (const i of source.instances) {
      i.status = 'withdrawn';
      for (const f of i.fixtures) f.status = 'cancelled';
    }
    const completed = trials[0]!;
    completed.status = 'completed';
    completed.winnerId = completed.fixtures[0]!.homeId;
    completed.fixtures[0]!.status = 'completed';
    completed.fixtures[0]!.result = { homeScore: 22, awayScore: 0, winnerId: completed.winnerId, decider: 'score' };
    const { startingDivisionId, id } = source.world.profile;
    const marked: CompetitionCareerState = { ...source,
      calendar: { ...source.calendar, status: 'awaiting-next-season', elapsedIntervals: source.calendar.slots.length },
      leagueCareer: { version: 1, clubId: 'player', scheduleSeed: seed, initialFields: fields, phase: 'next-season-choice',
        access: [{ leagueId: startingDivisionId }],
        close: leagueCloseFacts(source.world, source.instances, 1),
        accepted: { season: 1, startInterval: 0, leagueId: startingDivisionId, receiptId: leagueEntryReceiptId(id, 1, 'player', startingDivisionId),
          allocationPolicy: 'adjacent-vacancy-v1', movements: [] } } };
    expect(validateCompetitions(marked, { pack: 'au', season: 1, week: source.calendar.slots.length, clubIds })).toBeNull();
    const rebuilt = buildSavedLeagueSchedule(marked, 2, fields, seed, clubIds);
    expect(rebuilt.instances.every(i => i.status === 'scheduled' && i.winnerId === undefined
      && i.fixtures.every(f => f.status === 'scheduled' && f.result === undefined))).toBe(true);
    expect(() => buildSavedLeagueSchedule(marked, 2, fields, seed + 1, clubIds)).toThrow(/seed/i);
  });

  it.each(['missing', 'mixed divisions', 'mixed templates', 'wrong date', 'wrong identity', 'older year only'])('rejects %s trial snapshots', defect => {
    const { source, fields, clubIds, trials } = snapshot(AU_CAREER_PROFILE, AU_PACK, 2);
    const first = trials[0]!;
    const otherDivision = trials[8]!;
    switch (defect) {
      case 'missing':
        source.instances.splice(source.instances.indexOf(first), 1);
        break;
      case 'mixed divisions': {
        const firstAway = first.entrantIds[1]!;
        const otherAway = otherDivision.entrantIds[1]!;
        for (const [trial, away] of [[first, otherAway], [otherDivision, firstAway]] as const) {
          trial.entrantIds[1] = away;
          trial.tieOrder[1] = away;
          trial.fixtures[0]!.awayId = away;
        }
        break;
      }
      case 'mixed templates':
        first.definition.matchRules.tryPoints++;
        break;
      case 'wrong date':
        source.calendar.slots[0]!.kind = 'competition';
        break;
      case 'wrong identity':
        first.fixtures[0]!.id += '-bad';
        break;
      case 'older year only': {
        const old = snapshot(AU_CAREER_PROFILE, AU_PACK, 1);
        source.instances = [...source.instances.filter(i => i.definition.format.kind === 'league'), ...old.trials];
        break;
      }
    }
    expect(() => buildSavedLeagueSchedule(source, 3, fields, seed, clubIds)).toThrow(/trial/i);
  });

  it('rejects incompatible source and target fields, seasons and seeds', () => {
    const { source, fields, clubIds, leagues } = snapshot(AU_CAREER_PROFILE, AU_PACK, 1);
    const local = AU_CAREER_PROFILE.startingDivisionId;
    const { [local]: localField, ...otherFields } = fields;
    const inherited = Object.assign(Object.create({ [local]: localField }), otherFields, { foreign: localField });
    for (const bad of [{}, { ...fields, extra: [] }, inherited, { ...fields, [local]: ['player'] },
      { ...fields, [local]: ['foreign', ...fields[local]!.slice(1)] },
      { ...fields, [local]: ['player', 'player', ...fields[local]!.slice(2)] }]) {
      expect(() => buildSavedLeagueSchedule(source, 2, bad, seed, clubIds)).toThrow(/field/i);
    }
    expect(() => buildSavedLeagueSchedule(source, 2, fields, seed, [...clubIds.slice(0, -1), clubIds[0]!])).toThrow(/club/i);
    for (const bad of [1, 3, NaN, 2.5]) expect(() => buildSavedLeagueSchedule(source, bad, fields, seed, clubIds)).toThrow(/season/i);
    for (const bad of [-1, 0x100000000, Infinity, 0.5]) expect(() => buildSavedLeagueSchedule(source, 2, fields, bad, clubIds)).toThrow(/seed/i);
    leagues[0]!.definition.id = 'unbound-league';
    expect(() => buildSavedLeagueSchedule(source, 2, fields, seed, clubIds)).toThrow(/division/i);
  });
});
