# Balance: ordinary five-eighth kicks on v off standard

The unchanged 13-scenario standard suite for #650, comparing the ordinary last-tackle five-eighth option at default against the same engine with secondKicker.on = 0. The open #757 wing-bomb head 5abd646d is the parent.

**commit** 79417a38 · **branch** HEAD · **started** 2026-11-21T21:59:37.269Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## Full standard outcome checks

All 26 standard cells completed. Each variant ran 1,340 simulations, including the late-legs stretch and the two orientations of each tracked fixture. Counts and territory use the written orientation, as in the harness. The table reads off → on. A star uses the harness two-standard-error rule. [Preregistration](preregistration.md) · [Kicker participation](participation.md)

Passive observation reproduced every gameplay summary field in all 26 clean standard cells.
The disabled variant reproduced all reported gameplay metrics of the revised #757 default in 13 of the 13 rows. [Published #757 reference](https://github.com/ch-leon/nrl-sim/blob/9e0b4b0f95a42e4c2990fcfda1ed196375dbf339/runs/20261120-203708-ordinary-wing-bombs-on-v-off-standard-close-range/report.md)

| Fixture | Kicks | Tries | Completion % | Second-last kicks | Set start m to go | Final kick % | Final run % | Final pass % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | 5.80 → 5.15 | 1.80 → 2.20 | 73.2 → 70.5 | 0.30 → 0.20 | 55.6 → 54.0 | 63.6 → 59.2 | 22.5 → 23.7 | 13.9 → 17.2 |
| stamina 30 v 80 | 4.85 → 5.75 | 2.00 → 1.55 | 72.6 → 69.4 | 0.15 → 0.35 | 54.0 → 53.7 | 53.1 → 63.6* | 25.1 → 20.8 | 21.8 → 15.6 |
| slide v rush | 6.05 → 6.15 | 1.45 → 2.05 | 72.4 → 71.9 | 0.05 → 0.25 | 56.3 → 56.3 | 69.1 → 69.0 | 20.2 → 18.1 | 10.7 → 12.9 |
| expansive v grind | 5.75 → 5.30 | 1.20 → 1.55 | 76.7 → 75.8 | 0.60 → 0.55 | 55.7 → 54.4 | 56.4 → 55.1 | 27.7 → 25.8 | 16.0 → 19.1 |
| grind v balanced | 6.09 → 6.28 | 1.54 → 1.49 | 74.2 → 77.6* | 0.58 → 0.59 | 55.9 → 55.5 | 64.6 → 64.6 | 23.5 → 23.4 | 11.9 → 12.0 |
| expansive v balanced | 4.97 → 5.45* | 1.65 → 1.56 | 74.3 → 73.7 | 0.17 → 0.22 | 55.7 → 55.2 | 54.5 → 59.0 | 27.0 → 25.3 | 18.4 → 15.7 |
| kick-chase v balanced | 6.05 → 6.28 | 1.57 → 1.64 | 72.8 → 74.3 | 0.59 → 0.61 | 55.1 → 54.6 | 66.9 → 68.5 | 20.5 → 20.4 | 12.5 → 11.2 |
| all-out v balanced | 5.08 → 4.99 | 1.77 → 1.97 | 72.9 → 72.7 | 0.23 → 0.23 | 54.6 → 53.8 | 57.6 → 56.4 | 21.4 → 24.3 | 21.0 → 19.3 |
| rush v slide | 5.67 → 5.31 | 1.86 → 1.70 | 73.9 → 74.3 | 0.35 → 0.28 | 54.2 → 54.7 | 63.4 → 60.1 | 23.5 → 24.4 | 13.1 → 15.5 |
| compressed v slide | 5.75 → 5.71 | 1.58 → 1.58 | 72.8 → 74.6 | 0.33 → 0.33 | 54.9 → 54.9 | 62.9 → 64.1 | 20.6 → 20.9 | 16.5 → 15.0 |
| 70 v 50 | 5.30 → 5.65 | 1.65 → 2.20 | 72.4 → 75.9 | 0.25 → 0.50 | 53.8 → 52.9 | 60.1 → 63.5 | 23.8 → 22.8 | 16.1 → 13.8 |
| fliers v stayers | 5.15 → 5.30 | 2.70 → 2.75 | 77.5 → 73.4 | 0.45 → 0.35 | 55.7 → 55.7 | 56.9 → 62.0 | 27.5 → 21.5 | 15.6 → 16.6 |
| last 6 min on late legs | 6.21 → 5.67 | 1.50 → 1.62 | 71.2 → 70.5 | 0.42 → 0.33 | 55.4 → 53.3 | 62.7 → 58.8 | 22.2 → 22.2 | 15.1 → 19.0 |

