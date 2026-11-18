# League selection implementation checkpoint

Resumed 18 November 2026 at Leon's request. The 17 November pause checkpoint
remains recorded below; work proceeds through the close correction, league
confirmation and UI, with independent Claude reviews between stages.

[Issue #574](https://github.com/ch-leon/nrl-sim/issues/574) is being implemented in
[draft PR #719](https://github.com/ch-leon/nrl-sim/pull/719), branch
`codex/league-selection-unlocks`. **The feature is not complete or deployed.**
Normal saves still cannot activate this unfinished League mode. Existing careers
remain on their existing path.

## Current reviewed entry checkpoint

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
Final candidate CI and full QA are still required.

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

## Admission and persistence notes

The shared `saveIfChanged` contract now refuses held/quarantined intervals,
imported or locked saves before treating identical bytes as success. A read
exception refuses a write. Callers cannot use an identical-byte result to bypass
these guards. Normal League load/import must call `leagueCareerStateProblem`,
not only generic save validation, to check account and receipt consistency.
Player cap attainment remains fully observable in compact history. For AI clubs,
once historical draw years are pruned, known initial/recent membership supplies
a minimum attained tier; no missing past membership is fabricated.

## Resume here

Follow [the implementation plan](../plans/2026-11-17-league-selection.md).
The season-close correction is independently approved. Continue with exact entry
previews and atomic initial/annual confirmation:

1. Clone saved league definitions, calendar and trial snapshots when scheduling;
   the existing profile/content-based builders must not silently rebase a save
   onto today's catalogue. Initial confirmation retains its original schedule.
2. Bind the preview key to all relevant current state. Store bounded pre-annual
   field/strength/rule/cap quotes separately from annual changes; require the new
   receipt fields strictly. Intermediate manually constructed marked draft saves
   remain unsupported, with originals preserved; do not convert old prototypes.
3. Apply destination accounts, then expiry, aging, bounded youth, checked rival
   population, tenure and target-calendar normalization once on a detached state.
   Rival rollover already owns unsigned intake and returns its new RNG separately.
   Preserve the coach's lineup via `resolveLineup`; preserve frozen source review.
4. Validate all clubs' future cap legality, ownership, schedules and source books.
   Require no `validateCurrent` repairs **and** no unreported returned-state changes.
   Persist successfully before installing, clearing undo/sidecars or notifying.
5. Add explicit fresh-game opt-in, canonical opening unsigned pool, reusable chooser
   and truthful League/HUD/history read models. Keep ordinary Continue unchanged.
6. Prove real AU/UK new-game, reload, held match and multiple annual transitions,
   short landscape/Larger text, final CI/full QA and full Claude issue-level review
   before marking ready or merging.

**Approved 18 November: club capacity is retained.** Leon confirmed that choosing
an easier league does not reduce the club's salary-cap capacity. Higher-tier entry
can raise base capacity; downward entry/allocation retains it for player and AI
clubs. Preserve purchased/earned additions and existing exact protection; grant no
new protection merely for moving down. New signings and renewals must still fit
ordinary room under retained capacity. No salary rewrite, automatic release or
cash wage charge is introduced.

Annual acceptance and the reusable chooser are implemented and independently approved.
Production admission, normal-flow integration and multi-year browser proof remain
outstanding.

Before production activation, revisit the earlier optional close-review notes:
exception paths in close/watched completion must not leave an async advance
waiting forever. Read-only inspection confirms that close can throw after the
last hold is removed, and watched-result processing can throw after deleting
its recovery sidecar. The correction must bind failure to the original
installation/interval, preserve stored recovery data and emit `week:blocked`
once; stale callbacks must never quarantine a replacement career. Also, sacking takes precedence over the choice prompt; UI formatting
should not repeatedly run full save validation. These were outside the narrow
approved correction, not evidence that the production loop has been proved.
