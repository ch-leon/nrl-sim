# Balance: 465 rating yardstick

Current-sim rating yardstick: flat 62 and 65 versus 60, 1000 whole matches per row.

**commit** e5cf6c9 · **branch** issue-465-strategy-counters · **started** 2026-11-05T05:07:14.838Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| yardstick 62 v 60 | 1000 | 56.9% ± 1.5% |
| yardstick 65 v 60 | 1000 | 60.6% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yardstick 62 v 60 | tracked | 3.6 | 8.7 | 7.5 | 3.1 | 8.7 | 7.1 | 4.9 | 1.6 | 0.2 | 1.0 | 0.2 | 16.1 | 14.6 |
| yardstick 62 v 60 | opponent | 3.5 | 8.3 | 7.1 | 2.8 | 8.6 | 6.7 | 5.0 | 1.6 | 0.2 | 1.0 | 0.1 | 14.6 | 16.1 |
| yardstick 65 v 60 | tracked | 3.6 | 9.1 | 8.2 | 3.4 | 8.7 | 7.4 | 4.7 | 1.6 | 0.2 | 1.0 | 0.2 | 17.5 | 14.8 |
| yardstick 65 v 60 | opponent | 3.6 | 8.1 | 7.3 | 2.8 | 8.6 | 6.5 | 4.8 | 1.6 | 0.1 | 0.9 | 0.1 | 14.8 | 17.5 |

_2 cells in 794 s._
