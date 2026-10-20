# Balance: level rating

N12.2: does the player's club have an edge in the match itself at a level rating (the re-baseline's +3.8 a game within 2 points)? Each seed a new game's squad (Normal) through its opening lineup against a rival's generated squad level with its best nine, through the rival coach's auto-pick, as matchday.ts builds them: both ways round, with the rival's AI coach, with the rival on a plan, with no traits, with no bench, and two rival squads as the control. homeMargin and nine are in results.jsonl.

**commit** 09838a4 · **branch** season/difficulty-spread · **started** 2026-10-20T11:43:42.989Z

240 matches per row, whole matches (two 9:00 halves); counts are both sides. Wins are on points. ✓ inside the §7 target, ↑ above, ↓ below. A change marked * is bigger than luck explains (over 2 standard errors, flagged only with 8+ matches a row); unmarked ones may be noise.

## player v rival

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.6 ✓ | 19.2 ✓ | 68.6 | 5.4 | 11.9 ✓ | 14.7 ✓ | 21.3 ✓ | 6.7 ✓ | 0.4 | 29.9 | 2.3 | 0.0 | 6.2 | 3.7 | 0.0 | 2.6 | 0.2 | 2.8 | 553.7 | 2.2 | 1.9 | 0.0 | 0.3 | 1.1 | 0.9 | 1.6 | 0.4 | 65.2 ↓ | 51% (6% drawn) | 0.66 | 75%/75% |

## rival v player

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 187.7 ✓ | 19.3 ✓ | 69.0 | 5.8 | 11.9 ✓ | 14.4 ✓ | 21.1 ✓ | 7.0 ✓ | 0.5 | 29.9 | 2.5 | 0.0 | 5.8 | 3.9 | 0.0 | 2.4 | 0.2 | 2.8 | 550.0 | 2.2 | 1.8 | 0.0 | 0.3 | 1.4 | 1.5 | 1.8 | 0.4 | 65.7 ↓ | 40% (3% drawn) | 0.66 | 74%/74% |

## player v rival, rival AI coach

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.4 ✓ | 18.9 ✓ | 71.6 | 5.6 | 11.9 ✓ | 15.0 ✓ | 21.1 ✓ | 6.6 ✓ | 0.4 | 30.2 | 2.7 | 0.0 | 6.1 | 3.6 | 0.0 | 2.4 | 0.2 | 2.8 | 545.7 | 2.2 | 1.9 | 0.0 | 0.3 | 1.5 | 1.2 | 2.0 | 0.4 | 64.8 ↓ | 51% (3% drawn) | 0.66 | 74%/74% |

## player v rival, rival on kick-chase / rush

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 193.6 ✓ | 16.8 ✓ | 88.6 | 4.4 | 10.1 ✓ | 14.9 ✓ | 22.5 ✓ | 6.8 ✓ | 0.4 | 38.5 | 3.3 | 0.0 | 6.1 | 3.8 | 0.0 | 2.4 | 0.2 | 3.2 | 578.3 | 3.3 | 1.7 | 0.0 | 0.5 | 1.8 | 2.0 | 2.0 | 0.5 | 66.4 ↓ | 51% (5% drawn) | 0.64 | 75%/74% |

## player v rival, no traits

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 191.8 ✓ | 17.7 ✓ | 63.0 | 5.9 | 9.5 ✓ | 14.4 ✓ | 21.9 ✓ | 6.4 ✓ | 0.4 | 26.9 | 2.2 | 0.0 | 6.4 | 3.3 | 0.0 | 2.6 | 0.1 | 2.8 | 560.5 | 2.0 | 1.8 | 0.0 | 0.3 | 1.1 | 1.1 | 1.6 | 0.4 | 67.3 ↓ | 53% (7% drawn) | 0.66 | 74%/74% |

## player v rival, no bench

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 188.2 ✓ | 19.0 ✓ | 69.3 | 6.3 | 11.8 ✓ | 14.4 ✓ | 21.5 ✓ | 6.8 ✓ | 0.4 | 29.5 | 2.4 | 0.1 | 0.0 | 3.8 | 0.0 | 2.6 | 0.2 | 2.8 | 562.5 | 2.1 | 1.8 | 0.0 | 0.3 | 1.3 | 1.3 | 1.5 | 0.4 | 65.6 ↓ | 56% (4% drawn) | 0.65 | 59%/59% |

## rival v rival (control)

| Variant | tackles | lineBreaks | breaks | lateBusts | offloads | errors | kicks | tries | bonusTries | bigHits | runDowns | gassed | subs | goals | fieldGoals | touchFinds | fortyTwenties | deadBalls | kickMetres | penalties | sixAgains | penaltyGoals | sinBins | shortMin | binSwing | lostInContact | injuries | completion | Home win | Wrestle s | Legs end H/A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 190.7 ✓ | 18.4 ✓ | 67.2 | 5.3 | 11.2 ✓ | 15.4 ✓ | 21.3 ✓ | 6.3 ✓ | 0.4 | 29.4 | 2.7 | 0.0 | 6.4 | 3.2 | 0.0 | 2.7 | 0.2 | 2.9 | 553.1 | 2.1 | 1.8 | 0.0 | 0.3 | 1.3 | 1.1 | 1.9 | 0.4 | 65.5 ↓ | 52% (5% drawn) | 0.66 | 74%/74% |

_7 cells in 1262 s._
