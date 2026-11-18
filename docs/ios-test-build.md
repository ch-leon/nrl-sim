# iPhone test build

A way to put the game on Leon's own iPhone as a real app, for play-testing, with a
free Apple ID: no Apple Developer Program, no TestFlight, no App Store. It plays
exactly like the web build, with saves kept on that phone. This is Phase 1 of
[docs/specs/ios.md](specs/ios.md) (the shell) and Phase 3 (the widget extension and the
match on the lock screen, [below](#lock-screen-and-dynamic-island)); durable saves and
the club widgets are later phases.

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

## Lock screen and Dynamic Island

Phase 3 of the spec: a match you are playing shows as a **Live Activity** on the lock
screen and, on phones that have one, in the Dynamic Island.

**What it shows.** Both clubs' codes with yours starred (as the match's score bug does),
the score, the half and the match minute *as of the last update* ("2nd half 4'"), one
line for the last big moment ("TRY, Walker (BRI) 3'"), and a state: LIVE, PAUSED · TAP
TO RETURN, HALF-TIME (GOLDEN POINT NEXT before a drawn final's golden point) or FULL
TIME. The island's compact form is a ball on the left (the
captain's poses come in Phase 4) and the score on the right; the expanded form matches
the lock screen; the minimal form is the ball. Colours are the SuperCOOKED tokens; text is
the system font for now (the brand fonts ship as woff2, which a widget extension cannot load).

**When it changes.** It starts at kick-off of a match you are in, and updates on tries,
conversions, penalty goals, field goals, big hits, sin bins, half-time, the second half's
kick-off, the break before golden point and its kick-off, and full time. Nothing on it
ticks by itself. Skip to full time
sends one update, the final score. Only full time lights the screen (an alert); every
other update is silent. When the app goes to the background the match stops, so the
activity should say PAUSED until you come back. Tapping it opens the app (the
`bigcoach://` link), which is expected to resume the match where it was, as any return to
the app does. None of this has been seen on a phone or in the Simulator yet. Full time stays on it until you leave the
match; Back to club, Save & exit, or any other way out of the match ends it at once. An
activity left over from a run that was killed is ended at the next launch. With Live
Activities switched off for the app (Settings > Big Coach > Live Activities), nothing
shows and the game plays as before.

**Where it lives.** The extension is the `BigCoachWidgets` target
(`ios/App/BigCoachWidgets/`, bundle id `au.com.supercooked.bigrugbycoach.dev.widgets`,
embedded in the app). The app's side is the `LiveMatch` plugin
(`ios/App/App/LiveActivity/LiveMatchPlugin.swift`), driven from the game by
`src/native/liveMatch.ts` (iPhone build only). The shape both share is
`ios/App/Shared/MatchActivityAttributes.swift`. Both targets are in the App Group
`group.au.com.supercooked.bigrugbycoach.dev`, which the club widgets use (see Widgets).
The three folders are synchronised with the disk: a Swift file or an asset catalogue
dropped into one is in its target at the next build, with no project edit. The target
was added by `scripts/ios/add-widget-target.rb`. `BrandColors.swift` is generated from
`src/ui/tokens.ts` by `npx vite-node scripts/gen-ios-colors.mjs` (`build:ios` runs it; a
test fails while it is out of date).

**Signing (once, by hand).** The new target has no team, like the app. In Xcode, select
the **BigCoachWidgets** target, **Signing & Capabilities**, and pick the same **Personal
Team** as the App target. Both targets carry the App Groups capability; if Xcode asks to
register the group for the Personal Team, let it. Do not add Push Notifications.

**Try it.**

1. `npm run build:ios && npx cap sync ios`, then Run from Xcode (phone or Simulator).
2. Start a match. Score a try or wait for one.
3. Lock the phone, or swipe home: the lock screen (and the island) show the score,
   the minute and PAUSED · TAP TO RETURN.
4. Tap it: the app should open on the match, which should play on; go away again at
   half-time and it should say HALF-TIME.
5. Play or Skip to full time: the screen lights once, FULL TIME with the result.
6. Back to club (or Save & exit mid-match): the activity is gone.
7. Settings > Big Coach > Live Activities off, play a match: nothing shows, nothing breaks.

**Unproven on a free Apple ID.** Apple does not say whether a free-signed app may show
Live Activities (the spec's "Still unproven"). Nothing paid is used: no push, no
frequent-updates key, no stale date, no timed dismissal. If the phone refuses, the
game carries on without it, and the Simulator is the fallback until the paid account.

## Widgets

Phase 5 of the spec: a **Big Coach** widget for the lock screen and the home screen.

**What it shows.** Your next match as the game words it ("Round 7 v Brisbane · away",
"Pre-season trial 1", "Semi final", a League career's "Week 5 · League · round 3"), or
what the game says when there is none ("No more matches this season"). The best player
you have out injured and how many rounds until he is back ("Walker back in 2 rounds"),
when someone is. The level points banked across the squad ("3 points to spend"), when
there are any; points only bank while Settings has you spending them yourself. The home
screen sizes add your club's name, his stars and how many others are out, and the
week and season. Before the game has written anything (a fresh install, or no App
Group) it says "Open Big Coach to pick up your season". Tapping it opens the game
(`bigcoach://club`), where you left it.

**Counts are in game rounds, and only change when you play.** The widget shows the
snapshot the game last wrote and nothing else: no dates, no times, nothing that counts
down by itself. The game writes a new one when a career loads or starts, the week
advances, a match is committed, points are spent, or an injury comes or goes, and only
when something on the widget changed. A round is one week's advance (a pre-season trial
or a rest week counts as one), the same weeks the game's own "out 3 wk" counts; the
injury count uses the club's medical bay and physio centre as they are today. If you
build one mid-injury, the count drops faster from the next advance.

**Sizes.** Lock screen: rectangular (the match, the injury, the points) and inline (the
match, short: "R7 v Brisbane · away"); these take the lock screen's own tint. Home
screen: small and medium, on the SuperCOOKED ink with the accent on the match's stage.

**Add it.** Lock screen: touch and hold the lock screen, **Customise**, **Lock Screen**,
tap the widget area under the clock (or the line above it for inline), pick **Big
Coach**. Home screen: touch and hold an empty spot, **+** (or **Edit**, **Add Widget**),
search **Big Coach**, pick small or medium, **Add Widget**. Open the game once first so
there is a snapshot to show.

**Where it lives.** `ios/App/BigCoachWidgets/ClubWidget.swift` (kind `BigCoachClub`) in
the same extension as the Live Activity. The app's side is the `ClubWidgets` plugin
(`ios/App/App/LiveActivity/ClubWidgetsPlugin.swift`, method `writeSnapshot`), which
stores the JSON in the App Group's defaults (key `clubSnapshot`) and asks WidgetKit to
reload. The game side is `src/native/clubSnapshot.ts` (the snapshot) and
`src/native/clubWidgets.ts` (when to write it), iPhone build only. The shape both share
is `ios/App/Shared/ClubSnapshot.swift`.

**Try it.**

1. `npm run build:ios && npx cap sync ios`, then Run from Xcode.
2. Open a career. Add the widget to the lock screen and the home screen.
3. Check it against the club: the next match's round, opponent and home or away.
4. Advance a week: the widget moves on to the next match. An injured man's rounds
   drop by one (or more with a medical bay).
5. Turn on spending points yourself (Settings), advance until someone levels up: "N
   points to spend" shows; spend them all and the line goes.
6. Close the app for a while (or a day): the widget has not changed.

**Unproven on a free Apple ID.** The widget needs the App Group shared between the app
and the extension. Free accounts can use App Groups, but whether Xcode registers this
one for a Personal Team, and the extension can read what the app wrote, is unproven on
the phone. If it cannot, the widget only ever shows "Open Big Coach to pick up your
season" and the game is unaffected.

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
- The Live Activity on a free-signed phone at all, and on the lock screen and the
  Dynamic Island (see Lock screen and Dynamic Island).
- The club widget reading the App Group on a free-signed phone, how it looks in each
  size, and that it updates after a week's advance (see Widgets).
