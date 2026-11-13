import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureResult } from 'posthog-js/dist/module.slim';
import { beforeSend } from '../../src/analytics/clientConfig';
import { __resetAnalytics, installExceptionTracking, startAnalytics, type AnalyticsClient } from '../../src/analytics';
import { EXCEPTION_BURST_MAX, EXCEPTION_MAX_FRAMES, EXCEPTION_MESSAGE, EXCEPTION_WINDOW_MS, sanitizeException } from '../../src/analytics/exceptions';
import { __setLabs } from '../../src/labs/flags';
import type { AnalyticsEnv, AnalyticsPage } from '../../src/analytics/config';

const PROD: AnalyticsEnv = { DEV: false, MODE: 'production', VITE_POSTHOG_KEY: 'phc_TESTtoken0123456789abcdef' };
const PAGE: AnalyticsPage = { hash: '', search: '', labs: false, automated: false };
const CONTEXT = { app_build: '2026-11-10 abc1234', platform: 'android' };
const error = (line = 10): Error => {
  const e = new TypeError('Coach Leon, Cavehole Crushers, player Deakin, me@example.com, phc_private');
  e.stack = `TypeError: ${e.message}\n    at privateName (https://game.test/nrl-sim/assets/index-AbCd1234.js?email=me@example.com#token:123:${line})\nprivateName@https://game.test/assets/boot-AbCd1234.js?save=blob#private:20:30\n    at https://game.test/coach/Leon.js:2:3`;
  return e;
};
function dispatch(target: EventTarget, type: string, value: unknown): void {
  const e = new Event(type);
  Object.defineProperty(e, type === 'error' ? 'error' : 'reason', { value });
  target.dispatchEvent(e);
}
const sdkEvent = (props: Record<string, unknown>): CaptureResult => ({ event: '$exception', uuid: 'u', timestamp: new Date(), properties: props } as unknown as CaptureResult);

