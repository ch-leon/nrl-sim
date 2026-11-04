# Balance: Rush Kick 0.375 acceptance 1

Kick-chase v Rush, strength 0.375; seeds 1–125, both orientations (250 whole matches). Pool all four disjoint blocks for the 1,000-match acceptance estimate.

**commit** 086042f · **branch** feat/463-rush-counters · **started** 2026-11-04T20:40:59.821Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | 50.8% ± 3.1% | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| kick-chase v rush | 250 | 50.8% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kick-chase v rush | tracked | 2.3 | 21.9 | 6.6 | 3.3 | 9.7 | 9.5 | 5.0 | 2.6 | 0.5 | 1.1 | 0.3 | 17.3 | 15.7 |
| kick-chase v rush | opponent | 3.7 | 8.6 | 7.0 | 3.0 | 8.6 | 7.2 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 15.7 | 17.3 |

_1 cells in 528 s._
