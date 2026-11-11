import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { validatePack } from '../../src/content/pack';
import { AU_PACK } from '../../src/content/au';
import { createNewGame, getState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { __setStorage, __unlockSaves, exportRecoverySaves, exportSave, importSave, installImportedSave, loadSlot, migrateState, MIGRATIONS, save, setActiveSlot, writeSlot } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { initLeague } from '../../src/systems/fixtures';
import { competitionFixtureId, competitionInstanceId, createCompetitionInstance, validateCompetitionDefinition, validateCompetitions, type CompetitionDefinition, type CompetitionFixture, type CompetitionFormat, type CompetitionInstance, type CompetitionStandingsPolicy } from '../../src/data/competition';
import { cupDefinition, cupInstance } from '../fixtures/competition';

let bytes: Map<string, string>;
beforeEach(async () => {
  await preparePack('uk'); selectPack('au'); setCareerNamespace(null); setActiveSlot(1); __unlockSaves();
  bytes = new Map();
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { setCareerNamespace(null); __setStorage(null); vi.restoreAllMocks(); });

function career(pack: 'au' | 'uk' = 'au', metadata = true): GameState {
  createNewGame('Competition boundary', 570, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  initLeague(getState());
  const s = getState();
  if (metadata) s.competitions = { schemaVersion: 1, instances: [cupInstance(s.league.clubs.slice(0, 4).map(c => c.id), pack)] };
  return s;
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const instance = (s: GameState): CompetitionInstance => s.competitions!.instances[0]!;
const points: CompetitionStandingsPolicy = { win: 2, draw: 1, loss: 0, tieBreakers: ['points-difference', 'points-for', 'head-to-head-points', 'frozen-order'] };
function definition(format: CompetitionFormat, kinds: Array<{ kind: CompetitionFormat['kind']; rounds: number }>): CompetitionDefinition {
  return {
    ...cupDefinition(), format, minEntrants: format.kind === 'group' || format.kind === 'league' ? 4 : 2,
    maxEntrants: format.kind === 'series' || format.kind === 'exhibition' ? 2 : 4,
    stages: kinds.map((s, i) => ({ ...s, id: `stage-${i}`, name: `Stage ${i}` })), rewards: [],
    ...(format.kind === 'league' || format.kind === 'group' ? { standings: clone(points) } : {}),
  };
}
function played(c: CompetitionInstance, ordinal: number, round: number, homeId: string, awayId: string, winnerId: string, slot: number): CompetitionFixture {
  const stage = c.definition.stages[0]!;
  return {
    id: competitionFixtureId(c.id, ordinal), competitionId: c.id, stageId: stage.id, round, slot, homeId, awayId,
    status: 'completed', neutral: c.definition.venues.rounds === 'neutral' || (stage.kind === 'knockout' && round === stage.rounds && c.definition.venues.final === 'neutral'),
    result: { homeScore: winnerId === homeId ? 4 : 0, awayScore: winnerId === awayId ? 4 : 0, winnerId, decider: 'score' },
  };
}

describe('stable competition identities and snapshots', () => {
  it('uses only definition identity, season and saved ordinals, without drawing RNG', () => {
    const s = career(); const rng = s.rngSeed;
    const definition = cupDefinition();
    const first = createCompetitionInstance(definition, 1, 3, ['player', 'rival-reapers']);
    definition.name = 'Renamed'; definition.version = 2; definition.matchRules.tryPoints = 99;
    definition.rewards[0] = { id: 'changed', stageId: 'cup', round: 2, kind: 'reputation', amount: 99 };
    const second = createCompetitionInstance(definition, 1, 3, ['player', 'rival-reapers']);
    expect(second.id).toBe(first.id);
    expect(first.definition).toMatchObject({ name: 'Test Cup', version: 1, matchRules: { tryPoints: 4 } });
    expect(first.definition.rewards[0]).toMatchObject({ id: 'win', kind: 'cash', matchBaseMultiplier: 2 });
    expect(competitionInstanceId('test-cup', 2, 3)).not.toBe(first.id);
    expect(competitionInstanceId('test-cup', 1, 4)).not.toBe(first.id);
    const fixture = instance(s).fixtures[0]!; const id = fixture.id;
    fixture.slot = 19; fixture.result = { homeScore: 14, awayScore: 10, winnerId: fixture.homeId, decider: 'score' };
    s.clubName = 'Renamed Club';
    expect(fixture.id).toBe(id);
    expect(competitionFixtureId(first.id, 1)).not.toBe(competitionFixtureId(first.id, 0));
    expect(s.rngSeed).toBe(rng);
  });
  it('rejects invalid identities and duplicate entrants at creation', () => {
    expect(() => competitionInstanceId('', 1, 0)).toThrow();
    expect(() => competitionFixtureId('cup', -1)).toThrow();
    expect(() => createCompetitionInstance(cupDefinition(), 0, 0, ['a', 'b'])).toThrow();
    expect(() => createCompetitionInstance(cupDefinition(), 1, 0, ['a', 'a'])).toThrow();
  });
  it.each(['au', 'uk'] as const)('round-trips %s metadata without enabling a new gameplay path', pack => {
    const s = career(pack); const before = clone(s);
    save(s); expect(loadSlot()).toMatchObject({ status: 'ok', state: before });
    expect(importSave(exportSave(s))).toMatchObject({ ok: true, state: before });
    expect(s.league.fixtures).toEqual(before.league.fixtures);
    expect(s.week).toBe(1); expect(s.preseason).toBe(1); expect(s.version).toBe(SAVE_VERSION);
    const copy = importSave(exportSave(s));
    if (!copy.ok) throw new Error(copy.message);
    expect(copy.state.competitions!.instances[0]!.definition.slotCount).toBe(28);
    // Metadata's later dates do not broaden the legacy week/fixture boundary.
    expect(importSave(JSON.stringify({ ...s, week: pack === 'uk' ? 26 : 28 })).ok).toBe(false);
  });
});

describe('definition and format boundaries', () => {
  it.each([
    definition({ kind: 'league', finalsSize: 4 }, [{ kind: 'league', rounds: 6 }, { kind: 'knockout', rounds: 2 }]),
    cupDefinition(),
    definition({ kind: 'group', groupSize: 4, qualifiersPerGroup: 2 }, [{ kind: 'group', rounds: 3 }, { kind: 'knockout', rounds: 1 }]),
    definition({ kind: 'series', winsRequired: 2 }, [{ kind: 'series', rounds: 3 }]),
    definition({ kind: 'exhibition' }, [{ kind: 'exhibition', rounds: 1 }]),
  ])('accepts a complete $format.kind snapshot', value => {
    expect(validateCompetitionDefinition(value)).toBeNull();
  });
  it.each([
    { version: 0 }, { slotCount: 0 }, { minEntrants: 1 }, { format: { kind: 'unknown' } },
    { format: { kind: 'league', finalsSize: 3 } }, { format: { kind: 'series', winsRequired: 2 } },
    { stages: [{ id: 'cup', name: 'Cup', kind: 'knockout', rounds: 3 }] },
    { stages: [{ id: 'cup', name: 'Cup', kind: 'knockout', rounds: 2 }, { id: 'cup', name: 'Duplicate', kind: 'knockout', rounds: 1 }] },
    { matchRules: { ...AU_PACK.rules, goldenPointMinutes: Infinity } },
    { matchRules: { ...AU_PACK.rules, halfTimeLegsBack: 2 } },
    { lineup: { onField: 9, benchSize: 4, minSquad: 12, maxSquad: 30 } },
    { eligibility: { kind: 'youth', maxAge: 21, minRegistered: 7, minStarters: 5, minBench: 2, minOnField: 6 } },
    { venues: { rounds: 'unknown', final: 'neutral' } },
    { drawnKnockout: { toString: 1, valueOf: 1 } },
    { rewards: [{ id: 'cash', kind: 'cash', stageId: 'missing', round: 1, matchBaseMultiplier: 1 }] },
    { rewards: [{ id: 'cash', kind: 'cash', stageId: 'cup', round: 3, matchBaseMultiplier: 1 }] },
    { rewards: [{ id: 'cash', kind: 'cash', stageId: 'cup', round: 1, matchBaseMultiplier: -1 }] },
    { rewards: [{ id: 'cap', kind: 'capAllowance', stageId: 'cup', round: 1, basisPoints: 500, uniqueKey: 'shield', effective: 'immediate' }] },
    { players: [] },
  ])('rejects invalid or unrecognised definition payload %j', patch => {
    expect(validateCompetitionDefinition({ ...cupDefinition(), ...patch })).not.toBeNull();
  });
  it('validates content catalogue pack identity and unique definition IDs without activating it', () => {
    expect(validatePack({ ...AU_PACK, competitions: [cupDefinition()] })).toEqual([]);
    expect(validatePack({ ...AU_PACK, competitions: [cupDefinition('uk')] })).toContainEqual(expect.stringMatching(/another pack/));
    expect(validatePack({ ...AU_PACK, competitions: [cupDefinition(), cupDefinition()] })).toContainEqual(expect.stringMatching(/used twice/));
    expect(career('au', false)).not.toHaveProperty('competitions');
  });
});

describe('competition import invariants', () => {
  const cases: Array<[string, (s: GameState) => void]> = [
    ['schema version', s => { s.competitions!.schemaVersion = 2 as 1; }],
    ['duplicate instance ID', s => { s.competitions!.instances.push(clone(instance(s))); }],
    ['wrong saved region', s => { instance(s).definition.pack = 'uk'; }],
    ['future season', s => { instance(s).season = 2; }],
    ['unknown entrant', s => { instance(s).entrantIds[0] = 'missing'; }],
    ['duplicate entrant', s => { instance(s).entrantIds[1] = instance(s).entrantIds[0]!; }],
    ['unregistered roster owner', s => { Object.assign(instance(s), { players: s.squad }); }],
    ['unknown stage', s => { instance(s).stageId = 'missing'; }],
    ['incomplete frozen order', s => { instance(s).tieOrder.pop(); }],
    ['duplicate frozen order', s => { instance(s).tieOrder[1] = instance(s).tieOrder[0]!; }],
    ['wrong fixture owner', s => { instance(s).fixtures[0]!.competitionId = 'missing'; }],
    ['duplicate fixture ID', s => { instance(s).fixtures.push(clone(instance(s).fixtures[0]!)); }],
    ['self-match', s => { const f = instance(s).fixtures[0]!; f.awayId = f.homeId; }],
    ['out-of-field opponent', s => { instance(s).fixtures[0]!.awayId = 'missing'; }],
    ['non-text opponent', s => { Object.assign(instance(s).fixtures[0]!, { awayId: 7 }); }],
    ['unknown fixture stage', s => { instance(s).fixtures[0]!.stageId = 'missing'; }],
    ['round above snapshot limit', s => { instance(s).fixtures[0]!.round = 3; }],
    ['slot above snapshot limit', s => { instance(s).fixtures[0]!.slot = 29; }],
    ['missing scheduled slot', s => { delete instance(s).fixtures[0]!.slot; }],
    ['result on unplayed fixture', s => { const f = instance(s).fixtures[0]!; f.result = { homeScore: 1, awayScore: 0, winnerId: f.homeId, decider: 'score' }; }],
    ['completed fixture without result', s => { instance(s).fixtures[0]!.status = 'completed'; }],
    ['wrong score winner', s => { const f = instance(s).fixtures[0]!; f.status = 'completed'; f.result = { homeScore: 1, awayScore: 0, winnerId: f.awayId, decider: 'score' }; }],
    ['draw without knockout winner', s => { const f = instance(s).fixtures[0]!; f.status = 'completed'; f.result = { homeScore: 0, awayScore: 0, decider: 'draw' }; }],
    ['wrong saved tie policy', s => { const f = instance(s).fixtures[0]!; f.status = 'completed'; f.result = { homeScore: 0, awayScore: 0, winnerId: f.homeId, decider: 'higher-seed' }; }],
    ['winner outside frozen tie order', s => { const f = instance(s).fixtures[0]!; f.status = 'completed'; f.result = { homeScore: 0, awayScore: 0, winnerId: f.awayId, decider: 'seeded-draw' }; }],
    ['unsnapshotted neutral venue', s => { instance(s).fixtures[0]!.neutral = true; }],
    ['malformed fixture status', s => { Object.assign(instance(s).fixtures[0]!, { status: { toString: 1, valueOf: 1 } }); }],
    ['impossible round booking', s => { const f = clone(instance(s).fixtures[0]!); f.id += '-other'; f.slot = 8; instance(s).fixtures.push(f); }],
    ['cross-competition slot booking', s => { const next = cupInstance(instance(s).entrantIds, 'au', 1); s.competitions!.instances.push(next); }],
    ['duplicate IDs across instances', s => { const next = cupInstance(instance(s).entrantIds, 'au', 1); next.fixtures[0]!.slot = 8; next.fixtures[0]!.id = instance(s).fixtures[0]!.id; s.competitions!.instances.push(next); }],
    ['played declined event', s => { instance(s).status = 'declined'; }],
    ['premature title winner', s => { instance(s).winnerId = instance(s).entrantIds[0]!; }],
    ['unresolved completed event', s => { instance(s).status = 'completed'; instance(s).winnerId = instance(s).entrantIds[0]!; }],
    ['duplicated player ownership', s => { s.league.clubs.find(c => c.squad)!.squad!.push(s.squad[0]!); }],
  ];
  it.each(cases)('refuses %s without changing the imported data', (_label, mutate) => {
    const s = career(); mutate(s); const before = JSON.stringify(s);
    expect(importSave(before).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('keeps actual drawn scores and an explicit legitimate knockout winner', () => {
    const s = career(); const f = instance(s).fixtures[0]!;
    instance(s).tieOrder.reverse();
    f.status = 'completed'; f.result = { homeScore: 12, awayScore: 12, winnerId: f.awayId, decider: 'seeded-draw' };
    const result = importSave(exportSave(s));
    expect(result).toMatchObject({ ok: true, state: { competitions: { instances: [{ fixtures: [{ result: { homeScore: 12, awayScore: 12, winnerId: f.awayId, decider: 'seeded-draw' } }] }] } } });
  });
  it('allows a properly declined offer with no fixtures and does not fabricate a replacement', () => {
    const s = career(); const c = instance(s); c.status = 'declined'; c.stageId = null; c.fixtures = []; c.entrantIds = []; c.tieOrder = [];
    expect(migrateState(s)).toMatchObject({ ok: true, state: s });
  });
  it('validates metadata using the saved pack, not the active browser pack', () => {
    const s = career('uk'); selectPack('au');
    expect(validateCompetitions(s.competitions, { pack: 'uk', season: s.season, clubIds: s.league.clubs.map(c => c.id) })).toBeNull();
    expect(importSave(JSON.stringify(s)).ok).toBe(true);
  });
});

describe('terminal sporting consistency', () => {
  function completedCup(): GameState {
    const s = career(); const c = instance(s); const [a, b, d, e] = c.entrantIds as [string, string, string, string];
    c.fixtures = [played(c, 0, 1, a, b, a, 7), played(c, 1, 1, d, e, d, 7), played(c, 2, 2, a, d, d, 10)];
    c.status = 'completed'; c.winnerId = d;
    return s;
  }
  it('accepts the complete knockout tree and its actual final winner', () => {
    expect(importSave(exportSave(completedCup())).ok).toBe(true);
  });
  it.each(['missing final', 'semi-final winner declared champion', 'eliminated finalist'] as const)('rejects %s', fault => {
    const s = completedCup(); const c = instance(s);
    if (fault === 'missing final') { c.fixtures.pop(); c.winnerId = c.fixtures[0]!.result!.winnerId!; }
    if (fault === 'semi-final winner declared champion') c.winnerId = c.fixtures[0]!.result!.winnerId!;
    if (fault === 'eliminated finalist') { const f = c.fixtures[2]!; f.homeId = c.fixtures[0]!.awayId; }
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
  it('rejects a final assigned before its semi-finals', () => {
    const s = completedCup(); instance(s).fixtures[2]!.slot = 1;
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
  it('rejects finals stages placed before the league/group stage', () => {
    const def = definition({ kind: 'league', finalsSize: 4 }, [{ kind: 'knockout', rounds: 2 }, { kind: 'league', rounds: 6 }]);
    expect(validateCompetitionDefinition(def)).toBe('definition stage order');
  });
  it('checks the actual table champion for a completed league without finals', () => {
    const s = career(); const c = instance(s); c.entrantIds = c.entrantIds.slice(0, 2); c.tieOrder = [...c.entrantIds];
    c.definition = definition({ kind: 'league', finalsSize: 0 }, [{ kind: 'league', rounds: 2 }]);
    c.definition.minEntrants = 2; c.definition.maxEntrants = 2; c.stageId = c.definition.stages[0]!.id;
    const [a, b] = c.entrantIds as [string, string];
    c.fixtures = [played(c, 0, 1, a, b, a, 1), played(c, 1, 2, b, a, a, 2)]; c.status = 'completed'; c.winnerId = a;
    expect(importSave(JSON.stringify(s)).ok).toBe(true);
    c.winnerId = b; expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
  it('rejects actual group fields that do not divide into the declared groups', () => {
    const s = career(); const clubs = s.league.clubs.slice(0, 6).map(c => c.id);
    const def = definition({ kind: 'group', groupSize: 4, qualifiersPerGroup: 1 }, [{ kind: 'group', rounds: 3 }, { kind: 'knockout', rounds: 1 }]);
    def.maxEntrants = 8;
    expect(validateCompetitionDefinition(def)).toBeNull();
    expect(() => createCompetitionInstance(def, 1, 0, clubs)).toThrow();
    const c = instance(s); c.definition = def; c.entrantIds = clubs; c.tieOrder = [...clubs]; c.stageId = null; c.fixtures = []; c.status = 'entered';
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
  it.each(['league', 'group'] as const)('refuses a knockout tiebreak for a drawn %s-stage game', kind => {
    const s = career(); const c = instance(s);
    c.definition = definition(kind === 'league' ? { kind, finalsSize: 0 } : { kind, groupSize: 4, qualifiersPerGroup: 2 },
      kind === 'league' ? [{ kind, rounds: 3 }] : [{ kind, rounds: 3 }, { kind: 'knockout', rounds: 1 }]);
    c.stageId = c.definition.stages[0]!.id;
    const f = c.fixtures[0]!; f.stageId = c.stageId; f.status = 'completed';
    f.result = { homeScore: 0, awayScore: 0, winnerId: f.homeId, decider: 'seeded-draw' };
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
    f.result = { homeScore: 0, awayScore: 0, decider: 'draw' };
    expect(importSave(JSON.stringify(s)).ok).toBe(true);
  });
  it('requires sequential stages to fit the saved calendar', () => {
    const def = definition({ kind: 'league', finalsSize: 4 }, [{ kind: 'league', rounds: 14 }, { kind: 'knockout', rounds: 2 }]);
    def.slotCount = 14;
    expect(validateCompetitionDefinition(def)).toBe('definition calendar capacity');
  });
  function series(winners: number[]): GameState {
    const s = career(); const c = instance(s); c.entrantIds = c.entrantIds.slice(0, 2); c.tieOrder = [...c.entrantIds];
    c.definition = definition({ kind: 'series', winsRequired: 2 }, [{ kind: 'series', rounds: 3 }]);
    c.definition.venues = { rounds: 'alternating', final: 'same-as-rounds' }; c.stageId = c.definition.stages[0]!.id;
    c.fixtures = winners.map((w, i) => played(c, i, i + 1, c.entrantIds[0]!, c.entrantIds[1]!, c.entrantIds[w]!, 26 + i));
    c.status = 'completed'; c.winnerId = c.entrantIds[0]!;
    return s;
  }
  it('accepts 2–0 and 2–1 clinches, but not a one-win title or a played game after the clinch', () => {
    expect(importSave(exportSave(series([0, 0]))).ok).toBe(true);
    expect(importSave(exportSave(series([0, 1, 0]))).ok).toBe(true);
    expect(importSave(exportSave(series([0]))).ok).toBe(false);
    expect(importSave(exportSave(series([0, 0, 1]))).ok).toBe(false);
  });
  it('requires a series to play a contiguous prefix from game one', () => {
    const s = series([0, 0]); const fixtures = instance(s).fixtures;
    fixtures[0]!.round = 2; fixtures[0]!.slot = 27; fixtures[1]!.round = 3; fixtures[1]!.slot = 28;
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
  it('requires an actual completed fixture for a completed exhibition', () => {
    const s = career(); const c = instance(s); c.entrantIds = c.entrantIds.slice(0, 2); c.tieOrder = [...c.entrantIds];
    c.definition = definition({ kind: 'exhibition' }, [{ kind: 'exhibition', rounds: 1 }]); c.stageId = c.definition.stages[0]!.id;
    c.fixtures = [played(c, 0, 1, c.entrantIds[0]!, c.entrantIds[1]!, c.entrantIds[0]!, 1)]; c.status = 'completed'; c.winnerId = c.entrantIds[0]!;
    expect(importSave(exportSave(s)).ok).toBe(true);
    c.fixtures[0]!.status = 'cancelled'; delete c.fixtures[0]!.result; delete c.winnerId;
    expect(importSave(JSON.stringify(s)).ok).toBe(false);
  });
});

describe('v24 compatibility, import safety and namespace isolation', () => {
  it.each(['au', 'uk'] as const)('upgrades %s v24 metadata-free saves without changing people, RNG or league format', pack => {
    const source = { ...career(pack, false), version: 24 }; const original = JSON.stringify(source);
    const step = MIGRATIONS.find(m => m.from === 24);
    expect(step?.to).toBe(25); expect(step?.run(source)).toEqual(source);
    expect(MIGRATIONS.some(m => m.from === 23)).toBe(false);
    const result = importSave(original);
    expect(result).toMatchObject({ ok: true, state: { ...source, version: SAVE_VERSION } });
    if (!result.ok) throw new Error(result.message);
    expect(result.state).not.toHaveProperty('competitions');
    expect(JSON.stringify(source)).toBe(original);
    expect(result.state.rngSeed).toBe(source.rngSeed); expect(result.state.league).toEqual(source.league);
  });
  for (const namespace of [null, DEV_TEST_PREFIX]) it.each(['au', 'uk'] as const)(`backs up original %s v24 bytes in ${namespace ?? 'normal'} without changing the other namespace`, pack => {
    const original = JSON.stringify({ ...career(pack, false), version: 24 });
    const prefix = namespace ?? ''; const other = namespace === null ? DEV_TEST_PREFIX : '';
    bytes.set(prefix + slotKey(1), original); bytes.set(other + slotKey(1), 'other career');
    bytes.set(other + liveMatchKey(1), 'other live match'); setCareerNamespace(namespace);
    const result = loadSlot(); expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('Failed to load v24');
    expect(writeSlot(1, result.state)).toBe(true);
    expect(exportRecoverySaves(1)).toContain(original);
    expect(JSON.parse(bytes.get(prefix + slotKey(1))!).version).toBe(SAVE_VERSION);
    expect(bytes.get(other + slotKey(1))).toBe('other career');
    expect(bytes.get(other + liveMatchKey(1))).toBe('other live match');
  });
  it('refuses injecting competition metadata under a v24 stamp', () => {
    expect(importSave(JSON.stringify({ ...career(), version: 24 })).ok).toBe(false);
  });
  it('leaves occupied destination save and live sidecar bytes untouched after a bad metadata import', () => {
    const destination = career('au', false); save(destination);
    bytes.set(liveMatchKey(1), 'existing live sidecar');
    const before = new Map(bytes); const bad = career(); instance(bad).fixtures[0]!.awayId = 'missing';
    expect(installImportedSave(JSON.stringify(bad), 1).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(before.get(slotKey(1)));
    expect(bytes.get(liveMatchKey(1))).toBe('existing live sidecar');
  });
  it('saves competition changes only in the selected developer/normal namespace', () => {
    const normal = career(); save(normal); const normalBytes = bytes.get(slotKey(1));
    setCareerNamespace(DEV_TEST_PREFIX); const dev = career(); instance(dev).definition.name = 'Developer Cup'; save(dev);
    expect(bytes.get(slotKey(1))).toBe(normalBytes);
    expect(JSON.parse(bytes.get(DEV_TEST_PREFIX + slotKey(1))!).competitions.instances[0].definition.name).toBe('Developer Cup');
    setCareerNamespace(null); expect(loadSlot()).toMatchObject({ status: 'ok', state: normal });
  });
});
