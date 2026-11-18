# Open Cup reward foundation implementation plan

> **For agentic workers:** Use `subagent-driven-development` for the already-authorised foundation implementation after root and Claude plan review. Steps use checkboxes for tracking. This plan authorises no normal cup activation or unconfirmed prize offer.

**Goal:** Implement #576's saved, exactly-once cash, reputation and honour settlement for explicitly supplied Open Cup policies, without activating normal optional cups or #577 cap entitlements.

**Architecture:** Preserve the single serialisable `GameState`, saved competition definitions, canonical club/player ownership and existing result transaction. Save prize promises separately from ordinary match-income promises, then reconcile both in the same state update. The prize receipt is also the permanent honour record; reports never create awards.

**Tech Stack:** TypeScript, Vitest, existing Vite/Phaser application, existing save/import and calendar infrastructure.

---

## Scope and decision boundary

Audited 18 November 2026 against the optional-cups worktree baseline `8d7d9c5d`; actual `SAVE_VERSION` is 32. Recheck the version before implementation if another save change lands.

The user has approved the broad cup/reward direction and, on 18 November, confirmed free entry from season start until before Week 7, cup dates 7/10/13/16/19, and the proposed cash schedule plus reputation/trophy as initial test values. These are not a claim of validated balance. This document covers the policy-independent foundation checkpoint; normal entry and UI follow in the companion Open Cup entry plan. Do not add normal cup entry, edit league-selection offers, or populate `structuralOpenCup()`'s currently empty rewards. Executable policies are Open-Cup-only and developer/test-only: marked League admission rejects them across every retained instance and format, and normal-namespace load/import rejects them even in unmarked careers. A nonempty prize ledger is likewise rejected in normal admission until activation.

Sources: [competition contract](../specs/career-competitions.md), [approved career direction](../specs/career-opportunities.md), [FIN v1](../specs/finance-prototype.md), and the CPP06 material retrieved from the [career specification](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0) in the parent task. CPP06 supplies candidate host-division M, lower entrant M at neutral venues, +1 per actual win, +2 additional title reputation and the final-time squad list. The repository prize table still labels 1M/1M/2M/3M/5M a proposal. These are activation candidates, not a licence to publish a live offer in this foundation.

| Later activation decision | Foundation treatment |
| --- | --- |
| Entry window / seasonal offer timing | Confirmed for testing: season start until before Week 7; no normal entry change in this checkpoint. |
| Actual-win cash 1M / 1M / 2M / 3M / 5M | Confirmed as initial test values; this checkpoint still uses explicit test policies, with the live catalogue added by the entry slice. |
| Host-tier M; lower entrant tier for neutral ties | Use exactly the M frozen by FIN-04: marked careers derive sporting division rank; developer prototypes currently derive cap-account tier. Preserve that existing distinction, including lower M at neutral venues; do not alter ordinary-income policy in this slice. |
| +1 reputation per actual win and +2 additional title | CPP06 candidate; represent arbitrary explicit bounded amounts in the saved policy, without enabling these amounts in production. |
| Winning squad | Snapshot registered canonical players at final time, including reserves; this is distinct from the final matchday sheet. Preserve IDs and display names, not copied live Player objects. |
| Title decided by unplayed forfeit | Unresolved and gated. This foundation supports only `played-final`; a forfeit never grants a title award. Actual-win cash/reputation also require a played result. |
| First versus repeat title | This foundation supports an explicit `each-outcome` policy. Each new event can reward once; no permanent first-win upgrade is introduced. |

No new currency, XP award, trait, sponsor, equipment, invitation, earned-cap activation or match-simulation change belongs here. Unsupported `capAllowance` declarations remain inert. No cap, contract, progression, league honour or board rule changes.

## Design choices and alternatives

