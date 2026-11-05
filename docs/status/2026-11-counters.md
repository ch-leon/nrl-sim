# Strategy counters switch-on (#465)

Leon’s 5 Nov decision resolves the checker’s acceptance blocker: **all eight
nonzero neutral cells must swing 4–6 win-share points, paired versus dormant**;
flat preset controls use **42–58%**; full-fit counters must swing **9 points or
stronger** (9–12 nominal). Distance from 50% is not the acceptance comparison.

For full fit, Leon explicitly specified: “Isolate counter + fit; hold Tight rebuild
on in both runs.” The tables retain the fully dormant endpoint and total change
separately, so neither Tight comparator is hidden. All match shares include half
a draw; career soak rates are raw wins/games.

All five counter switches remain on. The new `slide.allOutReset` extends the
existing offload receiver window by both starting-sheet fits: recovery ticks are
`round(base × (1 + allOutReset × attackFit × defenceFit + allOutRecovery × max(0, attackFit − defenceFit)))`.
At current defaults that is 120 ticks at neutral fit and 188 at 1.5 v 0.5.
The existing pass, kick, turnover and stoppage clearing rules hold. Raising only
the receiver’s bust chance saturated below the neutral swing target; the reset
window reaches +5.10pp without adding a clock or a random draw.

## Tuned defaults

| Group | Tuned defaults |
|---|---|
| Tight | on 1; offloadBase 1; offloadPerFit 8 |
| Own fit | on 1; edge 0.095 |
| Slide | on 1; expansive 0.08; expansiveFit 0.2; kickChase 0.6; tight 0.025; allOut 0.50; allOutRecovery 3; allOutReset 3 |
| Rush | on 1; carry 0.0005; defenceFit 0.029; kickChase 0.55; allOut 0.15 |
| Compressed | on 1; tight 0.04; tightFit 0.6; expansive 0.19; brokenBase −0.015; offloadBase −0.03; commitM 10 |

## Neutral before/after matrix

Selected calibration, 500 consecutive seeds both orientations, **1,000 matches
per cell**. Final actual-default reruns are in progress. The eight signed cells
all pass 4–6pp. Zero-cell raw changes are shown too: Tight’s independent rebuild
and common Compressed base mechanics can move outcomes without a cell term.

| Attack | Slide before → after (swing pp) | Rush before → after (swing pp) | Compressed before → after (swing pp) |
|---|---:|---:|---:|
| Tight | 48.30 → 53.75 (+5.45) | 46.70 → 47.85 (+1.15) | 47.40 → 42.05 (−5.35) |
| Expansive | 50.00 → 45.85 (−4.15) | 51.45 → 51.45 (+0.00) | 47.45 → 53.05 (+5.60) |
| Kick-chase | 52.75 → 48.20 (−4.55) | 52.15 → 57.95 (+5.80) | 49.25 → 50.70 (+1.45) |
| All-out | 51.70 → 56.80 (+5.10) | 46.80 → 41.35 (−5.45) | 47.80 → 50.40 (+2.60) |
| Balanced | 50.00 → 50.00 (+0.00) | 48.60 → 48.60 (+0.00) | 47.55 → 49.80 (+2.25) |

Flat attack controls versus Balanced/Slide are 53.75%, 45.85%, 48.20%, 56.80%
and 50.00%; defence-only controls are Rush 51.40% and Compressed 50.20%. All are
inside the owner-approved **42–58%** band. No other balance band changes.

## Full-fit comparison

Flat 60 playing stats; winning style fit 1.5 against losing style fit 0.5, reversed
for negative cells. Other selected fits remain exactly 1. The comparator holds
Tight’s independent rebuild on. Every counter + fit swing is at least 9pp with
the right sign, including the stronger Rush effects permitted by Leon’s decision.

| Cell | Tight-on comparator | Enabled | Counter + fit swing pp | Fully dormant | Total switch-on swing pp |
|---|---:|---:|---:|---:|---:|
| Tight / Slide | 53.00 | 62.20 | +9.20 | 48.30 | +13.90 |
| Expansive / Compressed | 47.45 | 56.90 | +9.45 | 47.45 | +9.45 |
| Kick-chase / Rush | 52.15 | 68.30 | +16.15 | 52.15 | +16.15 |
| All-out / Slide | 51.70 | 62.90 | +11.20 | 51.70 | +11.20 |
| Tight / Compressed | 49.10 | 39.55 | −9.55 | 47.40 | −7.85 |
| Expansive / Slide | 50.00 | 40.70 | −9.30 | 50.00 | −9.30 |
| Kick-chase / Slide | 52.75 | 42.30 | −10.45 | 52.75 | −10.45 |
| All-out / Rush | 46.80 | 33.25 | −13.55 | 46.80 | −13.55 |

Own-style fit is isolated on Balanced/Slide with fit-off/on controls: attack 1.5
50.00 → 53.55 (+3.55pp), attack 0.5 → 46.90 (−3.10pp), defence 1.5 → 53.10
(+3.10pp), defence 0.5 → 46.45 (−3.55pp), neutral 50.00 → 50.00. All stay within
four points. These neutral-style fixtures are unchanged by the other cell retune.

