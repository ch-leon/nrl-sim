# iOS app and Live Activities

An iPhone app built from the same codebase as the web game and the Android test
build, using Capacitor's iOS shell, plus Live Activities and the Dynamic Island for
the lock screen. This spec says what to build, in what order, what each step costs
and what Leon has to do by hand.

- **GitHub:** [#335](https://github.com/ch-leon/nrl-sim/issues/335) (iOS and Android apps), [#89](https://github.com/ch-leon/nrl-sim/issues/89) (app store builds with Capacitor)
- **Status:** plan only, written 18 Nov 2026. This is a documentation change. Nothing here is built, and each phase in §4 ships as its own PR. Leon answered the questions in §6 the same day; Phase 8 (the push ticker) is parked.
- **Depends on:** the SuperCOOKED UI rework ([ui-supercooked.md](ui-supercooked.md); Phase 0 is open as [#724](https://github.com/ch-leon/nrl-sim/pull/724)).
- **Checked against:** Apple, Capacitor and RevenueCat docs on 18 Nov 2026 (iOS 27, Xcode 27, Capacitor 8.6). Anything we could not confirm is marked **unproven** and listed in [Still unproven](#still-unproven).

## The short version

- **The shell is cheap.** The game is already a self-contained web build inside a Capacitor shell on Android. Adding iOS is one new folder (`ios/`), a few settings, and no new UI. It runs on Leon's iPhone with a free Apple ID.
- **A free Apple ID gets us a long way:** the app on Leon's own phone, the widget extension, and locally updated Live Activities (unproven on a free account, see §1). It does not get TestFlight, the App Store, push, or real purchases.
- **The iOS app uses SuperCOOKED automatically.** The shell shows whatever the web build is. The name, icon and splash colour come from the brand config, so they follow SuperCOOKED Phase 0 when it lands.
- **Saves are the one real risk.** The game keeps saves only in the web view's storage, which iOS is allowed to clear. They need a native copy before anyone but Leon plays on iPhone.
- **Live Activities fit the game less well than the brief assumes.** Three facts from the code:
  1. A match stops when the app is hidden. So a lock-screen ticker has nothing to show unless we change that, and keeping it moving while the phone is locked needs push, which needs the paid account and a small server.
  2. Nothing in the game runs on real time. The season moves when you tap Advance, fixtures have a round number and no date, and there is no transfer window. A real-time countdown would have to invent a wait timer, which the brief rules out.
  3. Training points are spent automatically today. "Points ready to spend" only exists once SuperCOOKED's manual spending ships.
- **The plan (agreed 18 Nov 2026):** build the match ticker as the Live Activity, updated by the app itself, and build the countdowns and "points to spend" as Lock Screen widgets that count in game rounds. Same Swift extension, no push, no paid account. See §3. A ticker that moves while the phone is locked is parked.

## 1. The iOS shell

### What gets added

- `@capacitor/ios` and an `ios/` folder (an Xcode project), committed like `android/`. Native dependencies use Swift Package Manager, Capacitor 8's default (per its command-line tool; confirm when it is run) and the route RevenueCat is moving to.
- A `build:ios` script: the same native web build as `build:android` (`NRL_NATIVE=1`, no service worker, JavaScript scrambled the same way), then `npx cap sync ios`.
- Settings in the Xcode project: landscape only, iPhone only, status bar hidden, home indicator dimmed (§2).
- An honest platform flag. Today any native build reports itself as `android`, and several places assume web or Android (§2, "Platform").

No game code changes for layout: the game already draws edge to edge and reads the notch insets (§2).

### Free Apple ID vs paid account

| | Free Apple ID ("Personal Team") | Paid Apple Developer Program (US$99 a year) |
| --- | --- | --- |
| Run on Leon's iPhone from Xcode | Yes | Yes |
| How long an install lasts | **7 days**, then press Run in Xcode again. Saves stay on the phone as long as the app is not deleted (unproven, check in Phase 1). | Much longer (about a year; not confirmed from Apple's pages) |
| Limits | 3 devices, 3 free-signed apps per phone, 10 app ids (the app and the widget extension use 2) | None that matter here |
| Other people can install it | No | Yes: TestFlight (builds last 90 days, up to 10,000 testers) |
| App Store | No | Yes |
| Widget extension and shared data between app and widget (App Groups) | Yes | Yes |
| Live Activity started and updated by the app itself | Should work, **unproven**: it needs no paid capability, but Apple does not say either way. The iOS Simulator is the fallback. | Yes |
| Live Activity updated by push while the app is closed | **No.** Push is a paid capability. | Yes, plus a server to send the pushes |
| Purchases | Fake purchases only: RevenueCat's Test Store, in debug builds (unproven on a phone; the Simulator otherwise) | Real sandbox and live purchases, after the App Store Connect paperwork (§2) |
| iCloud, Game Center, Sign in with Apple | No | Yes |

Use a separate app id while on the free account,
`au.com.supercooked.bigrugbycoach.dev`, and keep the real id
(`au.com.supercooked.bigrugbycoach`, decided 4 Nov 2026 in `docs/hub/marketing.md`)
for the paid account. Changing the id later makes a new app, so saves do not carry
over, the same as the Android test build today.

### What Leon does by hand (Phase 1)

1. Install Xcode 26 or newer from the Mac App Store (Xcode 27 is needed for uploads from April 2027). Sign in with the Apple ID under Xcode > Settings > Accounts.
2. On the iPhone: Settings > Privacy & Security > Developer Mode, switch on, restart.
3. Open the project (`npx cap open ios`), pick the Personal Team under Signing & Capabilities for the app target (and later the widget target), plug in the phone, press Run.
4. First run only: on the phone, trust the developer profile under Settings > General > VPN & Device Management.
5. Every 7 days: plug in and press Run again.

Cloud agents run Linux and cannot build an iOS app. Native iOS PRs have to be built
and checked in the Simulator by an agent on Leon's Mac, and anything that needs a real
phone (sound, the notch, Live Activities on the lock screen) is Leon's check.

## 2. iOS concerns

"Today" is what the code does now.

| Area | Today | On iPhone | What we do |
| --- | --- | --- | --- |
| **Landscape** | A rotate card blocks portrait on phones (`src/ui/orientation.ts`); Android is locked in its manifest. | A web page cannot lock rotation on iOS; the app can. | Remove Portrait from the app's supported orientations. The rotate card then never shows. Ship iPhone only (the template includes iPad; §6 Q6). |
| **Notch, Dynamic Island, home bar** | `viewport-fit=cover`, and nearly all UI reads `--nrl-safe-t/r/b/l` (`src/ui/dom.ts`). Android needs a Capacitor setting for this. | iOS supplies the insets itself; the Android setting does nothing there. In landscape expect insets on one or both sides and a strip at the bottom for the home bar. Exact numbers: measure on the phone. | Nothing new in principle. Check every SuperCOOKED phase in the Simulator on a Dynamic Island phone: its mockups are full-bleed 844x390 and the spec does not mention safe areas. Switch the few places that read the insets directly (`expansionIntro.ts`) to the shared variables. |
| **Home bar and edge swipes** | Not relevant on Android (bars hidden). | The home bar sits over the bottom of the screen, where the match's bottom bar is, and a swipe up leaves the app. | In the app's native screen code: ask iOS to dim the home bar and to hold back the swipe-up at the bottom edge. Small Swift change. |
| **Web view quirks** | Already handled for Safari: no text selection or long-press callout, no pinch zoom, inputs at 16px, touch targets 44px. | Same engine, so these carry over. Two differences: the page can rubber-band (turn scrolling off in the Capacitor config), and drawing is capped at 60 frames a second even on 120Hz phones (fine: the sim steps at 20Hz). | Config change plus a test pass. Do not show the "Add to Home Screen" hint in the app. |
| **Leaving and coming back** | Phaser pauses when the page is hidden; the game saves on hide; a match in progress resumes from its record. | iOS suspends the app within seconds of leaving. JavaScript stops. On return the game canvas can come back blank. | Confirm the save-on-hide fires in the app (add Capacitor's app-pause event as a backstop). Test a long absence and make sure the game redraws or reloads cleanly. |
| **Saves** | `localStorage` only, about 140 KB at last measure. Export and import use a browser download and a file picker. | iOS may clear web view storage when the phone is low on space; Capacitor's own docs call it "transient". The browser-download export is not expected to work in the app (untested). Saves from the web game do not appear in the app. | Keep `localStorage` as the working copy and mirror every save to a native file (Capacitor Filesystem), restoring from the file at launch if the web copy is gone. The storage layer from [commercial-saves.md](commercial-saves.md) was built to take this. Export through the iOS share sheet. Moving a web save into the app is export then import until cloud saves exist. |
| **Audio** | All sound is synthesised with WebAudio, unlocked on first touch, and already recovers from Safari's "interrupted" state. | The ring/silent switch mutes the game by default; other apps' music should keep playing (unproven in the app, check in Phase 1). That is normal for a game. One known WebKit bug can leave a web view silent after a phone call. | Keep the default (§6 Q8). Test with a real incoming call; if sound does not come back, rebuild the audio context on return. |
| **Offline and fonts** | Fonts are bundled (`@fontsource`), no CDN. The only network call is analytics, loaded late and off without a key. | Everything ships inside the app. SuperCOOKED's fonts are also bundled. | Nothing to build. Check airplane mode from a cold start, and check there is no flash of fallback font on the first screen. |
| **Platform** | Native builds report `android` to analytics, the analytics validator rejects `ios`, `PLATFORM` is hard-coded to `web`, and the storefront helper always answers `ios`. | These would all be wrong or accidentally right. | One source of truth for web, android or ios, used by analytics, entitlements and store rules. |
| **Purchases (RevenueCat)** | No SDK installed. `src/commercial/revenuecat.ts` is a placeholder with the right shape; the paywall is off in every shipped build. The product is a one-off unlock ([commercial-entitlements.md](commercial-entitlements.md)). | One RevenueCat project ("Big Coach") serves both stores: add an App Store app to it and it issues an iOS key. | Install `@revenuecat/purchases-capacitor` and wire it into that placeholder. On the free account, test with RevenueCat's Test Store in the Simulator (debug builds only: its key crashes release builds by design, never ship it). Do not switch on Xcode's In-App Purchase capability until the paid account: it is paid-only and would likely break free signing. With the paid account: App Store Connect app record, the Paid Apps agreement with tax and banking, the unlock product, and an in-app purchase key uploaded to RevenueCat. App Review requires a way to restore purchases and a privacy policy link ([#455](https://github.com/ch-leon/nrl-sim/issues/455)), and in Australia no link to buying elsewhere, which `storeRules.ts` already encodes. |
| **Icon and splash** | The icon is drawn in code (`src/art/appIcon.ts`) and written by `scripts/gen-icons.mjs` for web and Android. The Android splash is the app colour with the ball. | iOS wants one 1024x1024 icon with no transparency, and a launch screen. | Extend the icon script to write the iOS icon. Launch screen: app colour plus the ball, matching Android. Pin its colour to the brand in `tests/brand.test.ts`, as the Capacitor colour already is, so SuperCOOKED's colour change carries through. |

**SuperCOOKED.** The iOS app has no UI of its own, so it shows SuperCOOKED as each
phase lands. Three things to hold to: every new screen keeps using the safe-area
variables; the app name, icon and launch colour come from the brand config; and the
lock-screen designs in §3 use SuperCOOKED's colours and fonts (the fonts must be
copied into the widget extension, and its colours pinned to the tokens by a test).
No build goes to other people until SuperCOOKED Phases 0 to 5 have landed (§6 Q10).

## 3. Live Activities and the Dynamic Island

### Apple's limits, plainly

- A Live Activity is a small SwiftUI view on the lock screen and, on phones that have one (iPhone 14 Pro, and most iPhones since the 15), in the Dynamic Island. It is written in Swift in a **widget extension**, a second small program inside the app. It cannot run our JavaScript, load from the network, or draw with Phaser.
- **It is not a live video of the match.** It only changes when it receives an update. Each change animates for at most 2 seconds, using Apple's built-in transitions (fade, slide, rolling numbers). There is no looping or continuous animation, and none at all on the always-on display.
- **Two things tick without updates:** a countdown or elapsed-time text, and a progress bar tied to a time range.
- **Updates come from one of two places:**

  | | Local updates | Push updates |
  | --- | --- | --- |
  | Who sends | The app, through a small Capacitor plugin | A server, through Apple's push service |
  | Works when | The app is on screen, plus a few seconds after leaving | Any time, app closed or phone locked |
  | Needs | Nothing paid | Paid account, a push key, a server that knows what to send and when |
  | Limits | iOS suspends the app, and its JavaScript, seconds after you leave | Apple budgets frequent high-priority updates per hour (number not published); a one-line setting raises it |

- A sequence of future states cannot be queued in advance. We checked: only the ticking text and bar, an "out of date" time, and (iOS 26+) a scheduled start exist.
- It must be started while the app is open (or by push). It lasts up to 8 hours active and 12 on the lock screen. All its data must fit in 4 KB. The player can switch Live Activities off per app, and we must cope silently.
- An update can ask to "alert": light the screen, play a sound, and briefly expand the island. Apple says to use this sparingly.

### (a) Live match ticker

**What it shows.** Lock screen: both clubs, the score, the half and minute, and one
line for the last big moment ("TRY, Walker, 2nd half 1'"). Dynamic Island: the captain
icon on the left and the score on the right; the expanded view matches the lock
screen. Tapping any of them opens the app at the match, which already resumes from
its saved record.

**Where updates come from.** The game already announces what we need on its event
bus: match started, tries, conversions, penalty and field goals, big hits, half-time
and full-time. The minute comes with each event; the score is totalled from them, as
the match overlay already does. The plugin listens and forwards the few that matter. The minute is shown as of the last update, not as a running clock,
because the match clock stops and starts and playback speed varies.

**The catch.** Today the match pauses the moment you leave the app, and the island
and lock screen only show while you are out of the app. So:

- **Local version (free account).** While you are away the activity shows the frozen
  score and minute with "Paused, tap to return", and after full-time it shows the
  result for 15 minutes. This is honest but modest. Its real job is to prove the
  extension, the bridge and the designs. *As built (Phase 3, 18 Nov 2026):* no timed
  end, per §6's "nothing timed". Full time stays on the activity until you leave the
  match, and leaving (Back to club, Save & exit) ends it at once.
- **Push version (paid account).** For the score to move while the phone is locked,
  the match has to keep going without you. The sim is deterministic and can already
  play a match to the end off screen in one go (it does this for Skip). So on leaving,
  the app would finish the match on auto-coach, hand the remaining timeline to a small
  server, and the server would push each moment at the right time. A match is two 2:30
  halves and runs a few minutes of real time (not yet measured), so this is a short
  burst of perhaps 10 to 20 updates. It is a product change, not just plumbing:
  leaving the app would mean handing the match to the assistant coach. **Parked** by
  Leon on 18 Nov 2026 (§6 Q2). If he reopens it, it gets its own spec first.

### (b) Countdowns to natural events

The brief's examples are next kickoff, the transfer window closing, and an injured
star returning, with no artificial wait timers. Against the game as it is:

| Event | In the game today |
| --- | --- |
| Next kickoff | The next fixture is known (round, opponent, home or away). It has no date or time. |
| Transfer window closing | Does not exist. There is no window in the recruit system. Dropped (§6 Q4). |
| Injured star returning | Exists as a count of weeks out per player. |

None of these is tied to the real clock, so a real-time countdown would be a wait
timer by another name. What fits is a count in **game rounds** that only changes when
you play: "Round 7 v Broncos, away", "Walker back in 2 rounds". That is not a Live
Activity (those are for something happening now, for hours at most). It is a
**Lock Screen and Home Screen widget**, which lives in the same extension, reads a
small snapshot the app writes whenever the week advances, needs no push and no paid
account, and never goes out of date while the app is closed. The trade-off: the
player has to add a widget themselves; a Live Activity appears on its own.

Real-clock countdowns are parked (§6). For the record, if Leon reopens them a
countdown Live Activity is cheap: one local start, and the timer text ticks by itself
with no updates, for up to 8 hours.

### (c) Training points ready to spend

Points are spent automatically today. SuperCOOKED's manual spending
([ui-supercooked.md](ui-supercooked.md) §7 #1, decided, not yet shipped) creates
banked points, and this item waits for it. Points only change when you advance a
week, which happens in the app, so there is never news to deliver while you are away.
The fit is the same widget as (b): "3 points to spend", tapping through to the squad.

### The captain icon

- **Art.** The match sprites are drawn in code as plain pixel buffers, so a build script can export still poses as PNGs without a browser: carrying the ball (default), diving (try), wrapped up (tackle), arms up (full-time). The sprite is 44x42 art pixels; at two screen pixels each it is about 28 points tall, which is what the island's small slots allow.
- **Changing pose.** Each update names a pose; iOS cross-fades or slides to the new image. No run cycle, no frame animation. A pose stays until the next update, so "try" holds until the next event arrives.
- **Which captain.** First version: a generic player in brand colours, images built into the extension. Later: the app draws the save's real captain in the club's kit and passes the images to the extension through the shared container (unproven for Live Activity images, check in Phase 4).
- **Tight spaces.** On reduced-width layouts (the phone in landscape, the folding iPhone, two activities on an iPhone 18 Pro) we get a 28-point circle: icon only, no score.
- **Alerts.** Only full-time alerts (lights the screen). Tries update silently (§6 Q9).

### The bridge

Write our own small Capacitor plugin in Swift inside `ios/` (start, update, end, and
"write the widget snapshot"), plus the widget extension. The plugin sets the "Paused"
state natively when the app goes to the background, not from JavaScript, which may
already have stopped. Two open-source plugins exist
(`@capgo/capacitor-live-activities`, which draws layouts from JSON, and
`capacitor-live-activity`, where you still write the SwiftUI yourself). Both are young,
and we need custom pixel-art views either way, so a dependency buys little. The web
and Android builds get a no-op.

## 4. Build order

One PR per phase. Phases 1 to 5 need only the free Apple ID. Phase 8 is parked (§6 Q2):
do not start it until Leon reopens it.

| # | PR | Needs | Leon by hand | Done when |
| --- | --- | --- | --- | --- |
| 0 | This spec | | Answered §6 on 18 Nov 2026 | Merged |
| 1 | **iOS shell.** `@capacitor/ios`, `ios/`, `build:ios`, landscape and iPhone only, status and home bar, dev app id, icon and launch screen, the platform flag, `docs/ios-test-build.md` | Free | The five steps in §1 | The game runs full screen in landscape on Leon's iPhone from a cold start in airplane mode, with sound, and a career survives closing the app |
| 2 | **Durable saves.** Native file mirror with restore at launch; export through the share sheet; import checked. *As built (18 Nov 2026): it goes further than restoring a missing save. An explicit key list is mirrored (not the playtest career or the corrupt copy). A delete leaves a marker so it cannot come back. At launch a native copy older than the web view's is rewritten. Import is unchanged and not yet checked in the app ([commercial-saves.md](commercial-saves.md), [ios-test-build.md](../ios-test-build.md#saves-on-iphone)).* | Free | Play, delete nothing, confirm a save survives | A save comes back after web view storage is cleared; export and import work on the phone |
| 3 | **Widget extension and bridge, with the local match ticker.** Extension target, shared data group, the plugin, lock screen and island layouts with a static ball icon | Free (unproven on device; Simulator otherwise) | Pick the team for the new target; leave a match mid-game and look at the lock screen | Start a match, leave the app: the score and "Paused" show; tap returns to the match; full-time shows the result, then clears when you leave the match (not after 15 minutes: built 18 Nov 2026 with no timed end) |
| 4 | **Captain poses.** Export script, pose per event, tight-space layout | Free | Look at it during a match | Try, tackle and full-time each change the icon |
| 5 | **Club widgets.** Next fixture and injured star back, in rounds; points to spend once SuperCOOKED manual spending has shipped | Free | Add the widget to the lock screen | The widget is right after advancing a week and after a week away (built 18 Nov 2026: one widget kind, lock screen rectangular and inline, home screen small and medium; points show only while Settings' "spend points myself" is on, the switch that shipped; a round is one week's advance, trials and rest weeks included) |
| 6 | **Paid account switch.** Real app id, TestFlight upload steps in the test-build doc, Apple's privacy declarations file, the encryption question answered once in the project | **Paid** | Enrol (US$99) once Phase 3 works on the phone, create the app in App Store Connect, archive and upload from Xcode | A TestFlight build installs on a second phone |
| 7 | **Purchases.** RevenueCat SDK behind the existing placeholder, Restore button. The code can start earlier against the Test Store in the Simulator. | **Paid** for real purchases | Agreements, tax and banking; create the unlock product; add the purchase key to RevenueCat | A sandbox purchase unlocks the full game and survives reinstall through Restore |
| 8 | **Push ticker. Parked.** Own spec first: play-on while away, the server, the push key | **Paid**, a server | Reopen Q2; create the push key | Lock the phone at kickoff; the score moves on the lock screen and ends at full-time |
| 9 | **App Store submission.** Screenshots (landscape; one iPhone size, plus the folding iPhone if submitted from April 2027), privacy answers, age rating, review | **Paid** | Fill in the listing, submit | Approved |

Phases 2 and 3 are independent and can swap. Bugs Leon finds on the phone are batched
into one fix-up PR per phase, as usual.

No CI change is planned at first. The WebKit shards already test the game in Safari's
engine on every PR, and the iOS build happens on Leon's Mac. A macOS build check can
come later: free while the repo is public, about ten times the Linux price per minute
once it is private.

## 5. What it costs to keep

**Every release to iPhone** (about 20 to 30 minutes of Leon's time until it is automated):
build, `cap sync`, bump the build number, archive and upload in Xcode, then TestFlight.
For the App Store add review, usually a day or two, longer the first time. A web fix
reaches iPhone players only through a new build and review.

**Every week on the free account:** plug in and press Run.

**Every year:**
- US$99, and re-accepting Apple's agreements when they change.
- Apple's April deadline to build with the newest Xcode (the iOS 27 SDK from April 2027), which can mean a macOS update on Leon's Mac.
- A Capacitor major upgrade (Capacitor 9 raises the minimum to iOS 16).
- Signing certificates renew; TestFlight builds expire after 90 days.
- New devices: the folding iPhone needs its own screenshots from April 2027.

**When the game changes:**
- The Swift views are a second, small UI. A brand colour or font change, or a new kind of match event, means touching them too. The tests that pin colours keep this from drifting silently.
- New screenshots when the look changes.
- Privacy answers and the privacy declarations file when an SDK is added or updated.

**If the push ticker ships:** a small server and a push key to keep alive and watch.
The cost is close to nothing at this scale, but it is a running service.

## 6. Questions for Leon

Answered by Leon on 18 Nov 2026 (on the PR that added this spec).

| # | Question | Phase | Decided |
| --- | --- | --- | --- |
| 1 | App id and name for iPhone? | 1 | **Decided:** `au.com.supercooked.bigrugbycoach` and "Big Coach", with a `.dev` id while on the free account |
| 2 | Should a match keep playing on auto-coach when you lock the phone, so the ticker has something to show? | 8 | **Parked.** Leon does not mind the idea but it needs more thought. Phase 8 waits until he reopens it. |
| 3 | Countdowns and "points to spend" as Lock Screen widgets counting game rounds, not Live Activities on real time? | 5 | **Decided:** yes, widgets |
| 4 | There is no transfer window in the game. Drop that countdown? | 5 | **Decided:** dropped |
| 5 | When to pay the US$99? | 6 | **Decided:** after Phase 3 works on Leon's phone |
| 6 | iPhone only, or iPad as well? | 1 | **Decided:** iPhone only |
| 7 | Minimum iOS 16.2 (needed for Live Activities; iPhone 8 and newer)? | 1 | **Decided:** yes |
| 8 | Game sound follows the ring/silent switch, and other apps' music keeps playing? | 1 | **Decided:** yes (the music part is still to prove on the phone) |
| 9 | Should a try light up the lock screen, or only full-time? | 3 | **Decided:** only full-time |
| 10 | Which SuperCOOKED phases must land before a build goes to anyone else? | 6 | **Decided:** Phases 0 to 5 |
| 11 | Captain icon: generic player in brand colours first, the real captain in club kit later? | 4 | **Decided:** yes |

**Parked for now:** anything timed or built on a real-time wait. That covers real-clock
countdowns, wait timers, and the match continuing while you are away. Do not build
these until Leon reopens them.

## Still unproven

Each of these gets checked in the phase named, before the rest of that phase is built.

- A Live Activity running on a phone signed with a free Apple ID (Phase 3). Fallback: the Simulator until the paid account.
- Saves surviving the 7-day re-install on the free account (Phase 1).
- Exact safe-area sizes in landscape on Dynamic Island phones (Phase 1, measure).
- Whether the game's save-on-hide fires reliably when iOS backgrounds the app (Phase 1).
- Whether sound returns after a phone call, and whether other apps' music keeps playing under the game (Phase 1).
- That Capacitor's tool sets the project up with Swift Package Manager by default (Phase 1).
- Export and import inside the app's web view (Phase 2). *18 Nov 2026: export now uses the share sheet; both compiled, neither run yet.*
- Live Activity images supplied through the shared container, for the real captain (Phase 4).
- Whether RevenueCat's Test Store or Xcode's local purchase testing runs on a free-signed phone, not just the Simulator (Phase 7 prep).
- How long a match runs in real time at each speed, how many updates Apple's push budget allows in that window, and whether finishing the match and uploading its timeline fits in the few seconds iOS allows after you leave (Phase 8 spec).

## Sources

- Apple: [membership comparison](https://developer.apple.com/support/compare-memberships/), [capabilities by membership](https://developer.apple.com/help/account/reference/supported-capabilities-ios), [Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities), [Live Activity push](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications), [animation limits](https://developer.apple.com/documentation/widgetkit/animating-data-updates-in-widgets-and-live-activities), [design guidance and sizes](https://developer.apple.com/design/human-interface-guidelines/live-activities), [background time](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time), [upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [screenshot sizes](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [review guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Capacitor: [iOS](https://capacitorjs.com/docs/ios), [storage guide](https://capacitorjs.com/docs/guides/storage), [System Bars](https://capacitorjs.com/docs/apis/system-bars), [config](https://capacitorjs.com/docs/config), [privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest)
- RevenueCat: [Capacitor install](https://www.revenuecat.com/docs/getting-started/installation/capacitor), [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store), [App Store sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store)
- WebKit: [120Hz in web views](https://bugs.webkit.org/show_bug.cgi?id=294338), [silent audio after a call](https://bugs.webkit.org/show_bug.cgi?id=243727), [storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- GitHub: [Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)