1. **Extend the existing reward declarations.** Add an explicit execution marker and outcome/recipient policy to the existing `definition.rewards` entries. Legacy metadata remains readable and inert. Reject a definition mixing marked executable and unmarked reward declarations, an unknown execution version, or an executable unsupported kind; do not silently settle only the supported subset. A second reward catalogue would create two competing promises; inferring eligibility from a reward kind would leave final cash and title cash ambiguous.
2. **Separate ordinary and prize receipts; combine their commit.** Prize records carry different identities and outcomes from FIN-04. Folding them into `MatchCashQuote` would conflate venue/performance money with prizes. A completely separate result callback would permit partial award commits.
3. **Receipt-backed permanent honours.** A title honour receipt includes source result and winning-squad evidence and is the durable history source. Avoid a second writable trophy list that could disagree with receipt history. Retain honour receipts permanently. Retain settled non-honour promises for the current and previous season; prune older settled records only after their source fixtures are gone and no supported reconciliation can replay those sources. Pending records cannot be pruned. Do not retain both finalists' squad snapshots after settlement.
4. **One reputation value per club.** Player reputation remains `GameState.reputation`. Add optional `RivalClub.reputation`; when first needed, materialize the existing `REP_BASELINE` and clamp using existing `REP_MIN`/`REP_MAX`. Do not initialize an invented new baseline or make this field change AI behaviour. A receipt records both advertised delta and actual clamped delta. This extends ownership, not the numerical reputation model.

## File and API map

| File | Responsibility |
| --- | --- |
| `src/data/competition.ts` | Explicit executable policy type/validator; legacy declaration compatibility. |
| `src/data/competitionRewards.ts` (new) | Plain saved prize promise/receipt types, canonical identity helpers, strict structural/evidence validator. |
| `src/systems/competitionRewards.ts` (new) | Freeze explicit promises; snapshot final-time registered squads; pure atomic reconciliation; read-only honour projection. |
| `src/core/state.ts` | `competitionRewards: CompetitionRewardRecord[]`, optional rival reputation, fresh empty ledger, save v33. |
| `src/core/save.ts`, `src/core/saveValidation.ts`, `src/systems/leagueEntryValidation.ts` | Separate marked/unmarked v32→33 empty-ledger migrations, exact old-format admission, full validation and load/import/recovery reconciliation. |
| `src/systems/matchIncome.ts` | Compose prize and ordinary reconciliation and extend existing atomic commit/notifications. |
| `src/systems/competitionCalendar.ts` | Freeze before accepting a result; reconcile its existing completed-result candidate; propagate typed financial errors past cancellation recovery. |
| `src/core/time.ts`, `src/systems/matchday.ts`, `src/systems/fixtures.ts`, `src/core/save.ts` | Narrow paid-developer interval checkpoint/failure/durable-sidecar handling; kickoff patches, callback/worker catches and retry. |
| `src/systems/economy.ts` | Developer reconciliation fallback. League close/admission remain strict and cannot repair or execute rewards. |
| `docs/specs/career-competitions.md`, `docs/hub/features.md`, `docs/hub/roadmap.md` | Describe delivered dormant foundation and remaining activation questions accurately. |

Use these APIs; no effect registry or generic transaction framework is needed:

```ts
type RewardExecution = {
  version: 1;
  trigger: 'round-win' | 'title';
  recipient: 'winner';
  repeat: 'each-outcome';
  eligibility: 'played';
  titleEligibility?: 'played-final';
};
// Existing cash/reputation/honour declarations gain execution?: RewardExecution.
// Executable cash additionally requires basis: 'fixture-match-base'.
// Executable honour requires trigger:'title' and squad:'title-time-registered'.
// Executable title policies require titleEligibility; round-win forbids it.
// capAllowance cannot carry execution in this foundation.

function freezeCompetitionRewards(state: GameState, fixture: Fixture): GameState;
function reconcileCompetitionRewards(state: GameState): GameState;
function competitionRewardsProblem(value: unknown, state: GameState): string | null;
function competitionHonours(state: GameState, clubId: string): readonly CompetitionHonour[];
function reconcileMatchEffects(state: GameState): GameState;
function pruneCompetitionRewards(state: GameState): GameState;
class CompetitionRewardError extends Error {}
```

`reconcileMatchEffects()` composes `reconcileMatchIncome()` and `reconcileCompetitionRewards()`; it is exported alongside the existing commit owner in `matchIncome.ts`. The reward module must not import that owner or `competitionCalendar.ts`, avoiding cycles. Run `pruneCompetitionRewards()` once at the end of common reconciliation; it is the sole retention owner. The reward module reads an already-frozen ordinary promise's M from `state.matchIncome`; it must reject a missing/mismatched base instead of consulting current catalogue values during reconciliation.

