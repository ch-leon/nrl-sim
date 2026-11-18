// capacitor.config.ts — the native Android and iPhone wraps around the Vite build (#89,
// first slice: a sideloadable test APK, docs/android-test-build.md; the iPhone shell,
// docs/ios-test-build.md and docs/specs/ios.md). `npm run build:android` builds dist/ with
// base '/' and no service worker (NRL_NATIVE=1, vite.config.ts); `npx cap sync android`
// copies it into android/; CI builds the debug APK (.github/workflows/android-apk.yml).
// `npm run build:ios` is the same build marked as the iPhone app (NRL_PLATFORM=ios,
// src/platform.ts), and `npx cap sync ios` copies it into ios/.
//
// The iPhone app does not use the id and name below: its bundle id
// (au.com.supercooked.bigrugbycoach.dev while on the free Apple ID) and its name
// (Big Coach) are set in the Xcode project, ios/App/App.xcodeproj and ios/App/App/Info.plist.
//
// The app id and name below are PLACEHOLDERS for the Android test build only. Leon hasn't
// picked the final name; changing appId later makes a different app on the phone
// (a fresh install, so a tester's saves don't carry over). After changing either,
// run `npx cap sync android` and update android/app/build.gradle (applicationId) and
// android/app/src/main/res/values/strings.xml to match.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.supercooked.nrlsim.test', // DECISION (Leon): placeholder app id for the test APK
  appName: 'NRL Sim (Test)', // DECISION (Leon): placeholder app name for the test APK
  webDir: 'dist',
  // The WebView's colour until the first paint: ink (BRAND.colors.app, SuperCOOKED §2), not
  // white (#622). A literal because the Capacitor CLI loads this file without the app's
  // TypeScript; tests/brand.test.ts pins it to the brand.
  backgroundColor: '#05070d',
  plugins: {
    SystemBars: {
      // Full screen: no status bar or nav bar (a swipe from the edge shows them for a moment).
      // On iPhone the same setting hides the status bar and dims the home bar.
      hidden: true,
      // index.html asks for viewport-fit=cover, so the game runs edge to edge and
      // env(safe-area-inset-*) carries the notch / camera cutout, which dom.ts reads
      // into --nrl-safe-t/r/b/l (#347). 'css' also fixes those insets on WebViews
      // older than Chromium 140.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
  ios: {
    // The game is one screen that never scrolls: no rubber-band bounce in the web view.
    scrollEnabled: false,
  },
};

export default config;
