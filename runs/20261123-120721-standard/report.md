# Balance: standard

The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** d855d36c · **branch** HEAD · **started** 2026-11-23T12:07:21.224Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.1 ↓ | 15.6 | 0.5 | 3.0 ↓ | 3.5 ↓ | 5.5 ↓ | 1.6 ↓ | 0.1 | 7.2 | 0.5 | 0.6 | 35.0 | 5.2 | 2.4 | 0.0 | 0.1 | 0.7 | 0.0 | 0.8 | 0.1 | 0.6 | 141.8 | 0.4 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 75.0 ✓ | 0.450 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 35% (30% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 85 | 15 | 0.3 | 6 | 0 | 0 | 9 | 44 | 41 | 61 | 26 | 12 | 27 | 5.6 | 0.10 | 54.4 |

_Tries 1.6 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: goals 1.3 → 0.7 (-0.6*); baseline: fieldGoals 0.3 → 0.0 (-0.3*)

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.3 ↓ | 16.3 | 0.1 | 2.9 ↓ | 4.8 ↓ | 5.8 ↓ | 1.6 ↓ | 0.2 | 6.8 | 0.5 | 0.1 | 15.0 | 5.2 | 2.4 | 0.0 | 0.0 | 0.9 | 0.1 | 0.8 | 0.1 | 0.3 | 146.7 | 0.5 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.7 | 0.0 | 69.8 ↓ | 0.800 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.650 | 40% (25% drawn) | 0.69 | 91%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 85 | 20 | 0.5 | 19 | 0 | 0 | 3 | 44 | 34 | 63 | 23 | 14 | 26 | 5.2 | 0.45 | 54.9 |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: heldUp 0.5 → 0.1 (-0.3*)

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.9 ↓ | 5.0 ↓ | 21.5 | 0.3 | 2.4 ↓ | 4.0 ↓ | 6.0 ↓ | 1.4 ↓ | 0.0 | 8.8 | 0.8 | 0.3 | 20.0 | 5.3 | 2.1 | 0.0 | 0.1 | 0.8 | 0.1 | 1.0 | 0.1 | 0.6 | 147.7 | 1.1 | 0.8 | 0.0 | 0.3 | 0.5 | 0.8 | 0.8 | 0.1 | 71.7 ✓ | 0.500 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 50% (15% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 95 | 5 | 0.7 | 7 | 0 | 7 | 4 | 25 | 57 | 68 | 18 | 14 | 26 | 5.7 | 0.35 | 56.6 |

_Tries 1.4 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: tries 2.4 → 1.4 (-1.0*); baseline: subs 0.3 → 0.1 (-0.3*); baseline: goals 1.4 → 0.8 (-0.6*); baseline: shortMin 0.0 → 0.5 (+0.5*); baseline: injuries 0.3 → 0.1 (-0.3*)

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 56.0 ↓ | 4.5 ↓ | 14.6 | 0.3 | 2.2 ↓ | 3.1 ↓ | 6.3 ↓ | 1.4 ↓ | 0.1 | 7.2 | 0.6 | 0.4 | 40.0 | 4.5 | 2.1 | 0.0 | 0.1 | 0.9 | 0.1 | 0.9 | 0.0 | 0.5 | 171.1 | 1.1 | 0.8 | 0.0 | 0.1 | 0.0 | 0.0 | 0.6 | 0.1 | 78.9 ✓ | 0.500 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 35% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 80 | 20 | 0.8 | 10 | 0 | 7 | 3 | 45 | 34 | 61 | 25 | 14 | 28 | 5.6 | 0.80 | 56.6 |

_Tries 1.4 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.0 ↓ | 5.0 ↓ | 15.7 | 0.3 | 2.2 ↓ | 3.6 ↓ | 6.3 ↓ | 1.5 ↓ | 0.1 | 7.4 | 0.6 | 0.3 | 26.0 | 5.4 | 2.5 | 0.0 | 0.1 | 1.0 | 0.1 | 0.9 | 0.0 | 0.5 | 162.5 | 0.5 | 0.8 | 0.0 | 0.0 | 0.1 | 0.0 | 0.5 | 0.1 | 75.3 ✓ | 0.670 | 0.050 ↓ | 0.020 ↓ | 0.000 ✓ | 0.600 | 43% (19% drawn) | 40.5% (19.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 81 | 18 | 0.7 | 6 | 0 | 3 | 4 | 37 | 50 | 65 | 23 | 11 | 28 | 5.4 | 0.57 | 55.8 |

_Tries 1.5 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.1 ↓ | 5.2 ↓ | 15.7 | 0.3 | 2.9 ↓ | 3.6 ↓ | 5.5 ↓ | 1.6 ↓ | 0.2 | 7.1 | 0.7 | 0.3 | 24.0 | 5.0 | 2.2 | 0.0 | 0.1 | 1.0 | 0.1 | 0.9 | 0.1 | 0.5 | 135.1 | 0.6 | 0.6 | 0.0 | 0.1 | 0.2 | -0.1 | 0.5 | 0.1 | 73.8 ✓ | 0.510 | 0.100 ↓ | 0.010 ↓ | 0.000 ✓ | 0.400 | 34% (25% drawn) | 36.0% (21.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 85 | 15 | 0.9 | 15 | 0 | 4 | 5 | 34 | 43 | 61 | 24 | 15 | 27 | 5.6 | 0.21 | 56.0 |

_Tries 1.6 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: binSwing 0.2 → -0.1 (-0.3*)

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.3 ↓ | 15.4 | 0.3 | 1.7 ↓ | 3.8 ↓ | 6.1 ↓ | 1.7 ↓ | 0.1 | 6.8 | 0.6 | 0.3 | 26.0 | 4.7 | 2.1 | 0.0 | 0.0 | 1.0 | 0.0 | 0.6 | 0.0 | 0.5 | 150.3 | 0.6 | 0.6 | 0.0 | 0.1 | 0.2 | 0.1 | 0.5 | 0.1 | 73.6 ✓ | 0.680 | 0.080 ↓ | 0.030 ↓ | 0.000 ✓ | 0.570 | 30% (26% drawn) | 36.5% (24.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 87 | 16 | 0.5 | 8 | 0 | 5 | 8 | 32 | 48 | 67 | 21 | 12 | 25 | 5.6 | 0.64 | 55.3 |

_Tries 1.7 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 5.7 ↓ | 16.3 | 0.2 | 3.2 ↓ | 4.2 ↓ | 4.9 ↓ | 1.9 ↓ | 0.2 | 7.4 | 0.8 | 0.3 | 24.0 | 4.8 | 2.2 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.0 | 0.5 | 115.6 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 70.3 ✓ | 0.450 | 0.070 ↓ | 0.030 ↓ | 0.000 ✓ | 0.350 | 52% (12% drawn) | 49.5% (13.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.22 | 82 | 22 | 0.7 | 10 | 0 | 10 | 5 | 32 | 44 | 58 | 24 | 18 | 26 | 5.7 | 0.26 | 53.3 |

_Tries 1.9 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.2 ↓ | 4.8 ↓ | 22.2 | 0.2 | 2.5 ↓ | 3.5 ↓ | 5.5 ↓ | 1.9 ↓ | 0.1 | 9.4 | 0.9 | 0.3 | 23.0 | 4.6 | 2.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.1 | 0.5 | 132.1 | 1.0 | 0.6 | 0.1 | 0.1 | 0.2 | 0.5 | 0.4 | 0.2 | 75.0 ✓ | 0.640 | 0.160 ↓ | 0.020 ↓ | 0.000 ✓ | 0.460 | 46% (9% drawn) | 44.0% (15.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 78 | 15 | 0.7 | 16 | 0 | 3 | 6 | 35 | 41 | 62 | 23 | 15 | 25 | 5.5 | 0.32 | 55.1 |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: touchFinds 0.9 → 0.7 (-0.3*)

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 5.7 ↓ | 16.0 | 0.3 | 2.6 ↓ | 3.8 ↓ | 5.8 ↓ | 1.7 ↓ | 0.1 | 7.2 | 0.6 | 0.3 | 27.0 | 4.8 | 1.9 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.1 | 0.5 | 141.3 | 0.5 | 0.6 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 72.5 ✓ | 0.610 | 0.090 ↓ | 0.040 ↓ | 0.000 ✓ | 0.480 | 34% (24% drawn) | 41.0% (19.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 86 | 14 | 0.6 | 14 | 0 | 7 | 5 | 36 | 38 | 65 | 22 | 13 | 27 | 5.4 | 0.26 | 54.8 |

_Tries 1.7 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 5.6 ↓ | 15.2 | 0.8 | 2.8 ↓ | 3.6 ↓ | 5.3 ↓ | 1.6 ↓ | 0.1 | 6.8 | 0.7 | 0.2 | 15.0 | 4.9 | 1.9 | 0.0 | 0.1 | 1.1 | 0.1 | 0.8 | 0.1 | 0.3 | 128.8 | 0.8 | 0.6 | 0.0 | 0.1 | 0.2 | 0.3 | 0.7 | 0.1 | 75.0 ✓ | 0.700 | 0.150 ↓ | 0.050 ✓ | 0.000 ✓ | 0.500 | 25% (35% drawn) | 0.72 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 90 | 10 | 0.4 | 9 | 0 | 3 | 3 | 41 | 44 | 58 | 24 | 18 | 24 | 5.5 | 0.35 | 55.5 |

_Tries 1.6 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.5 ↓ | 8.2 ↓ | 18.3 | 0.1 | 2.3 ↓ | 3.9 ↓ | 5.4 ↓ | 2.4 ↓ | 0.2 | 7.0 | 1.2 | 0.5 | 45.0 | 5.1 | 2.4 | 0.0 | 0.1 | 1.2 | 0.1 | 0.4 | 0.0 | 0.3 | 131.0 | 0.9 | 0.7 | 0.1 | 0.1 | 0.2 | 0.4 | 0.4 | 0.1 | 71.3 ✓ | 0.700 | 0.300 ✓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 65% (15% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 75 | 0 | 0.5 | 11 | 0 | 6 | 13 | 32 | 38 | 64 | 24 | 12 | 25 | 5.9 | 0.35 | 55.0 |

_Tries 2.4 and last tackles 8.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 3.7 ↓ | 16.5 | 3.2 | 2.2 ↓ | 4.1 ↓ | 5.9 ↓ | 1.1 ↓ | 0.1 | 4.9 | 0.4 | 0.2 | 15.0 | 4.3 | 1.6 | 4.3 | 11.0 | 0.6 | 0.2 | 1.0 | 0.0 | 0.5 | 149.7 | 0.4 | 0.4 | 0.0 | 0.1 | 0.4 | 0.1 | 0.5 | 0.0 | 67.3 ↓ | 0.375 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.375 | 30% (20% drawn) | 0.68 | 50%/50% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 95 | 15 | 0.8 | 7 | 0 | 7 | 7 | 41 | 37 | 60 | 26 | 14 | 27 | 5.8 | 0.63 | 53.8 |

_Tries 1.1 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_13 cells in 1096 s._