The outcome source is `openCupSportingOutcomes()`, using its existing `round-win`/`title` IDs. A played result has decider `score` or the instance's saved `drawnKnockout` policy (`seeded-draw` for Open Cup); its saved winner qualifies even when the actual score is drawn. `forfeit` is excluded. Handle cancelled promises directly as ineligible before enumerating outcomes, without asking the sporting helper to validate a partially cancelled bracket. No next-round drawing or sporting-state changes are added.

### Saved records

A record is fixture-keyed and created only while that exact fixture is scheduled and has at least one supported executable policy. Its promise contains version, instance/fixture/stage/round/slot/season identities, definition ID/version/name, both canonical club IDs, venue, matched executable policies, the resolved M and cash amount, and final-time registered squad evidence for both sides when a title honour is possible. Resolve numeric cash at freezing time and prove it is a nonnegative safe integer. Copy policy data; never retain shared catalogue references.

Save an explicit pending/settled lifecycle. At settlement, add the immutable score/decider/winner and exactly one receipt per qualifying policy; a settled record cannot be interpreted as pending merely because its receipt list was removed. Reuse the sporting outcome's immutable `id` (which already includes competition, fixture, recipient and outcome kind), retaining its season/stage/round evidence in the record. Each receipt identity is:

```ts
['competition-reward', outcome.id, policyId, kind]
```

The record identity uses `['competition-reward-promise', season, instanceId, fixtureId]`. Different cash, reputation and honour policies never share a receipt identity. Each receipt stores the exact applied cash or reputation delta; an honour stores title, champion club identity/name and the winning registered squad. Dropping unused finalist evidence after settlement is allowed; dropping winner evidence is not.

Represent cancellation/forfeit-ineligible resolution explicitly as a settled record with an empty eligible-receipt list and saved cancellation/result evidence. It must not remain an endlessly pending promise. A bye has no fixture, promise or receipt. Forfeits cannot qualify for any implemented prize trigger. Title recognition after an unplayed final remains gated pending a separate product decision; ordinary income and round-win policies remain zero.

Validation proves the promise policy list matches the complete executable saved definition for that fixture and proves each accepted executable fixture retains its required promise. It then reconstructs the exact eligible receipt set, including completeness, from the saved policy/result, requires the promise policy list to equal the matching retained instance definition entries and M to equal the exact frozen ordinary-income record's M whenever retained (a pending prize always requires that ordinary record), checks amount arithmetic, identities, stage/round, club references and title eligibility, rejects duplicate aliases and unsupported execution fields, and verifies current/retained fixture evidence when available. Historical settled records retain enough source evidence to validate without keeping every old fixture. Pending records always require their exact retained fixture. A settled honour's departed player ID need not still belong to a live squad.

## Implementation tasks

Before Task 1, the root agent reviews this plan and obtains Claude plan review, recording resolved feedback. Then execute the authorised foundation using subagent-driven development; do not ask again for permission. Keep normal activation in its separately reviewed entry/UI checkpoint; the user-confirmed window and test rewards are recorded above.

### Task 1 — Explicit policy and saved data contract

**Files:** `src/data/competition.ts`, new `src/data/competitionRewards.ts`; tests `tests/core/competitionState.test.ts` and new `tests/data/competitionRewards.test.ts`.

- [ ] Add failing tests accepting legacy declarations without execution and rejecting partially executable policies: missing recipient, unsupported cap execution, title without explicit played-final eligibility, negative/non-finite/unsafe numbers, duplicate policy IDs, wrong stage/round and honour without registered-squad policy.
- [ ] Run `npx vitest run tests/core/competitionState.test.ts tests/data/competitionRewards.test.ts`; confirm failures are from the new contract, not unrelated setup.
- [ ] Implement the types and exact-field validation described above. Unmarked declarations are metadata only, not automatically upgraded.
- [ ] Add identity and saved-evidence tests: a changed recipient/policy/kind has a distinct identity; a forged ID or duplicate record fails; a settled historical honour remains valid after its players leave and the source fixture is pruned.
- [ ] Add corruption tests deleting one eligible receipt, all receipts from a settled record, the promise policy list, or the entire promise for a completed executable fixture. Every case rejects; reconciliation must not recreate missing contract evidence. Separately accept a genuine pending promise with an accepted result in an unmarked developer career and settle it once. Marked/normal admission rejects executable policies and pending prizes rather than repairing them. Add a forged pending-policy/M test against the retained definition/ordinary record.
- [ ] Re-run those tests green. Do not edit authored cup rewards or change existing sporting outcomes.

