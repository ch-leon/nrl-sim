# Balance: Card week fatigue and one prop's injuries

Compare the same starting home prop at 0 and 100 weekly fatigue over identical seeds on even 60 vs 60 squads. The prop has base injury risk 100 in both cases. Both sides play without a bench so selecting interchange cannot change his exposure. No match tuning is overridden.

**commit** 06c7704 · **branch** codex/854-weekly-fatigue · **started** 2026-11-27T12:55:14.125Z

1000 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

Penalties count whistles, including recalls. penaltiesWaived counts offsides where the referee called advantage over.

## Tracked starter injuries

Injured matches in the written orientation. A paired change compares each seed with the matching fresh scenario in this plan.

| Scenario | Variant | Starter | Fatigue | Injured | Rate | Paired change (pp) |
|---|---|---|---:|---:|---:|---:|
| Even 60 vs 60, fresh prop | baseline | home prop | 0 | 34/1000 | 3.4% | — |
| Even 60 vs 60, tired prop | baseline | home prop | 100 | 57/1000 | 5.7% | +2.3* |

## Even 60 vs 60, fresh prop

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | penaltiesWaived | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 5.3 ↓ | 14.8 | 0.2 | 2.4 ↓ | 3.7 ↓ | 5.5 ↓ | 1.7 ↓ | 0.1 | 6.8 | 0.6 | 0.3 | 25.7 | 4.5 | 2.1 | 0.4 | 0.1 | 0.0 | 0.0 | 1.0 | 0.1 | 0.8 | 0.0 | 0.4 | 138.8 | 0.5 | 0.0 | 0.6 | 0.0 | 0.1 | 0.2 | 0.2 | 0.4 | 0.1 | 72.4 ✓ | 0.529 | 0.099 ↓ | 0.013 ↓ | 0.000 ✓ | 0.417 | 0.1 | 0.1 | 39% (20% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 83 | 16 | 0.8 | 7.9 | 7.9 | — | 2.73 | 2.57 | 12 | 0 | 4 | 5 | 36 | 43 | 63 | 22 | 15 | 27 | 5.4 | 0.28 | 54.9 | 5.6 | 1.2 |

_Tries 1.7 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 6/64 | 9.4% | 10.9 (6) | 7.3 (58) | 1/6 | 15/58 |
| baseline | 20m | 176/349 | 50.4% | 9.7 (176) | 9.8 (173) | 4/176 | 44/173 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 1831 | 6 | 6/1000 (0.6%) | 5 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

## Even 60 vs 60, tired prop

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | dummyPasses | dummyBites | dummyBreaks | dummyTries | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | penaltiesWaived | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | trySavers | coverMisses | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.0 ↓ | 5.2 ↓ | 15.3 | 0.6 | 2.4 ↓ | 3.7 ↓ | 5.5 ↓ | 1.7 ↓ | 0.1 | 7.0 | 0.6 | 0.3 | 25.2 | 4.5 | 2.0 | 0.4 | 0.1 | 0.0 | 0.0 | 1.0 | 0.1 | 0.8 | 0.0 | 0.5 | 138.7 | 0.5 | 0.0 | 0.6 | 0.0 | 0.1 | 0.1 | 0.2 | 0.4 | 0.1 | 72.7 ✓ | 0.557 | 0.092 ↓ | 0.017 ↓ | 0.000 ✓ | 0.448 | 0.1 | 0.1 | 36% (19% drawn) | 0.69 | 91%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Eligible dart % | Fresh marker dart % | Tired marker dart % | Early line breaks | Late line breaks | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 87 | 18 | 0.7 | 8.1 | 8.1 | — | 2.64 | 2.59 | 11 | 0 | 4 | 6 | 34 | 45 | 63 | 23 | 14 | 27 | 5.5 | 0.27 | 55.0 | 5.5 | 1.1 |

_Tries 1.7 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

| Variant | Tap mark | Quick / all | Quick % | Quick first play m (n) | Ordinary first play m (n) | Quick breaks | Ordinary breaks |
|---|---|---:|---:|---:|---:|---:|---:|
| baseline | penalty | 3/59 | 5.1% | 10.6 (3) | 4.9 (56) | 0/3 | 2/56 |
| baseline | 20m | 192/377 | 50.9% | 10.5 (192) | 10.1 (185) | 5/192 | 54/185 |

| Variant | Starts inside 20 | Stands of 3+ | Matches with a stand | try | strip | error | held-up | turnover | outside-20 | goal-attempt | clock | Unfinished |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 1826 | 4 | 4/1000 (0.4%) | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |

_Goal-line stands are raw counts in the written matchup. A stand is counted once, from the third straight start inside the opposition 20 to its first ending._

_2 cells in 1077 s._
