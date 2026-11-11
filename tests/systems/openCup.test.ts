import { describe, expect, it } from 'vitest';
import { AU_PACK } from '../../src/content/au';
import { validateCompetitions, type CompetitionDefinition, type CompetitionInstance } from '../../src/data/competition';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { advanceOpenCup, drawOpenCup, openCupByes, openCupResult, OPEN_CUP_SLOTS, type OpenCupOutcome } from '../../src/systems/openCup';

const clubs = (n = 24): string[] => Array.from({ length: n }, (_, i) => i === 0 ? 'player' : `club-${i}`);
const definition = (): CompetitionDefinition => ({
  id: 'open-cup', version: 1, pack: 'au', name: 'Open Cup', format: { kind: 'knockout' },
  minEntrants: 2, maxEntrants: 24, slotCount: 25,
  stages: [{ id: 'cup', name: 'Open Cup', kind: 'knockout', rounds: 5, slotIds: [...OPEN_CUP_SLOTS] }],
  matchRules: { ...AU_PACK.rules }, lineup: { onField: 9, benchSize: 4, minSquad: 13, maxSquad: 30 },
  eligibility: { kind: 'open' }, venues: { rounds: 'drawn-home', final: 'neutral' }, drawnKnockout: 'seeded-draw',
  rewards: [{ id: 'title', stageId: 'cup', round: 5, kind: 'honour', title: 'Open Cup champion' }],
});
const draw = (n = 24, seed = 575): CompetitionInstance => drawOpenCup({ definition: definition(), clubIds: clubs(n), seed, season: 1, currentSlot: 1 }).instance;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function valid(instance: CompetitionInstance): void {
  expect(validateCompetitions({ schemaVersion: 1, instances: [instance] }, {
    pack: instance.definition.pack, season: instance.season, clubIds: instance.entrantIds,
  })).toBeNull();
}
function finishRound(instance: CompetitionInstance, tied = false): ReturnType<typeof advanceOpenCup> {
  let next = instance;
  for (const fixture of instance.fixtures.filter(f => f.status === 'scheduled')) {
    const result = openCupResult(next, fixture.id, tied ? { homeScore: 12, awayScore: 12 } : { homeScore: 18, awayScore: 10 });
    next = { ...next, fixtures: next.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed', result } : f) };
    valid(next);
  }
  const advanced = advanceOpenCup(next); valid(advanced.instance);
  return advanced;
}
function finishCup(instance: CompetitionInstance, tied = false): { instance: CompetitionInstance; outcomes: OpenCupOutcome[] } {
  let next = instance; const outcomes: OpenCupOutcome[] = [];
  for (let n = 0; n < 5 && next.status !== 'completed'; n++) {
    const advanced = finishRound(next, tied); next = advanced.instance; outcomes.push(...advanced.outcomes);
  }
  expect(next.status).toBe('completed');
  return { instance: next, outcomes };
}

describe('annual optional Open Cup draw', () => {
  it('seeds a 24-club field with eight genuine byes and no empty-v-empty fixture', () => {
    const result = drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 575, season: 1, currentSlot: 6 });
    expect(result).toMatchObject({ held: true, playerEntered: true });
    expect(result.byes).toHaveLength(8); expect(new Set(result.byes).size).toBe(8);
    expect(result.instance.fixtures).toHaveLength(8);
    const playing = result.instance.fixtures.flatMap(f => [f.homeId, f.awayId]);
    expect(playing).toHaveLength(16); expect(new Set(playing).size).toBe(16);
    expect(result.byes.every(id => !playing.includes(id))).toBe(true);
    expect(result.instance.fixtures.every(f => f.round === 1 && f.slot === 7 && !f.neutral)).toBe(true);
    valid(result.instance);
  });
  it('uses an isolated stream and makes input ordering irrelevant', () => {
    const input = { definition: definition(), clubIds: clubs(), seed: 1234, season: 2, currentSlot: 1 };
    const before = JSON.stringify(input);
    const first = drawOpenCup(input);
    expect(drawOpenCup({ ...input, clubIds: [...input.clubIds].reverse() })).toEqual(first);
    expect(drawOpenCup(input)).toEqual(first); expect(JSON.stringify(input)).toBe(before);
    expect(drawOpenCup({ ...input, seed: 1235 }).instance.entrantIds).not.toEqual(first.instance.entrantIds);
    expect(new Set(first.instance.tieOrder)).toEqual(new Set(first.instance.entrantIds));
  });
  it('records the draw snapshot so changing the catalogue cannot redraw later ties', () => {
    const source = definition(); const { instance } = drawOpenCup({ definition: source, clubIds: clubs(), seed: 9, season: 1, currentSlot: 1 });
    const before = clone(instance); const byes = openCupByes(instance);
    source.version = 2; source.name = 'Different'; source.rewards = []; source.matchRules.tryPoints = 99;
    expect(instance).toEqual(before); expect(openCupByes(clone(instance))).toEqual(byes);
    expect(finishRound(clone(instance))).toEqual(finishRound(instance));
  });
  it('declines only the player while other clubs contest the cup', () => {
    const result = drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 2, season: 1, currentSlot: 1, enterPlayer: false });
    expect(result.held).toBe(true); expect(result.playerEntered).toBe(false);
    expect(result.instance.entrantIds).toHaveLength(23); expect(result.instance.entrantIds).not.toContain('player');
    const complete = finishCup(result.instance);
    expect(complete.instance.fixtures).toHaveLength(22);
    expect(complete.instance.fixtures.flatMap(f => [f.homeId, f.awayId])).not.toContain('player');
    expect(complete.outcomes.some(o => o.clubId === 'player')).toBe(false);
  });
  it.each([{ field: [] }, { field: ['player'] }])('saves a no-event receipt for fewer than two entrants: $field', ({ field }) => {
    const result = drawOpenCup({ definition: definition(), clubIds: field, seed: 2, season: 1, currentSlot: 1 });
    expect(result).toMatchObject({ held: false, playerEntered: false, byes: [], instance: { status: 'declined', fixtures: [] } });
    expect(result.instance).not.toHaveProperty('winnerId'); valid(result.instance);
    expect(advanceOpenCup(result.instance).outcomes).toEqual([]);
    expect(() => drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 2, season: 1, currentSlot: 1, existingInstances: [result.instance] })).toThrow(/already recorded/);
  });
  it('does not award a sole remaining club a title after the player declines', () => {
    const result = drawOpenCup({ definition: definition(), clubIds: ['player', 'other'], seed: 2, season: 1, currentSlot: 1, enterPlayer: false });
    expect(result.held).toBe(false); expect(result.instance.entrantIds).toEqual(['other']);
    expect(advanceOpenCup(result.instance).outcomes).toEqual([]); valid(result.instance);
  });
  it.each([7, 10, 19, -1, 1.5, NaN])('rejects entry after the draw deadline or invalid time %s', currentSlot => {
    expect(() => drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 2, season: 1, currentSlot })).toThrow();
  });
  it('rejects a second annual draw even with another ordinal, but permits the next year', () => {
    const first = draw();
    expect(() => drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 1, season: 1, ordinal: 5, currentSlot: 1, existingInstances: [first] })).toThrow(/already recorded/);
    expect(drawOpenCup({ definition: definition(), clubIds: clubs(), seed: 1, season: 2, currentSlot: 1, existingInstances: [first] }).held).toBe(true);
  });
  it('rejects bad fields and unsupported rules instead of repairing or drawing them', () => {
    const input = { definition: definition(), clubIds: clubs(), seed: 1, season: 1, currentSlot: 1 };
    expect(() => drawOpenCup({ ...input, clubIds: ['a', 'a'] })).toThrow(/entrants/);
    expect(() => drawOpenCup({ ...input, clubIds: clubs(25) })).toThrow(/Too many/);
    expect(() => drawOpenCup({ ...input, seed: Infinity })).toThrow();
    expect(() => drawOpenCup({ ...input, definition: { ...definition(), drawnKnockout: 'higher-seed' } })).toThrow(/Unsupported/);
  });
});