### Task 2 — Pure promise freezing and settlement

**Files:** new `src/systems/competitionRewards.ts`, `src/core/state.ts`; new `tests/systems/competitionRewards.test.ts`.

- [ ] Build deterministic test careers using the existing AU/UK fixtures and explicit test policies. Give the winner `cash = 2 × saved M`, reputation `amount = 4`, and a title honour as test-only values; these deliberately differ from candidate live tuning.
- [ ] Write red tests for both player and rival winners. Assert the winner's wallet changes once, the loser's wallet does not change from prizes, the player's books use `prize`, the existing reputation clamp applies, and cap accounts/contracts remain deeply equal.
- [ ] Write red tests for a final: freeze both canonical registered squads, accept the title, then move/retire a player before reconciling a genuine saved pending promise. The saved winner list must retain original IDs/names and exclude later arrivals.
- [ ] Implement `freezeCompetitionRewards()` as a pure no-op for completed fixtures, empty rewards, legacy/unmarked policies and already-frozen identities. Freeze after FIN-04 has captured M; do not manufacture ordinary promises inside the reward reconciler.
- [ ] Implement `reconcileCompetitionRewards()` over a detached candidate. Validate every pending source/recipient/effect and every safe-integer wallet/book result before returning. A failure throws `CompetitionRewardError` without mutating the original state; callers must not partially commit ordinary effects first. Preflight policy, recipient, numeric quotes and reputation during freezing, then revalidate balances at settlement. The chosen contract is all-or-nothing: preserve the pre-call checkpoint and held result for retry, never partly commit sport just to retain a pending prize.
- [ ] Use player `money`/`reputation`, rival `cash`/optional `reputation`, existing reputation bounds and `finance.prize`. Missing canonical rival identity is an error; a missing rival wallet uses FIN-04's existing `club.cash ?? 60_000` basis. Test prize-only reconciliation and combined ordinary/prize settlement against that same basis, avoiding a second reset to the fallback after ordinary income. Materialize rival reputation from existing `REP_BASELINE` only when a reputation award qualifies.
- [ ] Write/read the durable honour from the settled receipt. No mutable trophy count, copied Player ownership, event-bus payout, XP or cap changes.
- [ ] Add a two-award failure test: the first AI award is valid and the second overflows. Assert the complete original state, both wallets, all receipts and reputation remain unchanged; no partial candidate is installed.
- [ ] Run `npx vitest run tests/systems/competitionRewards.test.ts`; require green for repeat reconciliation, saved accepted result, empty historical rewards, external pack-catalogue edits after freezing (never edits to the immutable retained instance snapshot), player/rival cash overflow and no mutation on a failed multi-effect award.

### Task 3 — Atomic result and commit integration

**Files:** `src/systems/matchIncome.ts`, `src/systems/competitionCalendar.ts`, `src/core/time.ts`, `src/core/save.ts`, `src/systems/matchday.ts`, `src/systems/fixtures.ts`, `src/systems/economy.ts`; tests `tests/systems/matchIncome.test.ts`, `tests/systems/competitionCalendar.test.ts`, `tests/systems/openCupCareer.test.ts`.