The current rating yardstick remains flat 62 v 60 **56.90% ±1.53pp**, and 65 v 60
**60.55% ±1.51pp**, 1,000 matches each; the final workflow repeats it.

Calibration sources: [paired cells](https://github.com/ch-leon/nrl-sim/actions/runs/41999419597),
[All-out reset](https://github.com/ch-leon/nrl-sim/actions/runs/42000392857),
[Kick-chase/Slide and strong pack](https://github.com/ch-leon/nrl-sim/actions/runs/42000714767).
Strong-pack Tight/Compressed records **6.432 offloads/match** at slope 8, despite
the stronger Compressed counter. The final workflow repeats all three defences.

## Deliberate replay re-pins

| Guard | Dormant main | Previous #465 calibration | Paired retune |
|---|---|---|---|
| Balanced / Slide | `10-26:350:34ab09d37c3de210` | same | same |
| Expansive / Slide | `8-10:377:e051c574b7fe72b5` | `10-38:372:0e0dce9822247ec4` | `10-38:372:0e0dce9822247ec4` |
| Season RNG | `3040797444` | `1010310188` | `1989516855` |

Reason: **strategy counters switched on, #465**, then retuned to paired neutral
swings per Leon’s decision. The Expansive/Slide counter is unchanged during this
retune, so its deliberately changed pin remains 10–38. Balanced/Slide keeps its
main pin: flat fits are exactly 1 and its cell is zero. New match outcomes change
the season’s existing RNG consumption. `potentialRng.test.ts` still compares a
complete season without UI reads with one reading projections/dots every week;
they finish on the same stream. These selected defaults and pins become the
subsequent guard after merge; this task alone authorizes the deliberate re-pin.

## Complete soak

Baseline main `e8b88be` ran the identical command before calibration:
`npm run soak -- --difficulties easy,normal,hard --jobs 4` (20 seeds × 5 planned
seasons × idle/managed × three difficulties), plus saves v1–20. Later main
`cd70565` only changes expansion intro/UI notification text; no match or economy
baseline changed. Every career is retained, including those sacked early.

| Difficulty | Mode | Careers | Seasons played | Wins/games | Win % | Mean final cash | Cash SE |
|---|---|---:|---:|---:|---:|---:|---:|
| Easy | idle | 20 | 99 | 1642/2376 | 69.108 | $1,290,528.95 | $102,516.34 |
| Easy | managed | 20 | 100 | 2083/2400 | 86.792 | $1,045,515.25 | $124,085.42 |
| Normal | idle | 20 | 85 | 1135/2040 | 55.637 | $665,151.85 | $139,193.72 |
| Normal | managed | 20 | 96 | 1831/2304 | 79.470 | $538,439.85 | $96,362.23 |
| Hard | idle | 20 | 61 | 693/1464 | 47.336 | $196,824.85 | $119,574.97 |
| Hard | managed | 20 | 86 | 1525/2064 | 73.886 | $182,415.95 | $66,588.79 |

Enabled full soak and six-row after table are pending the current source run:
[42002273925](https://github.com/ch-leon/nrl-sim/actions/runs/42002273925).
`check-counters-soak.py` requires all 140 cases, no problems/forfeits, Normal
idle and managed each within ±3 raw win points, and each cash mean within the
baseline mean ±2 baseline SE. Old-save versions 1–20 must all load.

## Remaining validation before ready

- Final actual-default matrices, fit rows, strong-pack and yardstick are running in [42002572946](https://github.com/ch-leon/nrl-sim/actions/runs/42002572946).
- The final round robin uses **1,000 matches per pairing**, all 105 pairs,
  **14,000 per plan**. Every plan average must stay at or below 53%.
- Full soak, QA/performance, both landscape phone playthroughs and latest PR CI
  must pass before this draft is marked ready. Previous calibration results are
  not claimed as final-source proof.

The saved-result checker `scripts/check-counters.ts` rejects missing, duplicated
or undersized cells. `acceptance.test.ts` explicitly rejects the checker’s old
+2.40, −1.95 and −7.55pp examples and tests the revised 42–58% boundaries and
full-fit ≥9pp rule. `allOutRecovery.test.ts` exercises the actual offload event,
both fits and unchanged draw counts. The near-tied kick-fielding fixture uses a 1.4 m defender gap against the 1 m
chaser gap under the weaker .6 cover strength; its low-fit, no-extra-reach,
kick-off and off-switch checks still hold. Existing fixture/replay/reselection
tests remain. `SAVE_VERSION` stays **21**, with Labs/commercial defaults untouched.

`RIVAL_STYLE.packStrength` remains **1.0**: rival styles still follow their own
nine; a strong pack’s Tight choice now creates the intended offload shape. Note
for #322: reassess style frequency with the existing squad heuristic and its
measured outcomes; this PR does not introduce task 12’s AI counter-picking.

Phone checks must open lineup and plan sheets and play to full time at
667×375 and 844×390, with screenshots kept in CI artifacts. The report POM
layout and desktop intro-driver fixes from this PR are retained.
