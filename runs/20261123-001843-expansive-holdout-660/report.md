# Balance: expansive-holdout-660

Check whether the standard Expansive point-share move repeats using the unchanged live length, new seeds, both orientations, and an exact feature-off control. Each row plays 200 matches with seeds 101 through 200 per orientation.

**commit** 00438acb · **branch** feat/kick-returns · **started** 2026-11-23T00:18:43.980Z

100 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## expansive v balanced

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.0 ↓ | 5.1 ↓ | 16.1 | 0.3 | 3.0 ↓ | 3.6 ↓ | 5.5 ↓ | 1.8 ↓ | 0.1 | 7.5 | 0.5 | 0.3 | 24.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.8 | 0.0 | 0.4 | 134.1 | 0.4 | 0.8 | 0.0 | 0.0 | 0.0 | 0.1 | 0.6 | 0.1 | 74.3 ✓ | 0.550 | 0.080 ↓ | 0.030 ↓ | 0.000 ✓ | 0.440 | 38% (17% drawn) | 39.5% (20.5% drawn) | 0.71 | 93%/93% |
| kick returns off | 52.8 ↓ (-0.3) | 4.9 ↓ (-0.2) | 15.8 (-0.3) | 0.3 (-0.0) | 3.1 ↓ (+0.2) | 3.6 ↓ (-0.0) | 5.6 ↓ (+0.1) | 1.7 ↓ (-0.1) | 0.1 (+0.0) | 7.3 (-0.1) | 0.5 (-0.0) | 0.5 (+0.2*) | 38.0 (+14.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.1) | 0.1 (+0.0) | 0.8 (-0.0) | 0.0 (-0.0) | 0.4 (+0.0) | 139.4 (+5.3) | 0.5 (+0.1) | 0.7 (-0.1) | 0.0 (-0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.6 (+0.1) | 0.1 (+0.0) | 74.3 ✓ (+0.0) | 0.630 (+0.1) | 0.080 ↓ (+0.0) | 0.030 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.520 (+0.1) | 37% (18% drawn) | 36.0% (23.5% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.16 | 83 | 16 | 0.7 | 13 | 0 | 4 | 6 | 34 | 43 | 59 | 25 | 16 | 26 | 5.6 | 0.24 | 54.5 | 6.0 | 1.0 |
| kick returns off | 0.14 (-0.0) | 78 (-5.0) | 17 (+1.0) | 0.3 (-0.3) | 14 (+1.1) | 0 (+0.0) | 5 (+0.4) | 7 (+0.5) | 35 (+1.6) | 39 (-3.6) | 60 (+1.3) | 24 (-1.1) | 16 (-0.2) | 27 (+1.1) | 5.6 (+0.1) | 0.27 (+0.0) | 55.0 (+0.5) | 6.2 (+0.2) | 1.6 (+0.5) |

_Tries 1.8 and last tackles 9.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_2 cells in 151 s._
