# Balance: impact interchange holdout 664

Check the historical neutral grubber-try guardrail on 200 independent seeds after the first 80 matches landed one try above its band. Compare impact interchanges, the same bench approach without charges, and the original interchange. All sides are fresh, flat 60, standard rotation, with two seven-minute halves and no coach calls. Read per-match totals as the unrounded count mean times 14/5.

**commit** eb7f6784 · **branch** HEAD · **started** 2026-11-23T09:08:30.556Z

200 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even standard v standard

_14-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.1 ↓ | 16.6 | 1.0 | 2.6 ↓ | 3.6 ↓ | 5.9 ↓ | 1.9 ↓ | 0.1 | 7.0 | 0.6 | 0.4 | 64.5 | 0.0 | 1.7 | 1.0 | 0.0 | 0.8 | 0.0 | 0.5 | 145.3 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 72.1 ✓ | 0.757 | 0.111 ↓ | 0.021 ↓ | 0.000 ✓ | 0.625 | 51% (6% drawn) | 0.70 | 71%/71% |
| same route without impact | 51.2 ↓ (-0.0) | 5.1 ↓ (-0.0) | 16.6 (+0.0) | 1.0 (+0.0) | 2.7 ↓ (+0.1) | 3.6 ↓ (-0.0) | 6.0 ↓ (+0.0) | 1.9 ↓ (+0.0) | 0.1 (+0.0) | 7.1 (+0.0) | 0.6 (+0.0) | 0.3 (-0.0) | 61.5 (-3.0) | 0.0 (+0.0) | 1.8 (+0.0) | 1.1 (+0.0) | 0.0 (-0.0*) | 0.8 (-0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 146.4 (+1.1) | 0.5 (+0.0) | 0.6 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.4 (+0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 72.2 ✓ (+0.1) | 0.759 (+0.0) | 0.118 ↓ (+0.0) | 0.018 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.623 (-0.0) | 47% (6% drawn) | 0.70 | 71%/71% |
| original interchange | 51.2 ↓ (-0.0) | 5.1 ↓ (-0.0) | 16.8 (+0.2) | 1.0 (+0.0) | 2.6 ↓ (-0.0) | 3.6 ↓ (+0.0) | 5.9 ↓ (+0.0) | 1.9 ↓ (+0.1) | 0.1 (-0.0) | 6.9 (-0.1) | 0.6 (+0.0) | 0.3 (-0.0) | 61.0 (-3.5) | 0.0 (+0.0) | 1.9 (+0.1) | 1.1 (+0.1) | 0.0 (-0.0) | 0.8 (+0.0) | 0.0 (-0.0) | 0.5 (+0.0) | 145.8 (+0.5) | 0.5 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.3 (+0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 72.1 ✓ (+0.0) | 0.764 (+0.0) | 0.105 ↓ (-0.0) | 0.020 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.639 (+0.0) | 50% (5% drawn) | 0.70 | 71%/71% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 52 | 9 | 2.2 | 13 | 0 | 4 | 6 | 36 | 41 | 61 | 24 | 15 | 27 | 6.7 | 0.34 | 55.5 |
| same route without impact | 0.34 (+0.0) | 53 (+0.5) | 5 (-4.0) | 2.3 (+0.1) | 13 (+0.4) | 0 (+0.0) | 4 (+0.1) | 6 (+0.0) | 36 (-0.6) | 41 (+0.1) | 62 (+0.4) | 23 (-0.5) | 15 (+0.1) | 27 (-0.0) | 6.8 (+0.0) | 0.34 (+0.0) | 55.3 (-0.2) |
| original interchange | 0.35 (+0.0) | 52 (+0.0) | 8 (-1.0) | 2.2 (-0.1) | 14 (+0.6) | 0 (+0.0) | 4 (+0.5) | 6 (-0.3) | 36 (-0.1) | 40 (-0.8) | 62 (+0.4) | 23 (-0.5) | 15 (+0.1) | 26 (-0.2) | 6.7 (-0.0) | 0.35 (+0.0) | 55.4 (-0.1) |

_Tries 1.9 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_3 cells in 466 s._
