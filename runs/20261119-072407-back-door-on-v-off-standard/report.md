# Balance: back door on v off (standard)

#722: the standard suite at its own sample sizes, back-door support runs on (baseline, the branch default) against off (shapes.backDoor.on 0, the preceding three-shape sim).

**commit** f248854 · **branch** feat/match-back-door · **started** 2026-11-19T07:24:07.687Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 5.0 ↓ | 14.8 | 0.3 | 2.5 ↓ | 3.8 ↓ | 5.9 ↓ | 2.0 ↓ | 0.1 | 6.3 | 0.5 | 0.3 | 20.0 | 0.0 | 0.0 | 1.1 | 0.0 | 1.0 | 0.1 | 0.5 | 145.1 | 0.5 | 0.8 | 0.1 | 0.0 | 0.0 | 0.0 | 0.6 | 0.0 | 73.6 ✓ | 0.550 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 55% (25% drawn) | 0.70 | 93%/93% |
| back door off | 52.0 ↓ (-0.3) | 5.8 ↓ (+0.8) | 16.7 (+1.8) | 0.3 (-0.0) | 2.4 ↓ (-0.2) | 3.2 ↓ (-0.6) | 5.5 ↓ (-0.4) | 2.0 ↓ (-0.0) | 0.1 (+0.0) | 7.3 (+0.9) | 0.7 (+0.2) | 0.3 (+0.0) | 25.0 (+5.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.8 (-0.3) | 0.1 (+0.1) | 0.8 (-0.2) | 0.1 (-0.1) | 0.6 (+0.1) | 133.5 (-11.7) | 0.5 (+0.0) | 0.9 (+0.1) | 0.1 (+0.0) | 0.1 (+0.1) | 0.0 (+0.0) | 0.3 (+0.3) | 0.5 (-0.1) | 0.1 (+0.1) | 75.3 ✓ (+1.8) | 0.650 (+0.1) | 0.100 ↓ (-0.1) | 0.100 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.450 (+0.1) | 45% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 70 | 0 | 0.8 | 15 | 0 | 7 | 0 | 44 | 34 | 66 | 20 | 14 | 26 | 5.4 | 0.25 | 53.7 |
| back door off | 0.20 (-0.1) | 80 (+10.0) | 5 (+5.0) | 0.8 (-0.1) | 8 (-7.1) | 0 (+0.0) | 5 (-2.3) | 8 (+7.5) | 30 (-13.9) | 50 (+15.9) | 61 (-4.8) | 25 (+4.9) | 14 (-0.2) | 29 (+2.5) | 5.4 (-0.0) | 0.25 (+0.0) | 54.2 (+0.5) |

_Tries 2.0 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.0 ↓ | 16.6 | 0.1 | 2.5 ↓ | 4.3 ↓ | 5.5 ↓ | 2.0 ↓ | 0.3 | 7.4 | 0.6 | 0.3 | 25.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.9 | 0.1 | 0.5 | 136.7 | 0.5 | 0.7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 70.4 ✓ | 0.600 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.450 | 50% (5% drawn) | 0.69 | 92%/93% |
| back door off | 52.0 ↓ (-0.5) | 5.8 ↓ (+0.7) | 15.5 (-1.1) | 0.2 (+0.1) | 2.4 ↓ (-0.1) | 3.7 ↓ (-0.6) | 5.4 ↓ (-0.1) | 2.0 ↓ (+0.0) | 0.2 (-0.0) | 7.1 (-0.3) | 0.6 (+0.0) | 0.5 (+0.3) | 30.0 (+5.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.9 (-0.1) | 0.1 (+0.1) | 0.6 (-0.3) | 0.0 (-0.1) | 0.4 (-0.0) | 119.2 (-17.5) | 0.5 (+0.0) | 1.0 (+0.3) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.4 (-0.1) | 0.0 (-0.1) | 73.9 ✓ (+3.5) | 0.600 (+0.0) | 0.200 ✓ (+0.1) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (-0.1) | 55% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 75 | 15 | 1.3 | 8 | 0 | 5 | 8 | 33 | 48 | 59 | 21 | 19 | 26 | 5.3 | 0.30 | 55.3 |
| back door off | 0.20 (-0.0) | 70 (-5.0) | 5 (-10.0) | 1.1 (-0.2) | 15 (+7.1) | 0 (+0.0) | 5 (-0.1) | 10 (+2.3) | 34 (+1.6) | 37 (-10.9) | 59 (-0.5) | 27 (+5.8) | 14 (-5.3) | 25 (-0.6) | 5.4 (+0.1) | 0.65 (+0.4) | 54.1 (-1.2) |

_Tries 2.0 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 5.5 ↓ | 21.6 | 0.3 | 2.6 ↓ | 4.0 ↓ | 5.9 ↓ | 1.5 ↓ | 0.1 | 9.1 | 1.3 | 0.1 | 15.0 | 0.0 | 0.2 | 0.7 | 0.1 | 0.7 | 0.0 | 0.3 | 153.0 | 0.8 | 0.7 | 0.1 | 0.0 | 0.0 | 0.0 | 0.6 | 0.3 | 70.8 ✓ | 0.200 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.150 | 55% (20% drawn) | 0.69 | 93%/93% |
| back door off | 52.1 ↓ (-0.6) | 4.7 ↓ (-0.8) | 21.6 (+0.0) | 0.2 (-0.1) | 2.6 ↓ (+0.0) | 3.8 ↓ (-0.3) | 5.8 ↓ (-0.1) | 1.9 ↓ (+0.4) | 0.1 (-0.1) | 8.3 (-0.8) | 0.7 (-0.6) | 0.3 (+0.1) | 15.0 (+0.0) | 0.0 (+0.0) | 0.1 (-0.1) | 1.1 (+0.4) | 0.1 (-0.0) | 0.9 (+0.3) | 0.1 (+0.1) | 0.6 (+0.3) | 140.2 (-12.8) | 1.0 (+0.3) | 0.8 (+0.1) | 0.0 (-0.1) | 0.1 (+0.1) | 0.2 (+0.2) | 0.4 (+0.4) | 0.5 (-0.1) | 0.2 (-0.1) | 71.9 ✓ (+1.0) | 0.550 (+0.4*) | 0.050 ↓ (+0.0) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.450 (+0.3) | 55% (10% drawn) | 0.67 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 90 | 5 | 0.6 | 13 | 0 | 0 | 17 | 33 | 37 | 66 | 22 | 12 | 30 | 5.3 | 0.20 | 56.5 |
| back door off | 0.35 (+0.0) | 75 (-15.0) | 15 (+10.0) | 1.3 (+0.7) | 5 (-8.1) | 0 (+0.0) | 5 (+5.3) | 11 (-6.1) | 45 (+11.4) | 34 (-2.5) | 64 (-2.7) | 19 (-2.9) | 18 (+5.6) | 28 (-1.2) | 5.4 (+0.1) | 0.45 (+0.3) | 53.7 (-2.8) |

_Tries 1.5 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 56.0 ↓ | 5.1 ↓ | 15.8 | 0.1 | 3.0 ↓ | 3.1 ↓ | 5.7 ↓ | 1.6 ↓ | 0.1 | 8.6 | 0.5 | 0.2 | 20.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.8 | 0.1 | 0.4 | 147.6 | 0.6 | 1.0 | 0.0 | 0.1 | 0.2 | -0.4 | 0.6 | 0.1 | 75.5 ✓ | 0.500 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 40% (30% drawn) | 0.71 | 93%/92% |
| back door off | 56.0 ↓ (+0.0) | 3.9 ↓ (-1.2*) | 15.1 (-0.7) | 0.3 (+0.2) | 2.5 ↓ (-0.5) | 3.3 ↓ (+0.1) | 5.3 ↓ (-0.3) | 1.6 ↓ (+0.0) | 0.1 (+0.0) | 7.7 (-0.9) | 0.7 (+0.2) | 0.3 (+0.1) | 25.0 (+5.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.8 (-0.1) | 0.3 (+0.1) | 0.9 (+0.2) | 0.0 (-0.1) | 0.3 (-0.1) | 141.5 (-6.1) | 0.8 (+0.3) | 0.9 (-0.1) | 0.0 (+0.0) | 0.1 (-0.1) | 0.2 (-0.0) | 0.1 (+0.5) | 0.7 (+0.1) | 0.1 (-0.1) | 77.8 ✓ (+2.3) | 0.650 (+0.2) | 0.100 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.550 (+0.1) | 45% (15% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 70 | 15 | 0.7 | 3 | 0 | 6 | 6 | 39 | 45 | 58 | 26 | 16 | 27 | 5.7 | 0.60 | 54.9 |
| back door off | 0.20 (+0.1) | 95 (+25.0*) | 5 (-10.0) | 0.7 (+0.0) | 12 (+9.1) | 0 (+0.0) | 3 (-3.0) | 0 (-6.1) | 61 (+21.2) | 24 (-21.2) | 56 (-1.6) | 29 (+3.1) | 15 (-1.5) | 26 (-0.3) | 5.3 (-0.4) | 0.20 (-0.4*) | 54.9 (+0.1) |

_Tries 1.6 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.8 ↓ | 5.2 ↓ | 16.4 | 0.4 | 2.2 ↓ | 3.5 ↓ | 6.0 ↓ | 1.6 ↓ | 0.2 | 7.5 | 0.6 | 0.2 | 20.0 | 0.0 | 0.1 | 0.9 | 0.2 | 0.8 | 0.1 | 0.6 | 155.4 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.3 | 0.6 | 0.1 | 74.3 ✓ | 0.700 | 0.090 ↓ | 0.000 ↓ | 0.000 ✓ | 0.610 | 45% (16% drawn) | 45.0% (19.5% drawn) | 0.71 | 93%/93% |
| back door off | 54.4 ↓ (+0.5) | 5.1 ↓ (-0.1) | 16.4 (-0.0) | 0.3 (-0.0) | 2.2 ↓ (+0.0) | 3.5 ↓ (+0.1) | 5.9 ↓ (-0.1) | 1.4 ↓ (-0.3) | 0.1 (-0.1) | 7.4 (-0.1) | 0.8 (+0.1) | 0.2 (-0.0) | 17.0 (-3.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.0) | 0.1 (-0.1) | 0.7 (-0.1) | 0.1 (+0.0) | 0.4 (-0.1) | 151.9 (-3.5) | 0.6 (+0.1) | 0.8 (+0.0) | 0.0 (-0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.2) | 0.6 (-0.0) | 0.1 (+0.0) | 74.0 ✓ (-0.3) | 0.710 (+0.0) | 0.080 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.630 (+0.0) | 44% (22% drawn) | 42.5% (20.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 91 | 19 | 0.6 | 11 | 0 | 5 | 4 | 34 | 47 | 64 | 24 | 13 | 28 | 5.3 | 0.58 | 55.3 |
| back door off | 0.21 (-0.0) | 83 (-8.0) | 14 (-5.0) | 0.5 (-0.1) | 11 (+0.5) | 0 (+0.0) | 4 (-0.6) | 4 (-0.1) | 34 (-0.4) | 47 (+0.5) | 60 (-3.4) | 26 (+2.0) | 14 (+1.5) | 28 (+0.3) | 5.2 (-0.1) | 0.69 (+0.1) | 56.4 (+1.1) |

_Tries 1.7 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.4 ↓ | 5.5 ↓ | 16.3 | 0.3 | 2.9 ↓ | 3.4 ↓ | 5.1 ↓ | 1.6 ↓ | 0.2 | 7.3 | 0.7 | 0.3 | 26.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.1 | 0.3 | 124.9 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 73.8 ✓ | 0.420 | 0.070 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 46% (26% drawn) | 41.5% (20.5% drawn) | 0.71 | 93%/93% |
| back door off | 52.8 ↓ (-0.6) | 5.6 ↓ (+0.1) | 15.6 (-0.6) | 0.2 (-0.2) | 2.4 ↓ (-0.4) | 3.6 ↓ (+0.2) | 5.4 ↓ (+0.3) | 1.8 ↓ (+0.2) | 0.1 (-0.0) | 7.0 (-0.3) | 0.6 (-0.1) | 0.3 (-0.0) | 24.0 (-2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (-0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.5 (+0.2) | 132.9 (+8.0) | 0.6 (-0.0) | 0.7 (-0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.1) | 0.1 (-0.2) | 0.6 (+0.2) | 0.1 (+0.0) | 73.1 ✓ (-0.7) | 0.600 (+0.2) | 0.070 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.510 (+0.2) | 42% (20% drawn) | 37.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 82 | 18 | 0.5 | 11 | 0 | 6 | 5 | 39 | 40 | 56 | 25 | 18 | 27 | 5.6 | 0.20 | 54.9 |
| back door off | 0.19 (-0.1) | 78 (-4.0) | 16 (-2.0) | 0.6 (+0.2) | 8 (-2.2) | 0 (+0.0) | 4 (-1.8) | 3 (-1.6) | 37 (-1.3) | 47 (+6.9) | 60 (+3.5) | 24 (-1.2) | 16 (-2.3) | 27 (+0.3) | 5.5 (-0.1) | 0.27 (+0.1) | 54.3 (-0.6) |

_Tries 1.6 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.6 ↓ | 16.5 | 0.2 | 2.3 ↓ | 3.7 ↓ | 6.0 ↓ | 1.6 ↓ | 0.2 | 7.3 | 0.7 | 0.3 | 25.0 | 0.0 | 0.0 | 0.9 | 0.1 | 0.3 | 0.1 | 0.6 | 138.4 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.1 | 0.4 | 0.1 | 72.7 ✓ | 0.710 | 0.050 ↓ | 0.010 ↓ | 0.000 ✓ | 0.650 | 41% (15% drawn) | 44.0% (12.5% drawn) | 0.70 | 93%/93% |
| back door off | 51.0 ↓ (-0.2) | 5.3 ↓ (-0.3) | 15.5 (-1.0) | 0.3 (+0.1) | 2.2 ↓ (-0.1) | 4.0 ↓ (+0.3) | 5.8 ↓ (-0.2) | 1.7 ↓ (+0.0) | 0.1 (-0.1) | 6.8 (-0.5) | 0.7 (+0.0) | 0.3 (+0.0) | 27.0 (+2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.1) | 0.1 (+0.0) | 0.4 (+0.0) | 0.0 (-0.0) | 0.6 (-0.0) | 138.7 (+0.3) | 0.5 (+0.0) | 0.7 (-0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.6 (+0.1) | 0.1 (+0.0) | 70.8 ✓ (-1.9) | 0.690 (-0.0) | 0.030 ↓ (-0.0) | 0.040 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.620 (-0.0) | 41% (17% drawn) | 41.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.12 | 83 | 12 | 0.4 | 11 | 0 | 5 | 5 | 34 | 45 | 65 | 22 | 13 | 27 | 5.4 | 0.69 | 54.9 |
| back door off | 0.17 (+0.1) | 83 (+0.0) | 11 (-1.0) | 0.5 (+0.1) | 8 (-2.7) | 0 (+0.0) | 5 (+0.5) | 4 (-0.7) | 39 (+4.6) | 43 (-1.7) | 64 (-1.0) | 22 (-0.4) | 14 (+1.3) | 27 (+0.6) | 5.3 (-0.2) | 0.70 (+0.0) | 54.8 (-0.2) |

_Tries 1.6 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 5.9 ↓ | 18.6 | 0.3 | 3.5 ↓ | 3.6 ↓ | 5.2 ↓ | 1.8 ↓ | 0.2 | 7.3 | 1.0 | 0.4 | 31.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.5 | 0.0 | 0.4 | 125.2 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.0 | 0.4 | 0.1 | 73.5 ✓ | 0.510 | 0.090 ↓ | 0.020 ↓ | 0.000 ✓ | 0.400 | 48% (13% drawn) | 43.5% (18.0% drawn) | 0.70 | 93%/93% |
| back door off | 51.3 ↓ (+0.0) | 6.0 ↓ (+0.1) | 18.6 (+0.0) | 0.3 (+0.0) | 3.2 ↓ (-0.3) | 3.6 ↓ (+0.0) | 4.6 ↓ (-0.5*) | 1.9 ↓ (+0.1) | 0.2 (+0.0) | 7.3 (+0.0) | 0.8 (-0.2) | 0.3 (-0.0) | 29.0 (-2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.0) | 0.1 (+0.0) | 0.6 (+0.1) | 0.1 (+0.0) | 0.5 (+0.1) | 113.3 (-11.8) | 0.6 (+0.1) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (-0.0) | 0.1 (+0.1) | 0.3 (-0.1) | 0.1 (-0.1) | 73.1 ✓ (-0.4) | 0.450 (-0.1) | 0.070 ↓ (-0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.360 (-0.0) | 52% (21% drawn) | 43.0% (22.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.11 | 75 | 19 | 0.4 | 12 | 0 | 9 | 6 | 41 | 33 | 58 | 23 | 20 | 27 | 5.4 | 0.28 | 54.6 |
| back door off | 0.22 (+0.1) | 81 (+6.0) | 13 (-6.0) | 0.9 (+0.5*) | 10 (-1.5) | 0 (+0.0) | 12 (+2.9) | 5 (-0.7) | 33 (-7.8) | 40 (+7.0) | 54 (-4.0) | 27 (+3.9) | 20 (+0.1) | 26 (-0.5) | 5.5 (+0.1) | 0.20 (-0.1) | 54.4 (-0.2) |

_Tries 1.8 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 4.7 ↓ | 22.0 | 0.2 | 2.5 ↓ | 3.7 ↓ | 5.8 ↓ | 1.9 ↓ | 0.2 | 9.1 | 1.0 | 0.2 | 18.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.4 | 137.6 | 0.9 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.8 ✓ | 0.610 | 0.130 ↓ | 0.010 ↓ | 0.000 ✓ | 0.470 | 44% (15% drawn) | 38.0% (16.5% drawn) | 0.69 | 93%/93% |
| back door off | 52.4 ↓ (-0.1) | 5.0 ↓ (+0.3) | 22.1 (+0.1) | 0.2 (-0.0) | 2.3 ↓ (-0.1) | 4.0 ↓ (+0.3) | 5.3 ↓ (-0.5) | 1.8 ↓ (-0.1) | 0.1 (-0.0) | 9.3 (+0.2) | 0.9 (-0.0) | 0.3 (+0.1) | 22.0 (+4.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.0) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (-0.0) | 0.4 (-0.1) | 130.8 (-6.8) | 0.9 (+0.0) | 0.9 (+0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (-0.0) | 0.1 (-0.2) | 0.6 (+0.1) | 0.1 (+0.0) | 72.3 ✓ (-2.5) | 0.480 (-0.1) | 0.090 ↓ (-0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.380 (-0.1) | 41% (20% drawn) | 40.5% (19.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 75 | 15 | 0.7 | 16 | 0 | 6 | 8 | 36 | 34 | 63 | 24 | 13 | 28 | 5.4 | 0.43 | 54.2 |
| back door off | 0.23 (+0.0) | 78 (+3.0) | 11 (-4.0) | 0.7 (+0.0) | 14 (-1.4) | 0 (+0.0) | 5 (-0.8) | 7 (-1.2) | 29 (-7.6) | 45 (+11.0*) | 62 (-1.6) | 27 (+3.6) | 11 (-2.0) | 27 (-0.6) | 5.4 (+0.0) | 0.27 (-0.2) | 55.3 (+1.1) |

_Tries 1.9 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.7 ↓ | 5.3 ↓ | 16.2 | 0.3 | 2.5 ↓ | 3.6 ↓ | 5.5 ↓ | 1.6 ↓ | 0.2 | 7.2 | 0.6 | 0.3 | 24.0 | 0.0 | 0.1 | 0.9 | 0.2 | 0.6 | 0.1 | 0.5 | 136.9 | 0.5 | 0.8 | 0.0 | 0.0 | 0.1 | 0.0 | 0.5 | 0.1 | 73.0 ✓ | 0.590 | 0.110 ↓ | 0.010 ↓ | 0.000 ✓ | 0.470 | 43% (22% drawn) | 41.0% (21.0% drawn) | 0.71 | 93%/93% |
| back door off | 51.8 ↓ (-0.9) | 5.3 ↓ (-0.0) | 16.6 (+0.4) | 0.4 (+0.1) | 2.4 ↓ (-0.2) | 3.7 ↓ (+0.1) | 5.6 ↓ (+0.1) | 1.8 ↓ (+0.2) | 0.1 (-0.0) | 7.3 (+0.1) | 0.6 (+0.0) | 0.3 (-0.0) | 24.0 (+0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 1.0 (+0.1) | 0.1 (-0.0) | 0.6 (+0.0) | 0.1 (+0.0) | 0.4 (-0.1) | 135.1 (-1.8) | 0.6 (+0.1) | 0.6 (-0.2) | 0.0 (+0.0) | 0.1 (+0.1*) | 0.2 (+0.1) | 0.4 (+0.4*) | 0.5 (-0.1) | 0.0 (-0.0) | 73.9 ✓ (+0.8) | 0.620 (+0.0) | 0.130 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.480 (+0.0) | 36% (18% drawn) | 33.0% (23.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 86 | 16 | 0.7 | 12 | 0 | 5 | 8 | 31 | 44 | 61 | 22 | 17 | 26 | 5.4 | 0.41 | 55.1 |
| back door off | 0.29 (+0.0) | 86 (+0.0) | 20 (+4.0) | 0.8 (+0.1) | 12 (+0.3) | 0 (+0.0) | 3 (-1.7) | 6 (-2.0) | 37 (+6.4) | 41 (-3.0) | 63 (+2.1) | 22 (+0.1) | 15 (-2.2) | 27 (+1.1) | 5.4 (+0.0) | 0.28 (-0.1) | 54.7 (-0.4) |

_Tries 1.6 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 5.5 ↓ | 15.7 | 0.5 | 2.3 ↓ | 4.2 ↓ | 5.2 ↓ | 2.1 ↓ | 0.1 | 7.2 | 0.5 | 0.4 | 35.0 | 0.0 | 0.1 | 1.1 | 0.0 | 0.6 | 0.0 | 0.5 | 103.8 | 0.7 | 1.1 | 0.1 | 0.1 | 0.1 | -0.2 | 0.5 | 0.1 | 71.9 ✓ | 0.350 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 55% (10% drawn) | 0.73 | 93%/93% |
| back door off | 51.9 ↓ (-0.4) | 6.1 ↓ (+0.5) | 16.9 (+1.3) | 0.8 (+0.3) | 1.6 ↓ (-0.6) | 3.1 ↓ (-1.1) | 5.5 ↓ (+0.3) | 1.6 ↓ (-0.5) | 0.1 (+0.1) | 6.3 (-0.8) | 0.7 (+0.2) | 0.4 (+0.0) | 30.0 (-5.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.9 (-0.2) | 0.1 (+0.1) | 0.3 (-0.2) | 0.1 (+0.1) | 0.7 (+0.2) | 126.9 (+23.1) | 0.4 (-0.3) | 1.1 (+0.1) | 0.0 (-0.1) | 0.1 (+0.1) | 0.3 (+0.2) | 0.3 (+0.5) | 0.5 (+0.0) | 0.1 (-0.1) | 74.1 ✓ (+2.2) | 0.550 (+0.2) | 0.100 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.2) | 65% (10% drawn) | 0.72 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 85 | 25 | 1.3 | 16 | 0 | 2 | 9 | 35 | 37 | 58 | 25 | 17 | 27 | 5.5 | 0.40 | 52.5 |
| back door off | 0.15 (-0.2) | 80 (-5.0) | 15 (-10.0) | 0.7 (-0.6) | 12 (-4.2) | 0 (+0.0) | 0 (-2.3) | 18 (+8.9) | 30 (-4.6) | 39 (+2.2) | 61 (+2.7) | 21 (-4.2) | 18 (+1.4) | 26 (-0.6) | 5.3 (-0.3) | 0.15 (-0.3) | 54.5 (+2.0) |

_Tries 2.2 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.2 ↓ | 9.8 ↓ | 20.6 | 0.1 | 2.1 ↓ | 3.6 ↓ | 4.7 ↓ | 3.0 ↓ | 0.3 | 6.0 | 1.6 | 0.6 | 45.0 | 0.0 | 0.0 | 1.6 | 0.1 | 0.3 | 0.1 | 0.1 | 100.7 | 0.8 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.6 | 0.0 | 75.3 ✓ | 0.600 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 75% | 0.68 | 92%/93% |
| back door off | 50.4 ↓ (+0.2) | 10.1 ✓ (+0.3) | 19.6 (-1.0) | 0.3 (+0.2) | 2.1 ↓ (-0.0) | 4.3 ↓ (+0.6) | 5.0 ↓ (+0.3) | 2.5 ↓ (-0.5) | 0.3 (-0.0) | 6.3 (+0.4) | 1.6 (-0.1) | 0.6 (+0.0) | 35.0 (-10.0) | 0.0 (+0.0) | 0.1 (+0.1) | 1.1 (-0.5) | 0.1 (+0.0) | 0.6 (+0.3) | 0.0 (-0.1) | 0.3 (+0.1) | 108.4 (+7.6) | 0.6 (-0.2) | 0.8 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.5 (-0.1) | 0.1 (+0.1) | 71.6 ✓ (-3.7) | 0.500 (-0.1) | 0.250 ✓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.250 (-0.2) | 50% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 65 | 10 | 0.5 | 13 | 0 | 2 | 15 | 25 | 46 | 56 | 25 | 19 | 28 | 5.2 | 0.35 | 53.4 |
| back door off | 0.05 (-0.2) | 65 (+0.0) | 0 (-10.0) | 0.3 (-0.2) | 10 (-3.3) | 0 (+0.0) | 0 (-1.6) | 12 (-3.0) | 33 (+8.7) | 45 (-0.8) | 60 (+3.3) | 26 (+1.4) | 14 (-4.8) | 27 (-0.3) | 5.2 (-0.0) | 0.35 (+0.0) | 53.3 (-0.1) |

_Tries 3.0 and last tackles 7.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 3.3 ↓ | 15.7 | 3.0 | 1.3 ↓ | 3.6 ↓ | 6.1 ↓ | 1.5 ↓ | 0.1 | 5.0 | 0.4 | 0.3 | 25.0 | 4.1 | 10.5 | 0.6 | 0.3 | 0.6 | 0.0 | 0.4 | 158.4 | 0.3 | 0.4 | 0.0 | 0.0 | 0.0 | 0.0 | 0.3 | 0.0 | 72.0 ✓ | 0.500 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.458 | 45% (15% drawn) | 0.67 | 52%/52% |
| back door off | 51.1 ↓ (-0.4) | 3.3 ↓ (-0.0) | 16.4 (+0.7) | 3.5 (+0.5) | 1.9 ↓ (+0.6) | 3.7 ↓ (+0.1) | 5.1 ↓ (-1.0) | 1.9 ↓ (+0.4) | 0.2 (+0.1) | 4.5 (-0.5) | 0.5 (+0.0) | 0.3 (-0.0) | 20.0 (-5.0) | 4.9 (+0.8) | 10.6 (+0.0) | 1.3 (+0.7*) | 0.1 (-0.2) | 0.6 (-0.0) | 0.0 (+0.0) | 0.4 (-0.0) | 127.5 (-31.0) | 0.3 (-0.0) | 0.8 (+0.3) | 0.0 (+0.0) | 0.1 (+0.1) | 0.1 (+0.1) | 0.3 (+0.3) | 0.3 (+0.0) | 0.1 (+0.0) | 71.3 ✓ (-0.6) | 0.500 (+0.0) | 0.042 ↓ (+0.0) | 0.042 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.417 (-0.0) | 35% (15% drawn) | 0.68 | 55%/55% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 90 | 40 | 0.7 | 16 | 0 | 3 | 5 | 22 | 54 | 61 | 24 | 15 | 28 | 5.8 | 0.46 | 54.5 |
| back door off | 0.42 (+0.1) | 75 (-15.0) | 25 (-15.0) | 0.8 (+0.1) | 17 (+1.2) | 0 (+0.0) | 4 (+1.6) | 13 (+7.6) | 39 (+17.5) | 26 (-28.0*) | 56 (-5.7) | 27 (+3.0) | 18 (+2.7) | 27 (-0.7) | 5.6 (-0.1) | 0.33 (-0.1) | 53.2 (-1.3) |

_Tries 1.5 and last tackles 9.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_26 cells in 409 s._
