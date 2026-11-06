# Strategy counters switch-on (#465)

Leon’s 5 Nov acceptance decision requires **signed 4–6 point neutral swings paired against dormant main**, individual flat-preset controls within **42–58%**, and full-fit swings of **9 points or stronger** (9–12 nominal). Every acceptance cell retains 500 consecutive seeds in both orientations, 1,000 matches. Match win share counts a draw as half; career soak rates below are raw wins/games.

All five counter switches now default to 1. Own-style fit stays modest while unequal starting-sheet fits strengthen the nonzero cells. Compressed lines with a defending-fit advantage recruit existing middle help from farther away; neutral and strong attacking-pack help reach is unchanged. All-out extends the existing offload-receiver recovery window, cleared by the same pass/kick/turnover/stoppage events. No live RNG call site or stored stat was added.

Kick-chase’s base pass modifier moves from −0.05 to +0.04 on the existing passing roll, with step 1, early kicks and bomb weights retained. This common preset adjustment is needed for the fifteen-plan round robin. The neutral control explicitly restores legacy −0.05 and reproduces all fifteen immutable dormant-main shares. The full-fit control holds both the independent Tight rebuild and retuned passing weight fixed; fully dormant totals expose the whole switch-on effect separately. This follows Leon’s clarification: “Isolate counter + fit; hold Tight rebuild on in both runs.”

## Tuned defaults

| Group | Values |
|---|---|
| Tight | on 1; offloadBase 1; offloadPerFit 9.5 |
| Own fit | on 1; edge 0.06; counterResponse 1 |
| Slide | on 1; expansive 0.08; expansiveFit 0.2; kickChase 0.4; kickChaseFit 0.7; tight 0.025; allOut 0.5; allOutRecovery 3; allOutReset 3 |
| Rush | on 1; carry 0.0005; defenceFit 0.029; kickChase 0.61; allOut 0.1 |
| Compressed | on 1; tight 0.06; tightFit 0.6; expansive 0.09; brokenBase 0; offloadBase 0; commitM 10; commitFit 0.5 |
| Kick-chase preset | base pass +0.04; other preset weights retained |

The tuning reference §30–35 and Match rules §5 use these same values, including Tight’s 9.5 offload slope. At strong-pack fit 1.25 the pack multiplier is 3.375. At neutral fits the All-out receiver window is 120 ticks; fit 1.5 v 0.5 gives 188. Both use the existing live window.

## Neutral matrix

1,000 matches per cell: the same 500 consecutive seeds in both orientations. Values are win share before → after (signed swing in percentage points). The baseline restores every dormant-main control, including the legacy Kick-chase pass weight.

| Attack | Slide | Rush | Compressed |
|---|---|---|---|
| Tight | 48.30 → 53.75 (+5.45) | 46.70 → 47.85 (+1.15) | 47.40 → 42.65 (-4.75) |
| Expansive | 50.00 → 45.85 (-4.15) | 51.45 → 51.45 (+0.00) | 47.45 → 52.60 (+5.15) |
| Kick-chase | 52.75 → 46.90 (-5.85) | 52.15 → 56.65 (+4.50) | 49.25 → 50.45 (+1.20) |
| All-out | 51.70 → 56.80 (+5.10) | 46.80 → 42.65 (-4.15) | 47.80 → 49.30 (+1.50) |
| Balanced | 50.00 → 50.00 (+0.00) | 48.60 → 48.60 (+0.00) | 47.55 → 50.95 (+3.40) |

Individual attack controls against Balanced/Slide are Tight 53.75%, Balanced 50.00%, Expansive 45.85%, Kick-chase 46.90% and All-out 56.80%. Defence controls on Balanced are Slide 50.00%, Rush 51.40% and Compressed 49.05%. All are within 42–58%. Zero-cell raw changes remain visible above: independent Tight offloads, common Compressed contact baselines and the Kick-chase preset adjustment can change outcomes without a matchup-cell term.

## Full fit

Flat playing stats stay 60; the winning style has fit 1.5 and the losing style 0.5. The counter + fit control holds the independent Tight rebuild and the retuned Kick-chase passing weight fixed in both runs. The last two columns restore dormant main and expose the whole switch-on effect. The accepted threshold is 9 points or stronger, as Leon specified; 9–12 is nominal.

