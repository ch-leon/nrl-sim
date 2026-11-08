# Developer settings (#519)

Labs is now **Developer settings**. Leon uses it to try a merged feature straight
away without advancing or damaging his normal career. It is browser-local and is
never part of a save.

## Finding it

It stays hidden until `?labs=1` has been opened on this browser (the Labs URL from
before still works). It also shows while a playtest career is on, because the way
back lives here. It sits in Settings, which has a **Developer settings** button
(class `nrl-labs-open`, kept from Labs). Finding the page is not security. Nothing
on it unlocks paid content, entitlements or payments, and it is no game-state
editor.

Everything is kept in the existing `nrl-sim-labs` key. Old values read as before,
and the newer fields (`overrides`, `testCareer`) are optional. A bad value in one
of them drops only that field, never the rest.

## The page

| Part | What it does | When it applies |
| --- | --- | --- |
| **Screens → Open every Office screen** | Staff & Board, Contracts and Finance show as open on the Office tiles and the Playbook's Staff link. It is UI-only (`src/labs/screenOverride.ts`): `GameState.unlocks` is never written, so turning it off locks them again, and the real openings (round 4, round 12, first home game) still land on time. Anything hired, signed or bought while it is on stays in the career, and the page says so. | Straight away, on this browser |
| **Playtest career** | Set up playtest career, or Return to my career (below). | Refused during a live, parked or resumable match, on the Match scene, and during Advance Until |
| **Experiments → Match controls** | Unchanged from Labs. Off by default. | The next match |
| **Reset all** (class `nrl-labs-off`) | Turns the experiments and overrides off and hides the page. The hints already seen stay. In a playtest career it first leaves the way Return does; any playtest keys left behind are cleared. | Mid-match in a playtest career it is refused and changes nothing |

Every control is at least 44px tall and every section is labelled. The page scrolls
inside its frame upright (390×844) and sideways (667×375 and 568×320).

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
  2. Every normal career key is copied byte for byte into `nrl-sim-devtest-backup`.
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
  1. This page stops saving.
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

## Marker contract (for analytics, #518 and later)

- `developerSession()` in `src/labs/flags.ts` returns `null` on a player's browser
  (the page has never been shown). Otherwise it returns `{ testCareer, overrides,
  experiments }`. Treat any non-null value as a developer session: either send
  nothing, or tag every event `dev_session: true` with `test_career`. It reads the
  same `nrl-sim-labs` key, so code that can't import it may read
  `localStorage['nrl-sim-labs']` and test `visible === true || testCareer`.
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
  shard): the real route on WebKit as an iPhone.
