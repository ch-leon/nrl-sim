// src/commercial/flags.ts — the `commercial` feature flag (commercial foundations 03, #362).
//
// Everything commercial (the demo gate, the paywall, a login entry) sits behind
// this one switch. On only when the build sets VITE_COMMERCIAL=1, or in a dev
// build (`npm run dev`) opened with `?commercial=1`. The GitHub Pages build sets
// neither, so there it is always off and the game plays as it always has.

/// <reference types="vite/client" />

/** The bits of the build's env the flag reads (import.meta.env in the game). */
export interface FlagEnv {
  DEV?: boolean;
  VITE_COMMERCIAL?: string;
}

/** Pure: whether a build with `env`, opened at `search`, runs commercial. The URL param counts in DEV only. */
export function commercialFrom(env: FlagEnv, search: string): boolean {
  if (env.VITE_COMMERCIAL === '1') return true;
  return env.DEV === true && new URLSearchParams(search).get('commercial') === '1';
}

/** A test's forced value; null reads the build. */
let forced: boolean | null = null;
let cached: boolean | null = null;

/** True when this build runs the commercial code paths. Read once per page. */
export function commercialEnabled(): boolean {
  if (forced !== null) return forced;
  if (cached === null) {
    cached = commercialFrom(import.meta.env, typeof location === 'undefined' ? '' : location.search);
  }
  return cached;
}

/** Test hook: force the flag on or off (null goes back to reading the build). */
export function __setCommercial(on: boolean | null): void {
  forced = on;
  cached = null;
}