| Cell | Fixed-baseline control % | Enabled % | Counter + fit swing pp | Dormant main % | Whole change pp |
|---|---|---|---|---|---|
| Tight v Compressed | 49.10 | 37.45 | -11.65 | 47.40 | -9.95 |
| Tight v Slide | 54.30 | 65.20 | +10.90 | 48.30 | +16.90 |
| Expansive v Slide | 50.00 | 40.80 | -9.20 | 50.00 | -9.20 |
| Expansive v Compressed | 47.45 | 58.10 | +10.65 | 47.45 | +10.65 |
| All-out v Rush | 46.80 | 30.65 | -16.15 | 46.80 | -16.15 |
| All-out v Slide | 51.70 | 74.05 | +22.35 | 51.70 | +22.35 |
| Kick-chase v Slide | 49.70 | 39.95 | -9.75 | 52.75 | -12.80 |
| Kick-chase v Rush | 47.60 | 74.10 | +26.50 | 52.15 | +21.95 |

## Own fit, strong pack and yardstick

| Own-fit fixture | Before % | After % | Swing pp |
|---|---|---|---|
| attack fit 0.5 | 50.00 | 48.80 | -1.20 |
| neutral fit 1 | 50.00 | 50.00 | +0.00 |
| defence fit 1.5 | 50.00 | 51.20 | +1.20 |
| defence fit 0.5 | 50.00 | 49.90 | -0.10 |
| attack fit 1.5 | 50.00 | 50.10 | +0.10 |

| Strong-pack fixture | Offloads before | Offloads after | Share before % | Share after % |
|---|---|---|---|---|
| strong pack Tight v slide | 0.645 | 9.735 | 56.75 | 65.25 |
| strong pack Tight v compressed | 0.310 | 7.598 | 55.45 | 46.00 |
| strong pack Tight v rush | 0.669 | 8.614 | 55.10 | 62.05 |

| Rating yardstick | Win share % | SE pp | Matches |
|---|---|---|---|
| yardstick 62 v 60 | 56.80 | 1.533 | 1000 |
| yardstick 65 v 60 | 59.20 | 1.519 | 1000 |

## All 15 plans

Every unordered pairing retains 1,000 matches, 105,000 total and 14,000 per plan. No plan may average above 53%.

| Plan | Average win share % |
|---|---|
| All-out/Compressed | 49.835714 |
| All-out/Rush | 51.728571 |
| All-out/Slide | 50.300000 |
| Balanced/Compressed | 49.571429 |
| Balanced/Rush | 50.175000 |
| Balanced/Slide | 48.835714 |
| Expansive/Compressed | 50.307143 |
| Expansive/Rush | 51.410714 |
| Expansive/Slide | 49.471429 |
| Tight/Compressed | 47.753571 |
| Tight/Rush | 49.389286 |
| Tight/Slide | 47.421429 |
| Kick-chase/Compressed | 50.778571 |
| Kick-chase/Rush | 52.671429 |
| Kick-chase/Slide | 50.350000 |

## Dormant main baseline soak

| Difficulty | Mode | Careers | Career seasons | Wins/games | Win % | Mean final $ |
|---|---|---|---|---|---|---|
| easy | idle | 20 | 99 | 1642/2376 | 69.107744 | 1,290,528.95 |
| easy | managed | 20 | 100 | 2083/2400 | 86.791667 | 1,045,515.25 |
| normal | idle | 20 | 85 | 1135/2040 | 55.637255 | 665,151.85 |
| normal | managed | 20 | 96 | 1831/2304 | 79.470486 | 538,439.85 |
| hard | idle | 20 | 61 | 693/1464 | 47.336066 | 196,824.85 |
| hard | managed | 20 | 86 | 1525/2064 | 73.885659 | 182,415.95 |

## Enabled defaults soak

| Difficulty | Mode | Careers | Career seasons | Wins/games | Win % | Mean final $ |
|---|---|---|---|---|---|---|
| easy | idle | 20 | 99 | 1666/2376 | 70.117845 | 1,405,471.30 |
| easy | managed | 20 | 100 | 2136/2400 | 89.000000 | 1,137,673.60 |
| normal | idle | 20 | 80 | 1066/1920 | 55.520833 | 540,873.45 |
| normal | managed | 20 | 98 | 1917/2352 | 81.505102 | 724,604.00 |
| hard | idle | 20 | 60 | 721/1440 | 50.069444 | 150,525.75 |
| hard | managed | 20 | 87 | 1555/2088 | 74.473180 | 203,251.75 |

## Soak comparison

The full fixed cohort is 120 fresh careers (20 seeds × idle/managed × Easy/Normal/Hard), five planned seasons each, plus saves v1–20. The existing board can end careers early; every case remains included. Both complete 140-case runs have no problems or forfeits and load all 20 old saves. Normal idle and managed each must remain within ±3 win points; each mode’s mean final cash must remain within main’s mean ±2 main standard errors.

