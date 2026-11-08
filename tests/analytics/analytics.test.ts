import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { analyticsSetup, POSTHOG_EU_HOST, type AnalyticsEnv, type AnalyticsPage } from '../../src/analytics/config';
import { dockTab, EVENT_NAMES, sanitize } from '../../src/analytics/events';
import { beforeSend, clientConfig } from '../../src/analytics/clientConfig';
import {
  __analyticsStatus, __resetAnalytics, QUEUE_MAX, startAnalytics, track, type AnalyticsClient, type ClientLoader,
} from '../../src/analytics/index';
import { initGameAnalytics, newResults, playerOutcome } from '../../src/analytics/gameEvents';
import { bus } from '../../src/core/events';
import type { Fixture, GameState } from '../../src/core/state';
import type { CaptureResult } from 'posthog-js/dist/module.slim';

// #450: anonymous analytics. The SDK itself never loads here: every test hands
// startAnalytics() a fake loader, and the guard below proves the game never
// imports it statically.

const TOKEN = 'phc_TESTtoken0123456789abcdef';
const PROD: AnalyticsEnv = { DEV: false, MODE: 'production', VITE_POSTHOG_KEY: TOKEN };
const PAGE: AnalyticsPage = { hash: '', search: '', labs: false, automated: false };
const CONTEXT = { app_build: '2026-11-07 abc1234', platform: 'web' };

describe('when analytics may run (config.ts)', () => {
  it('runs only in a production build with a public project token, on PostHog EU', () => {
    expect(analyticsSetup(PROD, PAGE)).toEqual({ token: TOKEN, host: POSTHOG_EU_HOST });
    expect(POSTHOG_EU_HOST).toBe('https://eu.i.posthog.com');
  });

  it('is off with no token, a placeholder, or anything but a phc_ public token (never a secret key)', () => {
    expect(analyticsSetup({ DEV: false, MODE: 'production' }, PAGE)).toEqual({ off: 'no-token' });
    expect(analyticsSetup({ ...PROD, VITE_POSTHOG_KEY: '  ' }, PAGE)).toEqual({ off: 'no-token' });
    expect(analyticsSetup({ ...PROD, VITE_POSTHOG_KEY: 'your_posthog_project_token' }, PAGE)).toEqual({ off: 'not-public-token' });
    expect(analyticsSetup({ ...PROD, VITE_POSTHOG_KEY: 'phx_personalApiKey0123456789' }, PAGE)).toEqual({ off: 'not-public-token' });
    expect(analyticsSetup({ ...PROD, VITE_POSTHOG_KEY: 'phc_short' }, PAGE)).toEqual({ off: 'not-public-token' });
  });

  it('is off in dev unless asked, and always in tests', () => {
    expect(analyticsSetup({ ...PROD, DEV: true, MODE: 'development' }, PAGE)).toEqual({ off: 'dev' });
    expect(analyticsSetup({ ...PROD, DEV: true, MODE: 'development', VITE_POSTHOG_DEV: '1' }, PAGE)).toEqual({ token: TOKEN, host: POSTHOG_EU_HOST });
    expect(analyticsSetup({ ...PROD, DEV: true, MODE: 'test', VITE_POSTHOG_DEV: '1' }, PAGE)).toEqual({ off: 'test' });
  });

  it('is off in the match lab, Labs, the test careers and automated browsers', () => {
    expect(analyticsSetup(PROD, { ...PAGE, hash: '#lab' })).toEqual({ off: 'lab' });
    expect(analyticsSetup(PROD, { ...PAGE, hash: '#lab?seed=4' })).toEqual({ off: 'lab' });
    expect(analyticsSetup(PROD, { ...PAGE, hash: '#label' })).toEqual({ token: TOKEN, host: POSTHOG_EU_HOST });
    expect(analyticsSetup(PROD, { ...PAGE, labs: true })).toEqual({ off: 'labs' });
    expect(analyticsSetup(PROD, { ...PAGE, search: '?labs=1' })).toEqual({ off: 'labs' });
    expect(analyticsSetup(PROD, { ...PAGE, search: '?e2e' })).toEqual({ off: 'e2e' });
    expect(analyticsSetup(PROD, { ...PAGE, automated: true })).toEqual({ off: 'automated' });
  });

  it('reads the build as off under vitest (the default env)', async () => {
    const load = vi.fn<ClientLoader>();
    __resetAnalytics();
    await startAnalytics({ load, page: PAGE, defer: (run) => run() });
    expect(load).not.toHaveBeenCalled();
    expect(__analyticsStatus().status).toBe('off');
    __resetAnalytics();
  });
});

