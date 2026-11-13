# Short-match career balance pass

**Status:** measured and locally verified; separate follow-up to the short-match feature. No
economy, progression or match defaults are approved to change by this plan.

**Goal:** determine whether changing the default from two 7-minute halves to two
2.5-minute halves damages a fresh career's finances, progression or the benefit
of managing the club, while preserving meaningful spending decisions and failure.

**Architecture:** run the existing headless career soak through the real weekly
pipeline with one duration override. Compare whole careers rather than adding a
throwaway simulator or extrapolating single-match XP. Keep the QA manager and all
other game settings identical in both arms.

## Source and scope

- Feature base: `e6f760bf`, including recurring-affordability QA policy
  `481f89e2`. The separate branch is `codex/short-career-balance`.
- Measurement: `scripts/soak.ts`, `src/qa/soak.ts`, and the existing
  `rules.halfMinutes` tuning override. `NINES` shares the active content-pack
  rules; this override also reaches proportional cheap-rival scoring.
- This is fresh AU Normal careers, normal cheap rival rounds, two seasons,
  idle and managed. Browser-local field experiments are absent; physical field
  stays at its default. The UK pack, Hard, live-rival mode and long-term balance
  are outside this first comparison.
- All accounting is game currency per season. `bestNine` is the mean overall
  rating of the best nine at the end of the regular season. Finances and money
  include the closing season's rollover. Never compare that rating with an XP
  total or a finance value taken at another boundary.
- The existing four raw seeds 101–104 show managed best nine below idle, driven
  by seed 103's forced sales. This is the trigger for investigation, not a
  representative estimate or a reason to change those seeds.

## Fixed measurement design

Predeclared before reading either ensemble result on 2026-11-13:

- **40 seed indices 1–40**, the CLI's unchanged contiguous cohort. Actual RNG
  seeds are `7919 * index`, identical in all four arms.
- **2 full seasons × idle/managed × 2.5/7-minute halves = 160 primary careers**.
- Preserve **raw seeds 101–104 as a named regression cohort**, with both
  durations and policies (16 additional careers), run through the existing
  `--child` entry point and the same explicit `SoakOptions`. Their short-clock
  results were known before this plan; their controls were not. Report this
  cohort separately and an equally weighted combined 44-seed estimate with a
  43-degree-of-freedom interval. This extension was declared before ensemble
  analysis; there is no further seed expansion.
- Choose 40 at the start to improve precision over the skill's 20-seed general
  measurement. Do not grow the sample until it passes, swap seeds, drop bad
  careers, or interpret the four-seed result as the population.
- Same source head, manager policy, initial game configuration, seed mapping,
  number of seasons and measurement fields; only `rules.halfMinutes` moves.
- Duration changes RNG consumption inside the match and subsequent career
  paths. Seed pairing controls initial conditions, not identical injuries,
  match outcomes, events or recruitment. Report variation across all pairs.

Commands, run from this worktree:

```bash
npm run soak -- --seasons 2 --seeds 40 --difficulties normal --jobs 4 --json /tmp/nrl-career-short40.json
npm run soak -- --seasons 2 --seeds 40 --difficulties normal --jobs 4 --tune rules.halfMinutes=7 --json /tmp/nrl-career-old40.json
```

The old-clock arm deliberately retains the same improved QA policy. An actual
older-head run is a separate question and is only warranted if policy causality
remains unresolved.

## Outcomes and interpretation

Primary agency outcome: season-two managed minus idle `bestNine` within each
duration, then the paired change in that advantage between durations. Report
season-one values too, without selecting the more favourable season.

Primary health outcomes for every season and mode:

- balance and minimum balance; all existing finance lines, with attention to
  wages, gates, events, transfers and board grants;
- forced-sale count, debt-warning weeks, fraction of careers with forced sales,
  sackings and forfeits;
- best nine and change from the same career's initial best nine, rival mean and
  gap, signings and fees, reputation;
- wins, draws, losses, ladder finish and finals. Count a draw explicitly;
  nearest-rival `nearRivalWinRate` treats it as not won in the existing harness.

