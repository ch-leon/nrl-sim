import { vi } from 'vitest';
import * as entrySchema from '../../src/data/openCupEntry';
import { clubIds } from '../data/leagueCareerFixtures';

// The six-club miniature fixture isolates progression and close failures. Its
// calendar has no Open Cup window. Full regional worlds exercise both validators
// together in normalOpenCupCareer.test.ts; keep every other validation here.
const validateRealEntry = entrySchema.validateOpenCupEntry;
export function isolateMiniatureLeagueProgression(): void {
  vi.spyOn(entrySchema, 'validateOpenCupEntry').mockImplementation((value, c, context) =>
    value === undefined && context.clubIds.length === clubIds.length && clubIds.every(id => context.clubIds.includes(id))
      ? null
      : validateRealEntry(value, c, context)
  );
}
