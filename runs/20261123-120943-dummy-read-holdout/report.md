# Balance: dummy-read-holdout

On independent seeds, does adding the dummy change lead changes or the largest comeback in a normal five-minute match?

**commit** d855d36c · **branch** HEAD · **started** 2026-11-23T12:09:44.151Z

160 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.7 ↓ | 16.3 | 0.3 | 2.6 ↓ | 3.6 ↓ | 5.6 ↓ | 1.6 ↓ | 0.1 | 7.0 | 0.6 | 0.3 | 25.0 | 0.0 | 0.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.8 | 0.1 | 0.5 | 140.2 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.1 | 0.4 | 0.1 | 73.4 ✓ | 0.644 | 0.069 ↓ | 0.025 ↓ | 0.000 ✓ | 0.550 | 43% (24% drawn) | 0.70 | 93%/93% |
| live.dummyChance=0.18 | 52.1 ↓ (+0.1) | 5.5 ↓ (-0.2) | 15.2 (-1.1*) | 0.3 (+0.0) | 2.6 ↓ (+0.0) | 3.7 ↓ (+0.1) | 5.6 ↓ (+0.1) | 1.6 ↓ (+0.0) | 0.1 (+0.0) | 7.0 (-0.0) | 0.6 (+0.0) | 0.2 (-0.1) | 16.9 (-8.1) | 4.9 (+4.9*) | 2.2 (+2.2*) | 0.0 (+0.0) | 0.1 (-0.0) | 0.9 (+0.1) | 0.2 (+0.0) | 0.8 (+0.1) | 0.1 (+0.0) | 0.4 (-0.0) | 146.5 (+6.3) | 0.4 (-0.0) | 0.7 (+0.1) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.1) | 0.1 (-0.0) | 0.4 (-0.1) | 0.1 (-0.0) | 73.7 ✓ (+0.2) | 0.438 (-0.2*) | 0.056 ↓ (-0.0) | 0.019 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.362 (-0.2*) | 45% (21% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.21 | 85 | 16 | 0.8 | 10 | 0 | 4 | 9 | 33 | 43 | 62 | 23 | 15 | 27 | 5.5 | 0.26 | 55.2 |
| live.dummyChance=0.18 | 0.14 (-0.1) | 79 (-5.6) | 14 (-1.9) | 0.5 (-0.3) | 13 (+2.8) | 0 (+0.0) | 5 (+0.7) | 7 (-2.2) | 32 (-1.7) | 43 (+0.4) | 63 (+0.5) | 24 (+1.5) | 13 (-1.9) | 27 (+0.5) | 5.5 (-0.0) | 0.29 (+0.0) | 56.1 (+0.9) |

_Tries 1.6 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_2 cells in 580 s._
