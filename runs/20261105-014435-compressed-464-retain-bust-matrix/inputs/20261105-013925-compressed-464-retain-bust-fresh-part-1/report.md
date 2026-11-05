# Balance: Compressed 464 retain-bust fresh part 1

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** HEAD · **started** 2026-11-05T01:39:25.769Z

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | — | — | 41.8% ± 3.0% |
| Balanced | — | — | 51.6% ± 3.1% |
| Expansive | — | — | 49.0% ± 3.0% |
| Kick-chase | — | — | 51.8% ± 3.1% |
| All-out | — | — | 47.0% ± 3.0% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| balanced v compressed | 250 | 51.6% ± 3.1% |
| kick-chase v compressed | 250 | 51.8% ± 3.1% |
| all-out v compressed | 250 | 47.0% ± 3.0% |
| grind v compressed | 250 | 41.8% ± 3.0% |
| expansive v compressed | 250 | 49.0% ± 3.0% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced v compressed | tracked | 3.5 | 6.5 | 6.9 | 3.0 | 8.8 | 9.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.4 | 14.8 |
| balanced v compressed | opponent | 3.5 | 8.4 | 7.0 | 2.9 | 8.7 | 6.7 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 14.8 | 15.4 |
| kick-chase v compressed | tracked | 2.3 | 6.4 | 6.2 | 2.8 | 9.7 | 8.3 | 4.7 | 2.7 | 0.3 | 1.3 | 0.2 | 14.6 | 14.2 |
| kick-chase v compressed | opponent | 3.5 | 8.7 | 6.6 | 2.8 | 8.9 | 6.8 | 5.2 | 1.7 | 0.2 | 1.1 | 0.2 | 14.2 | 14.6 |
| all-out v compressed | tracked | 6.0 | 6.5 | 7.0 | 2.9 | 8.3 | 9.2 | 5.3 | 2.0 | 0.2 | 0.8 | 0.1 | 14.9 | 15.7 |
| all-out v compressed | opponent | 3.7 | 8.2 | 7.2 | 3.0 | 8.8 | 7.3 | 5.2 | 1.6 | 0.2 | 1.1 | 0.1 | 15.7 | 14.9 |
| grind v compressed | tracked | 1.3 | 3.7 | 4.4 | 2.5 | 9.9 | 5.3 | 4.4 | 1.2 | 0.1 | 1.2 | 0.2 | 12.8 | 15.2 |
| grind v compressed | opponent | 3.6 | 9.0 | 7.4 | 2.9 | 8.9 | 7.3 | 5.4 | 1.8 | 0.1 | 1.0 | 0.2 | 15.2 | 12.8 |
| expansive v compressed | tracked | 4.5 | 10.3 | 7.1 | 3.0 | 8.7 | 8.8 | 4.9 | 1.8 | 0.1 | 0.8 | 0.1 | 15.1 | 15.3 |
| expansive v compressed | opponent | 3.6 | 8.8 | 7.1 | 3.0 | 8.8 | 7.0 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 15.3 | 15.1 |

_5 cells in 369 s._
