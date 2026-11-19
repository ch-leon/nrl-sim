# Balance: lead decoy bounded check

Scoped #649 check: with the lead-decoy back-door available, does the current decoy default (shapes.leadDecoy.on=1) differ from the same game with this knob off, over 40 consecutive seeds? Compare flat neutral balanced 60v60 and Expansive v Balanced at 60v60. This is not the broader #649 standard acceptance run.

**commit** 0e34997e · **branch** feat/match-lead-decoy · **started** 2026-11-19T02:56:56.143Z

40 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## balanced 60 v 60

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 52.5 ↓ | 5.0 ↓ | 15.5 | 0.3 | 2.6 ↓ | 3.6 ↓ | 5.5 ↓ | 1.7 ↓ | 0.2 | 6.9 | 0.7 | 0.2 | 20.0 | 0.0 | 0.0 | 1.0 | 0.1 | 0.8 | 0.1 | 0.6 | 128.6 | 0.4 | 0.8 | 0.0 | 0.0 | 0.1 | 0.2 | 0.4 | 0.0 | 73.8 ✓ | 0.775 | 0.150 ↓ | 0.025 ↓ | 0.000 ✓ | 0.600 | 45% (28% drawn) | 0.70 | 93%/93% |
| decoy off | 52.3 ↓ (-0.2) | 5.3 ↓ (+0.2) | 15.9 (+0.5) | 0.2 (-0.0) | 2.5 ↓ (-0.1) | 3.7 ↓ (+0.1) | 5.6 ↓ (+0.1) | 1.8 ↓ (+0.0) | 0.1 (-0.0) | 7.0 (+0.1) | 0.8 (+0.1) | 0.3 (+0.1) | 25.0 (+5.0) | 0.0 (+0.0) | 0.0 (+0.0) | 1.1 (+0.1) | 0.1 (-0.0) | 0.7 (-0.1) | 0.1 (-0.0) | 0.5 (-0.1) | 136.9 (+8.3) | 0.5 (+0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.0 (+0.0) | 0.1 (+0.0) | 0.0 (-0.2) | 0.4 (+0.0) | 0.0 (+0.0) | 73.1 ✓ (-0.7) | 0.625 (-0.2) | 0.150 ↓ (+0.0) | 0.025 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.450 (-0.1) | 38% (28% drawn) | 0.70 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 80 | 15 | 0.9 | 16 | 0 | 6 | 3 | 30 | 45 | 59 | 26 | 16 | 27 | 5.3 | 0.45 | 54.4 |
| decoy off | 0.25 (+0.0) | 80 (+0.0) | 13 (-2.5) | 0.9 (+0.0) | 15 (-0.4) | 0 (+0.0) | 6 (-0.2) | 3 (-0.1) | 37 (+6.2) | 39 (-5.5) | 61 (+2.6) | 24 (-2.2) | 15 (-0.4) | 27 (-0.2) | 5.4 (+0.1) | 0.30 (-0.2) | 54.4 (+0.0) |

_Tries 1.7 and last tackles 8.8 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## expansive v balanced

_Side win is the tracked side over 80 matches, both ways round. The other columns are the matchup as written (40)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 53.4 ↓ | 5.7 ↓ | 17.1 | 0.5 | 2.8 ↓ | 3.5 ↓ | 5.0 ↓ | 1.5 ↓ | 0.2 | 6.6 | 0.8 | 0.3 | 22.5 | 0.0 | 0.1 | 0.9 | 0.1 | 0.5 | 0.0 | 0.4 | 125.6 | 0.7 | 0.7 | 0.0 | 0.1 | 0.3 | 0.5 | 0.5 | 0.1 | 72.2 ✓ | 0.400 | 0.075 ↓ | 0.000 ↓ | 0.000 ✓ | 0.325 | 40% (15% drawn) | 41.3% (13.8% drawn) | 0.71 | 93%/93% |
| decoy off | 53.3 ↓ (-0.0) | 5.3 ↓ (-0.4) | 16.6 (-0.5) | 0.5 (+0.0) | 2.8 ↓ (+0.0) | 3.5 ↓ (-0.0) | 4.9 ↓ (-0.1) | 1.8 ↓ (+0.3) | 0.2 (+0.0) | 6.9 (+0.3) | 0.8 (-0.0) | 0.3 (+0.0) | 25.0 (+2.5) | 0.0 (+0.0) | 0.1 (+0.0) | 1.1 (+0.2) | 0.2 (+0.0) | 0.6 (+0.1) | 0.0 (+0.0) | 0.3 (-0.0) | 120.0 (-5.6) | 0.8 (+0.1) | 0.6 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (+0.1) | 0.3 (-0.2) | 0.5 (-0.1) | 0.1 (+0.0) | 72.2 ✓ (-0.0) | 0.400 (+0.0) | 0.100 ↓ (+0.0) | 0.000 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.300 (-0.0) | 45% (20% drawn) | 42.5% (13.8% drawn) | 0.71 | 93%/93% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.20 | 83 | 13 | 0.4 | 13 | 0 | 5 | 3 | 37 | 42 | 55 | 31 | 15 | 26 | 5.6 | 0.17 | 55.8 |
| decoy off | 0.28 (+0.1) | 83 (+0.0) | 18 (+5.0) | 0.6 (+0.2) | 13 (-0.5) | 0 (+0.0) | 9 (+3.6) | 6 (+2.4) | 33 (-3.8) | 40 (-1.7) | 54 (-0.1) | 27 (-3.8) | 19 (+4.0) | 26 (+0.5) | 5.6 (+0.0) | 0.15 (-0.0) | 55.2 (-0.6) |

_Tries 1.5 and last tackles 8.9 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 49 s._