describe('the agreed events and nothing else (events.ts)', () => {
  it('lists exactly #450 events', () => {
    expect(EVENT_NAMES.sort()).toEqual([
      'career_started', 'email_signup_completed', 'match_finished', 'popup_clicked', 'popup_dismissed',
      'popup_shown', 'push_opt_in_changed', 'season_finished', 'tab_viewed',
    ]);
  });

  it('keeps only the listed properties, and only valid values', () => {
    expect(sanitize('match_finished', { result: 'win', difficulty: 'hard', ...CONTEXT, score: 30, clubName: 'Cavehole Crushers' }))
      .toEqual({ result: 'win', difficulty: 'hard', ...CONTEXT });
    expect(sanitize('match_finished', { result: 'thrashed', difficulty: 'hard', ...CONTEXT })).toBeNull();
    expect(sanitize('match_finished', { result: 'win', ...CONTEXT })).toBeNull();
    expect(sanitize('season_finished', { ...CONTEXT, ladder: 1 })).toEqual(CONTEXT);
    expect(sanitize('email_signup_completed', { ...CONTEXT, email: 'someone@example.com' })).toEqual(CONTEXT);
    expect(sanitize('tab_viewed', { tab: 'fixtures', ...CONTEXT })).toBeNull();
    expect(sanitize('push_opt_in_changed', { enabled: 'yes', ...CONTEXT })).toBeNull();
    expect(sanitize('career_started', { difficulty: 'normal', app_build: 'Leon <leon@example.com>', platform: 'web' })).toBeNull();
  });

  it('takes a pop-up by its slug, never its text', () => {
    expect(sanitize('popup_shown', { popup_id: 'spring-sale_2', ...CONTEXT })).toEqual({ popup_id: 'spring-sale_2', ...CONTEXT });
    expect(sanitize('popup_shown', { popup_id: 'Sign up for our newsletter!', ...CONTEXT })).toBeNull();
    expect(sanitize('popup_clicked', { popup_id: 'x'.repeat(41), ...CONTEXT })).toBeNull();
  });

  it('refuses any other event', () => {
    for (const name of ['$pageview', '$exception', '$identify', '$snapshot', 'player_signed', 'full_game_purchased', 'career_resumed']) {
      expect(sanitize(name, { ...CONTEXT })).toBeNull();
    }
  });

  it('names the dock tabs as the player reads them', () => {
    expect(['club', 'squad', 'fixtures', 'build', 'office'].map(dockTab)).toEqual(['club', 'squad', 'league', 'build', 'office']);
    expect(dockTab('league')).toBeNull();
    expect(dockTab('finance')).toBeNull();
    expect(dockTab('lineup')).toBeNull();
  });
});

describe('the SDK setup (clientConfig.ts)', () => {
  const cfg = clientConfig({ token: TOKEN, host: POSTHOG_EU_HOST });

  it('is cookieless, with no person profiles and nothing kept in the browser', () => {
    expect(cfg).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      cookieless_mode: 'always',
      person_profiles: 'never',
      persistence: 'memory',
      disable_persistence: true,
      save_referrer: false,
      save_campaign_params: false,
    });
  });

  it('captures nothing on its own: no autocapture, page views, replay, exceptions or remote scripts', () => {
    expect(cfg).toMatchObject({
      autocapture: false,
      rageclick: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_performance: false,
      capture_exceptions: false,
      disable_session_recording: true,
      session_recording: { maskAllInputs: true },
      disable_surveys: true,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
    });
    expect(cfg).not.toHaveProperty('logs');
    expect(cfg).not.toHaveProperty('bootstrap');
  });

  const sdkEvent = (event: string, properties: Record<string, unknown>): CaptureResult =>
    ({ uuid: 'u', event, properties, timestamp: new Date() } as unknown as CaptureResult);

  it('before_send drops every event not on the list', () => {
    for (const name of ['$pageview', '$pageleave', '$autocapture', '$exception', '$identify', '$snapshot', '$web_vitals', 'survey shown', 'player_sold']) {
      expect(beforeSend(sdkEvent(name, { ...CONTEXT }))).toBeNull();
    }
    expect(beforeSend(null)).toBeNull();
  });

  it('before_send keeps the agreed properties and the SDK\'s own, drops the rest, and strips the address', () => {
    const out = beforeSend({
      ...sdkEvent('tab_viewed', {
        tab: 'squad', ...CONTEXT, playerName: 'Deakin Cronky', save: '{"club":"x"}',
        $current_url: 'https://ch-leon.github.io/nrl-sim/?country=au#lab', $pathname: '/nrl-sim/',
        $referrer: 'https://mail.example.com/?u=me', $initial_referrer: 'x', $os: 'iOS', token: TOKEN,
        distinct_id: '$posthog_cookieless', $set: { email: 'a@b.c' },
      }),
      $set: { email: 'a@b.c' },
    } as unknown as CaptureResult);
    expect(out?.properties).toEqual({
      tab: 'squad', ...CONTEXT, $current_url: 'https://ch-leon.github.io/nrl-sim/', $pathname: '/nrl-sim/',
      $os: 'iOS', token: TOKEN, distinct_id: '$posthog_cookieless',
    });
    expect(out).not.toHaveProperty('$set');
  });
});

