# Balance: 465 rating yardstick / acceptance shard 1 of 2

Current-sim rating yardstick: flat 62 and 65 versus 60, 1000 whole matches per row.

**commit** 137d483 · **branch** issue-465-strategy-counters · **started** 2026-11-05T14:11:08.732Z

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
| yardstick 65 v 60 | 1000 | 59.2% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yardstick 65 v 60 | tracked | 3.6 | 9.0 | 8.2 | 3.3 | 8.8 | 7.4 | 4.8 | 1.6 | 0.2 | 1.0 | 0.2 | 17.2 | 14.6 |
| yardstick 65 v 60 | opponent | 3.5 | 8.1 | 7.3 | 2.8 | 8.7 | 6.5 | 4.7 | 1.6 | 0.1 | 1.0 | 0.1 | 14.6 | 17.2 |

_1 cells in 316 s._
