// src/core/storage/platform.ts — is this the iPhone app? (docs/specs/ios.md, Phase 2)
//
// The native save mirror and the share-sheet export run only in the iOS app.
// Everything that asks goes through IOS_CODE and isIosNative().
//
// TODO(ios Phase 1): after the merge, set IOS_CODE to the build's compile-time
// platform constant (e.g. `__NRL_PLATFORM__ === 'ios'`). Every dynamic import of the
// Capacitor plugins (native.ts) sits behind `IOS_CODE ? … : …`, so on web and Android
// builds the bundler drops them and their chunks entirely. Until then it is true and
// the answer is decided at run time: the Capacitor native bridge injects
// `window.Capacitor` into the app's web view before any page script runs, and its
// getPlatform() says 'ios' only there. The web game never imports @capacitor/core
// statically, so in a browser there is no `Capacitor` global; on Android it says
// 'android'. Nothing is imported to answer.

/** False in a build that can never be the iOS app: its Capacitor code is left out. */
export const IOS_CODE: boolean = true;

interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

/** True only inside the iOS app's web view. `scope` is for tests (defaults to globalThis). */
export function isIosNative(scope: unknown = globalThis): boolean {
  if (!IOS_CODE) return false;
  try {
    const cap = (scope as { Capacitor?: CapacitorGlobal } | null)?.Capacitor;
    return !!cap && cap.isNativePlatform?.() === true && cap.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}
