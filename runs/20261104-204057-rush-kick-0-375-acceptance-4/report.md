# Balance: Rush Kick 0.375 acceptance 4

Kick-chase v Rush, strength 0.375; seeds 376–500, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:40:58.134Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 55.8% ± 3.0% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 55.8% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.4 | 21.7 | 6.2 | 3.2 | 9.5 | 9.4 | 5.0 | 2.5 | 0.4 | 1.2 | 0.4 | 16.5 | 14.8 |
| kick-chase v rush | opponent | 3.6 | 8.4 | 6.8 | 2.9 | 8.6 | 7.0 | 5.3 | 1.7 | 0.1 | 0.9 | 0.2 | 14.8 | 16.5 |

_1 cells in 511 s._
