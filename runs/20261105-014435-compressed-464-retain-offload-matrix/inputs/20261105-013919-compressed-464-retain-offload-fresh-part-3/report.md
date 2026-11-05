# Balance: Compressed 464 retain-offload fresh part 3

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:20.043Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 45.0% ± 3.0% |
| Balanced | — | — | 53.6% ± 3.0% |
| Expansive | — | — | 51.4% ± 3.0% |
| Kick-chase | — | — | 53.6% ± 3.0% |
| All-out | — | — | 53.4% ± 3.1% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 53.6% ± 3.0% |
| kick-chase v compressed | 250 | 53.6% ± 3.0% |
| all-out v compressed | 250 | 53.4% ± 3.1% |
| grind v compressed | 250 | 45.0% ± 3.0% |
| expansive v compressed | 250 | 51.4% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.5 | 8.2 | 6.9 | 3.1 | 8.9 | 8.9 | 4.9 | 1.7 | 0.2 | 1.0 | 0.1 | 15.8 | 14.8 |
| balanced v compressed | opponent | 3.4 | 8.0 | 6.9 | 2.8 | 8.5 | 6.7 | 5.4 | 1.6 | 0.1 | 0.9 | 0.1 | 14.8 | 15.8 |
| kick-chase v compressed | tracked | 1.1 | 8.1 | 6.4 | 2.9 | 9.8 | 8.5 | 5.2 | 2.6 | 0.3 | 1.3 | 0.3 | 15.0 | 13.5 |
| kick-chase v compressed | opponent | 3.7 | 8.2 | 6.4 | 2.6 | 8.7 | 6.7 | 5.3 | 1.8 | 0.1 | 0.9 | 0.1 | 13.5 | 15.0 |
| all-out v compressed | tracked | 5.0 | 8.5 | 7.2 | 2.9 | 8.3 | 9.1 | 5.0 | 1.9 | 0.2 | 0.8 | 0.1 | 15.2 | 14.8 |
| all-out v compressed | opponent | 3.5 | 8.4 | 6.6 | 2.9 | 8.7 | 6.7 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 14.8 | 15.2 |
| grind v compressed | tracked | 0.8 | 5.1 | 4.6 | 2.6 | 9.9 | 5.4 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 13.5 | 14.3 |
| grind v compressed | opponent | 3.7 | 8.5 | 7.1 | 2.8 | 8.9 | 7.2 | 5.3 | 1.8 | 0.2 | 1.0 | 0.2 | 14.3 | 13.5 |
| expansive v compressed | tracked | 3.3 | 11.7 | 7.3 | 3.0 | 8.9 | 8.7 | 4.7 | 1.8 | 0.1 | 0.7 | 0.1 | 15.6 | 14.4 |
| expansive v compressed | opponent | 3.5 | 8.6 | 6.9 | 2.8 | 8.6 | 7.0 | 5.0 | 1.8 | 0.2 | 0.9 | 0.1 | 14.4 | 15.6 |

_5 cells in 489 s._
