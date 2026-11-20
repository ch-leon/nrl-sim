# Balance: ordinary long kick space held-out presets

#650 held-out check: rerun the standard Kick-chase v Balanced and Rush v Slide fixtures, with unchanged gameplay, on disjoint seeds 1001–1200 both ways for default versus longKick.on 0.

**commit** f5474ea4 · **branch** HEAD · **started** 2026-11-20T11:44:48.117Z

200 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## kick-chase v balanced

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.2 ↓ | 5.0 ↓ | 16.0 | 0.2 | 2.2 ↓ | 3.4 ↓ | 6.0 ↓ | 1.7 ↓ | 0.1 | 6.9 | 0.7 | 0.3 | 24.5 | 0.0 | 0.1 | 0.9 | 0.1 | 0.4 | 0.0 | 0.6 | 144.2 | 0.4 | 0.7 | 0.0 | 0.1 | 0.1 | 0.2 | 0.4 | 0.1 | 74.0 ✓ | 0.690 | 0.075 ↓ | 0.005 ↓ | 0.000 ✓ | 0.610 | 43% (16% drawn) | 41.8% (17.3% drawn) | 0.71 | 93%/93% |
| open-side target off | 51.5 ↓ (+0.3) | 5.0 ↓ (-0.1) | 16.0 (+0.0) | 0.3 (+0.0) | 2.1 ↓ (-0.0) | 3.4 ↓ (-0.0) | 6.0 ↓ (+0.0) | 1.6 ↓ (-0.1) | 0.1 (+0.0) | 7.1 (+0.1) | 0.6 (-0.1) | 0.3 (-0.0) | 23.0 (-1.5) | 0.0 (+0.0) | 0.1 (+0.0) | 0.8 (-0.1) | 0.1 (-0.0) | 0.4 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 144.0 (-0.1) | 0.4 (-0.0) | 0.7 (+0.0) | 0.0 (-0.0) | 0.0 (-0.0) | 0.1 (-0.0) | 0.1 (-0.1) | 0.3 (-0.0) | 0.1 (+0.0) | 74.4 ✓ (+0.3) | 0.705 (+0.0) | 0.080 ↓ (+0.0) | 0.015 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.610 (+0.0) | 39% (24% drawn) | 39.0% (21.5% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.24 | 81 | 20 | 0.8 | 10 | 0 | 4 | 4 | 37 | 45 | 65 | 22 | 13 | 27 | 5.4 | 0.71 | 54.3 |
| open-side target off | 0.21 (-0.0) | 80 (-1.5) | 12 (-7.5*) | 0.7 (-0.2) | 12 (+1.7) | 0 (+0.0) | 5 (+0.5) | 4 (+0.5) | 36 (-1.1) | 43 (-1.7) | 64 (-0.9) | 22 (+0.5) | 14 (+0.4) | 27 (+0.1) | 5.3 (-0.0) | 0.76 (+0.0) | 54.9 (+0.6) |

_Tries 1.7 and last tackles 8.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## rush v slide

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.1 ↓ | 5.0 ↓ | 21.1 | 0.1 | 2.8 ↓ | 3.6 ↓ | 5.5 ↓ | 1.8 ↓ | 0.1 | 9.2 | 0.8 | 0.4 | 29.5 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.6 | 139.1 | 0.8 | 0.6 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 73.4 ✓ | 0.690 | 0.100 ↓ | 0.025 ↓ | 0.000 ✓ | 0.565 | 42% (19% drawn) | 40.5% (17.5% drawn) | 0.69 | 93%/93% |
| open-side target off | 52.3 ↓ (+0.2) | 5.0 ↓ (+0.0) | 21.4 (+0.3) | 0.2 (+0.1) | 2.7 ↓ (-0.1) | 3.5 ↓ (-0.0) | 5.5 ↓ (-0.1) | 1.8 ↓ (+0.0) | 0.1 (-0.0) | 9.2 (-0.1) | 0.8 (+0.0) | 0.3 (-0.0) | 25.5 (-4.0) | 0.0 (+0.0) | 0.1 (+0.0) | 1.0 (-0.1) | 0.1 (-0.0) | 0.6 (+0.0) | 0.0 (+0.0) | 0.6 (+0.0) | 136.8 (-2.3) | 0.8 (-0.0) | 0.6 (-0.0) | 0.0 (+0.0) | 0.1 (-0.0) | 0.1 (-0.0) | 0.0 (-0.1) | 0.5 (-0.0) | 0.1 (+0.0) | 73.5 ✓ (+0.2) | 0.645 (-0.0) | 0.100 ↓ (+0.0) | 0.025 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.520 (-0.0) | 38% (18% drawn) | 39.0% (17.8% drawn) | 0.69 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.25 | 79 | 14 | 0.7 | 12 | 0 | 5 | 8 | 33 | 42 | 62 | 23 | 15 | 26 | 5.5 | 0.38 | 54.8 |
| open-side target off | 0.24 (-0.0) | 79 (+0.0) | 13 (-1.5) | 0.7 (-0.0) | 13 (+1.0) | 0 (+0.0) | 5 (-0.0) | 8 (-0.3) | 32 (-0.8) | 42 (+0.2) | 61 (-1.0) | 25 (+1.6) | 14 (-0.6) | 26 (-0.2) | 5.5 (-0.0) | 0.36 (-0.0) | 54.4 (-0.5) |

_Tries 1.8 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 350 s._
## Held-out preset checks

Each fixture uses the same 200 seed IDs per variant in each orientation. All four cells finished, for 400 matches per cell and 1,600 matches overall. The full tables above show the written orientation for ordinary counts. The points shares below use both orientations and count a draw as half a win. The 95% intervals are normal approximations from the harness’s match-level standard errors. The delta uses the two variant errors in quadrature and does not account for dependence between seeds reused across variants or orientations. Only cell aggregates were written. [Held-out preregistration](preregistration.md) · [Original standard report](../20261120-113829-ordinary-long-kick-space-on-v-off-standard/report.md)

| Preset | Wins off → default | Draws off → default | Points share off [95% interval] | Points share default [95% interval] | Default − off [95% interval], pp | Combined SE, pp | 42–58% point estimate off → default |
|---|---:|---:|---:|---:|---:|---:|---|
| kick-chase v balanced | 39.00% → 41.75% | 21.50% → 17.25% | 49.750 [45.403, 54.097]% | 50.375 [45.912, 54.838]% | +0.625 [-5.605, +6.855] | 3.18 | inside → inside |
| rush v slide | 39.00% → 40.50% | 17.75% → 17.50% | 47.875 [43.430, 52.320]% | 49.250 [44.794, 53.706]% | +1.375 [-4.918, +7.668] | 3.21 | inside → inside |

### Match outcomes and §7 bands

The published count bands were calibrated on 14-minute matches. These fixtures use two 2.5-minute halves. An asterisk marks a difference over two combined standard errors under the harness rule.

| Fixture | Tries | Kicks | Kick metres | Completion % | Set start m to go | Touch finds | 40/20s |
|---|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v balanced | 1.6 → 1.7 | 6.0 → 6.0 | 144.0 → 144.2 | 74.4 → 74.0 | 54.9 → 54.3 | 0.4 → 0.4 | 0.0 → 0.0 |
| rush v slide | 1.8 → 1.8 | 5.5 → 5.5 | 136.8 → 139.1 | 73.5 → 73.4 | 54.4 → 54.8 | 0.6 → 0.6 | 0.0 → 0.0 |

- kick-chase v balanced inherited off-band readings in both variants for tackles, lineBreaks, offloads, errors, kicks, tries, grubberTries, grubberRepeats.
- kick-chase v balanced had no §7 band crossings.
- rush v slide inherited off-band readings in both variants for tackles, lineBreaks, offloads, errors, kicks, tries, grubberTries, grubberRepeats.
- rush v slide had no §7 band crossings.

### Interpretation

Both presets were inside the revised 42–58% points-share range with either setting. The held-out estimates do not reproduce the original sample’s lower Rush reading or the negative Kick-chase estimate. Both aggregate change intervals include several percentage points in either direction. The original 41.25% Rush result remains part of the evidence. Against the legacy 45–55% range, both default points shares are inside and both outright win shares remain below 45%, including in the off sample.

None of the selected match outcomes in the table changed beyond two combined standard errors. The full watchability table flags a secondary increase in Kick-chase matches decided in the final minute, from 12.0% to 19.5% in the written orientation. It is one of the report’s several dozen comparisons. No §7 band crossed. The five-minute format still reads below several 14-minute count bands in both settings.
