# Astra handover: release the approved match art

Prepared 11 November 2026. Repository: `ch-leon/nrl-sim`.

## Objective and approval

Take the implemented and approved match characters/contact animations through
review, release checks and deployment, then give Leon a playable phone build.
The art is already connected to career matches and Match Lab. This is a release
task, with fixes for demonstrated blockers; it is not another design exploration.

After reviewing the leg correction, Leon said: “Ok I’m happy.” He then requested:
“let’s get it into a playable build,” with this work continuing in another Astra
session. He explicitly deferred items 3 and 4 until afterward (see Later work).
Use that approval context; do not reopen the accepted art decisions.

**Done when:** the approved version, including the leg fix, is available at a
phone-accessible URL, required review/checks have passed for the release candidate,
deployment is verified, and Leon receives the URL, build identifier and one short
play-test instruction. A video, `localhost` URL or successful local build alone
does not complete this task.

Read [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md),
[the project hub](../hub/README.md) and
[the art implementation spec](../specs/match-art-prototype.md).

## Current checkout: preserve this work

| Item | State at handoff |
| --- | --- |
| Workspace | `/workspace/nrl-sim` |
| Local branch | `prototype/match-player-art` |
| Base commit | `e4ac24f1fe70fa92c555ffb34416f6f12a906feb` |
| Base subject | Developer settings: screen-unlock override and isolated playtest career (#519) (#520) |
| Implementation | Modified tracked files **and untracked source/tests/docs** |
| Branch upstream | None configured |
| Release state | No commit, push, PR or deployment created for this work in this session |

Inspect `git status --short` before changing branches. The branch name alone does
not contain the implementation: a fresh checkout of the base lacks these changes.
Preserve the entire working tree, including `src/art/prototype/`, `src/labs/art/`,
new live-view modules, tests and scripts. Do not replace it with files from `main`.

### Same workspace

Continue from the existing working tree. Do not apply the transfer patch again.
Inspect the diff and new files, checkpoint them on a work branch, then reconcile
with current `origin/main` as needed. Any conflict resolution must retain the
accepted rendering behavior and be validated before release.

### Fresh workspace

Leon can attach `/workspace/nrl-match-art-astra-handover.zip`. It contains:

- `HANDOVER.md`: this document, also included in the source patch at its repo path.
- `working-tree.patch`: all tracked changes and new source/tests/docs, against the
  exact base above; generated without changing the real Git index or branch.
- `MANIFEST.json`: base commit, file hashes and expected resulting source-tree ID.
- `evidence/`: local typecheck/build/test logs and the live-browser report.
- `artifacts/`: the approved leg-fix match clip and before/after comparison.

Extract it outside the repository. In a clean checkout of `ch-leon/nrl-sim`, create
a work branch at the base commit, then run `git apply --check` on the extracted
`working-tree.patch` before applying it. Replace the illustrative patch path below
with the extracted file's actual location:

```bash
git switch -c release/match-player-art e4ac24f1fe70fa92c555ffb34416f6f12a906feb
git apply --check /path/to/extracted/working-tree.patch
git apply /path/to/extracted/working-tree.patch
git status --short
```

Use a fresh branch name if that name already exists. If the check fails, inspect
the checkout and whether these changes are already present; do not force-apply or
discard other work. Verify the restored files against `MANIFEST.json`. The bundle
does not include the base repository, dependencies, credentials, saves or `dist/`.

## Approved baseline

The goal is **recognise your players and understand the play instantly**.

- Larger, distinct pixel-art faces, readable hair/headgear, small neutral mouths,
  stable skin/hair/beard assignments, three body builds, boots and wrist tape.
  The direction is inspired by Kairosoft's readability; keep the game's own art.
- Moving catches with arms reaching, then a carry; passing and play-the-ball.
- Close, rough body contact with short bent arms. Multiple actual defenders may
  join; the renderer must never recruit nearby players on its own.
- Quick low stops, dominant hits, upright wraps, group tackles, tackle breaks and
  legal one-on-one steals follow the sim's result, with deterministic variation.
- **Latest accepted correction:** thighs and shins are capped at 5 world pixels,
  total reach at 9.5. Contact stance hips/upper body were lowered 4 pixels to match
  ordinary characters. Boots slide inward with the hips, knees fold continuously,
  and soles keep their ground height. Keep this correction in the release.
- Ball ownership, joins, outcomes and field movement remain simulation-owned.
  No changes to contest odds, RNG, fatigue, legal strip rules or save format.

Existing players retain the legacy 12-look mapping by ID. The eleven-head catalogue
includes preview options; it is not a new persisted appearance editor or a migration
that assigns every existing player a different hairstyle. Portraits and grounds
characters are outside this release's art scope.

## Implementation map

| Area | Files and responsibilities |
| --- | --- |
| Character pixels | `src/art/prototype/head.ts`, `player.ts`: approved faces, appearances and ordinary actions |
| Contact geometry | `src/art/prototype/contact.ts`: shared tackle poses, bounded arms/legs, outcomes and painter; `tackle.ts`: shared brushes and earlier reference study |
| Other match actions | `src/art/match/livePlayer.ts`: approved proportions for kicks, fends, dummy-half and celebration poses |
| Engine facts | `src/match/core/snapshot.ts`; `src/match/league/live.ts`, `live/contact.ts`, `live/play.ts`, `live/types.ts`: presentation metadata for identities, joins, resolution and ruck release |
| View selection | `src/match/view/contactAnimation.ts`, `contactLayout.ts`, `playerPicture.ts`, `liveView.ts`: deterministic frames, real-position placement, exact participants, single ball rendering |
| Phaser integration | `src/scenes/matchPlayers.ts`, `MatchScene.ts`, `matchArt.ts`: reusable textures, bounded frame cache, cleanup, name-tag height and matching ball art |
| Isolated studies | `src/labs/art/`, `src/main.ts`; route `/#artlab` keeps earlier-art comparisons and authored scenarios |
| Browser checks | `scripts/e2e-live-art.mjs` for actual matches; `scripts/e2e-art.mjs` for studies; `scripts/export-art-preview.mjs` for an offline study |
| Regressions | `tests/art/prototype/`, `tests/art/match/livePlayer.test.ts`, `tests/match/view/{contactAnimation,playerPicture,liveView}.test.ts`, `tests/match/league/live.test.ts` |

Modern snapshots contain their own contact timing, so seeks, resume, replay and
skipped display frames need no history of having seen the first hit. Old snapshots
without exact contact data fall back to individual character poses. Unsupported
grouped outcomes (fends, offloads, errors, touch, scoring in contact) use individual
poses. Do not invent a completed tackle for those events.

CPU frame caching is capped at 512 entries. The scene owns a small reusable texture
per player and one contact texture. Existing fixture preparation still generates
legacy player atlases; uploaded ones are adopted for cleanup but no longer used by
live actors. Treat that as a review/performance consideration, not an invitation
to refactor the fixture pipeline unless a measured release blocker requires it.

## Verified evidence and remaining gates

The final **code** version, including the leg correction, passed locally on
11 November 2026. Documentation and the transfer package were prepared afterward.

| Check | Evidence/status |
| --- | --- |
| Typecheck | `npx tsc --noEmit` passed |
| Production build | `npm run build` passed |
| Full unit suite | 3,039 tests in 248 files passed, about 398 seconds |
| Targeted live browser run | Chromium against the production preview; 1280×800 and 844×390; career and lab routes passed |
| Contacts/replay/cleanup | Actual two- and three-defender contacts, dominant hit, break, strip, ground and PTB observed; one ball, pause/seek consistency and scene restart checked; 59 textures before/after restart |
| Safari/WebKit | **Pending.** Local dependency installation lacked root access; browser-only downloads returned HTTP 403 from Playwright hosts |
| Independent review | **Pending.** AGENTS.md requires a different tool from the builder; another Astra session continues the Codex work and is not itself that independent review |
| PR CI and full QA/performance workflows | **Pending for the release candidate.** Local unit tests and browser checks are not substitutes for those runs |
| Leon's full phone play-test | **Pending.** Visual baseline approved from previews/clips |

Original logs are under `/tmp/nrl-leg-fix/` in this workspace and are copied into
the transfer bundle. Temporary paths and running servers may not survive a new
session. The approved clips are `/workspace/live-match-art-leg-fix.mp4` and
`/workspace/tackle-leg-fix-comparison.mp4`. The full clip samples a real seeded
match frame by frame at 30 fps; it is visual evidence, **not a device FPS benchmark**.

## Release work, in order

1. Recover/checkpoint the source as above. Find or create the scoped tracking issue
   with the Done when line, and open one PR for the approved art integration and
   necessary release fixes. Check current remote state before choosing PR/base.
2. Arrange the different-tool review required by AGENTS.md. Ask it to report
   problems against the approved scope, the final diff and Done when, rather than
   redesigning the characters. Resolve demonstrated blockers and keep evidence.
3. Complete the checks below on the final candidate. Preserve saves and look IDs;
   inspect normal/fast playback, left/right facing, real group contact, release to
   PTB, steals, interchanges, replay/resume, scene restart and mobile texture/frame
   behavior. Test performance on a runner not simultaneously doing the full suite.
4. Follow AGENTS.md's green-check/review and Leon-approval merge requirements using
   the approval context and the new session's instruction. Do not silently waive a
   missing gate. Fix/check the candidate before escalating any actual blocker.
5. Release through the existing GitHub Pages workflow and verify the deployed
   result. Return the playable URL and actual deployed build label/commit, then
   stop for Leon's full-match play-test. Do not start the later animation pass.

The CI workflow is `.github/workflows/ci.yml`: `check`, all four
`webkit (match|text|screens|portrait)` jobs and the `webkit` aggregate must pass.
Run `.github/workflows/qa.yml` on the candidate branch as well (soak, phone/desktop
season playthroughs and performance budget). Record the commit and run URLs;
an unrelated successful run on `main` does not validate this branch.

Use Node 22 as CI does, install dependencies when necessary, then:

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Start the built preview in a separate terminal:

```bash
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

Run the new functional checks against that preview (adjust Chromium's path):

```bash
E2E_URL=http://localhost:4173/ CHROMIUM_PATH=/usr/bin/chromium E2E_OUT=/tmp/nrl-art-release/live node scripts/e2e-live-art.mjs
E2E_URL=http://localhost:4173/ CHROMIUM_PATH=/usr/bin/chromium E2E_OUT=/tmp/nrl-art-release/study node scripts/e2e-art.mjs
```

Where WebKit can be installed, exercise both the new renderer-specific test and
the repository's Safari suite (the four CI shards together cover the full suite):

```bash
npx playwright-core install --with-deps webkit
E2E_URL=http://localhost:4173/ E2E_BROWSER=webkit E2E_OUT=/tmp/nrl-art-release/live-webkit node scripts/e2e-live-art.mjs
npm run e2e:webkit
```

Do not set `E2E_RECORD=1` for WebKit; the optional recorder uses a Chromium-oriented
WebM path. If local WebKit remains unavailable, use the configured CI runner and
report that distinction. Do not label Chromium emulation as Safari verification.
Fix genuine test failures; do not weaken assertions to make the release green.
Screenshots/videos go in PR attachments or CI artifacts, never in a commit.

### Shipping details

`.github/workflows/pages.yml` builds and deploys when `main` changes, using
`BASE_PATH=/nrl-sim/`. It also has manual dispatch; dispatching it on a feature
branch publishes to the same live site, **not a separate preview**. Use the normal
reviewed merge/deploy route rather than assuming a branch-specific Pages preview.

Verify the sub-path production build, asset loading, career-to-match flow, and
`https://ch-leon.github.io/nrl-sim/#lab` after deployment. The main play URL is
`https://ch-leon.github.io/nrl-sim/`. Confirm the build label in the title/Guide
against the deployed commit. On Leon's installed iPhone PWA, use the normal update
Reload prompt; keep career storage intact while refreshing.

Useful local reproduction in Match Lab: seed 1, default teams. The last browser
run found group contact at tick 144, completed tackle 150, PTB 157, break 301,
ground 383, dominant hit 1325, three defenders 1931 and strip 9053. These are
reproduction points for this baseline, not gameplay requirements to preserve after
unrelated future sim changes. The lab hash can include `?seed=1&tick=144`.

Suggested phone instruction: “Play a full match in landscape at ×1 and your usual
speed; watch whether you recognise your players, follow possession and see the
tacklers release cleanly into play-the-ball.”

## Later work — separate tasks after the playable build

**Item 3: transitions.** Catch → run; getting up and clearing after contact;
contact → play-the-ball; dummy-half pickup → pass. Use Leon's full-match feedback
to choose the actual problems. Basic support already exists; this is a later
polish pass, not missing release integration.

**Item 4: big moments.** Kicks, aerial catches, try finishes and celebrations.
Again, improve the match's readability and feel without inventing sim outcomes.

Also deferred: portrait/grounds art, appearance editing/save migrations, more
cosmetic variants, balance changes and unrelated hosting/commercial work.

## Final handback from the release session

Give Leon the verified playable URL and build identifier, PR/check/deployment
links, one line on what to try, and any actual unresolved limitation. Update
`docs/hub/features.md` and `roadmap.md` from local/pending to the verified release
state with the PR link. Preserve this handover's evidence/provenance for reference.
