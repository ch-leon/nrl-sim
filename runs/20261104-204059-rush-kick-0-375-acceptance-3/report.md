# Balance: Rush Kick 0.375 acceptance 3

Kick-chase v Rush, strength 0.375; seeds 251–375, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:40:59.887Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 50.6% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 50.6% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.2 | 21.2 | 6.6 | 3.2 | 9.8 | 9.2 | 5.0 | 2.8 | 0.5 | 1.2 | 0.4 | 16.6 | 15.7 |
| kick-chase v rush | opponent | 3.7 | 8.4 | 6.7 | 3.0 | 8.8 | 6.9 | 5.5 | 1.6 | 0.1 | 1.0 | 0.2 | 15.7 | 16.6 |

_1 cells in 489 s._
