# Balance: standard, receiver on v off

balance/plans/standard.json as written, at the weighted receiver default (baseline: live.receiverMargin 2, spread 2) and off (margin 0), #649 step 1 (PR #684).

**commit** a65edf9 · **branch** claude/exciting-goldberg-3lccgc · **started** 2026-11-13T08:51:14.654Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.2 ↓ | 16.9 | 0.3 | 2.9 ↓ | 3.9 ↓ | 5.6 ↓ | 1.9 ↓ | 0.3 | 7.5 | 0.9 | 0.0 | 0.0 | 1.3 | 0.1 | 0.5 | 0.1 | 0.3 | 132.4 | 0.6 | 0.8 | 0.0 | 0.1 | 0.2 | 0.7 | 0.3 | 0.1 | 70.6 ✓ | 0.400 | 0.150 ↓ | 0.000 ↓ | 0.000 ✓ | 0.250 | 50% (10% drawn) | 0.70 | 93%/93% |
| receiver off | 52.0 ↓ (+0.7) | 6.1 ↓ (+0.9) | 15.4 (-1.5) | 0.3 (+0.0) | 2.4 ↓ (-0.5) | 4.0 ↓ (+0.1) | 5.7 ↓ (+0.1) | 1.4 ↓ (-0.5) | 0.1 (-0.2) | 7.3 (-0.2) | 0.6 (-0.3) | 0.0 (+0.0) | 0.1 (+0.1) | 0.8 (-0.5) | 0.1 (+0.1) | 0.7 (+0.2) | 0.0 (-0.1) | 0.8 (+0.5*) | 138.9 (+6.4) | 0.3 (-0.3) | 0.8 (+0.1) | 0.1 (+0.1) | 0.1 (-0.1) | 0.2 (+0.0) | 0.1 (-0.6) | 0.6 (+0.3) | 0.1 (+0.0) | 72.6 ✓ (+2.0) | 0.950 (+0.5*) | 0.150 ↓ (+0.0) | 0.100 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.700 (+0.4*) | 55% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 60 | 15 | 0.3 | 15 | 0 | 0 | 5 | 33 | 46 | 67 | 24 | 9 | 26 | 5.4 |
| receiver off | 0.10 (-0.2) | 75 (+15.0) | 10 (-5.0) | 0.2 (-0.1) | 7 (-8.5) | 0 (+0.0) | 0 (+0.0) | 3 (-1.7) | 45 (+11.5) | 45 (-1.3) | 62 (-4.9) | 25 (+1.4) | 12 (+3.5) | 32 (+5.6*) | 4.7 (-0.7*) |

