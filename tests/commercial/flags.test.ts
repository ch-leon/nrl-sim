import { describe, it, expect, afterEach, vi } from 'vitest';
import { commercialEnabled, commercialFrom, __setCommercial } from '../../src/commercial/flags';

afterEach(() => {
  __setCommercial(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('commercial flag (#362)', () => {
  it('is off by default: no env, no URL param', () => {
    expect(commercialEnabled()).toBe(false);
    expect(commercialFrom({ DEV: false }, '')).toBe(false);
    expect(commercialFrom({ DEV: true }, '')).toBe(false);
  });

  it('is on when the build sets VITE_COMMERCIAL=1, dev or production', () => {
    expect(commercialFrom({ DEV: false, VITE_COMMERCIAL: '1' }, '')).toBe(true);
    expect(commercialFrom({ DEV: true, VITE_COMMERCIAL: '1' }, '')).toBe(true);
    expect(commercialFrom({ DEV: false, VITE_COMMERCIAL: '0' }, '')).toBe(false);
    vi.stubEnv('VITE_COMMERCIAL', '1');
    __setCommercial(null); // read the build again
    expect(commercialEnabled()).toBe(true);
  });

  it('takes ?commercial=1 in a dev build only', () => {
    expect(commercialFrom({ DEV: true }, '?commercial=1')).toBe(true);
    expect(commercialFrom({ DEV: true }, '?e2e&commercial=1')).toBe(true);
    expect(commercialFrom({ DEV: true }, '?commercial=0')).toBe(false);
    expect(commercialFrom({ DEV: false }, '?commercial=1')).toBe(false);
    // The test run is a dev build: the page's own URL is read.
    vi.stubGlobal('location', { search: '?commercial=1' });
    __setCommercial(null);
    expect(commercialEnabled()).toBe(true);
  });

  it('can be forced by a test either way', () => {
    __setCommercial(true);
    expect(commercialEnabled()).toBe(true);
    vi.stubEnv('VITE_COMMERCIAL', '1');
    __setCommercial(false);
    expect(commercialEnabled()).toBe(false);
  });
});
