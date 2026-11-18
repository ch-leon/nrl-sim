// src/core/storage/platform.ts — is this the iPhone app? (docs/specs/ios.md, Phase 2)
//
// The native save mirror and the share-sheet export run only in the iOS app.
// Everything that asks goes through isIosNative(), so this is the one line to
// change when there is a single web / android / ios source of truth.
//
// TODO(ios Phase 1): point isIosNative() at Phase 1's platform flag after the merge.
// Until then: the Capacitor native bridge injects `window.Capacitor` into the
// app's web view before any page script runs, and its getPlatform() says 'ios'
// only there. The web game never imports @capacitor/core statically, so in a
// browser there is no `Capacitor` global and this is false; on Android it says
// 'android'. Nothing is imported to answer.

interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

/** True only inside the iOS app's web view. `scope` is for tests (defaults to globalThis). */
export function isIosNative(scope: unknown = globalThis): boolean {
  try {
    const cap = (scope as { Capacitor?: CapacitorGlobal } | null)?.Capacitor;
    return !!cap && cap.isNativePlatform?.() === true && cap.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}
