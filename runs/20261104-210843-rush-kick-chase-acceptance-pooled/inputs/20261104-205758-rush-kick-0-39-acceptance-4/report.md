# Balance: Rush Kick 0.39 acceptance 4

Kick-chase v Rush, strength 0.39; seeds 376–500, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:57:58.322Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 58.0% ± 3.0% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 58.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 22.0 | 6.4 | 3.2 | 9.7 | 9.2 | 5.0 | 2.4 | 0.3 | 1.3 | 0.4 | 16.9 | 14.6 |
| kick-chase v rush | opponent | 3.8 | 8.5 | 7.1 | 2.8 | 8.6 | 6.8 | 5.3 | 1.6 | 0.2 | 1.0 | 0.1 | 14.6 | 16.9 |

_1 cells in 582 s._