- [ ] Write a failing integration test proving one cup final commit exposes the sporting winner, ordinary receipt, prize receipt, wallets, reputation and honour together. A listener on the booked money event must see all of them already committed.
- [ ] Add an integration failure test where ordinary income is valid but prize settlement fails, plus the second-AI-award failure above. Assert no original-state mutation and zero money/reputation/honour notifications; a retry after correcting the isolated test fault commits every effect once.
- [ ] At kickoff, freeze ordinary promises then prize promises, and extend both existing `matchIncomePatch` writes (`matchday.ts` and `fixtures.ts`) to include the prize ledger. For cheap/unplayed paths without an earlier kickoff, freeze immediately before accepting the result while both canonical squads still exist. An already accepted result can reconcile a saved promise but cannot create one.
- [ ] Reconcile the existing `progressInstance()` result candidate in `finaliseCalendarFixture()`: it already marks a completed cup final and winner. Assert the same commit includes completed status, winner, ordinary/prize receipts and honour. Do not call `advanceOpenCup()` here or modify `prepareOpenCup()`/the fixtures-finals hooks; next-round timing and sporting recovery stay unchanged.
- [ ] Extend `commitMatchState()` to include `competitionRewards` and player `reputation`. Rival cash/reputation already travel through `league`. Emit prize money notifications with existing `booked: true` and source season/slot after `setState()`. Deduplicate by comparing receipt IDs with `before.competitionRewards`, exactly as ordinary receipts do; do not extend the event payload.
- [ ] Replace ordinary-only reconciliation at accepted-result callbacks and economy fallback with `reconcileMatchEffects()`. Keep ordinary receipt identities and FIN-04 quote arithmetic unchanged.
- [ ] Protect `settleStructuralCalendar()` and other result-recovery catches: rethrow `CompetitionRewardError` before `abandonFixture()` or any cancellation/withdrawal fallback. Wrap ordinary/prize financial failures consistently when composing an executable-reward transaction. The paid-developer interval protection below is required; unmarked developer careers do not currently have League checkpoint/retry protection. Test overflow on rival/forfeit recovery paths: original state and checkpoint unchanged, no cancellation or withdrawal, no notifications; reload the retained checkpoint/sidecar after the injected fault clears, replay that same fixture and commit once. An already accepted developer result remains accepted when its pending-award reconciliation fails.
- [ ] In `src/core/time.ts`, extend the existing interval checkpoint ownership narrowly to isolated developer careers containing supported executable Open Cup policies. Reuse `IntervalCheckpoint` plus the existing installation guard and owned release tokens; distinguish the paid-developer case from marked League finishing with one explicit context discriminator. Do not route it through `finishLeagueInterval()` or change unrelated Classic/unpaid developer intervals. Before any hooks, retain the interval-start source/slot/namespace and prevent intermediate autosaves with the existing save-held mechanism.
- [ ] For this paid-developer context, wrap synchronous hooks/cheap rivals/calendar-forfeit settlement and supply `release.fail` to watched/worker/live-rival paths. On `CompetitionRewardError`, verify installation ownership, clear only this interval's held tokens/context, then call existing `blockInterval(reason, checkpoint)`. Invalidate stale callbacks and stop remaining hooks/season advance. Keep the original durable checkpoint and existing parked sidecar; a failed result candidate creates no receipts, notifications, cancellation or withdrawal. Earlier interval work may exist in quarantined memory, but cannot replace the durable checkpoint or be exported as a settled career.
- [ ] In `src/systems/matchday.ts`, use the guarded `release.applyResult`/`release.fail` branch for paid developer matches; never clear the watched sidecar before successful interval persistence. In player-worker and `src/systems/fixtures.ts` live-rival catch/finally paths, financial landing failure must block and invalidate releases before `finally(release)`; never fall back to forfeiting or rerun an already-landed financial callback as a worker-computation retry. Cheap rival failures are caught by the interval owner.
- [ ] After normal developer structural finishing succeeds, use `src/core/save.ts`'s existing `saveSettledLeagueMatch(state, checkpoint, retireMatch)` and `retryPendingLeagueSave()` owner for this checkpoint. These APIs already accept `IntervalCheckpoint`; do not add another pending-save store. Retire the watched sidecar only after the whole completed interval is durably written/read back. Quota/readback failure keeps checkpoint+sidecar export and blocks further advance. Financial failure retry is a full reload from the saved checkpoint plus sidecar (or deterministic headless replay when none exists), not reusing partially advanced memory.
- [ ] Add real paid-developer integration tests in `tests/systems/openCupCareer.test.ts` for watched, fast-forward Worker, live-rival, cheap-rival and settle-forfeit paths. Inject typed financial failure in each and assert blocked state, cleared owned holds, preserved checkpoint/export/sidecar, no forfeit replacement, no failed-award notifications, stale callback no-op, then one successful commit after reload/replay. Also test grouped player/rival failure, save quota/readback retry and installation replacement. Keep normal League callback tests as unchanged-behaviour regressions, not evidence for developer protection.
- [ ] Run `npx vitest run tests/systems/matchIncome.test.ts tests/systems/competitionCalendar.test.ts tests/systems/openCupCareer.test.ts tests/systems/competitionRewards.test.ts`.
- [ ] Add separate cancelled-final and forfeited-final tests: saved promises resolve settled with an empty eligible-receipt set, no trophy or reputation, and no fake final cash. Repeated reconciliation and season close cannot leave these promises pending.
- [ ] Require green cases for watched completion, skip/fast-forward, cheap rivals, repeated worker delivery, a bye, cancellation, played-score tie with seeded winner, unplayed forfeit, reduced cup field, player decline with AI winner and simultaneous independent rival outcomes. Assert no extra interval, ladder/stat/XP replay or cap change.

