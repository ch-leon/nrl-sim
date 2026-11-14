# Developer settings (#519)

Labs is now **Developer settings**. Leon uses it to try a merged feature straight
away without advancing or damaging his normal career. It is browser-local and is
never part of a save.

## Finding it

It is in Settings on every current build: GitHub Pages, the Android test APK and
local dev. The build switch is `VITE_DEV_SETTINGS`, on unless it is `0` (`false`,
`off` and `no` count as off too). **Before launch, set `VITE_DEV_SETTINGS=0` or
remove Developer settings.** The switch is not saved on the browser, so turning
it off hides the entry again for anyone who never opened `?labs=1`.

`?labs=1` still shows it, including when the switch is off, and that visit is
remembered on this browser. It also shows while a playtest career is on, because
the way back lives here. With the switch off, that is the only way in, as before.

It sits in Settings, which has a **Developer settings** button (class
`nrl-labs-open`, kept from Labs). Finding the page is not security. Nothing on
it unlocks paid content, entitlements or payments, and it is no game-state
editor. Showing the entry does not change a career: every override and
experiment stays off until it is switched on.

Everything is kept in the existing `nrl-sim-labs` key. Old values read as before,
and the newer fields (`overrides`, `testCareer`) are optional. A bad value in one
of them drops only that field, never the rest.

## The page

| Part | What it does | When it applies |
| --- | --- | --- |
| **Screens → Open every Office screen** | Staff & Board, Contracts and Finance show as open on the Office tiles and the Playbook's Staff link. It is UI-only (`src/labs/screenOverride.ts`): `GameState.unlocks` is never written, so turning it off locks them again, and the real openings (round 4, round 12, first home game) still land on time. Anything hired, signed or bought while it is on stays in the career, and the page says so. | Straight away, on this browser |
| **Screens → Render at the old resolution** | The canvas is drawn in CSS pixels as it was before #627 (`src/world/density.ts` reads the override): the match zooms back to ×2 and a phone shows fewer players. It exists to compare frame rate on a real phone against device-density rendering. Nothing is saved. | After a reload, on this browser |
| **Playtest career** | Set up playtest career, or Return to my career (below). | Refused during a live, parked or resumable match, on the Match scene, and during Advance Until |
| **Experiments → Match controls** | Unchanged from Labs. Off by default. | The next match |
| **Reset all** (class `nrl-labs-off`) | Turns the experiments and overrides off. The hints already seen stay. It hides the page only when `VITE_DEV_SETTINGS` is off; while the switch is on, the entry stays in Settings with everything off. In a playtest career it first leaves the way Return does; any playtest keys left behind are cleared. | Mid-match in a playtest career it is refused and changes nothing |

Every control is at least 44px tall and every section is labelled. The page scrolls
inside its frame at phone landscape (844×390, 667×375 and 568×320).

## The playtest career

- **Isolation.** Its whole career (slots, meta, live-match record and device id)
  lives under `nrl-sim-devtest:` (`DEV_TEST_PREFIX`). At boot, `main.ts` puts
  `save.ts` and the live-match record into that namespace before any save is read
  (`core/storage/local.ts` `inCareerNamespace`). A normal slot key never sees a
  test write.
- **Setting up** (`enterTestCareer`):
  1. The career being played is saved only if it has an unsaved change: the same
     save Save & quit makes (`saveIfChanged`). An unchanged career is not written
     at all.
  2. Any save meta (and a first device id) still queued is written straight away
     (`flushSaveMeta`), so nothing lands on a normal key after the copy. Every
     normal career key is then copied byte for byte into `nrl-sim-devtest-backup`.
  3. This page stops saving (`lockSaves`), so the reload's `pagehide` can't write.
  4. The marker is set and the page reloads.
  If the backup or the marker doesn't land, nothing switches.
