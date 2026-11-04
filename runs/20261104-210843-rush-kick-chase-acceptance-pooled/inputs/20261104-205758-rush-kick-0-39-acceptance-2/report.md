# Balance: Rush Kick 0.39 acceptance 2

Kick-chase v Rush, strength 0.39; seeds 126–250, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:57:58.682Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 55.0% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 55.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.4 | 22.5 | 6.6 | 3.2 | 9.5 | 9.4 | 5.1 | 2.6 | 0.4 | 1.1 | 0.4 | 16.4 | 15.2 |
| kick-chase v rush | opponent | 3.5 | 8.2 | 7.1 | 2.9 | 8.8 | 6.7 | 5.4 | 1.6 | 0.1 | 1.0 | 0.1 | 15.2 | 16.4 |

_1 cells in 601 s._
