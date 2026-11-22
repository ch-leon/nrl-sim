# Balance: standard

The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** 7809de1 · **branch** main · **started** 2026-11-22T04:43:03.717Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 4.8 ↓ | 15.1 | 0.2 | 2.5 ↓ | 3.6 ↓ | 5.7 ↓ | 1.9 ↓ | 0.2 | 6.3 | 0.5 | 0.1 | 10.0 | 0.0 | 0.0 | 1.0 | 0.0 | 1.1 | 0.1 | 0.5 | 139.2 | 0.5 | 0.8 | 0.1 | 0.0 | 0.0 | 0.0 | 0.4 | 0.0 | 73.7 ✓ | 0.600 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 45% (30% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 70 | 5 | 0.4 | 13 | 0 | 8 | 0 | 39 | 39 | 63 | 21 | 16 | 27 | 5.3 | 0.40 | 54.3 |

_Tries 1.9 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 5.3 ↓ | 16.5 | 0.1 | 2.5 ↓ | 4.0 ↓ | 6.1 ↓ | 1.9 ↓ | 0.3 | 7.7 | 0.8 | 0.3 | 30.0 | 0.0 | 0.0 | 1.1 | 0.1 | 0.9 | 0.1 | 0.3 | 155.0 | 0.5 | 0.6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 69.9 ↓ | 0.600 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.450 | 55% (5% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 75 | 20 | 1.2 | 10 | 0 | 8 | 8 | 38 | 36 | 67 | 17 | 16 | 27 | 5.3 | 0.35 | 56.0 |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: runDowns 0.3 → 0.8 (+0.6*)

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 5.3 ↓ | 20.6 | 0.3 | 2.5 ↓ | 4.0 ↓ | 5.8 ↓ | 1.6 ↓ | 0.1 | 9.1 | 1.1 | 0.2 | 20.0 | 0.0 | 0.3 | 0.8 | 0.1 | 0.6 | 0.0 | 0.3 | 148.4 | 0.8 | 0.7 | 0.1 | 0.0 | 0.0 | 0.0 | 0.6 | 0.3 | 71.3 ✓ | 0.200 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.150 | 60% (15% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 95 | 10 | 0.6 | 13 | 0 | 0 | 13 | 35 | 39 | 65 | 23 | 12 | 30 | 5.3 | 0.20 | 55.4 |

_Tries 1.6 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 56.3 ↓ | 5.1 ↓ | 14.8 | 0.1 | 2.8 ↓ | 3.2 ↓ | 5.6 ↓ | 1.6 ↓ | 0.1 | 8.6 | 0.3 | 0.1 | 15.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.7 | 0.1 | 0.3 | 145.9 | 0.6 | 1.1 | 0.0 | 0.1 | 0.2 | -0.1 | 0.5 | 0.1 | 74.9 ✓ | 0.450 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 35% (30% drawn) | 0.71 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 75 | 10 | 0.6 | 3 | 0 | 3 | 6 | 37 | 50 | 57 | 27 | 16 | 27 | 5.7 | 0.50 | 54.6 |

_Tries 1.6 and last tackles 9.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.2 ↓ | 5.0 ↓ | 16.4 | 0.3 | 2.5 ↓ | 3.4 ↓ | 6.0 ↓ | 1.6 ↓ | 0.1 | 7.5 | 0.6 | 0.2 | 16.0 | 0.0 | 0.1 | 0.8 | 0.1 | 0.7 | 0.1 | 0.5 | 154.1 | 0.6 | 0.8 | 0.0 | 0.1 | 0.1 | 0.3 | 0.6 | 0.1 | 74.7 ✓ | 0.640 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.540 | 44% (18% drawn) | 46.0% (20.5% drawn) | 0.71 | 92%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 89 | 15 | 0.5 | 12 | 0 | 6 | 2 | 34 | 45 | 62 | 24 | 15 | 28 | 5.3 | 0.58 | 56.1 |

_Tries 1.6 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: lostInContact 0.4 → 0.6 (+0.2*); baseline: completion 77.6 → 74.7 (-2.9*)

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.3 ↓ | 5.6 ↓ | 16.4 | 0.3 | 2.8 ↓ | 3.4 ↓ | 5.2 ↓ | 1.5 ↓ | 0.2 | 7.3 | 0.7 | 0.4 | 29.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.6 | 0.1 | 0.4 | 129.6 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.1 | 74.0 ✓ | 0.480 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.430 | 44% (24% drawn) | 41.0% (20.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.14 | 82 | 12 | 0.3 | 10 | 0 | 5 | 3 | 41 | 41 | 57 | 27 | 17 | 26 | 5.6 | 0.24 | 55.2 |

_Tries 1.5 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.6 ↓ | 16.4 | 0.3 | 2.4 ↓ | 3.7 ↓ | 6.0 ↓ | 1.6 ↓ | 0.1 | 7.3 | 0.7 | 0.3 | 22.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.3 | 0.1 | 0.6 | 138.6 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.0 | 72.7 ✓ | 0.740 | 0.050 ↓ | 0.010 ↓ | 0.000 ✓ | 0.680 | 36% (19% drawn) | 40.5% (16.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.11 | 83 | 11 | 0.4 | 11 | 0 | 4 | 5 | 34 | 45 | 66 | 22 | 12 | 27 | 5.4 | 0.70 | 54.7 |

_Tries 1.6 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: breaks 15.2 → 16.4 (+1.2*); baseline: bigHits 6.4 → 7.3 (+0.9*); baseline: runDowns 0.5 → 0.7 (+0.2*); baseline: touchFinds 0.5 → 0.3 (-0.2*)

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 6.1 ↓ | 18.4 | 0.3 | 3.5 ↓ | 3.5 ↓ | 5.1 ↓ | 1.7 ↓ | 0.1 | 7.0 | 0.9 | 0.3 | 29.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.5 | 0.0 | 0.4 | 121.9 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.1 | 0.4 | 0.1 | 73.8 ✓ | 0.480 | 0.090 ↓ | 0.010 ↓ | 0.000 ✓ | 0.380 | 46% (18% drawn) | 40.0% (20.5% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.12 | 79 | 16 | 0.5 | 9 | 0 | 10 | 6 | 41 | 34 | 57 | 23 | 20 | 27 | 5.4 | 0.24 | 54.8 |

_Tries 1.7 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: runDowns 0.7 → 0.9 (+0.3*)

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 4.6 ↓ | 22.4 | 0.2 | 2.4 ↓ | 3.7 ↓ | 5.6 ↓ | 2.0 ↓ | 0.2 | 9.2 | 0.9 | 0.3 | 22.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.1 | 0.4 | 131.0 | 0.9 | 0.7 | 0.0 | 0.1 | 0.3 | 0.5 | 0.5 | 0.1 | 73.9 ✓ | 0.580 | 0.110 ↓ | 0.010 ↓ | 0.000 ✓ | 0.460 | 43% (15% drawn) | 35.5% (17.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 75 | 18 | 0.7 | 14 | 0 | 5 | 10 | 35 | 38 | 62 | 24 | 14 | 27 | 5.4 | 0.37 | 54.1 |

_Tries 2.0 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.6 ↓ | 16.6 | 0.3 | 2.4 ↓ | 3.6 ↓ | 5.7 ↓ | 1.6 ↓ | 0.1 | 7.4 | 0.6 | 0.3 | 25.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.6 | 0.1 | 0.5 | 142.4 | 0.5 | 0.8 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 73.3 ✓ | 0.570 | 0.100 ↓ | 0.010 ↓ | 0.000 ✓ | 0.460 | 43% (25% drawn) | 38.0% (23.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.19 | 86 | 11 | 0.5 | 11 | 0 | 4 | 9 | 33 | 43 | 63 | 22 | 16 | 26 | 5.4 | 0.39 | 55.6 |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.6 ↓ | 5.5 ↓ | 16.3 | 0.6 | 2.0 ↓ | 3.9 ↓ | 5.3 ↓ | 2.1 ↓ | 0.1 | 7.3 | 0.6 | 0.4 | 40.0 | 0.0 | 0.1 | 0.9 | 0.0 | 0.4 | 0.0 | 0.5 | 110.7 | 0.8 | 1.1 | 0.1 | 0.1 | 0.1 | 0.2 | 0.6 | 0.1 | 73.9 ✓ | 0.400 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 60% (5% drawn) | 0.72 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.45 | 95 | 30 | 1.4 | 19 | 0 | 0 | 10 | 38 | 33 | 58 | 25 | 17 | 27 | 5.5 | 0.40 | 52.8 |

_Tries 2.1 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.4 ↓ | 9.4 ↓ | 19.9 | 0.2 | 2.3 ↓ | 3.7 ↓ | 4.5 ↓ | 3.0 ↓ | 0.3 | 6.3 | 1.6 | 0.5 | 35.0 | 0.0 | 0.0 | 1.8 | 0.1 | 0.3 | 0.0 | 0.1 | 103.0 | 0.8 | 0.8 | 0.1 | 0.0 | 0.0 | 0.0 | 0.6 | 0.0 | 75.5 ✓ | 0.450 | 0.250 ✓ | 0.000 ↓ | 0.000 ✓ | 0.200 | 60% | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 60 | 10 | 0.9 | 13 | 0 | 3 | 11 | 31 | 41 | 56 | 25 | 19 | 26 | 5.3 | 0.15 | 53.5 |

_Tries 3.0 and last tackles 7.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: touchFinds 0.6 → 0.3 (-0.3*); baseline: deadBalls 0.5 → 0.1 (-0.3*); baseline: kickMetres 135.0 → 103.0 (-32.0*)

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 3.3 ↓ | 15.3 | 2.6 | 1.6 ↓ | 3.8 ↓ | 6.3 ↓ | 1.6 ↓ | 0.1 | 5.2 | 0.4 | 0.3 | 20.0 | 3.5 | 11.0 | 0.6 | 0.2 | 0.6 | 0.0 | 0.6 | 159.2 | 0.3 | 0.4 | 0.0 | 0.0 | 0.0 | 0.0 | 0.2 | 0.0 | 71.9 ✓ | 0.500 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.458 | 40% (5% drawn) | 0.67 | 54%/54% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 90 | 40 | 0.5 | 13 | 0 | 3 | 5 | 29 | 50 | 64 | 20 | 15 | 28 | 5.8 | 0.46 | 54.4 |

_Tries 1.6 and last tackles 9.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_13 cells in 468 s._
