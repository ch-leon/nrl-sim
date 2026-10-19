# Balance: offloads check

N9.1: did the speed work (hypot to sqrt, scalar steering) move offloads, or was the standard plan's drop the seed reshuffle? 60 whole matches a row, run on main and on the branch.

**commit** 0bb243c · **branch** perf/headless-100ms · **started** 2026-10-19T23:02:03.562Z

60 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 192.1 ✓ | 19.3 ✓ | 61.0 | 3.4 | 10.2 ✓ | 12.4 ✓ | 21.2 ✓ | 6.3 ✓ | 0.4 | 25.3 | 3.0 | 0.0 | 5.4 | 3.2 | 0.0 | 2.1 | 0.2 | 2.5 | 533.6 | 2.0 | 2.4 | 0.1 | 0.3 | 1.1 | 1.4 | 1.8 | 0.3 | 69.0 ↓ | 45% | 0.67 | 75%/75% |

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.4 ✓ | 17.9 ✓ | 55.4 | 2.9 | 8.3 ✓ | 13.2 ✓ | 22.6 ✓ | 5.4 ✓ | 0.4 | 26.7 | 2.3 | 0.0 | 5.6 | 3.0 | 0.1 | 2.2 | 0.1 | 2.6 | 595.1 | 1.9 | 2.2 | 0.0 | 0.2 | 0.9 | 0.9 | 1.5 | 0.3 | 67.4 ↓ | 43% (8% drawn) | 0.67 | 75%/75% |

_2 cells in 96 s._