| Difficulty | Mode | Win swing pp | Mean final cash shift $ | Allowed cash shift ±$ |
|---|---|---|---|---|
| easy | idle | +1.010101 | +114,942.35 | 205,032.69 |
| easy | managed | +2.208333 | +92,158.35 | 248,170.84 |
| normal | idle | -0.116422 | -124,278.40 | 278,387.45 |
| normal | managed | +2.034616 | +186,164.15 | 192,724.46 |
| hard | idle | +2.733379 | -46,299.10 | 239,149.93 |
| hard | managed | +0.587521 | +20,835.80 | 133,177.57 |

## Raw evidence

[Final acceptance archive](https://github.com/ch-leon/nrl-sim/tree/balance-log/runs/20261105-142822-465-paired-final) (`20261105-142822-465-paired-final`) contains all saved measurements, original runnable plans/meta/reports, round-robin input provenance, the main and enabled soak masters, all seven enabled parts, phone reports and performance results. Screenshots are retained exclusively in the CI artifacts.

## Replay pins and guards

| Guard | Dormant main | Enabled defaults | Reason |
|---|---|---|---|
| Balanced / Slide, seed 1 | `10-26:350:34ab09d37c3de210` | `10-26:350:34ab09d37c3de210` | Flat fit is exactly 1 and the cell is zero. |
| Expansive / Slide, seed 1 | `8-10:377:e051c574b7fe72b5` | `10-38:372:0e0dce9822247ec4` | Deliberately re-pinned: strategy counters switched on, #465. |
| Season RNG exit seed | `3040797444` | `3040797444` | The final retune returns to main’s exit seed; weekly UI-read and no-read seasons still agree. |

The match-pin comment records the old Expansive value and reason. These active defaults and pins become the guard after merge. SAVE_VERSION remains **21**; Labs/commercial defaults and `src/core/state.ts` are untouched. The live sim adds no random draw: extra effects are functions of cached starting sheets or existing match events. Existing draws can occur differently when outcomes change.

`balance.test.ts` checks all five switches on, exact flat fit 1, the zero Balanced cell, both match pins, and that the enabled acceptance variant restores the actual live Kick-chase preset. `acceptance.test.ts` rejects the old +2.40/−1.95/−7.55 examples, requires paired signed swings, checks 42–58% and full-fit ≥9, and refuses altered dormant-main controls. Fit/reselection, both-orientation fixture, counter-event/draw-count and replay tests remain. `counterFitScale.test.ts` covers neutral identity, shared-fit gating, fitted middle help and kick cover. `shard.test.ts` verifies the unchanged 140-case partition; the merger rejects missing or duplicate shards/cases before the full-soak guard.

## Provenance and verification

The actual-default numeric, full-soak, QA/performance and phone evidence is from **137d48309d3d5832744e41d9b69afe3c12fb82de** in [run 42041401829](https://github.com/ch-leon/nrl-sim/actions/runs/42041401829). The baseline is immutable `e8b88be4ca94a2a9651688bdb55ae1832e0e5a61`; latest-main base `cd70565` contains the intervening intro/QA/UI and notification changes, with identical match/economy behaviour. [Main raw soak](https://github.com/ch-leon/nrl-sim/tree/balance-log/runs/20261105-031629-465-main-soak).

The round robin pools 66 unchanged pairs without Kick-chase from run 42018895938, 25 unchanged Kick-chase pairs at pass +0.04 from 42023741332/profile 1, and all 14 affected Rush pairs rerun at 0.61 in 42031855951/profile 0. Each pair keeps every seed in both orientations. All cached flat fits are exactly 1, so later own-fit/unequal-fit coefficients contribute zero; active parameters are identical to the final defaults. The archive preserves every original plan/meta/result/report and a per-cell source manifest. No partial sample or rounded 53% result is accepted.

The full soak uses the original 120 fresh cases plus saves v1–20, partitioned across seven runners with unchanged inputs; all seven raw parts and the merged master are retained. All 60 overlapping managed/old-save cases reproduce the separate selected-edge pilot exactly apart from wall time. Old saves have two planned continuation seasons; fresh careers have five, with the existing board able to end careers early. No case is dropped. The six cash bands use ±2 baseline standard errors, fixed before selecting this final candidate; no finance knob or band was changed.

Typecheck, the full unit suite, production build, all four WebKit shards and the WebKit aggregate pass in [source CI](https://github.com/ch-leon/nrl-sim/actions/runs/42041414960); [latest PR checks](https://github.com/ch-leon/nrl-sim/pull/506/checks) cover the final documentation/cleanup head. QA and every performance budget pass on the frozen engine source. At **667×375** the playthrough has **76** passing steps; **844×390** has **73**, both with zero failed steps, layout problems, errors or findings. Both open Lineup/Plan, apply a plan at half-time and reach full time. Saved home/away scores **22–46** and **24–27** match their scorebugs. The lineup, half-time and full-time screenshots were visually inspected at both sizes. Screenshots remain in the `acceptance-phone-667x375` and `acceptance-phone-844x390` CI artifacts, never commits.

The report Player of the Match row stays beside the fixed exit while outcome-dependent details scroll, satisfying the phone/WebKit visibility check. The desktop intro driver uses its existing tap helper. These verification fixes remain within this PR.

`RIVAL_STYLE.packStrength` remains **1.0**. Rivals still pick styles from their own nine; strong-pack Tight now has the intended offload shape. Note for **#322**: reassess style frequency with the existing heuristic and measured outcomes. This PR does not add task 12’s AI counter-picking.

Reproduce with the six committed `balance/plans/counters-{enabled,full-fit,fit-enabled,strong-pack,yardstick,round-robin}.json` plans and `npm run balance -- --plan <path> --jobs 4`. Check saved output with `npx vite-node scripts/check-counters.ts -- <kind> <run-dir>`. Run `npm run soak -- --difficulties easy,normal,hard --jobs 4`; `--shard i/7` partitions the same case list, and `scripts/merge-soak.py --out <master> <all seven JSONs>` pools it before `scripts/check-counters-soak.py <main.json> <master>`.

[Live build after merge](https://ch-leon.github.io/nrl-sim/): try Tight with a strong pack against Slide, then change plan at half-time. A separate checker on a different tool reviews this PR before merge.

## Speed on the edge (#322, 6 Nov)

Plan: issue #322, 6 Nov comment. Season measure: `npm run soak -- --live-rivals --seasons 3 --seeds 10 --difficulties normal --jobs 7` (about 11,000 rival-v-rival games; 10 seeds, not the plan's 20, for run time).

**Diagnostic first (no sim change).** The soak now prints each attack's fielded-nine shape and Expansive split by the defence it faced. Expansive nines are not weaker or older than the rest: stat means 53.5–54, age 24.9, the same as Balanced and Grind. Their backs are only +2.7 Speed over their own nine. The gap sits against Rush (−13.7 against strength) and Slide (−8.1); against Compressed Expansive is even (+1.1). So the gap is mostly not about Speed, and the plan's Slide-only lever B cannot carry it.

**Season soaks** (against strength, diff ± SE; level = wins ÷ games, clubs within 2):

| Run | Expansive | level | v Slide | v Rush | v Compressed | Tight | Balanced | Kick-chase | All-out | Rush D | Compressed D |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Before (main) | −8.4 ± 1.0 | 41% | −8.1 | −13.7 | +1.1 | +2.6 | −2.5 | +3.4 | +4.3 | +3.0 | −2.9 |
| A 0.012 wide one-on-one + B + C | −7.4 ± 1.1 | 39% | −6.6 | −12.0 | −0.1 | +3.0 | −2.9 | +3.7 | +2.6 | +3.5 | −2.7 |
| A 0.012 any numbers + B + C | −6.6 ± 1.0 | 43% | −4.8 | −11.9 | −1.8 | +4.2 | −3.2 | +1.5 | +2.7 | +3.7 | −3.1 |
| A 0.02 any numbers + B + C | −5.9 ± 1.0 | 44% | −4.6 | −9.3 | −3.1 | +3.5 | −3.8 | +2.9 | +4.0 | +3.3 | −2.0 |
| **Shipped: B + C** | −8.4 ± 1.1 | 41% | −6.9 | −14.2 | −3.9 | +3.7 | −2.5 | +1.8 | +3.6 | +4.0 | −1.7 |

**Why the edge race (A) ships off.** In the harness (`balance/plans/expansive-edge.json` and a guard run of A 0.02 any numbers), it moves the strength gap: 70 v 50 77% → 83% over 300 matches. It also pays fast-backs Balanced (49.2% → 57.3% share) more than fast-backs Expansive (46.0% → 51.5%), which is the must-pick risk. Fast backs on both sides stay near where they were (43.0% → 42.2%). Weaker settings barely move the season (−7.4).

**What ships.** `counters.slide.expansiveSigned` 1 and `counters.compressed.expansiveRelative` 1. Both are exactly zero at flat stats and equal fits. The 15 flat preset cells and the full-fit Expansive cells play bit for bit the same (`tests/match/balance/edgeRace.test.ts`), so the flat 42–58% shares, the neutral +4–6 swings, the full-fit 9+ swings, the dormant shares and both match pins are unchanged. They correct a sign: fast backs into an ordinary Slide line were charged more than a flat side. On the season they are inside luck.

**Still off.** Expansive stays −8.4 against strength and 41% level, mostly against Rush. A fix there is a Rush matchup question, not Speed.

