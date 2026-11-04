# Balance: Rush Kick 0.42 acceptance 4

Kick-chase v Rush, strength 0.42; seeds 376–500, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:50:25.486Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 61.0% ± 3.0% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 61.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.4 | 22.2 | 6.6 | 3.4 | 9.7 | 9.5 | 5.0 | 2.7 | 0.4 | 1.3 | 0.5 | 17.8 | 14.6 |
| kick-chase v rush | opponent | 3.6 | 8.1 | 6.6 | 2.9 | 8.6 | 6.3 | 5.5 | 1.6 | 0.2 | 0.9 | 0.2 | 14.6 | 17.8 |

_1 cells in 344 s._
