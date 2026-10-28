# Balance: kickoff depth

#397 stage 2 (balance/plans/kickoff-depth.md): does the deeper default kick-off (the receivers' 15–8 m line by the kicker's Skill, 35–42 m from halfway, instead of their 24 m line, about 26 m) keep points, tries, completion and possession inside the §7 bands, for even sides, a rating gap and the attacking and defence styles? Baseline is today's kick-off (kickoff.deepDefault 0); the variant turns the deeper default on. No coach calls.

**commit** a110ca2 (uncommitted changes) · **branch** claude/kickoffs-397 · **started** 2026-10-28T12:35:04.878Z

100 matches per row, whole matches (two 7:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

_400 matches in this row (the plan's other rows use 100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.3 ✓ | 14.9 ✓ | 45.5 | 2.4 | 7.5 ✓ | 10.3 ✓ | 17.6 ✓ | 5.1 ✓ | 0.3 | 20.3 | 2.0 | 0.0 | 4.5 | 2.6 | 0.0 | 1.8 | 0.1 | 1.2 | 440.8 | 1.6 | 1.8 | 0.0 | 0.2 | 0.5 | 0.5 | 1.4 | 0.2 | 69.8 ↓ | 1.955 | 0.270 ✓ | 0.065 ✓ | 0.000 ✓ | 1.620 | 51% (5% drawn) | 0.67 | 72%/72% |
| deeper default | 149.5 ✓ (+0.2) | 14.1 ✓ (-0.9*) | 45.3 (-0.2) | 2.4 (+0.0) | 7.3 ✓ (-0.2) | 10.2 ✓ (-0.2) | 17.6 ✓ (-0.0) | 5.5 ✓ (+0.4*) | 0.3 (+0.0) | 20.5 (+0.2) | 2.0 (-0.0) | 0.0 (-0.0) | 4.6 (+0.1) | 3.0 (+0.4*) | 0.0 (+0.0) | 2.0 (+0.1) | 0.1 (+0.0) | 1.3 (+0.1) | 443.3 (+2.6) | 1.5 (-0.1) | 1.7 (-0.1) | 0.0 (+0.0) | 0.2 (+0.0) | 0.6 (+0.2) | 0.7 (+0.2) | 1.3 (-0.0) | 0.3 (+0.0) | 69.8 ↓ (-0.0) | 1.968 (+0.0) | 0.297 ✓ (+0.0) | 0.043 ↓ (-0.0) | 0.003 ✓ (+0.0) | 1.625 (+0.0) | 42% (6% drawn) | 0.66 | 73%/73% |

## 70 v 50

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 148.1 ✓ | 15.7 ✓ | 47.2 | 2.9 | 7.7 ✓ | 10.2 ✓ | 17.2 ✓ | 5.2 ✓ | 0.3 | 20.3 | 1.9 | 0.0 | 4.5 | 3.0 | 0.0 | 1.7 | 0.1 | 1.3 | 436.5 | 1.5 | 1.9 | 0.0 | 0.2 | 0.8 | 1.2 | 1.4 | 0.2 | 69.0 ↓ | 1.940 | 0.200 ✓ | 0.030 ↓ | 0.010 ✓ | 1.700 | 70% (5% drawn) | 0.67 | 73%/72% |
| deeper default | 148.8 ✓ (+0.7) | 14.7 ✓ (-1.0) | 47.2 (-0.1) | 2.7 (-0.2) | 7.3 ✓ (-0.4) | 10.2 ✓ (-0.0) | 17.2 ✓ (+0.0) | 6.1 ✓ (+0.8*) | 0.5 (+0.1) | 20.5 (+0.2) | 1.8 (-0.2) | 0.0 (+0.0) | 3.9 (-0.7*) | 3.4 (+0.4) | 0.0 (+0.0) | 1.8 (+0.1) | 0.1 (-0.0) | 1.3 (+0.0) | 435.5 (-1.0) | 1.5 (+0.0) | 1.7 (-0.2) | 0.0 (-0.0) | 0.2 (-0.1) | 0.6 (-0.3) | 0.8 (-0.4) | 1.4 (+0.0) | 0.3 (+0.1) | 70.0 ↓ (+1.0) | 1.910 (-0.0) | 0.250 ✓ (+0.0) | 0.040 ↓ (+0.0) | 0.010 ✓ (+0.0) | 1.610 (-0.1) | 78% (3% drawn) | 0.67 | 73%/72% |

## expansive v balanced

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 151.7 ✓ | 15.2 ✓ | 47.6 | 2.5 | 8.6 ✓ | 10.1 ✓ | 17.3 ✓ | 5.2 ✓ | 0.3 | 20.5 | 2.1 | 0.0 | 4.8 | 2.8 | 0.0 | 1.9 | 0.1 | 1.2 | 435.3 | 1.6 | 1.6 | 0.0 | 0.1 | 0.4 | 0.6 | 1.4 | 0.3 | 69.8 ↓ | 1.700 | 0.200 ✓ | 0.060 ✓ | 0.000 ✓ | 1.440 | 57% (5% drawn) | 48.5% (5.0% drawn) | 0.66 | 73%/73% |
| deeper default | 153.0 ✓ (+1.3) | 13.5 ✓ (-1.7*) | 45.1 (-2.5*) | 2.3 (-0.2) | 8.5 ✓ (-0.1) | 9.9 ✓ (-0.2) | 17.3 ✓ (+0.0) | 5.4 ✓ (+0.2) | 0.4 (+0.0) | 21.7 (+1.2) | 1.9 (-0.1) | 0.0 (+0.0) | 4.9 (+0.2) | 3.1 (+0.3) | 0.1 (+0.0) | 1.9 (+0.1) | 0.1 (-0.1) | 1.3 (+0.1) | 442.5 (+7.2) | 1.5 (-0.1) | 1.8 (+0.2) | 0.0 (+0.0) | 0.2 (+0.1) | 0.6 (+0.2) | 0.7 (+0.1) | 1.5 (+0.1) | 0.3 (+0.0) | 70.3 ✓ (+0.6) | 1.740 (+0.0) | 0.240 ✓ (+0.0) | 0.020 ↓ (-0.0) | 0.000 ✓ (+0.0) | 1.480 (+0.0) | 51% (8% drawn) | 52.0% (5.5% drawn) | 0.66 | 72%/72% |

## kick-chase v balanced

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 150.3 ✓ | 14.7 ✓ | 46.8 | 2.6 | 6.0 ↓ | 10.0 ✓ | 18.6 ✓ | 5.3 ✓ | 0.3 | 20.0 | 1.8 | 0.0 | 4.5 | 2.8 | 0.0 | 1.9 | 0.1 | 1.3 | 459.5 | 1.8 | 1.8 | 0.0 | 0.2 | 0.5 | 0.2 | 1.3 | 0.2 | 70.5 ✓ | 2.380 | 0.330 ↑ | 0.030 ↓ | 0.000 ✓ | 2.020 | 61% (3% drawn) | 53.5% (2.0% drawn) | 0.67 | 72%/73% |
| deeper default | 151.2 ✓ (+0.9) | 13.9 ✓ (-0.9) | 45.0 (-1.8) | 2.3 (-0.3) | 6.0 ✓ (+0.0) | 10.3 ✓ (+0.3) | 18.4 ✓ (-0.3) | 5.3 ✓ (+0.0) | 0.3 (+0.0) | 20.0 (+0.0) | 2.0 (+0.2) | 0.0 (+0.0) | 4.3 (-0.2) | 2.9 (+0.1) | 0.1 (+0.0) | 1.9 (+0.0) | 0.1 (+0.1) | 1.3 (+0.0) | 469.6 (+10.1) | 1.6 (-0.2) | 1.6 (-0.2) | 0.0 (+0.0) | 0.1 (-0.0) | 0.4 (-0.1) | 0.6 (+0.4) | 1.4 (+0.2) | 0.2 (+0.0) | 70.7 ✓ (+0.2) | 2.090 (-0.3) | 0.260 ✓ (-0.1) | 0.030 ↓ (+0.0) | 0.000 ✓ (+0.0) | 1.800 (-0.2) | 46% (8% drawn) | 53.0% (7.5% drawn) | 0.66 | 72%/72% |

## rush v slide

_Side win is the tracked side over 200 matches, both ways round. The other columns are the matchup as written (100)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 150.2 ✓ | 14.2 ✓ | 64.2 | 1.9 | 8.1 ✓ | 10.7 ✓ | 17.6 ✓ | 5.1 ✓ | 0.3 | 25.9 | 2.7 | 0.0 | 4.7 | 2.6 | 0.0 | 1.6 | 0.1 | 1.4 | 436.2 | 2.6 | 1.5 | 0.0 | 0.2 | 0.8 | 1.2 | 1.4 | 0.4 | 68.6 ↓ | 2.300 | 0.290 ✓ | 0.040 ↓ | 0.000 ✓ | 1.970 | 47% (3% drawn) | 52.5% (3.5% drawn) | 0.65 | 74%/75% |
| deeper default | 151.5 ✓ (+1.3) | 13.7 ✓ (-0.5) | 62.2 (-1.9) | 1.7 (-0.2) | 7.3 ✓ (-0.7) | 10.2 ✓ (-0.5) | 17.0 ✓ (-0.5) | 5.7 ✓ (+0.5) | 0.4 (+0.1) | 26.7 (+0.8) | 2.5 (-0.2) | 0.0 (-0.0) | 4.4 (-0.3) | 3.0 (+0.4) | 0.1 (+0.0) | 2.0 (+0.4*) | 0.1 (+0.0) | 1.2 (-0.2) | 416.5 (-19.7) | 2.6 (-0.0) | 1.6 (+0.1) | 0.0 (+0.0) | 0.3 (+0.0) | 0.8 (+0.0) | 0.7 (-0.5) | 1.2 (-0.2) | 0.4 (+0.0) | 70.1 ✓ (+1.4) | 2.020 (-0.3) | 0.310 ↑ (+0.0) | 0.070 ✓ (+0.0) | 0.010 ✓ (+0.0) | 1.630 (-0.3) | 48% (7% drawn) | 40.5% (6.5% drawn) | 0.65 | 73%/74% |

_10 cells in 1004 s._