describe('stored bracket advancement', () => {
  it.each([1, 575, 0xffffffff])('finishes a full field with 23 ties and one champion (seed %s)', seed => {
    const first = draw(24, seed); const original = clone(first);
    const { instance, outcomes } = finishCup(first);
    expect(first).toEqual(original); expect(instance.fixtures).toHaveLength(23);
    expect(outcomes.filter(o => o.kind === 'round-win')).toHaveLength(23);
    expect(outcomes.filter(o => o.kind === 'title')).toMatchObject([{ clubId: instance.winnerId }]);
    expect(new Set(outcomes.map(o => o.id)).size).toBe(24);
    expect(new Set(instance.fixtures.map(f => f.id)).size).toBe(23);
    expect(instance.fixtures.every(f => f.homeId !== f.awayId && f.status === 'completed')).toBe(true);
    for (const club of instance.entrantIds) expect(instance.fixtures.filter(f => f.homeId === club || f.awayId === club).length).toBeLessThanOrEqual(5);
    for (let round = 1; round <= 5; round++) {
      const fixtures = instance.fixtures.filter(f => f.round === round);
      const playing = fixtures.flatMap(f => [f.homeId, f.awayId]);
      expect(new Set(playing).size).toBe(playing.length);
      expect(fixtures.every(f => f.slot === OPEN_CUP_SLOTS[round - 1] && f.neutral === (round === 5))).toBe(true);
    }
  });
  it.each([2, 3, 4, 5, 8, 9, 16, 17, 23])('right-aligns a %s-club field and never pays a bye', count => {
    const first = draw(count); const round = 6 - Math.ceil(Math.log2(count));
    expect(first.fixtures.every(f => f.round === round && f.slot === OPEN_CUP_SLOTS[round - 1])).toBe(true);
    const openingByes = openCupByes(first);
    const opening = finishRound(first);
    expect(opening.outcomes.filter(o => o.kind === 'round-win')).toHaveLength(first.fixtures.length);
    expect(opening.outcomes.some(o => openingByes.includes(o.clubId))).toBe(false);
    const rest = first.definition.stages[0]!.rounds === round ? opening : finishCup(opening.instance);
    expect(rest.instance.fixtures).toHaveLength(count - 1); valid(rest.instance);
  });
  it('waits for finalised current-round results rather than creating unknown opponents', () => {
    const first = draw(); const fixture = first.fixtures[0]!;
    expect(advanceOpenCup(first)).toEqual({ instance: first, outcomes: [] });
    const result = openCupResult(first, fixture.id, { homeScore: 20, awayScore: 10 });
    const partial = { ...first, fixtures: first.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed' as const, result } : f) };
    const advanced = advanceOpenCup(partial);
    expect(advanced.outcomes).toEqual([]); expect(advanced.instance.fixtures).toHaveLength(8); valid(advanced.instance);
    const next = finishRound(advanced.instance);
    expect(next.instance.fixtures.filter(f => f.round === 2)).toHaveLength(8);
  });
  it('resumes the same original bracket after a partial round and JSON reload', () => {
    const first = finishRound(draw()).instance;
    const fixture = first.fixtures.find(f => f.status === 'scheduled')!;
    const result = openCupResult(first, fixture.id, { homeScore: 12, awayScore: 12 });
    const partial = { ...first, fixtures: first.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed' as const, result } : f) };
    expect(finishCup(clone(partial), true)).toEqual(finishCup(partial, true));
    expect(openCupByes(clone(partial))).toEqual(openCupByes(first));
  });
  it('does not emit consumed-round outcomes twice, including after reload', () => {
    const first = draw(); const next = finishRound(first);
    expect(advanceOpenCup(clone(next.instance)).outcomes).toEqual([]);
    const complete = finishCup(next.instance);
    expect(advanceOpenCup(clone(complete.instance)).outcomes).toEqual([]);
    // Replaying a pre-commit transition has identical event IDs for settlement dedupe.
    expect(finishRound(clone(first)).outcomes).toEqual(next.outcomes);
  });
  it('rejects a modified saved draw instead of silently redrawing it', () => {
    const first = draw(); const fixture = first.fixtures[0]!;
    [fixture.homeId, fixture.awayId] = [fixture.awayId, fixture.homeId];
    expect(() => advanceOpenCup(first)).toThrow(/saved field/);
  });
  it('does not alter the league, club cash, squad or match RNG when eliminated or crowned', () => {
    createNewGame('Cup boundary', 987); initLeague(getState());
    const before = clone(getState()); const cup = draw(); finishCup(cup);
    expect(getState()).toEqual(before);
    expect(Object.keys(cup).sort()).toEqual(['definition', 'entrantIds', 'fixtures', 'id', 'season', 'stageId', 'status', 'tieOrder'].sort());
  });
});

describe('finite score and advancement policy', () => {
  it('rejects new results after withdrawal while preserving already-final sporting facts', () => {
    const next = finishRound(draw()).instance;
    const withdrawn = { ...next, status: 'withdrawn' as const }; const before = clone(withdrawn);
    const pending = withdrawn.fixtures.find(f => f.status === 'scheduled')!;
    const played = withdrawn.fixtures.find(f => f.status === 'completed')!;
    expect(() => openCupResult(withdrawn, pending.id, { homeScore: 1, awayScore: 0 })).toThrow(/no longer active/);
    expect(openCupResult(withdrawn, played.id, played.result!)).toEqual(played.result);
    expect(advanceOpenCup(withdrawn)).toEqual({ instance: withdrawn, outcomes: [] });
    expect(withdrawn).toEqual(before);
  });
  it('settles all tied games by the saved order while preserving the exact scores', () => {
    const first = draw(); const fixture = first.fixtures[0]!;
    const before = clone(first); const result = openCupResult(first, fixture.id, { homeScore: 12, awayScore: 12 });
    const winner = first.tieOrder.indexOf(fixture.homeId) < first.tieOrder.indexOf(fixture.awayId) ? fixture.homeId : fixture.awayId;
    expect(result).toEqual({ homeScore: 12, awayScore: 12, winnerId: winner, decider: 'seeded-draw' });
    expect(first).toEqual(before);
    const complete = finishCup(first, true); expect(complete.instance.fixtures).toHaveLength(23);
    expect(complete.instance.fixtures.every(f => f.result?.homeScore === 12 && f.result.awayScore === 12)).toBe(true);
  });
  it('retains the final score on repeated delivery and refuses a changed result', () => {
    const first = draw(); const fixture = first.fixtures[0]!;
    const result = openCupResult(first, fixture.id, { homeScore: 5, awayScore: 10 });
    const played = { ...first, fixtures: first.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed' as const, result } : f) };
    expect(openCupResult(played, fixture.id, result)).toEqual(result);
    expect(() => openCupResult(played, fixture.id, { homeScore: 20, awayScore: 0 })).toThrow(/already final/);
    expect(openCupResult(first, fixture.id, { homeScore: 0, awayScore: 20 }, true).decider).toBe('forfeit');
    expect(() => openCupResult(first, fixture.id, { homeScore: 0, awayScore: 0 }, true)).toThrow();
    expect(() => openCupResult(first, 'missing', { homeScore: 0, awayScore: 1 })).toThrow();
    expect(() => openCupResult(first, fixture.id, { homeScore: NaN, awayScore: 1 })).toThrow();
  });
});
