# Balance: standard

The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** c300281 · **branch** feat/match-attacking-shapes · **started** 2026-11-17T05:54:58.331Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.8 ↓ | 16.7 | 0.3 | 2.4 ↓ | 3.2 ↓ | 5.5 ↓ | 2.0 ↓ | 0.1 | 7.3 | 0.7 | 0.3 | 25.0 | 0.0 | 0.1 | 0.8 | 0.1 | 0.8 | 0.1 | 0.6 | 133.5 | 0.5 | 0.9 | 0.1 | 0.1 | 0.0 | 0.3 | 0.5 | 0.1 | 75.3 ✓ | 0.650 | 0.100 ↓ | 0.100 ✓ | 0.000 ✓ | 0.450 | 45% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 80 | 5 | 0.8 | 8 | 0 | 5 | 8 | 30 | 50 | 61 | 25 | 14 | 29 | 5.4 | 0.25 | 54.2 |

_Tries 2.0 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.8 ↓ | 15.5 | 0.2 | 2.4 ↓ | 3.7 ↓ | 5.4 ↓ | 2.0 ↓ | 0.2 | 7.1 | 0.6 | 0.5 | 30.0 | 0.0 | 0.0 | 0.9 | 0.1 | 0.6 | 0.0 | 0.4 | 119.2 | 0.5 | 1.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.4 | 0.0 | 73.9 ✓ | 0.600 | 0.200 ✓ | 0.050 ✓ | 0.000 ✓ | 0.350 | 55% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 70 | 5 | 1.1 | 15 | 0 | 5 | 10 | 34 | 37 | 59 | 27 | 14 | 25 | 5.4 | 0.65 | 54.1 |