### Task 4 — Save 33, recovery and rollover

**Files:** `src/core/state.ts`, `src/core/save.ts`, `src/core/saveValidation.ts`, `src/systems/leagueEntryValidation.ts`; new `tests/core/competitionRewardsMigration.test.ts`, existing `tests/systems/leagueCareer.test.ts`, `tests/systems/openCupCareer.test.ts`, `tests/systems/leagueCareerSetup.test.ts` and `tests/systems/leagueCareerCallbacks.test.ts`.

- [ ] Write failing v32→33 tests for AU/UK legacy, structural and marked League careers. Preserve money, existing reputation, people, contracts, cap accounts, RNG, definitions and old receipts; add only `competitionRewards: []` and the version change. Leave absent rival reputation absent. Pre-finance refusal and future-version refusal remain intact.
- [ ] Before changing `SAVE_VERSION`, consume the independently captured baseline `8d7d9c5d` fixtures from `cup_v32_fixtures`: `tests/fixtures/saves/league-career/v32-au-initial-choice.json`, `v32-au-active.json`, `v32-au-next-season-choice.json`, the corresponding three `v32-uk-*.json` phase files, and `v32-dev-open-cup.json`. Read provenance/generation checks in `tests/fixtures/saves/README.md`; keep the captured JSON immutable and migrate/mutate copies. These seven genuine v32 files are the primary migration evidence; stripped v33-generated states are only supplementary negative tests. Mutate each old League invariant (finance, population, capacity, entry, history, runtime) and require rejection without changing the original or installing a converted candidate. Reject v32 containing any new field even when empty. Preserve the existing `SAVE_VERSION - 1` negative in `tests/systems/leagueCareerSetup.test.ts` as a mixed-schema rejection and add a positive loaded from the captured baseline file beside it.
- [ ] For unmarked saves, add `{from: 32, to: 33, run: old => ({...old, competitionRewards: []})}` to the existing migration chain after rechecking no intervening version landed. Fresh saves initialize the same empty ledger.
- [ ] Handle marked v32 saves explicitly before the existing strict admission branch. Check raw version 32 and reject presence (not merely truthiness) of every newly added field: top-level `competitionRewards`, any reward `execution`, `basis` or `squad` field, and rival `reputation`, including empty arrays/objects, null or false values; never use a truthiness check. Apply the same old-format exclusion to generic v32 migration. Keep this exclusion list aligned with the final schema; tests inject every new field separately.
- [ ] Only after that exhaustive additive-schema check, create a detached `{...old, version: 33, competitionRewards: []}` and run the existing strict v33 `leagueCareerStateProblem()` unchanged in its old invariants, adding only the new normal reward gate. This is an additive migration, not a copied/versioned validator. Preserve original bytes through existing backup handling. Do not create offers, AI reputation, prize claims or cup instances. Test every old League invariant on the candidate; failure leaves the source/destination untouched.
- [ ] Require the ledger and strict validator for v33. Reject malformed imports without changing an occupied destination. Retain the original rejected/upgraded source using existing save protection. Test malformed v32 marked careers through the additive admission path, valid v32 phase variants, and v33 missing ledger rejection; assert the destination and original bytes stay unchanged on failure.
- [ ] Add the normal execution gate before the Open Cup `continue` in `leagueEntryValidation.runtimeProblem()`, checking every retained instance, not just current league/trial definitions. Normal namespace load/import rejects executable policies on any format and nonempty prize ledgers. Explicitly test a marked Open Cup policy, a non-cup executable policy, an unmarked normal import and a marked next-season-choice pending prize. Marked migration tests use empty prize ledgers only.
- [ ] Preserve marked League no-repair admission and its existing load/import behaviour. Only unmarked isolated developer careers reconcile genuine accepted pending promises on load/import installation, composing with existing recovery and ordinary income. Catch `CompetitionRewardError` at these admission/install boundaries and return a controlled rejection: no uncaught error, state installation, source rewrite, destination replacement or sidecar retirement. Preserve original source bytes and the occupied destination/sidecar. Import inspection remains side-effect-free; successful installation commits a candidate once. Test rejected load and import for overflow/invalid evidence, followed by successful explicit retry with valid input. No normal pending-prize repair is introduced.
- [ ] Preserve the held-week contract: no mid-match state save; export/load uses interval-start state plus sidecar. Replayed kickoff can recreate the same frozen promise; post-result reload cannot repay it. No new sidecar or second recovery store.
- [ ] Extend `tests/systems/leagueCareerCallbacks.test.ts` using its local `installStorage()`, `startLeagueMatch()` and `matchResult()` helpers for normal-career failure quarantine/held-result retry regression, injecting the typed error without adding an executable policy to a marked career. Exercise quota/readback failures and preserve original interval-start bytes/sidecar. Put executable-prize callback, held-export, reload and one-notification-per-receipt retry tests in unmarked developer fixtures in `tests/systems/openCupCareer.test.ts`; do not bypass admission in production code.
- [ ] Leave `closeLeagueSeason()` and normal annual acceptance reward-free and strict. Test state carry-forward/pruning with explicitly injected developer/test states only; this is not proof of a playable multi-season cup feature. At the sole `pruneCompetitionRewards()` call after common reconciliation, retain current/prior-season records and all honour-bearing records; remove older settled non-honour records only when source fixtures are already gone. Reject stale pending records, never prune them silently.
- [ ] Add retention tests that keep a mixed cash/reputation/honour final record permanently; retain older non-honour records while source fixtures remain; prune only after source removal; and reject stale old pending promises. An external pack-catalogue change cannot reopen a pruned historical claim; editing a retained instance policy remains corruption.
- [ ] Run `npx vitest run tests/core/competitionRewardsMigration.test.ts tests/core/leagueCareerMigration.test.ts tests/systems/leagueCareer.test.ts tests/systems/openCupCareer.test.ts tests/systems/leagueCareerSetup.test.ts tests/systems/leagueCareerCallbacks.test.ts`.
- [ ] Require green developer before/after-result save/reload and pending accepted award import, normal admission rejection, held export/recovery, invalid duplicate receipt import, normal/developer namespace isolation, source pruning, unchanged normal repeat season close, and injected state carry-forward with a distinct later title identity.

