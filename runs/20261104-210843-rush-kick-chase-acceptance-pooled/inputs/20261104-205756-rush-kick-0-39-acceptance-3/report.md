# Balance: Rush Kick 0.39 acceptance 3

Kick-chase v Rush, strength 0.39; seeds 251–375, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:57:56.754Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 51.4% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 51.4% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.5 | 21.6 | 6.4 | 3.2 | 9.6 | 9.3 | 5.0 | 2.5 | 0.4 | 1.3 | 0.4 | 16.4 | 15.5 |
| kick-chase v rush | opponent | 3.6 | 9.1 | 7.1 | 3.0 | 8.8 | 7.0 | 5.3 | 1.8 | 0.2 | 0.9 | 0.2 | 15.5 | 16.4 |

_1 cells in 575 s._
