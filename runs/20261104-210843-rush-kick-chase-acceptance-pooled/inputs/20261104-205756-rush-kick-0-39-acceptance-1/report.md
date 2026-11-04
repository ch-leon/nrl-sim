# Balance: Rush Kick 0.39 acceptance 1

Kick-chase v Rush, strength 0.39; seeds 1–125, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:57:56.672Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 56.2% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 56.2% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.2 | 22.0 | 6.6 | 3.3 | 9.8 | 9.8 | 5.0 | 2.6 | 0.4 | 1.3 | 0.4 | 17.1 | 15.3 |
| kick-chase v rush | opponent | 3.5 | 8.5 | 7.1 | 2.9 | 8.8 | 6.9 | 5.4 | 1.6 | 0.2 | 0.9 | 0.1 | 15.3 | 17.1 |

_1 cells in 588 s._
