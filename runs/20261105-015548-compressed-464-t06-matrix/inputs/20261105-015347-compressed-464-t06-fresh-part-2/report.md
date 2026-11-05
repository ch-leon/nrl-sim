# Balance: Compressed 464 t06 fresh part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** ed4cd33 · **branch** HEAD · **started** 2026-11-05T01:53:47.768Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 39.6% ± 3.0% |
| Balanced | — | — | — |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v compressed | 250 | 39.6% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v compressed | tracked | 0.9 | 4.4 | 4.3 | 2.5 | 10.1 | 5.2 | 4.6 | 1.3 | 0.1 | 1.1 | 0.1 | 13.3 | 14.4 |
| grind v compressed | opponent | 3.6 | 8.7 | 7.4 | 2.8 | 9.1 | 6.9 | 5.3 | 1.7 | 0.1 | 1.1 | 0.2 | 14.4 | 13.3 |

_1 cells in 96 s._
