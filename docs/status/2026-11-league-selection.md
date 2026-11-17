# League selection implementation checkpoint

17 November 2026. Pausing at Leon's request because usage is exhausted.

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
  spec review passed after fixing watched invalidation. Claude reviewed `fdf0cfa3`
  and returned **CHANGES REQUESTED**: the post-hook validation gap below remains.

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
**First fix the remaining Claude P2:** `src/core/time.ts` can install, announce
and autosave invalid post-hook state on non-final marked intervals. Held release
also validates before its remaining hooks. Validate the resulting candidate before
installation, `week:advanced` or saving; validate close output defensively too.
Reproduce with a valid marked week 2 and a hook introducing unsupported
`boardLoan: { owed: 1 }`. Cover ordinary and remaining-held-hook paths: preserve
occupied save bytes, block every save route, emit `week:blocked`, resolve the async
wait and prevent replay. Obtain an independent Claude re-review before acceptance.
The exact-head review finished; no reviewer or implementation agent remains active.

Then implement exact entry previews and atomic initial/annual confirmation:

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

**Open product rule:** Leon has not yet answered whether voluntary entry into a
lower-cap league requires all signed commitments to fit, or protects existing
signed terms. Do not assume grandfathering. Legal choices that already fit can
be implemented; production completion waits for the answer and corresponding tests.

Annual acceptance, the chooser, production admission and multi-year browser proof
have **not** been implemented. No further agent work should start until Leon resumes.
