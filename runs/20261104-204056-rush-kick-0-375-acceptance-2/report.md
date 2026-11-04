# Balance: Rush Kick 0.375 acceptance 2

Kick-chase v Rush, strength 0.375; seeds 126–250, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:40:56.574Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 54.2% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 54.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.4 | 22.0 | 6.3 | 3.2 | 9.7 | 9.2 | 4.9 | 2.6 | 0.4 | 1.2 | 0.4 | 16.6 | 15.5 |
| kick-chase v rush | opponent | 3.6 | 8.8 | 7.2 | 3.0 | 8.4 | 7.0 | 5.4 | 1.5 | 0.1 | 1.0 | 0.1 | 15.5 | 16.6 |

_1 cells in 519 s._
