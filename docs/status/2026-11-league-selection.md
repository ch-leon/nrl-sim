# League career release and verification

## Released · 18 November 2026

New Game offers Classic or League career. In a new AU or UK League career the coach confirms Local, plays the saved calendar, and reviews each completed season before choosing any earned league. Winning the league final permanently unlocks the next division. Club salary-cap capacity survives a downward choice. Ordinary match income follows the selected sporting division. [PR #719](https://github.com/ch-leon/nrl-sim/pull/719) merged at `a448210c99f9b42053761236cab3b9fcb1f74e6c` and [issue #574](https://github.com/ch-leon/nrl-sim/issues/574) is complete. [Deployment succeeded](https://github.com/ch-leon/nrl-sim/actions/runs/44255624603). The public game displayed `Build 2026-11-18 a448210`; a fresh League career showed three choices with two locked, confirmed Local, and reloaded the same accepted entry with no browser errors.

[Play the live build](https://ch-leon.github.io/nrl-sim/): start a League career, win a finals title, then choose whether to stay or enter the unlocked league. Existing Classic careers keep their format. Optional cup registration/rewards, assignments, individual challenges, other event formats and gear are not delivered by this release.

The normal save and reload path landed at `b16f43b4`, the saved-calendar screens at `6bdb0976`, and the regional season/browser harness at `c305f7b9`. The automatic review-to-choice browser case landed at `a583cee6`. Independent reviews verified the parked-match import correction at `d7d85cdb` and the venue and attendance corrections at `ece47cd9`. A Week 5 home game showed its $4,000 settled venue receipt. The Week 24 semifinal had 2,250 spectators wanting 2,000 seats. Lineup identified the Week 25 final as neutral and the full-time card showed the club’s $2,000 shared gate.

### Played seasons and controlled results

The production QA harness ran two seasons per region on Normal, seed 573. Each career advanced 50 calendar intervals, made six normal save/import/load round trips and explicitly entered Season 3 in Local. In all four years the recorded final fixture, score and winner matched History. Each run checked settled cash, contracts, ageing, ownership and bounded population through annual acceptance. The player entered no optional competition.

| Region | Season 1 W–D–L | Season 2 W–D–L | Finals titles |
| --- | --- | --- | --- |
| AU | 7–3–4 | 2–4–8 | 0 |
| UK | 5–4–5 | 2–7–5 | 0 |

Separate four-year fixtures controlled the player's scores in each region. Three finals titles exercised staying in Local, entering Championship, then returning to Local with $450,000 of attained capacity. A subsequent 0–14 season exercised choosing either Local or the previously unlocked Championship. These cases supply annual-choice coverage. Finance and progression tuning remain separate work under [#562](https://github.com/ch-leon/nrl-sim/issues/562) and [#582](https://github.com/ch-leon/nrl-sim/issues/582).

### Completed checks and release evidence

- `npx vite-node scripts/qa-league-career.ts --seed 573 --seasons 2` produced the regional results above. The harness writes its report and snapshots under `e2e-output/league-career/`.
- The registered League WebKit section passed 22 cases. Two started at New Game and reloaded a held fixture before skipping to its settled result. Ten tested annual choices from controlled saves. One finished a real final from a controlled pre-final save, opened the automatic review, chose the next league and reloaded the accepted entry. Nine covered all combinations of 844×390, 667×375 and 568×320 with Normal, Large and Larger text. The 568×320 Larger obligations and the automatic review screenshots were visually checked. The WebKit artifact directory is `e2e-output/webkit/league-selection/`.
- A financial refusal during normal league selection cannot be produced from an admitted, lawful save. Admission validates signed terms and choosing an easier league retains attained capacity. Component tests cover financial refusal and stale previews. The short-screen browser tests exercise an actual title lock, its explanation and confirmation reachability.
- `npx tsc --noEmit` and `npm run build` passed on the candidate source through `a583cee6`. `npx vitest run` passed 4,869 tests across 366 files in 311 seconds before the final `673e2419` CSS-only correction; full CI unit checks subsequently passed on exact `673e2419`. The four-file presentation correction also passed 122 focused tests. The Classic phone run of `npm run e2e:season` completed 74 steps with zero failures, layout problems or browser errors. The corrected full `npm run e2e:webkit -- --group screens` run passed all 240 checks across 17 sections, including the 22 League cases.
- The first complete screens run passed 239 checks and found one setup overlap at 568×320 with Larger text: wrapped mode buttons compressed the town/name scroller. The short-screen form now grows naturally while its details remain bounded and scrollable. The fix at `673e2419` passed the original full 10-step flow and 52 title/motion tests; the complete corrected screens run passed locally and in CI. Independent WebKit checks covered three landscape sizes at normal and Larger text with working inputs, mode buttons and Start, and no horizontal overflow.
- [Independent Claude issue-level review](https://github.com/ch-leon/nrl-sim/pull/719#issuecomment-6970835927) approved exact head `673e2419aaa95cc44adcada6c9a41cb9b1b952e9` with no blocking findings. It inspected the complete production activation diff and supporting validation/entry code, using the earlier scoped approvals for foundation work; it did not execute tests or re-review every unchanged checkpoint file.
- [Final CI](https://github.com/ch-leon/nrl-sim/actions/runs/44249628663) passed all code checks, each WebKit shard and both aggregates on that head. The first screens attempt reached its 30-minute limit after 21m52s fetching dependencies, with no failed test assertions. The unchanged retry passed all 240 checks. [Screenshots and reports](https://github.com/ch-leon/nrl-sim/actions/runs/44249628663/artifacts/14406370153) are CI artifacts, not committed images.
- [Full QA](https://github.com/ch-leon/nrl-sim/actions/runs/44249683785) passed career-agency, soak, phone/desktop playthroughs and performance on the reviewed head. [The Android test APK](https://github.com/ch-leon/nrl-sim/actions/runs/44249628767) also built successfully.
- Unmarked legacy developer prototypes still require their isolated namespace. Their old awaiting-next-season state has no continuation through normal League entry. Wider balance acceptance remains separate; the measured runs above are continuity and lifecycle evidence.

## Historical entry checkpoint

`5c7c891f` combines exact entry previews and strict receipt snapshots, retained
club capacity, saved-schedule annual updates, the persistence wrapper and the
shared chooser component. `leagueCareerStateProblem` is the strict, pack-neutral
validator intended for later bootstrap/admission. Annual acceptance requires the
prepared active pack to match the source and otherwise refuses without changes.
Ordinary income uses sporting division membership independently of retained cap
capacity. No new prize or automatic optional-event registration is introduced.

Targeted core verification passed 193 tests; wrapper verification covers real
annual save failure/retry; chooser component WebKit verification covered nine
short-landscape/text-size combinations. The exact combined full suite passed all 4,767 tests (359 files), and typecheck
and production build passed. Independent spec review found seven required fixes:
runtime draw bounds/fixture IDs, safe player cash, earned cap-tier provenance,
initial entrant ordering, hypothetical locked-card finances, zero-finals reward
copy and bounded integer opponent snapshots. Fixes landed at `d42be77c` and `6c39a51b`; the re-review confirmed those
paths and requested one tighter AI retained-cap check while its complete history
is still available. `6673ab9b` adds coverage-based exact AI checks and a real
season-five retained-capacity case after earlier promotion evidence is pruned.
All 132 affected tests and typecheck/build passed; the preceding `d42be77c`
full run passed all 4,777 tests. Independent spec review passed on `6673ab9b`. Claude required one display fix:
Build and the Money guide must use the sporting division for sponsor quotes,
matching receipts rather than retained cap capacity. Core preview/receipt/annual
and persistence behavior passed its inspection. `5c7c891f` fixes all three display
callers; 52 focused tests, typecheck and build passed. Independent spec review
and **ENTRY CONFIRMATION REVIEW: APPROVE** passed on that exact head. The
combined review and its correction are recorded in the local review reports
`/private/tmp/nrl-574-entry-confirmation-review-6673ab9b.md` and
`/private/tmp/nrl-574-entry-confirmation-review-5c7c891f.md`.
The exact head also passed all nine component WebKit viewport/text combinations,
including the corrected locked finances, focus, scrolling and a visible 44px
confirmation control. The approval covers the entry checkpoint, not production bootstrap or the full issue. The component
browser harness is not evidence of the normal new-game or reload flow.

The earlier close-checkpoint CI run `44229857765` at `d44551fa` passed the
code checks and three WebKit shards. The screens shard and its one retry both
exhausted the 30-minute job limit after approximately 25–26 minutes installing
system dependencies; recorded screen assertions passed until cancellation. Its
aggregate is therefore not green. No workflow timeout or test threshold changed.
Final candidate CI and full QA were still required at that checkpoint.

## Completed checkpoints

- Foundation: permanent title evidence, deterministic fields, signed commitments
  and schedule extraction; Claude approved `6241a47b`.
- Annual owners and exact signed-term protection, including v31-to-v32 save
  compatibility; Claude approved `05153331`.
- Effective planning dates across contracts, transfers, undo, displays and generic
  finance payments; Claude approved `29810f76`. All 4,663 tests and build passed at
  that head. Merged-main checkpoint `d7151b69` passed every CI check/WebKit shard
  and aggregate, plus APK.
- Season close: `e4efe9fe`, corrected at `fdf0cfa3`. Final authored interval closes
  once, freezes history/review/unlocks without annual people work, and gates time.
  Strict history clocks, canonical retained fields, cancellation-zero receipts,
  identity-bound async completion and save quarantine are implemented. Independent
  spec review passed after fixing watched invalidation. Claude's post-hook
  validation finding at `fdf0cfa3` was corrected in `9f7a7756`; independent spec
  review and **SEASON CLOSE REVIEW: APPROVE** both passed on 18 November.
- Saved-snapshot schedule adapter: spec review and **SAVED SCHEDULE REVIEW:
  APPROVE** at `6397a0aa`. Annual draws clone saved definitions, rules, calendar
  and per-division trial templates rather than the current catalogue. Missing or
  inconsistent snapshots refuse the draw. Main leagues and trials leave cup dates
  quiet. Separate saved semifinal/grand-final stages are preserved; runtime
  acceptance separately checks playable formats. 146 related tests passed before
  the final split-finals correction; 17 focused tests and typecheck passed after
  it, with an independent 12-test adapter run. Existing AU/UK first-season DEV
  saves remained byte-identical to the pre-extraction source.

The `9f7a7756` correction validates detached settlement/cursor candidates before
installation, advancement or autosave, including remaining held-week hooks, and
validates close output. Regression tests reproduce the original failures and
verify quarantine, preserved save bytes, blocked save routes, resolved async waits
and no replay. Typecheck/build passed. The full run passed 4,714 of 4,715 tests;
the only failure was the file-watcher control, whose separate run with local
file-event access passed all three tests. This is not a single green full run.

The close implementation passed 4,707 tests and build before the final small
validation/gate corrections. Final targeted checks and typecheck passed. An
independent immutable `e4efe9fe` probe ran actual AU/UK calendars through the existing
registered-system harness: 25 intervals, one close, every interval validated, all
480 people's annual fields/population unchanged. With player cup entry declined,
each run settled 223 receipts, including 22 AI-only cup receipts and none for the
player's cup entry. Both lost their league final and correctly earned no unlock.
This is close-lifecycle evidence, not production bootstrap or multi-year proof.

The separate test-harness fix [#721](https://github.com/ch-leon/nrl-sim/pull/721)
merged at `8c5e289e` after Claude approval and green CI/full QA. It is already
integrated into this branch; it changes no game behavior.

## Historical integration and recovery checkpoints

The reviewed entry checkpoint was recorded at `fb696cfe`. Main through
`ac9647b0` is integrated at `82a1c449`; the only merge conflict was adjacent hub
feature notes, both retained. That exact merged head passed all 4,792 tests
(361 files), typecheck and production build, and is pushed to draft PR #719.
Its CI run `44238894040` passed `check` and the screens, portrait and text
browser shards. The match shard hit its 30-minute limit after about 20 minutes
fetching WebKit dependencies; completed sections reported zero failures before
cancellation. Its aggregate remains red; this does not satisfy final CI.
Recovery handling and saved-season UI read models have separate owners.
`3329c922` adds owner-bound interval recovery. Independent review found three
required corrections: invalid same-installation cursors must quarantine,
reentrant career replacement must stop all remaining result effects, and a failed
settlement write must preserve its checkpoint/sidecar pair through later play.
`e3bd42e5` resolves all three. Independent re-review passed 23 callback tests,
including the original three failing probes and additional slot/namespace and
exact-snapshot retry probes. Real playback and parked resume keep the exact
kick-off fixture object; equivalent objects cannot settle a different hold.

`7458ed15` adds the saved-season read model and League/HUD/board views. Review
found that cancelled fixtures can omit their direct date; `30df6946` derives
saved stage dates for display, labels genuinely undated rows and excludes
cancelled/withdrawn games from current activity. A follow-up pending-fixture
case is corrected at `33e0d869`, with actual AU/UK Week 5 regression tests.
Isolated WebKit checks passed at 844×390 Normal and 568×320 Larger, including a
44px All games control and a short-screen scrolling layout that keeps the full
goal and all eight clubs reachable. This is component evidence, not normal
production flow. Independent Stage A re-review passed on `33e0d869`: 24 committed tests and
two additional regional probes, plus typecheck. The combined checkpoint is
reviewed by Claude, which requires two P2 corrections before approval: recovery
exports must retain their matching parked match and truthful checkpoint filename,
and All games must label pending rows without marking pending-only groups as
current. A P3 remaining-fixture count correction is also being addressed so
pending regular games do not make the ladder or board prematurely final.
The report is `/private/tmp/nrl-574-recovery-ui-review-33e0d869.md`.
`e590ff04` corrects the pending labels/group marker and remaining-game counts;
62 affected tests and typecheck passed, followed by an independent 20-test
presentation run including four extra probes. `34c62e7b` corrects recovery export, retaining the matching parked match and
checkpoint filename/notice, with source/destination guards. All 410 affected tests
and typecheck passed. A supported unmarked DEV export imported into another slot
and resumed the same fixture, seed, coaching call and tick 47. Independent spec re-review passed 45 tests (36 committed plus nine extra
probes), production build passed, and Claude **RECOVERY AND LEAGUE VIEW REVIEW:
APPROVE** passed on exact `34c62e7b`. The review is recorded in `/private/tmp/nrl-574-recovery-ui-review-34c62e7b.md`.
At the earlier `33e0d869` checkpoint the first full run passed 4,834 of 4,835
tests. A rerun with native file-event access passed all 4,835 across 363 files.
Normal production admission and regional proof followed in the release above.

## Admission and persistence notes

The shared `saveIfChanged` contract now refuses held/quarantined intervals,
imported or locked saves before treating identical bytes as success. A read
exception refuses a write. Callers cannot use an identical-byte result to bypass
these guards. Normal League load/import must call `leagueCareerStateProblem`,
not only generic save validation, to check account and receipt consistency.
Player cap attainment remains fully observable in compact history. For AI clubs,
once historical draw years are pruned, known initial/recent membership supplies
a minimum attained tier; no missing past membership is fabricated.

**Approved 18 November: club capacity is retained.** Leon confirmed that choosing
an easier league does not reduce the club's salary-cap capacity. Higher-tier entry
can raise base capacity; downward entry/allocation retains it for player and AI
clubs. Preserve purchased/earned additions and existing exact protection; grant no
new protection merely for moving down. New signings and renewals must still fit
ordinary room under retained capacity. No salary rewrite, automatic release or
cash wage charge is introduced.
