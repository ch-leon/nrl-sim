# Balance: Compressed 464 retain-bust acceptance matrix

Full 5 by 3 matrix at flat 60 and neutral fit with all counters enabled. Compressed uses its enabled neutral contact baseline; middle benefits belong to the Tight cell. Most cells use 500 seeds both ways (1000 matches); Tight v Rush and Balanced v Rush retain 1000 seeds both ways (2000 matches).

**commit** 7040b03 · **branch** feat/464-compressed-counters · **started** 2026-11-05T01:44:36.005Z · **assembled** true · **sourceMap** [object Object] · **actionsRun** 41949943299

Points share = wins + half draws; ± is one sample standard error over matches. Tracked/opponent counts pool both orientations when bothWays is set; the legacy pooled counts remain the written orientation.

## Attack × defence points share — baseline

| Attack | Slide | Rush | Compressed |
|---|---:|---:|---:|
| Tight | 54.7% ± 1.5% | 48.7% ± 1.1% | 43.9% ± 1.5% |
| Balanced | 50.0% ± 1.5% | 47.5% ± 1.1% | 50.1% ± 1.5% |
| Expansive | 45.9% ± 1.5% | 51.4% ± 1.5% | 48.8% ± 1.5% |
| Kick-chase | 45.2% ± 1.5% | 55.1% ± 1.5% | 51.0% ± 1.5% |
| All-out | 54.1% ± 1.5% | 45.0% ± 1.5% | 46.0% ± 1.5% |

## Tracked-side rows — baseline

| Scenario | Matches | Points share ± SE |
|---|---:|---:|
| grind v slide | 1000 | 54.7% ± 1.5% |
| grind v rush | 2000 | 48.7% ± 1.1% |
| grind v compressed | 1000 | 43.9% ± 1.5% |
| balanced v slide | 1000 | 50.0% ± 1.5% |
| balanced v rush | 2000 | 47.5% ± 1.1% |
| balanced v compressed | 1000 | 50.1% ± 1.5% |
| expansive v slide | 1000 | 45.9% ± 1.5% |
| expansive v rush | 1000 | 51.4% ± 1.5% |
| expansive v compressed | 1000 | 48.8% ± 1.5% |
| kick-chase v slide | 1000 | 45.2% ± 1.5% |
| kick-chase v rush | 1000 | 55.1% ± 1.5% |
| kick-chase v compressed | 1000 | 51.0% ± 1.5% |
| all-out v slide | 1000 | 54.1% ± 1.5% |
| all-out v rush | 1000 | 45.0% ± 1.5% |
| all-out v compressed | 1000 | 46.0% ± 1.5% |

## Per-side counts — baseline

