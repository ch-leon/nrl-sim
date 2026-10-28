# Balance: more-calls

Five more coach calls (#396): even sides, the home coach makes one call whenever callRefusal allows. Is any of them a free win (home win against no calls), how often does it pay off (callsPaid / callsMade), and what does it move (offloads, errors, kicks, tries)?

**commit** b9fb824 (uncommitted changes) · **branch** claude/more-coach-calls-396 · **started** 2026-10-28T13:39:51.808Z

200 matches per row, whole matches (two 7:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## no calls

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.2 ✓ | 14.9 ✓ | 46.4 | 2.4 | 7.4 ✓ | 10.5 ✓ | 17.7 ✓ | 5.1 ✓ | 0.2 | 20.6 | 2.1 | 0.0 | 4.3 | 2.7 | 0.0 | 1.9 | 0.1 | 1.2 | 442.3 | 1.5 | 1.7 | 0.0 | 0.2 | 0.4 | 0.3 | 1.3 | 0.2 | 69.8 ↓ | 1.965 | 0.265 ✓ | 0.045 ↓ | 0.000 ✓ | 1.655 | 51% (4% drawn) | 48.3% (3.5% drawn) | 0.66 | 72%/72% |

## offload

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 148.4 ✓ | 15.3 ✓ | 46.1 | 2.2 | 8.9 ✓ | 10.7 ✓ | 17.6 ✓ | 5.1 ✓ | 0.2 | 20.8 | 2.0 | 0.0 | 4.3 | 2.8 | 0.0 | 1.7 | 0.1 | 1.3 | 437.0 | 1.5 | 1.6 | 0.0 | 0.2 | 0.7 | 0.6 | 1.4 | 0.2 | 69.0 ↓ | 2.035 | 0.295 ✓ | 0.030 ↓ | 0.000 ✓ | 1.710 | 52% (5% drawn) | 47.3% (7.2% drawn) | 0.66 | 72%/72% |

## gang tackle

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 148.6 ✓ | 13.7 ✓ | 51.8 | 1.9 | 7.4 ✓ | 9.9 ✓ | 17.4 ✓ | 4.8 ✓ | 0.3 | 20.8 | 2.3 | 0.0 | 4.5 | 2.6 | 0.1 | 1.9 | 0.1 | 1.3 | 440.2 | 1.5 | 1.5 | 0.0 | 0.2 | 0.6 | 0.7 | 1.3 | 0.2 | 69.7 ↓ | 1.925 | 0.240 ✓ | 0.035 ↓ | 0.005 ✓ | 1.645 | 51% (6% drawn) | 51.2% (7.2% drawn) | 0.65 | 73%/73% |

## grubber

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.2 ✓ | 15.5 ✓ | 46.5 | 2.4 | 7.4 ✓ | 10.3 ✓ | 17.7 ✓ | 5.1 ✓ | 0.3 | 20.3 | 2.0 | 0.0 | 4.6 | 2.8 | 0.0 | 1.8 | 0.1 | 1.7 | 439.1 | 1.6 | 1.7 | 0.0 | 0.2 | 0.5 | 0.7 | 1.4 | 0.2 | 68.9 ↓ | 3.345 | 0.500 ↑ | 0.050 ✓ | 0.000 ✓ | 2.795 | 44% (6% drawn) | 42.3% (5.5% drawn) | 0.67 | 72%/73% |

## 40/20

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.4 ✓ | 14.6 ✓ | 45.9 | 2.3 | 7.4 ✓ | 10.2 ✓ | 17.7 ✓ | 5.0 ✓ | 0.2 | 20.4 | 1.9 | 0.0 | 4.4 | 2.5 | 0.0 | 2.7 | 0.2 | 1.1 | 441.2 | 1.5 | 1.7 | 0.0 | 0.2 | 0.5 | 0.5 | 1.3 | 0.2 | 69.6 ↓ | 1.960 | 0.240 ✓ | 0.030 ↓ | 0.000 ✓ | 1.690 | 54% (4% drawn) | 52.5% (4.5% drawn) | 0.67 | 73%/72% |

## take the two

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.3 ✓ | 15.0 ✓ | 46.3 | 2.4 | 7.3 ✓ | 10.4 ✓ | 17.6 ✓ | 5.1 ✓ | 0.2 | 20.7 | 2.1 | 0.0 | 4.3 | 2.7 | 0.0 | 1.9 | 0.1 | 1.2 | 440.0 | 1.5 | 1.7 | 0.1 | 0.2 | 0.4 | 0.3 | 1.3 | 0.2 | 69.8 ↓ | 1.960 | 0.255 ✓ | 0.050 ✓ | 0.000 ✓ | 1.655 | 49% (5% drawn) | 46.3% (4.5% drawn) | 0.66 | 72%/72% |

## tap and go

_Side win is the tracked side over 400 matches, both ways round. The other columns are the matchup as written (200)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 149.2 ✓ | 14.9 ✓ | 46.5 | 2.4 | 7.4 ✓ | 10.5 ✓ | 17.6 ✓ | 5.0 ✓ | 0.2 | 20.5 | 2.1 | 0.0 | 4.3 | 2.7 | 0.0 | 1.9 | 0.1 | 1.2 | 439.6 | 1.5 | 1.7 | 0.0 | 0.2 | 0.5 | 0.3 | 1.3 | 0.2 | 69.7 ↓ | 1.960 | 0.265 ✓ | 0.040 ↓ | 0.000 ✓ | 1.655 | 50% (4% drawn) | 48.5% (3.8% drawn) | 0.67 | 72%/72% |

_7 cells in 885 s._
