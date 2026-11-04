# Balance: Rush Kick 0.42 acceptance 2

Kick-chase v Rush, strength 0.42; seeds 126–250, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:50:25.672Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 56.4% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 56.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 22.0 | 6.4 | 3.3 | 9.5 | 9.4 | 5.0 | 2.5 | 0.5 | 1.2 | 0.4 | 16.9 | 15.6 |
| kick-chase v rush | opponent | 3.7 | 8.7 | 7.0 | 3.0 | 8.7 | 7.1 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 15.6 | 16.9 |

_1 cells in 316 s._