_Tries 2.0 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.2 ↓ | 14.3 | 0.3 | 2.4 ↓ | 3.3 ↓ | 6.4 ↓ | 1.6 ↓ | 0.3 | 7.3 | 0.7 | 0.0 | 0.1 | 0.8 | 0.1 | 0.8 | 0.1 | 0.7 | 163.9 | 0.4 | 0.7 | 0.0 | 0.1 | 0.2 | 0.0 | 0.5 | 0.1 | 73.7 ✓ | 0.750 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.650 | 30% (5% drawn) | 0.70 | 92%/94% |
| receiver off | 50.9 ↓ (-1.5) | 4.9 ↓ (-0.3) | 14.8 (+0.5) | 0.1 (-0.1) | 2.1 ↓ (-0.3) | 3.7 ↓ (+0.4) | 6.4 ↓ (+0.0) | 2.2 ↓ (+0.6) | 0.1 (-0.1) | 6.3 (-1.0) | 0.5 (-0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.4) | 0.1 (-0.1) | 0.7 (-0.1) | 0.1 (-0.1) | 0.5 (-0.2) | 147.9 (-15.9) | 0.8 (+0.3) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.2 (-0.0) | 0.5 (+0.5) | 0.3 (-0.2) | 0.1 (+0.0) | 74.7 ✓ (+1.0) | 0.850 (+0.1) | 0.150 ↓ (+0.0) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.650 (+0.0) | 40% (5% drawn) | 0.70 | 93%/94% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 75 | 0 | 0.6 | 9 | 0 | 6 | 6 | 36 | 42 | 68 | 24 | 9 | 26 | 5.4 |
| receiver off | 0.25 (+0.1) | 80 (+5.0) | 15 (+15.0) | 0.5 (-0.1) | 14 (+4.5) | 0 (+0.0) | 0 (-6.1) | 0 (-6.1) | 36 (+0.0) | 50 (+7.6) | 70 (+2.1) | 21 (-2.4) | 9 (+0.3) | 30 (+3.9*) | 4.9 (-0.5*) |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 5.2 ↓ | 21.1 | 0.3 | 2.9 ↓ | 3.4 ↓ | 5.7 ↓ | 2.5 ↓ | 0.3 | 9.1 | 1.0 | 0.0 | 0.1 | 1.6 | 0.0 | 0.6 | 0.0 | 0.2 | 134.6 | 1.0 | 0.7 | 0.0 | 0.1 | 0.1 | 0.4 | 0.5 | 0.3 | 76.4 ✓ | 0.650 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.550 | 40% (20% drawn) | 0.67 | 94%/93% |
| receiver off | 51.8 ↓ (+0.3) | 4.5 ↓ (-0.7) | 20.3 (-0.8) | 0.1 (-0.2) | 2.9 ↓ (+0.0) | 3.5 ↓ (+0.2) | 6.1 ↓ (+0.4) | 2.0 ↓ (-0.5) | 0.2 (-0.1) | 8.9 (-0.2) | 0.6 (-0.4) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.6) | 0.1 (+0.1) | 0.8 (+0.3) | 0.1 (+0.1) | 0.6 (+0.4) | 157.6 (+23.0) | 0.7 (-0.3) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.2) | -0.2 (-0.6) | 0.4 (-0.1) | 0.1 (-0.1) | 72.6 ✓ (-3.8) | 0.550 (-0.1) | 0.200 ✓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (-0.2) | 25% (10% drawn) | 0.70 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 80 | 15 | 0.6 | 12 | 0 | 12 | 10 | 38 | 28 | 63 | 26 | 12 | 26 | 5.4 |
| receiver off | 0.30 (-0.0) | 85 (+5.0) | 20 (+5.0) | 1.6 (+1.0) | 10 (-2.0) | 0 (+0.0) | 0 (-12.0*) | 8 (-2.5) | 30 (-8.0) | 53 (+24.5*) | 67 (+4.3) | 24 (-1.9) | 9 (-2.4) | 29 (+3.1) | 4.8 (-0.6*) |

_Tries 2.5 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.1 ↓ | 5.1 ↓ | 16.4 | 0.3 | 1.9 ↓ | 3.8 ↓ | 6.5 ↓ | 1.5 ↓ | 0.1 | 7.1 | 0.5 | 0.0 | 0.1 | 1.1 | 0.1 | 0.8 | 0.0 | 0.5 | 168.8 | 0.7 | 0.8 | 0.0 | 0.1 | 0.3 | 0.4 | 0.7 | 0.1 | 73.6 ✓ | 0.700 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.600 | 50% (30% drawn) | 0.70 | 93%/93% |
| receiver off | 54.9 ↓ (-0.3) | 5.3 ↓ (+0.3) | 16.1 (-0.3) | 0.3 (-0.0) | 2.3 ↓ (+0.4) | 2.6 ↓ (-1.2) | 6.1 ↓ (-0.4) | 1.8 ↓ (+0.3) | 0.3 (+0.2) | 7.8 (+0.7) | 0.4 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.1) | 0.2 (+0.2) | 0.8 (+0.1) | 0.0 (+0.0) | 0.5 (-0.0) | 171.5 (+2.7) | 0.8 (+0.2) | 0.6 (-0.2) | 0.0 (+0.0) | 0.1 (-0.1) | 0.1 (-0.2) | -0.1 (-0.5) | 0.3 (-0.4) | 0.1 (-0.0) | 79.1 ✓ (+5.5) | 0.350 (-0.3) | 0.200 ✓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.150 (-0.4*) | 45% (15% drawn) | 0.72 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 90 | 20 | 0.6 | 7 | 0 | 3 | 13 | 33 | 43 | 66 | 28 | 6 | 28 | 5.6 |
| receiver off | 0.35 (+0.1) | 80 (-10.0) | 20 (+0.0) | 1.3 (+0.7) | 8 (+1.7) | 0 (+0.0) | 11 (+7.8) | 8 (-5.0) | 42 (+8.3) | 31 (-12.8) | 63 (-3.4) | 25 (-2.4) | 12 (+5.8) | 29 (+0.9) | 5.0 (-0.5*) |

