# Balance: centre shoulder carry

Does a centre choosing a shoulder at reception change completion, line breaks or tries? Compare the default with the same engine using ordinary gap running, in even Balanced teams and Expansive versus Balanced.

**commit** 02a6dec5 · **branch** feat/centre-shoulder · **started** 2026-11-20T01:11:22.413Z

40 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.4 ↓ | 5.7 ↓ | 16.2 | 0.3 | 2.5 ↓ | 3.8 ↓ | 5.9 ↓ | 2.0 ↓ | 0.2 | 7.2 | 0.9 | 0.4 | 32.5 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.1 | 0.5 | 140.5 | 0.6 | 0.5 | 0.0 | 0.1 | 0.1 | 0.3 | 0.6 | 0.1 | 72.3 ✓ | 0.850 | 0.125 ↓ | 0.075 ✓ | 0.000 ✓ | 0.650 | 35% (15% drawn) | 0.70 | 93%/93% |
| ordinary gap running | 51.4 ↓ (-0.0) | 5.8 ↓ (+0.1) | 16.4 (+0.2) | 0.3 (+0.0) | 2.6 ↓ (+0.1) | 3.6 ↓ (-0.1) | 5.6 ↓ (-0.3) | 2.0 ↓ (+0.0) | 0.1 (-0.0) | 7.5 (+0.3) | 0.8 (-0.0) | 0.3 (-0.1) | 27.5 (-5.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.0) | 0.1 (+0.0) | 0.7 (-0.1) | 0.0 (-0.0) | 0.5 (+0.0) | 135.6 (-4.9) | 0.4 (-0.1) | 0.7 (+0.2) | 0.0 (+0.0) | 0.0 (-0.0) | 0.0 (-0.0) | 0.1 (-0.1) | 0.4 (-0.2) | 0.1 (+0.0) | 72.9 ✓ (+0.6) | 0.675 (-0.2) | 0.075 ↓ (-0.1) | 0.075 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.525 (-0.1) | 43% (15% drawn) | 0.71 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 78 | 10 | 0.9 | 10 | 0 | 1 | 4 | 44 | 41 | 66 | 20 | 13 | 28 | 5.5 | 0.38 | 52.9 |
| ordinary gap running | 0.28 (+0.0) | 75 (-2.5) | 10 (+0.0) | 1.0 (+0.1) | 10 (+0.0) | 0 (+0.0) | 5 (+3.8) | 4 (+0.0) | 36 (-7.5) | 45 (+3.8) | 63 (-3.2) | 21 (+0.7) | 16 (+2.5) | 27 (-0.6) | 5.3 (-0.2) | 0.38 (+0.0) | 53.7 (+0.8) |

_Tries 2.0 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_Side win is the tracked side over 80 matches, both ways round. The other columns are the matchup as written (40)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 5.6 ↓ | 16.2 | 0.2 | 2.5 ↓ | 3.8 ↓ | 5.5 ↓ | 1.7 ↓ | 0.1 | 6.7 | 0.5 | 0.3 | 22.5 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.0 | 0.6 | 135.1 | 0.6 | 0.5 | 0.0 | 0.1 | 0.2 | 0.2 | 0.7 | 0.1 | 71.2 ✓ | 0.550 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.450 | 30% (30% drawn) | 26.3% (25.0% drawn) | 0.71 | 93%/93% |
| ordinary gap running | 53.0 ↓ (+0.1) | 5.6 ↓ (+0.0) | 15.8 (-0.4) | 0.1 (-0.1) | 2.3 ↓ (-0.1) | 3.6 ↓ (-0.2) | 5.5 ↓ (+0.0) | 1.8 ↓ (+0.1) | 0.1 (+0.0) | 6.7 (+0.0) | 0.6 (+0.1) | 0.3 (+0.0) | 25.0 (+2.5) | 0.0 (+0.0) | 0.1 (+0.1) | 0.9 (-0.1) | 0.0 (-0.1) | 0.8 (+0.0) | 0.1 (+0.0) | 0.6 (+0.0) | 132.8 (-2.2) | 0.7 (+0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.2 (+0.0) | 0.7 (-0.0) | 0.1 (+0.1) | 71.9 ✓ (+0.8) | 0.675 (+0.1) | 0.125 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.550 (+0.1) | 33% (25% drawn) | 30.0% (22.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 83 | 10 | 0.3 | 13 | 0 | 1 | 3 | 29 | 53 | 61 | 22 | 17 | 26 | 5.5 | 0.35 | 54.5 |
| ordinary gap running | 0.20 (+0.0) | 80 (-2.5) | 18 (+7.5) | 0.5 (+0.2) | 11 (-1.8) | 0 (+0.0) | 4 (+2.8) | 4 (+1.3) | 33 (+3.4) | 47 (-5.8) | 61 (-0.2) | 22 (+0.5) | 17 (-0.3) | 27 (+0.5) | 5.6 (+0.0) | 0.33 (-0.0) | 54.8 (+0.3) |

_Tries 1.7 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 62 s._
