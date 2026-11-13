# Balance: attack-shapes

#649 step 2: does picking an attack shape as each tackle is made (forward pod, edge shift, back door or the plain spread; shapes.on) get the shape formed by the time the ball leaves the ruck, vary the first receiver and spread the try origins, without moving the §7 counts, completion or the six preset rows out of 45–55%? Baseline is the off value (shapes.on 0, the weighted receiver on as shipped); 'on' is the proposed default. 'on, spots as the table' lifts the two limits that get the men there in time (shapes.maxShiftM 0 and shapes.reachM 0), to show what they buy. The scenarios are standard.json's, with 60 matches on the plain rows.

**commit** f3135b9 (uncommitted changes) · **branch** worktree-agent-aaa35ad52c2bade38 · **started** 2026-11-13T11:52:42.425Z

60 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.7 ↓ | 5.4 ↓ | 15.8 | 0.3 | 2.6 ↓ | 3.8 ↓ | 5.9 ↓ | 1.6 ↓ | 0.3 | 6.9 | 0.7 | 0.0 | 0.0 | 0.9 | 0.2 | 0.7 | 0.1 | 0.3 | 150.9 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.5 | 0.4 | 0.0 | 72.8 ✓ | 0.500 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 40% (23% drawn) | 0.71 | 93%/93% |
| on | 52.4 ↓ (+0.7) | 5.5 ↓ (+0.1) | 15.7 (-0.1) | 0.3 (+0.0) | 2.4 ↓ (-0.2) | 3.6 ↓ (-0.1) | 6.2 ↓ (+0.3) | 1.9 ↓ (+0.3) | 0.1 (-0.1) | 7.1 (+0.2) | 0.5 (-0.2) | 0.0 (+0.0) | 0.1 (+0.1) | 1.1 (+0.2) | 0.1 (-0.1) | 0.7 (+0.0) | 0.0 (-0.0) | 0.6 (+0.3*) | 147.3 (-3.6) | 0.5 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (-0.1) | 0.3 (-0.2) | 0.6 (+0.1) | 0.1 (+0.1) | 73.3 ✓ (+0.5) | 0.683 (+0.2) | 0.117 ↓ (+0.0) | 0.017 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.550 (+0.2) | 28% (22% drawn) | 0.69 | 93%/93% |
| on, spots as the table | 52.7 ↓ (+1.0) | 4.5 ↓ (-0.9*) | 16.2 (+0.5) | 0.2 (-0.1) | 2.4 ↓ (-0.2) | 3.5 ↓ (-0.3) | 6.3 ↓ (+0.4) | 2.1 ↓ (+0.5*) | 0.3 (+0.0) | 8.0 (+1.1*) | 0.6 (-0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 1.4 (+0.5*) | 0.1 (-0.0) | 0.8 (+0.1) | 0.0 (-0.0) | 0.3 (+0.0) | 162.4 (+11.5) | 0.5 (+0.0) | 0.5 (-0.2) | 0.1 (+0.0) | 0.1 (-0.0) | 0.2 (-0.1) | -0.1 (-0.6) | 0.5 (+0.0) | 0.1 (+0.0) | 73.4 ✓ (+0.6) | 0.717 (+0.2) | 0.117 ↓ (+0.0) | 0.017 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.583 (+0.2) | 45% (12% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.27 | 78 | 25 | 0.6 | 11 | 0 | 2 | 7 | 39 | 41 | 69 | 22 | 9 | 27 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.20 (-0.1) | 83 (+5.0) | 13 (-11.7) | 0.6 (+0.1) | 12 (+1.9) | 0 (+0.0) | 4 (+2.3) | 7 (-0.3) | 32 (-7.1) | 44 (+3.2) | 68 (-0.2) | 23 (+0.8) | 8 (-0.6) | 27 (-0.1) | 5.3 (-0.1) | 30 | 32 | 18 | 20 | 94 | 97 | 85 | 98 | 0.3 |
| on, spots as the table | 0.37 (+0.1) | 92 (+13.3*) | 27 (+1.7) | 1.4 (+0.8*) | 13 (+2.9) | 0 (+0.0) | 4 (+1.8) | 6 (-1.9) | 39 (-0.4) | 39 (-2.5) | 68 (-0.2) | 24 (+2.0) | 7 (-1.8) | 26 (-1.1) | 5.4 (-0.0) | 26 | 35 | 21 | 18 | 32 | 42 | 5 | 43 | 2.7 |

_Tries 1.6 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.1 ↓ | 5.7 ↓ | 14.8 | 0.2 | 2.2 ↓ | 3.9 ↓ | 6.2 ↓ | 2.1 ↓ | 0.2 | 7.1 | 0.6 | 0.0 | 0.1 | 1.1 | 0.1 | 0.7 | 0.1 | 0.5 | 151.1 | 0.4 | 0.7 | 0.0 | 0.1 | 0.2 | 0.0 | 0.4 | 0.1 | 72.5 ✓ | 0.667 | 0.067 ↓ | 0.033 ↓ | 0.000 ✓ | 0.567 | 33% (15% drawn) | 0.69 | 92%/94% |
| on | 52.3 ↓ (+1.2) | 6.0 ↓ (+0.3) | 16.5 (+1.7*) | 0.2 (+0.1) | 2.2 ↓ (-0.1) | 3.8 ↓ (-0.1) | 5.9 ↓ (-0.3) | 2.0 ↓ (-0.1) | 0.2 (+0.0) | 7.2 (+0.1) | 0.5 (-0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 1.1 (-0.1) | 0.1 (-0.0) | 0.6 (-0.0) | 0.0 (-0.1) | 0.3 (-0.1) | 148.0 (-3.1) | 0.6 (+0.2) | 0.5 (-0.1) | 0.0 (+0.0) | 0.0 (-0.1) | 0.1 (-0.0) | 0.2 (+0.1) | 0.6 (+0.1) | 0.1 (-0.1) | 72.6 ✓ (+0.1) | 0.450 (-0.2) | 0.050 ↓ (-0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.400 (-0.2) | 33% (27% drawn) | 0.68 | 92%/93% |
| on, spots as the table | 52.7 ↓ (+1.6*) | 5.6 ↓ (-0.1) | 17.1 (+2.3*) | 0.2 (-0.0) | 2.6 ↓ (+0.4) | 4.0 ↓ (+0.1) | 6.0 ↓ (-0.2) | 2.0 ↓ (-0.1) | 0.3 (+0.1) | 7.2 (+0.1) | 0.6 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.0) | 0.1 (-0.0) | 0.6 (-0.1) | 0.1 (-0.1) | 0.3 (-0.2) | 142.6 (-8.5) | 0.6 (+0.2) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.1 (-0.1) | 0.1 (+0.1) | 0.6 (+0.1) | 0.1 (-0.0) | 71.5 ✓ (-1.1) | 0.583 (-0.1) | 0.083 ↓ (+0.0) | 0.017 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.483 (-0.1) | 37% (27% drawn) | 0.68 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.27 | 72 | 3 | 0.8 | 7 | 0 | 2 | 6 | 37 | 47 | 70 | 22 | 9 | 28 | 5.3 | — | — | — | — | — | — | — | — | — |
| on | 0.25 (-0.0) | 80 (+8.3) | 12 (+8.3) | 0.8 (+0.0) | 8 (+1.0) | 0 (+0.0) | 4 (+1.7) | 6 (-0.7) | 45 (+8.3) | 37 (-10.3) | 66 (-3.4) | 24 (+2.2) | 10 (+1.3) | 27 (-1.2) | 5.4 (+0.2) | 30 | 31 | 18 | 21 | 95 | 96 | 87 | 98 | 0.3 |
| on, spots as the table | 0.17 (-0.1) | 77 (+5.0) | 7 (+3.3) | 0.8 (+0.0) | 13 (+5.3) | 0 (+0.0) | 3 (+0.1) | 8 (+1.1) | 38 (+0.7) | 40 (-7.2) | 67 (-2.4) | 23 (+1.7) | 9 (+0.7) | 26 (-1.6) | 5.3 (+0.0) | 23 | 33 | 21 | 22 | 32 | 40 | 5 | 46 | 2.6 |

_Tries 2.1 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 5.4 ↓ | 21.9 | 0.2 | 2.5 ↓ | 3.6 ↓ | 5.5 ↓ | 1.9 ↓ | 0.1 | 8.8 | 1.1 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.4 | 131.4 | 0.8 | 0.7 | 0.0 | 0.1 | 0.3 | 0.8 | 0.4 | 0.2 | 73.9 ✓ | 0.533 | 0.100 ↓ | 0.017 ↓ | 0.000 ✓ | 0.417 | 32% (20% drawn) | 0.68 | 93%/93% |
| on | 52.8 ↓ (+1.0) | 4.6 ↓ (-0.8*) | 21.5 (-0.5) | 0.1 (-0.1) | 2.5 ↓ (-0.0) | 3.8 ↓ (+0.2) | 5.9 ↓ (+0.4) | 2.1 ↓ (+0.3) | 0.2 (+0.1) | 9.9 (+1.1*) | 0.8 (-0.3*) | 0.0 (+0.0) | 0.2 (+0.1) | 1.3 (+0.1) | 0.1 (+0.1) | 0.7 (+0.1) | 0.0 (+0.0) | 0.5 (+0.1) | 145.0 (+13.6) | 0.8 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.3 (-0.1) | 0.6 (-0.1) | 0.4 (+0.0) | 0.2 (+0.0) | 73.5 ✓ (-0.3) | 0.550 (+0.0) | 0.100 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 47% (5% drawn) | 0.68 | 93%/93% |
| on, spots as the table | 53.0 ↓ (+1.1) | 5.1 ↓ (-0.3) | 22.6 (+0.6) | 0.3 (+0.0) | 2.4 ↓ (-0.1) | 3.8 ↓ (+0.2) | 5.9 ↓ (+0.4) | 2.5 ↓ (+0.6*) | 0.2 (+0.0) | 9.8 (+1.1*) | 0.9 (-0.2) | 0.0 (+0.0) | 0.2 (+0.1) | 1.6 (+0.4) | 0.1 (-0.0) | 0.7 (+0.1) | 0.1 (+0.1) | 0.5 (+0.1) | 138.0 (+6.6) | 0.8 (+0.1) | 0.8 (+0.1) | 0.1 (+0.1) | 0.1 (-0.1) | 0.1 (-0.2) | 0.1 (-0.7) | 0.5 (+0.1) | 0.2 (+0.1) | 74.4 ✓ (+0.6) | 0.700 (+0.2) | 0.133 ↓ (+0.0) | 0.017 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.550 (+0.1) | 50% (8% drawn) | 0.68 | 94%/94% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 83 | 20 | 0.5 | 15 | 0 | 6 | 8 | 40 | 31 | 62 | 27 | 12 | 27 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.35 (+0.1) | 88 (+5.0) | 25 (+5.0) | 1.4 (+0.9*) | 13 (-2.0) | 0 (+0.0) | 2 (-4.7) | 7 (-1.1) | 37 (-2.9) | 41 (+10.8) | 67 (+4.6) | 25 (-1.7) | 9 (-2.9) | 27 (+0.1) | 5.2 (-0.2) | 28 | 32 | 18 | 21 | 94 | 97 | 83 | 98 | 0.3 |
| on, spots as the table | 0.35 (+0.1) | 67 (-16.7*) | 15 (-5.0) | 0.6 (+0.1) | 17 (+1.5) | 0 (+0.0) | 3 (-3.6) | 8 (-0.1) | 32 (-7.4) | 40 (+9.6) | 66 (+4.0) | 27 (+0.6) | 7 (-4.7*) | 27 (-0.3) | 5.3 (-0.1) | 24 | 36 | 23 | 18 | 32 | 40 | 6 | 48 | 2.6 |

_Tries 1.8 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.2 ↓ | 4.9 ↓ | 15.6 | 0.5 | 2.1 ↓ | 3.6 ↓ | 6.1 ↓ | 1.6 ↓ | 0.1 | 7.4 | 0.8 | 0.0 | 0.1 | 0.9 | 0.1 | 0.7 | 0.0 | 0.5 | 157.8 | 0.5 | 0.8 | 0.0 | 0.1 | 0.2 | 0.3 | 0.6 | 0.1 | 74.2 ✓ | 0.533 | 0.050 ↓ | 0.017 ↓ | 0.000 ✓ | 0.467 | 37% (25% drawn) | 0.70 | 93%/93% |
| on | 55.8 ↓ (+0.6) | 5.5 ↓ (+0.5) | 16.6 (+1.0) | 0.4 (-0.1) | 2.3 ↓ (+0.2) | 3.6 ↓ (+0.1) | 6.2 ↓ (+0.1) | 2.0 ↓ (+0.4*) | 0.1 (+0.0) | 7.9 (+0.5) | 0.7 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.2) | 0.1 (+0.0) | 0.7 (-0.0) | 0.1 (+0.1*) | 0.3 (-0.2) | 160.6 (+2.7) | 0.7 (+0.1) | 1.1 (+0.3) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (+0.0) | 0.2 (-0.1) | 0.5 (-0.1) | 0.1 (+0.0) | 72.7 ✓ (-1.5) | 0.450 (-0.1) | 0.150 ↓ (+0.1) | 0.017 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.283 (-0.2) | 42% (17% drawn) | 0.69 | 93%/93% |
| on, spots as the table | 55.8 ↓ (+0.6) | 4.8 ↓ (-0.1) | 16.1 (+0.5) | 0.3 (-0.2) | 3.1 ↓ (+1.0*) | 3.3 ↓ (-0.3) | 6.7 ↓ (+0.6) | 2.0 ↓ (+0.5) | 0.2 (+0.1) | 7.8 (+0.5) | 0.7 (-0.1) | 0.0 (+0.0) | 0.1 (-0.1) | 1.1 (+0.2) | 0.1 (+0.0) | 0.8 (+0.1) | 0.0 (+0.0) | 0.4 (-0.1) | 164.8 (+6.9) | 0.5 (+0.0) | 0.8 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.1) | 0.1 (-0.3) | 0.4 (-0.2) | 0.1 (-0.1) | 77.1 ✓ (+2.9) | 0.633 (+0.1) | 0.133 ↓ (+0.1) | 0.017 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.483 (+0.0) | 37% (17% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.18 | 75 | 12 | 0.7 | 8 | 0 | 5 | 10 | 40 | 38 | 63 | 30 | 8 | 27 | 5.6 | — | — | — | — | — | — | — | — | — |
| on | 0.18 (+0.0) | 82 (+6.7) | 20 (+8.3) | 0.7 (+0.0) | 14 (+6.0) | 0 (+0.0) | 1 (-4.5) | 7 (-2.9) | 42 (+1.7) | 37 (-0.3) | 67 (+4.0) | 26 (-4.0) | 8 (+0.0) | 29 (+2.0) | 5.5 (-0.1) | 22 | 39 | 18 | 21 | 95 | 98 | 88 | 97 | 0.3 |
| on, spots as the table | 0.38 (+0.2) | 85 (+10.0) | 18 (+6.7) | 0.8 (+0.1) | 19 (+11.5*) | 0 (+0.0) | 3 (-2.1) | 2 (-8.0*) | 41 (+1.5) | 35 (-2.9) | 67 (+4.4) | 26 (-3.6) | 7 (-0.7) | 30 (+3.1*) | 5.4 (-0.2) | 17 | 40 | 23 | 20 | 38 | 51 | 7 | 49 | 2.5 |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.1 ↓ | 5.1 ↓ | 15.3 | 0.3 | 2.1 ↓ | 3.6 ↓ | 6.2 ↓ | 2.1 ↓ | 0.1 | 7.0 | 0.5 | 0.0 | 0.0 | 1.1 | 0.1 | 0.8 | 0.1 | 0.4 | 153.6 | 0.6 | 0.6 | 0.0 | 0.1 | 0.1 | 0.3 | 0.4 | 0.1 | 74.6 ✓ | 0.650 | 0.090 ↓ | 0.010 ↓ | 0.000 ✓ | 0.550 | 44% (15% drawn) | 40.0% (18.5% drawn) | 0.70 | 93%/93% |
| on | 55.3 ↓ (+2.2*) | 4.8 ↓ (-0.2) | 16.1 (+0.8) | 0.3 (+0.1) | 2.1 ↓ (+0.0) | 3.5 ↓ (-0.1) | 6.5 ↓ (+0.2) | 2.0 ↓ (-0.1) | 0.3 (+0.1) | 7.4 (+0.4) | 0.7 (+0.1) | 0.0 (+0.0) | 0.1 (+0.1) | 1.2 (+0.1) | 0.1 (+0.0) | 0.6 (-0.2*) | 0.0 (-0.1) | 0.5 (+0.1) | 162.9 (+9.2) | 0.6 (+0.0) | 0.7 (+0.1) | 0.0 (-0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.4 (+0.0) | 0.1 (+0.1) | 74.3 ✓ (-0.4) | 0.730 (+0.1) | 0.160 ↓ (+0.1) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.570 (+0.0) | 38% (16% drawn) | 42.0% (16.5% drawn) | 0.70 | 93%/93% |
| on, spots as the table | 54.8 ↓ (+1.7*) | 5.2 ↓ (+0.1) | 16.1 (+0.8) | 0.3 (+0.0) | 2.6 ↓ (+0.6*) | 3.8 ↓ (+0.1) | 6.6 ↓ (+0.4) | 1.7 ↓ (-0.4*) | 0.2 (+0.0) | 7.6 (+0.6) | 0.7 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (+0.0) | 0.8 (+0.0) | 0.0 (-0.0) | 0.4 (+0.0) | 171.2 (+17.5*) | 0.6 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.2 (-0.1) | 0.5 (+0.1) | 0.1 (+0.0) | 74.1 ✓ (-0.5) | 0.550 (-0.1) | 0.150 ↓ (+0.1) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.400 (-0.2) | 42% (19% drawn) | 38.5% (20.0% drawn) | 0.69 | 93%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 81 | 16 | 1.0 | 11 | 0 | 4 | 7 | 39 | 38 | 66 | 25 | 9 | 28 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.35 (+0.0) | 79 (-2.0) | 22 (+6.0) | 1.1 (+0.1) | 10 (-1.0) | 0 (+0.0) | 5 (+1.2) | 6 (-0.7) | 41 (+1.7) | 37 (-1.3) | 66 (-0.2) | 26 (+0.7) | 9 (-0.5) | 29 (+0.7) | 5.3 (-0.0) | 26 | 46 | 12 | 16 | 95 | 97 | 84 | 96 | 0.3 |
| on, spots as the table | 0.29 (-0.0) | 80 (-1.0) | 17 (+1.0) | 1.1 (+0.1) | 12 (+0.8) | 0 (+0.0) | 4 (-0.2) | 5 (-1.9) | 37 (-1.8) | 41 (+3.2) | 69 (+2.8) | 23 (-2.2) | 9 (-0.5) | 30 (+2.6*) | 5.1 (-0.3*) | 21 | 48 | 14 | 16 | 43 | 52 | 5 | 47 | 2.1 |

_Tries 2.1 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.8 ↓ | 5.3 ↓ | 15.1 | 0.3 | 2.4 ↓ | 3.9 ↓ | 5.6 ↓ | 1.6 ↓ | 0.1 | 7.3 | 0.9 | 0.0 | 0.1 | 1.0 | 0.2 | 0.6 | 0.0 | 0.5 | 139.1 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 72.2 ✓ | 0.450 | 0.040 ↓ | 0.000 ↓ | 0.000 ✓ | 0.410 | 36% (20% drawn) | 38.5% (19.0% drawn) | 0.70 | 93%/93% |
| on | 54.0 ↓ (+1.2*) | 5.6 ↓ (+0.3) | 16.6 (+1.6*) | 0.3 (+0.0) | 2.7 ↓ (+0.4) | 3.8 ↓ (-0.1) | 5.9 ↓ (+0.3) | 2.0 ↓ (+0.3*) | 0.2 (+0.1) | 7.5 (+0.2) | 0.8 (-0.1) | 0.0 (+0.0) | 0.1 (-0.0) | 1.3 (+0.3*) | 0.1 (-0.1*) | 0.6 (+0.0) | 0.0 (-0.0) | 0.5 (-0.0) | 149.8 (+10.7) | 0.6 (+0.1) | 0.6 (-0.1) | 0.0 (-0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.5 (+0.0) | 0.1 (-0.0) | 72.4 ✓ (+0.3) | 0.500 (+0.0) | 0.060 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.430 (+0.0) | 42% (18% drawn) | 44.0% (18.0% drawn) | 0.70 | 93%/93% |
| on, spots as the table | 53.8 ↓ (+1.0*) | 5.1 ↓ (-0.2) | 16.5 (+1.4*) | 0.3 (+0.0) | 3.1 ↓ (+0.7*) | 3.5 ↓ (-0.4) | 6.2 ↓ (+0.6*) | 2.1 ↓ (+0.5*) | 0.2 (+0.0) | 7.3 (+0.1) | 0.5 (-0.3*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.3 (+0.3*) | 0.1 (-0.1) | 0.7 (+0.1) | 0.0 (-0.0) | 0.3 (-0.2*) | 148.3 (+9.1) | 0.5 (+0.0) | 0.6 (-0.1) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | -0.0 (-0.2) | 0.5 (+0.1) | 0.1 (+0.0) | 75.1 ✓ (+2.9) | 0.340 (-0.1) | 0.050 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.280 (-0.1) | 44% (16% drawn) | 44.5% (16.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 84 | 18 | 0.7 | 10 | 0 | 4 | 4 | 40 | 43 | 63 | 29 | 8 | 25 | 5.6 | — | — | — | — | — | — | — | — | — |
| on | 0.25 (+0.0) | 79 (-5.0) | 16 (-2.0) | 0.8 (+0.2) | 9 (-1.2) | 0 (+0.0) | 5 (+0.9) | 9 (+4.3) | 41 (+1.1) | 38 (-5.0) | 64 (+1.0) | 26 (-3.0) | 10 (+1.9) | 26 (+0.2) | 5.5 (-0.1) | 26 | 24 | 24 | 25 | 94 | 97 | 86 | 97 | 0.3 |
| on, spots as the table | 0.35 (+0.1) | 79 (-5.0) | 21 (+3.0) | 0.9 (+0.3) | 15 (+4.7) | 0 (+0.0) | 4 (+0.5) | 7 (+2.8) | 34 (-5.1) | 40 (-3.0) | 66 (+3.7) | 24 (-5.1*) | 10 (+1.4) | 27 (+1.4) | 5.4 (-0.2*) | 22 | 25 | 28 | 25 | 31 | 41 | 7 | 47 | 2.8 |

_Tries 1.6 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.8 ↓ | 5.4 ↓ | 15.6 | 0.2 | 1.9 ↓ | 3.7 ↓ | 5.9 ↓ | 2.0 ↓ | 0.2 | 7.4 | 0.7 | 0.0 | 0.1 | 1.1 | 0.2 | 0.4 | 0.1 | 0.5 | 143.7 | 0.5 | 0.6 | 0.0 | 0.0 | 0.1 | -0.1 | 0.4 | 0.1 | 72.6 ✓ | 0.700 | 0.050 ↓ | 0.020 ↓ | 0.000 ✓ | 0.630 | 44% (17% drawn) | 40.0% (17.5% drawn) | 0.70 | 93%/93% |
| on | 52.5 ↓ (+1.8*) | 5.2 ↓ (-0.2) | 15.6 (+0.0) | 0.2 (+0.0) | 2.0 ↓ (+0.2) | 3.8 ↓ (+0.1) | 5.9 ↓ (+0.0) | 1.9 ↓ (-0.1) | 0.3 (+0.0) | 6.9 (-0.5) | 0.6 (-0.2) | 0.0 (+0.0) | 0.0 (-0.0) | 1.1 (-0.0) | 0.1 (-0.0) | 0.4 (-0.1) | 0.0 (-0.1*) | 0.5 (-0.0) | 148.2 (+4.5) | 0.4 (-0.1) | 0.7 (+0.1) | 0.0 (-0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (+0.2*) | 0.5 (+0.1) | 0.1 (-0.1) | 73.2 ✓ (+0.6) | 0.630 (-0.1) | 0.040 ↓ (-0.0) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.580 (-0.1) | 42% (16% drawn) | 39.5% (18.0% drawn) | 0.70 | 93%/93% |
| on, spots as the table | 52.5 ↓ (+1.7*) | 4.8 ↓ (-0.6) | 16.2 (+0.6) | 0.3 (+0.1) | 2.1 ↓ (+0.2) | 3.9 ↓ (+0.3) | 6.2 ↓ (+0.3) | 2.0 ↓ (+0.0) | 0.2 (+0.0) | 7.2 (-0.2) | 0.4 (-0.3*) | 0.0 (+0.0) | 0.1 (-0.0) | 1.2 (+0.2) | 0.1 (-0.1) | 0.5 (+0.0) | 0.0 (-0.0) | 0.5 (-0.0) | 155.2 (+11.5) | 0.5 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.1 (+0.1) | 0.4 (+0.0) | 0.1 (-0.0) | 72.1 ✓ (-0.5) | 0.610 (-0.1) | 0.080 ↓ (+0.0) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.520 (-0.1) | 50% (8% drawn) | 42.0% (13.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 85 | 16 | 0.6 | 11 | 0 | 5 | 5 | 29 | 49 | 66 | 24 | 10 | 27 | 5.2 | — | — | — | — | — | — | — | — | — |
| on | 0.19 (-0.1) | 84 (-1.0) | 12 (-4.0) | 0.5 (-0.1) | 7 (-3.8) | 0 (+0.0) | 4 (-1.4) | 4 (-0.9) | 42 (+12.1*) | 43 (-6.1) | 64 (-1.2) | 24 (-0.1) | 11 (+1.2) | 27 (-0.5) | 5.3 (+0.1) | 31 | 34 | 15 | 20 | 95 | 98 | 85 | 97 | 0.3 |
| on, spots as the table | 0.40 (+0.1) | 79 (-6.0) | 24 (+8.0) | 1.2 (+0.5*) | 10 (-1.1) | 0 (+0.0) | 4 (-1.6) | 10 (+5.0) | 39 (+9.3) | 38 (-11.6*) | 68 (+2.0) | 23 (-0.9) | 9 (-1.0) | 27 (+0.2) | 5.3 (+0.0) | 26 | 38 | 19 | 18 | 35 | 44 | 4 | 47 | 2.5 |

_Tries 2.0 and last tackles 8.0 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 6.0 ↓ | 17.1 | 0.3 | 3.3 ↓ | 3.9 ↓ | 5.5 ↓ | 1.9 ↓ | 0.2 | 6.8 | 0.9 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.5 | 134.7 | 0.5 | 0.6 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 72.0 ✓ | 0.390 | 0.070 ↓ | 0.000 ↓ | 0.000 ✓ | 0.320 | 47% (20% drawn) | 42.5% (17.0% drawn) | 0.69 | 93%/93% |
| on | 52.1 ↓ (+1.2*) | 5.7 ↓ (-0.3) | 17.2 (+0.1) | 0.3 (-0.0) | 3.3 ↓ (-0.1) | 3.7 ↓ (-0.2) | 5.8 ↓ (+0.3) | 2.1 ↓ (+0.2) | 0.2 (+0.0) | 7.3 (+0.5) | 0.7 (-0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.1) | 0.1 (-0.1) | 0.6 (+0.0) | 0.0 (+0.0) | 0.4 (-0.1) | 139.3 (+4.5) | 0.4 (-0.1) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (-0.1) | 0.5 (-0.0) | 0.1 (+0.0) | 71.5 ✓ (-0.5) | 0.430 (+0.0) | 0.080 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (+0.0) | 44% (16% drawn) | 44.5% (14.0% drawn) | 0.70 | 93%/93% |
| on, spots as the table | 52.0 ↓ (+1.1*) | 5.4 ↓ (-0.6) | 17.2 (+0.1) | 0.3 (-0.0) | 3.6 ↓ (+0.3) | 4.1 ↓ (+0.2) | 5.7 ↓ (+0.2) | 2.2 ↓ (+0.3) | 0.2 (+0.0) | 7.2 (+0.4) | 0.7 (-0.3*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.4 (+0.3*) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (-0.0) | 0.4 (-0.0) | 141.4 (+6.7) | 0.5 (+0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.3 (+0.1) | 0.6 (+0.1) | 0.1 (+0.0) | 71.9 ✓ (-0.1) | 0.420 (+0.0) | 0.050 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.370 (+0.0) | 53% (9% drawn) | 48.0% (12.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.32 | 84 | 19 | 0.8 | 10 | 0 | 9 | 6 | 35 | 40 | 65 | 26 | 10 | 27 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.32 (+0.0) | 81 (-3.0) | 15 (-4.0) | 0.8 (-0.0) | 9 (-1.3) | 0 (+0.0) | 13 (+3.6) | 8 (+1.4) | 33 (-2.2) | 38 (-1.6) | 65 (+0.2) | 25 (-0.9) | 10 (+0.7) | 27 (+0.9) | 5.4 (-0.0) | 24 | 28 | 21 | 27 | 94 | 97 | 85 | 96 | 0.3 |
| on, spots as the table | 0.43 (+0.1) | 77 (-7.0) | 22 (+3.0) | 1.3 (+0.5) | 9 (-1.4) | 0 (+0.0) | 9 (-0.3) | 5 (-0.9) | 39 (+3.7) | 39 (-1.0) | 67 (+2.2) | 26 (-0.0) | 7 (-2.2) | 27 (-0.0) | 5.4 (-0.0) | 19 | 30 | 26 | 24 | 31 | 40 | 5 | 49 | 2.7 |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 5.3 ↓ | 22.3 | 0.1 | 2.3 ↓ | 3.6 ↓ | 5.7 ↓ | 2.1 ↓ | 0.1 | 9.3 | 0.9 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.1 | 0.5 | 138.1 | 0.9 | 0.6 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.4 ✓ | 0.630 | 0.070 ↓ | 0.010 ↓ | 0.000 ✓ | 0.550 | 36% (20% drawn) | 41.0% (20.5% drawn) | 0.69 | 93%/93% |
| on | 53.0 ↓ (+0.9) | 5.5 ↓ (+0.3) | 23.9 (+1.6*) | 0.2 (+0.1) | 2.7 ↓ (+0.4) | 3.4 ↓ (-0.2) | 5.9 ↓ (+0.2) | 2.0 ↓ (-0.1) | 0.2 (+0.1) | 9.0 (-0.3) | 0.9 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.3 (+0.1) | 0.1 (+0.0) | 0.6 (-0.0) | 0.0 (-0.0) | 0.4 (-0.1) | 142.2 (+4.1) | 0.9 (+0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (-0.0) | 0.6 (+0.4) | 0.5 (+0.0) | 0.1 (+0.1) | 74.6 ✓ (+0.1) | 0.520 (-0.1) | 0.110 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.390 (-0.2) | 40% (19% drawn) | 41.5% (13.0% drawn) | 0.67 | 93%/93% |
| on, spots as the table | 53.4 ↓ (+1.3*) | 5.0 ↓ (-0.3) | 22.1 (-0.1) | 0.2 (+0.0) | 2.6 ↓ (+0.3) | 3.7 ↓ (+0.1) | 6.0 ↓ (+0.3) | 2.0 ↓ (-0.1) | 0.2 (+0.1) | 9.3 (-0.0) | 0.9 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 1.3 (+0.1) | 0.1 (+0.1) | 0.7 (+0.1) | 0.0 (-0.0) | 0.5 (+0.1) | 147.4 (+9.3) | 0.8 (-0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (-0.0) | 0.4 (+0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 73.7 ✓ (-0.7) | 0.530 (-0.1) | 0.110 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.410 (-0.1) | 31% (23% drawn) | 37.0% (17.0% drawn) | 0.68 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 83 | 13 | 1.0 | 12 | 0 | 2 | 11 | 33 | 42 | 64 | 26 | 10 | 27 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.24 (-0.1) | 80 (-3.0) | 18 (+5.0) | 0.9 (-0.1) | 12 (+0.3) | 0 (+0.0) | 5 (+2.1) | 8 (-2.7) | 33 (-0.0) | 43 (+0.3) | 65 (+0.5) | 27 (+0.8) | 9 (-1.4) | 26 (-0.3) | 5.4 (+0.0) | 29 | 33 | 17 | 21 | 94 | 96 | 86 | 96 | 0.3 |
| on, spots as the table | 0.20 (-0.1) | 74 (-9.0) | 15 (+2.0) | 0.6 (-0.4) | 11 (-0.6) | 0 (+0.0) | 4 (+1.6) | 10 (-1.1) | 32 (-0.8) | 43 (+1.0) | 68 (+3.8) | 23 (-3.2) | 9 (-0.6) | 27 (+0.1) | 5.4 (-0.0) | 25 | 34 | 22 | 19 | 32 | 43 | 5 | 42 | 2.6 |

_Tries 2.1 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 60)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 5.8 ↓ | 16.7 | 0.2 | 2.1 ↓ | 3.6 ↓ | 5.9 ↓ | 1.9 ↓ | 0.1 | 6.8 | 0.7 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.0 | 0.6 | 150.8 | 0.4 | 0.7 | 0.0 | 0.0 | 0.1 | 0.0 | 0.3 | 0.1 | 74.0 ✓ | 0.690 | 0.100 ↓ | 0.020 ↓ | 0.000 ✓ | 0.570 | 35% (17% drawn) | 36.5% (16.0% drawn) | 0.69 | 93%/93% |
| on | 52.1 ↓ (+0.6) | 5.8 ↓ (-0.1) | 17.9 (+1.2*) | 0.3 (+0.1) | 2.4 ↓ (+0.3) | 3.9 ↓ (+0.2) | 5.8 ↓ (-0.2) | 1.9 ↓ (-0.0) | 0.1 (-0.0) | 7.2 (+0.3) | 0.7 (-0.0) | 0.0 (+0.0) | 0.0 (-0.1*) | 1.1 (+0.1) | 0.1 (-0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.5 (-0.1) | 145.2 (-5.6) | 0.4 (-0.0) | 0.7 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.2 (+0.2) | 0.5 (+0.1) | 0.0 (-0.1*) | 72.0 ✓ (-1.9) | 0.500 (-0.2) | 0.060 ↓ (-0.0) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.430 (-0.1) | 38% (21% drawn) | 39.5% (19.0% drawn) | 0.69 | 93%/93% |
| on, spots as the table | 53.2 ↓ (+1.6*) | 5.1 ↓ (-0.8*) | 17.5 (+0.8) | 0.3 (+0.0) | 2.4 ↓ (+0.4) | 3.8 ↓ (+0.2) | 5.9 ↓ (+0.0) | 1.9 ↓ (-0.0) | 0.2 (+0.1) | 7.6 (+0.8*) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.2 (+0.2) | 0.1 (+0.0) | 0.6 (-0.1) | 0.1 (+0.0) | 0.4 (-0.2) | 147.4 (-3.4) | 0.4 (+0.0) | 0.7 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.5 (+0.5*) | 0.5 (+0.2) | 0.1 (-0.0) | 73.1 ✓ (-0.9) | 0.370 (-0.3*) | 0.040 ↓ (-0.1) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.330 (-0.2*) | 40% (18% drawn) | 37.0% (21.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.17 | 85 | 16 | 0.4 | 11 | 0 | 3 | 6 | 30 | 50 | 69 | 23 | 8 | 27 | 5.5 | — | — | — | — | — | — | — | — | — |
| on | 0.32 (+0.1) | 87 (+2.0) | 17 (+1.0) | 0.8 (+0.4) | 7 (-3.6) | 0 (+0.0) | 3 (-0.5) | 7 (+1.2) | 35 (+5.3) | 48 (-2.4) | 65 (-3.7) | 24 (+0.5) | 11 (+3.2*) | 27 (+0.4) | 5.3 (-0.2*) | 29 | 32 | 18 | 21 | 94 | 98 | 84 | 97 | 0.3 |
| on, spots as the table | 0.29 (+0.1) | 83 (-2.0) | 19 (+3.0) | 1.0 (+0.6*) | 12 (+1.1) | 0 (+0.0) | 4 (+0.5) | 10 (+3.7) | 34 (+3.9) | 41 (-9.3) | 67 (-2.2) | 23 (+0.0) | 10 (+2.2) | 27 (+0.3) | 5.4 (-0.1) | 25 | 35 | 21 | 19 | 32 | 41 | 4 | 47 | 2.6 |

_Tries 1.9 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.1 ↓ | 5.2 ↓ | 16.0 | 0.6 | 2.5 ↓ | 3.5 ↓ | 6.0 ↓ | 2.0 ↓ | 0.1 | 7.0 | 0.6 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.1 | 0.4 | 148.1 | 0.5 | 0.9 | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.1 | 74.7 ✓ | 0.683 | 0.117 ↓ | 0.017 ↓ | 0.000 ✓ | 0.550 | 58% (15% drawn) | 0.70 | 93%/93% |
| on | 52.7 ↓ (+1.6*) | 5.0 ↓ (-0.2) | 16.8 (+0.8) | 0.5 (-0.1) | 2.4 ↓ (-0.1) | 3.6 ↓ (+0.0) | 5.9 ↓ (-0.1) | 1.9 ↓ (-0.1) | 0.1 (+0.0) | 6.9 (-0.0) | 0.7 (+0.1) | 0.0 (+0.0) | 0.1 (-0.1) | 1.2 (+0.1) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (-0.0) | 0.4 (-0.0) | 155.6 (+7.5) | 0.4 (-0.2) | 0.6 (-0.2) | 0.0 (-0.0) | 0.1 (-0.1) | 0.1 (-0.0) | 0.2 (-0.1) | 0.5 (+0.1) | 0.1 (-0.0) | 74.5 ✓ (-0.2) | 0.500 (-0.2) | 0.083 ↓ (-0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.417 (-0.1) | 55% (17% drawn) | 0.69 | 93%/92% |
| on, spots as the table | 52.7 ↓ (+1.6*) | 5.1 ↓ (-0.1) | 16.1 (+0.1) | 0.5 (-0.1) | 2.9 ↓ (+0.4) | 3.9 ↓ (+0.4) | 6.3 ↓ (+0.3) | 2.3 ↓ (+0.3) | 0.2 (+0.1) | 7.3 (+0.3) | 0.5 (-0.0) | 0.0 (+0.0) | 0.1 (-0.1) | 1.3 (+0.2) | 0.1 (-0.0) | 0.7 (+0.1) | 0.0 (-0.0) | 0.3 (-0.1) | 152.2 (+4.1) | 0.4 (-0.1) | 0.5 (-0.4*) | 0.0 (-0.0) | 0.1 (-0.1) | 0.1 (-0.1) | 0.1 (-0.2) | 0.3 (-0.1) | 0.1 (-0.1) | 73.2 ✓ (-1.5) | 0.517 (-0.2) | 0.150 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.367 (-0.2) | 52% (10% drawn) | 0.69 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.27 | 82 | 10 | 1.1 | 9 | 0 | 2 | 12 | 29 | 48 | 69 | 22 | 9 | 27 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.18 (-0.1) | 75 (-6.7) | 18 (+8.3) | 0.7 (-0.4) | 11 (+1.5) | 0 (+0.0) | 4 (+1.9) | 7 (-4.6) | 35 (+5.3) | 44 (-4.1) | 65 (-4.4) | 26 (+4.1) | 9 (+0.3) | 27 (-0.3) | 5.5 (+0.2) | 29 | 34 | 17 | 21 | 95 | 98 | 87 | 97 | 0.3 |
| on, spots as the table | 0.35 (+0.1) | 85 (+3.3) | 13 (+3.3) | 1.3 (+0.2) | 13 (+4.0) | 0 (+0.0) | 4 (+2.0) | 9 (-2.9) | 39 (+10.2) | 35 (-13.3*) | 68 (-0.9) | 24 (+2.1) | 8 (-1.2) | 27 (-0.2) | 5.3 (-0.0) | 25 | 33 | 21 | 21 | 34 | 45 | 4 | 46 | 2.6 |

_Tries 2.0 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 49.6 ↓ | 9.3 ↓ | 17.8 | 0.1 | 2.0 ↓ | 3.6 ↓ | 5.3 ↓ | 3.0 ↓ | 0.3 | 6.5 | 1.3 | 0.0 | 0.1 | 1.8 | 0.1 | 0.4 | 0.0 | 0.3 | 123.5 | 0.7 | 0.6 | 0.0 | 0.0 | 0.1 | 0.2 | 0.5 | 0.1 | 74.3 ✓ | 0.567 | 0.133 ↓ | 0.000 ↓ | 0.000 ✓ | 0.433 | 50% (13% drawn) | 0.68 | 92%/93% |
| on | 50.9 ↓ (+1.4*) | 9.2 ↓ (-0.1) | 19.1 (+1.3) | 0.3 (+0.2) | 2.2 ↓ (+0.2) | 3.5 ↓ (-0.1) | 5.6 ↓ (+0.3) | 3.0 ↓ (+0.0) | 0.3 (+0.0) | 6.8 (+0.3) | 1.3 (+0.1) | 0.0 (+0.0) | 0.1 (-0.1) | 1.7 (-0.1) | 0.0 (-0.0) | 0.3 (-0.0) | 0.0 (+0.0) | 0.4 (+0.1) | 131.3 (+7.8) | 0.4 (-0.2) | 0.7 (+0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.0 (-0.1) | 0.0 (-0.2) | 0.5 (-0.0) | 0.1 (-0.1) | 73.5 ✓ (-0.8) | 0.550 (-0.0) | 0.050 ↓ (-0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.500 (+0.1) | 57% (8% drawn) | 0.68 | 92%/93% |
| on, spots as the table | 51.3 ↓ (+1.8*) | 8.8 ↓ (-0.5) | 18.3 (+0.6) | 0.2 (+0.1) | 2.4 ↓ (+0.4) | 4.1 ↓ (+0.5) | 5.5 ↓ (+0.2) | 2.9 ↓ (-0.1) | 0.4 (+0.1) | 6.8 (+0.3) | 0.9 (-0.3) | 0.0 (+0.0) | 0.0 (-0.1) | 1.9 (+0.1) | 0.1 (+0.0) | 0.4 (+0.0) | 0.1 (+0.1) | 0.3 (-0.0) | 131.0 (+7.5) | 0.6 (-0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.2 (+0.1) | 0.5 (+0.3) | 0.5 (-0.0) | 0.0 (-0.1) | 71.8 ✓ (-2.5) | 0.667 (+0.1) | 0.167 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.500 (+0.1) | 52% (15% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.43 | 77 | 15 | 1.7 | 11 | 0 | 4 | 17 | 28 | 41 | 66 | 25 | 9 | 25 | 5.4 | — | — | — | — | — | — | — | — | — |
| on | 0.52 (+0.1) | 70 (-6.7) | 23 (+8.3) | 1.4 (-0.3) | 7 (-3.4) | 0 (+0.0) | 2 (-1.7) | 17 (-0.2) | 36 (+7.9) | 38 (-2.6) | 66 (+0.4) | 25 (-0.4) | 9 (-0.0) | 26 (+0.8) | 5.4 (+0.0) | 30 | 33 | 16 | 21 | 94 | 97 | 85 | 97 | 0.3 |
| on, spots as the table | 0.47 (+0.0) | 73 (-3.3) | 22 (+6.7) | 1.3 (-0.5) | 10 (-0.9) | 0 (+0.0) | 5 (+1.2) | 11 (-5.9) | 31 (+2.9) | 43 (+2.6) | 64 (-1.7) | 26 (+0.5) | 10 (+1.2) | 27 (+1.4) | 5.3 (-0.1) | 24 | 35 | 21 | 20 | 37 | 45 | 8 | 52 | 2.4 |

_Tries 3.0 and last tackles 7.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.1 ↓ | 4.0 ↓ | 15.5 | 2.8 | 1.9 ↓ | 3.7 ↓ | 6.2 ↓ | 1.7 ↓ | 0.2 | 5.6 | 0.5 | 3.0 | 11.1 | 1.0 | 0.1 | 0.9 | 0.1 | 0.6 | 156.1 | 0.5 | 0.4 | 0.0 | 0.0 | 0.1 | 0.0 | 0.4 | 0.0 | 71.9 ✓ | 0.653 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.611 | 43% (8% drawn) | 0.68 | 54%/54% |
| on | 51.8 ↓ (+0.7) | 4.0 ↓ (-0.0) | 16.4 (+1.0) | 2.8 (+0.0) | 1.9 ↓ (+0.0) | 3.5 ↓ (-0.2) | 6.1 ↓ (-0.1) | 1.9 ↓ (+0.1) | 0.2 (+0.0) | 5.1 (-0.4) | 0.4 (-0.1) | 2.8 (-0.2) | 11.4 (+0.3) | 1.0 (-0.0) | 0.1 (-0.0) | 0.8 (-0.0) | 0.1 (+0.0) | 0.5 (-0.1) | 154.3 (-1.8) | 0.6 (+0.1) | 0.4 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.1) | 0.1 (+0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 72.3 ✓ (+0.4) | 0.528 (-0.1) | 0.056 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.472 (-0.1) | 43% (12% drawn) | 0.67 | 53%/53% |
| on, spots as the table | 51.7 ↓ (+0.6) | 3.7 ↓ (-0.3) | 16.1 (+0.7) | 3.0 (+0.2) | 2.3 ↓ (+0.5) | 3.4 ↓ (-0.3) | 6.8 ↓ (+0.5) | 2.0 ↓ (+0.3) | 0.2 (+0.0) | 5.3 (-0.2) | 0.4 (-0.1) | 3.0 (-0.0) | 11.4 (+0.3) | 1.2 (+0.2) | 0.1 (-0.1) | 0.9 (+0.0) | 0.0 (-0.1) | 0.4 (-0.2) | 172.3 (+16.2) | 0.6 (+0.1) | 0.6 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.0) | 0.3 (+0.3) | 0.3 (-0.1) | 0.1 (+0.1) | 73.2 ✓ (+1.2) | 0.750 (+0.1) | 0.097 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.653 (+0.0) | 33% (15% drawn) | 0.68 | 53%/53% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | Shape spread % | Shape forward pod % | Shape edge shift % | Shape back door % | Shape formed % | Formed pod % | Formed edge % | Formed back door % | Shape short m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 73 | 15 | 1.1 | 6 | 0 | 5 | 5 | 41 | 43 | 66 | 24 | 10 | 27 | 5.5 | — | — | — | — | — | — | — | — | — |
| on | 0.39 (+0.1) | 83 (+10.0) | 20 (+5.0) | 1.2 (+0.2) | 16 (+9.2*) | 0 (+0.0) | 3 (-1.9) | 7 (+2.6) | 34 (-6.8) | 40 (-3.2) | 64 (-1.3) | 27 (+3.0) | 8 (-1.7) | 27 (-0.5) | 5.6 (+0.1) | 30 | 32 | 17 | 21 | 93 | 97 | 82 | 96 | 0.3 |
| on, spots as the table | 0.32 (+0.1) | 78 (+5.0) | 17 (+1.7) | 1.0 (-0.0) | 17 (+10.3*) | 0 (+0.0) | 5 (+0.1) | 13 (+7.7*) | 30 (-11.1) | 36 (-7.1) | 68 (+2.2) | 23 (-1.3) | 9 (-0.9) | 28 (+0.6) | 5.5 (+0.0) | 26 | 34 | 20 | 21 | 31 | 41 | 3 | 42 | 2.7 |

_Tries 1.7 and last tackles 9.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_39 cells in 755 s._
