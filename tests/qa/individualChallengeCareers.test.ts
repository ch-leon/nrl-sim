import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  runIndividualChallengeCareerQA,
  type ChallengeCareerQACase,
  type ChallengeCareerQASource,
} from '../../src/qa/individualChallengeCareers';
import v33 from '../fixtures/saves/v33-assignments/manifest.json';
import v34 from '../fixtures/saves/v34-challenges/manifest.json';

function sourceFor({ pack, camp }: ChallengeCareerQACase): ChallengeCareerQASource {
  const manifest = camp ? v33 : v34;
  const boundary = manifest.regions[pack].boundaries[0]!;
  const folder = camp ? 'v33-assignments' : 'v34-challenges';
  const bytes = readFileSync(new URL(`../fixtures/saves/${folder}/${boundary.slot.filename}`, import.meta.url));
  expect(bytes.length).toBe(boundary.slot.bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(boundary.slot.sha256);
  return {
    text: bytes.toString('utf8'), filename: boundary.slot.filename, sha256: boundary.slot.sha256,
    commit: manifest.source_commit, version: manifest.saved_format, week: boundary.week,
    careerSeed: manifest.career_seed, rngSeed: boundary.rng_state,
  };
}

const cases = [
  { pack: 'au', edition: 'showground', difficulty: 'normal', role: 'starter', mode: 'auto', coaching: 'manual', camp: true },
  { pack: 'uk', edition: 'showground', difficulty: 'hard', role: 'reserve', mode: 'manual', coaching: 'finish' },
  { pack: 'uk', edition: 'invitational', difficulty: 'easy', role: 'starter', mode: 'auto', coaching: 'auto' },
  { pack: 'au', edition: 'invitational', difficulty: 'hard', role: 'bench', mode: 'manual', coaching: 'finish' },
] satisfies ChallengeCareerQACase[];

describe('production individual challenge career QA', () => {
  it.each<ChallengeCareerQACase>(cases)('$pack $edition $difficulty $role with $mode spending', async options => {
    const report = await runIndividualChallengeCareerQA({ ...options, source: sourceFor(options) });
    expect(report.problems).toEqual([]);
    expect(report.evidence).toBe('actual-paired-challenge-careers');
    expect(report.event?.match).toMatchObject({ role: 'away', starters: expect.any(Array), bench: expect.any(Array) });
    expect(report.event?.match.starters).toHaveLength(9);
    expect(report.event?.match.bench).toHaveLength(4);
    expect(report.stay?.match.role).toBe(options.role);
    expect(report.event?.match.seed).toBe(report.stay?.match.seed);
    expect(report.event?.endWeek).toBe(options.edition === 'showground' ? 7 : 15);
    expect(report.event?.endWeek).toBe(report.stay?.endWeek);
    expect(report.event?.development).toMatchObject({ weeklyXp: 0, matchXp: 0, effectiveXp: report.award?.xp.effectiveXp });
    expect(report.event?.finance.books.prize).toBe(report.award?.cash);
    expect(report.award?.xp.mode).toBe(options.mode);
    if (options.mode === 'manual') expect(report.award?.xp.pointsSpent).toBe(0);
    if (options.camp) expect(report.camp).toMatchObject({ role: 'away', playerId: report.player?.id });
    if (options.edition === 'invitational') {
      expect(report.qualification).toMatchObject({ result: 'won', cash: 8000, returnWeek: 7 });
      if (options.role === 'bench') expect(report.player?.id).not.toBe(report.qualification?.playerId);
    }
  }, 60_000);
});
