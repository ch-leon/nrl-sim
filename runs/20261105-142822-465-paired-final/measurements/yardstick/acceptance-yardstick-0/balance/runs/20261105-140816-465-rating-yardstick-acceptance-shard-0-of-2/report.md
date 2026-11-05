# Balance: 465 rating yardstick / acceptance shard 0 of 2

Current-sim rating yardstick: flat 62 and 65 versus 60, 1000 whole matches per row.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:08:16.099Z

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
| yardstick 62 v 60 | 1000 | 56.8% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yardstick 62 v 60 | tracked | 3.6 | 8.7 | 7.5 | 3.1 | 8.7 | 7.1 | 4.9 | 1.6 | 0.2 | 1.0 | 0.2 | 16.2 | 14.7 |
| yardstick 62 v 60 | opponent | 3.5 | 8.3 | 7.0 | 2.8 | 8.6 | 6.7 | 4.9 | 1.6 | 0.2 | 1.0 | 0.1 | 14.7 | 16.2 |

_1 cells in 283 s._
