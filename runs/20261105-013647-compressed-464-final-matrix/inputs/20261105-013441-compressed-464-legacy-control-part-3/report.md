# Balance: Compressed 464 legacy control part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:34:41.028Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | 48.0% ± 3.1% |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 48.0% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 6.3 | 6.4 | 2.6 | 8.7 | 8.4 | 5.2 | 1.6 | 0.1 | 1.0 | 0.1 | 13.6 | 14.1 |
| balanced v compressed | opponent | 3.5 | 8.9 | 7.0 | 2.7 | 8.8 | 6.8 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.1 | 13.6 |

_1 cells in 96 s._
