# Individual challenges implementation plan

19 November 2026. Issue #710. Branch `codex/individual-challenges`; implementation
baseline `008c7cee`. Leon approved the combined carry/defend format, dates and
starting rewards and explicitly requested implementation, orchestration, Claude
reviews and a complete readable Notion record. No further design approval gate.

**Goal:** Play Big Mick's six-clash individual contest with a real player, meaningful
coaching, honest animation, durable choices, temporary club cover, exactly-once
awards and a playable harder Invitational.

**Architecture:** Pure fixed-point contest engine and policy; independent typed
challenge records at ordinary saved week boundaries; owned write commands;
existing club interval settlement for return/rewards. Dedicated Phaser scene reads
committed results. Existing camp serialized shape stays intact. Native outcome
reveal acknowledges the matching local checkpoint's native copy.

**Stack:** TypeScript, Phaser, existing DOM screens, Vitest and Playwright WebKit.
The approved product contract is `docs/specs/individual-challenges.md`; exact
starting simulation rules are in `docs/specs/individual-challenge-engine.md`.
Those full formula/action/opponent tables are incorporated into task 1 below.

Root owns integration, commits, publishing, reviews and documentation. Agents own
bounded file sets, do not commit, and report actual red/green test evidence.
Independent work may run concurrently only in disjoint files. Read AGENTS/CLAUDE.
Use test-driven implementation and report concerns rather than hiding them.

## 1. Pure contest, auto-coach and permanent balance runner

- [x] Add `src/data/individualChallengeRules.ts` for immutable two-edition rules,
  named opponent profiles/actions, dates, rewards and engine/policy versions.
- [x] Add `src/systems/individualChallengeEngine.ts` for rounded actor snapshots,
  indexed seeded rolls, integer margin/scoring, energy changes, exact distributions,
  structured reasons, six-clash/finite-bonus progression and replay validation.
- [x] Add `src/systems/individualChallengePolicy.ts` for memoized exact title
  probability, then expected regular score-margin maximization; cost/order ties.
  Policy receives public inputs only, not seed or future rolls.
- [x] Publish types/API to root before downstream integration. Keep engine calls
  detached from GameState, Phaser and storage; lifecycle will own player provenance.
- [x] Write `tests/systems/individualChallengeEngine.test.ts` and policy tests first:
  exact threshold values, all calls/traits, fatigue, six rounds plus finite bonus,
  indexed roll independence, replay mismatch, probability mass and bounded energy.
  Explicit-j resolver and distribution enumeration must share one implementation.

Representative assertions (using the published types):
```ts
expect(resolveClash(input, -12)).toEqual(resolveClash(input, -12));
expect(distribution(input).reduce((sum, x) => sum + x.count, 0)).toBe(25);
expect(policy(publicSnapshot)).toEqual(policy(publicSnapshot));
// Different presentation paths never call a different resolver or consume RNG.
```

- [x] Add reusable `src/qa/individualChallenges.ts` engine comparison and
  `scripts/qa-individual-challenges.ts`, reporting exact vs sampled values clearly.
  Compare fixed/myopic/optimal policies, each action's useful scenario, monotonic
  ability changes, tiers, tie rate, fatigue and traits. Include actual generated
  position groups with their real hidden stats. Numeric targets are hypotheses;
  report and resolve dominated calls or implausible difficulty, never weaken tests
  merely to fit an unexplained result. Keep reward/date terms approved and fixed.
- [x] Run focused engine/policy tests and report generation. Measure policy cost
  before choosing main-thread use; preserve deterministic stale-result ownership
  if computation is deferred. Obtain independent spec and Claude review.

## 2. Native checkpoint acceptance and acknowledgement

- [x] Reproduce silent underlying local set/remove no-op in nativeMirror tests:
  rejected local mutations must not be queued as native recovery truth.
- [x] Extend `src/core/storage/nativeMirror.ts` with narrowly scoped, matching-key/
  payload acknowledgement. `idle()` is not acknowledgement. Preserve ordinary
  best-effort writes and existing tombstone/ready-file/order rules.
- [x] Add a small `src/core/storage/nativeCheckpoint.ts` bridge for accepted
  checkpoints, inactive web/Android, iOS unavailable/failed/timeout/superseded
  outcomes, and retry. Wire active mirror at its current boot seam; do not edit
  gameplay state/time in this task. Publish API to lifecycle owner.
- [x] Test real in-memory NativeFiles: accepted matching writes, collapsed updates,
  newer superseding payload, failure/timeout, deletion and restart restore, no-op
  local writes and ownership-safe bridge reset. No network in gameplay clocks.
- [x] Run existing native/storage tests and typecheck. Independent review before
  lifecycle relies on the new acknowledgement. Any temporary local committed
  result remains unrevealed and retryable until matching native confirmation.

## 3. Typed records, guarded commands, absence and settlement

- [x] Add `src/data/individualChallenges.ts`: exact versioned annual IDs, snapshots,
  booking/revision, coaching/results, ready, completed/cancelled/interrupted states,
  receipts and frozen award basis. Use seed derived from career/annual identity,
  not revision/world RNG. Unknown formats refuse; retired known validator remains.
- [x] Add `src/systems/individualChallenges.ts`, `individualChallengeCommit.ts`
  and focused evidence validation. Guard exact state/slot/namespace/installation/
  revision. Candidate is rebuilt from current state, verified save precedes install;
  native reveal confirmation is separately awaited with the same ownership.
- [x] Commands: capture/review book, cancel, Start/Withdraw when due, choose clash,
  set auto policy, confirmed Finish batch, acknowledge/retry, resolve known-engine
  interruption. Each manual/auto choice and Finish batch commits once. Previews
  enumerate public odds, never inspect seeded rolls.
