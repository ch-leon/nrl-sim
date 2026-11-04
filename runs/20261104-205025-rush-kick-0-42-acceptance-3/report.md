# Balance: Rush Kick 0.42 acceptance 3

Kick-chase v Rush, strength 0.42; seeds 251–375, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:50:25.878Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 59.6% ± 3.0% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 59.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 21.5 | 6.3 | 3.2 | 10.0 | 9.2 | 5.1 | 2.7 | 0.5 | 1.2 | 0.4 | 17.0 | 15.0 |
| kick-chase v rush | opponent | 3.8 | 8.5 | 6.8 | 2.9 | 8.7 | 6.9 | 5.5 | 1.7 | 0.1 | 1.0 | 0.2 | 15.0 | 17.0 |

_1 cells in 290 s._
