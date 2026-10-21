# Balance: difficulty

N12.2: the player's win rate against an even-rated rival on each difficulty, in the match itself. Each seed a new game's squad on that difficulty through its opening lineup against a rival's generated squad level with its best nine (through the rival coach's auto-pick), the rival with the difficulty's edge after the spread (difficulty.<d>.rivalEdge), both ways round: 400 matches a difficulty, on seeds the sweep (difficulty-sweep.json, seeds 1-150) did not play. 'no edge' is the match before N12.2 (Normal is the same in both rows). The player's win rate is the home win share of 'player v rival' and 1 - home win - drawn of 'rival v player'; homeMargin and nine are in results.jsonl.

**commit** b3bc534 · **branch** season/difficulty-spread · **started** 2026-10-21T08:11:59.470Z

200 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## Easy: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.9 ✓ | 18.3 ✓ | 68.4 | 4.4 | 10.7 ✓ | 14.5 ✓ | 22.0 ✓ | 6.6 ✓ | 0.5 | 30.6 | 2.5 | 0.0 | 5.6 | 3.8 | 0.0 | 2.4 | 0.2 | 2.8 | 563.5 | 2.2 | 1.7 | 0.0 | 0.3 | 1.2 | 1.6 | 1.7 | 0.5 | 66.1 ↓ | 63% (4% drawn) | 0.66 | 75%/75% |
| no edge | 190.4 ✓ (+0.5) | 18.2 ✓ (-0.2) | 67.1 (-1.3) | 4.1 (-0.3) | 10.4 ✓ (-0.3) | 14.0 ✓ (-0.5) | 21.8 ✓ (-0.2) | 6.5 ✓ (-0.1) | 0.4 (-0.1) | 31.1 (+0.5) | 2.5 (+0.1) | 0.0 (-0.0) | 5.3 (-0.3) | 3.7 (-0.1) | 0.0 (+0.0) | 2.3 (-0.1) | 0.1 (-0.1) | 3.2 (+0.4*) | 559.8 (-3.7) | 2.3 (+0.1) | 2.0 (+0.3) | 0.0 (-0.0) | 0.3 (+0.0) | 1.3 (+0.1) | 1.6 (-0.0) | 1.8 (+0.1) | 0.5 (+0.0) | 66.5 ↓ (+0.4) | 48% (4% drawn) | 0.66 | 75%/75% |

**Changed since the previous run:** baseline: fortyTwenties 0.1 → 0.2 (+0.1*)

## Easy: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.8 ✓ | 19.0 ✓ | 67.7 | 4.3 | 10.5 ✓ | 14.4 ✓ | 21.7 ✓ | 6.6 ✓ | 0.5 | 30.9 | 2.6 | 0.0 | 5.7 | 3.7 | 0.0 | 2.5 | 0.1 | 3.0 | 568.2 | 2.3 | 1.8 | 0.0 | 0.3 | 1.1 | 1.1 | 1.7 | 0.4 | 66.2 ↓ | 35% (4% drawn) | 0.65 | 75%/75% |
| no edge | 189.3 ✓ (-0.4) | 18.3 ✓ (-0.8) | 66.8 (-0.9) | 4.2 (-0.1) | 11.0 ✓ (+0.5) | 14.0 ✓ (-0.4) | 21.8 ✓ (+0.1) | 6.4 ✓ (-0.2) | 0.5 (-0.0) | 30.8 (-0.1) | 2.8 (+0.2) | 0.0 (+0.0) | 5.4 (-0.2) | 3.5 (-0.2) | 0.0 (+0.0) | 2.4 (-0.1) | 0.1 (+0.0) | 3.0 (+0.0) | 565.9 (-2.3) | 2.3 (+0.0) | 1.9 (+0.1) | 0.0 (-0.0) | 0.3 (+0.0) | 1.2 (+0.1) | 0.9 (-0.2) | 1.9 (+0.2) | 0.4 (-0.0) | 66.6 ↓ (+0.4) | 41% (4% drawn) | 0.66 | 75%/75% |

**Changed since the previous run:** nothing beyond noise.

## Normal: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.5 ✓ | 18.0 ✓ | 69.1 | 5.5 | 10.9 ✓ | 15.0 ✓ | 21.4 ✓ | 6.6 ✓ | 0.5 | 31.3 | 2.5 | 0.0 | 6.1 | 3.6 | 0.0 | 2.4 | 0.2 | 3.0 | 551.3 | 2.1 | 1.9 | 0.0 | 0.4 | 1.7 | 1.8 | 1.8 | 0.3 | 65.2 ↓ | 56% (4% drawn) | 0.65 | 75%/74% |
| no edge | 189.5 ✓ (+0.0) | 18.0 ✓ (+0.0) | 69.1 (+0.0) | 5.5 (+0.0) | 10.9 ✓ (+0.0) | 15.0 ✓ (+0.0) | 21.4 ✓ (+0.0) | 6.6 ✓ (+0.0) | 0.5 (+0.0) | 31.3 (+0.0) | 2.5 (+0.0) | 0.0 (+0.0) | 6.1 (+0.0) | 3.6 (+0.0) | 0.0 (+0.0) | 2.4 (+0.0) | 0.2 (+0.0) | 3.0 (+0.0) | 551.3 (+0.0) | 2.1 (+0.0) | 1.9 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 1.7 (+0.0) | 1.8 (+0.0) | 1.8 (+0.0) | 0.3 (+0.0) | 65.2 ↓ (+0.0) | 56% (4% drawn) | 0.65 | 75%/74% |

