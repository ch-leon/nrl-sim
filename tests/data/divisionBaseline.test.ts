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
// Captured from immutable main 03812a1618b80fbc1348bd6b0966b3df704e9b7a.
// Includes people, fixture IDs/pairings, frozen tie orders, trials, cup and RNG.
// Only the separately tested save format version is intentionally excluded.
const baseline = {
  au: '11b4c9a7d126ea0ac30ff446a831556e205cd017f5ad2a2ae6e65c46f5516811',
  uk: 'd4c50df6106c38d34f9d0b4f27efb8772b7a8bfdfeaf53cc2ead18eed9b5b7b9',
};
it.each(['au', 'uk'] as const)('preserves the complete %s developer world during schedule extraction', pack => {
  selectPack(pack); setCareerNamespace(DEV_TEST_PREFIX);
  createNewGame('Schedule witness', 574, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  const state = setupStructuralDivisionCareer(pack === 'uk' ? UK_CAREER_PROFILE : AU_CAREER_PROFILE, 574);
  const { version: _version, ...unchanged } = state;
  expect(createHash('sha256').update(JSON.stringify(unchanged)).digest('hex')).toBe(baseline[pack]);
});