- **The preset** is built through the game's own routes on a new club, `Playtest
  XIII` (seed 519, Normal): the tutorial is marked done and the match speed is set
  to ×1, then `hireAttackCoach('direct')`, `buyPlay('block-play')` (the $200k
  starting bank covers the $8k) and `togglePlay` on the lineup. Nothing else is
  edited. There is no money top-up, no stat edit, and no set-play gate is added or
  removed (`PLAYS.on` stays the harness switch). The first Play Week is a trial
  match, watched at ×1, where Block play can be called from the coach tray. The
  usual hire, buy and select routes still work in both careers.
- **Reload** stays in the playtest career with its progress. Only Return or Reset
  all switch careers. If its save is lost (site data cleared), it is built again.
- **Return** (`returnToNormalCareer`):
  1. This page stops saving, and the playtest's own queued meta is written before
     its keys are cleared.
  2. Every normal key is checked against the backup. Any key that differs (for
     example, another tab wrote to it) is put back byte for byte, and what was
     found is kept under `nrl-sim-devtest-displaced`.
  3. The playtest keys and the backup are removed, and the page reloads to the
     title.
- **Not undone:** anything real bought in the playtest career stays there and is
  thrown away with it. Nothing reaches the normal career.
- **Commercial:** a playtest boot skips the title and does not record the first
  commercial run, so it can't grandfather or un-grandfather a real career. The
  demo gate applies to it as it does to any career.
- The save format is unchanged (`SAVE_VERSION` 23).

## Marker contract (analytics and anything else that must leave testing out)

- Analytics stays off when `?labs=1` is in the URL, or when a developer
  override, experiment, short field or playtest career is actually on
  (`labsBlocksAnalytics` in `src/labs/flags.ts`, read by `src/analytics/index.ts`,
  reason `labs`). A playtest career counts even after the page is hidden.
  Seeing Developer settings because the build switch is on does not turn
  analytics off, and a normal career still sends. When `VITE_DEV_SETTINGS=0`,
  the old rule is back: analytics stays off whenever `labsVisible()` is true,
  including a browser that only opened `?labs=1` and turned nothing on. If that
  rule ever changes to classify instead of drop, use the marker below.
- JavaScript error tracking (#548) uses the same off-switches, including test
  careers. DNT/GPC are also checked before SDK loading, because the SDK can
  otherwise send in cookieless-always mode despite `respect_dnt: true`. Guarded window error/rejection listeners keep at most ten sanitized
  exceptions in memory until post-title SDK startup (ten distinct errors/minute,
  deduped across both listeners). A boot that never reaches startup cannot flush;
  module-load failures before the listeners exist are also an intentional gap.
  Only the official PostHog error-tracking extension joins the lazy slim chunk.
  `capture_exceptions` stays false because these listeners own autocapture;
  `captureException` sends through the extension, and `before_send` allows only
  sanitized `$exception` alongside the existing curated events. No error messages,
  arbitrary rejection values, causes, function names, source context or user URLs
  survive. Stack frames keep only known production chunk names and line/column
  numbers (maximum 20 frames); hosts, queries and hashes are discarded. Development
  and unknown-script frames are dropped. This trades diagnostic detail for privacy;
  the app build identifies the minified bundle. No replay, logs or native crash path.
  Live ingestion still awaits the public project token from the accounts side.
- `developerSession()` in `src/labs/flags.ts` returns `null` on a normal career.
  With the build switch on, the page being listed is not a session: null until
  an override, experiment, short field or playtest career is on. With the switch
  off, it returns `{ testCareer, overrides, experiments }` whenever the page has
  been shown (`labsVisible()`), even if every control is off. Treat any non-null
  value as a developer session: either send nothing, or tag every event
  `dev_session: true` with `test_career`. It reads the same `nrl-sim-labs` key.
  Code that can't import it, and is checking the old unlock rather than the
  build switch, may read `localStorage['nrl-sim-labs']` and test
  `visible === true || testCareer`.
- `<html data-nrl-dev="developer|test-career">` is set at boot and whenever the page
  changes something.
- The visible tag (`.nrl-dev-marker`, top centre, no pointer events) reads **TEST
  CAREER** in a playtest career and **DEV** while an override or experiment is on.
  It is absent otherwise.

## Tests

- `tests/labs/devCareer.test.ts`: the namespace, setting up, refusals mid-match,
  the preset, reload, Return byte for byte (including keys changed elsewhere),
  Reset all, the screen override and the marker.
- `scripts/e2e-webkit/portrait/devSettings.mjs` (`--dev-settings-only`, portrait
  shard): the real route on WebKit as an iPhone, in landscape.
