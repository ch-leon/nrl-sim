# Balance: Compressed 464 retain-offload fresh part 0

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:19.776Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 50.2% ± 3.1% |
| Balanced | — | — | 54.0% ± 3.1% |
| Expansive | — | — | 56.2% ± 3.0% |
| Kick-chase | — | — | 49.6% ± 3.1% |
| All-out | — | — | 49.0% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 54.0% ± 3.1% |
| kick-chase v compressed | 250 | 49.6% ± 3.1% |
| all-out v compressed | 250 | 49.0% ± 3.0% |
| grind v compressed | 250 | 50.2% ± 3.1% |
| expansive v compressed | 250 | 56.2% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 2.4 | 8.3 | 7.2 | 3.1 | 8.9 | 8.9 | 5.0 | 1.6 | 0.2 | 1.0 | 0.2 | 16.3 | 15.0 |
| balanced v compressed | opponent | 3.6 | 8.6 | 7.2 | 2.9 | 8.6 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.0 | 16.3 |
| kick-chase v compressed | tracked | 1.1 | 8.4 | 6.5 | 3.0 | 9.7 | 8.9 | 5.0 | 2.4 | 0.3 | 1.4 | 0.3 | 15.8 | 14.7 |
| kick-chase v compressed | opponent | 3.6 | 8.6 | 7.0 | 2.9 | 8.6 | 7.3 | 5.5 | 1.6 | 0.2 | 0.9 | 0.1 | 14.7 | 15.8 |
| all-out v compressed | tracked | 4.9 | 8.5 | 7.4 | 3.2 | 8.2 | 9.3 | 5.3 | 1.7 | 0.2 | 0.7 | 0.1 | 16.4 | 15.7 |
| all-out v compressed | opponent | 3.9 | 8.6 | 6.9 | 3.0 | 8.6 | 6.9 | 5.0 | 1.7 | 0.2 | 0.9 | 0.2 | 15.7 | 16.4 |
| grind v compressed | tracked | 0.9 | 5.4 | 4.7 | 2.6 | 10.0 | 5.6 | 4.5 | 1.2 | 0.1 | 1.2 | 0.2 | 13.6 | 14.3 |
| grind v compressed | opponent | 3.7 | 9.1 | 7.7 | 2.7 | 8.8 | 7.4 | 5.3 | 1.7 | 0.1 | 1.0 | 0.1 | 14.3 | 13.6 |
| expansive v compressed | tracked | 3.9 | 12.6 | 7.7 | 3.2 | 8.6 | 9.4 | 4.6 | 1.7 | 0.2 | 0.8 | 0.1 | 15.8 | 14.1 |
| expansive v compressed | opponent | 3.4 | 8.6 | 7.2 | 2.7 | 8.4 | 7.0 | 5.0 | 1.5 | 0.1 | 0.9 | 0.1 | 14.1 | 15.8 |

_5 cells in 366 s._