**Changed since the previous run:** nothing beyond noise.

## Normal: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.7 ✓ | 17.9 ✓ | 69.4 | 5.3 | 11.1 ✓ | 15.2 ✓ | 21.8 ✓ | 6.6 ✓ | 0.5 | 30.9 | 2.6 | 0.0 | 6.1 | 3.7 | 0.0 | 2.5 | 0.2 | 2.8 | 564.6 | 2.4 | 1.8 | 0.0 | 0.4 | 1.7 | 1.8 | 1.8 | 0.4 | 65.0 ↓ | 37% (3% drawn) | 0.65 | 75%/75% |
| no edge | 188.7 ✓ (+0.0) | 17.9 ✓ (+0.0) | 69.4 (+0.0) | 5.3 (+0.0) | 11.1 ✓ (+0.0) | 15.2 ✓ (+0.0) | 21.8 ✓ (+0.0) | 6.6 ✓ (+0.0) | 0.5 (+0.0) | 30.9 (+0.0) | 2.6 (+0.0) | 0.0 (+0.0) | 6.1 (+0.0) | 3.7 (+0.0) | 0.0 (+0.0) | 2.5 (+0.0) | 0.2 (+0.0) | 2.8 (+0.0) | 564.6 (+0.0) | 2.4 (+0.0) | 1.8 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 1.7 (+0.0) | 1.8 (+0.0) | 1.8 (+0.0) | 0.4 (+0.0) | 65.0 ↓ (+0.0) | 37% (3% drawn) | 0.65 | 75%/75% |

**Changed since the previous run:** nothing beyond noise.

## Hard: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 191.3 ✓ | 16.6 ✓ | 70.2 | 7.0 | 10.4 ✓ | 16.0 ↑ | 22.2 ✓ | 6.2 ✓ | 0.5 | 31.1 | 2.4 | 0.0 | 6.8 | 3.6 | 0.0 | 2.5 | 0.1 | 2.8 | 578.4 | 2.4 | 1.8 | 0.0 | 0.3 | 1.3 | 1.0 | 1.8 | 0.4 | 64.2 ↓ | 47% (5% drawn) | 0.65 | 73%/73% |
| no edge | 190.8 ✓ (-0.6) | 16.9 ✓ (+0.3) | 69.2 (-1.0) | 6.7 (-0.3) | 10.4 ✓ (-0.0) | 16.1 ↑ (+0.0) | 21.7 ✓ (-0.5) | 6.4 ✓ (+0.2) | 0.4 (-0.0) | 30.8 (-0.2) | 2.4 (+0.0) | 0.0 (+0.0) | 7.0 (+0.2) | 3.5 (-0.1) | 0.0 (+0.0) | 2.5 (+0.0) | 0.1 (-0.0) | 2.9 (+0.1) | 571.0 (-7.4) | 2.1 (-0.2) | 1.9 (+0.1) | 0.0 (-0.0) | 0.2 (-0.1) | 0.9 (-0.3) | 0.9 (-0.0) | 2.1 (+0.2) | 0.5 (+0.1) | 64.7 ↓ (+0.5) | 51% (4% drawn) | 0.64 | 74%/74% |

**Changed since the previous run:** baseline: tries 6.7 → 6.2 (-0.5*); baseline: kickMetres 555.0 → 578.4 (+23.4*)

## Hard: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.9 ✓ | 16.6 ✓ | 71.0 | 6.9 | 10.6 ✓ | 15.7 ✓ | 21.7 ✓ | 6.0 ✓ | 0.5 | 30.5 | 2.3 | 0.0 | 6.8 | 3.4 | 0.0 | 2.7 | 0.1 | 2.9 | 573.7 | 2.3 | 1.8 | 0.0 | 0.3 | 1.4 | 1.6 | 1.9 | 0.3 | 64.8 ↓ | 45% (7% drawn) | 0.64 | 73%/73% |
| no edge | 190.6 ✓ (-0.3) | 16.5 ✓ (-0.1) | 71.0 (+0.0) | 6.6 (-0.3) | 10.6 ✓ (+0.0) | 16.1 ↑ (+0.4) | 21.7 ✓ (+0.0) | 6.3 ✓ (+0.3) | 0.5 (-0.0) | 30.4 (-0.0) | 2.4 (+0.1) | 0.0 (+0.0) | 7.0 (+0.2) | 3.7 (+0.3) | 0.0 (-0.0) | 2.7 (+0.0) | 0.2 (+0.0) | 2.9 (+0.0) | 569.0 (-4.7) | 2.2 (-0.1) | 1.7 (-0.1) | 0.0 (+0.0) | 0.3 (-0.0) | 1.2 (-0.2) | 1.6 (+0.0) | 2.0 (+0.1) | 0.4 (+0.1) | 64.4 ↓ (-0.4) | 40% (7% drawn) | 0.65 | 74%/74% |

**Changed since the previous run:** nothing beyond noise.

_12 cells in 3025 s._
