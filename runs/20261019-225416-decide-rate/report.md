# Balance: decide rate

N9.1 speed: players re-pick targets at 10 Hz (baseline, live.decideEveryTicks 2) or 20 Hz (1, as before). What does the slower decision rate cost in play, and where?

**commit** 0bb243c (uncommitted changes) · **branch** perf/headless-100ms · **started** 2026-10-19T22:54:16.675Z

40 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 185.7 ✓ | 16.1 ✓ | 60.8 | 3.7 | 8.9 ✓ | 13.5 ✓ | 21.8 ✓ | 6.0 ✓ | 0.5 | 24.8 | 2.4 | 0.0 | 5.2 | 3.0 | 0.1 | 1.9 | 0.1 | 2.7 | 540.9 | 1.6 | 2.4 | 0.0 | 0.3 | 1.0 | 1.0 | 1.7 | 0.2 | 67.8 ↓ | 50% | 0.68 | 77%/77% |
| 20 Hz decisions | 190.6 ✓ (+4.9*) | 19.7 ✓ (+3.6*) | 60.8 (+0.1) | 3.0 (-0.7) | 9.2 ✓ (+0.2) | 12.4 ✓ (-1.1) | 22.6 ✓ (+0.8) | 6.4 ✓ (+0.4) | 0.3 (-0.2) | 25.5 (+0.8) | 3.1 (+0.8*) | 0.0 (+0.0) | 5.6 (+0.4) | 3.3 (+0.3) | 0.1 (+0.0) | 2.4 (+0.4) | 0.1 (+0.0) | 2.4 (-0.3) | 578.2 (+37.3) | 2.1 (+0.5) | 2.1 (-0.3) | 0.0 (+0.0) | 0.2 (-0.1) | 1.0 (-0.1) | 0.9 (-0.1) | 1.8 (+0.1) | 0.3 (+0.1) | 70.1 ✓ (+2.3) | 38% (5% drawn) | 0.67 | 75%/76% |

## all-out v balanced

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 175.6 ✓ | 16.3 ✓ | 60.2 | 3.0 | 12.4 ✓ | 13.9 ✓ | 19.6 ↓ | 5.5 ✓ | 0.4 | 24.0 | 2.1 | 0.0 | 4.4 | 3.0 | 0.1 | 1.6 | 0.1 | 2.8 | 502.3 | 1.9 | 2.3 | 0.0 | 0.3 | 1.2 | 1.3 | 1.1 | 0.3 | 63.1 ↓ | 38% | 0.69 | 74%/74% |
| 20 Hz decisions | 181.3 ✓ (+5.7*) | 20.3 ✓ (+4.1*) | 59.1 (-1.1) | 2.4 (-0.5) | 13.0 ✓ (+0.6) | 14.2 ✓ (+0.3) | 20.8 ✓ (+1.2) | 6.0 ✓ (+0.5) | 0.3 (-0.1) | 24.8 (+0.8) | 2.4 (+0.2) | 0.0 (+0.0) | 5.0 (+0.7) | 3.3 (+0.3) | 0.0 (-0.1) | 2.3 (+0.6*) | 0.1 (+0.0) | 3.3 (+0.6) | 519.0 (+16.7) | 1.7 (-0.2) | 1.9 (-0.4) | 0.0 (+0.0) | 0.2 (-0.1) | 0.9 (-0.3) | 0.8 (-0.5) | 1.8 (+0.7*) | 0.4 (+0.1) | 65.3 ↓ (+2.2) | 48% | 0.67 | 73%/75% |

## expansive v grind

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 183.4 ✓ | 15.2 ✓ | 56.6 | 3.5 | 6.2 ↓ | 13.4 ✓ | 22.3 ✓ | 5.5 ✓ | 0.4 | 24.1 | 2.0 | 0.0 | 5.4 | 2.9 | 0.1 | 2.2 | 0.1 | 2.5 | 579.8 | 1.8 | 1.9 | 0.0 | 0.1 | 0.4 | 0.7 | 1.5 | 0.2 | 66.9 ↓ | 28% (5% drawn) | 0.68 | 76%/77% |
| 20 Hz decisions | 189.0 ✓ (+5.5*) | 18.5 ✓ (+3.3*) | 56.0 (-0.6) | 3.0 (-0.5) | 8.0 ✓ (+1.8*) | 13.1 ✓ (-0.3) | 23.2 ✓ (+0.9) | 5.4 ✓ (-0.1) | 0.3 (-0.0) | 25.8 (+1.6) | 2.8 (+0.8*) | 0.0 (+0.0) | 5.8 (+0.4) | 3.3 (+0.4) | 0.1 (+0.0) | 2.0 (-0.2) | 0.1 (+0.0) | 2.6 (+0.1) | 614.3 (+34.5) | 1.8 (+0.1) | 2.4 (+0.5) | 0.0 (+0.0) | 0.2 (+0.1) | 0.7 (+0.3) | 1.4 (+0.7) | 1.9 (+0.4) | 0.3 (+0.1) | 68.2 ↓ (+1.3) | 38% (3% drawn) | 0.67 | 74%/74% |

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 184.9 ✓ | 16.2 ✓ | 60.4 | 3.8 | 9.3 ✓ | 13.3 ✓ | 21.8 ✓ | 6.0 ✓ | 0.3 | 25.2 | 2.2 | 0.0 | 4.9 | 3.0 | 0.1 | 2.0 | 0.2 | 2.5 | 549.3 | 2.1 | 2.1 | 0.0 | 0.3 | 1.0 | 0.4 | 1.8 | 0.3 | 68.8 ↓ | 70% (5% drawn) | 0.68 | 76%/76% |
| 20 Hz decisions | 190.7 ✓ (+5.8*) | 18.9 ✓ (+2.7*) | 61.5 (+1.1) | 3.9 (+0.1) | 9.7 ✓ (+0.4) | 12.5 ✓ (-0.8) | 22.7 ✓ (+0.9) | 6.1 ✓ (+0.2) | 0.4 (+0.1) | 26.4 (+1.2) | 2.6 (+0.4) | 0.0 (+0.0) | 5.6 (+0.7) | 3.3 (+0.2) | 0.0 (-0.0) | 2.1 (+0.1) | 0.3 (+0.0) | 2.5 (+0.0) | 591.0 (+41.8) | 1.9 (-0.2) | 1.8 (-0.4) | 0.0 (+0.0) | 0.2 (-0.0) | 1.1 (+0.0) | -0.3 (-0.7) | 1.6 (-0.2) | 0.3 (+0.0) | 70.1 ✓ (+1.3) | 75% (3% drawn) | 0.67 | 76%/75% |

_8 cells in 170 s._