| Scenario | Side | offloads | busts | lineBreaks | tries | kicks | steps | errors | bombs | bombsWon | grubbers | grubberTries | pointsFor | pointsAgainst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| grind v slide | tracked | 3.2 | 11.4 | 6.0 | 2.9 | 9.5 | 4.3 | 4.5 | 1.3 | 0.1 | 1.2 | 0.2 | 15.4 | 13.9 |
| grind v slide | opponent | 3.5 | 8.5 | 7.1 | 2.7 | 8.7 | 7.0 | 5.1 | 1.6 | 0.2 | 0.9 | 0.1 | 13.9 | 15.4 |
| grind v rush | tracked | 2.3 | 22.8 | 4.7 | 2.7 | 9.6 | 5.7 | 4.6 | 1.2 | 0.1 | 1.1 | 0.2 | 14.3 | 14.7 |
| grind v rush | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 8.9 | 7.2 | 5.2 | 1.7 | 0.2 | 1.0 | 0.1 | 14.7 | 14.3 |
| grind v compressed | tracked | 1.4 | 3.7 | 4.4 | 2.5 | 9.9 | 5.4 | 4.5 | 1.3 | 0.1 | 1.1 | 0.2 | 12.9 | 14.5 |
| grind v compressed | opponent | 3.7 | 8.8 | 7.3 | 2.8 | 8.8 | 7.2 | 5.3 | 1.7 | 0.1 | 1.0 | 0.2 | 14.5 | 12.9 |
| balanced v slide | tracked | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v slide | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.7 | 6.9 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 14.8 | 14.8 |
| balanced v rush | tracked | 3.7 | 22.0 | 5.9 | 2.9 | 8.5 | 9.4 | 5.2 | 1.6 | 0.1 | 1.0 | 0.2 | 15.1 | 15.8 |
| balanced v rush | opponent | 3.7 | 8.6 | 7.0 | 3.0 | 8.8 | 7.0 | 5.1 | 1.6 | 0.1 | 1.0 | 0.2 | 15.8 | 15.1 |
| balanced v compressed | tracked | 3.5 | 6.5 | 6.7 | 2.9 | 8.8 | 8.9 | 5.1 | 1.6 | 0.2 | 1.0 | 0.1 | 14.9 | 14.8 |
| balanced v compressed | opponent | 3.6 | 8.5 | 6.9 | 2.9 | 8.8 | 6.9 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 14.8 | 14.9 |
| expansive v slide | tracked | 4.6 | 8.2 | 6.5 | 2.8 | 8.7 | 6.7 | 4.8 | 1.8 | 0.1 | 0.7 | 0.1 | 14.8 | 15.5 |
| expansive v slide | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 7.1 | 5.1 | 1.6 | 0.2 | 1.0 | 0.2 | 15.5 | 14.8 |
| expansive v rush | tracked | 5.1 | 23.0 | 6.0 | 3.1 | 8.4 | 9.7 | 4.9 | 1.7 | 0.2 | 0.8 | 0.1 | 16.3 | 15.6 |
| expansive v rush | opponent | 3.6 | 8.5 | 7.1 | 3.0 | 8.7 | 6.9 | 5.1 | 1.6 | 0.1 | 1.0 | 0.1 | 15.6 | 16.3 |
| expansive v compressed | tracked | 4.8 | 9.9 | 7.1 | 3.0 | 8.7 | 9.0 | 4.9 | 1.8 | 0.2 | 0.7 | 0.1 | 15.0 | 15.3 |
| expansive v compressed | opponent | 3.6 | 8.7 | 7.1 | 3.0 | 8.8 | 7.1 | 5.1 | 1.7 | 0.2 | 1.0 | 0.2 | 15.3 | 15.0 |
| kick-chase v slide | tracked | 2.2 | 8.4 | 5.6 | 2.4 | 9.7 | 6.8 | 4.8 | 2.7 | 0.1 | 1.3 | 0.1 | 12.8 | 14.1 |
| kick-chase v slide | opponent | 3.8 | 8.6 | 7.3 | 2.7 | 9.0 | 7.2 | 4.9 | 1.7 | 0.2 | 0.9 | 0.1 | 14.1 | 12.8 |
| kick-chase v rush | tracked | 2.3 | 22.0 | 6.5 | 3.2 | 9.6 | 9.4 | 5.0 | 2.5 | 0.4 | 1.2 | 0.4 | 16.7 | 15.2 |
| kick-chase v rush | opponent | 3.6 | 8.6 | 7.1 | 2.9 | 8.7 | 6.9 | 5.4 | 1.6 | 0.1 | 0.9 | 0.1 | 15.2 | 16.7 |
| kick-chase v compressed | tracked | 2.2 | 6.2 | 6.3 | 2.9 | 9.9 | 8.6 | 4.9 | 2.6 | 0.3 | 1.4 | 0.3 | 15.0 | 14.6 |
| kick-chase v compressed | opponent | 3.7 | 8.5 | 6.9 | 2.8 | 8.7 | 6.9 | 5.4 | 1.7 | 0.1 | 0.9 | 0.1 | 14.6 | 15.0 |
| all-out v slide | tracked | 6.3 | 9.7 | 7.6 | 3.1 | 8.2 | 7.2 | 5.2 | 1.9 | 0.2 | 0.8 | 0.1 | 15.9 | 15.0 |
| all-out v slide | opponent | 3.5 | 8.3 | 6.9 | 2.9 | 8.5 | 6.9 | 5.0 | 1.6 | 0.2 | 0.9 | 0.2 | 15.0 | 15.9 |
| all-out v rush | tracked | 6.6 | 22.1 | 6.1 | 3.0 | 8.0 | 9.5 | 5.6 | 1.8 | 0.2 | 0.7 | 0.1 | 15.5 | 16.7 |
| all-out v rush | opponent | 3.7 | 8.5 | 7.0 | 3.2 | 8.8 | 7.0 | 5.2 | 1.6 | 0.2 | 1.0 | 0.2 | 16.7 | 15.5 |
| all-out v compressed | tracked | 6.1 | 6.5 | 7.0 | 2.8 | 8.3 | 9.2 | 5.3 | 1.9 | 0.2 | 0.8 | 0.1 | 14.7 | 15.6 |
| all-out v compressed | opponent | 3.7 | 8.4 | 7.0 | 3.0 | 8.7 | 7.0 | 5.1 | 1.7 | 0.1 | 1.0 | 0.1 | 15.6 | 14.7 |

_15 cells in 27736 s._
