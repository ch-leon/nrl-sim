// src/analytics/config.ts — whether this page sends anonymous analytics, and where (#450).
//
// Pure, and it never imports the SDK: main.ts reads it on every boot, the tests
// on every run. Analytics is off unless every one of these holds:
//  - the build was given a PostHog *public project token* (`VITE_POSTHOG_KEY`,
//    `phc_…`). Anything else (none, a placeholder, a personal API key) is off, so
//    a secret key put in the wrong variable is never shipped to a request;
//  - it is a production build (`npm run dev` only with `VITE_POSTHOG_DEV=1`), and
//    never vitest (MODE 'test');
//  - the page is the game: not the match lab (`/#lab`), not an active Labs
//    session (`?labs=1`, or `page.labs` from labsBlocksAnalytics: a developer
//    override, experiment, short field or playtest career actually on — the
//    Settings entry being listed is not enough), not an automated run (`?e2e`,
//    the test careers the playthroughs and the save corpus drive, or a browser
//    under automation).
// The host is fixed to PostHog's EU cloud; no build variable can move the data.

/** PostHog's EU ingestion host (#450: EU cloud only). */
export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

/** The build env the guard reads (import.meta.env in the game). */
export interface AnalyticsEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_POSTHOG_KEY?: string;
  VITE_POSTHOG_DEV?: string;
}

/** The page the guard reads. */
export interface AnalyticsPage {
  hash: string;
  search: string;
  /** An active Labs session (src/labs/flags.ts labsBlocksAnalytics), not merely the Settings entry. */
  labs: boolean;
  /** navigator.webdriver: a browser driven by Playwright and the like. */
  automated: boolean;
  /** Browser DNT/GPC opt-out, enforced before SDK load as well as by respect_dnt. */
  doNotTrack?: boolean;
}

export interface AnalyticsSetup {
  token: string;
  host: string;
}

/** Why analytics is off, for the tests and a dev's console. */
export type AnalyticsOff = 'no-token' | 'not-public-token' | 'dev' | 'test' | 'lab' | 'labs' | 'e2e' | 'automated' | 'dnt';

/** A PostHog public project token: `phc_` and URL-safe characters only. */
const PUBLIC_TOKEN = /^phc_[A-Za-z0-9_-]{16,}$/;

/** Pure: the setup when analytics may run on this page, else why it may not. */
export function analyticsSetup(env: AnalyticsEnv, page: AnalyticsPage): AnalyticsSetup | { off: AnalyticsOff } {
  const token = (env.VITE_POSTHOG_KEY ?? '').trim();
  if (token === '') return { off: 'no-token' };
  if (!PUBLIC_TOKEN.test(token)) return { off: 'not-public-token' };
  if (env.MODE === 'test') return { off: 'test' };
  if (env.DEV === true && env.VITE_POSTHOG_DEV !== '1') return { off: 'dev' };
  if (/^#lab(?:\?|$)/.test(page.hash)) return { off: 'lab' }; // isLabHash's rule (src/match/lab/controller.ts)
  if (page.labs || new URLSearchParams(page.search).get('labs') === '1') return { off: 'labs' };
  if (new URLSearchParams(page.search).has('e2e')) return { off: 'e2e' };
  if (page.automated) return { off: 'automated' };
  if (page.doNotTrack) return { off: 'dnt' };
  return { token, host: POSTHOG_EU_HOST };
}
