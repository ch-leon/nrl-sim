# Balance: difficulty more seeds

N12.2: the confirm plan (difficulty.json) again on seeds 2001-2200, so the confirm reads 800 matches a difficulty: are Hard's and Easy's no-edge rates really under Normal's (seeds 1001-1200 had them 6 points under), and does the edge move each by about 8? N12.2: the player's win rate against an even-rated rival on each difficulty, in the match itself. Each seed a new game's squad on that difficulty through its opening lineup against a rival's generated squad level with its best nine (through the rival coach's auto-pick), the rival with the difficulty's edge after the spread (difficulty.<d>.rivalEdge), both ways round: 400 matches a difficulty, on seeds the sweep (difficulty-sweep.json, seeds 1-150) did not play. 'no edge' is the match before N12.2 (Normal is the same in both rows). The player's win rate is the home win share of 'player v rival' and 1 - home win - drawn of 'rival v player'; homeMargin and nine are in results.jsonl.

**commit** be325ea · **branch** season/difficulty-spread · **started** 2026-10-21T05:04:44.927Z

200 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## Easy: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.1 ✓ | 19.2 ✓ | 67.9 | 4.0 | 10.9 ✓ | 14.0 ✓ | 21.8 ✓ | 6.6 ✓ | 0.5 | 30.1 | 2.6 | 0.0 | 5.3 | 3.7 | 0.0 | 2.3 | 0.1 | 3.0 | 564.8 | 2.3 | 2.0 | 0.0 | 0.3 | 1.3 | 1.4 | 1.5 | 0.3 | 66.2 ↓ | 60% (3% drawn) | 0.66 | 75%/74% |
| no edge | 187.9 ✓ (-0.2) | 20.0 ✓ (+0.8) | 69.2 (+1.3) | 4.0 (+0.0) | 10.9 ✓ (-0.0) | 14.1 ✓ (+0.1) | 21.5 ✓ (-0.3) | 6.7 ✓ (+0.2) | 0.5 (-0.0) | 30.0 (-0.1) | 2.7 (+0.2) | 0.0 (+0.0) | 5.2 (-0.2) | 3.9 (+0.2) | 0.0 (-0.0) | 2.2 (-0.1) | 0.1 (-0.0) | 2.7 (-0.3) | 554.8 (-10.0) | 2.3 (-0.0) | 1.9 (-0.1) | 0.0 (+0.0) | 0.3 (+0.0) | 1.4 (+0.2) | 1.8 (+0.4) | 1.7 (+0.2) | 0.4 (+0.0) | 66.3 ↓ (+0.1) | 49% (3% drawn) | 0.66 | 75%/75% |

## Easy: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.3 ✓ | 19.0 ✓ | 68.5 | 4.3 | 11.0 ✓ | 13.9 ✓ | 21.5 ✓ | 6.5 ✓ | 0.4 | 30.6 | 2.5 | 0.0 | 5.5 | 3.6 | 0.1 | 2.2 | 0.1 | 3.1 | 554.2 | 2.4 | 2.0 | 0.0 | 0.3 | 1.4 | 1.9 | 1.6 | 0.4 | 66.6 ↓ | 35% (3% drawn) | 0.66 | 75%/75% |
| no edge | 188.7 ✓ (-0.5) | 19.8 ✓ (+0.8) | 68.8 (+0.4) | 4.1 (-0.3) | 10.8 ✓ (-0.1) | 13.9 ✓ (-0.0) | 21.3 ✓ (-0.2) | 6.9 ✓ (+0.4) | 0.6 (+0.1*) | 30.3 (-0.3) | 2.6 (+0.1) | 0.0 (+0.0) | 5.3 (-0.2) | 4.0 (+0.4*) | 0.1 (+0.0) | 2.1 (-0.1) | 0.1 (-0.0) | 2.6 (-0.5*) | 553.1 (-1.1) | 2.3 (-0.1) | 2.0 (-0.0) | 0.0 (+0.0) | 0.3 (+0.0) | 1.3 (-0.1) | 1.7 (-0.1) | 1.9 (+0.3) | 0.4 (-0.0) | 66.1 ↓ (-0.5) | 44% (4% drawn) | 0.66 | 75%/75% |

## Normal: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.3 ✓ | 18.0 ✓ | 70.1 | 5.6 | 10.9 ✓ | 14.7 ✓ | 22.0 ✓ | 6.5 ✓ | 0.5 | 31.1 | 2.5 | 0.0 | 6.1 | 3.5 | 0.0 | 2.5 | 0.2 | 2.9 | 574.8 | 2.4 | 1.8 | 0.0 | 0.4 | 1.4 | 1.2 | 1.9 | 0.4 | 65.9 ↓ | 52% (5% drawn) | 0.65 | 74%/74% |
| no edge | 190.3 ✓ (+0.0) | 18.0 ✓ (+0.0) | 70.1 (+0.0) | 5.6 (+0.0) | 10.9 ✓ (+0.0) | 14.7 ✓ (+0.0) | 22.0 ✓ (+0.0) | 6.5 ✓ (+0.0) | 0.5 (+0.0) | 31.1 (+0.0) | 2.5 (+0.0) | 0.0 (+0.0) | 6.1 (+0.0) | 3.5 (+0.0) | 0.0 (+0.0) | 2.5 (+0.0) | 0.2 (+0.0) | 2.9 (+0.0) | 574.8 (+0.0) | 2.4 (+0.0) | 1.8 (+0.0) | 0.0 (+0.0) | 0.4 (+0.0) | 1.4 (+0.0) | 1.2 (+0.0) | 1.9 (+0.0) | 0.4 (+0.0) | 65.9 ↓ (+0.0) | 52% (5% drawn) | 0.65 | 74%/74% |

## Normal: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 189.1 ✓ | 18.5 ✓ | 71.0 | 5.7 | 10.8 ✓ | 15.1 ✓ | 21.7 ✓ | 6.9 ✓ | 0.5 | 30.9 | 2.4 | 0.0 | 5.9 | 3.9 | 0.0 | 2.7 | 0.2 | 2.9 | 566.0 | 2.5 | 1.9 | 0.0 | 0.3 | 1.4 | 1.8 | 1.8 | 0.4 | 65.5 ↓ | 40% (7% drawn) | 0.65 | 75%/75% |
| no edge | 189.1 ✓ (+0.0) | 18.5 ✓ (+0.0) | 71.0 (+0.0) | 5.7 (+0.0) | 10.8 ✓ (+0.0) | 15.1 ✓ (+0.0) | 21.7 ✓ (+0.0) | 6.9 ✓ (+0.0) | 0.5 (+0.0) | 30.9 (+0.0) | 2.4 (+0.0) | 0.0 (+0.0) | 5.9 (+0.0) | 3.9 (+0.0) | 0.0 (+0.0) | 2.7 (+0.0) | 0.2 (+0.0) | 2.9 (+0.0) | 566.0 (+0.0) | 2.5 (+0.0) | 1.9 (+0.0) | 0.0 (+0.0) | 0.3 (+0.0) | 1.4 (+0.0) | 1.8 (+0.0) | 1.8 (+0.0) | 0.4 (+0.0) | 65.5 ↓ (+0.0) | 40% (7% drawn) | 0.65 | 75%/75% |

## Hard: player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.5 ✓ | 17.0 ✓ | 70.8 | 7.0 | 10.6 ✓ | 15.8 ✓ | 21.7 ✓ | 6.4 ✓ | 0.5 | 31.0 | 2.3 | 0.0 | 6.7 | 3.5 | 0.0 | 2.6 | 0.2 | 2.7 | 570.4 | 2.3 | 1.6 | 0.0 | 0.4 | 1.6 | 1.7 | 2.0 | 0.3 | 64.9 ↓ | 47% (6% drawn) | 0.65 | 73%/74% |
| no edge | 191.7 ✓ (+1.3) | 17.0 ✓ (-0.0) | 70.6 (-0.1) | 6.6 (-0.4) | 10.8 ✓ (+0.2) | 16.4 ↑ (+0.6) | 21.7 ✓ (+0.0) | 6.2 ✓ (-0.2) | 0.5 (+0.0) | 31.6 (+0.6) | 2.2 (-0.1) | 0.0 (+0.0) | 6.9 (+0.3) | 3.4 (-0.1) | 0.0 (-0.0) | 2.8 (+0.2) | 0.2 (-0.0) | 3.0 (+0.3) | 575.6 (+5.2) | 2.4 (+0.0) | 1.6 (-0.0) | 0.0 (+0.0) | 0.3 (-0.1*) | 1.1 (-0.5*) | 0.9 (-0.8) | 1.9 (-0.1) | 0.4 (+0.1*) | 64.9 ↓ (-0.0) | 52% (7% drawn) | 0.64 | 73%/73% |

## Hard: rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.0 ✓ | 16.8 ✓ | 69.7 | 6.4 | 10.8 ✓ | 15.8 ✓ | 21.5 ✓ | 6.4 ✓ | 0.4 | 31.1 | 2.3 | 0.0 | 6.7 | 3.5 | 0.1 | 2.4 | 0.2 | 3.0 | 560.3 | 2.5 | 1.5 | 0.0 | 0.4 | 1.6 | 1.2 | 1.9 | 0.4 | 65.1 ↓ | 56% (2% drawn) | 0.65 | 75%/74% |
| no edge | 191.1 ✓ (+1.1) | 16.7 ✓ (-0.2) | 70.2 (+0.5) | 6.6 (+0.2) | 10.5 ✓ (-0.3) | 16.3 ↑ (+0.5) | 21.5 ✓ (-0.0) | 6.4 ✓ (-0.1) | 0.5 (+0.1) | 31.2 (+0.1) | 2.3 (-0.0) | 0.0 (+0.0) | 6.9 (+0.2) | 3.5 (-0.0) | 0.0 (-0.0*) | 2.4 (+0.0) | 0.1 (-0.0) | 3.2 (+0.2) | 559.6 (-0.7) | 2.3 (-0.2) | 1.7 (+0.2) | 0.0 (+0.0) | 0.4 (-0.0) | 1.4 (-0.2) | 1.4 (+0.2) | 2.1 (+0.2) | 0.4 (+0.0) | 64.3 ↓ (-0.8) | 49% (4% drawn) | 0.65 | 74%/74% |

_12 cells in 1560 s._