describe('track and startAnalytics (index.ts): lazy, deduped, fail-open', () => {
  let sent: { name: string; props: Record<string, unknown> }[];
  let client: AnalyticsClient;
  const loader = (c: () => AnalyticsClient = () => client): ClientLoader => async () => ({ createClient: c });
  const now = (): void => undefined;

  beforeEach(() => {
    __resetAnalytics();
    sent = [];
    client = { capture: (name, props) => void sent.push({ name, props }) };
  });
  afterEach(() => {
    __resetAnalytics();
    vi.useRealTimers();
  });

  it('fetches the SDK only when the page is idle, and sends what waited, in order', async () => {
    let idle: (() => void) | null = null;
    const load = vi.fn(loader());
    track('career_started', { difficulty: 'easy' });
    const started = startAnalytics({ env: PROD, page: PAGE, load, defer: (run) => { idle = run; } });
    track('tab_viewed', { tab: 'squad' });
    expect(load).not.toHaveBeenCalled();
    expect(__analyticsStatus()).toEqual({ status: 'loading', queued: 2 });
    idle!();
    await started;
    expect(load).toHaveBeenCalledTimes(1);
    expect(sent.map((e) => e.name)).toEqual(['career_started', 'tab_viewed']);
    expect(sent[0]!.props).toMatchObject({ difficulty: 'easy', platform: 'web' });
    track('season_finished', {}, '1');
    expect(sent.map((e) => e.name)).toEqual(['career_started', 'tab_viewed', 'season_finished']);
  });

  it('drops everything, and never loads, when analytics is off', async () => {
    const load = vi.fn(loader());
    track('career_started', { difficulty: 'normal' });
    await startAnalytics({ env: { ...PROD, VITE_POSTHOG_KEY: '' }, page: PAGE, load, defer: (run) => run() });
    track('tab_viewed', { tab: 'club' });
    expect(load).not.toHaveBeenCalled();
    expect(__analyticsStatus()).toEqual({ status: 'off', queued: 0 });
    expect(sent).toEqual([]);
  });

  it('fails open: the SDK chunk not loading (offline), init throwing, or capture throwing', async () => {
    await expect(startAnalytics({ env: PROD, page: PAGE, load: () => Promise.reject(new Error('offline')), defer: (run) => run() })).resolves.toBeUndefined();
    expect(__analyticsStatus().status).toBe('off');
    expect(() => track('tab_viewed', { tab: 'club' })).not.toThrow();

    __resetAnalytics();
    await startAnalytics({ env: PROD, page: PAGE, load: () => { throw new Error('sync'); }, defer: (run) => run() });
    expect(__analyticsStatus().status).toBe('off');

    __resetAnalytics();
    await startAnalytics({ env: PROD, page: PAGE, load: loader(() => { throw new Error('init'); }), defer: (run) => run() });
    expect(__analyticsStatus().status).toBe('off');

    __resetAnalytics();
    client = { capture: () => { throw new Error('network'); } };
    await startAnalytics({ env: PROD, page: PAGE, load: loader(), defer: (run) => run() });
    expect(() => track('tab_viewed', { tab: 'club' })).not.toThrow();
    expect(__analyticsStatus().status).toBe('off');
  });

  it('starts once', async () => {
    const load = vi.fn(loader());
    await startAnalytics({ env: PROD, page: PAGE, load, defer: (run) => run() });
    await startAnalytics({ env: PROD, page: PAGE, load, defer: (run) => run() });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps the queue short while waiting', () => {
    void startAnalytics({ env: PROD, page: PAGE, load: loader(), defer: now });
    for (let i = 0; i < QUEUE_MAX + 20; i++) track('match_finished', { result: 'win', difficulty: 'normal' }, `1:${i}`);
    expect(__analyticsStatus().queued).toBe(QUEUE_MAX);
  });

  it('dedups: a career, a match, a season, a pop-up action and an email once; push on change; a tab not twice in a second', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    await startAnalytics({ env: PROD, page: PAGE, load: loader(), defer: (run) => run() });
    track('career_started', { difficulty: 'normal' });
    track('career_started', { difficulty: 'normal' });
    track('match_finished', { result: 'win', difficulty: 'normal' }, '1:3');
    track('match_finished', { result: 'win', difficulty: 'normal' }, '1:3');
    track('match_finished', { result: 'loss', difficulty: 'normal' }, '1:4');
    track('season_finished', {}, '1');
    track('season_finished', {}, '1');
    track('popup_shown', { popup_id: 'promo' });
    track('popup_shown', { popup_id: 'promo' });
    track('popup_dismissed', { popup_id: 'promo' });
    track('email_signup_completed', {});
    track('email_signup_completed', {});
    track('push_opt_in_changed', { enabled: true });
    track('push_opt_in_changed', { enabled: true });
    track('push_opt_in_changed', { enabled: false });
    track('tab_viewed', { tab: 'squad' });
    track('tab_viewed', { tab: 'squad' });
    track('tab_viewed', { tab: 'build' });
    vi.advanceTimersByTime(1500);
    track('tab_viewed', { tab: 'build' });
    expect(sent.map((e) => e.name + (e.props.tab ? `:${e.props.tab}` : ''))).toEqual([
      'career_started', 'match_finished', 'match_finished', 'season_finished', 'popup_shown', 'popup_dismissed',
      'email_signup_completed', 'push_opt_in_changed', 'push_opt_in_changed', 'tab_viewed:squad', 'tab_viewed:build', 'tab_viewed:build',
    ]);
  });

  it('never sends a property that is not on the list, even from a caller', async () => {
    await startAnalytics({ env: PROD, page: PAGE, load: loader(), defer: (run) => run() });
    track('career_started', { difficulty: 'hard', coachName: 'Leon' } as never);
    track('popup_clicked', { popup_id: 'Free text here' });
    expect(sent).toHaveLength(1);
    expect(Object.keys(sent[0]!.props).sort()).toEqual(['app_build', 'difficulty', 'platform']);
  });
});