### Preset results

Preset fixtures use 200 matches per row across both orientations. The historical standard yardstick is 45–55%. #465 ratified a 42–58% flat preset points-share range. Points share awards draws half credit. Deltas are in percentage points.

| Fixture | Outright win % off → on | Draw % off → on | Points share % off → on | Points-share change (pp) |
|---|---:|---:|---:|---:|
| grind v balanced | 46.5% → 37.0% | 16.0% → 23.5% | 54.50% → 48.75% | -5.75 ± 8.96 (2 SE) |
| expansive v balanced | 41.0% → 37.5% | 20.0% → 23.5% | 51.00% → 49.25% | -1.75 ± 8.87 (2 SE) |
| kick-chase v balanced | 36.5% → 36.5% | 17.5% → 20.5% | 45.25% → 46.75% | +1.50 ± 8.99 (2 SE) |
| all-out v balanced | 37.5% → 45.0% | 21.0% → 18.5% | 48.00% → 54.25% | +6.25 ± 8.96 (2 SE) |
| rush v slide | 31.5% → 41.0% | 18.0% → 17.5% | 40.50% → 49.75% | +9.25* ± 8.99 (2 SE) |
| compressed v slide | 39.0% → 41.5% | 21.0% → 19.5% | 49.50% → 51.25% | +1.75 ± 8.95 (2 SE) |

### §7 band crossings

The count bands were calibrated for 14-minute matches. Standard full matches here run five minutes. The six-minute late-legs stretch is scaled to five minutes.

| Fixture | Metric | Off → on | Off → on band |
|---|---|---:|---|
| stamina 30 v 80 | completion | 72.629 → 69.364 | inside → below |
| stamina 30 v 80 | grubberRepeats | 0.050 → 0.000 | inside → below |
| 70 v 50 | grubberRepeats | 0.000 → 0.100 | below → inside |
| fliers v stayers | grubberTries | 0.200 → 0.100 | inside → below |

