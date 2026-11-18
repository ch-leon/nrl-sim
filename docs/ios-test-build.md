# iPhone test build

A way to put the game on Leon's own iPhone as a real app, for play-testing, with a
free Apple ID: no Apple Developer Program, no TestFlight, no App Store. It plays
exactly like the web build, with saves kept on that phone. This is Phase 1 of
[docs/specs/ios.md](specs/ios.md) (the shell); durable saves, the widget extension
and Live Activities are later phases.

The app is wrapped with [Capacitor](https://capacitorjs.com/), the same as the
[Android test build](android-test-build.md): the same Vite build the website uses,
inside a thin native shell. The web/PWA build, the GitHub Pages deploy and the Android
APK are unchanged.

> **Identity.** The app is **Big Coach**, bundle id `au.com.supercooked.bigrugbycoach.dev`
> while on the free Apple ID (§6 Q1 of the spec). The real id,
> `au.com.supercooked.bigrugbycoach`, waits for the paid account. Changing the id later
> makes a *different* app on the phone, so saves won't carry over. Both are set in the
> Xcode project (`ios/App/App.xcodeproj`, `ios/App/App/Info.plist`), not in
> `capacitor.config.ts`, whose `appId` and `appName` belong to the Android test build.

## Build it

Needs a Mac with Xcode 26 or newer (27 is on Leon's Mac) and Node 22. Cloud agents run
Linux and cannot build it; CI does not build it either.

```bash
npm ci
npm run build:ios            # Vite build (native config: base '/', no service worker, obfuscated, marked as iPhone)
npx cap sync ios             # copy the build into the Xcode project
npx cap open ios             # open ios/App/App.xcodeproj in Xcode
```

`build:ios` is `build:android` with `NRL_PLATFORM=ios` added, so analytics, the
entitlements and the store rules know they are in the iPhone app (`src/platform.ts`).
Run `npx cap sync ios` after every `build:ios`, as `npx cap sync android` follows
`build:android`. Native dependencies come through Swift Package Manager
(`ios/App/CapApp-SPM`), which Xcode fetches on the first build; there is no CocoaPods.

### In the Simulator (no phone, no Apple ID)

Pick an iPhone simulator in Xcode's toolbar and press **Run**. The Simulator needs no
signing team. To check the project compiles, without a simulator, this is the command
Phase 1 was verified with:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

**The app has not run in the Simulator yet.** On Leon's Mac, Xcode 27.2 needs a newer
CoreSimulator than is installed, so no simulator boots until someone with the admin
password runs `sudo xcodebuild -runFirstLaunch` (or opens Xcode and accepts "Install
additional components").

## Run it on Leon's iPhone (by hand)

Once:

1. In Xcode, **Settings > Accounts**: add the Apple ID.
2. On the iPhone: **Settings > Privacy & Security > Developer Mode**, switch on, restart.
3. In Xcode (`npx cap open ios`), select the **App** target, **Signing & Capabilities**,
   and pick the **Personal Team** under Team. The project leaves the team unset on
   purpose, so nobody's team id is committed.
4. Plug in the phone, pick it in the toolbar, press **Run**.
5. First run only: on the phone, **Settings > General > VPN & Device Management**,
   tap the developer profile and **Trust** it. Then open Big Coach.

Every 7 days: a free-signed install stops opening after 7 days. Plug in and press
**Run** again. Saves should survive this as long as the app is not deleted (the spec
lists this as unproven; check it on the first re-install).

Free Apple ID limits, per Apple's
[membership comparison](https://developer.apple.com/support/compare-memberships/) as
summarised in [the spec](specs/ios.md) §1: 3 devices, 3 free-signed apps per phone,
10 app ids. Do not
add Push, In-App Purchase, iCloud or any other capability in Signing & Capabilities:
they need the paid account and would stop the free team signing the app.

## Saves

Saves live **only on that phone**, in the app's web view storage, and persist across
app restarts. They are **lost if the app is deleted**. iOS may also clear web view
storage when the phone is very low on space; a native copy of every save is Phase 2 of
the spec. Saves from the website do not appear in the app.

The game saves when it is hidden (`visibilitychange` / `pagehide`, `src/core/save.ts`)
as well as at every week. That the hide events fire when iOS sends the app to the
background is **not yet checked** in the app (the spec's "Still unproven" list); if it
turns out they do not, the backstop is Capacitor's app `pause` event (`@capacitor/app`).

## What the iPhone build does differently

What the project is set up to do. Nobody has seen the app run yet (see the Simulator note
above), so the behaviour marked *not yet checked* is intended, not observed.

- **Landscape only, iPhone only.** Portrait is not in the app's supported orientations
  (`Info.plist`), so the phone never turns the game upright and the rotate card never
  shows. The project targets iPhone only (no iPad) and iOS 16.2 or newer.
- **Full screen.** No status bar (`Info.plist`, `GameViewController.swift`, and SystemBars
  `hidden: true` in `capacitor.config.ts`, which also asks iOS to dim the home bar).
  `GameViewController` asks iOS to hold back the swipe up from the bottom edge, where
  the match's bottom bar sits. *Not yet checked:* the home bar dimming and coming back
  on a touch, and a swipe at the bottom edge needing a second swipe to leave the app.
- **Safe areas.** The notch / Dynamic Island insets should reach the game as
  `env(safe-area-inset-*)`, read into `--nrl-safe-*` as on the web. *Not yet checked.*
- **No bounce.** `ios.scrollEnabled: false` in `capacitor.config.ts` turns off the web
  view's rubber-band scrolling. *Not yet checked.*
- **No service worker, no "Add to Home Screen" hint.** As on Android, the app ships its
  own build, and it is already installed (`src/fx/pwa.ts`; the hint's rule is unit-tested,
  the app itself *not yet checked*).
- **Reports itself as `ios`.** Analytics context, the entitlement platform and the
  paywall's storefront (the App Store) follow `src/platform.ts`.
- **Icon and launch screen** come from the brand (`scripts/gen-icons.mjs`): the 1024px
  icon with no alpha channel, and a launch screen in the app colour with the ball, like
  Android's splash. `tests/brand.test.ts` pins the launch colour and the app name.
- **Not commercial**, and **Developer settings is in Settings**, the same as the
  Android test build.
- **Obfuscated** the same way as the APK's JavaScript (see
  [the Android doc's note](android-test-build.md#a-note-on-obfuscation-not-real-protection)).
- **60 frames a second, expected.** The spec notes iOS web views cap drawing at 60 even
  on 120Hz phones; the sim steps at 20Hz, so that would be fine. *Not yet checked.*

## What only the phone can show

The Simulator cannot check these. They are Leon's to try on the phone:

- Sound, and that the ring/silent switch mutes it; whether other apps' music keeps playing.
- Sound coming back after a phone call.
- The real notch / Dynamic Island insets in landscape.
- The home bar dimming, and the bottom-edge swipe needing a second swipe.
- The frame rate on a 120Hz phone.
- A cold start in airplane mode.
- Saves surviving the 7-day re-install.
- Saving when the app is sent to the background (see Saves).
