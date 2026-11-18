// src/core/storage/platform.ts — is this the iPhone app? (docs/specs/ios.md, Phase 2)
//
// The native save mirror and the share-sheet export run only in the iOS app. Decided
// at build time from src/platform.ts (`npm run build:ios` sets __NRL_PLATFORM__ to
// 'ios'), so IOS_CODE is a literal in every build: each dynamic import of the
// Capacitor plugins (native.ts) sits behind `IOS_CODE ? … : …`, and web and Android
// builds contain none of that code.

import { IS_IOS_APP } from '../../platform';

/** True only in the iPhone build. False: its Capacitor code is left out of the bundle. */
export const IOS_CODE: boolean = IS_IOS_APP;

/** True only inside the iOS app. */
export function isIosNative(): boolean {
  return IOS_CODE;
}
