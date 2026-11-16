# Balance: heldup-rebase standard

#652 rebased on #687 (last-tackle options): standard.json with held up off (heldUp.on 0, the baseline, which plays as main at 9278a09) against on at the default, same seeds. The always-on suite: run on every change to the match code. Even sides, a stamina gap, the defence presets, attacking styles, a 20-point rating gap, fast low-stamina fliers against slower stayers (sprint and gas), and late-game legs, all at the current knobs. The six preset rows (100 seeds, both ways) are the 45–55% check against Balanced or Slide.

**commit** e731dd11 · **branch** claude/652-held-up · **started** 2026-11-16T12:58:03.220Z

20 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 5.3 ↓ | 16.2 | 0.3 | 1.9 ↓ | 3.6 ↓ | 5.8 ↓ | 2.0 ↓ | 0.1 | 7.6 | 0.8 | 0.0 | 0.0 | 0.0 | 0.1 | 1.2 | 0.1 | 0.7 | 0.0 | 0.1 | 144.9 | 0.6 | 1.0 | 0.0 | 0.1 | 0.1 | -0.1 | 0.4 | 0.1 | 72.9 ✓ | 0.650 | 0.150 ↓ | 0.050 ✓ | 0.000 ✓ | 0.450 | 30% (15% drawn) | 0.72 | 94%/94% |
| on (default) | 51.4 ↓ (-0.7) | 5.5 ↓ (+0.2) | 16.9 (+0.7) | 0.3 (+0.0) | 1.7 ↓ (-0.2) | 3.7 ↓ (+0.1) | 5.7 ↓ (-0.0) | 1.9 ↓ (-0.1) | 0.1 (+0.0) | 7.5 (-0.1) | 0.8 (+0.1) | 0.2 (+0.2*) | 20.0 (+20.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.3) | 0.1 (+0.1) | 0.8 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 142.3 (-2.6) | 0.6 (+0.0) | 0.8 (-0.2) | 0.0 (+0.0) | 0.1 (+0.1) | 0.2 (+0.1) | 0.7 (+0.8) | 0.3 (-0.1) | 0.1 (+0.0) | 72.7 ✓ (-0.2) | 0.600 (-0.1) | 0.100 ↓ (-0.0) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.0) | 45% (15% drawn) | 0.72 | 94%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 85 | 25 | 1.3 | 12 | 0 | 5 | 5 | 39 | 39 | 63 | 23 | 14 | 27 | 5.5 | 0.30 | 55.5 |
| on (default) | 0.25 (+0.0) | 90 (+5.0) | 20 (-5.0) | 1.3 (+0.0) | 10 (-1.9) | 0 (+0.0) | 3 (-2.3) | 5 (+0.3) | 33 (-5.7) | 49 (+9.7) | 63 (-0.0) | 22 (-1.2) | 15 (+1.2) | 28 (+0.4) | 5.4 (-0.1) | 0.30 (+0.0) | 56.7 (+1.2) |

