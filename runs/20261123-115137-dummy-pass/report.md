# Balance: dummy-pass

How often does a dummy-and-go occur and draw the closest defender across at different attempt rates in even 60 v 60 matches?

**commit** a60b0352 · **branch** feat/seven-dummy · **started** 2026-11-23T11:51:37.588Z

40 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 5.5 ↓ | 15.8 | 0.3 | 3.2 ↓ | 3.4 ↓ | 5.5 ↓ | 1.7 ↓ | 0.3 | 7.2 | 0.7 | 0.3 | 22.5 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.0 | 0.4 | 137.3 | 0.7 | 0.7 | 0.0 | 0.1 | 0.2 | -0.0 | 0.4 | 0.1 | 74.1 ✓ | 0.625 | 0.050 ↓ | 0.025 ↓ | 0.000 ✓ | 0.550 | 40% (23% drawn) | 0.71 | 93%/93% |
| live.dummyChance=0.09 | 52.4 ↓ (+0.7) | 5.4 ↓ (-0.1) | 16.8 (+1.0) | 0.4 (+0.1) | 3.1 ↓ (-0.1) | 3.6 ↓ (+0.2) | 5.4 ↓ (-0.1) | 1.4 ↓ (-0.3) | 0.1 (-0.1) | 7.4 (+0.2) | 0.8 (+0.1) | 0.4 (+0.1) | 30.0 (+7.5) | 2.3 (+2.3*) | 1.0 (+1.0*) | 0.0 (+0.0) | 0.1 (-0.0) | 0.8 (-0.3) | 0.1 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 135.4 (-1.8) | 0.6 (-0.1) | 0.7 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | -0.0 (+0.0) | 0.5 (+0.1) | 0.1 (+0.0) | 73.7 ✓ (-0.3) | 0.625 (+0.0) | 0.075 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.550 (+0.0) | 38% (20% drawn) | 0.70 | 93%/93% |
| live.dummyChance=0.18 | 52.1 ↓ (+0.4) | 5.3 ↓ (-0.2) | 16.2 (+0.5) | 0.3 (+0.0) | 3.0 ↓ (-0.2) | 3.6 ↓ (+0.2) | 5.6 ↓ (+0.1) | 1.7 ↓ (-0.0) | 0.2 (-0.0) | 7.2 (+0.0) | 0.7 (-0.0) | 0.5 (+0.2) | 32.5 (+10.0) | 4.7 (+4.7*) | 2.0 (+2.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.2) | 0.0 (-0.1*) | 0.8 (+0.1) | 0.1 (+0.0) | 0.5 (+0.1) | 144.0 (+6.7) | 0.4 (-0.3) | 0.7 (-0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.1) | 0.3 (+0.3) | 0.4 (+0.0) | 0.1 (+0.0) | 74.4 ✓ (+0.3) | 0.575 (-0.1) | 0.050 ↓ (+0.0) | 0.025 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.500 (-0.1) | 30% (25% drawn) | 0.70 | 93%/93% |
| live.dummyChance=0.27 | 51.8 ↓ (+0.0) | 5.5 ↓ (-0.0) | 16.3 (+0.5) | 0.2 (-0.1) | 2.9 ↓ (-0.3) | 4.0 ↓ (+0.6) | 5.5 ↓ (-0.1) | 2.1 ↓ (+0.4) | 0.2 (-0.0) | 7.4 (+0.2) | 0.7 (+0.0) | 0.5 (+0.2) | 32.5 (+10.0) | 6.5 (+6.5*) | 2.9 (+2.9*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.2 (+0.1) | 0.1 (-0.1) | 0.6 (-0.1) | 0.1 (+0.0) | 0.5 (+0.0) | 123.6 (-13.6) | 0.6 (-0.1) | 0.7 (-0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.1) | 0.1 (+0.1) | 0.5 (+0.1) | 0.1 (-0.0) | 74.1 ✓ (+0.0) | 0.625 (+0.0) | 0.175 ↓ (+0.1) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (-0.2) | 43% (23% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.38 | 83 | 23 | 1.2 | 6 | 0 | 6 | 6 | 43 | 40 | 62 | 21 | 17 | 26 | 5.5 | 0.25 | 54.5 |
| live.dummyChance=0.09 | 0.05 (-0.3*) | 75 (-7.5) | 20 (-2.5) | 0.1 (-1.1*) | 10 (+4.5) | 0 (+0.0) | 3 (-2.4) | 3 (-2.4) | 43 (+0.5) | 40 (-0.1) | 60 (-1.9) | 22 (+1.4) | 18 (+0.5) | 26 (-0.2) | 5.5 (+0.0) | 0.42 (+0.2) | 54.7 (+0.2) |
| live.dummyChance=0.18 | 0.07 (-0.3*) | 75 (-7.5) | 13 (-10.0) | 0.1 (-1.0*) | 4 (-1.4) | 0 (+0.0) | 7 (+1.6) | 4 (-1.4) | 37 (-5.3) | 46 (+6.6) | 62 (-0.2) | 23 (+2.9) | 14 (-2.7) | 26 (+0.3) | 5.7 (+0.2) | 0.20 (-0.0) | 54.3 (-0.2) |
| live.dummyChance=0.27 | 0.45 (+0.1) | 83 (+0.0) | 20 (-2.5) | 1.1 (-0.1) | 13 (+7.4) | 0 (+0.0) | 6 (+0.1) | 5 (-1.1) | 35 (-7.7) | 41 (+1.3) | 62 (-0.7) | 22 (+1.4) | 16 (-0.7) | 27 (+0.7) | 5.5 (+0.0) | 0.40 (+0.2) | 51.5 (-2.9) |

_Tries 1.7 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 172 s._
