// capacitor.config.ts — the native Android wrap around the Vite build (#89, first slice:
// a sideloadable test APK, docs/android-test-build.md). `npm run build:android` builds
// dist/ with base '/' and no service worker (NRL_NATIVE=1, vite.config.ts) and copies it
// into android/; CI builds the debug APK (.github/workflows/android-apk.yml).
//
// The app id and name below are PLACEHOLDERS for the test build only. Leon hasn't
// picked the final name; changing appId later makes a different app on the phone
// (a fresh install, so a tester's saves don't carry over). After changing either,
// run `npx cap sync android` and update android/app/build.gradle (applicationId) and
// android/app/src/main/res/values/strings.xml to match.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.supercooked.nrlsim.test', // DECISION (Leon): placeholder app id for the test APK
  appName: 'NRL Sim (Test)', // DECISION (Leon): placeholder app name for the test APK
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // Full screen: no status bar or nav bar (a swipe from the edge shows them for a moment).
      hidden: true,
      // index.html asks for viewport-fit=cover, so the game runs edge to edge and
      // env(safe-area-inset-*) carries the notch / camera cutout, which dom.ts reads
      // into --nrl-safe-t/r/b/l (#347). 'css' also fixes those insets on WebViews
      // older than Chromium 140.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
