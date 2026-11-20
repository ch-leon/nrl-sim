# Balance: ordinary wing bombs on v off standard

The unchanged 13-scenario standard suite, comparing ordinary wing bombs at the default against the same engine with wingBomb.on = 0. #650, based on the open #756 head.

**commit** fcb5f4e4 · **branch** HEAD · **started** 2026-11-20T20:31:30.865Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

[Ordinary bomb landing and chase geometry](geometry.md)

## Full standard outcome checks

All 26 standard cells completed, totaling 1,340 simulations per variant including the late-legs stretches. Each preset fixture uses 100 seeds in both orientations for the preset outcomes. Counts and territory use the written orientation. The table reads off → on and follows the harness’s two-standard-error star.

The disabled variant reproduced every reported metric in all 13 preceding #756 standard cells. [Preceding #756 report](../20261120-113829-ordinary-long-kick-space-on-v-off-standard/report.md)

| Fixture | Kicks | Bombs | Bombs won | Bombs spilled | Tries | Completion % | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|
| even 60 v 60 | 5.80 → 5.80 | 0.95 → 0.95 | 0.15 → 0.15 | 0.05 → 0.05 | 1.85 → 1.80 | 72.8 → 73.2 | 55.5 → 55.6 |
| stamina 30 v 80 | 4.85 → 4.85 | 0.70 → 0.70 | 0.05 → 0.05 | 0.05 → 0.05 | 2.00 → 2.00 | 72.6 → 72.6 | 54.0 → 54.0 |
| slide v rush | 6.05 → 6.05 | 1.60 → 1.55 | 0.20 → 0.20 | 0.35 → 0.30 | 1.60 → 1.45 | 72.6 → 72.4 | 56.3 → 56.3 |
| expansive v grind | 5.70 → 5.75 | 0.80 → 0.80 | 0.05 → 0.05 | 0.15 → 0.15 | 1.35 → 1.20 | 76.7 → 76.7 | 55.6 → 55.7 |
| grind v balanced | 6.04 → 6.11 | 0.92 → 0.92 | 0.04 → 0.04 | 0.16 → 0.16 | 1.52 → 1.52 | 74.2 → 74.2 | 55.9 → 56.0 |
| expansive v balanced | 5.00 → 4.97 | 0.92 → 0.87 | 0.11 → 0.10 | 0.15 → 0.14 | 1.69 → 1.65 | 74.3 → 74.3 | 55.7 → 55.7 |
| kick-chase v balanced | 6.06 → 6.07 | 1.45 → 1.46 | 0.13 → 0.13 | 0.22 → 0.22 | 1.56 → 1.58 | 72.7 → 72.7 | 55.2 → 55.1 |
| all-out v balanced | 5.10 → 5.08 | 0.95 → 0.95 | 0.09 → 0.09 | 0.13 → 0.13 | 1.82 → 1.79 | 73.2 → 72.8 | 54.5 → 54.5 |
| rush v slide | 5.69 → 5.67 | 1.05 → 1.05 | 0.14 → 0.14 | 0.10 → 0.10 | 1.89 → 1.86 | 74.2 → 73.9 | 54.3 → 54.2 |
| compressed v slide | 5.73 → 5.78 | 1.11 → 1.10 | 0.13 → 0.14 | 0.19 → 0.18 | 1.54 → 1.56 | 73.4 → 73.0 | 55.0 → 55.0 |
| 70 v 50 | 5.40 → 5.30 | 1.00 → 1.05 | 0.25 → 0.30 | 0.10 → 0.10 | 1.70 → 1.65 | 73.0 → 72.4 | 53.6 → 53.8 |
| fliers v stayers | 5.20 → 5.15 | 0.80 → 0.80 | 0.15 → 0.15 | 0.10 → 0.10 | 2.75 → 2.70 | 77.6 → 77.5 | 55.8 → 55.7 |
| last 6 min on late legs | 6.21 → 6.21 | 0.96 → 0.96 | 0.04 → 0.04 | 0.08 → 0.08 | 1.50 → 1.50 | 71.2 → 71.2 | 55.4 → 55.4 |

The harness counts bombs, regathers and spills from events. [First landing observations](geometry.md) track direct outcomes. Set start is the distance the team taking possession has to go at its first play-the-ball.