_Tries 2.0 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## stamina 30 v 80

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 5.0 ↓ | 15.6 | 0.2 | 2.0 ↓ | 4.2 ↓ | 5.9 ↓ | 1.8 ↓ | 0.3 | 6.8 | 0.5 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.0 | 0.6 | 0.0 | 0.6 | 147.0 | 0.7 | 0.7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 | 0.2 | 71.2 ✓ | 0.850 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.750 | 40% (10% drawn) | 0.67 | 92%/93% |
| on (default) | 51.4 ↓ (-0.1) | 5.0 ↓ (-0.1) | 14.7 (-0.9) | 0.1 (-0.1) | 1.9 ↓ (-0.1) | 4.3 ↓ (+0.1) | 5.2 ↓ (-0.7) | 1.8 ↓ (+0.1) | 0.3 (-0.1) | 6.5 (-0.3) | 0.5 (+0.0) | 0.3 (+0.3*) | 25.0 (+25.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (+0.1) | 0.6 (+0.0) | 0.0 (+0.0) | 0.5 (-0.1) | 134.2 (-12.8) | 0.7 (+0.0) | 0.6 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.1) | 0.2 (+0.0) | 69.1 ↓ (-2.1) | 0.700 (-0.2) | 0.100 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.600 (-0.2) | 45% (10% drawn) | 0.69 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.15 | 65 | 30 | 0.9 | 14 | 0 | 6 | 6 | 34 | 40 | 65 | 24 | 11 | 26 | 5.5 | 0.50 | 56.3 |
| on (default) | 0.15 (+0.0) | 85 (+20.0) | 25 (-5.0) | 0.9 (+0.0) | 14 (-0.4) | 0 (+0.0) | 3 (-2.9) | 8 (+2.6) | 33 (-1.0) | 42 (+1.7) | 57 (-7.2) | 25 (+0.6) | 18 (+6.6) | 26 (-0.4) | 5.5 (-0.1) | 0.40 (-0.1) | 55.8 (-0.4) |

_Tries 1.7 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## slide v rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.0 ↓ | 5.0 ↓ | 20.7 | 0.2 | 2.6 ↓ | 3.5 ↓ | 4.9 ↓ | 2.2 ↓ | 0.3 | 9.9 | 0.9 | 0.0 | 0.0 | 0.0 | 0.3 | 1.6 | 0.1 | 0.6 | 0.1 | 0.1 | 120.4 | 1.4 | 1.1 | 0.1 | 0.0 | 0.0 | 0.0 | 0.6 | 0.3 | 73.4 ✓ | 0.350 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.300 | 45% (15% drawn) | 0.66 | 93%/93% |
| on (default) | 52.9 ↓ (-0.1) | 5.2 ↓ (+0.1) | 21.2 (+0.5) | 0.1 (-0.1) | 2.8 ↓ (+0.1) | 3.9 ↓ (+0.4) | 5.4 ↓ (+0.5) | 1.9 ↓ (-0.3) | 0.3 (+0.0) | 9.8 (-0.2) | 1.1 (+0.1) | 0.2 (+0.2*) | 20.0 (+20.0*) | 0.0 (+0.0) | 0.3 (+0.0) | 1.3 (-0.3) | 0.1 (+0.0) | 0.7 (+0.1) | 0.1 (+0.1) | 0.3 (+0.1) | 124.6 (+4.2) | 1.4 (+0.0) | 0.8 (-0.2) | 0.1 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 0.3 (+0.0) | 71.7 ✓ (-1.7) | 0.400 (+0.1) | 0.050 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.350 (+0.0) | 55% (10% drawn) | 0.68 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 60 | 10 | 0.8 | 9 | 0 | 9 | 9 | 32 | 41 | 58 | 27 | 15 | 26 | 5.5 | 0.15 | 55.7 |
| on (default) | 0.20 (-0.0) | 55 (-5.0) | 5 (-5.0) | 0.9 (+0.1) | 16 (+6.7) | 0 (+0.0) | 5 (-3.8) | 5 (-3.8) | 29 (-2.9) | 45 (+3.8) | 64 (+5.3) | 26 (-0.3) | 10 (-4.9) | 26 (+0.2) | 5.5 (+0.0) | 0.15 (+0.0) | 55.5 (-0.2) |

