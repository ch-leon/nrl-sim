# Balance: ordinary five-eighth kicks held-out rush confirmation

A distinct #650 confirmation of the standard Rush v Slide points-share shift at gameplay commit 79417a38. Use seeds 1001–1200 in both orientations to match the earlier #757 held-out Rush v Slide fixture; compare default to secondKicker.on = 0.

**commit** 79417a38 · **branch** HEAD · **started** 2026-11-21T22:07:11.524Z

200 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## Separate confirmation

This reruns the prior #757 independent cohort, seeds 1001–1200 in both orientations, on the locked engine. The standard suite used seeds 1–100. There were 400 matches in each condition. Points share awards draws half credit. [Preregistration](preregistration.md) · [Prior #757 report](https://github.com/ch-leon/nrl-sim/blob/9e0b4b0f95a42e4c2990fcfda1ed196375dbf339/runs/20261120-204343-wing-bombs-held-out-rush/report.md)

| Condition | Rush outright win | Draw | Rush points share |
|---|---:|---:|---:|
| Prior #757 default | 40.00% | 17.50% | 48.75% |
| Five-eighth option disabled | 40.00% | 17.50% | 48.75% |
| Five-eighth option default | 39.50% | 21.75% | 50.38% |

The disabled variant reproduced every gameplay summary field in the prior #757 repeat.
The observed shift is +1.63 percentage points with a combined standard error of 3.17 points. It falls inside the two-standard-error threshold. The same seeds were used in both conditions and the harness stores aggregate results.


## rush v slide

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 4.6 ↓ | 21.2 | 0.2 | 3.0 ↓ | 3.6 ↓ | 5.6 ↓ | 1.6 ↓ | 0.1 | 9.4 | 0.8 | 0.3 | 27.5 | 0.0 | 0.1 | 0.9 | 0.1 | 0.9 | 0.0 | 0.6 | 140.5 | 0.8 | 0.6 | 0.0 | 0.1 | 0.2 | 0.0 | 0.5 | 0.1 | 73.7 ✓ | 0.590 | 0.080 ↓ | 0.010 ↓ | 0.000 ✓ | 0.500 | 40% (23% drawn) | 39.5% (21.8% drawn) | 0.68 | 93%/93% |
| five-eighth option off | 52.2 ↓ (-0.6) | 5.0 ↓ (+0.4*) | 21.1 (-0.1) | 0.1 (-0.1) | 2.8 ↓ (-0.2) | 3.6 ↓ (-0.1) | 5.6 ↓ (-0.0) | 1.8 ↓ (+0.2) | 0.1 (+0.0) | 9.3 (-0.1) | 0.8 (+0.1) | 0.4 (+0.1) | 29.0 (+1.5) | 0.0 (+0.0) | 0.1 (-0.0) | 1.1 (+0.1) | 0.1 (-0.0) | 0.6 (-0.3*) | 0.0 (-0.0) | 0.5 (-0.0) | 139.4 (-1.1) | 0.8 (-0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.2 (+0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 73.2 ✓ (-0.5) | 0.695 (+0.1) | 0.095 ↓ (+0.0) | 0.035 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.565 (+0.1) | 42% (19% drawn) | 40.0% (17.5% drawn) | 0.68 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 83 | 13 | 0.5 | 11 | 0 | 5 | 7 | 34 | 42 | 63 | 22 | 15 | 27 | 5.4 | 0.28 | 54.4 |
| five-eighth option off | 0.26 (+0.1) | 80 (-3.0) | 14 (+1.0) | 0.7 (+0.2) | 12 (+0.5) | 0 (+0.0) | 5 (+0.1) | 9 (+2.1) | 34 (-1.0) | 41 (-1.8) | 62 (-0.7) | 23 (+0.5) | 15 (+0.2) | 27 (-0.3) | 5.5 (+0.1) | 0.38 (+0.1) | 55.0 (+0.6) |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_2 cells in 159 s._
