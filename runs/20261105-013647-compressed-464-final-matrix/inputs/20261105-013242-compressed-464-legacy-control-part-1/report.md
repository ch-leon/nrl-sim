# Balance: Compressed 464 legacy control part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:32:42.384Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | 44.6% ± 3.0% |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 44.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.3 | 6.2 | 6.6 | 2.8 | 8.7 | 8.7 | 5.3 | 1.6 | 0.1 | 1.1 | 0.1 | 14.5 | 15.4 |
| balanced v compressed | opponent | 3.5 | 8.7 | 7.0 | 3.0 | 8.7 | 6.9 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 15.4 | 14.5 |

_1 cells in 73 s._