Report means, medians/ranges for cash and forced sales, and paired mean deltas
with two-sided 95% Student t intervals (39 degrees of freedom) for numerical
outcomes in the primary cohort (3 degrees of freedom in the regression cohort,
43 in the combined cohort). For a binary outcome, report the paired difference in 0/1 indicators
and its interval alongside the integer career counts. The unit of independence
is the seed, never a week, player or match. Treat these as exploratory intervals;
they do not establish multiple-outcome equivalence.

**Hard requirements:** every existing soak invariant remains mandatory; all 176
careers must produce both seasons. Preserve ledger reconciliation, finite state,
unique player ownership, reload checks and every other existing `problems`
check. Retain every failure in the report and process status.

**Interpretation to review before any tuning:** a negative agency estimate whose
interval excludes zero calls for causal investigation. An interval spanning zero
is inconclusive, not proof of equivalence. A shorter-clock deterioration of at
least one best-nine rating point, $50,000 cash per career-season, or 10 percentage
points in forced-sale/sacking incidence is a practical review flag even if its
interval is wide; these are proposed investigation flags, never assertion
thresholds or permission to ignore smaller harms. Report the full interval and
all health outcomes regardless of whether a flag triggers.

Healthy agency means decisions can improve a career while recurring spending
still has consequences. The pass must not add universal income, remove bankruptcy,
inflate XP, relax finance invariants, or make all clubs win to repair a noisy QA
manager comparison. If the causal issue is QA policy, fix and test that policy.
If the clock causes a game-level loss of agency, propose the narrowest causal
fix and remeasure the same declared cohort after review.

## Work and review checkpoints

- [x] Read the hub, repository rules, balance-experiments skill, soak CLI and
  seasonal sample definitions.
- [x] Declare the cohort, arms and outcomes and start both read-only harness runs.
- [x] Root review of this plan before editing tests, harness or runtime code.
- [x] Check receipts, source head, number of runs/seasons and every problem;
  retain full JSON/logs outside commits and record their hashes in the report.
- [x] Analyse only the existing harness output and add the result tables and
  limitations here. Recommend runtime changes only with a demonstrated cause.
- [x] If the four-seed unit assertion proves inappropriate, propose moving its
  population claim to maintained many-seed harness coverage with an explicit
  report and gate. Keep the four seeds' pipeline/invariant coverage, causal
  affordability tests, and deterministic summary-column tests. Do not silently
  delete or weaken the comparative claim to make CI green.
- [x] Implement the reviewed test/harness change with red/green coverage, then
  run `npx tsc --noEmit`, `npx vitest run`, and `npm run build`.
- [ ] Prepare a separate follow-up PR based on the feature only when requested;
  obtain independent different-tool checking and CI/QA receipts before merge.

No merge, publication, cherry-pick or push is authorised by this plan. The user's
hold on merging the feature remains in effect.

## Maintained gate design (approved before ensemble analysis)

Keep the existing numerical requirement, managed season-two best-nine mean at
least idle, with its **zero cutoff unchanged**, on the complete fixed combined
44-seed cohort. Do not require each four-seed subset to win. The primary forty,
original four and all forty-four must each appear separately with paired 95%
intervals, including the original four's losing result.

`npm run soak -- --career-agency --jobs 4 --json <file>` owns the maintained
cohort. It refuses tuning, sizing, pack, difficulty, mode and shard options that could
silently change the question. The same existing soak pipeline runs the 88
careers, and `src/qa/careerAgency.ts` validates all cases and paired starts,
fails on missing/duplicate/mismatched/partial careers or any invariant problem,
and applies the unchanged cutoff. A separate QA workflow job keeps the entire
JSON and log, rather than putting 88 careers inside a short unit-test timeout.

Synthetic tests must prove a negative combined result fails, exact zero passes,
a losing original-four cohort remains visible, pairing determines the interval,
and incomplete or mismatched evidence fails closed. Keep the original four's
weekly pipeline, all state/ledger/reload checks and the causal recurring-budget
controls in the unit suite. Move its aggregate assertion only after actual
evidence and the replacement gate are verified.

