import { describe, expect, it } from 'vitest';
import { validateCompetitions } from '../../src/data/competition';
import { leagueCloseFacts, leagueEntryReceiptId, leagueTitleEvidence, validateLeagueCareer } from '../../src/data/leagueCareer';
import { allocateLeagueFields } from '../../src/data/leagueAllocation';
import { buildDivisionSchedule } from '../../src/data/divisions';
import { AU_PACK } from '../../src/content/au';
import { competitions, progress, clubIds, profile } from './leagueCareerFixtures';

const context = { pack: 'au', season: 1, week: 5, clubIds, clubId: 'player' };
function closed() {
  const c = competitions(); const close = leagueCloseFacts(c.world!, c.instances, 1);
  c.leagueCareer = { ...progress(), phase: 'next-season-choice', close, accepted: {allocationPolicy: 'adjacent-vacancy-v1', movements: [], season: 1, leagueId: profile.startingDivisionId, receiptId: leagueEntryReceiptId(c.world!.profile.id, 1, 'player', profile.startingDivisionId)} };
  return c;
}
describe('strict League career progression metadata', () => {
  it('validates initial, active and source-year closed states independently of runtime admission', () => {
    const c = competitions(1, false); c.leagueCareer = progress();
    expect(validateCompetitions(c, {...context, week: 1})).toBeNull();
    c.leagueCareer.phase = 'active'; c.leagueCareer.accepted = closed().leagueCareer!.accepted!;
    expect(validateCompetitions(c, {...context, week: 1})).toBeNull();
    expect(validateCompetitions(closed(), context)).toBeNull();
    const old = competitions(); expect(validateCompetitions(old, {...context, season: 2, week: 1})).toBeNull();
    expect(validateCompetitions(old, context)).toBe('competition calendar season');
  });
  it.each([
    ['unknown key', (c: ReturnType<typeof closed>) => Object.assign(c.leagueCareer!, {money: 1})],
    ['wrong club', (c: ReturnType<typeof closed>) => { c.leagueCareer!.clubId = clubIds[1]!; }],
    ['bad seed', (c: ReturnType<typeof closed>) => { c.leagueCareer!.scheduleSeed = -1; }],
    ['wrong phase', (c: ReturnType<typeof closed>) => { c.leagueCareer!.phase = 'bad' as 'active'; }],
    ['duplicate access', (c: ReturnType<typeof closed>) => { c.leagueCareer!.access.push({...c.leagueCareer!.access[0]!}); }],
    ['unknown league', (c: ReturnType<typeof closed>) => { c.leagueCareer!.access[0]!.leagueId = 'uk-local'; }],
    ['wrong source year', (c: ReturnType<typeof closed>) => { c.leagueCareer!.close!.season = 2; }],
    ['fake champion', (c: ReturnType<typeof closed>) => { c.leagueCareer!.close!.leagues[0]!.championId = clubIds[1]!; }],
    ['fake final', (c: ReturnType<typeof closed>) => { c.leagueCareer!.close!.leagues[0]!.finalFixtureId = 'missing'; }],
    ['fake minor', (c: ReturnType<typeof closed>) => { c.leagueCareer!.close!.leagues[0]!.minorPremierId = 'missing'; }],
    ['fake standings', (c: ReturnType<typeof closed>) => { c.leagueCareer!.close!.leagues[0]!.standings.reverse(); }],
    ['unknown receipt field', (c: ReturnType<typeof closed>) => { Object.assign(c.leagueCareer!.accepted!, {cash: 1}); }],
    ['unknown movement field', (c: ReturnType<typeof closed>) => { c.leagueCareer!.accepted!.movements.push({clubId: 'player', fromLeagueId: profile.startingDivisionId, toLeagueId: profile.divisions[1]!.id, cash: 1} as never); }],
    ['fake receipt', (c: ReturnType<typeof closed>) => { c.leagueCareer!.accepted!.receiptId += 'x'; }],
    ['wrong accepted league', (c: ReturnType<typeof closed>) => { c.leagueCareer!.accepted!.leagueId = profile.divisions[1]!.id; }],
    ['wrong pack', (c: ReturnType<typeof closed>) => { c.world!.profile.pack = 'uk'; }],
    ['earned without final', (c: ReturnType<typeof closed>) => { c.leagueCareer!.access.push({leagueId: profile.divisions[1]!.id, earnedFrom: {...leagueTitleEvidence(c.instances[0]!, profile.startingDivisionId, profile.divisions[1]!.id)!, finalFixtureId: c.instances[0]!.fixtures[0]!.id}}); }],
  ])('rejects %s', (_name, mutate) => { const c = closed(); mutate(c); expect(validateCompetitions(c, context)).not.toBeNull(); });
  it('accepts a recorded recovery forfeit title and rejects a fake scored winner', () => {
    const c = closed(); const instance = c.instances[0]!; instance.fixtures[2]!.result!.decider = 'forfeit';
    c.leagueCareer!.access.push({leagueId: profile.divisions[1]!.id, earnedFrom: leagueTitleEvidence(instance, profile.startingDivisionId, profile.divisions[1]!.id)!});
    expect(validateCompetitions(c, context)).toBeNull();
    c.leagueCareer!.access[1]!.earnedFrom!.result.homeScore = 99; c.leagueCareer!.access[1]!.earnedFrom!.result.awayScore = 99;
    expect(validateCompetitions(c, context)).not.toBeNull();
  });
  it('retains provenance against historical instances after the current league and year change', () => {
    const c = closed(); const old = c.instances[0]!;
    const current = competitions(2, false); current.instances = [...c.instances, ...current.instances];
    current.leagueCareer = {...progress(), phase: 'active', access: [...progress().access, {leagueId: profile.divisions[1]!.id, earnedFrom: leagueTitleEvidence(old, profile.startingDivisionId, profile.divisions[1]!.id)!}], close: c.leagueCareer!.close!,
      accepted: {allocationPolicy: 'adjacent-vacancy-v1', movements: [], season: 2, leagueId: profile.startingDivisionId, receiptId: leagueEntryReceiptId(profile.id, 2, 'player', profile.startingDivisionId)} };
    expect(validateCompetitions(current, {...context, season: 2, week: 1})).toBeNull();
    old.fixtures[2]!.status = 'cancelled'; delete old.fixtures[2]!.result;
    expect(validateLeagueCareer(current.leagueCareer, current, {...context, season: 2, week: 1})).not.toBeNull();
  });
  it('validates self-contained title evidence after its old source season is pruned', () => {
    const old = competitions(); const previous = competitions(2); const current = competitions(3, false);
    current.instances = [...previous.instances, ...current.instances];
    current.leagueCareer = {...progress(), phase: 'active', access: [...progress().access,
      {leagueId: profile.divisions[1]!.id, earnedFrom: leagueTitleEvidence(old.instances[0]!, profile.startingDivisionId, profile.divisions[1]!.id)!}],
      close: leagueCloseFacts(previous.world!, previous.instances, 2), accepted: {allocationPolicy: 'adjacent-vacancy-v1', movements: [], season: 3, leagueId: profile.startingDivisionId,
        receiptId: leagueEntryReceiptId(profile.id, 3, 'player', profile.startingDivisionId)} };
    expect(validateCompetitions(current, {...context, season: 3, week: 1})).toBeNull();
    current.leagueCareer.access[1]!.earnedFrom!.result.winnerId = 'missing';
    expect(validateCompetitions(current, {...context, season: 3, week: 1})).not.toBeNull();
  });

  it('accepts semantically identical JSON objects after their keys are reordered', () => {
    const c = closed(); c.leagueCareer!.access.push({leagueId: profile.divisions[1]!.id,
      earnedFrom: leagueTitleEvidence(c.instances[0]!, profile.startingDivisionId, profile.divisions[1]!.id)!});
    const reorder = (v: unknown): unknown => Array.isArray(v) ? v.map(reorder) : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).reverse().map(([k,value]) => [k, reorder(value)])) : v;
    expect(validateCompetitions(reorder(c), context)).toBeNull();
  });

  it('records only played regular facts for a withdrawn league, without inventing honours', () => {
    const c = closed(); const withdrawn = c.instances[1]!; withdrawn.status = 'withdrawn'; delete withdrawn.winnerId;
    for (const f of withdrawn.fixtures.slice(1)) {f.status = 'cancelled'; delete f.result;}
    c.leagueCareer!.close = leagueCloseFacts(c.world!, c.instances, 1);
    const fact = c.leagueCareer!.close.leagues[1]!;
    expect(fact).not.toHaveProperty('championId'); expect(fact).not.toHaveProperty('minorPremierId');
    expect(fact.standings[0]!.clubId).toBe(withdrawn.fixtures[0]!.homeId);
    expect(validateCompetitions(c, context)).toBeNull();
  });
  it('requires the previous close for active later years and bounds retained instances to two years', () => {
    const current = competitions(3, false); const previous = competitions(2);
    current.instances = [...previous.instances, ...current.instances];
    current.leagueCareer = {...progress(), phase: 'active', accepted: {season: 3, leagueId: profile.startingDivisionId,
      allocationPolicy: 'adjacent-vacancy-v1', movements: [], receiptId: leagueEntryReceiptId(profile.id, 3, 'player', profile.startingDivisionId)}};
    expect(validateCompetitions(current, {...context, season: 3, week: 1})).toBe('league career missing close');
    current.leagueCareer.close = leagueCloseFacts(previous.world!, previous.instances, 2);
    current.instances.unshift(...competitions(1).instances);
    expect(validateCompetitions(current, {...context, season: 3, week: 1})).toBe('league career retained seasons');
  });

  it.each([1, 2])('requires a real retained title source in current season %i', season => {
    const old = competitions(); const title = leagueTitleEvidence(old.instances[0]!, profile.startingDivisionId, profile.divisions[1]!.id)!;
    const c = season === 1 ? closed() : competitions(2, false);
    if (season === 2) {
      c.instances = [...old.instances, ...c.instances];
      c.leagueCareer = {...progress(), phase: 'active', close: leagueCloseFacts(old.world!, old.instances, 1),
        accepted: {season: 2, leagueId: profile.startingDivisionId, allocationPolicy: 'adjacent-vacancy-v1', movements: [],
          receiptId: leagueEntryReceiptId(profile.id, 2, 'player', profile.startingDivisionId)}};
    }
    c.leagueCareer!.access.push({leagueId: profile.divisions[1]!.id, earnedFrom: title});
    const cursor = {...context, season, week: season === 1 ? 5 : 1};
    expect(validateCompetitions(c, cursor)).toBeNull();
    title.instanceId = title.instanceId.replace(':i0', ':i99');
    title.finalFixtureId = title.finalFixtureId.replace(':i0', ':i99');
    expect(validateCompetitions(c, cursor)).toBe('league career title source');
  });

  it('rejects an early annual choice after withdrawn competitions and an unsettled final cursor', () => {
    const c = closed();
    for (const instance of c.instances) {
      instance.status = 'withdrawn'; delete instance.winnerId;
      for (const f of instance.fixtures) {f.status = 'cancelled'; delete f.result;}
    }
    c.leagueCareer!.close = leagueCloseFacts(c.world!, c.instances, 1);
    c.calendar!.elapsedIntervals = 0;
    expect(validateCompetitions(c, {...context, week: 1})).toBe('league career phase');
    expect(validateCompetitions(c, context)).toBe('league career phase');
    c.calendar!.elapsedIntervals = c.calendar!.slots.length;
    expect(validateCompetitions(c, context)).toBeNull();
  });
  it('rejects an active cursor whose preceding calendar intervals have not settled', () => {
    const c = competitions(1, false); c.leagueCareer = {...progress(), phase: 'active', accepted: closed().leagueCareer!.accepted!};
    expect(validateCompetitions(c, {...context, week: 3})).toBe('league career phase');
    c.calendar!.elapsedIntervals = 2;
    expect(validateCompetitions(c, {...context, week: 3})).toBeNull();
  });

  it.each(['swapped definitions', 'swapped instance pointers', 'initial wrong field', 'false first-year movement'] as const)('rejects %s', fault => {
    const c = competitions(1, false); c.leagueCareer = {...progress(), phase: 'active', accepted: closed().leagueCareer!.accepted!};
    if (fault === 'swapped definitions') {
      [c.instances[0]!.definition.id, c.instances[2]!.definition.id] = [c.instances[2]!.definition.id, c.instances[0]!.definition.id];
    }
    if (fault === 'swapped instance pointers') {
      [c.world!.divisions[0]!.instanceId, c.world!.divisions[2]!.instanceId] = [c.world!.divisions[2]!.instanceId, c.world!.divisions[0]!.instanceId];
    }
    if (fault === 'initial wrong field') {
      c.leagueCareer.phase = 'initial-choice'; delete c.leagueCareer.accepted;
      [c.instances[0]!.entrantIds, c.instances[2]!.entrantIds] = [c.instances[2]!.entrantIds, c.instances[0]!.entrantIds];
      for (const instance of c.instances) {instance.tieOrder = [...instance.entrantIds]; instance.fixtures = [];}
    }
    if (fault === 'false first-year movement') c.leagueCareer.accepted!.movements.push({clubId: 'player', fromLeagueId: profile.startingDivisionId, toLeagueId: profile.divisions[1]!.id});
    expect(validateCompetitions(c, {...context, week: 1})).not.toBeNull();
  });
  it('rejects a relabelled Local source that claims a Championship title', () => {
    const c = closed(); const local = c.instances[0]!; const harder = profile.divisions[1]!.id; const top = profile.divisions[2]!.id;
    const fakeId = `${profile.id}:${harder}:s1:i99`; const final = local.fixtures[2]!;
    const relabelled = {...local, id: fakeId, fixtures: local.fixtures.map(f => ({...f, id: f.id.replace(local.id, fakeId), competitionId: fakeId}))};
    c.instances.push(relabelled);
    c.leagueCareer!.access.push({leagueId: harder, earnedFrom: leagueTitleEvidence(local, profile.startingDivisionId, harder)!},
      {leagueId: top, earnedFrom: leagueTitleEvidence(relabelled, harder, top)!});
    expect(final.result!.winnerId).toBe('player');
    expect(validateLeagueCareer(c.leagueCareer, c, context)).toBe('league career title source');
  });
  it('rejects a later-year false movement and fields that differ from the prior close allocation', () => {
    const previous = competitions(); const c = competitions(2, false); c.instances = [...previous.instances, ...c.instances];
    c.leagueCareer = {...progress(), phase: 'active', close: leagueCloseFacts(previous.world!, previous.instances, 1), accepted: {
      season: 2, leagueId: profile.startingDivisionId, allocationPolicy: 'adjacent-vacancy-v1', movements: [],
      receiptId: leagueEntryReceiptId(profile.id, 2, 'player', profile.startingDivisionId)}};
    const cursor = {...context, season: 2, week: 1}; expect(validateCompetitions(c, cursor)).toBeNull();
    c.leagueCareer.accepted!.movements.push({clubId: 'player', fromLeagueId: profile.startingDivisionId, toLeagueId: profile.divisions[1]!.id});
    expect(validateCompetitions(c, cursor)).toBe('league career allocation');
    c.leagueCareer.accepted!.movements = [];
    const current = c.instances.filter(i => i.season === 2);
    [current[1]!.entrantIds, current[2]!.entrantIds] = [current[2]!.entrantIds, current[1]!.entrantIds];
    for (const instance of current) {instance.tieOrder = [...instance.entrantIds]; instance.fixtures = [];}
    expect(validateCompetitions(c, cursor)).toBe('league career allocation');
  });

  it('accepts an earned next-year move with its exact replayed allocation', () => {
    const previous = competitions(); const close = leagueCloseFacts(previous.world!, previous.instances, 1);
    const target = profile.divisions[1]!.id;
    const allocation = allocateLeagueFields(previous.world!, close, 'player', target, previous.instances);
    const schedule = buildDivisionSchedule(profile, AU_PACK, 2, allocation.fields, 573);
    const c = competitions(2, false); c.instances = [...previous.instances, ...schedule.instances];
    c.world = {profile: schedule.profile, divisions: schedule.divisions};
    c.leagueCareer = {...progress(), phase: 'active', close, access: [...progress().access,
      {leagueId: target, earnedFrom: leagueTitleEvidence(previous.instances[0]!, profile.startingDivisionId, target)!}],
      accepted: {season: 2, leagueId: target, allocationPolicy: allocation.policy, movements: allocation.movements,
        receiptId: leagueEntryReceiptId(profile.id, 2, 'player', target)}};
    expect(validateCompetitions(c, {...context, season: 2, week: 1})).toBeNull();
  });

});
