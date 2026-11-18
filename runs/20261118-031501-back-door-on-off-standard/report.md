# Balance: back-door on-off standard

Compare the default back-door shape behavior with shapes.backDoor.on disabled across the standard match-balance scenarios.

**commit** a9a9c35 · **branch** feat/match-back-door · **started** 2026-11-18T03:15:01.558Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 6.3 ↓ | 15.5 | 0.3 | 2.9 ↓ | 4.3 ↓ | 5.3 ↓ | 2.0 ↓ | 0.1 | 6.8 | 0.3 | 0.2 | 20.0 | 0.0 | 0.1 | 0.9 | 0.0 | 0.6 | 0.1 | 0.6 | 119.4 | 0.5 | 0.5 | 0.1 | 0.0 | 0.0 | 0.0 | 0.8 | 0.1 | 70.1 ✓ | 0.550 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 25% (20% drawn) | 0.70 | 93%/94% |
| back-door off | 52.0 ↓ (+0.5) | 5.8 ↓ (-0.6) | 16.7 (+1.2) | 0.3 (+0.0) | 2.4 ↓ (-0.5) | 3.2 ↓ (-1.1) | 5.5 ↓ (+0.3) | 2.0 ↓ (-0.0) | 0.1 (+0.0) | 7.3 (+0.4) | 0.7 (+0.4) | 0.3 (+0.1) | 25.0 (+5.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.8 (-0.1) | 0.1 (+0.1) | 0.8 (+0.3) | 0.1 (-0.1) | 0.6 (+0.0) | 133.5 (+14.1) | 0.5 (+0.0) | 0.9 (+0.4) | 0.1 (+0.0) | 0.1 (+0.1) | 0.0 (+0.0) | 0.3 (+0.3) | 0.5 (-0.3) | 0.1 (-0.1) | 75.3 ✓ (+5.2) | 0.650 (+0.1) | 0.100 ↓ (+0.0) | 0.100 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 45% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 75 | 0 | 1.4 | 7 | 0 | 7 | 5 | 37 | 44 | 62 | 23 | 15 | 26 | 5.3 | 0.35 | 52.9 |
| back-door off | 0.20 (-0.0) | 80 (+5.0) | 5 (+5.0) | 0.8 (-0.6) | 8 (+0.2) | 0 (+0.0) | 5 (-2.3) | 8 (+2.6) | 30 (-6.6) | 50 (+6.1) | 61 (-0.5) | 25 (+1.4) | 14 (-0.9) | 29 (+2.4) | 5.4 (+0.0) | 0.25 (-0.1) | 54.2 (+1.3) |

_Tries 2.0 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.3 ↓ | 5.8 ↓ | 16.3 | 0.1 | 2.9 ↓ | 3.6 ↓ | 5.4 ↓ | 1.6 ↓ | 0.1 | 7.5 | 0.5 | 0.3 | 25.0 | 0.0 | 0.0 | 0.7 | 0.1 | 0.6 | 0.0 | 0.5 | 130.0 | 0.8 | 0.9 | 0.0 | 0.1 | 0.2 | 0.2 | 0.3 | 0.0 | 73.7 ✓ | 0.600 | 0.050 ↓ | 0.050 ✓ | 0.000 ✓ | 0.500 | 45% (10% drawn) | 0.69 | 91%/93% |
| back-door off | 52.0 ↓ (-1.3) | 5.8 ↓ (-0.1) | 15.5 (-0.8) | 0.2 (+0.1) | 2.4 ↓ (-0.5) | 3.7 ↓ (+0.1) | 5.4 ↓ (+0.0) | 2.0 ↓ (+0.4) | 0.2 (+0.1) | 7.1 (-0.5) | 0.6 (+0.1) | 0.5 (+0.2) | 30.0 (+5.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.9 (+0.3) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.4 (-0.0) | 119.2 (-10.8) | 0.5 (-0.3) | 1.0 (+0.1) | 0.0 (+0.0) | 0.0 (-0.1) | 0.0 (-0.2) | 0.0 (-0.2) | 0.4 (+0.1) | 0.0 (+0.0) | 73.9 ✓ (+0.2) | 0.600 (+0.0) | 0.200 ✓ (+0.2) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (-0.2) | 55% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.00 | 75 | 10 | 0.0 | 6 | 0 | 3 | 15 | 42 | 33 | 58 | 26 | 16 | 28 | 5.3 | 0.35 | 55.2 |
| back-door off | 0.20 (+0.2*) | 70 (-5.0) | 5 (-5.0) | 1.1 (+1.1) | 15 (+8.6) | 0 (+0.0) | 5 (+1.8) | 10 (-5.4) | 34 (-8.3) | 37 (+3.3) | 59 (+0.9) | 27 (+1.4) | 14 (-2.4) | 25 (-2.4) | 5.4 (+0.1) | 0.65 (+0.3) | 54.1 (-1.0) |

_Tries 1.7 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 5.3 ↓ | 21.3 | 0.3 | 2.3 ↓ | 4.2 ↓ | 5.5 ↓ | 2.2 ↓ | 0.1 | 8.8 | 0.6 | 0.1 | 10.0 | 0.0 | 0.3 | 1.3 | 0.1 | 0.5 | 0.1 | 0.5 | 132.2 | 0.8 | 0.7 | 0.0 | 0.1 | 0.3 | -0.6 | 0.6 | 0.4 | 70.8 ✓ | 0.450 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 65% (10% drawn) | 0.69 | 93%/93% |
| back-door off | 52.1 ↓ (+0.5) | 4.7 ↓ (-0.6) | 21.6 (+0.3) | 0.2 (-0.1) | 2.6 ↓ (+0.3) | 3.8 ↓ (-0.4) | 5.8 ↓ (+0.3) | 1.9 ↓ (-0.3) | 0.1 (-0.1) | 8.3 (-0.4) | 0.7 (+0.1) | 0.3 (+0.1) | 15.0 (+5.0) | 0.0 (+0.0) | 0.1 (-0.1) | 1.1 (-0.3) | 0.1 (+0.0) | 0.9 (+0.4) | 0.1 (+0.0) | 0.6 (+0.1) | 140.2 (+8.1) | 1.0 (+0.2) | 0.8 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (-0.0) | 0.4 (+1.0*) | 0.5 (-0.1) | 0.2 (-0.2) | 71.9 ✓ (+1.1) | 0.550 (+0.1) | 0.050 ↓ (+0.0) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 55% (10% drawn) | 0.67 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 75 | 10 | 0.8 | 11 | 0 | 0 | 11 | 36 | 41 | 65 | 23 | 12 | 26 | 5.5 | 0.30 | 53.7 |
| back-door off | 0.35 (+0.1) | 75 (+0.0) | 15 (+5.0) | 1.3 (+0.5) | 5 (-6.1) | 0 (+0.0) | 5 (+5.3) | 11 (-0.8) | 45 (+8.4) | 34 (-6.7) | 64 (-1.3) | 19 (-4.0) | 18 (+5.3) | 28 (+2.7) | 5.4 (-0.1) | 0.45 (+0.2) | 53.7 (+0.0) |

_Tries 2.2 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.5 ↓ | 5.1 ↓ | 17.0 | 0.2 | 2.7 ↓ | 3.5 ↓ | 5.3 ↓ | 1.9 ↓ | 0.1 | 8.1 | 0.8 | 0.3 | 15.0 | 0.0 | 0.1 | 0.8 | 0.1 | 0.5 | 0.1 | 0.3 | 125.7 | 0.7 | 1.1 | 0.0 | 0.1 | 0.4 | 0.3 | 0.5 | 0.2 | 76.9 ✓ | 0.350 | 0.050 ↓ | 0.050 ✓ | 0.000 ✓ | 0.250 | 55% (15% drawn) | 0.69 | 93%/93% |
| back-door off | 56.0 ↓ (+0.5) | 3.9 ↓ (-1.2*) | 15.1 (-1.9) | 0.3 (+0.1) | 2.5 ↓ (-0.3) | 3.3 ↓ (-0.2) | 5.3 ↓ (+0.0) | 1.6 ↓ (-0.3) | 0.1 (+0.1) | 7.7 (-0.4) | 0.7 (-0.1) | 0.3 (+0.0) | 25.0 (+10.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.8 (+0.0) | 0.3 (+0.1) | 0.9 (+0.4) | 0.0 (-0.1) | 0.3 (+0.0) | 141.5 (+15.8) | 0.8 (+0.1) | 0.9 (-0.1) | 0.0 (+0.0) | 0.1 (-0.1) | 0.2 (-0.2) | 0.1 (-0.3) | 0.7 (+0.2) | 0.1 (-0.2) | 77.8 ✓ (+0.9) | 0.650 (+0.3) | 0.100 ↓ (+0.1) | 0.000 ↓ (-0.1) | 0.000 ✓ (+0.0) | 0.550 (+0.3) | 45% (15% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 80 | 20 | 0.7 | 8 | 0 | 10 | 5 | 44 | 33 | 57 | 26 | 17 | 28 | 5.5 | 0.15 | 54.5 |
| back-door off | 0.20 (-0.1) | 95 (+15.0) | 5 (-15.0) | 0.7 (+0.0) | 12 (+4.4) | 0 (+0.0) | 3 (-7.2) | 0 (-5.1) | 61 (+17.0) | 24 (-9.1) | 56 (-0.5) | 29 (+2.7) | 15 (-2.2) | 26 (-1.6) | 5.3 (-0.1) | 0.20 (+0.1) | 54.9 (+0.5) |

_Tries 1.9 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.0 ↓ | 5.0 ↓ | 15.2 | 0.4 | 2.3 ↓ | 3.5 ↓ | 6.3 ↓ | 1.5 ↓ | 0.1 | 7.3 | 0.7 | 0.2 | 17.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.8 | 0.1 | 0.4 | 162.2 | 0.6 | 0.8 | 0.0 | 0.1 | 0.1 | 0.1 | 0.6 | 0.1 | 75.6 ✓ | 0.700 | 0.090 ↓ | 0.000 ↓ | 0.000 ✓ | 0.610 | 41% (20% drawn) | 43.0% (19.0% drawn) | 0.71 | 93%/93% |
| back-door off | 54.4 ↓ (+0.4) | 5.1 ↓ (+0.0) | 16.4 (+1.2) | 0.3 (-0.0) | 2.2 ↓ (-0.1) | 3.5 ↓ (+0.0) | 5.9 ↓ (-0.4) | 1.4 ↓ (-0.1) | 0.1 (+0.0) | 7.4 (+0.1) | 0.8 (+0.1) | 0.2 (+0.0) | 17.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.9 (-0.0) | 0.1 (-0.0) | 0.7 (-0.2) | 0.1 (+0.0) | 0.4 (-0.0) | 151.9 (-10.3) | 0.6 (-0.0) | 0.8 (+0.0) | 0.0 (-0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.6 (-0.1) | 0.1 (+0.1) | 74.0 ✓ (-1.7) | 0.710 (+0.0) | 0.080 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.630 (+0.0) | 44% (22% drawn) | 42.5% (20.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.18 | 88 | 14 | 0.6 | 10 | 0 | 5 | 3 | 37 | 45 | 63 | 23 | 13 | 28 | 5.2 | 0.58 | 56.1 |
| back-door off | 0.21 (+0.0) | 83 (-5.0) | 14 (+0.0) | 0.5 (-0.1) | 11 (+1.4) | 0 (+0.0) | 4 (-0.4) | 4 (+0.2) | 34 (-3.8) | 47 (+2.5) | 60 (-2.6) | 26 (+2.0) | 14 (+0.6) | 28 (+0.0) | 5.2 (-0.0) | 0.69 (+0.1) | 56.4 (+0.3) |

_Tries 1.5 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.4 ↓ | 5.5 ↓ | 16.2 | 0.3 | 3.1 ↓ | 3.6 ↓ | 5.2 ↓ | 1.7 ↓ | 0.1 | 7.0 | 0.6 | 0.2 | 22.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.0 | 0.5 | 127.8 | 0.6 | 0.6 | 0.0 | 0.0 | 0.1 | 0.1 | 0.6 | 0.1 | 72.9 ✓ | 0.570 | 0.100 ↓ | 0.020 ↓ | 0.000 ✓ | 0.450 | 35% (19% drawn) | 36.5% (20.5% drawn) | 0.71 | 93%/93% |
| back-door off | 52.8 ↓ (-0.6) | 5.6 ↓ (+0.1) | 15.6 (-0.6) | 0.2 (-0.1) | 2.4 ↓ (-0.7*) | 3.6 ↓ (-0.1) | 5.4 ↓ (+0.1) | 1.8 ↓ (+0.1) | 0.1 (+0.1) | 7.0 (-0.0) | 0.6 (-0.1) | 0.3 (+0.0) | 24.0 (+2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 132.9 (+5.0) | 0.6 (-0.0) | 0.7 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.6 (-0.0) | 0.1 (+0.0) | 73.1 ✓ (+0.3) | 0.600 (+0.0) | 0.070 ↓ (-0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.510 (+0.1) | 42% (20% drawn) | 37.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 84 | 11 | 0.3 | 13 | 0 | 3 | 6 | 37 | 40 | 57 | 27 | 16 | 27 | 5.4 | 0.28 | 55.1 |
| back-door off | 0.19 (+0.0) | 78 (-6.0) | 16 (+5.0) | 0.6 (+0.3) | 8 (-5.0) | 0 (+0.0) | 4 (+1.0) | 3 (-3.1) | 37 (+0.6) | 47 (+6.6) | 60 (+3.2) | 24 (-2.7) | 16 (-0.5) | 27 (-0.1) | 5.5 (+0.1) | 0.27 (-0.0) | 54.3 (-0.8) |

_Tries 1.7 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 5.4 ↓ | 15.9 | 0.2 | 2.2 ↓ | 3.6 ↓ | 5.7 ↓ | 1.6 ↓ | 0.1 | 6.7 | 0.7 | 0.3 | 22.0 | 0.0 | 0.0 | 0.9 | 0.2 | 0.4 | 0.1 | 0.5 | 134.8 | 0.5 | 0.7 | 0.0 | 0.1 | 0.1 | 0.2 | 0.5 | 0.0 | 72.2 ✓ | 0.610 | 0.040 ↓ | 0.020 ↓ | 0.000 ✓ | 0.550 | 45% (14% drawn) | 42.0% (19.0% drawn) | 0.70 | 93%/93% |
| back-door off | 51.0 ↓ (-0.7) | 5.3 ↓ (-0.1) | 15.5 (-0.4) | 0.3 (+0.1) | 2.2 ↓ (-0.0) | 4.0 ↓ (+0.4) | 5.8 ↓ (+0.0) | 1.7 ↓ (+0.1) | 0.1 (+0.0) | 6.8 (+0.1) | 0.7 (+0.0) | 0.3 (+0.0) | 27.0 (+5.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.1) | 0.1 (-0.1) | 0.4 (-0.1) | 0.0 (-0.0) | 0.6 (+0.1) | 138.7 (+3.9) | 0.5 (+0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.1) | 0.6 (+0.1) | 0.1 (+0.0) | 70.8 ✓ (-1.4) | 0.690 (+0.1) | 0.030 ↓ (-0.0) | 0.040 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.620 (+0.1) | 41% (17% drawn) | 41.5% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.11 | 84 | 20 | 0.5 | 9 | 0 | 5 | 3 | 38 | 45 | 64 | 23 | 13 | 26 | 5.4 | 0.57 | 54.3 |
| back-door off | 0.17 (+0.1) | 83 (-1.0) | 11 (-9.0) | 0.5 (+0.1) | 8 (-0.5) | 0 (+0.0) | 5 (+0.3) | 4 (+1.0) | 39 (+0.9) | 43 (-1.8) | 64 (+0.5) | 22 (-1.4) | 14 (+0.9) | 27 (+0.9) | 5.3 (-0.1) | 0.70 (+0.1) | 54.8 (+0.5) |

_Tries 1.6 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.7 ↓ | 6.0 ↓ | 18.6 | 0.3 | 3.5 ↓ | 3.7 ↓ | 4.9 ↓ | 1.9 ↓ | 0.2 | 7.5 | 0.8 | 0.3 | 26.0 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.5 | 119.3 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.1 | 0.4 | 0.1 | 72.9 ✓ | 0.630 | 0.100 ↓ | 0.020 ↓ | 0.000 ✓ | 0.510 | 46% (21% drawn) | 43.5% (19.5% drawn) | 0.71 | 93%/93% |
| back-door off | 51.3 ↓ (+0.6) | 6.0 ↓ (+0.0) | 18.6 (-0.0) | 0.3 (+0.0) | 3.2 ↓ (-0.3) | 3.6 ↓ (-0.1) | 4.6 ↓ (-0.3) | 1.9 ↓ (-0.0) | 0.2 (-0.0) | 7.3 (-0.2) | 0.8 (-0.0) | 0.3 (+0.0) | 29.0 (+3.0) | 0.0 (+0.0) | 0.1 (-0.1) | 1.0 (-0.1) | 0.1 (-0.1) | 0.6 (-0.0) | 0.1 (+0.0) | 0.5 (-0.0) | 113.3 (-6.0) | 0.6 (+0.1) | 0.7 (+0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.1 (+0.0) | 0.3 (-0.1) | 0.1 (-0.1) | 73.1 ✓ (+0.2) | 0.450 (-0.2) | 0.070 ↓ (-0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.360 (-0.2) | 52% (21% drawn) | 43.0% (22.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.21 | 84 | 16 | 0.8 | 12 | 0 | 12 | 7 | 35 | 34 | 56 | 25 | 19 | 26 | 5.5 | 0.26 | 54.4 |
| back-door off | 0.22 (+0.0) | 81 (-3.0) | 13 (-3.0) | 0.9 (+0.2) | 10 (-1.5) | 0 (+0.0) | 12 (+0.6) | 5 (-2.1) | 33 (-2.5) | 40 (+5.6) | 54 (-2.5) | 27 (+1.6) | 20 (+0.9) | 26 (+0.6) | 5.5 (+0.0) | 0.20 (-0.1) | 54.4 (+0.0) |

_Tries 1.9 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.0 ↓ | 22.1 | 0.3 | 2.4 ↓ | 3.6 ↓ | 5.4 ↓ | 1.7 ↓ | 0.1 | 9.8 | 1.0 | 0.4 | 27.0 | 0.0 | 0.0 | 1.0 | 0.2 | 0.6 | 0.0 | 0.5 | 129.5 | 0.9 | 0.8 | 0.0 | 0.1 | 0.2 | 0.4 | 0.5 | 0.1 | 73.3 ✓ | 0.610 | 0.110 ↓ | 0.010 ↓ | 0.000 ✓ | 0.490 | 40% (23% drawn) | 37.0% (20.0% drawn) | 0.69 | 93%/93% |
| back-door off | 52.4 ↓ (+0.1) | 5.0 ↓ (+0.0) | 22.1 (-0.1) | 0.2 (-0.1) | 2.3 ↓ (-0.1) | 4.0 ↓ (+0.4) | 5.3 ↓ (-0.1) | 1.8 ↓ (+0.1) | 0.1 (+0.1) | 9.3 (-0.6) | 0.9 (-0.0) | 0.3 (-0.1) | 22.0 (-5.0) | 0.0 (+0.0) | 0.1 (+0.1) | 1.0 (+0.1) | 0.1 (-0.1) | 0.6 (+0.0) | 0.0 (+0.0) | 0.4 (-0.1) | 130.8 (+1.3) | 0.9 (-0.0) | 0.9 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.1 (-0.3) | 0.6 (+0.1) | 0.1 (+0.1) | 72.3 ✓ (-1.0) | 0.480 (-0.1) | 0.090 ↓ (-0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.380 (-0.1) | 41% (20% drawn) | 40.5% (19.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 83 | 7 | 0.5 | 15 | 0 | 3 | 10 | 28 | 45 | 61 | 24 | 15 | 27 | 5.4 | 0.29 | 55.4 |
| back-door off | 0.23 (+0.1) | 78 (-5.0) | 11 (+4.0) | 0.7 (+0.2) | 14 (-0.4) | 0 (+0.0) | 5 (+2.0) | 7 (-2.9) | 29 (+0.9) | 45 (+0.3) | 62 (+0.6) | 27 (+2.7) | 11 (-3.4*) | 27 (-0.1) | 5.4 (+0.0) | 0.27 (-0.0) | 55.3 (-0.2) |

_Tries 1.7 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.3 ↓ | 5.4 ↓ | 16.7 | 0.4 | 2.4 ↓ | 3.7 ↓ | 5.4 ↓ | 1.6 ↓ | 0.1 | 7.0 | 0.7 | 0.3 | 24.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.6 | 0.1 | 0.5 | 127.8 | 0.6 | 0.7 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 72.5 ✓ | 0.570 | 0.120 ↓ | 0.010 ↓ | 0.000 ✓ | 0.440 | 39% (24% drawn) | 38.0% (24.0% drawn) | 0.70 | 93%/93% |
| back-door off | 51.8 ↓ (-0.5) | 5.3 ↓ (-0.1) | 16.6 (-0.1) | 0.4 (-0.1) | 2.4 ↓ (-0.0) | 3.7 ↓ (-0.1) | 5.6 ↓ (+0.2) | 1.8 ↓ (+0.2) | 0.1 (+0.0) | 7.3 (+0.3) | 0.6 (-0.1) | 0.3 (-0.0) | 24.0 (+0.0) | 0.0 (+0.0) | 0.0 (-0.1) | 1.0 (+0.1) | 0.1 (-0.0) | 0.6 (-0.1) | 0.1 (-0.0) | 0.4 (-0.1) | 135.1 (+7.3) | 0.6 (-0.0) | 0.6 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.4 (+0.3) | 0.5 (-0.0) | 0.0 (-0.1) | 73.9 ✓ (+1.3) | 0.620 (+0.1) | 0.130 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.480 (+0.0) | 36% (18% drawn) | 33.0% (23.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 89 | 21 | 0.8 | 13 | 0 | 2 | 7 | 44 | 34 | 60 | 23 | 17 | 27 | 5.4 | 0.39 | 53.7 |
| back-door off | 0.29 (+0.0) | 86 (-3.0) | 20 (-1.0) | 0.8 (+0.0) | 12 (-0.9) | 0 (+0.0) | 3 (+1.5) | 6 (-1.3) | 37 (-6.6) | 41 (+7.4) | 63 (+2.6) | 22 (-0.8) | 15 (-1.8) | 27 (+0.5) | 5.4 (-0.0) | 0.28 (-0.1) | 54.7 (+1.0) |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.4 ↓ | 5.3 ↓ | 16.4 | 0.5 | 2.2 ↓ | 3.5 ↓ | 5.3 ↓ | 1.9 ↓ | 0.1 | 7.0 | 0.7 | 0.2 | 20.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.4 | 0.1 | 0.5 | 112.2 | 0.7 | 1.1 | 0.0 | 0.1 | 0.3 | -0.1 | 0.5 | 0.1 | 74.4 ✓ | 0.500 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 55% (15% drawn) | 0.70 | 93%/93% |
| back-door off | 51.9 ↓ (-1.5) | 6.1 ↓ (+0.8) | 16.9 (+0.6) | 0.8 (+0.3) | 1.6 ↓ (-0.6) | 3.1 ↓ (-0.4) | 5.5 ↓ (+0.2) | 1.6 ↓ (-0.2) | 0.1 (-0.0) | 6.3 (-0.7) | 0.7 (+0.0) | 0.4 (+0.2) | 30.0 (+10.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.2) | 0.1 (+0.0) | 0.3 (-0.1) | 0.1 (-0.1) | 0.7 (+0.2) | 126.9 (+14.8) | 0.4 (-0.3) | 1.1 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.3 (+0.4) | 0.5 (+0.0) | 0.1 (+0.0) | 74.1 ✓ (-0.3) | 0.550 (+0.1) | 0.100 ↓ (-0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.2) | 65% (10% drawn) | 0.72 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 90 | 20 | 0.8 | 14 | 0 | 5 | 8 | 38 | 35 | 60 | 24 | 16 | 27 | 5.5 | 0.25 | 54.8 |
| back-door off | 0.15 (-0.1) | 80 (-10.0) | 15 (-5.0) | 0.7 (-0.1) | 12 (-1.4) | 0 (+0.0) | 0 (-5.4) | 18 (+10.1) | 30 (-7.5) | 39 (+4.3) | 61 (+1.1) | 21 (-3.4) | 18 (+2.3) | 26 (-0.9) | 5.3 (-0.2) | 0.15 (-0.1) | 54.5 (-0.4) |

_Tries 1.9 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 49.1 ↓ | 9.4 ↓ | 18.6 | 0.3 | 2.1 ↓ | 3.5 ↓ | 4.6 ↓ | 3.1 ↓ | 0.3 | 5.8 | 1.1 | 0.7 | 60.0 | 0.0 | 0.1 | 1.7 | 0.1 | 0.5 | 0.1 | 0.2 | 109.6 | 0.7 | 1.1 | 0.1 | 0.0 | 0.0 | 0.0 | 0.4 | 0.1 | 75.4 ✓ | 0.650 | 0.300 ✓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 75% | 0.71 | 92%/93% |
| back-door off | 50.4 ↓ (+1.3) | 10.1 ✓ (+0.7) | 19.6 (+1.0) | 0.3 (+0.0) | 2.1 ↓ (-0.0) | 4.3 ↓ (+0.7) | 5.0 ↓ (+0.4) | 2.5 ↓ (-0.6) | 0.3 (+0.0) | 6.3 (+0.6) | 1.6 (+0.4) | 0.6 (-0.1) | 35.0 (-25.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.6) | 0.1 (+0.1) | 0.6 (+0.1) | 0.0 (-0.1) | 0.3 (+0.0) | 108.4 (-1.3) | 0.6 (-0.1) | 0.8 (-0.3) | 0.0 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 71.6 ✓ (-3.7) | 0.500 (-0.2) | 0.250 ✓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.250 (-0.1) | 50% (15% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 75 | 25 | 0.8 | 14 | 0 | 2 | 17 | 30 | 37 | 60 | 24 | 16 | 27 | 5.3 | 0.10 | 54.1 |
| back-door off | 0.05 (-0.4) | 65 (-10.0) | 0 (-25.0*) | 0.3 (-0.6) | 10 (-4.5) | 0 (+0.0) | 0 (-1.6) | 12 (-5.7) | 33 (+3.2) | 45 (+8.6) | 60 (-0.5) | 26 (+2.6) | 14 (-2.1) | 27 (+0.8) | 5.2 (-0.1) | 0.35 (+0.2) | 53.3 (-0.9) |

_Tries 3.1 and last tackles 7.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 3.4 ↓ | 15.3 | 2.2 | 1.8 ↓ | 3.5 ↓ | 6.2 ↓ | 1.5 ↓ | 0.2 | 5.0 | 0.3 | 0.4 | 35.0 | 3.5 | 10.9 | 0.8 | 0.3 | 0.6 | 0.1 | 0.5 | 157.5 | 0.4 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.0 | 72.5 ✓ | 0.667 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.625 | 60% (25% drawn) | 0.68 | 53%/52% |
| back-door off | 51.1 ↓ (-0.5) | 3.3 ↓ (-0.0) | 16.4 (+1.0) | 3.5 (+1.3) | 1.9 ↓ (+0.1) | 3.7 ↓ (+0.3) | 5.1 ↓ (-1.0*) | 1.9 ↓ (+0.4) | 0.2 (-0.0) | 4.5 (-0.5) | 0.5 (+0.1) | 0.3 (-0.1) | 20.0 (-15.0) | 4.9 (+1.4) | 10.6 (-0.3) | 1.3 (+0.5) | 0.1 (-0.2) | 0.6 (-0.0) | 0.0 (-0.0) | 0.4 (-0.1) | 127.5 (-30.0*) | 0.3 (-0.1) | 0.8 (+0.3) | 0.0 (-0.0) | 0.1 (+0.1) | 0.1 (+0.1) | 0.3 (+0.3) | 0.3 (-0.2) | 0.1 (+0.0) | 71.3 ✓ (-1.1) | 0.500 (-0.2) | 0.042 ↓ (+0.0) | 0.042 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.417 (-0.2) | 35% (15% drawn) | 0.68 | 55%/55% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 75 | 10 | 0.6 | 14 | 0 | 5 | 8 | 24 | 49 | 65 | 22 | 13 | 28 | 5.6 | 0.33 | 54.0 |
| back-door off | 0.42 (+0.3) | 75 (+0.0) | 25 (+15.0) | 0.8 (+0.2) | 17 (+3.9) | 0 (+0.0) | 4 (-1.1) | 13 (+4.9) | 39 (+14.8) | 26 (-22.6*) | 56 (-9.3) | 27 (+4.5) | 18 (+4.8) | 27 (-0.8) | 5.6 (+0.0) | 0.33 (+0.0) | 53.2 (-0.8) |

_Tries 1.5 and last tackles 9.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_26 cells in 505 s._