describe('the career events (gameEvents.ts)', () => {
  const fx = (round: number, homeId: string, awayId: string, score?: [number, number]): Fixture =>
    ({ round, homeId, awayId, ...(score ? { result: { homeScore: score[0], awayScore: score[1] } } : {}) });
  const st = (season: number, fixtures: Fixture[], difficulty = 'normal'): GameState =>
    ({ season, league: { clubs: [], fixtures, ladder: [] }, settings: { difficulty } } as unknown as GameState);

  it('reads the player\'s result from either end', () => {
    expect(playerOutcome(fx(1, 'player', 'r1', [20, 10]))).toBe('win');
    expect(playerOutcome(fx(1, 'r1', 'player', [20, 10]))).toBe('loss');
    expect(playerOutcome(fx(1, 'r1', 'player', [12, 12]))).toBe('draw');
    expect(playerOutcome(fx(1, 'r1', 'r2', [20, 10]))).toBeNull();
    expect(playerOutcome(fx(1, 'player', 'r2'))).toBeNull();
  });

  it('counts a match only when it goes from unplayed to played', () => {
    const before = [fx(1, 'player', 'r1', [10, 4]), fx(2, 'r2', 'player'), fx(2, 'r1', 'r3')];
    const after = [fx(1, 'player', 'r1', [10, 4]), fx(2, 'r2', 'player', [30, 6]), fx(2, 'r1', 'r3', [8, 8])];
    expect(newResults(before, after)).toEqual([{ round: 2, result: 'loss' }]);
    // A new season's fixtures, or a copy of the old ones, adds nothing.
    expect(newResults(after, [fx(1, 'player', 'r2'), fx(2, 'r3', 'player')])).toEqual([]);
    expect(newResults(after, after.map((f) => ({ ...f })))).toEqual([]);
  });

  it('sends career_started, each match once, and the season, from the bus; nothing for matches already played', async () => {
    const sent: { name: string; props: Record<string, unknown> }[] = [];
    __resetAnalytics();
    await startAnalytics({ env: PROD, page: PAGE, load: async () => ({ createClient: () => ({ capture: (name, props) => void sent.push({ name, props }) }) }), defer: (run) => run() });
    const start = st(1, [fx(1, 'player', 'r1', [10, 4]), fx(2, 'r2', 'player'), fx(3, 'player', 'r3'), fx(4, 'r1', 'player')], 'hard');
    const off = initGameAnalytics(start, true);
    const week2 = st(1, [fx(1, 'player', 'r1', [10, 4]), fx(2, 'r2', 'player', [6, 30]), fx(3, 'player', 'r3'), fx(4, 'r1', 'player')], 'hard');
    bus.emit('state:changed', week2);
    bus.emit('state:changed', { ...week2, week: 3 } as GameState); // same fixtures: nothing new
    // A save swapped in with several new results at once is not matches played.
    bus.emit('state:changed', st(1, [fx(1, 'player', 'r1', [1, 0]), fx(2, 'r2', 'player', [1, 0]), fx(3, 'player', 'r3', [1, 0]), fx(4, 'r1', 'player', [1, 0])], 'hard'));
    bus.emit('season:ended', { season: 1, ladderPosition: 3, premiership: false });
    bus.emit('season:ended', { season: 1, ladderPosition: 3, premiership: false });
    off();
    bus.emit('season:ended', { season: 2, ladderPosition: 1, premiership: true });
    expect(sent.map((e) => [e.name, e.props.result ?? e.props.difficulty ?? null])).toEqual([
      ['career_started', 'hard'],
      ['match_finished', 'win'],
      ['season_finished', null],
    ]);
    expect(sent[1]!.props).toEqual({ result: 'win', difficulty: 'hard', app_build: expect.any(String), platform: 'web' });
    __resetAnalytics();
  });

  it('sends no career_started for a career continued from a save', async () => {
    const sent: string[] = [];
    __resetAnalytics();
    await startAnalytics({ env: PROD, page: PAGE, load: async () => ({ createClient: () => ({ capture: (name) => void sent.push(name) }) }), defer: (run) => run() });
    initGameAnalytics(st(3, []), false)();
    expect(sent).toEqual([]);
    __resetAnalytics();
  });
});

