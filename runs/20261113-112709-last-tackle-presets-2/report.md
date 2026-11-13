# Balance: last-tackle-presets-2

#650 part 1, at the final default (the first cut's run and pass weights × 0.6, chosen in last-tackle-presets): the four attack-preset rows at 400 seeds both ways, off against on. standard.json's 100 seeds (±3.3) read Tight 56.5% and Expansive 41.8% at this default; are all four inside 45–55%? Baseline is off (lastTackle.on 0).

**commit** c4205f8 (uncommitted changes) · **branch** worktree-agent-a18f30466b7234caa · **started** 2026-11-13T11:27:09.485Z

400 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## grind v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.5 ↓ | 5.0 ↓ | 15.3 | 0.3 | 2.0 ↓ | 3.4 ↓ | 6.2 ↓ | 1.9 ↓ | 0.1 | 7.4 | 0.6 | 0.0 | 0.1 | 1.0 | 0.1 | 0.9 | 0.1 | 0.4 | 159.0 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 75.2 ✓ | 0.568 | 0.092 ↓ | 0.003 ↓ | 0.000 ✓ | 0.472 | 44% (20% drawn) | 42.0% (19.8% drawn) | 0.70 | 93%/93% |
| on | 54.1 ↓ (+0.6*) | 4.9 ↓ (-0.0) | 15.2 (-0.1) | 0.3 (+0.0) | 2.0 ↓ (+0.0) | 3.4 ↓ (+0.0) | 5.8 ↓ (-0.4*) | 1.8 ↓ (-0.1) | 0.2 (+0.0) | 7.4 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (+0.0) | 0.1 (-0.0) | 0.8 (-0.1) | 0.0 (-0.0) | 0.4 (-0.0) | 149.8 (-9.2*) | 0.6 (+0.0) | 0.7 (-0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.2 (-0.1) | 0.5 (+0.1) | 0.1 (-0.0) | 74.9 ✓ (-0.4) | 0.573 (+0.0) | 0.092 ↓ (+0.0) | 0.007 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.472 (+0.0) | 45% (22% drawn) | 43.0% (19.6% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.28 | 83 | 14 | 0.8 | 10 | 0 | 4 | 8 | 37 | 40 | 67 | 26 | 8 | 28 | 5.4 | 0.47 | 55.4 |
| on | 0.26 (-0.0) | 85 (+1.8) | 17 (+3.0) | 0.8 (+0.0) | 9 (-1.4) | 0 (+0.0) | 4 (+0.3) | 7 (-1.2) | 37 (-0.2) | 43 (+2.5) | 61 (-5.5*) | 27 (+1.2) | 12 (+4.3*) | 27 (-0.6) | 5.4 (+0.0) | 0.55 (+0.1) | 55.6 (+0.2) |

_Tries 1.9 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 5.3 ↓ | 15.0 | 0.3 | 2.5 ↓ | 3.5 ↓ | 6.0 ↓ | 1.8 ↓ | 0.1 | 7.4 | 0.7 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.1 | 0.4 | 149.1 | 0.6 | 0.6 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 74.1 ✓ | 0.480 | 0.080 ↓ | 0.015 ↓ | 0.000 ✓ | 0.385 | 39% (19% drawn) | 40.3% (18.5% drawn) | 0.70 | 93%/93% |
| on | 53.1 ↓ (+0.3) | 5.3 ↓ (+0.1) | 15.8 (+0.8*) | 0.3 (-0.0) | 2.6 ↓ (+0.1) | 3.6 ↓ (+0.1) | 5.1 ↓ (-0.9*) | 1.8 ↓ (+0.0) | 0.1 (+0.0) | 7.4 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (+0.1) | 0.1 (-0.0) | 0.6 (-0.2*) | 0.0 (-0.0) | 0.4 (-0.0) | 128.4 (-20.8*) | 0.5 (-0.1) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.5 (+0.1) | 0.1 (-0.0) | 73.1 ✓ (-1.0) | 0.475 (-0.0) | 0.055 ↓ (-0.0) | 0.003 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.417 (+0.0) | 34% (19% drawn) | 36.9% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 82 | 18 | 0.7 | 12 | 0 | 4 | 5 | 38 | 40 | 66 | 26 | 8 | 26 | 5.6 | 0.23 | 55.3 |
| on | 0.23 (-0.0) | 82 (-0.3) | 16 (-2.0) | 0.6 (-0.1) | 8 (-4.7*) | 0 (+0.0) | 6 (+2.0) | 7 (+2.2) | 36 (-2.1) | 43 (+2.6) | 57 (-9.4*) | 26 (+0.2) | 18 (+9.3*) | 26 (-0.1) | 5.5 (-0.1) | 0.24 (+0.0) | 54.7 (-0.6) |

_Tries 1.8 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.1 ↓ | 5.1 ↓ | 15.4 | 0.3 | 1.9 ↓ | 3.6 ↓ | 6.1 ↓ | 1.9 ↓ | 0.2 | 7.0 | 0.7 | 0.0 | 0.1 | 1.1 | 0.1 | 0.5 | 0.1 | 0.5 | 149.2 | 0.6 | 0.6 | 0.0 | 0.1 | 0.1 | 0.2 | 0.4 | 0.1 | 73.4 ✓ | 0.573 | 0.060 ↓ | 0.020 ↓ | 0.000 ✓ | 0.492 | 41% (18% drawn) | 41.3% (17.6% drawn) | 0.70 | 93%/93% |
| on | 51.0 ↓ (-0.0) | 5.1 ↓ (-0.0) | 15.2 (-0.3) | 0.3 (+0.0) | 1.9 ↓ (-0.0) | 3.7 ↓ (+0.1) | 5.9 ↓ (-0.1) | 1.9 ↓ (-0.0) | 0.2 (-0.0) | 6.9 (-0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.1 (+0.1) | 0.1 (-0.0) | 0.5 (-0.0) | 0.0 (-0.0) | 0.5 (+0.1) | 145.4 (-3.7) | 0.5 (-0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.1 (-0.1) | 0.4 (+0.0) | 0.1 (-0.0) | 72.8 ✓ (-0.6) | 0.708 (+0.1*) | 0.087 ↓ (+0.0) | 0.015 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.605 (+0.1*) | 35% (22% drawn) | 36.9% (20.1% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 83 | 16 | 0.8 | 9 | 0 | 4 | 6 | 37 | 44 | 68 | 23 | 9 | 27 | 5.3 | 0.65 | 55.0 |
| on | 0.25 (-0.0) | 82 (-1.3) | 14 (-2.8) | 0.7 (-0.0) | 10 (+0.9) | 0 (+0.0) | 4 (+0.0) | 6 (+0.3) | 35 (-2.4) | 45 (+1.1) | 66 (-2.1) | 23 (-0.5) | 12 (+2.5*) | 27 (+0.2) | 5.3 (-0.0) | 0.75 (+0.1) | 54.7 (-0.3) |

_Tries 1.9 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.6 ↓ | 5.8 ↓ | 16.8 | 0.3 | 3.3 ↓ | 3.8 ↓ | 5.6 ↓ | 2.1 ↓ | 0.1 | 7.1 | 0.8 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.4 | 137.5 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.2 | 0.4 | 0.1 | 71.7 ✓ | 0.495 | 0.070 ↓ | 0.005 ↓ | 0.000 ✓ | 0.420 | 45% (20% drawn) | 43.6% (16.9% drawn) | 0.70 | 93%/93% |
| on | 51.0 ↓ (+0.4) | 5.9 ↓ (+0.1) | 16.6 (-0.3) | 0.3 (-0.0) | 3.2 ↓ (-0.1) | 3.5 ↓ (-0.2) | 4.8 ↓ (-0.8*) | 2.0 ↓ (-0.1) | 0.2 (+0.1) | 7.2 (+0.1) | 0.7 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.2 (+0.0) | 0.1 (-0.0) | 0.6 (-0.0) | 0.0 (-0.0) | 0.4 (-0.0) | 119.3 (-18.2*) | 0.5 (-0.0) | 0.6 (-0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.1) | 0.4 (-0.0) | 0.1 (-0.0) | 72.6 ✓ (+0.9) | 0.477 (-0.0) | 0.050 ↓ (-0.0) | 0.013 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.415 (-0.0) | 44% (18% drawn) | 45.8% (16.9% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 82 | 17 | 0.9 | 9 | 0 | 11 | 7 | 32 | 40 | 66 | 25 | 9 | 27 | 5.5 | 0.19 | 54.7 |
| on | 0.28 (-0.0) | 79 (-2.8) | 14 (-2.7) | 0.8 (-0.0) | 8 (-1.0) | 0 (+0.0) | 10 (-1.4) | 7 (-0.1) | 33 (+1.3) | 42 (+1.2) | 56 (-10.2*) | 25 (-0.2) | 19 (+10.5*) | 26 (-0.6) | 5.5 (+0.0) | 0.24 (+0.1) | 54.4 (-0.3) |

_Tries 2.1 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_8 cells in 1012 s._
