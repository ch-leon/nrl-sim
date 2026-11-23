# Balance: Corner cover tackle

Measure trySavers and coverMisses, and check effect on tries and the held-up frequency in even and expansive matchups. Baseline has corner cover switched off.

**commit** 3b606644 · **branch** feat/seven-corner · **started** 2026-11-23T11:57:37.663Z

48 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 5.5 ↓ | 16.0 | 0.3 | 3.1 ↓ | 3.5 ↓ | 5.6 ↓ | 1.7 ↓ | 0.2 | 7.1 | 0.7 | 0.3 | 25.0 | 0.0 | 0.1 | 1.0 | 0.2 | 0.7 | 0.0 | 0.4 | 140.2 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | -0.0 | 0.4 | 0.1 | 74.0 ✓ | 0.583 | 0.063 ↓ | 0.021 ↓ | 0.000 ✓ | 0.500 | 0.0 | 0.0 | 38% (25% drawn) | 0.71 | 93%/93% |
| corner cover on | 51.5 ↓ (-0.3) | 5.5 ↓ (+0.0) | 16.4 (+0.4) | 0.3 (+0.0) | 2.6 ↓ (-0.5) | 3.6 ↓ (+0.1) | 5.7 ↓ (+0.1) | 1.9 ↓ (+0.2) | 0.2 (-0.0) | 6.7 (-0.4) | 0.8 (+0.0) | 0.2 (-0.1) | 18.8 (-6.3) | 0.0 (+0.0) | 0.1 (-0.0) | 1.1 (+0.1) | 0.1 (-0.1) | 0.8 (+0.1) | 0.0 (+0.0) | 0.4 (+0.0) | 136.5 (-3.7) | 0.6 (+0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.2 (+0.3) | 0.5 (+0.1) | 0.1 (-0.0) | 73.9 ✓ (-0.1) | 0.604 (+0.0) | 0.125 ↓ (+0.1) | 0.021 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.458 (-0.0) | 0.2 (+0.2*) | 0.2 (+0.2*) | 42% (29% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.38 | 85 | 21 | 1.2 | 6 | 0 | 5 | 6 | 43 | 40 | 64 | 21 | 16 | 27 | 5.5 | 0.25 | 54.8 |
| corner cover on | 0.21 (-0.2) | 77 (-8.3) | 10 (-10.4) | 0.6 (-0.6) | 11 (+4.9) | 0 (+0.0) | 3 (-1.7) | 7 (+0.4) | 37 (-5.8) | 42 (+2.2) | 65 (+1.8) | 19 (-1.5) | 15 (-0.3) | 26 (-0.2) | 5.6 (+0.1) | 0.21 (-0.0) | 55.0 (+0.2) |

_Tries 1.7 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive clubs

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.7 ↓ | 5.8 ↓ | 14.9 | 0.3 | 2.9 ↓ | 3.5 ↓ | 5.0 ↓ | 1.7 ↓ | 0.1 | 9.0 | 0.5 | 0.3 | 27.1 | 0.0 | 0.0 | 0.8 | 0.1 | 0.6 | 0.0 | 0.5 | 126.0 | 0.5 | 0.9 | 0.0 | 0.1 | 0.1 | -0.1 | 0.6 | 0.1 | 71.1 ✓ | 0.417 | 0.125 ↓ | 0.021 ↓ | 0.000 ✓ | 0.271 | 0.0 | 0.0 | 52% (17% drawn) | 0.70 | 93%/92% |
| corner cover on | 54.7 ↓ (+0.0) | 5.8 ↓ (+0.0) | 14.7 (-0.2) | 0.2 (-0.1) | 3.1 ↓ (+0.2) | 3.7 ↓ (+0.2) | 4.7 ↓ (-0.3) | 1.9 ↓ (+0.2) | 0.2 (+0.1) | 9.1 (+0.1) | 0.5 (+0.0) | 0.2 (-0.1) | 20.8 (-6.3) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.3) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.4 (-0.1) | 122.6 (-3.4) | 0.6 (+0.1) | 0.9 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | -0.1 (-0.0) | 0.6 (-0.0) | 0.1 (+0.0) | 70.0 ✓ (-1.0) | 0.354 (-0.1) | 0.104 ↓ (-0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.250 (-0.0) | 0.1 (+0.1*) | 0.1 (+0.1*) | 50% (13% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 83 | 13 | 0.4 | 13 | 0 | 5 | 4 | 38 | 41 | 55 | 22 | 23 | 25 | 6.0 | 0.21 | 54.8 |
| corner cover on | 0.31 (+0.1) | 94 (+10.4) | 15 (+2.1) | 0.9 (+0.5) | 9 (-3.5) | 0 (+0.0) | 11 (+6.2) | 6 (+1.9) | 37 (-0.4) | 37 (-4.2) | 53 (-1.8) | 24 (+2.1) | 23 (-0.3) | 25 (-0.6) | 6.0 (-0.0) | 0.21 (+0.0) | 54.2 (-0.6) |

_Tries 1.7 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 220 s._