describe('the SDK stays out of the first load (static guard)', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|js|mjs)$/.test(f) ? [p] : [];
  });
  const src = files('src').map((p) => [p.replace(/\\/g, '/'), readFileSync(p, 'utf8')] as const);

  it('only posthogClient.ts imports the SDK (clientConfig.ts for its types only)', () => {
    const importers = src.filter(([, code]) => /from\s+['"]posthog-js[^'"]*['"]|import\(\s*['"]posthog-js/.test(code)).map(([p]) => p);
    expect(importers.sort()).toEqual(['src/analytics/clientConfig.ts', 'src/analytics/posthogClient.ts']);
    const cfg = src.find(([p]) => p === 'src/analytics/clientConfig.ts')![1];
    expect(cfg).toMatch(/import type \{[^}]*\} from 'posthog-js\/dist\/module\.slim'/);
    expect(src.find(([p]) => p === 'src/analytics/posthogClient.ts')![1]).toMatch(/from 'posthog-js\/dist\/module\.slim'/);
  });

  it('nothing imports posthogClient.ts except index.ts, lazily', () => {
    const refs = src.filter(([p, code]) => p !== 'src/analytics/posthogClient.ts' && /posthogClient/.test(code.replace(/\/\/.*$/gm, '')));
    expect(refs.map(([p]) => p)).toEqual(['src/analytics/index.ts']);
    const idx = refs[0]![1];
    expect(idx).toMatch(/import\('\.\/posthogClient'\)/);
    expect(idx).not.toMatch(/^import[^;]*posthogClient/m);
  });

  it('the game never identifies, aliases or resets a person', () => {
    for (const [p, code] of src) {
      expect(code, p).not.toMatch(/posthog\.(identify|alias|reset|group|setPersonProperties|register|opt_in_capturing)\b/);
    }
  });

  it('main.ts starts analytics only after the title screen', () => {
    const main = src.find(([p]) => p === 'src/main.ts')![1];
    const title = main.indexOf('await showTitleFlow(');
    expect(title).toBeGreaterThan(0);
    expect(main.indexOf('startAnalytics(')).toBeGreaterThan(title);
    expect(main.indexOf('initGameAnalytics(')).toBeGreaterThan(title);
  });
});
