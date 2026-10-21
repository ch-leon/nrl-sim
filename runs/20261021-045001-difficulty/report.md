# Balance: difficulty

N12.2: the player's win rate against an even-rated rival on each difficulty, in the match itself. Each seed a new game's squad on that difficulty through its opening lineup against a rival's generated squad level with its best nine (through the rival coach's auto-pick), the rival with the difficulty's edge after the spread (difficulty.<d>.rivalEdge), both ways round: 400 matches a difficulty, on seeds the sweep (difficulty-sweep.json, seeds 1-150) did not play. 'no edge' is the match before N12.2 (Normal is the same in both rows). The player's win rate is the home win share of 'player v rival' and 1 - home win - drawn of 'rival v player'; homeMargin and nine are in results.jsonl.

**commit** 8b11588 · **branch** season/difficulty-spread · **started** 2026-10-21T04:50:01.545Z

200 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## Easy: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.1 ✓ | 18.3 ✓ | 67.7 | 4.1 | 10.8 ✓ | 14.0 ✓ | 21.8 ✓ | 6.4 ✓ | 0.4 | 30.7 | 2.7 | 0.0 | 5.6 | 3.5 | 0.0 | 2.3 | 0.1 | 3.0 | 567.0 | 2.2 | 1.9 | 0.0 | 0.3 | 1.2 | 1.2 | 1.7 | 0.4 | 66.1 ↓ | 57% (6% drawn) | 0.66 | 75%/75% |
| no edge | 190.4 ✓ (+0.3) | 18.2 ✓ (-0.2) | 67.1 (-0.7) | 4.1 (-0.0) | 10.4 ✓ (-0.4) | 14.0 ✓ (-0.1) | 21.8 ✓ (-0.0) | 6.5 ✓ (+0.1) | 0.4 (+0.0) | 31.1 (+0.4) | 2.5 (-0.2) | 0.0 (-0.0) | 5.3 (-0.3) | 3.7 (+0.2) | 0.0 (+0.0) | 2.3 (-0.1) | 0.1 (+0.0) | 3.2 (+0.2) | 559.8 (-7.1) | 2.3 (+0.0) | 2.0 (+0.1) | 0.0 (-0.0) | 0.3 (-0.0) | 1.3 (+0.0) | 1.6 (+0.4) | 1.8 (+0.0) | 0.5 (+0.1) | 66.5 ↓ (+0.4) | 48% (4% drawn) | 0.66 | 75%/75% |

## Easy: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.5 ✓ | 18.3 ✓ | 67.2 | 4.4 | 10.9 ✓ | 14.0 ✓ | 22.1 ✓ | 6.6 ✓ | 0.6 | 29.7 | 2.5 | 0.0 | 5.4 | 3.8 | 0.0 | 2.3 | 0.2 | 2.9 | 567.7 | 2.1 | 1.9 | 0.0 | 0.3 | 1.2 | 1.3 | 1.7 | 0.4 | 67.0 ↓ | 38% (2% drawn) | 0.66 | 74%/74% |
| no edge | 189.3 ✓ (-0.2) | 18.3 ✓ (-0.0) | 66.8 (-0.4) | 4.2 (-0.2) | 11.0 ✓ (+0.1) | 14.0 ✓ (-0.0) | 21.8 ✓ (-0.3) | 6.4 ✓ (-0.1) | 0.5 (-0.1) | 30.8 (+1.0) | 2.8 (+0.3) | 0.0 (+0.0) | 5.4 (+0.0) | 3.5 (-0.3) | 0.0 (+0.0) | 2.4 (+0.1) | 0.1 (-0.0) | 3.0 (+0.1) | 565.9 (-1.8) | 2.3 (+0.2) | 1.9 (+0.0) | 0.0 (+0.0) | 0.3 (+0.0) | 1.2 (+0.1) | 0.9 (-0.3) | 1.9 (+0.2) | 0.4 (+0.0) | 66.6 ↓ (-0.4) | 41% (4% drawn) | 0.66 | 75%/75% |

## Normal: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.5 ✓ | 18.0 ✓ | 69.1 | 5.5 | 10.9 ✓ | 15.0 ✓ | 21.4 ✓ | 6.6 ✓ | 0.5 | 31.3 | 2.5 | 0.0 | 6.1 | 3.6 | 0.0 | 2.4 | 0.2 | 3.0 | 551.3 | 2.1 | 1.9 | 0.0 | 0.4 | 1.7 | 1.8 | 1.8 | 0.3 | 65.2 ↓ | 56% (4% drawn) | 0.65 | 75%/74% |
| no edge | 189.5 ✓ (+0.0) | 18.0 ✓ (+0.0) | 69.1 (+0.0) | 5.5 (+0.0) | 10.9 ✓ (+0.0) | 15.0 ✓ (+0.0) | 21.4 ✓ (+0.0) | 6.6 ✓ (+0.0) | 0.5 (+0.0) | 31.3 (+0.0) | 2.5 (+0.0) | 0.0 (+0.0) | 6.1 (+0.0) | 3.6 (+0.0) | 0.0 (+0.0) | 2.4 (+0.0) | 0.2 (+0.0) | 3.0 (+0.0) | 551.3 (+0.0) | 2.1 (+0.0) | 1.9 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 1.7 (+0.0) | 1.8 (+0.0) | 1.8 (+0.0) | 0.3 (+0.0) | 65.2 ↓ (+0.0) | 56% (4% drawn) | 0.65 | 75%/74% |