_Tries 1.5 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.1 ↓ | 5.1 ↓ | 15.3 | 0.3 | 2.1 ↓ | 3.6 ↓ | 6.2 ↓ | 2.1 ↓ | 0.1 | 7.0 | 0.5 | 0.0 | 0.0 | 1.1 | 0.1 | 0.8 | 0.1 | 0.4 | 153.6 | 0.6 | 0.6 | 0.0 | 0.1 | 0.1 | 0.3 | 0.4 | 0.1 | 74.6 ✓ | 0.650 | 0.090 ↓ | 0.010 ↓ | 0.000 ✓ | 0.550 | 44% (15% drawn) | 40.0% (18.5% drawn) | 0.70 | 93%/93% |
| receiver off | 53.8 ↓ (+0.7) | 4.9 ↓ (-0.1) | 15.3 (-0.0) | 0.3 (+0.1) | 1.9 ↓ (-0.2) | 3.4 ↓ (-0.3) | 6.4 ↓ (+0.2) | 1.8 ↓ (-0.3) | 0.1 (-0.0) | 7.0 (-0.0) | 0.7 (+0.1) | 0.0 (+0.0) | 0.1 (+0.1) | 1.0 (-0.1) | 0.1 (+0.1) | 0.8 (+0.0) | 0.0 (-0.0) | 0.5 (+0.1) | 161.0 (+7.4) | 0.5 (-0.0) | 0.7 (+0.1) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (+0.0) | 0.4 (+0.1) | 0.5 (+0.1) | 0.1 (+0.1) | 76.3 ✓ (+1.7) | 0.760 (+0.1) | 0.090 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.650 (+0.1) | 38% (21% drawn) | 46.0% (19.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 81 | 16 | 1.0 | 11 | 0 | 4 | 7 | 39 | 38 | 66 | 25 | 9 | 28 | 5.4 |
| receiver off | 0.23 (-0.1) | 84 (+3.0) | 13 (-3.0) | 0.7 (-0.4) | 10 (-0.9) | 0 (+0.0) | 2 (-2.1) | 4 (-3.3) | 34 (-4.8) | 49 (+11.1*) | 67 (+0.6) | 24 (-0.6) | 9 (-0.1) | 31 (+3.2*) | 4.7 (-0.7*) |

_Tries 2.1 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 5.3 ↓ | 15.1 | 0.3 | 2.4 ↓ | 3.9 ↓ | 5.6 ↓ | 1.6 ↓ | 0.1 | 7.3 | 0.9 | 0.0 | 0.1 | 1.0 | 0.2 | 0.6 | 0.0 | 0.5 | 139.1 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 72.2 ✓ | 0.450 | 0.040 ↓ | 0.000 ↓ | 0.000 ✓ | 0.410 | 36% (20% drawn) | 38.5% (19.0% drawn) | 0.70 | 93%/93% |
| receiver off | 52.8 ↓ (-0.1) | 5.6 ↓ (+0.3) | 15.3 (+0.3) | 0.2 (-0.1) | 2.5 ↓ (+0.2) | 4.0 ↓ (+0.0) | 5.9 ↓ (+0.4) | 2.1 ↓ (+0.5*) | 0.1 (-0.0) | 7.5 (+0.2) | 0.7 (-0.2) | 0.0 (+0.0) | 0.0 (-0.1) | 1.2 (+0.2) | 0.1 (-0.1*) | 0.6 (+0.0) | 0.0 (+0.0) | 0.6 (+0.1) | 139.9 (+0.8) | 0.4 (-0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.5 (+0.1) | 0.1 (-0.0) | 72.0 ✓ (-0.1) | 0.560 (+0.1) | 0.080 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.460 (+0.1) | 49% (16% drawn) | 47.0% (14.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 84 | 18 | 0.7 | 10 | 0 | 4 | 4 | 40 | 43 | 63 | 29 | 8 | 25 | 5.6 |
| receiver off | 0.30 (+0.1) | 78 (-6.0) | 15 (-3.0) | 0.8 (+0.1) | 13 (+3.0) | 0 (+0.0) | 5 (+1.1) | 9 (+4.3) | 32 (-7.9) | 42 (-0.5) | 66 (+2.7) | 25 (-4.0) | 10 (+1.3) | 27 (+2.1*) | 5.1 (-0.5*) |

_Tries 1.6 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.8 ↓ | 5.4 ↓ | 15.6 | 0.2 | 1.9 ↓ | 3.7 ↓ | 5.9 ↓ | 2.0 ↓ | 0.2 | 7.4 | 0.7 | 0.0 | 0.1 | 1.1 | 0.2 | 0.4 | 0.1 | 0.5 | 143.7 | 0.5 | 0.6 | 0.0 | 0.0 | 0.1 | -0.1 | 0.4 | 0.1 | 72.6 ✓ | 0.700 | 0.050 ↓ | 0.020 ↓ | 0.000 ✓ | 0.630 | 44% (17% drawn) | 40.0% (17.5% drawn) | 0.70 | 93%/93% |
| receiver off | 51.4 ↓ (+0.7) | 5.1 ↓ (-0.3) | 14.5 (-1.1) | 0.2 (-0.0) | 1.9 ↓ (+0.1) | 3.7 ↓ (+0.0) | 6.3 ↓ (+0.4) | 1.9 ↓ (-0.1) | 0.2 (-0.0) | 7.1 (-0.3) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.2 (+0.1) | 0.1 (-0.1) | 0.4 (-0.0) | 0.0 (-0.1) | 0.6 (+0.1) | 148.6 (+4.9) | 0.4 (-0.2) | 0.7 (+0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.0 (+0.1) | 0.4 (+0.1) | 0.1 (+0.0) | 73.2 ✓ (+0.6) | 0.770 (+0.1) | 0.080 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.670 (+0.0) | 37% (14% drawn) | 37.5% (17.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 85 | 16 | 0.6 | 11 | 0 | 5 | 5 | 29 | 49 | 66 | 24 | 10 | 27 | 5.2 |
| receiver off | 0.33 (+0.0) | 78 (-7.0) | 17 (+1.0) | 1.0 (+0.3) | 12 (+0.8) | 0 (+0.0) | 3 (-2.5) | 4 (-0.9) | 37 (+7.5) | 44 (-5.0) | 68 (+2.5) | 23 (-1.8) | 9 (-0.7) | 29 (+2.1*) | 4.7 (-0.5*) |

_Tries 2.0 and last tackles 8.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 6.0 ↓ | 17.1 | 0.3 | 3.3 ↓ | 3.9 ↓ | 5.5 ↓ | 1.9 ↓ | 0.2 | 6.8 | 0.9 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.5 | 134.7 | 0.5 | 0.6 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 72.0 ✓ | 0.390 | 0.070 ↓ | 0.000 ↓ | 0.000 ✓ | 0.320 | 47% (20% drawn) | 42.5% (17.0% drawn) | 0.69 | 93%/93% |
| receiver off | 51.2 ↓ (+0.3) | 5.5 ↓ (-0.5) | 16.6 (-0.6) | 0.2 (-0.1) | 3.3 ↓ (-0.0) | 4.0 ↓ (+0.1) | 5.6 ↓ (+0.0) | 2.0 ↓ (+0.1) | 0.1 (-0.1) | 6.6 (-0.3) | 0.8 (-0.1) | 0.0 (+0.0) | 0.1 (+0.1) | 1.1 (-0.1) | 0.1 (-0.0) | 0.7 (+0.2) | 0.0 (+0.0) | 0.4 (-0.0) | 137.8 (+3.1) | 0.5 (+0.0) | 0.6 (-0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.2 (+0.1) | 0.5 (-0.0) | 0.1 (+0.1) | 70.5 ✓ (-1.4) | 0.570 (+0.2) | 0.080 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.480 (+0.2) | 48% (24% drawn) | 47.0% (19.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 84 | 19 | 0.8 | 10 | 0 | 9 | 6 | 35 | 40 | 65 | 26 | 10 | 27 | 5.4 |
| receiver off | 0.29 (-0.0) | 83 (-1.0) | 12 (-7.0) | 0.7 (-0.1) | 10 (-0.8) | 0 (+0.0) | 7 (-2.3) | 8 (+1.3) | 35 (-0.0) | 41 (+1.8) | 64 (-0.8) | 26 (+0.2) | 10 (+0.6) | 29 (+2.3*) | 5.0 (-0.5*) |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 5.3 ↓ | 22.3 | 0.1 | 2.3 ↓ | 3.6 ↓ | 5.7 ↓ | 2.1 ↓ | 0.1 | 9.3 | 0.9 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.1 | 0.5 | 138.1 | 0.9 | 0.6 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.4 ✓ | 0.630 | 0.070 ↓ | 0.010 ↓ | 0.000 ✓ | 0.550 | 36% (20% drawn) | 41.0% (20.5% drawn) | 0.69 | 93%/93% |
| receiver off | 52.1 ↓ (-0.0) | 4.6 ↓ (-0.6*) | 20.6 (-1.7*) | 0.3 (+0.1) | 2.4 ↓ (+0.2) | 3.9 ↓ (+0.3) | 5.8 ↓ (+0.1) | 1.9 ↓ (-0.1) | 0.1 (-0.0) | 8.8 (-0.5) | 0.8 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.2) | 0.1 (+0.1) | 0.6 (+0.0) | 0.0 (-0.0) | 0.4 (-0.1) | 143.0 (+4.9) | 0.7 (-0.1) | 0.6 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.2) | 0.2 (-0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 73.6 ✓ (-0.9) | 0.430 (-0.2*) | 0.090 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.340 (-0.2*) | 38% (16% drawn) | 42.5% (18.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 83 | 13 | 1.0 | 12 | 0 | 2 | 11 | 33 | 42 | 64 | 26 | 10 | 27 | 5.4 |
| receiver off | 0.25 (-0.1) | 78 (-5.0) | 9 (-4.0) | 0.7 (-0.3) | 11 (-0.9) | 0 (+0.0) | 3 (+0.6) | 6 (-5.0) | 35 (+1.9) | 46 (+3.4) | 66 (+1.4) | 25 (-0.4) | 9 (-1.0) | 30 (+3.0*) | 4.7 (-0.7*) |

_Tries 2.1 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 5.8 ↓ | 16.7 | 0.2 | 2.1 ↓ | 3.6 ↓ | 5.9 ↓ | 1.9 ↓ | 0.1 | 6.8 | 0.7 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.0 | 0.6 | 150.8 | 0.4 | 0.7 | 0.0 | 0.0 | 0.1 | 0.0 | 0.3 | 0.1 | 74.0 ✓ | 0.690 | 0.100 ↓ | 0.020 ↓ | 0.000 ✓ | 0.570 | 35% (17% drawn) | 36.5% (16.0% drawn) | 0.69 | 93%/93% |
| receiver off | 51.4 ↓ (-0.1) | 5.5 ↓ (-0.4) | 16.5 (-0.3) | 0.2 (+0.0) | 2.3 ↓ (+0.2) | 3.3 ↓ (-0.3) | 6.0 ↓ (+0.0) | 2.0 ↓ (+0.1) | 0.1 (-0.0) | 7.0 (+0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.0 (-0.1) | 1.0 (-0.0) | 0.1 (-0.1) | 0.7 (-0.1) | 0.0 (-0.0) | 0.5 (-0.1) | 147.2 (-3.6) | 0.5 (+0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.1) | 0.4 (+0.1) | 0.1 (-0.1) | 75.0 ✓ (+1.0) | 0.490 (-0.2) | 0.080 ↓ (-0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.410 (-0.2) | 33% (20% drawn) | 35.0% (17.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 85 | 16 | 0.4 | 11 | 0 | 3 | 6 | 30 | 50 | 69 | 23 | 8 | 27 | 5.5 |
| receiver off | 0.22 (+0.0) | 70 (-15.0*) | 11 (-5.0) | 0.6 (+0.2) | 11 (+0.1) | 0 (+0.0) | 4 (+0.9) | 11 (+4.3) | 38 (+8.1) | 37 (-13.5*) | 67 (-1.7) | 24 (+0.7) | 9 (+1.1) | 30 (+2.9*) | 4.7 (-0.8*) |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 5.8 ↓ | 15.8 | 0.3 | 1.8 ↓ | 3.1 ↓ | 5.7 ↓ | 2.2 ↓ | 0.1 | 7.5 | 0.6 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.1 | 0.5 | 141.8 | 0.6 | 1.1 | 0.0 | 0.1 | 0.1 | 0.3 | 0.3 | 0.1 | 76.4 ✓ | 0.500 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 65% (15% drawn) | 0.70 | 94%/93% |
| receiver off | 51.4 ↓ (-0.1) | 5.6 ↓ (-0.2) | 16.3 (+0.5) | 0.5 (+0.2) | 2.1 ↓ (+0.4) | 3.9 ↓ (+0.8) | 5.0 ↓ (-0.7) | 2.8 ↓ (+0.6) | 0.3 (+0.1) | 7.3 (-0.2) | 0.1 (-0.4*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.5 (+0.3) | 0.1 (-0.1) | 0.8 (+0.2) | 0.1 (-0.1) | 0.3 (-0.1) | 116.9 (-25.0) | 0.8 (+0.2) | 1.1 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.5 (+0.2) | 0.7 (+0.3) | 0.1 (+0.0) | 74.5 ✓ (-2.0) | 0.600 (+0.1) | 0.200 ✓ (+0.2) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (-0.0) | 50% (30% drawn) | 0.70 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 75 | 10 | 1.0 | 5 | 0 | 0 | 11 | 25 | 59 | 68 | 21 | 10 | 26 | 5.5 |
| receiver off | 0.45 (+0.2) | 75 (+0.0) | 20 (+10.0) | 1.0 (+0.0) | 11 (+6.2) | 0 (+0.0) | 2 (+1.8) | 18 (+6.5) | 32 (+7.1) | 38 (-21.6*) | 58 (-10.2) | 33 (+11.5*) | 9 (-1.3) | 27 (+1.5) | 4.9 (-0.6*) |

_Tries 2.2 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 49.4 ↓ | 9.3 ↓ | 18.1 | 0.1 | 2.0 ↓ | 3.9 ↓ | 5.4 ↓ | 3.3 ↓ | 0.1 | 6.7 | 1.3 | 0.0 | 0.1 | 1.9 | 0.0 | 0.2 | 0.0 | 0.1 | 127.0 | 0.8 | 0.7 | 0.1 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 73.6 ✓ | 0.400 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 60% (5% drawn) | 0.68 | 92%/93% |
| receiver off | 49.5 ↓ (+0.1) | 9.5 ↓ (+0.2) | 18.1 (+0.1) | 0.3 (+0.2) | 2.5 ↓ (+0.5) | 3.4 ↓ (-0.5) | 4.8 ↓ (-0.6) | 3.0 ↓ (-0.3) | 0.1 (+0.0) | 6.9 (+0.3) | 1.6 (+0.4) | 0.0 (+0.0) | 0.2 (+0.1) | 1.9 (+0.0) | 0.1 (+0.1) | 0.3 (+0.0) | 0.0 (+0.0) | 0.6 (+0.5*) | 103.7 (-23.3) | 0.9 (+0.1) | 0.8 (+0.1) | 0.1 (+0.0) | 0.1 (+0.1) | 0.5 (+0.5) | 1.0 (+1.0) | 0.3 (-0.2) | 0.2 (+0.1) | 75.5 ✓ (+1.9) | 0.950 (+0.5*) | 0.150 ↓ (+0.1) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.750 (+0.4) | 50% (5% drawn) | 0.69 | 93%/94% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.50 | 90 | 20 | 2.0 | 12 | 0 | 5 | 14 | 27 | 42 | 69 | 20 | 11 | 25 | 5.4 |
| receiver off | 0.40 (-0.1) | 60 (-30.0*) | 15 (-5.0) | 0.6 (-1.4*) | 10 (-2.0) | 0 (+0.0) | 2 (-2.9) | 19 (+5.0) | 25 (-1.8) | 44 (+1.6) | 60 (-8.9) | 30 (+10.3*) | 9 (-1.5) | 27 (+1.5) | 4.9 (-0.5*) |

_Tries 3.3 and last tackles 7.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 4.3 ↓ | 16.7 | 3.2 | 1.7 ↓ | 3.4 ↓ | 6.0 ↓ | 1.5 ↓ | 0.1 | 5.4 | 0.7 | 3.8 | 10.7 | 0.9 | 0.2 | 0.9 | 0.0 | 0.6 | 158.7 | 0.4 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.0 | 72.8 ✓ | 0.667 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.625 | 55% | 0.68 | 53%/53% |
| receiver off | 51.8 ↓ (+0.8) | 3.4 ↓ (-0.9) | 16.8 (+0.1) | 3.5 (+0.3) | 1.3 ↓ (-0.3) | 3.4 ↓ (+0.0) | 6.7 ↓ (+0.6) | 1.6 ↓ (+0.1) | 0.1 (+0.0) | 4.6 (-0.8) | 0.4 (-0.3) | 4.0 (+0.3) | 11.1 (+0.5) | 0.9 (+0.0) | 0.1 (-0.1) | 1.0 (+0.1) | 0.2 (+0.2*) | 0.5 (-0.1) | 177.4 (+18.7) | 0.4 (-0.0) | 0.6 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.4 (+0.4) | 0.5 (-0.0) | 0.0 (+0.0) | 74.7 ✓ (+1.8) | 0.542 (-0.1) | 0.000 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.542 (-0.1) | 40% (20% drawn) | 0.69 | 54%/53% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.08 | 65 | 15 | 0.3 | 8 | 0 | 6 | 3 | 50 | 33 | 64 | 26 | 10 | 28 | 5.4 |
| receiver off | 0.29 (+0.2) | 95 (+30.0*) | 25 (+10.0) | 0.9 (+0.7) | 8 (-0.4) | 0 (+0.0) | 0 (-5.6) | 3 (-0.1) | 37 (-13.2) | 53 (+19.3) | 65 (+0.8) | 29 (+3.0) | 6 (-3.8) | 31 (+3.5*) | 5.0 (-0.4*) |

_Tries 1.5 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_26 cells in 436 s._
