# Balance: kick-chase step

On seeds 10001-10200, where kick-chase won 41.8% with the break rule on the other side, does always stepping (step 1), fewer grubbers, or more offloads in the red zone bring Side win into the middle of 45-55% without giving up the kicks?

**commit** 511ea26 (uncommitted changes) · **branch** cursor/break-rule-710a · **started** 2026-10-24T13:52:45.060Z

200 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## kick-chase v balanced

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 195.5 ✓ | 18.6 ✓ | 62.8 | 2.7 | 8.6 ✓ | 13.2 ✓ | 24.1 ✓ | 5.4 ✓ | 0.4 | 28.8 | 2.7 | 0.0 | 6.3 | 3.0 | 0.0 | 1.9 | 0.1 | 3.6 | 611.5 | 2.3 | 2.0 | 0.0 | 0.3 | 1.1 | 1.1 | 1.9 | 0.4 | 69.8 ↓ | 42% (9% drawn) | 41.8% (6.5% drawn) | 0.66 | 76%/75% |
| step 1 | 195.4 ✓ (-0.1) | 18.2 ✓ (-0.4) | 64.5 (+1.7) | 2.9 (+0.2) | 8.1 ✓ (-0.5) | 13.3 ✓ (+0.1) | 23.6 ✓ (-0.4) | 5.6 ✓ (+0.2) | 0.3 (-0.1) | 28.7 (-0.1) | 2.9 (+0.2) | 0.0 (+0.0) | 5.9 (-0.3) | 3.0 (+0.0) | 0.0 (+0.0) | 2.3 (+0.3*) | 0.1 (+0.0) | 3.2 (-0.4*) | 604.9 (-6.6) | 2.3 (+0.0) | 2.1 (+0.1) | 0.0 (+0.0) | 0.3 (-0.0) | 1.1 (+0.0) | 1.2 (+0.1) | 1.8 (-0.2) | 0.4 (+0.0) | 69.5 ↓ (-0.3) | 42% (6% drawn) | 45.5% (6.8% drawn) | 0.66 | 75%/75% |
| grubber 0.6 | 195.7 ✓ (+0.2) | 18.3 ✓ (-0.2) | 62.7 (-0.1) | 2.6 (-0.1) | 8.7 ✓ (+0.1) | 13.1 ✓ (-0.1) | 24.1 ✓ (+0.1) | 5.4 ✓ (+0.1) | 0.4 (+0.0) | 28.5 (-0.3) | 2.6 (-0.0) | 0.0 (+0.0) | 5.9 (-0.3) | 3.1 (+0.1) | 0.0 (-0.0) | 2.1 (+0.2) | 0.1 (+0.0) | 3.2 (-0.4) | 612.1 (+0.6) | 2.3 (+0.0) | 2.1 (+0.1) | 0.0 (+0.0) | 0.2 (-0.0) | 1.1 (-0.0) | 0.7 (-0.4) | 1.8 (-0.2) | 0.4 (-0.0) | 70.0 ✓ (+0.2) | 43% (7% drawn) | 43.3% (5.0% drawn) | 0.66 | 75%/75% |
| step 1, grubber 0.6 | 195.1 ✓ (-0.4) | 18.2 ✓ (-0.4) | 64.6 (+1.9) | 2.9 (+0.2) | 7.9 ↓ (-0.8*) | 13.1 ✓ (-0.1) | 23.7 ✓ (-0.3) | 5.8 ✓ (+0.4) | 0.3 (-0.0) | 28.6 (-0.2) | 2.8 (+0.1) | 0.0 (+0.0) | 5.8 (-0.5*) | 3.1 (+0.2) | 0.0 (-0.0) | 2.3 (+0.4*) | 0.1 (+0.0) | 3.0 (-0.6*) | 601.0 (-10.5) | 2.2 (-0.0) | 2.1 (+0.1) | 0.0 (-0.0) | 0.2 (-0.0) | 1.0 (-0.1) | 1.1 (+0.1) | 1.6 (-0.3*) | 0.4 (+0.0) | 69.8 ↓ (+0.0) | 42% (5% drawn) | 47.3% (6.5% drawn) | 0.66 | 75%/75% |
| red zone offload 1.4 | 194.8 ✓ (-0.7) | 18.4 ✓ (-0.2) | 63.3 (+0.5) | 2.6 (-0.1) | 8.9 ✓ (+0.2) | 13.1 ✓ (-0.0) | 24.0 ✓ (-0.1) | 5.5 ✓ (+0.2) | 0.5 (+0.1) | 28.6 (-0.2) | 2.6 (-0.0) | 0.0 (+0.0) | 6.2 (-0.1) | 3.2 (+0.2) | 0.0 (-0.0) | 2.1 (+0.2) | 0.1 (+0.0) | 3.3 (-0.3) | 611.8 (+0.3) | 2.3 (+0.0) | 2.1 (+0.1) | 0.0 (+0.0) | 0.2 (-0.1) | 0.9 (-0.2) | 0.8 (-0.3) | 1.8 (-0.1) | 0.4 (+0.0) | 69.7 ↓ (-0.1) | 45% (7% drawn) | 44.8% (5.5% drawn) | 0.66 | 75%/75% |

_5 cells in 543 s._
