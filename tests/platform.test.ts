import { describe, it, expect } from 'vitest';
import { APP_PLATFORM, isNativeApp, platformFromEnv } from '../src/platform';
import { PLATFORM } from '../src/commercial/entitlements';
import { sanitize } from '../src/analytics/events';

// docs/specs/ios.md §2, "Platform": one answer for web, android or ios, set at build time.
describe('platformFromEnv (vite.config.ts)', () => {
  it('a plain build is the web', () => {
    expect(platformFromEnv({})).toBe('web');
    expect(platformFromEnv({ NRL_NATIVE: '0' })).toBe('web');
  });

  it('NRL_NATIVE=1 on its own is still the Android app (build:android is unchanged)', () => {
    expect(platformFromEnv({ NRL_NATIVE: '1' })).toBe('android');
    expect(platformFromEnv({ NRL_NATIVE: '1', NRL_PLATFORM: '' })).toBe('android');
    expect(platformFromEnv({ NRL_NATIVE: '1', NRL_PLATFORM: 'android' })).toBe('android');
  });

  it('NRL_PLATFORM=ios with NRL_NATIVE=1 is the iPhone app (build:ios)', () => {
    expect(platformFromEnv({ NRL_NATIVE: '1', NRL_PLATFORM: 'ios' })).toBe('ios');
  });

  it('stops the build on a mislabelled app', () => {
    expect(() => platformFromEnv({ NRL_PLATFORM: 'ios' })).toThrow(/NRL_NATIVE=1/);
    expect(() => platformFromEnv({ NRL_NATIVE: '1', NRL_PLATFORM: 'iphone' })).toThrow(/android or ios/);
  });
});

describe('the build this test runs in', () => {
  it('is the web, and every reader agrees', () => {
    expect(APP_PLATFORM).toBe('web');
    expect(isNativeApp()).toBe(false);
    expect(PLATFORM).toBe('web');
  });

  it('native means android or ios', () => {
    expect(isNativeApp('android')).toBe(true);
    expect(isNativeApp('ios')).toBe(true);
    expect(isNativeApp('web')).toBe(false);
  });
});

describe('analytics context', () => {
  it('accepts ios as a platform alongside web and android, and nothing else', () => {
    for (const platform of ['web', 'android', 'ios']) {
      expect(sanitize('season_finished', { app_build: '2026-11-18 abc1234', platform })).toEqual({ app_build: '2026-11-18 abc1234', platform });
    }
    expect(sanitize('season_finished', { app_build: '2026-11-18 abc1234', platform: 'steam' })).toBeNull();
  });
});