_Tries 2.0 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 4.7 ↓ | 21.6 | 0.2 | 2.6 ↓ | 3.8 ↓ | 5.8 ↓ | 1.9 ↓ | 0.1 | 8.3 | 0.7 | 0.3 | 15.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.9 | 0.1 | 0.6 | 140.2 | 1.0 | 0.8 | 0.0 | 0.1 | 0.2 | 0.4 | 0.5 | 0.2 | 71.9 ✓ | 0.550 | 0.050 ↓ | 0.050 ✓ | 0.000 ✓ | 0.450 | 55% (10% drawn) | 0.67 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 75 | 15 | 1.3 | 5 | 0 | 5 | 11 | 45 | 34 | 64 | 19 | 18 | 28 | 5.4 | 0.45 | 53.7 |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 56.0 ↓ | 3.9 ↓ | 15.1 | 0.3 | 2.5 ↓ | 3.3 ↓ | 5.3 ↓ | 1.6 ↓ | 0.1 | 7.7 | 0.7 | 0.3 | 25.0 | 0.0 | 0.1 | 0.8 | 0.3 | 0.9 | 0.0 | 0.3 | 141.5 | 0.8 | 0.9 | 0.0 | 0.1 | 0.2 | 0.1 | 0.7 | 0.1 | 77.8 ✓ | 0.650 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.550 | 45% (15% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 95 | 5 | 0.7 | 12 | 0 | 3 | 0 | 61 | 24 | 56 | 29 | 15 | 26 | 5.3 | 0.20 | 54.9 |

_Tries 1.6 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: lineBreaks 5.3 → 3.9 (-1.5*); baseline: sixAgains 0.3 → 0.9 (+0.7*)

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.4 ↓ | 5.1 ↓ | 16.4 | 0.3 | 2.2 ↓ | 3.5 ↓ | 5.9 ↓ | 1.4 ↓ | 0.1 | 7.4 | 0.8 | 0.2 | 17.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.7 | 0.1 | 0.4 | 151.9 | 0.6 | 0.8 | 0.0 | 0.0 | 0.1 | 0.1 | 0.6 | 0.1 | 74.0 ✓ | 0.710 | 0.080 ↓ | 0.000 ↓ | 0.000 ✓ | 0.630 | 44% (22% drawn) | 42.5% (20.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.21 | 83 | 14 | 0.5 | 11 | 0 | 4 | 4 | 34 | 47 | 60 | 26 | 14 | 28 | 5.2 | 0.69 | 56.4 |

_Tries 1.4 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: breaks 14.9 → 16.4 (+1.5*)

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 5.6 ↓ | 15.6 | 0.2 | 2.4 ↓ | 3.6 ↓ | 5.4 ↓ | 1.8 ↓ | 0.1 | 7.0 | 0.6 | 0.3 | 24.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.0 | 0.5 | 132.9 | 0.6 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.6 | 0.1 | 73.1 ✓ | 0.600 | 0.070 ↓ | 0.020 ↓ | 0.000 ✓ | 0.510 | 42% (20% drawn) | 37.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.19 | 78 | 16 | 0.6 | 8 | 0 | 4 | 3 | 37 | 47 | 60 | 24 | 16 | 27 | 5.5 | 0.27 | 54.3 |

_Tries 1.8 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: lateBusts 0.4 → 0.2 (-0.2*)

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 5.3 ↓ | 15.5 | 0.3 | 2.2 ↓ | 4.0 ↓ | 5.8 ↓ | 1.7 ↓ | 0.1 | 6.8 | 0.7 | 0.3 | 27.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.4 | 0.0 | 0.6 | 138.7 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.6 | 0.1 | 70.8 ✓ | 0.690 | 0.030 ↓ | 0.040 ↓ | 0.000 ✓ | 0.620 | 41% (17% drawn) | 41.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 83 | 11 | 0.5 | 8 | 0 | 5 | 4 | 39 | 43 | 64 | 22 | 14 | 27 | 5.3 | 0.70 | 54.8 |

_Tries 1.7 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: fieldGoals 0.2 → 0.1 (-0.1*); baseline: completion 74.1 → 70.8 (-3.3*)

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 6.0 ↓ | 18.6 | 0.3 | 3.2 ↓ | 3.6 ↓ | 4.6 ↓ | 1.9 ↓ | 0.2 | 7.3 | 0.8 | 0.3 | 29.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.1 | 0.5 | 113.3 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.1 | 0.3 | 0.1 | 73.1 ✓ | 0.450 | 0.070 ↓ | 0.020 ↓ | 0.000 ✓ | 0.360 | 52% (21% drawn) | 43.0% (22.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.22 | 81 | 13 | 0.9 | 10 | 0 | 12 | 5 | 33 | 40 | 54 | 27 | 20 | 26 | 5.5 | 0.20 | 54.4 |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: breaks 17.2 → 18.6 (+1.4*); baseline: lostInContact 0.6 → 0.3 (-0.2*)

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.0 ↓ | 22.1 | 0.2 | 2.3 ↓ | 4.0 ↓ | 5.3 ↓ | 1.8 ↓ | 0.1 | 9.3 | 0.9 | 0.3 | 22.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.0 | 0.4 | 130.8 | 0.9 | 0.9 | 0.0 | 0.1 | 0.2 | 0.1 | 0.6 | 0.1 | 72.3 ✓ | 0.480 | 0.090 ↓ | 0.010 ↓ | 0.000 ✓ | 0.380 | 41% (20% drawn) | 40.5% (19.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 78 | 11 | 0.7 | 14 | 0 | 5 | 7 | 29 | 45 | 62 | 27 | 11 | 27 | 5.4 | 0.27 | 55.3 |

_Tries 1.8 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 5.3 ↓ | 16.6 | 0.4 | 2.4 ↓ | 3.7 ↓ | 5.6 ↓ | 1.8 ↓ | 0.1 | 7.3 | 0.6 | 0.3 | 24.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.6 | 0.1 | 0.4 | 135.1 | 0.6 | 0.6 | 0.0 | 0.1 | 0.2 | 0.4 | 0.5 | 0.0 | 73.9 ✓ | 0.620 | 0.130 ↓ | 0.010 ↓ | 0.000 ✓ | 0.480 | 36% (18% drawn) | 33.0% (23.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 86 | 20 | 0.8 | 12 | 0 | 3 | 6 | 37 | 41 | 63 | 22 | 15 | 27 | 5.4 | 0.28 | 54.7 |

_Tries 1.8 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: lineBreaks 6.0 → 5.3 (-0.7*); baseline: bigHits 6.5 → 7.3 (+0.8*)

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.9 ↓ | 6.1 ↓ | 16.9 | 0.8 | 1.6 ↓ | 3.1 ↓ | 5.5 ↓ | 1.6 ↓ | 0.1 | 6.3 | 0.7 | 0.4 | 30.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.3 | 0.1 | 0.7 | 126.9 | 0.4 | 1.1 | 0.0 | 0.1 | 0.3 | 0.3 | 0.5 | 0.1 | 74.1 ✓ | 0.550 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 65% (10% drawn) | 0.72 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 80 | 15 | 0.7 | 12 | 0 | 0 | 18 | 30 | 39 | 61 | 21 | 18 | 26 | 5.3 | 0.15 | 54.5 |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: offloads 2.6 → 1.6 (-1.0*); baseline: heldUpMatches 5.0 → 30.0 (+25.0*)

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.4 ↓ | 10.1 ✓ | 19.6 | 0.3 | 2.1 ↓ | 4.3 ↓ | 5.0 ↓ | 2.5 ↓ | 0.3 | 6.3 | 1.6 | 0.6 | 35.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.3 | 108.4 | 0.6 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 71.6 ✓ | 0.500 | 0.250 ✓ | 0.000 ↓ | 0.000 ✓ | 0.250 | 50% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.05 | 65 | 0 | 0.3 | 10 | 0 | 0 | 12 | 33 | 45 | 60 | 26 | 14 | 27 | 5.2 | 0.35 | 53.3 |

_Tries 2.5 and last tackles 7.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: grubberTurnovers 0.7 → 0.3 (-0.4*)

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.1 ↓ | 3.3 ↓ | 16.4 | 3.5 | 1.9 ↓ | 3.7 ↓ | 5.1 ↓ | 1.9 ↓ | 0.2 | 4.5 | 0.5 | 0.3 | 20.0 | 4.9 | 10.6 | 1.3 | 0.1 | 0.6 | 0.0 | 0.4 | 127.5 | 0.3 | 0.8 | 0.0 | 0.1 | 0.1 | 0.3 | 0.3 | 0.1 | 71.3 ✓ | 0.500 | 0.042 ↓ | 0.042 ↓ | 0.000 ✓ | 0.417 | 35% (15% drawn) | 0.68 | 55%/55% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.42 | 75 | 25 | 0.8 | 17 | 0 | 4 | 13 | 39 | 26 | 56 | 27 | 18 | 27 | 5.6 | 0.33 | 53.2 |

_Tries 1.9 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: bigHits 6.6 → 4.5 (-2.1*); baseline: heldUpMatches 50.0 → 20.0 (-30.0*)

_13 cells in 190 s._