[Separate Rush v Slide confirmation on seeds 1001–1200](../20261121-220711-ordinary-five-eighth-kicks-held-out-rush-confirmation/report.md)

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 6.0 ↓ | 16.4 | 0.3 | 3.0 ↓ | 3.9 ↓ | 5.2 ↓ | 2.2 ↓ | 0.3 | 7.7 | 0.5 | 0.3 | 25.0 | 0.0 | 0.1 | 1.6 | 0.1 | 0.9 | 0.1 | 0.5 | 131.5 | 0.6 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.1 | 70.5 ✓ | 0.650 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.600 | 65% (15% drawn) | 0.71 | 93%/93% |
| five-eighth option off | 52.6 ↓ (+0.5) | 5.2 ↓ (-0.8) | 14.7 (-1.7) | 0.3 (+0.0) | 2.8 ↓ (-0.3) | 3.5 ↓ (-0.4) | 5.8 ↓ (+0.6) | 1.8 ↓ (-0.4) | 0.1 (-0.1) | 5.8 (-1.9*) | 0.3 (-0.1) | 0.1 (-0.1) | 15.0 (-10.0) | 0.0 (+0.0) | 0.0 (-0.1) | 1.1 (-0.5) | 0.0 (-0.1) | 1.0 (+0.1) | 0.1 (+0.0) | 0.4 (-0.1) | 156.8 (+25.3) | 0.6 (+0.0) | 0.8 (+0.4) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.1) | 0.0 (-0.1) | 73.2 ✓ (+2.7) | 0.450 (-0.2) | 0.150 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.300 (-0.3) | 50% (20% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.45 | 85 | 20 | 1.3 | 11 | 0 | 9 | 5 | 45 | 30 | 59 | 24 | 17 | 28 | 5.5 | 0.20 | 54.0 |
| five-eighth option off | 0.25 (-0.2) | 75 (-10.0) | 5 (-15.0) | 0.9 (-0.3) | 11 (-0.3) | 0 (+0.0) | 6 (-3.5) | 3 (-1.8) | 44 (-1.0) | 36 (+6.6) | 64 (+4.4) | 23 (-1.1) | 14 (-3.3) | 27 (-0.8) | 5.3 (-0.3) | 0.30 (+0.1) | 55.6 (+1.6) |

_Tries 2.2 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 6.1 ↓ | 17.2 | 0.3 | 2.5 ↓ | 4.3 ↓ | 5.8 ↓ | 1.6 ↓ | 0.1 | 7.2 | 0.3 | 0.3 | 35.0 | 0.0 | 0.1 | 1.0 | 0.1 | 1.0 | 0.1 | 0.6 | 147.0 | 0.4 | 0.4 | 0.1 | 0.1 | 0.0 | 0.0 | 0.7 | 0.1 | 69.4 ↓ | 0.650 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.550 | 35% (45% drawn) | 0.70 | 92%/93% |
| five-eighth option off | 52.9 ↓ (+1.6) | 5.7 ↓ (-0.4) | 16.9 (-0.3) | 0.1 (-0.3*) | 2.4 ↓ (-0.1) | 3.8 ↓ (-0.6) | 4.8 ↓ (-0.9) | 2.0 ↓ (+0.4) | 0.1 (+0.0) | 8.3 (+1.2) | 0.6 (+0.3) | 0.2 (-0.1) | 20.0 (-15.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (+0.1) | 0.6 (-0.4) | 0.0 (-0.1) | 0.4 (-0.2) | 124.3 (-22.7) | 0.5 (+0.1) | 0.8 (+0.4*) | 0.0 (-0.1) | 0.1 (+0.0) | 0.1 (+0.1) | 0.2 (+0.2) | 0.3 (-0.3) | 0.1 (+0.0) | 72.6 ✓ (+3.3) | 0.550 (-0.1) | 0.100 ↓ (+0.0) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.400 (-0.2) | 35% (10% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.35 | 95 | 15 | 0.9 | 3 | 0 | 13 | 10 | 39 | 35 | 64 | 21 | 16 | 27 | 5.5 | 0.35 | 53.7 |
| five-eighth option off | 0.40 (+0.1) | 80 (-15.0) | 25 (+10.0) | 1.4 (+0.4) | 8 (+4.3) | 0 (+0.0) | 3 (-10.4) | 15 (+5.3) | 40 (+1.3) | 35 (-0.5) | 53 (-10.5*) | 25 (+4.3) | 22 (+6.2) | 26 (-0.8) | 5.4 (-0.0) | 0.15 (-0.2) | 54.0 (+0.3) |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.4 ↓ | 4.9 ↓ | 22.6 | 0.3 | 2.6 ↓ | 4.0 ↓ | 6.2 ↓ | 2.0 ↓ | 0.1 | 8.6 | 0.9 | 0.3 | 25.0 | 0.0 | 0.2 | 1.3 | 0.0 | 0.8 | 0.0 | 0.4 | 156.0 | 0.9 | 0.6 | 0.0 | 0.1 | 0.1 | 0.5 | 0.6 | 0.3 | 71.9 ✓ | 0.400 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 50% (15% drawn) | 0.69 | 93%/93% |
| five-eighth option off | 52.2 ↓ (+0.9) | 5.3 ↓ (+0.3) | 21.6 (-1.0) | 0.3 (+0.0) | 2.9 ↓ (+0.2) | 3.7 ↓ (-0.3) | 6.0 ↓ (-0.1) | 1.4 ↓ (-0.6) | 0.1 (+0.0) | 8.8 (+0.3) | 1.1 (+0.2) | 0.1 (-0.1) | 15.0 (-10.0) | 0.0 (+0.0) | 0.1 (-0.1) | 0.6 (-0.7*) | 0.1 (+0.1) | 0.6 (-0.3) | 0.0 (+0.0) | 0.3 (-0.1) | 156.8 (+0.8) | 0.9 (-0.0) | 0.8 (+0.2) | 0.2 (+0.2) | 0.0 (-0.1) | 0.0 (-0.1) | 0.0 (-0.5) | 0.5 (-0.1) | 0.2 (-0.0) | 72.4 ✓ (+0.4) | 0.200 (-0.2) | 0.000 ↓ (-0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.200 (-0.1) | 65% (10% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 85 | 10 | 0.6 | 12 | 0 | 0 | 2 | 34 | 51 | 69 | 18 | 13 | 26 | 5.3 | 0.25 | 56.3 |
| five-eighth option off | 0.20 (+0.0) | 95 (+10.0) | 10 (+0.0) | 0.2 (-0.4) | 14 (+1.6) | 0 (+0.0) | 3 (+3.4) | 10 (+7.9) | 31 (-3.1) | 41 (-9.8) | 69 (+0.1) | 20 (+2.1) | 11 (-2.2) | 32 (+6.0*) | 5.3 (-0.0) | 0.05 (-0.2) | 56.3 (-0.0) |

_Tries 2.0 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.8 ↓ | 5.0 ↓ | 14.6 | 0.2 | 2.5 ↓ | 3.5 ↓ | 5.3 ↓ | 1.6 ↓ | 0.1 | 7.8 | 0.5 | 0.3 | 25.0 | 0.0 | 0.1 | 0.8 | 0.3 | 0.7 | 0.1 | 0.6 | 131.9 | 0.7 | 1.1 | 0.0 | 0.1 | 0.2 | 0.0 | 0.8 | 0.1 | 75.8 ✓ | 0.400 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 35% (35% drawn) | 0.69 | 93%/93% |
| five-eighth option off | 57.0 ↓ (+1.2) | 5.2 ↓ (+0.2) | 16.7 (+2.1) | 0.1 (-0.1) | 2.6 ↓ (+0.2) | 3.1 ↓ (-0.4) | 5.8 ↓ (+0.5) | 1.2 ↓ (-0.4) | 0.1 (+0.0) | 8.0 (+0.3) | 0.5 (+0.0) | 0.3 (-0.1) | 20.0 (-5.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.7 (-0.2) | 0.1 (-0.1) | 0.9 (+0.3) | 0.1 (+0.1) | 0.6 (+0.0) | 147.0 (+15.1) | 0.6 (-0.1) | 0.8 (-0.3) | 0.0 (+0.0) | 0.1 (+0.1) | 0.4 (+0.2) | -0.1 (-0.1) | 0.8 (-0.1) | 0.1 (+0.0) | 76.7 ✓ (+0.9) | 0.550 (+0.2) | 0.050 ↓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.500 (+0.1) | 40% (30% drawn) | 0.70 | 92%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 90 | 0 | 0.7 | 10 | 0 | 10 | 3 | 48 | 29 | 55 | 26 | 19 | 25 | 6.0 | 0.55 | 54.4 |
| five-eighth option off | 0.10 (-0.0) | 75 (-15.0) | 20 (+20.0*) | 0.6 (-0.1) | 8 (-1.3) | 0 (+0.0) | 4 (-5.5) | 4 (+0.9) | 46 (-2.6) | 38 (+8.5) | 56 (+1.3) | 28 (+1.8) | 16 (-3.1) | 26 (+1.2) | 5.8 (-0.2) | 0.60 (+0.0) | 55.7 (+1.3) |

_Tries 1.6 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.0 ↓ | 5.0 ↓ | 15.9 | 0.3 | 2.3 ↓ | 3.1 ↓ | 6.3 ↓ | 1.5 ↓ | 0.1 | 7.9 | 0.7 | 0.3 | 22.0 | 0.0 | 0.1 | 0.9 | 0.2 | 0.9 | 0.1 | 0.5 | 159.6 | 0.5 | 0.9 | 0.0 | 0.0 | 0.1 | 0.0 | 0.4 | 0.1 | 77.6 ✓ | 0.540 | 0.070 ↓ | 0.020 ↓ | 0.000 ✓ | 0.450 | 39% (23% drawn) | 37.0% (23.5% drawn) | 0.71 | 92%/92% |
| five-eighth option off | 53.9 ↓ (-0.1) | 5.0 ↓ (-0.0) | 16.0 (+0.1) | 0.5 (+0.1) | 2.4 ↓ (+0.1) | 3.4 ↓ (+0.4) | 6.1 ↓ (-0.2) | 1.5 ↓ (+0.1) | 0.2 (+0.1) | 7.3 (-0.5) | 0.6 (-0.1) | 0.2 (-0.0) | 20.0 (-2.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.1) | 0.1 (-0.0) | 0.8 (-0.1) | 0.0 (-0.0) | 0.6 (+0.1) | 157.8 (-1.8) | 0.5 (-0.1) | 0.9 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (+0.1) | 0.6 (+0.2) | 0.1 (+0.0) | 74.2 ✓ (-3.4*) | 0.650 (+0.1) | 0.080 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.570 (+0.1) | 52% (13% drawn) | 46.5% (16.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 85 | 23 | 0.8 | 12 | 0 | 5 | 6 | 35 | 42 | 65 | 23 | 12 | 27 | 5.4 | 0.59 | 55.5 |
| five-eighth option off | 0.33 (+0.1) | 92 (+7.0) | 20 (-3.0) | 0.8 (+0.1) | 10 (-1.7) | 0 (+0.0) | 3 (-2.1) | 3 (-2.8) | 35 (+0.2) | 48 (+6.4) | 65 (-0.0) | 24 (+0.1) | 12 (-0.1) | 28 (+1.1) | 5.4 (+0.0) | 0.58 (-0.0) | 55.9 (+0.4) |

_Tries 1.5 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.5 ↓ | 5.4 ↓ | 16.4 | 0.3 | 2.5 ↓ | 3.6 ↓ | 5.5 ↓ | 1.6 ↓ | 0.2 | 7.4 | 0.7 | 0.4 | 32.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.8 | 0.1 | 0.5 | 130.3 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.6 | 0.1 | 73.7 ✓ | 0.530 | 0.080 ↓ | 0.020 ↓ | 0.000 ✓ | 0.430 | 42% (24% drawn) | 37.5% (23.5% drawn) | 0.70 | 93%/93% |
| five-eighth option off | 53.6 ↓ (+0.1) | 5.1 ↓ (-0.3) | 16.4 (-0.0) | 0.3 (-0.1) | 2.6 ↓ (+0.1) | 3.3 ↓ (-0.3) | 5.0 ↓ (-0.5*) | 1.6 ↓ (+0.1) | 0.2 (+0.0) | 7.0 (-0.4) | 0.7 (+0.0) | 0.3 (-0.1) | 25.0 (-7.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.7 (-0.1) | 0.1 (+0.0) | 0.4 (-0.1) | 124.3 (-6.1) | 0.7 (+0.2*) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.3 (-0.0) | 0.5 (-0.1) | 0.1 (-0.0) | 74.3 ✓ (+0.6) | 0.420 (-0.1) | 0.090 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.330 (-0.1) | 48% (21% drawn) | 41.0% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 87 | 17 | 0.6 | 11 | 0 | 3 | 4 | 36 | 46 | 59 | 25 | 16 | 27 | 5.7 | 0.22 | 55.2 |
| five-eighth option off | 0.30 (+0.1) | 83 (-4.0) | 25 (+8.0) | 0.7 (+0.2) | 16 (+4.9) | 0 (+0.0) | 6 (+2.9) | 6 (+1.6) | 32 (-3.8) | 40 (-5.5) | 55 (-4.5) | 27 (+1.7) | 18 (+2.8) | 25 (-1.4) | 5.7 (+0.0) | 0.17 (-0.0) | 55.7 (+0.5) |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 5.0 ↓ | 15.2 | 0.3 | 2.2 ↓ | 3.7 ↓ | 6.3 ↓ | 1.6 ↓ | 0.2 | 6.4 | 0.5 | 0.2 | 20.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.5 | 0.1 | 0.6 | 150.6 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.1 | 0.5 | 0.0 | 74.3 ✓ | 0.670 | 0.110 ↓ | 0.020 ↓ | 0.000 ✓ | 0.540 | 38% (19% drawn) | 36.5% (20.5% drawn) | 0.70 | 93%/93% |
| five-eighth option off | 51.2 ↓ (-0.4) | 5.4 ↓ (+0.4) | 16.1 (+1.0) | 0.2 (-0.0) | 2.3 ↓ (+0.1) | 3.6 ↓ (-0.1) | 6.0 ↓ (-0.2) | 1.6 ↓ (-0.1) | 0.1 (-0.0) | 7.1 (+0.7*) | 0.7 (+0.2) | 0.3 (+0.1) | 28.0 (+8.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.8 (-0.1) | 0.1 (-0.0) | 0.4 (-0.1) | 0.1 (-0.0) | 0.6 (-0.0) | 142.0 (-8.6) | 0.5 (+0.0) | 0.8 (+0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (-0.1) | 0.1 (-0.0) | 0.5 (-0.0) | 0.1 (+0.0) | 72.8 ✓ (-1.5) | 0.700 (+0.0) | 0.030 ↓ (-0.1*) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.660 (+0.1) | 37% (18% drawn) | 36.5% (17.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.19 | 82 | 14 | 0.7 | 13 | 0 | 7 | 7 | 33 | 40 | 68 | 20 | 11 | 27 | 5.4 | 0.61 | 54.6 |
| five-eighth option off | 0.18 (-0.0) | 81 (-1.0) | 13 (-1.0) | 0.4 (-0.3) | 12 (-0.7) | 0 (+0.0) | 4 (-2.9) | 5 (-1.6) | 37 (+4.0) | 41 (+1.2) | 67 (-1.5) | 21 (+0.2) | 13 (+1.4) | 27 (-0.4) | 5.5 (+0.1) | 0.59 (-0.0) | 55.1 (+0.6) |

_Tries 1.6 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 6.1 ↓ | 17.7 | 0.2 | 3.2 ↓ | 3.6 ↓ | 5.0 ↓ | 2.0 ↓ | 0.2 | 7.3 | 0.7 | 0.3 | 27.0 | 0.0 | 0.1 | 1.3 | 0.1 | 0.7 | 0.0 | 0.3 | 124.2 | 0.6 | 0.6 | 0.0 | 0.1 | 0.2 | 0.4 | 0.4 | 0.1 | 72.7 ✓ | 0.430 | 0.090 ↓ | 0.040 ↓ | 0.000 ✓ | 0.300 | 50% (11% drawn) | 45.0% (18.5% drawn) | 0.71 | 93%/93% |
| five-eighth option off | 50.9 ↓ (-0.6) | 5.9 ↓ (-0.2) | 18.3 (+0.6) | 0.3 (+0.1) | 3.4 ↓ (+0.3) | 3.6 ↓ (-0.0) | 5.1 ↓ (+0.1) | 1.8 ↓ (-0.2) | 0.2 (-0.0) | 7.2 (-0.0) | 0.9 (+0.2*) | 0.3 (+0.0) | 27.0 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (-0.3) | 0.0 (-0.1*) | 0.5 (-0.2) | 0.0 (+0.0) | 0.4 (+0.1) | 122.2 (-2.0) | 0.5 (-0.0) | 0.6 (+0.1) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.1 (-0.3) | 0.4 (+0.1) | 0.1 (-0.0) | 72.9 ✓ (+0.2) | 0.460 (+0.0) | 0.080 ↓ (-0.0) | 0.020 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.360 (+0.1) | 42% (21% drawn) | 37.5% (21.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 79 | 17 | 1.1 | 10 | 0 | 9 | 5 | 36 | 40 | 56 | 24 | 19 | 26 | 5.5 | 0.23 | 53.8 |
| five-eighth option off | 0.08 (-0.2*) | 81 (+2.0) | 16 (-1.0) | 0.3 (-0.8*) | 11 (+0.6) | 0 (+0.0) | 9 (-0.1) | 5 (+0.0) | 41 (+4.6) | 34 (-5.1) | 58 (+1.2) | 21 (-2.9) | 21 (+1.7) | 27 (+0.4) | 5.5 (-0.0) | 0.23 (+0.0) | 54.6 (+0.8) |

_Tries 2.0 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.6 ↓ | 4.7 ↓ | 21.1 | 0.3 | 2.8 ↓ | 3.5 ↓ | 5.3 ↓ | 1.7 ↓ | 0.1 | 8.8 | 0.9 | 0.3 | 23.0 | 0.0 | 0.1 | 1.0 | 0.2 | 0.7 | 0.0 | 0.4 | 130.6 | 0.9 | 0.8 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.3 ✓ | 0.460 | 0.110 ↓ | 0.010 ↓ | 0.000 ✓ | 0.340 | 43% (20% drawn) | 41.0% (17.5% drawn) | 0.69 | 93%/93% |
| five-eighth option off | 52.2 ↓ (-0.4) | 5.0 ↓ (+0.3) | 22.7 (+1.6*) | 0.1 (-0.2*) | 2.5 ↓ (-0.2) | 3.7 ↓ (+0.2) | 5.7 ↓ (+0.4) | 1.9 ↓ (+0.2) | 0.1 (+0.0) | 9.3 (+0.5) | 1.0 (+0.1) | 0.2 (-0.0) | 22.0 (-1.0) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (-0.0) | 0.1 (-0.1) | 0.7 (-0.0) | 0.1 (+0.0) | 0.5 (+0.0) | 139.1 (+8.6) | 0.8 (-0.0) | 0.7 (-0.2) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.1) | 0.5 (+0.3) | 0.5 (+0.1) | 0.1 (-0.0) | 73.9 ✓ (-0.4) | 0.630 (+0.2) | 0.110 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.520 (+0.2*) | 35% (20% drawn) | 31.5% (18.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.18 | 83 | 10 | 0.7 | 15 | 0 | 2 | 5 | 33 | 45 | 60 | 24 | 15 | 27 | 5.5 | 0.28 | 54.7 |
| five-eighth option off | 0.25 (+0.1) | 81 (-2.0) | 12 (+2.0) | 0.8 (+0.1) | 14 (-0.7) | 0 (+0.0) | 4 (+1.9) | 10 (+4.4) | 37 (+3.6) | 35 (-9.2) | 63 (+3.3) | 23 (-1.0) | 13 (-2.3) | 27 (-0.2) | 5.4 (-0.0) | 0.35 (+0.1) | 54.2 (-0.5) |

_Tries 1.7 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.9 ↓ | 5.6 ↓ | 16.9 | 0.3 | 2.8 ↓ | 3.4 ↓ | 5.7 ↓ | 1.6 ↓ | 0.1 | 6.8 | 0.6 | 0.4 | 31.0 | 0.0 | 0.1 | 0.8 | 0.2 | 0.7 | 0.0 | 0.4 | 140.8 | 0.6 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.1 | 74.6 ✓ | 0.500 | 0.110 ↓ | 0.020 ↓ | 0.000 ✓ | 0.370 | 38% (22% drawn) | 41.5% (19.5% drawn) | 0.70 | 93%/93% |
| five-eighth option off | 52.4 ↓ (+0.5) | 5.3 ↓ (-0.3) | 16.0 (-0.8) | 0.3 (-0.1) | 2.4 ↓ (-0.4) | 3.6 ↓ (+0.2) | 5.8 ↓ (+0.0) | 1.6 ↓ (+0.0) | 0.2 (+0.1) | 7.7 (+0.8*) | 0.6 (-0.0) | 0.3 (-0.1) | 21.0 (-10.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.1) | 0.1 (-0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.4 (+0.0) | 145.9 (+5.1) | 0.5 (-0.1) | 0.7 (+0.1) | 0.0 (-0.0) | 0.0 (-0.0) | 0.1 (-0.1) | 0.1 (-0.3) | 0.5 (+0.1) | 0.1 (-0.0) | 72.8 ✓ (-1.8) | 0.550 (+0.1) | 0.100 ↓ (-0.0) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.440 (+0.1) | 39% (20% drawn) | 39.0% (21.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 86 | 14 | 0.4 | 15 | 0 | 3 | 4 | 35 | 42 | 64 | 21 | 15 | 27 | 5.5 | 0.33 | 54.9 |
| five-eighth option off | 0.25 (+0.0) | 89 (+3.0) | 19 (+5.0) | 0.6 (+0.2) | 10 (-5.1) | 0 (+0.0) | 3 (+0.0) | 6 (+1.9) | 40 (+5.1) | 41 (-1.9) | 63 (-1.2) | 21 (-0.3) | 17 (+1.5) | 26 (-1.0) | 5.6 (+0.0) | 0.33 (+0.0) | 54.9 (-0.0) |

_Tries 1.6 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.8 ↓ | 5.9 ↓ | 17.6 | 0.8 | 2.6 ↓ | 3.1 ↓ | 5.7 ↓ | 2.2 ↓ | 0.1 | 6.8 | 0.6 | 0.3 | 20.0 | 0.0 | 0.0 | 1.3 | 0.1 | 0.7 | 0.1 | 0.4 | 118.2 | 0.8 | 0.7 | 0.0 | 0.1 | 0.2 | 0.1 | 0.6 | 0.0 | 75.9 ✓ | 0.850 | 0.150 ↓ | 0.100 ✓ | 0.000 ✓ | 0.600 | 55% (10% drawn) | 0.71 | 93%/93% |
| five-eighth option off | 52.4 ↓ (+0.6) | 5.4 ↓ (-0.5) | 16.1 (-1.5) | 0.4 (-0.4) | 2.6 ↓ (+0.0) | 3.9 ↓ (+0.8) | 5.3 ↓ (-0.4) | 1.6 ↓ (-0.6) | 0.1 (-0.1) | 7.7 (+0.9) | 0.5 (-0.1) | 0.4 (+0.2) | 35.0 (+15.0) | 0.0 (+0.0) | 0.1 (+0.1) | 0.8 (-0.6*) | 0.0 (-0.1) | 0.7 (+0.0) | 0.0 (-0.1) | 0.6 (+0.2) | 113.7 (-4.5) | 0.7 (-0.1) | 0.9 (+0.3) | 0.1 (+0.1) | 0.1 (+0.0) | 0.3 (+0.1) | -0.2 (-0.3) | 0.5 (-0.1) | 0.1 (+0.1) | 72.4 ✓ (-3.5) | 0.400 (-0.4) | 0.050 ↓ (-0.1) | 0.000 ↓ (-0.1) | 0.000 ✓ (+0.0) | 0.350 (-0.3) | 55% (15% drawn) | 0.73 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.50 | 85 | 25 | 1.8 | 18 | 0 | 2 | 7 | 30 | 43 | 63 | 23 | 14 | 25 | 5.4 | 0.50 | 52.9 |
| five-eighth option off | 0.30 (-0.2) | 90 (+5.0) | 20 (-5.0) | 1.1 (-0.7) | 18 (+0.0) | 0 (+0.0) | 0 (-2.3) | 12 (+5.3) | 33 (+3.8) | 36 (-6.8) | 60 (-3.4) | 24 (+1.1) | 16 (+2.3) | 28 (+3.2) | 5.5 (+0.0) | 0.25 (-0.3) | 53.8 (+0.9) |

_Tries 2.2 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.4 ↓ | 9.3 ↓ | 18.1 | 0.1 | 1.9 ↓ | 3.5 ↓ | 5.3 ↓ | 2.8 ↓ | 0.5 | 6.6 | 1.1 | 0.4 | 35.0 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.5 | 135.0 | 0.7 | 0.6 | 0.0 | 0.1 | 0.0 | 0.3 | 0.6 | 0.1 | 73.4 ✓ | 0.600 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 55% (10% drawn) | 0.70 | 92%/93% |
| five-eighth option off | 50.8 ↓ (+0.4) | 8.8 ↓ (-0.5) | 18.9 (+0.7) | 0.1 (+0.0) | 2.1 ↓ (+0.2) | 3.0 ↓ (-0.4) | 5.2 ↓ (-0.1) | 2.7 ↓ (-0.0) | 0.3 (-0.2) | 6.9 (+0.3) | 1.2 (+0.1) | 0.6 (+0.2) | 50.0 (+15.0) | 0.0 (+0.0) | 0.0 (-0.1) | 1.6 (+0.4) | 0.1 (-0.1) | 0.5 (-0.1) | 0.1 (+0.1) | 0.1 (-0.3) | 118.5 (-16.5) | 0.8 (+0.1) | 0.8 (+0.3) | 0.0 (+0.0) | 0.0 (-0.1) | 0.0 (-0.0) | 0.0 (-0.3) | 0.5 (-0.1) | 0.0 (-0.1) | 77.5 ✓ (+4.1) | 0.850 (+0.3) | 0.200 ✓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.650 (+0.2) | 80% | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.50 | 80 | 30 | 1.0 | 4 | 0 | 4 | 16 | 33 | 44 | 62 | 21 | 17 | 26 | 5.5 | 0.35 | 55.7 |
| five-eighth option off | 0.40 (-0.1) | 80 (+0.0) | 15 (-15.0) | 1.8 (+0.8) | 15 (+11.2*) | 0 (+0.0) | 0 (-3.6) | 7 (-9.0) | 24 (-8.7) | 54 (+10.1) | 57 (-5.1) | 28 (+6.1) | 16 (-1.0) | 28 (+2.0) | 5.3 (-0.1) | 0.45 (+0.1) | 55.7 (+0.0) |

_Tries 2.8 and last tackles 8.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.6 ↓ | 3.9 ↓ | 16.7 | 3.5 | 2.1 ↓ | 3.8 ↓ | 5.7 ↓ | 1.6 ↓ | 0.1 | 5.8 | 0.3 | 0.3 | 30.0 | 4.0 | 10.5 | 1.0 | 0.1 | 0.8 | 0.0 | 0.4 | 150.3 | 0.6 | 0.3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.4 | 0.1 | 70.5 ✓ | 0.583 | 0.042 ↓ | 0.042 ↓ | 0.000 ✓ | 0.500 | 60% (5% drawn) | 0.68 | 54%/54% |
| five-eighth option off | 50.9 ↓ (-0.7) | 3.3 ↓ (-0.6) | 16.3 (-0.4) | 3.3 (-0.1) | 1.3 ↓ (-0.7) | 3.7 ↓ (-0.1) | 6.2 ↓ (+0.5) | 1.5 ↓ (-0.1) | 0.1 (-0.0) | 5.0 (-0.8) | 0.4 (+0.0) | 0.3 (+0.0) | 30.0 (+0.0) | 4.0 (+0.0) | 10.6 (+0.1) | 0.6 (-0.3) | 0.2 (+0.0) | 0.8 (-0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 160.4 (+10.1) | 0.3 (-0.3) | 0.3 (+0.0) | 0.0 (-0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.3 (-0.1) | 0.1 (+0.0) | 71.2 ✓ (+0.7) | 0.458 (-0.1) | 0.042 ↓ (+0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.417 (-0.1) | 35% (20% drawn) | 0.69 | 52%/52% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 75 | 20 | 1.1 | 3 | 0 | 5 | 8 | 46 | 38 | 59 | 22 | 19 | 28 | 5.8 | 0.33 | 53.3 |
| five-eighth option off | 0.25 (+0.0) | 90 (+15.0) | 30 (+10.0) | 0.6 (-0.5) | 14 (+11.3) | 0 (+0.0) | 0 (-5.1) | 3 (-4.9) | 25 (-21.2) | 58 (+19.9) | 63 (+3.8) | 22 (+0.1) | 15 (-3.9) | 26 (-1.5) | 5.8 (-0.0) | 0.42 (+0.1) | 55.4 (+2.2) |

_Tries 1.6 and last tackles 9.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_26 cells in 809 s._