_Tries 2.2 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 55.0 ↓ | 4.2 ↓ | 16.1 | 0.5 | 2.3 ↓ | 3.5 ↓ | 5.7 ↓ | 1.8 ↓ | 0.1 | 8.0 | 0.3 | 0.0 | 0.0 | 0.0 | 0.1 | 0.8 | 0.0 | 1.1 | 0.1 | 0.3 | 156.0 | 0.6 | 0.9 | 0.0 | 0.1 | 0.2 | -0.2 | 0.7 | 0.1 | 74.8 ✓ | 0.550 | 0.000 ↓ | 0.050 ✓ | 0.000 ✓ | 0.500 | 15% (35% drawn) | 0.72 | 93%/93% |
| on (default) | 55.5 ↓ (+0.5) | 4.3 ↓ (+0.1) | 16.4 (+0.2) | 0.4 (-0.1) | 2.1 ↓ (-0.2) | 3.4 ↓ (-0.1) | 5.9 ↓ (+0.3) | 1.4 ↓ (-0.4) | 0.1 (+0.0) | 8.2 (+0.2) | 0.4 (+0.1) | 0.3 (+0.3*) | 25.0 (+25.0*) | 0.0 (+0.0) | 0.2 (+0.1) | 0.6 (-0.2) | 0.0 (+0.0) | 0.8 (-0.3) | 0.1 (+0.0) | 0.3 (-0.0) | 166.2 (+10.3) | 0.7 (+0.1) | 0.5 (-0.5*) | 0.0 (+0.0) | 0.1 (+0.1) | 0.3 (+0.1) | -0.5 (-0.3) | 0.4 (-0.3) | 0.2 (+0.1) | 75.5 ✓ (+0.7) | 0.400 (-0.2) | 0.050 ↓ (+0.1) | 0.050 ✓ (+0.0) | 0.000 ✓ (+0.0) | 0.300 (-0.2) | 15% (40% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 80 | 10 | 0.5 | 6 | 0 | 9 | 9 | 29 | 49 | 57 | 25 | 18 | 27 | 5.8 | 0.75 | 56.7 |
| on (default) | 0.10 (-0.1) | 75 (-5.0) | 10 (+0.0) | 0.1 (-0.3) | 11 (+5.0) | 0 (+0.0) | 4 (-5.0) | 7 (-1.4) | 32 (+3.6) | 46 (-2.1) | 59 (+1.6) | 25 (+0.3) | 16 (-1.9) | 28 (+0.2) | 5.7 (-0.2) | 0.50 (-0.3) | 57.7 (+0.9) |

_Tries 1.8 and last tackles 8.6 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## grind v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 54.1 ↓ | 4.8 ↓ | 14.7 | 0.3 | 2.1 ↓ | 3.5 ↓ | 6.0 ↓ | 1.9 ↓ | 0.3 | 7.4 | 0.5 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.8 | 0.1 | 0.3 | 157.2 | 0.5 | 0.6 | 0.0 | 0.0 | 0.0 | 0.1 | 0.5 | 0.1 | 75.2 ✓ | 0.540 | 0.070 ↓ | 0.010 ↓ | 0.000 ✓ | 0.460 | 49% (18% drawn) | 47.5% (18.0% drawn) | 0.70 | 93%/93% |
| on (default) | 54.2 ↓ (+0.1) | 4.9 ↓ (+0.0) | 14.8 (+0.2) | 0.4 (+0.0) | 1.9 ↓ (-0.2) | 3.7 ↓ (+0.3) | 6.0 ↓ (-0.0) | 1.5 ↓ (-0.3*) | 0.1 (-0.1) | 7.4 (-0.0) | 0.6 (+0.1) | 0.3 (+0.3*) | 22.0 (+22.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.8 (-0.3) | 0.1 (+0.0) | 0.8 (+0.0) | 0.1 (+0.0) | 0.4 (+0.1) | 154.8 (-2.3) | 0.5 (-0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.5 (+0.0) | 0.1 (+0.0) | 73.6 ✓ (-1.6) | 0.650 (+0.1) | 0.060 ↓ (-0.0) | 0.000 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.590 (+0.1) | 52% (18% drawn) | 47.0% (20.0% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.36 | 85 | 18 | 0.9 | 8 | 0 | 4 | 6 | 38 | 43 | 62 | 26 | 12 | 27 | 5.5 | 0.67 | 55.5 |
| on (default) | 0.19 (-0.2*) | 84 (-1.0) | 18 (+0.0) | 0.5 (-0.4) | 8 (-0.2) | 0 (+0.0) | 3 (-1.0) | 5 (-1.2) | 38 (-0.6) | 46 (+3.0) | 62 (-0.7) | 24 (-1.2) | 14 (+2.0) | 27 (-0.0) | 5.5 (+0.0) | 0.62 (-0.1) | 55.5 (+0.0) |

_Tries 1.9 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.5 ↓ | 5.3 ↓ | 15.3 | 0.2 | 2.5 ↓ | 3.8 ↓ | 5.2 ↓ | 1.8 ↓ | 0.1 | 7.1 | 0.7 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.5 | 0.0 | 0.3 | 126.9 | 0.5 | 0.7 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.1 | 72.9 ✓ | 0.450 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.400 | 30% (13% drawn) | 35.0% (13.5% drawn) | 0.70 | 93%/93% |
| on (default) | 53.1 ↓ (-0.4) | 5.4 ↓ (+0.1) | 15.3 (+0.0) | 0.3 (+0.1) | 2.5 ↓ (-0.0) | 3.7 ↓ (-0.1) | 5.1 ↓ (-0.0) | 1.6 ↓ (-0.2) | 0.1 (+0.0) | 6.8 (-0.3) | 0.6 (-0.1) | 0.3 (+0.3*) | 25.0 (+25.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 0.9 (-0.2) | 0.2 (+0.0) | 0.7 (+0.1) | 0.1 (+0.0) | 0.4 (+0.1) | 129.9 (+2.9) | 0.5 (-0.0) | 0.8 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.2 (-0.1) | 0.5 (+0.0) | 0.1 (+0.0) | 73.3 ✓ (+0.4) | 0.540 (+0.1) | 0.050 ↓ (+0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.470 (+0.1) | 28% (18% drawn) | 34.0% (16.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 79 | 21 | 0.6 | 10 | 0 | 8 | 8 | 34 | 41 | 57 | 28 | 15 | 26 | 5.5 | 0.16 | 54.6 |
| on (default) | 0.23 (-0.0) | 83 (+4.0) | 23 (+2.0) | 0.7 (+0.1) | 9 (-1.2) | 0 (+0.0) | 6 (-1.5) | 7 (-0.2) | 32 (-2.3) | 46 (+5.3) | 57 (-0.4) | 28 (+0.2) | 16 (+0.2) | 26 (+0.0) | 5.6 (+0.0) | 0.28 (+0.1) | 54.1 (-0.5) |

_Tries 1.8 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.1 ↓ | 15.3 | 0.3 | 1.7 ↓ | 3.5 ↓ | 5.9 ↓ | 1.9 ↓ | 0.2 | 7.2 | 0.7 | 0.0 | 0.0 | 0.0 | 0.0 | 1.1 | 0.1 | 0.5 | 0.1 | 0.6 | 144.5 | 0.6 | 0.8 | 0.0 | 0.1 | 0.1 | 0.2 | 0.4 | 0.1 | 74.5 ✓ | 0.690 | 0.060 ↓ | 0.000 ↓ | 0.000 ✓ | 0.630 | 38% (18% drawn) | 37.5% (17.5% drawn) | 0.70 | 93%/93% |
| on (default) | 51.4 ↓ (+0.2) | 5.2 ↓ (+0.0) | 15.5 (+0.2) | 0.3 (-0.0) | 1.7 ↓ (-0.0) | 3.6 ↓ (+0.0) | 6.1 ↓ (+0.2) | 1.6 ↓ (-0.3) | 0.2 (+0.0) | 7.4 (+0.2) | 0.7 (-0.0) | 0.3 (+0.3*) | 29.0 (+29.0*) | 0.0 (+0.0) | 0.0 (+0.0) | 1.0 (-0.1) | 0.1 (+0.0) | 0.6 (+0.1) | 0.1 (+0.0) | 0.6 (+0.1) | 148.7 (+4.2) | 0.5 (-0.1) | 0.8 (+0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.4 (+0.1) | 0.1 (+0.0) | 74.7 ✓ (+0.1) | 0.760 (+0.1) | 0.060 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.700 (+0.1) | 33% (22% drawn) | 35.0% (20.0% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.23 | 73 | 11 | 0.4 | 10 | 0 | 5 | 6 | 34 | 46 | 65 | 22 | 12 | 27 | 5.5 | 0.72 | 55.0 |
| on (default) | 0.13 (-0.1) | 83 (+10.0) | 8 (-3.0) | 0.3 (-0.1) | 13 (+3.3) | 0 (+0.0) | 6 (+1.0) | 6 (-0.0) | 32 (-2.1) | 44 (-2.1) | 66 (+0.6) | 23 (+0.1) | 12 (-0.7) | 27 (-0.0) | 5.5 (+0.0) | 0.78 (+0.1) | 55.6 (+0.6) |

_Tries 1.9 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## all-out v balanced

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.8 ↓ | 6.2 ↓ | 16.6 | 0.3 | 3.2 ↓ | 3.9 ↓ | 4.8 ↓ | 2.2 ↓ | 0.3 | 7.2 | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 1.4 | 0.1 | 0.6 | 0.0 | 0.5 | 118.8 | 0.5 | 0.6 | 0.0 | 0.1 | 0.3 | 0.4 | 0.5 | 0.1 | 70.4 ✓ | 0.490 | 0.070 ↓ | 0.020 ↓ | 0.000 ✓ | 0.400 | 37% (18% drawn) | 45.5% (15.0% drawn) | 0.70 | 93%/93% |
| on (default) | 50.8 ↓ (+0.0) | 5.9 ↓ (-0.3) | 16.9 (+0.3) | 0.3 (-0.0) | 3.1 ↓ (-0.2) | 3.9 ↓ (+0.0) | 4.6 ↓ (-0.2) | 2.0 ↓ (-0.2) | 0.2 (-0.1) | 7.0 (-0.1) | 0.8 (-0.0) | 0.4 (+0.4*) | 30.0 (+30.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (-0.2) | 0.1 (+0.0) | 0.5 (-0.0) | 0.0 (+0.0) | 0.5 (+0.0) | 111.0 (-7.9) | 0.5 (-0.0) | 0.6 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.0) | 0.7 (+0.2) | 0.5 (+0.0) | 0.1 (+0.0) | 70.5 ✓ (+0.1) | 0.460 (-0.0) | 0.060 ↓ (-0.0) | 0.020 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.380 (-0.0) | 43% (14% drawn) | 47.0% (14.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 77 | 16 | 0.9 | 8 | 0 | 10 | 7 | 33 | 43 | 57 | 24 | 19 | 26 | 5.4 | 0.25 | 53.8 |
| on (default) | 0.25 (+0.0) | 79 (+2.0) | 17 (+1.0) | 0.8 (-0.0) | 8 (+0.2) | 0 (+0.0) | 11 (+0.9) | 7 (+0.1) | 34 (+1.5) | 40 (-2.7) | 55 (-2.6) | 25 (+0.6) | 21 (+2.0) | 26 (-0.3) | 5.4 (-0.0) | 0.26 (+0.0) | 53.4 (-0.4) |

_Tries 2.2 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.7 ↓ | 5.0 ↓ | 22.3 | 0.2 | 2.6 ↓ | 3.4 ↓ | 5.3 ↓ | 2.0 ↓ | 0.2 | 9.2 | 0.9 | 0.0 | 0.0 | 0.0 | 0.1 | 1.2 | 0.1 | 0.6 | 0.0 | 0.5 | 127.5 | 0.9 | 0.6 | 0.0 | 0.1 | 0.3 | 0.5 | 0.4 | 0.1 | 74.7 ✓ | 0.500 | 0.080 ↓ | 0.020 ↓ | 0.000 ✓ | 0.400 | 39% (21% drawn) | 39.5% (20.5% drawn) | 0.69 | 93%/93% |
| on (default) | 52.6 ↓ (-0.1) | 4.7 ↓ (-0.3) | 22.2 (-0.2) | 0.2 (+0.0) | 2.7 ↓ (+0.1) | 3.5 ↓ (+0.1) | 5.5 ↓ (+0.2) | 1.7 ↓ (-0.3) | 0.1 (-0.1) | 9.1 (-0.1) | 0.9 (-0.0) | 0.3 (+0.3*) | 24.0 (+24.0*) | 0.0 (+0.0) | 0.1 (-0.0) | 1.0 (-0.2) | 0.1 (+0.1) | 0.7 (+0.1) | 0.0 (+0.0) | 0.5 (+0.1) | 129.8 (+2.3) | 0.8 (-0.1) | 0.6 (-0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (-0.1) | 0.4 (-0.1) | 0.5 (+0.1) | 0.1 (-0.0) | 74.6 ✓ (-0.1) | 0.550 (+0.1) | 0.130 ↓ (+0.1) | 0.010 ↓ (-0.0) | 0.000 ✓ (+0.0) | 0.410 (+0.0) | 37% (28% drawn) | 39.0% (25.0% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 72 | 8 | 0.7 | 12 | 0 | 5 | 12 | 28 | 43 | 59 | 26 | 15 | 27 | 5.4 | 0.30 | 54.8 |
| on (default) | 0.25 (-0.0) | 78 (+6.0) | 8 (+0.0) | 0.5 (-0.2) | 17 (+5.6) | 0 (+0.0) | 5 (-0.8) | 7 (-4.8) | 28 (-0.2) | 43 (+0.2) | 61 (+1.6) | 24 (-1.6) | 15 (+0.0) | 27 (+0.1) | 5.4 (+0.0) | 0.29 (-0.0) | 55.4 (+0.6) |

_Tries 2.0 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## compressed v slide

_100 matches in this row (the plan's other rows use 20)._

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.4 ↓ | 5.9 ↓ | 16.1 | 0.3 | 2.4 ↓ | 3.8 ↓ | 5.2 ↓ | 1.9 ↓ | 0.2 | 6.8 | 0.7 | 0.0 | 0.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.8 | 0.0 | 0.3 | 131.0 | 0.5 | 0.9 | 0.0 | 0.0 | 0.0 | 0.1 | 0.3 | 0.1 | 72.8 ✓ | 0.460 | 0.090 ↓ | 0.010 ↓ | 0.000 ✓ | 0.360 | 45% (18% drawn) | 42.0% (17.0% drawn) | 0.70 | 93%/93% |
| on (default) | 51.2 ↓ (-0.2) | 5.6 ↓ (-0.3) | 16.0 (-0.1) | 0.3 (+0.0) | 2.2 ↓ (-0.2) | 3.7 ↓ (-0.1) | 5.4 ↓ (+0.3) | 1.8 ↓ (-0.2) | 0.2 (+0.0) | 6.7 (-0.1) | 0.6 (-0.1) | 0.3 (+0.3*) | 29.0 (+29.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (+0.1) | 0.8 (+0.1) | 0.0 (+0.0) | 0.4 (+0.1) | 132.1 (+1.1) | 0.5 (-0.0) | 0.8 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.1 (+0.0) | 0.3 (-0.0) | 0.1 (+0.0) | 73.4 ✓ (+0.6) | 0.560 (+0.1) | 0.080 ↓ (-0.0) | 0.030 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (+0.1) | 45% (22% drawn) | 42.5% (20.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 83 | 19 | 0.8 | 11 | 0 | 5 | 7 | 31 | 46 | 61 | 25 | 14 | 27 | 5.5 | 0.22 | 56.0 |
| on (default) | 0.28 (+0.0) | 90 (+7.0) | 18 (-1.0) | 0.8 (-0.1) | 11 (+0.5) | 0 (+0.0) | 5 (+0.5) | 6 (-1.6) | 30 (-1.0) | 48 (+1.6) | 63 (+1.8) | 24 (-1.3) | 14 (-0.5) | 27 (-0.1) | 5.4 (-0.0) | 0.26 (+0.0) | 55.6 (-0.4) |

_Tries 1.9 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.0 ↓ | 6.2 ↓ | 16.2 | 0.7 | 2.0 ↓ | 3.0 ↓ | 4.5 ↓ | 1.6 ↓ | 0.1 | 5.9 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 | 1.1 | 0.3 | 0.5 | 0.0 | 0.1 | 128.1 | 0.6 | 0.8 | 0.0 | 0.1 | 0.2 | 0.3 | 0.5 | 0.0 | 72.7 ✓ | 0.300 | 0.100 ↓ | 0.000 ↓ | 0.000 ✓ | 0.200 | 65% (15% drawn) | 0.70 | 93%/92% |
| on (default) | 52.6 ↓ (+0.6) | 5.5 ↓ (-0.7) | 15.7 (-0.5) | 0.8 (+0.1) | 2.4 ↓ (+0.3) | 3.1 ↓ (+0.1) | 4.8 ↓ (+0.3) | 1.4 ↓ (-0.3) | 0.2 (+0.1) | 5.8 (-0.1) | 0.5 (-0.0) | 0.3 (+0.3*) | 30.0 (+30.0*) | 0.0 (+0.0) | 0.0 (+0.0) | 0.9 (-0.2) | 0.3 (+0.0) | 0.6 (+0.1) | 0.0 (+0.0) | 0.1 (+0.1) | 136.1 (+8.0) | 0.5 (-0.1) | 0.8 (+0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.0) | 0.5 (-0.0) | 0.0 (+0.0) | 73.1 ✓ (+0.5) | 0.500 (+0.2) | 0.100 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.400 (+0.2) | 60% (20% drawn) | 0.71 | 92%/92% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.10 | 80 | 25 | 0.2 | 6 | 0 | 3 | 18 | 30 | 42 | 55 | 31 | 14 | 27 | 5.4 | 0.10 | 55.4 |
| on (default) | 0.15 (+0.0) | 80 (+0.0) | 30 (+5.0) | 0.3 (+0.0) | 7 (+1.3) | 0 (+0.0) | 4 (+0.7) | 11 (-7.1) | 30 (-0.7) | 48 (+5.7) | 57 (+1.5) | 30 (-0.8) | 13 (-0.7) | 27 (+0.3) | 5.4 (+0.0) | 0.30 (+0.2) | 54.9 (-0.5) |

_Tries 1.6 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## fliers v stayers

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.3 ↓ | 7.8 ↓ | 16.9 | 0.1 | 1.3 ↓ | 4.2 ↓ | 5.0 ↓ | 2.4 ↓ | 0.1 | 6.7 | 0.9 | 0.0 | 0.0 | 0.0 | 0.1 | 1.3 | 0.1 | 0.3 | 0.0 | 0.5 | 123.6 | 0.3 | 0.7 | 0.1 | 0.0 | 0.0 | 0.0 | 0.5 | 0.2 | 70.9 ✓ | 0.550 | 0.050 ↓ | 0.000 ↓ | 0.000 ✓ | 0.500 | 55% | 0.70 | 91%/93% |
| on (default) | 50.2 ↓ (-1.0) | 8.4 ↓ (+0.6) | 16.6 (-0.3) | 0.1 (+0.0) | 1.3 ↓ (+0.0) | 4.0 ↓ (-0.2) | 5.3 ↓ (+0.3) | 2.4 ↓ (+0.0) | 0.3 (+0.1) | 6.4 (-0.3) | 0.9 (+0.0) | 0.3 (+0.3*) | 30.0 (+30.0*) | 0.0 (+0.0) | 0.1 (+0.0) | 1.3 (+0.0) | 0.0 (-0.1) | 0.4 (+0.1) | 0.0 (+0.0) | 0.5 (+0.0) | 126.6 (+3.0) | 0.3 (-0.0) | 0.7 (+0.0) | 0.0 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.0 (+0.0) | 0.7 (+0.2) | 0.2 (+0.0) | 72.0 ✓ (+1.1) | 0.650 (+0.1) | 0.050 ↓ (+0.0) | 0.050 ✓ (+0.1) | 0.000 ✓ (+0.0) | 0.550 (+0.1) | 65% (5% drawn) | 0.71 | 92%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.40 | 75 | 15 | 1.3 | 4 | 0 | 2 | 8 | 27 | 58 | 60 | 27 | 13 | 27 | 5.3 | 0.10 | 55.0 |
| on (default) | 0.30 (-0.1) | 65 (-10.0) | 20 (+5.0) | 0.8 (-0.5) | 4 (-0.0) | 0 (+0.0) | 4 (+2.1) | 8 (-0.0) | 33 (+6.2) | 50 (-8.3) | 64 (+4.5) | 23 (-4.2) | 13 (-0.2) | 27 (+0.2) | 5.4 (+0.0) | 0.25 (+0.1) | 54.5 (-0.4) |

_Tries 2.4 and last tackles 8.1 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## last 6 min on late legs

_6-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.5 ↓ | 4.2 ↓ | 15.8 | 2.6 | 1.7 ↓ | 4.1 ↓ | 5.8 ↓ | 1.8 ↓ | 0.1 | 5.0 | 0.5 | 0.0 | 0.0 | 4.3 | 9.9 | 1.0 | 0.0 | 0.8 | 0.1 | 0.2 | 151.5 | 0.5 | 0.3 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 70.8 ✓ | 0.417 | 0.042 ↓ | 0.000 ↓ | 0.000 ✓ | 0.375 | 40% (20% drawn) | 0.67 | 51%/51% |
| on (default) | 51.9 ↓ (+0.4) | 3.8 ↓ (-0.5) | 15.0 (-0.8) | 3.0 (+0.4) | 1.8 ↓ (+0.1) | 3.8 ↓ (-0.3) | 5.9 ↓ (+0.1) | 1.3 ↓ (-0.5) | 0.1 (-0.0) | 5.2 (+0.3) | 0.4 (-0.1) | 0.3 (+0.3*) | 30.0 (+30.0*) | 4.8 (+0.6) | 9.3 (-0.6) | 0.9 (-0.2) | 0.1 (+0.0) | 0.6 (-0.2) | 0.2 (+0.0) | 0.4 (+0.2) | 152.5 (+1.0) | 0.6 (+0.1) | 0.3 (+0.0) | 0.0 (-0.0) | 0.1 (+0.0) | 0.2 (+0.0) | 0.3 (+0.0) | 0.5 (-0.1) | 0.1 (+0.0) | 71.5 ✓ (+0.7) | 0.583 (+0.2) | 0.000 ↓ (-0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.583 (+0.2) | 25% (30% drawn) | 0.67 | 49%/50% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.13 | 65 | 10 | 0.1 | 14 | 0 | 5 | 9 | 37 | 35 | 62 | 24 | 14 | 26 | 5.8 | 0.13 | 54.3 |
| on (default) | 0.21 (+0.1) | 70 (+5.0) | 10 (+0.0) | 0.5 (+0.4) | 13 (-1.5) | 0 (+0.0) | 3 (-1.5) | 16 (+6.3) | 31 (-6.0) | 37 (+2.6) | 63 (+1.0) | 21 (-3.0) | 16 (+2.1) | 27 (+0.7) | 5.7 (-0.1) | 0.13 (+0.0) | 56.5 (+2.3) |

_Tries 1.8 and last tackles 9.2 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_26 cells in 492 s._
