// src/analytics/index.ts — anonymous analytics, fail-open (#450).
//
// The game calls track() and nothing else. Nothing here imports the SDK: it is
// fetched as its own chunk by startAnalytics(), which main.ts calls only once the
// title screen is done, and only after the page goes idle, so neither the first
// load nor the title waits on it, and nothing reaches PostHog (or the browser's
// storage) before the player has left the title. Until it arrives, events wait
// in a short queue; when analytics is off (no token, dev, tests, the lab, Labs,
// an automated run: config.ts) or the SDK fails to load or start, every call is
// a no-op and the queue is dropped. No call here throws into the game.
//
// What may be sent is events.ts's list. Dedup:
//  - once per page: a career start, an email sign-up, and each pop-up's shown,
//    clicked and dismissed;
//  - once per key: a match (by season and round), a season;
//  - push on/off: only a change from the last value sent;
//  - a tab: not again for the same tab within TAB_REPEAT_MS (a double tap).

/// <reference types="vite/client" />
import { buildLabel } from '../ui/buildInfo';
import { labsVisible } from '../labs/flags';
import { analyticsSetup, type AnalyticsEnv, type AnalyticsPage, type AnalyticsSetup } from './config';
import { sanitize, type EventContext, type EventName, type EventProps } from './events';

declare const __NRL_NATIVE__: boolean | undefined;

/** What the SDK chunk hands back (posthogClient.ts). */
export interface AnalyticsClient {
  capture(name: EventName, props: Record<string, string | boolean>): void;
}
export type ClientLoader = () => Promise<{ createClient(setup: AnalyticsSetup): AnalyticsClient }>;

export const QUEUE_MAX = 50;
export const TAB_REPEAT_MS = 1000;

type Status = 'idle' | 'loading' | 'ready' | 'off';
let status: Status = 'idle';
let client: AnalyticsClient | null = null;
let queue: { name: EventName; props: Record<string, string | boolean> }[] = [];
const sentKeys = new Set<string>();
let lastPush: boolean | null = null;
let lastTab: { tab: string; at: number } | null = null;

function context(): EventContext {
  return { app_build: buildLabel(), platform: typeof __NRL_NATIVE__ === 'boolean' && __NRL_NATIVE__ ? 'android' : 'web' };
}

function send(name: EventName, props: Record<string, string | boolean>): void {
  if (status === 'off') return;
  if (status === 'ready' && client) {
    try {
      client.capture(name, props);
    } catch {
      stop();
    }
    return;
  }
  if (queue.length < QUEUE_MAX) queue.push({ name, props });
}

function stop(): void {
  status = 'off';
  client = null;
  queue = [];
}

/**
 * Send one of the agreed events. `key` makes it once-only for that key on this
 * page (a match's season and round). Never throws; a no-op when analytics is off.
 */
export function track<K extends EventName>(name: K, props: EventProps[K], key?: string): void {
  try {
    if (status === 'off') return;
    const once = key ?? ONCE_PER_PAGE[name]?.(props as Record<string, unknown>);
    if (once !== undefined && sentKeys.has(`${name}:${once}`)) return;
    if (name === 'push_opt_in_changed') {
      const on = (props as EventProps['push_opt_in_changed']).enabled;
      if (on === lastPush) return;
      lastPush = on;
    }
    if (name === 'tab_viewed') {
      const tab = (props as EventProps['tab_viewed']).tab;
      const now = Date.now();
      if (lastTab && lastTab.tab === tab && now - lastTab.at < TAB_REPEAT_MS) return;
      lastTab = { tab, at: now };
    }
    const clean = sanitize(name, { ...props, ...context() });
    if (!clean) return;
    if (once !== undefined) sentKeys.add(`${name}:${once}`);
    send(name, clean);
  } catch {
    // Analytics never stops the game.
  }
}

/** Events that go once per page whatever the caller passes, keyed by what makes them distinct. */
const ONCE_PER_PAGE: Partial<Record<EventName, (p: Record<string, unknown>) => string>> = {
  career_started: () => 'page',
  email_signup_completed: () => 'page',
  popup_shown: (p) => String(p.popup_id),
  popup_clicked: (p) => String(p.popup_id),
  popup_dismissed: (p) => String(p.popup_id),
};

export interface StartOptions {
  env?: AnalyticsEnv;
  page?: AnalyticsPage;
  load?: ClientLoader;
  /** When to fetch the SDK: by default once the page is idle (at most a few seconds after the title). */
  defer?: (run: () => void) => void;
}

function readPage(): AnalyticsPage {
  let labs = false;
  try {
    labs = labsVisible();
  } catch {
    labs = true; // can't tell: treat it as Labs, off
  }
  return {
    hash: typeof location === 'undefined' ? '' : location.hash,
    search: typeof location === 'undefined' ? '' : location.search,
    labs,
    automated: typeof navigator !== 'undefined' && navigator.webdriver === true,
  };
}

function whenIdle(run: () => void): void {
  const w = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}

/**
 * Start analytics if this page may send it: after the title screen (main.ts), never
 * before. Resolves once the SDK is up, or analytics is off; never rejects.
 */
export function startAnalytics(opts: StartOptions = {}): Promise<void> {
  if (status !== 'idle') return Promise.resolve();
  try {
    const setup = analyticsSetup(opts.env ?? (import.meta.env as AnalyticsEnv), opts.page ?? readPage());
    if ('off' in setup) {
      stop();
      return Promise.resolve();
    }
    status = 'loading';
    const load: ClientLoader = opts.load ?? (() => import('./posthogClient'));
    return new Promise<void>((resolve) => {
      (opts.defer ?? whenIdle)(() => {
        Promise.resolve()
          .then(load)
          .then((m) => {
            if (status !== 'loading') return;
            client = m.createClient(setup);
            status = 'ready';
            const waiting = queue;
            queue = [];
            for (const e of waiting) send(e.name, e.props);
          })
          .catch(() => stop())
          .finally(resolve);
      });
    });
  } catch {
    stop();
    return Promise.resolve();
  }
}

/** Test hook: back to a fresh page. */
export function __resetAnalytics(): void {
  status = 'idle';
  client = null;
  queue = [];
  sentKeys.clear();
  lastPush = null;
  lastTab = null;
}

/** Test hook: where it stands. */
export function __analyticsStatus(): { status: Status; queued: number } {
  return { status, queued: queue.length };
}
