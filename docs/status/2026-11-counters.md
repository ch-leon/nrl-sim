# Strategy counters switch-on (#465)

Started from main `e8b88be` (prerequisite #464 merged), then rebased onto
`cd70565` (#504). That intervening change adds expansion-club introductory UI
and board notification text; it changes neither the headless match nor economy.
The completed baseline soak therefore retains its original `e8b88be` provenance. All five
`counters.*.on` switches change from 0 to 1. `SAVE_VERSION` remains 21.
The deterministic mechanics use the existing contact, pass and kick rolls.
Labs and commercial defaults are untouched.

## Tuned defaults

| Group | Values |
|---|---|
| Tight | on 1; offloadBase 1; offloadPerFit 8 |
| Own fit | on 1; edge 0.095 |
| Slide | on 1; expansive 0.08; expansiveFit 0.2; kickChase 1.5; tight 0.04; allOut 0.50; allOutRecovery 3 |
| Rush | on 1; carry 0.0005; defenceFit 0.029; kickChase 0.39; allOut 0.06 |
| Compressed | on 1; tight 0.04; tightFit 0.6; expansive 0.26; brokenBase −0.015; offloadBase −0.03; commitM 6 |

Own-style fit was reduced to stay below four points per selected style. The
Expansive/Slide and Tight/Compressed unequal-fit multipliers and All-out's
existing receiver recovery duration reach full-fit size without moving neutral
fits. Rush's carrier and defence-fit coefficients reduced the initial managed
advantage; fitted Tight's independent offload-per-fit scale then fell from 12
to 8. The 20-seed managed Normal calibration is 82.4583% versus 79.4705%
(+2.9878 points), with no problems or forfeits and saves v1–20 loading.
The complete all-mode acceptance uses the frozen `9e93548` defaults.

## Replay guards

- Balanced / Slide: `10-26:350:34ab09d37c3de210`, unchanged.
- Expansive / Slide: `8-10:377:e051c574b7fe72b5` →
  `10-38:372:0e0dce9822247ec4`: strategy counters switched on, #465.
  Its negative Slide cell now changes positioning, interceptions and contact.
- Season RNG: `3040797444` → `1010310188` for seed 1 through a full season.
  Changed match outcomes change the season’s existing draws. The paired
  `potentialRng.test.ts` control proves player-page reads add no draws.
- These enabled defaults and the resulting fingerprints become the guards
  for subsequent work. Only #465 authorizes this deliberate re-pin.

## Reproduction

Use the balance harness (`balance/README.md`), whole matches, consecutive seeds
and both orientations. Points share means win = 1, draw = ½, loss = 0.

- `balance/plans/counters-enabled.json`: dormant and enabled 5 × 3 matrices,
  500 seeds each way, 1,000 matches per cell.
- `balance/plans/counters-yardstick.json`: current 62/65 versus 60 yardsticks,
  500 seeds each way.
- `balance/plans/counters-fit-enabled.json`: fit 1.5, 0.5 and 1 controls.
  Flat 60 playing stats; harness-only starting fit fixtures vary attack and
  defence independently, retaining the other selected fit at exactly 1.
  Paired fit-off/on variants isolate each contribution.
- `balance/plans/counters-full-fit.json`: winning style fit 1.5 against losing
  style fit 0.5 (reverse for a negative cell), keeping the other two selected
  fits at 1 and playing stats flat 60. The baseline holds the independent Tight
  offload rebuild on; the dormant variant records total switch-on change too.
- `balance/plans/counters-round-robin.json`: every unordered pair of 15 plans,
  100 seeds each way (200 matches per pairing, 2,800 per plan).
- Baseline and enabled soak: `npm run soak -- --difficulties easy,normal,hard --jobs 4`.

## Completed measurements

Each row below uses 500 consecutive seeds in each orientation (1,000 matches).
Points share includes half a draw. Run provenance is retained in the CI artifact.

| Rating yardstick | Points share | SE |
|---|---:|---:|
| Flat 62 v 60 | 56.90% | 1.53 points |
| Flat 65 v 60 | 60.55% | 1.51 points |

The current two-rating-point yardstick is close to task 1’s approximately 58%.
Do not extrapolate a linear scale from the five-point row.
Final-default run: `20261105-055651-465-rating-yardstick`,
[41977143745](https://github.com/ch-leon/nrl-sim/actions/runs/41977143745).

| Strength-80 pack, Tight v | Dormant share | Enabled share | Dormant offloads | Enabled offloads |
|---|---:|---:|---:|---:|
| Slide | 56.75% | 68.00% | 0.645 | 9.274 |
| Rush | 55.10% | 59.75% | 0.669 | 7.660 |
| Compressed | 55.45% | 52.10% | 0.310 | 6.351 |

All three exceed six Tight offloads a match. Run:
`20261105-055646-465-strong-pack-offloads`, actual frozen defaults `9e93548`,
[raw report](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-055646-465-strong-pack-offloads/report.md).

### Neutral matrix

Attack points share, before → after, with flat 60 sheets and every fit exactly 1.
Each cell has 1,000 matches. Nonzero target cells finish 4–6 points from 50 with
the required sign. These are absolute points shares; the paired change is also
visible, rather than conflating the two units.

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 48.30 → 54.70 | 46.70 → 47.85 | 47.40 → 45.45 |
| Expansive | 50.00 → 45.85 | 51.45 → 51.45 | 47.45 → 54.20 |
| Kick-chase | 52.75 → 45.20 | 52.15 → 55.15 | 49.25 → 50.70 |
| All-out | 51.70 → 54.10 | 46.80 → 45.00 | 47.80 → 50.40 |
| Balanced | 50.00 → 50.00 | 48.60 → 48.60 | 47.55 → 49.80 |

Run: `20261105-031641-465-before-and-enabled-matrix`, Actions run
[41960460765](https://github.com/ch-leon/nrl-sim/actions/runs/41960460765).
The enabled matrix and round robin remain exact under later calibration:
`fitEdge(1)=0`, Carry is 60, Tight’s positive fit increment is zero,
unequal-fit response is zero and All-out’s recovery extension is zero. No random draw is added by these expressions.

Flat preset controls versus Balanced/Slide also stay in 45–55%: Tight 54.70,
Expansive 45.85, Kick-chase 45.20, All-out 54.10 and Balanced 50.00; changing
only defence gives Rush 51.40 and Compressed 50.20. Existing preset win bounds
are unchanged. The obsolete wide-offloads > 2× Grind assertion was replaced
for the explicitly rebuilt Tight; cut-out, territory-kick and step checks remain.

### Own-style fit, isolated

| Selected fit | Fit disabled | Enabled | Change (points) |
|---|---:|---:|---:|
| Attack 1.5 | 50.00 | 53.55 | +3.55 |
| Attack 0.5 | 50.00 | 46.90 | −3.10 |
| Defence 1.5 | 50.00 | 53.10 | +3.10 |
| Defence 0.5 | 50.00 | 46.45 | −3.55 |
| Neutral 1 | 50.00 | 50.00 | 0.00 |

All rows have 1,000 matches; the other selected fit stays 1. Maximum magnitude
is 3.55 points, below the locked 4-point cap. `fit.edge=0.095` was selected;
0.10 reached 4.15 and 0.11 reached 4.80 and were rejected. Final frozen-source
run [41972039900](https://github.com/ch-leon/nrl-sim/actions/runs/41972039900),
head `8d499e5`, repeats every row with the selected defaults.

### Perfect-counter fit

The winning style has fit 1.5, the losing style 0.5, and the other two selected
fits remain 1. Flat 60 playing stats isolate fits from physical superiority.
The comparator holds the independent Tight offload rebuild on, disables
counter/own-fit bonuses, and then enables those bonuses. The committed plan also
includes a fully dormant variant so the total switch-on difference is retained.
Each reported row has 1,000 matches per variant; no seeds were selected or dropped.

| Attack / defence | Comparator | Enabled | Change (points) | Raw report |
|---|---:|---:|---:|---|
| Tight / Slide | 53.00 | 64.50 | +11.50 | [full-fit-0](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-053929-465-full-fit-counters-tight-offload-per-fit-8/report.md) |
| Expansive / Compressed | 47.45 | 57.30 | +9.85 | [full-fit-1](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050850-465-full-fit-counters-full-fit-expansive-v-compressed/report.md) |
| Kick-chase / Rush | 52.15 | 63.95 | +11.80 | [full-fit-2](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050849-465-full-fit-counters-full-fit-kick-chase-v-rush/report.md) |
| All-out / Slide | 51.70 | 62.20 | +10.50 | [full-fit-3](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050808-465-full-fit-counters-full-fit-all-out-v-slide/report.md) |
| Tight / Compressed | 49.10 | 39.40 | −9.70 | [full-fit-4](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050810-465-full-fit-counters-full-fit-grind-v-compressed/report.md) |
| Expansive / Slide | 50.00 | 40.70 | −9.30 | [full-fit-5](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050850-465-full-fit-counters-full-fit-expansive-v-slide/report.md) |
| Kick-chase / Slide | 52.75 | 40.90 | −11.85 | [full-fit-6](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050847-465-full-fit-counters-full-fit-kick-chase-v-slide/report.md) |
| All-out / Rush | 46.80 | 36.30 | −10.50 | [full-fit-7](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-050846-465-full-fit-counters-full-fit-all-out-v-rush/report.md) |

The fully dormant Tight/Slide control is 48.30% (total switch-on change +16.20 points); Tight/Compressed is 47.40% (total −8.00). The independent fitted Tight offload rebuild accounts for the difference from the counter/fit comparator. Other rows have identical dormant and comparator controls. Both comparisons are retained in the raw report.

The selected Tight/Slide row is from [41975335567](https://github.com/ch-leon/nrl-sim/actions/runs/41975335567),
head `370109a` with the explicit selected `offloadPerFit=8` override. The other
seven full-fit rows and five own-fit controls from `8d499e5` remain exact: none
uses a Tight attacker above fit 1. Tight/Compressed uses fit 0.5, so its positive
fit increment is zero. All reports, plans and results are archived on
`balance-log` through the row links. The selected response values are Expansive/Slide 0.2, Tight/Compressed 0.6,
All-out recovery 3 and Rush defence-fit 0.029. Neutral cell strengths are unchanged.
These values act only when the starting fits differ (or Rush fit differs from 1).

### All 15 plans, round robin

105 unordered pairings, 200 matches per pairing, 21,000 total and 2,800 per plan.
Points share includes half a draw.

| Attack | Slide average | Rush average | Compressed average |
|---|---:|---:|---:|
| Tight | 48.482 | 50.357 | 50.411 |
| Balanced | 48.571 | 48.304 | 48.196 |
| Expansive | 49.536 | 51.000 | 52.161 |
| Kick-chase | 51.268 | 52.054 | 52.732 |
| All-out | 47.946 | 50.571 | 48.411 |

The maximum individual plan is Kick-chase/Compressed at 52.732%, below 53%.
Attack-style averages: Tight 49.750, Balanced 48.357, Expansive 50.899,
Kick-chase 52.018, All-out 48.976. Defence averages: Slide 49.161, Rush 50.457,
Compressed 50.382. Run `20261105-031642-465-fifteen-plan-round-robin`,
[41960460765](https://github.com/ch-leon/nrl-sim/actions/runs/41960460765).

### Season soak

The identical command ran on pre-switch main and the frozen `9e93548` defaults:
`npm run soak -- --difficulties easy,normal,hard --jobs 4` (JSON output added).
Each completed **120 fresh careers** (20 seeds × idle/managed × three difficulties)
and **20 migrated-save cases, versions 1–20**, with **zero problems and forfeits**.
Fresh careers plan five seasons; the unchanged harness stops careers sacked early.
Every input case remains included; tables show the actual seasons played. Cash is
the mean balance at each career's end, including early endings, not survivors only.

Main baseline (`e8b88be`):

| Difficulty | Mode | Careers | Seasons played | Wins/games | Win % | Mean final cash | Cash SE |
|---|---|---:|---:|---:|---:|---:|---:|
| Easy | idle | 20 | 99 | 1642/2376 | 69.108 | $1,290,528.95 | $102,516.34 |
| Easy | managed | 20 | 100 | 2083/2400 | 86.792 | $1,045,515.25 | $124,085.42 |
| Normal | idle | 20 | 85 | 1135/2040 | 55.637 | $665,151.85 | $139,193.72 |
| Normal | managed | 20 | 96 | 1831/2304 | 79.470 | $538,439.85 | $96,362.23 |
| Hard | idle | 20 | 61 | 693/1464 | 47.336 | $196,824.85 | $119,574.97 |
| Hard | managed | 20 | 86 | 1525/2064 | 73.886 | $182,415.95 | $66,588.79 |

Enabled (`9e93548`):

| Difficulty | Mode | Careers | Seasons played | Wins/games | Win % | Change (points) | Mean final cash |
|---|---|---:|---:|---:|---:|---:|---:|
| Easy | idle | 20 | 99 | 1651/2376 | 69.487 | +0.379 | $1,380,891.40 |
| Easy | managed | 20 | 100 | 2160/2400 | 90.000 | +3.208 | $1,202,138.15 |
| Normal | idle | 20 | 87 | 1147/2088 | 54.933 | -0.704 | $626,959.75 |
| Normal | managed | 20 | 100 | 1979/2400 | 82.458 | +2.988 | $662,419.10 |
| Hard | idle | 20 | 60 | 703/1440 | 48.819 | +1.483 | $152,830.05 |
| Hard | managed | 20 | 86 | 1582/2064 | 76.647 | +2.762 | $303,383.55 |

Both Normal management modes meet the ±3-point guard: idle −0.704 and managed
+2.988 (the unrounded managed change is +2.987847 points). Money stays within
baseline variability: each enabled mode's mean final balance is inside the main
mean ±2 main standard errors. Paired cash shifts are all below 1.22 paired SE:

| Difficulty | Mode | Mean cash change | Paired SE | Change / paired SE |
|---|---|---:|---:|---:|
| Easy | idle | $+90,362.45 | $75,844.32 | +1.191 |
| Easy | managed | $+156,622.90 | $129,358.44 | +1.211 |
| Normal | idle | $-38,192.10 | $61,743.76 | -0.619 |
| Normal | managed | $+123,979.25 | $148,173.18 | +0.837 |
| Hard | idle | $-43,994.80 | $84,449.34 | -0.521 |
| Hard | managed | $+120,967.60 | $117,443.75 | +1.030 |

The original per-season win/finance tables and every case remain in the raw logs
and JSON. [Main run](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-031629-465-main-soak/report.md)
and [enabled run](https://github.com/ch-leon/nrl-sim/blob/balance-log/runs/20261105-055656-465-enabled-soak/report.md).
The enabled evidence is also in [Actions 41977143745](https://github.com/ch-leon/nrl-sim/actions/runs/41977143745).
The rejected initial switch-on raised Normal managed from 79.47% to 87.75%; a
later scale-12 candidate still rose 3.400 points. Scale 8 satisfies the guard
while retaining 6+ strong-pack offloads and the full-fit counter target.

## Phone checks

The final `9e93548` defaults completed production-build playthroughs at both
requested landscape sizes. 667×375 passed 75 steps; 844×390 passed 73. Both had
zero failed steps, layout problems, runtime errors or findings. `lineup-plan`,
`half-time-plan` and `live-fulltime` passed, including opening and applying plans.
The saved home/away scores were 18–36 and 17–17 and agreed with both score bugs
and full-time cards. Screenshots were visually inspected and remain in CI
artifacts, never commits:

- [667×375 screenshots and report](https://github.com/ch-leon/nrl-sim/actions/runs/41977143745/artifacts/13393150017)
- [844×390 screenshots and report](https://github.com/ch-leon/nrl-sim/actions/runs/41977143745/artifacts/13392113551)

WebKit's short 956×330 report check exposed an existing scrolling boundary:
extra scorer/injury/reason rows could push Player of the Match below the fold.
The award now stays beside the fixed exit while those details scroll. All
WebKit shards and aggregate passed with the fix at `370109a`; the final-source
run repeats them. The QA desktop driver also uses its existing phone-or-mouse
helper for #504's expansion intro; its unconditional touch-only tap had stopped
desktop setup. A local 1280×800 playthrough passed all 72 steps with zero errors.
Artifacts are retained for seven days. The complete final-source QA workflow passed:
[41977143775](https://github.com/ch-leon/nrl-sim/actions/runs/41977143775).

## Rival selection (#322)

`rivalTactics` still reads each rival's own nine. `RIVAL_STYLE.packStrength=1.0`
selects Tight for a pack stronger than its own side average, after the pace-first
Expansive choice. Strength contributes to both Carry and Offload, so this remains
directionally appropriate for the rebuilt Tight. A relative 1-point advantage
alone does not guarantee high absolute Tight fit: keep this distinction in #322.
The threshold is unchanged; AI counter-picking belongs to #469.

## Validation and handoff

At frozen game-code head `9e93548`, `npx tsc --noEmit`, `npm run build` and
`npx vitest run` passed: **222 files, 2,739 tests**. The paired whole-season RNG
control passed separately too. [CI 41977149417](https://github.com/ch-leon/nrl-sim/actions/runs/41977149417)
passed `check`, all four WebKit shards and the `webkit` aggregate.
[QA 41977143775](https://github.com/ch-leon/nrl-sim/actions/runs/41977143775)
passed its soak/playthrough and performance jobs. Final documentation/tooling-only
head checks are visible on [PR #506](https://github.com/ch-leon/nrl-sim/pull/506/checks).

Coverage includes the default-on/flat-fit/fingerprint cases in
`tests/match/balance/balance.test.ts`, side swap and break-time reselection in
`fitFixtures.test.ts`, unequal-fit cell gates in `counterFitScale.test.ts`,
the actual offload window and unchanged event draw count in
`allOutRecovery.test.ts`, and the paired season stream in `potentialRng.test.ts`.
No preset win bound was loosened. SAVE_VERSION stays 21; Labs/commercial defaults,
rival selection thresholds and live RNG call sites are untouched. Screenshots
remain artifacts. A separate checker using a different tool reviews #465 before
merge; this implementation does not authorize a merge.