## Normal: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.7 ✓ | 17.9 ✓ | 69.4 | 5.3 | 11.1 ✓ | 15.2 ✓ | 21.8 ✓ | 6.6 ✓ | 0.5 | 30.9 | 2.6 | 0.0 | 6.1 | 3.7 | 0.0 | 2.5 | 0.2 | 2.8 | 564.6 | 2.4 | 1.8 | 0.0 | 0.4 | 1.7 | 1.8 | 1.8 | 0.4 | 65.0 ↓ | 37% (3% drawn) | 0.65 | 75%/75% |
| no edge | 188.7 ✓ (+0.0) | 17.9 ✓ (+0.0) | 69.4 (+0.0) | 5.3 (+0.0) | 11.1 ✓ (+0.0) | 15.2 ✓ (+0.0) | 21.8 ✓ (+0.0) | 6.6 ✓ (+0.0) | 0.5 (+0.0) | 30.9 (+0.0) | 2.6 (+0.0) | 0.0 (+0.0) | 6.1 (+0.0) | 3.7 (+0.0) | 0.0 (+0.0) | 2.5 (+0.0) | 0.2 (+0.0) | 2.8 (+0.0) | 564.6 (+0.0) | 2.4 (+0.0) | 1.8 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 1.7 (+0.0) | 1.8 (+0.0) | 1.8 (+0.0) | 0.4 (+0.0) | 65.0 ↓ (+0.0) | 37% (3% drawn) | 0.65 | 75%/75% |

## Hard: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.2 ✓ | 17.4 ✓ | 70.4 | 6.7 | 10.4 ✓ | 15.4 ✓ | 21.6 ✓ | 6.7 ✓ | 0.5 | 30.5 | 2.4 | 0.0 | 6.8 | 3.8 | 0.0 | 2.6 | 0.1 | 2.8 | 555.0 | 2.1 | 1.7 | 0.0 | 0.3 | 1.3 | 1.0 | 1.8 | 0.4 | 65.3 ↓ | 47% (5% drawn) | 0.65 | 74%/74% |
| no edge | 190.8 ✓ (+0.6) | 16.9 ✓ (-0.5) | 69.2 (-1.2) | 6.7 (+0.0) | 10.4 ✓ (-0.0) | 16.1 ↑ (+0.6) | 21.7 ✓ (+0.1) | 6.4 ✓ (-0.4) | 0.4 (-0.1) | 30.8 (+0.3) | 2.4 (+0.0) | 0.0 (+0.0) | 7.0 (+0.3) | 3.5 (-0.3) | 0.0 (-0.0) | 2.5 (-0.0) | 0.1 (-0.0) | 2.9 (+0.1) | 571.0 (+16.0) | 2.1 (+0.0) | 1.9 (+0.2) | 0.0 (+0.0) | 0.2 (-0.1) | 0.9 (-0.3) | 0.9 (-0.0) | 2.1 (+0.2) | 0.5 (+0.1) | 64.7 ↓ (-0.6) | 51% (4% drawn) | 0.64 | 74%/74% |

## Hard: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.8 ✓ | 16.8 ✓ | 70.4 | 6.5 | 10.8 ✓ | 15.6 ✓ | 21.6 ✓ | 6.5 ✓ | 0.4 | 30.1 | 2.2 | 0.0 | 6.6 | 3.4 | 0.0 | 2.4 | 0.1 | 3.0 | 561.7 | 2.1 | 1.8 | 0.0 | 0.3 | 1.4 | 1.5 | 2.1 | 0.3 | 65.2 ↓ | 52% (4% drawn) | 0.65 | 74%/74% |
| no edge | 190.6 ✓ (+0.8) | 16.5 ✓ (-0.3) | 71.0 (+0.6) | 6.6 (+0.1) | 10.6 ✓ (-0.2) | 16.1 ↑ (+0.5) | 21.7 ✓ (+0.2) | 6.3 ✓ (-0.1) | 0.5 (+0.0) | 30.4 (+0.4) | 2.4 (+0.2) | 0.0 (+0.0) | 7.0 (+0.3) | 3.7 (+0.3) | 0.0 (-0.0) | 2.7 (+0.3) | 0.2 (+0.0) | 2.9 (-0.1) | 569.0 (+7.3) | 2.2 (+0.1) | 1.7 (-0.1) | 0.0 (-0.0) | 0.3 (-0.0) | 1.2 (-0.2) | 1.6 (+0.1) | 2.0 (-0.1) | 0.4 (+0.1) | 64.4 ↓ (-0.8) | 40% (7% drawn) | 0.65 | 74%/74% |

_12 cells in 1579 s._
