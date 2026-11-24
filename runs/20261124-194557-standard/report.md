# Balance: standard

The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** 61b2fc7 · **branch** main · **started** 2026-11-24T19:45:57.788Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.4 ↓ | 13.4 | 0.3 | 2.9 ↓ | 3.5 ↓ | 5.7 ↓ | 1.9 ↓ | 0.1 | 7.0 | 0.8 | 0.2 | 20.0 | 5.3 | 1.9 | 0.3 | 0.1 | 0.0 | 0.1 | 1.1 | 0.1 | 0.9 | 0.1 | 0.3 | 146.6 | 0.7 | 0.8 | 0.0 | 0.1 | 0.2 | -0.1 | 0.5 | 0.1 | 74.1 ✓ | 0.350 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 0.1 | 0.1 | 40% (25% drawn) | 0.71 | 94%/94% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 5 | 1.1 | 7.6 | 7.6 | — | 3.00 | 2.40 | 8 | 0 | 3 | 3 | 36 | 51 | 64 | 22 | 14 | 26 | 5.4 | 0.30 | 54.1 | 6.1 | 0.6 |

_Tries 1.9 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/0 | — | — | — | — | — |
| baseline | 20m | 3/4 | 75.0% | 10.2 (3) | 43.4 (1) | 0/3 | 1/1 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 36 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.0 ↓ | 16.4 | 0.3 | 1.9 ↓ | 3.9 ↓ | 5.8 ↓ | 1.5 ↓ | 0.1 | 6.7 | 0.5 | 0.4 | 30.0 | 4.3 | 1.9 | 0.7 | 0.1 | 0.0 | 0.1 | 0.8 | 0.1 | 0.8 | 0.1 | 0.3 | 149.0 | 0.5 | 0.8 | 0.0 | 0.1 | 0.2 | 0.3 | 0.6 | 0.1 | 72.6 ✓ | 0.650 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.550 | 0.1 | 0.3 | 20% (20% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 90 | 5 | 1.4 | 6.8 | 6.8 | — | 2.35 | 2.60 | 10 | 0 | 0 | 10 | 23 | 57 | 64 | 21 | 15 | 29 | 5.2 | 0.50 | 57.1 | 6.1 | 1.2 |

_Tries 1.5 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/1 | 0.0% | — | 1.7 (1) | — | 0/1 |
| baseline | 20m | 4/6 | 66.7% | 10.1 (4) | 12.9 (2) | 0/4 | 0/2 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 26 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: offloads 3.2 → 1.9 (-1.4*)

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 5.0 ↓ | 22.9 | 0.1 | 2.8 ↓ | 3.7 ↓ | 6.0 ↓ | 1.6 ↓ | 0.0 | 8.6 | 1.1 | 0.4 | 35.0 | 5.5 | 2.3 | 0.6 | 0.1 | 0.0 | 0.1 | 0.8 | 0.1 | 0.6 | 0.1 | 0.5 | 137.8 | 0.9 | 0.8 | 0.0 | 0.2 | 0.4 | 0.2 | 0.8 | 0.1 | 73.7 ✓ | 0.600 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.550 | 0.2 | 0.1 | 50% (15% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 85 | 10 | 0.6 | 8.3 | 8.3 | — | 2.15 | 2.90 | 13 | 0 | 6 | 6 | 37 | 37 | 69 | 21 | 10 | 25 | 5.7 | 0.40 | 55.0 | 4.1 | 0.7 |

_Tries 1.6 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/5 | 0.0% | — | 5.8 (5) | — | 1/5 |
| baseline | 20m | 4/7 | 57.1% | 17.3 (4) | 5.6 (3) | 1/4 | 0/3 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 42 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: lateBusts 0.5 → 0.1 (-0.4*); baseline: sinBins 0.0 → 0.2 (+0.2*)

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.8 ↓ | 5.4 ↓ | 15.1 | 0.5 | 1.9 ↓ | 3.6 ↓ | 5.2 ↓ | 1.6 ↓ | 0.1 | 8.1 | 0.7 | 0.4 | 30.0 | 4.9 | 2.5 | 0.3 | 0.1 | 0.0 | 0.1 | 0.8 | 0.3 | 0.8 | 0.1 | 0.8 | 125.0 | 0.8 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.6 | 0.1 | 75.0 ✓ | 0.550 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 0.2 | 0.1 | 35% (25% drawn) | 0.71 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 80 | 20 | 0.8 | 7.8 | 7.8 | — | 2.70 | 2.70 | 6 | 0 | 0 | 3 | 39 | 52 | 54 | 33 | 13 | 27 | 5.4 | 0.45 | 55.0 | 6.8 | 0.7 |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/3 | 0.0% | — | 2.5 (3) | — | 0/3 |
| baseline | 20m | 5/9 | 55.6% | 8.7 (5) | 12.6 (4) | 0/5 | 1/4 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 34 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** nothing beyond noise.

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.2 ↓ | 4.8 ↓ | 15.2 | 0.3 | 2.4 ↓ | 3.5 ↓ | 6.3 ↓ | 1.5 ↓ | 0.1 | 7.7 | 0.6 | 0.2 | 21.0 | 5.2 | 2.4 | 0.4 | 0.1 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.0 | 0.5 | 160.3 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.1 | 0.5 | 0.1 | 75.9 ✓ | 0.660 | 0.060 ↓ | 0.020 ↓ | 0.000 ✓ | 0.580 | 0.1 | 0.1 | 42% (26% drawn) | 42.0% (21.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.13 | 83 | 15 | 0.3 | 8.5 | 8.5 | — | 2.40 | 2.40 | 8 | 0 | 1 | 7 | 32 | 51 | 64 | 23 | 13 | 28 | 5.5 | 0.55 | 56.7 | 4.9 | 0.8 |

_Tries 1.5 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/7 | 0.0% | — | 2.7 (7) | — | 0/7 |
| baseline | 20m | 24/47 | 51.1% | 10.3 (24) | 11.8 (23) | 0/24 | 11/23 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 148 | 0 | 0/100 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** nothing beyond noise.

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.8 ↓ | 5.0 ↓ | 15.7 | 0.4 | 2.9 ↓ | 3.3 ↓ | 5.7 ↓ | 1.5 ↓ | 0.1 | 7.7 | 0.6 | 0.3 | 27.0 | 5.1 | 2.3 | 0.4 | 0.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.8 | 0.1 | 0.4 | 140.7 | 0.6 | 0.6 | 0.0 | 0.1 | 0.2 | 0.1 | 0.5 | 0.1 | 76.5 ✓ | 0.470 | 0.080 ↓ | 0.010 ↓ | 0.000 ✓ | 0.380 | 0.1 | 0.1 | 34% (22% drawn) | 36.0% (21.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.12 | 85 | 10 | 0.3 | 8.3 | 8.3 | — | 2.52 | 2.48 | 13 | 0 | 7 | 5 | 31 | 45 | 60 | 23 | 16 | 26 | 5.6 | 0.20 | 55.7 | 5.8 | 1.6 |

_Tries 1.5 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/6 | 0.0% | — | 3.7 (6) | — | 0/6 |
| baseline | 20m | 13/28 | 46.4% | 8.3 (13) | 11.9 (15) | 1/13 | 6/15 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 174 | 0 | 0/100 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: tries 1.9 → 1.5 (-0.4*); baseline: bonusTries 0.3 → 0.1 (-0.1*); baseline: goals 1.1 → 0.8 (-0.3*); baseline: completion 73.2 → 76.5 (+3.3*)

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.3 ↓ | 15.9 | 0.3 | 2.1 ↓ | 3.5 ↓ | 6.4 ↓ | 1.6 ↓ | 0.2 | 7.0 | 0.7 | 0.3 | 27.0 | 4.9 | 2.1 | 0.5 | 0.1 | 0.0 | 0.0 | 0.9 | 0.2 | 0.6 | 0.1 | 0.6 | 159.8 | 0.5 | 0.6 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 75.0 ✓ | 0.830 | 0.110 ↓ | 0.020 ↓ | 0.000 ✓ | 0.700 | 0.0 | 0.1 | 44% (11% drawn) | 44.0% (12.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.28 | 84 | 21 | 0.7 | 8.3 | 8.3 | — | 2.63 | 2.63 | 8 | 0 | 5 | 8 | 35 | 44 | 69 | 22 | 9 | 26 | 5.6 | 0.81 | 55.5 | 5.3 | 0.9 |

_Tries 1.6 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/2 | 0.0% | — | 2.3 (2) | — | 0/2 |
| baseline | 20m | 28/47 | 59.6% | 10.7 (28) | 9.9 (19) | 2/28 | 3/19 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 183 | 0 | 0/100 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: kicks 5.9 → 6.4 (+0.5*)

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 5.7 ↓ | 16.6 | 0.2 | 3.2 ↓ | 3.8 ↓ | 5.3 ↓ | 1.9 ↓ | 0.2 | 7.3 | 0.8 | 0.4 | 31.0 | 4.7 | 2.1 | 0.5 | 0.1 | 0.0 | 0.1 | 1.1 | 0.1 | 0.8 | 0.0 | 0.5 | 130.2 | 0.7 | 0.7 | 0.0 | 0.1 | 0.3 | 0.4 | 0.5 | 0.1 | 72.9 ✓ | 0.480 | 0.040 ↓ | 0.020 ↓ | 0.000 ✓ | 0.420 | 0.1 | 0.1 | 47% (10% drawn) | 50.5% (14.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 84 | 17 | 0.9 | 8.3 | 8.3 | — | 3.02 | 2.63 | 10 | 0 | 9 | 2 | 31 | 48 | 60 | 21 | 19 | 26 | 5.7 | 0.23 | 54.4 | 5.6 | 1.2 |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/11 | 0.0% | — | 7.2 (11) | — | 3/11 |
| baseline | 20m | 17/32 | 53.1% | 10.7 (17) | 10.7 (15) | 0/17 | 2/15 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 179 | 1 | 1/100 (1.0%) | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: heldUp 0.2 → 0.4 (+0.2*)

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 5.0 ↓ | 21.4 | 0.2 | 2.6 ↓ | 3.8 ↓ | 5.5 ↓ | 2.0 ↓ | 0.1 | 8.7 | 0.8 | 0.3 | 27.0 | 4.5 | 2.0 | 0.3 | 0.1 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.0 | 0.3 | 136.3 | 0.9 | 0.6 | 0.1 | 0.1 | 0.3 | 0.6 | 0.5 | 0.2 | 73.5 ✓ | 0.490 | 0.160 ↓ | 0.000 ↓ | 0.000 ✓ | 0.330 | 0.2 | 0.2 | 39% (15% drawn) | 39.5% (16.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 79 | 15 | 1.0 | 7.9 | 7.9 | — | 2.61 | 2.39 | 18 | 0 | 3 | 11 | 31 | 38 | 62 | 23 | 15 | 26 | 5.6 | 0.31 | 54.4 | 5.4 | 1.6 |

_Tries 2.0 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 1/16 | 6.3% | 9.9 (1) | 7.5 (15) | 0/1 | 2/15 |
| baseline | 20m | 10/27 | 37.0% | 9.6 (10) | 10.6 (17) | 0/10 | 4/17 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 219 | 2 | 2/100 (2.0%) | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: sixAgains 0.8 → 0.6 (-0.3*)

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.4 ↓ | 16.4 | 0.3 | 2.4 ↓ | 3.4 ↓ | 5.9 ↓ | 1.7 ↓ | 0.2 | 7.1 | 0.6 | 0.3 | 23.0 | 4.5 | 1.9 | 0.5 | 0.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.0 | 0.6 | 139.5 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.4 | 0.3 | 0.1 | 74.8 ✓ | 0.660 | 0.070 ↓ | 0.030 ↓ | 0.000 ✓ | 0.560 | 0.1 | 0.1 | 38% (14% drawn) | 41.5% (17.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.13 | 78 | 9 | 0.4 | 8.4 | 8.4 | — | 2.84 | 2.59 | 18 | 0 | 5 | 5 | 33 | 38 | 64 | 24 | 13 | 27 | 5.5 | 0.40 | 54.9 | 5.3 | 1.9 |

_Tries 1.7 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/6 | 0.0% | — | 5.8 (6) | — | 1/6 |
| baseline | 20m | 28/43 | 65.1% | 10.6 (28) | 6.2 (15) | 1/28 | 3/15 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 197 | 0 | 0/100 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** nothing beyond noise.

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.3 ↓ | 6.0 ↓ | 15.8 | 0.6 | 2.6 ↓ | 3.4 ↓ | 4.3 ↓ | 1.3 ↓ | 0.1 | 7.2 | 0.8 | 0.2 | 15.0 | 4.6 | 1.9 | 0.4 | 0.1 | 0.0 | 0.1 | 0.9 | 0.3 | 0.6 | 0.1 | 0.5 | 107.3 | 0.8 | 0.7 | 0.1 | 0.1 | 0.2 | 0.0 | 0.5 | 0.1 | 74.1 ✓ | 0.500 | 0.050 ↓ | 0.050 ✓ | 0.000 ✓ | 0.400 | 0.2 | 0.1 | 35% (35% drawn) | 0.72 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 95 | 25 | 0.3 | 9.0 | 9.0 | — | 3.05 | 2.90 | 8 | 0 | 0 | 4 | 60 | 28 | 51 | 31 | 18 | 25 | 5.5 | 0.40 | 54.6 | 2.8 | 0.5 |

_Tries 1.3 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/2 | 0.0% | — | 5.5 (2) | — | 1/2 |
| baseline | 20m | 4/11 | 36.4% | 10.5 (4) | 13.2 (7) | 0/4 | 3/7 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 32 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: kicks 5.6 → 4.3 (-1.3*)

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 49.1 ↓ | 9.6 ↓ | 18.4 | 0.2 | 2.0 ↓ | 3.1 ↓ | 5.0 ↓ | 2.9 ↓ | 0.2 | 6.0 | 1.4 | 0.6 | 50.0 | 4.8 | 1.9 | 0.7 | 0.1 | 0.0 | 0.1 | 1.5 | 0.1 | 0.8 | 0.0 | 0.1 | 132.0 | 0.8 | 0.7 | 0.0 | 0.1 | 0.3 | 0.5 | 0.1 | 0.1 | 76.1 ✓ | 0.350 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 0.1 | 0.3 | 55% (30% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 65 | 10 | 1.2 | 8.1 | 8.1 | — | 4.55 | 5.00 | 0 | 0 | 2 | 21 | 32 | 46 | 63 | 21 | 16 | 28 | 5.5 | 0.20 | 55.5 | 7.8 | 2.3 |

_Tries 2.9 and last tackles 7.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 0/2 | 0.0% | — | 5.1 (2) | — | 0/2 |
| baseline | 20m | 1/3 | 33.3% | 8.7 (1) | 2.9 (2) | 0/1 | 0/2 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 34 | 0 | 0/20 (0.0%) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: deadBalls 0.5 → 0.1 (-0.3*); baseline: lostInContact 0.6 → 0.1 (-0.5*)

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 4.2 ↓ | 16.7 | 2.4 | 2.3 ↓ | 3.1 ↓ | 5.3 ↓ | 2.2 ↓ | 0.3 | 4.5 | 0.7 | 0.3 | 30.0 | 4.5 | 1.9 | 0.2 | 0.1 | 3.2 | 11.5 | 1.2 | 0.0 | 0.9 | 0.0 | 0.3 | 148.7 | 0.9 | 0.7 | 0.0 | 0.1 | 0.4 | -0.1 | 0.4 | 0.0 | 74.4 ✓ | 0.333 | 0.083 ↓ | 0.000 ↓ | 0.000 ✓ | 0.250 | 0.1 | 0.1 | 35% (20% drawn) | 0.69 | 56%/57% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.33 | 75 | 5 | 1.6 | 14.6 | 8.9 | 19.7 | 2.05 | 2.95 | 6 | 0 | 2 | 15 | 40 | 37 | 56 | 30 | 14 | 27 | 5.7 | 0.21 | 53.3 | 6.9 | 1.8 |

_Tries 2.2 and last tackles 9.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 1/2 | 50.0% | 5.4 (1) | 1.4 (1) | 0/1 | 0/1 |
| baseline | 20m | 0/6 | 0.0% | — | 8.1 (6) | — | 1/6 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 49 | 1 | 1/20 (5.0%) | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

**Changed since the previous run:** baseline: bonusTries 0.0 → 0.3 (+0.3*); baseline: penalties 0.4 → 0.9 (+0.5*)

_13 cells in 692 s._
