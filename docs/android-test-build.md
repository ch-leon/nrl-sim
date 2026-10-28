# Android test build (sideload APK)

A way to put the game on an Android phone as a real app, for play-testing, without a
Play Store listing, an account, or any payment. It plays exactly like the web build,
with saves kept locally on that phone. This is the first slice of
[#89](https://github.com/ch-leon/nrl-sim/issues/89) — Android only, test build only.

The app is wrapped with [Capacitor](https://capacitorjs.com/): the same Vite build the
website uses, inside a thin native shell. The web/PWA build and the GitHub Pages deploy
are unchanged.

> **Placeholder identity.** This test build is `NRL Sim (Test)`, app id
> `au.supercooked.nrlsim.test` (see `capacitor.config.ts`). Both are placeholders until
> Leon picks the final name. Changing the app id later makes it a *different* app on the
> phone — a fresh install, so a tester's saves won't carry over.

## Build it

### From GitHub (no tools needed)

1. Go to **Actions → “Android test APK”**.
2. Click **Run workflow**, pick a branch, **Run workflow**.
3. When it finishes (a few minutes), the APK is in two places:
   - the run's **Artifacts** section, as `nrl-sim-test-apk` (a zip containing the APK), and
   - the **`android-test-latest`** release, as `nrl-sim-test.apk` — a stable link that
     always points at the newest build. This is the easiest one to send to a tester.
     Every push to `main` and every manual run replaces that asset.

The build also runs on pull requests that touch the app, so a broken APK build is caught
before merge. Those PR runs upload the artifact but do **not** touch the release.

### Locally

Needs Node 22, JDK 17+, and the Android SDK (platform 36, build-tools 36, platform-tools)
with `ANDROID_HOME`/`local.properties` pointing at it.

```bash
npm ci
npm run build:android        # Vite build (native config: base '/', no service worker, obfuscated)
npx cap sync android         # copy the build into the native project
./android/gradlew -p android assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Install it (for a tester)

1. Copy `nrl-sim-test.apk` to the phone (download link, email, cable, or a file share).
2. Open it with the phone's **Files** app. Android will say installs from this source are
   blocked — tap **Settings**, turn on **Allow from this source** (sometimes called
   *Install unknown apps*), then go back.
3. Tap **Install**, then **Open**. The game launches in landscape, full screen.

### Updating to a newer build

Because this is a **debug**-signed test build, the signing key can differ between builds.
If Android refuses to install over an existing copy (“app not installed” / signature
mismatch), **uninstall the old one first, then install the new APK**. Uninstalling clears
that phone's saves (see below).

## Saves

Saves live **only on that phone**, in the app's local storage, and persist across app
restarts. They are **lost if the app is uninstalled** (including an uninstall needed to
update, above). There is no cloud save and no account — this is a local-only test build.

## What the native build does differently

- **Landscape, full screen.** The game is landscape-only on touch, so the app is locked to
  landscape (`android:screenOrientation="sensorLandscape"`) and runs edge-to-edge with the
  status and navigation bars hidden (`SystemBars` in `capacitor.config.ts`). Safe-area
  insets (notch / camera cutout) are handled the same way as the web build — the WebView
  fills them with `env(safe-area-inset-*)`, which the UI already reads into
  `--nrl-safe-*` (#347).
- **No service worker.** The PWA service worker is turned off inside the app
  (`vite.config.ts`, and `src/fx/pwa.ts` skips registration), so a stale web cache can
  never shadow the bundled build.
- **Not commercial.** `VITE_COMMERCIAL` is not set, so the paywall stays off, same as the
  web build.

## A note on obfuscation (not real protection)

The JavaScript shipped in the APK is run through
[`javascript-obfuscator`](https://github.com/javascript-obfuscator/javascript-obfuscator)
(`scripts/obfuscate-dist.mjs`, APK build only — the web and Pages builds keep readable
bundles). It renames identifiers and hides string literals so the bundle can't be read at
a glance once it's pulled out of the APK. Combined with Android R8/resource shrinking on
the native shell, this **deters casual inspection only — it is not real protection.** A
determined person can still recover the logic. No source maps ship in the APK.

Settings are deliberately moderate (no control-flow flattening or dead-code injection):
base64 string-array encoding is applied only to the off-thread Worker chunks (the match
engine and art generator), while the main-thread chunks get a plain string array, so the
frame rate is unaffected. The main thread is the index chunk plus two loaded on demand
(#400): the Guide (`guide-*.js`) and the Match Lab (`boot-*.js`); the script picks the
Workers out by name, so those two take the index chunk's settings. Measured on the grounds and in a live match (software GL, no CPU
throttle): **60 fps before and after** obfuscation; the APK's JS grows about **+22%**
(2344 → 2853 KiB uncompressed; it compresses inside the APK's zip). Since the slimmer
Phaser (#400) it is 1631 → 2056 KiB (+26%) over five chunks.
