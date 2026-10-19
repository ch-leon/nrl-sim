# Balance: offloads check

N9.1: did the speed work (hypot to sqrt, scalar steering) move offloads, or was the standard plan's drop the seed reshuffle? 60 whole matches a row, run on main and on the branch.

**commit** 0bb243c (uncommitted changes) · **branch** perf/headless-100ms · **started** 2026-10-19T23:02:53.948Z

60 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.4 ✓ | 20.0 ✓ | 60.5 | 3.2 | 9.5 ✓ | 12.8 ✓ | 22.4 ✓ | 6.5 ✓ | 0.3 | 25.6 | 2.9 | 0.0 | 5.3 | 3.4 | 0.1 | 2.4 | 0.1 | 2.5 | 576.8 | 1.9 | 2.1 | 0.0 | 0.2 | 0.9 | 0.8 | 1.9 | 0.2 | 69.3 ↓ | 47% (5% drawn) | 0.67 | 75%/75% |

**Changed since the previous run:** baseline: kickMetres 533.6 → 576.8 (+43.3*)

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.6 ✓ | 17.7 ✓ | 55.7 | 3.0 | 7.8 ↓ | 13.2 ✓ | 23.0 ✓ | 5.4 ✓ | 0.4 | 26.0 | 2.5 | 0.0 | 5.7 | 3.3 | 0.1 | 2.2 | 0.1 | 2.8 | 604.8 | 1.9 | 2.3 | 0.0 | 0.2 | 0.8 | 1.5 | 1.9 | 0.3 | 67.8 ↓ | 43% (5% drawn) | 0.67 | 74%/75% |

**Changed since the previous run:** nothing beyond noise.

_2 cells in 61 s._
