# League selection implementation checkpoint

Resumed 18 November 2026 at Leon's request. The 17 November pause checkpoint
remains recorded below; work proceeds through the close correction, league
confirmation and UI, with independent Claude reviews between stages.

[Issue #574](https://github.com/ch-leon/nrl-sim/issues/574) is being implemented in
[draft PR #719](https://github.com/ch-leon/nrl-sim/pull/719), branch
`codex/league-selection-unlocks`. **The feature is not complete or deployed.**
Normal saves still cannot activate this unfinished League mode. Existing careers
remain on their existing path.

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

Annual acceptance, the chooser, production admission and multi-year browser proof
have **not** been implemented at the resume checkpoint.
