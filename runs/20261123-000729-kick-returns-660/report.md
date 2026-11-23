# Balance: kick-returns-660

Measure net metres from direct long and bomb catches to the end of the first play, on an even field and against Kick-chase. These matches use the 7-minute halves behind the historical §7 targets. Turning off kick returns restores main's return behavior.

**commit** 477f90d0 · **branch** feat/kick-returns · **started** 2026-11-23T00:07:29.328Z

50 matches per row, whole matches (two 2.5-minute halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## even 60 v 60

_14-minute stretch, counts scaled to 5._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 51.4 ↓ | 5.0 ↓ | 17.3 | 0.9 | 2.8 ↓ | 3.3 ↓ | 6.0 ↓ | 1.8 ↓ | 0.1 | 7.1 | 0.7 | 0.4 | 68.0 | 0.0 | 1.8 | 1.0 | 0.0 | 0.9 | 0.0 | 0.4 | 146.8 | 0.6 | 0.7 | 0.0 | 0.1 | 0.3 | 0.2 | 0.4 | 0.1 | 74.7 ✓ | 0.621 | 0.086 ↓ | 0.014 ↓ | 0.000 ✓ | 0.521 | 50% (6% drawn) | 0.70 | 69%/70% |
| kick returns off | 51.5 ↓ (+0.1) | 5.0 ↓ (-0.0) | 17.1 (-0.2) | 0.9 (+0.0) | 2.7 ↓ (-0.1) | 3.4 ↓ (+0.1) | 6.1 ↓ (+0.1) | 1.7 ↓ (-0.1) | 0.2 (+0.0) | 7.1 (+0.0) | 0.6 (-0.1) | 0.4 (+0.1) | 68.0 (+0.0) | 0.0 (-0.0) | 1.9 (+0.1) | 1.1 (+0.0) | 0.0 (+0.0) | 0.8 (-0.0) | 0.0 (-0.0) | 0.4 (-0.1) | 153.6 (+6.7) | 0.7 (+0.0) | 0.6 (-0.1) | 0.0 (+0.0) | 0.1 (+0.0) | 0.3 (-0.0) | 0.2 (+0.0) | 0.4 (-0.0) | 0.1 (-0.0) | 73.3 ✓ (-1.4) | 0.721 (+0.1) | 0.114 ↓ (+0.0) | 0.029 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.579 (+0.1) | 38% (4% drawn) | 0.70 | 69%/70% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.31 | 44 | 4 | 2.0 | 13 | 0 | 5 | 3 | 39 | 40 | 62 | 23 | 16 | 26 | 6.8 | 0.31 | 56.4 | 5.5 | 1.5 |
| kick returns off | 0.30 (-0.0) | 50 (+6.0) | 10 (+6.0) | 1.6 (-0.5) | 14 (+0.5) | 0 (+0.0) | 7 (+1.6) | 5 (+2.3) | 36 (-2.4) | 38 (-1.9) | 63 (+0.9) | 23 (+0.4) | 14 (-1.4) | 26 (+0.1) | 7.0 (+0.2) | 0.28 (-0.0) | 56.3 (-0.1) | 5.4 (-0.1) | 1.3 (-0.1) |

_Tries 1.8 and last tackles 9.3 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

## kick-chase v balanced

_14-minute stretch, counts scaled to 5._

_Side win is the tracked side over 100 matches, both ways round. The other columns are the matchup as written (50)._

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | heldUp | heldUpMatches | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | grubbers | grubberTries | grubberRepeats | grubberDropouts | grubberTurnovers | Home win | Side win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 50.3 ↓ | 4.9 ↓ | 16.9 | 0.8 | 2.4 ↓ | 3.5 ↓ | 6.5 ↓ | 2.0 ↓ | 0.1 | 7.0 | 0.6 | 0.3 | 68.0 | 0.0 | 1.6 | 1.1 | 0.0 | 0.6 | 0.1 | 0.6 | 154.3 | 0.5 | 0.6 | 0.0 | 0.1 | 0.2 | 0.2 | 0.5 | 0.1 | 72.6 ✓ | 0.850 | 0.071 ↓ | 0.014 ↓ | 0.000 ✓ | 0.764 | 40% (6% drawn) | 37.0% (5.0% drawn) | 0.70 | 71%/71% |
| kick returns off | 50.1 ↓ (-0.2) | 4.7 ↓ (-0.2) | 16.8 (-0.1) | 0.8 (-0.0) | 2.3 ↓ (-0.1) | 3.7 ↓ (+0.1) | 6.7 ↓ (+0.2) | 2.0 ↓ (+0.0) | 0.1 (+0.0) | 7.1 (+0.1) | 0.5 (-0.1) | 0.4 (+0.1) | 58.0 (-10.0) | 0.0 (+0.0) | 1.7 (+0.1) | 1.1 (-0.0) | 0.0 (-0.0) | 0.5 (-0.1) | 0.1 (-0.0) | 0.6 (-0.0) | 159.6 (+5.3) | 0.6 (+0.0) | 0.5 (-0.1) | 0.0 (+0.0) | 0.1 (-0.0) | 0.2 (-0.0) | 0.2 (+0.0) | 0.4 (-0.1) | 0.0 (-0.0) | 71.8 ✓ (-0.8) | 0.907 (+0.1) | 0.093 ↓ (+0.0) | 0.021 ↓ (+0.0) | 0.000 ✓ (+0.0) | 0.793 (+0.0) | 44% (4% drawn) | 44.0% (4.0% drawn) | 0.70 | 73%/72% |

| Variant | Lead changes | Within 6, 1 min out % | Decided last min % | Winner's biggest deficit | Try kick % | Try set play % | Try offload % | Try break 20 m+ % | Try drive <5 m % | Try other % | Last tackle kick % | Last tackle run % | Last tackle pass % | 1st receiver same man % | 1st receiver slots | 2nd-last kicks | Set start m to go | Long return m | Bomb return m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 0.29 | 52 | 2 | 3.2 | 13 | 0 | 4 | 5 | 37 | 41 | 67 | 20 | 12 | 26 | 6.8 | 0.65 | 54.6 | 6.4 | 0.9 |
| kick returns off | 0.27 (-0.0) | 44 (-8.0) | 6 (+4.0) | 2.2 (-1.0) | 15 (+2.4) | 0 (+0.0) | 4 (-0.8) | 5 (-0.4) | 32 (-4.7) | 45 (+3.5) | 70 (+2.7) | 20 (-0.1) | 10 (-2.6*) | 27 (+0.5) | 6.8 (-0.0) | 0.71 (+0.1) | 54.7 (+0.1) | 6.2 (-0.3) | 1.3 (+0.4) |

_Tries 2.0 and last tackles 8.7 a match in the baseline row. Origins and last-tackle plays are shares of those; their ± test treats each try or last tackle as an independent draw. The attribution rules are in balance/README.md._

_4 cells in 995 s._