Passing the aggregate gate cannot establish old/new equivalence or excuse the
predeclared finance, progression and health review flags. A negative aggregate
leaves the gate red; it does not authorise automatic tuning.

## Initial measurement result

The [full comparison and causal assessment](../status/2026-11-short-career-balance.md)
records all cohorts, old/new ratings and competition outcomes, paired intervals,
financial attribution, source mechanisms and raw-output hashes. All 176 careers
completed both seasons without invariant problems. The maintained current-clock
gate exactly reproduced its 88 original samples and failed the unchanged cutoff
at managed minus idle **−0.050** (95% interval **[−1.292, +1.192]**). At this
checkpoint both gates remained red and the original assertion stayed in place.
No economy/XP parameters changed. The next step was the independently reviewed
causal QA event-budget check below, not game-wide compensation for the estimate.

## Causal QA event-budget correction

Approved after the initial measurement, independently of its −0.050 outcome:
the managed reference policy must not accept known costs through event choice
zero that its normal facilities/staff/recruitment policy would decline. The
production game, event definitions, income/XP constants, seed cohort and
zero-cutoff gate stay unchanged.

`managedEventChoice(state, pending)` is a pure QA selector. It keeps the first
choice when safe, otherwise the first safe existing alternative; if no choice is
safe, leave the card to its existing default. Project only visible guaranteed
money, wage and signing effects, never resolve/roll an event speculatively or
credit future conditional income. Draw eligibility is not choice eligibility:
`isEligible` deliberately rejects an already-pending card. The UI enables all
choices; `signRivalPlayer` is the production authority for availability, squad
capacity and fee validation.

- Guaranteed immediate outlays must preserve existing `BUILD_RESERVE` and
  nonnegative projected `weeklyNet`.
- Wage increases must preserve existing `STAFF_RESERVE` after one season of
  incremental wages and nonnegative projected `weeklyNet`.
- Event signings must satisfy production validity and the same existing
  `STAR_RESERVE`, `WAGE_WEEKS` and `BURN_ALLOWED` rules as other QA star signings.
- Free and revenue choices remain available even in debt. No new constants,
  investment policy or optimisation objective is introduced.

Three controlled poor-budget tests were red before the policy edit: with ample
cash but unsustainable wages the manager paid $10,000 for a camp, accepted a
15% wage rise and signed a rival despite its future wages. Healthy-budget
controls already passed. After the narrow guard all nine event tests pass,
including cash reserves, unavailable/full-squad signings, debt/free choices and
unchanged input state/RNG. The same 44 seeds were remeasured under both durations:
another 176 complete careers, no invariant problems or forfeits, both maintained
gate runs exited 0. Combined44 season-two agency is old **+1.6477 [0.0403, 3.2551]**
versus short **+1.2409 [−0.0380, 2.5198]**, paired change **−0.4068
[−2.3236, +1.5100]**. The original four remain negative and separately reported.
Only their population assertion moved to the verified representative gate; every
pipeline/finance/reload check stays in the unit suite.

Local verification on 2026-11-13: `npx tsc --noEmit`, `npx vitest run` (289 files,
3,912 tests), `npm run build` and `git diff --check` pass. The full report keeps
baseline and postguard cash/forced-sale tradeoffs, review flags and output hashes.
No runtime tuning follows from the near-zero baseline. Independent different-tool
checking, CI/QA and the user's release decision remain outstanding.

Independent-review follow-up: the default gate now rejects `--tune`; duration
controls remain ordinary soak experiments rather than default-gate runs. Its QA
step names `shell: bash` explicitly as well as inheriting the workflow default,
so producer failures propagate through `tee`. Deck coverage checks every current
card has a safe fallback and rejects unknown or unprojected recurring financing
effects. A reserve-boundary test confirms the production signing helper leaves
cash untouched and the QA budget counts its fee exactly once.
