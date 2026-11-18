import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runPlayerAssignmentQA, type AssignmentQAMode, type AssignmentQARole } from '../../src/qa/playerAssignments';
import manifest from '../fixtures/saves/v33-assignments/manifest.json';

const pairs = [
  { pack: 'au', difficulty: 'normal', role: 'starter', mode: 'auto' },
  { pack: 'uk', difficulty: 'hard', role: 'reserve', mode: 'auto' },
  { pack: 'uk', difficulty: 'normal', role: 'starter', mode: 'saved-manual' },
  { pack: 'au', difficulty: 'easy', role: 'bench', mode: 'qa-manual' },
] satisfies { pack: 'au' | 'uk'; difficulty: 'easy' | 'normal' | 'hard'; role: AssignmentQARole; mode: AssignmentQAMode }[];

describe('production Skills Camp QA', () => {
  it.each(pairs)('$pack $difficulty $role uses its matched decline career in $mode mode', async options => {
    const { slot, rng_state: rngSeed } = manifest.regions[options.pack].boundaries[0]!;
    const result = await runPlayerAssignmentQA({
      ...options,
      source: {
        text: readFileSync(new URL(`../fixtures/saves/v33-assignments/${slot.filename}`, import.meta.url), 'utf8'),
        filename: slot.filename, sha256: slot.sha256, commit: manifest.source_commit,
        careerSeed: manifest.career_seed, rngSeed,
      },
    });
    expect(result.problems).toEqual([]);
    expect(result.evidence).toBe('actual-paired-matches');
    expect(result.source).toMatchObject({ version: 33, originalDifficulty: 'normal', careerSeed: 573 });
    expect(result.camp).toMatchObject({ intervals: 2, endWeek: 6, roundTrips: 2 });
    expect(result.decline).toMatchObject({ intervals: 2, endWeek: 6, roundTrips: 1 });
    expect(result.camp?.openingMatch.starters).toHaveLength(9);
    expect(result.camp?.openingMatch.bench).toHaveLength(4);
    expect(result.camp?.openingMatch.role).toBe('away');
    expect(result.decline?.openingMatch.role).toBe(options.role);
    expect(result.camp?.openingMatch.seed).toBe(result.decline?.openingMatch.seed);
    expect(result.camp?.development).toMatchObject({ weeklyXp: 0, matchXp: 0 });
    expect(result.receipt?.mode).toBe(options.mode === 'auto' ? 'auto' : 'manual');
    expect(result.camp?.development.effectiveXp).toBeCloseTo(result.receipt!.effectiveXp);
    if (options.mode !== 'auto') expect(result.receipt?.pointsSpent).toBe(0);
    if (options.mode === 'auto' && options.role === 'starter') expect(result.receipt?.pointsSpent).toBeGreaterThan(0);
  }, 60_000);
});
