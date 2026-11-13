import { afterEach, expect, it, vi } from 'vitest';
import { __setLabs } from '../../src/labs/flags';
import { resetAll } from '../../src/labs/devCareer';

afterEach(() => { __setLabs(null); vi.unstubAllGlobals(); });
it('does not re-enable Experiments from labs=1 when Reset all reloads a short field', () => {
  const state = { screen: 'settings' };
  const replaceState = vi.fn();
  vi.stubGlobal('location', { href: 'https://example.test/?labs=1&e2e#club' });
  vi.stubGlobal('history', { state, replaceState });
  __setLabs({ visible: true, on: {}, hintsSeen: [], fieldLength: 80 });
  const result = resetAll({ storage: null, probe: { held: false, parked: false, resumable: false, advancing: false, matchScene: false }, reload: vi.fn() });
  expect(result.ok).toBe(true);
  expect(replaceState).toHaveBeenCalledWith(state, '', 'https://example.test/?e2e=#club');
});
