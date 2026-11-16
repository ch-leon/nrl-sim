# Balance: heldup-rebase attack presets 400

#652 rebased on #687: the four attack preset rows (against Balanced) at 400 seeds both ways, held up off (heldUp.on 0) against on, to tell a real shift in a preset share from luck at the standard size.

**commit** e731dd11 · **branch** claude/652-held-up · **started** 2026-11-16T13:01:29.756Z

400 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## grind v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.1 ↓ | 4.9 ↓ | 15.2 | 0.3 | 2.0 ↓ | 3.4 ↓ | 5.8 ↓ | 1.8 ↓ | 0.2 | 7.4 | 0.6 | 0.0 | 0.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.0 | 0.4 | 149.8 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 74.9 ✓ | 0.573 | 0.092 ↓ | 0.007 ↓ | 0.000 ✓ | 0.472 | 45% (22% drawn) | 43.0% (19.6% drawn) | 0.70 | 93%/93% |
| on (default) | 54.0 ↓ (-0.1) | 5.0 ↓ (+0.0) | 15.4 (+0.2) | 0.4 (+0.0) | 2.0 ↓ (-0.0) | 3.5 ↓ (+0.1) | 5.8 ↓ (+0.0) | 1.5 ↓ (-0.3*) | 0.1 (-0.0) | 7.4 (-0.0) | 0.6 (+0.0) | 0.2 (+0.2*) | 20.3 (+20.3*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.8 (-0.2*) | 0.1 (+0.0) | 0.7 (-0.0) | 0.0 (-0.0) | 0.5 (+0.1*) | 149.2 (-0.6) | 0.6 (+0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.2 (+0.0) | 0.5 (-0.0) | 0.1 (+0.0) | 74.8 ✓ (-0.1) | 0.637 (+0.1) | 0.092 ↓ (+0.0) | 0.003 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.542 (+0.1) | 44% (23% drawn) | 42.8% (21.8% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 85 | 17 | 0.8 | 9 | 0 | 4 | 7 | 37 | 43 | 61 | 27 | 12 | 27 | 5.4 | 0.55 | 55.6 |
| on (default) | 0.17 (-0.1*) | 85 (+0.8) | 16 (-1.0) | 0.5 (-0.3*) | 10 (+1.1) | 0 (+0.0) | 3 (-1.0) | 7 (-0.2) | 36 (-0.5) | 44 (+0.6) | 61 (+0.0) | 26 (-0.7) | 13 (+0.7) | 27 (+0.1) | 5.4 (-0.0) | 0.57 (+0.0) | 55.9 (+0.3) |

_Tries 1.8 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.1 ↓ | 5.3 ↓ | 15.8 | 0.3 | 2.6 ↓ | 3.6 ↓ | 5.1 ↓ | 1.8 ↓ | 0.1 | 7.4 | 0.6 | 0.0 | 0.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.0 | 0.4 | 128.4 | 0.5 | 0.7 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 73.1 ✓ | 0.475 | 0.055 ↓ | 0.003 ↓ | 0.000 ✓ | 0.417 | 34% (19% drawn) | 36.9% (20.0% drawn) | 0.70 | 93%/93% |
| on (default) | 53.1 ↓ (-0.1) | 5.3 ↓ (-0.0) | 15.6 (-0.2) | 0.3 (+0.0) | 2.6 ↓ (-0.0) | 3.6 ↓ (-0.0) | 5.2 ↓ (+0.0) | 1.7 ↓ (-0.1) | 0.1 (+0.0) | 7.2 (-0.2) | 0.6 (-0.1) | 0.3 (+0.3*) | 22.8 (+22.8*) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (-0.0) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.5 (+0.1) | 127.8 (-0.5) | 0.5 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.2 (+0.1) | 0.5 (-0.0) | 0.1 (-0.0) | 73.1 ✓ (-0.0) | 0.532 (+0.1) | 0.070 ↓ (+0.0) | 0.007 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.455 (+0.0) | 36% (20% drawn) | 38.1% (20.1% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 82 | 16 | 0.6 | 8 | 0 | 6 | 7 | 36 | 43 | 57 | 26 | 18 | 26 | 5.5 | 0.24 | 54.7 |
| on (default) | 0.22 (-0.0) | 83 (+0.8) | 18 (+1.8) | 0.6 (-0.0) | 8 (+0.7) | 0 (+0.0) | 6 (-0.8) | 6 (-1.0) | 37 (+1.3) | 42 (-0.2) | 57 (+0.4) | 25 (-0.2) | 17 (-0.2) | 26 (+0.0) | 5.5 (+0.0) | 0.26 (+0.0) | 54.3 (-0.3) |

_Tries 1.8 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 5.1 ↓ | 15.2 | 0.3 | 1.9 ↓ | 3.7 ↓ | 5.9 ↓ | 1.9 ↓ | 0.2 | 6.9 | 0.7 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.5 | 0.0 | 0.5 | 145.4 | 0.5 | 0.6 | 0.0 | 0.1 | 0.1 | 0.1 | 0.4 | 0.1 | 72.8 ✓ | 0.708 | 0.087 ↓ | 0.015 ↓ | 0.000 ✓ | 0.605 | 35% (22% drawn) | 36.9% (20.1% drawn) | 0.70 | 93%/93% |
| on (default) | 51.2 ↓ (+0.1) | 5.1 ↓ (-0.0) | 15.5 (+0.4) | 0.3 (+0.1) | 1.9 ↓ (+0.0) | 3.7 ↓ (-0.0) | 5.9 ↓ (+0.0) | 1.7 ↓ (-0.2*) | 0.2 (-0.0) | 7.1 (+0.1) | 0.7 (+0.0) | 0.3 (+0.3*) | 22.3 (+22.3*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (+0.0) | 0.5 (-0.0) | 0.0 (-0.0) | 0.6 (+0.0) | 144.8 (-0.6) | 0.5 (-0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.4 (+0.0) | 0.1 (+0.0) | 73.2 ✓ (+0.4) | 0.728 (+0.0) | 0.060 ↓ (-0.0) | 0.022 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.645 (+0.0) | 35% (22% drawn) | 38.6% (20.3% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 82 | 14 | 0.7 | 10 | 0 | 4 | 6 | 35 | 45 | 66 | 23 | 12 | 27 | 5.3 | 0.75 | 54.7 |
| on (default) | 0.20 (-0.0) | 84 (+2.8) | 13 (-0.8) | 0.7 (-0.1) | 11 (+0.5) | 0 (+0.0) | 4 (+0.1) | 5 (-1.2) | 36 (+1.2) | 44 (-0.7) | 65 (-0.8) | 23 (+0.3) | 12 (+0.5) | 27 (-0.1) | 5.3 (+0.0) | 0.75 (+0.0) | 55.1 (+0.3) |

_Tries 1.9 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 5.9 ↓ | 16.6 | 0.3 | 3.2 ↓ | 3.5 ↓ | 4.8 ↓ | 2.0 ↓ | 0.2 | 7.2 | 0.7 | 0.0 | 0.0 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.4 | 119.3 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.1 | 72.6 ✓ | 0.477 | 0.050 ↓ | 0.013 ↓ | 0.000 ✓ | 0.415 | 44% (18% drawn) | 45.8% (16.9% drawn) | 0.70 | 93%/93% |
| on (default) | 51.0 ↓ (+0.0) | 5.8 ↓ (-0.1) | 16.6 (+0.1) | 0.3 (+0.0) | 3.1 ↓ (-0.1) | 3.6 ↓ (+0.0) | 4.9 ↓ (+0.0) | 1.8 ↓ (-0.3*) | 0.2 (-0.0) | 7.4 (+0.2) | 0.8 (+0.0) | 0.4 (+0.4*) | 28.8 (+28.8*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.2*) | 0.1 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 118.7 (-0.6) | 0.5 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (+0.0) | 0.3 (-0.0) | 0.4 (+0.0) | 0.1 (+0.0) | 72.4 ✓ (-0.2) | 0.497 (+0.0) | 0.058 ↓ (+0.0) | 0.015 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.425 (+0.0) | 45% (18% drawn) | 44.0% (18.4% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.28 | 79 | 14 | 0.8 | 8 | 0 | 10 | 7 | 33 | 42 | 56 | 25 | 19 | 26 | 5.5 | 0.24 | 54.4 |
| on (default) | 0.23 (-0.0) | 82 (+3.3) | 14 (+0.0) | 0.8 (-0.1) | 9 (+0.4) | 0 (+0.0) | 10 (-0.5) | 6 (-0.3) | 34 (+0.4) | 41 (-0.2) | 56 (+0.0) | 24 (-0.2) | 19 (+0.2) | 26 (-0.1) | 5.5 (+0.0) | 0.24 (-0.0) | 54.5 (+0.1) |

_Tries 2.0 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_8 cells in 1150 s._
