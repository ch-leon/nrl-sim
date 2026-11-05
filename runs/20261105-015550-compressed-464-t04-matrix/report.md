# Balance: Compressed 464 t04 acceptance matrix

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** ed4cd33 · **branch** feat/464-compressed-counters · **started** 2026-11-05T01:55:50.361Z · **assembled** true · **sourceMap** [object Object] · **actionsRun** 41951538103

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 54.7% ± 1.5% | 48.7% ± 1.1% | 45.5% ± 1.5% |
| Balanced | 50.0% ± 1.5% | 47.5% ± 1.1% | 49.8% ± 1.5% |
| Expansive | 45.9% ± 1.5% | 51.4% ± 1.5% | 54.2% ± 1.5% |
| Kick-chase | 45.2% ± 1.5% | 55.1% ± 1.5% | 50.7% ± 1.5% |
| All-out | 54.1% ± 1.5% | 45.0% ± 1.5% | 50.4% ± 1.5% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 54.7% ± 1.5% |
| grind v rush | 2000 | 48.7% ± 1.1% |
| grind v compressed | 1000 | 45.5% ± 1.5% |
| balanced v slide | 1000 | 50.0% ± 1.5% |
| balanced v rush | 2000 | 47.5% ± 1.1% |
| balanced v compressed | 1000 | 49.8% ± 1.5% |
| expansive v slide | 1000 | 45.9% ± 1.5% |
| expansive v rush | 1000 | 51.4% ± 1.5% |
| expansive v compressed | 1000 | 54.2% ± 1.5% |
| kick-chase v slide | 1000 | 45.2% ± 1.5% |
| kick-chase v rush | 1000 | 55.1% ± 1.5% |
| kick-chase v compressed | 1000 | 50.7% ± 1.5% |
| all-out v slide | 1000 | 54.1% ± 1.5% |
| all-out v rush | 1000 | 45.0% ± 1.5% |
| all-out v compressed | 1000 | 50.4% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.2 | 11.4 | 6.0 | 2.9 | 9.5 | 4.3 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 15.4 | 13.9 |
| grind v slide | opponent | 3.5 | 8.5 | 7.1 | 2.7 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 0.9 | 0.1 | 13.9 | 15.4 |
| grind v rush | tracked | 2.3 | 22.8 | 4.7 | 2.7 | 9.6 | 5.7 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.3 | 14.7 |
| grind v rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 8.9 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.7 | 14.3 |
| grind v compressed | tracked | 1.1 | 5.0 | 4.5 | 2.5 | 9.9 | 5.3 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 13.1 | 14.3 |
| grind v compressed | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 8.9 | 7.3 | 5.2 | 1.7 | 0.1 | 1.0 | 0.2 | 14.3 | 13.1 |
| balanced v slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v rush | tracked | 3.7 | 22.0 | 5.9 | 2.9 | 8.5 | 9.4 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.1 | 15.8 |
| balanced v rush | opponent | 3.7 | 8.6 | 7.0 | 3.0 | 8.8 | 7.0 | 5.1 | 1.6 | 0.1 | 1.0 | 0.2 | 15.8 | 15.1 |
| balanced v compressed | tracked | 2.4 | 6.9 | 6.5 | 2.8 | 8.7 | 8.7 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 14.5 | 14.9 |
| balanced v compressed | opponent | 3.6 | 8.7 | 7.1 | 2.9 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 14.9 | 14.5 |
| expansive v slide | tracked | 4.6 | 8.2 | 6.5 | 2.8 | 8.7 | 6.7 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.8 | 15.5 |
| expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.5 | 14.8 |
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| expansive v compressed | tracked | 3.7 | 11.9 | 7.7 | 3.1 | 8.7 | 9.2 | 4.8 | 1.7 | 0.2 | 0.8 | 0.1 | 15.9 | 14.9 |
| expansive v compressed | opponent | 3.5 | 8.5 | 7.0 | 2.9 | 8.6 | 6.9 | 5.2 | 1.6 | 0.2 | 0.9 | 0.1 | 14.9 | 15.9 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 5.6 | 2.4 | 9.7 | 6.8 | 4.8 | 2.7 | 0.1 | 1.3 | 0.1 | 12.8 | 14.1 |
| kick-chase v slide | opponent | 3.8 | 8.6 | 7.3 | 2.7 | 9.0 | 7.2 | 4.9 | 1.7 | 0.2 | 0.9 | 0.1 | 14.1 | 12.8 |
| kick-chase v rush | tracked | 2.3 | 22.0 | 6.5 | 3.2 | 9.6 | 9.4 | 5.0 | 2.5 | 0.4 | 1.2 | 0.4 | 16.7 | 15.2 |
| kick-chase v rush | opponent | 3.6 | 8.6 | 7.1 | 2.9 | 8.7 | 6.9 | 5.4 | 1.6 | 0.1 | 0.9 | 0.1 | 15.2 | 16.7 |
| kick-chase v compressed | tracked | 1.0 | 6.6 | 6.2 | 2.8 | 9.8 | 8.5 | 4.9 | 2.6 | 0.3 | 1.3 | 0.2 | 14.5 | 14.4 |
| kick-chase v compressed | opponent | 3.6 | 8.5 | 7.0 | 2.8 | 8.8 | 7.0 | 5.3 | 1.7 | 0.1 | 0.9 | 0.1 | 14.4 | 14.5 |
| all-out v slide | tracked | 6.3 | 9.7 | 7.6 | 3.1 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.9 | 15.0 |
| all-out v slide | opponent | 3.5 | 8.3 | 6.9 | 2.9 | 8.5 | 6.9 | 5.0 | 1.6 | 0.2 | 0.9 | 0.2 | 15.0 | 15.9 |
| all-out v rush | tracked | 6.6 | 22.1 | 6.1 | 3.0 | 8.0 | 9.5 | 5.6 | 1.8 | 0.2 | 0.7 | 0.1 | 15.5 | 16.7 |
| all-out v rush | opponent | 3.7 | 8.5 | 7.0 | 3.2 | 8.8 | 7.0 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 16.7 | 15.5 |
| all-out v compressed | tracked | 4.8 | 6.8 | 7.0 | 2.9 | 8.5 | 9.1 | 5.1 | 1.9 | 0.2 | 0.7 | 0.1 | 15.2 | 15.2 |
| all-out v compressed | opponent | 3.6 | 8.5 | 7.1 | 2.9 | 8.6 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.2 | 15.2 |

_15 cells in 28171 s._