### Task 5 — Documentation, full proof and independent check

**Files:** `docs/specs/career-competitions.md`, `docs/hub/features.md`, `docs/hub/roadmap.md`; extend `src/qa/leagueCareer.ts` and `tests/qa/leagueCareer.test.ts` only if necessary to exercise explicitly injected reward policies without activating offers.

- [ ] Add bounded AU/UK developer integration proof with explicit test policies across result/save/reload, plus injected state carry-forward proof; do not claim normal cup rollover. Compare ordinary money separately from prize money; use source receipts to prove every credit and verify stable people/clock/cap state.
- [ ] Document the foundation as implemented but inactive for normal optional cup offers. Record the confirmed entry window and initial test amounts; keep normal entry activation and #577 capacity effects in their own checkpoints. Existing guide/season-review “No extra title cash” copy remains accurate; update it only in the later activation PR. Do not label broader competition rewards or five-season balance complete.
- [ ] Run `npx tsc --noEmit`, `npx vitest run`, and `npm run build`; fix failures within the issue scope.
- [ ] Deliver the reviewed foundation and its subsequent normal-entry/UI checkpoint together in one focused optional Open Cup PR. Share save version 33 as described in the companion entry plan; no intermediate save format is released. Supply the actual green check output and the foundation's test-policy demonstration alongside the playable entry journey; do not publish screenshots in the commit.
- [ ] Obtain implementation checker review from a tool different from the builder. Require `check`, all `webkit (<group>)` jobs, the `webkit` aggregate and QA workflow evidence under `AGENTS.md`. A local unit pass is not completion proof.

## Completion boundary

This foundation is complete when supported explicit policies settle atomically and once across every result/recovery path, retain title evidence and winning registered squads, survive save migration and injected historical carry-forward, and leave ordinary income and cap owners intact. Normal League careers still have no new cup offer or prize policy. Activation is the subsequent scoped entry/UI change, using the confirmed window and initial test values, with all terms published before entry.
