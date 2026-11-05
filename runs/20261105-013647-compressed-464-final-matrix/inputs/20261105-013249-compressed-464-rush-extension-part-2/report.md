# Balance: Compressed 464 Rush extension part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:32:49.692Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | 42.6% ± 3.0% | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v rush | 250 | 42.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v rush | tracked | 3.7 | 21.7 | 5.9 | 2.7 | 8.4 | 9.5 | 5.3 | 1.5 | 0.2 | 1.0 | 0.2 | 14.1 | 15.9 |
| balanced v rush | opponent | 3.6 | 8.9 | 7.3 | 3.0 | 8.7 | 7.1 | 5.3 | 1.7 | 0.1 | 1.0 | 0.2 | 15.9 | 14.1 |

_1 cells in 94 s._
