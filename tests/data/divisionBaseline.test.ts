import { createHash } from 'node:crypto';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { createNewGame } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
beforeAll(async () => { await preparePack('uk'); });
afterEach(() => { setCareerNamespace(null); selectPack('au'); });
// Captured from immutable main 03812a1618b80fbc1348bd6b0966b3df704e9b7a, then
// re-captured once when the Premier Big Three changed the authored world (#840).
// Includes people, fixture IDs/pairings, frozen tie orders, trials, cup and RNG.
// The save format version and the new, empty reward ledger are checked separately.
const baseline = {
  au: '54aa6992461b37b97d2df6f1185b504a8cb73b0e92196187602130d1e9d7071f',
  uk: '7ee60842d46827c978eeca8c2085f037888a7e327e4901c6a32a43f90a6c8a70',
};
it.each(['au', 'uk'] as const)('preserves the complete %s developer world during schedule extraction', pack => {
  selectPack(pack); setCareerNamespace(DEV_TEST_PREFIX);
  createNewGame('Schedule witness', 574, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  const state = setupStructuralDivisionCareer(pack === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE, 574);
  const { version: _version, competitionRewards, ...unchanged } = state;
  expect(competitionRewards).toEqual([]);
  expect(createHash('sha256').update(JSON.stringify(unchanged)).digest('hex')).toBe(baseline[pack]);
});
