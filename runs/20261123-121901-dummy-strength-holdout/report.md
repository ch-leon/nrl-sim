# Balance: dummy-strength-holdout

Does the dummy alter the 20-point ability gap seen in the short 20-seed standard row? The 70-rated side plays each independent seed from both ends.

**commit** d855d36c · **branch** HEAD · **started** 2026-11-23T12:19:01.419Z

100 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## independent 70 v 50

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.4 ↓ | 5.7 ↓ | 16.1 | 0.6 | 2.6 ↓ | 3.8 ↓ | 5.6 ↓ | 2.0 ↓ | 0.1 | 6.7 | 0.7 | 0.3 | 23.0 | 0.0 | 0.0 | 0.0 | 0.0 | 1.2 | 0.1 | 0.8 | 0.1 | 0.4 | 142.9 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.2 | 0.4 | 0.1 | 73.5 ✓ | 0.430 | 0.070 ↓ | 0.010 ↓ | 0.000 ✓ | 0.350 | 59% (16% drawn) | 56.0% (19.0% drawn) | 0.71 | 93%/93% |
| live.dummyChance=0.18 | 51.6 ↓ (+0.2) | 5.8 ↓ (+0.2) | 16.0 (-0.1) | 0.7 (+0.1) | 2.4 ↓ (-0.2) | 3.4 ↓ (-0.4) | 5.7 ↓ (+0.0) | 1.9 ↓ (-0.1) | 0.1 (-0.0) | 7.3 (+0.6) | 0.5 (-0.2) | 0.2 (-0.1) | 21.0 (-2.0) | 4.8 (+4.8*) | 2.0 (+2.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.1) | 0.1 (+0.0) | 0.8 (+0.1) | 0.1 (+0.0) | 0.5 (+0.1) | 143.8 (+0.9) | 0.5 (-0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.0) | -0.1 (-0.3) | 0.5 (+0.1) | 0.1 (+0.0) | 75.4 ✓ (+1.9) | 0.580 (+0.1) | 0.130 ↓ (+0.1) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.440 (+0.1) | 59% (16% drawn) | 52.0% (19.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.21 | 73 | 7 | 0.6 | 12 | 0 | 4 | 10 | 32 | 43 | 64 | 22 | 15 | 26 | 5.5 | 0.26 | 54.5 |
| live.dummyChance=0.18 | 0.31 (+0.1) | 78 (+5.0) | 15 (+8.0) | 0.8 (+0.2) | 13 (+1.0) | 0 (+0.0) | 7 (+3.8) | 13 (+2.4) | 25 (-6.7) | 42 (-0.5) | 63 (-0.6) | 23 (+1.1) | 14 (-0.5) | 27 (+0.5) | 5.4 (-0.0) | 0.32 (+0.1) | 55.8 (+1.3) |

_Tries 2.0 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_2 cells in 236 s._
