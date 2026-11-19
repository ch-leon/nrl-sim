// src/platform.ts — which build this is: the website, the Android app or the iPhone app
// (docs/specs/ios.md §2, "Platform"). The one answer analytics, entitlements and the
// store rules read.
//
// Decided at build time. vite.config.ts calls platformFromEnv() and defines
// __NRL_PLATFORM__ with the result: NRL_NATIVE=1 alone is the Android app (as it was
// before iOS, so `build:android` is unchanged), NRL_NATIVE=1 with NRL_PLATFORM=ios is
// the iPhone app (`build:ios`), anything else is the web. `typeof` guards the places
// where the define is absent (a script run with vite-node).

declare const __NRL_PLATFORM__: string | undefined;

export type AppPlatform = 'web' | 'android' | 'ios';
export const APP_PLATFORMS: readonly AppPlatform[] = ['web', 'android', 'ios'];

/**
 * The platform a build's environment asks for. NRL_PLATFORM only names which native
 * shell, so it needs NRL_NATIVE=1; a value it does not know stops the build rather
 * than ship a mislabelled app.
 */
export function platformFromEnv(env: { NRL_NATIVE?: string; NRL_PLATFORM?: string }): AppPlatform {
  const native = env.NRL_NATIVE === '1';
  const shell = env.NRL_PLATFORM;
  if (!shell) return native ? 'android' : 'web';
  if (!native) throw new Error(`NRL_PLATFORM=${shell} needs NRL_NATIVE=1`);
  if (shell !== 'android' && shell !== 'ios') throw new Error(`NRL_PLATFORM must be android or ios, got ${shell}`);
  return shell;
}

/** The platform this build runs on. */
export const APP_PLATFORM: AppPlatform =
  typeof __NRL_PLATFORM__ === 'string' && (APP_PLATFORMS as readonly string[]).includes(__NRL_PLATFORM__)
    ? (__NRL_PLATFORM__ as AppPlatform)
    : 'web';

/**
 * True only in the iPhone build. Written on the raw define (not APP_PLATFORM) so the
 * bundler folds it to a literal: code behind `IS_IOS_APP ? … : …` (the iOS save mirror
 * and share-sheet export, src/core/storage/native.ts) is dropped from web and Android builds.
 */
export const IS_IOS_APP: boolean = typeof __NRL_PLATFORM__ !== 'undefined' && __NRL_PLATFORM__ === 'ios';

/** True inside a native app (Android or iPhone), false on the web. */
export function isNativeApp(platform: AppPlatform = APP_PLATFORM): boolean {
  return platform !== 'web';
}