describe('JavaScript error tracking (#548)', () => {
  let target: EventTarget;
  let capture: ReturnType<typeof vi.fn>;
  let load: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    __resetAnalytics();
    target = new EventTarget();
    capture = vi.fn();
    const client: AnalyticsClient = { capture: vi.fn(), captureException: capture };
    load = vi.fn(async () => ({ createClient: () => client }));
  });
  afterEach(() => { __resetAnalytics(); __setLabs(null); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  const start = (load: ReturnType<typeof vi.fn>, env = PROD, page = PAGE) => startAnalytics({ env, page, load, defer: (run) => run() });

  it('queues uncaught errors and unhandled rejections before title/start without fetching the SDK, then sends with build and platform', async () => {
    installExceptionTracking({ env: PROD, page: PAGE }, target);
    dispatch(target, 'error', error());
    dispatch(target, 'unhandledrejection', error(11));
    expect(capture).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    await start(load);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[0][1]).toEqual({ app_build: expect.any(String), platform: 'web', exception_source: 'error' });
    expect(capture.mock.calls[1][1].exception_source).toBe('unhandledrejection');
    expect(capture.mock.calls[0][0]).toEqual({ type: 'TypeError', frames: [
      { filename: 'app:///assets/index.js', lineno: 123, colno: 10 },
      { filename: 'app:///assets/boot.js', lineno: 20, colno: 30 },
    ] });
    dispatch(target, 'unhandledrejection', error(12));
    expect(capture).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['no token', { ...PROD, VITE_POSTHOG_KEY: '' }, PAGE],
    ['not a public token', { ...PROD, VITE_POSTHOG_KEY: 'phx_secret' }, PAGE],
    ['dev', { ...PROD, DEV: true }, PAGE],
    ['test', { ...PROD, MODE: 'test', VITE_POSTHOG_DEV: '1' }, PAGE],
    ['match lab', PROD, { ...PAGE, hash: '#lab' }],
    ['Labs', PROD, { ...PAGE, labs: true }],
    ['Labs query', PROD, { ...PAGE, search: '?labs=1' }],
    ['e2e', PROD, { ...PAGE, search: '?e2e' }],
    ['automated', PROD, { ...PAGE, automated: true }],
    ['DNT', PROD, { ...PAGE, doNotTrack: true }],
  ])('installs no listeners and sends nothing when off: %s', async (_, env, page) => {
    const listen = vi.spyOn(target, 'addEventListener');
    installExceptionTracking({ env, page }, target);
    dispatch(target, 'error', error());
    dispatch(target, 'unhandledrejection', error(11));
    await start(load, env, page);
    expect(listen).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('keeps test careers off even with developer settings hidden', async () => {
    __setLabs({ visible: false, on: {}, hintsSeen: [], testCareer: { preset: 'block-play', fresh: false, from: 1 } });
    vi.stubGlobal('window', target);
    installExceptionTracking({ env: PROD }, target);
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    dispatch(target, 'error', error());
    expect(load).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it.each([{ doNotTrack: '1' }, { msDoNotTrack: 'yes' }, { globalPrivacyControl: true }])('reads browser privacy signals before SDK startup: %j', async (signal) => {
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    vi.stubGlobal('navigator', signal);
    installExceptionTracking({ env: PROD }, target);
    dispatch(target, 'error', error());
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    expect(load).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('stops sending exceptions if browser privacy or Labs is enabled after SDK startup', async () => {
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    vi.stubGlobal('navigator', {});
    installExceptionTracking({ env: PROD }, target);
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    dispatch(target, 'error', error());
    vi.stubGlobal('navigator', { doNotTrack: '1' });
    dispatch(target, 'error', error(11));
    vi.stubGlobal('navigator', {});
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    dispatch(target, 'unhandledrejection', error(12));
    expect(capture).toHaveBeenCalledTimes(2);
    __setLabs({ visible: true, on: {}, hintsSeen: [], overrides: { 'open-screens': true } });
    dispatch(target, 'unhandledrejection', error(13));
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('allows the explicit development override', async () => {
    installExceptionTracking({ env: { ...PROD, DEV: true, VITE_POSTHOG_DEV: '1' }, page: PAGE }, target);
    await start(load, { ...PROD, DEV: true, VITE_POSTHOG_DEV: '1' });
    dispatch(target, 'error', error());
    expect(capture).toHaveBeenCalledOnce();
  });

  it('still sends when Developer settings is only shown, and drops once an override is on', async () => {
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    installExceptionTracking({ env: PROD }, target);
    dispatch(target, 'error', error());
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    expect(load).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledOnce();
    __resetAnalytics();
    load.mockClear();
    capture.mockClear();
    __setLabs({ visible: false, on: {}, hintsSeen: [], overrides: { 'open-screens': true } });
    installExceptionTracking({ env: PROD }, target);
    dispatch(target, 'error', error(11));
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    expect(load).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('drops queued errors when the build switch is off and the page has been shown', async () => {
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    installExceptionTracking({ env: PROD }, target);
    dispatch(target, 'error', error());
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    await startAnalytics({ env: PROD, load, defer: (run) => run() });
    dispatch(target, 'unhandledrejection', error(11));
    expect(capture).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('dedupes across both listeners and bounds the early queue and per-minute burst', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    installExceptionTracking({ env: PROD, page: PAGE }, target);
    for (let n = 0; n < 100; n++) {
      dispatch(target, 'error', error(n));
      dispatch(target, 'unhandledrejection', error(n));
    }
    await start(load);
    expect(capture).toHaveBeenCalledTimes(EXCEPTION_BURST_MAX);
    dispatch(target, 'error', error(500));
    expect(capture).toHaveBeenCalledTimes(EXCEPTION_BURST_MAX);
    vi.advanceTimersByTime(EXCEPTION_WINDOW_MS);
    dispatch(target, 'error', error());
    dispatch(target, 'unhandledrejection', error());
    expect(capture).toHaveBeenCalledTimes(EXCEPTION_BURST_MAX + 1);
  });

  it('fails open on capture, listener installation and hostile error accessors', async () => {
    installExceptionTracking({ env: PROD, page: PAGE }, target);
    await start(load);
    capture.mockImplementation(() => { throw new Error('network'); });
    expect(() => dispatch(target, 'error', error())).not.toThrow();
    expect(() => dispatch(target, 'unhandledrejection', error(12))).not.toThrow();
    expect(capture).toHaveBeenCalledOnce();
    __resetAnalytics();
    vi.spyOn(target, 'addEventListener').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => installExceptionTracking({ env: PROD, page: PAGE }, target)).not.toThrow();
    const hostile = new Error();
    Object.defineProperty(hostile, 'stack', { get() { throw new Error('private'); } });
    expect(() => sanitizeException(hostile)).not.toThrow();
  });

  it('sanitizes $exception at before_send, keeping only type, bounded stack, build, platform and cookieless metadata', () => {
    const raw = sdkEvent({ ...CONTEXT, token: PROD.VITE_POSTHOG_KEY, $lib: 'web', $lib_version: '1.447.3', exception_source: 'unhandledrejection',
      $exception_list: [{ type: 'TypeError', value: error().message, stacktrace: { frames: [
        { filename: 'https://game.test/assets/index-AbCd1234.js?email=me@example.com#private', lineno: 1, colno: 2, function: 'CoachLeon', vars: { save: 'blob' } },
        { filename: 'https://game.test/players/Deakin.js', lineno: 2, colno: 3 },
      ] }, cause: error() }], $exception_message: 'private', $exception_steps: [{ message: 'save blob' }],
      $current_url: 'https://game.test/?email=me@example.com#private', $referrer: 'private',
      $set: { email: 'me@example.com' }, distinct_id: 'private', player: 'Deakin', save: 'blob',
    });
    const result = beforeSend(raw);
    expect(result?.properties).toEqual({ ...CONTEXT, token: PROD.VITE_POSTHOG_KEY, $lib: 'web', $lib_version: '1.447.3',
      $exception_level: 'error', $exception_list: [{ type: 'TypeError', value: EXCEPTION_MESSAGE,
        mechanism: { type: 'onunhandledrejection', handled: false }, stacktrace: { type: 'raw', frames: [{ filename: 'app:///assets/index.js', lineno: 1, colno: 2, platform: 'web:javascript' }] } }],
      distinct_id: '$posthog_cookieless', $process_person_profile: false, $cookieless_mode: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/Coach|Deakin|Cavehole|@|[?#]|private|blob/);
    expect(beforeSend(sdkEvent({ ...CONTEXT }))).toBeNull();
    expect(beforeSend(sdkEvent({ ...CONTEXT, app_build: 'private@example.com', $exception_list: [{}] }))).toBeNull();
  });

  it('discards arbitrary values, truncates stacks, and uses the error event location if needed', () => {
    expect(sanitizeException({ reason: 'coach', save: 'blob' })).toEqual({ type: 'Error', frames: [] });
    const e = error();
    e.stack = 'Error: private\n' + '    at https://game.test/assets/index-AbCd1234.js:1:2\n'.repeat(100);
    expect(sanitizeException(e).frames).toHaveLength(EXCEPTION_MAX_FRAMES);
    expect(sanitizeException(null, { filename: 'https://game.test/assets/index-AbCd1234.js?private#private', lineno: 4, colno: 5 }).frames)
      .toEqual([{ filename: 'app:///assets/index.js', lineno: 4, colno: 5 }]);
  });
});
