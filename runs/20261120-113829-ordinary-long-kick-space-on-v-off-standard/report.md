# Balance: ordinary long kick space on v off (standard)

#650: Does the default open-side target for ordinary long kicks move balls into receiving space without large changes to the standard match outcomes? Whole standard suite at its own sizes, with the existing last-tackle decision and all other knobs held at current defaults.

**commit** f5474ea4 · **branch** HEAD · **started** 2026-11-20T11:38:29.211Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.2 ↓ | 14.8 | 0.3 | 2.8 ↓ | 3.6 ↓ | 5.8 ↓ | 1.9 ↓ | 0.1 | 5.8 | 0.3 | 0.1 | 15.0 | 0.0 | 0.0 | 1.1 | 0.0 | 1.0 | 0.1 | 0.4 | 153.6 | 0.6 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.6 | 0.0 | 72.8 ✓ | 0.500 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 50% (20% drawn) | 0.70 | 93%/93% |
| open-side target off | 52.3 ↓ (-0.2) | 5.0 ↓ (-0.2) | 14.8 (+0.1) | 0.3 (+0.0) | 2.5 ↓ (-0.2) | 3.8 ↓ (+0.2) | 5.9 ↓ (+0.1) | 2.0 ↓ (+0.2) | 0.1 (-0.0) | 6.3 (+0.5) | 0.5 (+0.1) | 0.3 (+0.1) | 20.0 (+5.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.1 (+0.0) | 0.0 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.5 (+0.1) | 145.1 (-8.5) | 0.5 (-0.1) | 0.8 (+0.0) | 0.1 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 73.6 ✓ (+0.7) | 0.550 (+0.1) | 0.200 ✓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (+0.0) | 55% (25% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 75 | 5 | 0.9 | 14 | 0 | 5 | 3 | 43 | 35 | 64 | 23 | 13 | 27 | 5.3 | 0.30 | 55.5 |
| open-side target off | 0.30 (+0.0) | 70 (-5.0) | 0 (-5.0) | 0.8 (-0.1) | 15 (+1.1) | 0 (+0.0) | 7 (+1.9) | 0 (-2.7) | 44 (+0.7) | 34 (-1.0) | 66 (+2.3) | 20 (-2.9) | 14 (+0.6) | 26 (-0.6) | 5.4 (+0.1) | 0.25 (-0.0) | 53.7 (-1.9) |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 5.7 ↓ | 16.9 | 0.1 | 2.4 ↓ | 3.8 ↓ | 4.8 ↓ | 2.0 ↓ | 0.1 | 8.3 | 0.6 | 0.2 | 20.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.0 | 0.4 | 124.3 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.2 | 0.3 | 0.1 | 72.6 ✓ | 0.550 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.400 | 35% (10% drawn) | 0.70 | 92%/93% |
| open-side target off | 52.5 ↓ (-0.3) | 5.0 ↓ (-0.6) | 16.6 (-0.2) | 0.1 (+0.1) | 2.5 ↓ (+0.2) | 4.3 ↓ (+0.5) | 5.5 ↓ (+0.7) | 2.0 ↓ (+0.0) | 0.3 (+0.1) | 7.4 (-0.9) | 0.6 (-0.0) | 0.3 (+0.0) | 25.0 (+5.0) | 0.0 (+0.0) | 0.0 (-0.1) | 1.0 (+0.0) | 0.1 (-0.1) | 0.9 (+0.3) | 0.1 (+0.1) | 0.5 (+0.0) | 136.7 (+12.4) | 0.5 (-0.0) | 0.7 (-0.2) | 0.0 (+0.0) | 0.0 (-0.1) | 0.0 (-0.1) | 0.0 (-0.2) | 0.5 (+0.2) | 0.1 (+0.0) | 70.4 ✓ (-2.2) | 0.600 (+0.0) | 0.100 ↓ (+0.0) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 50% (5% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 25 | 1.4 | 8 | 0 | 3 | 15 | 40 | 35 | 53 | 25 | 22 | 26 | 5.4 | 0.15 | 54.0 |
| open-side target off | 0.25 (-0.2) | 75 (-5.0) | 15 (-10.0) | 1.3 (-0.1) | 8 (+0.0) | 0 (+0.0) | 5 (+2.5) | 8 (-7.5) | 33 (-7.5) | 48 (+12.5) | 59 (+6.2) | 21 (-3.7) | 19 (-2.6) | 26 (+0.1) | 5.3 (-0.1) | 0.30 (+0.1) | 55.3 (+1.3) |

_Tries 2.0 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 5.3 ↓ | 21.6 | 0.3 | 2.8 ↓ | 3.6 ↓ | 6.0 ↓ | 1.6 ↓ | 0.1 | 8.9 | 1.2 | 0.1 | 15.0 | 0.0 | 0.1 | 0.7 | 0.1 | 0.5 | 0.0 | 0.3 | 156.4 | 0.8 | 0.8 | 0.1 | 0.0 | 0.0 | 0.0 | 0.5 | 0.2 | 72.6 ✓ | 0.200 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.200 | 60% (10% drawn) | 0.70 | 93%/93% |
| open-side target off | 52.8 ↓ (+0.7) | 5.5 ↓ (+0.2) | 21.6 (-0.1) | 0.3 (-0.0) | 2.6 ↓ (-0.2) | 4.0 ↓ (+0.4) | 5.9 ↓ (-0.1) | 1.5 ↓ (-0.1) | 0.1 (+0.1) | 9.1 (+0.1) | 1.3 (+0.1) | 0.1 (+0.0) | 15.0 (+0.0) | 0.0 (+0.0) | 0.2 (+0.1) | 0.7 (+0.0) | 0.1 (+0.0) | 0.7 (+0.2) | 0.0 (+0.0) | 0.3 (-0.0) | 153.0 (-3.4) | 0.8 (+0.0) | 0.7 (-0.1) | 0.1 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.1) | 0.3 (+0.1) | 70.8 ✓ (-1.8) | 0.200 (+0.0) | 0.050 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.150 (-0.1) | 55% (20% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 95 | 10 | 0.2 | 13 | 0 | 3 | 9 | 31 | 44 | 68 | 21 | 11 | 31 | 5.3 | 0.05 | 56.3 |
| open-side target off | 0.30 (+0.1) | 90 (-5.0) | 5 (-5.0) | 0.6 (+0.4) | 13 (+0.8) | 0 (+0.0) | 0 (-3.1) | 17 (+7.3) | 33 (+2.1) | 37 (-7.1) | 66 (-1.9) | 22 (+1.0) | 12 (+0.8) | 30 (-1.7) | 5.3 (+0.0) | 0.20 (+0.2) | 56.5 (+0.2) |

_Tries 1.6 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 56.8 ↓ | 5.0 ↓ | 17.0 | 0.2 | 2.8 ↓ | 3.1 ↓ | 5.7 ↓ | 1.4 ↓ | 0.1 | 8.2 | 0.5 | 0.3 | 20.0 | 0.0 | 0.1 | 0.8 | 0.1 | 1.0 | 0.1 | 0.5 | 146.8 | 0.6 | 0.8 | 0.0 | 0.1 | 0.4 | -0.1 | 0.8 | 0.1 | 76.7 ✓ | 0.500 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 45% (30% drawn) | 0.70 | 92%/92% |
| open-side target off | 56.0 ↓ (-0.8) | 5.1 ↓ (+0.1) | 15.8 (-1.3) | 0.1 (-0.1) | 3.0 ↓ (+0.2) | 3.1 ↓ (+0.0) | 5.7 ↓ (-0.0) | 1.6 ↓ (+0.3) | 0.1 (+0.0) | 8.6 (+0.4) | 0.5 (-0.0) | 0.2 (-0.0) | 20.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.2) | 0.1 (-0.0) | 0.8 (-0.3) | 0.1 (+0.0) | 0.4 (-0.1) | 147.6 (+0.8) | 0.6 (-0.0) | 1.0 (+0.2) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.1) | -0.4 (-0.3) | 0.6 (-0.2) | 0.1 (+0.0) | 75.5 ✓ (-1.2) | 0.500 (+0.0) | 0.050 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 40% (30% drawn) | 0.71 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 75 | 25 | 0.7 | 7 | 0 | 7 | 4 | 41 | 41 | 57 | 27 | 16 | 26 | 5.7 | 0.60 | 55.6 |
| open-side target off | 0.15 (+0.0) | 70 (-5.0) | 15 (-10.0) | 0.7 (+0.0) | 3 (-4.4) | 0 (+0.0) | 6 (-1.3) | 6 (+2.4) | 39 (-1.3) | 45 (+4.7) | 58 (+1.1) | 26 (-1.2) | 16 (+0.1) | 27 (+0.6) | 5.7 (+0.0) | 0.60 (+0.0) | 54.9 (-0.7) |

_Tries 1.4 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.8 ↓ | 5.0 ↓ | 16.2 | 0.5 | 2.4 ↓ | 3.4 ↓ | 6.0 ↓ | 1.5 ↓ | 0.2 | 7.4 | 0.6 | 0.2 | 21.0 | 0.0 | 0.1 | 0.9 | 0.2 | 0.8 | 0.0 | 0.6 | 157.4 | 0.5 | 0.9 | 0.0 | 0.1 | 0.1 | 0.1 | 0.6 | 0.1 | 74.2 ✓ | 0.660 | 0.070 ↓ | 0.000 ↓ | 0.000 ✓ | 0.590 | 52% (13% drawn) | 47.0% (16.0% drawn) | 0.72 | 93%/93% |
| open-side target off | 53.8 ↓ (+0.0) | 5.2 ↓ (+0.2) | 16.4 (+0.2) | 0.4 (-0.1) | 2.2 ↓ (-0.2) | 3.5 ↓ (+0.1) | 6.0 ↓ (-0.0) | 1.6 ↓ (+0.1) | 0.2 (-0.0) | 7.5 (+0.1) | 0.6 (+0.0) | 0.2 (-0.0) | 20.0 (-1.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.1) | 0.2 (+0.0) | 0.8 (-0.0) | 0.1 (+0.0) | 0.6 (-0.0) | 155.4 (-2.0) | 0.5 (+0.0) | 0.8 (-0.2) | 0.0 (-0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.3 (+0.1) | 0.6 (+0.0) | 0.1 (-0.0) | 74.3 ✓ (+0.1) | 0.700 (+0.0) | 0.090 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.610 (+0.0) | 45% (16% drawn) | 45.0% (19.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 91 | 22 | 0.8 | 10 | 0 | 3 | 3 | 37 | 47 | 64 | 24 | 12 | 28 | 5.4 | 0.58 | 55.9 |
| open-side target off | 0.25 (-0.1) | 91 (+0.0) | 19 (-3.0) | 0.6 (-0.2) | 11 (+1.0) | 0 (+0.0) | 5 (+1.6) | 4 (+0.3) | 34 (-2.9) | 47 (-0.0) | 64 (-0.4) | 24 (-0.4) | 13 (+0.8) | 28 (-0.1) | 5.3 (-0.1) | 0.58 (+0.0) | 55.3 (-0.6) |

_Tries 1.5 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.6 ↓ | 5.1 ↓ | 16.4 | 0.3 | 2.6 ↓ | 3.3 ↓ | 5.0 ↓ | 1.7 ↓ | 0.2 | 7.0 | 0.7 | 0.3 | 24.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.7 | 0.1 | 0.3 | 125.4 | 0.7 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.3 ✓ | 0.420 | 0.090 ↓ | 0.000 ↓ | 0.000 ✓ | 0.330 | 48% (23% drawn) | 41.5% (20.5% drawn) | 0.70 | 93%/93% |
| open-side target off | 53.4 ↓ (-0.2) | 5.5 ↓ (+0.3) | 16.3 (-0.2) | 0.3 (+0.0) | 2.9 ↓ (+0.2) | 3.4 ↓ (+0.1) | 5.1 ↓ (+0.1) | 1.6 ↓ (-0.1) | 0.2 (-0.0) | 7.3 (+0.2) | 0.7 (-0.0) | 0.3 (+0.0) | 26.0 (+2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.0) | 0.1 (+0.0) | 0.7 (-0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 124.9 (-0.5) | 0.6 (-0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.1) | 0.5 (+0.0) | 0.1 (+0.1) | 73.8 ✓ (-0.5) | 0.420 (+0.0) | 0.070 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (+0.0) | 46% (26% drawn) | 41.5% (20.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 83 | 24 | 0.7 | 15 | 0 | 7 | 7 | 31 | 41 | 55 | 27 | 18 | 26 | 5.7 | 0.18 | 55.7 |
| open-side target off | 0.25 (-0.0) | 82 (-1.0) | 18 (-6.0) | 0.5 (-0.3) | 11 (-4.2) | 0 (+0.0) | 6 (-0.3) | 5 (-2.1) | 39 (+7.7) | 40 (-1.1) | 56 (+1.6) | 25 (-1.4) | 18 (-0.2) | 27 (+1.1) | 5.6 (-0.1) | 0.20 (+0.0) | 54.9 (-0.8) |

_Tries 1.7 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.4 ↓ | 16.2 | 0.2 | 2.3 ↓ | 3.6 ↓ | 6.1 ↓ | 1.6 ↓ | 0.1 | 7.1 | 0.7 | 0.3 | 28.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.4 | 0.1 | 0.6 | 143.4 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 72.7 ✓ | 0.700 | 0.030 ↓ | 0.010 ↓ | 0.000 ✓ | 0.660 | 38% (19% drawn) | 37.0% (17.5% drawn) | 0.70 | 93%/93% |
| open-side target off | 51.2 ↓ (+0.0) | 5.6 ↓ (+0.3) | 16.5 (+0.3) | 0.2 (+0.0) | 2.3 ↓ (+0.1) | 3.7 ↓ (+0.1) | 6.0 ↓ (-0.1) | 1.6 ↓ (+0.1) | 0.2 (+0.0) | 7.3 (+0.2) | 0.7 (+0.0) | 0.3 (-0.0) | 25.0 (-3.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.9 (+0.1) | 0.1 (-0.0) | 0.3 (-0.1) | 0.1 (-0.0) | 0.6 (-0.0) | 138.4 (-5.0) | 0.5 (-0.0) | 0.8 (-0.1) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (+0.0) | 0.1 (+0.1) | 0.4 (-0.1) | 0.1 (-0.0) | 72.7 ✓ (-0.1) | 0.710 (+0.0) | 0.050 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.650 (-0.0) | 41% (15% drawn) | 44.0% (12.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.16 | 80 | 12 | 0.4 | 11 | 0 | 4 | 5 | 38 | 42 | 67 | 21 | 12 | 27 | 5.5 | 0.63 | 55.2 |
| open-side target off | 0.12 (-0.0) | 83 (+3.0) | 12 (+0.0) | 0.4 (+0.0) | 11 (+0.1) | 0 (+0.0) | 5 (+0.4) | 5 (-0.2) | 34 (-3.5) | 45 (+3.1) | 65 (-1.7) | 22 (+1.3) | 13 (+0.4) | 27 (-0.2) | 5.4 (-0.0) | 0.69 (+0.1) | 54.9 (-0.3) |

_Tries 1.6 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 5.9 ↓ | 18.3 | 0.3 | 3.4 ↓ | 3.6 ↓ | 5.1 ↓ | 1.8 ↓ | 0.2 | 7.3 | 0.9 | 0.3 | 27.0 | 0.0 | 0.1 | 1.1 | 0.0 | 0.5 | 0.0 | 0.4 | 122.8 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.0 | 0.4 | 0.1 | 73.2 ✓ | 0.490 | 0.090 ↓ | 0.020 ↓ | 0.000 ✓ | 0.380 | 42% (19% drawn) | 38.0% (19.5% drawn) | 0.70 | 93%/93% |
| open-side target off | 51.3 ↓ (+0.4) | 5.9 ↓ (-0.0) | 18.6 (+0.3) | 0.3 (-0.0) | 3.5 ↓ (+0.0) | 3.6 ↓ (+0.0) | 5.2 ↓ (+0.1) | 1.8 ↓ (-0.0) | 0.2 (+0.0) | 7.3 (+0.0) | 1.0 (+0.1) | 0.4 (+0.0) | 31.0 (+4.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.0) | 0.1 (+0.0) | 0.5 (+0.0) | 0.0 (+0.0) | 0.4 (-0.0) | 125.2 (+2.3) | 0.5 (-0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 0.1 (+0.0) | 73.5 ✓ (+0.3) | 0.510 (+0.0) | 0.090 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (+0.0) | 48% (13% drawn) | 43.5% (18.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.09 | 81 | 17 | 0.3 | 10 | 0 | 9 | 5 | 41 | 34 | 58 | 22 | 21 | 27 | 5.5 | 0.26 | 54.5 |
| open-side target off | 0.11 (+0.0) | 75 (-6.0) | 19 (+2.0) | 0.4 (+0.0) | 12 (+1.2) | 0 (+0.0) | 9 (+0.7) | 6 (+0.1) | 41 (-0.7) | 33 (-1.3) | 58 (-0.0) | 23 (+1.2) | 20 (-1.2) | 27 (+0.1) | 5.4 (-0.1) | 0.28 (+0.0) | 54.6 (+0.1) |

_Tries 1.8 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 4.9 ↓ | 22.8 | 0.1 | 2.5 ↓ | 3.6 ↓ | 5.7 ↓ | 1.9 ↓ | 0.1 | 9.3 | 1.0 | 0.2 | 21.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.1 | 0.5 | 139.8 | 0.8 | 0.6 | 0.0 | 0.1 | 0.3 | 0.4 | 0.5 | 0.1 | 74.2 ✓ | 0.630 | 0.110 ↓ | 0.000 ↓ | 0.000 ✓ | 0.520 | 36% (20% drawn) | 33.0% (16.5% drawn) | 0.69 | 93%/93% |
| open-side target off | 52.5 ↓ (+0.3) | 4.7 ↓ (-0.2) | 22.0 (-0.8) | 0.2 (+0.1) | 2.5 ↓ (-0.1) | 3.7 ↓ (+0.0) | 5.8 ↓ (+0.1) | 1.9 ↓ (+0.0) | 0.2 (+0.0) | 9.1 (-0.2) | 1.0 (-0.1) | 0.2 (-0.0) | 18.0 (-3.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.1 (+0.1) | 0.1 (+0.0) | 0.6 (-0.1) | 0.0 (-0.0) | 0.4 (-0.1) | 137.6 (-2.2) | 0.9 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.3 (-0.1) | 0.5 (-0.0) | 0.1 (-0.0) | 74.8 ✓ (+0.6) | 0.610 (-0.0) | 0.130 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.470 (-0.1) | 44% (15% drawn) | 38.0% (16.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 81 | 11 | 0.8 | 14 | 0 | 4 | 11 | 35 | 36 | 64 | 23 | 13 | 27 | 5.4 | 0.36 | 54.3 |
| open-side target off | 0.20 (-0.0) | 75 (-6.0) | 15 (+4.0) | 0.7 (-0.1) | 16 (+2.0) | 0 (+0.0) | 6 (+1.5) | 8 (-2.2) | 36 (+0.7) | 34 (-1.9) | 63 (-0.6) | 24 (+0.3) | 13 (+0.4) | 28 (+0.6) | 5.4 (-0.1) | 0.43 (+0.1) | 54.2 (-0.0) |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.4 ↓ | 16.3 | 0.3 | 2.4 ↓ | 3.4 ↓ | 5.7 ↓ | 1.5 ↓ | 0.2 | 7.5 | 0.6 | 0.3 | 25.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.6 | 0.0 | 0.5 | 145.8 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 73.4 ✓ | 0.560 | 0.100 ↓ | 0.010 ↓ | 0.000 ✓ | 0.450 | 36% (22% drawn) | 37.0% (22.0% drawn) | 0.70 | 93%/93% |
| open-side target off | 52.7 ↓ (+0.4) | 5.3 ↓ (-0.0) | 16.2 (-0.0) | 0.3 (+0.0) | 2.5 ↓ (+0.1) | 3.6 ↓ (+0.2) | 5.5 ↓ (-0.2) | 1.6 ↓ (+0.0) | 0.2 (-0.0) | 7.2 (-0.4) | 0.6 (-0.0) | 0.3 (-0.0) | 24.0 (-1.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.0) | 0.2 (+0.0) | 0.6 (-0.1) | 0.1 (+0.0) | 0.5 (+0.0) | 136.9 (-8.9) | 0.5 (+0.0) | 0.8 (+0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.0 (-0.1) | 0.5 (+0.1) | 0.1 (+0.0) | 73.0 ✓ (-0.4) | 0.590 (+0.0) | 0.110 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.470 (+0.0) | 43% (22% drawn) | 41.0% (21.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 88 | 18 | 0.6 | 10 | 0 | 3 | 7 | 37 | 42 | 63 | 21 | 17 | 26 | 5.5 | 0.32 | 55.0 |
| open-side target off | 0.24 (+0.0) | 86 (-2.0) | 16 (-2.0) | 0.7 (+0.1) | 12 (+1.6) | 0 (+0.0) | 5 (+1.8) | 8 (+0.5) | 31 (-6.0) | 44 (+2.1) | 61 (-1.7) | 22 (+1.3) | 17 (+0.4) | 26 (-0.5) | 5.4 (-0.2*) | 0.41 (+0.1) | 55.1 (+0.0) |

_Tries 1.5 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.2 ↓ | 15.8 | 0.4 | 2.6 ↓ | 3.9 ↓ | 5.4 ↓ | 1.7 ↓ | 0.1 | 7.4 | 0.5 | 0.4 | 35.0 | 0.0 | 0.1 | 0.8 | 0.1 | 0.7 | 0.0 | 0.6 | 117.7 | 0.7 | 0.9 | 0.1 | 0.1 | 0.3 | -0.2 | 0.5 | 0.1 | 73.0 ✓ | 0.400 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 55% (15% drawn) | 0.72 | 93%/93% |
| open-side target off | 52.3 ↓ (-0.1) | 5.5 ↓ (+0.3) | 15.7 (-0.2) | 0.5 (+0.1) | 2.3 ↓ (-0.4) | 4.2 ↓ (+0.3) | 5.2 ↓ (-0.2) | 2.1 ↓ (+0.4) | 0.1 (+0.0) | 7.2 (-0.3) | 0.5 (+0.0) | 0.4 (+0.0) | 35.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.3) | 0.0 (-0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.5 (-0.1) | 103.8 (-13.9) | 0.7 (+0.0) | 1.1 (+0.2) | 0.1 (+0.0) | 0.1 (-0.1) | 0.1 (-0.2) | -0.2 (+0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 71.9 ✓ (-1.1) | 0.350 (-0.1) | 0.050 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.300 (-0.0) | 55% (10% drawn) | 0.73 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 90 | 25 | 1.1 | 18 | 0 | 0 | 12 | 35 | 35 | 61 | 24 | 15 | 28 | 5.4 | 0.25 | 53.6 |
| open-side target off | 0.35 (+0.0) | 85 (-5.0) | 25 (+0.0) | 1.3 (+0.2) | 16 (-1.4) | 0 (+0.0) | 2 (+2.3) | 9 (-2.5) | 35 (-0.4) | 37 (+1.9) | 58 (-2.8) | 25 (+1.2) | 17 (+1.6) | 27 (-1.5) | 5.5 (+0.1) | 0.40 (+0.2) | 52.5 (-1.2) |

_Tries 1.7 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.6 ↓ | 8.9 ↓ | 18.6 | 0.1 | 2.3 ↓ | 3.0 ↓ | 5.2 ↓ | 2.8 ↓ | 0.3 | 6.8 | 1.2 | 0.6 | 50.0 | 0.0 | 0.0 | 1.7 | 0.1 | 0.5 | 0.1 | 0.1 | 118.8 | 0.8 | 0.9 | 0.0 | 0.0 | 0.0 | 0.0 | 0.4 | 0.0 | 77.6 ✓ | 0.800 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.600 | 80% | 0.68 | 92%/93% |
| open-side target off | 50.2 ↓ (-0.4) | 9.8 ↓ (+0.9) | 20.6 (+2.0) | 0.1 (-0.0) | 2.1 ↓ (-0.1) | 3.6 ↓ (+0.6) | 4.7 ↓ (-0.5) | 3.0 ↓ (+0.3) | 0.3 (-0.0) | 6.0 (-0.9) | 1.6 (+0.4) | 0.6 (-0.0) | 45.0 (-5.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.6 (-0.1) | 0.1 (+0.1) | 0.3 (-0.2) | 0.1 (+0.0) | 0.1 (+0.0) | 100.7 (-18.0) | 0.8 (+0.0) | 0.8 (-0.2) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.2) | 0.0 (+0.0) | 75.3 ✓ (-2.2) | 0.600 (-0.2) | 0.200 ✓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (-0.2) | 75% | 0.68 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 15 | 1.8 | 15 | 0 | 0 | 7 | 24 | 55 | 58 | 27 | 15 | 29 | 5.3 | 0.40 | 55.8 |
| open-side target off | 0.25 (-0.2) | 65 (-15.0) | 10 (-5.0) | 0.5 (-1.3) | 13 (-1.4) | 0 (+0.0) | 2 (+1.6) | 15 (+7.5) | 25 (+1.0) | 46 (-8.6) | 56 (-2.0) | 25 (-1.5) | 19 (+3.5) | 28 (-1.7) | 5.2 (-0.1) | 0.35 (-0.1) | 53.4 (-2.4) |

_Tries 2.8 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 3.3 ↓ | 16.3 | 3.3 | 1.3 ↓ | 3.7 ↓ | 6.2 ↓ | 1.5 ↓ | 0.1 | 5.0 | 0.4 | 0.3 | 30.0 | 4.0 | 10.6 | 0.6 | 0.2 | 0.8 | 0.0 | 0.4 | 160.4 | 0.3 | 0.3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.3 | 0.1 | 71.2 ✓ | 0.458 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.417 | 35% (20% drawn) | 0.69 | 52%/52% |
| open-side target off | 51.5 ↓ (+0.6) | 3.3 ↓ (+0.0) | 15.7 (-0.6) | 3.0 (-0.3) | 1.3 ↓ (+0.0) | 3.6 ↓ (-0.1) | 6.1 ↓ (-0.1) | 1.5 ↓ (+0.0) | 0.1 (+0.0) | 5.0 (+0.1) | 0.4 (+0.0) | 0.3 (+0.0) | 25.0 (-5.0) | 4.1 (+0.0) | 10.5 (-0.1) | 0.6 (+0.0) | 0.3 (+0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.4 (+0.0) | 158.4 (-2.0) | 0.3 (+0.0) | 0.4 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.3 (+0.0) | 0.0 (-0.0) | 72.0 ✓ (+0.7) | 0.500 (+0.0) | 0.042 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.458 (+0.0) | 45% (15% drawn) | 0.67 | 52%/52% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 90 | 30 | 0.6 | 14 | 0 | 0 | 3 | 25 | 58 | 63 | 22 | 15 | 26 | 5.8 | 0.42 | 55.4 |
| open-side target off | 0.29 (+0.0) | 90 (+0.0) | 40 (+10.0) | 0.7 (+0.1) | 16 (+2.3) | 0 (+0.0) | 3 (+2.7) | 5 (+2.6) | 22 (-3.4) | 54 (-4.3) | 61 (-1.3) | 24 (+1.5) | 15 (-0.2) | 28 (+1.3) | 5.8 (-0.0) | 0.46 (+0.0) | 54.5 (-0.9) |

_Tries 1.5 and last tackles 9.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_26 cells in 753 s._
## Standard outcome checks

All 26 cells completed. Both variants ran 1,340 matches, including the standard late-legs stretches. For each of the 13 fixtures, the disabled variant reproduced all the preceding main run’s reported metrics exactly. The preceding main run used `d70989b`, the gameplay commit’s direct parent. The harness comparison below uses that run. The preregistration originally named the older `6fa043c` run, which was the newest result visible locally before fetching the current `balance-log` branch. [Preceding main report](../20261120-015711-standard/report.md)

The table shows off → default. An asterisk follows the standard harness test for the selected outcome columns. Kick metres is the match total from all kicks of all types. Set start is the new possession’s first play-the-ball distance to the line it attacks. The ordinary-kick table that follows measures only the class of kicks eligible for the feature.

| Fixture | Tries | Kicks | Kick metres | Completion % | Set start m to go | Touch finds | 40/20s |
|---|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | 2.0 → 1.9 | 5.9 → 5.8 | 145.1 → 153.6 | 73.6 → 72.8 | 53.7 → 55.5 | 1.0 → 1.0 | 0.1 → 0.1 |
| stamina 30 v 80 | 2.0 → 2.0 | 5.5 → 4.8 | 136.7 → 124.3 | 70.4 → 72.6 | 55.3 → 54.0 | 0.9 → 0.6 | 0.1 → 0.0 |
| slide v rush | 1.5 → 1.6 | 5.9 → 6.0 | 153.0 → 156.4 | 70.8 → 72.6 | 56.5 → 56.3 | 0.7 → 0.5 | 0.0 → 0.0 |
| expansive v grind | 1.6 → 1.4 | 5.7 → 5.7 | 147.6 → 146.8 | 75.5 → 76.7 | 54.9 → 55.6 | 0.8 → 1.0 | 0.1 → 0.1 |
| grind v balanced | 1.6 → 1.5 | 6.0 → 6.0 | 155.4 → 157.4 | 74.3 → 74.2 | 55.3 → 55.9 | 0.8 → 0.8 | 0.1 → 0.0 |
| expansive v balanced | 1.6 → 1.7 | 5.1 → 5.0 | 124.9 → 125.4 | 73.8 → 74.3 | 54.9 → 55.7 | 0.7 → 0.7 | 0.1 → 0.1 |
| kick-chase v balanced | 1.6 → 1.6 | 6.0 → 6.1 | 138.4 → 143.4 | 72.7 → 72.7 | 54.9 → 55.2 | 0.3 → 0.4 | 0.1 → 0.1 |
| all-out v balanced | 1.8 → 1.8 | 5.2 → 5.1 | 125.2 → 122.8 | 73.5 → 73.2 | 54.6 → 54.5 | 0.5 → 0.5 | 0.0 → 0.0 |
| rush v slide | 1.9 → 1.9 | 5.8 → 5.7 | 137.6 → 139.8 | 74.8 → 74.2 | 54.2 → 54.3 | 0.6 → 0.7 | 0.0 → 0.1 |
| compressed v slide | 1.6 → 1.5 | 5.5 → 5.7 | 136.9 → 145.8 | 73.0 → 73.4 | 55.1 → 55.0 | 0.6 → 0.6 | 0.1 → 0.0 |
| 70 v 50 | 2.1 → 1.7 | 5.2 → 5.4 | 103.8 → 117.7 | 71.9 → 73.0 | 52.5 → 53.6 | 0.6 → 0.7 | 0.0 → 0.0 |
| fliers v stayers | 3.0 → 2.8 | 4.7 → 5.2 | 100.7 → 118.8 | 75.3 → 77.6 | 53.4 → 55.8 | 0.3 → 0.5 | 0.1 → 0.1 |
| last 6 min on late legs | 1.5 → 1.5 | 6.1 → 6.2 | 158.4 → 160.4 | 72.0 → 71.2 | 54.5 → 55.4 | 0.6 → 0.8 | 0.0 → 0.0 |

### Preset yardsticks

Each entry uses 100 seeds in both orientations. Side win counts outright wins. Points share gives half credit for a draw. The 45–55% check appears in the standard plan’s description. The revised 42–58% flat preset guard was ratified under #465. The delta SE combines the two cell-level harness errors in quadrature. The standard harness stores aggregates, so its full-sample output cannot recover paired seed uncertainty.

| Tracked preset | Side win off → default | Draws off → default | Points share off → default | Points share change (pp) | Combined SE (pp) |
|---|---:|---:|---:|---:|---:|
| grind v balanced | 45.0 → 47.0 | 19.5 → 16.0 | 54.75 → 55.00 | +0.25 | 4.52 |
| expansive v balanced | 41.5 → 41.5 | 20.5 → 20.5 | 51.75 → 51.75 | +0.00 | 4.47 |
| kick-chase v balanced | 44.0 → 37.0 | 12.5 → 17.5 | 50.25 → 45.75 | -4.50 | 4.61 |
| all-out v balanced | 43.5 → 38.0 | 18.0 → 19.5 | 52.50 → 47.75 | -4.75 | 4.51 |
| rush v slide | 38.0 → 33.0 | 16.5 → 16.5 | 46.25 → 41.25 | -5.00 | 4.53 |
| compressed v slide | 41.0 → 37.0 | 21.0 → 22.0 | 51.50 → 48.00 | -3.50 | 4.44 |

### §7 band crossings and inherited flags

The standard report applies its count targets, which were calibrated at 14 minutes, to the current two 2.5-minute halves. The late-legs counts are scaled from six minutes to five. Every preceding and default row is below the bands for tackles, line breaks, offloads, errors, kicks and tries. Completion and the grubber bands are shown below wherever a band side changes. Other off-band grubber readings are visible in the full tables.

No §7 band crossings were observed. All 13 completion readings were inside 70–80% in both variants.

### Interpretation

The standard harness did not flag any of the selected tries, kicks, kick metres, completion, first play-the-ball territory, touch-find or 40/20 differences. Its other starred comparison was Compressed v Slide first-receiver slots, 5.4 → 5.6. The 42–58% points-share criterion was missed by Rush v Slide at the default (41.25%). Its change was −5.00 pp with 4.53 pp combined SE. Kick-chase's 45.75% was inside both stated points-share ranges. Its estimated −4.50 pp change has 4.61 pp combined SE. Five presets were already below 45% on outright wins before the change. The stronger conclusions supported by this sample concern the kick geometry.

## Ordinary in-play long kicks

Kick-level means in metres and 95% paired seed-cluster bootstrap intervals for the change. The bootstrap draws the same seeds in both variants and keeps both orientations of a seed together. Match paths can diverge after the first changed kick. Individual kicks are not paired. Positions use the kicking side’s own try line as X = 0. Y uses a fixed touchline as Y = 0. The lateral centre is at Y = 34 m. The nearest receiving back is one of the fullback (or stand-in), wingers or centre. A chaser or receiver is eligible if on the field and free at the observation tick. Positive chaser minus receiver distance means the receiver is nearer.

| Fixture | Variant | Matches | Ordinary launches | Reached first landing | Excluded launches tracked |
|---|---|---:|---:|---:|---|
| even 60 v 60 | open-side target off | 20 | 24 | 24 | 40-20 5, bomb 20, chip 4, cross-field 12, drop-out 2, grubber 11, kickoff 80, penalty-touch 8, touch 42 |
| even 60 v 60 | baseline | 20 | 28 | 28 | 40-20 6, bomb 19, chip 3, cross-field 10, drop-out 2, grubber 10, kickoff 75, penalty-touch 11, touch 40 |
| kick-chase v balanced | open-side target off | 80 | 112 | 112 | 40-20 10, bomb 113, chip 19, cross-field 37, drop-out 7, grubber 50, kickoff 318, penalty-touch 34, touch 95 |
| kick-chase v balanced | baseline | 80 | 112 | 112 | 40-20 12, bomb 99, chip 19, cross-field 46, drop-out 7, grubber 54, kickoff 308, penalty-touch 33, touch 105 |

### Even Balanced v Balanced

| Metric (m) | Off (n) | Default (n) | Default − off [95% interval] |
|---|---:|---:|---:|
| Launch X | 33.11 (24) | 36.11 (28) | +3.00 [-0.75, +7.14] |
| Launch Y | 44.84 (24) | 45.23 (28) | +0.39 [-1.81, +2.38] |
| First landing X | 65.11 (24) | 68.11 (28) | +3.00 [-0.75, +7.14] |
| First landing Y | 36.25 (24) | 30.06 (28) | -6.20 [-9.75, -2.80] |
| Forward distance | 32.00 (24) | 32.00 (28) | +0.00 [+0.00, +0.00] |
| First landing distance from centre | 5.10 (24) | 9.07 (28) | +3.98 [+1.61, +6.47] |
| Nearest receiving back to target at launch | 8.00 (24) | 15.48 (28) | +7.48 [+3.49, +12.03] |
| Nearest receiving back to first landing | 0.18 (24) | 1.86 (28) | +1.68 [+0.62, +2.95] |
| Nearest eligible receiver to first landing | 0.17 (24) | 1.72 (28) | +1.55 [+0.62, +2.63] |
| Nearest eligible chaser to first landing | 14.34 (24) | 16.59 (28) | +2.25 [+1.11, +3.54] |
| Chaser distance less receiver distance | 14.18 (24) | 14.88 (28) | +0.70 [-0.22, +1.74] |

- Open-side target off first contacts receiving catch 23, spill 1.
- Baseline first contacts bounce 7, receiving catch 20, spill 1.

### Kick-chase in Kick-chase v Balanced

| Metric (m) | Off (n) | Default (n) | Default − off [95% interval] |
|---|---:|---:|---:|
| Launch X | 36.65 (53) | 35.62 (45) | -1.03 [-4.15, +2.15] |
| Launch Y | 44.99 (53) | 45.80 (45) | +0.81 [-0.40, +2.16] |
| First landing X | 68.65 (53) | 67.62 (45) | -1.03 [-4.15, +2.15] |
| First landing Y | 37.86 (53) | 28.51 (45) | -9.34 [-12.00, -6.57] |
| Forward distance | 32.00 (53) | 32.00 (45) | +0.00 [+0.00, +0.00] |
| First landing distance from centre | 5.41 (53) | 9.27 (45) | +3.86 [+2.00, +5.92] |
| Nearest receiving back to target at launch | 7.74 (53) | 13.88 (45) | +6.14 [+4.45, +7.85] |
| Nearest receiving back to first landing | 0.25 (53) | 0.76 (45) | +0.51 [+0.11, +1.01] |
| Nearest eligible receiver to first landing | 0.21 (53) | 0.75 (45) | +0.54 [+0.19, +1.02] |
| Nearest eligible chaser to first landing | 14.60 (53) | 16.89 (45) | +2.29 [+1.66, +2.90] |
| Chaser distance less receiver distance | 14.39 (53) | 16.14 (45) | +1.75 [+0.96, +2.43] |

- Open-side target off first contacts bounce 2, receiving catch 49, spill 2.
- Baseline first contacts bounce 2, receiving catch 40, spill 3.

### Balanced in Kick-chase v Balanced

| Metric (m) | Off (n) | Default (n) | Default − off [95% interval] |
|---|---:|---:|---:|
| Launch X | 35.36 (59) | 35.50 (67) | +0.14 [-1.88, +2.04] |
| Launch Y | 44.54 (59) | 44.26 (67) | -0.28 [-1.48, +0.87] |
| First landing X | 67.36 (59) | 67.50 (67) | +0.14 [-1.88, +2.04] |
| First landing Y | 38.50 (59) | 30.59 (67) | -7.91 [-10.39, -5.13] |
| Forward distance | 32.00 (59) | 32.00 (67) | +0.00 [+0.00, +0.00] |
| First landing distance from centre | 6.20 (59) | 7.84 (67) | +1.64 [+0.03, +3.22] |
| Nearest receiving back to target at launch | 7.24 (59) | 13.15 (67) | +5.91 [+3.97, +7.66] |
| Nearest receiving back to first landing | 0.29 (59) | 1.74 (67) | +1.45 [+0.81, +2.23] |
| Nearest eligible receiver to first landing | 0.25 (59) | 1.24 (67) | +0.98 [+0.52, +1.51] |
| Nearest eligible chaser to first landing | 14.00 (59) | 16.09 (67) | +2.09 [+1.34, +2.78] |
| Chaser distance less receiver distance | 13.75 (59) | 14.85 (67) | +1.11 [+0.19, +1.96] |

- Open-side target off first contacts bounce 2, receiving catch 54, spill 3.
- Baseline first contacts bounce 11, receiving catch 53, spill 3.

### Available paired score check

The geometry records also contain per-match scores for 80 disabled and 80 default Kick-chase v Balanced matches. This subset comprises the first 40 standard seeds, both orientations. Its points share moves from 52.500% to 46.875%, a change of -5.625 pp [95% paired seed-cluster interval -12.50, +1.25] pp. The standard results provide an aggregate estimate for all 100 seeds in each orientation. Rush was outside the geometry sample, so Rush has no observed paired inference.

### Geometry interpretation and provenance

All 276 recorded ordinary launches reached their first landing. The default shifted landings farther from centre and farther from the closest receiving back at launch in all three splits. In the neutral row, the mean landing was 3.98 m wider [+1.61, +6.47] and 7.48 m farther from a receiving back when the ball left the boot [+3.49, +12.03]. All the ordinary punts in these flat fixtures travelled 32.00 m forward. The first-landing distance gap still typically favoured the receiver. The gap increased on Kick-chase's own kicks and the Balanced opponent's kicks. The neutral estimate for the gap includes zero. First contact was still usually a clean receiving catch. First bounces increased from 4 of 136 off to 20 of 140 default across the observed fixtures.

The standard tables came from an unmodified checkout of `f5474ea4`. The geometry used the same commit in a second checkout, with observation added only to the headless harness's `BalanceSim`. The neutral cell aggregates with the observation matched the clean harness exactly for both variants, excluding elapsed time. The patch passes `tsc --noEmit`. [Original preregistration](preregistration.md) · [Geometry plan](geometry-plan.json) · [Observation patch](geometry-observation.patch) · [Raw seeded observations](long-kick-observations.jsonl) · [Geometry aggregation](summarize-geometry.py) · [Standard checks](summarize-standard.py)

To reproduce the geometry, apply `geometry-observation.patch` in a separate checkout of that commit. Run the official runner with `NRL_LONG_KICK_OBSERVATIONS` set to a new output path. Then run the geometry summary on those observations.

```sh
git apply /path/to/geometry-observation.patch
NRL_LONG_KICK_OBSERVATIONS=/tmp/kick-observations.jsonl npm run balance -- --plan /path/to/geometry-plan.json
python3 /path/to/summarize-geometry.py /tmp/kick-observations.jsonl
```
