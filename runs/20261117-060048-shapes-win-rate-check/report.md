# Balance: shapes win-rate check

Does enabling ordinary attack shapes change Expansive's tracked win rate against Balanced at even ratings? Compare shapes off with on over 400 matches per orientation; an even 60v60 row is a neutral mechanics check.

**commit** 089ae13 · **branch** feat/match-attacking-shapes · **started** 2026-11-17T06:00:48.188Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.9 ↓ | 4.8 ↓ | 15.2 | 0.5 | 2.0 ↓ | 3.4 ↓ | 6.2 ↓ | 1.8 ↓ | 0.2 | 6.2 | 0.6 | 0.1 | 10.0 | 0.0 | 0.0 | 1.1 | 0.1 | 0.6 | 0.0 | 0.3 | 140.5 | 0.7 | 0.7 | 0.0 | 0.1 | 0.1 | 0.0 | 0.6 | 0.0 | 74.0 ✓ | 0.750 | 0.250 ✓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 45% (15% drawn) | 0.70 | 93%/93% |
| shapes on | 52.0 ↓ (+0.1) | 5.8 ↓ (+1.0) | 16.7 (+1.5) | 0.3 (-0.2) | 2.4 ↓ (+0.3) | 3.2 ↓ (-0.2) | 5.5 ↓ (-0.7) | 2.0 ↓ (+0.2) | 0.1 (-0.1) | 7.3 (+1.0) | 0.7 (+0.1) | 0.3 (+0.2) | 25.0 (+15.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.8 (-0.3) | 0.1 (-0.1) | 0.8 (+0.3) | 0.1 (+0.1) | 0.6 (+0.3) | 133.5 (-7.0) | 0.5 (-0.2) | 0.9 (+0.3) | 0.1 (+0.1) | 0.1 (-0.1) | 0.0 (-0.1) | 0.3 (+0.3) | 0.5 (-0.1) | 0.1 (+0.1) | 75.3 ✓ (+1.3) | 0.650 (-0.1) | 0.100 ↓ (-0.1) | 0.100 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.450 (-0.0) | 45% (20% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 85 | 25 | 1.1 | 17 | 0 | 3 | 17 | 28 | 36 | 66 | 22 | 12 | 28 | 5.3 | 0.60 | 55.8 |
| shapes on | 0.20 (-0.0) | 80 (-5.0) | 5 (-20.0) | 0.8 (-0.4) | 8 (-9.2) | 0 (+0.0) | 5 (+2.2) | 8 (-9.2) | 30 (+2.2) | 50 (+13.9) | 61 (-4.6) | 25 (+2.5) | 14 (+2.1) | 29 (+0.9) | 5.4 (+0.1) | 0.25 (-0.3) | 54.2 (-1.6) |

_Tries 1.8 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_400 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 800 matches, both ways round. The other columns are the matchup as written (400)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.5 ↓ | 5.2 ↓ | 15.2 | 0.3 | 2.6 ↓ | 3.5 ↓ | 5.2 ↓ | 1.6 ↓ | 0.1 | 7.4 | 0.7 | 0.2 | 19.0 | 0.0 | 0.1 | 0.9 | 0.2 | 0.6 | 0.0 | 0.5 | 127.9 | 0.5 | 0.7 | 0.0 | 0.1 | 0.1 | 0.2 | 0.5 | 0.1 | 73.5 ✓ | 0.510 | 0.052 ↓ | 0.013 ↓ | 0.000 ✓ | 0.445 | 41% (23% drawn) | 42.3% (20.8% drawn) | 0.70 | 93%/93% |
| shapes on | 53.1 ↓ (-0.4) | 5.5 ↓ (+0.3) | 15.8 (+0.6*) | 0.3 (+0.0) | 2.6 ↓ (-0.0) | 3.6 ↓ (+0.1) | 5.3 ↓ (+0.1) | 1.7 ↓ (+0.1) | 0.1 (-0.0) | 7.3 (-0.1) | 0.7 (+0.0) | 0.3 (+0.0) | 21.5 (+2.5) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (-0.1*) | 0.6 (+0.0) | 0.0 (-0.0) | 0.4 (-0.1*) | 131.9 (+4.0) | 0.6 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (-0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 73.3 ✓ (-0.2) | 0.517 (+0.0) | 0.070 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.427 (-0.0) | 40% (19% drawn) | 37.5% (18.9% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 85 | 15 | 0.7 | 10 | 0 | 4 | 7 | 37 | 42 | 57 | 26 | 17 | 26 | 5.6 | 0.24 | 54.8 |
| shapes on | 0.23 (+0.0) | 82 (-2.5) | 16 (+1.0) | 0.7 (+0.0) | 11 (+1.0) | 0 (+0.0) | 5 (+0.7) | 5 (-2.9*) | 35 (-1.7) | 44 (+2.8) | 58 (+1.2) | 25 (-0.4) | 17 (-0.9) | 26 (-0.1) | 5.5 (-0.0) | 0.29 (+0.0) | 54.8 (+0.0) |

_Tries 1.6 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 256 s._
