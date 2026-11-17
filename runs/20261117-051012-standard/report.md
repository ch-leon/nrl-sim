# Balance: standard

The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** f465021 · **branch** main · **started** 2026-11-17T05:10:12.445Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.9 ↓ | 4.8 ↓ | 15.2 | 0.5 | 2.0 ↓ | 3.4 ↓ | 6.2 ↓ | 1.8 ↓ | 0.2 | 6.2 | 0.6 | 0.1 | 10.0 | 0.0 | 0.0 | 1.1 | 0.1 | 0.6 | 0.0 | 0.3 | 140.5 | 0.7 | 0.7 | 0.0 | 0.1 | 0.1 | 0.0 | 0.6 | 0.0 | 74.0 ✓ | 0.750 | 0.250 ✓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 45% (15% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 85 | 25 | 1.1 | 17 | 0 | 3 | 17 | 28 | 36 | 66 | 22 | 12 | 28 | 5.3 | 0.60 | 55.8 |

_Tries 1.8 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.6 ↓ | 5.8 ↓ | 16.1 | 0.1 | 1.8 ↓ | 3.4 ↓ | 5.0 ↓ | 2.1 ↓ | 0.3 | 7.3 | 0.5 | 0.1 | 15.0 | 0.0 | 0.1 | 1.6 | 0.1 | 0.5 | 0.1 | 0.7 | 101.0 | 0.5 | 0.7 | 0.0 | 0.1 | 0.0 | 0.0 | 0.3 | 0.1 | 74.3 ✓ | 0.700 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.550 | 30% (20% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 20 | 0.9 | 7 | 0 | 5 | 7 | 30 | 51 | 54 | 29 | 17 | 29 | 5.4 | 0.45 | 53.4 |

_Tries 2.2 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: kickMetres 134.2 → 101.0 (-33.2*)

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.5 ↓ | 5.1 ↓ | 19.5 | 0.1 | 2.3 ↓ | 3.6 ↓ | 5.4 ↓ | 1.8 ↓ | 0.1 | 10.2 | 1.2 | 0.2 | 10.0 | 0.0 | 0.2 | 1.1 | 0.1 | 0.9 | 0.1 | 0.5 | 141.0 | 1.0 | 0.9 | 0.0 | 0.1 | 0.1 | 0.3 | 0.3 | 0.3 | 74.7 ✓ | 0.550 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 30% (5% drawn) | 0.66 | 94%/94% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 85 | 15 | 0.6 | 11 | 0 | 11 | 9 | 29 | 40 | 60 | 21 | 19 | 25 | 5.5 | 0.25 | 57.2 |

_Tries 1.8 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.6 ↓ | 5.3 ↓ | 15.3 | 0.1 | 2.1 ↓ | 3.2 ↓ | 5.6 ↓ | 1.4 ↓ | 0.1 | 8.0 | 0.6 | 0.5 | 35.0 | 0.0 | 0.1 | 0.7 | 0.2 | 1.0 | 0.1 | 0.7 | 145.2 | 0.7 | 0.3 | 0.1 | 0.1 | 0.3 | 0.1 | 0.3 | 0.1 | 77.2 ✓ | 0.750 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.650 | 35% (20% drawn) | 0.72 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 95 | 15 | 0.3 | 10 | 0 | 10 | 3 | 24 | 52 | 55 | 31 | 14 | 26 | 5.6 | 0.60 | 56.2 |

_Tries 1.4 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: fieldGoals 0.0 → 0.2 (+0.2*)

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.3 ↓ | 4.7 ↓ | 14.9 | 0.3 | 1.9 ↓ | 3.6 ↓ | 6.2 ↓ | 1.6 ↓ | 0.2 | 7.5 | 0.5 | 0.2 | 20.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.8 | 0.0 | 0.5 | 159.9 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | -0.1 | 0.4 | 0.1 | 74.8 ✓ | 0.570 | 0.070 ↓ | 0.010 ↓ | 0.000 ✓ | 0.490 | 39% (26% drawn) | 41.5% (23.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.12 | 83 | 13 | 0.5 | 8 | 0 | 4 | 5 | 41 | 42 | 64 | 27 | 9 | 28 | 5.3 | 0.59 | 55.6 |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: binSwing 0.1 → -0.1 (-0.2*)

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.3 ↓ | 5.3 ↓ | 15.7 | 0.4 | 2.5 ↓ | 3.4 ↓ | 5.2 ↓ | 1.6 ↓ | 0.1 | 7.2 | 0.7 | 0.3 | 22.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.1 | 0.5 | 123.9 | 0.6 | 0.6 | 0.0 | 0.0 | 0.0 | 0.1 | 0.4 | 0.1 | 74.3 ✓ | 0.450 | 0.060 ↓ | 0.020 ↓ | 0.000 ✓ | 0.370 | 48% (17% drawn) | 47.5% (17.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 85 | 15 | 0.8 | 9 | 0 | 4 | 9 | 40 | 38 | 56 | 25 | 19 | 27 | 5.5 | 0.18 | 54.7 |

_Tries 1.6 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: shortMin 0.2 → 0.0 (-0.2*)

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 5.1 ↓ | 15.9 | 0.3 | 1.9 ↓ | 3.6 ↓ | 6.0 ↓ | 1.4 ↓ | 0.1 | 6.9 | 0.6 | 0.3 | 20.0 | 0.0 | 0.0 | 0.8 | 0.2 | 0.5 | 0.0 | 0.6 | 148.6 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 74.1 ✓ | 0.730 | 0.080 ↓ | 0.010 ↓ | 0.000 ✓ | 0.640 | 40% (21% drawn) | 40.5% (17.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.08 | 80 | 9 | 0.3 | 14 | 0 | 4 | 6 | 30 | 46 | 65 | 22 | 12 | 27 | 5.5 | 0.82 | 55.3 |

_Tries 1.4 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.8 ↓ | 17.2 | 0.3 | 3.3 ↓ | 3.9 ↓ | 4.8 ↓ | 1.7 ↓ | 0.1 | 7.0 | 0.8 | 0.3 | 24.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.5 | 0.0 | 0.4 | 111.9 | 0.5 | 0.7 | 0.0 | 0.1 | 0.1 | 0.2 | 0.6 | 0.1 | 71.1 ✓ | 0.440 | 0.060 ↓ | 0.020 ↓ | 0.000 ✓ | 0.360 | 45% (21% drawn) | 44.5% (19.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 85 | 13 | 0.5 | 8 | 0 | 10 | 10 | 35 | 37 | 55 | 23 | 23 | 26 | 5.5 | 0.24 | 54.5 |

_Tries 1.7 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 4.8 ↓ | 21.9 | 0.2 | 2.3 ↓ | 3.7 ↓ | 5.2 ↓ | 1.8 ↓ | 0.2 | 8.8 | 0.9 | 0.4 | 34.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.0 | 0.5 | 126.5 | 0.8 | 0.7 | 0.1 | 0.1 | 0.3 | 0.3 | 0.6 | 0.1 | 72.5 ✓ | 0.500 | 0.120 ↓ | 0.000 ↓ | 0.000 ✓ | 0.380 | 42% (21% drawn) | 46.0% (19.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 87 | 18 | 0.8 | 12 | 0 | 4 | 8 | 34 | 42 | 59 | 25 | 16 | 26 | 5.4 | 0.30 | 54.0 |

_Tries 1.8 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 6.0 ↓ | 16.2 | 0.3 | 2.2 ↓ | 3.8 ↓ | 5.3 ↓ | 1.7 ↓ | 0.2 | 6.5 | 0.7 | 0.2 | 17.0 | 0.0 | 0.1 | 1.0 | 0.2 | 0.6 | 0.1 | 0.6 | 124.0 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.2 | 0.5 | 0.1 | 73.0 ✓ | 0.710 | 0.050 ↓ | 0.040 ↓ | 0.000 ✓ | 0.620 | 38% (21% drawn) | 41.5% (18.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 85 | 17 | 0.8 | 13 | 0 | 6 | 4 | 36 | 42 | 60 | 26 | 13 | 27 | 5.4 | 0.41 | 54.7 |

_Tries 1.7 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: heldUpMatches 29.0 → 17.0 (-12.0*); baseline: lostInContact 0.3 → 0.5 (+0.2*)

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 4.9 ↓ | 15.3 | 0.7 | 2.6 ↓ | 4.0 ↓ | 5.2 ↓ | 1.6 ↓ | 0.1 | 7.2 | 0.8 | 0.1 | 5.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.6 | 0.1 | 0.5 | 121.2 | 0.7 | 0.7 | 0.1 | 0.1 | 0.4 | 0.7 | 0.5 | 0.0 | 73.8 ✓ | 0.550 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 75% (10% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 85 | 25 | 0.9 | 12 | 0 | 6 | 3 | 33 | 45 | 60 | 25 | 15 | 26 | 5.2 | 0.15 | 53.5 |

_Tries 1.7 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** baseline: heldUpMatches 30.0 → 5.0 (-25.0*); baseline: deadBalls 0.1 → 0.5 (+0.3*)

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.8 ↓ | 9.7 ↓ | 19.1 | 0.1 | 1.5 ↓ | 3.9 ↓ | 4.7 ↓ | 2.5 ↓ | 0.1 | 6.0 | 1.6 | 0.3 | 30.0 | 0.0 | 0.1 | 1.3 | 0.1 | 0.8 | 0.1 | 0.6 | 111.4 | 0.3 | 1.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.4 | 0.1 | 70.9 ✓ | 0.700 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.650 | 45% (15% drawn) | 0.71 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 75 | 25 | 0.7 | 10 | 0 | 2 | 8 | 24 | 55 | 61 | 25 | 13 | 29 | 5.3 | 0.15 | 55.0 |

_Tries 2.5 and last tackles 7.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.2 ↓ | 4.1 ↓ | 16.0 | 2.9 | 1.6 ↓ | 3.6 ↓ | 5.7 ↓ | 1.8 ↓ | 0.1 | 6.6 | 0.6 | 0.5 | 50.0 | 3.3 | 10.5 | 1.1 | 0.1 | 0.6 | 0.0 | 0.3 | 147.5 | 0.5 | 0.4 | 0.0 | 0.0 | 0.0 | 0.0 | 0.4 | 0.0 | 71.8 ✓ | 0.417 | 0.083 ↓ | 0.042 ↓ | 0.000 ✓ | 0.292 | 55% (15% drawn) | 0.67 | 52%/52% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 70 | 10 | 0.3 | 7 | 0 | 2 | 5 | 41 | 45 | 61 | 24 | 15 | 27 | 5.7 | 0.04 | 54.2 |

_Tries 1.8 and last tackles 9.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_13 cells in 232 s._