- [x] Preserve camp records; generalize `awayPlayerIds`, disposal, projected cover
  and absence labels into shared commitment semantics. Participant remains owned,
  excluded from every club role/XP/stat/event path; manual spending is deferred
  while the challenge player is away. Nonparticipant management stays available.
- [x] Extend state/save/competition validation with save v35; reject challenge-field
  injection into older versions before early-return migrations. Keep genuine
  v33/v34 held matches valid. Historical fixture checks use authored rounds2/7.
- [x] Add pre-advance decision gate in time/advance owners (not structural validator):
  booked due or coaching stops every advance with a decision reason and zero fake
  elapsed weeks. Ready permits normal club interval only after required native ack.
- [x] Extend parked replay guards and explicit mutating API refusals, including
  false-success side effects. Ready checkpoint + club sidecar may resume; booked/
  coaching + due-week sidecar is inconsistent and must preserve destination.
- [x] Generalize training receipt calculation without changing camp behavior;
  challenge XP replaces ordinary training and uses mode/focus at return. Extract
  pure prize credit from competition reward owner, retain challenge receipt, and
  mark any post-publish money notification booked. Return/XP/cash/honour/unlock are
  one final interval candidate, including forfeit/rest and failed-write retry.
- [x] Tests first for every boundary: no world tick while coaching; stale ownership;
  failed/no-op writes; native ack retry; exact duplicate result rejection; manual
  and Finish parity; ordinary camp coexistence; transfers/Undo/cover; awards once;
  rename/sale/retire/rollover; unsupported/retired engine; permanent club invitation.

## 4. Scene and coaching/entry/report UI

- [x] Add `src/scenes/IndividualChallengeScene.ts` plus pure committed-round
  presentation adapter. Reuse existing MatchActor/contact layer/cache/registry.
  No LiveSim, MatchScene subclass, match lifecycle events or match sidecars.
- [x] Actor approach/contact/stop/drive/break consumes saved actual results, never
  invented random outcomes. Six distinct calls must read visibly, with score-zone
  contact, local energy and a matching concise explanation. Scene cleanup owns
  timers/listeners/DOM/textures and cannot write a career from old callbacks.
- [x] Add `src/ui/screens/individualChallenges.ts`: League offer/locked Invitational,
  dates, exact public odds, all used abilities, named legal cover, reward/cancel
  preview and explicit guarded confirmation. One event per edition per season.
- [x] Coaching sheet: role/opponent plan, score, energy, three calls, Watch clash.
  Skip action stops at next checkpoint; explicit Auto/Finish semantics and return
  to manual. Save-and-return-to-club leaves a resume action and advance decision.
- [x] Native save failure hides all new outcomes, including batch/auto, with Retry
  and leave/export; never presents an uncommitted success or resimulates a result.
- [x] Result/podium distinguishes earned pending-return rewards from settled report.
  Personal honours derive from receipts and survive departure. Invitation is a real
  selectable second edition. Integrate main routing and teardown before club match
  only after lifecycle APIs are reviewed; root coordinates shared main.ts edits.
- [x] DOM/adapter tests plus genuine phone screenshots at568×320,667×375,844×390,
  Larger text/keyboard/portrait. Use existing styles and actual actor art.

## 5. Real integration and recovery evidence

- [x] Capture genuine current-main v34 AU/UK due-week and held club saves through
  production clock/simulation before version bump; keep source/hash manifest.
- [x] Add production QA paired event/stay careers using real simulations, covering
  both editions, packs, difficulties, roles, manual/auto spending and camp overlap.
  Measure XP/cash/clock/ownership and legal cover, not fake terminal wins as balance.
- [x] Add `scripts/e2e-webkit/screens/individualChallenges.mjs` and register it:
  public discovery, real entry, all role choices, saved animation reload, skipped
  presentation, auto batch, club absence/return, persistent honour, live invitation.
  Label controlled qualification fixtures separately from balance evidence.
- [x] Test native acknowledged outcomes with actual storage bridge contract/fakes;
  browser/native-configured builds are not physical-iPhone proof. Keep artifacts
  outside commits. Full workflow retains camp and challenge QA report artifacts.

## 6. Documentation, review and release

- [x] Save a readable Notion companion linked from canonical career opportunities:
  all accepted rules, every coaching choice, scoring/tie, energy/traits, dates,
  rewards, repeat policy, returns, club-vs-player unlock ownership and recovery.
  Include a clearly labelled technical tuning appendix and current delivery status.
- [x] Update repository opportunity spec/competition plan, hub features/roadmap and
  issue #710 with facts. Do not close broader #582/#576/#578 work from this slice.
- [ ] Independent spec reviews precede Claude code reviews of frozen checkpoints;
  fix/retest actual findings. Full final Claude verdict binds exact committed head.
- [ ] Run required TypeScript, full Vitest, build, all required CI/WebKit groups and
  aggregates, full QA and meaningful balance evidence on final PR head.
- [ ] Merge only when green and independently approved; verify deployed SHA and
  actual public challenge journey, then reconcile Notion/PR/issue with receipts.

Implementation checkpoint: tasks 1–5 are built and locally verified. Claude approved the full candidate with four non-blocking follow-ups (historical validation cost, malformed/legacy sidecar recovery, XP formatting and cover messaging). Regression fixes and final exact-head Claude review are part of [PR #745](https://github.com/ch-leon/nrl-sim/pull/745); green CI/full QA and deployed verification remain required before release. The completed-actor validation regression was included in the approved candidate review.