### Preset results

Points share gives a draw half credit. The standard plan’s historical preset yardstick is 45–55%. The #465 flat preset win-share range is 42–58%.

| Preset | Outright win % off → on | Draw % off → on | Points share % off → on | Points-share change (pp) |
|---|---:|---:|---:|---:|
| grind v balanced | 47.0 → 46.5 | 16.0 → 16.0 | 55.00 → 54.50 | -0.50 ± 4.57 SE |
| expansive v balanced | 41.5 → 41.0 | 20.5 → 20.0 | 51.75 → 51.00 | -0.75 ± 4.47 SE |
| kick-chase v balanced | 37.0 → 37.0 | 17.5 → 17.5 | 45.75 → 45.75 | +0.00 ± 4.53 SE |
| all-out v balanced | 38.0 → 37.5 | 19.5 → 21.0 | 47.75 → 48.00 | +0.25 ± 4.47 SE |
| rush v slide | 33.0 → 31.5 | 16.5 → 18.0 | 41.25 → 40.50 | -0.75 ± 4.47 SE |
| compressed v slide | 37.0 → 39.0 | 22.0 → 21.0 | 48.00 → 49.50 | +1.50 ± 4.44 SE |

### §7 band crossings

The count bands date to 14-minute matches. Standard full matches now run five minutes and the six-minute late-legs stretch is scaled to five.

| Fixture | Metric | Off → on | Off → on band |
|---|---|---:|---|
| even 60 v 60 | grubberTries | 0.200 → 0.150 | inside → below |

