import { expect, it } from 'vitest';
import { matchEngineIdentity } from '../../src/systems/matchEngineIdentity';
import { liveMatchSameRules } from '../../src/systems/liveMatchRecord';
import { NINES } from '../../src/match/league/rules';

it('does not replay pre-retreat revision-three inputs under corrected defensive movement', () => {
  const historical = matchEngineIdentity().replace(/^nrl-live-\d+-/, 'nrl-live-3-');
  expect(liveMatchSameRules({ engineId: historical, halfMinutes: NINES.halfMinutes })).toBe(false);
});
