# Balance: wide catch edge race held out

On the wide back-door catch revision, does turning on the edge race add more than one tracked bust per 14 minutes for Expansive fast backs versus flat Slide? This held-out comparison uses seeds 101–300 in both orientations, with a matched flat Speed 60 control and the default match length.

**commit** 40c4d7d · **branch** feat/match-back-door · **started** 2026-11-18T09:26:30.165Z

200 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## fast-backs expansive v flat slide

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.4 ↓ | 6.1 ↓ | 16.2 | 0.4 | 2.8 ↓ | 3.5 ↓ | 5.1 ↓ | 1.8 ↓ | 0.1 | 7.6 | 0.6 | 0.3 | 26.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.4 | 0.0 | 0.4 | 126.0 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 73.0 ✓ | 0.495 | 0.050 ↓ | 0.040 ↓ | 0.000 ✓ | 0.405 | 41% (17% drawn) | 40.5% (18.0% drawn) | 0.71 | 93%/93% |
| edge race on | 52.7 ↓ (-0.7*) | 6.1 ↓ (+0.0) | 17.2 (+1.0*) | 0.4 (-0.1) | 2.7 ↓ (-0.0) | 3.4 ↓ (-0.1) | 5.2 ↓ (+0.0) | 2.2 ↓ (+0.3*) | 0.1 (+0.0) | 7.7 (+0.1) | 0.6 (+0.0) | 0.3 (-0.0) | 22.5 (-3.5) | 0.0 (+0.0) | 0.1 (-0.0) | 1.1 (+0.1) | 0.1 (+0.0) | 0.4 (-0.0) | 0.0 (-0.0) | 0.3 (-0.1) | 128.5 (+2.6) | 0.4 (-0.1) | 0.7 (+0.0) | 0.0 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.5 (-0.0) | 0.1 (-0.0) | 73.7 ✓ (+0.7) | 0.435 (-0.1) | 0.050 ↓ (+0.0) | 0.005 ↓ (-0.0*) | 0.000 ✓ (+0.0) | 0.380 (-0.0) | 43% (17% drawn) | 45.3% (15.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.21 | 82 | 13 | 0.7 | 13 | 0 | 6 | 19 | 32 | 31 | 57 | 27 | 16 | 26 | 5.6 | 0.23 | 54.5 |
| edge race on | 0.24 (+0.0) | 78 (-4.5) | 17 (+3.5) | 0.7 (+0.0) | 9 (-4.1) | 0 (+0.0) | 4 (-1.9) | 23 (+3.9) | 30 (-1.5) | 34 (+3.6) | 57 (+0.7) | 25 (-1.8) | 18 (+1.1) | 26 (+0.0) | 5.6 (-0.0) | 0.21 (-0.0) | 54.4 (-0.1) |

_Tries 1.8 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## neutral flat 60 expansive v flat 60 slide

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.3 ↓ | 5.3 ↓ | 15.9 | 0.4 | 2.7 ↓ | 3.4 ↓ | 5.4 ↓ | 1.7 ↓ | 0.2 | 7.5 | 0.7 | 0.3 | 26.5 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.1 | 0.4 | 129.8 | 0.6 | 0.7 | 0.0 | 0.1 | 0.1 | 0.1 | 0.4 | 0.1 | 74.6 ✓ | 0.590 | 0.080 ↓ | 0.010 ↓ | 0.000 ✓ | 0.500 | 38% (18% drawn) | 36.3% (19.8% drawn) | 0.71 | 93%/93% |
| edge race on | 53.3 ↓ (+0.0) | 5.3 ↓ (+0.0) | 15.9 (+0.0) | 0.4 (+0.0) | 2.7 ↓ (+0.0) | 3.4 ↓ (+0.0) | 5.4 ↓ (+0.0) | 1.7 ↓ (+0.0) | 0.2 (+0.0) | 7.5 (+0.0) | 0.7 (+0.0) | 0.3 (+0.0) | 26.5 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.6 (+0.0) | 0.1 (+0.0) | 0.4 (+0.0) | 129.8 (+0.0) | 0.6 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.4 (+0.0) | 0.1 (+0.0) | 74.6 ✓ (+0.0) | 0.590 (+0.0) | 0.080 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.500 (+0.0) | 38% (18% drawn) | 36.3% (19.8% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.28 | 83 | 13 | 0.7 | 11 | 0 | 5 | 5 | 41 | 38 | 59 | 25 | 17 | 27 | 5.6 | 0.23 | 54.6 |
| edge race on | 0.28 (+0.0) | 83 (+0.0) | 13 (+0.0) | 0.7 (+0.0) | 11 (+0.0) | 0 (+0.0) | 5 (+0.0) | 5 (+0.0) | 41 (+0.0) | 38 (+0.0) | 59 (+0.0) | 25 (+0.0) | 17 (+0.0) | 27 (+0.0) | 5.6 (+0.0) | 0.23 (+0.0) | 54.6 (+0.0) |

_Tries 1.7 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 295 s._