Elapsed run time includes a pause while the revised engine was measured.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.6 ↓ | 5.2 ↓ | 14.7 | 0.3 | 2.8 ↓ | 3.5 ↓ | 5.8 ↓ | 1.8 ↓ | 0.1 | 5.8 | 0.3 | 0.1 | 15.0 | 0.0 | 0.0 | 1.1 | 0.0 | 1.0 | 0.1 | 0.4 | 156.8 | 0.6 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.6 | 0.0 | 73.2 ✓ | 0.450 | 0.150 ↓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 50% (20% drawn) | 0.70 | 93%/93% |
| wing bombs off | 52.5 ↓ (-0.1) | 5.2 ↓ (+0.0) | 14.8 (+0.1) | 0.3 (+0.0) | 2.8 ↓ (-0.0) | 3.6 ↓ (+0.1) | 5.8 ↓ (+0.0) | 1.9 ↓ (+0.1) | 0.1 (+0.0) | 5.8 (+0.0) | 0.3 (+0.0) | 0.1 (+0.0) | 15.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.1 (+0.0) | 0.0 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.4 (+0.0) | 153.6 (-3.2) | 0.6 (+0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 72.8 ✓ (-0.4) | 0.500 (+0.0) | 0.200 ✓ (+0.1) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.300 (+0.0) | 50% (20% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 75 | 5 | 0.9 | 11 | 0 | 6 | 3 | 44 | 36 | 64 | 23 | 14 | 27 | 5.3 | 0.30 | 55.6 |
| wing bombs off | 0.25 (+0.0) | 75 (+0.0) | 5 (+0.0) | 0.9 (+0.0) | 14 (+2.4) | 0 (+0.0) | 5 (-0.2) | 3 (-0.1) | 43 (-1.2) | 35 (-1.0) | 64 (+0.4) | 23 (+0.1) | 13 (-0.5) | 27 (-0.0) | 5.3 (+0.0) | 0.30 (+0.0) | 55.5 (-0.1) |

_Tries 1.8 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.9 ↓ | 5.7 ↓ | 16.9 | 0.1 | 2.4 ↓ | 3.8 ↓ | 4.8 ↓ | 2.0 ↓ | 0.1 | 8.3 | 0.6 | 0.2 | 20.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.6 | 0.0 | 0.4 | 124.3 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.2 | 0.3 | 0.1 | 72.6 ✓ | 0.550 | 0.100 ↓ | 0.050 ✓ | 0.000 ✓ | 0.400 | 35% (10% drawn) | 0.70 | 92%/93% |
| wing bombs off | 52.9 ↓ (+0.0) | 5.7 ↓ (+0.0) | 16.9 (+0.0) | 0.1 (+0.0) | 2.4 ↓ (+0.0) | 3.8 ↓ (+0.0) | 4.8 ↓ (+0.0) | 2.0 ↓ (+0.0) | 0.1 (+0.0) | 8.3 (+0.0) | 0.6 (+0.0) | 0.2 (+0.0) | 20.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (+0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 124.3 (+0.0) | 0.5 (+0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.0) | 0.1 (+0.0) | 72.6 ✓ (+0.0) | 0.550 (+0.0) | 0.100 ↓ (+0.0) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (+0.0) | 35% (10% drawn) | 0.70 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 25 | 1.4 | 8 | 0 | 3 | 15 | 40 | 35 | 53 | 25 | 22 | 26 | 5.4 | 0.15 | 54.0 |
| wing bombs off | 0.40 (+0.0) | 80 (+0.0) | 25 (+0.0) | 1.4 (+0.0) | 8 (+0.0) | 0 (+0.0) | 3 (+0.0) | 15 (+0.0) | 40 (+0.0) | 35 (+0.0) | 53 (+0.0) | 25 (+0.0) | 22 (+0.0) | 26 (+0.0) | 5.4 (+0.0) | 0.15 (+0.0) | 54.0 (+0.0) |

_Tries 2.0 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.2 ↓ | 5.3 ↓ | 21.6 | 0.3 | 2.9 ↓ | 3.7 ↓ | 6.0 ↓ | 1.4 ↓ | 0.1 | 8.8 | 1.1 | 0.1 | 15.0 | 0.0 | 0.1 | 0.6 | 0.1 | 0.6 | 0.0 | 0.3 | 156.8 | 0.9 | 0.8 | 0.2 | 0.0 | 0.0 | 0.0 | 0.5 | 0.2 | 72.4 ✓ | 0.200 | 0.000 ↓ | 0.000 ↓ | 0.000 ✓ | 0.200 | 65% (10% drawn) | 0.69 | 93%/93% |
| wing bombs off | 52.1 ↓ (-0.1) | 5.3 ↓ (+0.1) | 21.6 (+0.0) | 0.3 (+0.0) | 2.8 ↓ (-0.1) | 3.6 ↓ (-0.1) | 6.0 ↓ (+0.0) | 1.6 ↓ (+0.2) | 0.1 (+0.0) | 8.9 (+0.1) | 1.2 (+0.1) | 0.1 (+0.0) | 15.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.7 (+0.1) | 0.1 (+0.0) | 0.5 (-0.1) | 0.0 (+0.0) | 0.3 (+0.0) | 156.4 (-0.3) | 0.8 (-0.2) | 0.8 (+0.1) | 0.1 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.5 (-0.0) | 0.2 (+0.0) | 72.6 ✓ (+0.3) | 0.200 (+0.0) | 0.000 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.200 (+0.0) | 60% (10% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 95 | 10 | 0.2 | 14 | 0 | 3 | 10 | 31 | 41 | 69 | 20 | 11 | 32 | 5.3 | 0.05 | 56.3 |
| wing bombs off | 0.20 (+0.0) | 95 (+0.0) | 10 (+0.0) | 0.2 (+0.0) | 13 (-1.3) | 0 (+0.0) | 3 (-0.3) | 9 (-1.0) | 31 (+0.2) | 44 (+2.4) | 68 (-0.8) | 21 (+0.3) | 11 (+0.4) | 31 (-0.5) | 5.3 (-0.0) | 0.05 (+0.0) | 56.3 (+0.0) |

_Tries 1.5 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 57.0 ↓ | 5.2 ↓ | 16.7 | 0.1 | 2.6 ↓ | 3.1 ↓ | 5.8 ↓ | 1.2 ↓ | 0.1 | 8.0 | 0.5 | 0.3 | 20.0 | 0.0 | 0.1 | 0.7 | 0.1 | 0.9 | 0.1 | 0.6 | 147.0 | 0.6 | 0.8 | 0.0 | 0.1 | 0.4 | -0.1 | 0.8 | 0.1 | 76.7 ✓ | 0.550 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 40% (30% drawn) | 0.70 | 92%/92% |
| wing bombs off | 56.8 ↓ (-0.2) | 5.0 ↓ (-0.2) | 17.0 (+0.3) | 0.2 (+0.1) | 2.8 ↓ (+0.1) | 3.1 ↓ (-0.0) | 5.7 ↓ (-0.0) | 1.4 ↓ (+0.2) | 0.1 (+0.1) | 8.2 (+0.2) | 0.5 (+0.0) | 0.3 (+0.0) | 20.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.8 (+0.1) | 0.1 (+0.0) | 1.0 (+0.1) | 0.1 (+0.0) | 0.5 (-0.1) | 146.8 (-0.2) | 0.6 (+0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.4 (+0.0) | -0.1 (+0.0) | 0.8 (+0.0) | 0.1 (+0.0) | 76.7 ✓ (-0.0) | 0.500 (-0.1) | 0.050 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (-0.0) | 45% (30% drawn) | 0.70 | 92%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 75 | 20 | 0.6 | 8 | 0 | 4 | 4 | 46 | 38 | 56 | 28 | 16 | 26 | 5.8 | 0.60 | 55.7 |
| wing bombs off | 0.15 (+0.0) | 75 (+0.0) | 25 (+5.0) | 0.7 (+0.1) | 7 (-0.9) | 0 (+0.0) | 7 (+3.2) | 4 (-0.5) | 41 (-5.1) | 41 (+3.2) | 57 (+0.3) | 27 (-0.4) | 16 (+0.1) | 26 (-0.2) | 5.7 (-0.1) | 0.60 (+0.0) | 55.6 (-0.1) |

_Tries 1.2 and last tackles 9.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.8 ↓ | 5.0 ↓ | 16.1 | 0.5 | 2.4 ↓ | 3.4 ↓ | 6.1 ↓ | 1.5 ↓ | 0.2 | 7.3 | 0.6 | 0.2 | 20.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.8 | 0.0 | 0.6 | 158.3 | 0.5 | 0.9 | 0.0 | 0.1 | 0.1 | 0.1 | 0.6 | 0.1 | 74.2 ✓ | 0.660 | 0.080 ↓ | 0.000 ↓ | 0.000 ✓ | 0.580 | 52% (13% drawn) | 46.5% (16.0% drawn) | 0.71 | 93%/93% |
| wing bombs off | 53.8 ↓ (+0.0) | 5.0 ↓ (-0.1) | 16.2 (+0.1) | 0.5 (+0.0) | 2.4 ↓ (-0.0) | 3.4 ↓ (-0.0) | 6.0 ↓ (-0.1) | 1.5 ↓ (+0.0) | 0.2 (+0.0) | 7.4 (+0.1) | 0.6 (-0.0) | 0.2 (+0.0) | 21.0 (+1.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (+0.0) | 0.2 (+0.0) | 0.8 (-0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 157.4 (-0.9) | 0.5 (+0.0) | 0.9 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.6 (-0.0) | 0.1 (+0.0) | 74.2 ✓ (-0.0) | 0.660 (+0.0) | 0.070 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.590 (+0.0) | 52% (13% drawn) | 47.0% (16.0% drawn) | 0.72 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.33 | 91 | 20 | 0.8 | 11 | 0 | 3 | 3 | 36 | 47 | 65 | 23 | 12 | 28 | 5.4 | 0.58 | 56.0 |
| wing bombs off | 0.31 (-0.0) | 91 (+0.0) | 22 (+2.0) | 0.8 (+0.0) | 10 (-0.7) | 0 (+0.0) | 3 (+0.0) | 3 (+0.0) | 37 (+1.3) | 47 (-0.7) | 64 (-0.5) | 24 (+0.5) | 12 (-0.1) | 28 (-0.0) | 5.4 (+0.0) | 0.58 (+0.0) | 55.9 (-0.0) |

_Tries 1.5 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.6 ↓ | 5.1 ↓ | 16.4 | 0.3 | 2.6 ↓ | 3.3 ↓ | 5.0 ↓ | 1.6 ↓ | 0.2 | 7.0 | 0.7 | 0.3 | 25.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.7 | 0.1 | 0.4 | 124.3 | 0.7 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 74.3 ✓ | 0.420 | 0.090 ↓ | 0.000 ↓ | 0.000 ✓ | 0.330 | 48% (21% drawn) | 41.0% (20.0% drawn) | 0.70 | 93%/93% |
| wing bombs off | 53.6 ↓ (-0.0) | 5.1 ↓ (+0.0) | 16.4 (+0.0) | 0.3 (+0.0) | 2.6 ↓ (+0.0) | 3.3 ↓ (+0.0) | 5.0 ↓ (+0.0) | 1.7 ↓ (+0.0) | 0.2 (+0.0) | 7.0 (+0.1) | 0.7 (-0.0) | 0.3 (-0.0) | 24.0 (-1.0) | 0.0 (+0.0) | 0.0 (-0.0) | 1.0 (+0.1) | 0.1 (+0.0) | 0.7 (+0.0) | 0.1 (+0.0) | 0.3 (-0.0) | 125.4 (+1.2) | 0.7 (-0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.0) | 0.5 (-0.0) | 0.1 (+0.0) | 74.3 ✓ (+0.0) | 0.420 (+0.0) | 0.090 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.330 (+0.0) | 48% (23% drawn) | 41.5% (20.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 83 | 25 | 0.7 | 16 | 0 | 6 | 6 | 32 | 40 | 55 | 27 | 18 | 25 | 5.7 | 0.17 | 55.7 |
| wing bombs off | 0.30 (+0.0) | 83 (+0.0) | 24 (-1.0) | 0.7 (+0.0) | 15 (-1.0) | 0 (+0.0) | 7 (+0.4) | 7 (+1.0) | 31 (-1.4) | 41 (+0.8) | 55 (+0.2) | 27 (-0.3) | 18 (+0.0) | 26 (+0.2) | 5.7 (+0.0) | 0.18 (+0.0) | 55.7 (-0.0) |

_Tries 1.6 and last tackles 9.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.4 ↓ | 16.1 | 0.2 | 2.3 ↓ | 3.6 ↓ | 6.1 ↓ | 1.6 ↓ | 0.1 | 7.2 | 0.7 | 0.3 | 28.0 | 0.0 | 0.0 | 0.8 | 0.1 | 0.4 | 0.1 | 0.6 | 142.6 | 0.5 | 0.8 | 0.0 | 0.1 | 0.1 | 0.1 | 0.5 | 0.1 | 72.7 ✓ | 0.710 | 0.030 ↓ | 0.010 ↓ | 0.000 ✓ | 0.670 | 38% (18% drawn) | 37.0% (17.5% drawn) | 0.70 | 93%/93% |
| wing bombs off | 51.2 ↓ (+0.0) | 5.4 ↓ (-0.0) | 16.2 (+0.1) | 0.2 (+0.0) | 2.3 ↓ (-0.0) | 3.6 ↓ (+0.0) | 6.1 ↓ (-0.0) | 1.6 ↓ (-0.0) | 0.1 (+0.0) | 7.1 (-0.1) | 0.7 (+0.0) | 0.3 (+0.0) | 28.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.8 (+0.0) | 0.1 (+0.0) | 0.4 (-0.0) | 0.1 (+0.0) | 0.6 (-0.0) | 143.4 (+0.8) | 0.5 (-0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.5 (-0.0) | 0.1 (+0.0) | 72.7 ✓ (+0.1) | 0.700 (-0.0) | 0.030 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.660 (-0.0) | 38% (19% drawn) | 37.0% (17.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.18 | 81 | 13 | 0.4 | 11 | 0 | 4 | 5 | 37 | 42 | 67 | 21 | 12 | 27 | 5.5 | 0.60 | 55.1 |
| wing bombs off | 0.16 (-0.0) | 80 (-1.0) | 12 (-1.0) | 0.4 (-0.0) | 11 (-0.5) | 0 (+0.0) | 4 (+0.1) | 5 (+0.1) | 38 (+0.5) | 42 (-0.1) | 67 (-0.2) | 21 (+0.4) | 12 (-0.2) | 27 (-0.0) | 5.5 (+0.0) | 0.63 (+0.0) | 55.2 (+0.2) |

_Tries 1.6 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 5.9 ↓ | 18.3 | 0.3 | 3.4 ↓ | 3.6 ↓ | 5.1 ↓ | 1.8 ↓ | 0.2 | 7.3 | 0.9 | 0.3 | 27.0 | 0.0 | 0.1 | 1.1 | 0.0 | 0.5 | 0.0 | 0.4 | 122.8 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.0 | 0.4 | 0.1 | 72.8 ✓ | 0.470 | 0.080 ↓ | 0.020 ↓ | 0.000 ✓ | 0.370 | 42% (21% drawn) | 37.5% (21.0% drawn) | 0.71 | 93%/93% |
| wing bombs off | 50.9 ↓ (+0.0) | 5.9 ↓ (-0.0) | 18.3 (-0.0) | 0.3 (+0.0) | 3.4 ↓ (-0.0) | 3.6 ↓ (-0.0) | 5.1 ↓ (+0.0) | 1.8 ↓ (+0.0) | 0.2 (+0.0) | 7.3 (+0.0) | 0.9 (+0.0) | 0.3 (+0.0) | 27.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 122.8 (+0.0) | 0.5 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.0 (+0.0) | 0.4 (-0.0) | 0.1 (+0.0) | 73.2 ✓ (+0.4) | 0.490 (+0.0) | 0.090 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.380 (+0.0) | 42% (19% drawn) | 38.0% (19.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.09 | 82 | 17 | 0.3 | 10 | 0 | 9 | 6 | 41 | 34 | 58 | 22 | 21 | 27 | 5.5 | 0.23 | 54.5 |
| wing bombs off | 0.09 (+0.0) | 81 (-1.0) | 17 (+0.0) | 0.3 (+0.0) | 10 (+0.4) | 0 (+0.0) | 9 (-0.1) | 5 (-0.1) | 41 (-0.1) | 34 (-0.0) | 58 (-0.0) | 22 (+0.0) | 21 (+0.0) | 27 (+0.0) | 5.5 (-0.0) | 0.26 (+0.0) | 54.5 (-0.0) |

_Tries 1.8 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.2 ↓ | 5.0 ↓ | 22.7 | 0.1 | 2.5 ↓ | 3.7 ↓ | 5.7 ↓ | 1.9 ↓ | 0.1 | 9.3 | 1.0 | 0.2 | 22.0 | 0.0 | 0.1 | 1.0 | 0.1 | 0.7 | 0.1 | 0.5 | 139.1 | 0.8 | 0.7 | 0.0 | 0.1 | 0.3 | 0.5 | 0.5 | 0.1 | 73.9 ✓ | 0.630 | 0.110 ↓ | 0.000 ↓ | 0.000 ✓ | 0.520 | 35% (20% drawn) | 31.5% (18.0% drawn) | 0.69 | 93%/93% |
| wing bombs off | 52.3 ↓ (+0.1) | 4.9 ↓ (-0.1) | 22.8 (+0.1) | 0.1 (-0.0) | 2.5 ↓ (+0.0) | 3.6 ↓ (-0.1) | 5.7 ↓ (+0.0) | 1.9 ↓ (+0.0) | 0.1 (+0.0) | 9.3 (+0.1) | 1.0 (+0.0) | 0.2 (-0.0) | 21.0 (-1.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (+0.0) | 0.1 (-0.0) | 0.7 (+0.0) | 0.1 (+0.0) | 0.5 (+0.0) | 139.8 (+0.6) | 0.8 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.4 (-0.1) | 0.5 (-0.0) | 0.1 (+0.0) | 74.2 ✓ (+0.3) | 0.630 (+0.0) | 0.110 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.520 (+0.0) | 36% (20% drawn) | 33.0% (16.5% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 81 | 12 | 0.8 | 14 | 0 | 4 | 10 | 37 | 35 | 63 | 23 | 13 | 27 | 5.4 | 0.35 | 54.2 |
| wing bombs off | 0.25 (+0.0) | 81 (+0.0) | 11 (-1.0) | 0.8 (+0.0) | 14 (-0.2) | 0 (+0.0) | 4 (-0.1) | 11 (+0.9) | 35 (-1.1) | 36 (+0.5) | 64 (+0.3) | 23 (-0.2) | 13 (-0.1) | 27 (-0.1) | 5.4 (+0.0) | 0.36 (+0.0) | 54.3 (+0.1) |

_Tries 1.9 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.2 ↓ | 16.1 | 0.3 | 2.4 ↓ | 3.5 ↓ | 5.8 ↓ | 1.6 ↓ | 0.2 | 7.6 | 0.6 | 0.3 | 21.0 | 0.0 | 0.1 | 0.9 | 0.1 | 0.6 | 0.0 | 0.4 | 147.0 | 0.5 | 0.7 | 0.0 | 0.0 | 0.1 | 0.1 | 0.5 | 0.1 | 73.0 ✓ | 0.570 | 0.100 ↓ | 0.010 ↓ | 0.000 ✓ | 0.460 | 39% (20% drawn) | 39.0% (21.0% drawn) | 0.70 | 93%/93% |
| wing bombs off | 52.4 ↓ (-0.1) | 5.4 ↓ (+0.1) | 16.3 (+0.1) | 0.3 (+0.0) | 2.4 ↓ (+0.0) | 3.4 ↓ (-0.1) | 5.7 ↓ (-0.0) | 1.5 ↓ (-0.0) | 0.2 (+0.0) | 7.5 (-0.1) | 0.6 (+0.0) | 0.3 (+0.0) | 25.0 (+4.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.0) | 0.1 (+0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 145.8 (-1.2) | 0.5 (+0.0) | 0.7 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.5 (-0.0) | 0.1 (+0.0) | 73.4 ✓ (+0.4) | 0.560 (-0.0) | 0.100 ↓ (+0.0) | 0.010 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (-0.0) | 36% (22% drawn) | 37.0% (22.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 89 | 19 | 0.6 | 10 | 0 | 3 | 6 | 39 | 41 | 63 | 21 | 16 | 26 | 5.6 | 0.33 | 55.0 |
| wing bombs off | 0.24 (-0.0) | 88 (-1.0) | 18 (-1.0) | 0.6 (+0.0) | 10 (+0.1) | 0 (+0.0) | 3 (+0.0) | 7 (+0.7) | 37 (-2.1) | 42 (+1.2) | 63 (-0.2) | 21 (+0.2) | 17 (+0.1) | 26 (+0.2) | 5.5 (-0.0) | 0.32 (-0.0) | 55.0 (-0.0) |

_Tries 1.6 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.4 ↓ | 5.4 ↓ | 16.1 | 0.4 | 2.6 ↓ | 3.9 ↓ | 5.3 ↓ | 1.6 ↓ | 0.1 | 7.7 | 0.5 | 0.4 | 35.0 | 0.0 | 0.1 | 0.8 | 0.0 | 0.7 | 0.0 | 0.6 | 113.7 | 0.7 | 0.9 | 0.1 | 0.1 | 0.3 | -0.2 | 0.5 | 0.1 | 72.4 ✓ | 0.400 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.350 | 55% (15% drawn) | 0.73 | 93%/93% |
| wing bombs off | 52.4 ↓ (-0.0) | 5.2 ↓ (-0.2) | 15.8 (-0.3) | 0.4 (+0.0) | 2.6 ↓ (+0.0) | 3.9 ↓ (-0.0) | 5.4 ↓ (+0.1) | 1.7 ↓ (+0.1) | 0.1 (+0.0) | 7.4 (-0.3) | 0.5 (+0.0) | 0.4 (+0.0) | 35.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.8 (+0.0) | 0.1 (+0.1) | 0.7 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 117.7 (+4.0) | 0.7 (-0.0) | 0.9 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | -0.2 (+0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 73.0 ✓ (+0.7) | 0.400 (+0.0) | 0.050 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (+0.0) | 55% (15% drawn) | 0.72 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.30 | 90 | 20 | 1.1 | 18 | 0 | 0 | 12 | 33 | 36 | 60 | 24 | 16 | 28 | 5.5 | 0.25 | 53.8 |
| wing bombs off | 0.30 (+0.0) | 90 (+0.0) | 25 (+5.0) | 1.1 (+0.0) | 18 (-0.5) | 0 (+0.0) | 0 (+0.0) | 12 (-0.4) | 35 (+2.0) | 35 (-1.1) | 61 (+0.8) | 24 (-0.1) | 15 (-0.7) | 28 (-0.2) | 5.4 (-0.0) | 0.25 (+0.0) | 53.6 (-0.2) |

_Tries 1.6 and last tackles 8.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.8 ↓ | 8.8 ↓ | 18.9 | 0.1 | 2.1 ↓ | 3.0 ↓ | 5.2 ↓ | 2.7 ↓ | 0.3 | 6.9 | 1.2 | 0.6 | 50.0 | 0.0 | 0.0 | 1.6 | 0.1 | 0.5 | 0.1 | 0.1 | 118.5 | 0.8 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.0 | 77.5 ✓ | 0.850 | 0.200 ✓ | 0.000 ↓ | 0.000 ✓ | 0.650 | 80% | 0.69 | 92%/93% |
| wing bombs off | 50.6 ↓ (-0.2) | 8.9 ↓ (+0.1) | 18.6 (-0.2) | 0.1 (+0.0) | 2.3 ↓ (+0.1) | 3.0 ↓ (-0.0) | 5.2 ↓ (+0.0) | 2.8 ↓ (+0.0) | 0.3 (+0.0) | 6.8 (-0.1) | 1.2 (+0.0) | 0.6 (+0.0) | 50.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.7 (+0.1) | 0.1 (+0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 118.8 (+0.3) | 0.8 (-0.1) | 0.9 (+0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.4 (-0.1) | 0.0 (+0.0) | 77.6 ✓ (+0.1) | 0.800 (-0.0) | 0.200 ✓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.600 (-0.1) | 80% | 0.68 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 80 | 15 | 1.8 | 15 | 0 | 0 | 7 | 24 | 54 | 57 | 28 | 16 | 28 | 5.3 | 0.45 | 55.7 |
| wing bombs off | 0.40 (+0.0) | 80 (+0.0) | 15 (+0.0) | 1.8 (+0.0) | 15 (-0.3) | 0 (+0.0) | 0 (+0.0) | 7 (-0.1) | 24 (-0.4) | 55 (+0.8) | 58 (+1.5) | 27 (-1.0) | 15 (-0.5) | 29 (+1.0) | 5.3 (-0.0) | 0.40 (-0.0) | 55.8 (+0.1) |

_Tries 2.7 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.9 ↓ | 3.3 ↓ | 16.3 | 3.3 | 1.3 ↓ | 3.7 ↓ | 6.2 ↓ | 1.5 ↓ | 0.1 | 5.0 | 0.4 | 0.3 | 30.0 | 4.0 | 10.6 | 0.6 | 0.2 | 0.8 | 0.0 | 0.4 | 160.4 | 0.3 | 0.3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.3 | 0.1 | 71.2 ✓ | 0.458 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.417 | 35% (20% drawn) | 0.69 | 52%/52% |
| wing bombs off | 50.9 ↓ (+0.0) | 3.3 ↓ (+0.0) | 16.3 (+0.0) | 3.3 (+0.0) | 1.3 ↓ (+0.0) | 3.7 ↓ (+0.0) | 6.2 ↓ (+0.0) | 1.5 ↓ (+0.0) | 0.1 (+0.0) | 5.0 (+0.0) | 0.4 (+0.0) | 0.3 (+0.0) | 30.0 (+0.0) | 4.0 (+0.0) | 10.6 (+0.0) | 0.6 (+0.0) | 0.2 (+0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 160.4 (+0.0) | 0.3 (+0.0) | 0.3 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.3 (+0.0) | 0.1 (+0.0) | 71.2 ✓ (+0.0) | 0.458 (+0.0) | 0.042 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.417 (+0.0) | 35% (20% drawn) | 0.69 | 52%/52% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 90 | 30 | 0.6 | 14 | 0 | 0 | 3 | 25 | 58 | 63 | 22 | 15 | 26 | 5.8 | 0.42 | 55.4 |
| wing bombs off | 0.25 (+0.0) | 90 (+0.0) | 30 (+0.0) | 0.6 (+0.0) | 14 (+0.0) | 0 (+0.0) | 0 (+0.0) | 3 (+0.0) | 25 (+0.0) | 58 (+0.0) | 63 (+0.0) | 22 (+0.0) | 15 (+0.0) | 26 (+0.0) | 5.8 (+0.0) | 0.42 (+0.0) | 55.4 (+0.0) |

_Tries 1.5 and last tackles 9.4 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_26 cells in 1502 s._
