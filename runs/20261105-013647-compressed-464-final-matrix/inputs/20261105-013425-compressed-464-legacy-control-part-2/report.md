# Balance: Compressed 464 legacy control part 2

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 4653f18 · **branch** HEAD · **started** 2026-11-05T01:34:25.141Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | — |
| Balanced | — | — | 51.6% ± 3.1% |
| Expansive | — | — | — |
| Kick-chase | — | — | — |
| All-out | — | — | — |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 51.6% ± 3.1% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 6.1 | 6.5 | 2.8 | 8.8 | 8.9 | 5.0 | 1.6 | 0.1 | 1.0 | 0.1 | 14.7 | 14.6 |
| balanced v compressed | opponent | 3.7 | 8.7 | 6.9 | 2.8 | 8.7 | 7.3 | 5.0 | 1.6 | 0.1 | 0.9 | 0.1 | 14.6 | 14.7 |

_1 cells in 93 s._
