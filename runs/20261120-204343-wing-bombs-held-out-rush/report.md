# Balance: wing bombs held-out rush

Repeat the published #756 Rush v Slide default fixture on the current wing-bomb commit, using identical held-out seeds 1001–1200 in both orientations.

**commit** 93589210 · **branch** HEAD · **started** 2026-11-20T20:43:43.940Z

200 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## rush v slide

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.2 ↓ | 5.0 ↓ | 21.1 | 0.1 | 2.8 ↓ | 3.6 ↓ | 5.6 ↓ | 1.8 ↓ | 0.1 | 9.3 | 0.8 | 0.4 | 29.0 | 0.0 | 0.1 | 1.1 | 0.1 | 0.6 | 0.0 | 0.5 | 139.4 | 0.8 | 0.6 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 73.2 ✓ | 0.695 | 0.095 ↓ | 0.035 ↓ | 0.000 ✓ | 0.565 | 42% (19% drawn) | 40.0% (17.5% drawn) | 0.68 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.26 | 80 | 14 | 0.7 | 12 | 0 | 5 | 9 | 34 | 41 | 62 | 23 | 15 | 27 | 5.5 | 0.38 | 55.0 |

_Tries 1.8 and last tackles 8.5 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

**Changed since the previous run:** nothing beyond noise.

_1 cells in 65 s._

### Held-out Rush v Slide

Rush was tracked on seeds 1001–1200, both orientations, for 400 matches on the same defaults and fixture as the published #756 held-out run. The full standard check uses seeds 1–100 in both orientations, 200 matches.

| Cohort | Engine | Outright win | Draws | Points share |
|---|---|---:|---:|---:|
| Standard | Wing bombs default | 31.50% | 18.00% | 40.50% |
| Held out | #756 default | 40.50% | 17.50% | 49.25% |
| Held out | Wing bombs default | 40.00% | 17.50% | 48.75% |

Held-out points share changed by -0.50 percentage points. The combined aggregate standard error is 3.21 points, and the 95% normal interval is [-6.80, +5.80]. The original held-out harness output stores cell aggregates, so this uses the harness convention without a seed-paired estimate. Preregistered timestamp 2026-11-20 20:42:54 UTC.

[Published #756 held-out benchmark](../20261120-114448-ordinary-long-kick-space-held-out-presets/report.md) · [Full standard report](../20261120-203708-ordinary-wing-bombs-on-v-off-standard-close-range/report.md)
